import { IntegrationProvider } from './provider-interface';

class ProviderRegistry {
  private providers = new Map<string, IntegrationProvider>();

  register(provider: IntegrationProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): IntegrationProvider | undefined {
    return this.providers.get(name);
  }

  getAll(): IntegrationProvider[] {
    return Array.from(this.providers.values());
  }

  getAllMetadata() {
    return this.getAll().map((p) => p.getProviderMetadata());
  }

  /** Find the provider that owns a given workflow action type */
  findByActionType(actionType: string): { provider: IntegrationProvider; action: string } | undefined {
    for (const provider of this.providers.values()) {
      const actions = provider.getWorkflowActions();
      if (actions.some((a) => a.type === actionType)) {
        return { provider, action: actionType };
      }
    }
    return undefined;
  }
}

export const providerRegistry = new ProviderRegistry();
