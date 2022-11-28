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
import { FrontmatterHighlightOptions, markTypes } from "./settings";
import { materialPalenight } from "../editor/theme-dark";
import { basicLightTheme } from "../editor/theme-light";
import { StaticHighlightOptions } from "src/highlighters/static";
import { SearchQuery } from "./settings";

export class SettingTab extends PluginSettingTab {
  plugin: DynamicHighlightsPlugin;
  fmEditor: EditorView;
  staticEditor: EditorView;
  scope: Scope;
  pickrInstance: Pickr;

  constructor(app: App, plugin: DynamicHighlightsPlugin) {
    super(app, plugin);
    this.plugin = plugin;

  }

  hide() {
    this.fmEditor?.destroy();
    this.staticEditor?.destroy();

    this.pickrInstance && this.pickrInstance.destroyAndRemove();

  }

  display(): void {

    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("dynamic-highlights-settings");

    this.imExportUI(containerEl);

    this.staticHighlightUI(this.plugin.settings.staticHighlighter, containerEl);

    this.frontmatterHighlightUI(this.plugin.settings.frontmatterHighlighter, containerEl);

    this.selectionHighlightUI(containerEl);

    this.ignoredWordUI(containerEl);
  }

  private frontmatterHighlightUI(config: FrontmatterHighlightOptions, containerEl: HTMLElement) {
    containerEl.createEl("h3", { text: "Frontmatter based Highlights", });

    const defaultfmkw = this.plugin.settings.frontmatterHighlighter.frontmatterHighlightKeywords
    new Setting(containerEl).setName("Enable frontmatter highlighter ")
      .addToggle(toggle => {
        toggle
          .setValue(config.enableFrontmatterHighlight)
          .onChange(value => {
            config.enableFrontmatterHighlight = value;
            this.plugin.saveSettings();
            this.plugin.updateStaticHighlighter();
          });
      });
    new Setting(containerEl).setName("Frontmatter keyword")
      .setDesc(`The keyword in the front matter, default is '${defaultfmkw}'.`)
      .addText(text => {
        text.inputEl.type = "string";
        text.setPlaceholder(defaultfmkw)
        text.setValue("").onChange(value => {
          this.plugin.settings.frontmatterHighlighter.frontmatterHighlightKeywords = value;
          this.plugin.saveSettings();
          this.plugin.updateStaticHighlighter();
        });
      });

    const fmDefineQueryUI = new Setting(containerEl);
    fmDefineQueryUI.setName("Define Frontmatter highlighters").setClass("highlighter-definition").setDesc(`In this section you define highlighters based on front matter.       Thus, only css is needed, name is optional.`);

    const defaultClassName = this.getDefaultFmCSSName(config);

    const classInput = this.inputUI({ parent: fmDefineQueryUI.controlEl, placeholder: defaultClassName });
    const { customCSSWrapper, editor } = this.customCSSUI(fmDefineQueryUI);
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

  private getDefaultFmCSSName(config: FrontmatterHighlightOptions): string {
    var id: number = Object.keys(config.queries).length;
    const defaultClassName = `frontmattercssNo${String(id)}`;
    return defaultClassName;
  }

  private ignoredWordUI(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName("Ignored words")
      .setDesc("A comma delimted list of words that will not be highlighted")
      .addTextArea(text => {
        text.inputEl.addClass("ignored-words-input");
        text.setValue(this.plugin.settings.selectionHighlighter.ignoredWords).onChange(async (value) => {
          this.plugin.settings.selectionHighlighter.ignoredWords = value;
          await this.plugin.saveSettings();
          this.plugin.updateSelectionHighlighter();
        });
      });
  }

  private selectionHighlightUI(containerEl: HTMLElement) {
    containerEl.createEl("h3", {
      text: "Selection Highlights",
    });

    new Setting(containerEl).setName("Highlight all occurrences of the word under the cursor").addToggle(toggle => {
      toggle.setValue(this.plugin.settings.selectionHighlighter.highlightWordAroundCursor).onChange(value => {
        this.plugin.settings.selectionHighlighter.highlightWordAroundCursor = value;
        this.plugin.saveSettings();
        this.plugin.updateSelectionHighlighter();
      });
    });
    new Setting(containerEl).setName("Highlight all occurrences of the actively selected text").addToggle(toggle => {
      toggle.setValue(this.plugin.settings.selectionHighlighter.highlightSelectedText).onChange(value => {
        this.plugin.settings.selectionHighlighter.highlightSelectedText = value;
        this.plugin.saveSettings();
        this.plugin.updateSelectionHighlighter();
      });
    });
    new Setting(containerEl)
      .setName("Highlight delay")
      .setDesc("The delay, in milliseconds, before selection highlights will appear. Must be greater than 200ms.")
      .addText(text => {
        text.inputEl.type = "number";
        text.setValue(String(this.plugin.settings.selectionHighlighter.highlightDelay)).onChange(value => {
          if (parseInt(value) < 200) value = "200";
          if (parseInt(value) >= 0) this.plugin.settings.selectionHighlighter.highlightDelay = parseInt(value);
          this.plugin.saveSettings();
          this.plugin.updateSelectionHighlighter();
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

  private staticHighlightUI(config: StaticHighlightOptions, containerEl: HTMLElement) {
    containerEl.createEl("h3", { text: "Persistent Highlights", }).addClass("persistent-highlights");

    const staticDefineQueryUI = new Setting(containerEl);
    staticDefineQueryUI.setName("Define Common highlighters").setClass("highlighter-definition").setDesc(`In this section you define a unique highlighter name along with the css.        Make sure to click the save button.`);

    const classInput = this.inputUI({ parent: staticDefineQueryUI.controlEl });

    const colorWrapper = staticDefineQueryUI.controlEl.createDiv("color-wrapper");
    let pickrInstance: Pickr = this.colorWrapperEl(colorWrapper, classInput);

    const queryWrapper = staticDefineQueryUI.controlEl.createDiv("query-wrapper");
    const queryInput = this.inputUI({ parent: queryWrapper, placeholder: "search" });

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

    type MarkTypes = Record<markTypes, { description: string; defaultState: boolean; }>;
    type MarkItems = Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent; }>>;
    const buildMarkerTypes = (parentEl: HTMLElement) => {
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
    };
    const marks = buildMarkerTypes(staticDefineQueryUI.controlEl);
    let enabledMarks = Object.entries(marks)
      .map(([type, item]) => item.component.getValue() && type)
      .filter(m => m);

    const { customCSSWrapper, editor } = this.customCSSUI(staticDefineQueryUI);
    this.staticEditor = editor;

    this.saveButtonEl({
      config, parentEl:customCSSWrapper, callbackGettingQuery: () => {
        return {
          class: classInput.inputEl.value.replace(/ /g, "-"),
          color: pickrInstance.getSelectedColor()?.toHEXA().toString() || "",
          regex: queryTypeInput.getValue(),
          query: queryInput.inputEl.value,
          mark: enabledMarks,
          css: this.staticEditor.state.doc.toString(),
        };
        // console.log("class name is :" + aquery.class)
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



  private inputUI({ parent,
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

  private customCSSUI(defineQueryUI: Setting): { customCSSWrapper: HTMLDivElement; editor: EditorView; } {
    const customCSSWrapper = defineQueryUI.controlEl.createDiv("custom-css-wrapper");
    customCSSWrapper.createSpan("setting-item-name").setText("Custom CSS");
    const customCSSEl = new TextAreaComponent(customCSSWrapper);

    const editor = editorFromTextArea(customCSSEl.inputEl, basicSetup);
    customCSSEl.inputEl.addClass("custom-css");
    return { customCSSWrapper, editor };
  }

  private saveButtonEl({ config,  parentEl, callbackGettingQuery }: {
    config: StaticHighlightOptions | FrontmatterHighlightOptions;
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
          this.plugin.updateStaticHighlighter();
          this.plugin.updateCustomCSS();
          this.plugin.updateStyles();
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
    config: StaticHighlightOptions; containerEl: HTMLElement;
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
              this.plugin.updateStaticHighlighter();
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
    config: StaticHighlightOptions): Sortable {
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
