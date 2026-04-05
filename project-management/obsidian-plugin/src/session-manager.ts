import { App, TFile, TFolder } from 'obsidian';
import type {
  SessionConfig,
  SessionState,
  SessionSummary,
  AnswerSubmission,
  QuestionResult,
  PausedSession,
  SessionHistory,
} from './models';
import { QuestionBank } from './question-bank';

function generateId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${date}-${time}-${rand}`;
}

export class SessionManager {
  private app: App;
  private questionBank: QuestionBank;
  private sessionsPath: string;
  activeSessions: Map<string, SessionState> = new Map();

  constructor(app: App, questionBank: QuestionBank, sessionsPath: string) {
    this.app = app;
    this.questionBank = questionBank;
    this.sessionsPath = sessionsPath;
  }

  createSession(config: SessionConfig): SessionState {
    const sessionId = generateId();
    let questions;

    if (config.session_type === 'mock_exam') {
      questions = this.questionBank.selectWeightedByExam(config.question_count);
    } else if (config.session_type === 'domain_drill') {
      questions = this.questionBank.selectQuestions(config.question_count, config.domains, config.difficulty);
    } else if (config.session_type === 'weak_areas') {
      questions = this.questionBank.selectWeakAreas(config.question_count);
    } else {
      questions = this.questionBank.selectQuestions(
        config.question_count,
        config.domains.length > 0 ? config.domains : undefined,
        config.difficulty,
      );
    }

    const questionIds = questions.map(q => q.id);

    const session: SessionState = {
      session_id: sessionId,
      config,
      questions: questionIds,
      current_index: 0,
      answers: {},
      started_at: new Date().toISOString(),
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.activeSessions.get(sessionId);
  }

  submitAnswer(sessionId: string, answer: AnswerSubmission): QuestionResult | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const question = this.questionBank.getQuestion(answer.question_id);
    if (!question) return null;

    session.answers[answer.question_id] = answer;
    const isCorrect = answer.selected_answer === question.answer;

    return {
      question_id: answer.question_id,
      selected_answer: answer.selected_answer,
      correct_answer: question.answer,
      is_correct: isCorrect,
      time_seconds: answer.time_seconds,
      confidence: answer.confidence,
      explanation: question.explanation,
    };
  }

  async completeSession(sessionId: string): Promise<SessionSummary | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    let totalCorrect = 0;
    let totalTime = 0;
    const resultsByDomain: Record<string, { correct: number; total: number; percent: number }> = {};
    const errorTypes: Record<string, number> = {
      conceptual: 0,
      situational: 0,
      time_pressure: 0,
      overconfidence: 0,
    };

    for (const questionId of session.questions) {
      const question = this.questionBank.getQuestion(questionId);
      if (!question) continue;

      const answer = session.answers[questionId];
      if (!answer) continue;

      const isCorrect = answer.selected_answer === question.answer;
      if (isCorrect) totalCorrect++;
      totalTime += answer.time_seconds;

      if (!resultsByDomain[question.domain]) {
        resultsByDomain[question.domain] = { correct: 0, total: 0, percent: 0 };
      }
      resultsByDomain[question.domain].total++;
      if (isCorrect) resultsByDomain[question.domain].correct++;

      if (!isCorrect) {
        if (answer.time_seconds < 30) errorTypes['time_pressure']++;
        else if (answer.confidence === 'sure') errorTypes['overconfidence']++;
        else if (question.type === 'situational') errorTypes['situational']++;
        else errorTypes['conceptual']++;
      }
    }

    for (const d of Object.values(resultsByDomain)) {
      d.percent = d.total > 0 ? Math.round((d.correct / d.total) * 1000) / 10 : 0;
    }

    const questionsAttempted = Object.keys(session.answers).length;
    const scorePercent = questionsAttempted > 0
      ? Math.round((totalCorrect / questionsAttempted) * 1000) / 10
      : 0;

    const startedAt = new Date(session.started_at);

    const summary: SessionSummary = {
      session_id: sessionId,
      date: startedAt.toISOString().slice(0, 10),
      time: startedAt.toTimeString().slice(0, 5),
      session_type: session.config.session_type,
      question_count: session.questions.length,
      questions_attempted: questionsAttempted,
      score: totalCorrect,
      score_percent: scorePercent,
      time_taken_minutes: Math.round((totalTime / 60) * 10) / 10,
      domains: Object.keys(resultsByDomain),
      results_by_domain: resultsByDomain,
      error_summary: errorTypes,
    };

    await this.saveSessionLog(session, summary);
    await this.updateQuestionStats(session);
    this.activeSessions.delete(sessionId);

    return summary;
  }

  private async saveSessionLog(session: SessionState, summary: SessionSummary): Promise<void> {
    // Ensure sessions folder exists
    const folder = this.app.vault.getAbstractFileByPath(this.sessionsPath);
    if (!folder) {
      await this.app.vault.createFolder(this.sessionsPath);
    }

    const filename = `${summary.date}-${summary.time.replace(':', '')}.md`;
    const filepath = `${this.sessionsPath}/${filename}`;

    const lines: string[] = [
      '---',
      `date: ${summary.date}`,
      `time: "${summary.time}"`,
      `type: ${summary.session_type}`,
      `mode: ${session.config.timed ? 'timed' : 'untimed'}`,
      `duration_minutes: ${summary.time_taken_minutes}`,
      `questions_count: ${summary.question_count}`,
      'domains:',
    ];
    for (const domain of summary.domains) {
      lines.push(`  - ${domain}`);
    }
    lines.push(
      `score: ${summary.score}`,
      `score_percent: ${summary.score_percent}`,
      `questions_attempted: ${summary.questions_attempted}`,
      `time_taken_minutes: ${summary.time_taken_minutes}`,
      '---',
      '',
      `# Session: ${summary.date} ${summary.time}`,
      '',
      '## Summary',
      '',
      '| Metric | Value |',
      '|--------|-------|',
      `| Score | ${summary.score}/${summary.questions_attempted} (${summary.score_percent}%) |`,
      `| Time | ${summary.time_taken_minutes} minutes |`,
      `| Mode | ${session.config.timed ? 'Timed' : 'Untimed'} |`,
      `| Domains | ${summary.domains.join(', ')} |`,
      '',
      '## Results by Domain',
      '',
      '| Domain | Correct | Total | Percent |',
      '|--------|---------|-------|---------|',
    );

    for (const [domain, data] of Object.entries(summary.results_by_domain)) {
      lines.push(`| ${domain} | ${data.correct} | ${data.total} | ${data.percent}% |`);
    }

    lines.push('', '## Questions', '');

    for (const questionId of session.questions) {
      const question = this.questionBank.getQuestion(questionId);
      const answer = session.answers[questionId];
      if (question && answer) {
        const isCorrect = answer.selected_answer === question.answer;
        const emoji = isCorrect ? '\u2705' : '\u274C';
        lines.push(
          `### ${emoji} ${questionId}`,
          `- **Selected:** ${answer.selected_answer}`,
          `- **Correct:** ${question.answer}`,
          `- **Time:** ${answer.time_seconds}s`,
          `- **Confidence:** ${answer.confidence}`,
          '',
        );
      }
    }

    lines.push(
      '## Error Summary',
      '',
      '| Error Type | Count |',
      '|------------|-------|',
    );
    for (const [errorType, count] of Object.entries(summary.error_summary)) {
      if (count > 0) {
        lines.push(`| ${errorType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} | ${count} |`);
      }
    }

    const content = lines.join('\n');

    const existing = this.app.vault.getAbstractFileByPath(filepath);
    if (existing && existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      await this.app.vault.create(filepath, content);
    }
  }

  private async updateQuestionStats(session: SessionState): Promise<void> {
    for (const questionId of session.questions) {
      const answer = session.answers[questionId];
      if (!answer) continue;

      const question = this.questionBank.getQuestion(questionId);
      if (!question) continue;

      const isCorrect = answer.selected_answer === question.answer;
      await this.questionBank.updateQuestionStats(questionId, isCorrect);
    }
  }

  async pauseSession(sessionId: string, pluginSaveData: (data: any) => Promise<void>, currentData: any): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    if (!currentData.pausedSessions) {
      currentData.pausedSessions = {};
    }
    currentData.pausedSessions[sessionId] = {
      ...session,
      paused_at: new Date().toISOString(),
    };
    await pluginSaveData(currentData);
    return true;
  }

  loadPausedSessions(pluginData: any): void {
    const paused = pluginData?.pausedSessions;
    if (!paused) return;

    for (const [id, data] of Object.entries(paused)) {
      const sessionData = data as any;
      const session: SessionState = {
        session_id: sessionData.session_id,
        config: sessionData.config,
        questions: sessionData.questions,
        current_index: sessionData.current_index,
        answers: sessionData.answers,
        started_at: sessionData.started_at,
      };
      this.activeSessions.set(id, session);
    }
  }

  async deletePausedSession(
    sessionId: string,
    pluginSaveData: (data: any) => Promise<void>,
    currentData: any,
  ): Promise<boolean> {
    this.activeSessions.delete(sessionId);

    if (currentData.pausedSessions && currentData.pausedSessions[sessionId]) {
      delete currentData.pausedSessions[sessionId];
      await pluginSaveData(currentData);
      return true;
    }
    return false;
  }

  getPausedSessions(): PausedSession[] {
    const paused: PausedSession[] = [];
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (Object.keys(session.answers).length < session.questions.length) {
        const domains = new Set<string>();
        for (const qId of session.questions) {
          const q = this.questionBank.getQuestion(qId);
          if (q) domains.add(q.domain);
        }
        paused.push({
          session_id: sessionId,
          started_at: session.started_at,
          questions_total: session.questions.length,
          questions_answered: Object.keys(session.answers).length,
          domains: Array.from(domains),
        });
      }
    }
    return paused;
  }

  async getProgressHistory(): Promise<SessionHistory[]> {
    const folder = this.app.vault.getAbstractFileByPath(this.sessionsPath);
    if (!folder || !(folder instanceof TFolder)) return [];

    const history: SessionHistory[] = [];
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        try {
          const content = await this.app.vault.read(child);
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (!fmMatch) continue;

          const lines = fmMatch[1].split('\n');
          const meta: Record<string, any> = {};
          let inDomains = false;
          const domainsList: string[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (inDomains) {
              if (trimmed.startsWith('- ')) {
                domainsList.push(trimmed.slice(2).trim());
                continue;
              } else {
                meta['domains'] = domainsList;
                inDomains = false;
              }
            }
            if (trimmed === 'domains:') {
              inDomains = true;
              continue;
            }
            const match = trimmed.match(/^([^:]+):\s*(.*)/);
            if (match) {
              let val: any = match[2].trim().replace(/^["']|["']$/g, '');
              if (/^\d+$/.test(val)) val = parseInt(val, 10);
              else if (/^\d+\.\d+$/.test(val)) val = parseFloat(val);
              meta[match[1].trim()] = val;
            }
          }
          if (inDomains) meta['domains'] = domainsList;

          history.push({
            date: meta.date || '',
            time: meta.time || '',
            type: meta.type || '',
            score: meta.score || 0,
            score_percent: meta.score_percent || 0,
            questions_count: meta.questions_count || 0,
            domains: meta.domains || [],
          });
        } catch {
          // Skip malformed files
        }
      }
    }

    return history.sort((a, b) => a.date.localeCompare(b.date));
  }
}
