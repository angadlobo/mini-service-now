import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Paper, Group, Text, Textarea, Button, SegmentedControl, Avatar, Badge, Divider, Tabs, Timeline, Box, LoadingOverlay } from '@mantine/core';
import { IconMessage, IconNote } from '@tabler/icons-react';
import { journalApi, auditApi } from '../../api/common.api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Props {
  tableName: string;
  recordId: string;
  showWorkNotes?: boolean;
}

export function ActivityStream({ tableName, recordId, showWorkNotes = true }: Props) {
  const queryClient = useQueryClient();
  const [newEntry, setNewEntry] = useState('');
  const [entryType, setEntryType] = useState('comment');
  const [activeTab, setActiveTab] = useState<string | null>('activity');

  const { data: journal = [], isLoading: journalLoading } = useQuery({
    queryKey: ['journal', tableName, recordId],
    queryFn: () => journalApi.list(tableName, recordId),
  });

  const { data: audit = [], isLoading: auditLoading } = useQuery({
    queryKey: ['audit', tableName, recordId],
    queryFn: () => auditApi.list(tableName, recordId),
    enabled: activeTab === 'history',
  });

  const addEntry = useMutation({
    mutationFn: () => journalApi.create(tableName, recordId, { type: entryType, body: newEntry }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', tableName, recordId] });
      setNewEntry('');
    },
  });

  return (
    <Paper withBorder p="md">
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="activity" pt="md">
          <Stack gap="sm">
            <Group>
              {showWorkNotes && (
                <SegmentedControl
                  size="xs"
                  value={entryType}
                  onChange={setEntryType}
                  data={[
                    { label: 'Comment', value: 'comment' },
                    { label: 'Work Note', value: 'work_note' },
                  ]}
                />
              )}
            </Group>
            <Textarea
              placeholder={entryType === 'comment' ? 'Add a comment...' : 'Add a work note...'}
              value={newEntry}
              onChange={(e) => setNewEntry(e.currentTarget.value)}
              minRows={2}
            />
            <Group justify="flex-end">
              <Button size="xs" onClick={() => addEntry.mutate()} disabled={!newEntry.trim()} loading={addEntry.isPending}>
                Add {entryType === 'comment' ? 'Comment' : 'Work Note'}
              </Button>
            </Group>

            <Divider my="xs" />
            <Box pos="relative">
              <LoadingOverlay visible={journalLoading} />
              <Stack gap="sm">
                {journal.map((entry: any) => (
                  <Paper key={entry.id} p="sm" withBorder bg={entry.type === 'work_note' ? 'yellow.0' : undefined}>
                    <Group justify="space-between" mb={4}>
                      <Group gap="xs">
                        <Avatar size="xs" radius="xl" color={entry.type === 'work_note' ? 'yellow' : 'blue'}>
                          {entry.type === 'work_note' ? <IconNote size={12} /> : <IconMessage size={12} />}
                        </Avatar>
                        <Text size="sm" fw={500}>{entry.created_by_name}</Text>
                        <Badge size="xs" variant="light" color={entry.type === 'work_note' ? 'yellow' : 'blue'}>
                          {entry.type === 'work_note' ? 'Work Note' : 'Comment'}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">{dayjs(entry.created_at).fromNow()}</Text>
                    </Group>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{entry.body}</Text>
                  </Paper>
                ))}
                {journal.length === 0 && !journalLoading && (
                  <Text c="dimmed" ta="center" size="sm">No activity yet</Text>
                )}
              </Stack>
            </Box>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <Box pos="relative">
            <LoadingOverlay visible={auditLoading} />
            <Stack gap="xs">
              {audit.map((entry: any) => (
                <Paper key={entry.id} p="xs" withBorder>
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Text size="sm" fw={500}>{entry.changed_by_name}</Text>
                      <Text size="sm">changed <Text span fw={600}>{entry.field_name}</Text></Text>
                    </Group>
                    <Text size="xs" c="dimmed">{dayjs(entry.created_at).fromNow()}</Text>
                  </Group>
                  <Group gap="xs" mt={4}>
                    {entry.old_value && <Text size="xs" c="red" td="line-through">{entry.old_value}</Text>}
                    {entry.old_value && <Text size="xs">→</Text>}
                    <Text size="xs" c="green">{entry.new_value}</Text>
                  </Group>
                </Paper>
              ))}
              {audit.length === 0 && !auditLoading && (
                <Text c="dimmed" ta="center" size="sm">No changes recorded</Text>
              )}
            </Stack>
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}
