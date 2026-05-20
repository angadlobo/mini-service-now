import { tableRegistry } from '../../core/table-registry';

export function registerReleaseModule(): void {
  tableRegistry.register({
    name: 'releases',
    label: 'Releases',
    numberPrefix: 'REL',
    numberSequence: 'release_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'short_description', label: 'Short Description', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'state', label: 'State', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'planning', label: 'Planning' }, { value: 'review', label: 'Review' },
        { value: 'approved', label: 'Approved' }, { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' }, { value: 'rolled_back', label: 'Rolled Back' },
        { value: 'cancelled', label: 'Cancelled' },
      ]},
      { name: 'release_type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' },
        { value: 'patch', label: 'Patch' }, { value: 'hotfix', label: 'Hotfix' },
      ]},
      { name: 'risk', label: 'Risk', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' },
      ]},
      { name: 'impact', label: 'Impact', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' },
      ]},
      { name: 'risk_score', label: 'Risk Score', type: 'number', readonly: true, showInList: true, showInForm: true },
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'release_manager_id', label: 'Release Manager', type: 'reference', reference: { table: 'users', display: 'username' }, showInForm: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'assignment_group_id', label: 'Assignment Group', type: 'reference', reference: { table: 'assignment_groups', display: 'name' }, showInForm: true },
      { name: 'scheduled_start', label: 'Scheduled Start', type: 'datetime', showInForm: true },
      { name: 'scheduled_end', label: 'Scheduled End', type: 'datetime', showInForm: true },
      { name: 'actual_start', label: 'Actual Start', type: 'datetime', readonly: true, showInForm: true },
      { name: 'actual_end', label: 'Actual End', type: 'datetime', readonly: true, showInForm: true },
      { name: 'implementation_plan', label: 'Implementation Plan', type: 'text', showInForm: true },
      { name: 'test_plan', label: 'Test Plan', type: 'text', showInForm: true },
      { name: 'rollback_plan', label: 'Rollback Plan', type: 'text', showInForm: true },
      { name: 'communication_plan', label: 'Communication Plan', type: 'text', showInForm: true },
      { name: 'deployed_version', label: 'Deployed Version', type: 'string', showInForm: true },
      { name: 'previous_version', label: 'Previous Version', type: 'string', showInForm: true },
      { name: 'build_number', label: 'Build Number', type: 'string', showInForm: true },
    ],
    states: {
      initial: 'planning',
      transitions: {
        planning: ['review', 'cancelled'],
        review: ['approved', 'cancelled'],
        approved: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'rolled_back', 'cancelled'],
        completed: [],
        rolled_back: [],
        cancelled: [],
      },
    },
  });
}
