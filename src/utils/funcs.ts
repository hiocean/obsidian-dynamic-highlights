/*
 * @Author: hiocean
 * @Date: 2022-12-06 16:51:04
 * @LastEditors: hiocean
 * @LastEditTime: 2022-12-12 12:43:53
 * @FilePath: \obsidian-dynamic-highlights\src\utils\funcs.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by hiocean, All Rights Reserved. 
 */
import { App } from "obsidian";

export function debugPrint({ arg, debug = false }: { arg: any; debug?: boolean; }): void {
    if (debug) {
        console.log(arg)
    }
}

export function limitedEval({ formular, localVariables = {} }: { formular: string; localVariables?: {}; }): any {
    try {
        return new Function(...Object.keys(localVariables), "" + formular)(...Object.values(localVariables));
    }
    catch (e) {
        return e
    }
}

export function setAttributes(element: any, attributes: any) {
    for (let key in attributes) {
      element.setAttribute(key, attributes[key]);
    }
}
  
export const getDVAPI = (app?: App) => {
    if (app?.plugins.enabledPlugins.has("dataview")) {
        return app.plugins.plugins.dataview?.api;
    } else {
        return ()=>{return "Dataview is not found!"}
    }
    // return app.plugins.plugins.dataview?.api || window.DataviewAPI || function (){return "Dataview is not found!"}
    // if (app) 
    // else return window.DataviewAPI;
};