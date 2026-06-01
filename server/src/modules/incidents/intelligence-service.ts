import { db } from '../../config/database';

interface SimilarIncident {
  id: string;
  number: string;
  short_description: string;
  similarity_score: number;
}

interface RootCauseSuggestion {
  pattern: string;
  root_cause: string;
  confidence: number;
}

interface ResolutionSuggestion {
  source_incident_id: string;
  source_number: string;
  resolution_notes: string;
  root_cause: string;
  resolution_time_minutes: number;
  success_rate: number;
  application_count: number;
}

interface SLAPrediction {
  breach_probability: number;
  risk_level: 'red' | 'yellow' | 'green';
  reasons: string[];
  recommendations: string[];
}

export class IncidentIntelligenceService {
  /**
   * Find similar incidents using text similarity and metadata matching
   */
  async findSimilarIncidents(
    incidentId: string,
    limit: number = 5
  ): Promise<SimilarIncident[]> {
    const incident = await db('incidents').where('id', incidentId).first();
    if (!incident) return [];

    // Get all open/recent incidents (exclude current and resolved)
    const candidates = await db('incidents')
      .whereNotIn('state', ['resolved', 'closed'])
      .where('id', '!=', incidentId)
      .where('priority', incident.priority) // Same priority range
      .orderBy('created_at', 'desc')
      .limit(50); // Consider last 50 incidents

    // Calculate similarity scores
    const scored = candidates
      .map((c) => ({
        ...c,
        score: this.calculateTextSimilarity(
          incident.short_description,
          c.short_description
        ),
      }))
      .filter((c) => c.score > 0.5) // Only highly similar
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Store relationships
    for (const similar of scored) {
      await db('incident_similarity')
        .insert({
          incident_id: incidentId,
          similar_incident_id: similar.id,
          similarity_score: similar.score,
          reason: `Text similarity: ${(similar.score * 100).toFixed(1)}%`,
        })
        .onConflict(['incident_id', 'similar_incident_id'])
        .merge();
    }

    return scored.map((c) => ({
      id: c.id,
      number: c.number,
      short_description: c.short_description,
      similarity_score: c.score,
    }));
  }

  /**
   * Predict root cause based on incident keywords and historical patterns
   */
  async predictRootCause(incidentId: string): Promise<RootCauseSuggestion[]> {
    const incident = await db('incidents').where('id', incidentId).first();
    if (!incident) return [];

    const keywords = this.extractKeywords(incident.short_description);
    const patterns = await db('root_cause_patterns')
      .whereRaw(
        "keywords @> ?::jsonb",
        [JSON.stringify(keywords)] // PostgreSQL JSONB containment
      )
      .orderBy('confidence', 'desc')
      .limit(3);

    return patterns.map((p) => ({
      pattern: p.pattern_name,
      root_cause: p.root_cause,
      confidence: Number(p.confidence),
    }));
  }

  /**
   * Find past solutions from resolved incidents
   */
  async findResolutionSuggestions(
    incidentId: string,
    limit: number = 5
  ): Promise<ResolutionSuggestion[]> {
    const incident = await db('incidents').where('id', incidentId).first();
    if (!incident) return [];

    const keywords = this.extractKeywords(incident.short_description);

    // Find solutions from resolved incidents with similar keywords
    const solutions = await db('incident_solutions')
      .whereRaw("tags @> ?::jsonb", [JSON.stringify(keywords)])
      .where('resolution_notes', '!=', null)
      .orderBy('success_rate', 'desc')
      .orderBy('application_count', 'desc')
      .limit(limit);

    return solutions.map((s) => ({
      source_incident_id: s.incident_id,
      source_number: '', // Will need to join to get this
      resolution_notes: s.resolution_notes,
      root_cause: s.root_cause || 'Unknown',
      resolution_time_minutes: s.resolution_time_minutes || 0,
      success_rate: s.success_rate || 0,
      application_count: s.application_count || 0,
    }));
  }

