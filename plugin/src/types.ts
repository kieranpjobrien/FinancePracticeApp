export type ExamType = "cfa" | "pmp" | "prince2";

export interface ExamConfig {
  name: string;
  questionsPath: string;
  sessionsPath: string;
  categoryLabel: string;
  subcategoryLabel: string;
  categoryField: string;
  subcategoryField: string;
  questionTypes: string[];
  sessionTypes: string[];
  categories: { name: string; weight: number }[];
}

/** Lightweight question metadata, built from Obsidian's cached frontmatter (no file body read). */
export interface QuestionMeta {
  id: string;
  category: string;
  subcategory: string;
  difficulty: "Easy" | "Medium" | "Hard";
  type: string;
  timesShown: number;
  timesCorrect: number;
  lastShown: string | null;
  filePath: string;
}

/** A fully-loaded question, including the body (read on demand). */
export interface Question extends QuestionMeta {
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
}

export interface QuestionResult {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSeconds: number;
  confidence: string;
  explanation: string;
}

export interface SessionConfig {
  sessionType: string;
  categories: string[];
  questionCount: number;
  difficulty: string;
  timed: boolean;
  timePerQuestion: number;
}

export interface SessionSummary {
  sessionId: string;
  date: string;
  time: string;
  sessionType: string;
  questionCount: number;
  questionsAttempted: number;
  score: number;
  scorePercent: number;
  timeTakenMinutes: number;
  categories: string[];
  resultsByCategory: Record<string, { correct: number; total: number; percent: number }>;
  errorSummary: Record<string, number>;
}

export interface PausedSession {
  sessionId: string;
  startedAt: string;
  questionsTotal: number;
  questionsAnswered: number;
  categories: string[];
  examType: ExamType;
}

export interface PluginSettings {
  practiceBasePath: string;
  defaultQuestions: number;
  defaultTimePerQuestion: number;
  lastExam: ExamType | null;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  practiceBasePath: "01_Practice",
  defaultQuestions: 20,
  defaultTimePerQuestion: 90,
  lastExam: null,
};

export const EXAM_CONFIGS: Record<ExamType, ExamConfig> = {
  cfa: {
    name: "CFA Level 1",
    questionsPath: "Questions/CFA",
    sessionsPath: "Sessions/CFA",
    categoryLabel: "Topic",
    subcategoryLabel: "Subtopic",
    categoryField: "topic",
    subcategoryField: "subtopic",
    questionTypes: ["conceptual", "calculation", "application"],
    sessionTypes: ["topic_drill", "mixed", "weak_areas", "mock_exam"],
    categories: [
      { name: "Ethics", weight: 17.5 },
      { name: "Quantitative Methods", weight: 7.5 },
      { name: "Economics", weight: 7.5 },
      { name: "Financial Statement Analysis", weight: 12.5 },
      { name: "Corporate Issuers", weight: 7.5 },
      { name: "Equity Investments", weight: 12.5 },
      { name: "Fixed Income", weight: 12.5 },
      { name: "Derivatives", weight: 6.5 },
      { name: "Alternative Investments", weight: 8.5 },
      { name: "Portfolio Management", weight: 10.0 },
    ],
  },
  pmp: {
    name: "PMP",
    questionsPath: "Questions/PMP",
    sessionsPath: "Sessions/PMP",
    categoryLabel: "Domain",
    subcategoryLabel: "Task",
    categoryField: "domain",
    subcategoryField: "task",
    questionTypes: ["conceptual", "situational", "technical", "calculation"],
    sessionTypes: ["category_drill", "mixed", "weak_areas", "mock_exam"],
    categories: [
      { name: "People", weight: 42.0 },
      { name: "Process", weight: 50.0 },
      { name: "Business Environment", weight: 8.0 },
    ],
  },
  prince2: {
    name: "PRINCE2 7",
    questionsPath: "Questions/PRINCE2",
    sessionsPath: "Sessions/PRINCE2",
    categoryLabel: "Area",
    subcategoryLabel: "Topic",
    categoryField: "area",
    subcategoryField: "topic",
    questionTypes: ["foundation", "practitioner"],
    sessionTypes: ["category_drill", "mixed", "weak_areas", "mock_exam"],
    categories: [
      { name: "Principles", weight: 20 },
      { name: "Practices", weight: 35 },
      { name: "Processes", weight: 35 },
      { name: "People", weight: 10 },
    ],
  },
};
