import { tableRegistry } from '../../core/table-registry';

export function registerEventModule(): void {
  tableRegistry.register({
    name: 'monitoring_events',
    label: 'Monitoring Events',
    numberPrefix: 'EVT',
    numberSequence: 'event_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'source', label: 'Source', type: 'select', required: true, showInList: true, showInForm: true, options: [
        { value: 'datadog', label: 'Datadog' }, { value: 'grafana', label: 'Grafana' },
        { value: 'pagerduty', label: 'PagerDuty' }, { value: 'custom', label: 'Custom' },
        { value: 'email', label: 'Email' },
      ]},
      { name: 'severity', label: 'Severity', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'critical', label: 'Critical' }, { value: 'major', label: 'Major' },
        { value: 'minor', label: 'Minor' }, { value: 'warning', label: 'Warning' },
        { value: 'info', label: 'Info' }, { value: 'clear', label: 'Clear' },
      ]},
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'open', label: 'Open' }, { value: 'acknowledged', label: 'Acknowledged' },
        { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
      ]},
      { name: 'node', label: 'Node', type: 'string', showInList: true, showInForm: true },
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'availability', label: 'Availability' }, { value: 'performance', label: 'Performance' },
        { value: 'security', label: 'Security' }, { value: 'capacity', label: 'Capacity' },
      ]},
      { name: 'metric_name', label: 'Metric Name', type: 'string', showInForm: true },
      { name: 'metric_value', label: 'Metric Value', type: 'string', showInForm: true },
      { name: 'threshold', label: 'Threshold', type: 'string', showInForm: true },
      { name: 'message_key', label: 'Message Key', type: 'string', showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'ci_id', label: 'CI', type: 'reference', reference: { table: 'cis', display: 'name' }, showInForm: true },
      { name: 'incident_id', label: 'Incident', type: 'reference', reference: { table: 'incidents', display: 'number' }, showInForm: true },
      { name: 'acknowledged_by', label: 'Acknowledged By', type: 'reference', reference: { table: 'users', display: 'username' }, readonly: true, showInForm: true },
      { name: 'acknowledged_at', label: 'Acknowledged At', type: 'datetime', readonly: true, showInForm: true },
    ],
    states: {
      initial: 'open',
      transitions: {
        open: ['acknowledged', 'resolved', 'closed'],
        acknowledged: ['resolved', 'closed'],
        resolved: ['closed'],
        closed: [],
      },
    },
  });
}
