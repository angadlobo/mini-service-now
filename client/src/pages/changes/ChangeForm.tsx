import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Grid, TextInput, Textarea, Select, Group, Button, Paper, Text,
  LoadingOverlay, Box, Badge, Alert, Tabs, MultiSelect, Accordion, Progress, Tooltip,
  ActionIcon, Modal, Checkbox, Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceFloppy, IconArrowLeft, IconAlertTriangle, IconRobot, IconLink,
  IconCalendarEvent, IconShieldCheck, IconBrain, IconTemplate,
} from '@tabler/icons-react';
import { changesApi } from '../../api/changes.api';
import { usersApi, cmdbApi } from '../../api/common.api';
import { StateIndicator } from '../../components/common/StateIndicator';
import { ActivityStream } from '../../components/common/ActivityStream';
import { AttachmentPanel } from '../../components/common/AttachmentPanel';
import { ApprovalPanel } from '../../components/common/ApprovalPanel';
import { WorkflowActivity } from '../../components/common/WorkflowActivity';
import { IntegrationLinksPanel } from '../../components/integrations/IntegrationLinksPanel';
import dayjs from 'dayjs';

export function ChangeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState<Record<string, any>>({
    short_description: '', description: '', type: 'normal', risk: 'moderate', impact: 'moderate',
    priority: '4', assigned_to: '', assignment_group_id: '', state: 'new',
    planned_start: '', planned_end: '', backout_plan: '', justification: '',
    change_plan: '', implementation_plan: '', test_plan: '', communication_plan: '', rollback_plan: '',
    cab_required: false, template_id: '', close_code: '', close_notes: '',
    affected_ci_ids: [] as string[],
  });

  const [riskModal, setRiskModal] = useState(false);
  const [riskData, setRiskData] = useState<any>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const { data: change, isLoading } = useQuery({
    queryKey: ['change', id],
    queryFn: () => changesApi.get(id!),
    enabled: !isNew,
  });

  const { data: users } = useQuery({ queryKey: ['users-list'], queryFn: () => usersApi.list({ pageSize: 100 }) });
  const { data: groups } = useQuery({ queryKey: ['groups-list'], queryFn: () => usersApi.listGroups() });
  const { data: cis } = useQuery({ queryKey: ['cis-list'], queryFn: () => cmdbApi.listCis({ pageSize: 200 }) });
  const { data: templates } = useQuery({ queryKey: ['change-templates'], queryFn: () => changesApi.listTemplates() });

  useEffect(() => {
    if (change) {
      setForm({
        short_description: change.short_description || '', description: change.description || '',
        type: change.type, risk: change.risk, impact: change.impact || 'moderate',
        priority: String(change.priority), assigned_to: change.assigned_to || '',
        assignment_group_id: change.assignment_group_id || '', state: change.state,
        planned_start: change.planned_start ? change.planned_start.slice(0, 16) : '',
        planned_end: change.planned_end ? change.planned_end.slice(0, 16) : '',
        backout_plan: change.backout_plan || '', justification: change.justification || '',
        change_plan: change.change_plan || '', implementation_plan: change.implementation_plan || '',
        test_plan: change.test_plan || '', communication_plan: change.communication_plan || '',
        rollback_plan: change.rollback_plan || '', cab_required: change.cab_required || false,
        template_id: change.template_id || '', close_code: change.close_code || '',
        close_notes: change.close_notes || '',
        affected_ci_ids: (change.affected_cis || []).map((ci: any) => ci.id),
      });
    }
  }, [change]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        short_description: form.short_description, description: form.description,
        type: form.type, risk: form.risk, impact: form.impact, priority: Number(form.priority),
        assigned_to: form.assigned_to || null, assignment_group_id: form.assignment_group_id || null,
        planned_start: form.planned_start || null, planned_end: form.planned_end || null,
        backout_plan: form.backout_plan || null, justification: form.justification || null,
        change_plan: form.change_plan || null, implementation_plan: form.implementation_plan || null,
        test_plan: form.test_plan || null, communication_plan: form.communication_plan || null,
        rollback_plan: form.rollback_plan || null, cab_required: form.cab_required,
        affected_ci_ids: form.affected_ci_ids,
      };
      if (!isNew && form.state !== change?.state) payload.state = form.state;
      if (!isNew && form.close_code) { payload.close_code = form.close_code; payload.close_notes = form.close_notes; }
      if (isNew && form.template_id) payload.template_id = form.template_id;
      if (isNew) return changesApi.create(payload);
      return changesApi.update(id!, payload);
    },
    onSuccess: (data) => {
      notifications.show({ title: 'Success', message: isNew ? 'Change created' : 'Change updated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['changes'] });
      if (isNew) navigate(`/changes/${data.id}`);
      else queryClient.invalidateQueries({ queryKey: ['change', id] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed', color: 'red' }),
  });

  const handleAssessRisk = async () => {
    if (!id) return;
    try {
      const data = await changesApi.assessRisk(id);
      setRiskData(data);
      setRiskModal(true);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Risk assessment failed', color: 'red' });
    }
  };

  const handleAiAnalysis = async () => {
    if (!id) return;
    setAiAnalyzing(true);
    try {
      const data = await changesApi.aiRiskAnalysis(id);
      setRiskData({ ...riskData, ai_analysis: data });
      setRiskModal(true);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'AI analysis failed', color: 'red' });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleTemplateSelect = async (templateId: string | null) => {
    if (!templateId) { setForm({ ...form, template_id: '' }); return; }
    setForm({ ...form, template_id: templateId });
    try {
      const template = await changesApi.getTemplate(templateId);
      if (template) {
        setForm((prev: any) => ({
          ...prev, template_id: templateId,
          type: template.type || prev.type, risk: template.risk || prev.risk,
          impact: template.impact || prev.impact,
          change_plan: template.change_plan || prev.change_plan,
          implementation_plan: template.implementation_plan || prev.implementation_plan,
          test_plan: template.test_plan || prev.test_plan,
          communication_plan: template.communication_plan || prev.communication_plan,
          rollback_plan: template.rollback_plan || prev.rollback_plan,
          backout_plan: template.backout_plan || prev.backout_plan,
          justification: template.justification || prev.justification,
          cab_required: template.cab_required ?? prev.cab_required,
        }));
      }
    } catch { /* ignore */ }
  };

  const userOptions = (users?.data || []).map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }));
  const groupOptions = ((groups as any[]) || []).map((g: any) => ({ value: g.id, label: g.name }));
  const ciOptions = ((cis?.data || cis || []) as any[]).map((ci: any) => ({ value: ci.id, label: `${ci.number} - ${ci.name}` }));
  const templateOptions = ((templates || []) as any[]).map((t: any) => ({ value: t.id, label: `${t.name} (${t.type})` }));

  const transitions: Record<string, string[]> = {
    new: ['assess', 'cancelled'], assess: ['authorize', 'cancelled'], authorize: ['scheduled', 'cancelled'],
    scheduled: ['implement', 'cancelled'], implement: ['review', 'cancelled'], review: ['closed', 'cancelled'],
    closed: [], cancelled: [],
  };
  const stateOptions = isNew ? [] : [
    { value: change?.state || 'new', label: (change?.state || 'new').charAt(0).toUpperCase() + (change?.state || 'new').slice(1) },
    ...(transitions[change?.state || 'new'] || []).map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  ];

  const riskScoreColor = (score: number) => score >= 70 ? 'red' : score >= 40 ? 'yellow' : 'green';

  return (
    <Stack>
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/changes')}>Back</Button>
        <Title order={2}>{isNew ? 'New Change Request' : change?.number || ''}</Title>
        {change && <StateIndicator state={change.state} />}
        {change?.type === 'emergency' && <Badge color="red" variant="filled">Emergency</Badge>}
        {change?.type === 'standard' && <Badge color="green" variant="filled">Standard</Badge>}
        {change?.risk_score != null && (
          <Tooltip label={`Risk Score: ${change.risk_score}/100`}>
            <Badge color={riskScoreColor(change.risk_score)} variant="light" size="lg">{change.risk_score}</Badge>
          </Tooltip>
        )}
      </Group>

      {/* Conflict alerts */}
      {change?.conflicts?.length > 0 && (
        <Alert icon={<IconAlertTriangle />} color="orange" title="Conflicts Detected">
          {change.conflicts.filter((c: any) => c.resolution === 'unresolved').map((c: any) => (
            <Text key={c.id} size="sm">- {c.description}</Text>
          ))}
        </Alert>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={isLoading} />
            <Tabs defaultValue="details">
              <Tabs.List>
                <Tabs.Tab value="details">Details</Tabs.Tab>
                <Tabs.Tab value="planning">Planning</Tabs.Tab>
                <Tabs.Tab value="schedule">Schedule & CIs</Tabs.Tab>
                {!isNew && <Tabs.Tab value="closure">Closure</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="details" pt="md">
                <Stack>
                  {isNew && (
                    <Select label="Create from Template" placeholder="Select a template (optional)" data={templateOptions}
                      value={form.template_id} onChange={handleTemplateSelect} clearable searchable
                      leftSection={<IconTemplate size={16} />} />
                  )}
                  <TextInput label="Short Description" required value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.currentTarget.value })} />
                  <Textarea label="Description" minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
                  <Grid>
                    <Grid.Col span={3}>
                      <Select label="Type" data={[{ value: 'normal', label: 'Normal' }, { value: 'standard', label: 'Standard' }, { value: 'emergency', label: 'Emergency' }]} value={form.type} onChange={(v) => setForm({ ...form, type: v || 'normal' })} />
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <Select label="Risk" data={[{ value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' }]} value={form.risk} onChange={(v) => setForm({ ...form, risk: v || 'moderate' })} />
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <Select label="Impact" data={[{ value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' }]} value={form.impact} onChange={(v) => setForm({ ...form, impact: v || 'moderate' })} />
                    </Grid.Col>
                    <Grid.Col span={3}>
                      <Select label="Priority" data={[{ value: '1', label: 'P1 - Critical' }, { value: '2', label: 'P2 - High' }, { value: '3', label: 'P3 - Moderate' }, { value: '4', label: 'P4 - Low' }]} value={form.priority} onChange={(v) => setForm({ ...form, priority: v || '4' })} />
                    </Grid.Col>
                  </Grid>
                  <Grid>
                    <Grid.Col span={6}><Select label="Assigned To" data={userOptions} value={form.assigned_to} onChange={(v) => setForm({ ...form, assigned_to: v || '' })} clearable searchable /></Grid.Col>
                    <Grid.Col span={6}><Select label="Assignment Group" data={groupOptions} value={form.assignment_group_id} onChange={(v) => setForm({ ...form, assignment_group_id: v || '' })} clearable searchable /></Grid.Col>
                  </Grid>
                  <Textarea label="Justification" minRows={2} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.currentTarget.value })} />
                  <Checkbox label="CAB Review Required" checked={form.cab_required} onChange={(e) => setForm({ ...form, cab_required: e.currentTarget.checked })} />
                  {!isNew && <Select label="State" data={stateOptions} value={form.state} onChange={(v) => setForm({ ...form, state: v || form.state })} />}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="planning" pt="md">
                <Stack>
                  <Textarea label="Change Plan" description="Overall plan for this change" minRows={3} value={form.change_plan} onChange={(e) => setForm({ ...form, change_plan: e.currentTarget.value })} />
                  <Textarea label="Implementation Plan" description="Step-by-step implementation details" minRows={3} value={form.implementation_plan} onChange={(e) => setForm({ ...form, implementation_plan: e.currentTarget.value })} />
                  <Textarea label="Test Plan" description="Testing strategy and acceptance criteria" minRows={3} value={form.test_plan} onChange={(e) => setForm({ ...form, test_plan: e.currentTarget.value })} />
                  <Textarea label="Communication Plan" description="Stakeholder notification plan" minRows={2} value={form.communication_plan} onChange={(e) => setForm({ ...form, communication_plan: e.currentTarget.value })} />
                  <Textarea label="Rollback Plan" description="Steps to roll back if implementation fails" minRows={3} value={form.rollback_plan} onChange={(e) => setForm({ ...form, rollback_plan: e.currentTarget.value })} />
                  <Textarea label="Backout Plan" description="Steps to back out the change entirely" minRows={2} value={form.backout_plan} onChange={(e) => setForm({ ...form, backout_plan: e.currentTarget.value })} />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="schedule" pt="md">
                <Stack>
                  <Grid>
                    <Grid.Col span={6}><TextInput label="Planned Start" type="datetime-local" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.currentTarget.value })} /></Grid.Col>
                    <Grid.Col span={6}><TextInput label="Planned End" type="datetime-local" value={form.planned_end} onChange={(e) => setForm({ ...form, planned_end: e.currentTarget.value })} /></Grid.Col>
                  </Grid>
                  {change?.actual_start && (
                    <Grid>
                      <Grid.Col span={6}><TextInput label="Actual Start" value={dayjs(change.actual_start).format('MMM D, YYYY HH:mm')} readOnly /></Grid.Col>
                      <Grid.Col span={6}><TextInput label="Actual End" value={change.actual_end ? dayjs(change.actual_end).format('MMM D, YYYY HH:mm') : 'In progress'} readOnly /></Grid.Col>
                    </Grid>
                  )}
                  <Divider label="Affected Configuration Items" />
                  <MultiSelect label="Affected CIs" description="Select all CIs affected by this change" data={ciOptions}
                    value={form.affected_ci_ids} onChange={(v) => setForm({ ...form, affected_ci_ids: v })} searchable clearable />
                  {change?.affected_cis?.length > 0 && (
                    <Paper withBorder p="xs">
                      <Text size="sm" fw={600} mb="xs">Currently Linked CIs:</Text>
                      {change.affected_cis.map((ci: any) => (
                        <Badge key={ci.id} variant="light" mr="xs" mb="xs">{ci.number} - {ci.name}</Badge>
                      ))}
                    </Paper>
                  )}
                </Stack>
              </Tabs.Panel>

              {!isNew && (
                <Tabs.Panel value="closure" pt="md">
                  <Stack>
                    <Select label="Close Code" data={[
                      { value: 'successful', label: 'Successful' },
                      { value: 'successful_with_issues', label: 'Successful with Issues' },
                      { value: 'unsuccessful', label: 'Unsuccessful' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ]} value={form.close_code} onChange={(v) => setForm({ ...form, close_code: v || '' })} clearable />
                    <Textarea label="Close Notes" minRows={3} value={form.close_notes} onChange={(e) => setForm({ ...form, close_notes: e.currentTarget.value })} />
                  </Stack>
                </Tabs.Panel>
              )}
            </Tabs>

            <Group justify="flex-end" mt="md">
              {!isNew && (
                <>
                  <Button variant="light" leftSection={<IconShieldCheck size={16} />} onClick={handleAssessRisk}>Risk Assessment</Button>
                  <Button variant="light" color="violet" leftSection={<IconBrain size={16} />} onClick={handleAiAnalysis} loading={aiAnalyzing}>AI Analysis</Button>
                </>
              )}
              <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => save.mutate()} loading={save.isPending}>{isNew ? 'Create' : 'Update'}</Button>
            </Group>
          </Paper>

          {/* Linked Records */}
          {!isNew && change && (
            <Accordion mt="md">
              {change.linked_incidents?.length > 0 && (
                <Accordion.Item value="incidents">
                  <Accordion.Control icon={<IconLink size={16} />}>Linked Incidents ({change.linked_incidents.length})</Accordion.Control>
                  <Accordion.Panel>
                    {change.linked_incidents.map((inc: any) => (
                      <Group key={inc.id} mb="xs">
                        <Badge variant="light" color="blue">{inc.number}</Badge>
                        <Text size="sm">{inc.short_description}</Text>
                        <StateIndicator state={inc.state} />
                      </Group>
                    ))}
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              {change.linked_problems?.length > 0 && (
                <Accordion.Item value="problems">
                  <Accordion.Control icon={<IconLink size={16} />}>Linked Problems ({change.linked_problems.length})</Accordion.Control>
                  <Accordion.Panel>
                    {change.linked_problems.map((prob: any) => (
                      <Group key={prob.id} mb="xs">
                        <Badge variant="light" color="grape">{prob.number}</Badge>
                        <Text size="sm">{prob.short_description}</Text>
                        <StateIndicator state={prob.state} />
                      </Group>
                    ))}
                  </Accordion.Panel>
                </Accordion.Item>
              )}
            </Accordion>
          )}

          {!isNew && change && <Box mt="md"><ActivityStream tableName="changes" recordId={change.id} /></Box>}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          {!isNew && change && (
            <Stack>
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm"><Text span fw={600}>Number:</Text> {change.number}</Text>
                  <Text size="sm"><Text span fw={600}>Type:</Text> <Badge size="sm" color={change.type === 'emergency' ? 'red' : change.type === 'standard' ? 'green' : 'blue'}>{change.type}</Badge></Text>
                  <Text size="sm"><Text span fw={600}>Risk Score:</Text> <Badge size="sm" color={riskScoreColor(change.risk_score || 0)}>{change.risk_score || 0}/100</Badge></Text>
                  {change.risk_score != null && <Progress value={change.risk_score} color={riskScoreColor(change.risk_score)} size="sm" />}
                  <Text size="sm"><Text span fw={600}>CAB Required:</Text> {change.cab_required ? 'Yes' : 'No'}</Text>
                  <Text size="sm"><Text span fw={600}>Created by:</Text> {change.created_by_name || '-'}</Text>
                  <Text size="sm"><Text span fw={600}>Created:</Text> {dayjs(change.created_at).format('MMM D, YYYY HH:mm')}</Text>
                  <Text size="sm"><Text span fw={600}>Updated:</Text> {dayjs(change.updated_at).format('MMM D, YYYY HH:mm')}</Text>
                  {change.planned_start && <Text size="sm"><Text span fw={600}>Planned Start:</Text> {dayjs(change.planned_start).format('MMM D, YYYY HH:mm')}</Text>}
                  {change.planned_end && <Text size="sm"><Text span fw={600}>Planned End:</Text> {dayjs(change.planned_end).format('MMM D, YYYY HH:mm')}</Text>}
                  {change.template_id && <Text size="sm"><Text span fw={600}>Template:</Text> Applied</Text>}
                </Stack>
              </Paper>
              <ApprovalPanel tableName="changes" recordId={change.id} />
              <WorkflowActivity tableName="changes" recordId={change.id} />
              <AttachmentPanel tableName="changes" recordId={change.id} />
              <IntegrationLinksPanel tableName="changes" recordId={change.id} />

              {/* AI Risk Analysis Results */}
              {change.ai_risk_analysis && (
                <Paper withBorder p="md">
                  <Text fw={600} mb="xs" size="sm">AI Risk Analysis</Text>
                  <Stack gap="xs">
                    {change.ai_risk_analysis.predicted_risk_score && (
                      <Text size="sm">Predicted Score: <Badge color={riskScoreColor(change.ai_risk_analysis.predicted_risk_score)}>{change.ai_risk_analysis.predicted_risk_score}</Badge></Text>
                    )}
                    {change.ai_risk_analysis.recommendation && (
                      <Text size="sm">Recommendation: <Badge variant="light">{change.ai_risk_analysis.recommendation}</Badge></Text>
                    )}
                    {change.ai_risk_analysis.suggestions?.length > 0 && (
                      <>
                        <Text size="xs" fw={600}>Suggestions:</Text>
                        {change.ai_risk_analysis.suggestions.map((s: string, i: number) => (
                          <Text key={i} size="xs" c="dimmed">- {s}</Text>
                        ))}
                      </>
                    )}
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}
        </Grid.Col>
      </Grid>

      {/* Risk Assessment Modal */}
      <Modal opened={riskModal} onClose={() => setRiskModal(false)} title="Risk Assessment" size="lg">
        {riskData && (
          <Stack>
            <Group>
              <Text fw={600}>Risk Score:</Text>
              <Badge size="xl" color={riskScoreColor(riskData.risk_score)}>{riskData.risk_score}/100</Badge>
              <Badge variant="light">{riskData.risk_level}</Badge>
            </Group>
            <Progress value={riskData.risk_score} color={riskScoreColor(riskData.risk_score)} size="lg" />

            {riskData.affected_cis?.length > 0 && (
              <Box>
                <Text fw={600} size="sm" mb="xs">Directly Affected CIs ({riskData.affected_cis.length}):</Text>
                {riskData.affected_cis.map((ci: any) => (
                  <Badge key={ci.id} variant="light" mr="xs" mb="xs">{ci.name}</Badge>
                ))}
              </Box>
            )}

            {riskData.indirect_cis?.length > 0 && (
              <Box>
                <Text fw={600} size="sm" mb="xs">Indirectly Impacted CIs ({riskData.indirect_cis.length}):</Text>
                {riskData.indirect_cis.map((ci: any) => (
                  <Badge key={ci.id} variant="outline" color="orange" mr="xs" mb="xs">{ci.name}</Badge>
                ))}
              </Box>
            )}

            {riskData.schedule_conflicts?.length > 0 && (
              <Alert color="orange" title="Schedule Conflicts">
                {riskData.schedule_conflicts.map((c: any) => (
                  <Text key={c.id} size="sm">- {c.number}: {c.short_description}</Text>
                ))}
              </Alert>
            )}

            {riskData.blackout_violations?.length > 0 && (
              <Alert color="red" title="Blackout Window Violations">
                {riskData.blackout_violations.map((b: any) => (
                  <Text key={b.id} size="sm">- {b.name}: {b.reason}</Text>
                ))}
              </Alert>
            )}

            {riskData.recommendations?.length > 0 && (
              <Box>
                <Text fw={600} size="sm" mb="xs">Recommendations:</Text>
                {riskData.recommendations.map((r: string, i: number) => (
                  <Text key={i} size="sm" c="dimmed">- {r}</Text>
                ))}
              </Box>
            )}

            {riskData.ai_analysis && (
              <Box>
                <Divider label="AI Analysis" mb="sm" />
                {riskData.ai_analysis.rationale && <Text size="sm">{riskData.ai_analysis.rationale}</Text>}
                {riskData.ai_analysis.potential_issues?.length > 0 && (
                  <>
                    <Text fw={600} size="sm" mt="xs">Potential Issues:</Text>
                    {riskData.ai_analysis.potential_issues.map((issue: string, i: number) => (
                      <Text key={i} size="sm" c="dimmed">- {issue}</Text>
                    ))}
                  </>
                )}
              </Box>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
