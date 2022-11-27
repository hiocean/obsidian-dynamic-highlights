import { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { debounce, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { highlightSelectionMatches, reconfigureSelectionHighlighter } from "./highlighters/selection";
import { buildStyles, staticHighlighterExtension } from "./highlighters/static";
import addIcons from "./icons/customIcons";
import { DEFAULT_SETTINGS, DynamicHighlightsSettings, HighlighterOptions } from "./settings/settings";
import { SettingTab } from "./settings/ui";


async function getFrontmatter(tf: TFile, highlighterKw: string) {
  const fullText = await this.app.vault.read(tf);
  const regexfm = new RegExp(`---[\\s\\S]*?${highlighterKw}[\\s\\S]*?---`, 'gm')
  const fmMatch = regexfm.exec(fullText); if (!fmMatch) { return }

  let result;
  const regexKwSingleLine = new RegExp(`^\\s*${highlighterKw}:(.*)$`, 'gm')
  const fmkw = regexKwSingleLine.exec(fmMatch[0]);
  if (fmkw) {
    result = fmkw[1].trim(); if (result) { return result }
  }

  const regexKwMultiLine = new RegExp(`(?<=^\\s*${highlighterKw}:[\\s]*[\\r\\n]+)(\\s*-.*?\\n)+`, 'gm')
  result = fmMatch[0].match(regexKwMultiLine);
  if (result) {
    result = result[0].split('\n').filter(e => e).map(e => e.replace(/\s*-/, "").trim())
  }
  return result;
}

interface CustomCSS {
  css: string;
  enabled: boolean;
}

export default class DynamicHighlightsPlugin extends Plugin {
  settings: DynamicHighlightsSettings;
  extensions: Extension[];
  styles: Extension;
  staticHighlighter: Extension;
  frontmatterHighlighter: Extension;
  selectionHighlighter: Extension;
  customCSS: Record<string, CustomCSS>;
  styleEl: HTMLElement;
  settingsTab: SettingTab;
  toBedeleteQuery: string[];

  async onload() {
    this.toBedeleteQuery = []
    await this.loadSettings();

    this.registerEvent(this.app.vault.on("modify", (modifiedFile: { path: any; }) => {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile && activeFile.path == modifiedFile.path) {
        this.updateFrontmatter({ useCache: false });
      }
    }))
    // this.registerEvent(this.app.workspace.on('editor-change', () => {
    //   this.updateFrontmatter({ useCache: false });
    // }))

    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.updateFrontmatter();
    }))


    // this.updateFrontmatter();
    this.settingsTab = new SettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    addIcons();
    this.staticHighlighter = staticHighlighterExtension(this);
    this.extensions = [];
    this.updateSelectionHighlighter();
    this.updateStaticHighlighter();
    this.updateStyles();
    this.registerEditorExtension(this.extensions);
    this.initCSS();
  }

  async updateFrontmatter({ useCache = true }: { useCache?: boolean; } = {}): Promise<void> {
    if (!this.settings.frontmatterHighlighter.enableFrontmatterHighlight) return
    const currFile = this.app.workspace.getActiveFile()
    if (!currFile) return;
    const kw = this.settings.frontmatterHighlighter.frontmatterHighlightKeywords;
    let highlightInFm;

    if (useCache) {
      const currFrontmatter = this.app.metadataCache.getFileCache(currFile)?.frontmatter
      if (!currFrontmatter) return
      highlightInFm = currFrontmatter[kw]
    } else {
      highlightInFm = await getFrontmatter(currFile, kw)
      console.log("read file" + highlightInFm);
    }

    if (highlightInFm) {
      if (typeof highlightInFm === 'string' && highlightInFm.match(/[,，]/)) {
        highlightInFm = highlightInFm.split(/[,，]/).filter(e => e)
      } else if (highlightInFm instanceof Array) {
        highlightInFm = highlightInFm
      } else {
        highlightInFm = [highlightInFm]
      }
      console.log("Show: " + highlightInFm);

      const queries = this.settings.frontmatterHighlighter.queries
      const cssLenth = Object.keys(queries).length
      const index = highlightInFm.length > cssLenth ? cssLenth : highlightInFm.length
      for (let i = 0; i < index; i++) {
        const className = Object.keys(queries)[i]
        queries[className].query = highlightInFm[i]
        this.settings.staticHighlighter.queries[className] = queries[className]
        this.toBedeleteQuery.push(className)
        console.log(`addded:  - + ${className} + ${highlightInFm[i]}`);  //todo
      }
      this.updateStaticHighlighter()
      // await this.saveSettings();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings.selectionHighlighter.highlightDelay < 200) {
      this.settings.selectionHighlighter.highlightDelay = 200;
      this.saveSettings;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  initCSS() {
    let styleEl = (this.styleEl = document.createElement("style"));
    styleEl.setAttribute("type", "text/css");
    document.head.appendChild(styleEl);
    this.register(() => styleEl.detach());
    this.updateCustomCSS();
  }

  updateCustomCSS() {
    this.styleEl.textContent = Object.values(this.settings.staticHighlighter.queries)
      .map(q => q && q.css)
      .join("\n");
    this.app.workspace.trigger("css-change");
  }

  updateStyles() {
    this.extensions.remove(this.styles);
    this.styles = buildStyles(this);
    this.extensions.push(this.styles);
    this.app.workspace.updateOptions();
  }

  updateStaticHighlighter() {
    this.extensions.remove(this.staticHighlighter);
    this.staticHighlighter = staticHighlighterExtension(this);
    // this.frontmatterHighlighter = frontmatterHighlighterExtension(this);
    this.extensions.push(this.staticHighlighter);
    this.app.workspace.updateOptions();
  }

  updateSelectionHighlighter() {
    this.extensions.remove(this.selectionHighlighter);
    this.selectionHighlighter = highlightSelectionMatches(this.settings.selectionHighlighter)
    this.extensions.push(this.selectionHighlighter);
    this.app.workspace.updateOptions();
  }

  iterateCM6(callback: (editor: EditorView) => unknown) {
    this.app.workspace.iterateAllLeaves(leaf => {
      leaf?.view instanceof MarkdownView &&
        (leaf.view.editor as any)?.cm instanceof EditorView &&
        callback((leaf.view.editor as any).cm);
    });
  }

  updateConfig = debounce(
    (type: string, config: HighlighterOptions) => {
      let reconfigure: (config: HighlighterOptions) => StateEffect<unknown>;
      if (type === "selection") {
        reconfigure = reconfigureSelectionHighlighter;
      } else {
        return;
      }
      this.iterateCM6(view => {
        view.dispatch({
          effects: reconfigure(config),
        });
      });
    },
    1000,
    true
  );
  onunload() {
    this.toBedeleteQuery.forEach(e => { delete this.settings.staticHighlighter.queries[e] })
  }
}
