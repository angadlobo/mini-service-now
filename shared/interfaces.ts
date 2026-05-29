// ── Common ──────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  [key: string]: unknown;
}

// ── Auth ────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  active: boolean;
}

// ── Users ───────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Incidents ───────────────────────────────────────────
export type IncidentState = 'new' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | 'cancelled';
export type Priority = 1 | 2 | 3 | 4 | 5;
export type Urgency = 1 | 2 | 3;
export type Impact = 1 | 2 | 3;

export interface Incident {
  id: string;
  number: string;
  short_description: string;
  description: string;
  state: IncidentState;
  priority: Priority;
  urgency: Urgency;
  impact: Impact;
  caller_id: string | null;
  assigned_to: string | null;
  assignment_group_id: string | null;
  sla_due: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined fields
  caller?: User;
  caller_name?: string;
  assigned_to_user?: User;
  assigned_to_name?: string;
  assigned_to_username?: string;
  assignment_group_name?: string;
  created_by_user?: User;
  created_by_name?: string;
}

// ── Changes ─────────────────────────────────────────────
export type ChangeState = 'new' | 'assess' | 'authorize' | 'scheduled' | 'implement' | 'review' | 'closed' | 'cancelled';
export type ChangeType = 'normal' | 'standard' | 'emergency';
export type RiskLevel = 'high' | 'moderate' | 'low';

export interface Change {
  id: string;
  number: string;
  short_description: string;
  description: string;
  state: ChangeState;
  type: ChangeType;
  risk: RiskLevel;
  priority: Priority;
  assigned_to: string | null;
  assignment_group_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  backout_plan: string | null;
  justification: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_to_user?: User;
  assigned_to_name?: string;
  assignment_group_name?: string;
  created_by_name?: string;
}

// ── Service Catalog ─────────────────────────────────────
export interface ScCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

export interface ScCatalogItem {
  id: string;
  category_id: string;
  name: string;
  short_description: string;
  description: string;
  icon: string;
  price: number;
  delivery_days: number;
  approval_required: boolean;
  fulfillment_group_id: string | null;
  active: boolean;
  category?: ScCategory;
  category_name?: string;
  variables?: ScItemVariable[];
}

export interface ScItemVariable {
  id: string;
  catalog_item_id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'reference';
  required: boolean;
  sort_order: number;
  options: Record<string, unknown> | null;
}

export type RequestState = 'pending' | 'approved' | 'fulfillment' | 'completed' | 'cancelled';

export interface ScRequest {
  id: string;
  number: string;
  catalog_item_id: string;
  requested_by: string;
  state: RequestState;
  variables: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  catalog_item?: ScCatalogItem;
  requested_by_user?: User;
}

// ── Knowledge Base ──────────────────────────────────────
export type KbArticleState = 'draft' | 'review' | 'published' | 'retired';

export interface KbCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  children?: KbCategory[];
}

export interface KbArticle {
  id: string;
  number: string;
  category_id: string | null;
  title: string;
  body: string;
  state: KbArticleState;
  author_id: string;
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  author?: User;
  author_name?: string;
  category?: KbCategory;
  category_name?: string;
}

// ── Approvals ───────────────────────────────────────────
export type ApprovalState = 'requested' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  table_name: string;
  record_id: string;
  record_number?: string;
  record_description?: string;
  approver_id: string;
  state: ApprovalState;
  comments: string | null;
  decided_at: string | null;
  created_at: string;
  approver?: User;
}

// ── Journal ─────────────────────────────────────────────
export type JournalType = 'comment' | 'work_note';

export interface JournalEntry {
  id: string;
  table_name: string;
  record_id: string;
  type: JournalType;
  body: string;
  created_by: string;
  created_at: string;
  created_by_user?: User;
}

// ── Attachments ─────────────────────────────────────────
export interface Attachment {
  id: string;
  table_name: string;
  record_id: string;
  file_name: string;
  mime_type: string;
  size: number;
  created_by: string;
  created_at: string;
}

// ── Audit ───────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  created_at: string;
  changed_by_user?: User;
}

// ── Notifications ───────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// ── SLA ─────────────────────────────────────────────────
export interface SlaDefinition {
  id: string;
  name: string;
  table_name: string;
  condition: Record<string, unknown>;
  duration_minutes: number;
  active: boolean;
}

export interface SlaInstance {
  id: string;
  sla_definition_id: string;
  table_name: string;
  record_id: string;
  start_time: string;
  planned_end_time: string;
  actual_end_time: string | null;
  breached: boolean;
}

