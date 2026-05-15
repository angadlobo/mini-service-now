import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, Title, Paper, Text, Group, Badge, Button, Textarea, Modal, LoadingOverlay, Box, SegmentedControl } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { approvalApi } from '../../api/common.api';
import { Pagination } from '../../components/common/Pagination';
import dayjs from 'dayjs';

export function MyApprovals() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('requested');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [action, setAction] = useState<'approved' | 'rejected'>('approved');
  const [comments, setComments] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-approvals', page, filter],
    queryFn: () => approvalApi.listMine({ page, pageSize: 20, state: filter || undefined }),
  });

  const decide = useMutation({
    mutationFn: () => approvalApi.decide(selectedApproval.id, { state: action, comments }),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: `Approval ${action}`, color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['my-approvals'] });
      setModalOpen(false);
      setComments('');
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const openDecide = (approval: any, act: 'approved' | 'rejected') => {
    setSelectedApproval(approval);
    setAction(act);
    setModalOpen(true);
  };

  const stateColor = (s: string) => s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'blue';

  return (
    <Stack>
      <Title order={2}>My Approvals</Title>

      <SegmentedControl
        data={[
          { value: 'requested', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: '', label: 'All' },
        ]}
        value={filter}
        onChange={(v) => { setFilter(v); setPage(1); }}
      />

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={isLoading} />
        <Stack gap="sm">
          {(data?.data || []).map((approval: any) => (
            <Paper key={approval.id} withBorder p="md">
              <Group justify="space-between">
                <div>
                  <Group gap="xs">
                    <Text fw={600}>{approval.record_number || 'Record'}</Text>
                    <Badge size="xs" variant="light">{approval.table_name}</Badge>
                    <Badge color={stateColor(approval.state)} variant="light" size="sm">{approval.state}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>{approval.record_description || 'No description'}</Text>
                  <Text size="xs" c="dimmed">{dayjs(approval.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  {approval.comments && <Text size="sm" mt="xs" fs="italic">{approval.comments}</Text>}
                </div>
                {approval.state === 'requested' && (
                  <Group>
                    <Button size="xs" color="green" leftSection={<IconCheck size={14} />}
                      onClick={() => openDecide(approval, 'approved')}>
                      Approve
                    </Button>
                    <Button size="xs" color="red" variant="outline" leftSection={<IconX size={14} />}
                      onClick={() => openDecide(approval, 'rejected')}>
                      Reject
                    </Button>
                  </Group>
                )}
              </Group>
            </Paper>
          ))}
          {(data?.data || []).length === 0 && !isLoading && (
            <Text c="dimmed" ta="center" py="xl">No approvals found</Text>
          )}
        </Stack>
      </Box>

      {data && data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={`${action === 'approved' ? 'Approve' : 'Reject'} Request`}>
        <Stack>
          <Text size="sm">
            {action === 'approved' ? 'Approve' : 'Reject'} <strong>{selectedApproval?.record_number}</strong>?
          </Text>
          <Textarea
            label="Comments"
            placeholder="Optional comments..."
            value={comments}
            onChange={(e) => setComments(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button color={action === 'approved' ? 'green' : 'red'} onClick={() => decide.mutate()} loading={decide.isPending}>
              {action === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
