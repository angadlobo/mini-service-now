import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Paper, TextInput, Select, Switch, NumberInput, Button, Group, Stack,
  Text, Loader, Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconFilter, IconPlayerPlay } from '@tabler/icons-react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { workflowsApi } from '../../api/common.api';
import { appEngineApi } from '../../api/app-engine.api';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionEditor, type ConditionGroup } from './ConditionEditor';
import { ActionEditor, type Action } from './ActionEditor';

// ── Constants ──────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: 'record.created', label: 'Record Created' },
  { value: 'record.updated', label: 'Record Updated' },
  { value: 'record.state_changed', label: 'State Changed' },
];

const DEFAULT_TRIGGER_NODE: Node = {
  id: 'trigger-1',
  type: 'trigger',
  position: { x: 300, y: 50 },
  data: { trigger_event: '', table_name: '' },
  draggable: true,
};

// ── Component ──────────────────────────────────────────

export function WorkflowDesigner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // ── Form state ──
  const [name, setName] = useState('');
  const [tableName, setTableName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [active, setActive] = useState(true);
  const [executionOrder, setExecutionOrder] = useState(100);

  // ── ReactFlow state ──
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // ── Modal state ──
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // ── Node types (memoized to prevent re-renders) ──
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      condition: ConditionNode,
      action: ActionNode,
    }),
    [],
  );

  // ── Fetch registered tables ──
  const { data: registeredTables } = useQuery({
    queryKey: ['registered-tables'],
    queryFn: () => appEngineApi.getRegisteredTables(),
  });

  const tableOptions = useMemo(
    () =>
      (registeredTables || []).map((t: { name: string; label: string }) => ({
        value: t.name,
        label: t.label,
      })),
    [registeredTables],
  );

  // ── Get columns for the selected table ──
  const tableColumns = useMemo(() => {
    if (!tableName || !registeredTables) return [];
    const table = registeredTables.find((t: { name: string }) => t.name === tableName);
    if (!table || !table.columns) return [];
    return table.columns.map((c: { name: string; label?: string }) => ({
      name: c.name,
      label: c.label || c.name,
    }));
  }, [tableName, registeredTables]);

  // ── Fetch workflow if editing ──
  const { data: workflow, isLoading: isLoadingWorkflow } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowsApi.get(id!),
    enabled: isEditMode,
  });

  // ── Initialize from existing workflow ──
  useEffect(() => {
    if (!workflow) {
      if (!isEditMode) {
        setNodes([{ ...DEFAULT_TRIGGER_NODE }]);
      }
      return;
    }

    setName(workflow.name);
    setTableName(workflow.table_name);
    setTriggerEvent(workflow.trigger_event);
    setActive(workflow.active);
    setExecutionOrder(workflow.execution_order);

    const flowLayout = (workflow as any).flow_layout as
      | { nodes: Node[]; edges: Edge[] }
      | undefined;

    if (flowLayout && flowLayout.nodes && flowLayout.nodes.length > 0) {
      // Restore saved layout — re-attach callbacks
      const restoredNodes = flowLayout.nodes.map((n: Node) => {
        if (n.type === 'condition') {
          return {
            ...n,
            data: {
              ...n.data,
              onEdit: () => openConditionEditor(n.id),
            },
          };
        }
        if (n.type === 'action') {
          return {
            ...n,
            data: {
              ...n.data,
              onEdit: () => openActionEditor(n.id),
            },
          };
        }
        return n;
      });
      setNodes(restoredNodes);
      setEdges(flowLayout.edges);
    } else {
      // Build nodes from conditions/actions data
      const initialNodes: Node[] = [];
      const initialEdges: Edge[] = [];

      const triggerNode: Node = {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 300, y: 50 },
        data: { trigger_event: workflow.trigger_event, table_name: workflow.table_name },
        draggable: true,
      };
      initialNodes.push(triggerNode);

      const conditions = (workflow as any).conditions as ConditionGroup | undefined;
      if (conditions && conditions.conditions && conditions.conditions.length > 0) {
        const condNode: Node = {
          id: 'condition-1',
          type: 'condition',
          position: { x: 275, y: 200 },
          data: {
            condition: conditions,
            onEdit: () => openConditionEditor('condition-1'),
          },
          draggable: true,
        };
        initialNodes.push(condNode);
        initialEdges.push({
          id: 'e-trigger-cond',
          source: 'trigger-1',
          target: 'condition-1',
          animated: true,
        });

        // Add action nodes on the "yes" branch
        const actions = (workflow.actions || []) as any as Action[];
        actions.forEach((action, i) => {
          const actionId = `action-${i + 1}`;
          const actionNode: Node = {
            id: actionId,
            type: 'action',
            position: { x: 200 + i * 60, y: 400 + i * 120 },
            data: {
              action,
              onEdit: () => openActionEditor(actionId),
            },
            draggable: true,
          };
          initialNodes.push(actionNode);

          if (i === 0) {
            initialEdges.push({
              id: `e-cond-${actionId}`,
              source: 'condition-1',
              sourceHandle: 'yes',
              target: actionId,
              animated: true,
            });
          } else {
            // Chain actions (though actions don't have source handles,
            // we just connect condition to each for clarity)
            initialEdges.push({
              id: `e-cond-${actionId}`,
              source: 'condition-1',
              sourceHandle: 'yes',
              target: actionId,
              animated: true,
            });
          }
        });
      } else {
        // No conditions — add actions directly after trigger
        const actions = (workflow.actions || []) as any as Action[];
        actions.forEach((action, i) => {
          const actionId = `action-${i + 1}`;
          const actionNode: Node = {
            id: actionId,
            type: 'action',
            position: { x: 275, y: 200 + i * 140 },
            data: {
              action,
              onEdit: () => openActionEditor(actionId),
            },
            draggable: true,
          };
          initialNodes.push(actionNode);
          initialEdges.push({
            id: `e-trigger-${actionId}`,
            source: 'trigger-1',
            target: actionId,
            animated: true,
          });
        });
      }

      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  // ── Sync trigger node data when form fields change ──
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'trigger') {
          return {
            ...n,
            data: { ...n.data, trigger_event: triggerEvent, table_name: tableName },
          };
        }
        return n;
      }),
    );
  }, [triggerEvent, tableName, setNodes]);

  // ── Connection handler ──
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges],
  );

  // ── Node editing ──
  const openConditionEditor = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
    setConditionModalOpen(true);
  }, []);

  const openActionEditor = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
    setActionModalOpen(true);
  }, []);

  const getEditingNodeData = () => {
    if (!editingNodeId) return null;
    return nodes.find((n) => n.id === editingNodeId);
  };

  const handleConditionChange = useCallback(
    (condition: ConditionGroup) => {
      if (!editingNodeId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === editingNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                condition,
                onEdit: () => openConditionEditor(n.id),
              },
            };
          }
          return n;
        }),
      );
    },
    [editingNodeId, setNodes, openConditionEditor],
  );

  const handleActionChange = useCallback(
    (action: Action) => {
      if (!editingNodeId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === editingNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                action,
                onEdit: () => openActionEditor(n.id),
              },
            };
          }
          return n;
        }),
      );
    },
    [editingNodeId, setNodes, openActionEditor],
  );

  // ── Add nodes ──
  let nodeCounter = nodes.length;

  const addConditionNode = () => {
    nodeCounter += 1;
    const newId = `condition-${nodeCounter}-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'condition',
      position: { x: 250, y: 150 + nodes.length * 80 },
      data: {
        condition: { logic: 'AND', conditions: [] },
        onEdit: () => openConditionEditor(newId),
      },
      draggable: true,
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addActionNode = () => {
    nodeCounter += 1;
    const newId = `action-${nodeCounter}-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'action',
      position: { x: 250, y: 150 + nodes.length * 80 },
      data: {
        action: { type: '', config: {} },
        onEdit: () => openActionEditor(newId),
      },
      draggable: true,
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // ── Serialization ──
  const serializeFlow = () => {
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) return { conditions: { logic: 'AND', conditions: [] }, actions: [] };

    // Find condition nodes connected to trigger
    const triggerEdges = edges.filter((e) => e.source === triggerNode.id);
    const connectedConditionIds = triggerEdges
      .map((e) => e.target)
      .filter((targetId) => nodes.find((n) => n.id === targetId)?.type === 'condition');

    let conditions: ConditionGroup = { logic: 'AND', conditions: [] };
    const actions: Action[] = [];

    if (connectedConditionIds.length > 0) {
      // Take the first condition node connected to trigger
      const condNode = nodes.find((n) => n.id === connectedConditionIds[0]);
      if (condNode?.data?.condition) {
        conditions = condNode.data.condition;
      }

      // Collect action nodes from the "yes" branch of condition nodes
      const collectActions = (sourceId: string) => {
        const outEdges = edges.filter(
          (e) => e.source === sourceId && (e.sourceHandle === 'yes' || !e.sourceHandle),
        );
        for (const edge of outEdges) {
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (targetNode?.type === 'action' && targetNode.data?.action?.type) {
            actions.push(targetNode.data.action);
          } else if (targetNode?.type === 'condition') {
            // Recurse into nested conditions (though we only serialize the first condition)
            collectActions(targetNode.id);
          }
        }
      };

      for (const condId of connectedConditionIds) {
        collectActions(condId);
      }
    } else {
      // No conditions — collect actions directly connected to trigger
      for (const edge of triggerEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode?.type === 'action' && targetNode.data?.action?.type) {
          actions.push(targetNode.data.action);
        }
      }
    }

    return { conditions, actions };
  };

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEditMode
        ? workflowsApi.update(id!, payload)
        : workflowsApi.create(payload),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: isEditMode ? 'Workflow updated' : 'Workflow created',
        color: 'green',
      });
      navigate('/workflows');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to save workflow';
      notifications.show({ title: 'Error', message, color: 'red' });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      notifications.show({ title: 'Validation', message: 'Name is required', color: 'orange' });
      return;
    }
    if (!tableName) {
      notifications.show({ title: 'Validation', message: 'Table is required', color: 'orange' });
      return;
    }
    if (!triggerEvent) {
      notifications.show({ title: 'Validation', message: 'Trigger event is required', color: 'orange' });
      return;
    }

    const { conditions, actions } = serializeFlow();

    // Strip callbacks from node data before persisting
    const cleanNodes = nodes.map((n) => {
      const { onEdit, ...restData } = n.data || {};
      return { ...n, data: restData };
    });

    const payload = {
      name,
      table_name: tableName,
      trigger_event: triggerEvent,
      conditions,
      actions,
      active,
      execution_order: executionOrder,
      flow_layout: { nodes: cleanNodes, edges },
    };

    saveMutation.mutate(payload);
  };

  // ── Loading state ──
  if (isEditMode && isLoadingWorkflow) {
    return (
      <Stack align="center" justify="center" style={{ height: '80vh' }}>
        <Loader size="lg" />
        <Text>Loading workflow...</Text>
      </Stack>
    );
  }

  // ── Get editing data for modals ──
  const editingNode = getEditingNodeData();

  return (
    <Stack gap={0} style={{ height: '100vh', overflow: 'hidden' }}>
      {/* ── Top bar ── */}
      <Paper p="sm" withBorder style={{ borderRadius: 0 }}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="wrap">
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/workflows')}
            >
              Back
            </Button>
            <TextInput
              placeholder="Workflow name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              size="sm"
              style={{ minWidth: 200 }}
            />
            <Select
              placeholder="Table"
              data={tableOptions}
              value={tableName}
              onChange={(v) => setTableName(v || '')}
              size="sm"
              searchable
              style={{ minWidth: 160 }}
            />
            <Select
              placeholder="Trigger event"
              data={TRIGGER_OPTIONS}
              value={triggerEvent}
              onChange={(v) => setTriggerEvent(v || '')}
              size="sm"
              style={{ minWidth: 160 }}
            />
            <NumberInput
              placeholder="Order"
              value={executionOrder}
              onChange={(v) => setExecutionOrder(Number(v) || 100)}
              size="sm"
              style={{ width: 80 }}
              min={0}
            />
            <Switch
              label="Active"
              checked={active}
              onChange={(e) => setActive(e.currentTarget.checked)}
              size="sm"
            />
          </Group>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={saveMutation.isPending}
          >
            Save
          </Button>
        </Group>
      </Paper>

      {/* ── Main canvas area ── */}
      <Box style={{ flex: 1, position: 'relative' }}>
        {/* ── Side panel (overlay) ── */}
        <Paper
          shadow="sm"
          p="xs"
          withBorder
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            Add Node
          </Text>
          <Button
            size="xs"
            variant="light"
            color="yellow"
            leftSection={<IconFilter size={14} />}
            onClick={addConditionNode}
          >
            Condition
          </Button>
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={addActionNode}
          >
            Action
          </Button>
        </Paper>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            style={{ height: 100, width: 150 }}
            zoomable
            pannable
          />
        </ReactFlow>
      </Box>

      {/* ── Condition Editor Modal ── */}
      {editingNode?.type === 'condition' && (
        <ConditionEditor
          opened={conditionModalOpen}
          onClose={() => {
            setConditionModalOpen(false);
            setEditingNodeId(null);
          }}
          condition={
            editingNode.data?.condition || { logic: 'AND', conditions: [] }
          }
          onChange={handleConditionChange}
          tableColumns={tableColumns}
        />
      )}

      {/* ── Action Editor Modal ── */}
      {editingNode?.type === 'action' && (
        <ActionEditor
          opened={actionModalOpen}
          onClose={() => {
            setActionModalOpen(false);
            setEditingNodeId(null);
          }}
          action={editingNode.data?.action || { type: '', config: {} }}
          onChange={handleActionChange}
          tableColumns={tableColumns}
        />
      )}
    </Stack>
  );
}
