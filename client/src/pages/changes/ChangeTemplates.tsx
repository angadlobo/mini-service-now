import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Paper, Badge, Text, TextInput, Textarea, Select, Modal, Table, Tabs, Card, SimpleGrid, Checkbox, Grid } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTemplate, IconEdit, IconTrash, IconShoppingCart } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { changesApi } from '../../api/changes.api';
import { usersApi } from '../../api/common.api';

interface ChangeTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  risk: string;
  impact: string;
  priority: string;
  change_plan: string;
  implementation_plan: string;
  test_plan: string;
  communication_plan: string;
  rollback_plan: string;
  backout_plan: string;
  justification: string;
  default_assignment_group_id: string;
  pre_approved: boolean;
  cab_required: boolean;
}

const emptyTemplate: Omit<ChangeTemplate, 'id'> = {
  name: '',
  description: '',
  type: 'normal',
  category: '',
  risk: 'low',
  impact: 'low',
  priority: 'low',
  change_plan: '',
  implementation_plan: '',
  test_plan: '',
  communication_plan: '',
  rollback_plan: '',
  backout_plan: '',
  justification: '',
  default_assignment_group_id: '',
  pre_approved: false,
  cab_required: true,
};

const typeOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'standard', label: 'Standard' },
  { value: 'emergency', label: 'Emergency' },
];

const riskOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const impactOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function riskColor(risk: string) {
  switch (risk) {
    case 'low': return 'green';
    case 'medium': return 'yellow';
    case 'high': return 'orange';
    case 'critical': return 'red';
    default: return 'gray';
  }
}

