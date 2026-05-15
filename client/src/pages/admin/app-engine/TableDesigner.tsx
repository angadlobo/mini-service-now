import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, TextInput, Select, Switch, Button, Modal, Table, Badge,
  Group, Paper, ActionIcon, Text, Loader, Checkbox, Collapse, MultiSelect,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconPlus, IconGripVertical } from '@tabler/icons-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { appEngineApi } from '../../../api/app-engine.api';

const COLUMN_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'select', label: 'Select' },
  { value: 'reference', label: 'Reference' },
];

interface Column {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  showInList: boolean;
  showInForm: boolean;
  options?: { value: string; label: string }[];
  reference_table?: string;
  reference_display?: string;
}

interface StateDef {
  name: string;
  transitions: string[];
}

let colIdCounter = 0;
function nextColId() {
  colIdCounter += 1;
  return `col_${Date.now()}_${colIdCounter}`;
}

function SortableRow({
  col,
  index,
  updateColumn,
  removeColumn,
}: {
  col: Column;
  index: number;
  updateColumn: (index: number, key: string, val: unknown) => void;
  removeColumn: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: col.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Table.Tr ref={setNodeRef} style={style}>
      <Table.Td>
        <ActionIcon variant="subtle" size="sm" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <IconGripVertical size={14} />
        </ActionIcon>
      </Table.Td>
      <Table.Td>
        <TextInput
          size="xs"
          value={col.name}
          onChange={(e) => updateColumn(index, 'name', e.currentTarget.value.replace(/\s/g, ''))}
          placeholder="column_name"
        />
      </Table.Td>
      <Table.Td>
        <TextInput
          size="xs"
          value={col.label}
          onChange={(e) => updateColumn(index, 'label', e.currentTarget.value)}
          placeholder="Label"
        />
      </Table.Td>
      <Table.Td>
        <Select
          size="xs"
          data={COLUMN_TYPES}
          value={col.type}
          onChange={(v) => updateColumn(index, 'type', v)}
          w={120}
        />
      </Table.Td>
      <Table.Td><Checkbox size="xs" checked={col.required} onChange={(e) => updateColumn(index, 'required', e.currentTarget.checked)} /></Table.Td>
      <Table.Td><Checkbox size="xs" checked={col.showInList} onChange={(e) => updateColumn(index, 'showInList', e.currentTarget.checked)} /></Table.Td>
      <Table.Td><Checkbox size="xs" checked={col.showInForm} onChange={(e) => updateColumn(index, 'showInForm', e.currentTarget.checked)} /></Table.Td>
      <Table.Td>
        {col.type === 'select' && (
          <TextInput
            size="xs"
            placeholder="opt1, opt2, opt3"
            value={(col.options || []).map((o) => o.value).join(', ')}
            onChange={(e) => {
              const opts = e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean).map((v) => ({ value: v, label: v }));
              updateColumn(index, 'options', opts);
            }}
          />
        )}
        {col.type === 'reference' && (
          <Group gap="xs">
            <TextInput
              size="xs"
              placeholder="Table"
              value={col.reference_table || ''}
              onChange={(e) => updateColumn(index, 'reference_table', e.currentTarget.value)}
              w={100}
            />
            <TextInput
              size="xs"
              placeholder="Display field"
              value={col.reference_display || ''}
              onChange={(e) => updateColumn(index, 'reference_display', e.currentTarget.value)}
              w={100}
            />
          </Group>
        )}
      </Table.Td>
      <Table.Td>
        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeColumn(index)}>
          <IconTrash size={14} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  );
}

