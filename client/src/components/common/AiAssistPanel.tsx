import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Stack, Paper, Button, Group, Text, Loader, ActionIcon, CopyButton, Tooltip, Badge, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSparkles, IconThumbUp, IconThumbDown, IconCopy, IconCheck, IconX } from '@tabler/icons-react';
import { aiApi } from '../../api/common.api';
import type { AiPrompt } from '@shared/interfaces';

interface Props {
  tableName: string;
  recordId: string;
  context: Record<string, string>;
  useCases: string[];
}

interface GenerationResult {
  text: string;
  logId: string;
  tokensUsed: number;
  promptName: string;
}

export function AiAssistPanel({ tableName, recordId, context, useCases }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);

  const { data: allPrompts = [] } = useQuery({
    queryKey: ['ai-prompts'],
    queryFn: aiApi.listPrompts,
  });

  const prompts = allPrompts.filter(
    (p: AiPrompt) => p.active && useCases.includes(p.use_case)
  );

  const handleGenerate = async (prompt: AiPrompt) => {
    setLoading(prompt.id);
    setResult(null);
    setFeedbackGiven(null);
    try {
      const res = await aiApi.generate(prompt.id, { ...context, table_name: tableName, record_id: recordId });
      setResult({ text: res.text, logId: res.logId, tokensUsed: res.tokensUsed, promptName: prompt.name });
    } catch (err: any) {
      notifications.show({ title: 'AI Error', message: err.response?.data?.error || 'Generation failed', color: 'red' });
    } finally {
      setLoading(null);
    }
  };

  const handleFeedback = async (feedback: 'helpful' | 'not_helpful') => {
    if (!result) return;
    try {
      await aiApi.feedback(result.logId, feedback);
      setFeedbackGiven(feedback);
      notifications.show({ title: 'Thank you', message: 'Feedback recorded', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not save feedback', color: 'red' });
    }
  };

  const dismiss = () => { setResult(null); setFeedbackGiven(null); };

  if (prompts.length === 0) return null;

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <IconSparkles size={18} />
          <Title order={5}>AI Assist</Title>
        </Group>

        <Group gap="xs" wrap="wrap">
          {prompts.map((p) => (
            <Button
              key={p.id}
              variant="light"
              size="xs"
              leftSection={loading === p.id ? <Loader size={14} /> : <IconSparkles size={14} />}
              disabled={loading !== null}
              onClick={() => handleGenerate(p)}
            >
              {p.name}
            </Button>
          ))}
        </Group>

        {result && (
          <Paper p="sm" bg="gray.0" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Badge variant="light" size="sm">{result.promptName}</Badge>
                <Group gap={4}>
                  <Badge variant="outline" size="xs">{result.tokensUsed} tokens</Badge>
                  <CopyButton value={result.text}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'}>
                        <ActionIcon variant="subtle" size="sm" onClick={copy}>
                          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                  <ActionIcon variant="subtle" size="sm" onClick={dismiss} title="Dismiss">
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              </Group>

              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{result.text}</Text>

              <Group gap="xs">
                <Text size="xs" c="dimmed">Was this helpful?</Text>
                <ActionIcon
                  variant={feedbackGiven === 'helpful' ? 'filled' : 'subtle'}
                  color="green" size="sm" onClick={() => handleFeedback('helpful')}
                  disabled={feedbackGiven !== null}
                >
                  <IconThumbUp size={14} />
                </ActionIcon>
                <ActionIcon
                  variant={feedbackGiven === 'not_helpful' ? 'filled' : 'subtle'}
                  color="red" size="sm" onClick={() => handleFeedback('not_helpful')}
                  disabled={feedbackGiven !== null}
                >
                  <IconThumbDown size={14} />
                </ActionIcon>
              </Group>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Paper>
  );
}
