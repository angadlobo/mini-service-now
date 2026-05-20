import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Button, Select, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { formsApi } from '../../../api/common.api';

export interface FormNodeConfig {
  form_template_id?: string;
  form_template_name?: string;
  assign_to_field?: string;
}

interface FormNodeEditorProps {
  opened: boolean;
  onClose: () => void;
  config: FormNodeConfig;
  onChange: (config: FormNodeConfig) => void;
  tableColumns: { name: string; label: string }[];
}

export function FormNodeEditor({ opened, onClose, config, onChange, tableColumns }: FormNodeEditorProps) {
  const [draft, setDraft] = useState<FormNodeConfig>(() => ({ ...config }));

  useEffect(() => {
    if (opened) setDraft({ ...config });
  }, [opened, config]);

  const { data: formTemplates } = useQuery({
    queryKey: ['form-templates-list'],
    queryFn: () => formsApi.list({ pageSize: 100 }),
    enabled: opened,
  });

  const formOptions = (formTemplates?.data || []).map((ft: any) => ({
    value: ft.id,
    label: ft.name,
  }));

  const columnOptions = tableColumns.map((col) => ({
    value: col.name,
    label: col.label,
  }));

  const handleApply = () => {
    // Resolve form template name for display
    const selectedForm = (formTemplates?.data || []).find((ft: any) => ft.id === draft.form_template_id);
    onChange({
      ...draft,
      form_template_name: selectedForm?.name || draft.form_template_name,
    });
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Configure Form Task" size="md">
      <Stack>
        <Select
          label="Form Template"
          placeholder="Select a form template"
          data={formOptions}
          value={draft.form_template_id || ''}
          onChange={(v) => setDraft({ ...draft, form_template_id: v || '' })}
          searchable
        />

        <Select
          label="Assign To Field"
          description="Which field on the record determines who fills out the form"
          placeholder="Select field"
          data={columnOptions}
          value={draft.assign_to_field || ''}
          onChange={(v) => setDraft({ ...draft, assign_to_field: v || '' })}
          searchable
        />

        {!draft.form_template_id && (
          <Text size="sm" c="dimmed">
            Select a form template to assign as a task in this workflow.
          </Text>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!draft.form_template_id}>Apply</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
