import { tableRegistry } from '../../core/table-registry';

export function registerCmdbModule(): void {
  tableRegistry.register({
    name: 'cis',
    label: 'Configuration Items',
    numberPrefix: 'CI',
    numberSequence: 'ci_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'name', label: 'Name', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'ci_type_id', label: 'CI Type', type: 'reference', reference: { table: 'ci_types', display: 'name' }, required: true, showInList: true, showInForm: true },
      { name: 'serial_number', label: 'Serial Number', type: 'string', showInList: true, showInForm: true },
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'inventory', label: 'Inventory' }, { value: 'active', label: 'Active' },
        { value: 'maintenance', label: 'Maintenance' }, { value: 'retired', label: 'Retired' },
      ]},
      { name: 'owner_id', label: 'Owner', type: 'reference', reference: { table: 'users', display: 'username' }, showInForm: true },
      { name: 'location', label: 'Location', type: 'string', showInList: true, showInForm: true },
      { name: 'cost', label: 'Cost', type: 'number', showInForm: true },
    ],
    states: {
      initial: 'inventory',
      transitions: {
        inventory: ['active', 'retired'],
        active: ['maintenance', 'retired'],
        maintenance: ['active', 'retired'],
        retired: [],
      },
    },
  });
}
