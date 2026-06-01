import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing patterns
  await knex('root_cause_patterns').del();

  // Seed common root cause patterns
  await knex('root_cause_patterns').insert([
    {
      pattern_name: 'Database Connection Pool Exhausted',
      keywords: JSON.stringify(['database', 'connection', 'pool', 'exhausted', 'timeout', 'slow']),
      root_cause: 'Connection pool exhausted or misconfigured',
      suggested_resolution: 'Increase pool size or optimize query performance',
      confidence: 0.85,
      occurrence_count: 42,
    },
    {
      pattern_name: 'Memory Leak',
      keywords: JSON.stringify(['memory', 'leak', 'oom', 'out', 'of', 'heap', 'gc']),
      root_cause: 'Application memory leak or garbage collection issue',
      suggested_resolution: 'Profile application memory, identify leaked references, update application code',
      confidence: 0.78,
      occurrence_count: 28,
    },
    {
      pattern_name: 'Network Latency',
      keywords: JSON.stringify(['network', 'latency', 'slow', 'timeout', 'response', 'time']),
      root_cause: 'High network latency or packet loss',
      suggested_resolution: 'Check network infrastructure, run traceroute, verify firewall rules',
      confidence: 0.82,
      occurrence_count: 35,
    },
    {
      pattern_name: 'Storage Full',
      keywords: JSON.stringify(['storage', 'disk', 'full', 'no', 'space', 'quota']),
      root_cause: 'Storage capacity exhausted',
      suggested_resolution: 'Clean up old logs/temp files, increase storage, implement archival policy',
      confidence: 0.92,
      occurrence_count: 15,
    },
    {
      pattern_name: 'Authentication/Authorization Failure',
      keywords: JSON.stringify(['auth', 'login', 'permission', 'denied', 'unauthorized', 'credentials']),
      root_cause: 'Authentication or authorization misconfiguration',
      suggested_resolution: 'Verify credentials, check auth service, review permission rules',
      confidence: 0.88,
      occurrence_count: 52,
    },
    {
      pattern_name: 'Dependency Service Down',
      keywords: JSON.stringify(['dependency', 'service', 'down', 'unavailable', 'unreachable', 'api']),
      root_cause: 'Dependent external service is down or unreachable',
      suggested_resolution: 'Check status page of dependency, verify connectivity, contact vendor',
      confidence: 0.90,
      occurrence_count: 67,
    },
    {
      pattern_name: 'Configuration Error',
      keywords: JSON.stringify(['config', 'configuration', 'setting', 'property', 'env', 'variable']),
      root_cause: 'Incorrect configuration or environment variable',
      suggested_resolution: 'Review configuration files, verify environment variables, consult documentation',
      confidence: 0.84,
      occurrence_count: 38,
    },
    {
      pattern_name: 'CPU Overload',
      keywords: JSON.stringify(['cpu', 'processor', 'load', 'high', 'overload', 'performance']),
      root_cause: 'CPU utilization too high, likely runaway process or inefficient code',
      suggested_resolution: 'Identify process using CPU, optimize code, scale horizontally',
      confidence: 0.80,
      occurrence_count: 31,
    },
    {
      pattern_name: 'Firewall/Network Rule Blocking',
      keywords: JSON.stringify(['firewall', 'blocked', 'rule', 'port', 'denied', 'connection']),
      root_cause: 'Firewall rule or network policy is blocking traffic',
      suggested_resolution: 'Review firewall rules, verify port is open, check network policies',
      confidence: 0.87,
      occurrence_count: 44,
    },
    {
      pattern_name: 'Deployment Issue',
      keywords: JSON.stringify(['deploy', 'deployment', 'release', 'rollout', 'update', 'version']),
      root_cause: 'Recent deployment introduced breaking changes or failed rollout',
      suggested_resolution: 'Rollback to previous version, verify deployment process, check release notes',
      confidence: 0.83,
      occurrence_count: 29,
    },
  ]);
}
