import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Paper, Text, Group, Stack, Badge, Button, Textarea, LoadingOverlay, Box } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { approvalApi } from '../../api/common.api';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

interface Props {
  tableName: string;
  recordId: string;
}

export function ApprovalPanel({ tableName, recordId }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState('');

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approvals', tableName, recordId],
    queryFn: () => approvalApi.getForRecord(tableName, recordId),
  });

  const decide = useMutation({
    mutationFn: ({ id, state }: { id: string; state: 'approved' | 'rejected' }) =>
      approvalApi.decide(id, { state, comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', tableName, recordId] });
      setComments('');
    },
  });

  const stateColor = (s: string) => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'blue';

  return (
    <Paper withBorder p="md">
      <Text fw={600} size="sm" mb="sm">Approvals</Text>
      <Box pos="relative">
        <LoadingOverlay visible={isLoading} />
        <Stack gap="sm">
          {approvals.map((a: any) => (
            <Paper key={a.id} p="sm" withBorder>
              <Group justify="space-between">
                <Text size="sm" fw={500}>{a.approver_name}</Text>
                <Badge color={stateColor(a.state)} variant="light" size="sm">{a.state}</Badge>
              </Group>
              {a.comments && <Text size="xs" c="dimmed" mt={4}>{a.comments}</Text>}
              {a.decided_at && <Text size="xs" c="dimmed">{dayjs(a.decided_at).format('MMM D, YYYY HH:mm')}</Text>}

              {a.state === 'requested' && a.approver_id === user?.id && (
                <Stack gap="xs" mt="sm">
                  <Textarea
                    size="xs"
                    placeholder="Comments (optional)"
                    value={comments}
                    onChange={(e) => setComments(e.currentTarget.value)}
                  />
                  <Group>
                    <Button size="xs" color="green" leftSection={<IconCheck size={14} />}
                      onClick={() => decide.mutate({ id: a.id, state: 'approved' })} loading={decide.isPending}>
                      Approve
                    </Button>
                    <Button size="xs" color="red" variant="outline" leftSection={<IconX size={14} />}
                      onClick={() => decide.mutate({ id: a.id, state: 'rejected' })} loading={decide.isPending}>
                      Reject
                    </Button>
                  </Group>
                </Stack>
              )}
            </Paper>
          ))}
          {approvals.length === 0 && !isLoading && (
            <Text c="dimmed" size="sm" ta="center">No approvals</Text>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}
