export const ROLES = {
  ADMIN: 'admin',
  ITIL: 'itil',
  USER: 'user',
  APPROVER: 'approver',
  KNOWLEDGE_MANAGER: 'knowledge_manager',
} as const;

export const INCIDENT_STATES = ['new', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled'] as const;

export const CHANGE_STATES = ['new', 'assess', 'authorize', 'scheduled', 'implement', 'review', 'closed', 'cancelled'] as const;

export const REQUEST_STATES = ['pending', 'approved', 'fulfillment', 'completed', 'cancelled'] as const;

export const KB_STATES = ['draft', 'review', 'published', 'retired'] as const;

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Moderate',
  4: 'Low',
  5: 'Planning',
};

export const URGENCY_LABELS: Record<number, string> = {
  1: 'High',
  2: 'Medium',
  3: 'Low',
};

export const IMPACT_LABELS: Record<number, string> = {
  1: 'High',
  2: 'Medium',
  3: 'Low',
};

export const PRIORITY_MATRIX: Record<string, number> = {
  '1-1': 1, '1-2': 2, '1-3': 3,
  '2-1': 2, '2-2': 3, '2-3': 4,
  '3-1': 3, '3-2': 4, '3-3': 5,
};

export const STATE_COLORS: Record<string, string> = {
  new: 'blue',
  in_progress: 'yellow',
  on_hold: 'orange',
  resolved: 'green',
  closed: 'gray',
  cancelled: 'red',
  assess: 'cyan',
  authorize: 'violet',
  scheduled: 'indigo',
  implement: 'yellow',
  review: 'teal',
  pending: 'blue',
  approved: 'green',
  fulfillment: 'yellow',
  completed: 'green',
  rejected: 'red',
  requested: 'blue',
  draft: 'gray',
  published: 'green',
  retired: 'red',
};
