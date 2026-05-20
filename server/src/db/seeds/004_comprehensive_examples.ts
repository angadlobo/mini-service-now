import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Only seed if change_templates table exists and is empty
  const hasTable = await knex.schema.hasTable('change_templates');
  if (!hasTable) return;
  const existing = await knex('change_templates').first();
  if (existing) return;

  // ── Lookup existing records ──────────────────────────
  const admin = await knex('users').where('username', 'admin').first();
  const itilUser = await knex('users').where('username', 'itil.user').first();
  const approver = await knex('users').where('username', 'approver').first();
  const beth = await knex('users').where('username', 'beth.service').first();
  const charlie = await knex('users').where('username', 'charlie.ops').first();
  const diana = await knex('users').where('username', 'diana.dev').first();
  const endUser = await knex('users').where('username', 'end.user').first();
  const kbManager = await knex('users').where('username', 'kb.manager').first();
  if (!admin || !itilUser || !approver || !beth || !charlie) return;

  const serviceDesk = await knex('assignment_groups').where('name', 'Service Desk').first();
  const networkOps = await knex('assignment_groups').where('name', 'Network Operations').first();
  const devOps = await knex('assignment_groups').where('name', 'DevOps').first();
  const security = await knex('assignment_groups').where('name', 'Security').first();

  const chg1001 = await knex('changes').where('number', 'CHG1001').first();
  const chg1002 = await knex('changes').where('number', 'CHG1002').first();
  const chg1003 = await knex('changes').where('number', 'CHG1003').first();
  const chg1004 = await knex('changes').where('number', 'CHG1004').first();
  const chg1005 = await knex('changes').where('number', 'CHG1005').first();

  const inc1001 = await knex('incidents').where('number', 'INC1001').first();
  const inc1002 = await knex('incidents').where('number', 'INC1002').first();
  const inc1006 = await knex('incidents').where('number', 'INC1006').first();
  const inc1008 = await knex('incidents').where('number', 'INC1008').first();
  const inc1010 = await knex('incidents').where('number', 'INC1010').first();

  const prb1000 = await knex('problems').where('number', 'PRB1000').first();
  const prb1001 = await knex('problems').where('number', 'PRB1001').first();

  const ciWeb1 = await knex('cis').where('name', 'WEB-PROD-01').first();
  const ciWeb2 = await knex('cis').where('name', 'WEB-PROD-02').first();
  const ciDb1 = await knex('cis').where('name', 'DB-PROD-01').first();
  const ciFw1 = await knex('cis').where('name', 'FW-EDGE-01').first();
  const ciApp1 = await knex('cis').where('name', 'ERP System').first();
  const ciMail1 = await knex('cis').where('name', 'MAIL-PROD-01').first();

  const formTemplate = await knex('form_templates').where('name', 'Employee Onboarding Request').first();

  // ── Additional Users ───────────────────────────────────
  const newUserIds = { frank: uuid(), grace: uuid(), hector: uuid() };
  const itilRole = await knex('roles').where('name', 'itil').first();
  const userRole = await knex('roles').where('name', 'user').first();
  const approverRole = await knex('roles').where('name', 'approver').first();

  const hash = (pw: string) => bcrypt.hashSync(pw, 12);

  await knex('users').insert([
    { id: newUserIds.frank, username: 'frank.network', email: 'frank@example.com', password_hash: hash('frank123'), first_name: 'Frank', last_name: 'Reynolds' },
    { id: newUserIds.grace, username: 'grace.sec', email: 'grace@example.com', password_hash: hash('grace123'), first_name: 'Grace', last_name: 'Hopper' },
    { id: newUserIds.hector, username: 'hector.mgr', email: 'hector@example.com', password_hash: hash('hector123'), first_name: 'Hector', last_name: 'Ramirez' },
  ]);

  await knex('user_roles').insert([
    { user_id: newUserIds.frank, role_id: itilRole!.id },
    { user_id: newUserIds.grace, role_id: itilRole!.id },
    { user_id: newUserIds.grace, role_id: approverRole!.id },
    { user_id: newUserIds.hector, role_id: approverRole!.id },
    { user_id: newUserIds.hector, role_id: itilRole!.id },
  ]);

  await knex('group_members').insert([
    { user_id: newUserIds.frank, group_id: networkOps!.id },
    { user_id: newUserIds.grace, group_id: security!.id },
    { user_id: newUserIds.hector, group_id: devOps!.id },
  ]);

  // ══════════════════════════════════════════════════════
  //  1. CHANGE TEMPLATES
  // ══════════════════════════════════════════════════════
  const tmplIds = { std1: uuid(), std2: uuid(), std3: uuid(), norm1: uuid(), norm2: uuid(), emrg1: uuid() };

  await knex('change_templates').insert([
    {
      id: tmplIds.std1, name: 'Standard Server Patching', description: 'Monthly OS security patches for Windows and Linux servers. Pre-approved for low-risk patching during maintenance windows.',
      type: 'standard', category: 'Infrastructure', risk: 'low', impact: 'low', priority: 4,
      change_plan: 'Apply latest security patches from approved patch list to all servers in the target environment.',
      implementation_plan: '1. Take snapshot/backup\n2. Apply patches in dev environment\n3. Verify services after patching\n4. Apply patches in staging\n5. Verify staging\n6. Apply to production in rolling fashion\n7. Verify all services',
      test_plan: '1. Verify all critical services are running\n2. Run smoke tests against each patched server\n3. Check system logs for errors\n4. Validate monitoring dashboards',
      communication_plan: 'Send notification to affected teams 48 hours before maintenance window. Send completion notification within 1 hour of finish.',
      rollback_plan: 'Restore from pre-patch snapshot. Estimated rollback time: 30 minutes per server.',
      backout_plan: 'Revert snapshots taken before patching. Notify teams of rollback.',
      justification: 'Monthly security compliance requirement.',
      default_assignment_group_id: devOps?.id, pre_approved: true, cab_required: false, active: true, created_by: admin.id,
    },
    {
      id: tmplIds.std2, name: 'Standard Firewall Rule Update', description: 'Add or modify firewall rules for approved application traffic. Pre-approved for standard rule additions.',
      type: 'standard', category: 'Network', risk: 'low', impact: 'low', priority: 4,
      implementation_plan: '1. Document current rule set\n2. Add new rules in staging firewall\n3. Test connectivity\n4. Apply to production firewall\n5. Verify traffic flow',
      test_plan: 'Verify affected application can communicate through the firewall. Run port scan to confirm only expected ports are open.',
      rollback_plan: 'Remove newly added rules and restore previous rule set from backup.',
      backout_plan: 'Revert firewall configuration to pre-change backup.',
      default_assignment_group_id: networkOps?.id, pre_approved: true, cab_required: false, active: true, created_by: charlie.id,
    },
    {
      id: tmplIds.std3, name: 'Standard SSL Certificate Renewal', description: 'Renew and deploy SSL/TLS certificates before expiration. Pre-approved standard change.',
      type: 'standard', category: 'Security', risk: 'low', impact: 'moderate', priority: 3,
      implementation_plan: '1. Generate CSR\n2. Submit to CA\n3. Validate certificate\n4. Deploy to load balancer/web server\n5. Verify HTTPS connectivity\n6. Update certificate inventory',
      test_plan: 'Verify HTTPS connections work. Check certificate chain is valid. Confirm no mixed content warnings.',
      rollback_plan: 'Restore previous certificate from vault. Certificates have 24-hour overlap to allow rollback.',
      backout_plan: 'Re-deploy the old certificate from the certificate vault.',
      default_assignment_group_id: security?.id, pre_approved: true, cab_required: false, active: true, created_by: approver.id,
    },
    {
      id: tmplIds.norm1, name: 'Database Schema Migration', description: 'Apply database schema changes for application releases. Requires CAB approval due to potential data impact.',
      type: 'normal', category: 'Database', risk: 'high', impact: 'high', priority: 2,
      change_plan: 'Apply schema migration scripts generated by the ORM against the target database environment.',
      implementation_plan: '1. Run migration in dev\n2. Run full regression suite\n3. Run migration in staging with production data copy\n4. Performance test\n5. Schedule production window\n6. Take full backup\n7. Run migration\n8. Verify application\n9. Run smoke tests',
      test_plan: '1. All unit tests pass\n2. Integration tests pass\n3. Query performance benchmarks within 10% of baseline\n4. Application smoke tests pass\n5. Data integrity checks pass',
      communication_plan: 'Notify all application owners 1 week before. Send go/no-go decision 2 hours before. Send completion status to all stakeholders.',
      rollback_plan: 'Restore database from pre-migration backup. Estimated restore time: 45 minutes for production database.',
      backout_plan: 'Run down migration script. If script fails, restore from backup.',
      justification: 'Required for application release.',
      default_assignment_group_id: devOps?.id, default_approvers: JSON.stringify([approver.id, newUserIds.hector]),
      pre_approved: false, cab_required: true, active: true, created_by: beth.id,
    },
    {
      id: tmplIds.norm2, name: 'Network Switch Replacement', description: 'Replace end-of-life network switches with new hardware. Requires CAB approval due to potential service disruption.',
      type: 'normal', category: 'Network', risk: 'high', impact: 'high', priority: 2,
      implementation_plan: '1. Pre-stage replacement switch with matching config\n2. Notify affected users\n3. Disconnect old switch during maintenance window\n4. Install and cable new switch\n5. Verify port connectivity and VLANs\n6. Run network tests\n7. Monitor for 2 hours',
      test_plan: 'Ping sweep all connected devices. Verify VLAN tagging. Check spanning tree convergence. Verify inter-VLAN routing.',
      rollback_plan: 'Re-install old switch from storage (kept on-site for 30 days post-replacement).',
      backout_plan: 'Reconnect old switch. Pre-staged config ensures swap can be done in under 30 minutes.',
      default_assignment_group_id: networkOps?.id, default_approvers: JSON.stringify([approver.id]),
      pre_approved: false, cab_required: true, active: true, created_by: charlie.id,
    },
    {
      id: tmplIds.emrg1, name: 'Emergency Security Patch', description: 'Expedited deployment of critical security patches for zero-day or actively exploited vulnerabilities.',
      type: 'emergency', category: 'Security', risk: 'high', impact: 'high', priority: 1,
      implementation_plan: '1. Validate patch from vendor\n2. Test on isolated system\n3. Deploy immediately to all affected systems\n4. Verify services\n5. Scan for IOCs',
      test_plan: 'Quick verification of critical services. Extended testing deferred to next business day.',
      rollback_plan: 'Restore from pre-patch snapshots. Accept risk of vulnerability exposure during rollback period.',
      backout_plan: 'Snapshot restore within 15 minutes.',
      justification: 'Active exploitation of vulnerability in the wild.',
      default_assignment_group_id: security?.id, default_approvers: JSON.stringify([admin.id]),
      pre_approved: false, cab_required: false, active: true, created_by: admin.id,
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  2. MAINTENANCE WINDOWS
  // ══════════════════════════════════════════════════════
  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + (7 - now.getDay()));
  nextSunday.setHours(2, 0, 0, 0);
  const nextSundayEnd = new Date(nextSunday);
  nextSundayEnd.setHours(6, 0, 0, 0);

  const firstSatNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  while (firstSatNextMonth.getDay() !== 6) firstSatNextMonth.setDate(firstSatNextMonth.getDate() + 1);
  firstSatNextMonth.setHours(22, 0, 0, 0);
  const firstSatNextMonthEnd = new Date(firstSatNextMonth);
  firstSatNextMonthEnd.setDate(firstSatNextMonthEnd.getDate() + 1);
  firstSatNextMonthEnd.setHours(4, 0, 0, 0);

  await knex('maintenance_windows').insert([
    {
      name: 'Weekly Server Patching Window',
      description: 'Weekly maintenance window for server patching and minor updates. Every Sunday 2:00 AM - 6:00 AM.',
      start_time: nextSunday.toISOString(),
      end_time: nextSundayEnd.toISOString(),
      recurrence: 'weekly',
      recurrence_config: JSON.stringify({ dayOfWeek: 0, startHour: 2, endHour: 6 }),
      active: true, created_by: admin.id,
    },
    {
      name: 'Monthly Network Maintenance',
      description: 'Monthly window for network equipment maintenance, firmware updates, and configuration changes. First Saturday of each month, 10:00 PM - 4:00 AM.',
      start_time: firstSatNextMonth.toISOString(),
      end_time: firstSatNextMonthEnd.toISOString(),
      recurrence: 'monthly',
      recurrence_config: JSON.stringify({ weekOfMonth: 1, dayOfWeek: 6, startHour: 22, endHour: 4 }),
      active: true, created_by: charlie.id,
    },
    {
      name: 'Quarterly Database Maintenance',
      description: 'Quarterly window for database maintenance, index rebuilds, and major upgrades.',
      start_time: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 15, 1, 0).toISOString(),
      end_time: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 15, 7, 0).toISOString(),
      recurrence: 'quarterly',
      recurrence_config: JSON.stringify({ dayOfQuarter: 15, startHour: 1, endHour: 7 }),
      active: true, created_by: beth.id,
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  3. BLACKOUT WINDOWS
  // ══════════════════════════════════════════════════════
  await knex('blackout_windows').insert([
    {
      name: 'End of Quarter Freeze',
      reason: 'No changes permitted during end-of-quarter financial processing. Finance systems must remain stable for month-end close and reporting.',
      start_time: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 2, 25, 0, 0).toISOString(),
      end_time: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 3, 0, 0).toISOString(),
      severity: 'hard', active: true, created_by: admin.id,
    },
    {
      name: 'Holiday Code Freeze',
      reason: 'Annual holiday code freeze. No production changes except critical security patches (emergency changes only).',
      start_time: new Date(now.getFullYear(), 11, 20, 0, 0).toISOString(),
      end_time: new Date(now.getFullYear() + 1, 0, 3, 0, 0).toISOString(),
      severity: 'soft', active: true, created_by: admin.id,
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  4. CAB MEETINGS
  // ══════════════════════════════════════════════════════
  const cabIds = { cab1: uuid(), cab2: uuid(), cab3: uuid() };

  // Past meeting (completed)
  const lastWednesday = new Date(now);
  lastWednesday.setDate(now.getDate() - ((now.getDay() + 4) % 7));
  lastWednesday.setHours(10, 0, 0, 0);

  // Upcoming meeting
  const nextWednesday = new Date(lastWednesday);
  nextWednesday.setDate(lastWednesday.getDate() + 7);

  // Future meeting
  const futureWednesday = new Date(nextWednesday);
  futureWednesday.setDate(nextWednesday.getDate() + 7);

  await knex('cab_meetings').insert([
    {
      id: cabIds.cab1, title: 'Weekly CAB Review - Past',
      description: 'Regular weekly Change Advisory Board meeting to review and approve pending changes.',
      scheduled_date: lastWednesday.toISOString(), duration_minutes: 60, state: 'completed',
      attendees: JSON.stringify([admin.id, approver.id, charlie.id, beth.id, newUserIds.hector]),
      minutes: 'Reviewed CHG1002 network switch replacement — approved with condition to schedule during maintenance window.\nReviewed CHG1005 email migration — deferred pending additional risk analysis.\nAction item: Beth to provide updated test plan for PG16 upgrade (CHG1001).',
      location: 'Conference Room A / Teams', chair_id: admin.id, created_by: admin.id,
    },
    {
      id: cabIds.cab2, title: 'Weekly CAB Review',
      description: 'Regular weekly Change Advisory Board meeting to review and approve pending changes.',
      scheduled_date: nextWednesday.toISOString(), duration_minutes: 60, state: 'scheduled',
      attendees: JSON.stringify([admin.id, approver.id, charlie.id, beth.id, newUserIds.grace, newUserIds.hector]),
      minutes: null,
      location: 'Conference Room A / Teams', chair_id: admin.id, created_by: admin.id,
    },
    {
      id: cabIds.cab3, title: 'Emergency CAB - Security Patch Review',
      description: 'Emergency CAB session to review and authorize the emergency SSL certificate rotation (CHG1004).',
      scheduled_date: new Date(now.getTime() - 2 * 86400000).toISOString(), duration_minutes: 30, state: 'completed',
      attendees: JSON.stringify([admin.id, approver.id, newUserIds.grace]),
      minutes: 'Emergency change CHG1004 reviewed and approved. Grace confirmed all CAs have been verified. Rotation to proceed immediately.',
      location: 'Teams (emergency call)', chair_id: admin.id, created_by: admin.id,
    },
  ]);

  // ── CAB Agenda Items ──
  if (chg1002) {
    await knex('cab_agenda_items').insert([
      { cab_meeting_id: cabIds.cab1, change_id: chg1002.id, order: 1, decision: 'approved', discussion_notes: 'Approved. Must be scheduled during the monthly network maintenance window. Frank to assist with cabling.', votes: JSON.stringify({ [admin.id]: 'approve', [approver.id]: 'approve', [charlie.id]: 'approve', [beth.id]: 'approve' }) },
    ]);
  }
  if (chg1005) {
    await knex('cab_agenda_items').insert([
      { cab_meeting_id: cabIds.cab1, change_id: chg1005.id, order: 2, decision: 'deferred', discussion_notes: 'Deferred — need more detail on data migration plan and rollback strategy for mailbox data. Revisit next week.', votes: JSON.stringify({ [admin.id]: 'abstain', [approver.id]: 'reject', [charlie.id]: 'abstain', [beth.id]: 'approve' }) },
    ]);
  }
  if (chg1001) {
    await knex('cab_agenda_items').insert([
      { cab_meeting_id: cabIds.cab2, change_id: chg1001.id, order: 1, decision: null, discussion_notes: null, votes: JSON.stringify({}) },
    ]);
  }
  if (chg1004) {
    await knex('cab_agenda_items').insert([
      { cab_meeting_id: cabIds.cab3, change_id: chg1004.id, order: 1, decision: 'approved', discussion_notes: 'Emergency approval granted. All impacted services identified.', votes: JSON.stringify({ [admin.id]: 'approve', [approver.id]: 'approve', [newUserIds.grace]: 'approve' }) },
    ]);
  }

  // ══════════════════════════════════════════════════════
  //  5. CHANGE-AFFECTED CIs
  // ══════════════════════════════════════════════════════
  const affectedCis: any[] = [];
  if (chg1001 && ciDb1) affectedCis.push({ change_id: chg1001.id, ci_id: ciDb1.id, relationship_type: 'target', notes: 'Primary database server being upgraded to PG16' });
  if (chg1001 && ciApp1) affectedCis.push({ change_id: chg1001.id, ci_id: ciApp1.id, relationship_type: 'impacted', notes: 'ERP system depends on this database' });
  if (chg1002 && ciFw1) affectedCis.push({ change_id: chg1002.id, ci_id: ciFw1.id, relationship_type: 'affected', notes: 'Firewall connected to switches being replaced' });
  if (chg1002 && ciWeb1) affectedCis.push({ change_id: chg1002.id, ci_id: ciWeb1.id, relationship_type: 'impacted', notes: 'Web server connected through Building A switches' });
  if (chg1002 && ciWeb2) affectedCis.push({ change_id: chg1002.id, ci_id: ciWeb2.id, relationship_type: 'impacted', notes: 'Web server connected through Building A switches' });
  if (chg1004 && ciWeb1) affectedCis.push({ change_id: chg1004.id, ci_id: ciWeb1.id, relationship_type: 'target', notes: 'SSL certificate rotation on web server' });
  if (chg1004 && ciWeb2) affectedCis.push({ change_id: chg1004.id, ci_id: ciWeb2.id, relationship_type: 'target', notes: 'SSL certificate rotation on web server' });
  if (chg1005 && ciMail1) affectedCis.push({ change_id: chg1005.id, ci_id: ciMail1.id, relationship_type: 'target', notes: 'Mail server being migrated to cloud' });

  if (affectedCis.length > 0) await knex('change_affected_cis').insert(affectedCis);

  // ══════════════════════════════════════════════════════
  //  6. CHANGE-INCIDENT & CHANGE-PROBLEM LINKING
  // ══════════════════════════════════════════════════════
  const changeIncidents: any[] = [];
  if (chg1004 && inc1010) changeIncidents.push({ change_id: chg1004.id, incident_id: inc1010.id, relationship: 'caused_by' });
  if (chg1005 && inc1001) changeIncidents.push({ change_id: chg1005.id, incident_id: inc1001.id, relationship: 'related_to' });
  if (chg1002 && inc1002) changeIncidents.push({ change_id: chg1002.id, incident_id: inc1002.id, relationship: 'related_to' });
  if (chg1001 && inc1006) changeIncidents.push({ change_id: chg1001.id, incident_id: inc1006.id, relationship: 'related_to' });
  if (changeIncidents.length > 0) await knex('change_incidents').insert(changeIncidents);

  const changeProblems: any[] = [];
  if (chg1005 && prb1000) changeProblems.push({ change_id: chg1005.id, problem_id: prb1000.id, relationship: 'addresses' });
  if (chg1002 && prb1001) changeProblems.push({ change_id: chg1002.id, problem_id: prb1001.id, relationship: 'addresses' });
  if (changeProblems.length > 0) await knex('change_problems').insert(changeProblems);

  // ══════════════════════════════════════════════════════
  //  7. CHANGE APPROVAL RULES
  // ══════════════════════════════════════════════════════
  await knex('change_approval_rules').insert([
    { name: 'High-Risk Normal Changes - CAB Required', change_type: 'normal', risk_level: 'high', impact_level: null, approver_ids: JSON.stringify([approver.id]), approver_group_id: null, cab_required: true, approval_order: 1, approval_type: 'all', active: true, created_by: admin.id },
    { name: 'Moderate-Risk Normal Changes - Manager Approval', change_type: 'normal', risk_level: 'moderate', impact_level: null, approver_ids: JSON.stringify([approver.id, newUserIds.hector]), approver_group_id: null, cab_required: false, approval_order: 1, approval_type: 'any', active: true, created_by: admin.id },
    { name: 'Emergency Changes - Admin Approval', change_type: 'emergency', risk_level: null, impact_level: null, approver_ids: JSON.stringify([admin.id]), approver_group_id: null, cab_required: false, approval_order: 1, approval_type: 'any', active: true, created_by: admin.id },
    { name: 'Security Impact Changes - Security Team Review', change_type: 'normal', risk_level: null, impact_level: 'high', approver_ids: JSON.stringify([]), approver_group_id: security?.id, cab_required: true, approval_order: 2, approval_type: 'all', active: true, created_by: admin.id },
  ]);

  // ══════════════════════════════════════════════════════
  //  8. MORE APPROVALS (catalog requests + changes)
  // ══════════════════════════════════════════════════════
  // Approval for CHG1005 (email migration — still pending)
  if (chg1005) {
    await knex('approvals').insert([
      { table_name: 'changes', record_id: chg1005.id, approver_id: approver.id, state: 'requested' },
      { table_name: 'changes', record_id: chg1005.id, approver_id: newUserIds.hector, state: 'requested' },
    ]);
  }
  // Approval for CHG1003 (standard — already approved automatically)
  if (chg1003) {
    await knex('approvals').insert([
      { table_name: 'changes', record_id: chg1003.id, approver_id: admin.id, state: 'approved', decided_at: new Date().toISOString(), comments: 'Standard change - pre-approved per template' },
    ]);
  }
  // Catalog request approvals
  const req1001 = await knex('sc_requests').where('number', 'REQ1001').first();
  const req1002 = await knex('sc_requests').where('number', 'REQ1002').first();
  if (req1001) {
    await knex('approvals').insert({ table_name: 'sc_requests', record_id: req1001.id, approver_id: newUserIds.hector, state: 'approved', decided_at: new Date().toISOString(), comments: 'Approved - developer laptop justified for ML work' });
  }
  if (req1002) {
    await knex('approvals').insert({ table_name: 'sc_requests', record_id: req1002.id, approver_id: approver.id, state: 'requested' });
  }

  // ══════════════════════════════════════════════════════
  //  9. ADDITIONAL INCIDENTS
  // ══════════════════════════════════════════════════════
  const newIncidents = [
    { number: 'INC1013', short_description: 'Production API returning 500 errors', description: 'REST API /api/orders endpoint returning HTTP 500 for all POST requests since 14:30. Affecting order processing for all customers.', state: 'in_progress', priority: 1, urgency: 1, impact: 1, caller_id: beth.id, assigned_to: beth.id, assignment_group_id: devOps?.id, created_by: beth.id },
    { number: 'INC1014', short_description: 'Backup job failed on DB-PROD-01', description: 'Nightly backup job for production database failed at 03:15 AM. Error: insufficient disk space on backup volume.', state: 'new', priority: 2, urgency: 2, impact: 1, caller_id: charlie.id, assignment_group_id: devOps?.id, created_by: charlie.id },
    { number: 'INC1015', short_description: 'Active Directory replication lag', description: 'AD replication between DC1 and DC2 has 45+ minute lag. User account changes not propagating.', state: 'in_progress', priority: 2, urgency: 1, impact: 2, caller_id: newUserIds.frank, assigned_to: newUserIds.frank, assignment_group_id: networkOps?.id, created_by: newUserIds.frank },
    { number: 'INC1016', short_description: 'Slow internet connectivity in Building B', description: 'All users in Building B reporting slow internet. Speed tests showing 5 Mbps (normally 500 Mbps). Started after lunch.', state: 'new', priority: 3, urgency: 2, impact: 2, caller_id: endUser?.id, assignment_group_id: networkOps?.id, created_by: endUser?.id },
    { number: 'INC1017', short_description: 'Citrix session disconnects', description: 'Citrix virtual desktop sessions disconnecting randomly. Affects 20+ remote workers. Sessions last about 10 minutes before dropping.', state: 'in_progress', priority: 2, urgency: 1, impact: 2, caller_id: diana?.id, assigned_to: newUserIds.frank, assignment_group_id: networkOps?.id, created_by: diana?.id },
    { number: 'INC1018', short_description: 'Unable to print to network printers', description: 'Print jobs queued but never print. Affecting all network printers on floor 2. Local USB printing works fine.', state: 'resolved', priority: 4, urgency: 3, impact: 2, caller_id: endUser?.id, assigned_to: itilUser.id, assignment_group_id: serviceDesk?.id, created_by: endUser?.id, resolved_at: new Date().toISOString(), resolution_notes: 'Print spooler service had crashed on print server. Restarted service and cleared stuck jobs.' },
    { number: 'INC1019', short_description: 'DDoS attack detected on public website', description: 'WAF detecting abnormally high traffic pattern consistent with DDoS. Website response times degraded to 15+ seconds.', state: 'in_progress', priority: 1, urgency: 1, impact: 1, caller_id: newUserIds.grace, assigned_to: newUserIds.grace, assignment_group_id: security?.id, created_by: newUserIds.grace },
    { number: 'INC1020', short_description: 'Disk space critical on WEB-PROD-01', description: 'Monitoring alert: /var/log partition at 95% capacity. Log rotation appears to have stopped 3 days ago.', state: 'new', priority: 3, urgency: 2, impact: 2, caller_id: beth.id, assignment_group_id: devOps?.id, created_by: beth.id },
  ];

  for (const inc of newIncidents) {
    await knex('incidents').insert(inc);
  }
  await knex.raw("SELECT setval('incident_number_seq', 1020)");

  // Journal entries for new incidents
  const inc1013 = await knex('incidents').where('number', 'INC1013').first();
  const inc1019 = await knex('incidents').where('number', 'INC1019').first();
  if (inc1013) {
    await knex('sys_journal').insert([
      { table_name: 'incidents', record_id: inc1013.id, type: 'comment', body: 'All POST requests to /api/orders are failing. GET requests work fine. Started right after deployment v2.4.1.', created_by: beth.id },
      { table_name: 'incidents', record_id: inc1013.id, type: 'work_note', body: 'Identified issue: migration script missed adding NOT NULL constraint. Rolling back deployment now.', created_by: beth.id },
      { table_name: 'incidents', record_id: inc1013.id, type: 'work_note', body: 'Rollback to v2.4.0 complete. Orders processing again. Will hotfix the migration and redeploy.', created_by: beth.id },
    ]);
  }
  if (inc1019) {
    await knex('sys_journal').insert([
      { table_name: 'incidents', record_id: inc1019.id, type: 'work_note', body: 'Enabled rate limiting on WAF. Blocked top 50 source IPs. Traffic pattern is UDP flood targeting port 443.', created_by: newUserIds.grace },
      { table_name: 'incidents', record_id: inc1019.id, type: 'work_note', body: 'Engaged Cloudflare DDoS mitigation. Attack traffic being scrubbed. Clean traffic flowing. Monitoring.', created_by: newUserIds.grace },
    ]);
  }

  // ══════════════════════════════════════════════════════
  //  10. ADDITIONAL CHANGES
  // ══════════════════════════════════════════════════════
  const newChanges = [
    { number: 'CHG1006', short_description: 'Deploy API hotfix v2.4.2', description: 'Hotfix for the database migration issue that caused INC1013. Fixes NOT NULL constraint in orders table.', state: 'implement', type: 'emergency', risk: 'moderate', priority: 2, assigned_to: beth.id, assignment_group_id: devOps?.id, planned_start: new Date().toISOString(), planned_end: new Date(Date.now() + 4 * 3600000).toISOString(), backout_plan: 'Rollback to v2.4.0 (already proven to work)', justification: 'Fix production outage caused by INC1013', created_by: beth.id },
    { number: 'CHG1007', short_description: 'Expand backup storage volume', description: 'Extend /backup LVM volume by 500GB to prevent future backup failures (ref INC1014).', state: 'scheduled', type: 'normal', risk: 'low', priority: 3, assigned_to: newUserIds.hector, assignment_group_id: devOps?.id, planned_start: new Date(Date.now() + 3 * 86400000).toISOString(), planned_end: new Date(Date.now() + 3.1 * 86400000).toISOString(), backout_plan: 'No rollback needed - additive change', justification: 'Backup storage at capacity, nightly backups failing', created_by: newUserIds.hector },
    { number: 'CHG1008', short_description: 'Upgrade Citrix VDA to version 2402', description: 'Upgrade Citrix Virtual Delivery Agent on all session hosts to address disconnection issues (ref INC1017).', state: 'assess', type: 'normal', risk: 'moderate', priority: 2, assigned_to: newUserIds.frank, assignment_group_id: networkOps?.id, planned_start: new Date(Date.now() + 10 * 86400000).toISOString(), planned_end: new Date(Date.now() + 10.5 * 86400000).toISOString(), backout_plan: 'Uninstall VDA 2402, reinstall VDA 2311 from cached installer', justification: 'Known bug in VDA 2311 causing session drops - fixed in 2402', created_by: newUserIds.frank },
    { number: 'CHG1009', short_description: 'Implement log rotation on web servers', description: 'Configure logrotate for all web server log directories. Daily rotation, 30-day retention, compressed archives.', state: 'new', type: 'standard', risk: 'low', priority: 4, assigned_to: beth.id, assignment_group_id: devOps?.id, backout_plan: 'Remove logrotate config files', justification: 'Prevent disk space incidents (ref INC1020)', created_by: beth.id },
    { number: 'CHG1010', short_description: 'WAF rule tuning - DDoS protection', description: 'Update WAF rules and rate limiting thresholds based on DDoS attack analysis from INC1019.', state: 'authorize', type: 'normal', risk: 'moderate', priority: 2, assigned_to: newUserIds.grace, assignment_group_id: security?.id, planned_start: new Date(Date.now() + 5 * 86400000).toISOString(), planned_end: new Date(Date.now() + 5.25 * 86400000).toISOString(), backout_plan: 'Restore previous WAF rule set from backup', justification: 'Harden defenses against future DDoS attacks based on recent attack patterns', created_by: newUserIds.grace },
  ];

  for (const chg of newChanges) {
    await knex('changes').insert(chg);
  }
  await knex.raw("SELECT setval('change_number_seq', 1010)");

  // Approvals for new changes
  const chg1006 = await knex('changes').where('number', 'CHG1006').first();
  const chg1007 = await knex('changes').where('number', 'CHG1007').first();
  const chg1010c = await knex('changes').where('number', 'CHG1010').first();
  if (chg1006) {
    await knex('approvals').insert({ table_name: 'changes', record_id: chg1006.id, approver_id: admin.id, state: 'approved', decided_at: new Date().toISOString(), comments: 'Emergency approved - production down' });
  }
  if (chg1007) {
    await knex('approvals').insert({ table_name: 'changes', record_id: chg1007.id, approver_id: newUserIds.hector, state: 'approved', decided_at: new Date().toISOString(), comments: 'Low risk additive change. Approved.' });
  }
  if (chg1010c) {
    await knex('approvals').insert([
      { table_name: 'changes', record_id: chg1010c.id, approver_id: approver.id, state: 'requested' },
      { table_name: 'changes', record_id: chg1010c.id, approver_id: newUserIds.grace, state: 'approved', decided_at: new Date().toISOString(), comments: 'I authored this change - security team lead approval.' },
    ]);
  }

  // ══════════════════════════════════════════════════════
  //  11. ADDITIONAL CMDB ITEMS
  // ══════════════════════════════════════════════════════
  const serverType = await knex('ci_types').where('name', 'Server').first();
  const networkType = await knex('ci_types').where('name', 'Network Device').first();
  const appType = await knex('ci_types').where('name', 'Application').first();
  const dbType = await knex('ci_types').where('name', 'Database').first();
  const storageType = await knex('ci_types').where('name', 'Storage').first();

  const newCiIds = { lb1: uuid(), sw1: uuid(), sw2: uuid(), san1: uuid(), citrix1: uuid(), waf1: uuid(), ad1: uuid(), ad2: uuid(), backupSrv: uuid(), printSrv: uuid() };

  await knex('cis').insert([
    { id: newCiIds.lb1, number: 'CI1006', ci_type_id: networkType?.id, name: 'LB-PROD-01', serial_number: 'F5-2024-001', status: 'active', location: 'DC1 - Rack A1', cost: 25000, created_by: admin.id },
    { id: newCiIds.sw1, number: 'CI1007', ci_type_id: networkType?.id, name: 'SW-BLDGA-01', serial_number: 'CISCO-3750-001', status: 'active', location: 'Building A - MDF', cost: 5000, created_by: charlie.id },
    { id: newCiIds.sw2, number: 'CI1008', ci_type_id: networkType?.id, name: 'SW-BLDGB-01', serial_number: 'CISCO-3750-002', status: 'active', location: 'Building B - MDF', cost: 5000, created_by: charlie.id },
    { id: newCiIds.san1, number: 'CI1009', ci_type_id: storageType?.id, name: 'SAN-PROD-01', serial_number: 'NTAP-2024-001', status: 'active', location: 'DC1 - Rack B3', cost: 80000, created_by: admin.id },
    { id: newCiIds.citrix1, number: 'CI1010', ci_type_id: appType?.id, name: 'Citrix Virtual Desktop', status: 'active', location: 'DC1', cost: 0, created_by: newUserIds.frank },
    { id: newCiIds.waf1, number: 'CI1011', ci_type_id: networkType?.id, name: 'WAF-PROD-01', serial_number: 'CF-WAF-001', status: 'active', location: 'Cloud (Cloudflare)', cost: 3600, created_by: newUserIds.grace },
    { id: newCiIds.ad1, number: 'CI1012', ci_type_id: serverType?.id, name: 'AD-DC1-01', serial_number: 'SRV-2024-030', status: 'active', location: 'DC1 - Rack C1', cost: 9000, created_by: admin.id },
    { id: newCiIds.ad2, number: 'CI1013', ci_type_id: serverType?.id, name: 'AD-DC2-01', serial_number: 'SRV-2024-031', status: 'active', location: 'DC2 - Rack C1', cost: 9000, created_by: admin.id },
    { id: newCiIds.backupSrv, number: 'CI1014', ci_type_id: serverType?.id, name: 'BACKUP-PROD-01', serial_number: 'SRV-2024-040', status: 'active', location: 'DC1 - Rack D1', cost: 12000, created_by: admin.id },
    { id: newCiIds.printSrv, number: 'CI1015', ci_type_id: serverType?.id, name: 'PRINT-SRV-01', serial_number: 'SRV-2024-050', status: 'active', location: 'Building A - Server Room', cost: 3000, created_by: admin.id },
  ]);

  await knex('ci_relationships').insert([
    { parent_ci_id: newCiIds.lb1, child_ci_id: ciWeb1?.id, type: 'connected_to' },
    { parent_ci_id: newCiIds.lb1, child_ci_id: ciWeb2?.id, type: 'connected_to' },
    { parent_ci_id: ciDb1?.id, child_ci_id: newCiIds.san1, type: 'depends_on' },
    { parent_ci_id: newCiIds.citrix1, child_ci_id: newCiIds.ad1, type: 'depends_on' },
    { parent_ci_id: newCiIds.citrix1, child_ci_id: newCiIds.ad2, type: 'depends_on' },
    { parent_ci_id: newCiIds.waf1, child_ci_id: newCiIds.lb1, type: 'connected_to' },
    { parent_ci_id: newCiIds.backupSrv, child_ci_id: newCiIds.san1, type: 'depends_on' },
    { parent_ci_id: ciApp1?.id, child_ci_id: newCiIds.lb1, type: 'depends_on' },
  ].filter(r => r.parent_ci_id && r.child_ci_id));

  await knex.raw("SELECT setval('ci_number_seq', 1016)");

  // ══════════════════════════════════════════════════════
  //  12. REPORTS
  // ══════════════════════════════════════════════════════
  const reportIds = { r1: uuid(), r2: uuid(), r3: uuid(), r4: uuid(), r5: uuid(), r6: uuid(), r7: uuid() };

  await knex('reports').insert([
    {
      id: reportIds.r1, name: 'Open Incidents by Priority', description: 'All open incidents grouped by priority level. Use to assess current workload and identify critical issues.',
      table_name: 'incidents',
      filters: JSON.stringify({ logic: 'AND', conditions: [{ field: 'state', operator: 'in', value: ['new', 'in_progress', 'on_hold'] }] }),
      columns: JSON.stringify(['number', 'short_description', 'priority', 'state', 'assigned_to', 'assignment_group_id', 'created_at']),
      chart_type: 'bar', is_public: true, created_by: admin.id,
    },
    {
      id: reportIds.r2, name: 'Incident Resolution Time', description: 'Resolved and closed incidents showing time from creation to resolution. Helps identify bottlenecks.',
      table_name: 'incidents',
      filters: JSON.stringify({ logic: 'AND', conditions: [{ field: 'state', operator: 'in', value: ['resolved', 'closed'] }] }),
      columns: JSON.stringify(['number', 'short_description', 'priority', 'created_at', 'resolved_at', 'assigned_to']),
      chart_type: 'table', is_public: true, created_by: itilUser.id,
    },
    {
      id: reportIds.r3, name: 'Changes by State and Risk', description: 'All changes showing current state and risk level. Provides overview of change pipeline.',
      table_name: 'changes',
      filters: JSON.stringify({ logic: 'AND', conditions: [] }),
      columns: JSON.stringify(['number', 'short_description', 'state', 'type', 'risk', 'priority', 'planned_start', 'assigned_to']),
      chart_type: 'pie', is_public: true, created_by: admin.id,
    },
    {
      id: reportIds.r4, name: 'P1/P2 Incidents - Last 30 Days', description: 'Critical and high priority incidents from the last 30 days. For management review and trend analysis.',
      table_name: 'incidents',
      filters: JSON.stringify({ logic: 'AND', conditions: [{ field: 'priority', operator: 'in', value: [1, 2] }, { field: 'created_at', operator: 'greater_than', value: new Date(Date.now() - 30 * 86400000).toISOString() }] }),
      columns: JSON.stringify(['number', 'short_description', 'priority', 'state', 'assigned_to', 'created_at', 'resolved_at']),
      chart_type: 'line', is_public: true, created_by: admin.id,
    },
    {
      id: reportIds.r5, name: 'CMDB Asset Inventory', description: 'Complete inventory of all active configuration items with type, location, and cost.',
      table_name: 'cis',
      filters: JSON.stringify({ logic: 'AND', conditions: [{ field: 'status', operator: 'equals', value: 'active' }] }),
      columns: JSON.stringify(['number', 'name', 'ci_type_id', 'status', 'location', 'serial_number', 'cost']),
      chart_type: 'table', is_public: true, created_by: admin.id,
    },
    {
      id: reportIds.r6, name: 'Open Problems', description: 'All problems not yet closed. Track root cause investigation progress.',
      table_name: 'problems',
      filters: JSON.stringify({ logic: 'AND', conditions: [{ field: 'state', operator: 'not_equals', value: 'closed' }] }),
      columns: JSON.stringify(['number', 'short_description', 'state', 'priority', 'assigned_to', 'root_cause', 'created_at']),
      chart_type: 'table', is_public: true, created_by: itilUser.id,
    },
    {
      id: reportIds.r7, name: 'Weekly Incident Volume', description: 'Incident creation trend by week. Shows workload patterns and helps with staffing decisions.',
      table_name: 'incidents',
      filters: JSON.stringify({ logic: 'AND', conditions: [] }),
      columns: JSON.stringify(['number', 'priority', 'state', 'created_at']),
      chart_type: 'line', is_public: true, created_by: admin.id,
    },
  ]);

  // Report schedules
  await knex('report_schedules').insert([
    { report_id: reportIds.r1, cron: '0 8 * * 1', format: 'csv', recipients: '{admin@example.com,itil@example.com}', active: true },
    { report_id: reportIds.r4, cron: '0 9 * * 5', format: 'csv', recipients: '{admin@example.com}', active: true },
    { report_id: reportIds.r5, cron: '0 6 1 * *', format: 'csv', recipients: '{admin@example.com,charlie@example.com}', active: true },
  ]);

  // ══════════════════════════════════════════════════════
  //  13. WORKFLOW RULES (more examples)
  // ══════════════════════════════════════════════════════
  const wfRules: any[] = [];
  const wfIds = { wf3: uuid(), wf4: uuid(), wf5: uuid(), wf6: uuid(), wf7: uuid() };

  wfRules.push(
    {
      id: wfIds.wf3, name: 'Auto-escalate P1 incidents after 30 minutes',
      table_name: 'incidents', trigger_event: 'record.updated',
      conditions: JSON.stringify({ logic: 'AND', conditions: [{ field: 'priority', operator: 'equals', value: 1 }, { field: 'state', operator: 'equals', value: 'new' }] }),
      actions: JSON.stringify([
        { type: 'escalate', config: { escalation_type: 'manager', reason: 'P1 incident unassigned for 30+ minutes' } },
        { type: 'send_notification', config: { title: 'P1 Escalation', body: 'P1 incident {{record.number}} has been escalated due to no assignment after 30 minutes' } },
      ]),
      active: true, execution_order: 30, created_by: admin.id,
      tags: JSON.stringify(['escalation', 'P1', 'critical']),
    },
    {
      id: wfIds.wf4, name: 'Notify assignee on incident assignment',
      table_name: 'incidents', trigger_event: 'record.updated',
      conditions: JSON.stringify({ logic: 'AND', conditions: [{ field: 'assigned_to', operator: 'not_equals', value: null }] }),
      actions: JSON.stringify([
        { type: 'send_notification', config: { title: 'Incident Assigned to You', body: 'Incident {{record.number}}: {{record.short_description}} has been assigned to you.' } },
      ]),
      active: true, execution_order: 15, created_by: admin.id,
      tags: JSON.stringify(['assignment', 'notification']),
    },
    {
      id: wfIds.wf5, name: 'Auto-create approval for high-risk changes',
      table_name: 'changes', trigger_event: 'record.created',
      conditions: JSON.stringify({ logic: 'AND', conditions: [{ field: 'risk', operator: 'equals', value: 'high' }] }),
      actions: JSON.stringify([
        { type: 'create_approval', config: { approver_ids: [approver.id], approval_type: 'all', wait_for_completion: false } },
        { type: 'create_journal_entry', config: { journal_type: 'work_note', body: 'Approval automatically requested for high-risk change.' } },
      ]),
      active: true, execution_order: 10, created_by: admin.id,
      tags: JSON.stringify(['changes', 'approval', 'high-risk']),
    },
    {
      id: wfIds.wf6, name: 'Send Slack notification on P1/P2 incidents',
      table_name: 'incidents', trigger_event: 'record.created',
      conditions: JSON.stringify({ logic: 'AND', conditions: [{ field: 'priority', operator: 'in', value: [1, 2] }] }),
      actions: JSON.stringify([
        { type: 'send_slack', config: { message_template: ':rotating_light: *{{record.number}}* - {{record.short_description}}\nPriority: P{{record.priority}} | State: {{record.state}}' } },
      ]),
      active: true, execution_order: 5, created_by: admin.id,
      tags: JSON.stringify(['slack', 'notification', 'P1', 'P2']),
    },
    {
      id: wfIds.wf7, name: 'Auto-close resolved incidents after 5 days',
      table_name: 'incidents', trigger_event: 'record.updated',
      conditions: JSON.stringify({ logic: 'AND', conditions: [{ field: 'state', operator: 'equals', value: 'resolved' }] }),
      actions: JSON.stringify([
        { type: 'delay', config: { duration_minutes: 7200 } },
        { type: 'change_state', config: { state: 'closed' } },
        { type: 'create_journal_entry', config: { journal_type: 'work_note', body: 'Incident auto-closed after 5 days in resolved state.' } },
      ]),
      active: true, execution_order: 50, created_by: admin.id,
      tags: JSON.stringify(['auto-close', 'resolved']),
    },
  );

  await knex('workflow_rules').insert(wfRules);

  // ── Workflow Triggers (scheduled, webhook) ──
  const triggerId1 = uuid();
  const triggerId2 = uuid();
  await knex('workflow_triggers').insert([
    { id: triggerId1, workflow_rule_id: wfIds.wf3, type: 'scheduled', config: JSON.stringify({ cron: '*/30 * * * *', description: 'Check every 30 minutes for unassigned P1 incidents' }), active: true },
    { id: triggerId2, workflow_rule_id: wfIds.wf6, type: 'webhook', config: JSON.stringify({ description: 'Can be triggered via external monitoring webhook' }), active: true },
  ]);

  await knex('workflow_webhooks').insert([
    { workflow_rule_id: wfIds.wf6, secret: 'whsec_slack_notify_' + uuid().slice(0, 8), path_slug: 'slack-p1-notify', active: true },
  ]);

  await knex('workflow_scheduled_runs').insert([
    { trigger_id: triggerId1, next_run_at: new Date(Date.now() + 30 * 60000).toISOString(), last_run_at: new Date(Date.now() - 30 * 60000).toISOString(), status: 'pending' },
  ]);

  // ══════════════════════════════════════════════════════
  //  14. WORKFLOW EXECUTIONS & ACTION LOGS (monitoring data)
  // ══════════════════════════════════════════════════════
  // Simulate past workflow executions for monitoring dashboard
  const existingRules = await knex('workflow_rules').select('id', 'name', 'table_name');
  const ruleMap: Record<string, string> = {};
  for (const r of existingRules) ruleMap[r.name] = r.id;

  const rule1Id = ruleMap['Auto-assign P1 incidents to Service Desk'];
  const rule2Id = ruleMap['Notify on incident state change'];

  const executions: any[] = [];
  const execIds: string[] = [];

  // Executions for rule 1 (auto-assign P1)
  if (rule1Id && inc1001) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: rule1Id, table_name: 'incidents', record_id: inc1001.id, status: 'success', duration_ms: 45, trigger_type: 'record.created', context: JSON.stringify({ number: 'INC1001' }) });
  }
  if (rule1Id && inc1010) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: rule1Id, table_name: 'incidents', record_id: inc1010.id, status: 'success', duration_ms: 38, trigger_type: 'record.created', context: JSON.stringify({ number: 'INC1010' }) });
  }
  if (rule1Id && inc1013) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: rule1Id, table_name: 'incidents', record_id: inc1013.id, status: 'success', duration_ms: 52, trigger_type: 'record.created', context: JSON.stringify({ number: 'INC1013' }) });
  }
  if (rule1Id && inc1019) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: rule1Id, table_name: 'incidents', record_id: inc1019.id, status: 'success', duration_ms: 41, trigger_type: 'record.created', context: JSON.stringify({ number: 'INC1019' }) });
  }

  // Executions for rule 2 (notify on state change)
  if (rule2Id && inc1001) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: rule2Id, table_name: 'incidents', record_id: inc1001.id, status: 'success', duration_ms: 120, trigger_type: 'record.state_changed', context: JSON.stringify({ number: 'INC1001', old_state: 'new', new_state: 'in_progress' }) });
  }
  if (rule2Id && inc1002) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: rule2Id, table_name: 'incidents', record_id: inc1002.id, status: 'success', duration_ms: 115, trigger_type: 'record.state_changed', context: JSON.stringify({ number: 'INC1002', old_state: 'new', new_state: 'in_progress' }) });
  }

  // Some error executions for realism
  if (rule2Id) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: rule2Id, table_name: 'incidents', record_id: inc1006?.id || inc1001?.id, status: 'error', error: 'Notification channel "email" is not configured. Skipping email delivery.', duration_ms: 8, trigger_type: 'record.state_changed', context: JSON.stringify({ number: 'INC1006' }) });
  }

  // Executions for new rules
  if (wfIds.wf6 && inc1013) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: wfIds.wf6, table_name: 'incidents', record_id: inc1013.id, status: 'success', duration_ms: 230, trigger_type: 'record.created', context: JSON.stringify({ number: 'INC1013', priority: 1 }) });
  }
  if (wfIds.wf6 && inc1019) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: wfIds.wf6, table_name: 'incidents', record_id: inc1019.id, status: 'success', duration_ms: 198, trigger_type: 'record.created', context: JSON.stringify({ number: 'INC1019', priority: 1 }) });
  }
  if (wfIds.wf5 && chg1002) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: wfIds.wf5, table_name: 'changes', record_id: chg1002.id, status: 'success', duration_ms: 67, trigger_type: 'record.created', context: JSON.stringify({ number: 'CHG1002', risk: 'high' }) });
  }
  if (wfIds.wf5 && chg1004) {
    const eId = uuid(); execIds.push(eId);
    executions.push({ id: eId, rule_id: wfIds.wf5, table_name: 'changes', record_id: chg1004.id, status: 'success', duration_ms: 55, trigger_type: 'record.created', context: JSON.stringify({ number: 'CHG1004', risk: 'high' }) });
  }

  if (executions.length > 0) await knex('workflow_executions').insert(executions);

  // ── Action logs for each execution ──
  const actionLogs: any[] = [];
  for (let i = 0; i < executions.length; i++) {
    const exec = executions[i];
    if (exec.status === 'success') {
      actionLogs.push({ execution_id: exec.id, action_index: 0, action_type: exec.rule_id === rule1Id ? 'assign_to_group' : exec.rule_id === wfIds.wf6 ? 'send_slack' : exec.rule_id === wfIds.wf5 ? 'create_approval' : 'send_notification', status: 'success', duration_ms: Math.floor(exec.duration_ms * 0.7), input: JSON.stringify({ record_number: exec.context ? JSON.parse(exec.context).number : 'unknown' }), output: JSON.stringify({ result: 'completed' }) });
      if (exec.rule_id === rule1Id) {
        actionLogs.push({ execution_id: exec.id, action_index: 1, action_type: 'create_journal_entry', status: 'success', duration_ms: Math.floor(exec.duration_ms * 0.3), input: JSON.stringify({ journal_type: 'work_note' }), output: JSON.stringify({ result: 'journal entry created' }) });
      }
    } else {
      actionLogs.push({ execution_id: exec.id, action_index: 0, action_type: 'send_notification', status: 'error', duration_ms: exec.duration_ms, input: JSON.stringify({ channel: 'email' }), output: null, error: exec.error || 'Unknown error' });
    }
  }
  if (actionLogs.length > 0) await knex('workflow_action_logs').insert(actionLogs);

  // ══════════════════════════════════════════════════════
  //  15. ADDITIONAL KB ARTICLES
  // ══════════════════════════════════════════════════════
  const kbNetworking = await knex('kb_categories').where('name', 'Networking').first();
  const kbSecurity = await knex('kb_categories').where('name', 'Security').first();
  const kbSoftware = await knex('kb_categories').where('name', 'Software').first();
  const kbPolicies = await knex('kb_categories').where('name', 'IT Policies').first();

  await knex('kb_articles').insert([
    { number: 'KB1012', category_id: kbNetworking?.id, title: 'How to Request a Static IP Address', body: '<h2>Static IP Requests</h2><p>Static IPs are required for servers, printers, and some specialized applications.</p><h3>Process</h3><ol><li>Submit a request through the Service Catalog under "IT Services"</li><li>Provide: hostname, MAC address, VLAN, and justification</li><li>Network Operations will assign from the appropriate subnet</li><li>DNS records will be created automatically</li></ol><h3>Naming Convention</h3><p>Static IPs follow subnet allocation: <code>10.{site}.{vlan}.{host}</code></p>', state: 'published', author_id: charlie.id, view_count: 67 },
    { number: 'KB1013', category_id: kbSecurity?.id, title: 'Incident Response Procedures', body: '<h2>Security Incident Response</h2><p>Follow these steps when a security incident is detected or suspected.</p><h3>Classification</h3><ul><li><strong>Critical</strong>: Active data breach, ransomware, compromised admin credentials</li><li><strong>High</strong>: Malware infection, unauthorized access attempt, DDoS attack</li><li><strong>Medium</strong>: Phishing success (no data loss), policy violation</li><li><strong>Low</strong>: Suspicious activity, false positive investigation</li></ul><h3>Response Steps</h3><ol><li><strong>Contain</strong>: Isolate affected systems immediately</li><li><strong>Assess</strong>: Determine scope and impact</li><li><strong>Notify</strong>: Alert security team lead and affected parties</li><li><strong>Eradicate</strong>: Remove threat from environment</li><li><strong>Recover</strong>: Restore systems from clean backups</li><li><strong>Document</strong>: Create detailed incident report</li></ol>', state: 'published', author_id: newUserIds.grace, view_count: 156 },
    { number: 'KB1014', category_id: kbSoftware?.id, title: 'Docker Desktop Troubleshooting', body: '<h2>Common Docker Desktop Issues</h2><h3>Docker Won\'t Start</h3><ol><li>Ensure virtualization is enabled in BIOS</li><li>Check that WSL 2 is installed: <code>wsl --install</code></li><li>Restart Docker Desktop service</li><li>If WSL errors, run: <code>wsl --update</code></li></ol><h3>Containers Can\'t Access Network</h3><ul><li>Check Docker network: <code>docker network ls</code></li><li>Restart Docker: <code>Restart-Service docker</code></li><li>Verify VPN isn\'t blocking Docker subnet (172.17.0.0/16)</li></ul><h3>Disk Space Issues</h3><p>Docker images can consume significant disk space. Prune unused images: <code>docker system prune -a</code></p>', state: 'published', author_id: beth.id, view_count: 89 },
    { number: 'KB1015', category_id: kbPolicies?.id, title: 'Data Classification and Handling Policy', body: '<h2>Data Classification Levels</h2><ul><li><strong>Public</strong>: Marketing materials, public-facing content</li><li><strong>Internal</strong>: Internal memos, project docs, non-sensitive business data</li><li><strong>Confidential</strong>: Financial data, HR records, customer PII, credentials</li><li><strong>Restricted</strong>: Trade secrets, security keys, board-level documents</li></ul><h3>Handling Requirements</h3><table><tr><th>Level</th><th>Storage</th><th>Sharing</th><th>Disposal</th></tr><tr><td>Public</td><td>Any</td><td>Any</td><td>Standard delete</td></tr><tr><td>Internal</td><td>Company systems</td><td>Internal only</td><td>Standard delete</td></tr><tr><td>Confidential</td><td>Encrypted storage</td><td>Need-to-know, encrypted</td><td>Secure wipe</td></tr><tr><td>Restricted</td><td>HSM/vault only</td><td>Named individuals, encrypted</td><td>Certified destruction</td></tr></table>', state: 'published', author_id: newUserIds.grace, view_count: 201 },
  ]);
  await knex.raw("SELECT setval('kb_number_seq', 1015)");

  // ══════════════════════════════════════════════════════
  //  16. FORM SUBMISSIONS
  // ══════════════════════════════════════════════════════
  if (formTemplate) {
    await knex('form_submissions').insert([
      {
        template_id: formTemplate.id,
        data: JSON.stringify({ employee_name: 'Alice Johnson', email: 'alice.johnson@example.com', department: 'Engineering', start_date: '2026-06-01', vpn_access: true, admin_rights: false, notes: 'Will be working on the platform-api team. Needs GitHub access.' }),
        submitted_by: itilUser.id,
      },
      {
        template_id: formTemplate.id,
        data: JSON.stringify({ employee_name: 'Bob Williams', email: 'bob.williams@example.com', department: 'Sales', start_date: '2026-06-15', vpn_access: true, admin_rights: false, notes: 'Remote worker, needs VPN from day one.' }),
        submitted_by: beth.id,
      },
      {
        template_id: formTemplate.id,
        data: JSON.stringify({ employee_name: 'Carol Davis', email: 'carol.davis@example.com', department: 'Finance', start_date: '2026-05-26', vpn_access: false, admin_rights: true, notes: 'Finance team lead. Needs admin access to financial reporting tools.' }),
        submitted_by: admin.id,
      },
    ]);
  }

  // ══════════════════════════════════════════════════════
  //  17. MORE CATALOG REQUESTS
  // ══════════════════════════════════════════════════════
  const adobeItem = await knex('sc_catalog_items').where('name', 'Adobe Creative Cloud').first();
  const mobileItem = await knex('sc_catalog_items').where('name', 'Mobile Device').first();
  const newAccountItem = await knex('sc_catalog_items').where('name', 'New User Account').first();
  const dataRestoreItem = await knex('sc_catalog_items').where('name', 'Data Restore Request').first();
  const meetingItem = await knex('sc_catalog_items').where('name', 'Meeting Room AV Setup').first();

  const newRequests: any[] = [];
  if (adobeItem) newRequests.push({ number: 'REQ1004', catalog_item_id: adobeItem.id, requested_by: diana?.id, state: 'pending', variables: JSON.stringify({ justification: 'Need Photoshop and Illustrator for UI/UX design work on the new customer portal project.' }) });
  if (mobileItem) newRequests.push({ number: 'REQ1005', catalog_item_id: mobileItem.id, requested_by: charlie.id, state: 'approved', variables: JSON.stringify({}) });
  if (newAccountItem) newRequests.push({ number: 'REQ1006', catalog_item_id: newAccountItem.id, requested_by: itilUser.id, state: 'fulfillment', variables: JSON.stringify({ employee_name: 'Alice Johnson', department: 'engineering', start_date: '2026-06-01' }) });
  if (dataRestoreItem) newRequests.push({ number: 'REQ1007', catalog_item_id: dataRestoreItem.id, requested_by: endUser?.id, state: 'pending', variables: JSON.stringify({ file_path: '/shared/finance/Q1_report_final.xlsx', restore_date: '2026-05-10' }) });
  if (meetingItem) newRequests.push({ number: 'REQ1008', catalog_item_id: meetingItem.id, requested_by: newUserIds.hector, state: 'closed', variables: JSON.stringify({}) });

  if (newRequests.length > 0) {
    await knex('sc_requests').insert(newRequests);
    await knex.raw("SELECT setval('request_number_seq', 1008)");
  }

  // Approvals for new catalog requests
  if (adobeItem && diana) {
    const req1004 = await knex('sc_requests').where('number', 'REQ1004').first();
    if (req1004) await knex('approvals').insert({ table_name: 'sc_requests', record_id: req1004.id, approver_id: newUserIds.hector, state: 'requested' });
  }
  if (mobileItem) {
    const req1005 = await knex('sc_requests').where('number', 'REQ1005').first();
    if (req1005) await knex('approvals').insert({ table_name: 'sc_requests', record_id: req1005.id, approver_id: approver.id, state: 'approved', decided_at: new Date().toISOString(), comments: 'Approved - on-call requirement' });
  }

  // ══════════════════════════════════════════════════════
  //  18. ADDITIONAL JOURNAL ENTRIES (for existing records)
  // ══════════════════════════════════════════════════════
  if (chg1002) {
    await knex('sys_journal').insert([
      { table_name: 'changes', record_id: chg1002.id, type: 'work_note', body: 'New Catalyst 9300 switches have arrived and are staged in the server room. Pre-configured with matching VLAN and STP settings.', created_by: charlie.id },
      { table_name: 'changes', record_id: chg1002.id, type: 'work_note', body: 'CAB approved this change. Scheduling for the next monthly network maintenance window.', created_by: admin.id },
      { table_name: 'changes', record_id: chg1002.id, type: 'comment', body: 'Please coordinate with facilities team - we need access to the Building A MDF after hours.', created_by: charlie.id },
    ]);
  }
  if (chg1005) {
    await knex('sys_journal').insert([
      { table_name: 'changes', record_id: chg1005.id, type: 'work_note', body: 'Initial assessment: 250 mailboxes to migrate, estimated 50GB total. Microsoft FastTrack engagement confirmed.', created_by: itilUser.id },
      { table_name: 'changes', record_id: chg1005.id, type: 'work_note', body: 'CAB deferred this change. Need to provide more detail on mailbox data migration plan and rollback strategy.', created_by: admin.id },
    ]);
  }
  if (prb1000) {
    await knex('sys_journal').insert([
      { table_name: 'problems', record_id: prb1000.id, type: 'work_note', body: 'Analysis of Exchange logs shows memory leak in transport service. Issue occurs when message queue exceeds 10,000 items. Correlates with peak hours.', created_by: itilUser.id },
      { table_name: 'problems', record_id: prb1000.id, type: 'work_note', body: 'Microsoft KB article found: KB5028123 addresses this exact issue. Patch included in latest CU. Recommending change to apply patch.', created_by: itilUser.id },
    ]);
  }

  // ══════════════════════════════════════════════════════
  //  19. ADDITIONAL FORM TEMPLATE
  // ══════════════════════════════════════════════════════
  const changeRequestFormId = uuid();
  await knex('form_templates').insert({
    id: changeRequestFormId,
    name: 'Change Request Intake Form',
    description: 'Intake form for new change requests with risk assessment questions',
    active: true,
    created_by: admin.id,
  });

  await knex('form_fields').insert([
    { template_id: changeRequestFormId, field_type: 'section', label: 'Change Details', name: 'section_details', sort_order: 0 },
    { template_id: changeRequestFormId, field_type: 'text', label: 'Change Title', name: 'change_title', required: true, sort_order: 1 },
    { template_id: changeRequestFormId, field_type: 'textarea', label: 'Description of Change', name: 'change_description', required: true, sort_order: 2 },
    { template_id: changeRequestFormId, field_type: 'select', label: 'Change Type', name: 'change_type', required: true, sort_order: 3, config: JSON.stringify({ options: ['Standard', 'Normal', 'Emergency'] }) },
    { template_id: changeRequestFormId, field_type: 'select', label: 'Environment', name: 'environment', required: true, sort_order: 4, config: JSON.stringify({ options: ['Production', 'Staging', 'Development', 'All'] }) },
    { template_id: changeRequestFormId, field_type: 'section', label: 'Risk Assessment', name: 'section_risk', sort_order: 5 },
    { template_id: changeRequestFormId, field_type: 'select', label: 'Service Impact', name: 'service_impact', required: true, sort_order: 6, config: JSON.stringify({ options: ['No impact', 'Degraded performance', 'Partial outage', 'Full outage'] }) },
    { template_id: changeRequestFormId, field_type: 'checkbox', label: 'Requires downtime', name: 'requires_downtime', sort_order: 7 },
    { template_id: changeRequestFormId, field_type: 'checkbox', label: 'Affects customer-facing services', name: 'customer_facing', sort_order: 8 },
    { template_id: changeRequestFormId, field_type: 'textarea', label: 'Backout Plan', name: 'backout_plan', required: true, sort_order: 9 },
    { template_id: changeRequestFormId, field_type: 'date', label: 'Requested Implementation Date', name: 'requested_date', required: true, sort_order: 10 },
  ]);

  // Submission for this form
  await knex('form_submissions').insert({
    template_id: changeRequestFormId,
    data: JSON.stringify({ change_title: 'Upgrade load balancer firmware', change_description: 'Upgrade F5 BIG-IP firmware from v16.1 to v17.1 to address CVE-2024-xxxxx', change_type: 'Normal', environment: 'Production', service_impact: 'Partial outage', requires_downtime: true, customer_facing: true, backout_plan: 'Restore previous firmware from backup partition', requested_date: '2026-06-10' }),
    submitted_by: newUserIds.frank,
  });
}
