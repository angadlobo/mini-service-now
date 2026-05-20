import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Paper, Badge, Text, Grid, SimpleGrid, Box, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendarEvent } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { changesApi } from '../../api/changes.api';
import dayjs from 'dayjs';

interface CalendarChange {
  id: string;
  number: string;
  title: string;
  type: 'normal' | 'standard' | 'emergency';
  startDate: string;
  endDate: string;
  state: string;
}

interface MaintenanceWindow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface BlackoutWindow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface CalendarData {
  changes: CalendarChange[];
  maintenanceWindows: MaintenanceWindow[];
  blackoutWindows: BlackoutWindow[];
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getChangeColor(type: string): string {
  switch (type) {
    case 'emergency': return '#e03131';
    case 'standard': return '#2f9e44';
    default: return '#1971c2';
  }
}

function hasConflict(
  change: CalendarChange,
  blackoutWindows: BlackoutWindow[]
): boolean {
  return blackoutWindows.some((bw) => {
    const changeStart = dayjs(change.startDate);
    const changeEnd = dayjs(change.endDate);
    const bwStart = dayjs(bw.startDate);
    const bwEnd = dayjs(bw.endDate);
    return changeStart.isBefore(bwEnd) && changeEnd.isAfter(bwStart);
  });
}

export function ChangeCalendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

  const startDate = currentMonth.startOf('week').format('YYYY-MM-DD');
  const endDate = currentMonth.endOf('month').endOf('week').format('YYYY-MM-DD');

  const { data } = useQuery<CalendarData>({
    queryKey: ['change-calendar', startDate, endDate],
    queryFn: () => changesApi.getCalendar(startDate, endDate),
  });

  const changes = data?.changes ?? [];
  const maintenanceWindows = data?.maintenanceWindows ?? [];
  const blackoutWindows = data?.blackoutWindows ?? [];

  const prevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const nextMonth = () => setCurrentMonth((m) => m.add(1, 'month'));
  const goToday = () => setCurrentMonth(dayjs().startOf('month'));

  // Build calendar grid days
  const calendarStart = currentMonth.startOf('week');
  const calendarEnd = currentMonth.endOf('month').endOf('week');
  const totalDays = calendarEnd.diff(calendarStart, 'day') + 1;
  const days: dayjs.Dayjs[] = [];
  for (let i = 0; i < totalDays; i++) {
    days.push(calendarStart.add(i, 'day'));
  }

