import { Extension, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { debounce, MarkdownView, Notice, Plugin } from "obsidian";
import { highlightSelectionMatches, reconfigureSelectionHighlighter } from "./highlighters/selection";
import { buildStyles, staticHighlighterExtension } from "./highlighters/static";
import addIcons from "./icons/customIcons";
import { DH_RUNNER } from "./settings/constant";
import { BasOptions, CustomCSS, DEFAULT_SETTINGS, DynamicHighlightsSettings, BaseHighlightOptions, OptionName, OptionTypeNames, SelectionHighlightOptions } from "./settings/settings";
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

    await this.update();

    // listen the change of leaf

    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.updateFrontmatterHighlighter({ useCache: false });
      this.update(OptionTypeNames.Frontmatter);
    }))
  }

  async update(configType?: OptionName) {
    await this.saveSettings();
    if (!configType) this.initCSS();
    if (!configType || configType == OptionTypeNames.Frontmatter) this.updateFrontmatterHighlighter();
    if (!configType || configType == OptionTypeNames.Inlinejs) this.updateInjsOptions();
    if (!configType || configType == OptionTypeNames.Selection) this.updateSelectionHighlighter();
    if (!configType || configType != OptionTypeNames.Selection) {
      this.updateStaticHighlighter();

      this.updateStyles();
      this.updateCustomCSS();
      this.registerEditorExtension(this.extensions);
    }
    this.app.workspace.updateOptions();
    this.registerMarkdownPostProcessor((element, context) => {
      // console.log(element);
      const target = element.querySelectorAll('.frontmattercssNo0');
      console.log(target, context)
    })
  }

  private async updateToggler() {
    const togglerEnabled = this.settings.frontmatterHighlighter.enableToggler;
    this.settings.frontmatterHighlighter.enableToggler = !togglerEnabled;
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
    this.toggler.classList.add(DH_RUNNER);
    this.toggler.appendChild(icon);
    this.toggler.addEventListener('click', async () => {
      this.updateFrontmatterHighlighter({ useCache: false });
      this.update(OptionTypeNames.Static)
    });
    document.body.appendChild(this.toggler);
  }

  private delToggler() {
    // this.toggler.removeEventListener('click', async () => {
    //   this.updateFrontmatterHighlighter({ useCache: false });
    // });
    // document.body.removeChild(this.toggler);
    this.settings.frontmatterHighlighter.enabled = false;
    if (this.toggler) {
      this.toggler.remove();
      new Notice("Toggler is disabled.");
    }
    // const toggler: HTMLElement = document.querySelector(`.${_RUNNER}`)!;
    // if (toggler) {
    //   toggler.remove(); new Notice("toggler disabled.")
    // }

  }

  async updateInjsOptions() {
    const config = this.settings.injsOptions
    if (!config.enabled) return
    Object.assign(this.settings.staticHighlighter.queries, config.queries);
    // new Notice("addeddddd")
    // console.dir(this.settings.staticHighlighter.queries)
  }


  async updateFrontmatterHighlighter({ useCache = true }: { useCache?: boolean; } = {}): Promise<void> {
    //clear staticHighlighter.queries 
    Object.keys(this.settings.frontmatterHighlighter.queries).forEach(key => {
      if (!this.settings.staticHighlighter.queryOrder.includes(key)) {
        delete this.settings.staticHighlighter.queries[key];
      }
    })

    if (!this.settings.frontmatterHighlighter.enabled) return

    let { hasModified, result: currHighlightInFm } = await this.getFrontmatter(useCache)


    


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
    // if (hasModified = true) {
    //   new Notice("Highlighter is shown based on Frontmatter!");
    // }

  }

  async getFrontmatter(useCache: boolean = true): Promise<{ hasModified: boolean; result: string | string[] | undefined; }> {
    let hasModified = false; let result: string | string[] | undefined;
    const tf = this.app.workspace.getActiveFile();
    if (tf) {
      const highlighterKw = this.settings.frontmatterHighlighter.keyword;
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
    // this.app.workspace.updateOptions();
  }

  updateStaticHighlighter() {
    this.extensions.remove(this.staticHighlighter);
    this.staticHighlighter = staticHighlighterExtension(this);
    this.extensions.push(this.staticHighlighter);
    // this.app.workspace.updateOptions();
  }

  updateSelectionHighlighter() {
    this.extensions.remove(this.selectionHighlighter);
    this.selectionHighlighter = highlightSelectionMatches(this.settings.selectionHighlighter)
    this.extensions.push(this.selectionHighlighter);

  }

  iterateCM6(callback: (editor: EditorView) => unknown) {
    this.app.workspace.iterateAllLeaves(leaf => {
      leaf?.view instanceof MarkdownView &&
        (leaf.view.editor as any)?.cm instanceof EditorView &&
        callback((leaf.view.editor as any).cm);
    });
  }

  updateConfig = debounce(
    (type: string, config: BaseHighlightOptions | SelectionHighlightOptions) => {
      let reconfigure: (config: BaseHighlightOptions | SelectionHighlightOptions) => StateEffect<unknown>;
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
