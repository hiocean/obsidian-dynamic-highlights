// originally from: https://github.com/codemirror/search/blob/main/src/selection-match.ts
import { SearchCursor } from "@codemirror/search";
import { combineConfig, Extension, Facet, Range } from "@codemirror/state";
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { cloneDeep } from "lodash";
import type { RegExpExecArray } from "regexp-match-indices/types";
import DynamicHighlightsPlugin from "src/main";
import { QueriesOptions, OptionTypes } from "src/settings/settings";
import { StyleSpec } from "style-mod";
import { RegExpCursor } from "./regexp-cursor";
import { getDVAPI, limitedEval } from "src/utils/funcs";
import { App } from "obsidian";



export class inlineJsWidget extends WidgetType {
  private el: HTMLElement;
  constructor(
    private name: string,
    private text: string,
    private thisline: string,
    private app: App
  ) {
    super();
    this.text = text;
    this.name = name;
    this.thisline = thisline;
    this.app=app
  }
  toDOM(): HTMLElement {
    const el = document.createElement("span");
    const res = limitedEval({
      formular: this.text,
      localVariables: { thisline: this.thisline, dv: getDVAPI(this.app) }
    });

    el.innerText = res
    // el.setAttribute("data-thisline", this.thisline);
    // el.setAttribute("data-result", res);
    // el.setAttribute("class", "injs");
    // el.setAttribute("contenteditable", "true");
    // el.setAttribute("data-clipboard-text", res);
    // el.setAttribute("data-name", this.name);
    // el.setAttribute("data-replacedLine", this.thisline.replace(this.name,res) );

    el.addEventListener("mouseenter", () => { el.innerText = this.name });
    el.addEventListener("mouseleave", () => { el.innerText = res; });
    // el.addEventListener("copy", (event) => { el.innerText = res; });
    this.el = el
    return this.el;
  }
  ignoreEvent() {
    return true;
  }
}

const defaultOptions: QueriesOptions = {
  queries: {},
  queryOrder: [],
  type: OptionTypes.Selection
};

export const staticHighlightConfig = Facet.define<QueriesOptions, Required<QueriesOptions>>({
  combine(options: readonly QueriesOptions[]) {
    return combineConfig(options, defaultOptions, {
      queries: (a, b) => a || b,
      queryOrder: (a, b) => a || b,
    });
  },
});