  function getItemsForDay(day: dayjs.Dayjs) {
    const dayStart = day.startOf('day');
    const dayEnd = day.endOf('day');

    const dayChanges = changes.filter((c) => {
      const s = dayjs(c.startDate);
      const e = dayjs(c.endDate);
      return s.isBefore(dayEnd) && e.isAfter(dayStart);
    });

    const dayMaintenance = maintenanceWindows.filter((mw) => {
      const s = dayjs(mw.startDate);
      const e = dayjs(mw.endDate);
      return s.isBefore(dayEnd) && e.isAfter(dayStart);
    });

    const dayBlackouts = blackoutWindows.filter((bw) => {
      const s = dayjs(bw.startDate);
      const e = dayjs(bw.endDate);
      return s.isBefore(dayEnd) && e.isAfter(dayStart);
    });

    return { dayChanges, dayMaintenance, dayBlackouts };
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="sm">
          <IconCalendarEvent size={28} />
          <Title order={2}>Change Calendar</Title>
        </Group>
        <Group gap="xs">
          <Button variant="subtle" size="xs" onClick={prevMonth}>
            <IconChevronLeft size={16} />
          </Button>
          <Button variant="light" size="xs" onClick={goToday}>
            Today
          </Button>
          <Text fw={600} size="lg" miw={180} ta="center">
            {currentMonth.format('MMMM YYYY')}
          </Text>
          <Button variant="subtle" size="xs" onClick={nextMonth}>
            <IconChevronRight size={16} />
          </Button>
        </Group>
      </Group>

      {/* Legend */}
      <Paper p="xs" withBorder>
        <Group gap="lg">
          <Group gap={4}>
            <Box w={14} h={14} style={{ backgroundColor: '#1971c2', borderRadius: 2 }} />
            <Text size="xs">Normal Change</Text>
          </Group>
          <Group gap={4}>
            <Box w={14} h={14} style={{ backgroundColor: '#2f9e44', borderRadius: 2 }} />
            <Text size="xs">Standard Change</Text>
          </Group>
          <Group gap={4}>
            <Box w={14} h={14} style={{ backgroundColor: '#e03131', borderRadius: 2 }} />
            <Text size="xs">Emergency Change</Text>
          </Group>
          <Group gap={4}>
            <Box
              w={14}
              h={14}
              style={{
                backgroundColor: '#d8f5e3',
                border: '2px dashed #2f9e44',
                borderRadius: 2,
              }}
            />
            <Text size="xs">Maintenance Window</Text>
          </Group>
          <Group gap={4}>
            <Box
              w={14}
              h={14}
              style={{
                backgroundColor: '#ffe3e3',
                border: '2px solid #e03131',
                borderRadius: 2,
              }}
            />
            <Text size="xs">Blackout Window</Text>
          </Group>
          <Group gap={4}>
            <Box
              w={14}
              h={14}
              style={{
                backgroundColor: '#fff3bf',
                border: '2px solid #e8590c',
                borderRadius: 2,
              }}
            />
            <Text size="xs">Conflict</Text>
          </Group>
        </Group>
      </Paper>

      {/* Calendar Grid */}
      <Paper withBorder p={0} style={{ overflow: 'hidden' }}>
        {/* Day headers */}
        <SimpleGrid cols={7} spacing={0}>
          {DAYS_OF_WEEK.map((d) => (
            <Box
              key={d}
              py={6}
              style={{
                textAlign: 'center',
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                backgroundColor: 'var(--mantine-color-gray-0)',
              }}
            >
              <Text size="sm" fw={600}>
                {d}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* Day cells */}
        <SimpleGrid cols={7} spacing={0}>
          {days.map((day) => {
            const isCurrentMonth = day.month() === currentMonth.month();
            const isToday = day.isSame(dayjs(), 'day');
            const { dayChanges, dayMaintenance, dayBlackouts } = getItemsForDay(day);

            return (
              <Box
                key={day.format('YYYY-MM-DD')}
                p={4}
                mih={100}
                style={{
                  borderRight: '1px solid var(--mantine-color-gray-2)',
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                  backgroundColor: isToday
                    ? 'var(--mantine-color-blue-0)'
                    : !isCurrentMonth
                    ? 'var(--mantine-color-gray-0)'
                    : undefined,
                  opacity: isCurrentMonth ? 1 : 0.5,
                }}
              >
                <Text
                  size="xs"
                  fw={isToday ? 700 : 400}
                  c={isToday ? 'blue' : undefined}
                  mb={2}
                >
                  {day.date()}
                </Text>

                {/* Blackout windows */}
                {dayBlackouts.map((bw) => (
                  <Tooltip key={bw.id} label={`Blackout: ${bw.name}`} withArrow>
                    <Box
                      mb={2}
                      px={4}
                      py={1}
                      style={{
                        backgroundColor: '#ffe3e3',
                        border: '1px solid #e03131',
                        borderRadius: 3,
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Text size="xs" c="red.8" truncate>
                        {bw.name}
                      </Text>
                    </Box>
                  </Tooltip>
                ))}

                {/* Maintenance windows */}
                {dayMaintenance.map((mw) => (
                  <Tooltip key={mw.id} label={`Maintenance: ${mw.name}`} withArrow>
                    <Box
                      mb={2}
                      px={4}
                      py={1}
                      style={{
                        backgroundColor: '#d8f5e3',
                        border: '1px dashed #2f9e44',
                        borderRadius: 3,
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Text size="xs" c="green.8" truncate>
                        {mw.name}
                      </Text>
                    </Box>
                  </Tooltip>
                ))}

                {/* Changes */}
                {dayChanges.map((change) => {
                  const conflict = hasConflict(change, blackoutWindows);
                  return (
                    <Tooltip
                      key={change.id}
                      label={
                        conflict
                          ? `CONFLICT: ${change.number} - ${change.title}`
                          : `${change.number} - ${change.title}`
                      }
                      withArrow
                    >
                      <Box
                        mb={2}
                        px={4}
                        py={1}
                        style={{
                          backgroundColor: conflict ? '#fff3bf' : getChangeColor(change.type),
                          border: conflict ? '2px solid #e8590c' : 'none',
                          borderRadius: 3,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        onClick={() => navigate(`/changes/${change.id}`)}
                      >
                        <Text
                          size="xs"
                          c={conflict ? 'orange.9' : 'white'}
                          fw={conflict ? 700 : 400}
                          truncate
                        >
                          {change.number}
                        </Text>
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
