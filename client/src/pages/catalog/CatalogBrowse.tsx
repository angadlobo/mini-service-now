import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, SimpleGrid, Card, Text, Group, Badge, Button, SegmentedControl, TextInput, Image, ThemeIcon, Box, LoadingOverlay, Paper } from '@mantine/core';
import { IconSearch, IconShoppingCart } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { catalogApi } from '../../api/catalog.api';
import { settingsApi } from '../../api/common.api';

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

  const { data: catalogSettings } = useQuery({
    queryKey: ['catalog-settings'],
    queryFn: settingsApi.getCatalogSettings,
    staleTime: 5 * 60 * 1000,
  });

  const currencySymbol = catalogSettings?.['catalog.currency_symbol'] ?? '$';
  const currencySuffix = catalogSettings?.['catalog.currency_suffix'] ?? '/mo';

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
        <Title order={2} className="page-title">Service Catalog</Title>
        <Button leftSection={<IconShoppingCart size={16} />} onClick={() => navigate('/catalog/requests')} className="gradient-btn">
          My Requests
        </Button>
      </Group>

      <Paper p="sm" radius="lg" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <Group>
          <TextInput
            placeholder="Search items..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={300}
            radius="md"
          />
          <SegmentedControl data={categoryData} value={selectedCategory} onChange={setSelectedCategory} radius="md" />
        </Group>
      </Paper>

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={isLoading} />
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
          {filteredItems.map((item: any) => (
            <Card key={item.id} padding="lg" radius="lg" className="hover-lift"
              style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => navigate(`/catalog/items/${item.id}`)}
            >
              <Group mb="xs">
                <ThemeIcon variant="light" size="lg" radius="md" color="violet">
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
                  <Text fw={600} size="sm">{currencySymbol}{Number(item.price).toFixed(2)}{currencySuffix}</Text>
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
          <Paper p="xl" radius="lg" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <Text c="dimmed" ta="center" size="lg" fw={500}>No items found</Text>
            <Text c="dimmed" ta="center" size="sm" mt="xs">Try adjusting your search or category filter</Text>
          </Paper>
        )}
      </Box>
    </Stack>
  );
}
