import { providerRegistry } from '../provider-registry';
import { GitHubProvider } from './github';
import { GitLabProvider } from './gitlab';
import { JiraProvider } from './jira';
import { PagerDutyProvider } from './pagerduty';
import { TeamsProvider } from './teams';
import { AzureDevOpsProvider } from './azure-devops';
import { DatadogProvider } from './datadog';
import { GrafanaProvider } from './grafana';
import { SlackProvider } from './slack';

export function registerAllProviders(): void {
  providerRegistry.register(new GitHubProvider());
  providerRegistry.register(new GitLabProvider());
  providerRegistry.register(new JiraProvider());
  providerRegistry.register(new PagerDutyProvider());
  providerRegistry.register(new TeamsProvider());
  providerRegistry.register(new AzureDevOpsProvider());
  providerRegistry.register(new DatadogProvider());
  providerRegistry.register(new GrafanaProvider());
  providerRegistry.register(new SlackProvider());
}
