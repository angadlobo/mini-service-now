import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuthStore } from './store/auth';
import { AppShell } from './components/layout/AppShell';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { IncidentList } from './pages/incidents/IncidentList';
import { IncidentForm } from './pages/incidents/IncidentForm';
import { ChangeList } from './pages/changes/ChangeList';
import { ChangeForm } from './pages/changes/ChangeForm';
import { CatalogBrowse } from './pages/catalog/CatalogBrowse';
import { CatalogItemDetail } from './pages/catalog/CatalogItemDetail';
import { CatalogRequestList } from './pages/catalog/CatalogRequestList';
import { KnowledgeSearch } from './pages/knowledge/KnowledgeSearch';
import { ArticleView } from './pages/knowledge/ArticleView';
import { ArticleEditor } from './pages/knowledge/ArticleEditor';
import { MyApprovals } from './pages/approvals/MyApprovals';
import { UserAdmin } from './pages/admin/UserAdmin';
import { ProblemList } from './pages/problems/ProblemList';
import { ProblemForm } from './pages/problems/ProblemForm';
import { CiList } from './pages/cmdb/CiList';
import { CiForm } from './pages/cmdb/CiForm';
import { WorkflowList } from './pages/workflows/WorkflowList';
import { WorkflowDesigner } from './pages/workflows/WorkflowDesigner';
import { WorkflowMonitoring } from './pages/workflows/WorkflowMonitoring';
import { IntegrationList } from './pages/admin/IntegrationList';
import { IntegrationProviders } from './pages/admin/IntegrationProviders';
import { ReportList } from './pages/reports/ReportList';
import { ReportDesigner } from './pages/reports/ReportDesigner';
import { FormTemplateList } from './pages/forms/FormTemplateList';
import { FormDesigner } from './pages/forms/FormDesigner';
import { FormRenderer } from './pages/forms/FormRenderer';
import { AiProviders } from './pages/admin/AiProviders';
import { AiPrompts } from './pages/admin/AiPrompts';
import { SystemSettings } from './pages/admin/SystemSettings';
import { NotificationChannels } from './pages/admin/NotificationChannels';
import { AppList } from './pages/admin/app-engine/AppList';
import { AppDesigner } from './pages/admin/app-engine/AppDesigner';
import { TableDesigner } from './pages/admin/app-engine/TableDesigner';
import { PageDesigner } from './pages/admin/app-engine/PageDesigner';
import { DashboardDesigner } from './pages/admin/app-engine/DashboardDesigner';
import { DynamicList } from './pages/app-engine/DynamicList';
import { DynamicForm } from './pages/app-engine/DynamicForm';
import { DashboardView } from './pages/app-engine/DashboardView';
import { ChangeCalendar } from './pages/changes/ChangeCalendar';
import { ChangeDashboard } from './pages/changes/ChangeDashboard';
import { ChangeTemplates } from './pages/changes/ChangeTemplates';
import { CABDashboard } from './pages/changes/CABDashboard';
import { MaintenanceWindows } from './pages/changes/MaintenanceWindows';
import { ReleaseList } from './pages/releases/ReleaseList';
import { ReleaseForm } from './pages/releases/ReleaseForm';
import { ReleaseCalendar } from './pages/releases/ReleaseCalendar';
import { ReleaseDashboard } from './pages/releases/ReleaseDashboard';
import { OnCallScheduleList } from './pages/oncall/OnCallScheduleList';
import { OnCallScheduleForm } from './pages/oncall/OnCallScheduleForm';
import { WhosOnCall } from './pages/oncall/WhosOnCall';
import { EscalationPolicyList } from './pages/oncall/EscalationPolicyList';
import { EscalationPolicyForm } from './pages/oncall/EscalationPolicyForm';
import { AssetList } from './pages/assets/AssetList';
import { AssetForm } from './pages/assets/AssetForm';
import { LicenseList } from './pages/assets/LicenseList';
import { LicenseForm } from './pages/assets/LicenseForm';
import { ContractList } from './pages/contracts/ContractList';
import { ContractForm } from './pages/contracts/ContractForm';
import { VendorList } from './pages/contracts/VendorList';
import { VendorForm } from './pages/contracts/VendorForm';
import { PortalHome } from './pages/portal/PortalHome';
import { PortalMyTickets } from './pages/portal/PortalMyTickets';
import { EventConsole } from './pages/events/EventConsole';
import { EventDetail } from './pages/events/EventDetail';
import { AlertRuleList } from './pages/events/AlertRuleList';
import { ServiceList } from './pages/service-mapping/ServiceList';
import { ServiceForm } from './pages/service-mapping/ServiceForm';
import { ServiceMap } from './pages/service-mapping/ServiceMap';
import { SurveyList } from './pages/surveys/SurveyList';
import { SurveyDesigner } from './pages/surveys/SurveyDesigner';
import { SurveyDetail } from './pages/surveys/SurveyDetail';
import { SurveyResults } from './pages/surveys/SurveyResults';
import { AgentWorkspace } from './pages/workspace/AgentWorkspace';
import { CostDashboard } from './pages/cost-management/CostDashboard';
import { CostCenterList } from './pages/cost-management/CostCenterList';
import { CostItemList } from './pages/cost-management/CostItemList';
import { ChargebackReport } from './pages/cost-management/ChargebackReport';
import { AnalyticsDashboard } from './pages/analytics/AnalyticsDashboard';
import { BCPlanList } from './pages/business-continuity/BCPlanList';
import { BCPlanForm } from './pages/business-continuity/BCPlanForm';
import { ProjectList } from './pages/projects/ProjectList';
import { ProjectForm } from './pages/projects/ProjectForm';
import { TaskBoard } from './pages/projects/TaskBoard';
import { SlaDashboard } from './pages/sla/SlaDashboard';
import { SlaDefinitions } from './pages/sla/SlaDefinitions';
import { AuditDashboard } from './pages/admin/AuditDashboard';
import { ScheduledJobs } from './pages/admin/ScheduledJobs';
import { ChatbotConfig } from './pages/admin/ChatbotConfig';
import { EmailProcessing } from './pages/admin/EmailProcessing';
import { DemandList } from './pages/demands/DemandList';
import { CapacityDashboard } from './pages/capacity/CapacityDashboard';
import { MajorIncidentList } from './pages/major-incidents/MajorIncidentList';
import { MajorIncidentDetail } from './pages/major-incidents/MajorIncidentDetail';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ChatBot } from './components/common/ChatBot';
import { CommandPalette } from './components/common/CommandPalette';

