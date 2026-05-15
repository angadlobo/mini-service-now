import { db } from '../../config/database';

export class DashboardService {
  async getStats() {
    const [
      incidentTotal, incidentOpen, incidentCritical, breachedSla,
      incidentByState, incidentByPriority,
      changeTotal, changeOpen, changePendingApproval, changeByState,
      catalogTotal, catalogPending,
      kbTotal, kbPublished,
      problemTotal, problemOpen, problemByState,
      ciTotal, ciActive,
    ] = await Promise.all([
      db('incidents').count('* as c').first(),
      db('incidents').whereNotIn('state', ['closed', 'cancelled', 'resolved']).count('* as c').first(),
      db('incidents').where('priority', 1).whereNotIn('state', ['closed', 'cancelled', 'resolved']).count('* as c').first(),
      db('sla_instances').where({ table_name: 'incidents', breached: true }).count('* as c').first(),
      db('incidents').select('state').count('* as count').groupBy('state'),
      db('incidents').select('priority').count('* as count').groupBy('priority'),
      db('changes').count('* as c').first(),
      db('changes').whereNotIn('state', ['closed', 'cancelled']).count('* as c').first(),
      db('changes').where('state', 'authorize').count('* as c').first(),
      db('changes').select('state').count('* as count').groupBy('state'),
      db('sc_requests').count('* as c').first(),
      db('sc_requests').where('state', 'pending').count('* as c').first(),
      db('kb_articles').count('* as c').first(),
      db('kb_articles').where('state', 'published').count('* as c').first(),
      db('problems').count('* as c').first().catch(() => ({ c: 0 })),
      db('problems').whereNotIn('state', ['closed']).count('* as c').first().catch(() => ({ c: 0 })),
      db('problems').select('state').count('* as count').groupBy('state').catch(() => []),
      db('cis').count('* as c').first().catch(() => ({ c: 0 })),
      db('cis').where('status', 'active').count('* as c').first().catch(() => ({ c: 0 })),
    ]);

    const toMap = (rows: { state?: string; priority?: number; count: string }[]) =>
      Object.fromEntries((rows || []).map((r) => [r.state || r.priority, Number(r.count)]));

    return {
      incidents: {
        total: Number(incidentTotal?.c || 0),
        open: Number(incidentOpen?.c || 0),
        critical: Number(incidentCritical?.c || 0),
        breached_sla: Number(breachedSla?.c || 0),
        by_state: toMap(incidentByState as any[]),
        by_priority: toMap(incidentByPriority as any[]),
      },
      changes: {
        total: Number(changeTotal?.c || 0),
        open: Number(changeOpen?.c || 0),
        pending_approval: Number(changePendingApproval?.c || 0),
        by_state: toMap(changeByState as any[]),
      },
      catalog: {
        total_requests: Number(catalogTotal?.c || 0),
        pending: Number(catalogPending?.c || 0),
      },
      knowledge: {
        total_articles: Number(kbTotal?.c || 0),
        published: Number(kbPublished?.c || 0),
      },
      problems: {
        total: Number((problemTotal as any)?.c || 0),
        open: Number((problemOpen as any)?.c || 0),
        by_state: toMap(problemByState as any[]),
      },
      cmdb: {
        total: Number((ciTotal as any)?.c || 0),
        active: Number((ciActive as any)?.c || 0),
      },
    };
  }

  async getMyWork(userId: string) {
    const [incidents, changes, problems] = await Promise.all([
      db('incidents')
        .where('assigned_to', userId)
        .whereNotIn('state', ['closed', 'cancelled'])
        .orderBy('priority')
        .limit(10),
      db('changes')
        .where('assigned_to', userId)
        .whereNotIn('state', ['closed', 'cancelled'])
        .orderBy('priority')
        .limit(10),
      db('problems')
        .where('assigned_to', userId)
        .whereNotIn('state', ['closed'])
        .orderBy('priority')
        .limit(10)
        .catch(() => []),
    ]);

    return { incidents, changes, problems };
  }
}

export const dashboardService = new DashboardService();
