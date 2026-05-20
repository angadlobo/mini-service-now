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
      { name: 'impact', label: 'Impact', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' },
      ]},
      { name: 'risk_score', label: 'Risk Score', type: 'number', readonly: true, showInList: true, showInForm: true },
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'assignment_group_id', label: 'Assignment Group', type: 'reference', reference: { table: 'assignment_groups', display: 'name' }, showInForm: true },
      { name: 'planned_start', label: 'Planned Start', type: 'datetime', showInForm: true },
      { name: 'planned_end', label: 'Planned End', type: 'datetime', showInForm: true },
      { name: 'actual_start', label: 'Actual Start', type: 'datetime', readonly: true, showInForm: true },
      { name: 'actual_end', label: 'Actual End', type: 'datetime', readonly: true, showInForm: true },
      { name: 'change_plan', label: 'Change Plan', type: 'text', showInForm: true },
      { name: 'implementation_plan', label: 'Implementation Plan', type: 'text', showInForm: true },
      { name: 'test_plan', label: 'Test Plan', type: 'text', showInForm: true },
      { name: 'communication_plan', label: 'Communication Plan', type: 'text', showInForm: true },
      { name: 'rollback_plan', label: 'Rollback Plan', type: 'text', showInForm: true },
      { name: 'backout_plan', label: 'Backout Plan', type: 'text', showInForm: true },
      { name: 'justification', label: 'Justification', type: 'text', showInForm: true },
      { name: 'cab_required', label: 'CAB Required', type: 'boolean', showInForm: true },
      { name: 'close_code', label: 'Close Code', type: 'select', showInForm: true, options: [
        { value: 'successful', label: 'Successful' },
        { value: 'successful_with_issues', label: 'Successful with Issues' },
        { value: 'unsuccessful', label: 'Unsuccessful' },
        { value: 'cancelled', label: 'Cancelled' },
      ]},
      { name: 'close_notes', label: 'Close Notes', type: 'text', showInForm: true },
      { name: 'template_id', label: 'Template', type: 'reference', reference: { table: 'change_templates', display: 'name' }, showInForm: true },
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
