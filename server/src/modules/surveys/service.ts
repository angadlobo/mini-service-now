import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';

export class SurveyService {
  // ══════════════════════════════════════
  // Core CRUD
  // ══════════════════════════════════════

  async list(options: QueryOptions) {
    const query = db('surveys')
      .select(
        'surveys.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = surveys.created_by) as created_by_name"),
        db.raw("(SELECT COUNT(*)::int FROM survey_responses WHERE survey_responses.survey_id = surveys.id) as response_count"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'surveys', {
      ...options,
      searchFields: ['title'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const survey = await db('surveys')
      .select(
        'surveys.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = surveys.created_by) as created_by_name"),
        db.raw("(SELECT COUNT(*)::int FROM survey_responses WHERE survey_responses.survey_id = surveys.id) as response_count"),
      )
      .where('surveys.id', id)
      .orWhere('surveys.number', id)
      .first();

    if (!survey) return null;

    const questions = await db('survey_questions')
      .where('survey_id', survey.id)
      .orderBy('order_index', 'asc');

    return { ...survey, questions };
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('survey_number_seq') as seq")).rows[0];
    const number = `SRV${String(seqResult.seq).padStart(6, '0')}`;

    const insertData: Record<string, unknown> = {
      number,
      title: data.title,
      description: data.description || null,
      status: data.status || 'draft',
      type: data.type || 'satisfaction',
      trigger_table: data.trigger_table || null,
      trigger_state: data.trigger_state || null,
      anonymous: data.anonymous || false,
      created_by: userId,
    };

    const [survey] = await db('surveys').insert(insertData).returning('*');
    return survey;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('surveys').where('id', id).first();
    if (!existing) throw new AppError(404, 'Survey not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('surveys').where('id', id).update(updateData).returning('*');
    return updated;
  }

  async delete(id: string) {
    const existing = await db('surveys').where('id', id).first();
    if (!existing) throw new AppError(404, 'Survey not found');

    await db('surveys').where('id', id).del();
    return { message: 'Survey deleted' };
  }

  // ══════════════════════════════════════
  // Questions
  // ══════════════════════════════════════

  async getQuestions(surveyId: string) {
    return db('survey_questions')
      .where('survey_id', surveyId)
      .orderBy('order_index', 'asc');
  }

  async addQuestion(surveyId: string, data: Record<string, unknown>) {
    const survey = await db('surveys').where('id', surveyId).first();
    if (!survey) throw new AppError(404, 'Survey not found');

    // If no order_index provided, put it at the end
    if (data.order_index === undefined || data.order_index === null) {
      const maxOrder = await db('survey_questions')
        .where('survey_id', surveyId)
        .max('order_index as max')
        .first();
      data.order_index = ((maxOrder as any)?.max ?? -1) + 1;
    }

    const insertData: Record<string, unknown> = {
      survey_id: surveyId,
      question_text: data.question_text,
      type: data.type || 'rating_1_5',
      options: data.options ? JSON.stringify(data.options) : null,
      required: data.required !== undefined ? data.required : true,
      order_index: data.order_index,
    };

    const [question] = await db('survey_questions').insert(insertData).returning('*');
    return question;
  }

  async updateQuestion(questionId: string, data: Record<string, unknown>) {
    const existing = await db('survey_questions').where('id', questionId).first();
    if (!existing) throw new AppError(404, 'Question not found');

    const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.options !== undefined) {
      updateData.options = data.options ? JSON.stringify(data.options) : null;
    }

    const [updated] = await db('survey_questions').where('id', questionId).update(updateData).returning('*');
    return updated;
  }

  async deleteQuestion(questionId: string) {
    const existing = await db('survey_questions').where('id', questionId).first();
    if (!existing) throw new AppError(404, 'Question not found');

    await db('survey_questions').where('id', questionId).del();
    return { message: 'Question deleted' };
  }

  async reorderQuestions(surveyId: string, questionIds: string[]) {
    const survey = await db('surveys').where('id', surveyId).first();
    if (!survey) throw new AppError(404, 'Survey not found');

    await db.transaction(async (trx) => {
      for (let i = 0; i < questionIds.length; i++) {
        await trx('survey_questions')
          .where({ id: questionIds[i], survey_id: surveyId })
          .update({ order_index: i, updated_at: new Date() });
      }
    });

    return this.getQuestions(surveyId);
  }

  // ══════════════════════════════════════
  // Responses
  // ══════════════════════════════════════

  async submitResponse(surveyId: string, data: Record<string, unknown>, userId: string | null) {
    const survey = await db('surveys').where('id', surveyId).first();
    if (!survey) throw new AppError(404, 'Survey not found');
    if (survey.status !== 'active') throw new AppError(400, 'Survey is not active');

    const answers = data.answers as Array<{ question_id: string; answer_value?: string | null; answer_text?: string | null }>;

    // Validate required questions
    const questions = await db('survey_questions').where('survey_id', surveyId);
    const requiredIds = questions.filter((q: any) => q.required).map((q: any) => q.id);
    const answeredIds = answers.map((a) => a.question_id);
    const missing = requiredIds.filter((id: string) => {
      const answer = answers.find((a) => a.question_id === id);
      return !answer || (!answer.answer_value && !answer.answer_text);
    });
    if (missing.length > 0) {
      throw new AppError(400, 'Missing required answers', { missing_questions: missing });
    }

    // Calculate overall score from rating-type questions
    const ratingTypes = ['rating_1_5', 'rating_1_10', 'nps'];
    const ratingQuestions = questions.filter((q: any) => ratingTypes.includes(q.type));
    let overallScore: number | null = null;

    if (ratingQuestions.length > 0) {
      let totalScore = 0;
      let scoreCount = 0;
      for (const rq of ratingQuestions) {
        const answer = answers.find((a) => a.question_id === rq.id);
        if (answer?.answer_value) {
          const val = parseFloat(answer.answer_value);
          if (!isNaN(val)) {
            // Normalize to 0-100 scale
            let normalized: number;
            if (rq.type === 'rating_1_5') normalized = ((val - 1) / 4) * 100;
            else if (rq.type === 'rating_1_10') normalized = ((val - 1) / 9) * 100;
            else normalized = (val / 10) * 100; // nps: 0-10
            totalScore += normalized;
            scoreCount++;
          }
        }
      }
      if (scoreCount > 0) {
        overallScore = Math.round((totalScore / scoreCount) * 100) / 100;
      }
    }

    return db.transaction(async (trx) => {
      const [response] = await trx('survey_responses').insert({
        survey_id: surveyId,
        respondent_id: survey.anonymous ? null : userId,
        table_name: (data.table_name as string) || null,
        record_id: (data.record_id as string) || null,
        overall_score: overallScore,
      }).returning('*');

      const answerInserts = answers.map((a) => ({
        response_id: response.id,
        question_id: a.question_id,
        answer_value: a.answer_value || null,
        answer_text: a.answer_text || null,
      }));

      if (answerInserts.length > 0) {
        await trx('survey_answers').insert(answerInserts);
      }

      return response;
    });
  }

  async getResponses(surveyId: string, options: QueryOptions) {
    const query = db('survey_responses')
      .select(
        'survey_responses.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = survey_responses.respondent_id) as respondent_name"),
      )
      .where('survey_responses.survey_id', surveyId);

    const { dataQuery, countQuery } = applyQueryOptions(query, 'survey_responses', {
      ...options,
      searchFields: [],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getResponseDetail(responseId: string) {
    const response = await db('survey_responses')
      .select(
        'survey_responses.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = survey_responses.respondent_id) as respondent_name"),
      )
      .where('survey_responses.id', responseId)
      .first();

    if (!response) throw new AppError(404, 'Response not found');

    const answers = await db('survey_answers')
      .join('survey_questions', 'survey_questions.id', 'survey_answers.question_id')
      .where('survey_answers.response_id', responseId)
      .select(
        'survey_answers.*',
        'survey_questions.question_text',
        'survey_questions.type as question_type',
        'survey_questions.options as question_options',
        'survey_questions.order_index',
      )
      .orderBy('survey_questions.order_index', 'asc');

    return { ...response, answers };
  }

  // ══════════════════════════════════════
  // Analytics
  // ══════════════════════════════════════

  async getAnalytics(surveyId: string) {
    const survey = await db('surveys').where('id', surveyId).first();
    if (!survey) throw new AppError(404, 'Survey not found');

    const responseCount = await db('survey_responses')
      .where('survey_id', surveyId)
      .count('* as count')
      .first();

    const avgScore = await db('survey_responses')
      .where('survey_id', surveyId)
      .whereNotNull('overall_score')
      .avg('overall_score as avg')
      .first();

    const questions = await db('survey_questions')
      .where('survey_id', surveyId)
      .orderBy('order_index', 'asc');

    const questionStats = [];
    for (const question of questions) {
      const answers = await db('survey_answers')
        .join('survey_responses', 'survey_responses.id', 'survey_answers.response_id')
        .where({
          'survey_answers.question_id': question.id,
          'survey_responses.survey_id': surveyId,
        })
        .select('survey_answers.answer_value', 'survey_answers.answer_text');

      const stat: Record<string, unknown> = {
        question_id: question.id,
        question_text: question.question_text,
        type: question.type,
        total_answers: answers.length,
      };

      const ratingTypes = ['rating_1_5', 'rating_1_10', 'nps'];
      if (ratingTypes.includes(question.type)) {
        const numericValues = answers
          .map((a: any) => parseFloat(a.answer_value))
          .filter((v: number) => !isNaN(v));

        if (numericValues.length > 0) {
          stat.average = Math.round((numericValues.reduce((s: number, v: number) => s + v, 0) / numericValues.length) * 100) / 100;
          stat.min = Math.min(...numericValues);
          stat.max = Math.max(...numericValues);

          // Distribution
          const distribution: Record<string, number> = {};
          for (const v of numericValues) {
            const key = String(v);
            distribution[key] = (distribution[key] || 0) + 1;
          }
          stat.distribution = distribution;
        }

        // NPS calculation
        if (question.type === 'nps' && numericValues.length > 0) {
          const promoters = numericValues.filter((v: number) => v >= 9).length;
          const detractors = numericValues.filter((v: number) => v <= 6).length;
          const total = numericValues.length;
          stat.nps_score = Math.round(((promoters - detractors) / total) * 100);
          stat.nps_promoters = promoters;
          stat.nps_passives = numericValues.filter((v: number) => v >= 7 && v <= 8).length;
          stat.nps_detractors = detractors;
        }
      } else if (question.type === 'yes_no') {
        const yesCount = answers.filter((a: any) => a.answer_value?.toLowerCase() === 'yes').length;
        const noCount = answers.filter((a: any) => a.answer_value?.toLowerCase() === 'no').length;
        stat.distribution = { yes: yesCount, no: noCount };
        stat.yes_percentage = answers.length > 0 ? Math.round((yesCount / answers.length) * 100) : 0;
      } else if (question.type === 'multiple_choice') {
        const distribution: Record<string, number> = {};
        for (const a of answers) {
          const key = (a as any).answer_value || 'N/A';
          distribution[key] = (distribution[key] || 0) + 1;
        }
        stat.distribution = distribution;
      } else if (question.type === 'text') {
        stat.recent_answers = answers.slice(0, 10).map((a: any) => a.answer_text || a.answer_value);
      }

      questionStats.push(stat);
    }

    return {
      survey_id: surveyId,
      response_count: Number((responseCount as any)?.count || 0),
      average_score: (avgScore as any)?.avg ? Math.round(Number((avgScore as any).avg) * 100) / 100 : null,
      questions: questionStats,
    };
  }
}

export const surveyService = new SurveyService();
