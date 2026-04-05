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

    this.questionBank = new QuestionBank(this.app, this.settings.questionsPath);
    this.sessionManager = new SessionManager(this.app, this.questionBank, this.settings.sessionsPath);

    // Load questions and paused sessions
    await this.questionBank.loadAllQuestions();
    const data = await this.loadData();
    if (data) {
      this.sessionManager.loadPausedSessions(data);
    }

    // Register the practice view
    this.registerView(VIEW_TYPE_PMP_PRACTICE, (leaf) => new PMPPracticeView(leaf, this));

    // Add ribbon icon
    this.addRibbonIcon('graduation-cap', 'PMP Practice', () => {
      this.activateView();
    });

    // Add command
    this.addCommand({
      id: 'open-pmp-practice',
      name: 'Open PMP Practice',
      callback: () => {
        this.activateView();
      },
    });

    // Add settings tab
    this.addSettingTab(new PMPPracticeSettingTab(this.app, this));
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
