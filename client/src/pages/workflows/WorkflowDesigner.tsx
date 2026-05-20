import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Paper, TextInput, Select, Switch, NumberInput, Button, Group, Stack,
  Text, Loader, Box, Drawer, JsonInput, Badge, ScrollArea, Divider,
  ThemeIcon, Code, Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceFloppy, IconArrowLeft, IconFilter, IconPlayerPlay,
  IconForms, IconClock, IconGitBranch, IconTestPipe, IconCheck,
  IconX, IconArrowRight, IconChecklist, IconWorld, IconArrowBigUpLines,
  IconSwitchHorizontal, IconLayoutColumns, IconBolt, IconCalendarEvent,
  IconWebhook, IconAlarm, IconStarFilled, IconRefresh,
} from '@tabler/icons-react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type DefaultEdgeOptions,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { workflowsApi } from '../../api/common.api';
import { appEngineApi } from '../../api/app-engine.api';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { FormNode } from './nodes/FormNode';
import { DelayNode } from './nodes/DelayNode';
import { SubWorkflowNode } from './nodes/SubWorkflowNode';
import { ApprovalNode } from './nodes/ApprovalNode';
import { HttpNode } from './nodes/HttpNode';
import { IfElseNode } from './nodes/IfElseNode';
import { SwitchNode } from './nodes/SwitchNode';
import { ParallelNode } from './nodes/ParallelNode';
import { EscalateNode } from './nodes/EscalateNode';
import { ConditionEditor, type ConditionGroup } from './ConditionEditor';
import { ActionEditor, type Action } from './ActionEditor';
import { FormNodeEditor, type FormNodeConfig } from './editors/FormNodeEditor';
import { DelayNodeEditor, type DelayNodeConfig } from './editors/DelayNodeEditor';
import { SubWorkflowNodeEditor, type SubWorkflowNodeConfig } from './editors/SubWorkflowNodeEditor';
import { ApprovalNodeEditor, type ApprovalNodeConfig } from './editors/ApprovalNodeEditor';
import { HttpNodeEditor, type HttpNodeConfig } from './editors/HttpNodeEditor';
import { IfElseNodeEditor, type IfElseNodeConfig } from './editors/IfElseNodeEditor';
import { SwitchNodeEditor, type SwitchNodeConfig } from './editors/SwitchNodeEditor';
import { EscalateNodeEditor, type EscalateNodeConfig } from './editors/EscalateNodeEditor';

// ── Constants ──────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: 'record.created', label: 'Record Created' },
  { value: 'record.updated', label: 'Record Updated' },
  { value: 'record.state_changed', label: 'State Changed' },
  { value: 'approval.decided', label: 'Approval Decided' },
  { value: 'sla.breached', label: 'SLA Breached' },
  { value: 'webhook.received', label: 'Webhook Received' },
  { value: 'scheduled', label: 'Scheduled' },
];

const DEFAULT_TRIGGER_NODE: Node = {
  id: 'trigger-1',
  type: 'trigger',
  position: { x: 350, y: 30 },
  data: { trigger_event: '', table_name: '' },
  draggable: true,
};

/** Default edge options -- animated with directional arrowhead */
const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2, stroke: '#667eea' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: '#667eea',
  },
};

/** Create a styled edge with label and color */
function makeEdge(id: string, source: string, target: string, opts?: {
  sourceHandle?: string; label?: string; color?: string;
}): Edge {
  const color = opts?.color || '#667eea';
  return {
    id,
    source,
    target,
    sourceHandle: opts?.sourceHandle,
    animated: true,
    label: opts?.label,
    labelStyle: { fontWeight: 700, fontSize: 11, fill: color },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
    style: { strokeWidth: 2, stroke: color },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
  };
}

// ── Component ──────────────────────────────────────────

export function WorkflowDesigner() {
  return (
    <ReactFlowProvider>
      <WorkflowDesignerInner />
    </ReactFlowProvider>
  );
}