export default function App() {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <CommandPalette />
      <ChatBot />
      <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        {/* Incidents */}
        <Route path="/incidents" element={<IncidentList />} />
        <Route path="/incidents/new" element={<IncidentForm />} />
        <Route path="/incidents/:id" element={<IncidentForm />} />

        {/* Changes */}
        <Route path="/changes" element={<ChangeList />} />
        <Route path="/changes/new" element={<ProtectedRoute roles={['admin', 'itil']}><ChangeForm /></ProtectedRoute>} />
        <Route path="/changes/dashboard" element={<ChangeDashboard />} />
        <Route path="/changes/calendar" element={<ChangeCalendar />} />
        <Route path="/changes/templates" element={<ProtectedRoute roles={['admin']}><ChangeTemplates /></ProtectedRoute>} />
        <Route path="/changes/cab" element={<ProtectedRoute roles={['admin', 'itil']}><CABDashboard /></ProtectedRoute>} />
        <Route path="/changes/maintenance-windows" element={<ProtectedRoute roles={['admin']}><MaintenanceWindows /></ProtectedRoute>} />
        <Route path="/changes/:id" element={<ChangeForm />} />

        {/* Releases */}
        <Route path="/releases" element={<ReleaseList />} />
        <Route path="/releases/new" element={<ProtectedRoute roles={['admin', 'itil']}><ReleaseForm /></ProtectedRoute>} />
        <Route path="/releases/dashboard" element={<ReleaseDashboard />} />
        <Route path="/releases/calendar" element={<ReleaseCalendar />} />
        <Route path="/releases/:id" element={<ReleaseForm />} />

        {/* On-Call */}
        <Route path="/oncall/schedules" element={<OnCallScheduleList />} />
        <Route path="/oncall/schedules/new" element={<ProtectedRoute roles={['admin', 'itil']}><OnCallScheduleForm /></ProtectedRoute>} />
        <Route path="/oncall/schedules/:id" element={<OnCallScheduleForm />} />
        <Route path="/oncall/whos-oncall" element={<WhosOnCall />} />
        <Route path="/oncall/policies" element={<EscalationPolicyList />} />
        <Route path="/oncall/policies/new" element={<ProtectedRoute roles={['admin', 'itil']}><EscalationPolicyForm /></ProtectedRoute>} />
        <Route path="/oncall/policies/:id" element={<EscalationPolicyForm />} />

        {/* Major Incidents */}
        <Route path="/major-incidents" element={<MajorIncidentList />} />
        <Route path="/major-incidents/:id" element={<MajorIncidentDetail />} />

        {/* Problems */}
        <Route path="/problems" element={<ProblemList />} />
        <Route path="/problems/new" element={<ProtectedRoute roles={['admin', 'itil']}><ProblemForm /></ProtectedRoute>} />
        <Route path="/problems/:id" element={<ProblemForm />} />

        {/* CMDB */}
        <Route path="/cmdb" element={<CiList />} />
        <Route path="/cmdb/cis/new" element={<ProtectedRoute roles={['admin', 'itil']}><CiForm /></ProtectedRoute>} />
        <Route path="/cmdb/cis/:id" element={<CiForm />} />

        {/* Service Catalog */}
        <Route path="/catalog" element={<CatalogBrowse />} />
        <Route path="/catalog/items/:id" element={<CatalogItemDetail />} />
        <Route path="/catalog/requests" element={<CatalogRequestList />} />

        {/* Knowledge Base */}
        <Route path="/knowledge" element={<KnowledgeSearch />} />
        <Route path="/knowledge/new" element={<ProtectedRoute roles={['admin', 'itil', 'knowledge_manager']}><ArticleEditor /></ProtectedRoute>} />
        <Route path="/knowledge/:id" element={<ArticleView />} />
        <Route path="/knowledge/:id/edit" element={<ProtectedRoute roles={['admin', 'itil', 'knowledge_manager']}><ArticleEditor /></ProtectedRoute>} />

        {/* Reports */}
        <Route path="/reports" element={<ReportList />} />
        <Route path="/reports/new" element={<ProtectedRoute roles={['admin', 'itil']}><ReportDesigner /></ProtectedRoute>} />
        <Route path="/reports/:id/edit" element={<ProtectedRoute roles={['admin', 'itil']}><ReportDesigner /></ProtectedRoute>} />

        {/* Forms */}
        <Route path="/forms" element={<FormTemplateList />} />
        <Route path="/forms/new" element={<ProtectedRoute roles={['admin']}><FormDesigner /></ProtectedRoute>} />
        <Route path="/forms/:id/edit" element={<ProtectedRoute roles={['admin']}><FormDesigner /></ProtectedRoute>} />
        <Route path="/forms/:id/fill" element={<FormRenderer />} />

        {/* Approvals */}
        <Route path="/approvals" element={<MyApprovals />} />

        {/* Admin */}
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UserAdmin /></ProtectedRoute>} />
        <Route path="/admin/workflows" element={<ProtectedRoute roles={['admin']}><WorkflowList /></ProtectedRoute>} />
        <Route path="/admin/workflows/new" element={<ProtectedRoute roles={['admin']}><WorkflowDesigner /></ProtectedRoute>} />
        <Route path="/admin/workflows/:id/edit" element={<ProtectedRoute roles={['admin']}><WorkflowDesigner /></ProtectedRoute>} />
        <Route path="/admin/workflows/monitoring" element={<ProtectedRoute roles={['admin']}><WorkflowMonitoring /></ProtectedRoute>} />
        <Route path="/admin/integrations" element={<ProtectedRoute roles={['admin']}><IntegrationList /></ProtectedRoute>} />
        <Route path="/admin/integrations/providers" element={<ProtectedRoute roles={['admin']}><IntegrationProviders /></ProtectedRoute>} />
        <Route path="/admin/ai-providers" element={<ProtectedRoute roles={['admin']}><AiProviders /></ProtectedRoute>} />
        <Route path="/admin/ai-prompts" element={<ProtectedRoute roles={['admin']}><AiPrompts /></ProtectedRoute>} />
        <Route path="/admin/notification-channels" element={<ProtectedRoute roles={['admin']}><NotificationChannels /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><SystemSettings /></ProtectedRoute>} />

        {/* App Engine - Admin */}
        <Route path="/admin/app-engine" element={<ProtectedRoute roles={['admin']}><AppList /></ProtectedRoute>} />
        <Route path="/admin/app-engine/new" element={<ProtectedRoute roles={['admin']}><AppDesigner /></ProtectedRoute>} />
        <Route path="/admin/app-engine/:appId" element={<ProtectedRoute roles={['admin']}><AppDesigner /></ProtectedRoute>} />
        <Route path="/admin/app-engine/tables/:tableId" element={<ProtectedRoute roles={['admin']}><TableDesigner /></ProtectedRoute>} />
        <Route path="/admin/app-engine/pages/:pageId" element={<ProtectedRoute roles={['admin']}><PageDesigner /></ProtectedRoute>} />
        <Route path="/admin/app-engine/dashboards/:dashboardId" element={<ProtectedRoute roles={['admin']}><DashboardDesigner /></ProtectedRoute>} />

        {/* Portal */}
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/my-tickets" element={<PortalMyTickets />} />

        {/* Events */}
        <Route path="/events" element={<EventConsole />} />
        <Route path="/events/rules" element={<ProtectedRoute roles={['admin', 'itil']}><AlertRuleList /></ProtectedRoute>} />
        <Route path="/events/:id" element={<EventDetail />} />

        {/* Service Mapping */}
        <Route path="/service-mapping" element={<ServiceList />} />
        <Route path="/service-mapping/map" element={<ServiceMap />} />
        <Route path="/service-mapping/new" element={<ProtectedRoute roles={['admin', 'itil']}><ServiceForm /></ProtectedRoute>} />
        <Route path="/service-mapping/:id" element={<ServiceForm />} />

        {/* Assets */}
        <Route path="/assets" element={<AssetList />} />
        <Route path="/assets/licenses" element={<LicenseList />} />
        <Route path="/assets/licenses/new" element={<ProtectedRoute roles={['admin', 'itil']}><LicenseForm /></ProtectedRoute>} />
        <Route path="/assets/licenses/:id" element={<LicenseForm />} />
        <Route path="/assets/new" element={<ProtectedRoute roles={['admin', 'itil']}><AssetForm /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<AssetForm />} />

        {/* Contracts & Vendors */}
        <Route path="/contracts/vendors" element={<VendorList />} />
        <Route path="/contracts/vendors/new" element={<ProtectedRoute roles={['admin', 'itil']}><VendorForm /></ProtectedRoute>} />
        <Route path="/contracts/vendors/:id" element={<VendorForm />} />
        <Route path="/contracts" element={<ContractList />} />
        <Route path="/contracts/new" element={<ProtectedRoute roles={['admin', 'itil']}><ContractForm /></ProtectedRoute>} />
        <Route path="/contracts/:id" element={<ContractForm />} />

        {/* Projects */}
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProtectedRoute roles={['admin', 'itil']}><ProjectForm /></ProtectedRoute>} />
        <Route path="/projects/:id/tasks" element={<TaskBoard />} />
        <Route path="/projects/:id" element={<ProjectForm />} />

        {/* Surveys */}
        <Route path="/surveys" element={<SurveyList />} />
        <Route path="/surveys/new" element={<ProtectedRoute roles={['admin', 'itil']}><SurveyDesigner /></ProtectedRoute>} />
        <Route path="/surveys/:id" element={<SurveyDetail />} />
        <Route path="/surveys/:id/results" element={<SurveyResults />} />
        <Route path="/surveys/:id/edit" element={<ProtectedRoute roles={['admin', 'itil']}><SurveyDesigner /></ProtectedRoute>} />

        {/* Cost Management */}
        <Route path="/cost-management" element={<CostDashboard />} />
        <Route path="/cost-management/cost-centers" element={<CostCenterList />} />
        <Route path="/cost-management/items" element={<CostItemList />} />
        <Route path="/cost-management/chargeback" element={<ChargebackReport />} />

        {/* Business Continuity */}
        <Route path="/business-continuity" element={<BCPlanList />} />
        <Route path="/business-continuity/new" element={<ProtectedRoute roles={['admin', 'itil']}><BCPlanForm /></ProtectedRoute>} />
        <Route path="/business-continuity/:id" element={<BCPlanForm />} />

        {/* SLA */}
        <Route path="/sla" element={<SlaDashboard />} />
        <Route path="/sla/definitions" element={<ProtectedRoute roles={['admin']}><SlaDefinitions /></ProtectedRoute>} />

        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsDashboard />} />

        {/* Workspace */}
        <Route path="/workspace" element={<AgentWorkspace />} />

        {/* Demands */}
        <Route path="/demands" element={<DemandList />} />

        {/* Capacity */}
        <Route path="/capacity" element={<CapacityDashboard />} />

        {/* Admin - Audit & Jobs */}
        <Route path="/admin/audit" element={<ProtectedRoute roles={['admin']}><AuditDashboard /></ProtectedRoute>} />
        <Route path="/admin/scheduled-jobs" element={<ProtectedRoute roles={['admin']}><ScheduledJobs /></ProtectedRoute>} />
        <Route path="/admin/chatbot" element={<ProtectedRoute roles={['admin']}><ChatbotConfig /></ProtectedRoute>} />
        <Route path="/admin/email-processing" element={<ProtectedRoute roles={['admin']}><EmailProcessing /></ProtectedRoute>} />

        {/* App Engine - Dynamic record pages */}
        <Route path="/x/:tableName" element={<DynamicList />} />
        <Route path="/x/:tableName/new" element={<DynamicForm />} />
        <Route path="/x/:tableName/:id" element={<DynamicForm />} />

        {/* App Engine - Dashboard view */}
        <Route path="/app-engine/dashboards/:dashboardId" element={<DashboardView />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}
