import { useState } from 'react';
import { TextInput, Textarea, Select, Button, Stack, Title, Paper, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { incidentsApi } from '../../api/incidents.api';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconSend } from '@tabler/icons-react';

export function PortalSubmitIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    short_description: '',
    description: '',
    urgency: '2',
  });

  const submit = useMutation({
    mutationFn: () => incidentsApi.create({
      short_description: form.short_description,
      description: form.description || undefined,
      urgency: Number(form.urgency),
    } as any),
    onSuccess: () => {
      notifications.show({
        title: 'Incident Submitted',
        message: 'Your incident has been submitted successfully. Our team will review it shortly.',
        color: 'green',
      });
      navigate('/portal/my-tickets');
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.error || 'Failed to submit incident. Please try again.',
        color: 'red',
      });
    },
  });

  const canSubmit = form.short_description.trim().length > 0;

  return (
    <Stack className="fade-in">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/portal')}
        w="fit-content"
      >
        Back to Portal
      </Button>

      <Paper
        p="xl"
        radius="lg"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Title order={2} mb={4}>Report an Issue</Title>
        <Text size="md" style={{ opacity: 0.85 }}>
          Describe your issue below and our IT team will assist you as soon as possible.
        </Text>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Stack>
          <TextInput
            label="What's the issue?"
            description="Provide a brief summary of the problem"
            placeholder="e.g., Cannot access email, Printer not working..."
            required
            value={form.short_description}
            onChange={(e) => setForm({ ...form, short_description: e.currentTarget.value })}
          />

          <Textarea
            label="Additional Details"
            description="Include any relevant details that might help us resolve the issue faster"
            placeholder="When did the issue start? What were you trying to do? Any error messages?"
            minRows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
          />

          <Select
            label="How urgent is this?"
            description="Select the urgency level for your issue"
            data={[
              { value: '1', label: 'High - Prevents me from working' },
              { value: '2', label: 'Medium - I can work but with difficulty' },
              { value: '3', label: 'Low - Minor inconvenience' },
            ]}
            value={form.urgency}
            onChange={(v) => setForm({ ...form, urgency: v || '2' })}
          />

          <Button
            leftSection={<IconSend size={16} />}
            onClick={() => submit.mutate()}
            loading={submit.isPending}
            disabled={!canSubmit}
            size="md"
            mt="md"
          >
            Submit Incident
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
