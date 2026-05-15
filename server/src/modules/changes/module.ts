import { tableRegistry } from '../../core/table-registry';

export function registerChangeModule(): void {
  tableRegistry.register({
    name: 'changes',
    label: 'Changes',
    numberPrefix: 'CHG',
    numberSequence: 'change_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'short_description', label: 'Short Description', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'state', label: 'State', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'new', label: 'New' }, { value: 'assess', label: 'Assess' },
        { value: 'authorize', label: 'Authorize' }, { value: 'scheduled', label: 'Scheduled' },
        { value: 'implement', label: 'Implement' }, { value: 'review', label: 'Review' },
        { value: 'closed', label: 'Closed' }, { value: 'cancelled', label: 'Cancelled' },
      ]},
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'normal', label: 'Normal' }, { value: 'standard', label: 'Standard' }, { value: 'emergency', label: 'Emergency' },
      ]},
      { name: 'risk', label: 'Risk', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' },
      ]},
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'assignment_group_id', label: 'Assignment Group', type: 'reference', reference: { table: 'assignment_groups', display: 'name' }, showInForm: true },
      { name: 'planned_start', label: 'Planned Start', type: 'datetime', showInForm: true },
      { name: 'planned_end', label: 'Planned End', type: 'datetime', showInForm: true },
      { name: 'backout_plan', label: 'Backout Plan', type: 'text', showInForm: true },
      { name: 'justification', label: 'Justification', type: 'text', showInForm: true },
    ],
    states: {
      initial: 'new',
      transitions: {
        new: ['assess', 'cancelled'],
        assess: ['authorize', 'cancelled'],
        authorize: ['scheduled', 'cancelled'],
        scheduled: ['implement', 'cancelled'],
        implement: ['review', 'cancelled'],
        review: ['closed', 'cancelled'],
        closed: [],
        cancelled: [],
      },
    },
  });
}
