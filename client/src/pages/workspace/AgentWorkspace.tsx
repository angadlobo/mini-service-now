import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, Stack, Card, Text, Badge, Group, Paper, Title, Tabs, TextInput, Textarea, Select, Button, ScrollArea, ActionIcon, Divider, Box, Loader } from '@mantine/core';
import { IconAlertTriangle, IconExchange, IconBug, IconRefresh, IconSend, IconChevronRight, IconBrain, IconLink, IconBook } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { dashboardApi, journalApi } from '../../api/common.api';
import { incidentsApi } from '../../api/incidents.api';
import { changesApi } from '../../api/changes.api';
import { problemsApi } from '../../api/common.api';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import dayjs from 'dayjs';

const glassStyle = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--shadow-md)',
};

// ── Queue Item Card ──────────────────────────────────
function QueueCard({ item, selected, onClick }: { item: any; selected: boolean; onClick: () => void }) {
  return (
    <Card
      p="sm"
      radius="md"
      withBorder
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--mantine-primary-color-filled)' : undefined,
        background: selected ? 'var(--mantine-primary-color-light)' : undefined,
        transition: 'all 0.15s ease',
      }}
      className={selected ? '' : 'hover-lift'}
    >
      <Group justify="space-between" mb={4}>
        <Text size="xs" fw={700} c="var(--mantine-primary-color-filled)">
          {item.number}
        </Text>
        <PriorityBadge priority={item.priority || 4} />
      </Group>
      <Text size="sm" lineClamp={2} fw={500} mb={6}>
        {item.short_description || item.title || 'No description'}
      </Text>
      <Group justify="space-between">
        <StateIndicator state={item.state} />
        <Text size="xs" c="dimmed">
          {dayjs(item.updated_at).fromNow()}
        </Text>
      </Group>
    </Card>
  );
}

