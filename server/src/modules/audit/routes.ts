import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { db } from '../../config/database';

const router = Router();
router.use(authenticate);

router.get('/search', async (req: any, res, next) => {
  try {
    const { table_name, search, limit = 50, offset = 0 } = req.query;
    let query = db('sys_audit')
      .select(
        'sys_audit.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = sys_audit.changed_by) as changed_by_name"),
      )
      .orderBy('sys_audit.created_at', 'desc')
      .limit(Math.min(Number(limit), 100))
      .offset(Number(offset));

    if (table_name) query = query.where('sys_audit.table_name', table_name);
    if (search) {
      query = query.where(function() {
        this.whereILike('sys_audit.field_name', `%${search}%`)
          .orWhereILike('sys_audit.old_value', `%${search}%`)
          .orWhereILike('sys_audit.new_value', `%${search}%`);
      });
    }

    const results = await query;
    res.json(results);
  } catch (err) { next(err); }
});

export default router;