export function ChangeTemplates() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('templates');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Omit<ChangeTemplate, 'id'> & { id?: string }>(emptyTemplate);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ short_description: '', planned_start_date: '', planned_end_date: '' });

  const { data: templates = [] } = useQuery({
    queryKey: ['change-templates'],
    queryFn: () => changesApi.listTemplates(),
  });

  const { data: standardCatalog = [] } = useQuery({
    queryKey: ['standard-change-catalog'],
    queryFn: () => changesApi.listStandardCatalog(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => usersApi.listGroups(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<ChangeTemplate, 'id'>) => changesApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-templates'] });
      queryClient.invalidateQueries({ queryKey: ['standard-change-catalog'] });
      notifications.show({ title: 'Success', message: 'Template created', color: 'green' });
      setEditModalOpen(false);
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to create template', color: 'red' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<ChangeTemplate, 'id'> }) => changesApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-templates'] });
      queryClient.invalidateQueries({ queryKey: ['standard-change-catalog'] });
      notifications.show({ title: 'Success', message: 'Template updated', color: 'green' });
      setEditModalOpen(false);
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to update template', color: 'red' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => changesApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change-templates'] });
      queryClient.invalidateQueries({ queryKey: ['standard-change-catalog'] });
      notifications.show({ title: 'Success', message: 'Template deleted', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete template', color: 'red' });
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: ({ templateId, overrides }: { templateId: string; overrides: Record<string, string> }) =>
      changesApi.createFromTemplate(templateId, overrides),
    onSuccess: (data: any) => {
      notifications.show({ title: 'Success', message: 'Change request created from template', color: 'green' });
      setRequestModalOpen(false);
      setRequestForm({ short_description: '', planned_start_date: '', planned_end_date: '' });
      if (data?.id) {
        navigate(`/changes/${data.id}`);
      }
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to create change request', color: 'red' });
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate({ ...emptyTemplate });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (template: ChangeTemplate) => {
    setEditingTemplate({ ...template });
    setEditModalOpen(true);
  };

  const handleSave = () => {
    const { id, ...data } = editingTemplate as ChangeTemplate;
    if (id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRequestChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setRequestForm({ short_description: '', planned_start_date: '', planned_end_date: '' });
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedTemplateId) return;
    createFromTemplateMutation.mutate({
      templateId: selectedTemplateId,
      overrides: requestForm,
    });
  };

  const groupedCatalog = standardCatalog.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const groupOptions = groups.map((g: any) => ({ value: g.id, label: g.name }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Change Templates</Title>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            Templates
          </Tabs.Tab>
          <Tabs.Tab value="standard-catalog" leftSection={<IconShoppingCart size={16} />}>
            Standard Change Catalog
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="templates" pt="md">
          <Stack>
            <Group justify="flex-end">
              <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
                Create Template
              </Button>
            </Group>

            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Risk</Table.Th>
                    <Table.Th>Pre-Approved</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {templates.map((template: any) => (
                    <Table.Tr key={template.id}>
                      <Table.Td>{template.name}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">{template.type}</Badge>
                      </Table.Td>
                      <Table.Td>{template.category}</Table.Td>
                      <Table.Td>
                        <Badge color={riskColor(template.risk)}>{template.risk}</Badge>
                      </Table.Td>
                      <Table.Td>
                        {template.pre_approved && <Badge color="green">Pre-Approved</Badge>}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconEdit size={14} />}
                            onClick={() => handleOpenEdit(template)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            Delete
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {templates.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Text ta="center" c="dimmed" py="md">No templates found</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="standard-catalog" pt="md">
          <Stack>
            {Object.keys(groupedCatalog).length === 0 && (
              <Text c="dimmed" ta="center" py="xl">No standard changes available in the catalog.</Text>
            )}
            {Object.entries(groupedCatalog).map(([category, items]) => (
              <Stack key={category} gap="sm">
                <Title order={4}>{category}</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                  {(items as any[]).map((item: any) => (
                    <Card key={item.id} withBorder shadow="sm" padding="lg">
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Text fw={600} size="lg">{item.name}</Text>
                          <Badge color={riskColor(item.risk)} size="sm">{item.risk} risk</Badge>
                        </Group>
                        <Text size="sm" c="dimmed" lineClamp={3}>{item.description}</Text>
                        <Group justify="space-between" mt="auto">
                          <Badge variant="light">{item.category}</Badge>
                          <Button
                            size="xs"
                            leftSection={<IconShoppingCart size={14} />}
                            onClick={() => handleRequestChange(item.id)}
                          >
                            Request This Change
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Create/Edit Template Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingTemplate.id ? 'Edit Template' : 'Create Template'}
        size="xl"
      >
        <Stack>
          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Name"
                required
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.currentTarget.value })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Type"
                required
                data={typeOptions}
                value={editingTemplate.type}
                onChange={(val) => setEditingTemplate({ ...editingTemplate, type: val || 'normal' })}
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Description"
            value={editingTemplate.description}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.currentTarget.value })}
            minRows={2}
          />

          <Grid>
            <Grid.Col span={4}>
              <TextInput
                label="Category"
                value={editingTemplate.category}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.currentTarget.value })}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                label="Risk"
                data={riskOptions}
                value={editingTemplate.risk}
                onChange={(val) => setEditingTemplate({ ...editingTemplate, risk: val || 'low' })}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                label="Impact"
                data={impactOptions}
                value={editingTemplate.impact}
                onChange={(val) => setEditingTemplate({ ...editingTemplate, impact: val || 'low' })}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={6}>
              <Select
                label="Priority"
                data={priorityOptions}
                value={editingTemplate.priority}
                onChange={(val) => setEditingTemplate({ ...editingTemplate, priority: val || 'low' })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select
                label="Default Assignment Group"
                data={groupOptions}
                value={editingTemplate.default_assignment_group_id}
                onChange={(val) => setEditingTemplate({ ...editingTemplate, default_assignment_group_id: val || '' })}
                clearable
                searchable
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Change Plan"
            value={editingTemplate.change_plan}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, change_plan: e.currentTarget.value })}
            minRows={2}
          />

          <Textarea
            label="Implementation Plan"
            value={editingTemplate.implementation_plan}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, implementation_plan: e.currentTarget.value })}
            minRows={2}
          />

          <Textarea
            label="Test Plan"
            value={editingTemplate.test_plan}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, test_plan: e.currentTarget.value })}
            minRows={2}
          />

          <Textarea
            label="Communication Plan"
            value={editingTemplate.communication_plan}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, communication_plan: e.currentTarget.value })}
            minRows={2}
          />

          <Textarea
            label="Rollback Plan"
            value={editingTemplate.rollback_plan}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, rollback_plan: e.currentTarget.value })}
            minRows={2}
          />

          <Textarea
            label="Backout Plan"
            value={editingTemplate.backout_plan}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, backout_plan: e.currentTarget.value })}
            minRows={2}
          />

          <Textarea
            label="Justification"
            value={editingTemplate.justification}
            onChange={(e) => setEditingTemplate({ ...editingTemplate, justification: e.currentTarget.value })}
            minRows={2}
          />

          <Grid>
            <Grid.Col span={6}>
              <Checkbox
                label="Pre-Approved"
                checked={editingTemplate.pre_approved}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, pre_approved: e.currentTarget.checked })}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Checkbox
                label="CAB Required"
                checked={editingTemplate.cab_required}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, cab_required: e.currentTarget.checked })}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
              {editingTemplate.id ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Request Change from Template Modal */}
      <Modal
        opened={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request Standard Change"
      >
        <Stack>
          <TextInput
            label="Short Description"
            required
            value={requestForm.short_description}
            onChange={(e) => setRequestForm({ ...requestForm, short_description: e.currentTarget.value })}
            placeholder="Brief description of this change request"
          />

          <TextInput
            label="Planned Start Date"
            required
            type="datetime-local"
            value={requestForm.planned_start_date}
            onChange={(e) => setRequestForm({ ...requestForm, planned_start_date: e.currentTarget.value })}
          />

          <TextInput
            label="Planned End Date"
            required
            type="datetime-local"
            value={requestForm.planned_end_date}
            onChange={(e) => setRequestForm({ ...requestForm, planned_end_date: e.currentTarget.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRequestModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitRequest}
              loading={createFromTemplateMutation.isPending}
              disabled={!requestForm.short_description || !requestForm.planned_start_date || !requestForm.planned_end_date}
            >
              Submit Request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
