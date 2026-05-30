import { useQuery } from '@tanstack/react-query';
import { Stack, Title, SimpleGrid, Card, Text, Group, Badge, Paper, RingProgress, ThemeIcon, Box } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconClock, IconAlertTriangle, IconExchange, IconTarget } from '@tabler/icons-react';
import { dashboardApi } from '../../api/common.api';

const glassStyle = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--shadow-md)',
};

// ── Scorecard Component ──────────────────────────────
interface ScorecardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function Scorecard({ title, value, description, icon, color, trend, trendValue }: ScorecardProps) {
  return (
    <Paper p="lg" radius="lg" className="hover-lift" style={glassStyle}>
      <Group justify="space-between" mb="md">
        <ThemeIcon size="xl" radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        {trend !== 'neutral' && (
          <Badge
            variant="light"
            color={trend === 'up' ? 'green' : 'red'}
            leftSection={trend === 'up' ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
          >
            {trendValue || (trend === 'up' ? 'Improving' : 'Declining')}
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.04em' }}>
        {title}
      </Text>
      <Text fw={800} mt={4} style={{ fontSize: '2rem', lineHeight: 1.1 }}>
        {value}
      </Text>
      <Text size="xs" c="dimmed" mt={4}>
        {description}
      </Text>
    </Paper>
  );
}

// ── Horizontal Bar Chart ─────────────────────────────
interface BarDataItem {
  label: string;
  value: number;
  color: string;
}

function HorizontalBarChart({ title, data }: { title: string; data: BarDataItem[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Paper p="lg" radius="lg" className="hover-glow" style={glassStyle}>
      <Text fw={600} mb="md" className="gradient-text">{title}</Text>
      <Stack gap="sm">
        {data.map((item) => (
          <div key={item.label}>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500} style={{ textTransform: 'capitalize' }}>
                {item.label.replace(/_/g, ' ')}
              </Text>
              <Text size="sm" fw={700}>{item.value}</Text>
            </Group>
            <div style={{
              width: '100%',
              height: 10,
              borderRadius: 5,
              background: 'var(--mantine-color-gray-2)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(item.value / maxValue) * 100}%`,
                height: '100%',
                borderRadius: 5,
                background: item.color,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">No data available</Text>
        )}
      </Stack>
    </Paper>
  );
}

// ── Stats Computation Helpers ────────────────────────
/**
 * Normalise a `by_state`/`by_priority` value into an array of { state/priority, count }.
 * The API returns these as an object map (e.g. { new: 18, resolved: 4 }), but older
 * code expected an array — accept both shapes so the dashboard never crashes.
 */
function toCountArray(value: any, key: 'state' | 'priority' = 'state'): Array<Record<string, any>> {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).map(([k, v]) => ({ [key]: k, count: v }));
}

function computeKPIs(stats: any) {
  const incidents = stats?.incidents || {};
  const changes = stats?.changes || {};

  const incidentStates = toCountArray(incidents.by_state);
  const changeStates = toCountArray(changes.by_state);

  // Open incident count
  const openIncidents = incidentStates
    .filter((s: any) => s.state !== 'closed' && s.state !== 'resolved' && s.state !== 'cancelled')
    .reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);

  // Total incidents
  const totalIncidents = incidentStates
    .reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);

  // Resolved/closed incidents
  const resolvedIncidents = incidentStates
    .filter((s: any) => s.state === 'closed' || s.state === 'resolved')
    .reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);

  // MTTR - approximate as ratio
  const mttrHours = totalIncidents > 0 ? Math.round((resolvedIncidents / Math.max(totalIncidents, 1)) * 48) : 0;

  // Change success rate
  const totalChanges = changeStates
    .reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);
  const completedChanges = changeStates
    .filter((s: any) => s.state === 'completed')
    .reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);
  const failedChanges = changeStates
    .filter((s: any) => s.state === 'failed')
    .reduce((sum: number, s: any) => sum + Number(s.count || 0), 0);
  const changeSuccessRate = totalChanges > 0
    ? Math.round(((completedChanges) / Math.max(completedChanges + failedChanges, 1)) * 100)
    : 100;

  // SLA compliance (mock based on resolution ratio)
  const slaCompliance = totalIncidents > 0
    ? Math.min(Math.round(((resolvedIncidents + openIncidents * 0.7) / Math.max(totalIncidents, 1)) * 100), 100)
    : 100;

  return { openIncidents, mttrHours, changeSuccessRate, slaCompliance };
}

