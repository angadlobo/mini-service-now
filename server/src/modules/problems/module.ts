import { tableRegistry } from '../../core/table-registry';

export function registerProblemModule(): void {
  tableRegistry.register({
    name: 'problems',
    label: 'Problems',
    numberPrefix: 'PRB',
    numberSequence: 'problem_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'short_description', label: 'Short Description', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'state', label: 'State', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'new', label: 'New' }, { value: 'investigation', label: 'Investigation' },
        { value: 'root_cause_found', label: 'Root Cause Found' }, { value: 'fix_in_progress', label: 'Fix in Progress' },
        { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
      ]},
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'root_cause', label: 'Root Cause', type: 'text', showInForm: true },
      { name: 'workaround', label: 'Workaround', type: 'text', showInForm: true },
      { name: 'permanent_solution', label: 'Permanent Solution', type: 'text', showInForm: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'assignment_group_id', label: 'Assignment Group', type: 'reference', reference: { table: 'assignment_groups', display: 'name' }, showInList: true, showInForm: true },
    ],
    states: {
      initial: 'new',
      transitions: {
        new: ['investigation', 'closed'],
        investigation: ['root_cause_found', 'closed'],
        root_cause_found: ['fix_in_progress', 'closed'],
        fix_in_progress: ['resolved', 'investigation'],
        resolved: ['closed', 'fix_in_progress'],
        closed: [],
      },
    },
  });
}
