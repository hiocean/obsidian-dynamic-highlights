import { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { debounce, MarkdownView, Notice, Plugin } from "obsidian";
import { highlightSelectionMatches, reconfigureSelectionHighlighter } from "./highlighters/selection";
import { buildStyles, staticHighlighterExtension } from "./highlighters/static";
import addIcons from "./icons/customIcons";
import { CustomCSS, DEFAULT_SETTINGS, DynamicHighlightsSettings, HighlighterOptions, _RUNNER } from "./settings/settings";
import { SettingTab } from "./settings/ui";
import { debugPrint } from "./utils/funcs";


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
  private toggler: any;

  async onload() {
    // load data
    await this.loadSettings(); 
    addIcons();

    // generate UIs
    this.settingsTab = new SettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.addRibbonIcon('dyht', 'Enable FM highlighter', async (evt: MouseEvent) => {
      await this.updateToggler();
    });

    // update exts
    this.staticHighlighter = staticHighlighterExtension(this);
    this.extensions = [];
    this.updateSelectionHighlighter();
    this.updateStaticHighlighter();
    this.updateStyles();
    this.registerEditorExtension(this.extensions);
    this.initCSS();

    // listen the change of leaf
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.updateFrontmatterHighlighter();
    }))
  }

  private async updateToggler() {
    const togglerEnabled = this.settings.frontmatterHighlighter.enableFrontmatterToggler;
    this.settings.frontmatterHighlighter.enableFrontmatterToggler = !togglerEnabled;
    await this.saveSettings();
    if (!togglerEnabled) {
      this.addToggler();
      new Notice("Toggler is enabled.");
    } else {
      this.delToggler();
    }
  }
  
  private addToggler(): void {
    this.toggler = document.createElement('button');
    const icon = document.createElement('span');
    icon.innerText = this.settings.frontmatterHighlighter.togglerIcon;
    this.toggler.classList.add(_RUNNER);
    this.toggler.appendChild(icon);
    this.toggler.addEventListener('click', async () => {
      this.updateFrontmatterHighlighter({ useCache: false });
    });
    document.body.appendChild(this.toggler);
  }

  private delToggler() {
    // this.toggler.removeEventListener('click', async () => {
    //   this.updateFrontmatterHighlighter({ useCache: false });
    // });
    // document.body.removeChild(this.toggler);
    this.toggler.remove()
    new Notice("Toggler is disabled.")
    // const toggler: HTMLElement = document.querySelector(`.${_RUNNER}`)!;
    // if (toggler) {
    //   toggler.remove(); new Notice("toggler disabled.")
    // }
   
  }

  async updateFrontmatterHighlighter({ useCache = true }: { useCache?: boolean; } = {}): Promise<void> {
    debugPrint({ arg: "Func updateFrontmatterHighlighter is called!", debug: this.settings.debug })
    if (!this.settings.frontmatterHighlighter.enableFrontmatterHighlight) return
    // let hasModified = false,currHighlightInFm;
    let { hasModified, result: currHighlightInFm } = await this.getFrontmatter(useCache)
    debugPrint({ arg: "Highlighter keyword in fm: " + currHighlightInFm, debug: this.settings.debug });

    //clear staticHighlighter.queries 
    Object.keys(this.settings.staticHighlighter.queries).forEach(key => {
      if (!this.settings.staticHighlighter.queryOrder.includes(key)) {
        delete this.settings.staticHighlighter.queries[key];
      }
    })


    if (currHighlightInFm) {
      if (typeof currHighlightInFm === 'string' && currHighlightInFm.match(/[,，]/)) {
        currHighlightInFm = currHighlightInFm.split(/[,，]/).filter(e => e)
      } else if (currHighlightInFm instanceof Array) {
        currHighlightInFm = currHighlightInFm
      } else {
        currHighlightInFm = [currHighlightInFm]
      }
      debugPrint({ arg: "Show cleared highlighter in fm: " + currHighlightInFm, debug: this.settings.debug });
      const queries = this.settings.frontmatterHighlighter.queries
      const cssLenth = Object.keys(queries).length
      const index = currHighlightInFm.length > cssLenth ? cssLenth : currHighlightInFm.length
      for (let i = 0; i < index; i++) {
        const className = Object.keys(queries)[i]
        const tempQuery = Object.assign({}, queries[className]);
        tempQuery.query = currHighlightInFm[i]
        this.settings.staticHighlighter.queries[className] = tempQuery
        debugPrint({ arg: `addded: Name: ${className}; query: ${currHighlightInFm[i]}`, debug: this.settings.debug });
        hasModified = true
      }

    }
    if (hasModified = true) {
      new Notice("Highlighter is shown based on Frontmatter!");
      await this.saveSettings();
      this.updateCustomCSS();
      this.updateStyles();
      this.updateStaticHighlighter()
    }

  }

  async getFrontmatter(useCache: boolean = true): Promise<{ hasModified: boolean; result: string | string[] | undefined; }> {
    let hasModified = false; let result: string | string[] | undefined;
    const tf = this.app.workspace.getActiveFile();
    if (tf) {
      const highlighterKw = this.settings.frontmatterHighlighter.frontmatterHighlightKeywords;
      const cachedFrontmatter = this.app.metadataCache.getFileCache(tf)?.frontmatter
      if (useCache) { result = cachedFrontmatter![highlighterKw] }

      const fullText = await this.app.vault.read(tf);
      const regexfm = new RegExp(`---[\\s\\S]*?${highlighterKw}[\\s\\S]*?---`, 'gm')
      const fmMatch = regexfm.exec(fullText);
      if (fmMatch) {
        const regexKwSingleLine = new RegExp(`^\\s*${highlighterKw}:(.*)$`, 'gm')
        const fmkw = regexKwSingleLine.exec(fmMatch[0]);
        if (fmkw) {
          let result2 = fmkw[1].trim();
          if (result2) {
            hasModified = (result2 != result);
            result = result2;
            return { hasModified, result }
          }
        }
        const regexKwMultiLine = new RegExp(`(?<=^\\s*${highlighterKw}:[\\s]*[\\r\\n]+)(\\s*-.*?\\n)+`, 'gm')
        let result2 = fmMatch[0].match(regexKwMultiLine);
        if (result2) {
          result2 = result2[0].split('\n').filter(e => e).map(e => e.replace(/\s*-/, "").trim())
          hasModified = (result2 != result);
          result = result2;
          return { hasModified, result }
        }
      }
    }
    return { hasModified, result };
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
    this.delToggler();
  }
}
