import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Paper, Text, Group, Stack, ActionIcon, FileButton, Button, Table, LoadingOverlay, Box } from '@mantine/core';
import { IconUpload, IconDownload, IconTrash, IconFile } from '@tabler/icons-react';
import { attachmentApi } from '../../api/common.api';
import dayjs from 'dayjs';

interface Props {
  tableName: string;
  recordId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPanel({ tableName, recordId }: Props) {
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', tableName, recordId],
    queryFn: () => attachmentApi.list(tableName, recordId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => attachmentApi.upload(tableName, recordId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', tableName, recordId] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => attachmentApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', tableName, recordId] }),
  });

  const handleDownload = async (id: string, fileName: string) => {
    const response = await attachmentApi.download(id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Text fw={600} size="sm">Attachments</Text>
        <FileButton onChange={(file) => file && upload.mutate(file)}>
          {(props) => (
            <Button {...props} size="xs" variant="light" leftSection={<IconUpload size={14} />} loading={upload.isPending}>
              Upload
            </Button>
          )}
        </FileButton>
      </Group>

      <Box pos="relative">
        <LoadingOverlay visible={isLoading} />
        {attachments.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="md">No attachments</Text>
        ) : (
          <Table>
            <Table.Tbody>
              {attachments.map((att: any) => (
                <Table.Tr key={att.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconFile size={16} />
                      <Text size="sm">{att.file_name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{formatSize(att.size)}</Text></Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{dayjs(att.created_at).format('MMM D, YYYY')}</Text></Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon size="sm" variant="subtle" onClick={() => handleDownload(att.id, att.file_name)}>
                        <IconDownload size={14} />
                      </ActionIcon>
                      <ActionIcon size="sm" variant="subtle" color="red" onClick={() => remove.mutate(att.id)}>
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Box>
    </Paper>
  );
}
