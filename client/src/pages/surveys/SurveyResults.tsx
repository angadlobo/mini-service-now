import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Stack, Title, Group, Button, Paper, Text, Badge, LoadingOverlay,
  Progress, Card, SimpleGrid, Table, Box,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { surveysApi } from '../../api/surveys.api';
import { Pagination } from '../../components/common/Pagination';
import dayjs from 'dayjs';

function getRatingColor(value: number, max: number): string {
  const ratio = value / max;
  if (ratio >= 0.8) return 'green';
  if (ratio >= 0.6) return 'teal';
  if (ratio >= 0.4) return 'yellow';
  if (ratio >= 0.2) return 'orange';
  return 'red';
}

function getNpsColor(score: number): string {
  if (score >= 50) return 'green';
  if (score >= 0) return 'yellow';
  return 'red';
}

export function SurveyResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysApi.get(id!),
    enabled: !!id,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['survey-analytics', id],
    queryFn: () => surveysApi.getAnalytics(id!),
    enabled: !!id,
  });

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['survey-responses', id, page, pageSize],
    queryFn: () => surveysApi.getResponses(id!, { page, pageSize }),
    enabled: !!id,
  });

  const isLoading = surveyLoading || analyticsLoading;
  const questionStats = analytics?.questionStats || analytics?.questions || [];
  const responseCount = analytics?.responseCount ?? analytics?.totalResponses ?? 0;

  return (
    <Stack className="fade-in">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(`/surveys/${id}`)}>
          Back to Survey
        </Button>
        <Title order={2}>{survey?.title || 'Survey Results'}</Title>
        {survey && (
          <Badge variant="filled" color={survey.status === 'active' ? 'green' : survey.status === 'closed' ? 'red' : 'gray'}>
            {survey.status}
          </Badge>
        )}
      </Group>

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={isLoading} />

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
          <Card withBorder padding="lg" radius="md">
            <Text c="dimmed" size="sm" fw={500}>Total Responses</Text>
            <Text fw={700} size="xl" mt={4}>{responseCount}</Text>
          </Card>
          <Card withBorder padding="lg" radius="md">
            <Text c="dimmed" size="sm" fw={500}>Survey Type</Text>
            <Text fw={700} size="xl" mt={4} tt="capitalize">{survey?.type || '-'}</Text>
          </Card>
          <Card withBorder padding="lg" radius="md">
            <Text c="dimmed" size="sm" fw={500}>Status</Text>
            <Text fw={700} size="xl" mt={4} tt="capitalize">{survey?.status || '-'}</Text>
          </Card>
        </SimpleGrid>

        {/* Per-Question Stats */}
        {questionStats.length > 0 && (
          <Paper withBorder p="md" mb="lg">
            <Title order={4} mb="md">Question Analysis</Title>
            <Stack gap="lg">
              {questionStats.map((q: any, index: number) => (
                <Card key={q.question_id || index} withBorder padding="md" radius="md">
                  <Group mb="xs" gap="sm">
                    <Text size="sm" c="dimmed">{index + 1}.</Text>
                    <Text size="sm" fw={600} style={{ flex: 1 }}>{q.question_text}</Text>
                    <Badge variant="light" size="xs">{q.type}</Badge>
                  </Group>

                  {/* Rating questions */}
                  {(q.type === 'rating_1_5' || q.type === 'rating_1_10') && (
                    <Group gap="md" align="center">
                      <Text size="xl" fw={700}>{q.average != null ? Number(q.average).toFixed(1) : '-'}</Text>
                      <Text size="sm" c="dimmed">/ {q.type === 'rating_1_5' ? '5' : '10'}</Text>
                      <Progress
                        value={q.average != null ? (q.average / (q.type === 'rating_1_5' ? 5 : 10)) * 100 : 0}
                        size="lg"
                        radius="xl"
                        color={q.average != null ? getRatingColor(q.average, q.type === 'rating_1_5' ? 5 : 10) : 'gray'}
                        style={{ flex: 1 }}
                      />
                      <Text size="xs" c="dimmed">{q.response_count || 0} responses</Text>
                    </Group>
                  )}

                  {/* Yes/No questions */}
                  {q.type === 'yes_no' && (
                    <Group gap="md" align="center">
                      <Text size="xl" fw={700} c="green">{q.yes_percent != null ? `${Number(q.yes_percent).toFixed(0)}%` : '-'}</Text>
                      <Text size="sm" c="dimmed">Yes</Text>
                      <Progress
                        value={q.yes_percent || 0}
                        size="lg"
                        radius="xl"
                        color="green"
                        style={{ flex: 1 }}
                      />
                      <Text size="xs" c="dimmed">{q.response_count || 0} responses</Text>
                    </Group>
                  )}

                  {/* NPS */}
                  {q.type === 'nps' && (
                    <Group gap="md" align="center">
                      <Text size="xl" fw={700} c={getNpsColor(q.nps_score || 0)}>{q.nps_score != null ? q.nps_score : '-'}</Text>
                      <Text size="sm" c="dimmed">NPS Score</Text>
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Badge size="xs" color="green">Promoters: {q.promoters || 0}</Badge>
                          <Badge size="xs" color="yellow">Passives: {q.passives || 0}</Badge>
                          <Badge size="xs" color="red">Detractors: {q.detractors || 0}</Badge>
                        </Group>
                      </Stack>
                      <Text size="xs" c="dimmed">{q.response_count || 0} responses</Text>
                    </Group>
                  )}

                  {/* Multiple choice */}
                  {q.type === 'multiple_choice' && (
                    <Stack gap="xs">
                      {(q.option_counts || []).map((opt: any) => (
                        <Group key={opt.option} gap="sm" align="center">
                          <Text size="sm" w={120} truncate>{opt.option}</Text>
                          <Progress
                            value={q.response_count ? (opt.count / q.response_count) * 100 : 0}
                            size="md"
                            radius="xl"
                            color="blue"
                            style={{ flex: 1 }}
                          />
                          <Text size="xs" c="dimmed" w={40} ta="right">{opt.count}</Text>
                        </Group>
                      ))}
                    </Stack>
                  )}

                  {/* Text responses */}
                  {q.type === 'text' && (
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">{q.response_count || 0} responses</Text>
                      {(q.sample_responses || q.responses || []).slice(0, 5).map((resp: any, ri: number) => (
                        <Paper key={ri} p="xs" bg="gray.0" radius="sm">
                          <Text size="sm">{typeof resp === 'string' ? resp : resp.value || resp.text || '-'}</Text>
                        </Paper>
                      ))}
                      {(q.sample_responses || q.responses || []).length > 5 && (
                        <Text size="xs" c="dimmed" ta="center">
                          ... and {(q.response_count || 0) - 5} more responses
                        </Text>
                      )}
                    </Stack>
                  )}
                </Card>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Response List */}
        <Paper withBorder p="md" pos="relative">
          <LoadingOverlay visible={responsesLoading} />
          <Title order={4} mb="md">Individual Responses</Title>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Respondent</Table.Th>
                <Table.Th>Submitted</Table.Th>
                <Table.Th>Overall Score</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(responses?.data || []).map((resp: any) => (
                <Table.Tr key={resp.id}>
                  <Table.Td>
                    <Text size="sm">{resp.respondent_name || resp.user_name || (survey?.anonymous ? 'Anonymous' : '-')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{resp.submitted_at ? dayjs(resp.submitted_at).format('MMM D, YYYY HH:mm') : '-'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>{resp.overall_score != null ? resp.overall_score : '-'}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              {(!responses?.data || responses.data.length === 0) && !responsesLoading && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" ta="center" py="md">No responses yet</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          {responses && responses.totalPages > 0 && (
            <Pagination
              page={responses.page}
              totalPages={responses.totalPages}
              pageSize={responses.pageSize}
              total={responses.total}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          )}
        </Paper>
      </Box>
    </Stack>
  );
}
