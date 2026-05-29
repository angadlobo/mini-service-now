import { useState } from 'react';
import { Stack, Title, Paper, Table, Text, Badge, Switch, Group, ThemeIcon, ActionIcon, Tooltip } from '@mantine/core';
import { IconClock, IconRefresh, IconPlayerPlay, IconCalendarTime } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

const glassStyle = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--shadow-md)',
};

interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleDisplay: string;
  lastRun: string;
  nextRun: string;
  status: 'active' | 'disabled' | 'running' | 'error';
  enabled: boolean;
  duration: string;
  category: string;
}

function generateMockJobs(): ScheduledJob[] {
  const now = dayjs();
  return [
    {
      id: '1',
      name: 'SLA Breach Check',
      description: 'Checks all active SLA instances for approaching or actual breaches and sends notifications',
      schedule: '*/5 * * * *',
      scheduleDisplay: 'Every 5 minutes',
      lastRun: now.subtract(3, 'minutes').toISOString(),
      nextRun: now.add(2, 'minutes').toISOString(),
      status: 'active',
      enabled: true,
      duration: '1.2s',
      category: 'SLA',
    },
    {
      id: '2',
      name: 'Report Scheduler',
      description: 'Generates and distributes scheduled reports to configured recipients',
      schedule: '0 * * * *',
      scheduleDisplay: 'Every hour',
      lastRun: now.subtract(32, 'minutes').toISOString(),
      nextRun: now.add(28, 'minutes').toISOString(),
      status: 'active',
      enabled: true,
      duration: '4.8s',
      category: 'Reporting',
    },
    {
      id: '3',
      name: 'Email Polling',
      description: 'Polls configured email accounts for new messages and processes them into records',
      schedule: '*/5 * * * *',
      scheduleDisplay: 'Every 5 minutes',
      lastRun: now.subtract(4, 'minutes').toISOString(),
      nextRun: now.add(1, 'minutes').toISOString(),
      status: 'active',
      enabled: true,
      duration: '2.1s',
      category: 'Email',
    },
    {
      id: '4',
      name: 'Event Correlation',
      description: 'Correlates incoming events with existing incidents and configuration items',
      schedule: '* * * * *',
      scheduleDisplay: 'Every minute',
      lastRun: now.subtract(25, 'seconds').toISOString(),
      nextRun: now.add(35, 'seconds').toISOString(),
      status: 'active',
      enabled: true,
      duration: '0.8s',
      category: 'Events',
    },
    {
      id: '5',
      name: 'License Compliance Check',
      description: 'Verifies software license compliance across all managed assets',
      schedule: '0 2 * * *',
      scheduleDisplay: 'Daily at 2:00 AM',
      lastRun: now.subtract(1, 'day').hour(2).minute(0).toISOString(),
      nextRun: now.add(1, 'day').hour(2).minute(0).toISOString(),
      status: 'active',
      enabled: true,
      duration: '12.3s',
      category: 'Assets',
    },
    {
      id: '6',
      name: 'CMDB Health Check',
      description: 'Validates CMDB data integrity and identifies stale or orphaned configuration items',
      schedule: '0 3 * * *',
      scheduleDisplay: 'Daily at 3:00 AM',
      lastRun: now.subtract(1, 'day').hour(3).minute(0).toISOString(),
      nextRun: now.add(1, 'day').hour(3).minute(0).toISOString(),
      status: 'active',
      enabled: true,
      duration: '8.5s',
      category: 'CMDB',
    },
    {
      id: '7',
      name: 'Workflow Cleanup',
      description: 'Archives completed workflow executions older than 90 days',
      schedule: '0 4 * * 0',
      scheduleDisplay: 'Weekly on Sunday at 4:00 AM',
      lastRun: now.subtract(3, 'days').hour(4).minute(0).toISOString(),
      nextRun: now.add(4, 'days').hour(4).minute(0).toISOString(),
      status: 'active',
      enabled: true,
      duration: '3.2s',
      category: 'System',
    },
    {
      id: '8',
      name: 'Notification Digest',
      description: 'Sends daily digest of unread notifications to users who opted in',
      schedule: '0 8 * * 1-5',
      scheduleDisplay: 'Weekdays at 8:00 AM',
      lastRun: now.subtract(1, 'day').hour(8).minute(0).toISOString(),
      nextRun: now.add(1, 'day').hour(8).minute(0).toISOString(),
      status: 'disabled',
      enabled: false,
      duration: '5.6s',
      category: 'Notifications',
    },
    {
      id: '9',
      name: 'Knowledge Base Indexer',
      description: 'Re-indexes knowledge base articles for full-text search optimization',
      schedule: '0 1 * * *',
      scheduleDisplay: 'Daily at 1:00 AM',
      lastRun: now.subtract(1, 'day').hour(1).minute(0).toISOString(),
      nextRun: now.add(1, 'day').hour(1).minute(0).toISOString(),
      status: 'active',
      enabled: true,
      duration: '7.1s',
      category: 'Knowledge',
    },
    {
      id: '10',
      name: 'Session Cleanup',
      description: 'Removes expired user sessions and refresh tokens from the database',
      schedule: '0 */6 * * *',
      scheduleDisplay: 'Every 6 hours',
      lastRun: now.subtract(2, 'hours').toISOString(),
      nextRun: now.add(4, 'hours').toISOString(),
      status: 'active',
      enabled: true,
      duration: '0.4s',
      category: 'System',
    },
  ];
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  disabled: 'gray',
  running: 'blue',
  error: 'red',
};

