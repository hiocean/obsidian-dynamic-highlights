import { EditorState, Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import Pickr from "@simonwep/pickr";
import {
  App,
  ButtonComponent,
  Notice,
  PluginSettingTab,
  Scope,
  setIcon,
  Setting,
  TextAreaComponent,
  TextComponent,
  ToggleComponent,
} from "obsidian";
import Sortable from "sortablejs";
import { basicSetup } from "src/editor/extensions";
import DynamicHighlightsPlugin from "../main";
import { ExportModal } from "./export";
import { ImportModal } from "./import";
import { QueriesOptions, FMOptions, INJSOptions, MarkItems, MarkTypes, markTypes, TabContentInfo } from "./settings";
import { materialPalenight } from "../editor/theme-dark";
import { basicLightTheme } from "../editor/theme-light";
import { SearchQuery } from "./settings";
import { DH_Settings } from "./constant";


const DHS_Header = 'dynamic-highlights-settings-header';
const DHS_Tab_Group = 'dynamic-highlights-settings-tab-group';
const DHS_Title = 'dynamic-highlights-settings-title';
const DHS_content = 'dynamic-highlights-settings-content';
const DHS_TabEl = 'setting-desktop';
const DHS_Nav_Itm_Selted = 'setting-navigation-item-selected';
const DHS_Tab_content = 'setting-tab-settings';
const DHS_Tab_Header = "dynamic-highlights-settings-heading";
const DHS_DefineUI = "highlighter-definition";
const DHS_Name = "highlighter-name";
const DHS_ignore = "ignored-words-input";
const DHS_CSS_Wrapper = "custom-css-wrapper";
const DHS_Span_Item_Name = "setting-item-name";
const DHS_Custom_CSS = "custom-css";
export class SettingTab extends PluginSettingTab {
  plugin: DynamicHighlightsPlugin;
  fmEditor: EditorView;
  staticEditor: EditorView;
  scope: Scope;
  pickrInstance: Pickr;
  private navigateEl: HTMLElement;
  private selectedTab = 'General';
  private allTabs: Map<string, TabContentInfo> = new Map<string, TabContentInfo>();
  injsEditor: EditorView;

  constructor(app: App, plugin: DynamicHighlightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide() {
    this.fmEditor?.destroy();
    this.staticEditor?.destroy();
    this.injsEditor?.destroy();
    this.pickrInstance && this.pickrInstance.destroyAndRemove();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass(DH_Settings);
    this.generateSettingsTitle();
    this.addTabHeader();
  }

  private generateSettingsTitle() {
    const linterHeader = this.containerEl.createDiv(DHS_Title);
    linterHeader.createEl('h1', { text: 'Highlighter Settings' });
    this.imExportUI(this.containerEl);
  }

  private addTabHeader() {
    const navContainer = this.containerEl.createEl('nav', { cls: DHS_Header });
    this.navigateEl = navContainer.createDiv(DHS_Tab_Group);
    const settingsEl = this.containerEl.createDiv(DHS_content);

    this.createTabAndContent('General', this.navigateEl, settingsEl, (el) => this.generateGeneralSettings(el));
    this.createTabAndContent('Selection', this.navigateEl, settingsEl, (el) => this.selectionHighlightUI(el));
    this.createTabAndContent('Static', this.navigateEl, settingsEl, (el) => this.staticHighlightUI(this.plugin.settings.staticHighlighter, el));
    this.createTabAndContent('Frontmatter', this.navigateEl, settingsEl, (el) => this.fmSettingsUI(this.plugin.settings.frontmatterHighlighter, el));
    this.createTabAndContent('InlineJS', this.navigateEl, settingsEl, (el) => this.injsUI(this.plugin.settings.injsOptions, el));
  }

  private createTabAndContent(tabName: string, navigateEl: HTMLElement, containerEl: HTMLElement,
    generateTabContent?: (el: HTMLElement, tabName: string) => void) {
    const displayTabContent = this.selectedTab === tabName;
    const tabEl = navigateEl.createDiv('setting-navigation-item');
    tabEl.addClass(DHS_TabEl);
    tabEl.createSpan().setText(tabName);

    tabEl.onclick = () => {
      if (this.selectedTab == tabName) { return; }
      tabEl.addClass(DHS_Nav_Itm_Selted);
      const tab = this.allTabs.get(tabName);
      (tab?.content as HTMLElement).show();

      if (this.selectedTab != '') {
        const tabInfo = this.allTabs.get(this.selectedTab);
        tabInfo?.navButton.removeClass(DHS_Nav_Itm_Selted);
        (tabInfo?.content as HTMLElement).hide();
      } else {
        for (const tabInfo of this.allTabs) {
          const tab = tabInfo[1];
          (tab.heading as HTMLElement).hide();
          if (tabName !== tabInfo[0]) {
            (tab.content as HTMLElement).hide();
          }
        }
      }
      this.selectedTab = tabName;
    };
    const tabContent = containerEl.createDiv(DHS_Tab_content);

    const tabHeader = tabContent.createEl('h2', { cls: DHS_Tab_Header, text: tabName + ' Settings' });
    (tabHeader as HTMLElement).hide();
    tabContent.id = tabName.toLowerCase().replace(' ', '-');

    if (!displayTabContent) {
      (tabContent as HTMLElement).hide();
    } else {
      tabEl.addClass(DHS_Nav_Itm_Selted);
    }
    if (generateTabContent) {
      generateTabContent(tabContent, tabName);
    }
    this.allTabs.set(tabName, { content: tabContent, heading: tabHeader, navButton: tabEl });
  }

  private generateGeneralSettings(containerEl: HTMLElement) {
    this.enableConfigUI({ config: this.plugin.settings.frontmatterHighlighter, containerEl });
    this.setKeywordUI({ config: this.plugin.settings.frontmatterHighlighter, containerEl });
    this.wordCursorSettingUI(containerEl);
    this.selectTextSettingUI(containerEl);
    this.delaySettingUI(containerEl);
    this.debugUI(containerEl)
  }

  private debugUI(containerEl: HTMLElement) {
    // containerEl.createEl('h2', { text: 'Debug' });
    new Setting(containerEl)
      .setName("Print debug info in console")
      .setDesc("在控制台输出调试信息")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.debug).onChange(async (value) => {
          this.plugin.settings.debug = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private fmSettingsUI(config: FMOptions, containerEl: HTMLElement) {
    containerEl.createEl("h3", { text: "Frontmatter based Highlights", });

    this.enableConfigUI({ config, containerEl });
    this.setKeywordUI({ config, containerEl });
    this.setTogglerUI({ config, containerEl });

    const fmDefineQueryUI = new Setting(containerEl);
    fmDefineQueryUI.setName("Define Frontmatter highlighters")
      .setClass(DHS_DefineUI)
      .setDesc(`In this section you define highlighters based on front matter. Thus, only css is needed, name is optional.`);

    const defaultClassName = this.getDefaultFmCSSName(config);

    const classInput = this.textInputEl({ parent: fmDefineQueryUI.controlEl, placeholder: defaultClassName });

    const { customTextAreaWrapper: customCSSWrapper, editor } = this.customTextAreaUI(fmDefineQueryUI);
    this.fmEditor = editor;

    this.saveButtonEl({
      config, parentEl: customCSSWrapper, callbackGettingQuery:
        () => {
          let customCss = this.fmEditor.state.doc.toString();
          const className: string = classInput.inputEl.value.replace(/ /g, "-") || defaultClassName
          customCss = customCss.replace(/\.([\w-]+)\s+{/gm, `.${className} {`)
          return {
            class: className,
            color: "",
            regex: true,
            query: "",
            css: customCss,
          };
        }
    });

    const highlightersContainer = this.highlightersContainerEl(
      {
        config, containerEl, editCallback:
          (highlighter: string): void => {
            let options = config.queries[highlighter];
            classInput.inputEl.value = highlighter;
            let extensions = basicSetup;
            if (document.body.hasClass("theme-dark")) {
              extensions.push(materialPalenight);
            } else {
              extensions.push(basicLightTheme);
            }
            this.fmEditor.setState(EditorState.create({ doc: options.css ? options.css : "", extensions: extensions }));
          }
      });

    this.sortableContainerEl(highlightersContainer, config);
  }

  private injsUI(config: INJSOptions, containerEl: HTMLElement) {
    containerEl.createEl("h3", { text: "Inline JS Functions", });
    this.enableConfigUI({ config, containerEl });
    this.setKeywordUI({ config, containerEl });

    const defineUI = new Setting(containerEl);

    const desc = document.createDocumentFragment();
    desc.append(
      "In this section you define INJS settings.",
      desc.createEl("br"),
      `Here, the name of the funcion \`funcname\` is needed and the fullname will be ${config.keyword}.funcname.`,
      desc.createEl("br"),
      "In the functions, `thisline` will be exposed which is the content of the line where the code locates."
    );
    defineUI.setName("Define inline js functions")
      .setClass(DHS_DefineUI)
      .setDesc(desc);

    // const defaultClassName = this.getDefaultFmCSSName(config);

    const classInput = this.textInputEl({ parent: defineUI.controlEl, placeholder: config.keyword + ".func" });

    const { customTextAreaWrapper, editor } = this.customTextAreaUI(defineUI, "Inline Js:");
    this.injsEditor = editor;

    this.saveButtonEl({
      config, parentEl: customTextAreaWrapper, callbackGettingQuery:
        () => {
          let jsString = this.injsEditor.state.doc.toString();
          let className: string = classInput.inputEl.value.replace(/ /g, "-")
          if (!className) { new Notice("A inline js function name is needed!"); return }
          // className = className.replace(config.keyword, "");
          return {
            class: className,
            color: "",
            regex: true,
            query: "`" + config.keyword + "\." + className + "`",
            css: jsString,
          };
        }
    });

    const highlightersContainer = this.highlightersContainerEl(
      {
        config, containerEl, editCallback:
          (highlighter: string): void => {
            let options = config.queries[highlighter];
            classInput.inputEl.value = highlighter;
            let extensions = basicSetup;
            if (document.body.hasClass("theme-dark")) {
              extensions.push(materialPalenight);
            } else {
              extensions.push(basicLightTheme);
            }
            this.injsEditor.setState(EditorState.create({ doc: options.css ? options.css : "", extensions: extensions }));
          }
      });

    this.sortableContainerEl(highlightersContainer, config);
  }


  private setTogglerUI({ config, containerEl }: { config: FMOptions; containerEl: HTMLElement; }) {
    const defaultIcon = config.togglerIcon
    new Setting(containerEl)
      .setName(`Set the icon of ${config.type} toggler.`)
      .setDesc(`The default Icon is '${defaultIcon}'.`)
      .addText(text => {
        text.inputEl.type = "string";
        // text.setPlaceholder(defaultfmkw);
        text.inputEl.addClass(DHS_Name);
        text.setValue(config.togglerIcon).onChange(value => {
          config.togglerIcon = value;
          // this.plugin.saveSettings();
          this.plugin.update(config.type);
        });
      });
  }

  private setKeywordUI({ config, containerEl }: { config: FMOptions | INJSOptions; containerEl: HTMLElement; }) {
    const defaultfmkw = config.keyword
    new Setting(containerEl)
      .setName(`Set the keyword of ${config.type}.`)
      .setDesc(`The default keyword is '${defaultfmkw}'.`)
      .addText(text => {
        text.inputEl.type = "string";
        // text.setPlaceholder(defaultfmkw);
        text.inputEl.addClass(DHS_Name);
        text.setValue(defaultfmkw).onChange(value => {
          config.keyword = value;
          // this.plugin.saveSettings();
          this.plugin.update(config.type);//todo
        });
      });
  }

  private enableConfigUI({ config, containerEl
  }: { config: FMOptions | INJSOptions; containerEl: HTMLElement; setName?: string; }): void {
    const setName = `Enable ${config.type} Functions!`
    new Setting(containerEl).setName(setName)
      .addToggle(toggle => {
        toggle
          .setValue(config.enabled)
          .onChange(value => {
            config.enabled = value;
            this.plugin.update(config.type)
            // this.plugin.saveSettings();
            // this.plugin.updateFrontmatterHighlighter();//todo
          });
      });
  }

  private getDefaultFmCSSName(config: QueriesOptions): string {
    var id: number = Object.keys(config.queries).length;
    const defaultClassName = `frontmattercssNo${String(id)}`;
    return defaultClassName;
  }

  private ignoredWordUI(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName("Ignored words")
      .setDesc("A comma delimted list of words that will not be highlighted")
      .addTextArea(text => {
        text.inputEl.addClass(DHS_ignore);
        text.setValue(this.plugin.settings.selectionHighlighter.ignoredWords).onChange(async (value) => {
          this.plugin.settings.selectionHighlighter.ignoredWords = value;
          // await this.plugin.saveSettings();
          this.plugin.update(this.plugin.settings.selectionHighlighter.type);
        });
      });
  }

  private selectionHighlightUI(containerEl: HTMLElement) {

    containerEl.createEl("h3", { text: "Selection Highlights", });

    this.wordCursorSettingUI(containerEl);
    this.selectTextSettingUI(containerEl);
    this.delaySettingUI(containerEl);
    this.ignoredWordUI(containerEl)
  }

  private delaySettingUI(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName("Highlight delay")
      .setDesc("The delay, in milliseconds, before selection highlights will appear. Must be greater than 200ms.")
      .addText(text => {
        text.inputEl.type = "number";
        text.setValue(String(this.plugin.settings.selectionHighlighter.highlightDelay))
          .onChange(value => {
            if (parseInt(value) < 200)
              value = "200";
            if (parseInt(value) >= 0)
              this.plugin.settings.selectionHighlighter.highlightDelay = parseInt(value);
            // this.plugin.saveSettings();
            // this.plugin.updateSelectionHighlighter();
            this.plugin.update(this.plugin.settings.selectionHighlighter.type)
          });
      });
  }

  private selectTextSettingUI(containerEl: HTMLElement) {
    new Setting(containerEl).setName("Highlight all occurrences of the actively selected text")
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.selectionHighlighter.highlightSelectedText).onChange(value => {
          this.plugin.settings.selectionHighlighter.highlightSelectedText = value;
          // this.plugin.saveSettings();
          // this.plugin.updateSelectionHighlighter();
          this.plugin.update(this.plugin.settings.selectionHighlighter.type)

        });
      });
  }

  private wordCursorSettingUI(containerEl: HTMLElement) {
    new Setting(containerEl).setName("Highlight all occurrences of the word under the cursor")
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.selectionHighlighter.highlightWordAroundCursor).onChange(value => {
          this.plugin.settings.selectionHighlighter.highlightWordAroundCursor = value;
          // this.plugin.saveSettings();
          // this.plugin.updateSelectionHighlighter();
          this.plugin.update(this.plugin.settings.selectionHighlighter.type)
        });
      });
  }

  private imExportUI(containerEl: HTMLElement) {
    const importExportEl = containerEl.createDiv("import-export-wrapper");
    importExportEl.createEl(
      "a",
      {
        cls: "dynamic-highlighter-import",
        text: "Import",
        href: "#",
      },
      el => {
        el.addEventListener("click", e => {
          e.preventDefault();
          new ImportModal(this.plugin.app, this.plugin).open();
        });
      }
    );
    importExportEl.createEl(
      "a",
      {
        cls: "dynamic-highlighter-export",
        text: "Export",
        href: "#",
      },
      el => {
        el.addEventListener("click", e => {
          e.preventDefault();
          new ExportModal(this.plugin.app, this.plugin, "All", this.plugin.settings.staticHighlighter.queries).open();
        });
      }
    );
  }

  private staticHighlightUI(config: QueriesOptions, containerEl: HTMLElement) {

    containerEl.createEl("h3", { text: "Persistent Highlights", })

    const staticDefineQueryUI = new Setting(containerEl);
    staticDefineQueryUI.setName("Define Common highlighters")
      .setClass("highlighter-definition")
      .setDesc(`In this section you define a unique highlighter name along with the css.        Make sure to click the save button.`);

    const classInput = this.textInputEl({ parent: staticDefineQueryUI.controlEl });

    const colorWrapper = staticDefineQueryUI.controlEl.createDiv("color-wrapper");
    let pickrInstance: Pickr = this.colorWrapperEl(colorWrapper, classInput);

    const { marks, queryTypeInput, queryInput } = this.queryUI(staticDefineQueryUI);

    const { customTextAreaWrapper: customCSSWrapper, editor } = this.customTextAreaUI(staticDefineQueryUI);
    this.staticEditor = editor;

    this.saveButtonEl({
      config, parentEl: customCSSWrapper, callbackGettingQuery: () => {
        let enabledMarks = Object.entries(marks)
          .map(([type, item]) => item.component.getValue() && type)
          .filter(m => m);
        return {
          class: classInput.inputEl.value.replace(/ /g, "-"),
          color: pickrInstance.getSelectedColor()?.toHEXA().toString() || "",
          regex: queryTypeInput.getValue(),
          query: queryInput.inputEl.value,
          mark: enabledMarks,
          css: this.staticEditor.state.doc.toString(),
        };
      }
    });

    const highlightersContainer = this.highlightersContainerEl({
      containerEl, config, editCallback: (highlighter: string): void => {
        let options = config.queries[highlighter];
        classInput.inputEl.value = highlighter;
        pickrInstance.setColor(options.color);
        queryInput.inputEl.value = options.query;
        queryTypeInput.setValue(options.regex);
        let extensions = basicSetup;
        if (document.body.hasClass("theme-dark")) {
          extensions.push(materialPalenight);
        } else {
          extensions.push(basicLightTheme);
        }
        this.staticEditor.setState(EditorState.create({ doc: options.css ? options.css : "", extensions: extensions }));
        if (options?.mark) {
          Object.entries(marks).map(([key, value]) => options.mark!.includes(key) ? value.component.setValue(true) : value.component.setValue(false)
          );
        } else {
          Object.entries(marks).map(([key, value]) => key === "match" ? value.component.setValue(true) : value.component.setValue(false)
          );
        }
      }
    });

    this.sortableContainerEl(highlightersContainer, config);
  }



  private queryUI(parentSetting: Setting): {
    marks: Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent; }>>;
    queryTypeInput: ToggleComponent;
    queryInput: TextComponent;
  } {
    const queryWrapper = parentSetting.controlEl.createDiv("query-wrapper");
    const queryInput = this.textInputEl({ parent: queryWrapper, placeholder: "search query" });
    const queryTypeInput = new ToggleComponent(queryWrapper);
    queryTypeInput.toggleEl.addClass("highlighter-settings-regex");
    queryTypeInput.toggleEl.ariaLabel = "Enable Regex";
    queryTypeInput.onChange(value => {
      if (value) {
        queryInput.setPlaceholder("Search expression");
        // groupWrapper.show();
        marks.group?.element.show();
      } else {
        queryInput.setPlaceholder("Search term");
        marks.group?.element.hide();
      }
    });
    const marks = this.buildMarkerTypes(parentSetting.controlEl);
    return { marks, queryTypeInput, queryInput };
  }

  private textInputEl({ parent,
    placeholder = "Highlighter name",
    ariaLabel = "",
    addClass = "highlighter-name" }: {
      parent: HTMLDivElement | HTMLElement;
      placeholder?: string;
      ariaLabel?: string;
      addClass?: string;
    }): TextComponent {
    const newInput = new TextComponent(parent);
    newInput.setPlaceholder(placeholder);
    ariaLabel = ariaLabel || placeholder
    newInput.inputEl.ariaLabel = ariaLabel;
    newInput.inputEl.addClass(addClass);
    return newInput;
  }

  private customTextAreaUI(parentUI: Setting, setText: string = "Custom CSS"): {
    customTextAreaWrapper: HTMLDivElement; editor: EditorView;
  } {
    const customTextAreaWrapper = parentUI.controlEl.createDiv(DHS_CSS_Wrapper);
    customTextAreaWrapper.createSpan(DHS_Span_Item_Name).setText(setText);
    const customTextEl = new TextAreaComponent(customTextAreaWrapper);

    const editor = editorFromTextArea(customTextEl.inputEl, basicSetup);
    customTextEl.inputEl.addClass(DHS_Custom_CSS);
    return { customTextAreaWrapper, editor };
  }

  private saveButtonEl({ config, parentEl, callbackGettingQuery }: {
    config: QueriesOptions;
    parentEl: HTMLDivElement;
    callbackGettingQuery: () => SearchQuery;
  }): ButtonComponent {
    const saveButton = new ButtonComponent(parentEl);
    saveButton
      .setClass("action-button")
      .setClass("action-button-save")
      .setClass("mod-cta")
      .setIcon("save")
      .setTooltip("Save")
      .onClick(async () => {
        const aquery = callbackGettingQuery();
        const className = aquery.class

        if (className) {
          if (!config.queryOrder.includes(className)) {
            config.queryOrder.push(className);
          }
          config.queries[className] = aquery

          await this.plugin.saveSettings();
          console.log(config.type)

          // if (config.type == "fm") {
          //   this.plugin.updateFrontmatterHighlighter();
          // } else if (config.type == "injs") {
          //   console.log("here")
          //   this.plugin.updateInjsOptions();
          // } else {
          //   this.plugin.updateStaticHighlighter();
          // }
          // this.plugin.updateCustomCSS();
          // this.plugin.updateStyles();
          this.plugin.update(config.type)
          this.display();
        } else if (className && !aquery.color) {
          new Notice("Highlighter hex code missing");
        } else if (!className && aquery.color) {
          new Notice("Highlighter name missing");
        } else if (!/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(className)) {
          new Notice("Highlighter name missing");
        } else {
          new Notice("Highlighter values missing");
        }
      });
    return saveButton
  }

  private highlightersContainerEl({ config, containerEl, editCallback }: {
    config: QueriesOptions; containerEl: HTMLElement;
    editCallback: (highlighter: string) => void
  }): HTMLDivElement {
    const highlightersContainer = containerEl.createEl("div", { cls: "highlighter-container", });

    config.queryOrder.forEach(highlighter => {
      const { color, query, regex } = config.queries[highlighter];
      const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=${color} stroke=${color} stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M20.707 5.826l-3.535-3.533a.999.999 0 0 0-1.408-.006L7.096 10.82a1.01 1.01 0 0 0-.273.488l-1.024 4.437L4 18h2.828l1.142-1.129l3.588-.828c.18-.042.345-.133.477-.262l8.667-8.535a1 1 0 0 0 .005-1.42zm-9.369 7.833l-2.121-2.12l7.243-7.131l2.12 2.12l-7.242 7.131zM4 20h16v2H4z"/></svg>`;
      const settingItem = highlightersContainer.createEl("div");
      settingItem.id = "dh-" + highlighter;
      settingItem.addClass("highlighter-item-draggable");
      const dragIcon = settingItem.createEl("span");
      const colorIcon = settingItem.createEl("span");
      dragIcon.addClass("highlighter-setting-icon", "highlighter-setting-icon-drag");
      colorIcon.addClass("highlighter-setting-icon");
      colorIcon.innerHTML = icon;
      setIcon(dragIcon, "three-horizontal-bars");
      dragIcon.ariaLabel = "Drag to rearrange";
      let desc: string[] = [];
      desc.push((regex ? "search expression: " : "search term: ") + query);
      desc.push("css class: " + highlighter);
      desc.push("color: " + config.queries[highlighter].color);

      new Setting(settingItem)
        .setClass("highlighter-details")
        .setName(highlighter)
        .setDesc(desc.join(" | "))
        .addButton(button => {
          button
            .setClass("action-button")
            .setClass("action-button-edit")
            .setClass("mod-cta")
            .setIcon("pencil")
            .setTooltip("Edit")
            .onClick(() => {
              editCallback(highlighter);
              // containerEl.scrollTop = 0;
            });
        })
        .addButton(button => {
          button
            .setClass("action-button")
            .setClass("action-button-delete")
            .setIcon("trash")
            .setClass("mod-warning")
            .setTooltip("Remove")
            .onClick(async () => {
              new Notice(`${highlighter} highlight deleted`);
              delete config.queries[highlighter];
              config.queryOrder.remove(highlighter);
              await this.plugin.saveSettings();
              this.plugin.updateStyles();
              // if ('enableFrontmatterHighlight' in config) {
              //   debugPrint({ arg: "call updateFrontmatterHighlighter!", debug: this.plugin.settings.debug });
              //   this.plugin.updateFrontmatterHighlighter();
              // } else {
              //   this.plugin.updateStaticHighlighter();
              //   debugPrint({ arg: "call updateStaticHighlighter!", debug: this.plugin.settings.debug });
              // }
              this.plugin.update(config.type)
              highlightersContainer.querySelector(`#dh-${highlighter}`)!.detach();
            });
        });
    });
    return highlightersContainer;
  }

  private colorWrapperEl(colorWrapper: HTMLDivElement, classInput: TextComponent) {
    let pickrInstance: Pickr;
    const colorPicker = new ButtonComponent(colorWrapper);

    colorPicker.setClass("highlightr-color-picker").then(() => {
      this.pickrInstance = pickrInstance = new Pickr({
        el: colorPicker.buttonEl,
        container: colorWrapper,
        theme: "nano",
        defaultRepresentation: "HEXA",
        default: "#42188038",
        comparison: false,
        components: {
          preview: true,
          opacity: true,
          hue: true,
          interaction: {
            hex: true,
            rgba: false,
            hsla: true,
            hsva: false,
            cmyk: false,
            input: true,
            clear: true,
            cancel: true,
            save: true,
          },
        },
      });
      colorWrapper.querySelector(".pcr-button")!.ariaLabel = "Background color picker";

      pickrInstance
        .on("clear", (instance: Pickr) => {
          instance.hide();
          classInput.inputEl.setAttribute("style", `background-color: none; color: var(--text-normal);`);
        })
        .on("cancel", (instance: Pickr) => {
          instance.hide();
        })
        .on("change", (color: Pickr.HSVaColor) => {
          let colorHex = color?.toHEXA().toString() || "";
          let newColor;
          colorHex && colorHex.length == 6 ? (newColor = `${colorHex}A6`) : (newColor = colorHex);
          classInput.inputEl.setAttribute("style", `background-color: ${newColor}; color: var(--text-normal);`);
        })
        .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
          instance.hide();
        });
    });
    return pickrInstance;
  }

  private sortableContainerEl(highlightersContainer: HTMLDivElement,
    config: QueriesOptions): Sortable {
    return Sortable.create(highlightersContainer, {
      animation: 500,
      ghostClass: "highlighter-sortable-ghost",
      chosenClass: "highlighter-sortable-chosen",
      dragClass: "highlighter-sortable-drag",
      handle: ".highlighter-setting-icon-drag",
      dragoverBubble: true,
      forceFallback: true,
      fallbackClass: "highlighter-sortable-fallback",
      easing: "cubic-bezier(1, 0, 0, 1)",
      onSort: command => {
        const arrayResult = config.queryOrder;
        const [removed] = arrayResult.splice(command.oldIndex!, 1);
        arrayResult.splice(command.newIndex!, 0, removed);
        config.queryOrder = arrayResult;
        this.plugin.saveSettings();
      },
    });
  }

  private buildMarkerTypes(parentEl: HTMLElement): Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent; }>> {
    const types: MarkItems = {};
    const marks: MarkTypes = {
      match: { description: "matches", defaultState: true },
      group: { description: "capture groups", defaultState: false },
      line: { description: "parent line", defaultState: false },
      start: { description: "start", defaultState: false },
      end: { description: "end", defaultState: false },
    };
    const container = parentEl.createDiv("mark-wrapper");
    let type: markTypes;
    for (type in marks) {
      let mark = marks[type];
      const wrapper = container.createDiv("mark-wrapper");
      if (type === "group")
        wrapper.hide();
      wrapper.createSpan("match-type").setText(mark.description);
      const component = new ToggleComponent(wrapper).setValue(mark.defaultState);
      types[type] = {
        element: wrapper,
        component: component,
      };
    }
    return types;
  }
};

function editorFromTextArea(textarea: HTMLTextAreaElement, extensions: Extension): EditorView {
  let view = new EditorView({
    state: EditorState.create({ doc: textarea.value, extensions }),
  });
  textarea.parentNode!.insertBefore(view.dom, textarea);
  textarea.style.display = "none";
  if (textarea.form)
    textarea.form.addEventListener("submit", () => {
      textarea.value = view.state.doc.toString();
    });
  return view;
}
