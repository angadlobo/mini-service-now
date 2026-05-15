import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Only seed if roles table is empty
  const existing = await knex('roles').first();
  if (existing) return;

  // ── Roles ─────────────────────────────────────────
  const roleIds = {
    admin: uuid(),
    itil: uuid(),
    user: uuid(),
    approver: uuid(),
    knowledge_manager: uuid(),
  };

  await knex('roles').insert([
    { id: roleIds.admin, name: 'admin', description: 'Full system administrator' },
    { id: roleIds.itil, name: 'itil', description: 'ITSM operator' },
    { id: roleIds.user, name: 'user', description: 'End user' },
    { id: roleIds.approver, name: 'approver', description: 'Change approver' },
    { id: roleIds.knowledge_manager, name: 'knowledge_manager', description: 'Knowledge base manager' },
  ]);

  // ── Users ─────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 12);

  const userIds = {
    admin: uuid(),
    itilUser: uuid(),
    endUser: uuid(),
    approver: uuid(),
    kbManager: uuid(),
    beth: uuid(),
    charlie: uuid(),
    diana: uuid(),
  };

  await knex('users').insert([
    { id: userIds.admin, username: 'admin', email: 'admin@example.com', password_hash: hash('admin123'), first_name: 'System', last_name: 'Admin' },
    { id: userIds.itilUser, username: 'itil.user', email: 'itil@example.com', password_hash: hash('itil123'), first_name: 'Alex', last_name: 'Thompson' },
    { id: userIds.endUser, username: 'end.user', email: 'user@example.com', password_hash: hash('user123'), first_name: 'Sam', last_name: 'Wilson' },
    { id: userIds.approver, username: 'approver', email: 'approver@example.com', password_hash: hash('approver123'), first_name: 'Morgan', last_name: 'Chen' },
    { id: userIds.kbManager, username: 'kb.manager', email: 'kb@example.com', password_hash: hash('kb123'), first_name: 'Jordan', last_name: 'Lee' },
    { id: userIds.beth, username: 'beth.service', email: 'beth@example.com', password_hash: hash('beth123'), first_name: 'Beth', last_name: 'Martinez' },
    { id: userIds.charlie, username: 'charlie.ops', email: 'charlie@example.com', password_hash: hash('charlie123'), first_name: 'Charlie', last_name: 'Brown' },
    { id: userIds.diana, username: 'diana.dev', email: 'diana@example.com', password_hash: hash('diana123'), first_name: 'Diana', last_name: 'Prince' },
  ]);

  // ── User-Role mappings ────────────────────────────
  await knex('user_roles').insert([
    { user_id: userIds.admin, role_id: roleIds.admin },
    { user_id: userIds.itilUser, role_id: roleIds.itil },
    { user_id: userIds.endUser, role_id: roleIds.user },
    { user_id: userIds.approver, role_id: roleIds.approver },
    { user_id: userIds.approver, role_id: roleIds.itil },
    { user_id: userIds.kbManager, role_id: roleIds.knowledge_manager },
    { user_id: userIds.kbManager, role_id: roleIds.itil },
    { user_id: userIds.beth, role_id: roleIds.itil },
    { user_id: userIds.charlie, role_id: roleIds.itil },
    { user_id: userIds.diana, role_id: roleIds.user },
  ]);

  // ── Assignment Groups ─────────────────────────────
  const groupIds = {
    serviceDesk: uuid(),
    networkOps: uuid(),
    devOps: uuid(),
    security: uuid(),
  };

  await knex('assignment_groups').insert([
    { id: groupIds.serviceDesk, name: 'Service Desk', description: 'First-line support', manager_id: userIds.itilUser },
    { id: groupIds.networkOps, name: 'Network Operations', description: 'Network infrastructure team', manager_id: userIds.charlie },
    { id: groupIds.devOps, name: 'DevOps', description: 'Development operations', manager_id: userIds.beth },
    { id: groupIds.security, name: 'Security', description: 'Information security team', manager_id: userIds.approver },
  ]);

  await knex('group_members').insert([
    { user_id: userIds.itilUser, group_id: groupIds.serviceDesk },
    { user_id: userIds.beth, group_id: groupIds.serviceDesk },
    { user_id: userIds.charlie, group_id: groupIds.networkOps },
    { user_id: userIds.beth, group_id: groupIds.devOps },
    { user_id: userIds.diana, group_id: groupIds.devOps },
    { user_id: userIds.approver, group_id: groupIds.security },
  ]);

  // ── SLA Definitions ───────────────────────────────
  await knex('sla_definitions').insert([
    { name: 'Critical Incident Response', table_name: 'incidents', condition: JSON.stringify({ priority: 1 }), duration_minutes: 60 },
    { name: 'High Incident Response', table_name: 'incidents', condition: JSON.stringify({ priority: 2 }), duration_minutes: 240 },
    { name: 'Medium Incident Response', table_name: 'incidents', condition: JSON.stringify({ priority: 3 }), duration_minutes: 480 },
    { name: 'Low Incident Response', table_name: 'incidents', condition: JSON.stringify({ priority: 4 }), duration_minutes: 1440 },
  ]);

  // ── Demo Incidents ────────────────────────────────
  const incidents = [
    { number: 'INC1001', short_description: 'Email server not responding', description: 'Multiple users report inability to send/receive emails since 8am', state: 'in_progress', priority: 1, urgency: 1, impact: 1, caller_id: userIds.endUser, assigned_to: userIds.itilUser, assignment_group_id: groupIds.serviceDesk, created_by: userIds.endUser },
    { number: 'INC1002', short_description: 'VPN connection dropping intermittently', description: 'Remote workers experience VPN disconnections every 15-20 minutes', state: 'in_progress', priority: 2, urgency: 2, impact: 1, caller_id: userIds.diana, assigned_to: userIds.charlie, assignment_group_id: groupIds.networkOps, created_by: userIds.diana },
    { number: 'INC1003', short_description: 'Cannot access shared drive', description: 'Finance team cannot access \\\\fileserver\\finance share', state: 'new', priority: 3, urgency: 2, impact: 2, caller_id: userIds.endUser, assignment_group_id: groupIds.serviceDesk, created_by: userIds.endUser },
    { number: 'INC1004', short_description: 'Printer jam on 3rd floor', description: 'HP LaserJet on 3rd floor showing paper jam error, already cleared paper', state: 'new', priority: 4, urgency: 3, impact: 3, caller_id: userIds.diana, assignment_group_id: groupIds.serviceDesk, created_by: userIds.diana },
    { number: 'INC1005', short_description: 'Software license expired', description: 'Adobe Creative Suite license expired for design team (5 users)', state: 'on_hold', priority: 3, urgency: 2, impact: 2, caller_id: userIds.endUser, assigned_to: userIds.beth, assignment_group_id: groupIds.serviceDesk, created_by: userIds.endUser },
    { number: 'INC1006', short_description: 'Database performance degradation', description: 'Production DB queries taking 10x longer than normal since last deployment', state: 'in_progress', priority: 2, urgency: 1, impact: 2, caller_id: userIds.beth, assigned_to: userIds.beth, assignment_group_id: groupIds.devOps, created_by: userIds.beth },
    { number: 'INC1007', short_description: 'New hire laptop setup', description: 'Need laptop configured for new hire starting Monday - Engineering dept', state: 'new', priority: 4, urgency: 3, impact: 3, caller_id: userIds.endUser, assignment_group_id: groupIds.serviceDesk, created_by: userIds.endUser },
    { number: 'INC1008', short_description: 'Website SSL certificate expiring', description: 'SSL cert for company website expires in 3 days', state: 'in_progress', priority: 2, urgency: 1, impact: 2, caller_id: userIds.charlie, assigned_to: userIds.charlie, assignment_group_id: groupIds.networkOps, created_by: userIds.charlie },
    { number: 'INC1009', short_description: 'Outlook calendar sync failure', description: 'Calendar events not syncing between Outlook and mobile devices', state: 'resolved', priority: 3, urgency: 2, impact: 2, caller_id: userIds.diana, assigned_to: userIds.itilUser, assignment_group_id: groupIds.serviceDesk, created_by: userIds.diana, resolved_at: new Date().toISOString(), resolution_notes: 'Reset Exchange ActiveSync partnership and re-synced device' },
    { number: 'INC1010', short_description: 'Firewall blocking legitimate traffic', description: 'New firewall rules blocking API calls to payment processor', state: 'resolved', priority: 1, urgency: 1, impact: 1, caller_id: userIds.beth, assigned_to: userIds.approver, assignment_group_id: groupIds.security, created_by: userIds.beth, resolved_at: new Date().toISOString(), resolution_notes: 'Added exception rule for payment processor IP range' },
    { number: 'INC1011', short_description: 'Meeting room display not working', description: 'Conference room B display showing no signal', state: 'closed', priority: 5, urgency: 3, impact: 3, caller_id: userIds.endUser, assigned_to: userIds.itilUser, assignment_group_id: groupIds.serviceDesk, created_by: userIds.endUser, resolved_at: new Date().toISOString(), closed_at: new Date().toISOString(), resolution_notes: 'Replaced HDMI cable' },
    { number: 'INC1012', short_description: 'Two-factor authentication not working', description: 'Cannot receive 2FA codes on any device, locked out of all systems', state: 'new', priority: 2, urgency: 1, impact: 3, caller_id: userIds.endUser, assigned_to: userIds.approver, assignment_group_id: groupIds.security, created_by: userIds.endUser },
  ];

  for (const inc of incidents) {
    await knex('incidents').insert(inc);
  }

  // Update the sequence
  await knex.raw("SELECT setval('incident_number_seq', 1012)");

  // ── Demo Changes ──────────────────────────────────
  const changes = [
    { number: 'CHG1001', short_description: 'Upgrade production database to PostgreSQL 16', description: 'Upgrade all production database servers from PG 14 to PG 16 for performance improvements', state: 'authorize', type: 'normal', risk: 'moderate', priority: 3, assigned_to: userIds.beth, assignment_group_id: groupIds.devOps, planned_start: new Date(Date.now() + 7 * 86400000).toISOString(), planned_end: new Date(Date.now() + 7.5 * 86400000).toISOString(), backout_plan: 'Restore from pre-upgrade snapshot', justification: 'PG 16 offers 20% query performance improvement', created_by: userIds.beth },
    { number: 'CHG1002', short_description: 'Network switch replacement - Building A', description: 'Replace aging Cisco 3750 switches with Catalyst 9300 series', state: 'scheduled', type: 'normal', risk: 'high', priority: 2, assigned_to: userIds.charlie, assignment_group_id: groupIds.networkOps, planned_start: new Date(Date.now() + 14 * 86400000).toISOString(), planned_end: new Date(Date.now() + 14.5 * 86400000).toISOString(), backout_plan: 'Re-install old switches from storage', justification: 'Current switches are end-of-life and causing intermittent failures', created_by: userIds.charlie },
    { number: 'CHG1003', short_description: 'Deploy new monitoring agent', description: 'Install Datadog agent on all production servers', state: 'new', type: 'standard', risk: 'low', priority: 4, assigned_to: userIds.beth, assignment_group_id: groupIds.devOps, backout_plan: 'Uninstall agent package', justification: 'Improve observability and alerting', created_by: userIds.beth },
    { number: 'CHG1004', short_description: 'Emergency SSL certificate rotation', description: 'Rotate all SSL certificates due to CA compromise advisory', state: 'implement', type: 'emergency', risk: 'high', priority: 1, assigned_to: userIds.approver, assignment_group_id: groupIds.security, planned_start: new Date().toISOString(), planned_end: new Date(Date.now() + 0.5 * 86400000).toISOString(), backout_plan: 'Restore previous certificates from vault', justification: 'CA security advisory requires immediate rotation', created_by: userIds.approver },
    { number: 'CHG1005', short_description: 'Migrate email to cloud provider', description: 'Migrate from on-prem Exchange to Microsoft 365', state: 'assess', type: 'normal', risk: 'high', priority: 2, assigned_to: userIds.itilUser, assignment_group_id: groupIds.serviceDesk, planned_start: new Date(Date.now() + 30 * 86400000).toISOString(), planned_end: new Date(Date.now() + 37 * 86400000).toISOString(), backout_plan: 'Fail back to on-prem Exchange servers', justification: 'Reduce infrastructure costs and improve reliability', created_by: userIds.itilUser },
  ];

  for (const chg of changes) {
    await knex('changes').insert(chg);
  }
  await knex.raw("SELECT setval('change_number_seq', 1005)");

  // ── Approvals for changes ─────────────────────────
  await knex('approvals').insert([
    { table_name: 'changes', record_id: (await knex('changes').where('number', 'CHG1001').first()).id, approver_id: userIds.approver, state: 'requested' },
    { table_name: 'changes', record_id: (await knex('changes').where('number', 'CHG1002').first()).id, approver_id: userIds.approver, state: 'approved', decided_at: new Date().toISOString(), comments: 'Approved - ensure maintenance window is communicated' },
    { table_name: 'changes', record_id: (await knex('changes').where('number', 'CHG1004').first()).id, approver_id: userIds.admin, state: 'approved', decided_at: new Date().toISOString(), comments: 'Emergency approved' },
  ]);

  // ── Catalog Categories & Items ────────────────────
  const catIds = {
    hardware: uuid(),
    software: uuid(),
    access: uuid(),
    services: uuid(),
  };

  await knex('sc_categories').insert([
    { id: catIds.hardware, name: 'Hardware', description: 'Physical equipment and peripherals', icon: 'IconDeviceLaptop', sort_order: 1 },
    { id: catIds.software, name: 'Software', description: 'Software licenses and installations', icon: 'IconApps', sort_order: 2 },
    { id: catIds.access, name: 'Access & Permissions', description: 'System access and account requests', icon: 'IconLock', sort_order: 3 },
    { id: catIds.services, name: 'IT Services', description: 'General IT services', icon: 'IconSettings', sort_order: 4 },
  ]);

  const itemIds = {
    laptop: uuid(),
    monitor: uuid(),
    keyboard: uuid(),
    office365: uuid(),
    adobe: uuid(),
    vpn: uuid(),
    newAccount: uuid(),
    meetingRoom: uuid(),
    dataRestore: uuid(),
    mobileDevice: uuid(),
  };

  await knex('sc_catalog_items').insert([
    { id: itemIds.laptop, category_id: catIds.hardware, name: 'New Laptop', short_description: 'Request a new laptop computer', description: 'Standard or premium laptop for business use. Includes OS, standard software suite, and setup.', icon: 'IconDeviceLaptop', price: 1200, delivery_days: 5, approval_required: true, fulfillment_group_id: groupIds.serviceDesk },
    { id: itemIds.monitor, category_id: catIds.hardware, name: 'External Monitor', short_description: 'Request an additional monitor', description: '27-inch 4K monitor for productivity. Includes mounting arm and cables.', icon: 'IconDeviceDesktop', price: 450, delivery_days: 3, approval_required: false, fulfillment_group_id: groupIds.serviceDesk },
    { id: itemIds.keyboard, category_id: catIds.hardware, name: 'Keyboard & Mouse Kit', short_description: 'Wireless keyboard and mouse combo', description: 'Ergonomic wireless keyboard and mouse set.', icon: 'IconKeyboard', price: 85, delivery_days: 2, approval_required: false, fulfillment_group_id: groupIds.serviceDesk },
    { id: itemIds.office365, category_id: catIds.software, name: 'Microsoft 365 License', short_description: 'Microsoft 365 Business subscription', description: 'Full Microsoft 365 suite including Outlook, Teams, Word, Excel, PowerPoint.', icon: 'IconBrandWindows', price: 22, delivery_days: 1, approval_required: false, fulfillment_group_id: groupIds.serviceDesk },
    { id: itemIds.adobe, category_id: catIds.software, name: 'Adobe Creative Cloud', short_description: 'Adobe CC license for design work', description: 'Full Adobe Creative Cloud license including Photoshop, Illustrator, InDesign.', icon: 'IconPalette', price: 55, delivery_days: 2, approval_required: true, fulfillment_group_id: groupIds.serviceDesk },
    { id: itemIds.vpn, category_id: catIds.access, name: 'VPN Access', short_description: 'Request VPN access for remote work', description: 'Corporate VPN access with certificate-based authentication.', icon: 'IconShield', price: 0, delivery_days: 1, approval_required: true, fulfillment_group_id: groupIds.security },
    { id: itemIds.newAccount, category_id: catIds.access, name: 'New User Account', short_description: 'Create accounts for new hire', description: 'Active Directory account, email, and standard system access for new employee.', icon: 'IconUserPlus', price: 0, delivery_days: 1, approval_required: true, fulfillment_group_id: groupIds.serviceDesk },
    { id: itemIds.meetingRoom, category_id: catIds.services, name: 'Meeting Room AV Setup', short_description: 'A/V equipment setup for meeting', description: 'Setup audio/video equipment for a conference or meeting room.', icon: 'IconPresentation', price: 0, delivery_days: 1, approval_required: false, fulfillment_group_id: groupIds.serviceDesk },
    { id: itemIds.dataRestore, category_id: catIds.services, name: 'Data Restore Request', short_description: 'Restore files from backup', description: 'Restore deleted or corrupted files from backup systems.', icon: 'IconDatabaseImport', price: 0, delivery_days: 2, approval_required: false, fulfillment_group_id: groupIds.devOps },
    { id: itemIds.mobileDevice, category_id: catIds.hardware, name: 'Mobile Device', short_description: 'Request company mobile phone', description: 'Company-issued smartphone with MDM enrollment.', icon: 'IconDeviceMobile', price: 800, delivery_days: 5, approval_required: true, fulfillment_group_id: groupIds.serviceDesk },
  ]);

  // ── Catalog item variables (dynamic form fields) ──
  await knex('sc_item_variables').insert([
    { catalog_item_id: itemIds.laptop, name: 'laptop_type', label: 'Laptop Type', type: 'select', required: true, sort_order: 1, options: JSON.stringify({ choices: [{ value: 'standard', label: 'Standard (16GB RAM, 256GB SSD)' }, { value: 'premium', label: 'Premium (32GB RAM, 512GB SSD)' }, { value: 'developer', label: 'Developer (64GB RAM, 1TB SSD)' }] }) },
    { catalog_item_id: itemIds.laptop, name: 'os', label: 'Operating System', type: 'select', required: true, sort_order: 2, options: JSON.stringify({ choices: [{ value: 'windows', label: 'Windows 11 Pro' }, { value: 'macos', label: 'macOS' }, { value: 'linux', label: 'Ubuntu Linux' }] }) },
    { catalog_item_id: itemIds.laptop, name: 'justification', label: 'Business Justification', type: 'textarea', required: true, sort_order: 3 },
    { catalog_item_id: itemIds.vpn, name: 'reason', label: 'Reason for VPN Access', type: 'textarea', required: true, sort_order: 1 },
    { catalog_item_id: itemIds.vpn, name: 'start_date', label: 'Access Start Date', type: 'date', required: true, sort_order: 2 },
    { catalog_item_id: itemIds.newAccount, name: 'employee_name', label: 'Employee Full Name', type: 'text', required: true, sort_order: 1 },
    { catalog_item_id: itemIds.newAccount, name: 'department', label: 'Department', type: 'select', required: true, sort_order: 2, options: JSON.stringify({ choices: [{ value: 'engineering', label: 'Engineering' }, { value: 'sales', label: 'Sales' }, { value: 'marketing', label: 'Marketing' }, { value: 'finance', label: 'Finance' }, { value: 'hr', label: 'Human Resources' }] }) },
    { catalog_item_id: itemIds.newAccount, name: 'start_date', label: 'Start Date', type: 'date', required: true, sort_order: 3 },
    { catalog_item_id: itemIds.dataRestore, name: 'file_path', label: 'File/Folder Path', type: 'text', required: true, sort_order: 1 },
    { catalog_item_id: itemIds.dataRestore, name: 'restore_date', label: 'Restore from Date', type: 'date', required: true, sort_order: 2 },
    { catalog_item_id: itemIds.adobe, name: 'justification', label: 'Business Justification', type: 'textarea', required: true, sort_order: 1 },
  ]);

  // ── Demo catalog requests ─────────────────────────
  await knex('sc_requests').insert([
    { number: 'REQ1001', catalog_item_id: itemIds.laptop, requested_by: userIds.diana, state: 'approved', variables: JSON.stringify({ laptop_type: 'developer', os: 'linux', justification: 'Need high-spec machine for ML model training' }) },
    { number: 'REQ1002', catalog_item_id: itemIds.vpn, requested_by: userIds.endUser, state: 'pending', variables: JSON.stringify({ reason: 'Working remotely for 2 weeks', start_date: new Date().toISOString().split('T')[0] }) },
    { number: 'REQ1003', catalog_item_id: itemIds.monitor, requested_by: userIds.itilUser, state: 'fulfillment', variables: JSON.stringify({}) },
  ]);
  await knex.raw("SELECT setval('request_number_seq', 1003)");

  // ── KB Categories & Articles ──────────────────────
  const kbCatIds = {
    gettingStarted: uuid(),
    networking: uuid(),
    security: uuid(),
    software: uuid(),
    policies: uuid(),
  };

  await knex('kb_categories').insert([
    { id: kbCatIds.gettingStarted, name: 'Getting Started', sort_order: 1 },
    { id: kbCatIds.networking, name: 'Networking', sort_order: 2 },
    { id: kbCatIds.security, name: 'Security', sort_order: 3 },
    { id: kbCatIds.software, name: 'Software', sort_order: 4 },
    { id: kbCatIds.policies, name: 'IT Policies', sort_order: 5 },
  ]);

  const kbArticles = [
    { number: 'KB1001', category_id: kbCatIds.gettingStarted, title: 'How to Set Up Your New Laptop', body: '<h2>Welcome to the Team!</h2><p>Follow these steps to get your new laptop configured and ready for work.</p><h3>Step 1: Power On</h3><p>Press the power button and follow the Windows/macOS setup wizard.</p><h3>Step 2: Connect to Wi-Fi</h3><p>Connect to the <strong>Corp-Secure</strong> network. The password will be provided by IT.</p><h3>Step 3: Install Required Software</h3><p>Open the Company Portal app and install the following:</p><ul><li>Microsoft 365</li><li>Slack</li><li>Company VPN Client</li><li>Antivirus</li></ul><h3>Step 4: Enroll in MFA</h3><p>Go to <code>https://mfa.company.com</code> and follow the enrollment wizard.</p>', state: 'published', author_id: userIds.kbManager, view_count: 245 },
    { number: 'KB1002', category_id: kbCatIds.networking, title: 'VPN Troubleshooting Guide', body: '<h2>VPN Connection Issues</h2><p>If you are having trouble connecting to the VPN, try these steps:</p><h3>Common Fixes</h3><ol><li><strong>Restart the VPN client</strong> - Close and reopen the application</li><li><strong>Check your internet connection</strong> - Ensure you can browse the web</li><li><strong>Verify credentials</strong> - Make sure your password has not expired</li><li><strong>Try a different server</strong> - Switch between VPN gateway servers</li></ol><h3>Advanced Troubleshooting</h3><p>If basic steps do not resolve the issue:</p><ul><li>Clear DNS cache: <code>ipconfig /flushdns</code></li><li>Reinstall VPN certificates from the Company Portal</li><li>Check if your firewall is blocking VPN traffic (UDP 1194, TCP 443)</li></ul><p>If none of these steps work, please create an incident ticket.</p>', state: 'published', author_id: userIds.kbManager, view_count: 189 },
    { number: 'KB1003', category_id: kbCatIds.security, title: 'Password Policy and Best Practices', body: '<h2>Password Requirements</h2><p>All passwords must meet the following criteria:</p><ul><li>Minimum 12 characters</li><li>At least one uppercase letter</li><li>At least one lowercase letter</li><li>At least one number</li><li>At least one special character</li></ul><h3>Password Rotation</h3><p>Passwords must be changed every 90 days. You will receive a reminder 14 days before expiry.</p><h3>Best Practices</h3><ul><li>Use a password manager</li><li>Never share passwords</li><li>Use unique passwords for each system</li><li>Enable MFA wherever possible</li></ul>', state: 'published', author_id: userIds.kbManager, view_count: 312 },
    { number: 'KB1004', category_id: kbCatIds.software, title: 'How to Request Software Licenses', body: '<h2>Requesting Software</h2><p>To request a new software license:</p><ol><li>Go to the <strong>Service Catalog</strong></li><li>Browse the <strong>Software</strong> category</li><li>Select the software you need</li><li>Fill out the request form with business justification</li><li>Submit the request</li></ol><p>Requests for software over $50/month require manager approval.</p>', state: 'published', author_id: userIds.kbManager, view_count: 98 },
    { number: 'KB1005', category_id: kbCatIds.gettingStarted, title: 'How to Submit an IT Support Ticket', body: '<h2>Getting Help from IT</h2><p>When you encounter an IT issue, submit a ticket for fastest resolution.</p><h3>Steps</h3><ol><li>Navigate to <strong>Incidents → Create New</strong></li><li>Provide a clear, brief description of the issue</li><li>Set the urgency based on business impact</li><li>Add any relevant screenshots or attachments</li><li>Submit the ticket</li></ol><p>You will receive email notifications as your ticket progresses.</p>', state: 'published', author_id: userIds.kbManager, view_count: 456 },
    { number: 'KB1006', category_id: kbCatIds.networking, title: 'Wi-Fi Network Guide', body: '<h2>Available Networks</h2><ul><li><strong>Corp-Secure</strong> - Primary corporate network (certificate-based auth)</li><li><strong>Corp-Guest</strong> - Guest network (limited access)</li><li><strong>Corp-IoT</strong> - IoT devices only</li></ul><h3>Connecting to Corp-Secure</h3><p>Your device must have a valid certificate installed. This is done automatically when you enroll through the Company Portal.</p>', state: 'published', author_id: userIds.charlie, view_count: 167 },
    { number: 'KB1007', category_id: kbCatIds.security, title: 'Multi-Factor Authentication Setup', body: '<h2>Setting Up MFA</h2><p>All employees must enroll in multi-factor authentication within their first week.</p><h3>Supported Methods</h3><ul><li>Microsoft Authenticator app (recommended)</li><li>Hardware security key (YubiKey)</li><li>SMS verification (backup only)</li></ul><h3>Enrollment Steps</h3><ol><li>Go to your account security settings</li><li>Click "Set up MFA"</li><li>Scan the QR code with your authenticator app</li><li>Enter the verification code to confirm</li><li>Save backup codes in a secure location</li></ol>', state: 'published', author_id: userIds.approver, view_count: 278 },
    { number: 'KB1008', category_id: kbCatIds.policies, title: 'Acceptable Use Policy', body: '<h2>IT Acceptable Use Policy</h2><p>This policy governs the use of company IT resources.</p><h3>Permitted Use</h3><p>Company IT resources are provided for business purposes. Limited personal use is permitted provided it does not interfere with work duties.</p><h3>Prohibited Activities</h3><ul><li>Installing unauthorized software</li><li>Sharing credentials</li><li>Accessing inappropriate content</li><li>Connecting unauthorized devices</li><li>Circumventing security controls</li></ul>', state: 'published', author_id: userIds.admin, view_count: 534 },
    { number: 'KB1009', category_id: kbCatIds.software, title: 'Setting Up Development Environment', body: '<h2>Developer Workstation Setup</h2><p>Guide for setting up a development environment on your company laptop.</p><h3>Prerequisites</h3><p>Ensure you have admin access to your machine (request via Service Catalog if needed).</p><h3>Standard Dev Tools</h3><ul><li>VS Code</li><li>Git</li><li>Node.js (LTS)</li><li>Docker Desktop</li><li>Postman</li></ul>', state: 'published', author_id: userIds.beth, view_count: 145 },
    { number: 'KB1010', category_id: kbCatIds.policies, title: 'Change Management Process Guide', body: '<h2>Change Management</h2><p>All changes to production systems must follow the change management process.</p><h3>Change Types</h3><ul><li><strong>Standard</strong> - Pre-approved, low-risk changes</li><li><strong>Normal</strong> - Requires CAB approval</li><li><strong>Emergency</strong> - Expedited process for urgent fixes</li></ul><h3>Process Flow</h3><ol><li>Submit change request with justification and backout plan</li><li>Assessment by change manager</li><li>Authorization/approval by CAB</li><li>Schedule implementation window</li><li>Implement change</li><li>Post-implementation review</li><li>Close change record</li></ol>', state: 'published', author_id: userIds.itilUser, view_count: 223 },
    { number: 'KB1011', category_id: kbCatIds.security, title: 'Phishing Awareness Guide', body: '<h2>Recognizing Phishing Attempts</h2><p>Phishing is the most common cyber attack vector. Learn to identify and report suspicious emails.</p><h3>Warning Signs</h3><ul><li>Urgent or threatening language</li><li>Unexpected attachments</li><li>Links to unfamiliar URLs</li><li>Requests for credentials or personal information</li><li>Sender address does not match the organization</li></ul><h3>What to Do</h3><ol><li>Do NOT click any links or open attachments</li><li>Report the email using the "Report Phishing" button in Outlook</li><li>If you clicked a link, change your password immediately and contact IT Security</li></ol>', state: 'draft', author_id: userIds.approver, view_count: 0 },
  ];

  for (const article of kbArticles) {
    await knex('kb_articles').insert(article);
  }
  await knex.raw("SELECT setval('kb_number_seq', 1011)");

  // ── Journal entries for demo data ─────────────────
  const inc1001 = await knex('incidents').where('number', 'INC1001').first();
  const inc1002 = await knex('incidents').where('number', 'INC1002').first();

  if (inc1001) {
    await knex('sys_journal').insert([
      { table_name: 'incidents', record_id: inc1001.id, type: 'comment', body: 'I cannot send or receive any emails. This is blocking my work completely.', created_by: userIds.endUser },
      { table_name: 'incidents', record_id: inc1001.id, type: 'work_note', body: 'Investigating Exchange server logs. Seeing high memory usage on mail server.', created_by: userIds.itilUser },
      { table_name: 'incidents', record_id: inc1001.id, type: 'work_note', body: 'Restarted Exchange transport service. Monitoring for improvement.', created_by: userIds.itilUser },
    ]);
  }

  if (inc1002) {
    await knex('sys_journal').insert([
      { table_name: 'incidents', record_id: inc1002.id, type: 'comment', body: 'VPN drops every 15 minutes. Very disruptive for video calls.', created_by: userIds.diana },
      { table_name: 'incidents', record_id: inc1002.id, type: 'work_note', body: 'Checking VPN concentrator logs and MTU settings.', created_by: userIds.charlie },
    ]);
  }
}
