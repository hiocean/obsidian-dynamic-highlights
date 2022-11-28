/*
 * @Author: hiocean
 * @Date: 2022-11-25 10:12:11
 * @LastEditors: hiocean
 * @LastEditTime: 2022-11-28 12:24:30
 * @FilePath: \obsidian-dynamic-highlights\src\settings\settings.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by hiocean, All Rights Reserved. 
 */
import { ToggleComponent } from "obsidian";
import { StaticHighlightOptions } from "src/highlighters/static";
import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";

interface SearchConfig {
  value: string;
  type: string;
  range: { from: number; to: number };
}
export type markTypes = "line" | "match" | "group" | "start" | "end";

export type SettingValue = number | string | boolean;
export interface CSSSettings {
  [key: string]: SettingValue;
}

export interface SearchQuery {
  query: string;
  class: string;
  color: string | null;
  regex: boolean;
  mark?: markTypes[];
  css?: string;
  enabled?: boolean;
}
export interface SearchQueries {
  [key: string]: SearchQuery;
}

export type HighlighterOptions = SelectionHighlightOptions | StaticHighlightOptions;
// export type ConfigHighlighterOptions = FrontmatterHighlightOptions | StaticHighlightOptions;


export type FrontmatterHighlightOptions = {

  enableFrontmatterHighlight: boolean;
  frontmatterHighlightKeywords: string;
  queries: SearchQueries;
  queryOrder: string[];
  
};
export interface DynamicHighlightsSettings {
  selectionHighlighter: SelectionHighlightOptions;
  staticHighlighter: StaticHighlightOptions;
  frontmatterHighlighter:FrontmatterHighlightOptions;
}

export const DEFAULT_SETTINGS: DynamicHighlightsSettings = {
  selectionHighlighter: {
    highlightWordAroundCursor: true,
    highlightSelectedText: true,
    maxMatches: 100,
    minSelectionLength: 3,
    highlightDelay: 200,
    ignoredWords: ignoredWords,
  },
  staticHighlighter: {
    queries: {},
    queryOrder: [],
  },
  frontmatterHighlighter: {
    enableFrontmatterHighlight: true,
    frontmatterHighlightKeywords: "highlighter",
    queries: {},
    queryOrder: [],
  }
};

export function setAttributes(element: any, attributes: any) {
  for (let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}


export type MarkTypes = Record<markTypes, { description: string; defaultState: boolean; }>;
export type MarkItems = Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent; }>>;
export function buildMarkerTypes(parentEl: HTMLElement): Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent; }>> {
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