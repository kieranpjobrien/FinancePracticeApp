import { type App, TFile, TFolder, parseYaml } from "obsidian";
import type { ExamType, ExamConfig, Question, QuestionMeta, PluginSettings } from "./types";
import { EXAM_CONFIGS } from "./types";

/**
 * Loads questions lazily:
 *  - loadIndex() builds lightweight metadata for every question from Obsidian's
 *    cached frontmatter (no file body reads) — fast enough to run on every exam switch.
 *  - loadQuestion(id) reads and parses a single question body on demand, and caches it.
 */
export class QuestionBank {
  private app: App;
  private examType: ExamType;
  private examConfig: ExamConfig;
  private questionsPath: string;

  meta: Map<string, QuestionMeta> = new Map();
  private full: Map<string, Question> = new Map();
  indexed = false;

  constructor(app: App, settings: PluginSettings, examType: ExamType) {
    this.app = app;
    this.examType = examType;
    this.examConfig = EXAM_CONFIGS[examType];
    this.questionsPath = `${settings.practiceBasePath}/${this.examConfig.questionsPath}`;
  }

  async loadIndex(): Promise<void> {
    this.meta.clear();
    const folder = this.app.vault.getAbstractFileByPath(this.questionsPath);
    if (!(folder instanceof TFolder)) {
      this.indexed = true;
      return;
    }

    const files: TFile[] = [];
    const walk = (f: TFolder) => {
      for (const child of f.children) {
        if (child instanceof TFolder) walk(child);
        else if (child instanceof TFile && child.extension === "md") files.push(child);
      }
    };
    walk(folder);

    const catField = this.examConfig.categoryField;
    const subField = this.examConfig.subcategoryField;
    const missing: TFile[] = [];

    // Fast path: use Obsidian's parsed-and-cached frontmatter (no disk reads).
    for (const file of files) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (fm && fm.id != null) this.addMeta(fm, file, catField, subField);
      else missing.push(file);
    }

    // Fallback for any files the metadata cache has not indexed yet (e.g. cold start).
    for (const file of missing) {
      try {
        const content = await this.app.vault.cachedRead(file);
        const m = content.match(/^---\n([\s\S]*?)\n---/);
        if (!m) continue;
        const fm = parseYaml(m[1]) as Record<string, unknown>;
        if (fm && fm.id != null) this.addMeta(fm, file, catField, subField);
      } catch {
        // skip unreadable files
      }
    }

