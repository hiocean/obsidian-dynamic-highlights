/*
 * @Author: hiocean
 * @Date: 2022-11-25 10:12:11
 * @LastEditors: hiocean
 * @LastEditTime: 2022-12-12 17:07:30
 * @FilePath: \obsidian-dynamic-highlights\src\settings\settings.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by hiocean, All Rights Reserved. 
 */
import { ToggleComponent } from "obsidian";

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

export interface BasOptions {
  type: OptionTypes;
}
export interface QueriesOptions extends BasOptions {
  queries: SearchQueries;
  queryOrder: string[];
};
export interface INJSOptions extends QueriesOptions {
  enabled: boolean;
  keyword: string;
};
export interface FMOptions extends QueriesOptions {
  togglerIcon: string
  enableToggler: boolean;
  enabled: boolean;
  keyword: string;
};
export interface DynamicHighlightsSettings {
  debug: boolean;
  selectionHighlighter: SelectionHighlightOptions;
  staticHighlighter: QueriesOptions;
  frontmatterHighlighter: FMOptions;
  injsOptions: INJSOptions;
}

export interface SelectionHighlightOptions extends BasOptions {
  /// Determines whether, when nothing is selected, the word around
  /// the cursor is matched instead. Defaults to false.
  highlightWordAroundCursor: boolean;
  highlightSelectedText: boolean;
  /// The minimum length of the selection before it is highlighted.
  /// Defaults to 1 (always highlight non-cursor selections).
  minSelectionLength: number;
  /// The amount of matches (in the viewport) at which to disable
  /// highlighting. Defaults to 100.
  maxMatches: number;
  ignoredWords: string;
  highlightDelay: number;

};

export enum  OptionTypes {
  Selection= "Selection",
  Static= "Static",
  Frontmatter= "Frontmatter",
  Inlinejs="Inline Js"
};


export const DEFAULT_SETTINGS: DynamicHighlightsSettings = {
  debug: false,
  selectionHighlighter: {
    type: OptionTypes.Selection,
    highlightWordAroundCursor: true,
    highlightSelectedText: true,
    maxMatches: 100,
    minSelectionLength: 3,
    highlightDelay: 200,
    ignoredWords: ignoredWords,
  },
  staticHighlighter: {
    type: OptionTypes.Static,
    queries: {},
    queryOrder: [],
  },
  frontmatterHighlighter: {
    type: OptionTypes.Frontmatter,
    togglerIcon: '🌟',
    enableToggler: false,
    enabled: true,
    keyword: "highlighter",
    queries: {},
    queryOrder: [],
  },
  injsOptions: {
    type: OptionTypes.Inlinejs,
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