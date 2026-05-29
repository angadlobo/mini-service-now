import { db } from '../../config/database';
import { AppError } from '../../middleware/error';

export class PortalService {
  // ── Announcements ──────────────────────────────────

  async getAnnouncements() {
    const now = new Date().toISOString();
    return db('portal_announcements')
      .where('active', true)
      .where(function () {
        this.whereNull('start_date').orWhere('start_date', '<=', now);
      })
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>=', now);
      })
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'desc');
  }

  async createAnnouncement(data: Record<string, unknown>, userId: string) {
    const [announcement] = await db('portal_announcements')
      .insert({ ...data, created_by: userId })
      .returning('*');
    return announcement;
  }

  async updateAnnouncement(id: string, data: Record<string, unknown>) {
    const existing = await db('portal_announcements').where('id', id).first();
    if (!existing) throw new AppError(404, 'Announcement not found');

    const [updated] = await db('portal_announcements')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async deleteAnnouncement(id: string) {
    const existing = await db('portal_announcements').where('id', id).first();
    if (!existing) throw new AppError(404, 'Announcement not found');
    await db('portal_announcements').where('id', id).del();
  }

  // ── Quick Links ────────────────────────────────────

  async getQuickLinks() {
    return db('portal_quick_links')
      .where('active', true)
      .orderBy('order_index')
      .orderBy('label');
  }

  async createQuickLink(data: Record<string, unknown>) {
    const [link] = await db('portal_quick_links')
      .insert(data)
      .returning('*');
    return link;
  }

  async updateQuickLink(id: string, data: Record<string, unknown>) {
    const existing = await db('portal_quick_links').where('id', id).first();
    if (!existing) throw new AppError(404, 'Quick link not found');

    const [updated] = await db('portal_quick_links')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async deleteQuickLink(id: string) {
    const existing = await db('portal_quick_links').where('id', id).first();
    if (!existing) throw new AppError(404, 'Quick link not found');
    await db('portal_quick_links').where('id', id).del();
  }

  // ── Themes ─────────────────────────────────────────

  async getActiveTheme() {
    return db('portal_themes').where('active', true).first();
  }

  async listThemes() {
    return db('portal_themes').orderBy('name');
  }

  async createTheme(data: Record<string, unknown>) {
    const [theme] = await db('portal_themes')
      .insert(data)
      .returning('*');
    return theme;
  }

  async updateTheme(id: string, data: Record<string, unknown>) {
    const existing = await db('portal_themes').where('id', id).first();
    if (!existing) throw new AppError(404, 'Theme not found');

    const [updated] = await db('portal_themes')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  async activateTheme(id: string) {
    const existing = await db('portal_themes').where('id', id).first();
    if (!existing) throw new AppError(404, 'Theme not found');

    await db.transaction(async (trx) => {
      await trx('portal_themes').update({ active: false });
      await trx('portal_themes').where('id', id).update({ active: true, updated_at: new Date() });
    });

    return db('portal_themes').where('id', id).first();
  }

  // ── My Tickets ─────────────────────────────────────

  async getMyTickets(userId: string) {
    const [incidents, requests] = await Promise.all([
      db('incidents')
        .select(
          'id', 'number', 'short_description', 'state', 'priority', 'urgency',
          'created_at', 'updated_at',
        )
        .where('caller_id', userId)
        .orderBy('created_at', 'desc')
        .limit(100),
      db('sc_requests')
        .select(
          'sc_requests.id', 'sc_requests.number', 'sc_requests.state',
          'sc_requests.created_at', 'sc_requests.updated_at',
          'sc_catalog_items.name as item_name',
          'sc_catalog_items.short_description',
        )
        .leftJoin('sc_req_items', 'sc_req_items.request_id', 'sc_requests.id')
        .leftJoin('sc_catalog_items', 'sc_catalog_items.id', 'sc_req_items.item_id')
        .where('sc_requests.requested_by', userId)
        .orderBy('sc_requests.created_at', 'desc')
        .limit(100),
    ]);

    return { incidents, requests };
  }

  // ── Portal Home ────────────────────────────────────

  async getPortalHome(userId: string) {
    const [announcements, quickLinks, theme, incidentCount, requestCount] = await Promise.all([
      this.getAnnouncements(),
      this.getQuickLinks(),
      this.getActiveTheme(),
      db('incidents')
        .where('caller_id', userId)
        .whereNotIn('state', ['closed', 'cancelled'])
        .count('* as c')
        .first(),
      db('sc_requests')
        .where('requested_by', userId)
        .whereNotIn('state', ['closed', 'cancelled'])
        .count('* as c')
        .first()
        .catch(() => ({ c: 0 })),
    ]);

    const myTicketCount = Number(incidentCount?.c || 0) + Number((requestCount as any)?.c || 0);

    return { announcements, quickLinks, theme, myTicketCount };
  }
}

export const portalService = new PortalService();