    this.indexed = true;
  }

  private addMeta(fm: Record<string, unknown>, file: TFile, catField: string, subField: string): void {
    const id = String(fm.id);
    this.meta.set(id, {
      id,
      category: String(fm[catField] ?? fm.category ?? ""),
      subcategory: String(fm[subField] ?? fm.subcategory ?? ""),
      difficulty: (fm.difficulty as QuestionMeta["difficulty"]) ?? "Medium",
      type: String(fm.type ?? "conceptual"),
      format: fm.format === "multi" ? "multi" : fm.format === "matching" ? "matching" : "single",
      timesShown: Number(fm.times_shown ?? 0),
      timesCorrect: Number(fm.times_correct ?? 0),
      lastShown: (fm.last_shown as string) ?? null,
      filePath: file.path,
    });
  }

  /** Read and parse a single question body on demand. Cached after first load. */
  async loadQuestion(id: string): Promise<Question | null> {
    const cached = this.full.get(id);
    if (cached) return cached;

    const m = this.meta.get(id);
    if (!m) return null;

    const file = this.app.vault.getFileByPath(m.filePath);
    if (!file) return null;

    const content = await this.app.vault.cachedRead(file);
    const body = content.replace(/^---\n[\s\S]*?\n---/, "");
    const parsed = this.parseBody(body);
    const q: Question = m.format === "matching"
      ? { ...m, question: parsed.questionText, options: parsed.items, matches: parsed.matches, answer: parsed.answer, explanation: parsed.explanation }
      : { ...m, question: parsed.questionText, options: parsed.options, answer: parsed.answer, explanation: parsed.explanation };
    this.full.set(id, q);
    return q;
  }

  private parseBody(body: string): {
    questionText: string;
    options: Record<string, string>;
    items: Record<string, string>;
    matches: Record<string, string>;
    answer: string;
    explanation: string;
  } {
    let questionText = "";
    const options: Record<string, string> = {};
    const items: Record<string, string> = {};
    const matches: Record<string, string> = {};
    let answer = "";
    let explanation = "";

    const letters = ["A", "B", "C", "D", "E", "F"];
    const digits = ["1", "2", "3", "4", "5", "6"];
    const parseList = (section: string, keys: string[], target: Record<string, string>) => {
      for (const line of section.split("\n")) {
        const trimmed = line.trim();
        for (const k of keys) {
          if (trimmed.startsWith(`- **${k}**:`)) target[k] = trimmed.replace(`- **${k}**:`, "").trim();
        }
      }
    };

    const sections = body.split("## ");
    for (const section of sections) {
      if (section.startsWith("Question") || section.trim().startsWith("#")) {
        const lines = section.split("\n", 2);
        questionText = lines.length > 1 ? lines[1].trim() : section.replace("# Question", "").trim();
      } else if (section.startsWith("Options")) {
        parseList(section, letters, options);
      } else if (section.startsWith("Items")) {
        parseList(section, digits, items);
      } else if (section.startsWith("Matches")) {
        parseList(section, letters, matches);
      } else if (section.startsWith("Answer")) {
        answer = section.replace("Answer", "").trim().split("\n")[0].trim();
      } else if (section.startsWith("Explanation")) {
        explanation = section.replace("Explanation", "").trim();
      }
    }

    if (!questionText && body.includes("# Question")) {
      const parts = body.split("# Question");
      if (parts.length > 1) {
        const rest = parts[1];
        const end = rest.indexOf("## ");
        if (end > 0) questionText = rest.slice(0, end).trim();
      }
    }

    return { questionText, options, items, matches, answer, explanation };
  }

  getMeta(id: string): QuestionMeta | undefined {
    return this.meta.get(id);
  }

  allMeta(): QuestionMeta[] {
    return [...this.meta.values()];
  }

  getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const m of this.meta.values()) counts[m.category] = (counts[m.category] || 0) + 1;
    return counts;
  }

  selectQuestions(count: number, categories?: string[], difficulty?: string): QuestionMeta[] {
    let pool = [...this.meta.values()];

    if (categories && categories.length > 0) pool = pool.filter((q) => categories.includes(q.category));
    if (difficulty && difficulty !== "mixed") {
      pool = pool.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (pool.length === 0) return [];

    const today = new Date();
    pool.sort((a, b) => {
      const sa = this.srsScore(a, today);
      const sb = this.srsScore(b, today);
      for (let i = 0; i < sa.length; i++) {
        if (sa[i] !== sb[i]) return sa[i] - sb[i];
      }
      return 0;
    });

    return pool.slice(0, count);
  }

  private srsScore(q: QuestionMeta, today: Date): number[] {
    if (q.timesShown === 0) return [0, 0, Math.random()];

    let daysSince = 999;
    if (q.lastShown) {
      try {
        const last = new Date(q.lastShown);
        daysSince = Math.floor((today.getTime() - last.getTime()) / 86400000);
      } catch {
        daysSince = 999;
      }
    }

    const accuracy = q.timesShown > 0 ? q.timesCorrect / q.timesShown : 0;
    const optimal = accuracy >= 0.8 ? 7 : accuracy >= 0.6 ? 3 : 1;
    const overdue = optimal - daysSince;

    return [1, overdue, -accuracy, Math.random()];
  }

  selectWeightedByExam(count: number): QuestionMeta[] {
    const questions: QuestionMeta[] = [];
    for (const cat of this.examConfig.categories) {
      const catCount = Math.round(count * (cat.weight / 100));
      questions.push(...this.selectQuestions(catCount, [cat.name], "mixed"));
    }
    while (questions.length > count) {
      questions.splice(Math.floor(Math.random() * questions.length), 1);
    }
    return questions.sort(() => Math.random() - 0.5);
  }

  selectWeakAreas(count: number, threshold = 0.7): QuestionMeta[] {
    const catStats: Record<string, { shown: number; correct: number }> = {};
    for (const q of this.meta.values()) {
      if (!catStats[q.category]) catStats[q.category] = { shown: 0, correct: 0 };
      catStats[q.category].shown += q.timesShown;
      catStats[q.category].correct += q.timesCorrect;
    }

    const weakCats = Object.entries(catStats)
      .filter(([, s]) => s.shown === 0 || s.correct / s.shown < threshold)
      .map(([cat]) => cat);

    const cats = weakCats.length > 0 ? weakCats : Object.keys(catStats);
    const pool = [...this.meta.values()].filter((q) => cats.includes(q.category));
    pool.sort((a, b) => {
      const aa = a.timesShown > 0 ? a.timesCorrect / a.timesShown : -1;
      const ba = b.timesShown > 0 ? b.timesCorrect / b.timesShown : -1;
      return aa - ba || b.timesShown - a.timesShown;
    });
    return pool.slice(0, count);
  }

  async updateQuestionStats(questionId: string, isCorrect: boolean): Promise<void> {
    const m = this.meta.get(questionId);
    if (!m) return;

    const tfile = this.app.vault.getFileByPath(m.filePath);
    if (!tfile) return;

    const today = new Date().toISOString().split("T")[0];
    const newShown = m.timesShown + 1;
    const newCorrect = m.timesCorrect + (isCorrect ? 1 : 0);

    await this.app.vault.process(tfile, (content) => {
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) return content;
      let fm = fmMatch[1];
      fm = this.replaceFmField(fm, "times_shown", String(newShown));
      fm = this.replaceFmField(fm, "times_correct", String(newCorrect));
      fm = this.replaceFmField(fm, "last_shown", today);
      return `---\n${fm}\n---${content.slice(fmMatch[0].length)}`;
    });

    m.timesShown = newShown;
    m.timesCorrect = newCorrect;
    m.lastShown = today;
    const cached = this.full.get(questionId);
    if (cached) {
      cached.timesShown = newShown;
      cached.timesCorrect = newCorrect;
      cached.lastShown = today;
    }
  }

  private replaceFmField(fm: string, field: string, value: string): string {
    const regex = new RegExp(`^${field}:.*$`, "m");
    if (regex.test(fm)) return fm.replace(regex, `${field}: ${value}`);
    return `${fm}\n${field}: ${value}`;
  }
}
