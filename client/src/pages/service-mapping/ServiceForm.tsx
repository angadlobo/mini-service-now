import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text,
  LoadingOverlay, Box, Tabs, Table, ActionIcon, Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { businessServicesApi } from '../../api/service-mapping.api';
import { usersApi, cmdbApi } from '../../api/common.api';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  inactive: 'gray',
  planned: 'blue',
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'gray',
};

export function ServiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'planned',
    criticality: 'medium',
    owner_id: '',
    portfolio: '',
  });

  const [offeringForm, setOfferingForm] = useState({ name: '', description: '', status: 'active' });
  const [editingOffering, setEditingOffering] = useState<string | null>(null);
  const [depForm, setDepForm] = useState({ depends_on_id: '' });
  const [ciForm, setCiForm] = useState({ ci_id: '', role: '' });

  const { data: service, isLoading } = useQuery({
    queryKey: ['business-service', id],
    queryFn: () => businessServicesApi.get(id!),
    enabled: !isNew,
  });

  const { data: offerings, refetch: refetchOfferings } = useQuery({
    queryKey: ['service-offerings', id],
    queryFn: () => businessServicesApi.getOfferings(id!),
    enabled: !isNew,
  });

  const { data: dependencies, refetch: refetchDeps } = useQuery({
    queryKey: ['service-dependencies', id],
    queryFn: () => businessServicesApi.getDependencies(id!),
    enabled: !isNew,
  });

  const { data: ciMappings, refetch: refetchCiMappings } = useQuery({
    queryKey: ['service-ci-mappings', id],
    queryFn: () => businessServicesApi.getCiMappings(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  const { data: allServices } = useQuery({
    queryKey: ['business-services-select'],
    queryFn: () => businessServicesApi.list({ pageSize: 200 }),
  });

  const { data: allCis } = useQuery({
    queryKey: ['cmdb-cis-select'],
    queryFn: () => cmdbApi.listCis({ pageSize: 200 }),
  });

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || '',
        description: service.description || '',
        status: service.status || 'planned',
        criticality: service.criticality || 'medium',
        owner_id: service.owner_id || '',
        portfolio: service.portfolio || '',
      });
    }
  }, [service]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        description: form.description,
        status: form.status,
        criticality: form.criticality,
        owner_id: form.owner_id || null,
        portfolio: form.portfolio || null,
      };
      if (isNew) return businessServicesApi.create(payload);
      return businessServicesApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Service created' : 'Service updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['business-services'] });
      if (isNew) navigate(`/service-mapping/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['business-service', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addOffering = useMutation({
    mutationFn: () => {
      if (editingOffering) {
        return businessServicesApi.updateOffering(editingOffering, offeringForm);
      }
      return businessServicesApi.addOffering(id!, offeringForm);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: editingOffering ? 'Offering updated' : 'Offering added', color: 'green' });
      setOfferingForm({ name: '', description: '', status: 'active' });
      setEditingOffering(null);
      refetchOfferings();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save offering', color: 'red' });
    },
  });

  const deleteOffering = useMutation({
    mutationFn: (offeringId: string) => businessServicesApi.deleteOffering(offeringId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Offering removed', color: 'green' });
      refetchOfferings();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to remove offering', color: 'red' });
    },
  });

  const addDependency = useMutation({
    mutationFn: () => businessServicesApi.addDependency(id!, { depends_on_id: depForm.depends_on_id }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Dependency added', color: 'green' });
      setDepForm({ depends_on_id: '' });
      refetchDeps();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add dependency', color: 'red' });
    },
  });

  const removeDependency = useMutation({
    mutationFn: (depId: string) => businessServicesApi.removeDependency(depId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Dependency removed', color: 'green' });
      refetchDeps();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to remove dependency', color: 'red' });
    },
  });

  const addCiMapping = useMutation({
    mutationFn: () => businessServicesApi.addCiMapping(id!, { ci_id: ciForm.ci_id, role: ciForm.role }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'CI mapping added', color: 'green' });
      setCiForm({ ci_id: '', role: '' });
      refetchCiMappings();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add CI mapping', color: 'red' });
    },
  });

  const removeCiMapping = useMutation({
    mutationFn: (mapId: string) => businessServicesApi.removeCiMapping(mapId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'CI mapping removed', color: 'green' });
      refetchCiMappings();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to remove CI mapping', color: 'red' });
    },
  });

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const serviceOptions = (allServices?.data || [])
    .filter((s: any) => s.id !== id)
    .map((s: any) => ({ value: s.id, label: s.name }));
  const ciOptions = (allCis?.data || []).map((c: any) => ({ value: c.id, label: c.name }));

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/service-mapping')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Business Service' : `${service?.number || service?.name || ''}`}</Title>
        {service && <Badge variant="light" color={STATUS_COLORS[service.status] || 'gray'}>{service.status}</Badge>}
        {service && <Badge variant="filled" color={CRITICALITY_COLORS[service.criticality] || 'gray'}>{service.criticality}</Badge>}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                {!isNew && <Tabs.Tab value="offerings">Offerings</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="dependencies">Dependencies</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="ci-mappings">CI Mappings</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="journal">Journal</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Name" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
                  <Textarea label="Description" minRows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Status" data={[
                        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
                        { value: 'planned', label: 'Planned' },
                      ]} value={form.status} onChange={(v) => setForm({ ...form, status: v || 'planned' })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Criticality" data={[
                        { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
                      ]} value={form.criticality} onChange={(v) => setForm({ ...form, criticality: v || 'medium' })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Owner" data={userOptions} value={form.owner_id}
                        onChange={(v) => setForm({ ...form, owner_id: v || '' })} clearable searchable />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="Portfolio" value={form.portfolio}
                        onChange={(e) => setForm({ ...form, portfolio: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Group justify="flex-end">
                    <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                      {isNew ? 'Create' : 'Update'}
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="offerings" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text fw={600} mb="sm">{editingOffering ? 'Edit Offering' : 'Add Offering'}</Text>
                      <Grid>
                        <Grid.Col span={4}>
                          <TextInput label="Name" value={offeringForm.name} required
                            onChange={(e) => setOfferingForm({ ...offeringForm, name: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <TextInput label="Description" value={offeringForm.description}
                            onChange={(e) => setOfferingForm({ ...offeringForm, description: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <Select label="Status" data={[
                            { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
                          ]} value={offeringForm.status} onChange={(v) => setOfferingForm({ ...offeringForm, status: v || 'active' })} />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <Box mt={24}>
                            <Button size="sm" leftSection={<IconPlus size={14} />}
                              onClick={() => addOffering.mutate()}
                              loading={addOffering.isPending}
                              disabled={!offeringForm.name}
                              fullWidth>
                              {editingOffering ? 'Save' : 'Add'}
                            </Button>
                          </Box>
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    {offerings && offerings.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th style={{ width: 100 }}>Status</Table.Th>
                            <Table.Th style={{ width: 80 }}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {offerings.map((item: any) => (
                            <Table.Tr key={item.id} style={{ cursor: 'pointer' }}
                              onClick={() => {
                                setEditingOffering(item.id);
                                setOfferingForm({ name: item.name, description: item.description || '', status: item.status || 'active' });
                              }}>
                              <Table.Td>{item.name}</Table.Td>
                              <Table.Td>{item.description || '-'}</Table.Td>
                              <Table.Td>
                                <Badge variant="light" color={item.status === 'active' ? 'green' : 'gray'} size="sm">{item.status}</Badge>
                              </Table.Td>
                              <Table.Td>
                                <ActionIcon variant="subtle" color="red" size="sm"
                                  onClick={(e) => { e.stopPropagation(); deleteOffering.mutate(item.id); }}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed" ta="center" py="lg">No offerings yet</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="dependencies" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text fw={600} mb="sm">Add Dependency</Text>
                      <Grid>
                        <Grid.Col span={8}>
                          <Select label="Depends On Service" data={serviceOptions} value={depForm.depends_on_id}
                            onChange={(v) => setDepForm({ depends_on_id: v || '' })} clearable searchable />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <Box mt={24}>
                            <Button size="sm" leftSection={<IconPlus size={14} />}
                              onClick={() => addDependency.mutate()}
                              loading={addDependency.isPending}
                              disabled={!depForm.depends_on_id}
                              fullWidth>
                              Add
                            </Button>
                          </Box>
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    {dependencies && dependencies.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Depends On</Table.Th>
                            <Table.Th style={{ width: 100 }}>Status</Table.Th>
                            <Table.Th style={{ width: 120 }}>Criticality</Table.Th>
                            <Table.Th style={{ width: 50 }}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {dependencies.map((dep: any) => (
                            <Table.Tr key={dep.id}>
                              <Table.Td>{dep.depends_on_name || dep.depends_on_id}</Table.Td>
                              <Table.Td>
                                <Badge variant="light" color={STATUS_COLORS[dep.depends_on_status] || 'gray'} size="sm">
                                  {dep.depends_on_status || '-'}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="filled" color={CRITICALITY_COLORS[dep.depends_on_criticality] || 'gray'} size="sm">
                                  {dep.depends_on_criticality || '-'}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <ActionIcon variant="subtle" color="red" size="sm"
                                  onClick={() => removeDependency.mutate(dep.id)}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed" ta="center" py="lg">No dependencies yet</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="ci-mappings" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text fw={600} mb="sm">Add CI Mapping</Text>
                      <Grid>
                        <Grid.Col span={5}>
                          <Select label="Configuration Item" data={ciOptions} value={ciForm.ci_id}
                            onChange={(v) => setCiForm({ ...ciForm, ci_id: v || '' })} clearable searchable />
                        </Grid.Col>
                        <Grid.Col span={4}>
                          <TextInput label="Role" value={ciForm.role} placeholder="e.g. Application Server, Database"
                            onChange={(e) => setCiForm({ ...ciForm, role: e.currentTarget.value })} />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <Box mt={24}>
                            <Button size="sm" leftSection={<IconPlus size={14} />}
                              onClick={() => addCiMapping.mutate()}
                              loading={addCiMapping.isPending}
                              disabled={!ciForm.ci_id}
                              fullWidth>
                              Add
                            </Button>
                          </Box>
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    {ciMappings && ciMappings.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Configuration Item</Table.Th>
                            <Table.Th>Role</Table.Th>
                            <Table.Th style={{ width: 50 }}></Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {ciMappings.map((mapping: any) => (
                            <Table.Tr key={mapping.id}>
                              <Table.Td>{mapping.ci_name || mapping.ci_id}</Table.Td>
                              <Table.Td>{mapping.role || '-'}</Table.Td>
                              <Table.Td>
                                <ActionIcon variant="subtle" color="red" size="sm"
                                  onClick={() => removeCiMapping.mutate(mapping.id)}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed" ta="center" py="lg">No CI mappings yet</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="journal" pt="md">
                  <ActivityStream tableName="business_services" recordId={service?.id} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && service && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {service.number || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Owner:</Text> {service.owner_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Portfolio:</Text> {service.portfolio || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(service.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(service.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                </Stack>
              </Paper>
              <AttachmentPanel tableName="business_services" recordId={service.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