// ── Journal / Comments Section ───────────────────────
function JournalSection({ tableName, recordId }: { tableName: string; recordId: string }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('comment');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal', tableName, recordId],
    queryFn: () => journalApi.list(tableName, recordId),
    enabled: !!recordId,
  });

  const addComment = useMutation({
    mutationFn: () => journalApi.create(tableName, recordId, { type: commentType, body: newComment }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['journal', tableName, recordId] });
      notifications.show({ title: 'Success', message: 'Comment added', color: 'green' });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  return (
    <Stack gap="sm">
      <Group gap="sm">
        <Select
          size="xs"
          value={commentType}
          onChange={(v) => v && setCommentType(v)}
          data={[
            { value: 'comment', label: 'Comment' },
            { value: 'work_note', label: 'Work Note' },
          ]}
          style={{ width: 140 }}
        />
        <TextInput
          size="xs"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.currentTarget.value)}
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newComment.trim()) addComment.mutate();
          }}
        />
        <ActionIcon
          variant="filled"
          size="md"
          onClick={() => newComment.trim() && addComment.mutate()}
          loading={addComment.isPending}
          disabled={!newComment.trim()}
        >
          <IconSend size={14} />
        </ActionIcon>
      </Group>

      {isLoading && <Loader size="sm" />}

      <ScrollArea h={250}>
        <Stack gap="xs">
          {entries.map((entry: any) => (
            <Paper key={entry.id} p="xs" radius="sm" withBorder>
              <Group justify="space-between" mb={4}>
                <Group gap={4}>
                  <Text size="xs" fw={600}>{entry.created_by_name || 'System'}</Text>
                  <Badge size="xs" variant="light" color={entry.type === 'work_note' ? 'yellow' : 'blue'}>
                    {entry.type === 'work_note' ? 'Work Note' : 'Comment'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">{dayjs(entry.created_at).format('MMM D, YYYY h:mm A')}</Text>
              </Group>
              <Text size="sm">{entry.body}</Text>
            </Paper>
          ))}
          {entries.length === 0 && !isLoading && (
            <Text size="sm" c="dimmed" ta="center" py="md">No comments yet</Text>
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

// ── Record Detail Panel ──────────────────────────────
function RecordDetail({ record, tableName, onRefresh }: { record: any; tableName: string; onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      if (tableName === 'incidents') return incidentsApi.update(record.id, data);
      if (tableName === 'changes') return changesApi.update(record.id, data);
      return problemsApi.update(record.id, data);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Record updated', color: 'green' });
      onRefresh();
      setEditingField(null);
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const handleInlineEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value || '');
  };

  const handleSaveField = (field: string) => {
    updateMutation.mutate({ [field]: editValue });
  };

  const stateTransitions: Record<string, string[]> = {
    incidents: ['new', 'in_progress', 'on_hold', 'resolved', 'closed'],
    changes: ['draft', 'submitted', 'assessment', 'approved', 'scheduled', 'implementing', 'completed', 'cancelled'],
    problems: ['new', 'investigation', 'root_cause_found', 'fix_in_progress', 'resolved', 'closed'],
  };

  const transitions = stateTransitions[tableName] || [];
  const currentIdx = transitions.indexOf(record.state);

  const fields = [
    { key: 'number', label: 'Number', editable: false },
    { key: 'short_description', label: 'Short Description', editable: true },
    { key: 'description', label: 'Description', editable: true },
    { key: 'state', label: 'State', editable: false },
    { key: 'priority', label: 'Priority', editable: false },
    { key: 'assigned_to_name', label: 'Assigned To', editable: false },
    { key: 'assignment_group_name', label: 'Assignment Group', editable: false },
    { key: 'created_at', label: 'Created', editable: false },
    { key: 'updated_at', label: 'Updated', editable: false },
  ];

  return (
    <Stack gap="md">
      {/* State transition buttons */}
      <Paper p="sm" radius="md" style={glassStyle}>
        <Group gap="xs">
          <Text size="xs" fw={600} c="dimmed" mr="xs">Transition:</Text>
          {transitions.map((state, idx) => (
            <Button
              key={state}
              size="xs"
              variant={state === record.state ? 'filled' : 'light'}
              disabled={idx <= currentIdx || idx > currentIdx + 1}
              onClick={() => updateMutation.mutate({ state })}
              loading={updateMutation.isPending}
            >
              {state.replace(/_/g, ' ')}
            </Button>
          ))}
        </Group>
      </Paper>

      {/* Fields */}
      <Paper p="md" radius="md" style={glassStyle}>
        <Title order={5} mb="sm">{record.number}: {record.short_description || record.title}</Title>
        <Stack gap="xs">
          {fields.map(({ key, label, editable }) => {
            const value = record[key];
            if (value === undefined || value === null) return null;

            const displayValue = key.includes('_at')
              ? dayjs(value).format('MMM D, YYYY h:mm A')
              : String(value);

            return (
              <Group key={key} gap="sm" align="flex-start">
                <Text size="xs" fw={600} c="dimmed" w={140} style={{ flexShrink: 0 }}>
                  {label}
                </Text>
                {editingField === key && editable ? (
                  <Group gap={4} style={{ flex: 1 }}>
                    {key === 'description' ? (
                      <Textarea
                        size="xs"
                        value={editValue}
                        onChange={(e) => setEditValue(e.currentTarget.value)}
                        style={{ flex: 1 }}
                        autosize
                        minRows={2}
                      />
                    ) : (
                      <TextInput
                        size="xs"
                        value={editValue}
                        onChange={(e) => setEditValue(e.currentTarget.value)}
                        style={{ flex: 1 }}
                      />
                    )}
                    <Button size="xs" onClick={() => handleSaveField(key)} loading={updateMutation.isPending}>Save</Button>
                    <Button size="xs" variant="subtle" onClick={() => setEditingField(null)}>Cancel</Button>
                  </Group>
                ) : (
                  <Text
                    size="sm"
                    style={{
                      flex: 1,
                      cursor: editable ? 'pointer' : 'default',
                      padding: '2px 4px',
                      borderRadius: 4,
                      ...(editable ? { ':hover': { background: 'var(--mantine-color-gray-1)' } } : {}),
                    }}
                    onClick={() => editable && handleInlineEdit(key, displayValue)}
                  >
                    {key === 'state' ? <StateIndicator state={value} /> : displayValue}
                  </Text>
                )}
              </Group>
            );
          })}
        </Stack>
      </Paper>

      {/* Journal Section */}
      <Paper p="md" radius="md" style={glassStyle}>
        <Title order={5} mb="sm">Activity</Title>
        <JournalSection tableName={tableName} recordId={record.id} />
      </Paper>
    </Stack>
  );
}

// ── Right Sidebar ────────────────────────────────────
function RightSidebar({ record, tableName }: { record: any; tableName: string }) {
  return (
    <Stack gap="md">
      {/* Related Records */}
      <Paper p="sm" radius="md" style={glassStyle}>
        <Group gap={6} mb="sm">
          <IconLink size={16} />
          <Title order={6}>Related Records</Title>
        </Group>
        <Stack gap="xs">
          {record.ci_name && (
            <Group gap={4}>
              <Badge size="xs" variant="light" color="teal">CI</Badge>
              <Text size="xs">{record.ci_name}</Text>
            </Group>
          )}
          {record.problem_id && (
            <Group gap={4}>
              <Badge size="xs" variant="light" color="violet">Problem</Badge>
              <Text size="xs">{record.problem_number || record.problem_id}</Text>
            </Group>
          )}
          {record.change_id && (
            <Group gap={4}>
              <Badge size="xs" variant="light" color="orange">Change</Badge>
              <Text size="xs">{record.change_number || record.change_id}</Text>
            </Group>
          )}
          {!record.ci_name && !record.problem_id && !record.change_id && (
            <Text size="xs" c="dimmed" ta="center" py="sm">No related records</Text>
          )}
        </Stack>
      </Paper>

      {/* KB Suggestions */}
      <Paper p="sm" radius="md" style={glassStyle}>
        <Group gap={6} mb="sm">
          <IconBook size={16} />
          <Title order={6}>KB Suggestions</Title>
        </Group>
        <Stack gap="xs">
          <Card p="xs" radius="sm" withBorder style={{ cursor: 'pointer' }} className="hover-lift">
            <Text size="xs" fw={500}>Password Reset Procedures</Text>
            <Text size="xs" c="dimmed">KB0001234 - 92% match</Text>
          </Card>
          <Card p="xs" radius="sm" withBorder style={{ cursor: 'pointer' }} className="hover-lift">
            <Text size="xs" fw={500}>VPN Troubleshooting Guide</Text>
            <Text size="xs" c="dimmed">KB0001235 - 78% match</Text>
          </Card>
          <Card p="xs" radius="sm" withBorder style={{ cursor: 'pointer' }} className="hover-lift">
            <Text size="xs" fw={500}>Network Connectivity Issues</Text>
            <Text size="xs" c="dimmed">KB0001236 - 65% match</Text>
          </Card>
        </Stack>
      </Paper>

      {/* AI Assist */}
      <Paper p="sm" radius="md" style={glassStyle}>
        <Group gap={6} mb="sm">
          <IconBrain size={16} />
          <Title order={6}>AI Assist</Title>
        </Group>
        <Button variant="light" size="xs" fullWidth leftSection={<IconBrain size={14} />}>
          Suggest Resolution
        </Button>
        <Button variant="light" size="xs" fullWidth mt="xs" leftSection={<IconBrain size={14} />}>
          Summarize Activity
        </Button>
        <Button variant="light" size="xs" fullWidth mt="xs" leftSection={<IconBrain size={14} />}>
          Similar Incidents
        </Button>
      </Paper>
    </Stack>
  );
}

// ── Main Agent Workspace ─────────────────────────────
export function AgentWorkspace() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('incidents');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('incidents');

  const { data: myWork, isLoading, refetch } = useQuery({
    queryKey: ['my-work'],
    queryFn: dashboardApi.getMyWork,
    refetchInterval: 30000,
  });

  const incidents = myWork?.incidents || [];
  const changes = myWork?.changes || [];
  const problems = myWork?.problems || [];

  const getActiveItems = () => {
    switch (activeTab) {
      case 'incidents': return incidents;
      case 'changes': return changes;
      case 'problems': return problems;
      default: return [];
    }
  };

  const activeItems = getActiveItems();
  const selectedRecord = activeItems.find((item: any) => item.id === selectedId);

  const handleSelectItem = (item: any) => {
    setSelectedId(item.id);
    setSelectedTable(activeTab === 'incidents' ? 'incidents' : activeTab === 'changes' ? 'changes' : 'problems');
  };

  // Auto-select first item when tab changes
  useEffect(() => {
    const items = getActiveItems();
    if (items.length > 0 && !items.find((i: any) => i.id === selectedId)) {
      setSelectedId(items[0].id);
      setSelectedTable(activeTab === 'incidents' ? 'incidents' : activeTab === 'changes' ? 'changes' : 'problems');
    }
  }, [activeTab, myWork]);

  return (
    <Stack className="fade-in" gap="sm">
      <Group justify="space-between">
        <Title order={2} className="page-title">Agent Workspace</Title>
        <ActionIcon variant="light" onClick={() => refetch()} loading={isLoading}>
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>

      <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 140px)' }}>
        {/* Left sidebar - Queue */}
        <Paper p="sm" radius="md" style={{ ...glassStyle, width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
            <Tabs.List grow>
              <Tabs.Tab value="incidents" leftSection={<IconAlertTriangle size={14} />}>
                <Group gap={4}>
                  <Text size="xs">Incidents</Text>
                  <Badge size="xs" variant="filled" circle>{incidents.length}</Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="changes" leftSection={<IconExchange size={14} />}>
                <Group gap={4}>
                  <Text size="xs">Changes</Text>
                  <Badge size="xs" variant="filled" circle>{changes.length}</Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="problems" leftSection={<IconBug size={14} />}>
                <Group gap={4}>
                  <Text size="xs">Problems</Text>
                  <Badge size="xs" variant="filled" circle>{problems.length}</Badge>
                </Group>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <ScrollArea style={{ flex: 1 }} mt="sm">
            <Stack gap="xs">
              {isLoading && <Loader size="sm" mx="auto" mt="xl" />}
              {!isLoading && activeItems.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="xl">No items assigned</Text>
              )}
              {activeItems.map((item: any) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onClick={() => handleSelectItem(item)}
                />
              ))}
            </Stack>
          </ScrollArea>
        </Paper>

        {/* Center - Record Detail */}
        <Paper p="md" radius="md" style={{ ...glassStyle, flex: 1, overflow: 'hidden' }}>
          <ScrollArea h="100%">
            {selectedRecord ? (
              <RecordDetail
                record={selectedRecord}
                tableName={selectedTable}
                onRefresh={() => {
                  refetch();
                  queryClient.invalidateQueries({ queryKey: ['my-work'] });
                }}
              />
            ) : (
              <Stack align="center" justify="center" h="100%" gap="md">
                <IconChevronRight size={48} style={{ opacity: 0.15 }} />
                <Text size="lg" c="dimmed" fw={500}>Select a record from the queue</Text>
                <Text size="sm" c="dimmed">Click on an item in the left panel to view details</Text>
              </Stack>
            )}
          </ScrollArea>
        </Paper>

        {/* Right sidebar - Context */}
        <Paper p="sm" radius="md" style={{ ...glassStyle, width: 280, flexShrink: 0, overflow: 'hidden' }}>
          <ScrollArea h="100%">
            {selectedRecord ? (
              <RightSidebar record={selectedRecord} tableName={selectedTable} />
            ) : (
              <Stack align="center" justify="center" h="100%" gap="md">
                <Text size="sm" c="dimmed" ta="center">Context panel will appear when a record is selected</Text>
              </Stack>
            )}
          </ScrollArea>
        </Paper>
      </div>
    </Stack>
  );
}
