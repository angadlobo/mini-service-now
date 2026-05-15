import { TableConfig } from '../../../shared/interfaces';

class TableRegistry {
  private tables = new Map<string, TableConfig>();

  register(config: TableConfig): void {
    this.tables.set(config.name, config);
  }

  get(name: string): TableConfig | undefined {
    return this.tables.get(name);
  }

  getAll(): TableConfig[] {
    return Array.from(this.tables.values());
  }

  has(name: string): boolean {
    return this.tables.has(name);
  }

  unregister(name: string): boolean {
    return this.tables.delete(name);
  }
}

export const tableRegistry = new TableRegistry();
