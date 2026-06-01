import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card, Badge, Stack, Group, Text, Button, Loader, Alert, ThemeIcon, Box, Tabs, Progress,
} from '@mantine/core';
import {
  IconBulb, IconAlertTriangle, IconTarget, IconHistory, IconClock, IconCheckCircle,
} from '@tabler/icons-react';
import { api } from '../../api/common.api';

interface SimilarIncident {
  id: string;
  number: string;
  short_description: string;
  similarity_score: number;
}

interface RootCauseSuggestion {
  pattern: string;
  root_cause: string;
  confidence: number;
}

interface ResolutionSuggestion {
  source_incident_id: string;
  source_number: string;
  resolution_notes: string;
  root_cause: string;
  resolution_time_minutes: number;
  success_rate: number;
  application_count: number;
}

interface SLAPrediction {
  breach_probability: number;
  risk_level: 'red' | 'yellow' | 'green';
  reasons: string[];
  recommendations: string[];
}

interface IncidentAIInsightsProps {
  incidentId: string;
}

export function IncidentAIInsights({ incidentId }: IncidentAIInsightsProps) {
  const { data: similar, isLoading: similarLoading } = useQuery<SimilarIncident[]>({
    queryKey: ['incident-similar', incidentId],
    queryFn: () => api.get(`/incidents/${incidentId}/ai/similar`).then(r => r.data),
  });

  const { data: rootCauses, isLoading: causesLoading } = useQuery<RootCauseSuggestion[]>({
    queryKey: ['incident-root-causes', incidentId],
    queryFn: () => api.get(`/incidents/${incidentId}/ai/root-cause`).then(r => r.data),
  });

  const { data: solutions, isLoading: solutionsLoading } = useQuery<ResolutionSuggestion[]>({
    queryKey: ['incident-solutions', incidentId],
    queryFn: () => api.get(`/incidents/${incidentId}/ai/solutions`).then(r => r.data),
  });

  const { data: slaPrediction, isLoading: slaLoading } = useQuery<SLAPrediction>({
    queryKey: ['incident-sla-prediction', incidentId],
    queryFn: () => api.get(`/incidents/${incidentId}/ai/sla-prediction`).then(r => r.data),
  });

  const isLoading = similarLoading || causesLoading || solutionsLoading || slaLoading;

  if (isLoading) {
    return (
      <Card withBorder p="md" radius="md">
        <Group justify="center" py="xl">
          <Loader size="sm" />
          <Text size="sm">Analyzing incident...</Text>
        </Group>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="overview" variant="outline">
      <Tabs.List>
        <Tabs.Tab value="overview" leftSection={<IconBulb size={16} />}>AI Overview</Tabs.Tab>
        <Tabs.Tab value="similar" leftSection={<IconTarget size={16} />}>Similar Issues</Tabs.Tab>
        <Tabs.Tab value="causes" leftSection={<IconCheckCircle size={16} />}>Root Causes</Tabs.Tab>
        <Tabs.Tab value="solutions" leftSection={<IconHistory size={16} />}>Past Solutions</Tabs.Tab>
        <Tabs.Tab value="sla" leftSection={<IconClock size={16} />}>SLA Risk</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="overview" pt="md">
        <Stack gap="md">
          {/* SLA Risk Overview */}
          {slaPrediction && (
            <Card withBorder p="md" bg={slaPrediction.risk_level === 'red' ? '#ffe0e0' : slaPrediction.risk_level === 'yellow' ? '#fffbe0' : '#e6ffed'}>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  {slaPrediction.risk_level === 'red' && <IconAlertTriangle size={20} color="red" />}
                  {slaPrediction.risk_level === 'yellow' && <IconAlertTriangle size={20} color="orange" />}
                  {slaPrediction.risk_level === 'green' && <IconCheckCircle size={20} color="green" />}
                  <div>
                    <Text fw={600} size="sm">SLA Risk Assessment</Text>
                    <Text size="xs" c="dimmed">{slaPrediction.risk_level.toUpperCase()}</Text>
                  </div>
                </Group>
                <Badge color={slaPrediction.risk_level === 'red' ? 'red' : slaPrediction.risk_level === 'yellow' ? 'yellow' : 'green'}>
                  {Math.round(slaPrediction.breach_probability * 100)}% breach risk
                </Badge>
              </Group>

              <Progress
                value={slaPrediction.breach_probability * 100}
                color={slaPrediction.risk_level === 'red' ? 'red' : slaPrediction.risk_level === 'yellow' ? 'yellow' : 'green'}
                size="sm"
                mb="md"
              />

              {slaPrediction.reasons.length > 0 && (
                <div>
                  <Text size="xs" fw={500} mb="xs">Why:</Text>
                  <Stack gap="xs">
                    {slaPrediction.reasons.map((reason, idx) => (
                      <Text key={idx} size="xs" c="dimmed">• {reason}</Text>
                    ))}
                  </Stack>
                </div>
              )}

              {slaPrediction.recommendations.length > 0 && (
                <div>
                  <Text size="xs" fw={500} my="sm">Recommended Actions:</Text>
                  <Stack gap="xs">
                    {slaPrediction.recommendations.map((rec, idx) => (
                      <Button key={idx} variant="light" size="xs" fullWidth justify="flex-start">
                        {rec}
                      </Button>
                    ))}
                  </Stack>
                </div>
              )}
            </Card>
          )}

          {/* Quick Stats */}
          <Group grow>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed">Similar Issues Found</Text>
              <Text size="xl" fw={600}>{similar?.length || 0}</Text>
            </Card>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed">Root Cause Matches</Text>
              <Text size="xl" fw={600}>{rootCauses?.length || 0}</Text>
            </Card>
            <Card withBorder p="md">
              <Text size="sm" c="dimmed">Past Solutions</Text>
              <Text size="xl" fw={600}>{solutions?.length || 0}</Text>
            </Card>
          </Group>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="similar" pt="md">
        {similar && similar.length > 0 ? (
          <Stack gap="sm">
            {similar.map((incident) => (
              <Card key={incident.id} withBorder p="sm">
                <Group justify="space-between" mb="xs">
                  <div>
                    <Text fw={500} size="sm">{incident.number}</Text>
                    <Text size="xs" c="dimmed">{incident.short_description}</Text>
                  </div>
                  <Badge>{Math.round(incident.similarity_score * 100)}% match</Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        ) : (
          <Alert icon={<IconBulb size={16} />} color="blue">
            No similar incidents found
          </Alert>
        )}
      </Tabs.Panel>

      <Tabs.Panel value="causes" pt="md">
        {rootCauses && rootCauses.length > 0 ? (
          <Stack gap="sm">
            {rootCauses.map((cause, idx) => (
              <Card key={idx} withBorder p="sm" bg="blue.0">
                <Group justify="space-between" mb="xs">
                  <div>
                    <Text fw={500} size="sm">{cause.pattern}</Text>
                    <Text size="xs">{cause.root_cause}</Text>
                  </div>
                  <Badge color="blue">{Math.round(cause.confidence * 100)}% confidence</Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        ) : (
          <Alert icon={<IconBulb size={16} />} color="gray">
            No root cause patterns matched. This might be a new type of incident.
          </Alert>
        )}
      </Tabs.Panel>

      <Tabs.Panel value="solutions" pt="md">
        {solutions && solutions.length > 0 ? (
          <Stack gap="sm">
            {solutions.map((solution, idx) => (
              <Card key={idx} withBorder p="sm" bg="green.0">
                <Group justify="space-between" mb="xs">
                  <div>
                    <Text fw={500} size="sm">From {solution.source_number}</Text>
                    <Progress
                      value={solution.success_rate}
                      color="green"
                      size="sm"
                      label={`${solution.success_rate}% success rate`}
                      mb="xs"
                    />
                    <Text size="xs" c="dimmed">Applied {solution.application_count} times • Avg resolution: {solution.resolution_time_minutes} min</Text>
                  </div>
                </Group>
                <Text size="xs" bg="white" p="xs" style={{ borderRadius: 4 }}>
                  {solution.resolution_notes}
                </Text>
                <Button variant="light" size="xs" mt="xs" fullWidth>
                  Apply This Solution
                </Button>
              </Card>
            ))}
          </Stack>
        ) : (
          <Alert icon={<IconBulb size={16} />} color="gray">
            No past solutions found for similar incidents
          </Alert>
        )}
      </Tabs.Panel>

      <Tabs.Panel value="sla" pt="md">
        {slaPrediction && (
          <Stack gap="md">
            <Alert
              icon={slaPrediction.risk_level === 'red' ? <IconAlertTriangle size={16} /> : <IconCheckCircle size={16} />}
              color={slaPrediction.risk_level === 'red' ? 'red' : slaPrediction.risk_level === 'yellow' ? 'yellow' : 'green'}
            >
              <Stack gap="xs">
                <div>
                  <Text fw={500} size="sm">Risk Level: {slaPrediction.risk_level.toUpperCase()}</Text>
                  <Text size="xs">Probability of SLA breach: {Math.round(slaPrediction.breach_probability * 100)}%</Text>
                </div>

                {slaPrediction.reasons.length > 0 && (
                  <div>
                    <Text size="xs" fw={500}>Why this risk?</Text>
                    <Stack gap="xs">
                      {slaPrediction.reasons.map((reason, idx) => (
                        <Text key={idx} size="xs">• {reason}</Text>
                      ))}
                    </Stack>
                  </div>
                )}

                {slaPrediction.recommendations.length > 0 && (
                  <div>
                    <Text size="xs" fw={500}>What to do?</Text>
                    <Stack gap="xs">
                      {slaPrediction.recommendations.map((rec, idx) => (
                        <Badge key={idx} size="lg" variant="light">
                          {rec}
                        </Badge>
                      ))}
                    </Stack>
                  </div>
                )}
              </Stack>
            </Alert>
          </Stack>
        )}
      </Tabs.Panel>
    </Tabs>
  );
}
