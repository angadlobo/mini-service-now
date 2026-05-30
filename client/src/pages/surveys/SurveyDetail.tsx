import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Group, Button, Paper, Text, Badge, Loader, Tabs,
  Rating, Radio, Textarea, Select, Card, ThemeIcon, Grid, Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconCheck, IconChartBar, IconSend } from '@tabler/icons-react';
import { surveysApi } from '../../api/surveys.api';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = { draft: 'gray', active: 'green', closed: 'red' };

export function SurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<string | null>('questions');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysApi.get(id!),
  });

  const { data: analytics } = useQuery({
    queryKey: ['survey-analytics', id],
    queryFn: () => surveysApi.getAnalytics(id!),
  });

  const submit = useMutation({
    mutationFn: () => surveysApi.submitResponse(id!, { answers: Object.entries(answers).map(([qid, val]) => ({ question_id: qid, answer_value: val })) }),
    onSuccess: () => {
      notifications.show({ title: 'Submitted', message: 'Thank you for your response!', color: 'green' });
      qc.invalidateQueries({ queryKey: ['survey-analytics', id] });
      setAnswers({});
      setTab('analytics');
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  if (isLoading) return <Center py="xl"><Loader /></Center>;
  if (!survey) return <Center py="xl"><Text>Survey not found</Text></Center>;

  const questions = survey.questions || [];
  const canRespond = survey.status === 'active';

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Group gap="xs">
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(-1)}>Back</Button>
          <div>
            <Title order={2}>{survey.number}</Title>
            <Text c="dimmed" size="sm">{survey.title}</Text>
          </div>
        </Group>
        <Badge color={STATUS_COLORS[survey.status]} variant="filled" tt="capitalize">{survey.status}</Badge>
      </Group>

      {survey.description && (
        <Paper p="md" withBorder>
          <Text>{survey.description}</Text>
        </Paper>
      )}

      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="questions" leftSection={<IconCheck size={14} />}>Questions</Tabs.Tab>
          <Tabs.Tab value="analytics" leftSection={<IconChartBar size={14} />}>Results ({analytics?.response_count || 0})</Tabs.Tab>
        </Tabs.List>

        {/* Questions Tab */}
        <Tabs.Panel value="questions" pt="md">
          {!canRespond && <Paper p="md" withBorder mb="md"><Text c="dimmed">This survey is not active. Only active surveys accept responses.</Text></Paper>}

          <Stack gap="md">
            {questions.length === 0 ? (
              <Paper p="xl" withBorder ta="center">
                <Text c="dimmed">No questions yet</Text>
              </Paper>
            ) : (
              questions.map((q: any, i: number) => (
                <Paper key={q.id} p="md" withBorder>
                  <Text fw={500} mb="xs">{i + 1}. {q.question_text}</Text>

                  {/* Rating 1-5 */}
                  {q.type === 'rating_1_5' && (
                    <Rating
                      value={parseInt(answers[q.id] || '0')}
                      onChange={(v) => canRespond && setAnswers({ ...answers, [q.id]: String(v) })}
                    />
                  )}

                  {/* Rating 1-10 */}
                  {q.type === 'rating_1_10' && (
                    <Rating
                      value={parseInt(answers[q.id] || '0')}
                      onChange={(v) => canRespond && setAnswers({ ...answers, [q.id]: String(v) })}
                      count={10}
                    />
                  )}

                  {/* NPS */}
                  {q.type === 'nps' && (
                    <Group gap={4}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <Button
                          key={n}
                          variant={answers[q.id] === String(n) ? 'filled' : 'light'}
                          size="sm"
                          onClick={() => setAnswers({ ...answers, [q.id]: String(n) })}
                          disabled={!canRespond}
                          w={40}
                        >{n}</Button>
                      ))}
                    </Group>
                  )}

                  {/* Yes/No */}
                  {q.type === 'yes_no' && (
                    <Group gap="md">
                      {['yes', 'no'].map((opt) => (
                        <Radio
                          key={opt}
                          label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => canRespond && setAnswers({ ...answers, [q.id]: opt })}
                        />
                      ))}
                    </Group>
                  )}

                  {/* Multiple Choice */}
                  {q.type === 'multiple_choice' && q.options && (
                    <Select
                      data={(JSON.parse(q.options || '[]') as any[]).map((o: any) => ({ value: o.value, label: o.label }))}
                      value={answers[q.id] || null}
                      onChange={(v) => canRespond && v && setAnswers({ ...answers, [q.id]: v })}
                      placeholder="Select an option"
                    />
                  )}

                  {/* Text */}
                  {q.type === 'text' && (
                    <Textarea
                      placeholder="Your response"
                      value={answers[q.id] || ''}
                      onChange={(e) => canRespond && setAnswers({ ...answers, [q.id]: e.currentTarget.value })}
                      minRows={3}
                    />
                  )}
                </Paper>
              ))
            )}

            {canRespond && questions.length > 0 && (
              <Button
                leftSection={<IconSend size={16} />}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
              >
                Submit Response
              </Button>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Results Tab */}
        <Tabs.Panel value="analytics" pt="md">
          {!analytics || analytics.response_count === 0 ? (
            <Paper p="xl" withBorder ta="center">
              <Text c="dimmed">No responses yet</Text>
            </Paper>
          ) : (
            <Stack gap="md">
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <Card withBorder p="md">
                    <Text size="sm" c="dimmed">Total Responses</Text>
                    <Text size="xl" fw={700}>{analytics.response_count}</Text>
                  </Card>
                </Grid.Col>
                {analytics.average_score && (
                  <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card withBorder p="md">
                      <Text size="sm" c="dimmed">Average Score</Text>
                      <Text size="xl" fw={700}>{analytics.average_score.toFixed(1)}/100</Text>
                    </Card>
                  </Grid.Col>
                )}
              </Grid>

              {analytics.questions?.map((q: any) => (
                <Paper key={q.question_id} p="md" withBorder>
                  <Text fw={500} mb="sm">{q.question_text}</Text>
                  <Text size="sm" c="dimmed" mb="md">{q.total_answers} responses</Text>

                  {q.average && <Text>Average: <strong>{q.average.toFixed(1)}</strong></Text>}
                  {q.nps_score !== undefined && (
                    <Stack gap="xs">
                      <Text>NPS Score: <strong>{q.nps_score}</strong></Text>
                      <Text size="sm">Promoters (9-10): {q.nps_promoters} | Passives (7-8): {q.nps_passives} | Detractors (0-6): {q.nps_detractors}</Text>
                    </Stack>
                  )}
                  {q.distribution && (
                    <Stack gap="xs">
                      {Object.entries(q.distribution).map(([key, count]: [string, any]) => (
                        <Group key={key} justify="space-between">
                          <Text size="sm">{key}</Text>
                          <Badge variant="light">{count}</Badge>
                        </Group>
                      ))}
                    </Stack>
                  )}
                  {q.recent_answers && (
                    <Stack gap="xs">
                      <Text size="sm" fw={500}>Recent feedback:</Text>
                      {q.recent_answers.slice(0, 3).map((ans: string, i: number) => (
                        <Text key={i} size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>"{ans}"</Text>
                      ))}
                    </Stack>
                  )}
                </Paper>
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
