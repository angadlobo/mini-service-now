import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Text, Paper, Group, Button, TextInput, PasswordInput, Table, Badge,
  Modal, Select, ActionIcon, Tooltip, CopyButton, Box, ThemeIcon, Code,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconMail, IconPlus, IconTrash, IconCopy, IconCheck, IconFilter, IconInbox,
} from '@tabler/icons-react';
import { emailProcessingApi } from '../../api/email-processing.api';
import dayjs from 'dayjs';

const ACTION_COLOR: Record<string, string> = {
  create_incident: 'blue', add_comment: 'teal', ignore: 'gray', create_request: 'violet', duplicate: 'yellow',
};

export function EmailProcessing() {
  const qc = useQueryClient();
  const webhookUrl = `${window.location.origin.replace(':3000', ':3001')}/api/email/inbound`;
  const [acctOpen, setAcctOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [acct, setAcct] = useState({ address: '', host: '', port: 993, username: '', password: '' });
  const [rule, setRule] = useState({ email_account_id: '', priority: 0, subject_contains: '', from_domain: '', action: 'create_incident' });

  const { data: accounts } = useQuery({ queryKey: ['email-accounts'], queryFn: emailProcessingApi.listAccounts });
  const { data: rules } = useQuery({ queryKey: ['email-rules'], queryFn: () => emailProcessingApi.listRules() });
  const { data: processed } = useQuery({ queryKey: ['email-processed'], queryFn: emailProcessingApi.getProcessed, refetchInterval: 20_000 });

  const createAcct = useMutation({
    mutationFn: () => emailProcessingApi.createAccount(acct),
    onSuccess: () => { notifications.show({ title: 'Saved', message: 'Mailbox added', color: 'green' }); setAcctOpen(false); setAcct({ address: '', host: '', port: 993, username: '', password: '' }); qc.invalidateQueries({ queryKey: ['email-accounts'] }); },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });
  const delAcct = useMutation({ mutationFn: (id: string) => emailProcessingApi.deleteAccount(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['email-accounts'] }) });

  const createRule = useMutation({
    mutationFn: () => emailProcessingApi.createRule({
      email_account_id: rule.email_account_id,
      priority: rule.priority,
      action: rule.action,
      conditions: { ...(rule.subject_contains ? { subject_contains: rule.subject_contains } : {}), ...(rule.from_domain ? { from_domain: rule.from_domain } : {}) },
    }),
    onSuccess: () => { notifications.show({ title: 'Saved', message: 'Rule added', color: 'green' }); setRuleOpen(false); qc.invalidateQueries({ queryKey: ['email-rules'] }); },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Failed', color: 'red' }),
  });
  const delRule = useMutation({ mutationFn: (id: string) => emailProcessingApi.deleteRule(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['email-rules'] }) });

  return (
    <Stack className="fade-in">
      <div>
        <Title order={2} className="page-title">Inbound Email</Title>
        <Text c="dimmed" size="sm">Turn emails into tickets. Configure mailboxes and routing rules, or point your email provider's inbound webhook at the URL below.</Text>
      </div>

      {/* Webhook URL */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between">
          <Group gap={8}>
            <ThemeIcon variant="light" color="indigo"><IconInbox size={18} /></ThemeIcon>
            <div>
              <Text size="sm" fw={600}>Inbound webhook</Text>
              <Text size="xs" c="dimmed">POST parsed email here from SendGrid Inbound Parse, Mailgun Routes, etc.</Text>
            </div>
          </Group>
          <Group gap={4}>
            <Code>{webhookUrl}</Code>
            <CopyButton value={webhookUrl}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy'}><ActionIcon variant="light" color={copied ? 'green' : 'gray'} onClick={copy}>{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}</ActionIcon></Tooltip>
              )}
            </CopyButton>
          </Group>
        </Group>
      </Paper>

      {/* Mailboxes */}
      <Group justify="space-between" mt="sm">
        <Title order={4}>Mailboxes</Title>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setAcctOpen(true)}>Add mailbox</Button>
      </Group>
      <Paper withBorder radius="md">
        <Table highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Address</Table.Th><Table.Th>Host</Table.Th><Table.Th>Protocol</Table.Th><Table.Th>Active</Table.Th><Table.Th></Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {(accounts || []).map((a: any) => (
              <Table.Tr key={a.id}>
                <Table.Td><Group gap={6}><IconMail size={14} /> {a.address}</Group></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{a.host}:{a.port}</Text></Table.Td>
                <Table.Td><Badge size="sm" variant="light">{a.protocol}</Badge></Table.Td>
                <Table.Td><Badge size="sm" color={a.active ? 'green' : 'gray'} variant="light">{a.active ? 'Active' : 'Off'}</Badge></Table.Td>
                <Table.Td><ActionIcon color="red" variant="subtle" onClick={() => delAcct.mutate(a.id)}><IconTrash size={16} /></ActionIcon></Table.Td>
              </Table.Tr>
            ))}
            {(!accounts || accounts.length === 0) && <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" ta="center" py="md" size="sm">No mailboxes. The webhook still works without one (creates incidents by default).</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Rules */}
      <Group justify="space-between" mt="sm">
        <Title order={4}>Routing Rules</Title>
        <Button size="xs" variant="light" leftSection={<IconFilter size={14} />} disabled={!accounts?.length} onClick={() => { setRule({ ...rule, email_account_id: accounts?.[0]?.id || '' }); setRuleOpen(true); }}>Add rule</Button>
      </Group>
      <Paper withBorder radius="md">
        <Table highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Priority</Table.Th><Table.Th>Conditions</Table.Th><Table.Th>Action</Table.Th><Table.Th></Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {(rules || []).map((r: any) => {
              const c = typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions;
              return (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.priority}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{Object.entries(c).map(([k, v]) => `${k}=${v}`).join(', ') || 'any'}</Text></Table.Td>
                  <Table.Td><Badge size="sm" color={ACTION_COLOR[r.action] || 'gray'} variant="light">{r.action}</Badge></Table.Td>
                  <Table.Td><ActionIcon color="red" variant="subtle" onClick={() => delRule.mutate(r.id)}><IconTrash size={16} /></ActionIcon></Table.Td>
                </Table.Tr>
              );
            })}
            {(!rules || rules.length === 0) && <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md" size="sm">No rules. Default: replies thread onto the referenced incident, everything else creates a new incident.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Processed log */}
      <Title order={4} mt="sm">Recently Processed</Title>
      <Paper withBorder radius="md">
        <Table>
          <Table.Thead><Table.Tr><Table.Th>From</Table.Th><Table.Th>Subject</Table.Th><Table.Th>Action</Table.Th><Table.Th>When</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {(processed || []).map((p: any) => (
              <Table.Tr key={p.id}>
                <Table.Td><Text size="sm">{p.from_address}</Text></Table.Td>
                <Table.Td><Text size="sm" lineClamp={1}>{p.subject}</Text></Table.Td>
                <Table.Td><Badge size="sm" color={ACTION_COLOR[p.action_taken] || 'gray'} variant="light">{p.action_taken}</Badge></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{p.created_at ? dayjs(p.created_at).format('MMM D, HH:mm') : '-'}</Text></Table.Td>
              </Table.Tr>
            ))}
            {(!processed || processed.length === 0) && <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md" size="sm">No emails processed yet.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Add mailbox modal */}
      <Modal opened={acctOpen} onClose={() => setAcctOpen(false)} title="Add Mailbox">
        <Stack>
          <TextInput label="Email address" placeholder="support@company.com" value={acct.address} onChange={(e) => setAcct({ ...acct, address: e.currentTarget.value })} />
          <Group grow>
            <TextInput label="IMAP host" placeholder="imap.company.com" value={acct.host} onChange={(e) => setAcct({ ...acct, host: e.currentTarget.value })} />
            <TextInput label="Port" type="number" value={acct.port} onChange={(e) => setAcct({ ...acct, port: Number(e.currentTarget.value) })} />
          </Group>
          <TextInput label="Username" value={acct.username} onChange={(e) => setAcct({ ...acct, username: e.currentTarget.value })} />
          <PasswordInput label="Password" value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.currentTarget.value })} />
          <Group justify="flex-end"><Button variant="default" onClick={() => setAcctOpen(false)}>Cancel</Button><Button loading={createAcct.isPending} onClick={() => createAcct.mutate()}>Save</Button></Group>
        </Stack>
      </Modal>

      {/* Add rule modal */}
      <Modal opened={ruleOpen} onClose={() => setRuleOpen(false)} title="Add Routing Rule">
        <Stack>
          <Select label="Mailbox" data={(accounts || []).map((a: any) => ({ value: a.id, label: a.address }))} value={rule.email_account_id} onChange={(v) => setRule({ ...rule, email_account_id: v || '' })} />
          <TextInput label="Priority" type="number" value={rule.priority} onChange={(e) => setRule({ ...rule, priority: Number(e.currentTarget.value) })} />
          <TextInput label="Subject contains" placeholder="(optional)" value={rule.subject_contains} onChange={(e) => setRule({ ...rule, subject_contains: e.currentTarget.value })} />
          <TextInput label="From domain ends with" placeholder="e.g. @vendor.com (optional)" value={rule.from_domain} onChange={(e) => setRule({ ...rule, from_domain: e.currentTarget.value })} />
          <Select label="Action" data={[
            { value: 'create_incident', label: 'Create incident' },
            { value: 'add_comment', label: 'Add comment (if threaded)' },
            { value: 'ignore', label: 'Ignore' },
          ]} value={rule.action} onChange={(v) => setRule({ ...rule, action: v || 'create_incident' })} />
          <Group justify="flex-end"><Button variant="default" onClick={() => setRuleOpen(false)}>Cancel</Button><Button loading={createRule.isPending} disabled={!rule.email_account_id} onClick={() => createRule.mutate()}>Save</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
