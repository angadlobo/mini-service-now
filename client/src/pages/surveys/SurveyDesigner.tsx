import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper,
  Text, LoadingOverlay, Switch, Card, Badge, ActionIcon, Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconArrowLeft, IconPlus, IconTrash, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { surveysApi } from '../../api/surveys.api';

const QUESTION_TYPES = [
  { value: 'rating_1_5', label: 'Rating (1-5)' },
  { value: 'rating_1_10', label: 'Rating (1-10)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'text', label: 'Free Text' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'nps', label: 'NPS (0-10)' },
];

export function SurveyDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'satisfaction',
    status: 'draft',
    anonymous: false,
  });

  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    type: 'rating_1_5',
    options: '',
    required: true,
  });

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveysApi.get(id!),
    enabled: !isNew,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['survey-questions', id],
    queryFn: () => surveysApi.getQuestions(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (survey) {
      setForm({
        title: survey.title || '',
        description: survey.description || '',
        type: survey.type || 'satisfaction',
        status: survey.status || 'draft',
        anonymous: survey.anonymous || false,
      });
    }
  }, [survey]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        type: form.type,
        status: form.status,
        anonymous: form.anonymous,
      };
      if (isNew) return surveysApi.create(payload);
      return surveysApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Survey created' : 'Survey updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      if (isNew) navigate(`/surveys/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['survey', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to save', color: 'red' });
    },
  });

  const addQuestion = useMutation({
    mutationFn: () => {
      const payload: any = {
        question_text: questionForm.question_text,
        type: questionForm.type,
        required: questionForm.required,
      };
      if (questionForm.type === 'multiple_choice' && questionForm.options) {
        payload.options = questionForm.options.split(',').map((o: string) => o.trim()).filter(Boolean);
      }
      return surveysApi.addQuestion(id!, payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Question added', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['survey-questions', id] });
      setShowAddQuestion(false);
      setQuestionForm({ question_text: '', type: 'rating_1_5', options: '', required: true });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to add question', color: 'red' });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: () => {
      const payload: any = {
        question_text: questionForm.question_text,
        type: questionForm.type,
        required: questionForm.required,
      };
      if (questionForm.type === 'multiple_choice' && questionForm.options) {
        payload.options = questionForm.options.split(',').map((o: string) => o.trim()).filter(Boolean);
      }
      return surveysApi.updateQuestion(editingQuestionId!, payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Question updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['survey-questions', id] });
      setEditingQuestionId(null);
      setQuestionForm({ question_text: '', type: 'rating_1_5', options: '', required: true });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to update question', color: 'red' });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) => surveysApi.deleteQuestion(questionId),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Question deleted', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['survey-questions', id] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to delete question', color: 'red' });
    },
  });

  const startEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setShowAddQuestion(false);
    setQuestionForm({
      question_text: q.question_text || '',
      type: q.type || 'rating_1_5',
      options: Array.isArray(q.options) ? q.options.join(', ') : '',
      required: q.required ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
    setQuestionForm({ question_text: '', type: 'rating_1_5', options: '', required: true });
  };

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/surveys')}>
          Back
        </Button>
        <Title order={2}>{isNew ? 'New Survey' : `${survey?.number || ''} - ${survey?.title || ''}`}</Title>
        {!isNew && survey && (
          <Badge variant="filled" color={survey.status === 'active' ? 'green' : survey.status === 'closed' ? 'red' : 'gray'}>
            {survey.status}
          </Badge>
        )}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Stack>
              <TextInput label="Title" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.currentTarget.value })} />

              <Textarea label="Description" minRows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />

              <Grid>
                <Grid.Col span={4}>
                  <Select label="Type" data={[
                    { value: 'satisfaction', label: 'Satisfaction' },
                    { value: 'feedback', label: 'Feedback' },
                    { value: 'assessment', label: 'Assessment' },
                  ]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'satisfaction' })} />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Select label="Status" data={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'active', label: 'Active' },
                    { value: 'closed', label: 'Closed' },
                  ]} value={form.status} onChange={(v) => setForm({ ...form, status: v || 'draft' })} />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Stack gap="xs" mt={24}>
                    <Switch label="Anonymous responses" checked={form.anonymous}
                      onChange={(e) => setForm({ ...form, anonymous: e.currentTarget.checked })} />
                  </Stack>
                </Grid.Col>
              </Grid>

              <Group justify="flex-end">
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>
                  {isNew ? 'Create' : 'Update'}
                </Button>
              </Group>
            </Stack>
          </Paper>

          {/* Questions Section */}
          {!isNew && (
            <Paper withBorder p="md" mt="md" pos="relative">
              <LoadingOverlay visible={questionsLoading} />
              <Stack>
                <Group justify="space-between">
                  <Title order={4}>Questions</Title>
                  <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => { setShowAddQuestion(true); cancelEdit(); }}>
                    Add Question
                  </Button>
                </Group>

                {(questions || []).map((q: any, index: number) => (
                  <Card key={q.id} withBorder padding="sm" radius="md">
                    {editingQuestionId === q.id ? (
                      <Stack gap="sm">
                        <Textarea label="Question Text" required value={questionForm.question_text}
                          onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.currentTarget.value })} />
                        <Grid>
                          <Grid.Col span={6}>
                            <Select label="Type" data={QUESTION_TYPES} value={questionForm.type}
                              onChange={(v) => setQuestionForm({ ...questionForm, type: v || 'rating_1_5' })} />
                          </Grid.Col>
                          <Grid.Col span={6}>
                            <Switch label="Required" mt={24} checked={questionForm.required}
                              onChange={(e) => setQuestionForm({ ...questionForm, required: e.currentTarget.checked })} />
                          </Grid.Col>
                        </Grid>
                        {questionForm.type === 'multiple_choice' && (
                          <TextInput label="Options (comma-separated)" value={questionForm.options}
                            onChange={(e) => setQuestionForm({ ...questionForm, options: e.currentTarget.value })}
                            placeholder="Option 1, Option 2, Option 3" />
                        )}
                        <Group justify="flex-end">
                          <Button size="xs" variant="subtle" onClick={cancelEdit}>Cancel</Button>
                          <Button size="xs" leftSection={<IconCheck size={14} />} onClick={() => updateQuestion.mutate()} loading={updateQuestion.isPending}>
                            Save
                          </Button>
                        </Group>
                      </Stack>
                    ) : (
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                          <Text size="sm" c="dimmed" w={24}>{index + 1}.</Text>
                          <Text size="sm" style={{ flex: 1 }}>{q.question_text}</Text>
                          <Badge variant="light" size="sm">{q.type}</Badge>
                          {q.required && <Badge variant="filled" size="xs" color="red">Required</Badge>}
                        </Group>
                        <Group gap={4}>
                          <ActionIcon variant="subtle" size="sm" onClick={() => startEditQuestion(q)}>
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteQuestion.mutate(q.id)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    )}
                  </Card>
                ))}

                {(!questions || questions.length === 0) && !questionsLoading && (
                  <Text c="dimmed" ta="center" py="md">No questions added yet</Text>
                )}

                {/* Add Question Form */}
                {showAddQuestion && (
                  <>
                    <Divider />
                    <Card withBorder padding="md" radius="md" bg="gray.0">
                      <Stack gap="sm">
                        <Text fw={600} size="sm">New Question</Text>
                        <Textarea label="Question Text" required value={questionForm.question_text}
                          onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.currentTarget.value })} />
                        <Grid>
                          <Grid.Col span={6}>
                            <Select label="Type" data={QUESTION_TYPES} value={questionForm.type}
                              onChange={(v) => setQuestionForm({ ...questionForm, type: v || 'rating_1_5' })} />
                          </Grid.Col>
                          <Grid.Col span={6}>
                            <Switch label="Required" mt={24} checked={questionForm.required}
                              onChange={(e) => setQuestionForm({ ...questionForm, required: e.currentTarget.checked })} />
                          </Grid.Col>
                        </Grid>
                        {questionForm.type === 'multiple_choice' && (
                          <TextInput label="Options (comma-separated)" value={questionForm.options}
                            onChange={(e) => setQuestionForm({ ...questionForm, options: e.currentTarget.value })}
                            placeholder="Option 1, Option 2, Option 3" />
                        )}
                        <Group justify="flex-end">
                          <Button size="xs" variant="subtle" onClick={() => { setShowAddQuestion(false); setQuestionForm({ question_text: '', type: 'rating_1_5', options: '', required: true }); }}>
                            Cancel
                          </Button>
                          <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => addQuestion.mutate()}
                            loading={addQuestion.isPending} disabled={!questionForm.question_text.trim()}>
                            Add
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  </>
                )}
              </Stack>
            </Paper>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && survey && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {survey.number}</Text>
                  <Text size="sm"><Text span fw={600}>Type:</Text> {survey.type}</Text>
                  <Text size="sm"><Text span fw={600}>Status:</Text> {survey.status}</Text>
                  <Text size="sm"><Text span fw={600}>Anonymous:</Text> {survey.anonymous ? 'Yes' : 'No'}</Text>
                  <Text size="sm"><Text span fw={600}>Questions:</Text> {(questions || []).length}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {survey.created_at ? new Date(survey.created_at).toLocaleDateString() : '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {survey.updated_at ? new Date(survey.updated_at).toLocaleDateString() : '-'}</Text>
                </Stack>
              </Paper>

              <Button variant="light" fullWidth onClick={() => navigate(`/surveys/${id}/results`)}>
                View Results
              </Button>
            </Stack>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
