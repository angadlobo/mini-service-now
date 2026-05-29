import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Paper, Text, Group, SimpleGrid, ThemeIcon, Box, Progress, Grid, LoadingOverlay } from '@mantine/core';
import { IconCurrencyDollar, IconChartBar, IconBuildingBank, IconTrendingUp } from '@tabler/icons-react';
import { chargebackApi, costCentersApi } from '../../api/cost-management.api';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  color?: string;
}

function StatCard({ icon, label, value, description, color = 'blue' }: StatCardProps) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Group>
        <ThemeIcon size="lg" radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <div style={{ flex: 1 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text size="xl" fw={700}>
            {value}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </div>
      </Group>
    </Paper>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const CATEGORY_COLORS: Record<string, string> = {
  hardware: 'blue',
  software: 'violet',
  licensing: 'grape',
  cloud: 'cyan',
  personnel: 'teal',
  consulting: 'orange',
  maintenance: 'yellow',
  other: 'gray',
};

export function CostDashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['cost-summary'],
    queryFn: () => chargebackApi.getSummary(),
  });

  const { data: costCenters } = useQuery({
    queryKey: ['cost-centers-dashboard'],
    queryFn: () => costCentersApi.list({ pageSize: 100 }),
  });

  if (isLoading) {
    return (
      <Stack p="md">
        <Title order={2}>Cost Management Dashboard</Title>
        <Text c="dimmed">Loading cost data...</Text>
      </Stack>
    );
  }

  const totalSpend = summary?.total_spend || 0;
  const byCategory = summary?.by_category || [];
  const byDepartment = summary?.by_department || [];
  const monthlyTrend = summary?.monthly_trend || [];
  const centers = costCenters?.data || [];

  const maxCategoryAmount = Math.max(...byCategory.map((c: any) => Number(c.total || 0)), 1);
  const maxDeptAmount = Math.max(...byDepartment.map((d: any) => Number(d.total || 0)), 1);
  const maxMonthly = Math.max(...monthlyTrend.map((m: any) => Number(m.total || 0)), 1);

  return (
    <Stack p="md" gap="lg" className="fade-in">
      <Title order={2} className="page-title">Cost Management Dashboard</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <StatCard
          icon={<IconCurrencyDollar size={20} />}
          label="Total Spend"
          value={formatCurrency(totalSpend)}
          description="All cost items"
          color="green"
        />
        <StatCard
          icon={<IconBuildingBank size={20} />}
          label="Cost Centers"
          value={centers.length}
          description="Active cost centers"
          color="blue"
        />
        <StatCard
          icon={<IconChartBar size={20} />}
          label="Categories"
          value={byCategory.length}
          description="Spend categories tracked"
          color="violet"
        />
        <StatCard
          icon={<IconTrendingUp size={20} />}
          label="Monthly Avg"
          value={formatCurrency(monthlyTrend.length > 0 ? totalSpend / monthlyTrend.length : 0)}
          description="Average monthly spend"
          color="orange"
        />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Budget vs Actual by Cost Center</Text>
            <Stack gap="md">
              {centers.length === 0 ? (
                <Text c="dimmed" ta="center" py="lg">No cost centers found</Text>
              ) : (
                centers.map((cc: any) => {
                  const budget = Number(cc.budget_annual || 0);
                  const actual = Number(cc.actual_spend || 0);
                  const pct = budget > 0 ? (actual / budget) * 100 : 0;
                  const overBudget = pct > 100;
                  return (
                    <div key={cc.id}>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={500}>{cc.name}</Text>
                        <Text size="sm" c={overBudget ? 'red' : 'dimmed'}>
                          {formatCurrency(actual)} / {formatCurrency(budget)}
                        </Text>
                      </Group>
                      <Progress
                        value={Math.min(pct, 100)}
                        color={overBudget ? 'red' : pct > 80 ? 'orange' : 'green'}
                        size="lg"
                        radius="sm"
                      />
                    </div>
                  );
                })
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Spend by Category</Text>
            <Stack gap="xs">
              {byCategory.length === 0 ? (
                <Text c="dimmed" ta="center" py="lg">No data available</Text>
              ) : (
                byCategory.map((item: any) => {
                  const amount = Number(item.total || 0);
                  const barWidth = (amount / maxCategoryAmount) * 100;
                  const colorName = CATEGORY_COLORS[item.category] || 'gray';
                  return (
                    <div key={item.category}>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" tt="capitalize">{item.category}</Text>
                        <Text size="sm" fw={500}>{formatCurrency(amount)}</Text>
                      </Group>
                      <Box
                        h={24}
                        style={{
                          borderRadius: 4,
                          backgroundColor: `var(--mantine-color-${colorName}-1)`,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          h="100%"
                          w={`${barWidth}%`}
                          style={{
                            borderRadius: 4,
                            backgroundColor: `var(--mantine-color-${colorName}-6)`,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </div>
                  );
                })
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Spend by Department</Text>
            <Stack gap="xs">
              {byDepartment.length === 0 ? (
                <Text c="dimmed" ta="center" py="lg">No data available</Text>
              ) : (
                byDepartment.map((item: any) => {
                  const amount = Number(item.total || 0);
                  const barWidth = (amount / maxDeptAmount) * 100;
                  return (
                    <div key={item.department}>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm">{item.department || 'Unassigned'}</Text>
                        <Text size="sm" fw={500}>{formatCurrency(amount)}</Text>
                      </Group>
                      <Progress value={barWidth} color="blue" size="lg" radius="sm" />
                    </div>
                  );
                })
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Monthly Spend Trend</Text>
            {monthlyTrend.length === 0 ? (
              <Text c="dimmed" ta="center" py="lg">No data available</Text>
            ) : (
              <Group align="flex-end" gap={4} h={160} wrap="nowrap" style={{ overflowX: 'auto' }}>
                {monthlyTrend.map((item: any) => {
                  const amount = Number(item.total || 0);
                  const height = maxMonthly > 0 ? (amount / maxMonthly) * 140 : 0;
                  const monthLabel = item.month || item.period || '';
                  return (
                    <Stack key={monthLabel} align="center" gap={4} style={{ flex: '1 0 40px', minWidth: 40 }}>
                      <Text size="xs" fw={500}>{formatCurrency(amount)}</Text>
                      <Box
                        w="70%"
                        h={height}
                        style={{
                          borderRadius: '4px 4px 0 0',
                          backgroundColor: 'var(--mantine-color-green-6)',
                          minHeight: 4,
                        }}
                      />
                      <Text size="xs" c="dimmed">{monthLabel.substring(5, 7)}</Text>
                    </Stack>
                  );
                })}
              </Group>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
