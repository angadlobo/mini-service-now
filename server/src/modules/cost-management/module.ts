import { tableRegistry } from '../../core/table-registry';

export function registerCostManagementModule(): void {
  tableRegistry.register({
    name: 'cost_items',
    label: 'Cost Items',
    numberPrefix: 'CST',
    numberSequence: 'cost_item_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'cost_center_id', label: 'Cost Center', type: 'reference', reference: { table: 'cost_centers', display: 'name' }, required: true, showInList: true, showInForm: true },
      { name: 'category', label: 'Category', type: 'select', required: true, showInList: true, showInForm: true, options: [
        { value: 'infrastructure', label: 'Infrastructure' }, { value: 'software', label: 'Software' },
        { value: 'labor', label: 'Labor' }, { value: 'cloud', label: 'Cloud' },
        { value: 'maintenance', label: 'Maintenance' },
      ]},
      { name: 'description', label: 'Description', type: 'text', required: true, showInForm: true },
      { name: 'amount', label: 'Amount', type: 'number', required: true, showInList: true, showInForm: true },
      { name: 'currency', label: 'Currency', type: 'string', showInList: true, showInForm: true },
      { name: 'date', label: 'Date', type: 'date', required: true, showInList: true, showInForm: true },
      { name: 'recurring', label: 'Recurring', type: 'boolean', showInForm: true },
      { name: 'frequency', label: 'Frequency', type: 'select', showInForm: true, options: [
        { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' },
        { value: 'annual', label: 'Annual' },
      ]},
      { name: 'created_by', label: 'Created By', type: 'reference', reference: { table: 'users', display: 'username' }, readonly: true, showInForm: true },
    ],
  });
}
