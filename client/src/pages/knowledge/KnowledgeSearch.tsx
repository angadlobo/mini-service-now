import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, TextInput, Button, SimpleGrid, Card, Text, Badge, Grid, NavLink, Paper, Box, LoadingOverlay } from '@mantine/core';
import { IconSearch, IconPlus, IconEye, IconThumbUp } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { knowledgeApi } from '../../api/knowledge.api';
import { useAuthStore } from '../../store/auth';
import { StateIndicator } from '../../components/common/StateIndicator';
import { Pagination } from '../../components/common/Pagination';
import dayjs from 'dayjs';

export function KnowledgeSearch() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.roles.some((r) => ['admin', 'itil', 'knowledge_manager'].includes(r));
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: knowledgeApi.listCategories,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['kb-articles', activeSearch, selectedCategory, page],
    queryFn: () => knowledgeApi.list({
      page,
      pageSize: 12,
      q: activeSearch || undefined,
      ...(selectedCategory ? { category_id: selectedCategory } : {}),
      state: 'published',
    }),
  });

  const handleSearch = () => {
    setActiveSearch(search);
    setPage(1);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Knowledge Base</Title>
        {canCreate && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/knowledge/new')}>
            New Article
          </Button>
        )}
      </Group>

      <Group>
        <TextInput
          placeholder="Search articles..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, maxWidth: 500 }}
        />
        <Button onClick={handleSearch}>Search</Button>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Paper withBorder p="sm">
            <Text fw={600} size="sm" mb="xs">Categories</Text>
            <NavLink
              label="All Articles"
              active={!selectedCategory}
              onClick={() => { setSelectedCategory(null); setPage(1); }}
              variant="light"
            />
            {categories.map((cat: any) => (
              <NavLink
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.id}
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                variant="light"
              />
            ))}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 9 }}>
          <Box pos="relative" mih={200}>
            <LoadingOverlay visible={isLoading} />
            <Stack gap="sm">
              {(data?.data || []).map((article: any) => (
                <Card key={article.id} withBorder padding="md" style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/knowledge/${article.id}`)}>
                  <Group justify="space-between" mb={4}>
                    <Group gap="xs">
                      <Text fw={600}>{article.title}</Text>
                      <Badge size="xs" variant="light">{article.number}</Badge>
                    </Group>
                    <StateIndicator state={article.state} />
                  </Group>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {article.category_name && <Badge size="xs" variant="outline" mr="xs">{article.category_name}</Badge>}
                    by {article.author_name} · {dayjs(article.updated_at).format('MMM D, YYYY')}
                  </Text>
                  <Group gap="md" mt="xs">
                    <Group gap={4}><IconEye size={14} /><Text size="xs" c="dimmed">{article.view_count}</Text></Group>
                    <Group gap={4}><IconThumbUp size={14} /><Text size="xs" c="dimmed">{article.helpful_count}</Text></Group>
                  </Group>
                </Card>
              ))}
              {(data?.data || []).length === 0 && !isLoading && (
                <Text c="dimmed" ta="center" py="xl">No articles found</Text>
              )}
            </Stack>
          </Box>

          {data && data.totalPages > 1 && (
            <Pagination page={data.page} totalPages={data.totalPages} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
