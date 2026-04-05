import { App, TFile, TFolder } from 'obsidian';
import { Question, questionAccuracy, DomainInfo, Stats } from './models';

export class QuestionBank {
  questions: Map<string, Question> = new Map();
  private app: App;
  private questionsPath: string;

  constructor(app: App, questionsPath: string) {
    this.app = app;
    this.questionsPath = questionsPath;
  }

  async loadAllQuestions(): Promise<void> {
    this.questions.clear();
    const folder = this.app.vault.getAbstractFileByPath(this.questionsPath);
    if (!folder || !(folder instanceof TFolder)) return;

    const files = this.getAllMarkdownFiles(folder);
    for (const file of files) {
      try {
        const question = await this.loadQuestionFile(file);
        if (question) {
          this.questions.set(question.id, question);
        }
      } catch (e) {
        console.warn(`Failed to load ${file.path}:`, e);
      }
    }
  }

  private getAllMarkdownFiles(folder: TFolder): TFile[] {
    const files: TFile[] = [];
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        files.push(child);
      } else if (child instanceof TFolder) {
        files.push(...this.getAllMarkdownFiles(child));
      }
    }
    return files;
  }

  private async loadQuestionFile(file: TFile): Promise<Question | null> {
    const content = await this.app.vault.read(file);

    // Parse frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;

    const metadata = this.parseYaml(fmMatch[1]);
    if (!metadata.id) return null;

    const body = content.slice(fmMatch[0].length);

    // Parse content sections
    let questionText = '';
    let options: Record<string, string> = {};
    let answer = '';
    let explanation = '';

    const sections = body.split('## ');
    for (const section of sections) {
      if (section.startsWith('Question') || section.trim().startsWith('#')) {
        const lines = section.split('\n', 2);
        if (lines.length > 1) {
          questionText = section.slice(section.indexOf('\n') + 1).trim();
        }
      } else if (section.startsWith('Options')) {
        for (const line of section.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('- **A**:')) options['A'] = trimmed.replace('- **A**:', '').trim();
          else if (trimmed.startsWith('- **B**:')) options['B'] = trimmed.replace('- **B**:', '').trim();
          else if (trimmed.startsWith('- **C**:')) options['C'] = trimmed.replace('- **C**:', '').trim();
          else if (trimmed.startsWith('- **D**:')) options['D'] = trimmed.replace('- **D**:', '').trim();
        }
      } else if (section.startsWith('Answer')) {
        answer = section.replace('Answer', '').trim().split('\n')[0].trim();
      } else if (section.startsWith('Explanation')) {
        explanation = section.replace('Explanation', '').trim();
      }
    }

    // Fallback: check for # Question format
    if (!questionText && body.includes('# Question')) {
      const parts = body.split('# Question');
      if (parts.length > 1) {
        const rest = parts[1];
        const qEnd = rest.indexOf('## ');
        if (qEnd > 0) {
          questionText = rest.slice(0, qEnd).trim();
        }
      }
    }

    const created = metadata.created ? String(metadata.created) : null;
    const lastShown = metadata.last_shown ? String(metadata.last_shown) : null;

    return {
      id: metadata.id,
      domain: metadata.domain || '',
      task: metadata.task || '',
      difficulty: metadata.difficulty || 'Medium',
      type: metadata.type || 'situational',
      question: questionText,
      options,
      answer,
      explanation,
      tags: metadata.tags || [],
      created,
      source: metadata.source || 'claude-generated',
      times_shown: metadata.times_shown || 0,
      times_correct: metadata.times_correct || 0,
      last_shown: lastShown,
      filePath: file.path,
    };
  }

  private parseYaml(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    let currentKey = '';
    let inArray = false;
    let arrayValues: string[] = [];

    for (const line of yaml.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (inArray) {
        if (trimmed.startsWith('- ')) {
          arrayValues.push(trimmed.slice(2).trim());
          continue;
        } else {
          result[currentKey] = arrayValues;
          inArray = false;
          arrayValues = [];
        }
      }

      const match = trimmed.match(/^([^:]+):\s*(.*)/);
      if (match) {
        const key = match[1].trim();
        let value: any = match[2].trim();

        if (value === '') {
          // Could be start of array or empty
          currentKey = key;
          // Peek ahead handled by inArray logic
          inArray = true;
          arrayValues = [];
          continue;
        }

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Parse types
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (/^\d+$/.test(value)) value = parseInt(value, 10);
        else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);

        // Handle inline arrays [a, b, c]
        if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
        }

        result[key] = value;
        currentKey = key;
      }
    }

    if (inArray) {
      result[currentKey] = arrayValues;
    }

    return result;
  }

  getQuestion(questionId: string): Question | undefined {
    return this.questions.get(questionId);
  }

  getQuestionsForDomain(domain: string): Question[] {
    return Array.from(this.questions.values()).filter(q => q.domain === domain);
  }

  selectQuestions(
    count: number,
    domains?: string[],
    difficulty: string = 'mixed',
  ): Question[] {
    let pool = Array.from(this.questions.values());

    if (domains && domains.length > 0) {
      pool = pool.filter(q => domains.includes(q.domain));
    }

    if (difficulty !== 'mixed') {
      pool = pool.filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    if (pool.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    pool.sort((a, b) => {
      const scoreA = this.srsScore(a, today);
      const scoreB = this.srsScore(b, today);
      for (let i = 0; i < Math.min(scoreA.length, scoreB.length); i++) {
        if (scoreA[i] !== scoreB[i]) return scoreA[i] - scoreB[i];
      }
      return 0;
    });

    return pool.slice(0, count);
  }

  private srsScore(q: Question, today: Date): number[] {
    if (q.times_shown === 0) {
      return [0, 0, Math.random()];
    }

    let daysSince = 999;
    if (q.last_shown) {
      try {
        const last = new Date(q.last_shown);
        last.setHours(0, 0, 0, 0);
        daysSince = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      } catch {
        daysSince = 999;
      }
    }

    const acc = questionAccuracy(q);
    let optimalInterval: number;
    if (acc >= 0.8) optimalInterval = 7;
    else if (acc >= 0.6) optimalInterval = 3;
    else optimalInterval = 1;

    const overdue = optimalInterval - daysSince;

    return [1, overdue, q.times_shown > 0 ? -acc : 0, Math.random()];
  }

  selectWeightedByExam(count: number): Question[] {
    const examWeights: Record<string, number> = {
      'People': 0.42,
      'Process': 0.50,
      'Business Environment': 0.08,
    };

    const questions: Question[] = [];
    for (const [domain, weight] of Object.entries(examWeights)) {
      const domainCount = Math.round(count * weight);
      const domainQuestions = this.selectQuestions(domainCount, [domain], 'mixed');
      questions.push(...domainQuestions);
    }

    // Adjust if rounding caused over-selection
    while (questions.length > count) {
      const idx = Math.floor(Math.random() * questions.length);
      questions.splice(idx, 1);
    }

    // Shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    return questions;
  }

  selectWeakAreas(count: number, threshold: number = 0.7): Question[] {
    const domainStats: Record<string, { shown: number; correct: number }> = {};
    for (const q of this.questions.values()) {
      if (!domainStats[q.domain]) {
        domainStats[q.domain] = { shown: 0, correct: 0 };
      }
      domainStats[q.domain].shown += q.times_shown;
      domainStats[q.domain].correct += q.times_correct;
    }

    let weakDomains: string[] = [];
    for (const [domain, stats] of Object.entries(domainStats)) {
      if (stats.shown === 0 || stats.correct / stats.shown < threshold) {
        weakDomains.push(domain);
      }
    }

    if (weakDomains.length === 0) {
      weakDomains = Object.keys(domainStats);
    }

    let pool = Array.from(this.questions.values()).filter(q => weakDomains.includes(q.domain));

    pool.sort((a, b) => {
      const accA = a.times_shown > 0 ? questionAccuracy(a) : -1;
      const accB = b.times_shown > 0 ? questionAccuracy(b) : -1;
      if (accA !== accB) return accA - accB;
      if (a.times_shown !== b.times_shown) return b.times_shown - a.times_shown;
      return Math.random() - 0.5;
    });

    return pool.slice(0, count);
  }

  getAllDomains(): string[] {
    const domains = new Set<string>();
    for (const q of this.questions.values()) {
      domains.add(q.domain);
    }
    return Array.from(domains).sort();
  }

  getTasks(domain: string): string[] {
    const tasks = new Set<string>();
    for (const q of this.questions.values()) {
      if (q.domain === domain) tasks.add(q.task);
    }
    return Array.from(tasks).sort();
  }

  getDomains(): Record<string, DomainInfo> {
    const result: Record<string, DomainInfo> = {};
    for (const q of this.questions.values()) {
      if (!result[q.domain]) {
        result[q.domain] = { tasks: [], question_count: 0 };
      }
      result[q.domain].question_count++;
      if (!result[q.domain].tasks.includes(q.task)) {
        result[q.domain].tasks.push(q.task);
      }
    }
    for (const info of Object.values(result)) {
      info.tasks.sort();
    }
    return result;
  }

  getStats(): Stats {
    const byDomain: Record<string, { total: number; easy: number; medium: number; hard: number }> = {};
    for (const q of this.questions.values()) {
      if (!byDomain[q.domain]) {
        byDomain[q.domain] = { total: 0, easy: 0, medium: 0, hard: 0 };
      }
      byDomain[q.domain].total++;
      byDomain[q.domain][q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard']++;
    }
    return { total_questions: this.questions.size, by_domain: byDomain };
  }

  getProgress(): { overall: { times_shown: number; times_correct: number; accuracy: number }; by_domain: Record<string, any> } {
    const progressByDomain: Record<string, any> = {};
    let overallShown = 0;
    let overallCorrect = 0;

    for (const question of this.questions.values()) {
      if (!progressByDomain[question.domain]) {
        progressByDomain[question.domain] = {
          total_questions: 0,
          times_shown: 0,
          times_correct: 0,
          accuracy: 0,
          questions_seen: 0,
          questions_mastered: 0,
        };
      }

      const d = progressByDomain[question.domain];
      d.total_questions++;

      if (question.times_shown > 0) {
        d.times_shown += question.times_shown;
        d.times_correct += question.times_correct;
        d.questions_seen++;
        overallShown += question.times_shown;
        overallCorrect += question.times_correct;

        if (questionAccuracy(question) >= 0.8) {
          d.questions_mastered++;
        }
      }
    }

    for (const d of Object.values(progressByDomain)) {
      if ((d as any).times_shown > 0) {
        (d as any).accuracy = Math.round(((d as any).times_correct / (d as any).times_shown) * 1000) / 10;
      }
    }

    const overallAccuracy = overallShown > 0
      ? Math.round((overallCorrect / overallShown) * 1000) / 10
      : 0;

    return {
      overall: { times_shown: overallShown, times_correct: overallCorrect, accuracy: overallAccuracy },
      by_domain: progressByDomain,
    };
  }

  async updateQuestionStats(questionId: string, isCorrect: boolean): Promise<void> {
    const question = this.questions.get(questionId);
    if (!question) return;

    const file = this.app.vault.getAbstractFileByPath(question.filePath);
    if (!file || !(file instanceof TFile)) return;

    const content = await this.app.vault.read(file);
    const today = new Date().toISOString().slice(0, 10);

    // Update frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return;

    let frontmatter = fmMatch[1];
    const newTimesShown = question.times_shown + 1;
    const newTimesCorrect = question.times_correct + (isCorrect ? 1 : 0);

    // Replace or add times_shown
    if (/^times_shown:/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^times_shown:\s*\d+/m, `times_shown: ${newTimesShown}`);
    } else {
      frontmatter += `\ntimes_shown: ${newTimesShown}`;
    }

    // Replace or add times_correct
    if (/^times_correct:/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^times_correct:\s*\d+/m, `times_correct: ${newTimesCorrect}`);
    } else {
      frontmatter += `\ntimes_correct: ${newTimesCorrect}`;
    }

    // Replace or add last_shown
    if (/^last_shown:/m.test(frontmatter)) {
      frontmatter = frontmatter.replace(/^last_shown:\s*.*/m, `last_shown: ${today}`);
    } else {
      frontmatter += `\nlast_shown: ${today}`;
    }

    const newContent = `---\n${frontmatter}\n---${content.slice(fmMatch[0].length)}`;
    await this.app.vault.modify(file, newContent);

    // Update in-memory
    question.times_shown = newTimesShown;
    question.times_correct = newTimesCorrect;
    question.last_shown = today;
  }
}
