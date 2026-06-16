import { type App, type TFile, normalizePath } from "obsidian";
import type { ExamType, ExamConfig, PluginSettings, SessionConfig, SessionSummary, PausedSession, QuestionResult } from "./types";
import { EXAM_CONFIGS } from "./types";
import { QuestionBank } from "./QuestionBank";

interface ActiveSession {
  sessionId: string;
  config: SessionConfig;
  questions: string[];
  currentIndex: number;
  answers: Map<string, { selectedAnswer: string; timeSeconds: number; confidence: string }>;
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

    let questions: ReturnType<QuestionBank["selectQuestions"]>;
    const st = config.sessionType;

    if (st === "mock_exam") {
      questions = this.questionBank.selectWeightedByExam(config.questionCount);
    } else if (st.includes("drill") && st !== "subtopic_drill") {
      questions = this.questionBank.selectQuestions(config.questionCount, config.categories, config.difficulty);
    } else if (st === "weak_areas") {
      questions = this.questionBank.selectWeakAreas(config.questionCount);
    } else {
      questions = this.questionBank.selectQuestions(
        config.questionCount,
        config.categories.length > 0 ? config.categories : undefined,
        config.difficulty
      );
    }

    this.activeSession = {
      sessionId,
      config,
      questions: questions.map((q) => q.id),
      currentIndex: 0,
      answers: new Map(),
      startedAt: now,
      examType: this.examType,
    };

    return this.activeSession;
  }

  submitAnswer(questionId: string, selectedAnswer: string, timeSeconds: number, confidence: string): QuestionResult | null {
    if (!this.activeSession) return null;
    const question = this.questionBank.getQuestion(questionId);
    if (!question) return null;

    this.activeSession.answers.set(questionId, { selectedAnswer, timeSeconds, confidence });
    const isCorrect = selectedAnswer === question.answer;

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
      const question = this.questionBank.getQuestion(questionId);
      const answer = session.answers.get(questionId);
      if (!question || !answer) continue;

      const isCorrect = answer.selectedAnswer === question.answer;
      if (isCorrect) totalCorrect++;
      totalTime += answer.timeSeconds;

      if (!resultsByCategory[question.category]) {
        resultsByCategory[question.category] = { correct: 0, total: 0, percent: 0 };
      }
      resultsByCategory[question.category].total++;
      if (isCorrect) resultsByCategory[question.category].correct++;

      if (!isCorrect) {
        if (answer.timeSeconds < 30) {
          errorSummary["time_pressure"] = (errorSummary["time_pressure"] || 0) + 1;
        } else if (answer.confidence === "sure") {
          errorSummary["overconfidence"] = (errorSummary["overconfidence"] || 0) + 1;
        } else {
          errorSummary[question.type] = (errorSummary[question.type] || 0) + 1;
        }
      }

      // Update question stats in vault
      await this.questionBank.updateQuestionStats(questionId, isCorrect);
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

    // Ensure directory exists
    if (!this.app.vault.getAbstractFileByPath(sessionsDir)) {
      await this.app.vault.createFolder(sessionsDir);
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

    await this.app.vault.create(filepath, lines.join("\n"));
  }

  async savePausedSession(): Promise<void> {
    if (!this.activeSession) return;
    const sessionsDir = normalizePath(`${this.settings.practiceBasePath}/${this.examConfig.sessionsPath}/paused`);
    if (!this.app.vault.getAbstractFileByPath(sessionsDir)) {
      await this.app.vault.createFolder(sessionsDir);
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
    await this.app.vault.create(filepath, JSON.stringify(data, null, 2));
  }

  async loadPausedSessions(): Promise<PausedSession[]> {
    const paused: PausedSession[] = [];
    const pausedDir = normalizePath(`${this.settings.practiceBasePath}/${this.examConfig.sessionsPath}/paused`);

    const folder = this.app.vault.getAbstractFileByPath(pausedDir);
    if (!folder) return paused;

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
          categories: [...new Set(data.questions.map((qId: string) => this.questionBank.getQuestion(qId)?.category).filter(Boolean))] as string[],
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
    if (!file || !(file as TFile).extension) return null;

    const content = await this.app.vault.read(file as TFile);
    const data = JSON.parse(content);

    this.activeSession = {
      sessionId: data.sessionId,
      config: data.config,
      questions: data.questions,
      currentIndex: Object.keys(data.answers).length,
      answers: new Map(Object.entries(data.answers)),
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
