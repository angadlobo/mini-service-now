import { tableRegistry } from '../../core/table-registry';

export function registerContractModule(): void {
  tableRegistry.register({
    name: 'vendors',
    label: 'Vendors',
    numberPrefix: 'VND',
    numberSequence: 'vendor_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'name', label: 'Name', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'hardware', label: 'Hardware' }, { value: 'software', label: 'Software' },
        { value: 'service', label: 'Service' }, { value: 'consulting', label: 'Consulting' },
      ]},
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
        { value: 'blacklisted', label: 'Blacklisted' },
      ]},
      { name: 'contact_name', label: 'Contact Name', type: 'string', showInList: true, showInForm: true },
      { name: 'email', label: 'Email', type: 'string', showInList: true, showInForm: true },
      { name: 'phone', label: 'Phone', type: 'string', showInForm: true },
      { name: 'website', label: 'Website', type: 'string', showInForm: true },
      { name: 'address', label: 'Address', type: 'text', showInForm: true },
      { name: 'rating', label: 'Rating', type: 'number', showInList: true, showInForm: true },
      { name: 'notes', label: 'Notes', type: 'text', showInForm: true },
    ],
  });

  tableRegistry.register({
    name: 'contracts',
    label: 'Contracts',
    numberPrefix: 'CON',
    numberSequence: 'contract_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'short_description', label: 'Short Description', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'vendor_id', label: 'Vendor', type: 'reference', reference: { table: 'vendors', display: 'name' }, showInList: true, showInForm: true },
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'lease', label: 'Lease' }, { value: 'maintenance', label: 'Maintenance' },
        { value: 'support', label: 'Support' }, { value: 'subscription', label: 'Subscription' },
        { value: 'nda', label: 'NDA' }, { value: 'msa', label: 'MSA' },
      ]},
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' }, { value: 'cancelled', label: 'Cancelled' },
        { value: 'renewed', label: 'Renewed' },
      ]},
      { name: 'start_date', label: 'Start Date', type: 'date', showInList: true, showInForm: true },
      { name: 'end_date', label: 'End Date', type: 'date', showInList: true, showInForm: true },
      { name: 'value', label: 'Value', type: 'number', showInList: true, showInForm: true },
      { name: 'currency', label: 'Currency', type: 'string', showInForm: true },
      { name: 'auto_renew', label: 'Auto Renew', type: 'boolean', showInForm: true },
      { name: 'renewal_period_days', label: 'Renewal Period (days)', type: 'number', showInForm: true },
      { name: 'payment_terms', label: 'Payment Terms', type: 'string', showInForm: true },
      { name: 'owner_id', label: 'Owner', type: 'reference', reference: { table: 'users', display: 'username' }, showInForm: true },
      { name: 'notification_days_before_expiry', label: 'Notify Before Expiry (days)', type: 'number', showInForm: true },
    ],
  });
}
