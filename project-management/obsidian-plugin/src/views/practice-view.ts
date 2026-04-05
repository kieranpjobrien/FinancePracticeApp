import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App as PracticeApp } from '../ui/App';
import type PMPPracticePlugin from '../main';

export const VIEW_TYPE_PMP_PRACTICE = 'pmp-practice-view';

export class PMPPracticeView extends ItemView {
  plugin: PMPPracticePlugin;
  private root: Root | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: PMPPracticePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_PMP_PRACTICE;
  }

  getDisplayText(): string {
    return 'PMP Practice';
  }

  getIcon(): string {
    return 'graduation-cap';
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('pmp-practice-container');

    const mountPoint = container.createDiv();
    this.root = createRoot(mountPoint);
    this.root.render(
      createElement(PracticeApp, {
        plugin: this.plugin,
      })
    );
  }

  async onClose(): Promise<void> {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
