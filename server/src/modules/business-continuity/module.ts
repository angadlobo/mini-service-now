import { tableRegistry } from '../../core/table-registry';

export function registerBusinessContinuityModule(): void {
  tableRegistry.register({
    name: 'bc_plans',
    label: 'BC Plans',
    numberPrefix: 'BCP',
    numberSequence: 'bc_plan_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'name', label: 'Name', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' },
        { value: 'under_review', label: 'Under Review' }, { value: 'retired', label: 'Retired' },
      ]},
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'business_continuity', label: 'Business Continuity' },
        { value: 'disaster_recovery', label: 'Disaster Recovery' },
        { value: 'crisis_management', label: 'Crisis Management' },
      ]},
      { name: 'owner_id', label: 'Owner', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'rpo_hours', label: 'RPO (Hours)', type: 'number', showInForm: true },
      { name: 'rto_hours', label: 'RTO (Hours)', type: 'number', showInForm: true },
      { name: 'last_tested', label: 'Last Tested', type: 'date', readonly: true, showInList: true, showInForm: true },
      { name: 'next_test_due', label: 'Next Test Due', type: 'date', showInList: true, showInForm: true },
      { name: 'business_service_id', label: 'Business Service', type: 'reference', reference: { table: 'business_services', display: 'name' }, showInForm: true },
      { name: 'created_by', label: 'Created By', type: 'reference', reference: { table: 'users', display: 'username' }, readonly: true, showInForm: true },
    ],
    states: {
      initial: 'draft',
      transitions: {
        draft: ['active', 'under_review'],
        active: ['under_review', 'retired'],
        under_review: ['active', 'retired'],
        retired: ['draft'],
      },
    },
  });
}
