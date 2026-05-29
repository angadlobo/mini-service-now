import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack, Group, Title, Text, Badge, Paper, Button, Textarea, SegmentedControl, Timeline,
  ThemeIcon, Loader, Divider, Anchor, Select, Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft, IconFlag, IconMessage, IconClock, IconCircleCheck, IconSpeakerphone, IconExternalLink,
} from '@tabler/icons-react';
import { majorIncidentsApi } from '../../api/major-incidents.api';
import dayjs from 'dayjs';

const SEVERITY_COLOR: Record<string, string> = { sev1: 'red', sev2: 'orange', sev3: 'yellow' };
const STATUS_COLOR: Record<string, string> = { active: 'red', proposed: 'orange', resolved: 'green', cancelled: 'gray' };
const UPDATE_ICON: Record<string, any> = { timeline: IconClock, comms: IconSpeakerphone, status: IconFlag };

export function MajorIncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [updateType, setUpdateType] = useState('timeline');
  const [audience, setAudience] = useState('internal');

  const { data: mi, isLoading } = useQuery({
    queryKey: ['major-incident', id],
    queryFn: () => majorIncidentsApi.get(id!),
    enabled: !!id,
    refetchInterval: 20_000,
  });

  const post = useMutation({
    mutationFn: () => majorIncidentsApi.postUpdate(id!, { type: updateType, audience, message }),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['major-incident', id] });
      notifications.show({ title: 'Posted', message: 'Update added to the timeline', color: 'green' });
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) => majorIncidentsApi.update(id!, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['major-incident', id] });
      qc.invalidateQueries({ queryKey: ['major-incidents'] });
      notifications.show({ title: 'Updated', message: 'Status changed', color: 'green' });
    },
  });

  if (isLoading || !mi) {
    return <Stack align="center" py="xl"><Loader /></Stack>;
  }

  return (
    <Stack className="fade-in">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/major-incidents')}>Back</Button>
      </Group>

      <Paper p="lg" radius="md" withBorder style={{ borderLeft: `4px solid var(--mantine-color-${SEVERITY_COLOR[mi.severity]}-6)` }}>
        <Group justify="space-between" mb="sm">
          <Group gap={8}>
            <Text fw={800} size="lg" c="var(--mantine-primary-color-filled)">{mi.number}</Text>
            <Badge color={SEVERITY_COLOR[mi.severity]} variant="filled">{mi.severity.toUpperCase()}</Badge>
            <Badge color={STATUS_COLOR[mi.status]} variant="light" tt="capitalize">{mi.status}</Badge>
          </Group>
          <Group gap="xs">
            {mi.status !== 'resolved' && mi.status !== 'cancelled' && (
              <>
                {mi.status === 'proposed' && <Button size="xs" color="red" onClick={() => setStatus.mutate('active')}>Accept</Button>}
                <Button size="xs" color="green" leftSection={<IconCircleCheck size={14} />} onClick={() => setStatus.mutate('resolved')}>Resolve</Button>
                <Button size="xs" variant="default" onClick={() => setStatus.mutate('cancelled')}>Cancel</Button>
              </>
            )}
          </Group>
        </Group>
        <Title order={3} mb="xs">{mi.title}</Title>
        <Group gap="xl">
          <div><Text size="xs" c="dimmed">Declared</Text><Text size="sm">{dayjs(mi.declared_at).format('MMM D, YYYY HH:mm')} by {mi.declared_by_name || '-'}</Text></div>
          <div><Text size="xs" c="dimmed">Manager</Text><Text size="sm">{mi.manager_name || 'Unassigned'}</Text></div>
          {mi.incident_number && (
            <div><Text size="xs" c="dimmed">Trigger</Text>
              <Anchor size="sm" onClick={() => navigate(`/incidents/${mi.incident_id}`)}>{mi.incident_number}</Anchor>
            </div>
          )}
          {mi.resolved_at && <div><Text size="xs" c="dimmed">Resolved</Text><Text size="sm">{dayjs(mi.resolved_at).format('MMM D, HH:mm')}</Text></div>}
        </Group>
        {mi.business_impact && (<><Divider my="sm" /><Text size="xs" c="dimmed" fw={600}>BUSINESS IMPACT</Text><Text size="sm">{mi.business_impact}</Text></>)}
        {mi.war_room_url && (
          <Group mt="sm"><Anchor href={mi.war_room_url} target="_blank" size="sm"><Group gap={4}><IconExternalLink size={14} /> Join war room</Group></Anchor></Group>
        )}
      </Paper>

      {/* Post update */}
      <Paper p="lg" radius="md" withBorder>
        <Text fw={600} mb="sm">Post an Update</Text>
        <Group mb="sm">
          <SegmentedControl
            value={updateType}
            onChange={setUpdateType}
            data={[
              { value: 'timeline', label: 'Timeline' },
              { value: 'comms', label: 'Comms' },
            ]}
          />
          {updateType === 'comms' && (
            <Select
              value={audience}
              onChange={(v) => setAudience(v || 'internal')}
              data={[{ value: 'internal', label: 'Internal' }, { value: 'stakeholders', label: 'Stakeholders' }]}
              w={160}
            />
          )}
        </Group>
        <Textarea
          placeholder={updateType === 'comms' ? 'Stakeholder communication...' : 'What happened / what are we doing...'}
          minRows={2}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
        />
        <Group justify="flex-end" mt="sm">
          <Button leftSection={<IconMessage size={16} />} disabled={!message.trim()} loading={post.isPending} onClick={() => post.mutate()}>
            Post
          </Button>
        </Group>
      </Paper>

      {/* Timeline */}
      <Paper p="lg" radius="md" withBorder>
        <Text fw={600} mb="md">Timeline</Text>
        {(!mi.updates || mi.updates.length === 0) ? (
          <Text c="dimmed" size="sm">No updates yet.</Text>
        ) : (
          <Timeline active={mi.updates.length} bulletSize={26} lineWidth={2}>
            {mi.updates.map((u) => {
              const Icon = UPDATE_ICON[u.type] || IconClock;
              return (
                <Timeline.Item
                  key={u.id}
                  bullet={<ThemeIcon size={22} radius="xl" color={u.type === 'comms' ? 'blue' : u.type === 'status' ? 'orange' : 'gray'} variant="light"><Icon size={13} /></ThemeIcon>}
                  title={
                    <Group gap={6}>
                      <Text size="sm" fw={600} tt="capitalize">{u.type}</Text>
                      {u.type === 'comms' && <Badge size="xs" variant="light" color={u.audience === 'stakeholders' ? 'grape' : 'gray'}>{u.audience}</Badge>}
                    </Group>
                  }
                >
                  <Text size="sm">{u.message}</Text>
                  <Text size="xs" c="dimmed" mt={2}>{u.posted_by_name || 'System'} · {dayjs(u.created_at).format('MMM D, HH:mm')}</Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        )}
      </Paper>
    </Stack>
  );
}