// ── Problems ────────────────────────────────────────────
export type ProblemState = 'new' | 'investigation' | 'root_cause_found' | 'fix_in_progress' | 'resolved' | 'closed';

export interface Problem {
  id: string;
  number: string;
  short_description: string;
  description: string;
  state: ProblemState;
  priority: Priority;
  root_cause: string | null;
  workaround: string | null;
  permanent_solution: string | null;
  assigned_to: string | null;
  assignment_group_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_to_name?: string;
  assignment_group_name?: string;
  created_by_name?: string;
}

// ── CMDB ────────────────────────────────────────────────
export type CiStatus = 'inventory' | 'active' | 'maintenance' | 'retired';

export interface CiType {
  id: string;
  name: string;
  description: string;
  icon: string;
  parent_type_id: string | null;
}

export interface ConfigurationItem {
  id: string;
  number: string;
  ci_type_id: string;
  name: string;
  serial_number: string | null;
  status: CiStatus;
  owner_id: string | null;
  location: string | null;
  cost: number;
  attributes: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  ci_type_name?: string;
  owner_name?: string;
}

export interface CiRelationship {
  id: string;
  parent_ci_id: string;
  child_ci_id: string;
  type: string;
  parent_name?: string;
  parent_number?: string;
  child_name?: string;
  child_number?: string;
}

// ── Workflows ───────────────────────────────────────────
export interface WorkflowRule {
  id: string;
  name: string;
  table_name: string;
  trigger_event: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>[];
  active: boolean;
  execution_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
}

export interface WorkflowExecution {
  id: string;
  rule_id: string;
  table_name: string;
  record_id: string;
  status: string;
  error: string | null;
  created_at: string;
  rule_name?: string;
}

// ── Integrations ────────────────────────────────────────
export type IntegrationProvider = 'github' | 'gitlab' | 'jira' | 'pagerduty' | 'teams' | 'azure_devops' | 'datadog' | 'grafana';
export type IntegrationStatus = 'connected' | 'error' | 'pending_auth';

export interface Integration {
  id: string;
  name: string;
  type: string;
  url: string;
  auth_type: string;
  auth_config: Record<string, unknown>;
  events: string[];
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Provider integration fields
  provider?: IntegrationProvider | null;
  provider_config?: Record<string, unknown>;
  oauth_tokens?: Record<string, unknown> | null;
  webhook_secret?: string | null;
  inbound_webhook_id?: string | null;
  status?: IntegrationStatus;
  status_message?: string | null;
  last_sync_at?: string | null;
}

export interface IntegrationLink {
  id: string;
  integration_id: string;
  table_name: string;
  record_id: string;
  provider: string;
  external_type: string;
  external_id: string;
  external_url?: string | null;
  external_key?: string | null;
  title?: string | null;
  status?: string | null;
  metadata: Record<string, unknown>;
  direction: 'outbound' | 'inbound';
  created_at: string;
  updated_at: string;
}

export interface ProviderMetadata {
  name: string;
  displayName: string;
  icon: string;
  description: string;
  configFields: {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    description?: string;
    options?: { value: string; label: string }[];
    defaultValue?: unknown;
  }[];
  oauthConfig: { authorizationUrl: string; scopes: string[] } | null;
  workflowActions: {
    type: string;
    label: string;
    description: string;
    configFields: {
      name: string;
      label: string;
      type: string;
      required?: boolean;
      placeholder?: string;
      description?: string;
      options?: { value: string; label: string }[];
    }[];
  }[];
}

export interface IntegrationLog {
  id: string;
  integration_id: string;
  event: string;
  status: string;
  request_body: Record<string, unknown>;
  response_body: string;
  status_code: number;
  created_at: string;
}

// ── Reports ─────────────────────────────────────────────
export interface ReportConfig {
  group_by?: string;
  aggregate_function?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  aggregate_column?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  row_limit?: number;
}

export interface ReportFilter {
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts_with' | 'ends_with' | 'is_null' | 'is_not_null' | 'in';
  value: unknown;
}

export interface Report {
  id: string;
  name: string;
  description: string;
  table_name: string;
  filters: Record<string, ReportFilter | unknown>;
  columns: string[];
  chart_type: string;
  config: ReportConfig;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
}

// ── Form Builder ────────────────────────────────────────
export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  table_name: string | null;
  schema: Record<string, unknown>;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  field_count?: number;
  submission_count?: number;
  fields?: FormField[];
}

export interface FormField {
  id: string;
  template_id: string;
  field_type: string;
  label: string;
  name: string;
  config: Record<string, unknown>;
  sort_order: number;
  required: boolean;
  conditional_logic: Record<string, unknown>;
}

