import { tableRegistry } from '../../core/table-registry';

export function registerServiceMappingModule(): void {
  tableRegistry.register({
    name: 'business_services',
    label: 'Business Services',
    numberPrefix: 'BSV',
    numberSequence: 'business_service_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'name', label: 'Name', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'owner_id', label: 'Owner', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
        { value: 'planned', label: 'Planned' },
      ]},
      { name: 'criticality', label: 'Criticality', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
      ]},
      { name: 'portfolio', label: 'Portfolio', type: 'string', showInList: true, showInForm: true },
      { name: 'sla_definition_id', label: 'SLA Definition', type: 'reference', showInForm: true },
    ],
    states: {
      initial: 'active',
      transitions: {
        active: ['inactive', 'planned'],
        inactive: ['active'],
        planned: ['active', 'inactive'],
      },
    },
  });
}
