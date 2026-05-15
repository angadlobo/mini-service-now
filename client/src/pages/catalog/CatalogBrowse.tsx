import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, SimpleGrid, Card, Text, Group, Badge, Button, SegmentedControl, TextInput, Image, ThemeIcon, Box, LoadingOverlay } from '@mantine/core';
import { IconSearch, IconShoppingCart } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { catalogApi } from '../../api/catalog.api';

export function CatalogBrowse() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: catalogApi.listCategories,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalog-items', selectedCategory],
    queryFn: () => catalogApi.listItems(selectedCategory === 'all' ? undefined : selectedCategory),
  });

  const filteredItems = search
    ? items.filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.short_description?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const categoryData = [
    { value: 'all', label: 'All' },
    ...categories.map((c: any) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Service Catalog</Title>
        <Button variant="light" leftSection={<IconShoppingCart size={16} />} onClick={() => navigate('/catalog/requests')}>
          My Requests
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Search items..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={300}
        />
        <SegmentedControl data={categoryData} value={selectedCategory} onChange={setSelectedCategory} />
      </Group>

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={isLoading} />
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
          {filteredItems.map((item: any) => (
            <Card key={item.id} shadow="sm" padding="lg" radius="md" withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/catalog/items/${item.id}`)}
            >
              <Group mb="xs">
                <ThemeIcon variant="light" size="lg" radius="md">
                  <IconShoppingCart size={20} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text fw={600} size="sm" lineClamp={1}>{item.name}</Text>
                  <Text size="xs" c="dimmed">{item.category_name}</Text>
                </div>
              </Group>

              <Text size="sm" c="dimmed" lineClamp={2} mb="md">
                {item.short_description || item.description || 'No description'}
              </Text>

              <Group justify="space-between">
                {item.price > 0 ? (
                  <Text fw={600} size="sm">${Number(item.price).toFixed(2)}/mo</Text>
                ) : (
                  <Badge color="green" variant="light">Free</Badge>
                )}
                <Text size="xs" c="dimmed">{item.delivery_days} day delivery</Text>
              </Group>

              {item.approval_required && (
                <Badge color="orange" variant="light" size="xs" mt="xs">Requires Approval</Badge>
              )}
            </Card>
          ))}
        </SimpleGrid>
        {filteredItems.length === 0 && !isLoading && (
          <Text c="dimmed" ta="center" py="xl">No items found</Text>
        )}
      </Box>
    </Stack>
  );
}