export function staticHighlighterExtension(plugin: DynamicHighlightsPlugin): Extension {

  const injskw = plugin.settings.injsOptions.keyword;
  const staticHighlighter = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      lineDecorations: DecorationSet;
      groupDecorations: DecorationSet;
      widgetDecorations: DecorationSet;

      constructor(view: EditorView) {
        let { token, line, group, widget } = this.getDeco(view);
        this.decorations = token;
        this.lineDecorations = line;
        this.groupDecorations = group;
        this.widgetDecorations = widget;
      }

      update(update: ViewUpdate) {
        let reconfigured = update.startState.facet(staticHighlightConfig) !== update.state.facet(staticHighlightConfig);
        if (update.docChanged || update.viewportChanged || reconfigured) {
          let { token, line, group, widget } = this.getDeco(update.view);
          this.decorations = token;
          this.lineDecorations = line;
          this.groupDecorations = group;
          this.widgetDecorations = widget;
        }
      }

      getDeco(view: EditorView): {
        line: DecorationSet;
        token: DecorationSet;
        group: DecorationSet;
        widget: DecorationSet;
      } {
        let { state } = view,
          tokenDecos: Range<Decoration>[] = [],
          lineDecos: Range<Decoration>[] = [],
          groupDecos: Range<Decoration>[] = [],
          widgetDecos: Range<Decoration>[] = [],
          lineClasses: { [key: number]: string[] } = {},
          queries = Object.values(view.state.facet(staticHighlightConfig).queries);
        for (let part of view.visibleRanges) {
          for (let query of queries) {
            let cursor: RegExpCursor | SearchCursor;
            try {
              if (query.regex) cursor = new RegExpCursor(state.doc, query.query, {}, part.from, part.to);
              else cursor = new SearchCursor(state.doc, query.query, part.from, part.to);
            } catch (err) {
              console.debug(err);
              continue;
            }
            while (!cursor.next().done) {
              let { from, to } = cursor.value;
              let cursorString = state.sliceDoc(from, to).trim();

              const currentLine = view.state.doc.lineAt(from);
              const linePos = currentLine?.from;
              let syntaxNode = syntaxTree(view.state).resolveInner(linePos + 1),
                nodeProps = syntaxNode.type.prop(tokenClassNodeProp),
                excludedSection = ["hmd-codeblock", "hmd-frontmatter"].find(token =>
                  nodeProps?.split(" ").includes(token)
                );
              if (excludedSection) continue;
              if (query.mark?.contains("line")) {
                if (!lineClasses[linePos]) lineClasses[linePos] = [];
                lineClasses[linePos].push(query.class);
              }
              if (!query.mark || query.mark?.contains("match")) {
                let markDeco;
                const q = query.query.trim().replace('`', "")
                if (q.startsWith(injskw)) {
                  const thisline = currentLine.text
                  markDeco = Decoration.replace({
                    widget: new inlineJsWidget(query.query.trim(), query.css!, thisline, plugin.app),
                    inclusive: false,
                    block: false,
                  })
                } else {
                  markDeco = Decoration.mark({ class: query.class, attributes: { "data-contents": cursorString } });
                }
                tokenDecos.push(markDeco.range(from, to));

              }
              if (query.mark?.contains("start") || query.mark?.contains("end")) {
                let startDeco = Decoration.widget({ widget: new IconWidget(query.class + "-start") });
                let endDeco = Decoration.widget({ widget: new IconWidget(query.class + "-end") });
                if (query.mark?.contains("start")) widgetDecos.push(startDeco.range(from, from));
                if (query.mark?.contains("end")) widgetDecos.push(endDeco.range(to, to));

              }
              if (query.mark?.contains("group")) {
                let groups;
                if (cursor instanceof RegExpCursor) {
                  let match = cursor.value?.match as RegExpExecArray;
                  groups = match.indices?.groups;
                }
                groups &&
                  Object.entries(groups).forEach(group => {
                    try {
                      let [groupName, [groupFrom, groupTo]] = group;
                      const groupDeco = Decoration.mark({ class: groupName });
                      groupDecos.push(groupDeco.range(linePos + groupFrom, linePos + groupTo));
                    } catch (err) {
                      console.debug(err);
                    }
                  });
              }
            }
          }
        }
        Object.entries(lineClasses).forEach(([pos, classes]) => {
          // we use the long form attributes: {class: ... } to avoid a CM6 bug with class:
          // the issue was fixed in obs 0.13.20 but we'll leave it like this until the
          // next public release
          // pos = ; // since Object.entries returns keys as strings
          const lineDeco = Decoration.line({ attributes: { class: classes.join(" ") } });
          lineDecos.push(lineDeco.range(parseInt(pos)));

        });
        return {
          line: Decoration.set(lineDecos.sort((a, b) => a.from - b.from)),
          token: Decoration.set(tokenDecos.sort((a, b) => a.from - b.from)),
          group: Decoration.set(groupDecos.sort((a, b) => a.from - b.from)),
          widget: Decoration.set(widgetDecos.sort((a, b) => a.from - b.from)),
        };
      }
    },
    {
      provide: plugin => [
        // these are separated out so that we can set decoration priority
        // it's also much easier to sort the decorations when they're grouped
        EditorView.decorations.of(v => v.plugin(plugin)?.lineDecorations || Decoration.none),
        EditorView.decorations.of(v => v.plugin(plugin)?.groupDecorations || Decoration.none),
        EditorView.decorations.of(v => v.plugin(plugin)?.decorations || Decoration.none),
        EditorView.decorations.of(v => v.plugin(plugin)?.widgetDecorations || Decoration.none),
      ],
    }
  );
  let ext: Extension[] = [staticHighlighter];
  let options = plugin.settings.staticHighlighter;
  ext.push(staticHighlightConfig.of(cloneDeep(options)));
  return ext;
}

export interface Styles {
  [selector: string]: StyleSpec;
}

export function buildStyles(plugin: DynamicHighlightsPlugin) {
  let queries = Object.values(plugin.settings.staticHighlighter.queries);
  let styles: Styles = {};
  for (let query of queries) {
    let className = "." + query.class;
    if (!query.color) continue;
    styles[className] = { backgroundColor: query.color };
  }
  let theme = EditorView.theme(styles);
  return theme;
}

class IconWidget extends WidgetType {
  className: string | undefined;

  constructor(className?: string) {
    super();
    this.className = className;
  }

  toDOM() {
    let headerEl = document.createElement("span");
    this.className && headerEl.addClass(this.className);
    return headerEl;
  }

  ignoreEvent() {
    return true;
  }
}


