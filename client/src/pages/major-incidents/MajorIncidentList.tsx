import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Group, Button, SimpleGrid, Paper, Text, Badge, ThemeIcon, Modal,
  TextInput, Select, Textarea, Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertOctagon, IconPlus, IconFlag, IconActivity, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { majorIncidentsApi, MajorIncident } from '../../api/major-incidents.api';
import { incidentsApi } from '../../api/incidents.api';
import dayjs from 'dayjs';

const SEVERITY_COLOR: Record<string, string> = { sev1: 'red', sev2: 'orange', sev3: 'yellow' };
const STATUS_COLOR: Record<string, string> = { active: 'red', proposed: 'orange', resolved: 'green', cancelled: 'gray' };

function MiCard({ mi, onClick }: { mi: MajorIncident; onClick: () => void }) {
  return (
    <Paper p="lg" radius="md" withBorder className="hover-lift" style={{ cursor: 'pointer', borderLeft: `4px solid var(--mantine-color-${SEVERITY_COLOR[mi.severity]}-6)` }} onClick={onClick}>
      <Group justify="space-between" mb="xs">
        <Group gap={6}>
          <Text fw={700} c="var(--mantine-primary-color-filled)">{mi.number}</Text>
          <Badge size="sm" color={SEVERITY_COLOR[mi.severity]} variant="filled">{mi.severity.toUpperCase()}</Badge>
        </Group>
        <Badge size="sm" color={STATUS_COLOR[mi.status]} variant="light" tt="capitalize">{mi.status}</Badge>
      </Group>
      <Text fw={600} size="sm" lineClamp={2} mb="xs">{mi.title}</Text>
      {mi.business_impact && <Text size="xs" c="dimmed" lineClamp={2} mb="xs">{mi.business_impact}</Text>}
      <Group justify="space-between">
        <Text size="xs" c="dimmed">{mi.incident_number ? `From ${mi.incident_number}` : 'Standalone'}</Text>
        <Text size="xs" c="dimmed">{dayjs(mi.declared_at).fromNow?.() || dayjs(mi.declared_at).format('MMM D, HH:mm')}</Text>
      </Group>
      {mi.manager_name && <Text size="xs" c="dimmed" mt={4}>MIM: {mi.manager_name}</Text>}
    </Paper>
  );
}

