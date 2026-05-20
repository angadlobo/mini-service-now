import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Paper, Badge, Text, TextInput, Textarea, Select, Modal, Table, ActionIcon, Tabs } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconGavel, IconCalendarEvent, IconCheck, IconX, IconClock } from '@tabler/icons-react';
import { changesApi } from '../../api/changes.api';
import { usersApi } from '../../api/common.api';
import dayjs from 'dayjs';

interface AgendaItem {
  id: string;
  change_id: string;
  change_number: string;
  description: string;
  type: string;
  risk: string;
  risk_score: number;
  decision?: string;
  discussion_notes?: string;
}

interface CabMeeting {
  id: string;
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  state: 'scheduled' | 'in_progress' | 'completed';
  chair_id: string;
  location?: string;
  attendees: string[];
  agenda_items?: AgendaItem[];
  attendee_details?: { id: string; first_name: string; last_name: string }[];
}

const stateColors: Record<string, string> = {
  scheduled: 'blue',
  in_progress: 'orange',
  completed: 'green',
};

const stateIcons: Record<string, React.ReactNode> = {
  scheduled: <IconCalendarEvent size={14} />,
  in_progress: <IconClock size={14} />,
  completed: <IconCheck size={14} />,
};

const decisionColors: Record<string, string> = {
  approved: 'green',
  rejected: 'red',
  deferred: 'yellow',
  more_info: 'blue',
};

