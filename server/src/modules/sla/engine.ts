import { eventBus, AppEvent } from '../../core/event-bus';
import { logger } from '../../config/logger';
import { slaService } from './service';

const BREACH_CHECK_INTERVAL_MS = 60_000; // every minute

async function onRecordCreated(e: AppEvent) {
  try {
    const started = await slaService.evaluateRecord(e.tableName, e.recordId, e.data);
    if (started > 0) logger.debug(`SLA: started ${started} instance(s) for ${e.tableName}:${e.recordId}`);
  } catch (err) {
    logger.error('SLA evaluate (created) failed', err);
  }
}

async function onStateChanged(e: AppEvent) {
  try {
    await slaService.processStateChange(e.tableName, e.recordId, e.data);
  } catch (err) {
    logger.error('SLA processStateChange failed', err);
  }
}

async function runBreachCheck() {
  try {
    const breached = await slaService.checkBreaches();
    for (const inst of breached) {
      eventBus.emitSlaBreached(inst.table_name, inst.record_id, { sla_instance_id: inst.id }, 'system');
    }
    if (breached.length > 0) logger.info(`SLA: ${breached.length} instance(s) breached`);
  } catch (err) {
    logger.error('SLA breach check failed', err);
  }
}

let breachTimer: NodeJS.Timeout | null = null;

export function initSlaEngine(): void {
  eventBus.on('record.created', onRecordCreated);
  eventBus.on('record.state_changed', onStateChanged);

  if (!breachTimer) {
    breachTimer = setInterval(runBreachCheck, BREACH_CHECK_INTERVAL_MS);
    // Run once shortly after boot so the dashboard reflects breaches immediately.
    setTimeout(runBreachCheck, 5_000);
  }

  logger.info('SLA engine initialized');
}
