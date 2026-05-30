# Notification System Guide

## Overview

The notification system provides multi-channel notifications to users across 5 different platforms:
- **In-App** (Bell icon in header) — Always enabled
- **Email** (SMTP) — Requires SMTP configuration
- **Slack** — Requires Slack webhook URL
- **Telegram** — Requires bot token and chat ID
- **WhatsApp** — Requires API credentials

## How It Works

### 1. **In-App Notifications** (Always Enabled)
- Created automatically when any action triggers a notification
- Shown in the header bell icon with unread count
- Users can mark as read individually or all at once
- Persist in the database for history

### 2. **External Channels** (User-Configured)
When an event occurs, the system:
1. Creates an in-app notification automatically
2. Checks user preferences for enabled channels
3. Respects user event filters (e.g., "only notify on P1 incidents")
4. Sends to matching active channels

### 3. **Notification Flow**
```
Event (incident.created, change.approved, etc.)
    ↓
Create in-app notification
    ↓
Query user's notification preferences
    ↓
For each active channel that matches the event:
    ├─ Send email (if configured with email)
    ├─ Send Slack message (if webhook URL set)
    ├─ Send Telegram (if bot + chat ID set)
    └─ Send WhatsApp (if API credentials set)
```

## Setting Up Notification Channels

### **Admin → Notification Channels**

#### Email Setup
1. **Settings** → **System Settings** → Configure SMTP:
   - SMTP_HOST: smtp.gmail.com (or your provider)
   - SMTP_PORT: 587 (TLS) or 465 (SSL)
   - SMTP_USER: your-email@gmail.com
   - SMTP_PASSWORD: your-app-password (not regular password for Gmail)
   - SMTP_FROM: noreply@yourcompany.com