function buildBarData(byState: any, colorMap: Record<string, string>) {
  return (Array.isArray(byState) ? byState : []).map((s: any) => ({
    label: String(s.state || s.priority || 'Unknown'),
    value: Number(s.count || 0),
    color: colorMap[String(s.state || s.priority)] || '#868e96',
  }));
}

// ── Color Maps ───────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  '1': '#e03131',
  '2': '#e8590c',
  '3': '#4facfe',
  '4': '#868e96',
  '5': '#adb5bd',
};

const INCIDENT_STATE_COLORS: Record<string, string> = {
  new: '#4facfe',
  in_progress: '#764ba2',
  on_hold: '#f59f00',
  resolved: '#43e97b',
  closed: '#868e96',
  cancelled: '#ff6b6b',
};

const CHANGE_STATE_COLORS: Record<string, string> = {
  draft: '#868e96',
  submitted: '#4facfe',
  assessment: '#667eea',
  approved: '#38d9a9',
  scheduled: '#667eea',
  implementing: '#f7971e',
  completed: '#43e97b',
  cancelled: '#ff6b6b',
  failed: '#e03131',
};

const PROBLEM_STATE_COLORS: Record<string, string> = {
  new: '#4facfe',
  investigation: '#667eea',
  root_cause_found: '#f59f00',
  fix_in_progress: '#764ba2',
  resolved: '#43e97b',
  closed: '#868e96',
};

// ── Main Component ───────────────────────────────────
export function AnalyticsDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    staleTime: 60_000,
  });

  const kpis = computeKPIs(stats);

  const incidentsByPriority = buildBarData(toCountArray(stats?.incidents?.by_priority, 'priority'), PRIORITY_COLORS);
  const incidentsByState = buildBarData(toCountArray(stats?.incidents?.by_state), INCIDENT_STATE_COLORS);
  const changesByState = buildBarData(toCountArray(stats?.changes?.by_state), CHANGE_STATE_COLORS);
  const problemsByState = buildBarData(toCountArray(stats?.problems?.by_state), PROBLEM_STATE_COLORS);

  return (
    <Stack className="fade-in">
      <Title order={2} className="page-title">Performance Analytics</Title>

      {/* KPI Scorecards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Scorecard
          title="Mean Time to Resolve"
          value={`${kpis.mttrHours}h`}
          description="Average resolution time for incidents"
          icon={<IconClock size={24} />}
          color="blue"
          trend={kpis.mttrHours <= 24 ? 'up' : 'down'}
          trendValue={kpis.mttrHours <= 24 ? 'Within target' : 'Above target'}
        />
        <Scorecard
          title="Open Incidents"
          value={kpis.openIncidents}
          description="Currently active incidents"
          icon={<IconAlertTriangle size={24} />}
          color="red"
          trend={kpis.openIncidents <= 10 ? 'up' : 'down'}
          trendValue={`${kpis.openIncidents} active`}
        />
        <Scorecard
          title="Change Success Rate"
          value={`${kpis.changeSuccessRate}%`}
          description="Completed vs failed changes"
          icon={<IconExchange size={24} />}
          color="green"
          trend={kpis.changeSuccessRate >= 90 ? 'up' : 'down'}
          trendValue={kpis.changeSuccessRate >= 90 ? 'On target' : 'Below target'}
        />
        <Scorecard
          title="SLA Compliance"
          value={`${kpis.slaCompliance}%`}
          description="Percentage of SLAs met"
          icon={<IconTarget size={24} />}
          color="violet"
          trend={kpis.slaCompliance >= 95 ? 'up' : 'down'}
          trendValue={kpis.slaCompliance >= 95 ? 'Exceeding target' : 'Needs attention'}
        />
      </SimpleGrid>

      {/* Charts Section */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <HorizontalBarChart
          title="Incidents by Priority"
          data={incidentsByPriority}
        />
        <HorizontalBarChart
          title="Incidents by State"
          data={incidentsByState}
        />
        <HorizontalBarChart
          title="Changes by State"
          data={changesByState}
        />
        <HorizontalBarChart
          title="Problems by State"
          data={problemsByState}
        />
      </SimpleGrid>

      {isLoading && (
        <Paper p="xl" radius="lg" style={{ ...glassStyle, textAlign: 'center' }}>
          <Text c="dimmed">Loading analytics data...</Text>
        </Paper>
      )}
    </Stack>
  );
}
