import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text,
  LoadingOverlay, Box, Tabs, Table, NumberInput, ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconStar, IconPlus } from '@tabler/icons-react';
import { vendorsApi } from '../../api/contracts.api';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import dayjs from 'dayjs';

function RatingInput({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <Group gap={4}>
      {[1, 2, 3, 4, 5].map((star) => (
        <ActionIcon
          key={star}
          variant="subtle"
          size="sm"
          onClick={() => onChange(star)}
          style={{ color: star <= (value || 0) ? '#fab005' : '#dee2e6' }}
        >
          <IconStar size={20} fill={star <= (value || 0) ? '#fab005' : 'none'} />
        </ActionIcon>
      ))}
    </Group>
  );
}

export function VendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    name: '',
    type: 'service',
    status: 'active',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    rating: null as number | null,
    notes: '',
  });

  const [assessmentForm, setAssessmentForm] = useState({
    score: 3,
    notes: '',
  });

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorsApi.get(id!),
    enabled: !isNew,
  });

  const { data: assessments, refetch: refetchAssessments } = useQuery({
    queryKey: ['vendor-assessments', id],
    queryFn: () => vendorsApi.getAssessments(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name || '',
        type: vendor.type || 'service',
        status: vendor.status || 'active',
        contact_name: vendor.contact_name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        website: vendor.website || '',
        address: vendor.address || '',
        rating: vendor.rating,
        notes: vendor.notes || '',
      });
    }
  }, [vendor]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name,
        type: form.type,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        address: form.address || null,
        rating: form.rating,
        notes: form.notes || null,
      };
      if (isNew) return vendorsApi.create(payload);
      if (form.status !== vendor?.status) payload.status = form.status;
      else payload.status = form.status;
      return vendorsApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Vendor created' : 'Vendor updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      if (isNew) navigate(`/vendors/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['vendor', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addAssessment = useMutation({
    mutationFn: () => vendorsApi.addAssessment(id!, {
      score: assessmentForm.score,
      notes: assessmentForm.notes || null,
      date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Assessment added', color: 'green' });
      setAssessmentForm({ score: 3, notes: '' });
      refetchAssessments();
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add assessment', color: 'red' });
    },
  });

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/vendors')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Vendor' : `${vendor?.number || ''} - ${vendor?.name || ''}`}</Title>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                {!isNew && <Tabs.Tab value="assessments">Assessments</Tabs.Tab>}
                {!isNew && <Tabs.Tab value="journal">Journal</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  <TextInput label="Name" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />

                  <Grid>
                    <Grid.Col span={6}>
                      <Select label="Type" data={[
                        { value: 'hardware', label: 'Hardware' }, { value: 'software', label: 'Software' },
                        { value: 'service', label: 'Service' }, { value: 'consulting', label: 'Consulting' },
                      ]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'service' })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Select label="Status" data={[
                        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
                        { value: 'blacklisted', label: 'Blacklisted' },
                      ]} value={form.status} onChange={(v) => setForm({ ...form, status: v || 'active' })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Contact Name" value={form.contact_name}
                        onChange={(e) => setForm({ ...form, contact_name: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="Email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Grid>
                    <Grid.Col span={6}>
                      <TextInput label="Phone" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })} />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <TextInput label="Website" value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.currentTarget.value })} />
                    </Grid.Col>
                  </Grid>

                  <Textarea label="Address" minRows={2} value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} />

                  <Box>
                    <Text size="sm" fw={500} mb={4}>Rating</Text>
                    <RatingInput value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
                  </Box>

                  <Textarea label="Notes" minRows={3} value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })} />

                  <Group justify="flex-end">
                    <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                      {isNew ? 'Create' : 'Update'}
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="assessments" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Text fw={600} mb="sm">Add Assessment</Text>
                      <Grid>
                        <Grid.Col span={4}>
                          <NumberInput label="Score (1-5)" min={1} max={5} value={assessmentForm.score}
                            onChange={(v) => setAssessmentForm({ ...assessmentForm, score: Number(v) || 3 })} />
                        </Grid.Col>
                        <Grid.Col span={8}>
                          <TextInput label="Notes" value={assessmentForm.notes}
                            onChange={(e) => setAssessmentForm({ ...assessmentForm, notes: e.currentTarget.value })} />
                        </Grid.Col>
                      </Grid>
                      <Group justify="flex-end" mt="sm">
                        <Button size="sm" leftSection={<IconPlus size={14} />} onClick={() => addAssessment.mutate()} loading={addAssessment.isPending}>
                          Add
                        </Button>
                      </Group>
                    </Paper>

                    {assessments && assessments.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Score</Table.Th>
                            <Table.Th>Assessor</Table.Th>
                            <Table.Th>Notes</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {assessments.map((a: any) => (
                            <Table.Tr key={a.id}>
                              <Table.Td>{dayjs(a.date).format('MMM D, YYYY')}</Table.Td>
                              <Table.Td>
                                <Group gap={2}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <IconStar key={star} size={12} fill={star <= a.score ? '#fab005' : 'none'} color={star <= a.score ? '#fab005' : '#dee2e6'} stroke={1.5} />
                                  ))}
                                </Group>
                              </Table.Td>
                              <Table.Td>{a.assessor_name || '-'}</Table.Td>
                              <Table.Td>{a.notes || '-'}</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text c="dimmed" ta="center" py="lg">No assessments yet</Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              )}

              {!isNew && (
                <Tabs.Panel value="journal" pt="md">
                  <ActivityStream tableName="vendors" recordId={vendor?.id} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && vendor && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {vendor.number}</Text>
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {vendor.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(vendor.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(vendor.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                </Stack>
              </Paper>
              <AttachmentPanel tableName="vendors" recordId={vendor.id} />
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