2. **Add Email Channel**:
   - Name: "Email Notifications"
   - Type: Email
   - Config: `{"to": "notifications@yourcompany.com"}` (optional, defaults to user's email)
   - Click **Test** to verify SMTP is working

#### Slack Setup
1. Create a Slack app or webhook:
   - Go to https://api.slack.com/apps
   - Create New App → From scratch
   - Name it "Mini ServiceNow"
   - Select your workspace
   - Activate "Incoming Webhooks"
   - Add New Webhook to Workspace
   - Copy the Webhook URL

2. **Add Slack Channel**:
   - Name: "Slack Alerts"
   - Type: Slack
   - Config: Leave empty (uses global SLACK_WEBHOOK_URL setting)
   - Set `SLACK_WEBHOOK_URL` in System Settings
   - Click **Test** to verify connection

#### Telegram Setup
1. Create a Telegram bot:
   - Message @BotFather on Telegram
   - `/newbot` → name your bot
   - Copy the **Bot Token**

2. Get your Chat ID:
   - Message your bot: `/start`
   - Go to https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   - Copy your `chat.id`

3. **Add Telegram Channel**:
   - Name: "Telegram Alerts"
   - Type: Telegram
   - Bot Token: (paste from BotFather)
   - Chat ID: (paste from getUpdates)
   - Click **Test** to verify

#### WhatsApp Setup
1. Set up WhatsApp Business API:
   - Register at https://www.whatsapp.com/business/
   - Get Phone Number ID and Access Token from Meta Business Manager

2. **Add WhatsApp Channel**:
   - Name: "WhatsApp Alerts"
   - Type: WhatsApp
   - Phone Number ID: (from Meta)
   - Access Token: (from Meta)
   - Test Phone: (your WhatsApp number for testing)
   - Click **Test** to verify

## User Notification Preferences

### Where to Configure
**Your Profile → Notification Preferences**

### Preference Structure
- **Channel**: Select Email, Slack, Telegram, or WhatsApp
- **Active**: Toggle on/off
- **Events**: Choose which event types trigger this channel
  - `record.assigned` — When you're assigned
  - `record.state_changed` — When a record state changes
  - `approval.requested` — When approval needed
  - `incident.created` — New incident
  - `change.approved` — Change approval
  - `sla.breached` — SLA violation
  - `workflow.executed` — Workflow action occurred

### Example Setup
**User Beth wants:**
- Email for P1 incidents only → Create Email preference with `record.assigned` event
- Slack for all changes → Create Slack preference with `record.state_changed` event
- Telegram for urgent approvals → Create Telegram preference with `approval.requested` event

## Event Types Triggering Notifications

### Core Events
- `record.assigned` — User assigned to incident, change, problem
- `record.state_changed` — Record moved to different state
- `record.created` — New incident/change/problem created
- `approval.requested` — Approval needed from user
- `incident.escalated` — Incident escalated (P2→P1)
- `sla.breached` — SLA target missed
- `change.approved` — Change was approved
- `workflow.executed` — Workflow action completed
- `comment.mentioned` — User mentioned in comment

### Workflow Actions
When workflows send notifications, they specify event type:
```javascript
await notify(userId, title, body, link, 'incident.escalated');
```

## Troubleshooting

### Email Not Sending
- Check SMTP settings in System Settings
- Verify email address is correct
- Test channel connection (click Test button)
- For Gmail: use App Password, not regular password
- Check server logs for SMTP errors

### Slack Not Sending
- Verify webhook URL is valid
- Test channel connection
- Check that webhook URL is still active (URLs expire)
- Verify Slack workspace permission

### Telegram Not Sending
- Verify bot token is correct
- Verify chat ID is correct
- Make sure bot has permission to message the chat
- Bot must be added to the group/chat first

### WhatsApp Not Sending
- Verify Phone Number ID and Access Token
- Check that test phone is in correct format
- WhatsApp Business API must be approved by Meta

## Database Schema

```sql
-- Notification channels (admin-configured)
notification_channels (id, name, type, config, active, created_at)

-- User preferences (user-configured)
notification_preferences (id, user_id, channel_id, events, active, updated_at)

-- In-app notifications (system-generated)
sys_notification (id, user_id, title, body, link, read, created_at)
```

## Best Practices

1. **Always have In-App enabled** — It's the fallback
2. **Test channels before using** — Use the Test button in admin
3. **Set user preferences thoughtfully** — Avoid notification fatigue
4. **Use event filters** — Don't send ALL events to all channels
5. **Monitor configuration** — Check that SMTP/webhook URLs don't expire
6. **Validate before workflow setup** — Test channels before using in workflows

## API Endpoints

### Manage Channels (Admin Only)
- `GET /api/notification-prefs/channels` — List all channels
- `POST /api/notification-prefs/channels` — Create channel
- `PUT /api/notification-prefs/channels/:id` — Update channel
- `DELETE /api/notification-prefs/channels/:id` — Delete channel
- `POST /api/notification-prefs/channels/:id/test` — Test channel

### User Preferences
- `GET /api/notification-prefs/user` — Get user's preferences
- `POST /api/notification-prefs/user` — Set preference
- `GET /api/notifications` — Get in-app notifications
- `PUT /api/notifications/:id/read` — Mark as read

## Events That Send Notifications

### Incidents
- New incident created (if subscribed to `incident.created`)
- Assigned to incident (if subscribed to `record.assigned`)
- Incident escalated to P1
- Incident SLA breached

### Changes
- New change created
- Change approval requested (if you're an approver)
- Change approved
- Change state updated

### Problems
- New problem created
- Assigned to problem
- Problem linked to incident

### Approvals
- Approval request received
- Approval completed

### Workflows
- Workflow action executed (if event configured)

## Example Workflows Using Notifications

### "P1 Incident Auto-Escalate"
```javascript
// When P1 incident created
await notify(serviceDesk.id, "P1 Incident", "Critical issue: {{record.short_description}}", "/incidents/{{record.number}}", "incident.created");
await notifySlack("🚨 P1 INCIDENT: {{record.number}} - {{record.short_description}}");
```

### "Change Approval Workflow"
```javascript
// When change needs approval
await notify(approver.id, "Change Approval Needed", "{{record.number}}: {{record.short_description}}", "/changes/{{record.number}}", "approval.requested");
```

### "SLA Breach Alert"
```javascript
// When SLA breached
await notify(assignee.id, "⚠️ SLA Breached", "{{record.number}} is overdue", "/incidents/{{record.number}}", "sla.breached");
```