function WorkflowDesignerInner() {
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
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [subWorkflowModalOpen, setSubWorkflowModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [httpModalOpen, setHttpModalOpen] = useState(false);
  const [ifElseModalOpen, setIfElseModalOpen] = useState(false);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // ── Test panel state ──
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [testRecord, setTestRecord] = useState('{\n  "state": "new",\n  "priority": "1",\n  "assigned_to": ""\n}');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Record<string, 'pass' | 'fail'>>({});

  // ── Node types (memoized) ──
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      condition: ConditionNode,
      action: ActionNode,
      form: FormNode,
      delay: DelayNode,
      subworkflow: SubWorkflowNode,
      approval: ApprovalNode,
      http: HttpNode,
      ifelse: IfElseNode,
      switch: SwitchNode,
      parallel: ParallelNode,
      escalate: EscalateNode,
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

  // ── Node editing callbacks ──
  const openConditionEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setConditionModalOpen(true); }, []);
  const openActionEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setActionModalOpen(true); }, []);
  const openFormEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setFormModalOpen(true); }, []);
  const openDelayEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setDelayModalOpen(true); }, []);
  const openSubWorkflowEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setSubWorkflowModalOpen(true); }, []);
  const openApprovalEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setApprovalModalOpen(true); }, []);
  const openHttpEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setHttpModalOpen(true); }, []);
  const openIfElseEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setIfElseModalOpen(true); }, []);
  const openSwitchEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setSwitchModalOpen(true); }, []);
  const openEscalateEditor = useCallback((nodeId: string) => { setEditingNodeId(nodeId); setEscalateModalOpen(true); }, []);

  const editMap: Record<string, (id: string) => void> = useMemo(() => ({
    condition: openConditionEditor,
    action: openActionEditor,
    form: openFormEditor,
    delay: openDelayEditor,
    subworkflow: openSubWorkflowEditor,
    approval: openApprovalEditor,
    http: openHttpEditor,
    ifelse: openIfElseEditor,
    switch: openSwitchEditor,
    escalate: openEscalateEditor,
  }), [openConditionEditor, openActionEditor, openFormEditor, openDelayEditor, openSubWorkflowEditor,
    openApprovalEditor, openHttpEditor, openIfElseEditor, openSwitchEditor, openEscalateEditor]);

  /** Re-attach onEdit callback for a node based on its type */
  const attachCallback = useCallback((n: Node): Node => {
    const opener = editMap[n.type || ''];
    if (opener) {
      return { ...n, data: { ...n.data, onEdit: () => opener(n.id) } };
    }
    return n;
  }, [editMap]);

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
      const restoredNodes = flowLayout.nodes.map(attachCallback);
      const restoredEdges = flowLayout.edges.map((e: Edge) => ({
        ...e,
        animated: true,
        style: e.style || { strokeWidth: 2, stroke: '#667eea' },
        markerEnd: e.markerEnd || {
          type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#667eea',
        },
      }));
      setNodes(restoredNodes);
      setEdges(restoredEdges);
    } else {
      const initialNodes: Node[] = [];
      const initialEdges: Edge[] = [];
      const CX = 350;
      let curY = 30;

      const triggerNode: Node = {
        id: 'trigger-1', type: 'trigger',
        position: { x: CX, y: curY },
        data: { trigger_event: workflow.trigger_event, table_name: workflow.table_name },
        draggable: true,
      };
      initialNodes.push(triggerNode);
      curY += 160;

      const conditions = (workflow as any).conditions as ConditionGroup | undefined;
      let lastSourceId = 'trigger-1';
      let lastSourceHandle: string | undefined;

      if (conditions && conditions.conditions && conditions.conditions.length > 0) {
        const condNode: Node = attachCallback({
          id: 'condition-1', type: 'condition',
          position: { x: CX - 25, y: curY },
          data: { condition: conditions },
          draggable: true,
        });
        initialNodes.push(condNode);
        initialEdges.push(makeEdge('e-trigger-cond', 'trigger-1', 'condition-1'));
        lastSourceId = 'condition-1';
        lastSourceHandle = 'yes';
        curY += 180;
      }

      const actions = (workflow.actions || []) as any as Action[];
      actions.forEach((action, i) => {
        const actionId = `action-${i + 1}`;
        const actionNode: Node = attachCallback({
          id: actionId, type: 'action',
          position: { x: CX, y: curY },
          data: { action },
          draggable: true,
        });
        initialNodes.push(actionNode);

        const edgeColor = lastSourceHandle === 'yes' ? '#2f9e44' : '#667eea';
        const edgeLabel = (i === 0 && lastSourceHandle === 'yes') ? 'Yes' : undefined;
        initialEdges.push(makeEdge(
          `e-${lastSourceId}-${actionId}`,
          lastSourceId, actionId,
          { sourceHandle: lastSourceHandle, label: edgeLabel, color: edgeColor },
        ));

        lastSourceId = actionId;
        lastSourceHandle = undefined;
        curY += 140;
      });

      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  // ── Sync trigger node data ──
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'trigger') {
          return { ...n, data: { ...n.data, trigger_event: triggerEvent, table_name: tableName } };
        }
        return n;
      }),
    );
  }, [triggerEvent, tableName, setNodes]);

  // ── Connection handler with arrow styling ──
  const onConnect = useCallback(
    (connection: Connection) => {
      const isYesBranch = connection.sourceHandle === 'yes' || connection.sourceHandle === 'then';
      const isNoBranch = connection.sourceHandle === 'no' || connection.sourceHandle === 'else';
      const color = isYesBranch ? '#2f9e44' : isNoBranch ? '#e03131' : '#667eea';
      const label = isYesBranch ? 'Yes / Then' : isNoBranch ? 'No / Else' : undefined;

      setEdges((eds) => addEdge({
        ...connection,
        animated: true,
        label,
        labelStyle: { fontWeight: 700, fontSize: 11, fill: color },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        style: { strokeWidth: 2, stroke: color },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
      }, eds));
    },
    [setEdges],
  );

  const getEditingNodeData = () => {
    if (!editingNodeId) return null;
    return nodes.find((n) => n.id === editingNodeId);
  };

  // ── Node data change handlers ──
  const handleConditionChange = useCallback(
    (condition: ConditionGroup) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, condition, onEdit: () => openConditionEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openConditionEditor],
  );

  const handleActionChange = useCallback(
    (action: Action) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, action, onEdit: () => openActionEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openActionEditor],
  );

  const handleFormConfigChange = useCallback(
    (config: FormNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openFormEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openFormEditor],
  );

  const handleDelayConfigChange = useCallback(
    (config: DelayNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openDelayEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openDelayEditor],
  );

  const handleSubWorkflowConfigChange = useCallback(
    (config: SubWorkflowNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openSubWorkflowEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openSubWorkflowEditor],
  );

  const handleApprovalConfigChange = useCallback(
    (config: ApprovalNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openApprovalEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openApprovalEditor],
  );

  const handleHttpConfigChange = useCallback(
    (config: HttpNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openHttpEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openHttpEditor],
  );

  const handleIfElseConfigChange = useCallback(
    (config: IfElseNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openIfElseEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openIfElseEditor],
  );

  const handleSwitchConfigChange = useCallback(
    (config: SwitchNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openSwitchEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openSwitchEditor],
  );

  const handleEscalateConfigChange = useCallback(
    (config: EscalateNodeConfig) => {
      if (!editingNodeId) return;
      setNodes((nds) => nds.map((n) => n.id === editingNodeId
        ? { ...n, data: { ...n.data, config, onEdit: () => openEscalateEditor(n.id) } } : n));
    },
    [editingNodeId, setNodes, openEscalateEditor],
  );

  // ── Find the bottom-most node to auto-position new nodes ──
  const getNextNodePosition = () => {
    if (nodes.length === 0) return { x: 350, y: 50 };
    let maxY = 0;
    let maxYNodeX = 350;
    for (const n of nodes) {
      if (n.position.y > maxY) {
        maxY = n.position.y;
        maxYNodeX = n.position.x;
      }
    }
    return { x: maxYNodeX, y: maxY + 160 };
  };

  const getLastNodeId = (): string | null => {
    if (nodes.length === 0) return null;
    let maxY = -Infinity;
    let lastId = nodes[0].id;
    for (const n of nodes) {
      if (n.position.y > maxY) {
        maxY = n.position.y;
        lastId = n.id;
      }
    }
    return lastId;
  };

  // ── Add nodes with auto-connect ──
  let nodeCounter = nodes.length;

  const addNodeAndConnect = (type: string, data: any) => {
    nodeCounter += 1;
    const newId = `${type}-${nodeCounter}-${Date.now()}`;
    const pos = getNextNodePosition();
    const lastNodeId = getLastNodeId();
    const newNode: Node = {
      id: newId, type,
      position: pos,
      data: { ...data, onEdit: undefined },
      draggable: true,
    };

    if (editMap[type]) {
      newNode.data.onEdit = () => editMap[type](newId);
    }

    setNodes((nds) => [...nds, newNode]);

    if (lastNodeId) {
      const lastNode = nodes.find(n => n.id === lastNodeId);
      const sourceHandle = lastNode?.type === 'condition' ? 'yes'
        : lastNode?.type === 'ifelse' ? 'then'
        : undefined;
      const color = sourceHandle ? '#2f9e44' : '#667eea';
      const label = sourceHandle ? 'Yes / Then' : undefined;

      setEdges((eds) => [
        ...eds,
        makeEdge(`e-${lastNodeId}-${newId}`, lastNodeId, newId, { sourceHandle, label, color }),
      ]);
    }
  };

  const addTriggerNode = (triggerEventType: string) => {
    // Check if a trigger node already exists - replace its data instead of adding a new one
    const existingTrigger = nodes.find(n => n.type === 'trigger');
    if (existingTrigger) {
      setTriggerEvent(triggerEventType);
      return;
    }
    // No trigger node exists, add one
    nodeCounter += 1;
    const newId = `trigger-${nodeCounter}-${Date.now()}`;
    const pos = getNextNodePosition();
    const newNode: Node = {
      id: newId, type: 'trigger',
      position: pos,
      data: { trigger_event: triggerEventType, table_name: tableName },
      draggable: true,
    };
    setNodes((nds) => [...nds, newNode]);
    setTriggerEvent(triggerEventType);
  };

  const addConditionNode = () => addNodeAndConnect('condition', { condition: { logic: 'AND', conditions: [] } });
  const addActionNode = () => addNodeAndConnect('action', { action: { type: '', config: {} } });
  const addFormNode = () => addNodeAndConnect('form', { config: { form_template_id: '', assign_to_field: 'assigned_to' } });
  const addDelayNode = () => addNodeAndConnect('delay', { config: { duration_value: 5, duration_unit: 'minutes', duration_minutes: 5 } });
  const addSubWorkflowNode = () => addNodeAndConnect('subworkflow', { config: { target_workflow_id: '' } });
  const addApprovalNode = () => addNodeAndConnect('approval', { config: { approver_ids: [], approval_type: 'all', wait_for_completion: true } });
  const addHttpNode = () => addNodeAndConnect('http', { config: { url: '', method: 'GET' } });
  const addIfElseNode = () => addNodeAndConnect('ifelse', { config: { condition: { logic: 'AND', conditions: [] }, then_actions: [], else_actions: [] } });
  const addSwitchNode = () => addNodeAndConnect('switch', { config: { field: '', cases: {}, default_actions: [] } });
  const addEscalateNode = () => addNodeAndConnect('escalate', { config: { escalation_type: 'manager', target: '', reason: '' } });

  // ── Drag-and-drop from sidebar ──
  const reactFlowInstance = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let data: any = {};
      try {
        const rawData = event.dataTransfer.getData('application/reactflow-data');
        if (rawData) data = JSON.parse(rawData);
      } catch { /* use empty data */ }

      const newId = `${type}-drop-${Date.now()}`;
      const newNode: Node = {
        id: newId,
        type,
        position,
        data: { ...data, onEdit: undefined },
        draggable: true,
      };

      if (editMap[type]) {
        newNode.data.onEdit = () => editMap[type](newId);
      }

      // For trigger nodes, update the form state and replace existing trigger
      if (type === 'trigger') {
        const triggerEvent = data.trigger_event || '';
        setTriggerEvent(triggerEvent);
        setNodes((nds) => {
          const withoutOldTrigger = nds.filter(n => n.type !== 'trigger');
          return [...withoutOldTrigger, newNode];
        });
        return;
      }

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, editMap, setNodes, setTriggerEvent],
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, defaultData: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(defaultData));
    event.dataTransfer.effectAllowed = 'move';
  };

  // ── Delete nodes handler ──
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = new Set(deletedNodes.map((n) => n.id));
      setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
    },
    [setEdges],
  );

  // ── Serialization ──
  const serializeFlow = () => {
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) return { conditions: { logic: 'AND', conditions: [] }, actions: [] };

    const triggerEdges = edges.filter((e) => e.source === triggerNode.id);
    const connectedConditionIds = triggerEdges
      .map((e) => e.target)
      .filter((targetId) => nodes.find((n) => n.id === targetId)?.type === 'condition');

    let conditions: ConditionGroup = { logic: 'AND', conditions: [] };
    const actions: Action[] = [];
    const visited = new Set<string>();

    const nodeToAction = (targetNode: Node): Action | null => {
      if (targetNode.type === 'action' && targetNode.data?.action?.type) return targetNode.data.action;
      if (targetNode.type === 'form' && targetNode.data?.config?.form_template_id) return { type: 'launch_form', config: targetNode.data.config };
      if (targetNode.type === 'delay' && targetNode.data?.config) return { type: 'delay', config: targetNode.data.config };
      if (targetNode.type === 'subworkflow' && targetNode.data?.config?.target_workflow_id) return { type: 'call_workflow', config: targetNode.data.config };
      if (targetNode.type === 'approval') return { type: 'create_approval', config: targetNode.data.config || {} };
      if (targetNode.type === 'http') return { type: 'http_request', config: targetNode.data.config || {} };
      if (targetNode.type === 'ifelse') return { type: 'if_else', config: targetNode.data.config || {} };
      if (targetNode.type === 'switch') return { type: 'switch', config: targetNode.data.config || {} };
      if (targetNode.type === 'escalate') return { type: 'escalate', config: targetNode.data.config || {} };
      return null;
    };

    const collectActions = (sourceId: string) => {
      const outEdges = edges.filter(
        (e) => e.source === sourceId && (e.sourceHandle === 'yes' || e.sourceHandle === 'then' || !e.sourceHandle),
      );
      for (const edge of outEdges) {
        if (visited.has(edge.target)) continue;
        visited.add(edge.target);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!targetNode) continue;

        const action = nodeToAction(targetNode);
        if (action) actions.push(action);

        collectActions(targetNode.id);
      }
    };

    if (connectedConditionIds.length > 0) {
      const condNode = nodes.find((n) => n.id === connectedConditionIds[0]);
      if (condNode?.data?.condition) {
        conditions = condNode.data.condition;
      }
      for (const condId of connectedConditionIds) {
        collectActions(condId);
      }
    } else {
      collectActions(triggerNode.id);
    }

    return { conditions, actions };
  };

  // ── Test / Simulate ──
  const handleTest = async () => {
    if (!isEditMode || !id) {
      runLocalSimulation();
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    setHighlightedNodeIds({});

    try {
      const record = JSON.parse(testRecord);
      const result = await workflowsApi.simulate(id, record);
      setTestResult(result);
      highlightNodesFromResult(result);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        notifications.show({ title: 'Invalid JSON', message: 'The test record must be valid JSON', color: 'red' });
      } else {
        notifications.show({ title: 'Test Failed', message: err.response?.data?.error || err.message, color: 'red' });
      }
    } finally {
      setTestLoading(false);
    }
  };

  const runLocalSimulation = () => {
    try {
      const record = JSON.parse(testRecord);
      const { conditions, actions } = serializeFlow();
      const condResult = evaluateConditionsLocal(record, conditions);

      setTestResult({
        workflow_name: name || 'Untitled',
        conditions_passed: condResult,
        condition_details: [],
        actions: actions.map((a: Action, i: number) => ({
          index: i, type: a.type, config: a.config, would_execute: condResult,
          description: describeAction(a),
        })),
        _local: true,
      });

      const highlights: Record<string, 'pass' | 'fail'> = {};
      for (const n of nodes) {
        if (n.type === 'trigger') highlights[n.id] = 'pass';
        else if (n.type === 'condition') highlights[n.id] = condResult ? 'pass' : 'fail';
        else highlights[n.id] = condResult ? 'pass' : 'fail';
      }
      setHighlightedNodeIds(highlights);
    } catch {
      notifications.show({ title: 'Invalid JSON', message: 'The test record must be valid JSON', color: 'red' });
    }
  };

  const evaluateConditionsLocal = (record: Record<string, unknown>, group: any): boolean => {
    if (!group || !group.conditions || group.conditions.length === 0) return true;
    const results = group.conditions.map((c: any) => {
      if ('logic' in c) return evaluateConditionsLocal(record, c);
      const fv = record[c.field];
      switch (c.operator) {
        case 'equals': return String(fv) === String(c.value);
        case 'not_equals': return String(fv) !== String(c.value);
        case 'contains': return String(fv).toLowerCase().includes(String(c.value).toLowerCase());
        case 'greater_than': return Number(fv) > Number(c.value);
        case 'less_than': return Number(fv) < Number(c.value);
        case 'is_empty': return !fv || fv === '';
        case 'is_not_empty': return !!fv && fv !== '';
        default: return false;
      }
    });
    return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  };

  const describeAction = (a: Action): string => {
    const c = a.config || {};
    switch (a.type) {
      case 'set_field': return `Set "${c.field}" to "${c.value}"`;
      case 'change_state': return `Change state to "${c.state}"`;
      case 'assign_to': return `Assign to user ${c.user_id}`;
      case 'send_notification': return `Send notification: "${c.title}"`;
      case 'launch_form': return `Launch form task`;
      case 'delay': return `Delay ${c.duration_minutes} minutes`;
      case 'call_workflow': return `Call sub-workflow`;
      case 'create_approval': return `Create approval`;
      case 'http_request': return `HTTP ${c.method || 'GET'} ${c.url || ''}`;
      case 'send_email': return `Send email`;
      case 'send_slack': return `Send Slack message`;
      case 'escalate': return `Escalate (${c.escalation_type})`;
      case 'if_else': return `If/Else branch`;
      case 'switch': return `Switch on "${c.field}"`;
      default: return a.type;
    }
  };

  const highlightNodesFromResult = (result: any) => {
    const highlights: Record<string, 'pass' | 'fail'> = {};
    for (const n of nodes) {
      if (n.type === 'trigger') highlights[n.id] = 'pass';
      else if (n.type === 'condition') highlights[n.id] = result.conditions_passed ? 'pass' : 'fail';
      else highlights[n.id] = result.conditions_passed ? 'pass' : 'fail';
    }
    setHighlightedNodeIds(highlights);
  };

  const clearTestHighlights = () => {
    setHighlightedNodeIds({});
    setTestResult(null);
  };

  // ── Apply test highlights to nodes ──
  const displayNodes = useMemo(() => {
    if (Object.keys(highlightedNodeIds).length === 0) return nodes;
    return nodes.map((n) => {
      const status = highlightedNodeIds[n.id];
      if (!status) return n;
      return {
        ...n,
        style: {
          ...n.style,
          boxShadow: status === 'pass'
            ? '0 0 20px 6px rgba(47,158,68,0.5)'
            : '0 0 20px 6px rgba(224,49,49,0.5)',
          borderRadius: 8,
        },
      };
    });
  }, [nodes, highlightedNodeIds]);

  const displayEdges = useMemo(() => {
    if (Object.keys(highlightedNodeIds).length === 0) return edges;
    return edges.map((e) => {
      const sourceStatus = highlightedNodeIds[e.source];
      const targetStatus = highlightedNodeIds[e.target];
      if (sourceStatus === 'pass' && targetStatus === 'pass') {
        return {
          ...e,
          style: { ...e.style, stroke: '#2f9e44', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#2f9e44' },
        };
      }
      if (sourceStatus === 'pass' && targetStatus === 'fail') {
        return {
          ...e,
          style: { ...e.style, stroke: '#868e96', strokeWidth: 1, strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#868e96' },
          animated: false,
        };
      }
      return e;
    });
  }, [edges, highlightedNodeIds]);

  // ── Save mutation ──
  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEditMode ? workflowsApi.update(id!, payload) : workflowsApi.create(payload),
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: isEditMode ? 'Workflow updated' : 'Workflow created',
        color: 'green',
      });
      navigate('/workflows');
    },
    onError: (err: unknown) => {
      const message = (err as any)?.response?.data?.error || 'Failed to save workflow';
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

    const cleanNodes = nodes.map((n) => {
      const { onEdit, ...restData } = n.data || {};
      return { ...n, data: restData, style: undefined };
    });

    saveMutation.mutate({
      name,
      table_name: tableName,
      trigger_event: triggerEvent,
      conditions,
      actions,
      active,
      execution_order: executionOrder,
      flow_layout: { nodes: cleanNodes, edges },
    });
  };

  // ── Loading ──
  if (isEditMode && isLoadingWorkflow) {
    return (
      <Stack align="center" justify="center" style={{ height: '80vh' }}>
        <Loader size="lg" />
        <Text>Loading workflow...</Text>
      </Stack>
    );
  }

  const editingNode = getEditingNodeData();

  return (
    <Stack gap={0} style={{ height: '100vh', overflow: 'hidden' }}>
      {/* ── Top bar ── */}
      <Paper className="glass-panel" p="sm" withBorder style={{ borderRadius: 0 }}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="sm" wrap="wrap">
            <Button variant="subtle" size="sm" leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/workflows')}>
              Back
            </Button>
            <TextInput placeholder="Workflow name" value={name}
              onChange={(e) => setName(e.currentTarget.value)} size="sm" style={{ minWidth: 200 }} />
            <Select placeholder="Table" data={tableOptions} value={tableName}
              onChange={(v) => setTableName(v || '')} size="sm" searchable style={{ minWidth: 160 }} />
            <Select placeholder="Trigger event" data={TRIGGER_OPTIONS} value={triggerEvent}
              onChange={(v) => setTriggerEvent(v || '')} size="sm" style={{ minWidth: 160 }} />
            <NumberInput placeholder="Order" value={executionOrder}
              onChange={(v) => setExecutionOrder(Number(v) || 100)} size="sm" style={{ width: 80 }} min={0} />
            <Switch label="Active" checked={active}
              onChange={(e) => setActive(e.currentTarget.checked)} size="sm" />
          </Group>
          <Group gap="sm">
            <Button variant="light" color="violet" size="sm"
              leftSection={<IconTestPipe size={16} />}
              onClick={() => setTestDrawerOpen(true)}>
              Test
            </Button>
            <Button className="gradient-btn" leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave} loading={saveMutation.isPending}>
              Save
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* ── Main canvas area ── */}
      <Box style={{ flex: 1, position: 'relative', display: 'flex' }}>
        {/* ── Wix-style Side Palette ── */}
        <Paper shadow="md" p="sm" withBorder
          style={{
            width: 180,
            minWidth: 180,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflowY: 'auto',
            borderRight: '1px solid #e9ecef',
            borderRadius: 0,
            background: '#f8f9fa',
          }}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>Components</Text>

          <Text size="10px" fw={600} c="dimmed" tt="uppercase" mt={4} mb={2}>Triggers</Text>
          {([
            { type: 'trigger', label: 'Record Created', icon: <IconBolt size={16} />, color: '#2f9e44', data: { trigger_event: 'record.created', table_name: tableName }, onClick: () => addTriggerNode('record.created') },
            { type: 'trigger', label: 'Record Updated', icon: <IconRefresh size={16} />, color: '#2f9e44', data: { trigger_event: 'record.updated', table_name: tableName }, onClick: () => addTriggerNode('record.updated') },
            { type: 'trigger', label: 'State Changed', icon: <IconBolt size={16} />, color: '#2f9e44', data: { trigger_event: 'record.state_changed', table_name: tableName }, onClick: () => addTriggerNode('record.state_changed') },
            { type: 'trigger', label: 'Approval Decided', icon: <IconStarFilled size={16} />, color: '#2f9e44', data: { trigger_event: 'approval.decided', table_name: tableName }, onClick: () => addTriggerNode('approval.decided') },
            { type: 'trigger', label: 'SLA Breached', icon: <IconAlarm size={16} />, color: '#e03131', data: { trigger_event: 'sla.breached', table_name: tableName }, onClick: () => addTriggerNode('sla.breached') },
            { type: 'trigger', label: 'Webhook', icon: <IconWebhook size={16} />, color: '#1c7ed6', data: { trigger_event: 'webhook.received', table_name: tableName }, onClick: () => addTriggerNode('webhook.received') },
            { type: 'trigger', label: 'Scheduled', icon: <IconCalendarEvent size={16} />, color: '#7950f2', data: { trigger_event: 'scheduled', table_name: tableName }, onClick: () => addTriggerNode('scheduled') },
          ]).map((item, idx) => (
            <div
              key={`trigger-${idx}`}
              draggable
              onDragStart={(e) => onDragStart(e, item.type, item.data)}
              onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6,
                border: '1px solid #d3f9d8', background: '#ebfbee',
                cursor: 'grab', userSelect: 'none',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(47,158,68,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
              <Text size="xs" fw={500}>{item.label}</Text>
            </div>
          ))}

          <Text size="10px" fw={600} c="dimmed" tt="uppercase" mt={4} mb={2}>Logic</Text>
          {([
            { type: 'condition', label: 'Condition', icon: <IconFilter size={16} />, color: '#fab005', data: { condition: { logic: 'AND', conditions: [] } }, onClick: addConditionNode },
            { type: 'ifelse', label: 'If / Else', icon: <IconGitBranch size={16} />, color: '#fd7e14', data: { config: { condition: { logic: 'AND', conditions: [] }, then_actions: [], else_actions: [] } }, onClick: addIfElseNode },
            { type: 'switch', label: 'Switch', icon: <IconSwitchHorizontal size={16} />, color: '#be4bdb', data: { config: { field: '', cases: {}, default_actions: [] } }, onClick: addSwitchNode },
          ] as const).map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type, item.data)}
              onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6,
                border: '1px solid #dee2e6', background: '#fff',
                cursor: 'grab', userSelect: 'none',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
              <Text size="xs" fw={500}>{item.label}</Text>
            </div>
          ))}

          <Text size="10px" fw={600} c="dimmed" tt="uppercase" mt={8} mb={2}>Actions</Text>
          {([
            { type: 'action', label: 'Action', icon: <IconPlayerPlay size={16} />, color: '#1c7ed6', data: { action: { type: '', config: {} } }, onClick: addActionNode },
            { type: 'approval', label: 'Approval', icon: <IconChecklist size={16} />, color: '#7950f2', data: { config: { approver_ids: [], approval_type: 'all', wait_for_completion: true } }, onClick: addApprovalNode },
            { type: 'http', label: 'HTTP Request', icon: <IconWorld size={16} />, color: '#15aabf', data: { config: { url: '', method: 'GET' } }, onClick: addHttpNode },
            { type: 'escalate', label: 'Escalate', icon: <IconArrowBigUpLines size={16} />, color: '#e03131', data: { config: { escalation_type: 'manager', target: '', reason: '' } }, onClick: addEscalateNode },
          ] as const).map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type, item.data)}
              onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6,
                border: '1px solid #dee2e6', background: '#fff',
                cursor: 'grab', userSelect: 'none',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
              <Text size="xs" fw={500}>{item.label}</Text>
            </div>
          ))}

          <Text size="10px" fw={600} c="dimmed" tt="uppercase" mt={8} mb={2}>Flow</Text>
          {([
            { type: 'form', label: 'Form Task', icon: <IconForms size={16} />, color: '#be4bdb', data: { config: { form_template_id: '', assign_to_field: 'assigned_to' } }, onClick: addFormNode },
            { type: 'delay', label: 'Delay', icon: <IconClock size={16} />, color: '#fd7e14', data: { config: { duration_value: 5, duration_unit: 'minutes', duration_minutes: 5 } }, onClick: addDelayNode },
            { type: 'subworkflow', label: 'Sub-Workflow', icon: <IconGitBranch size={16} />, color: '#0ca678', data: { config: { target_workflow_id: '' } }, onClick: addSubWorkflowNode },
            { type: 'parallel', label: 'Parallel', icon: <IconLayoutColumns size={16} />, color: '#1098ad', data: { config: { branches: [] } }, onClick: () => addNodeAndConnect('parallel', { config: { branches: [] } }) },
          ] as const).map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type, item.data)}
              onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 6,
                border: '1px solid #dee2e6', background: '#fff',
                cursor: 'grab', userSelect: 'none',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
              <Text size="xs" fw={500}>{item.label}</Text>
            </div>
          ))}
        </Paper>

        {/* ── Canvas drop zone ── */}
        <div
          style={{ flex: 1, position: 'relative' }}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* ── Test highlight legend ── */}
          {Object.keys(highlightedNodeIds).length > 0 && (
            <Paper className="glass-panel" shadow="sm" p="xs" withBorder
              style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
              <Group gap="xs" mb={4}>
                <Text size="xs" fw={700}>Test Result</Text>
                <Button size="compact-xs" variant="subtle" onClick={clearTestHighlights}>Clear</Button>
              </Group>
              <Group gap="xs">
                <Badge size="xs" color="green" variant="dot">Passes</Badge>
                <Badge size="xs" color="red" variant="dot">Blocked</Badge>
              </Group>
            </Paper>
          )}

          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            style={{ width: '100%', height: '100%' }}
          >
            <Background gap={20} size={1} color="#e9ecef" />
            <Controls />
            <MiniMap nodeStrokeWidth={3} style={{ height: 100, width: 150 }} zoomable pannable />
          </ReactFlow>
        </div>
      </Box>

      {/* ── Test Drawer ── */}
      <Drawer opened={testDrawerOpen} onClose={() => setTestDrawerOpen(false)}
        title="Test Workflow" position="right" size="md" padding="md">
        <Stack>
          <Text size="sm" c="dimmed">
            Provide a sample record (JSON) to simulate the workflow. The designer will
            highlight which path the workflow takes.
          </Text>

          <JsonInput label="Sample Record" placeholder='{"state": "new", "priority": "1"}'
            value={testRecord} onChange={setTestRecord} minRows={8} maxRows={14}
            formatOnBlur validationError="Invalid JSON" autosize />

          {tableColumns.length > 0 && (
            <Alert variant="light" color="blue" title="Available columns">
              <Text size="xs" c="dimmed">{tableColumns.map((c: any) => c.name).join(', ')}</Text>
            </Alert>
          )}

          <Button fullWidth leftSection={<IconTestPipe size={16} />}
            onClick={handleTest} loading={testLoading}
            variant="gradient" gradient={{ from: 'grape', to: 'indigo' }}>
            Run Test
          </Button>

          {testResult && (
            <>
              <Divider label="Results" labelPosition="center" />

              <Paper p="sm" withBorder radius="md"
                style={{ background: testResult.conditions_passed ? 'rgba(47,158,68,0.08)' : 'rgba(224,49,49,0.08)' }}>
                <Group gap="sm">
                  <ThemeIcon size="md" radius="xl"
                    color={testResult.conditions_passed ? 'green' : 'red'} variant="light">
                    {testResult.conditions_passed ? <IconCheck size={14} /> : <IconX size={14} />}
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={600}>
                      Conditions: {testResult.conditions_passed ? 'PASSED' : 'FAILED'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {testResult.conditions_passed
                        ? 'All conditions met -- actions will execute'
                        : 'Conditions not met -- actions will be skipped'}
                    </Text>
                  </div>
                </Group>
              </Paper>

              {testResult.condition_details && testResult.condition_details.length > 0 && (
                <Paper p="sm" withBorder radius="md">
                  <Text size="xs" fw={700} mb="xs">Condition Details</Text>
                  <ScrollArea.Autosize mah={200}>
                    <Stack gap={4}>
                      {testResult.condition_details.map((d: any, i: number) => (
                        <Group key={i} gap="xs">
                          <ThemeIcon size="xs" radius="xl" color={d.passed ? 'green' : 'red'} variant="filled">
                            {d.passed ? <IconCheck size={8} /> : <IconX size={8} />}
                          </ThemeIcon>
                          <Code style={{ fontSize: 11 }}>
                            {d.field} {d.operator} {JSON.stringify(d.expected)}
                          </Code>
                          <Text size="xs" c="dimmed">(actual: {JSON.stringify(d.actual)})</Text>
                        </Group>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                </Paper>
              )}

              <Paper p="sm" withBorder radius="md">
                <Text size="xs" fw={700} mb="xs">Actions ({testResult.actions?.length || 0})</Text>
                <ScrollArea.Autosize mah={250}>
                  <Stack gap={6}>
                    {(testResult.actions || []).map((a: any, i: number) => (
                      <Group key={i} gap="xs" wrap="nowrap">
                        <Badge size="xs" variant="light" color={a.would_execute ? 'green' : 'gray'}
                          style={{ minWidth: 20, textAlign: 'center' }}>{i + 1}</Badge>
                        <IconArrowRight size={12} color="#868e96" />
                        <div>
                          <Text size="xs" fw={500}>{a.description}</Text>
                          <Badge size="xs" variant="outline" color={a.would_execute ? 'green' : 'gray'}>
                            {a.would_execute ? 'Will Execute' : 'Skipped'}
                          </Badge>
                        </div>
                      </Group>
                    ))}
                    {(!testResult.actions || testResult.actions.length === 0) && (
                      <Text size="xs" c="dimmed">No actions configured</Text>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Paper>
            </>
          )}
        </Stack>
      </Drawer>

      {/* ── Editor Modals ── */}
      {editingNode?.type === 'condition' && (
        <ConditionEditor opened={conditionModalOpen}
          onClose={() => { setConditionModalOpen(false); setEditingNodeId(null); }}
          condition={editingNode.data?.condition || { logic: 'AND', conditions: [] }}
          onChange={handleConditionChange} tableColumns={tableColumns} />
      )}
      {editingNode?.type === 'action' && (
        <ActionEditor opened={actionModalOpen}
          onClose={() => { setActionModalOpen(false); setEditingNodeId(null); }}
          action={editingNode.data?.action || { type: '', config: {} }}
          onChange={handleActionChange} tableColumns={tableColumns} />
      )}
      {editingNode?.type === 'form' && (
        <FormNodeEditor opened={formModalOpen}
          onClose={() => { setFormModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleFormConfigChange} tableColumns={tableColumns} />
      )}
      {editingNode?.type === 'delay' && (
        <DelayNodeEditor opened={delayModalOpen}
          onClose={() => { setDelayModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleDelayConfigChange} />
      )}
      {editingNode?.type === 'subworkflow' && (
        <SubWorkflowNodeEditor opened={subWorkflowModalOpen}
          onClose={() => { setSubWorkflowModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleSubWorkflowConfigChange} />
      )}
      {editingNode?.type === 'approval' && (
        <ApprovalNodeEditor opened={approvalModalOpen}
          onClose={() => { setApprovalModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleApprovalConfigChange} />
      )}
      {editingNode?.type === 'http' && (
        <HttpNodeEditor opened={httpModalOpen}
          onClose={() => { setHttpModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleHttpConfigChange} />
      )}
      {editingNode?.type === 'ifelse' && (
        <IfElseNodeEditor opened={ifElseModalOpen}
          onClose={() => { setIfElseModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleIfElseConfigChange} tableColumns={tableColumns} />
      )}
      {editingNode?.type === 'switch' && (
        <SwitchNodeEditor opened={switchModalOpen}
          onClose={() => { setSwitchModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleSwitchConfigChange} tableColumns={tableColumns} />
      )}
      {editingNode?.type === 'escalate' && (
        <EscalateNodeEditor opened={escalateModalOpen}
          onClose={() => { setEscalateModalOpen(false); setEditingNodeId(null); }}
          config={editingNode.data?.config || {}}
          onChange={handleEscalateConfigChange} />
      )}
    </Stack>
  );
}
