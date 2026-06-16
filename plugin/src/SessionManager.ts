import { type App, type TFile, normalizePath } from "obsidian";
import type { ExamType, ExamConfig, PluginSettings, SessionConfig, SessionSummary, PausedSession, QuestionResult, QuestionMeta } from "./types";
import { EXAM_CONFIGS } from "./types";
import { QuestionBank } from "./QuestionBank";

interface AnswerRecord {
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSeconds: number;
  confidence: string;
}

interface ActiveSession {
  sessionId: string;
  config: SessionConfig;
  questions: string[];
  currentIndex: number;
  answers: Map<string, AnswerRecord>;
  startedAt: Date;
  examType: ExamType;
}

export class SessionManager {
  private app: App;
  private settings: PluginSettings;
  private examType: ExamType;
  private examConfig: ExamConfig;
  private questionBank: QuestionBank;
  activeSession: ActiveSession | null = null;

  constructor(app: App, settings: PluginSettings, examType: ExamType, questionBank: QuestionBank) {
    this.app = app;
    this.settings = settings;
    this.examType = examType;
    this.examConfig = EXAM_CONFIGS[examType];
    this.questionBank = questionBank;
  }

  createSession(config: SessionConfig): ActiveSession {
    const now = new Date();
    const sessionId = `${now.toISOString().slice(0, 10)}-${now.toTimeString().slice(0, 5).replace(":", "")}${now.getSeconds().toString().padStart(2, "0")}-${Math.random().toString(36).slice(2, 8)}`;

    let selected: QuestionMeta[];
    const st = config.sessionType;

    if (st === "mock_exam") {
      selected = this.questionBank.selectWeightedByExam(config.questionCount);
    } else if (st === "weak_areas") {
      selected = this.questionBank.selectWeakAreas(config.questionCount);
    } else if (st.includes("drill")) {
      selected = this.questionBank.selectQuestions(config.questionCount, config.categories, config.difficulty);
    } else {
      selected = this.questionBank.selectQuestions(
        config.questionCount,
        config.categories.length > 0 ? config.categories : undefined,
        config.difficulty
      );
    }

    this.activeSession = {
      sessionId,
      config,
      questions: selected.map((q) => q.id),
      currentIndex: 0,
      answers: new Map(),
      startedAt: now,
      examType: this.examType,
    };

    return this.activeSession;
  }

  async submitAnswer(questionId: string, selectedAnswer: string, timeSeconds: number, confidence: string): Promise<QuestionResult | null> {
    if (!this.activeSession) return null;
    const question = await this.questionBank.loadQuestion(questionId);
    if (!question) return null;

    const isCorrect = selectedAnswer === question.answer;
    this.activeSession.answers.set(questionId, {
      selectedAnswer,
      correctAnswer: question.answer,
      isCorrect,
      timeSeconds,
      confidence,
    });

    return {
      questionId,
      selectedAnswer,
      correctAnswer: question.answer,
      isCorrect,
      timeSeconds,
      confidence,
      explanation: question.explanation,
    };
  }

  async completeSession(): Promise<SessionSummary | null> {
    const session = this.activeSession;
    if (!session) return null;

    let totalCorrect = 0;
    let totalTime = 0;
    const resultsByCategory: Record<string, { correct: number; total: number; percent: number }> = {};
    const errorSummary: Record<string, number> = {};

    for (const questionId of session.questions) {
      const meta = this.questionBank.getMeta(questionId);
      const answer = session.answers.get(questionId);
      if (!meta || !answer) continue;

      if (answer.isCorrect) totalCorrect++;
      totalTime += answer.timeSeconds;

      if (!resultsByCategory[meta.category]) {
        resultsByCategory[meta.category] = { correct: 0, total: 0, percent: 0 };
      }
      resultsByCategory[meta.category].total++;
      if (answer.isCorrect) resultsByCategory[meta.category].correct++;

      if (!answer.isCorrect) {
        if (answer.timeSeconds < 30) {
          errorSummary["time_pressure"] = (errorSummary["time_pressure"] || 0) + 1;
        } else if (answer.confidence === "sure") {
          errorSummary["overconfidence"] = (errorSummary["overconfidence"] || 0) + 1;
        } else {
          errorSummary[meta.type] = (errorSummary[meta.type] || 0) + 1;
        }
      }

      await this.questionBank.updateQuestionStats(questionId, answer.isCorrect);
    }

    for (const cat of Object.keys(resultsByCategory)) {
      const c = resultsByCategory[cat];
      c.percent = c.total > 0 ? Math.round((c.correct / c.total) * 1000) / 10 : 0;
    }

    const questionsAttempted = session.answers.size;
    const scorePercent = questionsAttempted > 0 ? Math.round((totalCorrect / questionsAttempted) * 1000) / 10 : 0;

    const summary: SessionSummary = {
      sessionId: session.sessionId,
      date: session.startedAt.toISOString().slice(0, 10),
      time: session.startedAt.toTimeString().slice(0, 5),
      sessionType: session.config.sessionType,
      questionCount: session.questions.length,
      questionsAttempted,
      score: totalCorrect,
      scorePercent,
      timeTakenMinutes: Math.round((totalTime / 60) * 10) / 10,
      categories: Object.keys(resultsByCategory),
      resultsByCategory,
      errorSummary,
    };

    await this.saveSessionLog(session, summary);
    this.activeSession = null;
    return summary;
  }

