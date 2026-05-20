import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Paper, Text, SimpleGrid, Box, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconRocket } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { releasesApi } from '../../api/releases.api';
import dayjs from 'dayjs';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getReleaseColor(type: string): string {
  switch (type) {
    case 'major': return '#e03131';
    case 'hotfix': return '#e8590c';
    case 'minor': return '#1971c2';
    case 'patch': return '#2f9e44';
    default: return '#868e96';
  }
}

function getStateColor(state: string): string {
  switch (state) {
    case 'in_progress': return '#fd7e14';
    case 'completed': return '#2f9e44';
    case 'rolled_back': return '#e03131';
    default: return '';
  }
}

export function ReleaseCalendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

  const startDate = currentMonth.startOf('week').format('YYYY-MM-DD');
  const endDate = currentMonth.endOf('month').endOf('week').format('YYYY-MM-DD');

  const { data } = useQuery({
    queryKey: ['release-calendar', startDate, endDate],
    queryFn: () => releasesApi.getCalendar(startDate, endDate),
  });

  const releases = data?.releases ?? [];

  const prevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const nextMonth = () => setCurrentMonth((m) => m.add(1, 'month'));
  const goToday = () => setCurrentMonth(dayjs().startOf('month'));

  const calendarStart = currentMonth.startOf('week');
  const calendarEnd = currentMonth.endOf('month').endOf('week');
  const totalDays = calendarEnd.diff(calendarStart, 'day') + 1;
  const days: dayjs.Dayjs[] = [];
  for (let i = 0; i < totalDays; i++) {
    days.push(calendarStart.add(i, 'day'));
  }

  function getReleasesForDay(day: dayjs.Dayjs) {
    const dayStart = day.startOf('day');
    const dayEnd = day.endOf('day');
    return releases.filter((r: any) => {
      const s = dayjs(r.scheduled_start);
      const e = dayjs(r.scheduled_end);
      return s.isBefore(dayEnd) && e.isAfter(dayStart);
    });
  }

  return (
    <Stack gap="md" className="fade-in">
      <Group justify="space-between">
        <Group gap="sm">
          <IconRocket size={28} />
          <Title order={2} className="page-title">Release Calendar</Title>
        </Group>
        <Group gap="xs">
          <Button variant="subtle" size="xs" onClick={prevMonth}><IconChevronLeft size={16} /></Button>
          <Button variant="light" size="xs" onClick={goToday}>Today</Button>
          <Text fw={600} size="lg" miw={180} ta="center">{currentMonth.format('MMMM YYYY')}</Text>
          <Button variant="subtle" size="xs" onClick={nextMonth}><IconChevronRight size={16} /></Button>
        </Group>
      </Group>

      {/* Legend */}
      <Paper p="xs" withBorder className="glass-panel">
        <Group gap="lg">
          <Group gap={4}>
            <Box w={14} h={14} style={{ backgroundColor: '#e03131', borderRadius: 2 }} />
            <Text size="xs">Major</Text>
          </Group>
          <Group gap={4}>
            <Box w={14} h={14} style={{ backgroundColor: '#1971c2', borderRadius: 2 }} />
            <Text size="xs">Minor</Text>
          </Group>
          <Group gap={4}>
            <Box w={14} h={14} style={{ backgroundColor: '#2f9e44', borderRadius: 2 }} />
            <Text size="xs">Patch</Text>
          </Group>
          <Group gap={4}>
            <Box w={14} h={14} style={{ backgroundColor: '#e8590c', borderRadius: 2 }} />
            <Text size="xs">Hotfix</Text>
          </Group>
        </Group>
      </Paper>

      {/* Calendar Grid */}
      <Paper withBorder p={0} className="glass-panel" style={{ overflow: 'hidden' }}>
        <SimpleGrid cols={7} spacing={0}>
          {DAYS_OF_WEEK.map((d) => (
            <Box key={d} py={6} style={{ textAlign: 'center', borderBottom: '1px solid var(--mantine-color-gray-3)', backgroundColor: 'var(--mantine-color-gray-0)' }}>
              <Text size="sm" fw={600}>{d}</Text>
            </Box>
          ))}
        </SimpleGrid>

        <SimpleGrid cols={7} spacing={0}>
          {days.map((day) => {
            const isCurrentMonth = day.month() === currentMonth.month();
            const isToday = day.isSame(dayjs(), 'day');
            const dayReleases = getReleasesForDay(day);

            return (
              <Box
                key={day.format('YYYY-MM-DD')}
                p={4}
                mih={100}
                style={{
                  borderRight: '1px solid var(--mantine-color-gray-2)',
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                  backgroundColor: isToday ? 'var(--mantine-color-blue-0)' : !isCurrentMonth ? 'var(--mantine-color-gray-0)' : undefined,
                  opacity: isCurrentMonth ? 1 : 0.5,
                }}
              >
                <Text size="xs" fw={isToday ? 700 : 400} c={isToday ? 'blue' : undefined} mb={2}>{day.date()}</Text>
                {dayReleases.map((rel: any) => {
                  const stateColor = getStateColor(rel.state);
                  return (
                    <Tooltip key={rel.id} label={`${rel.number} - ${rel.short_description} (${rel.state})`} withArrow>
                      <Box
                        mb={2} px={4} py={1}
                        style={{
                          backgroundColor: getReleaseColor(rel.release_type),
                          borderRadius: 3,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          borderLeft: stateColor ? `3px solid ${stateColor}` : undefined,
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'; }}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        onClick={() => navigate(`/releases/${rel.id}`)}
                      >
                        <Text size="xs" c="white" truncate>{rel.number}</Text>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            );
          })}
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
