import { tableRegistry } from '../../core/table-registry';

export function registerAssetModule(): void {
  tableRegistry.register({
    name: 'assets',
    label: 'Assets',
    numberPrefix: 'AST',
    numberSequence: 'asset_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'name', label: 'Name', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'hardware', label: 'Hardware' },
        { value: 'software', label: 'Software' },
        { value: 'consumable', label: 'Consumable' },
      ]},
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'on_order', label: 'On Order' },
        { value: 'in_stock', label: 'In Stock' },
        { value: 'in_use', label: 'In Use' },
        { value: 'in_repair', label: 'In Repair' },
        { value: 'retired', label: 'Retired' },
        { value: 'disposed', label: 'Disposed' },
      ]},
      { name: 'model', label: 'Model', type: 'string', showInList: true, showInForm: true },
      { name: 'manufacturer', label: 'Manufacturer', type: 'string', showInForm: true },
      { name: 'serial_number', label: 'Serial Number', type: 'string', showInForm: true },
      { name: 'asset_tag', label: 'Asset Tag', type: 'string', showInForm: true },
      { name: 'purchase_date', label: 'Purchase Date', type: 'date', showInForm: true },
      { name: 'purchase_cost', label: 'Purchase Cost', type: 'number', showInForm: true },
      { name: 'warranty_expiry', label: 'Warranty Expiry', type: 'date', showInForm: true },
      { name: 'location', label: 'Location', type: 'string', showInList: true, showInForm: true },
      { name: 'department', label: 'Department', type: 'string', showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'ci_id', label: 'Configuration Item', type: 'reference', reference: { table: 'cis', display: 'name' }, showInForm: true },
      { name: 'model_id', label: 'Asset Model', type: 'reference', reference: { table: 'asset_models', display: 'name' }, showInForm: true },
      { name: 'parent_asset_id', label: 'Parent Asset', type: 'reference', reference: { table: 'assets', display: 'number' }, showInForm: true },
    ],
    states: {
      initial: 'in_stock',
      transitions: {
        on_order: ['in_stock', 'disposed'],
        in_stock: ['in_use', 'in_repair', 'retired', 'disposed'],
        in_use: ['in_stock', 'in_repair', 'retired', 'disposed'],
        in_repair: ['in_stock', 'in_use', 'retired', 'disposed'],
        retired: ['disposed'],
        disposed: [],
      },
    },
  });

  tableRegistry.register({
    name: 'software_licenses',
    label: 'Software Licenses',
    numberPrefix: 'LIC',
    numberSequence: 'license_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'product_name', label: 'Product Name', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'license_type', label: 'License Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'per_seat', label: 'Per Seat' },
        { value: 'per_device', label: 'Per Device' },
        { value: 'site', label: 'Site License' },
        { value: 'enterprise', label: 'Enterprise' },
        { value: 'subscription', label: 'Subscription' },
      ]},
      { name: 'total_entitlements', label: 'Total Entitlements', type: 'number', showInList: true, showInForm: true },
      { name: 'allocated_count', label: 'Allocated', type: 'number', readonly: true, showInList: true, showInForm: true },
      { name: 'cost_per_unit', label: 'Cost Per Unit', type: 'number', showInForm: true },
      { name: 'start_date', label: 'Start Date', type: 'date', showInForm: true },
      { name: 'expiry_date', label: 'Expiry Date', type: 'date', showInList: true, showInForm: true },
      { name: 'compliance_status', label: 'Compliance', type: 'select', readonly: true, showInList: true, showInForm: true, options: [
        { value: 'compliant', label: 'Compliant' },
        { value: 'over_licensed', label: 'Over Licensed' },
        { value: 'under_licensed', label: 'Under Licensed' },
      ]},
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'license_key', label: 'License Key', type: 'string', showInForm: true },
    ],
  });
}