export function TableDesigner() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [label, setLabel] = useState('');
  const [numberPrefix, setNumberPrefix] = useState('');
  const [iconName, setIconName] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);

  // State machine
  const [statesEnabled, setStatesEnabled] = useState(false);
  const [statesOpen, setStatesOpen] = useState(false);
  const [initialState, setInitialState] = useState('');
  const [states, setStates] = useState<StateDef[]>([]);

  // Confirmation modal
  const [createDbModal, setCreateDbModal] = useState(false);

  const { data: table, isLoading } = useQuery({
    queryKey: ['app-engine-table', tableId],
    queryFn: () => appEngineApi.getTable(tableId!),
    enabled: !!tableId,
  });

  useEffect(() => {
    if (table) {
      setLabel(table.label || '');
      setNumberPrefix(table.number_prefix || '');
      setIconName(table.icon || '');
      if (table.columns) {
        setColumns(
          table.columns.map((c: any) => ({
            id: c.id || nextColId(),
            name: c.name || '',
            label: c.label || '',
            type: c.type || 'string',
            required: c.required ?? false,
            showInList: c.showInList ?? true,
            showInForm: c.showInForm ?? true,
            options: c.options,
            reference_table: c.reference_table,
            reference_display: c.reference_display,
          }))
        );
      }
      if (table.states && table.states.length > 0) {
        setStatesEnabled(true);
        setStatesOpen(true);
        setInitialState(table.initial_state || '');
        setStates(table.states.map((s: any) => ({ name: s.name, transitions: s.transitions || [] })));
      }
    }
  }, [table]);

  const updateColumn = (index: number, key: string, val: unknown) => {
    setColumns((prev) => prev.map((c, i) => (i === index ? { ...c, [key]: val } : c)));
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      { id: nextColId(), name: '', label: '', type: 'string', required: false, showInList: true, showInForm: true },
    ]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === active.id);
        const newIndex = prev.findIndex((c) => c.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  // State machine helpers
  const stateNames = states.map((s) => s.name).filter(Boolean);

  const addState = () => {
    setStates((prev) => [...prev, { name: '', transitions: [] }]);
  };

  const updateState = (index: number, key: string, val: unknown) => {
    setStates((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: val } : s)));
  };

  const removeState = (index: number) => {
    setStates((prev) => prev.filter((_, i) => i !== index));
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        label,
        number_prefix: numberPrefix,
        icon: iconName,
        columns: columns.map(({ id: _id, ...rest }) => rest),
      };
      if (statesEnabled) {
        payload.states = states;
        payload.initial_state = initialState;
      } else {
        payload.states = [];
        payload.initial_state = '';
      }
      return appEngineApi.updateTable(tableId!, payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'Table updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-table', tableId] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const createDbMutation = useMutation({
    mutationFn: () => appEngineApi.createDbTable(tableId!),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Database table created', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-table', tableId] });
      setCreateDbModal(false);
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to create DB table', color: 'red' });
      setCreateDbModal(false);
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => appEngineApi.syncSchema(tableId!),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Schema synced', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-table', tableId] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Sync failed', color: 'red' }),
  });

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Table Designer: {table?.label || table?.name}</Title>
        <Button variant="subtle" onClick={() => navigate(-1)}>Back</Button>
      </Group>

      {/* Top section */}
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <TextInput label="Name" value={table?.name || ''} readOnly={table?.db_table_created} disabled={table?.db_table_created} description={table?.db_table_created ? 'Cannot change name after DB table is created' : undefined} />
          <TextInput label="Label" value={label} onChange={(e) => setLabel(e.currentTarget.value)} />
          <TextInput label="Number Prefix" placeholder="e.g. INC, REQ" value={numberPrefix} onChange={(e) => setNumberPrefix(e.currentTarget.value)} />
          <TextInput label="Icon" placeholder="e.g. IconTable" value={iconName} onChange={(e) => setIconName(e.currentTarget.value)} />
        </Stack>
      </Paper>

      {/* Column editor */}
      <Group justify="space-between">
        <Title order={4}>Columns ({columns.length})</Title>
        <Button size="sm" leftSection={<IconPlus size={16} />} onClick={addColumn}>Add Column</Button>
      </Group>

      <Paper withBorder style={{ overflowX: 'auto' }}>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}></Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Label</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th w={60}>Req</Table.Th>
                  <Table.Th w={60}>List</Table.Th>
                  <Table.Th w={60}>Form</Table.Th>
                  <Table.Th>Type Config</Table.Th>
                  <Table.Th w={50}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {columns.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={9}><Text c="dimmed" ta="center" py="md">No columns. Click "Add Column" to start.</Text></Table.Td>
                  </Table.Tr>
                ) : columns.map((col, i) => (
                  <SortableRow
                    key={col.id}
                    col={col}
                    index={i}
                    updateColumn={updateColumn}
                    removeColumn={removeColumn}
                  />
                ))}
              </Table.Tbody>
            </Table>
          </SortableContext>
        </DndContext>
      </Paper>

      {/* State machine section */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Group gap="sm">
            <Title order={4}>State Machine</Title>
            <Switch
              checked={statesEnabled}
              onChange={(e) => {
                setStatesEnabled(e.currentTarget.checked);
                setStatesOpen(e.currentTarget.checked);
              }}
              label="Enable"
            />
          </Group>
          {statesEnabled && (
            <Button variant="subtle" size="xs" onClick={() => setStatesOpen((v) => !v)}>
              {statesOpen ? 'Collapse' : 'Expand'}
            </Button>
          )}
        </Group>
        <Collapse in={statesOpen && statesEnabled}>
          <Stack gap="sm">
            <Select
              label="Initial State"
              data={stateNames.map((n) => ({ value: n, label: n }))}
              value={initialState}
              onChange={(v) => setInitialState(v || '')}
              clearable
            />
            {states.map((s, i) => (
              <Group key={i} align="flex-end" gap="sm">
                <TextInput
                  label="State Name"
                  value={s.name}
                  onChange={(e) => updateState(i, 'name', e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <MultiSelect
                  label="Allowed Transitions"
                  data={stateNames.filter((n) => n !== s.name).map((n) => ({ value: n, label: n }))}
                  value={s.transitions}
                  onChange={(v) => updateState(i, 'transitions', v)}
                  style={{ flex: 2 }}
                />
                <ActionIcon variant="subtle" color="red" onClick={() => removeState(i)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
            <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addState} w="fit-content">
              Add State
            </Button>
          </Stack>
        </Collapse>
      </Paper>

      {/* Action buttons */}
      <Group justify="flex-end">
        {!table?.db_table_created && (
          <Button variant="outline" color="orange" onClick={() => setCreateDbModal(true)}>
            Create Database Table
          </Button>
        )}
        {table?.db_table_created && (
          <Button variant="outline" onClick={() => syncMutation.mutate()} loading={syncMutation.isPending}>
            Sync Schema
          </Button>
        )}
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          Save
        </Button>
      </Group>

      {/* Create DB Confirmation Modal */}
      <Modal opened={createDbModal} onClose={() => setCreateDbModal(false)} title="Create Database Table">
        <Stack>
          <Text>
            This will create the physical database table for <strong>{table?.name}</strong>.
            After creation, the table name cannot be changed.
          </Text>
          <Text size="sm" c="dimmed">Make sure you have saved your column definitions first.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setCreateDbModal(false)}>Cancel</Button>
            <Button color="orange" onClick={() => createDbMutation.mutate()} loading={createDbMutation.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
