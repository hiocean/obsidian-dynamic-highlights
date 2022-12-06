/*
 * @Author: hiocean
 * @Date: 2022-11-25 10:12:11
 * @LastEditors: hiocean
 * @LastEditTime: 2022-12-06 19:15:34
 * @FilePath: \obsidian-dynamic-highlights\src\settings\settings.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by hiocean, All Rights Reserved. 
 */
import { ToggleComponent } from "obsidian";

import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";

// interface SearchConfig {
//   value: string;
//   type: string;
//   range: { from: number; to: number };
// }

export type TabContentInfo = { content: HTMLElement, heading: HTMLElement, navButton: HTMLElement }

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

export interface BaseHighlightOptions {
  queries: SearchQueries;
  queryOrder: string[];
};


export interface INJSOptions extends BaseHighlightOptions {
  enabled: boolean;
  keyword: string;
};

export interface FrontmatterHighlightOptions extends BaseHighlightOptions {
  togglerIcon: string
  enableToggler: boolean;
  enabled: boolean;
  keyword: string;


};
export interface DynamicHighlightsSettings {
  debug: boolean;
  selectionHighlighter: SelectionHighlightOptions;
  staticHighlighter: BaseHighlightOptions;
  frontmatterHighlighter: FrontmatterHighlightOptions;
  injsOptions: INJSOptions;
}

export const DEFAULT_SETTINGS: DynamicHighlightsSettings = {
  debug: false,
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
    togglerIcon: '🌟',
    enableToggler: false,
    enabled: true,
    keyword: "highlighter",
    queries: {},
    queryOrder: [],
  },
  injsOptions: {
    enabled: true,
    keyword: "injs",
    queries: {},
    queryOrder: []
  }
};

export function setAttributes(element: any, attributes: any) {
  for (let key in attributes) {
    element.setAttribute(key, attributes[key]);
  }
}
export interface CustomCSS {
  css: string;
  enabled: boolean;
}


export type MarkTypes = Record<markTypes, { description: string; defaultState: boolean; }>;
export type MarkItems = Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent; }>>;
