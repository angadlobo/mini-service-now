import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Group, Button, Paper, Text, Badge, Loader, Tabs, Rating, Radio, Textarea,
  Select, Card, ThemeIcon, Grid, Center, Modal, TextInput, Switch, ActionIcon,
  Accordion, SimpleGrid, CopyButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft, IconCheck, IconChartBar, IconSend, IconMail, IconEdit, IconTrash,
  IconPlus, IconGripVertical, IconCopy, IconClock,
} from '@tabler/icons-react';
import { surveysApi } from '../../api/surveys.api';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = { draft: 'gray', active: 'green', closed: 'red' };
const QUESTION_TYPES = [
  { value: 'rating_1_5', label: '★ Rating (1-5)' },
  { value: 'rating_1_10', label: '★ Rating (1-10)' },
  { value: 'nps', label: '📊 NPS (0-10)' },
  { value: 'yes_no', label: '✓ Yes/No' },
  { value: 'multiple_choice', label: '✓ Multiple Choice' },
  { value: 'text', label: '✏️ Text Response' },
];

export function SurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<string | null>('questions');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editActiveFrom, setEditActiveFrom] = useState<Date | null>(null);
  const [editActiveUntil, setEditActiveUntil] = useState<Date | null>(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareEmails, setShareEmails] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [addQModal, setAddQModal] = useState(false);
  const [newQ, setNewQ] = useState({ text: '', type: 'rating_1_5', options: '' });
  const [editQModal, setEditQModal] = useState(false);
  const [editQData, setEditQData] = useState<any>(null);

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysApi.get(id!),
  });

  const { data: analytics } = useQuery({
    queryKey: ['survey-analytics', id],
    queryFn: () => surveysApi.getAnalytics(id!),
  });

  const { data: link } = useQuery({
    queryKey: ['survey-link', id],
    queryFn: () => surveysApi.getSurveyLink(id!),
  });

  const submit = useMutation({
    mutationFn: () => surveysApi.submitResponse(id!, {
      answers: Object.entries(answers).map(([qid, val]) => ({ question_id: qid, answer_value: val })),
    }),
    onSuccess: () => {
      notifications.show({ title: 'Submitted', message: 'Thank you for your response!', color: 'green' });
      qc.invalidateQueries({ queryKey: ['survey-analytics', id] });
      setAnswers({});
      setTab('analytics');
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  const updateSurvey = useMutation({
    mutationFn: (data: any) => surveysApi.update(id!, data),
    onSuccess: () => {
      notifications.show({ title: 'Updated', message: 'Survey updated successfully', color: 'green' });
      qc.invalidateQueries({ queryKey: ['survey', id] });
      setEditMode(false);
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  const addQuestion = useMutation({
    mutationFn: () => surveysApi.addQuestion(id!, {
      question_text: newQ.text,
      type: newQ.type,
      options: newQ.type === 'multiple_choice' ? newQ.options.split('\n').filter(Boolean) : null,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Added', message: 'Question added', color: 'green' });
      qc.invalidateQueries({ queryKey: ['survey', id] });
      setNewQ({ text: '', type: 'rating_1_5', options: '' });
      setAddQModal(false);
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  const updateQuestion = useMutation({
    mutationFn: (data: any) => surveysApi.updateQuestion(editQData.id, data),
    onSuccess: () => {
      notifications.show({ title: 'Updated', message: 'Question updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['survey', id] });
      setEditQModal(false);
      setEditQData(null);
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  const deleteQuestion = useMutation({
    mutationFn: (qid: string) => surveysApi.deleteQuestion(qid),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Question deleted', color: 'green' });
      qc.invalidateQueries({ queryKey: ['survey', id] });
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  const shareEmail = useMutation({
    mutationFn: () => surveysApi.shareViaEmail(id!, {
      recipient_emails: shareEmails.split(',').map(e => e.trim()),
      message: shareMessage || undefined,
    }),
    onSuccess: () => {
      notifications.show({ title: 'Sent', message: 'Survey shared via email', color: 'green' });
      setShareEmails('');
      setShareMessage('');
      setShareModal(false);
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });

  if (isLoading) return <Center py="xl"><Loader /></Center>;
  if (!survey) return <Center py="xl"><Text>Survey not found</Text></Center>;

  const questions = survey.questions || [];
  const isActive = survey.is_active && (!survey.active_from || new Date(survey.active_from) <= new Date()) && (!survey.active_until || new Date(survey.active_until) > new Date());

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
        <Group>
          <Badge color={isActive ? 'green' : STATUS_COLORS[survey.status]} variant="filled" tt="capitalize">
            {isActive ? 'Active' : survey.status}
          </Badge>
          <Button size="sm" variant="light" leftSection={<IconEdit size={16} />} onClick={() => {
            setEditTitle(survey.title);
            setEditDesc(survey.description || '');
            setEditActive(survey.is_active);
            setEditActiveFrom(survey.active_from ? new Date(survey.active_from) : null);
            setEditActiveUntil(survey.active_until ? new Date(survey.active_until) : null);
            setEditMode(true);
          }}>Edit</Button>
          <Button size="sm" variant="light" leftSection={<IconMail size={16} />} onClick={() => setShareModal(true)}>Share</Button>
        </Group>
      </Group>

      {survey.description && (
        <Paper p="md" withBorder>
          <Text>{survey.description}</Text>
        </Paper>
      )}

      {survey.active_from || survey.active_until ? (
        <Paper p="md" withBorder>
          <Group gap="md">
            <ThemeIcon variant="light" size="lg"><IconClock size={18} /></ThemeIcon>
            <Stack gap="xs">
              {survey.active_from && <Text size="sm">Starts: <strong>{dayjs(survey.active_from).format('MMM D, YYYY h:mm A')}</strong></Text>}
              {survey.active_until && <Text size="sm">Ends: <strong>{dayjs(survey.active_until).format('MMM D, YYYY h:mm A')}</strong></Text>}
            </Stack>
          </Group>
        </Paper>
      ) : null}

      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="questions" leftSection={<IconCheck size={14} />}>Questions ({questions.length})</Tabs.Tab>
          <Tabs.Tab value="analytics" leftSection={<IconChartBar size={14} />}>Results ({analytics?.response_count || 0})</Tabs.Tab>
        </Tabs.List>

        {/* Questions Tab */}
        <Tabs.Panel value="questions" pt="md">
          {!isActive && <Paper p="md" withBorder mb="md"><Text c="dimmed">This survey is not currently active.</Text></Paper>}

          <Group mb="md">
            <Button leftSection={<IconPlus size={16} />} onClick={() => setAddQModal(true)}>Add Question</Button>
          </Group>

          <Stack gap="md">
            {questions.length === 0 ? (
              <Paper p="xl" withBorder ta="center">
                <Text c="dimmed">No questions yet. Add one to get started!</Text>
              </Paper>
            ) : (
              questions.map((q: any, i: number) => (
                <Paper key={q.id} p="md" withBorder>
                  <Group justify="space-between" mb="md">
                    <Text fw={500}>{i + 1}. {q.question_text}</Text>
                    <Group gap="xs">
                      <ActionIcon size="sm" variant="light" onClick={() => {
                        setEditQData(q);
                        setEditQModal(true);
                      }}><IconEdit size={14} /></ActionIcon>
                      <ActionIcon size="sm" variant="light" color="red" onClick={() => deleteQuestion.mutate(q.id)}><IconTrash size={14} /></ActionIcon>
                    </Group>
                  </Group>

                  {/* Rating 1-5 */}
                  {q.type === 'rating_1_5' && (
                    <Rating
                      value={parseInt(answers[q.id] || '0')}
                      onChange={(v) => isActive && setAnswers({ ...answers, [q.id]: String(v) })}
                    />
                  )}

                  {/* Rating 1-10 */}
                  {q.type === 'rating_1_10' && (
                    <Rating
                      value={parseInt(answers[q.id] || '0')}
                      onChange={(v) => isActive && setAnswers({ ...answers, [q.id]: String(v) })}
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
                          onClick={() => isActive && setAnswers({ ...answers, [q.id]: String(n) })}
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
                          onChange={() => isActive && setAnswers({ ...answers, [q.id]: opt })}
                        />
                      ))}
                    </Group>
                  )}

                  {/* Multiple Choice */}
                  {q.type === 'multiple_choice' && q.options && (
                    <Select
                      data={(JSON.parse(q.options || '[]') as any[]).map((o: any) => ({ value: o.value ?? o, label: o.label ?? o }))}
                      value={answers[q.id] || null}
                      onChange={(v) => isActive && v && setAnswers({ ...answers, [q.id]: v })}
                      placeholder="Select an option"
                    />
                  )}

                  {/* Text */}
                  {q.type === 'text' && (
                    <Textarea
                      placeholder="Your response"
                      value={answers[q.id] || ''}
                      onChange={(e) => isActive && setAnswers({ ...answers, [q.id]: e.currentTarget.value })}
                      minRows={3}
                    />
                  )}
                </Paper>
              ))
            )}

            {isActive && questions.length > 0 && (
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

              <Accordion>
                {analytics.questions?.map((q: any) => (
                  <Accordion.Item key={q.question_id} value={q.question_id}>
                    <Accordion.Control>
                      <Group justify="space-between" w="100%">
                        <Text fw={500}>{q.question_text}</Text>
                        <Badge variant="light">{q.total_answers} responses</Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        {q.average && <Text>Average: <strong>{q.average.toFixed(1)}</strong></Text>}
                        {q.nps_score !== undefined && (
                          <Stack gap="xs">
                            <Text fw={500}>NPS Score: <strong>{q.nps_score}</strong></Text>
                            <SimpleGrid cols={3} spacing="xs">
                              <Card p="sm" withBorder>
                                <Text size="sm" c="green" fw={500}>Promoters</Text>
                                <Text size="xl">{q.nps_promoters}</Text>
                              </Card>
                              <Card p="sm" withBorder>
                                <Text size="sm" c="yellow" fw={500}>Passive</Text>
                                <Text size="xl">{q.nps_passives}</Text>
                              </Card>
                              <Card p="sm" withBorder>
                                <Text size="sm" c="red" fw={500}>Detractors</Text>
                                <Text size="xl">{q.nps_detractors}</Text>
                              </Card>
                            </SimpleGrid>
                          </Stack>
                        )}
                        {q.distribution && (
                          <Stack gap="xs">
                            <Text fw={500}>Distribution</Text>
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
                            <Text size="sm" fw={500}>Sample Feedback</Text>
                            {q.recent_answers.slice(0, 3).map((ans: string, i: number) => (
                              <Text key={i} size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>"{ans}"</Text>
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Edit Survey Modal */}
      <Modal opened={editMode} onClose={() => setEditMode(false)} title="Edit Survey">
        <Stack gap="md">
          <TextInput
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.currentTarget.value)}
          />
          <Textarea
            label="Description"
            value={editDesc}
            onChange={(e) => setEditDesc(e.currentTarget.value)}
            minRows={3}
          />
          <Switch
            label="Active"
            checked={editActive}
            onChange={(e) => setEditActive(e.currentTarget.checked)}
          />
          <TextInput
            label="Active From"
            type="datetime-local"
            value={editActiveFrom ? dayjs(editActiveFrom).format('YYYY-MM-DDTHH:mm') : ''}
            onChange={(e) => setEditActiveFrom(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
          />
          <TextInput
            label="Active Until"
            type="datetime-local"
            value={editActiveUntil ? dayjs(editActiveUntil).format('YYYY-MM-DDTHH:mm') : ''}
            onChange={(e) => setEditActiveUntil(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
          />
          <Button onClick={() => updateSurvey.mutate({
            title: editTitle,
            description: editDesc,
            is_active: editActive,
            active_from: editActiveFrom,
            active_until: editActiveUntil,
          })}>Save</Button>
        </Stack>
      </Modal>

      {/* Add Question Modal */}
      <Modal opened={addQModal} onClose={() => setAddQModal(false)} title="Add Question">
        <Stack gap="md">
          <TextInput
            label="Question"
            value={newQ.text}
            onChange={(e) => setNewQ({ ...newQ, text: e.currentTarget.value })}
            placeholder="What do you want to ask?"
          />
          <Select
            label="Type"
            value={newQ.type}
            onChange={(v) => setNewQ({ ...newQ, type: v || 'rating_1_5' })}
            data={QUESTION_TYPES}
          />
          {newQ.type === 'multiple_choice' && (
            <Textarea
              label="Options (one per line)"
              value={newQ.options}
              onChange={(e) => setNewQ({ ...newQ, options: e.currentTarget.value })}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              minRows={3}
            />
          )}
          <Button onClick={() => addQuestion.mutate()}>Add Question</Button>
        </Stack>
      </Modal>

      {/* Edit Question Modal */}
      <Modal opened={editQModal} onClose={() => setEditQModal(false)} title="Edit Question">
        {editQData && (
          <Stack gap="md">
            <TextInput
              label="Question"
              value={editQData.question_text}
              onChange={(e) => setEditQData({ ...editQData, question_text: e.currentTarget.value })}
            />
            <Select
              label="Type"
              value={editQData.type}
              onChange={(v) => setEditQData({ ...editQData, type: v })}
              data={QUESTION_TYPES}
            />
            {editQData.type === 'multiple_choice' && (
              <Textarea
                label="Options (one per line)"
                value={editQData.options ? (typeof editQData.options === 'string' ? editQData.options : JSON.stringify(editQData.options).split(',').join('\n')) : ''}
                onChange={(e) => setEditQData({ ...editQData, options: e.currentTarget.value })}
                minRows={3}
              />
            )}
            <Button onClick={() => updateQuestion.mutate({
              question_text: editQData.question_text,
              type: editQData.type,
              options: editQData.type === 'multiple_choice' ? editQData.options.split('\n').filter(Boolean) : null,
            })}>Save</Button>
          </Stack>
        )}
      </Modal>

      {/* Share Modal */}
      <Modal opened={shareModal} onClose={() => setShareModal(false)} title="Share Survey">
        <Stack gap="md">
          <Paper p="md" withBorder bg="gray.0">
            <Text size="sm" c="dimmed" mb="xs">Survey Link</Text>
            <Group>
              <TextInput
                value={link?.link || ''}
                readOnly
                flex={1}
              />
              <CopyButton value={link?.link || ''}>
                {({ copied }) => (
                  <Button color={copied ? 'green' : 'blue'} variant="light">
                    <IconCopy size={16} />
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Paper>

          <Textarea
            label="Email Recipients (comma-separated)"
            value={shareEmails}
            onChange={(e) => setShareEmails(e.currentTarget.value)}
            placeholder="user1@example.com, user2@example.com"
            minRows={3}
          />
          <Textarea
            label="Custom Message (optional)"
            value={shareMessage}
            onChange={(e) => setShareMessage(e.currentTarget.value)}
            placeholder="Add a personal message to the survey invitation"
            minRows={2}
          />
          <Button
            leftSection={<IconMail size={16} />}
            loading={shareEmail.isPending}
            onClick={() => shareEmail.mutate()}
          >
            Send Survey
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
