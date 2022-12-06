/*
 * @Author: hiocean
 * @Date: 2022-11-25 10:12:11
 * @LastEditors: hiocean
 * @LastEditTime: 2022-12-06 14:22:18
 * @FilePath: \obsidian-dynamic-highlights\src\icons\customIcons.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by hiocean, All Rights Reserved. 
 */
import { addIcon } from "obsidian";

const icons: Record<string, string> = {
  "save": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21h14a2 2 0 0 0 2-2V8a1 1 0 0 0-.29-.71l-4-4A1 1 0 0 0 16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2zm10-2H9v-5h6zM13 7h-2V5h2zM5 5h2v4h8V5h.59L19 8.41V19h-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5H5z" fill="currentColor"/></svg>`,
  'dyht': '<svg fill="currentColor"  viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12C0 5.372 5.373 0 12 0c6.628 0 12 5.372 12 12m-9.633 1.626a.81.815 0 0 0-.799.965c.071.393.44.662.84.662h1.257l.729-.102c-1.166 1.71-3.19 2.498-5.405 2.15-1.802-.282-3.35-1.502-4.003-3.205-1.483-3.865 1.34-7.556 5.02-7.556 1.916 0 3.598 1.122 4.562 2.478.277.39.763.504 1.133.248a.795.8 0 0 0 .236-1.069h.006a7.04 7.04 0 0 0-6.425-3.233c-3.508.236-6.347 3.107-6.55 6.617-.233 4.086 3.007 7.421 7.037 7.421a6.976 6.976 0 0 0 5.304-2.413l-.153.855v.773c0 .4.269.77.662.84a.814.814 0 0 0 .964-.8v-4.63h-4.415"/></svg>'
};

		
export default function addIcons() {
  Object.keys(icons).forEach(key => {
    addIcon(key, icons[key]);
  });
}
