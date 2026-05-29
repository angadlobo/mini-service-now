import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';

export class KnowledgeService {
  async listCategories() {
    return db('kb_categories').where('active', true).orderBy('sort_order');
  }

  async listArticles(options: QueryOptions & { fullTextSearch?: string }) {
    let query = db('kb_articles')
      .select(
        'kb_articles.id', 'kb_articles.number', 'kb_articles.title', 'kb_articles.state',
        'kb_articles.view_count', 'kb_articles.helpful_count', 'kb_articles.category_id',
        'kb_articles.author_id', 'kb_articles.created_at', 'kb_articles.updated_at',
        'kb_categories.name as category_name',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = kb_articles.author_id) as author_name"),
      )
      .leftJoin('kb_categories', 'kb_categories.id', 'kb_articles.category_id');

    // Full-text search
    if (options.fullTextSearch) {
      const searchQuery = options.fullTextSearch.split(' ').join(' & ');
      query = query
        .whereRaw("kb_articles.search_vector @@ to_tsquery('english', ?)", [searchQuery])
        .select(db.raw("ts_rank(kb_articles.search_vector, to_tsquery('english', ?)) as rank", [searchQuery]))
        .orderBy('rank', 'desc');
    }

    const { dataQuery, countQuery } = applyQueryOptions(query, 'kb_articles', {
      ...options,
      searchFields: options.fullTextSearch ? [] : ['title', 'number'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const article = await db('kb_articles')
      .select(
        'kb_articles.*',
        'kb_categories.name as category_name',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = kb_articles.author_id) as author_name"),
      )
      .leftJoin('kb_categories', 'kb_categories.id', 'kb_articles.category_id')
      .where('kb_articles.id', id)
      .orWhere('kb_articles.number', id)
      .first();

    return article;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('kb_number_seq') as seq")).rows[0];
    const number = `KB${seqResult.seq}`;

    const [article] = await db('kb_articles')
      .insert({
        number,
        title: data.title,
        body: data.body || '',
        category_id: data.category_id || null,
        state: 'draft',
        author_id: userId,
      })
      .returning('*');

    return article;
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await db('kb_articles').where('id', id).first();
    if (!existing) throw new AppError(404, 'Article not found');

    const [updated] = await db('kb_articles')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');

    return updated;
  }

  async incrementViewCount(id: string) {
    await db('kb_articles').where('id', id).increment('view_count', 1);
  }

  async markHelpful(id: string) {
    await db('kb_articles').where('id', id).increment('helpful_count', 1);
  }
}

export const knowledgeService = new KnowledgeService();