  /**
   * Predict if incident will breach SLA
   */
  async predictSLABreach(incidentId: string): Promise<SLAPrediction> {
    const incident = await db('incidents').where('id', incidentId).first();
    if (!incident || !incident.sla_due) {
      return {
        breach_probability: 0,
        risk_level: 'green',
        reasons: [],
        recommendations: [],
      };
    }

    const now = Date.now();
    const slaDueTime = new Date(incident.sla_due).getTime();
    const timeRemaining = slaDueTime - now;
    const timeRemainingMinutes = timeRemaining / (1000 * 60);

    // Get historical data for similar incidents
    const similarResolved = await db('incidents')
      .where('priority', incident.priority)
      .whereNotNull('resolved_at')
      .select(
        db.raw(
          "EXTRACT(EPOCH FROM (resolved_at - created_at))/60 as resolution_minutes"
        )
      )
      .limit(20);

    // Calculate average resolution time
    const avgResolutionMinutes =
      similarResolved.reduce((sum: number, r: any) => sum + r.resolution_minutes, 0) /
      Math.max(similarResolved.length, 1);

    // Risk scoring
    const ratio = timeRemainingMinutes / avgResolutionMinutes;
    let breachProbability = 0;
    let riskLevel: 'red' | 'yellow' | 'green' = 'green';
    const reasons: string[] = [];
    const recommendations: string[] = [];

    if (ratio < 0.2) {
      breachProbability = 0.95;
      riskLevel = 'red';
      reasons.push('Only 20% of average resolution time remaining');
      recommendations.push('🚨 ESCALATE IMMEDIATELY');
      recommendations.push('Assign to most experienced technician');
      recommendations.push('Check if similar issue was resolved recently');
    } else if (ratio < 0.5) {
      breachProbability = 0.6;
      riskLevel = 'yellow';
      reasons.push('Less than 50% of average resolution time remaining');
      reasons.push(`Time remaining: ${timeRemainingMinutes.toFixed(0)} minutes`);
      reasons.push(`Avg resolution: ${avgResolutionMinutes.toFixed(0)} minutes`);
      recommendations.push('⚠️ At risk of SLA breach');
      recommendations.push('Consider escalation if not resolved soon');
      recommendations.push('Prioritize this over lower-priority work');
    } else {
      breachProbability = 0.1;
      riskLevel = 'green';
      reasons.push('Sufficient time remaining to resolve');
    }

    // Store prediction
    await db('sla_predictions')
      .insert({
        incident_id: incidentId,
        breach_probability: breachProbability,
        risk_level: riskLevel,
        risk_reasons: JSON.stringify(reasons),
        recommendations: JSON.stringify(recommendations),
      })
      .onConflict('incident_id')
      .merge();

    // Auto-escalate if red
    if (riskLevel === 'red' && !incident.assigned_to) {
      await this.autoEscalate(incidentId);
    }

    return {
      breach_probability: breachProbability,
      risk_level: riskLevel,
      reasons,
      recommendations,
    };
  }

  /**
   * Auto-escalate incident if at high risk
   */
  private async autoEscalate(incidentId: string): Promise<void> {
    // Find most available high-level support person
    const escalationUser = await db('users')
      .where('roles', 'like', '%support%')
      .where('active', true)
      .orderBy('updated_at', 'desc')
      .first();

    if (escalationUser) {
      await db('incidents').where('id', incidentId).update({
        assigned_to: escalationUser.id,
        priority: 1, // Critical
      });

      // TODO: Send notification
    }
  }

  /**
   * Analyze incident and populate AI suggestions
   */
  async analyzeIncident(incidentId: string): Promise<void> {
    const [similar, rootCauses, solutions, slaPrediction] = await Promise.all([
      this.findSimilarIncidents(incidentId, 3),
      this.predictRootCause(incidentId),
      this.findResolutionSuggestions(incidentId, 3),
      this.predictSLABreach(incidentId),
    ]);

    await db('incidents').where('id', incidentId).update({
      ai_similar_incidents: JSON.stringify(similar),
      ai_root_cause_suggestions: JSON.stringify(rootCauses),
      ai_resolution_suggestions: JSON.stringify(solutions),
      ai_sla_risk: slaPrediction.risk_level,
      ai_last_analyzed_at: Math.floor(Date.now() / 1000),
    });
  }

  /**
   * Learn from resolved incident - store solution
   */
  async learnFromResolution(
    incidentId: string,
    rootCause: string | null,
    resolutionNotes: string | null,
    resolutionTimeMinutes: number | null
  ): Promise<void> {
    const incident = await db('incidents').where('id', incidentId).first();
    if (!incident) return;

    const keywords = this.extractKeywords(incident.short_description);

    // Store solution
    await db('incident_solutions').insert({
      incident_id: incidentId,
      description: incident.short_description,
      root_cause: rootCause,
      resolution_notes: resolutionNotes,
      resolution_time_minutes: resolutionTimeMinutes,
      tags: JSON.stringify(keywords),
    });

    // Update root cause pattern confidence
    if (rootCause) {
      await this.updatePatternConfidence(keywords, rootCause);
    }
  }

  /**
   * Update confidence scores of root cause patterns
   */
  private async updatePatternConfidence(
    keywords: string[],
    rootCause: string
  ): Promise<void> {
    const pattern = await db('root_cause_patterns')
      .where('root_cause', rootCause)
      .first();

    if (pattern) {
      const newConfidence = Math.min(
        (Number(pattern.confidence) * pattern.occurrence_count + 1) /
          (pattern.occurrence_count + 1),
        1
      );
      await db('root_cause_patterns').where('id', pattern.id).update({
        occurrence_count: pattern.occurrence_count + 1,
        confidence: newConfidence,
      });
    }
  }

  /**
   * Simple text similarity using word overlap (can upgrade to TF-IDF or embeddings)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const normalize = (s: string) =>
      s.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const words1 = new Set(normalize(text1));
    const words2 = new Set(normalize(text2));

    const intersection = [...words1].filter((w) => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union === 0 ? 0 : intersection / union; // Jaccard similarity
  }

  /**
   * Extract keywords from text for pattern matching
   */
  private extractKeywords(text: string): string[] {
    const stopwords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'in',
      'on',
      'at',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 3 &&
          !stopwords.has(w) &&
          !/[^a-z0-9]/i.test(w.charAt(0))
      )
      .slice(0, 10); // Top 10 keywords
  }
}

export const incidentIntelligenceService = new IncidentIntelligenceService();
