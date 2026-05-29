import { tableRegistry } from '../../core/table-registry';

export function registerDemandManagementModule(): void {
  tableRegistry.register({
    name: 'demands',
    label: 'Demands',
    numberPrefix: 'DMD',
    numberSequence: 'demand_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'title', label: 'Title', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'submitted', label: 'Submitted' }, { value: 'screening', label: 'Screening' },
        { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
        { value: 'committed', label: 'Committed' }, { value: 'completed', label: 'Completed' },
      ]},
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'project', label: 'Project' }, { value: 'enhancement', label: 'Enhancement' },
        { value: 'initiative', label: 'Initiative' },
      ]},
      { name: 'business_justification', label: 'Business Justification', type: 'text', showInForm: true },
      { name: 'requested_by', label: 'Requested By', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'business_unit', label: 'Business Unit', type: 'string', showInList: true, showInForm: true },
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'estimated_effort_days', label: 'Estimated Effort (Days)', type: 'number', showInForm: true },
      { name: 'estimated_cost', label: 'Estimated Cost', type: 'number', showInForm: true },
      { name: 'expected_value', label: 'Expected Value', type: 'number', showInForm: true },
      { name: 'roi_score', label: 'ROI Score', type: 'number', readonly: true, showInList: true, showInForm: true },
      { name: 'target_quarter', label: 'Target Quarter', type: 'string', showInList: true, showInForm: true },
      { name: 'approved_by', label: 'Approved By', type: 'reference', reference: { table: 'users', display: 'username' }, showInForm: true },
      { name: 'project_id', label: 'Project', type: 'reference', reference: { table: 'projects', display: 'name' }, showInForm: true },
      { name: 'created_by', label: 'Created By', type: 'reference', reference: { table: 'users', display: 'username' }, readonly: true, showInForm: true },
    ],
    states: {
      initial: 'submitted',
      transitions: {
        submitted: ['screening', 'rejected'],
        screening: ['approved', 'rejected'],
        approved: ['committed', 'rejected'],
        rejected: ['submitted'],
        committed: ['completed'],
        completed: [],
      },
    },
  });
}
