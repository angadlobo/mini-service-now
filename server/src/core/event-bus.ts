import { EventEmitter } from 'events';
import { logger } from '../config/logger';

export interface AppEvent {
  type: string;
  tableName: string;
  recordId: string;
  data: Record<string, unknown>;
  userId: string;
  oldData?: Record<string, unknown>;
}

class AppEventBus extends EventEmitter {
  emit(event: string, payload: AppEvent): boolean {
    logger.debug(`Event: ${event}`, { tableName: payload.tableName, recordId: payload.recordId });
    return super.emit(event, payload);
  }

  emitRecordCreated(tableName: string, recordId: string, data: Record<string, unknown>, userId: string) {
    this.emit('record.created', { type: 'record.created', tableName, recordId, data, userId });
  }

  emitRecordUpdated(tableName: string, recordId: string, data: Record<string, unknown>, userId: string, oldData?: Record<string, unknown>) {
    this.emit('record.updated', { type: 'record.updated', tableName, recordId, data, userId, oldData });
  }

  emitStateChanged(tableName: string, recordId: string, data: Record<string, unknown>, userId: string, oldData?: Record<string, unknown>) {
    this.emit('record.state_changed', { type: 'record.state_changed', tableName, recordId, data, userId, oldData });
  }

  emitApprovalDecided(tableName: string, recordId: string, data: Record<string, unknown>, userId: string) {
    this.emit('approval.decided', { type: 'approval.decided', tableName, recordId, data, userId });
  }

  emitSlaBreached(tableName: string, recordId: string, data: Record<string, unknown>, userId: string) {
    this.emit('sla.breached', { type: 'sla.breached', tableName, recordId, data, userId });
  }
}

export const eventBus = new AppEventBus();
eventBus.setMaxListeners(50);
