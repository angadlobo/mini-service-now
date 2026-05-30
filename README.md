# Mini ServiceNow

A full-featured, self-contained IT Service Management (ITSM) platform inspired by ServiceNow. Built for teams that need ticketing, workflow automation, asset management, knowledge base, and AI-assisted operations -- all running from a single `docker-compose up`.

**Stack**: Node.js / Express / TypeScript, PostgreSQL, React / Vite / TypeScript, Mantine UI, Docker

---

## What Is This?

Mini ServiceNow is an open-source ITSM platform that replicates the core functionality of enterprise tools like ServiceNow, Jira Service Management, and Freshservice. It includes:

- **Incident Management** -- Track and resolve IT issues with priority matrices, SLA enforcement, and state machines
- **Change Management** -- Plan, approve, and implement changes with risk assessment and approval workflows
- **Release Management** -- Group changes into coordinated deployment packages with scheduling, risk scoring, rollback tracking, and a release calendar
- **Problem Management** -- Identify root causes across related incidents with investigation workflows
- **CMDB / Asset Management** -- Track configuration items, relationships, and impact analysis
- **Service Catalog** -- Self-service portal with dynamic request forms and approval routing
- **Knowledge Base** -- Searchable articles with rich text editing and publish workflows
- **SLA / OLA Engine** -- Real-time SLA tracking with automatic breach detection, at-risk alerts, and visual compliance dashboard
- **Major Incident Management** -- Declare major incidents, track timeline, manage stakeholder comms, and auto-escalate related tickets to P1
- **Inbound Email** -- Automatically convert emails to tickets via provider webhooks (SendGrid/Mailgun-style) with deduplication and threading
- **Chatbot Integration** -- Multi-platform chatbot (Telegram, Slack, Teams, WhatsApp, Discord) with NLU classification and incident creation via chat
- **Workflow Automation** -- Event-driven rules that auto-assign, notify, and update records
- **AI Integration** -- Configurable AI assist (OpenAI, Anthropic, Ollama, or any custom provider) for summarization, resolution suggestions, risk assessment, and more
- **Form Builder** -- Drag-and-drop custom forms with field validation
- **Reporting & Export** -- Build custom reports and export to CSV
- **Webhooks / Integrations** -- Push events to external systems with retry logic, plus OAuth2 integrations with 8 external platforms
- **Notifications** -- In-app, email (SMTP), and Slack notification channels
- **Role-Based Access Control** -- Admin, ITIL, User, Approver, and Knowledge Manager roles

Everything is configurable through the admin UI -- no code changes needed to add AI providers, configure SMTP, set up webhooks, or create workflow rules.

---

## Quick Start (Docker)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed

### Run it

```bash
git clone <repo-url> mini-service-now
cd mini-service-now
docker-compose -f docker-compose.dev.yml up --build
```

Wait for the containers to start (the server runs all database migrations and seeds automatically on first boot), then open:

