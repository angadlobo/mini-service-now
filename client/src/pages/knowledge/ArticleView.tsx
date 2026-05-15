import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Stack, Title, Paper, Text, Group, Button, Badge, Divider, LoadingOverlay, Box, TypographyStylesProvider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconEdit, IconThumbUp, IconEye } from '@tabler/icons-react';
import { knowledgeApi } from '../../api/knowledge.api';
import { useAuthStore } from '../../store/auth';
import { StateIndicator } from '../../components/common/StateIndicator';
import dayjs from 'dayjs';

export function ArticleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.roles.some((r) => ['admin', 'itil', 'knowledge_manager'].includes(r));

  const { data: article, isLoading } = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => knowledgeApi.get(id!),
  });

  const helpful = useMutation({
    mutationFn: () => knowledgeApi.markHelpful(id!),
    onSuccess: () => notifications.show({ title: 'Thanks!', message: 'Feedback recorded', color: 'green' }),
  });

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/knowledge')}>Back</Button>
        {article && canEdit && (
          <Button variant="light" leftSection={<IconEdit size={16} />} onClick={() => navigate(`/knowledge/${id}/edit`)}>Edit</Button>
        )}
      </Group>

      <Paper withBorder p="xl" pos="relative">
        <LoadingOverlay visible={isLoading} />
        {article && (
          <Stack>
            <Group justify="space-between">
              <div>
                <Title order={2}>{article.title}</Title>
                <Group gap="xs" mt="xs">
                  <Badge variant="light">{article.number}</Badge>
                  <StateIndicator state={article.state} />
                  {article.category_name && <Badge variant="outline">{article.category_name}</Badge>}
                </Group>
              </div>
            </Group>

            <Group gap="md">
              <Text size="sm" c="dimmed">By {article.author_name}</Text>
              <Text size="sm" c="dimmed">Updated {dayjs(article.updated_at).format('MMM D, YYYY')}</Text>
              <Group gap={4}><IconEye size={14} /><Text size="sm" c="dimmed">{article.view_count} views</Text></Group>
              <Group gap={4}><IconThumbUp size={14} /><Text size="sm" c="dimmed">{article.helpful_count} found helpful</Text></Group>
            </Group>

            <Divider />

            <TypographyStylesProvider>
              <div dangerouslySetInnerHTML={{ __html: article.body || '' }} />
            </TypographyStylesProvider>

            <Divider />

            <Group>
              <Text size="sm">Was this article helpful?</Text>
              <Button variant="light" size="xs" leftSection={<IconThumbUp size={14} />} onClick={() => helpful.mutate()} loading={helpful.isPending}>
                Yes, helpful
              </Button>
            </Group>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
