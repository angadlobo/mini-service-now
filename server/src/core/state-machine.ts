import { tableRegistry } from './table-registry';
import { AppError } from '../middleware/error';

export function validateStateTransition(tableName: string, currentState: string, newState: string): void {
  const config = tableRegistry.get(tableName);
  if (!config?.states) return; // No state machine configured

  const allowed = config.states.transitions[currentState];
  if (!allowed || !allowed.includes(newState)) {
    throw new AppError(400, `Invalid state transition from '${currentState}' to '${newState}'`);
  }
}

export function getAvailableTransitions(tableName: string, currentState: string): string[] {
  const config = tableRegistry.get(tableName);
  if (!config?.states) return [];
  return config.states.transitions[currentState] || [];
}
