# Assets & Contracts Management System Enhancements

## Overview

Comprehensive enhancements have been added to the asset management (CMDB) and contracts modules to provide enterprise-grade lifecycle management and compliance tracking.

## Assets (CMDB) Enhancements

### New Fields Added to `cis` Table
```sql
-- Vendor & License
vendor_id (FK to vendors)
license_key
license_count (default 1)
license_expiration

-- Assignment & Ownership
assigned_to_id (FK to users)
assigned_to_department
assigned_by_id (FK to users)
assigned_at

-- Warranty & Maintenance
warranty_expiration
warranty_provider
purchase_date
last_maintenance_by_id (FK to users)
last_maintenance_date

-- Lifecycle & Depreciation
depreciation_status ('active', 'deprecating', 'deprecated', 'retired')
current_value (decimal)
original_value (decimal)
depreciation_months (integer)

-- Classification & Billing
tags (JSON array)
business_unit
cost_center
asset_category

-- Additional
image_url (for asset photos)
description (text field)
```

### New Tables Created

#### `asset_maintenance_logs`
Tracks all maintenance activities on assets:
- maintenance_type (preventive, corrective, upgrade, inspection)
- description, maintenance_date
- performed_by_id, cost, next_scheduled_date
- notes

#### `asset_licenses`
Detailed license tracking per asset:
- license_key, license_type (perpetual, subscription, trial, educational, volume)
- license_count, activation_date, expiration_date
- is_active, status (active, expiring_soon, expired, suspended)
- license_cost, notes

#### `asset_allocations`
Complete allocation history with full audit trail:
- user_id, department, allocated_at, deallocated_at
- allocation_reason (new_hire, transfer, replacement, return)
- allocated_by_id, notes

### New Service Methods

```typescript
// Maintenance
getMaintenanceLogs(ciId: string)
addMaintenanceLog(ciId: string, data, userId: string)

// Licenses
getLicenses(ciId: string)
addLicense(ciId: string, data, userId: string)
removeLicense(licenseId: string)

// Allocation
getAllocationHistory(ciId: string)
allocateAsset(ciId: string, userId: string, data)
deallocateAsset(ciId: string)
```

## Contracts Enhancements

### New Fields Added to `contracts` Table
```sql
-- Licensing
license_count
license_type (perpetual, subscription, trial, educational, volume)
license_key
license_expiration

-- Contract Details
terms_and_conditions (text)
scope_of_work (text)
contract_document_url

-- Renewal Management
renewal_date
renewal_reminder_days (default 30)

-- SLA & Support
sla_response_time
sla_resolution_time
support_hours
support_channels (phone, email, ticket, onsite)

-- Contacts
primary_contact_id (FK to users)
secondary_contact_id (FK to users)

-- Financial
discount_percentage (decimal)
actual_cost (decimal)
payment_method (credit_card, bank_transfer, check, purchase_order)
invoice_frequency (monthly, quarterly, annual, one_time)

-- Compliance & Risk
compliance_status (compliant, non_compliant, pending_review)
is_critical (boolean)

-- Internal Management
internal_notes (text)
external_notes (text)
```

### New Tables Created

#### `contract_linked_assets`
Tracks which assets are covered by which contracts:
- contract_id, ci_id (asset)
- license_type (support, maintenance, licensing, warranty)
- coverage_start, coverage_end, coverage_notes

#### `contract_renewals`
Complete renewal history and tracking:
- previous_contract_id, renewal_date, next_renewal_date
- renewed_value, renewal_status (pending, approved, executed, declined)
- approved_by_id, approval_date, renewal_notes

#### `contract_milestones`
Project-based contract deliverables:
- name, description, due_date, completed_date
- status (pending, in_progress, completed, overdue, cancelled)
- payment_due, payment_received
- deliverables, notes

#### `vendor_service_levels`
SLA terms per vendor:
- service_name, response_time_hours, resolution_time_hours
- availability_percentage
- included_services, excluded_services, notes

### New Service Methods

```typescript
// Linked Assets
getLinkedAssets(contractId: string)
linkAsset(contractId: string, ciId: string, data)
unlinkAsset(linkId: string)

// Renewals
getRenewals(contractId: string)
addRenewal(contractId: string, data, userId: string)

// Milestones
getMilestones(contractId: string)
addMilestone(contractId: string, data, userId: string)
updateMilestone(milestoneId: string, data)
```

## Database Migration

**Migration File**: `044_assets_contracts_enhancements.ts`

Creates 7 new tables with proper indexing, cascading deletes, and unique constraints for data integrity.

## Use Cases Enabled

✅ **Asset Lifecycle Management**
- Track asset from purchase through depreciation to disposal
- Monitor warranty and maintenance schedules
- Calculate depreciation and current asset value

✅ **License Tracking**
- Assign licenses to specific assets
- Monitor license expiration and compliance
- Track license costs per asset

✅ **Assignment & Audit Trail**
- Complete history of who had which asset and when
- Department allocation tracking
- Reason codes for transfers/replacements

✅ **Contract Compliance**
- Link assets to contracts for coverage verification
- Track SLA terms and support channels
- Monitor renewal dates with automated reminders
- Project-based milestone tracking with payment

✅ **Financial Tracking**
- Asset depreciation calculation
- License cost per asset
- Contract costs and payment terms
- Discount tracking

✅ **Vendor Management**
- SLA terms per vendor service
- Vendor assessment tracking
- Critical contract flagging

## Implementation Notes

### Database Migrations
The new migration (044) adds all required tables and columns. Run migrations on next Docker restart:
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### API Integration
All new service methods are accessible via updated CMDB and Contracts controller endpoints. Add routes as needed for:
- Asset maintenance log management
- License lifecycle management
- Asset allocation tracking
- Contract linked assets
- Contract renewals and milestones

### Frontend Implementation
The SurveyDetail component has been fully updated with:
- Question management (add, edit, delete)
- Email sharing with custom messages
- Date-based activation (active_from, active_until)
- Manual active toggle
- Comprehensive analytics dashboard with accordion views

## Testing Checklist

When Docker is running, test:

- [ ] Create a new asset with vendor, license info
- [ ] Add maintenance log to asset
- [ ] Add license to asset
- [ ] Allocate asset to user
- [ ] View allocation history
- [ ] Create contract with license details
- [ ] Link asset to contract
- [ ] Add contract renewal
- [ ] Add contract milestone
- [ ] View contract analytics (by vendor, expiration, cost)

## Related Documentation

- See `NOTIFICATION_GUIDE.md` for notification system details
- See `README.md` for full feature list
- See `SURVEYS_GUIDE.md` (if created) for survey system details
