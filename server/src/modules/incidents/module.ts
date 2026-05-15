import { tableRegistry } from '../../core/table-registry';

export function registerIncidentModule(): void {
  tableRegistry.register({
    name: 'incidents',
    label: 'Incidents',
    numberPrefix: 'INC',
    numberSequence: 'incident_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'short_description', label: 'Short Description', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'state', label: 'State', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'new', label: 'New' }, { value: 'in_progress', label: 'In Progress' },
        { value: 'on_hold', label: 'On Hold' }, { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' }, { value: 'cancelled', label: 'Cancelled' },
      ]},
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'urgency', label: 'Urgency', type: 'select', showInForm: true, options: [
        { value: '1', label: 'High' }, { value: '2', label: 'Medium' }, { value: '3', label: 'Low' },
      ]},
      { name: 'impact', label: 'Impact', type: 'select', showInForm: true, options: [
        { value: '1', label: 'High' }, { value: '2', label: 'Medium' }, { value: '3', label: 'Low' },
      ]},
      { name: 'caller_id', label: 'Caller', type: 'reference', reference: { table: 'users', display: 'username' }, showInForm: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'assignment_group_id', label: 'Assignment Group', type: 'reference', reference: { table: 'assignment_groups', display: 'name' }, showInList: true, showInForm: true },
      { name: 'sla_due', label: 'SLA Due', type: 'datetime', readonly: true, showInList: true },
      { name: 'resolution_notes', label: 'Resolution Notes', type: 'text', showInForm: true },
    ],
    states: {
      initial: 'new',
      transitions: {
        new: ['in_progress', 'cancelled'],
        in_progress: ['on_hold', 'resolved', 'cancelled'],
        on_hold: ['in_progress', 'cancelled'],
        resolved: ['closed', 'in_progress'],
        closed: [],
        cancelled: [],
      },
    },
  });
}
