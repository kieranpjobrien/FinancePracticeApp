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

    containerEl.createEl('h2', { text: 'PMP Practice Settings' });

    new Setting(containerEl)
      .setName('Questions folder')
      .setDesc('Path to the folder containing question markdown files')
      .addText(text => text
        .setPlaceholder('Questions')
        .setValue(this.plugin.settings.questionsPath)
        .onChange(async (value) => {
          this.plugin.settings.questionsPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Sessions folder')
      .setDesc('Path to the folder where session logs are saved')
      .addText(text => text
        .setPlaceholder('Sessions')
        .setValue(this.plugin.settings.sessionsPath)
        .onChange(async (value) => {
          this.plugin.settings.sessionsPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default question count')
      .setDesc('Default number of questions per session')
      .addSlider(slider => slider
        .setLimits(5, 100, 5)
        .setValue(this.plugin.settings.defaultQuestions)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.defaultQuestions = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default time per question')
      .setDesc('Default time per question in seconds')
      .addSlider(slider => slider
        .setLimits(30, 180, 10)
        .setValue(this.plugin.settings.defaultTimePerQuestion)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.defaultTimePerQuestion = value;
          await this.plugin.saveSettings();
        }));
  }
}