const CATEGORY_COLORS: Record<string, string> = {
  SLA: 'violet',
  Reporting: 'blue',
  Email: 'cyan',
  Events: 'orange',
  Assets: 'teal',
  CMDB: 'indigo',
  System: 'gray',
  Notifications: 'yellow',
  Knowledge: 'green',
};

export function ScheduledJobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>(generateMockJobs);

  const toggleJob = (jobId: string) => {
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const enabled = !job.enabled;
        notifications.show({
          title: enabled ? 'Job Enabled' : 'Job Disabled',
          message: `${job.name} has been ${enabled ? 'enabled' : 'disabled'}`,
          color: enabled ? 'green' : 'yellow',
        });
        return { ...job, enabled, status: enabled ? 'active' : 'disabled' };
      }
      return job;
    }));
  };

  const runNow = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      notifications.show({
        title: 'Job Triggered',
        message: `${job.name} has been triggered for immediate execution`,
        color: 'blue',
      });
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? { ...j, status: 'running' as const, lastRun: new Date().toISOString() }
          : j
      ));
      // Simulate job completion
      setTimeout(() => {
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: j.enabled ? 'active' as const : 'disabled' as const } : j
        ));
      }, 2000);
    }
  };

  const activeCount = jobs.filter(j => j.enabled).length;
  const disabledCount = jobs.filter(j => !j.enabled).length;

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Scheduled Jobs</Title>
        <Group gap="sm">
          <Badge variant="filled" color="green" size="lg">{activeCount} Active</Badge>
          <Badge variant="filled" color="gray" size="lg">{disabledCount} Disabled</Badge>
        </Group>
      </Group>

      <Paper p="lg" radius="lg" style={glassStyle}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Job Name</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Schedule</Table.Th>
              <Table.Th>Last Run</Table.Th>
              <Table.Th>Next Run</Table.Th>
              <Table.Th>Duration</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Enabled</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {jobs.map((job) => (
              <Table.Tr key={job.id} style={{ opacity: job.enabled ? 1 : 0.6 }}>
                <Table.Td>
                  <div>
                    <Text size="sm" fw={600}>{job.name}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{job.description}</Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={CATEGORY_COLORS[job.category] || 'gray'}>
                    {job.category}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <IconCalendarTime size={14} style={{ opacity: 0.5 }} />
                    <Text size="sm">{job.scheduleDisplay}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" ff="monospace">{job.schedule}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{dayjs(job.lastRun).fromNow()}</Text>
                  <Text size="xs" c="dimmed">{dayjs(job.lastRun).format('MMM D, h:mm A')}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{dayjs(job.nextRun).fromNow()}</Text>
                  <Text size="xs" c="dimmed">{dayjs(job.nextRun).format('MMM D, h:mm A')}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">{job.duration}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    size="sm"
                    variant="filled"
                    color={STATUS_COLORS[job.status] || 'gray'}
                  >
                    {job.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Switch
                    checked={job.enabled}
                    onChange={() => toggleJob(job.id)}
                    size="sm"
                  />
                </Table.Td>
                <Table.Td>
                  <Tooltip label="Run now">
                    <ActionIcon
                      variant="light"
                      size="sm"
                      onClick={() => runNow(job.id)}
                      disabled={!job.enabled || job.status === 'running'}
                      loading={job.status === 'running'}
                    >
                      <IconPlayerPlay size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
