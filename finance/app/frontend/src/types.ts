export interface Question {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  options: Record<string, string>;
}

export interface QuestionResult {
  question_id: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  time_seconds: number;
  confidence: string;
  explanation: string;
}

export interface SessionConfig {
  session_type: 'topic_drill' | 'subtopic_drill' | 'mixed' | 'weak_areas' | 'mock_exam' | 'diagnostic';
  topics: string[];
  subtopic?: string;
  question_count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  timed: boolean;
  time_per_question: number;
}

export interface SessionSummary {
  session_id: string;
  date: string;
  time: string;
  session_type: string;
  question_count: number;
  questions_attempted: number;
  score: number;
  score_percent: number;
  time_taken_minutes: number;
  topics: string[];
  results_by_topic: Record<string, { correct: number; total: number; percent: number }>;
  error_summary: Record<string, number>;
}

export interface TopicInfo {
  subtopics: string[];
  question_count: number;
}

export interface Stats {
  total_questions: number;
  by_topic: Record<string, { total: number; easy: number; medium: number; hard: number }>;
}

export interface PausedSession {
  session_id: string;
  started_at: string;
  questions_total: number;
  questions_answered: number;
  topics: string[];
}

export interface TopicProgress {
  total_questions: number;
  times_shown: number;
  times_correct: number;
  accuracy: number;
  questions_seen: number;
  questions_mastered: number;
}

export interface Progress {
  overall: {
    times_shown: number;
    times_correct: number;
    accuracy: number;
  };
  by_topic: Record<string, TopicProgress>;
}

export interface SessionHistory {
  date: string;
  time: string;
  type: string;
  score: number;
  score_percent: number;
  questions_count: number;
  topics: string[];
}
