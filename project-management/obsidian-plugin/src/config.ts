import { App, PluginSettingTab, Setting } from 'obsidian';
import type PMPPracticePlugin from './main';

export class PMPPracticeSettingTab extends PluginSettingTab {
  plugin: PMPPracticePlugin;

  constructor(app: App, plugin: PMPPracticePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Practice App Settings' });

    const exams = this.plugin.settings.exams || {};
    for (const [examName, examConfig] of Object.entries(exams)) {
      containerEl.createEl('h3', { text: examName });

      new Setting(containerEl)
        .setName('Questions folder')
        .addText(text => text
          .setValue(examConfig.questionsPath)
          .onChange(async (value) => {
            this.plugin.settings.exams[examName].questionsPath = value;
            await this.plugin.saveSettings();
          }));

      new Setting(containerEl)
        .setName('Sessions folder')
        .addText(text => text
          .setValue(examConfig.sessionsPath)
          .onChange(async (value) => {
            this.plugin.settings.exams[examName].sessionsPath = value;
            await this.plugin.saveSettings();
          }));
    }

    containerEl.createEl('h3', { text: 'Defaults' });

    new Setting(containerEl)
      .setName('Default question count')
      .addSlider(slider => slider
        .setLimits(5, 50, 5)
        .setValue(this.plugin.settings.defaultQuestions)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.defaultQuestions = value;
          await this.plugin.saveSettings();
        }));
  }
}