  private async saveSessionLog(session: ActiveSession, summary: SessionSummary): Promise<void> {
    const sessionsDir = normalizePath(`${this.settings.practiceBasePath}/${this.examConfig.sessionsPath}`);
    if (!this.app.vault.getAbstractFileByPath(sessionsDir)) {
      await this.app.vault.createFolder(sessionsDir).catch(() => {});
    }

    const filename = `${summary.date}-${summary.time.replace(":", "")}.md`;
    const filepath = normalizePath(`${sessionsDir}/${filename}`);

    const catLabel = this.examConfig.categoryLabel;
    const lines = [
      "---",
      `date: ${summary.date}`,
      `time: "${summary.time}"`,
      `type: ${summary.sessionType}`,
      `exam: ${this.examType}`,
      `score: ${summary.score}`,
      `score_percent: ${summary.scorePercent}`,
      `questions_count: ${summary.questionCount}`,
      "---",
      "",
      `# Session: ${summary.date} ${summary.time}`,
      "",
      "## Summary",
      "",
      "| Metric | Value |",
      "|--------|-------|",
      `| Score | ${summary.score}/${summary.questionsAttempted} (${summary.scorePercent}%) |`,
      `| Time | ${summary.timeTakenMinutes} minutes |`,
      `| ${catLabel}s | ${summary.categories.join(", ")} |`,
      "",
      `## Results by ${catLabel}`,
      "",
      `| ${catLabel} | Correct | Total | Percent |`,
      "|--------|---------|-------|---------|",
    ];

    for (const [cat, data] of Object.entries(summary.resultsByCategory)) {
      lines.push(`| ${cat} | ${data.correct} | ${data.total} | ${data.percent}% |`);
    }

    await this.app.vault.create(filepath, lines.join("\n")).catch(() => {});
  }

  async savePausedSession(): Promise<void> {
    if (!this.activeSession) return;
    const sessionsDir = normalizePath(`${this.settings.practiceBasePath}/${this.examConfig.sessionsPath}/paused`);
    if (!this.app.vault.getAbstractFileByPath(sessionsDir)) {
      await this.app.vault.createFolder(sessionsDir).catch(() => {});
    }

    const filepath = normalizePath(`${sessionsDir}/${this.activeSession.sessionId}.json`);
    const data = {
      sessionId: this.activeSession.sessionId,
      config: this.activeSession.config,
      questions: this.activeSession.questions,
      currentIndex: this.activeSession.currentIndex,
      answers: Object.fromEntries(this.activeSession.answers),
      startedAt: this.activeSession.startedAt.toISOString(),
      examType: this.activeSession.examType,
    };
    await this.app.vault.create(filepath, JSON.stringify(data, null, 2)).catch(() => {});
  }

  async loadPausedSessions(): Promise<PausedSession[]> {
    const paused: PausedSession[] = [];
    const pausedDir = normalizePath(`${this.settings.practiceBasePath}/${this.examConfig.sessionsPath}/paused`);
    if (!this.app.vault.getAbstractFileByPath(pausedDir)) return paused;

    const files = this.app.vault.getFiles().filter(
      (f) => f.path.startsWith(pausedDir) && f.extension === "json"
    );

    for (const file of files) {
      try {
        const content = await this.app.vault.read(file);
        const data = JSON.parse(content);
        paused.push({
          sessionId: data.sessionId,
          startedAt: data.startedAt,
          questionsTotal: data.questions.length,
          questionsAnswered: Object.keys(data.answers).length,
          categories: [...new Set(data.questions.map((qId: string) => this.questionBank.getMeta(qId)?.category).filter(Boolean))] as string[],
          examType: data.examType || this.examType,
        });
      } catch {
        // skip corrupt files
      }
    }
    return paused;
  }

  async resumePausedSession(sessionId: string): Promise<ActiveSession | null> {
    const pausedDir = normalizePath(`${this.settings.practiceBasePath}/${this.examConfig.sessionsPath}/paused`);
    const filepath = normalizePath(`${pausedDir}/${sessionId}.json`);
    const file = this.app.vault.getAbstractFileByPath(filepath);
    if (!file || !((file as TFile).extension)) return null;

    const content = await this.app.vault.read(file as TFile);
    const data = JSON.parse(content);

    this.activeSession = {
      sessionId: data.sessionId,
      config: data.config,
      questions: data.questions,
      currentIndex: Object.keys(data.answers).length,
      answers: new Map(Object.entries(data.answers)) as Map<string, AnswerRecord>,
      startedAt: new Date(data.startedAt),
      examType: data.examType || this.examType,
    };

    await this.app.vault.delete(file as TFile);
    return this.activeSession;
  }

  async deletePausedSession(sessionId: string): Promise<void> {
    const pausedDir = normalizePath(`${this.settings.practiceBasePath}/${this.examConfig.sessionsPath}/paused`);
    const filepath = normalizePath(`${pausedDir}/${sessionId}.json`);
    const file = this.app.vault.getAbstractFileByPath(filepath);
    if (file) await this.app.vault.delete(file as TFile);
  }
}
