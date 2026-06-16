import { Plugin, WorkspaceLeaf, ItemView } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import type { PluginSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { App as PracticeApp } from "./components/App";

const VIEW_TYPE = "practice-app-view";

class PracticeView extends ItemView {
  private root: Root | null = null;
  private plugin: PracticePlugin;

  constructor(leaf: WorkspaceLeaf, plugin: PracticePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Practice App";
  }

  getIcon(): string {
    return "graduation-cap";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("pmp-practice-container");
    const mount = container.createDiv();

    this.root = createRoot(mount);
    this.root.render(
      createElement(PracticeApp, {
        app: this.app,
        settings: this.plugin.settings,
        saveSettings: () => this.plugin.saveSettings(),
      })
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}

export default class PracticePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf) => new PracticeView(leaf, this));

    this.addRibbonIcon("graduation-cap", "Practice App", () => this.activateView());

    this.addCommand({
      id: "open-practice-app",
      name: "Open Practice App",
      callback: () => this.activateView(),
    });
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      const newLeaf = workspace.getRightLeaf(false);
      if (newLeaf) {
        await newLeaf.setViewState({ type: VIEW_TYPE, active: true });
        leaf = newLeaf;
      }
    }
    if (leaf) workspace.revealLeaf(leaf);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
