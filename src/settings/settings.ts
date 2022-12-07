/*
 * @Author: hiocean
 * @Date: 2022-11-25 10:12:11
 * @LastEditors: hiocean
 * @LastEditTime: 2022-12-07 11:35:41
 * @FilePath: \obsidian-dynamic-highlights\src\settings\settings.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by hiocean, All Rights Reserved. 
 */
import { ToggleComponent } from "obsidian";
import { SelectionHighlightOptions } from "../highlighters/selection";
import { ignoredWords } from "./ignoredWords";


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
  type: string;
    queries: SearchQueries;
  queryOrder: string[];
};
export interface INJSOptions extends BaseHighlightOptions {
  enabled: boolean;
  keyword: string;
};
export interface FrontmatterOptions extends BaseHighlightOptions {
  togglerIcon: string
  enableToggler: boolean;
  enabled: boolean;
  keyword: string;
};
export interface DynamicHighlightsSettings {
  debug: boolean;
  selectionHighlighter: SelectionHighlightOptions;
  staticHighlighter: BaseHighlightOptions;
  frontmatterHighlighter: FrontmatterOptions;
  injsOptions: INJSOptions;
}

export const DEFAULT_SETTINGS: DynamicHighlightsSettings = {
  debug: false,
  selectionHighlighter: {
    // type: "selection",
    highlightWordAroundCursor: true,
    highlightSelectedText: true,
    maxMatches: 100,
    minSelectionLength: 3,
    highlightDelay: 200,
    ignoredWords: ignoredWords,
  },
  staticHighlighter: {
    type:"static",
    queries: {},
    queryOrder: [],
  },
  frontmatterHighlighter: {
    type:"fm",
    togglerIcon: '🌟',
    enableToggler: false,
    enabled: true,
    keyword: "highlighter",
    queries: {},
    queryOrder: [],
  },
  injsOptions: {
    type:"injs",
    enabled: true,
    keyword: "injs",
    queries: {},
    queryOrder: []
  }
};


export interface CustomCSS {
  css: string;
  enabled: boolean;
}

export type MarkTypes = Record<markTypes, { description: string; defaultState: boolean; }>;
export type MarkItems = Partial<Record<markTypes, { element: HTMLElement; component: ToggleComponent; }>>;
export type markTypes = "line" | "match" | "group" | "start" | "end";

export type TabContentInfo = { content: HTMLElement, heading: HTMLElement, navButton: HTMLElement }

export type SettingValue = number | string | boolean;
export interface CSSSettings {
  [key: string]: SettingValue;
}