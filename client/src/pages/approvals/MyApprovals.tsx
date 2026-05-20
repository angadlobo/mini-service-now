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
      <Title order={2} className="page-title">My Approvals</Title>

      <Paper p="xs" radius="lg" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', display: 'inline-block' }}>
        <SegmentedControl
          data={[
            { value: 'requested', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: '', label: 'All' },
          ]}
          value={filter}
          onChange={(v) => { setFilter(v); setPage(1); }}
          radius="md"
        />
      </Paper>

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={isLoading} />
        <Stack gap="sm">
          {(data?.data || []).map((approval: any) => (
            <Paper key={approval.id} p="lg" radius="lg" className="hover-lift" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <Group justify="space-between" wrap="wrap">
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Group gap="xs" mb={4}>
                    <Text fw={700} size="md">{approval.record_number || 'Record'}</Text>
                    <Badge size="xs" variant="light" radius="sm">{approval.table_name}</Badge>
                    <Badge color={stateColor(approval.state)} variant="light" size="sm" radius="sm">{approval.state}</Badge>
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>{approval.record_description || 'No description'}</Text>
                  <Text size="xs" c="dimmed" mt={2}>{dayjs(approval.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  {approval.comments && <Text size="sm" mt="xs" fs="italic" c="gray.7">{approval.comments}</Text>}
                </div>
                {approval.state === 'requested' && (
                  <Group gap="sm">
                    <Button size="xs" color="green" variant="filled" leftSection={<IconCheck size={14} />}
                      onClick={() => openDecide(approval, 'approved')}
                      style={{ boxShadow: '0 2px 8px rgba(34,139,34,0.2)' }}>
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
            <Paper p="xl" radius="lg" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <Text c="dimmed" ta="center" size="lg" fw={500}>No approvals found</Text>
              <Text c="dimmed" ta="center" size="sm" mt="xs">Approvals assigned to you will appear here</Text>
            </Paper>
          )}
        </Stack>
      </Box>

      {data && data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={`${action === 'approved' ? 'Approve' : 'Reject'} Request`} radius="lg" centered>
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to {action === 'approved' ? 'approve' : 'reject'} <strong>{selectedApproval?.record_number}</strong>?
          </Text>
          <Textarea
            label="Comments"
            placeholder="Add optional comments..."
            value={comments}
            onChange={(e) => setComments(e.currentTarget.value)}
            minRows={3}
            radius="md"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => setModalOpen(false)} radius="md">Cancel</Button>
            <Button color={action === 'approved' ? 'green' : 'red'} onClick={() => decide.mutate()} loading={decide.isPending} radius="md"
              style={{ boxShadow: action === 'approved' ? '0 2px 8px rgba(34,139,34,0.2)' : '0 2px 8px rgba(220,38,38,0.2)' }}>
              {action === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
