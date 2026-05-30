import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Get sample users and incidents
  const users = await knex('users').limit(5);
  const incidents = await knex('incidents').limit(3);

  if (!users.length || !incidents.length) {
    console.log('Skipping incident tasks seed - insufficient test data');
    return;
  }

  const admin = users.find((u: any) => u.username === 'admin') || users[0];
  const beth = users.find((u: any) => u.username === 'beth') || users[1];
  const dave = users.find((u: any) => u.username === 'dave') || users[2];

  const incident1 = incidents[0];
  const incident2 = incidents[1];
  const incident3 = incidents[2];

  // Insert incident tasks
  const tasks = [
    // Tasks for incident 1
    {
      number: 'ITSK1',
      incident_id: incident1.id,
      parent_task_id: null,
      short_description: 'Investigate database connectivity',
      description: 'Check database connection logs and configuration',
      status: 'in_progress',
      priority: 1,
      assigned_to: dave?.id || null,
      percent_complete: 50,
      created_by: admin.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      number: 'ITSK2',
      incident_id: incident1.id,
      parent_task_id: null,
      short_description: 'Restart services',
      description: 'Restart affected services after investigation',
      status: 'pending',
      priority: 2,
      assigned_to: beth?.id || null,
      percent_complete: 0,
      created_by: admin.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Tasks for incident 2
    {
      number: 'ITSK3',
      incident_id: incident2.id,
      parent_task_id: null,
      short_description: 'Review error logs',
      description: 'Check application error logs for patterns',
      status: 'completed',
      priority: 1,
      assigned_to: beth?.id || null,
      percent_complete: 100,
      created_by: admin.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      number: 'ITSK4',
      incident_id: incident2.id,
      parent_task_id: null,
      short_description: 'Deploy hotfix',
      description: 'Deploy the prepared hotfix to production',
      status: 'pending',
      priority: 1,
      assigned_to: dave?.id || null,
      percent_complete: 0,
      created_by: admin.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    // Tasks for incident 3
    {
      number: 'ITSK5',
      incident_id: incident3.id,
      parent_task_id: null,
      short_description: 'Backup user data',
      description: 'Create backup of critical user data',
      status: 'in_progress',
      priority: 2,
      assigned_to: admin?.id || null,
      percent_complete: 75,
      created_by: admin.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      number: 'ITSK6',
      incident_id: incident3.id,
      parent_task_id: null,
      short_description: 'Notify stakeholders',
      description: 'Send status update to affected stakeholders',
      status: 'pending',
      priority: 3,
      assigned_to: beth?.id || null,
      percent_complete: 0,
      created_by: admin.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  // Clear existing incident tasks
  await knex('incident_tasks').del();

  // Insert new tasks
  await knex('incident_tasks').insert(tasks);

  // Reset sequence to prevent duplicates
  await knex.raw("SELECT setval('incident_task_number_seq', (SELECT MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER)) FROM incident_tasks) + 1)");

  console.log('Incident tasks seed completed');
}