export function MajorIncidentList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [declareOpen, setDeclareOpen] = useState(false);
  const [form, setForm] = useState({ incident_id: '', title: '', severity: 'sev1', business_impact: '' });

  const { data: dash } = useQuery({ queryKey: ['mi-dashboard'], queryFn: majorIncidentsApi.getDashboard, refetchInterval: 30_000 });
  const { data: list, isLoading } = useQuery({ queryKey: ['major-incidents'], queryFn: () => majorIncidentsApi.list(), refetchInterval: 30_000 });
  const { data: incidents } = useQuery({ queryKey: ['incidents-for-major'], queryFn: () => incidentsApi.list({ limit: 100 }), enabled: declareOpen });

  const declare = useMutation({
    mutationFn: () => majorIncidentsApi.declare({
      incident_id: form.incident_id || undefined,
      title: form.title || undefined,
      severity: form.severity,
      business_impact: form.business_impact || undefined,
    }),
    onSuccess: (mi) => {
      notifications.show({ title: 'Declared', message: `${mi.number} declared`, color: 'red' });
      setDeclareOpen(false);
      setForm({ incident_id: '', title: '', severity: 'sev1', business_impact: '' });
      qc.invalidateQueries({ queryKey: ['major-incidents'] });
      qc.invalidateQueries({ queryKey: ['mi-dashboard'] });
      navigate(`/major-incidents/${mi.id}`);
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Declare failed', color: 'red' }),
  });

  const active = (list || []).filter((m) => m.status === 'active' || m.status === 'proposed');
  const closed = (list || []).filter((m) => m.status === 'resolved' || m.status === 'cancelled');

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <div>
          <Title order={2} className="page-title">Major Incidents</Title>
          <Text c="dimmed" size="sm">Coordinate response to high-impact outages — war room, timeline, and stakeholder comms.</Text>
        </div>
        <Button color="red" leftSection={<IconFlag size={16} />} onClick={() => setDeclareOpen(true)}>
          Declare Major Incident
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Paper p="md" radius="md" withBorder>
          <Group gap={8}><ThemeIcon color="red" variant="light"><IconActivity size={18} /></ThemeIcon><div><Text size="xl" fw={800}>{dash?.active ?? 0}</Text><Text size="xs" c="dimmed">Active</Text></div></Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap={8}><ThemeIcon color="orange" variant="light"><IconAlertOctagon size={18} /></ThemeIcon><div><Text size="xl" fw={800}>{dash?.proposed ?? 0}</Text><Text size="xs" c="dimmed">Proposed</Text></div></Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap={8}><ThemeIcon color="green" variant="light"><IconCheck size={18} /></ThemeIcon><div><Text size="xl" fw={800}>{dash?.resolved ?? 0}</Text><Text size="xs" c="dimmed">Resolved</Text></div></Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group gap={8}><ThemeIcon color="gray" variant="light"><IconAlertOctagon size={18} /></ThemeIcon><div><Text size="xl" fw={800}>{dash?.total ?? 0}</Text><Text size="xs" c="dimmed">Total</Text></div></Group>
        </Paper>
      </SimpleGrid>

      <Title order={4} mt="sm">Active War Rooms</Title>
      {isLoading ? <Loader /> : active.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <IconCheck size={40} style={{ opacity: 0.3 }} />
          <Text c="dimmed" mt="sm">No active major incidents. All clear. 🎉</Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {active.map((mi) => <MiCard key={mi.id} mi={mi} onClick={() => navigate(`/major-incidents/${mi.id}`)} />)}
        </SimpleGrid>
      )}

      {closed.length > 0 && (
        <>
          <Title order={4} mt="md">Resolved / Closed</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {closed.map((mi) => <MiCard key={mi.id} mi={mi} onClick={() => navigate(`/major-incidents/${mi.id}`)} />)}
          </SimpleGrid>
        </>
      )}

      <Modal opened={declareOpen} onClose={() => { setDeclareOpen(false); setForm({ incident_id: '', title: '', severity: 'sev1', business_impact: '' }); }} title="Declare Major Incident" size="lg">
        <Stack>
          <Select
            label="Trigger Incident (number or ID)"
            description="Optional — links a major incident to an existing incident and escalates it to P1"
            placeholder="Search by incident number or title..."
            searchable
            clearable
            value={form.incident_id}
            onChange={(v) => setForm({ ...form, incident_id: v || '' })}
            data={(incidents?.data || []).map((inc: any) => ({
              value: inc.id,
              label: `${inc.number} — ${inc.short_description}`,
              searchValue: `${inc.number} ${inc.short_description}`,
            }))}
          />
          <TextInput
            label="Title"
            description="Required if no trigger incident is given"
            placeholder="Short summary of the outage"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.currentTarget.value })}
          />
          <Select
            label="Severity"
            data={[{ value: 'sev1', label: 'SEV1 — Critical' }, { value: 'sev2', label: 'SEV2 — High' }, { value: 'sev3', label: 'SEV3 — Moderate' }]}
            value={form.severity}
            onChange={(v) => setForm({ ...form, severity: v || 'sev1' })}
          />
          <Textarea
            label="Business Impact"
            placeholder="Who/what is affected?"
            minRows={3}
            value={form.business_impact}
            onChange={(e) => setForm({ ...form, business_impact: e.currentTarget.value })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeclareOpen(false)}>Cancel</Button>
            <Button color="red" leftSection={<IconFlag size={16} />} loading={declare.isPending}
              disabled={!form.incident_id && !form.title} onClick={() => declare.mutate()}>
              Declare
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
