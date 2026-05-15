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
export interface Report {
  id: string;
  name: string;
  description: string;
  table_name: string;
  filters: Record<string, unknown>;
  columns: string[];
  chart_type: string;
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
  type: 'stat_card' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'table' | 'list';
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
}
