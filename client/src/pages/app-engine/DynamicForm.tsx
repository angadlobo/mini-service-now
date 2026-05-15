import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Group,
  Button,
  TextInput,
  Textarea,
  NumberInput,
  Switch,
  Select,
  Badge,
  Paper,
  LoadingOverlay,
  Center,
  Text,
  Tabs,
  Table,
  Divider,
  FileButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { appEngineApi } from '../../api/app-engine.api';
import { journalApi, attachmentApi, auditApi } from '../../api/common.api';
import type {
  TableConfig,
  ColumnDefinition,
  JournalEntry,
  Attachment,
  AuditEntry,
} from '@shared/interfaces';

export function DynamicForm() {
  const { tableName, id } = useParams<{ tableName: string; id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNew = !id || id === 'new';
  const recordId = isNew ? undefined : id;

  // --- Form state ---
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formInitialized, setFormInitialized] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const fileResetRef = useRef<() => void>(null);

  // --- Fetch table config ---
  const { data: tables, isLoading: tablesLoading } = useQuery<TableConfig[]>({
    queryKey: ['registered-tables'],
    queryFn: () => appEngineApi.getRegisteredTables(),
  });

  const tableConfig = useMemo(
    () => tables?.find((t) => t.name === tableName),
    [tables, tableName],
  );

  const formColumns = useMemo(
    () => tableConfig?.columns.filter((c) => c.showInForm) ?? [],
    [tableConfig],
  );

  // --- Fetch existing record ---
  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ['dynamic-record', tableName, recordId],
    queryFn: () => appEngineApi.getRecord(tableName!, recordId!),
    enabled: !!tableConfig && !!recordId,
  });

  // Initialize form data from record
  if (record && !formInitialized) {
    const initialData: Record<string, unknown> = {};
    for (const col of formColumns) {
      initialData[col.name] = record[col.name] ?? col.default ?? '';
    }
    setFormData(initialData);
    setFormInitialized(true);
  }

  // If new and not initialized, set defaults
  if (isNew && tableConfig && !formInitialized) {
    const initialData: Record<string, unknown> = {};
    for (const col of formColumns) {
      if (col.type === 'boolean') {
        initialData[col.name] = col.default ?? false;
      } else if (col.type === 'number') {
        initialData[col.name] = col.default ?? '';
      } else {
        initialData[col.name] = col.default ?? '';
      }
    }
    setFormData(initialData);
    setFormInitialized(true);
  }

  // --- Fetch transitions ---
  const { data: transitionData } = useQuery<{
    current: string;
    transitions: string[];
  }>({
    queryKey: ['transitions', tableName, recordId],
    queryFn: () => appEngineApi.getTransitions(tableName!, recordId!),
    enabled: !!recordId && !!tableConfig?.states,
  });

  // --- Fetch journal entries ---
  const { data: journalEntries } = useQuery<JournalEntry[]>({
    queryKey: ['journal', tableName, recordId],
    queryFn: () => journalApi.list(tableName!, recordId!),
    enabled: !!recordId,
  });

  // --- Fetch attachments ---
  const { data: attachments } = useQuery<Attachment[]>({
    queryKey: ['attachments', tableName, recordId],
    queryFn: () => attachmentApi.list(tableName!, recordId!),
    enabled: !!recordId,
  });

  // --- Fetch audit entries ---
  const { data: auditEntries } = useQuery<AuditEntry[]>({
    queryKey: ['audit', tableName, recordId],
    queryFn: () => auditApi.list(tableName!, recordId!),
    enabled: !!recordId,
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      appEngineApi.createRecord(tableName!, data),
    onSuccess: (result) => {
      notifications.show({ title: 'Success', message: 'Record created successfully', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['dynamic-records', tableName] });
      navigate(`/x/${tableName}/${result.id}`);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.error || 'Failed to create record',
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      appEngineApi.updateRecord(tableName!, recordId!, data),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Record updated successfully', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['dynamic-record', tableName, recordId] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-records', tableName] });
      queryClient.invalidateQueries({ queryKey: ['transitions', tableName, recordId] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.error || 'Failed to update record',
        color: 'red',
      });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (targetState: string) =>
      appEngineApi.updateRecord(tableName!, recordId!, { state: targetState }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'State transitioned successfully', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['dynamic-record', tableName, recordId] });
      queryClient.invalidateQueries({ queryKey: ['transitions', tableName, recordId] });
      queryClient.invalidateQueries({ queryKey: ['dynamic-records', tableName] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.error || 'Failed to transition state',
        color: 'red',
      });
    },
  });

  const journalMutation = useMutation({
    mutationFn: (data: { type: string; body: string }) =>
      journalApi.create(tableName!, recordId!, data),
    onSuccess: () => {
      setCommentBody('');
      queryClient.invalidateQueries({ queryKey: ['journal', tableName, recordId] });
      notifications.show({ title: 'Success', message: 'Comment added', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to add comment', color: 'red' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentApi.upload(tableName!, recordId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', tableName, recordId] });
      notifications.show({ title: 'Success', message: 'File uploaded', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to upload file', color: 'red' });
    },
  });

  // --- Field change handler ---
  const handleFieldChange = useCallback(
    (name: string, value: unknown) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  // --- Save handler ---
  const handleSave = () => {
    if (isNew) {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  // --- Render form field ---
  const renderField = (col: ColumnDefinition) => {
    const value = formData[col.name];
    const disabled = !!col.readonly && !isNew;

    switch (col.type) {
      case 'string':
        return (
          <TextInput
            key={col.name}
            label={col.label}
            required={col.required}
            disabled={disabled}
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(col.name, e.currentTarget.value)}
          />
        );

      case 'text':
        return (
          <Textarea
            key={col.name}
            label={col.label}
            required={col.required}
            disabled={disabled}
            rows={4}
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(col.name, e.currentTarget.value)}
          />
        );

      case 'number':
        return (
          <NumberInput
            key={col.name}
            label={col.label}
            required={col.required}
            disabled={disabled}
            value={value != null && value !== '' ? Number(value) : ''}
            onChange={(val) => handleFieldChange(col.name, val)}
          />
        );

      case 'boolean':
        return (
          <Switch
            key={col.name}
            label={col.label}
            disabled={disabled}
            checked={!!value}
            onChange={(e) => handleFieldChange(col.name, e.currentTarget.checked)}
          />
        );

      case 'date':
        return (
          <TextInput
            key={col.name}
            label={col.label}
            type="date"
            required={col.required}
            disabled={disabled}
            value={value ? String(value).slice(0, 10) : ''}
            onChange={(e) => handleFieldChange(col.name, e.currentTarget.value)}
          />
        );

      case 'datetime':
        return (
          <TextInput
            key={col.name}
            label={col.label}
            type="datetime-local"
            required={col.required}
            disabled={disabled}
            value={value ? String(value).slice(0, 16) : ''}
            onChange={(e) => handleFieldChange(col.name, e.currentTarget.value)}
          />
        );

      case 'select':
        return (
          <Select
            key={col.name}
            label={col.label}
            required={col.required}
            disabled={disabled}
            data={col.options ?? []}
            value={value ? String(value) : null}
            onChange={(val) => handleFieldChange(col.name, val)}
            clearable
          />
        );

      case 'reference': {
        const displayKey = `${col.name}_display`;
        const displayValue = record?.[displayKey];
        const refLabel = displayValue
          ? `${col.label} (${displayValue})`
          : col.label;
        return (
          <TextInput
            key={col.name}
            label={refLabel}
            required={col.required}
            disabled={disabled}
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(col.name, e.currentTarget.value)}
            placeholder="Enter record ID"
          />
        );
      }

      default:
        return (
          <TextInput
            key={col.name}
            label={col.label}
            value={String(value ?? '')}
            onChange={(e) => handleFieldChange(col.name, e.currentTarget.value)}
          />
        );
    }
  };

  // --- Loading / not found ---
  if (tablesLoading || (recordId && recordLoading)) {
    return (
      <Paper pos="relative" mih={300}>
        <LoadingOverlay visible />
      </Paper>
    );
  }

  if (!tableConfig) {
    return (
      <Center mih={300}>
        <Text size="lg" c="dimmed">
          Table not found: {tableName}
        </Text>
      </Center>
    );
  }

  return (
    <Stack>
      {/* Title */}
      <Group justify="space-between">
        <Title order={2}>
          {isNew ? `New ${tableConfig.label}` : `${tableConfig.label}: ${record?.number || recordId}`}
        </Title>
      </Group>

      {/* State transitions (only when editing and table has states) */}
      {!isNew && tableConfig.states && transitionData && (
        <Paper withBorder p="md">
          <Group>
            <Text fw={500}>Current State:</Text>
            <Badge size="lg" variant="filled">
              {transitionData.current}
            </Badge>
            {transitionData.transitions.length > 0 && (
              <>
                <Divider orientation="vertical" />
                <Text size="sm" c="dimmed">
                  Transition to:
                </Text>
                {transitionData.transitions.map((target) => (
                  <Button
                    key={target}
                    size="xs"
                    variant="light"
                    loading={transitionMutation.isPending}
                    onClick={() => transitionMutation.mutate(target)}
                  >
                    {target}
                  </Button>
                ))}
              </>
            )}
          </Group>
        </Paper>
      )}

      {/* Form fields */}
      <Paper withBorder p="md">
        <Stack gap="sm">
          {formColumns.map((col) => renderField(col))}
        </Stack>
      </Paper>

      {/* Action buttons */}
      <Group>
        <Button
          onClick={handleSave}
          loading={createMutation.isPending || updateMutation.isPending}
        >
          Save
        </Button>
        <Button variant="default" onClick={() => navigate(`/x/${tableName}`)}>
          Cancel
        </Button>
      </Group>

      {/* Tabs - only when editing */}
      {!isNew && recordId && (
        <Paper withBorder>
          <Tabs defaultValue="activity">
            <Tabs.List>
              <Tabs.Tab value="activity">Activity</Tabs.Tab>
              <Tabs.Tab value="attachments">Attachments</Tabs.Tab>
              <Tabs.Tab value="audit">Audit History</Tabs.Tab>
            </Tabs.List>

            {/* Activity Tab */}
            <Tabs.Panel value="activity" p="md">
              <Stack>
                <Textarea
                  placeholder="Add a comment..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.currentTarget.value)}
                  rows={3}
                />
                <Group>
                  <Button
                    size="sm"
                    disabled={!commentBody.trim()}
                    loading={journalMutation.isPending}
                    onClick={() =>
                      journalMutation.mutate({ type: 'comment', body: commentBody.trim() })
                    }
                  >
                    Add Comment
                  </Button>
                </Group>

                <Divider />

                {(!journalEntries || journalEntries.length === 0) && (
                  <Text c="dimmed" ta="center" py="md">
                    No activity yet.
                  </Text>
                )}

                <Stack gap="sm">
                  {journalEntries?.map((entry) => (
                    <Paper key={entry.id} withBorder p="sm">
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Text fw={600} size="sm">
                            {entry.created_by_user
                              ? `${entry.created_by_user.first_name} ${entry.created_by_user.last_name}`
                              : entry.created_by}
                          </Text>
                          <Badge size="xs" variant="light">
                            {entry.type}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {new Date(entry.created_at).toLocaleString()}
                        </Text>
                      </Group>
                      <Text size="sm">{entry.body}</Text>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Tabs.Panel>

            {/* Attachments Tab */}
            <Tabs.Panel value="attachments" p="md">
              <Stack>
                <Group>
                  <FileButton
                    resetRef={fileResetRef}
                    onChange={(file) => {
                      if (file) {
                        uploadMutation.mutate(file);
                      }
                    }}
                  >
                    {(props) => (
                      <Button {...props} size="sm" loading={uploadMutation.isPending}>
                        Upload File
                      </Button>
                    )}
                  </FileButton>
                </Group>

                {(!attachments || attachments.length === 0) && (
                  <Text c="dimmed" ta="center" py="md">
                    No attachments.
                  </Text>
                )}

                {attachments && attachments.length > 0 && (
                  <Table striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>File Name</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Size</Table.Th>
                        <Table.Th>Uploaded</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {attachments.map((att) => (
                        <Table.Tr key={att.id}>
                          <Table.Td>{att.file_name}</Table.Td>
                          <Table.Td>{att.mime_type}</Table.Td>
                          <Table.Td>
                            {att.size < 1024
                              ? `${att.size} B`
                              : att.size < 1048576
                                ? `${(att.size / 1024).toFixed(1)} KB`
                                : `${(att.size / 1048576).toFixed(1)} MB`}
                          </Table.Td>
                          <Table.Td>
                            {new Date(att.created_at).toLocaleString()}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Tabs.Panel>

            {/* Audit History Tab */}
            <Tabs.Panel value="audit" p="md">
              {(!auditEntries || auditEntries.length === 0) ? (
                <Text c="dimmed" ta="center" py="md">
                  No audit history.
                </Text>
              ) : (
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Field</Table.Th>
                      <Table.Th>Old Value</Table.Th>
                      <Table.Th>New Value</Table.Th>
                      <Table.Th>Changed By</Table.Th>
                      <Table.Th>Date</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {auditEntries.map((entry) => (
                      <Table.Tr key={entry.id}>
                        <Table.Td>{entry.field_name}</Table.Td>
                        <Table.Td>{entry.old_value ?? '-'}</Table.Td>
                        <Table.Td>{entry.new_value ?? '-'}</Table.Td>
                        <Table.Td>
                          {entry.changed_by_user
                            ? `${entry.changed_by_user.first_name} ${entry.changed_by_user.last_name}`
                            : entry.changed_by}
                        </Table.Td>
                        <Table.Td>
                          {new Date(entry.created_at).toLocaleString()}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Tabs.Panel>
          </Tabs>
        </Paper>
      )}
    </Stack>
  );
}
