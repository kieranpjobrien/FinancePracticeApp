import { type App, type TFile, parseYaml } from "obsidian";
import type { ExamType, ExamConfig, Question, PluginSettings } from "./types";
import { EXAM_CONFIGS } from "./types";

export class QuestionBank {
  private app: App;
  private settings: PluginSettings;
  private examType: ExamType;
  private examConfig: ExamConfig;
  questions: Map<string, Question> = new Map();

  constructor(app: App, settings: PluginSettings, examType: ExamType) {
    this.app = app;
    this.settings = settings;
    this.examType = examType;
    this.examConfig = EXAM_CONFIGS[examType];
  }

  async loadAll(): Promise<void> {
    this.questions.clear();
    const basePath = `${this.settings.practiceBasePath}/${this.examConfig.questionsPath}`;
    const files = this.app.vault.getFiles().filter(
      (f) => f.path.startsWith(basePath) && f.extension === "md"
    );

    for (const file of files) {
      try {
        const q = await this.loadQuestionFile(file);
        if (q) this.questions.set(q.id, q);
      } catch (e) {
        console.warn(`Failed to load ${file.path}:`, e);
      }
    }
  }

  private async loadQuestionFile(file: TFile): Promise<Question | null> {
    const content = await this.app.vault.cachedRead(file);
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;

    let metadata: Record<string, unknown>;
    try {
      metadata = parseYaml(fmMatch[1]) as Record<string, unknown>;
    } catch {
      return null;
    }

    const id = metadata.id as string;
    if (!id) return null;

    const body = content.slice(fmMatch[0].length);
    const { questionText, options, answer, explanation } = this.parseBody(body);

    const catField = this.examConfig.categoryField;
    const subcatField = this.examConfig.subcategoryField;

    return {
      id,
      category: (metadata[catField] as string) || (metadata.category as string) || "",
      subcategory: (metadata[subcatField] as string) || (metadata.subcategory as string) || "",
      difficulty: (metadata.difficulty as Question["difficulty"]) || "Medium",
      type: (metadata.type as string) || "conceptual",
      question: questionText,
      options,
      answer,
      explanation,
      tags: (metadata.tags as string[]) || [],
      timesShown: (metadata.times_shown as number) || 0,
      timesCorrect: (metadata.times_correct as number) || 0,
      lastShown: (metadata.last_shown as string) || null,
      filePath: file.path,
    };
  }

  private parseBody(body: string): {
    questionText: string;
    options: Record<string, string>;
    answer: string;
    explanation: string;
  } {
    let questionText = "";
    const options: Record<string, string> = {};
    let answer = "";
    let explanation = "";

    const sections = body.split("## ");
    for (const section of sections) {
      if (section.startsWith("Question") || section.trim().startsWith("#")) {
        const lines = section.split("\n", 2);
        questionText = lines.length > 1 ? lines[1].trim() : section.replace("# Question", "").trim();
      } else if (section.startsWith("Options")) {
        for (const line of section.split("\n")) {
          const trimmed = line.trim();
          for (const letter of ["A", "B", "C", "D"]) {
            if (trimmed.startsWith(`- **${letter}**:`)) {
              options[letter] = trimmed.replace(`- **${letter}**:`, "").trim();
            }
          }
        }
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

    return { questionText, options, answer, explanation };
  }

  getQuestion(id: string): Question | undefined {
    return this.questions.get(id);
  }

  getAllCategories(): string[] {
    const cats = new Set<string>();
    for (const q of this.questions.values()) cats.add(q.category);
    return [...cats].sort();
  }

  getSubcategories(category: string): string[] {
    const subs = new Set<string>();
    for (const q of this.questions.values()) {
      if (q.category === category) subs.add(q.subcategory);
    }
    return [...subs].sort();
  }

  getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const q of this.questions.values()) {
      counts[q.category] = (counts[q.category] || 0) + 1;
    }
    return counts;
  }

  selectQuestions(count: number, categories?: string[], difficulty?: string): Question[] {
    let pool = [...this.questions.values()];

    if (categories && categories.length > 0) {
      pool = pool.filter((q) => categories.includes(q.category));
    }
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

  private srsScore(q: Question, today: Date): number[] {
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

  selectWeightedByExam(count: number): Question[] {
    const questions: Question[] = [];
    for (const cat of this.examConfig.categories) {
      const catCount = Math.round(count * (cat.weight / 100));
      questions.push(...this.selectQuestions(catCount, [cat.name], "mixed"));
    }
    while (questions.length > count) {
      questions.splice(Math.floor(Math.random() * questions.length), 1);
    }
    return questions.sort(() => Math.random() - 0.5);
  }

  selectWeakAreas(count: number, threshold = 0.7): Question[] {
    const catStats: Record<string, { shown: number; correct: number }> = {};
    for (const q of this.questions.values()) {
      if (!catStats[q.category]) catStats[q.category] = { shown: 0, correct: 0 };
      catStats[q.category].shown += q.timesShown;
      catStats[q.category].correct += q.timesCorrect;
    }

    const weakCats = Object.entries(catStats)
      .filter(([, s]) => s.shown === 0 || s.correct / s.shown < threshold)
      .map(([cat]) => cat);

    const cats = weakCats.length > 0 ? weakCats : Object.keys(catStats);
    let pool = [...this.questions.values()].filter((q) => cats.includes(q.category));
    pool.sort((a, b) => {
      const aa = a.timesShown > 0 ? a.timesCorrect / a.timesShown : -1;
      const ba = b.timesShown > 0 ? b.timesCorrect / b.timesShown : -1;
      return aa - ba || b.timesShown - a.timesShown;
    });
    return pool.slice(0, count);
  }

  async updateQuestionStats(questionId: string, isCorrect: boolean): Promise<void> {
    const q = this.questions.get(questionId);
    if (!q) return;

    const tfile = this.app.vault.getFileByPath(q.filePath);
    if (!tfile) return;

    const today = new Date().toISOString().split("T")[0];
    await this.app.vault.process(tfile, (content) => {
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) return content;

      let fm = fmMatch[1];
      const newShown = q.timesShown + 1;
      const newCorrect = q.timesCorrect + (isCorrect ? 1 : 0);

      fm = this.replaceFmField(fm, "times_shown", String(newShown));
      fm = this.replaceFmField(fm, "times_correct", String(newCorrect));
      fm = this.replaceFmField(fm, "last_shown", today);

      q.timesShown = newShown;
      q.timesCorrect = newCorrect;
      q.lastShown = today;

      return `---\n${fm}\n---${content.slice(fmMatch[0].length)}`;
    });
  }

  private replaceFmField(fm: string, field: string, value: string): string {
    const regex = new RegExp(`^${field}:.*$`, "m");
    if (regex.test(fm)) {
      return fm.replace(regex, `${field}: ${value}`);
    }
    return `${fm}\n${field}: ${value}`;
  }
}