export interface FormSubmission {
  id: string;
  template_id: string;
  record_id: string | null;
  data: Record<string, unknown>;
  submitted_by: string;
  created_at: string;
  submitted_by_name?: string;
}

// ── AI ──────────────────────────────────────────────────
export interface AiProvider {
  id: string;
  name: string;
  provider_type: string;
  api_key_encrypted: string | null;
  model: string;
  base_url: string | null;
  config: Record<string, unknown>;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AiPrompt {
  id: string;
  name: string;
  use_case: string;
  system_prompt: string;
  user_prompt_template: string;
  provider_id: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiUsageLog {
  id: string;
  prompt_id: string;
  provider_id: string;
  table_name: string | null;
  record_id: string | null;
  input_tokens: number;
  output_tokens: number;
  response_text: string;
  feedback: string | null;
  user_id: string;
  created_at: string;
}

// ── Settings ────────────────────────────────────────────
export interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  category: string;
  encrypted: boolean;
  description: string | null;
}

// ── Dashboard ───────────────────────────────────────────
export interface DashboardStats {
  incidents: {
    total: number;
    open: number;
    critical: number;
    breached_sla: number;
    by_state: Record<string, number>;
    by_priority: Record<string, number>;
  };
  changes: {
    total: number;
    open: number;
    pending_approval: number;
    by_state: Record<string, number>;
  };
  catalog: {
    total_requests: number;
    pending: number;
  };
  knowledge: {
    total_articles: number;
    published: number;
  };
  problems: {
    total: number;
    open: number;
    by_state: Record<string, number>;
  };
  cmdb: {
    total: number;
    active: number;
  };
}

// ── Table Registry ──────────────────────────────────────
export interface ColumnDefinition {
  name: string;
  label: string;
  type: 'string' | 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'select' | 'reference';
  required?: boolean;
  readonly?: boolean;
  options?: { value: string; label: string }[];
  reference?: { table: string; display: string };
  showInList?: boolean;
  showInForm?: boolean;
  default?: unknown;
}

export interface StateConfig {
  initial: string;
  transitions: Record<string, string[]>;
}

export interface TableConfig {
  name: string;
  label: string;
  numberPrefix: string;
  numberSequence: string;
  columns: ColumnDefinition[];
  states?: StateConfig;
}

// ── App Engine ──────────────────────────────────────────
export interface AppEngineApp {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  table_count?: number;
}

export interface AppEngineTable {
  id: string;
  app_id: string;
  name: string;
  label: string;
  number_prefix: string;
  columns: ColumnDefinition[];
  states?: StateConfig | null;
  icon: string;
  active: boolean;
  db_table_created: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppEnginePage {
  id: string;
  app_id: string;
  table_id?: string;
  title: string;
  type: 'list' | 'form' | 'dashboard';
  config: Record<string, unknown>;
  sort_order: number;
}

export interface AppEngineDashboard {
  id: string;
  app_id?: string;
  name: string;
  description?: string;
  layout: WidgetConfig[];
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  id: string;
  type: 'stat_card' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'table' | 'list' | 'report_chart';
  title: string;
  table_name: string;
  aggregate?: 'count' | 'sum' | 'avg';
  aggregate_field?: string;
  filters?: Record<string, unknown>;
  group_by?: string;
  value_field?: string;
  columns?: string[];
  col_span: number;
  row_order: number;
  color?: string;
  icon?: string;
  report_id?: string;
}

// ── Releases ────────────────────────────────────────────
export type ReleaseState = 'planning' | 'review' | 'approved' | 'in_progress' | 'completed' | 'rolled_back' | 'cancelled';
export type ReleaseType = 'major' | 'minor' | 'patch' | 'hotfix';

export interface Release {
  id: string;
  number: string;
  short_description: string;
  description: string;
  state: ReleaseState;
  release_type: ReleaseType;
  priority: Priority;
  risk: RiskLevel;
  impact: string;
  risk_score: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  implementation_plan: string | null;
  test_plan: string | null;
  rollback_plan: string | null;
  communication_plan: string | null;
  deployed_version: string | null;
  previous_version: string | null;
  build_number: string | null;
  release_manager_id: string | null;
  assignment_group_id: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  release_manager_name?: string;
  assigned_to_name?: string;
  assignment_group_name?: string;
  created_by_name?: string;
}

// ── Assets ─────────────────────────────────────────────
export type AssetStatus = 'on_order' | 'in_stock' | 'in_use' | 'in_repair' | 'retired' | 'disposed';
export type AssetType = 'hardware' | 'software' | 'consumable';
export type LicenseType = 'per_seat' | 'per_device' | 'site' | 'enterprise' | 'subscription';
export type ComplianceStatus = 'compliant' | 'over_licensed' | 'under_licensed';

export interface Asset {
  id: string;
  number: string;
  type: AssetType;
  status: AssetStatus;
  model: string | null;
  manufacturer: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_expiry: string | null;
  depreciation_method: string | null;
  salvage_value: number | null;
  location: string | null;
  department: string | null;
  assigned_to: string | null;
  ci_id: string | null;
  parent_asset_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_to_name?: string;
}

export interface SoftwareLicense {
  id: string;
  number: string;
  product_name: string;
  license_type: LicenseType;
  total_entitlements: number;
  allocated_count: number;
  cost_per_unit: number | null;
  start_date: string | null;
  expiry_date: string | null;
  vendor_id: string | null;
  compliance_status: ComplianceStatus;
  created_at: string;
  updated_at: string;
}

export interface AssetLifecycleEvent {
  id: string;
  asset_id: string;
  event_type: string;
  event_date: string;
  notes: string | null;
  performed_by: string | null;
  performed_by_name?: string;
}

// ── Vendors & Contracts ────────────────────────────────
export type VendorType = 'hardware' | 'software' | 'service' | 'consulting';
export type VendorStatus = 'active' | 'inactive' | 'blacklisted';
export type ContractType = 'lease' | 'maintenance' | 'support' | 'subscription' | 'nda' | 'msa';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed';

export interface Vendor {
  id: string;
  number: string;
  name: string;
  type: VendorType;
  status: VendorStatus;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  number: string;
  vendor_id: string | null;
  type: ContractType;
  status: ContractStatus;
  short_description: string;
  start_date: string | null;
  end_date: string | null;
  value: number | null;
  currency: string;
  auto_renew: boolean;
  renewal_period_days: number | null;
  payment_terms: string | null;
  owner_id: string | null;
  notification_days_before_expiry: number | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
  owner_name?: string;
}

export interface ContractLineItem {
  id: string;
  contract_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  item_type: string | null;
}

// ── Projects ───────────────────────────────────────────
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'waterfall' | 'agile' | 'hybrid';
export type ProjectPhase = 'initiation' | 'planning' | 'execution' | 'monitoring' | 'closing';
export type ProjectTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export interface Project {
  id: string;
  number: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: number;
  type: ProjectType;
  start_date: string | null;
  end_date: string | null;
  actual_start: string | null;
  actual_end: string | null;
  budget: number | null;
  actual_cost: number | null;
  owner_id: string | null;
  portfolio: string | null;
  percent_complete: number;
  phase: ProjectPhase | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
}

export interface ProjectTask {
  id: string;
  number: string;
  project_id: string;
  parent_task_id: string | null;
  short_description: string;
  description: string | null;
  status: ProjectTaskStatus;
  priority: number;
  assigned_to: string | null;
  assignment_group_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  percent_complete: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  assigned_to_name?: string;
}

// ── Portal ─────────────────────────────────────────────
export interface PortalAnnouncement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'critical' | 'maintenance';
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_by: string;
  created_at: string;
}

export interface PortalQuickLink {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  category: string | null;
  order_index: number;
  active: boolean;
}

// ── Events & Monitoring ────────────────────────────────
export type EventSeverity = 'critical' | 'major' | 'minor' | 'warning' | 'info' | 'clear';
export type EventStatus = 'open' | 'acknowledged' | 'resolved' | 'closed';

export interface MonitoringEvent {
  id: string;
  number: string;
  source: string;
  severity: EventSeverity;
  status: EventStatus;
  node: string | null;
  type: string | null;
  metric_name: string | null;
  metric_value: string | null;
  threshold: string | null;
  message_key: string | null;
  description: string | null;
  ci_id: string | null;
  alert_rule_id: string | null;
  correlation_id: string | null;
  incident_id: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  acknowledged_by_name?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  source: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  severity_override: string | null;
  assignment_group_id: string | null;
  cooldown_minutes: number;
  created_at: string;
  updated_at: string;
}

// ── Surveys ────────────────────────────────────────────
export type SurveyStatus = 'draft' | 'active' | 'closed';
export type SurveyType = 'satisfaction' | 'feedback' | 'assessment';

export interface Survey {
  id: string;
  number: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  type: SurveyType;
  trigger_table: string | null;
  trigger_state: string | null;
  anonymous: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  type: string;
  options: Record<string, unknown> | null;
  required: boolean;
  order_index: number;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  respondent_id: string | null;
  table_name: string | null;
  record_id: string | null;
  submitted_at: string;
  overall_score: number | null;
  respondent_name?: string;
}

// ── On-Call ────────────────────────────────────────────
export interface OnCallSchedule {
  id: string;
  name: string;
  assignment_group_id: string | null;
  timezone: string;
  rotation_type: string;
  handoff_time: string;
  created_at: string;
  updated_at: string;
  assignment_group_name?: string;
}

export interface OnCallRotation {
  id: string;
  schedule_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  order_index: number;
  user_name?: string;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  assignment_group_id: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  assignment_group_name?: string;
}

// ── Business Services ──────────────────────────────────
export type ServiceCriticality = 'critical' | 'high' | 'medium' | 'low';

export interface BusinessService {
  id: string;
  number: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  status: string;
  criticality: ServiceCriticality;
  portfolio: string | null;
  sla_definition_id: string | null;
  created_at: string;
  updated_at: string;
  owner_name?: string;
}

export interface ServiceDependency {
  id: string;
  service_id: string;
  depends_on_service_id: string;
  dependency_type: 'hard' | 'soft';
  description: string | null;
  service_name?: string;
  depends_on_name?: string;
}

// ── Cost Management ────────────────────────────────────
export interface CostCenter {
  id: string;
  code: string;
  name: string;
  department: string | null;
  manager_id: string | null;
  budget_annual: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  manager_name?: string;
}

export interface CostItem {
  id: string;
  number: string;
  cost_center_id: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  recurring: boolean;
  frequency: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  cost_center_name?: string;
}

// ── Business Continuity ────────────────────────────────
export type BCPlanStatus = 'draft' | 'active' | 'under_review' | 'retired';
export type BCPlanType = 'business_continuity' | 'disaster_recovery' | 'crisis_management';

export interface BCPlan {
  id: string;
  number: string;
  name: string;
  description: string | null;
  status: BCPlanStatus;
  type: BCPlanType;
  owner_id: string | null;
  last_tested: string | null;
  next_test_due: string | null;
  rpo_hours: number | null;
  rto_hours: number | null;
  business_service_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
}

export interface BCTest {
  id: string;
  plan_id: string;
  test_date: string;
  test_type: string;
  status: string;
  actual_rto_hours: number | null;
  actual_rpo_hours: number | null;
  findings: string | null;
  conducted_by: string | null;
  conducted_by_name?: string;
}

// ── Demand Management ──────────────────────────────────
export type DemandStatus = 'submitted' | 'screening' | 'approved' | 'rejected' | 'committed' | 'completed';
export type DemandType = 'project' | 'enhancement' | 'initiative';

export interface Demand {
  id: string;
  number: string;
  title: string;
  description: string | null;
  status: DemandStatus;
  type: DemandType;
  business_justification: string | null;
  requested_by: string | null;
  business_unit: string | null;
  priority: number;
  estimated_effort_days: number | null;
  estimated_cost: number | null;
  expected_value: number | null;
  roi_score: number | null;
  target_quarter: string | null;
  approved_by: string | null;
  project_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  requested_by_name?: string;
  approved_by_name?: string;
}

export interface DemandScore {
  id: string;
  demand_id: string;
  criterion: string;
  score: number;
  weight: number;
  scored_by: string | null;
}

// ── Capacity Planning ──────────────────────────────────
export interface ResourcePool {
  id: string;
  name: string;
  type: string;
  assignment_group_id: string | null;
  total_capacity_hours: number;
  period: string;
  created_at: string;
  updated_at: string;
  assignment_group_name?: string;
}

export interface CapacityAllocation {
  id: string;
  pool_id: string;
  allocated_to_type: string;
  allocated_to_id: string | null;
  hours: number;
  period_start: string;
  period_end: string;
  status: string;
}

export interface CapacityForecast {
  id: string;
  pool_id: string;
  period_start: string;
  forecasted_demand_hours: number;
  available_hours: number;
  gap_hours: number;
  notes: string | null;
}

// ── OLA ────────────────────────────────────────────────
export interface OlaDefinition {
  id: string;
  name: string;
  assignment_group_id: string | null;
  target_minutes: number;
  metric: string;
  conditions: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OlaInstance {
  id: string;
  ola_definition_id: string;
  table_name: string;
  record_id: string;
  start_time: string;
  target_time: string;
  actual_time: string | null;
  breached: boolean;
}

// ── Saved Views ────────────────────────────────────────
export interface SavedView {
  id: string;
  user_id: string;
  table_name: string;
  name: string;
  is_default: boolean;
  filters: Record<string, unknown>;
  columns: string[];
  sort_by: string | null;
  sort_order: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}
