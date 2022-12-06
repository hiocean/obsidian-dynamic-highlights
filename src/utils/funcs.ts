/*
 * @Author: hiocean
 * @Date: 2022-12-06 16:51:04
 * @LastEditors: hiocean
 * @LastEditTime: 2022-12-06 16:51:15
 * @FilePath: \obsidian-dynamic-highlights\src\utils\funcs.ts
 * @Description: 
 * 
 * Copyright (c) 2022 by hiocean, All Rights Reserved. 
 */
export function debugPrint({ arg, debug = false }: { arg: any; debug?: boolean; }): void {
    if (debug) {
      console.log(arg)
    }
  }
  