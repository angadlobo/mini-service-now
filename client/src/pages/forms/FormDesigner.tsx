import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Stack, Title, TextInput, Textarea, Switch, Button, Modal, Select,
  Table, Badge, Group, Paper, ActionIcon, Text, Loader, JsonInput, MultiSelect,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconGripVertical, IconTrash, IconPlus, IconEdit } from '@tabler/icons-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formsApi } from '../../api/common.api';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'reference', label: 'Reference (Lookup)' },
  { value: 'section', label: 'Section Header' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'contains', label: 'Contains' },
];

interface ConditionalLogic {
  field: string;
  operator: string;
  value: string;
}

interface FieldDef {
  id: string;
  field_type: string;
  label: string;
  name: string;
  required: boolean;
  config: Record<string, unknown>;
  conditional_logic?: ConditionalLogic | null;
  sort_order: number;
}

const emptyField: Omit<FieldDef, 'sort_order' | 'id'> = {
  field_type: 'text', label: '', name: '', required: false, config: {}, conditional_logic: null,
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

let tempIdCounter = 0;
function tempId() { return `temp_${++tempIdCounter}`; }

function SortableRow({ field, index, onEdit, onRemove }: {
  field: FieldDef; index: number; onEdit: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Table.Tr ref={setNodeRef} style={style}>
      <Table.Td w={40}>
        <ActionIcon variant="subtle" size="sm" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <IconGripVertical size={14} />
        </ActionIcon>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500}>{field.label}</Text>
        <Text size="xs" c="dimmed">{field.name}</Text>
        {field.conditional_logic && (
          <Text size="xs" c="blue">Show when: {field.conditional_logic.field} {field.conditional_logic.operator} {field.conditional_logic.value}</Text>
        )}
      </Table.Td>
      <Table.Td w={120}><Badge variant="light">{field.field_type}</Badge></Table.Td>
      <Table.Td w={90}>{field.required ? <Badge color="red" size="sm">Required</Badge> : '-'}</Table.Td>
      <Table.Td w={100}>
        <Group gap={4}>
          <ActionIcon variant="subtle" size="sm" onClick={onEdit}><IconEdit size={14} /></ActionIcon>
          <ActionIcon variant="subtle" size="sm" color="red" onClick={onRemove}><IconTrash size={14} /></ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

export function FormDesigner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [fieldModal, setFieldModal] = useState(false);
  const [fieldForm, setFieldForm] = useState<Omit<FieldDef, 'sort_order' | 'id'>>({ ...emptyField });
  const [configJson, setConfigJson] = useState('{}');
  const [editIdx, setEditIdx] = useState<number | null>(null);

  // Conditional logic state
  const [condEnabled, setCondEnabled] = useState(false);
  const [condField, setCondField] = useState('');
  const [condOperator, setCondOperator] = useState('equals');
  const [condValue, setCondValue] = useState('');

  const { data: existing, isLoading } = useQuery({
    queryKey: ['form-template', id],
    queryFn: () => formsApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description || '');
      setActive(existing.active);
      if (existing.fields) {
        setFields(existing.fields.map((f: any) => ({
          id: f.id || tempId(),
          field_type: f.field_type, label: f.label, name: f.name,
          required: f.required, config: f.config || {},
          conditional_logic: f.conditional_logic || null,
          sort_order: f.sort_order,
        })).sort((a: FieldDef, b: FieldDef) => a.sort_order - b.sort_order));
      }
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name, description, active,
        fields: fields.map((f, i) => ({
          field_type: f.field_type, label: f.label, name: f.name,
          required: f.required, config: f.config,
          conditional_logic: f.conditional_logic || null,
          sort_order: i,
        })),
      };
      return isEdit ? formsApi.update(id!, payload) : formsApi.create(payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: `Form ${isEdit ? 'updated' : 'created'}`, color: 'green' });
      navigate('/forms');
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const openAddField = () => {
    setEditIdx(null);
    setFieldForm({ ...emptyField });
    setConfigJson('{}');
    setCondEnabled(false);
    setCondField('');
    setCondOperator('equals');
    setCondValue('');
    setFieldModal(true);
  };

  const openEditField = (idx: number) => {
    setEditIdx(idx);
    const f = fields[idx];
    setFieldForm({ field_type: f.field_type, label: f.label, name: f.name, required: f.required, config: f.config, conditional_logic: f.conditional_logic });
    setConfigJson(JSON.stringify(f.config, null, 2));
    if (f.conditional_logic) {
      setCondEnabled(true);
      setCondField(f.conditional_logic.field);
      setCondOperator(f.conditional_logic.operator);
      setCondValue(f.conditional_logic.value);
    } else {
      setCondEnabled(false);
      setCondField('');
      setCondOperator('equals');
      setCondValue('');
    }
    setFieldModal(true);
  };

  const saveField = () => {
    let parsedConfig: Record<string, unknown> = {};
    try { parsedConfig = JSON.parse(configJson); } catch { /* keep empty */ }
    const fieldName = fieldForm.name || slugify(fieldForm.label);
    const conditional_logic = condEnabled && condField ? { field: condField, operator: condOperator, value: condValue } : null;
    const entry: FieldDef = {
      ...fieldForm, name: fieldName, config: parsedConfig, conditional_logic, sort_order: 0,
      id: editIdx !== null ? fields[editIdx].id : tempId(),
    };

    if (editIdx !== null) {
      setFields((prev) => prev.map((f, i) => (i === editIdx ? { ...entry, sort_order: f.sort_order } : f)));
    } else {
      setFields((prev) => [...prev, { ...entry, sort_order: prev.length }]);
    }
    setFieldModal(false);
  };

  const removeField = (idx: number) => setFields((prev) => prev.filter((_, i) => i !== idx));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragActive, over } = event;
    if (over && dragActive.id !== over.id) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === dragActive.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const setFF = (key: string, val: any) => setFieldForm((f) => ({
    ...f, [key]: val,
    ...(key === 'label' && editIdx === null ? { name: slugify(val) } : {}),
  }));

  // Available field names for conditional logic
  const availableFields = fields
    .filter((f) => f.field_type !== 'section')
    .map((f) => ({ value: f.name, label: f.label }));

  if (isEdit && isLoading) return <Loader />;

  return (
    <Stack>
      <Title order={2}>{isEdit ? 'Edit Form' : 'New Form'}</Title>

      <Paper p="md" withBorder>
        <Stack gap="sm">
          <TextInput label="Form Name" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          <Switch label="Active" checked={active} onChange={(e) => setActive(e.currentTarget.checked)} />
        </Stack>
      </Paper>

      <Group justify="space-between">
        <Title order={4}>Fields ({fields.length})</Title>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={openAddField}>Add Field</Button>
      </Group>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}></Table.Th>
                <Table.Th>Label</Table.Th>
                <Table.Th w={120}>Type</Table.Th>
                <Table.Th w={90}>Required</Table.Th>
                <Table.Th w={100}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {fields.length === 0 ? (
                <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" ta="center" py="md">No fields added yet. Click "Add Field" to start.</Text></Table.Td></Table.Tr>
              ) : fields.map((f, i) => (
                <SortableRow
                  key={f.id}
                  field={f}
                  index={i}
                  onEdit={() => openEditField(i)}
                  onRemove={() => removeField(i)}
                />
              ))}
            </Table.Tbody>
          </Table>
        </SortableContext>
      </DndContext>

      <Group justify="flex-end">
        <Button variant="subtle" onClick={() => navigate('/forms')}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Save Form</Button>
      </Group>

      <Modal opened={fieldModal} onClose={() => setFieldModal(false)} title={editIdx !== null ? 'Edit Field' : 'Add Field'} size="lg">
        <Stack>
          <Select label="Field Type" required data={FIELD_TYPES} value={fieldForm.field_type} onChange={(v) => setFF('field_type', v)} />
          <TextInput label="Label" required value={fieldForm.label} onChange={(e) => setFF('label', e.currentTarget.value)} />
          <TextInput label="Name" description="Auto-generated from label" value={fieldForm.name} onChange={(e) => setFF('name', e.currentTarget.value)} />
          <Switch label="Required" checked={fieldForm.required} onChange={(e) => setFF('required', e.currentTarget.checked)} />

          {(fieldForm.field_type === 'select' || fieldForm.field_type === 'radio' || fieldForm.field_type === 'multi_select') && (
            <TextInput
              label="Options (comma-separated)"
              description='e.g. "Engineering, Sales, Marketing"'
              value={(fieldForm.config as any)?.options?.join?.(', ') || ''}
              onChange={(e) => {
                const options = e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean);
                setFF('config', { ...fieldForm.config, options });
                setConfigJson(JSON.stringify({ ...fieldForm.config, options }, null, 2));
              }}
            />
          )}

          {fieldForm.field_type === 'reference' && (
            <Group grow>
              <TextInput
                label="Reference Table"
                description="e.g. users, incidents"
                value={(fieldForm.config as any)?.reference_table || ''}
                onChange={(e) => {
                  const config = { ...fieldForm.config, reference_table: e.currentTarget.value };
                  setFF('config', config);
                  setConfigJson(JSON.stringify(config, null, 2));
                }}
              />
              <TextInput
                label="Display Field"
                description="e.g. username, number"
                value={(fieldForm.config as any)?.reference_display || ''}
                onChange={(e) => {
                  const config = { ...fieldForm.config, reference_display: e.currentTarget.value };
                  setFF('config', config);
                  setConfigJson(JSON.stringify(config, null, 2));
                }}
              />
            </Group>
          )}

          <JsonInput
            label="Advanced Config (JSON)" description="Additional field configuration"
            minRows={3} autosize formatOnBlur validationError="Invalid JSON"
            value={configJson} onChange={setConfigJson}
          />

          {/* Conditional Logic */}
          <Paper p="sm" withBorder>
            <Stack gap="xs">
              <Switch
                label="Conditional Visibility"
                description="Show this field only when a condition is met"
                checked={condEnabled}
                onChange={(e) => setCondEnabled(e.currentTarget.checked)}
              />
              {condEnabled && (
                <Group grow>
                  <Select
                    label="When Field"
                    data={availableFields}
                    value={condField}
                    onChange={(v) => setCondField(v || '')}
                    placeholder="Select field"
                  />
                  <Select
                    label="Operator"
                    data={OPERATORS}
                    value={condOperator}
                    onChange={(v) => setCondOperator(v || 'equals')}
                  />
                  <TextInput
                    label="Value"
                    value={condValue}
                    onChange={(e) => setCondValue(e.currentTarget.value)}
                    placeholder="Expected value"
                  />
                </Group>
              )}
            </Stack>
          </Paper>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setFieldModal(false)}>Cancel</Button>
            <Button onClick={saveField} disabled={!fieldForm.label}>Save Field</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