export function CABDashboard() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    scheduled_date: '',
    duration_minutes: 60,
    attendees: [] as string[],
    chair_id: '',
    location: '',
  });
  const [discussionNotes, setDiscussionNotes] = useState<Record<string, string>>({});

  const { data: meetings = [] } = useQuery<CabMeeting[]>({
    queryKey: ['cab-meetings'],
    queryFn: () => changesApi.listCabMeetings(),
  });

  const { data: selectedMeeting } = useQuery<CabMeeting>({
    queryKey: ['cab-meeting', selectedMeetingId],
    queryFn: () => changesApi.getCabMeeting(selectedMeetingId!),
    enabled: !!selectedMeetingId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ pageSize: 100 }),
  });

  const users = usersData?.data ?? [];
  const userOptions = users.map((u: { id: string; first_name: string; last_name: string }) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name}`,
  }));

  const createMutation = useMutation({
    mutationFn: (data: typeof newMeeting) => changesApi.createCabMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cab-meetings'] });
      setCreateModalOpen(false);
      setNewMeeting({ title: '', scheduled_date: '', duration_minutes: 60, attendees: [], chair_id: '', location: '' });
      notifications.show({ title: 'Success', message: 'CAB meeting created', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to create meeting', color: 'red' });
    },
  });

  const updateStateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: string }) => changesApi.updateCabMeeting(id, { state }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cab-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['cab-meeting', selectedMeetingId] });
    },
  });

  const removeFromAgendaMutation = useMutation({
    mutationFn: ({ meetingId, changeId }: { meetingId: string; changeId: string }) =>
      changesApi.removeFromAgenda(meetingId, changeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cab-meeting', selectedMeetingId] });
      notifications.show({ title: 'Removed', message: 'Item removed from agenda', color: 'blue' });
    },
  });

  const recordDecisionMutation = useMutation({
    mutationFn: ({ itemId, decision, discussion_notes }: { itemId: string; decision: string; discussion_notes?: string }) =>
      changesApi.recordCabDecision(itemId, { decision, discussion_notes, votes: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cab-meeting', selectedMeetingId] });
      notifications.show({ title: 'Decision Recorded', message: 'CAB decision has been saved', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to record decision', color: 'red' });
    },
  });

  const handleCreateMeeting = () => {
    if (!newMeeting.title || !newMeeting.scheduled_date || !newMeeting.chair_id) {
      notifications.show({ title: 'Validation', message: 'Title, date, and chair are required', color: 'yellow' });
      return;
    }
    createMutation.mutate(newMeeting);
  };

  const handleDecision = (itemId: string, decision: string) => {
    recordDecisionMutation.mutate({
      itemId,
      decision,
      discussion_notes: discussionNotes[itemId] || undefined,
    });
  };

  if (selectedMeetingId && selectedMeeting) {
    return (
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <Button variant="subtle" onClick={() => setSelectedMeetingId(null)}>
              Back to Meetings
            </Button>
            <Title order={3}>{selectedMeeting.title}</Title>
            <Badge color={stateColors[selectedMeeting.state]} leftSection={stateIcons[selectedMeeting.state]}>
              {selectedMeeting.state.replace('_', ' ')}
            </Badge>
          </Group>
          <Group>
            {selectedMeeting.state === 'scheduled' && (
              <Button
                color="orange"
                leftSection={<IconClock size={16} />}
                onClick={() => updateStateMutation.mutate({ id: selectedMeeting.id, state: 'in_progress' })}
              >
                Start Meeting
              </Button>
            )}
            {selectedMeeting.state === 'in_progress' && (
              <Button
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={() => updateStateMutation.mutate({ id: selectedMeeting.id, state: 'completed' })}
              >
                Complete Meeting
              </Button>
            )}
          </Group>
        </Group>

        <Paper p="md" withBorder>
          <Group gap="xl">
            <Text size="sm">
              <strong>Date:</strong> {dayjs(selectedMeeting.scheduled_date).format('YYYY-MM-DD HH:mm')}
            </Text>
            <Text size="sm">
              <strong>Duration:</strong> {selectedMeeting.duration_minutes} minutes
            </Text>
            {selectedMeeting.location && (
              <Text size="sm">
                <strong>Location:</strong> {selectedMeeting.location}
              </Text>
            )}
            <Text size="sm">
              <strong>Attendees:</strong>{' '}
              {selectedMeeting.attendee_details?.map((a) => `${a.first_name} ${a.last_name}`).join(', ') || 'None'}
            </Text>
          </Group>
        </Paper>

        <Title order={4}>Agenda Items</Title>

        {(!selectedMeeting.agenda_items || selectedMeeting.agenda_items.length === 0) && (
          <Paper p="lg" withBorder>
            <Text c="dimmed" ta="center">No items on the agenda yet.</Text>
          </Paper>
        )}

        {selectedMeeting.agenda_items?.map((item) => (
          <Paper key={item.id} p="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Group>
                  <Text fw={600}>{item.change_number}</Text>
                  <Badge size="sm" variant="light">{item.type}</Badge>
                  <Badge size="sm" color={item.risk === 'high' ? 'red' : item.risk === 'medium' ? 'yellow' : 'green'}>
                    Risk: {item.risk} ({item.risk_score})
                  </Badge>
                  {item.decision && (
                    <Badge color={decisionColors[item.decision]}>{item.decision.replace('_', ' ')}</Badge>
                  )}
                </Group>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => removeFromAgendaMutation.mutate({ meetingId: selectedMeeting.id, changeId: item.change_id })}
                  title="Remove from agenda"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>

              <Text size="sm">{item.description}</Text>

              <Textarea
                placeholder="Discussion notes..."
                value={discussionNotes[item.id] || item.discussion_notes || ''}
                onChange={(e) => setDiscussionNotes((prev) => ({ ...prev, [item.id]: e.currentTarget.value }))}
                minRows={2}
              />

              {selectedMeeting.state === 'in_progress' && !item.decision && (
                <Group>
                  <Button
                    size="xs"
                    color="green"
                    leftSection={<IconCheck size={14} />}
                    onClick={() => handleDecision(item.id, 'approved')}
                  >
                    Approved
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    leftSection={<IconX size={14} />}
                    onClick={() => handleDecision(item.id, 'rejected')}
                  >
                    Rejected
                  </Button>
                  <Button
                    size="xs"
                    color="yellow"
                    leftSection={<IconClock size={14} />}
                    onClick={() => handleDecision(item.id, 'deferred')}
                  >
                    Deferred
                  </Button>
                  <Button
                    size="xs"
                    color="blue"
                    variant="outline"
                    onClick={() => handleDecision(item.id, 'more_info')}
                  >
                    More Info Needed
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>CAB Meetings</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
          New Meeting
        </Button>
      </Group>

      <Tabs defaultValue="all">
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconGavel size={14} />}>All</Tabs.Tab>
          <Tabs.Tab value="scheduled" leftSection={<IconCalendarEvent size={14} />}>Scheduled</Tabs.Tab>
          <Tabs.Tab value="in_progress" leftSection={<IconClock size={14} />}>In Progress</Tabs.Tab>
          <Tabs.Tab value="completed" leftSection={<IconCheck size={14} />}>Completed</Tabs.Tab>
        </Tabs.List>

        {['all', 'scheduled', 'in_progress', 'completed'].map((tab) => (
          <Tabs.Panel key={tab} value={tab} pt="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Duration</Table.Th>
                  <Table.Th>State</Table.Th>
                  <Table.Th>Location</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {meetings
                  .filter((m) => tab === 'all' || m.state === tab)
                  .map((meeting) => (
                    <Table.Tr key={meeting.id}>
                      <Table.Td>
                        <Text fw={500}>{meeting.title}</Text>
                      </Table.Td>
                      <Table.Td>{dayjs(meeting.scheduled_date).format('YYYY-MM-DD HH:mm')}</Table.Td>
                      <Table.Td>{meeting.duration_minutes} min</Table.Td>
                      <Table.Td>
                        <Badge color={stateColors[meeting.state]} size="sm">
                          {meeting.state.replace('_', ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{meeting.location || '-'}</Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light" onClick={() => setSelectedMeetingId(meeting.id)}>
                          View
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </Tabs.Panel>
        ))}
      </Tabs>

      <Modal opened={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create CAB Meeting" size="lg">
        <Stack gap="md">
          <TextInput
            label="Title"
            required
            placeholder="Weekly CAB Review"
            value={newMeeting.title}
            onChange={(e) => setNewMeeting((prev) => ({ ...prev, title: e.currentTarget.value }))}
          />
          <TextInput
            label="Scheduled Date"
            required
            type="datetime-local"
            value={newMeeting.scheduled_date}
            onChange={(e) => setNewMeeting((prev) => ({ ...prev, scheduled_date: e.currentTarget.value }))}
          />
          <TextInput
            label="Duration (minutes)"
            type="number"
            value={String(newMeeting.duration_minutes)}
            onChange={(e) => setNewMeeting((prev) => ({ ...prev, duration_minutes: Number(e.currentTarget.value) || 60 }))}
          />
          <Select
            label="Chair"
            required
            placeholder="Select meeting chair"
            data={userOptions}
            value={newMeeting.chair_id}
            onChange={(val) => setNewMeeting((prev) => ({ ...prev, chair_id: val || '' }))}
            searchable
          />
          <Select
            label="Attendees"
            placeholder="Select attendees"
            data={userOptions}
            value={null}
            onChange={(val) => {
              if (val && !newMeeting.attendees.includes(val)) {
                setNewMeeting((prev) => ({ ...prev, attendees: [...prev.attendees, val] }));
              }
            }}
            searchable
          />
          {newMeeting.attendees.length > 0 && (
            <Group gap="xs">
              {newMeeting.attendees.map((id) => {
                const user = users.find((u: { id: string }) => u.id === id);
                return (
                  <Badge
                    key={id}
                    variant="outline"
                    rightSection={
                      <ActionIcon
                        size="xs"
                        variant="transparent"
                        onClick={() => setNewMeeting((prev) => ({ ...prev, attendees: prev.attendees.filter((a) => a !== id) }))}
                      >
                        <IconX size={10} />
                      </ActionIcon>
                    }
                  >
                    {user ? `${user.first_name} ${user.last_name}` : id}
                  </Badge>
                );
              })}
            </Group>
          )}
          <TextInput
            label="Location"
            placeholder="Conference Room A / Virtual"
            value={newMeeting.location}
            onChange={(e) => setNewMeeting((prev) => ({ ...prev, location: e.currentTarget.value }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMeeting} loading={createMutation.isPending}>Create Meeting</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
