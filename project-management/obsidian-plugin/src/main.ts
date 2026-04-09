import { Plugin } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from './models';
import { QuestionBank } from './question-bank';
import { SessionManager } from './session-manager';
import { PMPPracticeSettingTab } from './config';
import { PMPPracticeView, VIEW_TYPE_PMP_PRACTICE } from './views/practice-view';

export default class PMPPracticePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  questionBank!: QuestionBank;
  sessionManager!: SessionManager;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Migrate old single-path settings into exams if needed
    if (!this.settings.exams || Object.keys(this.settings.exams).length === 0) {
      this.settings.exams = DEFAULT_SETTINGS.exams;
      this.settings.activeExam = 'PMP';
    }

    const exam = this.settings.exams[this.settings.activeExam] || Object.values(this.settings.exams)[0];
    this.questionBank = new QuestionBank(this.app, exam.questionsPath);
    this.sessionManager = new SessionManager(this.app, this.questionBank, exam.sessionsPath);

    await this.questionBank.loadAllQuestions();
    const data = await this.loadData();
    if (data) {
      this.sessionManager.loadPausedSessions(data);
    }

    this.registerView(VIEW_TYPE_PMP_PRACTICE, (leaf) => new PMPPracticeView(leaf, this));

    this.addRibbonIcon('graduation-cap', 'Practice App', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-practice-app',
      name: 'Open Practice App',
      callback: () => {
        this.activateView();
      },
    });

    this.addSettingTab(new PMPPracticeSettingTab(this.app, this));
  }

  async switchExam(examName: string): Promise<void> {
    const exam = this.settings.exams[examName];
    if (!exam) return;

    this.settings.activeExam = examName;
    await this.saveSettings();

    this.questionBank = new QuestionBank(this.app, exam.questionsPath);
    this.sessionManager = new SessionManager(this.app, this.questionBank, exam.sessionsPath);

    await this.questionBank.loadAllQuestions();
    const data = await this.loadData();
    if (data) {
      this.sessionManager.loadPausedSessions(data);
    }
  }

  getExamNames(): string[] {
    return Object.keys(this.settings.exams);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_PMP_PRACTICE)[0];

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({
          type: VIEW_TYPE_PMP_PRACTICE,
          active: true,
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    // Clean up
  }
}