**[http://localhost:3000](http://localhost:3000)**

### Default Login

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

Log in with `admin` / `admin123` to get full access to all features.

---

## All Demo Accounts

| Username | Password | Role | What You Can Do |
|---|---|---|---|
| `admin` | `admin123` | Admin | Everything -- manage users, configure AI, workflows, settings |
| `itil.user` | `itil123` | ITIL | Create/manage incidents, changes, problems, KB articles |
| `end.user` | `user123` | User | Create incidents, browse catalog, submit requests, read KB |
| `approver` | `approver123` | Approver + ITIL | Approve changes and catalog requests + ITIL operations |
| `kb.manager` | `kb123` | Knowledge Manager + ITIL | Manage KB articles + ITIL operations |
| `beth.service` | `beth123` | ITIL | Service Desk + DevOps agent |
| `charlie.ops` | `charlie123` | ITIL | Network Operations lead |
| `diana.dev` | `diana123` | User | Developer / end user |
| `frank.network` | `frank123` | ITIL | Network Operations engineer |
| `grace.sec` | `grace123` | Approver + ITIL | Security team / change approver |
| `hector.mgr` | `hector123` | Approver + ITIL | DevOps manager / change approver |

You can also register a new account from the login page (self-registration is enabled by default).

---

## Installation Options

### Option 1: Docker (Recommended)

**Development mode** (hot reload on code changes):
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Production mode**:
```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Client (React) | [http://localhost:3000](http://localhost:3000) |
| Server (API) | [http://localhost:3001](http://localhost:3001) |
| PostgreSQL | `localhost:5432` |

### Option 2: Local Development (without Docker)

**Prerequisites**: Node.js 20+, PostgreSQL 14+

**1. Set up the database**
```bash
psql -U postgres -c "CREATE USER msn_user WITH PASSWORD 'msn_password';"
psql -U postgres -c "CREATE DATABASE miniservicenow OWNER msn_user;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE miniservicenow TO msn_user;"
```

**2. Configure environment**
```bash
cp .env.example .env
# Edit .env if your PostgreSQL settings differ
```

**3. Start the server**
```bash
cd server
npm install
npm run dev
```
The server runs migrations and seeds automatically on startup. API at `http://localhost:3001`.

**4. Start the client**
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Modules

### Dashboard
- Stat cards: open incidents, changes, problems, catalog requests, KB articles, active CIs
- Incidents by priority bar chart, changes by state pie chart
- "My Work" tables for assigned incidents, changes, and problems

### Incident Management
- Full CRUD with auto-generated INC numbers
- Priority matrix (urgency x impact)
- State machine: New -> In Progress -> On Hold -> Resolved -> Closed
- SLA engine with auto-calculated due dates and breach detection
- Assignment to users and groups
- Comments, work notes, attachments, audit trail
- AI assist: summarize, suggest resolution, classify

### Change Management
- Full CRUD with auto-generated CHG numbers
- Types: Normal, Standard, Emergency
- Risk levels: High, Moderate, Low
- State machine: New -> Assess -> Authorize -> Scheduled -> Implement -> Review -> Closed
- Approval workflow (auto-advances to Scheduled when all approved)
- Backout plans and justification fields
- AI assist: risk assessment

### Release Management
- Full CRUD with auto-generated REL numbers (REL000001, REL000002, ...)
- Types: Major, Minor, Patch, Hotfix
- Risk levels: High, Moderate, Low with computed risk scores (risk x impact matrix adjusted by type and change count)
- State machine: Planning -> Review -> Approved -> In Progress -> Completed / Rolled Back
- Deployment actions: start deployment, complete deployment, rollback with stakeholder notifications
- Link multiple change requests to a release with sequence ordering and per-change deployment status
- Affected CI tracking and stakeholder management with roles (stakeholder, approver, tester, developer)
- Version tracking: deployed version, previous version, build number
- Release calendar with month grid view color-coded by release type
- Release dashboard with KPI stat cards (total, success rate, rollback count, avg deployment hours), state/type charts, and monthly trend
- Implementation plan, test plan, rollback plan, and communication plan fields
- Journal/comments, attachments, audit trail, and approval panels

### Problem Management
- Full CRUD with auto-generated PRB numbers
- State machine: New -> Investigation -> Root Cause Found -> Fix in Progress -> Resolved -> Closed
- Link related incidents and changes
- Root cause, workaround, and permanent solution fields
- AI assist: root cause analysis

### CMDB / Asset Management
- CI types (Server, Network Device, Application, Database, Storage)
- Configuration items with serial numbers, locations, costs, and custom attributes
- Relationships: depends_on, runs_on, connected_to
- Recursive impact analysis (which CIs are affected if this one goes down?)
- State machine: Inventory -> Active -> Maintenance -> Retired

### Service Catalog
- Browse items by category with card grid layout
- Dynamic request forms generated from item variable definitions
- Auto-created approval records for items requiring approval
- Request tracking with REQ numbers

### SLA / OLA Engine
- SLA definitions with structured condition builder (no JSON required)
- Applies to incidents and problems based on priority, urgency, impact, state
- Real-time breach tracking with 60-second check interval
- Dashboard showing compliance metrics, at-risk tickets, and breached SLAs
- Automatic SLA instance creation on record matching
- Completion on ticket resolution

### Major Incident Management
- Declare major incidents from any incident to escalate to P1 and alert stakeholders
- Timeline tracking of all updates and state changes
- Stakeholder communication panel for coordinated response
- Post-incident workflow and resolution tracking
- Auto-escalation of related incidents to critical priority
- Dashboard with major incident stats and status overview

### Inbound Email Processing
- Provider-based webhook ingestion (`POST /api/email/inbound`) from SendGrid/Mailgun/custom senders
- Automatic email-to-ticket conversion with deduplication (message-id based)
- Email-to-comment threading (emails matching `Re:[INC-xxxx]` thread as comments)
- Routing rules with structured condition builder (subject contains, body contains, from domain)
- Priority-based rule evaluation (highest priority rule wins)
- Mailbox & account configuration panel
- Recently-processed log with action tracking

### Chatbot Integration
- Multi-platform support: Telegram, Slack, Teams, WhatsApp, Discord
- Slash-command operations: `/incident`, `/change`, `/problem`, `/request`, `/status`, `/link`
- Admin config page with platform-specific secret tokens (masked in UI)
- NLU classification engine (ready for AI provider integration)
- Webhook URLs for each platform with copy-to-clipboard
- Live session tracking and conversation threading
- Linked user accounts to associate chat users with system users

### Knowledge Base
- PostgreSQL full-text search across titles and body content
- Category sidebar navigation
- TipTap rich text editor for article authoring
- Publish workflow: Draft -> Review -> Published -> Retired
- View counts and "helpful" voting
- AI assist: generate KB article from resolved incident

### Workflow Automation
- Event-driven rules triggered on record create, update, or state change
- Condition builder: equals, not_equals, greater_than, less_than, contains, in, is_empty, regex
- Actions: set field, change state, assign to user/group, send notification, create journal entry
- Execution log with success/error tracking

### AI Integration (Configurable)
- **Any provider**: OpenAI, Anthropic (Claude), Ollama (local), or any OpenAI-compatible API
- **Admin configurable**: Add provider in Settings -> AI Providers, enter API key and model, test connection
- **Built-in prompts**: Incident summary, resolution suggestions, change risk assessment, problem root cause, KB article drafting, ticket classification
- **Custom prompts**: Create your own prompt templates with `{{variable}}` placeholders
- **Usage tracking**: Token counts, feedback (helpful/not helpful), per-provider stats
- **No vendor lock-in**: Switch providers anytime, all configuration in the UI

### Form Builder
- Create custom form templates with drag-and-drop field ordering
- Field types: text, textarea, number, date, select, checkbox, radio, section headers
- Form submission tracking
- Standalone forms or attached to catalog items

### Reporting & Export
- Build custom reports by selecting table, columns, and filters
- Chart types: table, bar, pie, line
- Export to CSV
- Schedule reports (cron-based)

### Surveys
- **Question Types**: Rating (1-5), Rating (1-10), NPS (0-10), Yes/No, Multiple Choice, Text
- **Question Management**: Add, edit, delete, and reorder questions
- **Email Distribution**: Share surveys via email with custom invitations to multiple recipients
- **Date-Based Activation**: Set active_from and active_until timestamps, or toggle is_active manually
- **Response Submission**: Collect responses from active surveys with required field validation
- **Analytics**: Per-question statistics with distribution, averages, NPS breakdown, and sample feedback
- **Shareable Links**: Copy survey link for direct distribution
- **Respondent Tracking**: Anonymous or identified responses (configurable per survey)

### Integration Providers (Bidirectional)
- **8 first-class providers**: GitHub, GitLab, Jira, PagerDuty, Microsoft Teams, Azure DevOps, Datadog, Grafana
- **Bidirectional data flow**: push actions to external systems and receive inbound webhooks
- **OAuth2 support**: popup-based OAuth flow for GitHub, GitLab, Jira, Azure DevOps
- **API key / token auth**: PagerDuty, Datadog, Grafana, Teams webhook URL
- **Integration links**: linked external resources shown on incident, change, and problem records
- **Workflow actions**: 22 provider-specific actions available in the workflow designer (e.g. `github_create_issue`, `jira_transition_issue`, `pagerduty_trigger`)
- **Inbound webhooks**: receive events from external systems with per-provider signature verification
- **Auto-create incidents**: Datadog, Grafana, and PagerDuty alerts automatically create incidents
- **Provider config UI**: admin gallery page with dynamic forms, connection testing, and status badges

### Webhooks (Legacy)
- Push events to external URLs on record create/update/state change
- Auth types: none, bearer token, basic auth, API key
- Retry with exponential backoff (3 attempts)
- Full request/response logging
- Test webhook from the UI

### Notifications
- **5 notification channels**: In-app (bell icon), Email (SMTP), Slack, Telegram, WhatsApp
- **Event-driven delivery**: Configure which events trigger each channel
- **Per-user preferences**: Users control which channels they receive notifications on
- **Channel management**: Admin can configure, test, and enable/disable channels
- **User preferences UI**: Control notification channels per user via profile settings
- **Full integration**: Works with incidents, changes, problems, approvals, workflows, SLA breaches
- **[📋 Full Notification Guide](NOTIFICATION_GUIDE.md)**: Setup instructions, troubleshooting, API endpoints, best practices

### Approvals
- Centralized My Approvals page
- Approve/reject with comments
- Auto-state advancement when all approvals complete

### Admin
- User management (view, edit roles, activate/deactivate)
- System settings (SMTP, Slack, AI, feature flags)
- Workflow rule management
- Integration/webhook management
- AI provider and prompt configuration
- Notification channel setup

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user profile |

### Core ITSM
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/incidents` | List/create incidents |
| GET/PUT | `/api/incidents/:id` | Get/update incident |
| GET/POST | `/api/changes` | List/create changes |
| GET/PUT | `/api/changes/:id` | Get/update change |
| GET/POST | `/api/problems` | List/create problems |
| GET/PUT | `/api/problems/:id` | Get/update problem |
| POST/DELETE | `/api/problems/:id/incidents/:iid` | Link/unlink incident |
| POST/DELETE | `/api/problems/:id/changes/:cid` | Link/unlink change |

### SLA / OLA
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/sla/definitions` | List/create SLA definitions |
| PUT/DELETE | `/api/sla/definitions/:id` | Update/delete SLA definition |
| GET | `/api/sla/dashboard` | SLA compliance dashboard |
| GET | `/api/sla/at-risk` | At-risk tickets (SLA due soon) |
| GET | `/api/sla/breached` | Breached SLAs |

### Major Incidents
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/major-incidents` | List/create major incidents |
| GET/PUT | `/api/major-incidents/:id` | Get/update major incident |
| POST | `/api/major-incidents/:id/declare-from-incident` | Escalate incident to major |
| GET | `/api/major-incidents/:id/timeline` | Timeline of updates |
| POST | `/api/major-incidents/:id/stakeholder-update` | Send stakeholder communication |
| POST | `/api/major-incidents/:id/resolve` | Resolve major incident |
| GET | `/api/major-incidents/dashboard` | Major incident stats & overview |

### Email Processing
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/email/accounts` | List/create email accounts |
| DELETE | `/api/email/accounts/:id` | Delete email account |
| GET/POST | `/api/email/rules` | List/create routing rules |
| DELETE | `/api/email/rules/:id` | Delete routing rule |
| GET | `/api/email/processed` | Recently processed emails log |
| POST | `/api/email/inbound` | Inbound email webhook (public) |

### Chatbot
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chatbot/config` | Chatbot platform configuration |
| PUT | `/api/chatbot/config/:platform` | Update platform config |
| GET | `/api/chatbot/nlu/classify` | Classify user message with NLU |
| POST | `/api/chatbot/:platform` | Inbound message webhook |
| GET | `/api/chatbot/sessions` | List chat sessions |
| GET | `/api/chatbot/sessions/:id` | Get session messages |

### Releases
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/releases` | List/create releases |
| GET/PUT | `/api/releases/:id` | Get/update release |
| GET | `/api/releases/metrics` | Release metrics & KPIs |
| GET | `/api/releases/calendar` | Release calendar data |
| GET/POST/DELETE | `/api/releases/:id/changes` | Linked changes |
| POST/DELETE | `/api/releases/:id/cis` | Affected CIs |
| POST/DELETE | `/api/releases/:id/stakeholders` | Release stakeholders |
| POST | `/api/releases/:id/start-deployment` | Start deployment |
| POST | `/api/releases/:id/complete-deployment` | Complete deployment |
| POST | `/api/releases/:id/rollback` | Rollback release |

### CMDB
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/cmdb/types` | CI types |
| GET/POST | `/api/cmdb/cis` | List/create CIs |
| GET/PUT | `/api/cmdb/cis/:id` | Get/update CI |
| GET/POST/DELETE | `/api/cmdb/cis/:id/relationships` | CI relationships |
| GET | `/api/cmdb/cis/:id/impact` | Impact analysis |

### Service Catalog & Knowledge
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/catalog/categories` | Catalog categories |
| GET | `/api/catalog/items` | Catalog items |
| POST/GET | `/api/catalog/requests` | Submit/list requests |
| GET | `/api/knowledge` | List/search KB articles |
| GET/POST/PUT | `/api/knowledge/:id` | CRUD article |

### Automation & Integration
| Method | Endpoint | Description |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/workflows` | Workflow rules |
| GET | `/api/workflows/executions` | Execution log |
| GET/POST/PUT/DELETE | `/api/integrations` | Webhooks / integrations |
| POST | `/api/integrations/:id/test` | Test connection |
| GET | `/api/integrations/:id/logs` | Delivery logs |

### Integration Providers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/integrations/providers` | List all provider metadata |
| POST | `/api/integrations/:id/oauth/start` | Start OAuth2 flow |
| GET | `/api/integrations/oauth/callback` | OAuth2 callback |
| POST | `/api/integrations/:id/oauth/refresh` | Refresh OAuth token |
| POST | `/api/integrations/hooks/:webhookId` | Inbound webhook (public) |
| GET | `/api/integrations/links/:table/:recordId` | Get linked resources |
| POST | `/api/integrations/links` | Create integration link |
| DELETE | `/api/integrations/links/:id` | Delete integration link |

### AI
| Method | Endpoint | Description |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/ai/providers` | AI provider config |
| POST | `/api/ai/providers/:id/test` | Test AI connection |
| GET/POST/PUT/DELETE | `/api/ai/prompts` | Prompt templates |
| POST | `/api/ai/generate` | Generate AI completion |
| POST | `/api/ai/feedback` | Submit feedback |
| GET | `/api/ai/usage` | Usage statistics |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/reports` | Reports |
| GET | `/api/reports/:id/run` | Run report |
| GET | `/api/reports/:id/export` | Export CSV |
| GET/POST/PUT/DELETE | `/api/forms` | Form templates |
| POST | `/api/forms/:id/submit` | Submit form |
| GET/PUT | `/api/settings` | System settings |
| GET/PUT | `/api/notification-prefs` | Notification preferences |
| GET/POST | `/api/journal/:table/:id` | Comments/work notes |
| GET/POST/DELETE | `/api/attachments/:table/:id` | File attachments |
| GET | `/api/audit/:table/:id` | Audit trail |
| GET | `/api/approvals/mine` | My approvals |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/health` | Health check |

---

## Project Structure

```
mini-service-now/
├── docker-compose.yml              # Production
├── docker-compose.dev.yml          # Development with hot reload
├── shared/                         # Shared TypeScript interfaces & constants
├── server/
│   ├── src/
│   │   ├── config/                 # Database, logger, app config
│   │   ├── core/                   # Table registry, query builder, state machine,
│   │   │   ├── event-bus.ts        # Typed event emitter for all record events
│   │   │   ├── ai-engine.ts        # AI provider adapters (OpenAI, Anthropic, Ollama, custom)
│   │   │   ├── workflow-engine.ts  # Condition evaluator + action executor
│   │   │   ├── webhook-dispatcher.ts # Event-driven webhook delivery with retry
│   │   │   └── channels/           # Email (nodemailer), Slack, in-app notification channels
│   │   ├── middleware/             # Auth (JWT), RBAC, validation, error handler
│   │   ├── modules/
│   │   │   ├── auth/               # Login, register, refresh, JWT
│   │   │   ├── users/              # User & group management
│   │   │   ├── incidents/          # Incident CRUD + state machine + SLA
│   │   │   ├── changes/            # Change CRUD + state machine + approvals
│   │   │   ├── releases/           # Release CRUD + deployment actions + calendar
│   │   │   ├── problems/           # Problem CRUD + linked incidents/changes
│   │   │   ├── cmdb/               # CI types, CIs, relationships, impact analysis
│   │   │   ├── catalog/            # Categories, items, requests
│   │   │   ├── knowledge/          # Articles with full-text search
│   │   │   ├── sla/                # SLA definitions, dashboard, breach tracking, at-risk alerts
│   │   │   ├── major-incidents/    # Major incident declare, timeline, stakeholder comms
│   │   │   ├── email-processing/   # Inbound email webhook, rules, threading, dedup
│   │   │   ├── chatbot/            # Multi-platform chatbot config, NLU, command handling
│   │   │   ├── workflows/          # Automation rule CRUD + execution history
│   │   │   ├── integrations/       # Webhook CRUD + provider integrations + links
│   │   ├── integrations/            # Provider abstraction layer
│   │   │   ├── provider-interface.ts  # Abstract provider class + interfaces
│   │   │   ├── provider-registry.ts   # Singleton registry for all providers
│   │   │   ├── oauth-service.ts       # OAuth2 authorization code flow
│   │   │   ├── inbound-handlers.ts    # Inbound event processing + auto-create
│   │   │   └── providers/             # 8 provider implementations
│   │   │   ├── reporting/          # Reports, run, CSV export, schedules
│   │   │   ├── form-builder/       # Form templates, fields, submissions
│   │   │   ├── ai/                 # AI providers, prompts, generate, usage
│   │   │   ├── settings/           # System settings key-value store
│   │   │   ├── approvals/          # Approval workflow
│   │   │   ├── notifications/      # In-app notifications
│   │   │   ├── notification-prefs/ # Channel preferences per user
│   │   │   └── dashboard/          # Stats & my-work
│   │   ├── db/
│   │   │   ├── migrations/         # 26 Knex migrations
│   │   │   └── seeds/              # Demo data
│   │   └── types/
│   └── Dockerfile / Dockerfile.dev
└── client/
    ├── src/
    │   ├── api/                    # Axios client + per-module API files
    │   ├── store/                  # Zustand (auth, ui)
    │   ├── components/
    │   │   ├── layout/             # AppShell with navbar + sidebar
    │   │   ├── common/             # DataTable, FilterBar, Pagination,
    │   │   │                       # ActivityStream, AttachmentPanel, ApprovalPanel,
    │   │   │                       # StateIndicator, PriorityBadge, AiAssistPanel
    │   │   ├── integrations/       # ProviderConfigForm, IntegrationLinksPanel,
    │   │   │                       # OAuthConnectButton, ProviderCard, StatusBadge
    │   │   └── charts/             # StatCard
    │   ├── pages/
    │   │   ├── Login, Register, Dashboard
    │   │   ├── incidents/          # IncidentList, IncidentForm
    │   │   ├── changes/            # ChangeList, ChangeForm
    │   │   ├── releases/           # ReleaseList, ReleaseForm, ReleaseCalendar, ReleaseDashboard
    │   │   ├── problems/           # ProblemList, ProblemForm
    │   │   ├── cmdb/               # CiList, CiForm
    │   │   ├── catalog/            # CatalogBrowse, CatalogItemDetail, CatalogRequestList
    │   │   ├── knowledge/          # KnowledgeSearch, ArticleView, ArticleEditor
    │   │   ├── sla/                # SlaDashboard, SlaDefinitions
    │   │   ├── major-incidents/    # MajorIncidentList, MajorIncidentDetail
    │   │   ├── reports/            # ReportList
    │   │   ├── forms/              # FormTemplateList, FormDesigner, FormRenderer
    │   │   ├── workflows/          # WorkflowList
    │   │   ├── approvals/          # MyApprovals
    │   │   └── admin/              # UserAdmin, SystemSettings, AiProviders, AiPrompts,
    │   │                           # IntegrationList, IntegrationProviders, NotificationChannels,
    │   │                           # ChatbotConfig, EmailProcessing
    │   └── routes/                 # ProtectedRoute
    ├── nginx.conf
    └── Dockerfile / Dockerfile.dev
```

---

## UI Improvements & Resilience

- **Error Boundaries**: Graceful error handling for pages that crash. Shows error message + "Retry" and "Go to Dashboard" buttons instead of blanking the entire app
- **Condition Builder**: Reusable form component for structured condition editing (no JSON required). Used in SLA definitions, email routing rules, and event alerts with field hints
- **Token Refresh**: Single-flight auth pattern prevents token refresh stampedes. Multiple concurrent 401 errors await one refresh instead of each firing independently
- **Data Normalization**: Robust handling of API responses that return both object and array shapes (e.g., by_state metrics)

---

## Architecture

### Table-Driven Engine
Each module registers its table with the `tableRegistry`, defining columns, states, and transitions. This enables generic CRUD, state machine validation, and polymorphic journal/attachments/audit/approvals (all keyed by `table_name + record_id`).

### Event Bus
All record creates, updates, and state changes emit typed events. The workflow engine, webhook dispatcher, and integration providers listen to these events and react automatically. The `integration.inbound` event type enables workflows to trigger on external events received from provider webhooks.

### Integration Provider System
A pluggable provider abstraction layer (`IntegrationProvider` abstract class) enables first-class integrations with external tools. Each provider defines its auth method, config fields, inbound webhook verification, and workflow actions. The `providerRegistry` singleton manages all registered providers and enables the workflow engine to delegate provider-specific actions automatically. OAuth2 flows use transient state sessions stored in the database with popup-based client authorization.

### Authentication
- JWT access tokens (15 min) stored in memory
- Refresh tokens (7 days) in httpOnly cookies
- Passwords hashed with bcrypt (12 rounds)
- RBAC middleware: `requireRole('admin')`, `requireRole('itil', 'admin')`
- Self-registration with configurable feature flag

### AI Engine
- Provider adapters for OpenAI, Anthropic, Ollama, and any custom OpenAI-compatible API
- API keys encrypted at rest (AES-256)
- Prompt templates with `{{variable}}` interpolation
- Usage logging with token counts and user feedback

### SLA Engine
- SLA definitions match records by condition (e.g., `{ priority: 1 }` -> 60 min target)
- SLA instances track start time, planned end, and breach status
- Automatically applied on incident creation, completed on resolution
- Event-driven SLA start on record state changes
- 60-second cron cycle checks for breaches and at-risk alerts
- Real-time dashboard showing compliance metrics and breached/at-risk tickets

---

## Seed Data

The application seeds itself on first startup with:

- 5 roles, 11 users (admin, ITIL agents, end users, approvers, managers), 4 assignment groups
- 20 demo incidents across all states and priorities (INC1001-INC1020) with journal entries
- 10 demo changes with approvals, affected CIs, and linked incidents/problems (CHG1001-CHG1010)
- 3 demo problems linked to incidents and changes
- 5 CI types, 16 CIs with relationships (servers, switches, load balancer, SAN, WAF, AD, Citrix, print server)
- 4 catalog categories, 10 catalog items with dynamic form variables, 8 requests across all states
- 5 KB categories, 15 KB articles (published + draft) covering networking, security, software, and policies
- 7 workflow rules with triggers, webhooks, and scheduled runs (auto-assign, escalate, notify, auto-close, Slack alerts)
- 11+ workflow executions with action logs for workflow monitoring dashboard
- 6 change templates (3 standard pre-approved, 2 normal CAB-required, 1 emergency)
- 3 maintenance windows (weekly, monthly, quarterly) and 2 blackout windows
- 3 CAB meetings with agenda items, votes, and meeting minutes
- 4 change approval rules (by risk level, change type, and impact)
- 7 reports with 3 scheduled report deliveries (incident, change, asset, problem reports)
- 6 AI prompt templates (ready to use once a provider is configured)
- 3 notification channels (in-app, email, Slack) with demo user preferences showing how to configure per-event subscriptions
- 2 form templates (Employee Onboarding, Change Request Intake) with 4 submissions
- 15+ approval records across changes and catalog requests
- Journal entries on incidents, changes, and problems, 4 SLA definitions
- 6 integration providers (GitHub, Jira, PagerDuty, Teams, Datadog, Grafana) with sample configs
- 7 integration links connecting external resources to incidents, changes, and problems
- Sample integration delivery logs for inbound and outbound events
- 4 SLA definitions (P1/P2/P3 incident response + problem investigation)
- Chatbot platform configs (Telegram, Slack, Teams, WhatsApp, Discord with sample tokens)
- Email account & rule configurations with sample mailbox and routing rules
- Major incident with timeline and stakeholder communications demo
