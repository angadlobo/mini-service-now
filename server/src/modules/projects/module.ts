import { tableRegistry } from '../../core/table-registry';

export function registerProjectModule(): void {
  tableRegistry.register({
    name: 'projects',
    label: 'Projects',
    numberPrefix: 'PRJ',
    numberSequence: 'project_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'name', label: 'Name', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'planning', label: 'Planning' }, { value: 'active', label: 'Active' },
        { value: 'on_hold', label: 'On Hold' }, { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ]},
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'type', label: 'Type', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'waterfall', label: 'Waterfall' }, { value: 'agile', label: 'Agile' },
        { value: 'hybrid', label: 'Hybrid' },
      ]},
      { name: 'phase', label: 'Phase', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'initiation', label: 'Initiation' }, { value: 'planning', label: 'Planning' },
        { value: 'execution', label: 'Execution' }, { value: 'monitoring', label: 'Monitoring' },
        { value: 'closing', label: 'Closing' },
      ]},
      { name: 'owner_id', label: 'Owner', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'start_date', label: 'Start Date', type: 'date', showInForm: true },
      { name: 'end_date', label: 'End Date', type: 'date', showInForm: true },
      { name: 'budget', label: 'Budget', type: 'number', showInForm: true },
      { name: 'actual_cost', label: 'Actual Cost', type: 'number', showInForm: true },
      { name: 'percent_complete', label: '% Complete', type: 'number', showInList: true, showInForm: true },
      { name: 'portfolio', label: 'Portfolio', type: 'string', showInForm: true },
    ],
    states: {
      initial: 'planning',
      transitions: {
        planning: ['active', 'cancelled'],
        active: ['on_hold', 'completed', 'cancelled'],
        on_hold: ['active', 'cancelled'],
        completed: [],
        cancelled: [],
      },
    },
  });

  tableRegistry.register({
    name: 'project_tasks',
    label: 'Project Tasks',
    numberPrefix: 'TSK',
    numberSequence: 'project_task_number_seq',
    columns: [
      { name: 'number', label: 'Number', type: 'string', readonly: true, showInList: true, showInForm: true },
      { name: 'short_description', label: 'Short Description', type: 'string', required: true, showInList: true, showInForm: true },
      { name: 'description', label: 'Description', type: 'text', showInForm: true },
      { name: 'status', label: 'Status', type: 'select', showInList: true, showInForm: true, options: [
        { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
        { value: 'blocked', label: 'Blocked' },
      ]},
      { name: 'priority', label: 'Priority', type: 'number', showInList: true, showInForm: true },
      { name: 'assigned_to', label: 'Assigned To', type: 'reference', reference: { table: 'users', display: 'username' }, showInList: true, showInForm: true },
      { name: 'assignment_group_id', label: 'Assignment Group', type: 'reference', reference: { table: 'assignment_groups', display: 'name' }, showInForm: true },
      { name: 'planned_start', label: 'Planned Start', type: 'datetime', showInForm: true },
      { name: 'planned_end', label: 'Planned End', type: 'datetime', showInForm: true },
      { name: 'estimated_hours', label: 'Estimated Hours', type: 'number', showInForm: true },
      { name: 'actual_hours', label: 'Actual Hours', type: 'number', showInForm: true },
      { name: 'percent_complete', label: '% Complete', type: 'number', showInList: true, showInForm: true },
    ],
    states: {
      initial: 'pending',
      transitions: {
        pending: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'blocked', 'cancelled'],
        blocked: ['in_progress', 'cancelled'],
        completed: [],
        cancelled: [],
      },
    },
  });
}
