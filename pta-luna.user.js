// ==UserScript==
// @name         PTA 双模式答题助手
// @namespace    pta-dual-mode-local
// @version      0.11.1
// @description  ChatGPT 订阅手动选模型和推理强度 / DeepSeek；保留题图、填空、双模式提交和桌宠。
// @match        https://pintia.cn/problem-sets/*
// @run-at       document-idle
// @noframes
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_openInTab
// @connect      api.deepseek.com
// @connect      127.0.0.1
// @connect      pintia.cn
// @connect      *.pintia.cn
// @connect      ptausercontent.com
// @connect      *.ptausercontent.com
// ==/UserScript==

/* Fast batch flow adapted from https://github.com/lmengx/fuckpta
MIT License

Copyright (c) 2026 lmx

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

(() => {
'use strict';
GM_addStyle("#pta-direct-submit {\n  --paper:#faf9f5;--ink:#302e2a;--muted:#827d73;--line:#e5e1d8;--accent:#b86648;\n  position:fixed;right:24px;bottom:24px;z-index:2147483647;width:352px;max-width:calc(100vw - 24px);\n  color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:18px;\n  box-shadow:0 12px 48px #30282018,0 2px 8px #30282008;font:13px/1.55 'Segoe UI','Microsoft YaHei',sans-serif;\n  overflow:hidden;text-align:left;color-scheme:light;animation:pta-appear .18s ease-out;\n}\n#pta-direct-submit * {box-sizing:border-box;}\n#pta-direct-submit button,#pta-direct-submit textarea {font:inherit;}\n#pta-direct-submit button {cursor:pointer;transition:background .15s,border-color .15s;}\n#pta-direct-submit button:disabled {opacity:.55;cursor:wait;}\n#pta-direct-submit :focus-visible {outline:2px solid var(--accent);outline-offset:3px;}\n#pta-direct-submit .pta-head {display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line);}\n#pta-direct-submit .pta-mark {display:grid;place-items:center;width:30px;height:30px;background:#eee2d7;border-radius:10px;color:var(--accent);font:24px Georgia,serif;}\n#pta-direct-submit .pta-heading {flex:1;}\n#pta-direct-submit .pta-heading strong {display:block;font:600 17px/1.3 Georgia,'Songti SC',SimSun,serif;letter-spacing:.2px;}\n#pta-direct-submit .pta-heading small {display:block;margin-top:2px;color:var(--muted);font-size:10px;letter-spacing:1px;}\n#pta-direct-submit .pta-fold {display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:7px;color:var(--muted);background:transparent;font-size:20px;}\n#pta-direct-submit .pta-fold:hover {background:#eeece5;}\n#pta-direct-submit .pta-body {padding:17px 18px 16px;max-height:calc(100vh - 150px);overflow-y:auto;}\n#pta-direct-submit .pta-info {color:var(--muted);font-size:11px;margin-bottom:14px;overflow-wrap:anywhere;}\n#pta-direct-submit .pta-label {color:var(--muted);font-size:11px;margin:0 0 7px;}\n#pta-direct-submit .pta-modes {display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:11px;background:#eeece5;margin-bottom:9px;}\n#pta-direct-submit .pta-mode {border:1px solid transparent;background:transparent;padding:8px 4px;border-radius:8px;color:#746f65;font-size:12px;}\n#pta-direct-submit .pta-mode[aria-pressed=true] {background:#fffefa;border-color:#e4dfd4;color:var(--ink);box-shadow:0 1px 3px #3028200b;}\n#pta-direct-submit .pta-description {font-size:11px;color:var(--muted);min-height:34px;margin-bottom:13px;}\n#pta-direct-submit .pta-primary {width:100%;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--accent);border-radius:10px;background:var(--accent);color:#fffaf5;padding:11px 13px;font-weight:600;}\n#pta-direct-submit .pta-primary:hover {background:#a85a3e;border-color:#a85a3e;}\n#pta-direct-submit .pta-details {margin-top:14px;border-top:1px solid var(--line);padding-top:12px;}\n#pta-direct-submit summary {cursor:pointer;color:#726b60;font-size:11px;user-select:none;}\n#pta-direct-submit textarea {display:block;resize:vertical;width:100%;min-height:130px;max-height:280px;margin:10px 0 8px;border:1px solid var(--line);border-radius:8px;padding:10px;background:#fffefa;color:var(--ink);font:11px/1.6 Consolas,monospace;tab-size:4;}\n#pta-direct-submit .pta-tools {display:flex;gap:6px;flex-wrap:wrap;}\n#pta-direct-submit .pta-secondary {border:1px solid var(--line);border-radius:7px;background:transparent;color:#6e665b;font-size:11px;padding:6px 9px;}\n#pta-direct-submit .pta-secondary:hover {background:#eeece5;}\n#pta-direct-submit .pta-status {font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere;color:#756d61;margin-top:12px;}\n#pta-direct-submit .pta-status:empty {display:none;}\n#pta-direct-submit .pta-result {display:inline-block;margin-top:8px;font-size:11px;color:var(--accent);text-decoration:underline;text-underline-offset:3px;}\n#pta-direct-submit .pta-footer {display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-top:1px solid var(--line);font-size:10px;color:#928a7d;}\n#pta-direct-submit .pta-live {display:flex;align-items:center;gap:5px;}\n#pta-direct-submit .pta-live::before {content:'';width:5px;height:5px;background:#84917a;border-radius:50%;}\n#pta-direct-submit .pta-check {display:flex;gap:7px;align-items:center;color:#766e62;font-size:11px;margin:12px 0;}\n#pta-direct-submit input[type=checkbox] {accent-color:var(--accent);}\n#pta-direct-submit.pta-collapsed {width:210px;}\n#pta-direct-submit.pta-collapsed .pta-body,#pta-direct-submit.pta-collapsed .pta-footer {display:none;}\n#pta-direct-submit.pta-collapsed .pta-head {border-bottom:0;padding:12px;}\n@keyframes pta-appear {from {opacity:0;transform:translateY(6px)}to {opacity:1;transform:translateY(0)}}\n@media(max-width:480px) {#pta-direct-submit {right:12px;bottom:12px;}}\n@media(prefers-reduced-motion:reduce) {#pta-direct-submit,#pta-direct-submit * {animation:none;transition:none;}}\n\n/* ScriptCat desktop-pet shell */\n#pta-direct-submit:has(.pta-window) {background:transparent;border:0;box-shadow:none;overflow:visible;}\n#pta-direct-submit .pta-window {background:var(--paper);border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 48px #30282018,0 2px 8px #30282008;overflow:hidden;margin-bottom:8px;}\n#pta-direct-submit .pta-crab {background:none;width:36px;height:36px;}\n#pta-direct-submit svg {width:100%;height:100%;display:block;image-rendering:pixelated;}\n#pta-direct-submit .pta-launcher {display:flex;align-items:center;gap:7px;width:116px;height:64px;margin-left:auto;padding:5px 8px;border:0;border-radius:14px;color:#817264;background:transparent;filter:drop-shadow(0 3px 1px #39231518);}\n#pta-direct-submit .pta-launcher svg {width:58px;height:50px;flex-shrink:0;transition:transform .18s;}\n#pta-direct-submit .pta-launcher span {font-size:10px;line-height:1.4;text-align:left;}\n#pta-direct-submit .pta-launcher:hover svg {transform:translateY(-4px);}\n#pta-direct-submit.pta-pet-only .pta-window {display:none;}\n#pta-direct-submit.pta-pet-only {width:116px;}\n#pta-direct-submit .pta-all {width:100%;margin-top:8px;padding:10px;font-size:12px;border-radius:9px;}\n#pta-direct-submit .pta-job-progress {white-space:pre-wrap;font-size:11px;color:#796d5f;margin:12px 0;}\n#pta-direct-submit .pta-job-progress:empty {display:none;}\n#pta-direct-submit [hidden] {display:none!important;}\n#pta-direct-submit .pta-head {cursor:grab;touch-action:none;user-select:none;}\n#pta-direct-submit .pta-launcher {cursor:grab;touch-action:none;user-select:none;}\n#pta-direct-submit.pta-dragging .pta-launcher,#pta-direct-submit.pta-dragging .pta-head {cursor:grabbing;}\n#pta-direct-submit .pta-launcher svg>path {transform:translateX(var(--look-x,0px));}\n#pta-direct-submit .pta-pet-bubble {position:absolute;right:4px;bottom:62px;width:max-content;max-width:min(280px,calc(100vw - 40px));border:1px solid var(--line);border-radius:11px 11px 3px 11px;background:var(--paper);padding:10px 12px;font-size:12px;line-height:1.65;white-space:normal;overflow-wrap:anywhere;box-shadow:0 3px 10px #30282010;opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .15s,transform .15s;}\n#pta-direct-submit .pta-pet-bubble.pta-bubble-visible {opacity:1;transform:translateY(0);}\n#pta-direct-submit .pta-launcher svg {animation:pta-breathe 4s ease-in-out infinite;transform-origin:50% 85%;}\n#pta-direct-submit .pta-launcher svg>path {animation:pta-blink 6s infinite;transform-origin:50% 45%;}\n#pta-direct-submit[data-pet-mood=happy] .pta-launcher svg {animation:pta-hop .7s ease;}\n#pta-direct-submit[data-pet-mood=wave] .pta-launcher svg {animation:pta-wave .7s ease;}\n#pta-direct-submit[data-pet-mood=grab] .pta-launcher svg {animation:none;transform:rotate(-9deg);}\n@keyframes pta-breathe {0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}\n@keyframes pta-blink {0%,44%,48%,100%{scale:1 1}46%{scale:1 .1}}\n@keyframes pta-hop {0%,100%{transform:translateY(0)}30%{transform:translateY(-10px) rotate(-5deg)}65%{transform:translateY(-3px) rotate(4deg)}}\n@keyframes pta-wave {0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)}75%{transform:rotate(7deg)}}\n@media(prefers-reduced-motion:reduce) {#pta-direct-submit .pta-launcher svg,#pta-direct-submit .pta-launcher svg>path {animation:none;transition:none;}}\n\n/* Stable, resizable shell. Only the pet's artwork animates. */\n#pta-direct-submit {width:var(--panel-width,360px);animation:none;}\n#pta-direct-submit .pta-window {position:relative;display:flex;flex-direction:column;height:var(--panel-height,590px);max-height:calc(100vh - 96px);}\n#pta-direct-submit .pta-head,#pta-direct-submit .pta-footer {flex-shrink:0;}\n#pta-direct-submit .pta-body {flex:1;min-height:0;max-height:none;overflow-y:auto;scrollbar-gutter:stable;}\n#pta-direct-submit .pta-info {height:32px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}\n#pta-direct-submit .pta-description {height:34px;overflow:hidden;}\n#pta-direct-submit .pta-job-progress {height:38px;line-height:19px;margin:10px 0 6px;font-variant-numeric:tabular-nums;}\n#pta-direct-submit .pta-job-progress:empty {display:block;}\n#pta-direct-submit .pta-status {height:32px;line-height:16px;overflow:auto;margin-top:10px;}\n#pta-direct-submit .pta-status:empty {display:block;}\n#pta-direct-submit .pta-results {margin:0 0 10px;border-bottom:1px solid var(--line);padding-bottom:8px;}\n#pta-direct-submit .pta-results-toggle {display:block;width:100%;text-align:left;border:0;background:none;padding:4px 0 7px;color:var(--muted);font-size:11px;}\n#pta-direct-submit .pta-result-rows {height:66px;overflow:auto;overscroll-behavior:contain;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:#d3cabd transparent;}\n#pta-direct-submit .pta-results-expanded .pta-result-rows {height:198px;}\n#pta-direct-submit .pta-result-row {display:flex;gap:7px;align-items:center;height:22px;font-size:11px;color:#796d5f;white-space:nowrap;}\n#pta-direct-submit .pta-result-name {overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;}\n#pta-direct-submit .pta-result-value {max-width:95px;overflow:hidden;text-overflow:ellipsis;color:#64745c;font-size:10px;}\n#pta-direct-submit .pta-result-time {width:42px;text-align:right;flex-shrink:0;color:#9a8a78;font-variant-numeric:tabular-nums;}\n#pta-direct-submit .pta-footer {position:relative;}\n#pta-direct-submit .pta-size summary {font-size:10px;}\n#pta-direct-submit .pta-size-controls {position:absolute;right:10px;bottom:38px;display:flex;align-items:end;gap:7px;background:var(--paper);border:1px solid var(--line);box-shadow:0 3px 15px #30282015;border-radius:10px;padding:10px;}\n#pta-direct-submit .pta-size-controls label {font-size:10px;}\n#pta-direct-submit .pta-size-controls input {display:block;width:68px;margin-top:4px;padding:5px;border:1px solid var(--line);border-radius:5px;background:#fffefa;color:var(--ink);font-size:12px;}\n#pta-direct-submit .pta-size-reset {padding:5px;border:0;background:#eeece5;color:var(--muted);border-radius:5px;font-size:10px;}\n#pta-direct-submit .pta-resize-handle {position:absolute;left:1px;bottom:1px;width:20px;height:20px;padding:0;border:0;color:#b3a593;background:none;cursor:nesw-resize;touch-action:none;font-size:17px;}\n#pta-direct-submit.pta-resizing {user-select:none;}\n#pta-direct-submit:not(.pta-pet-only) .pta-launcher svg {animation:none;}\n#pta-direct-submit .pta-launcher svg>path {transform:translate(var(--look-x,0px),var(--look-y,0px));}\n#pta-direct-submit[data-pet-mood=snack] .pta-launcher svg {animation:pta-nibble .65s ease;}\n#pta-direct-submit[data-pet-resting=true] .pta-launcher svg>path {animation:none;scale:1 .15;}\n#pta-direct-submit .pta-pet-menu {position:absolute;right:0;bottom:67px;display:grid;grid-template-columns:1fr 1fr;gap:4px;min-width:180px;padding:8px;background:var(--paper);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px #30282018;}\n#pta-direct-submit .pta-pet-menu button {padding:8px;border:0;border-radius:7px;background:transparent;color:#796d5f;font-size:11px;}\n#pta-direct-submit .pta-pet-menu button:hover {background:#eee2d7;color:#a85a3e;}\n@keyframes pta-nibble {0%,100%{transform:scale(1)}25%,65%{transform:scale(1.06,.94)}45%,85%{transform:scale(.98,1.02)}}\n@media(prefers-reduced-motion:reduce) {#pta-direct-submit[data-pet-mood] .pta-launcher svg {animation:none;}}\n@media(prefers-reduced-motion:reduce) {#pta-direct-submit .pta-result-rows {scroll-behavior:auto;}}\n");
let sessionKey = '';
const deepSeekRequests = new Set();
function cancelDeepSeekRequests() {
  for (const request of deepSeekRequests) { try { request.abort(); } catch {} }
  deepSeekRequests.clear();
}
const questionImageCache = new Map();
async function questionImageInfo(blob) {
  if (!blob?.size || blob.size > 8 * 1024 * 1024) throw new Error('题图为空或超过 8 MiB，已停止，未省略图片');
  const bytes = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
  const head = String.fromCharCode(...bytes);
  const text = (await blob.slice(0, 1024).text()).replace(/^\uFEFF/, '').trimStart();
  const declared = String(blob.type || '').split(';')[0].toLowerCase();
  const binaryMime = bytes[0] === 137 && head.slice(1, 4) === 'PNG' ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg'
    : /^GIF8[79]a/.test(head) ? 'image/gif'
    : head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP' ? 'image/webp' : '';
  if (!binaryMime && (/^text\/html$/.test(declared) || /^(?:<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>])/i.test(text))) throw new Error(`图片地址返回了 HTML 网页（${declared || '无 Content-Type'}），没有取得图片内容`);
  if (!binaryMime && (/json/.test(declared) || /^(?:\{|\[)/.test(text))) throw new Error(`图片地址返回了 JSON 数据（${declared || '无 Content-Type'}），没有取得图片内容`);
  if (!binaryMime && /<(?:Error|ErrorResponse)[\s>]/i.test(text)) throw new Error('图片地址返回了 XML 错误响应，没有取得图片内容');
  const mime = binaryMime || (/<svg[\s>]/i.test(text) ? 'image/svg+xml'
    : head.startsWith('BM') ? 'image/bmp'
    : head.slice(4, 8) === 'ftyp' && /avif|avis/.test(head.slice(8)) ? 'image/avif'
    : bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0 ? 'image/x-icon'
    : declared.startsWith('image/') ? declared : 'application/octet-stream');
  return { mime, convert: !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime) };
}
async function prepareQuestionImages(sources, shouldStop = () => false) {
  const check = () => { if (shouldStop()) throw new Error('题图读取已停止'); };
  if (sources.length > 32) throw Object.assign(new Error('本题图片超过 32 张，已停止，避免遗漏附图'), { imageError: true });
  const images = [];
  let total = 0;
  let currentSource = '', currentType = '', currentSize = 0;
  try {
    for (const source of sources) {
      currentSource = source; currentType = ''; currentSize = 0;
      check();
      let image = questionImageCache.get(source);
      if (!image) {
        const url = new URL(source, location.href);
        if (!['https:', 'http:', 'data:'].includes(url.protocol) || url.username || url.password || /^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname)) throw new Error('题图地址不受支持');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        deepSeekRequests.add(controller);
        let blob;
        try {
          const response = await fetch(url.href, { signal: controller.signal, credentials: url.origin === location.origin ? 'include' : 'omit', referrerPolicy: 'strict-origin-when-cross-origin' });
          if (!response.ok) throw new Error('题图 HTTP ' + response.status);
          blob = await response.blob();
          await questionImageInfo(blob);
        } catch (error) {
          check();
          if (!/(?:^|\.)(?:pintia\.cn|ptausercontent\.com)$/i.test(url.hostname)) throw error;
          blob = await new Promise((resolve, reject) => {
            let request, settled = false;
            const finish = callback => value => { settled = true; if (request) deepSeekRequests.delete(request); callback(value); };
            request = GM_xmlhttpRequest({ method: 'GET', url: url.href, responseType: 'arraybuffer', anonymous: url.origin !== location.origin, headers: { Referer: location.origin + '/' }, timeout: 20000,
              onload: finish(response => {
                if (response.status < 200 || response.status >= 300) { reject(new Error('题图 HTTP ' + response.status)); return; }
                const type = response.responseHeaders?.match(/^content-type:\s*([^\r\n;]+)/im)?.[1] || '';
                resolve(new Blob([response.response], { type }));
              }),
              onerror: finish(() => reject(new Error('题图读取失败，请检查脚本猫的图片域名权限'))),
              ontimeout: finish(() => reject(new Error('题图读取超时'))),
              onabort: finish(() => reject(new Error('题图读取已停止'))) });
            if (!settled && request) deepSeekRequests.add(request);
          });
        } finally { clearTimeout(timer); deepSeekRequests.delete(controller); }
        check();
        currentType = blob?.type || '无 Content-Type'; currentSize = blob?.size || 0;
        const info = await questionImageInfo(blob);
        const mime = info.mime;
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('题图编码失败')); reader.readAsDataURL(blob.slice(0, blob.size, mime));
        });
        image = await new Promise((resolve, reject) => {
          const element = new Image();
          const timer = setTimeout(() => { element.src = ''; reject(new Error('题图解码超时')); }, 10000);
          element.onerror = () => { clearTimeout(timer); reject(new Error(`浏览器无法解码题图（类型 ${currentType}，识别为 ${mime}，${currentSize} 字节），未发送给 AI`)); };
          element.onload = () => {
            clearTimeout(timer);
            if (element.naturalWidth > 8192 || element.naturalHeight > 8192 || element.naturalWidth * element.naturalHeight > 32000000) { reject(new Error('题图尺寸过大，已停止，未省略图片')); return; }
            if (!info.convert) { resolve(dataUrl); return; }
            try {
              const canvas = document.createElement('canvas'); canvas.width = element.naturalWidth; canvas.height = element.naturalHeight;
              canvas.getContext('2d').drawImage(element, 0, 0); resolve(canvas.toDataURL('image/png'));
            } catch { reject(new Error('题图转换为 PNG 失败，已停止')); }
          };
          element.src = dataUrl;
        });
        check();
        questionImageCache.set(source, image);
        while (questionImageCache.size > 12 || [...questionImageCache.values()].reduce((n, value) => n + value.length, 0) > 16 * 1024 * 1024) questionImageCache.delete(questionImageCache.keys().next().value);
      }
      total += image.length;
      if (total > 28 * 1024 * 1024) throw new Error('本题图片总量过大，已停止，未省略图片');
      images.push(image);
    }
    return images;
  } catch (error) {
    error.imageError = true;
    let label = '内嵌图片';
    try { const url = new URL(currentSource, location.href); if (url.protocol !== 'data:') label = decodeURIComponent(url.pathname.split('/').pop() || url.hostname).slice(0, 90); } catch {}
    error.message = `题图 ${images.length + 1}（${label}）：${error.message}`;
    GM_setValue('lastImageReadError', { file: label, contentType: currentType, size: currentSize, message: error.message });
    throw error;
  }
}
// Remove only obsolete browser-side credentials; never import Codex login files.
GM_deleteValue(['codex','Bridge','Token'].join(''));
GM_deleteValue('aiProvider');
const tabReady = new Promise(resolve => {
  const timer = setTimeout(resolve, 2000);
  GM_getTab(data => { sessionKey = data?.deepseekKey || ''; clearTimeout(timer); resolve(); });
});

function configureLegacyDeepSeek() {
  if (document.getElementById('pta-deepseek-settings')) return;
  const host = document.createElement('div');
  host.id = 'pta-deepseek-settings';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>
    :host{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#302e2a50;font:13px/1.6 'Segoe UI','Microsoft YaHei',sans-serif;color:#302e2a}
    *{box-sizing:border-box}.card{width:340px;max-width:calc(100vw - 32px);padding:24px;background:#faf9f5;border:1px solid #e5e1d8;border-radius:18px;box-shadow:0 18px 70px #30282030}h2{font:600 23px Georgia,SimSun,serif;margin:0 0 8px}p{font-size:11px;color:#827d73;margin:0 0 18px}label{display:block;font-size:12px;margin-top:12px}select,input:not([type=checkbox]){width:100%;padding:10px;margin-top:5px;border:1px solid #e5e1d8;border-radius:8px;background:#fffefa;font:13px 'Segoe UI',sans-serif}input[type=checkbox]{accent-color:#b86648}.actions{display:flex;gap:8px;margin-top:20px}button{flex:1;padding:10px;border:1px solid #e5e1d8;border-radius:8px;background:transparent;color:#726b60;cursor:pointer}button.primary{background:#b86648;border-color:#b86648;color:white}:focus-visible{outline:2px solid #b86648;outline-offset:2px}
    </style><form class="card"><h2>解题模型设置</h2><p>使用 DeepSeek API 生成答案。含图题自动使用 deepseek-flash 识图并附上图片内容；密钥可仅保存在当前标签页。</p><label>DeepSeek API Key<input name="key" type="password" autocomplete="off" placeholder="填写你的 API Key"></label><label>DeepSeek 模型<input name="model"></label><label>快速通道语言<select name="compiler"><option value="auto">自动（按题名识别，无提示默认 C）</option><option value="GCC">C / GCC</option><option value="GXX">C++ / G++</option><option value="CLANG">C / Clang</option><option value="CLANGXX">C++ / Clang++</option></select></label><label>首次作答模式<select name="thinking"><option value="disabled">快速作答 · 关闭思考（默认）</option></select></label><p style="margin-top:10px">前五次错误保持快速作答，之后启用思考。</p><label><input name="remember" type="checkbox"> 在脚本猫中记住密钥</label><div class="actions"><button type="button" name="close">取消</button><button class="primary" type="submit">保存设置</button></div></form>`;
  const form = shadow.querySelector('form');
  form.elements.key.value = sessionKey || GM_getValue('deepseekKey', '');
  form.elements.model.value = GM_getValue('deepseekModel', 'deepseek-flash');
  form.elements.compiler.value = GM_getValue('compilerPreference', 'auto');
  form.elements.thinking.value = 'disabled';
  form.elements.thinking.disabled = true;
  form.elements.remember.checked = !!GM_getValue('deepseekKey', '');
  form.elements.close.addEventListener('click', () => host.remove());
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const key = form.elements.key.value.trim();
    sessionKey = key;
    await GM_setValue('compilerPreference', form.elements.compiler.value);
    await GM_setValue('deepseekThinking', form.elements.thinking.value);
    GM_getTab(data => { GM_saveTab({ ...(data || {}), deepseekKey: key }); });
    await GM_setValue('deepseekModel', form.elements.model.value.trim() || 'deepseek-flash');
    if (form.elements.remember.checked && key) await GM_setValue('deepseekKey', key);
    else await GM_deleteValue('deepseekKey');
    host.remove();
  });
  document.body.append(host);
  form.elements.key.focus();
}

// Per-tab usage receipts. Token counts are not a subscription quota percentage.
const aiUsageListeners = new Set();
const AI_USAGE_KEY = 'pta-ai-usage-v1';
let aiUsageMemory = null;
function freshAiUsage() {
  return { version: 1, chatgpt: { calls: 0, reported: 0, input: 0, output: 0, cached: 0 }, deepseek: { calls: 0, reported: 0, input: 0, output: 0, cached: 0, costMin: 0, costMax: 0, priced: 0 }, latest: null };
}
function aiUsageState() {
  try { const value = JSON.parse(sessionStorage.getItem(AI_USAGE_KEY)); if (value?.version === 1 && value.chatgpt && value.deepseek) return value; } catch {}
  return aiUsageMemory || freshAiUsage();
}
function usageInteger(value) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null; }
function normalizeAiUsage(provider, usage = {}) {
  const input = usageInteger(provider === 'deepseek' ? usage.prompt_tokens : usage.input_tokens);
  const output = usageInteger(provider === 'deepseek' ? usage.completion_tokens : usage.output_tokens);
  let cached = usageInteger(provider === 'deepseek' ? usage.prompt_cache_hit_tokens ?? usage.prompt_tokens_details?.cached_tokens : usage.input_tokens_details?.cached_tokens);
  let miss = provider === 'deepseek' ? usageInteger(usage.prompt_cache_miss_tokens) : null;
  if (input !== null) {
    if (cached !== null && cached > input) cached = null;
    if (miss !== null && miss > input) miss = null;
    if (cached !== null && miss !== null && cached + miss !== input) { cached = null; miss = null; }
    else if (cached === null && miss !== null) cached = input - miss;
    else if (cached !== null && miss === null) miss = input - cached;
  }
  return { input, output, cached, miss, complete: input !== null && output !== null };
}
function deepSeekCostEstimate(model, receipt) {
  const aliases = ['deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp'];
  const rates = aliases.includes(model) ? { hit: .02, miss: 1, out: 4 } : model === 'deepseek-v4-pro' ? { hit: .15, miss: 4.5, out: 13.5 } : null;
  if (!rates || !receipt.complete) return null;
  const { input, output, cached, miss } = receipt;
  const lowerInput = cached === null || miss === null ? input * rates.hit : cached * rates.hit + miss * rates.miss;
  const upperInput = cached === null || miss === null ? input * rates.miss : cached * rates.hit + miss * rates.miss;
  // Official CNY prices checked 2026-10-17; peak is twice off-peak.
  // Show an interval so holidays and requests spanning a tariff boundary aren't guessed.
  return { min: (lowerInput + output * rates.out) / 1e6, max: (upperInput + output * rates.out) * 2 / 1e6, currency: 'CNY', checked: '2026-10-17', cacheUnknown: cached === null || miss === null };
}
function recordAiUsage(provider, model, usage) {
  if (!['chatgpt','deepseek'].includes(provider)) return;
  const state = aiUsageState(), receipt = normalizeAiUsage(provider, usage || {}), bucket = state[provider];
  const estimate = provider === 'deepseek' ? deepSeekCostEstimate(model, receipt) : null;
  bucket.calls++;
  if (receipt.complete) { bucket.reported++; bucket.input += receipt.input; bucket.output += receipt.output; bucket.cached += receipt.cached || 0; }
  if (estimate) { bucket.costMin += estimate.min; bucket.costMax += estimate.max; bucket.priced++; }
  state.latest = { provider, model, ...receipt, estimate, at: Date.now() };
  bucket.last = state.latest;
  aiUsageMemory = state;
  try { sessionStorage.setItem(AI_USAGE_KEY, JSON.stringify(state)); } catch {}
  for (const notify of aiUsageListeners) { try { notify(state.latest); } catch {} }
  return state.latest;
}
function moneyText(value) {
  if (value > 0 && value < .000001) return value.toExponential(2);
  return value.toFixed(6).replace(/\.?0+$/, '') || '0';
}
function usageCount(value) { return Number(value || 0).toLocaleString('zh-CN'); }
function formatQuotaText(result) {
  const lines = ['Codex 账号额度 · ' + (result.plan_type || '套餐未知')];
  for (const w of result.windows || []) {
    const mins = w.window_minutes;
    const label = mins === 300 ? '5小时' : mins === 10080 ? '7天' : mins ? `${mins}分钟` : w.window;
    const delta = w.change_pp == null ? '' : `（较上次 ${w.change_pp >= 0 ? '+' : ''}${w.change_pp.toFixed(2)} 个百分点）`;
    lines.push(`${w.bucket_name} / ${label}：已用 ${Number(w.used_percent).toFixed(1)}%，剩余 ${Number(w.remaining_percent).toFixed(1)}%${delta}`);
    if (w.resets_at) lines.push('重置：' + new Date(w.resets_at * 1000).toLocaleString('zh-CN'));
  }
  lines.push('查询：' + new Date(result.checked_at * 1000).toLocaleTimeString('zh-CN') + (result.cached ? '（15秒内缓存）' : ''));
  lines.push('账号整体变化，非本脚本单独扣减；工作区未独立核验。');
  return lines.join('\n');
}
function quotaCardData(result) {
  const percentage = n => Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, '') + '%' : '—';
  const rows = (result.windows || []).map(w => {
    const mins = w.window_minutes;
    const label = mins === 300 ? '5 小时' : mins === 10080 ? '1 周' : mins ? `${mins} 分钟` : (w.window || '额度');
    const delta = Number.isFinite(w.change_pp) ? -w.change_pp : null;
    const change = delta === null ? '（—）' : `（${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta).toFixed(2)}）`;
    const reset = w.resets_at ? new Date(w.resets_at * 1000) : null;
    const when = !reset ? '—' : mins && mins <= 1440 ? reset.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : `${reset.getMonth()+1}月${reset.getDate()}日`;
    return { label, value: percentage(w.remaining_percent), change, when, hint: `${w.bucket_name || 'Codex'}；${delta === null ? '暂无可比较记录' : '括号为较上次查询的剩余额度变化，单位：百分点'}${reset ? '；重置：' + reset.toLocaleString('zh-CN') : ''}` };
  });
  // Multiple limit buckets must remain distinguishable.
  if (new Set((result.windows || []).map(w => w.bucket_id)).size > 1) rows.forEach((r, i) => { r.label = `${result.windows[i].bucket_name} · ${r.label}`; });
  return { title: 'Codex 额度', meta: result.plan_type || '', rows,
    note: '剩余额度 · 括号为变化百分点',
    details: `右侧为重置时间。首次查询、窗口重置后无比较值时显示（—）。\n查询：${new Date(result.checked_at * 1000).toLocaleString('zh-CN')}${result.cached ? '（缓存）' : ''}\n账号整体变化，非本脚本单独扣减；工作区未独立核验。`,
    url: 'https://chatgpt.com/#settings/Usage', link: '官方用量 ↗' };
}
function deepSeekCardData() {
  const d = aiUsageState().deepseek, r = d.last;
  const total = d.priced ? `¥${moneyText(d.costMin)}～${moneyText(d.costMax)}` : '¥ —';
  const rows = [{ label: '累计估算', value: total }];
  if (r?.estimate) rows.push({ label: '最近一次', value: `¥${moneyText(r.estimate.min)}～${moneyText(r.estimate.max)}` });
  return { title: 'DeepSeek 费用', meta: '本页会话', rows,
    summary: d.calls ? `${d.calls} 次请求 · 输入 ${usageCount(d.input)} / 输出 ${usageCount(d.output)} token` : '暂无请求记录',
    warning: d.calls > d.priced ? `另有 ${d.calls-d.priced} 次费用未知` : '',
    note: '以实际账单为准',
    details: '金额为人民币参考区间，涵盖缓存与高峰价格差异。仅统计本标签页会话，不含其他标签页、安装前历史或未返回用量的请求；失败或取消仍可能产生消耗。' + (r ? '\n最近模型：' + r.model : ''),
    url: 'https://platform.deepseek.com/usage', link: '官方账单 ↗' };
}
function buildUsageCard(data, openUrl, close) {
  const card = document.createElement('div'); card.className = 'pta-usage-content';
  const add = (parent, tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; parent.append(n); return n; };
  const header = add(card, 'div', 'pta-usage-heading');
  add(header, 'strong', 'pta-usage-title', data.title);
  add(header, 'span', 'pta-usage-meta', data.meta);
  const dismiss = add(header, 'button', 'pta-usage-close', '×'); dismiss.type = 'button'; dismiss.setAttribute('aria-label', '关闭'); dismiss.onclick = close;
  for (const row of data.rows || []) {
    const line = add(card, 'div', 'pta-usage-row' + (row.when !== undefined ? ' pta-quota-row' : ''));
    if (row.hint) line.title = row.hint;
    add(line, 'span', 'pta-usage-label', row.label);
    const value = add(line, 'span', 'pta-usage-value', row.value);
    if (row.change) add(value, 'span', 'pta-usage-delta', ' ' + row.change);
    if (row.when !== undefined) add(line, 'span', 'pta-usage-reset', row.when);
  }
  if (data.summary) add(card, 'div', 'pta-usage-summary', data.summary);
  if (data.warning) add(card, 'div', 'pta-usage-warning', data.warning);
  const footer = add(card, 'div', 'pta-usage-footer');
  const details = add(footer, 'details', 'pta-usage-details');
  add(details, 'summary', '', data.note);
  add(details, 'div', 'pta-usage-explanation', data.details);
  const link = add(footer, 'a', 'pta-usage-link', data.link); link.href = data.url;
  link.onclick = event => { event.preventDefault(); openUrl(data.url); };
  return card;
}
function latestAiUsageText() {
  const s = aiUsageState(), r = s.latest;
  if (!r) return '还没有收到模型用量。统计从安装此版本后开始，只计本页会话。';
  const b = s[r.provider], tokens = r.complete ? `输入 ${usageCount(r.input)} / 输出 ${usageCount(r.output)} token` : '接口未提供完整用量，本次消耗未知';
  if (r.provider === 'chatgpt') return `${r.model}\n本次：${tokens}\n本页会话累计：输入 ${usageCount(b.input)} / 输出 ${usageCount(b.output)} token\n额度百分比请右键“消耗体力”→“Codex 额度”。`;
  const cost = r.estimate ? `本次约 ¥${moneyText(r.estimate.min)}～${moneyText(r.estimate.max)}` : '本次费用未知（缺少用量或对应单价）';
  const total = b.priced ? `本页会话已估算累计约 ¥${moneyText(b.costMin)}～${moneyText(b.costMax)}` : '本页会话暂无可估算费用';
  return `${r.model}\n本次：${tokens}\n${cost}\n${total}\n人民币参考区间；以 DeepSeek 账单为准。`;
}
function deepSeekUsageText() {
  const d = aiUsageState().deepseek, r = d.last;
  const lines = ['DeepSeek 费用 · 本页会话'];
  if (r) lines.push(`${r.model}\n最近一次：` + (r.estimate ? `约 ¥${moneyText(r.estimate.min)}～${moneyText(r.estimate.max)}` : '费用未知（缺少用量或对应单价）'));
  lines.push(`请求 ${d.calls} 次，完整用量 ${d.reported} 次\n输入 ${usageCount(d.input)} / 输出 ${usageCount(d.output)} token`);
  lines.push(d.priced ? `已估算 ${d.priced} 次，累计约 ¥${moneyText(d.costMin)}～${moneyText(d.costMax)}` : '暂无可估算费用。');
  if (d.calls > d.priced) lines.push(`另有 ${d.calls-d.priced} 次未计入费用，不能视为免费。`);
  lines.push('人民币参考区间，以账单为准；不含其他标签页、历史和未返回用量的请求。');
  return lines.join('\n');
}
function allAiUsageText() {
  const s = aiUsageState(), c = s.chatgpt, d = s.deepseek;
  const lines = ['本页会话累计（含已返回用量的修正请求）'];
  lines.push(`ChatGPT：${c.calls} 次，完整用量 ${c.reported} 次\n输入 ${usageCount(c.input)} / 输出 ${usageCount(c.output)} token\n额度百分比请用“消耗体力”→“Codex 额度”。`);
  lines.push(`DeepSeek：${d.calls} 次，完整用量 ${d.reported} 次\n输入 ${usageCount(d.input)} / 输出 ${usageCount(d.output)} token`);
  lines.push(d.priced ? `已估算 ${d.priced} 次，约 ¥${moneyText(d.costMin)}～${moneyText(d.costMax)}` : '费用暂无可估算数据。');
  if (d.calls > d.priced) lines.push(`另有 ${d.calls-d.priced} 次未计入费用，不能视为免费。`);
  lines.push('金额为人民币参考区间，以账单为准；未返回用量的失败/取消可能仍有消耗，不含在统计内。');
  return lines.join('\n');
}

// ChatGPT plan adapter. OAuth credentials never enter the userscript.
function selectedAiProvider() { return GM_getValue('ptaAiProvider', 'chatgpt') === 'deepseek' ? 'deepseek' : 'chatgpt'; }
function selectedChatGPTConfig() {
  return { model: String(GM_getValue('chatgptModel', 'gpt-6-luna')), effort: String(GM_getValue('chatgptEffort', 'low')) };
}
function activeAiLabel() { const c = selectedChatGPTConfig(); return selectedAiProvider() === 'chatgpt' ? `${c.model} · ${c.effort === 'default' ? '模型默认' : c.effort}` : 'DeepSeek'; }
function lunaRepairLimit() { return Math.max(0, Math.min(10, Number(GM_getValue('lunaRepairLimit', 3)) || 0)); }
function localBridgeConfig() {
  const base = String(GM_getValue('lunaBridgeBase', 'http://127.0.0.1:1455')).replace(/\/+$/, '');
  const u = new URL(base);
  if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new Error('辅助程序地址必须是 http://127.0.0.1:端口');
  const key = String(GM_getValue('lunaBridgePair', '')).trim();
  if (key.length < 32) throw new Error('请先在设置中填写辅助程序管理页的本机配对码（不是 OpenAI Token）');
  return { base: u.origin, key };
}
function localBridgeCall(path, data, config = localBridgeConfig()) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({ method: data === undefined ? 'GET' : 'POST', url: config.base + path, anonymous: true,
      timeout: 35000, headers: { 'Content-Type': 'application/json', 'X-Bridge-Key': config.key },
      ...(data === undefined ? {} : { data: JSON.stringify(data) }),
      onload(response) {
        let parsed;
        try { parsed = JSON.parse(response.responseText); } catch { reject(new Error('本机辅助程序返回格式错误，请检查地址和版本')); return; }
        if (response.status < 200 || response.status >= 300) {
          const info = parsed.error || {};
          const error = new Error(info.message || `本机辅助程序 HTTP ${response.status}`);
          Object.assign(error, { aiStatus: info.status || response.status, aiCode: info.code, requestId: info.request_id, noRetry: true, aiProvider: 'chatgpt' });
          reject(error); return;
        }
        resolve(parsed);
      },
      onerror: () => reject(new Error('无法连接本机辅助程序，请启动 start-windows.cmd，并允许脚本猫访问 127.0.0.1')),
      ontimeout: () => reject(new Error('本机辅助程序连接超时；未自动重新生成答案')),
      onabort: () => reject(new Error('本机连接已取消'))
    });
  });
}
async function configureDeepSeek() {
  if (document.getElementById('pta-ai-settings')) return;
  const host = document.createElement('div'); host.id = 'pta-ai-settings';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>:host{position:fixed;inset:0;z-index:2147483647;background:#302e2a55;display:grid;place-items:center;font:13px/1.6 system-ui,'Microsoft YaHei',sans-serif;color:#302e2a}.card{box-sizing:border-box;width:420px;max-width:calc(100vw - 24px);max-height:90vh;overflow:auto;background:#faf9f5;border:1px solid #e5e1d8;border-radius:16px;padding:22px}h2{margin:0 0 8px;font-size:21px}p{font-size:12px;color:#776e62}label{display:block;margin:12px 0 0}input:not([type=checkbox]),select{box-sizing:border-box;width:100%;margin-top:4px;padding:8px;border:1px solid #d9d2c7;border-radius:7px;background:#fffefa;color:#302e2a}button{margin:12px 7px 0 0;padding:9px 13px;border:1px solid #d9d2c7;border-radius:7px;background:#fffefa;color:#302e2a;cursor:pointer}button.primary{background:#b86648;color:white;border-color:#b86648}[hidden]{display:none!important}.notice{white-space:pre-wrap;overflow-wrap:anywhere}</style><form class="card"><h2>解题模型设置</h2>
    <label>模型来源<select name="provider"><option value="chatgpt">ChatGPT 订阅</option><option value="deepseek">DeepSeek API</option></select></label>
    <div class="luna"><label>具体模型<select name="chatmodel"></select></label><label>推理强度<select name="effort"></select></label><p>手动选择账号目录中的模型，不自动切换模型或计费渠道。保存后对下一次请求生效；运行任务时请先停止再修改。</p><label>本机地址<input name="base" placeholder="http://127.0.0.1:1455"></label><label>本机配对码（从管理页复制）<input name="pair" type="password" autocomplete="off"></label><p>未核实推理参数的模型仅提供“模型默认”。目录可见不保证实际请求成功。</p><label>每题最多自动修正次数（0～10，不含首次生成）<input name="limit" type="number" min="0" max="10" step="1"></label><button type="button" name="check">读取账号模型并检查连接</button><p>网络、额度或权限错误会停止本轮任务。停止已开始的推理不保证不产生用量。</p></div>
    <div class="deepseek"><p>保留原脚本的 DeepSeek 模型、题图和思考切换规则。</p><label>DeepSeek API Key<input name="key" type="password" autocomplete="off"></label><label>DeepSeek 模型<input name="model"></label><label><input name="remember" type="checkbox">在脚本猫中记住 DeepSeek 密钥</label></div>
    <label>快速通道语言<select name="compiler"><option value="auto">自动（按题名识别，无提示默认 C）</option><option value="GCC">C / GCC</option><option value="GXX">C++ / G++</option><option value="CLANG">C / Clang</option><option value="CLANGXX">C++ / Clang++</option></select></label>
    <p class="notice" role="status"></p><button type="button" name="close">取消</button><button class="primary" type="submit">保存设置</button></form>`;
  const form = root.querySelector('form'), e = form.elements, notice = root.querySelector('.notice');
  e.provider.value = selectedAiProvider(); e.base.value = GM_getValue('lunaBridgeBase', 'http://127.0.0.1:1455'); e.pair.value = GM_getValue('lunaBridgePair', ''); e.limit.value = lunaRepairLimit();
  let catalog = GM_getValue('chatgptModelCatalog', [{ slug: 'gpt-6-luna', display_name: 'GPT-6 Luna', reasoning_efforts: ['default','none','low','medium','high','xhigh','max'] }]);
  if (!Array.isArray(catalog)) catalog = [];
  const selected = selectedChatGPTConfig();
  const addOption = (select, value, label) => { const o = document.createElement('option'); o.value = value; o.textContent = label; select.append(o); };
  const renderEfforts = wanted => {
    const row = catalog.find(m => m.slug === e.chatmodel.value);
    const levels = row?.reasoning_efforts?.length ? row.reasoning_efforts : ['default'];
    const labels = { default: '模型默认', none: '关闭 · none', low: '轻度 · low', medium: '中等 · medium', high: '高度 · high', xhigh: '更高 · xhigh', max: '最高 · max' };
    e.effort.replaceChildren(); levels.forEach(v => addOption(e.effort, v, labels[v] || v));
    e.effort.value = levels.includes(wanted) ? wanted : 'default';
  };
  const renderModels = (wanted, effort) => {
    e.chatmodel.replaceChildren();
    catalog.forEach(m => addOption(e.chatmodel, m.slug, `${m.display_name || m.slug} (${m.slug})`));
    if (!catalog.some(m => m.slug === wanted)) addOption(e.chatmodel, wanted, wanted + '（不在当前目录，请重选）');
    e.chatmodel.value = wanted; renderEfforts(effort);
  };
  renderModels(selected.model, selected.effort);
  e.chatmodel.onchange = () => renderEfforts(e.effort.value);
  await tabReady;
  e.key.value = sessionKey || GM_getValue('deepseekKey', ''); e.model.value = GM_getValue('deepseekModel', 'deepseek-flash'); e.remember.checked = !!GM_getValue('deepseekKey', ''); e.compiler.value = GM_getValue('compilerPreference', 'auto');
  const sections = () => { root.querySelector('.luna').hidden = e.provider.value !== 'chatgpt'; root.querySelector('.deepseek').hidden = e.provider.value !== 'deepseek'; };
  sections(); e.provider.onchange = sections; e.close.onclick = () => host.remove();
  e.check.onclick = async () => {
    e.check.disabled = true; notice.textContent = '正在检查连接和账号目录，不生成答案…';
    try {
      const base = e.base.value.trim().replace(/\/+$/, ''), url = new URL(base);
      if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('地址必须为 http://127.0.0.1:端口');
      const conf = { base: url.origin, key: e.pair.value.trim() };
      const state = await localBridgeCall('/status', undefined, conf);
      if (!state.logged_in || !state.plan_enabled) throw new Error('辅助程序已连接，但尚未登录并授权订阅使用');
      if (state.version?.startsWith('1.0.')) throw new Error('请先将辅助程序 bridge.py 更新到 1.1.0，再读取可选模型');
      const result = await localBridgeCall('/models', undefined, conf);
      const wanted = e.chatmodel.value, effort = e.effort.value;
      catalog = result.models || [];
      await GM_setValue('chatgptModelCatalog', catalog);
      renderModels(wanted, effort);
      notice.textContent = `已读取 ${catalog.length} 个账号模型。请选择模型和推理强度，再保存；新模型的实际权限以请求结果为准。`  + (state.blocked ? '\n当前辅助程序处于暂停状态，处理问题后在管理页解除暂停。' : '');
    } catch (error) { notice.textContent = error.message; }
    finally { e.check.disabled = false; }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    try {
      if (document.querySelector('#pta-direct-submit .pta-single')?.disabled) throw new Error('请先停止当前任务，再修改模型设置');
      const limit = Number(e.limit.value);
      if (!Number.isInteger(limit) || limit < 0 || limit > 10) throw new Error('自动修正次数必须为 0～10 的整数');
      const u = new URL(e.base.value.trim());
      if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new Error('辅助程序地址必须为 http://127.0.0.1:端口');
      if (e.provider.value === 'chatgpt' && e.pair.value.trim().length < 32) throw new Error('请填写管理页中的完整本机配对码');
      if (e.provider.value === 'chatgpt' && !catalog.some(m => m.slug === e.chatmodel.value)) throw new Error('所选模型不在账号目录中，请读取模型列表并重新选择');
      await GM_setValue('chatgptModel', e.chatmodel.value); await GM_setValue('chatgptEffort', e.effort.value);
      await GM_setValue('ptaAiProvider', e.provider.value); await GM_setValue('lunaBridgeBase', u.origin); await GM_setValue('lunaBridgePair', e.pair.value.trim()); await GM_setValue('lunaRepairLimit', limit);
      await GM_setValue('compilerPreference', e.compiler.value);
      sessionKey = e.key.value.trim(); GM_getTab(data => GM_saveTab({ ...(data || {}), deepseekKey: sessionKey }));
      await GM_setValue('deepseekModel', e.model.value.trim() || 'deepseek-flash');
      if (e.remember.checked && sessionKey) await GM_setValue('deepseekKey', sessionKey); else await GM_deleteValue('deepseekKey');
      const live = document.querySelector('#pta-direct-submit .pta-live'); if (live) live.textContent = activeAiLabel();
      const selected = document.querySelector('#pta-direct-submit [data-mode][aria-pressed=true]'); selected?.click();
      host.remove();
    } catch (error) { notice.textContent = error.message; }
  };
  document.body.append(host);
}
async function generateWithDeepSeek(message) {
  if (selectedAiProvider() === 'deepseek') return generateLegacyDeepSeek(message);
  try { return await generateWithChatGPT(message); }
  catch (error) {
    error.noRetry = true; error.aiProvider = 'chatgpt'; error.aiStatus ||= 503;
    if (!message.shouldStop?.() && error.aiCode !== 'cancelled') message.onFatal?.(error);
    throw error;
  }
}
async function generateWithChatGPT(message) {
  const config = localBridgeConfig();
  const { model, effort } = selectedChatGPTConfig();
  const fill = message.type === 'generate-fill', language = message.language || 'C99';
  const messages = PTA_FLOW.attachQuestionImages(fill
    ? [{ role: 'system', content: '你是 C/C++ 程序填空题求解器。只输出 JSON 对象 {"answers":["第一空","第二空"]}。按顺序逐空回答，不添加空外已有标点。核对完整代码、边界及输出格式。' }, { role: 'user', content: message.problem }]
    : PTA_FLOW.codeMessages({ language, kind: message.kind, problem: message.problem, repair: message.repair }), message.images);
  const id = crypto.randomUUID(), startedAt = Date.now();
  let stopped = false, completed = false;
  const handle = { abort() { if (completed || stopped) return; stopped = true; localBridgeCall(`/jobs/${id}/cancel`, {}, config).catch(() => {}); } };
  const check = () => { if (stopped || message.shouldStop?.()) { handle.abort(); throw Object.assign(new Error('ChatGPT 请求已停止；已开始的推理可能仍产生用量'), { aiCode: 'cancelled' }); } };
  deepSeekRequests.add(handle);
  const audit = { provider: 'chatgpt-plan', model, thinking: effort, questionId: message.questionId, problemSetId: message.problemSetId, imageCount: message.images?.length || 0, repair: !!message.repair, time: new Date().toISOString() };
  if (!fill) GM_setValue('lastCodeRequestAudit', audit);
  try {
    check();
    await localBridgeCall('/jobs', { request_id: id, model, effort, messages }, config);
    let result;
    while (Date.now() - startedAt < 330000) {
      check();
      const job = await localBridgeCall(`/jobs/${id}`, undefined, config);
      check();
      if (job.state === 'done') { result = job.result; break; }
      if (job.state === 'failed' || job.state === 'cancelled') {
        throw Object.assign(new Error(job.error?.message || 'ChatGPT 请求未成功完成'), { aiStatus: job.error?.status || 503, aiCode: job.error?.code, requestId: job.error?.request_id });
      }
      await new Promise(resolve => setTimeout(resolve, 900));
    }
    if (!result) throw new Error('ChatGPT 等待超时，未重新请求；请在管理页检查状态');
    check();
    const raw = String(result.text || '').trim();
    if (!raw) throw new Error('ChatGPT 没有返回完整文本答案');
    completed = true;
    const usage = result.usage || {};
    recordAiUsage('chatgpt', model, usage);
    const metrics = { model, thinking: effort, elapsedMs: Date.now() - startedAt, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, reasoningTokens: usage.output_tokens_details?.reasoning_tokens };
    GM_setValue('lunaLastUsage', { ...audit, ...metrics });
    if (fill) {
      let parsed;
      try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i, '$1')); } catch { throw new Error('ChatGPT 填空响应不是有效 JSON；未填写、未自动重试'); }
      if (!Array.isArray(parsed.answers) || parsed.answers.length !== message.blankCount || parsed.answers.some(a => typeof a !== 'string' || !a.trim())) throw new Error(`ChatGPT 填空数量或类型不匹配，预期 ${message.blankCount} 个；未填写`);
      return { answers: parsed.answers, metrics };
    }
    const code = raw.replace(/^```[\w+.-]*\s*\n([\s\S]*?)\n?```\s*$/, '$1').trim();
    GM_setValue('lastCodeRequestAudit', { ...audit, returnedCode: code, ...metrics });
    return { code, metrics };
  } catch (error) {
    if (!completed) handle.abort();
    throw error;
  } finally { deepSeekRequests.delete(handle); }
}

GM_registerMenuCommand('解题模型设置', configureDeepSeek);

async function generateLegacyDeepSeek(message) {
  await tabReady;
  const key = sessionKey || GM_getValue('deepseekKey', '');
  if (!key) { configureDeepSeek(); throw new Error('请先保存 DeepSeek 设置，再开始答题'); }
  const fill = message.type === 'generate-fill';
  const language = message.language || 'C99';
  const messages = PTA_FLOW.attachQuestionImages(fill
    ? [{ role: 'system', content: '你是 C/C++ 程序填空题求解器。只输出 JSON 对象 {"answers":["第一空","第二空"]}。按顺序逐空回答，不添加空外已有标点。核对完整代码、边界及输出格式。' }, { role: 'user', content: message.problem }]
    : PTA_FLOW.codeMessages({ language, kind: message.kind, problem: message.problem, repair: message.repair }), message.images);
  const startedAt = Date.now();
  const model = message.images?.length ? 'deepseek-flash' : GM_getValue('deepseekModel', 'deepseek-flash');
  const thinking = message.repair ? (Number(message.repair.errorCount || 0) >= 5 ? 'enabled' : 'disabled') : 'disabled';
  const auditMessages = messages.map(entry => ({ ...entry, content: Array.isArray(entry.content) ? entry.content.map(part => part.type === 'image_url' ? { type: 'image_url', image_url: { url: '[题图内容已附加，审计不保存图片字节]', detail: part.image_url.detail } } : part) : entry.content }));
  const audit = { problemSetId: message.problemSetId, questionId: message.questionId, origin: message.origin, deliveryMode: message.deliveryMode, compiler: message.compiler, repair: !!message.repair, strategy: message.repair?.strategy || 'initial', errorCount: message.repair?.errorCount || 0, model, thinking, messages: auditMessages, imageCount: message.images?.length || 0, time: new Date().toISOString() };
  if (!fill) GM_setValue('lastCodeRequestAudit', audit);
  const data = await new Promise((resolve, reject) => {
    let request, settled = false;
    const finish = callback => value => { settled = true; if (request) deepSeekRequests.delete(request); callback(value); };
    request = GM_xmlhttpRequest({
      method: 'POST', url: 'https://api.deepseek.com/chat/completions', timeout: 120000,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      data: JSON.stringify(PTA_FLOW.deepseekRequest({ model, thinking, messages, fill })),
      onload: finish(response => {
        let parsed;
        try { parsed = JSON.parse(response.responseText); } catch { reject(new Error('DeepSeek 响应不是有效 JSON')); return; }
        if (response.status < 200 || response.status >= 300) {
          const error = new Error(`DeepSeek HTTP ${response.status}: ${parsed?.error?.message || '请求失败'}`);
          error.aiStatus = response.status;
          if ([401, 402, 403].includes(response.status)) message.onFatal?.(error);
          reject(error); return;
        }
        resolve(parsed);
      }),
      onerror: finish(() => reject(new Error('DeepSeek 网络请求失败，请检查网络与脚本猫权限'))),
      ontimeout: finish(() => reject(new Error('DeepSeek 请求超时，未提交作答'))),
      onabort: finish(() => reject(new Error('DeepSeek 请求已取消')))
    });
    if (!settled && request) deepSeekRequests.add(request);
  });
  recordAiUsage('deepseek', model, data?.usage || {});
  if (data?.choices?.[0]?.finish_reason === 'length') throw new Error('模型输出被截断，已停止');
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw?.trim()) throw new Error('DeepSeek 未返回答案');
  if (fill) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error('填空答案不是有效 JSON'); }
    if (!Array.isArray(parsed.answers) || parsed.answers.length !== message.blankCount ||
        parsed.answers.some(answer => typeof answer !== 'string' || !answer.trim())) {
      throw new Error(`填空数量不匹配，预期 ${message.blankCount} 个`);
    }
    return { answers: parsed.answers };
  }
  if (!fill) GM_setValue('lastCodeRequestAudit', { ...audit, returnedCode: raw, elapsedMs: Date.now() - startedAt });
  return { code: raw.replace(/```[\w+.-]*\n?/g, '').trim(), metrics: { model, thinking, elapsedMs: Date.now() - startedAt, outputTokens: data.usage?.completion_tokens } };
}


const PTA_FLOW = (() => {
  function payload(item, program) {
    if (![6, 7].includes(item.type) || !/^\d+$/.test(item.id) || !program.trim()) throw new Error('题目或代码无效');
    const key = item.type === 6 ? 'codeCompletionSubmissionDetail' : 'programmingSubmissionDetail';
    return { problemType: item.type === 6 ? 'CODE_COMPLETION' : 'PROGRAMMING', details: [{
      problemId: '0', problemSetProblemId: item.id, [key]: { program, compiler: item.compiler || 'GCC' }
    }] };
  }
  function nextAction(job) {
    if (!job || job.state !== 'running') return 'idle';
    if (job.index >= job.items.length) return 'complete';
    // Reloads during generation/input/submission never replay a write automatically.
    if (job.phase !== 'ready') return 'uncertain';
    return 'run';
  }
  function summary(job) {
    const records = job?.records || [];
    return { accepted: records.filter(fullScore).length,
      saved: records.filter(x => x.status === 'SAVED_PENDING').length,
      skipped: job?.skipped || 0, done: records.length, total: job?.items.length || 0 };
  }
  function overallResult(text) {
    const label = text.match(/(?:^|\n)状态\s*\n([^\n]+)/)?.[1]?.trim();
    return ({ '答案正确':'ACCEPTED', '部分正确':'PARTIAL_ACCEPTED', '答案错误':'WRONG_ANSWER', '编译错误':'COMPILE_ERROR', '运行时错误':'RUNTIME_ERROR', '格式错误':'PRESENTATION_ERROR', '运行超时':'TIME_LIMIT_EXCEEDED', '内存超限':'MEMORY_LIMIT_EXCEEDED' })[label] || null;
  }
  function fullScore(result) {
    return result.status === 'ACCEPTED' && (result.score == null || result.maxScore == null || result.score >= result.maxScore);
  }
  function scoreFromText(text) {
    const m = text.match(/(?:^|\n)分数\s*\n\s*([\d.]+)\s*\/\s*([\d.]+)/);
    return m ? { score: Number(m[1]), maxScore: Number(m[2]) } : {};
  }
  function compilerFromLabel(label) {
    const value = (label || '').replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/\s+/g, '').toLowerCase();
    return ({ 'c(gcc)':'GCC','c++(g++)':'GXX','c(clang)':'CLANG','c++(clang++)':'CLANGXX' })[value] || null;
  }
  function resolveCompiler({ configured, title = '', pageTitle = '', label = '' } = {}) {
    if (['GCC', 'GXX', 'CLANG', 'CLANGXX'].includes(configured)) return configured;
    if (/c\+\+|cplusplus/i.test(title)) return 'GXX';
    if (/[（(]\s*c\s*(?:语言)?版\s*[)）]/i.test(title)) return 'GCC';
    return compilerFromLabel(label) || (/c\+\+|cplusplus/i.test(pageTitle) ? 'GXX' : 'GCC');
  }
  function deepseekRequest({ model = 'deepseek-flash', thinking = 'disabled', messages, fill = false }) {
    return { model, messages, temperature: 0.7, stream: false,
      thinking: { type: thinking === 'enabled' ? 'enabled' : 'disabled' },
      ...(fill ? { response_format: { type: 'json_object' } } : {}) };
  }
  function judgeFeedback(submission) {
    const parts = [`判题状态：${submission.status}；得分：${submission.score ?? '未知'}`];
    const seen = new Set();
    let visited = 0;
    const fields = /^(?:status|result|score|maxScore|message|error|errors|log|compileLog|compilerLog|compilerOutput|compilationOutput|stdout|stderr|expectedOutput|actualOutput|time|memory)$/i;
    const outputs = /^(?:stdout|stderr|expectedOutput|actualOutput)$/i;
    function visit(value, path, depth = 0, hideOutput = false) {
      if (value == null || depth > 14 || ++visited > 3000) return;
      if (typeof value !== 'object') {
        const key = path.split('.').pop();
        if ((!fields.test(key) && !/(?:errors|testcaseJudgeResults)\.[^.]+$/.test(path)) || (hideOutput && outputs.test(key))) return;
        const text = String(value);
        if (!text.trim() || seen.has(key + ':' + text)) return;
        seen.add(key + ':' + text);
        parts.push(path + '：\n' + text);
        return;
      }
      const hidden = hideOutput || value.showOutput === false;
      for (const [key, child] of Object.entries(value)) {
        if (hidden && outputs.test(key)) continue;
        visit(child, path ? path + '.' + key : key, depth + 1, hidden);
      }
    }
    // PTA responses may wrap diagnostics by question type or expose them directly.
    for (const [key, value] of Object.entries(submission)) {
      if (/judgeResponse|compilationResult|compileLog|compilerLog|compilerOutput|compilationOutput|testcaseJudgeResults|^(?:error|message)$/i.test(key)) visit(value, key);
    }
    if (parts.length === 1) parts.push('平台本次响应未提供编译日志或测试点详情。请从原题重新审查，不能假设已看见隐藏用例。');
    return clipContext(parts.join('\n'), 48000);
  }
  function clipContext(text, limit) {
    text = String(text || '');
    if (text.length <= limit) return text;
    const marker = '\n[过长内容已截断，省略部分不代表不存在]\n';
    const half = Math.floor((limit - marker.length) / 2);
    return text.slice(0, half) + marker + text.slice(-half);
  }
  function questionImageSources(data, base = 'https://pintia.cn/') {
    const urls = new Set();
    const decode = value => value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)));
    function add(value) {
      if (!value) return;
      try { const url = new URL(decode(value.trim()), base); if (/^(?:https?:|data:)$/.test(url.protocol)) urls.add(url.href); } catch {}
    }
    function walk(value, eligible = false, depth = 0) {
      if (depth > 15 || value == null) return;
      if (typeof value === 'string' && eligible) {
        const text = value.replace(/<!--[\s\S]*?-->|```[\s\S]*?```|<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>|`[^`\n]*`/gi, '');
        for (const match of text.matchAll(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
          const attrs = {};
          for (const attr of match[0].matchAll(/\b(src|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4];
          add(attrs['data-src'] || attrs.src);
        }
        for (const match of text.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)) add('data:image/svg+xml,' + encodeURIComponent(match[0]));
        for (const match of text.matchAll(/!\[[^\]]*\]\(\s*(?:<([^>]+)>|((?:[^\s()]|\([^\s()]*\))+))(?:\s+["'][^\n]*?["'])?\s*\)/g)) add(match[1] || match[2]);
        const refs = new Map([...text.matchAll(/^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm)].map(match => [match[1].toLowerCase(), match[2]]));
        for (const match of text.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) add(refs.get((match[2] || match[1]).toLowerCase()));
      } else if (typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) walk(child, eligible || /content|description|statement|hint|note|sample|example|input|output/i.test(key), depth + 1);
      }
    }
    walk(data);
    return [...urls];
  }
  function attachQuestionImages(messages, images = []) {
    if (!images.length) return messages;
    const copy = messages.map(message => ({ ...message }));
    const user = [...copy].reverse().find(message => message.role === 'user');
    if (!user) throw new Error('图片必须放在 user 消息中');
    user.content = [{ type: 'text', text: typeof user.content === 'string' ? user.content : '' },
      { type: 'text', text: `下面 ${images.length} 张是本题实际附图，请结合完整题面阅读图中的结构、标注和数值，不要仅根据图片链接猜测。` },
      ...images.flatMap((url, index) => [{ type: 'text', text: `题图 ${index + 1}` }, { type: 'image_url', image_url: { url, detail: 'high' } }])];
    return copy;
  }
  function completeProblem(data) {
    const p = data?.problemSetProblem;
    if (!p || !(p.content || p.description)) return '';
    const useful = /title|content|description|interface|template|sample|example|input|output|codeCompletion|programmingProblem|function|constraint|limit|judge|statement|hint|note/i;
    const extras = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'problemSetProblem' && useful.test(key)));
    return '完整题目内容（保留原始格式、公式、接口、输入输出与样例）：\n' + JSON.stringify({ problemSetProblem: p, ...extras }, null, 2);
  }
  const ANSWER_FAILURES = new Set(['COMPILE_ERROR','WRONG_ANSWER','PARTIAL_ACCEPTED','PRESENTATION_ERROR','RUNTIME_ERROR','SEGMENTATION_FAULT','NON_ZERO_EXIT_CODE','TIME_LIMIT_EXCEEDED','MEMORY_LIMIT_EXCEEDED','OUTPUT_LIMIT_EXCEEDED','FLOAT_POINT_EXCEPTION','MULTIPLE_ERROR']);
  async function solveWithRepair({ initial, submit, repair, check = () => {}, limit = 3, deferAfter = Infinity, startRound = 0, startFailures = 0, onAttempt = () => {}, onVerdict = () => {} }) {
    let code = initial, round = startRound, repairRequests = 0, errorCount = startFailures;
    const history = [];
    const failedCodes = new Set();
    for (;;) {
      check(); onAttempt(code, round);
      const received = await submit(code, round);
      if (received.errorCount != null) errorCount = Math.max(errorCount, received.errorCount);
      else if (!fullScore(received) && (ANSWER_FAILURES.has(received.status) || received.status === 'ACCEPTED')) errorCount++;
      const result = { ...received, errorCount };
      onVerdict(result, round); history.push({ ...result, round });
      if (history.length > 20) history.shift();
      if (fullScore(result)) return { ...result, repairs: round, repairRequests, attempts: history };
      failedCodes.add(code.trim());
      if (failedCodes.size > 32) failedCodes.delete(failedCodes.values().next().value);
      if (!ANSWER_FAILURES.has(result.status) && result.status !== 'ACCEPTED') return { ...result, repairs: round, repairRequests, attempts: history, repairStopped: '判题结果尚不可修正' };
      if (errorCount >= deferAfter) return { ...result, repairs: round, repairRequests, attempts: history, deferred: true };
      let repeatedOutputs = 0;
      for (;;) {
        check();
        if (round >= limit) return { ...result, repairs: round, repairRequests, attempts: history, repairStopped: '已达自动修正上限' };
        round++; repairRequests++;
        const next = await repair(code, result, round, { repeatedOutputs });
        check();
        // Ask again for an actual change; never POST unchanged code.
        if (next?.trim() && !failedCodes.has(next.trim())) { code = next; break; }
        repeatedOutputs++;
      }
    }
  }
  // Original extension's default prompt, with the requested function/C++ contract.
  function codeMessages({ language, kind, problem, repair }) {
    const previous = (repair?.history || []).filter(entry => entry.code !== repair.code).slice(-3);
    const history = previous.length ? '\n同题前几轮失败记录（历史代码可能截断，只用于比较；本轮完整代码见最后）：\n' + JSON.stringify(previous) + '\n不要恢复这些已经失败的实现。结合前后错误变化检查是否引入退步。\n' : '';
    const contract = kind === 'CODE_COMPLETION'
      ? '\n这是函数题：只提交题面要求的函数实现；严格匹配模板、类名、函数签名和成员，不重复定义裁判已有的类或 main。只能使用题面明确提供的成员与函数，不可假定自定义类拥有标准库接口或猜测方法名。删除、取出元素等操作不能当作只读查询；分析操作副作用和类中各状态的一致性。'
      : '';
    const prompt = repair?.strategy === 'restart'
      ? `你是专业的 C/C++ 编程题求解器。此前实现多次未通过，现在必须从完整题意独立重新推导，不沿用前一实现的算法假设。\n语言：${language}\n上次判题：${repair.status}，得分 ${repair.score ?? '未知'} / ${repair.maxScore ?? '未知'}\n平台反馈：\n${repair.feedback || '平台未提供详细反馈'}\n\n重新核对输入输出、函数接口、复杂度约束和边界，在内部用题目样例和自拟反例验证。只输出本题完整提交代码，不输出解释或 Markdown。平台未公开的测试用例不能猜成已知信息。${contract}\n\n完整题目如下：\n${problem}`
      : repair
      ? `你是专业的编程题 AC 生成器。\n语言：${language}\n错误类型：${repair.status}\n编译器提示与测试点提示：${repair.feedback || '平台未提供'}\n得分：${repair.score ?? '未知'} / ${repair.maxScore ?? '未知'}\n\n先在内部定位失败根因并推导反例，再核对所有提供的接口、样例和边界。若编译器报告不存在成员，应依据原题接口重写相关逻辑，不可仅改成另一个猜测的名称。答案错误时检查算法不变量，不能只做表面改名。\n请直接输出修正后的完整提交代码，不要解释或 Markdown。\n严格遵守题目输出格式。${contract}\n题目如下：\n${problem}\n错误源码如下：\n${repair.code}`
      : `你是专业的编程题 AC 生成器。\n语言：${language}\n\n请直接输出**能 AC 的完整代码**，不要解释、不要说明、不要多余内容。\n严格遵守格式：换行、空格、缩进必须完全符合题目要求。${contract}\n\n以下是题目内容：\n${problem}`;
    return [{ role: 'system', content: prompt + (repair?.strategy === 'restart' ? '' : history) }, { role: 'user', content: '' }];
  }
  // Keep the 500 ms launch cadence while bounding live AI, submit, and judge chains.
  async function staggered(items, process, { interval = 500, concurrency = 2, wait, cancelled = () => false } = {}) {
    const sleep = wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    let next = 0, nextStart = 0;
    async function worker() {
      while (!cancelled()) {
        const index = next++;
        if (index >= items.length) return;
        const now = Date.now();
        const waitFor = Math.max(0, nextStart - now);
        nextStart = Math.max(now, nextStart) + interval;
        if (waitFor) await sleep(waitFor);
        if (cancelled()) return;
        await process(items[index], index);
      }
    }
    return Promise.allSettled(Array.from({ length: Math.min(items.length, Math.max(1, concurrency)) }, worker));
  }
  return { payload, nextAction, summary, overallResult, fullScore, scoreFromText, compilerFromLabel, resolveCompiler, deepseekRequest, judgeFeedback, clipContext, questionImageSources, attachQuestionImages, completeProblem, solveWithRepair, staggered, codeMessages };
})();


function createPetCompanion({ now = () => Date.now(), speak = () => {} } = {}) {
  const active = new Map();
  let running = false, startedAt = 0, lastNoticeAt = -Infinity, nextId = 0, quietUntil = 0;
  let progress = { done: 0, total: 0 }, nextLongNotice = 90000;
  const elapsedText = ms => ms >= 60000 ? `${Math.floor(ms / 60000)} 分 ${Math.floor(ms / 1000) % 60} 秒` : `${Math.floor(ms / 1000)} 秒`;
  function reason(task) { return reasonRaw(task).replace(/DeepSeek/g, activeAiLabel()); }
  function reasonRaw(task) {
    const title = task.title ? `「${String(task.title).slice(0, 26)}」` : '这一题';
    const imageNote = task.imageCount ? `题面和 ${task.imageCount} 张原图已一起附上。` : '';
    if (task.kind === 'ai' && task.restart) return imageNote + `${title}前面的思路没有进展，正在${task.thinking ? '用思考模式' : ''}从完整原题重新解；还在等 DeepSeek 返回，小钳子没有忘记它呀。`;
    if (task.kind === 'ai') return imageNote + (task.thinking
      ? `${title}已经开启思考模式，正在等 DeepSeek 返回修正版；这一步可能久一点，小钳子还在守着呢。`
      : task.repair ? `${title}上一版没有通过，我把代码和判题反馈交给 DeepSeek 修正啦，正在等它返回。`
        : `${title}还在等 DeepSeek 返回代码，暂时没有收到答案。主人可以伸个懒腰，我会继续留意。`);
    if (task.kind === 'images') return '正在读取本题配图，准备随题面一起交给 DeepSeek。小钳子在收集图里的信息，不会只传一个链接就开答。';
    if (task.kind === 'judging') return `${title}已拿到提交编号，正在等 PTA 的最终判题；现在还不知道结果，小钳子会继续查。`;
    if (task.kind === 'submitting') return `${title}的提交请求已经发出，正在等 PTA 回执；先等这次结果，避免重复提交呀。`;
    if (task.kind === 'inputting') return `正在把${title}的代码分段填进编辑器，还要读回核对，慢一点是在认真对齐每一行呀。`;
    if (task.kind === 'scanning') return '正在读取题集和你的通过记录，确认哪些题还没满分，免得重复忙活呀。';
    if (task.kind === 'page') return '正在等待页面的提交确认或判题结果，暂时还没核实成功，小钳子会继续看着。';
    if (task.kind === 'retry') {
      const source = task.source || 'AI';
      const why = ({ rate: `${source} 返回了请求频率限制`, service: `${source} 返回了服务错误`, timeout: '这次请求超时了', network: '这次请求遇到了网络错误' })[task.reason] || '这次请求暂时失败了';
      return `${why}，我会等 ${task.seconds || 1} 秒再试。主人不用一直点开始，小钳子记着这道题呢。`;
    }
    return '还没处理完这一轮，正在等待当前步骤返回；暂时没有足够信息确认为什么变慢。';
  }
  function explain() {
    if (!running) return '小钳子待命中～打开题目后就能一起忙啦。';
    const tasks = [...active.values()].sort((a, b) => a.startedAt - b.startedAt);
    const prefix = progress.total ? `已处理 ${progress.done}/${progress.total} 项。` : '';
    return prefix + (tasks.length ? reason(tasks[0]) : '正在衔接下一步，小钳子没有收到新的完成结果。');
  }
  function notify(text) { lastNoticeAt = now(); speak(text); }
  return {
    setRunning(value) {
      if (running === value) return;
      running = value;
      if (value) { startedAt = now(); lastNoticeAt = -Infinity; nextLongNotice = 90000; progress = { done: 0, total: 0 }; }
      else active.clear();
    },
    setProgress(value) { progress = value; if (running && Number.isFinite(value.startedAt)) startedAt = value.startedAt; },
    begin(kind, details = {}) {
      const id = ++nextId;
      const task = { ...details, kind, startedAt: now() };
      active.set(id, task);
      if (kind === 'retry' && running && now() - lastNoticeAt >= 45000) notify(reason(task));
      return () => active.delete(id);
    },
    tick() {
      if (!running || now() < quietUntil || now() - lastNoticeAt < 45000) return;
      const task = [...active.values()].filter(task => now() - task.startedAt >= ({ ai: 15000, judging: 12000, submitting: 12000, inputting: 15000, scanning: 10000, page: 12000, retry: 8000 }[task.kind] || 15000))
        .sort((a, b) => a.startedAt - b.startedAt)[0];
      if (task) { notify(`让主人久等啦。${reason(task)}`); return; }
      if (now() - startedAt >= nextLongNotice) {
        nextLongNotice = now() - startedAt + 90000;
        notify(`这一轮已经忙了 ${elapsedText(now() - startedAt)}。${explain()}`);
      }
    },
    explain, elapsed: () => elapsedText(now() - startedAt), pauseNotices(ms = 8000) { quietUntil = now() + ms; },
    clear() { running = false; active.clear(); }
  };
}

function attachPet(panel, options = {}) {
  GM_addStyle("#pta-direct-submit .pta-pet-menu{grid-template-columns:minmax(0,1fr);gap:2px;width:208px;min-width:0;max-width:calc(100vw - 32px);padding:7px;background:#faf9f5;color:#38362f;border:1px solid #e5e1d8;border-radius:14px;box-shadow:0 5px 22px #302d2514;max-height:calc(100vh - 90px);overflow:auto}\n#pta-direct-submit .pta-pet-menu button{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:36px;padding:8px 12px;background:transparent;border:0;border-radius:8px;color:#595348;font:13px/1.5 'Segoe UI','Microsoft YaHei',sans-serif;text-align:left;white-space:nowrap}\n#pta-direct-submit .pta-pet-menu button:hover,#pta-direct-submit .pta-pet-menu button:focus-visible{background:#eee2d7;color:#a85a3e}\n#pta-direct-submit .pta-pet-menu .pta-menu-heading{padding:5px 12px 7px;color:#8a8275;font-size:11px;letter-spacing:.4px}\n#pta-direct-submit .pta-menu-arrow{color:#9a8f7f;font-size:16px}\n#pta-direct-submit .pta-pet-menu .pta-menu-back{margin-top:5px;border-top:1px solid #eae6de;border-radius:0;padding-top:10px;color:#ae6248}\n#pta-direct-submit .pta-pet-bubble{white-space:pre-line;max-height:min(65vh,420px);overflow:auto}\n#pta-direct-submit .pta-pet-bubble.pta-bubble-visible{pointer-events:auto}\n#pta-direct-submit .pta-pet-bubble.pta-usage-card{width:350px;max-width:calc(100vw - 32px);padding:18px 20px 15px;border-radius:14px;background:#faf9f5;color:#38362f;border:1px solid #e5e1d8;box-shadow:0 5px 22px #302d2514;white-space:normal;font:13px/1.6 'Segoe UI','Microsoft YaHei',sans-serif}\n#pta-direct-submit .pta-usage-heading{display:flex;align-items:center;gap:10px;margin-bottom:14px}\n#pta-direct-submit .pta-usage-title{flex:1;font:500 18px/1.4 Georgia,'Songti SC',serif;color:#38362f}\n#pta-direct-submit .pta-usage-meta{color:#8a8275;font-size:11px}\n#pta-direct-submit .pta-usage-close{border:0;background:transparent;color:#8a8275;padding:0 3px;font-size:18px;border-radius:4px;line-height:24px}\n#pta-direct-submit .pta-usage-close:hover{background:#eee2d7;color:#ae6248}\n#pta-direct-submit .pta-usage-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:10px;padding:7px 0;font-variant-numeric:tabular-nums}\n#pta-direct-submit .pta-usage-row+.pta-usage-row{border-top:1px solid #eae6de}\n#pta-direct-submit .pta-quota-row{grid-template-columns:minmax(0,1fr) auto auto}\n#pta-direct-submit .pta-usage-label{font-weight:500;overflow-wrap:anywhere}\n#pta-direct-submit .pta-usage-value{font-variant-numeric:tabular-nums;text-align:right;overflow-wrap:anywhere;max-width:200px}\n#pta-direct-submit .pta-usage-delta{color:#ae6248;font-size:11px;white-space:nowrap}\n#pta-direct-submit .pta-usage-reset{color:#8a8275;white-space:nowrap}\n#pta-direct-submit .pta-usage-summary{margin-top:7px;color:#8a8275;font-size:11px}\n#pta-direct-submit .pta-usage-warning{margin-top:5px;color:#ae6248;font-size:11px}\n#pta-direct-submit .pta-usage-footer{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:14px;padding-top:10px;border-top:1px solid #eae6de;color:#8a8275;font-size:11px}\n#pta-direct-submit .pta-usage-details{flex:1;min-width:0}\n#pta-direct-submit .pta-usage-details summary{color:#8a8275;font-size:11px;cursor:pointer}\n#pta-direct-submit .pta-usage-explanation{white-space:pre-line;margin-top:7px;overflow-wrap:anywhere}\n#pta-direct-submit .pta-usage-link{color:#ae6248;text-decoration:none;white-space:nowrap}\n#pta-direct-submit .pta-usage-link:hover{text-decoration:underline}\n@media(pointer:coarse){#pta-direct-submit .pta-pet-menu button{min-height:44px}}\n");
  const pet = panel.querySelector('.pta-launcher');
  const head = panel.querySelector('.pta-head');
  const bubble = document.createElement('div');
  bubble.className = 'pta-pet-bubble'; bubble.setAttribute('role', 'status');
  panel.append(bubble);
  let bubbleTimer, reactionTimer, suppressClick = false;
  let bond = Number(options.loadBond?.()) || 0;
  let taskState = 'idle', resting = false;
  const companion = createPetCompanion({ speak: text => react('wave', text) });
  const watchTimer = setInterval(() => companion.tick(), 1000);
  const showUsage = () => react('happy', latestAiUsageText());
  aiUsageListeners.add(showUsage);
  const menu = document.createElement('div');
  menu.className = 'pta-pet-menu'; menu.hidden = true;
  menu.setAttribute('aria-label', '和桌宠互动');
  const actions = [
    ['摸摸', () => { bond++; options.saveBond?.(bond); react('happy', bond > 8 ? '认得你啦，再摸一下' : '收到摸摸，精神满满'); }],
    ['喂点心', () => { bond += 2; options.saveBond?.(bond); react('snack', taskState === 'working' ? '咔嚓！补给收到，小钳子继续盯着进度～' : '咔嚓！谢谢主人的点心，能量充满啦'); }],
    ['打个招呼', () => react('wave', taskState === 'working' ? '我在忙，你歇一会儿' : '今天也一起慢慢来')],
    ['现在忙什么', () => react('wave', companion.explain())],
    ['消耗体力', () => { renderMenu(usageActions); return false; }],
    ['休息 / 唤醒', () => { resting = !resting; panel.dataset.petResting = String(resting); say(resting ? '眯一会儿，任务照常进行' : '醒啦，我在'); }]
  ];
  function showUsageDetails(text, url, label) {
    say(text);
    const link = document.createElement('a'); link.href = url; link.textContent = '\n' + label;
    link.className = 'pta-usage-link';
    link.onclick = event => { event.preventDefault(); GM_openInTab(url, { active: true, insert: true }); };
    bubble.append(link);
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('pta-bubble-visible'), 30000);
  }
  function showUsageCard(data) {
    clearTimeout(bubbleTimer); companion.pauseNotices(30000);
    bubble.replaceChildren(buildUsageCard(data, url => GM_openInTab(url, { active: true, insert: true }), () => bubble.classList.remove('pta-bubble-visible')));
    bubble.classList.add('pta-usage-card', 'pta-bubble-visible');
    place();
  }
  const usageActions = [
    ['DeepSeek 费用', () => showUsageCard(deepSeekCardData())],
    ['Codex 额度', async () => {
      say('正在查询 Codex 账号额度…');
      try { const result = await localBridgeCall('/quota'); showUsageCard(quotaCardData(result)); }
      catch (error) { showUsageDetails('Codex 额度查询失败：' + error.message, 'https://chatgpt.com/#settings/Usage', '查看官方用量页'); }
    }],
    ['返回', () => { renderMenu(actions); return false; }]
  ];
  function renderMenu(items) {
    menu.replaceChildren();
    const isUsage = items === usageActions;
    menu.setAttribute('aria-label', isUsage ? '消耗体力' : '和桌宠互动');
    if (isUsage) {
      const heading = document.createElement('div'); heading.className = 'pta-menu-heading'; heading.textContent = '消耗体力'; menu.append(heading);
    }
    for (const [label, action] of items) {
      const button = document.createElement('button'); button.type = 'button';
      const text = document.createElement('span'); text.textContent = label; button.append(text);
      if (label === '返回') button.className = 'pta-menu-back';
      if (label === '消耗体力') {
        const arrow = document.createElement('span'); arrow.className = 'pta-menu-arrow'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true'); button.append(arrow);
        button.setAttribute('aria-haspopup', 'true');
      }
      button.onclick = () => { if (action() !== false) menu.hidden = true; place(); };
      menu.append(button);
    }
  }
  renderMenu(actions);
  panel.append(menu);
  let position = options.load?.() || { right: 24, bottom: 24 };
  const clamp = value => Number.isFinite(value) ? value : 24;
  function place() {
    const box = panel.getBoundingClientRect();
    position.right = Math.max(8, Math.min(clamp(position.right), Math.max(8, innerWidth - box.width - 8)));
    position.bottom = Math.max(8, Math.min(clamp(position.bottom), Math.max(8, innerHeight - box.height - 8)));
    panel.style.right = position.right + 'px'; panel.style.bottom = position.bottom + 'px';
    const bubbleWidth = Math.min(bubble.classList.contains('pta-usage-card') ? 350 : 280, innerWidth - 32);
    const anchorWidth = box.width;
    const leftEdge = innerWidth - position.right - anchorWidth;
    const offset = Math.max(8-leftEdge, Math.min(anchorWidth-bubbleWidth-4, innerWidth-8-bubbleWidth-leftEdge));
    bubble.style.left = offset + 'px'; bubble.style.right = 'auto';
    const menuWidth = Math.min(208, innerWidth - 32);
    menu.style.left = Math.max(8-leftEdge, Math.min(anchorWidth-menuWidth, innerWidth-8-menuWidth-leftEdge)) + 'px'; menu.style.right = 'auto';
    const bubbleHeight = bubble.getBoundingClientRect().height;
    bubble.style.bottom = Math.max(8-position.bottom, Math.min(62, innerHeight-position.bottom-bubbleHeight-8)) + 'px';
    const menuHeight = menu.hidden ? 0 : menu.getBoundingClientRect().height;
    menu.style.bottom = position.bottom + 67 + menuHeight > innerHeight - 8 ? 'auto' : '67px';
    menu.style.top = menu.style.bottom === 'auto' ? '67px' : 'auto';
  }
  function say(text) {
    bubble.classList.remove('pta-usage-card');
    bubble.textContent = text; bubble.classList.add('pta-bubble-visible');
    place();
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.classList.remove('pta-bubble-visible'), Math.min(12000, Math.max(3500, String(text).length * 100)));
  }
  function react(name, text) {
    panel.dataset.petMood = name;
    clearTimeout(reactionTimer); reactionTimer = setTimeout(() => { panel.dataset.petMood = ''; }, 900);
    if (text) { companion.pauseNotices(); say(text); }
  }
  function dragHandle(handle) {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || (handle === head && event.target.closest('button,input,textarea,a'))) return;
      const start = { x: event.clientX, y: event.clientY, ...position };
      let moved = false;
      handle.setPointerCapture(event.pointerId);
      const move = e => {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < 6) return;
        if (!moved) { moved = true; panel.classList.add('pta-dragging'); react('grab', '搬家啦'); }
        position = { right: start.right - dx, bottom: start.bottom - dy }; place();
        e.preventDefault();
      };
      const end = e => {
        handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end);
        if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        panel.classList.remove('pta-dragging');
        if (moved) { suppressClick = true; options.save?.(position); react('happy', '就在这里陪你'); setTimeout(() => { suppressClick = false; }, 400); }
      };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    });
  }
  dragHandle(pet); dragHandle(head);
  pet.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    react('happy', panel.classList.contains('pta-pet-only') ? '准备好啦，开始吧' : '我在这里，有事叫我');
  }, true);
  pet.addEventListener('pointerenter', () => react('wave'));
  pet.addEventListener('pointermove', event => {
    const box = pet.getBoundingClientRect();
    pet.style.setProperty('--look-x', Math.max(-1, Math.min(1, (event.clientX - box.left - box.width / 2) / 24)) + 'px');
  });
  pet.addEventListener('pointerleave', () => pet.style.setProperty('--look-x', '0px'));
  const follow = event => {
    if (resting || panel.classList.contains('pta-dragging')) return;
    const box = pet.getBoundingClientRect();
    pet.style.setProperty('--look-x', Math.max(-1.5, Math.min(1.5, (event.clientX - box.left - box.width / 2) / 160)) + 'px');
    pet.style.setProperty('--look-y', Math.max(-1, Math.min(1, (event.clientY - box.top - box.height / 2) / 160)) + 'px');
  };
  const closeMenu = event => { if (!panel.contains(event.target)) { menu.hidden = true; if (bubble.classList.contains('pta-usage-card')) bubble.classList.remove('pta-bubble-visible'); } };
  document.addEventListener('pointermove', follow, { passive: true });
  document.addEventListener('pointerdown', closeMenu);
  pet.addEventListener('contextmenu', event => { event.preventDefault(); if (menu.hidden) renderMenu(actions); menu.hidden = !menu.hidden; place(); });
  pet.addEventListener('dblclick', () => { bond++; options.saveBond?.(bond); react('happy', '好啦好啦，我也喜欢你'); });
  pet.addEventListener('keydown', event => {
    const step = event.shiftKey ? 24 : 8;
    const keys = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (keys[event.key]) { event.preventDefault(); position.right += keys[event.key][0]; position.bottom += keys[event.key][1]; place(); options.save?.(position); }
    if (event.key === 'Home') { event.preventDefault(); position = { right: 24, bottom: 24 }; place(); options.save?.(position); }
  });
  pet.title = '点击打开 · 右键互动（消耗体力 / 摸摸 / 休息）· 拖动搬家';
  place();
  const resize = () => place(); window.addEventListener('resize', resize);
  const observer = new MutationObserver(() => place());
  observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  return { react, place, beginActivity: (kind, details) => companion.begin(kind, details), setProgress: value => companion.setProgress(value), setTaskState(value) {
    if (taskState === value) return;
    const before = taskState; taskState = value; panel.dataset.petTask = value;
    pet.querySelector('span').textContent = value === 'working' ? '解题中' : value === 'complete' ? '完成啦' : '答题搭子';
    if (value === 'complete' && before === 'working') react('happy', `这轮忙完啦，耗时 ${companion.elapsed()}。主人伸伸懒腰，结果在面板里～\n${latestAiUsageText()}`);
    companion.setRunning(value === 'working');
  }, dispose() { aiUsageListeners.delete(showUsage); companion.clear(); clearInterval(watchTimer); observer.disconnect(); window.removeEventListener('resize', resize); document.removeEventListener('pointermove', follow); document.removeEventListener('pointerdown', closeMenu); clearTimeout(bubbleTimer); clearTimeout(reactionTimer); } };
}

function attachPanelView(panel, options = {}) {
  const windowEl = panel.querySelector('.pta-window');
  const rows = panel.querySelector('.pta-result-rows');
  const toggle = panel.querySelector('.pta-results-toggle');
  const results = panel.querySelector('.pta-results');
  const widthInput = panel.querySelector('.pta-size-width');
  const heightInput = panel.querySelector('.pta-size-height');
  const grip = panel.querySelector('.pta-resize-handle');
  let expanded = false, signature = '', disposed = false;
  let size = options.loadSize?.() || { width: 360, height: 590 };
  const clamp = (value, low, high) => Math.max(Math.min(low, high), Math.min(value, high));
  function applySize(save = false) {
    size.width = clamp(Number(size.width) || 360, 300, Math.max(180, innerWidth - 24));
    size.height = clamp(Number(size.height) || 590, 390, Math.max(200, innerHeight - 96));
    panel.style.setProperty('--panel-width', size.width + 'px');
    panel.style.setProperty('--panel-height', size.height + 'px');
    widthInput.value = Math.round(size.width);
    heightInput.value = Math.round(size.height);
    if (save) options.saveSize?.({ ...size });
  }
  function fold(collapsed) {
    panel.classList.toggle('pta-pet-only', collapsed);
    panel.querySelector('.pta-launcher').setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed && !expanded) rows.scrollTop = rows.scrollHeight;
    options.onFold?.(collapsed);
  }
  fold(options.startCollapsed !== false);
  panel.querySelector('.pta-launcher').onclick = () => fold(!panel.classList.contains('pta-pet-only'));
  panel.querySelector('.pta-minimize').onclick = () => fold(true);
  toggle.onclick = () => {
    expanded = !expanded;
    results.classList.toggle('pta-results-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? '收起结果 ▴' : '最近结果 · 查看全部 ▾';
    if (!expanded) rows.scrollTop = rows.scrollHeight;
  };
  widthInput.onchange = () => { size.width = widthInput.value; applySize(true); };
  heightInput.onchange = () => { size.height = heightInput.value; applySize(true); };
  panel.querySelector('.pta-size-reset').onclick = () => { size = { width: 360, height: 590 }; applySize(true); };
  let finishResize;
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, ...size };
    grip.setPointerCapture(event.pointerId);
    panel.classList.add('pta-resizing');
    const move = e => { size = { width: start.width - (e.clientX - start.x), height: start.height + e.clientY - start.y }; applySize(); };
    const end = e => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
      panel.classList.remove('pta-resizing'); applySize(true); finishResize = null;
    };
    finishResize = () => end(event);
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });
  const onViewportResize = () => applySize();
  window.addEventListener('resize', onViewportResize);
  applySize();
  return {
    fold,
    render(records = []) {
      if (disposed || !rows) return;
      const next = records.map(x => `${x.id}:${x.status}:${x.aiMetrics?.elapsedMs || 0}`).join('|');
      if (next === signature) return;
      signature = next;
      const oldTop = rows.scrollTop;
      const follow = !expanded || rows.scrollHeight - rows.clientHeight - oldTop < 30;
      rows.replaceChildren(...records.map(record => {
        const row = document.createElement('div'); row.className = 'pta-result-row';
        const name = document.createElement('span'); name.className = 'pta-result-name';
        name.textContent = record.title || record.id;
        const result = document.createElement('span'); result.className = 'pta-result-value';
        result.textContent = record.status === 'ACCEPTED' ? (record.score != null && record.maxScore != null && record.score < record.maxScore ? '未满分' : '通过') : record.status === 'SAVED_PENDING' ? '已保存，待判分' : record.status === 'EXISTING_SAVED' ? '已有内容，未改写' : record.status;
        const time = document.createElement('span'); time.className = 'pta-result-time';
        time.textContent = record.aiMetrics ? (record.aiMetrics.elapsedMs / 1000).toFixed(1) + 's' : '—';
        row.title = `${name.textContent} · ${result.textContent} · AI ${time.textContent}${record.status === 'EXISTING_SAVED' ? '\n检测到已有填空内容，未覆盖；本次未核验保存状态或正确性。需要重做时勾选“允许覆盖已有填空答案”。' : record.note ? '\n' + record.note : ''}`;
        row.append(name, result, time); return row;
      }));
      rows.scrollTop = follow ? rows.scrollHeight : oldTop;
      results.hidden = !records.length;
    },
    dispose() { disposed = true; finishResize?.(); window.removeEventListener('resize', onViewportResize); }
  };
}

(() => {
  'use strict';
  const ID = 'pta-direct-submit';
  const JOB_KEY = 'pta-dual-job-luna-v1';
  const DOCUMENT_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const TYPE = { 5: 'FILL_IN_THE_BLANK_FOR_PROGRAMMING', 6: 'CODE_COMPLETION', 7: 'PROGRAMMING' };
  const WAITING = new Set(['WAITING', 'RUNNING', 'JUDGING', 'PROGRAMMING_JUDGING']);
  const PET = '<svg viewBox="0 0 32 28" aria-hidden="true" shape-rendering="crispEdges"><g fill="#ca7958"><path d="M6 6h20v4h4v10h-4v4h-3v-4h-3v5h-3v-5h-3v5h-3v-5H8v4H5v-4H2V10h4z"/><path d="M2 8h3v5H0v-3h2zm25 0h3v2h2v3h-5z"/></g><path fill="#302a26" d="M10 10h3v5h-3zm9 0h3v5h-3z"/></svg>';
  let busy = false;
  let stop = false;
  let runEpoch = 0;
  let mode = 'fast';
  let ui;
  let petUI;
  let panelView;
  const problemCache = new Map();
  const activePtaRequests = new Set();
  function cancelPtaRequests() {
    for (const controller of activePtaRequests) controller.abort();
    activePtaRequests.clear();
  }
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function withPetActivity(kind, details, work) {
    const finish = petUI?.beginActivity?.(kind, details);
    try { return await work(); } finally { finish?.(); }
  }
  async function readQuestionImages(ctx, data, questionId, root) {
    let sources = PTA_FLOW.questionImageSources(data, location.href);
    if (root || context()?.id === questionId) {
      const displayed = [...(root || document).querySelectorAll('.rendered-markdown img')]
        .filter(image => image.complete && image.naturalWidth > 0 && image.getClientRects().length && !image.closest('.cm-content, button, [role="button"]'))
        .map(image => image.currentSrc || image.src).filter(Boolean);
      const rendered = [...new Set(displayed)];
      if (rendered.length && (!sources.length || rendered.length >= sources.length)) sources = rendered;
    }
    if (!sources.length) return [];
    return withPetActivity('images', {}, () => prepareQuestionImages(sources, () => stop || ctx.runEpoch !== runEpoch));
  }
  const context = () => {
    const m = location.pathname.match(/^\/problem-sets\/(\d+)\/exam(?:\/problems(?:\/type\/([567]))?)?\/?$/);
    if (!m) return null;
    return { set: m[1], type: Number(m[2] || 7), id: new URLSearchParams(location.search).get('problemSetProblemId') };
  };
  const loadJob = () => { try { return JSON.parse(sessionStorage.getItem(JOB_KEY)); } catch { return null; } };
  const saveJob = job => sessionStorage.setItem(JOB_KEY, JSON.stringify(job, (key, value) => key === 'attempts' ? value.map(({ status, submissionId, score, maxScore, round }) => ({ status, submissionId, score, maxScore, round })) : value));
  function check(ctx) {
    if (ctx.runEpoch != null && ctx.runEpoch !== runEpoch) throw new Error('旧任务已停止');
    if (stop) throw new Error('已暂停；不会执行后续写入或提交');
    if (context()?.set !== ctx.set) throw new Error('已切换题目集，任务暂停');
    if (ctx.scopeId && context()?.id !== ctx.scopeId) throw new Error('执行期间切题，已停止后续操作');
  }
  function status(text) {
    if (/自动修正|修正第|首次作答|^提交 \d+\n|DeepSeek 正在解答| · AI .*提交中/.test(text)) return;
    if (ui) ui.status.textContent = text;
  }
  function haltForAI(ctx, error) {
    if (ctx.runEpoch != null && ctx.runEpoch !== runEpoch) return;
    runEpoch++; stop = true; busy = false;
    cancelDeepSeekRequests(); cancelPtaRequests();
    const job = loadJob();
    if (job) { job.state = 'stopped'; job.phase = 'ready'; job.stopReason = 'AI_HTTP_' + error.aiStatus; saveJob(job); }
    const reason = error.aiProvider === 'chatgpt' ? error.message : error.aiStatus === 402 ? 'DeepSeek 余额不足（402）' : error.aiStatus === 401 ? 'DeepSeek 密钥无效或已失效（401）' : 'DeepSeek 账户没有调用权限（403）';
    status(reason + '，本轮任务已停止。不会继续请求、跳题或提交；恢复可用服务后再开始。');
    petUI?.setTaskState?.('idle'); updateProgress();
    petUI?.react?.('wave', `主人，${reason}，这轮先停下来啦。处理好设置后再叫我继续。`);
  }
  function trace() {}
  function updateProgress(job = loadJob()) {
    if (!ui) return;
    const running = busy || (job?.set === context()?.set && job?.state === 'running');
    ui.panel.querySelectorAll('.pta-single,.pta-all,.pta-existing,.pta-read,[data-mode]').forEach(button => { button.disabled = running; });
    ui.pause.disabled = !running;
    if (running) petUI?.setTaskState?.('working');
    if (!job || job.set !== context()?.set) { ui.progress.textContent = ''; ui.resume.hidden = true; petUI?.setTaskState?.(running ? 'working' : ui.singleRecords?.length ? 'complete' : 'idle'); return; }
    const n = PTA_FLOW.summary(job);
    petUI?.setProgress?.(job.state === 'running' ? { ...n, startedAt: job.startedAt } : { done: 0, total: 0 });
    ui.progress.textContent = `${job.state === 'running' ? '进行中' : job.state === 'complete' ? '已结束' : '已停止'} · ${n.done}/${n.total} 项\n通过 ${n.accepted} · 填空保存 ${n.saved} · 跳过已通过 ${n.skipped}`;
    panelView?.render(ui.singleRecords || job.records || []);
    petUI?.setTaskState?.(running ? 'working' : job.state === 'complete' ? 'complete' : 'idle');
    ui.resume.hidden = true;
    if (ui.repairLog && job.events?.length) ui.repairLog.textContent = job.events.join('\n');
  }
  async function api(ctx, path, options = {}) {
    check(ctx);
    const token = localStorage.getItem('x-lollipop') || document.cookie.match(/(?:^|;\s*)x-lollipop=([^;]+)/)?.[1] || '';
    const controller = new AbortController();
    activePtaRequests.add(controller);
    const timeout = setTimeout(() => controller.abort(), 30000);
    const finishActivity = options.method === 'POST' ? petUI?.beginActivity?.('submitting') : null;
    try {
      const response = await fetch('https://pintia.cn' + path, { ...options, signal: controller.signal, credentials: 'include', headers: {
        accept: 'application/json;charset=UTF-8', 'content-type': 'application/json;charset=UTF-8',
        'x-lollipop': token, 'x-marshmallow': ''
      } });
      const text = await response.text();
      check(ctx);
      let data; try { data = JSON.parse(text); } catch { data = text; }
      if (!response.ok) throw new Error(`PTA HTTP ${response.status}: ${data?.error?.message || data?.message || '请求失败'}`);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`PTA 请求超时（30 秒）：${path}`);
      throw error;
    } finally { clearTimeout(timeout); activePtaRequests.delete(controller); finishActivity?.(); }
  }
  async function exam(ctx) {
    const data = await api(ctx, `/api/problem-sets/${ctx.set}/exams`);
    if (!data?.exam?.id) throw new Error('未取得 exam ID');
    return data.exam.id;
  }
  function setPhase(job, phase) { if (job) { job.phase = phase; if (job.persist) job.persist(); else { saveJob(job); updateProgress(job); } } }
  function clearQuestionState(job) {
    for (const key of ['submissionId', 'program', 'round', 'errorCount', 'lastResult', 'failureHistory', 'difficultyNotice', 'restartNotice', 'questionKey']) delete job[key];
  }
  function attachDeferredTask(job, item) {
    const task = item?.task;
    if (!task?.deferred) return;
    Object.defineProperty(task, 'persist', { value: () => {
      if (job.mode === 'page') { job.phase = task.phase; job.submissionId = task.submissionId; }
      saveJob(job); updateProgress(job);
    }, configurable: true, enumerable: false });
    Object.defineProperty(task, 'trace', { value: text => { job.events = [...(job.events || []), text].slice(-100); saveJob(job); updateProgress(job); }, configurable: true, enumerable: false });
  }
  async function poll(ctx, examId, id, maxScore, title, questionId) {
    return withPetActivity('judging', { title }, async () => {
    for (let i = 0; i < 30; i++) {
      check(ctx);
      const data = await api(ctx, `/api/exams/${examId}/submissions/${id}`);
      const details = data?.submission?.details;
      const returnedIds = [data?.submission?.problemSetProblemId, ...(Array.isArray(details) ? details.map(detail => detail.problemSetProblemId) : [])].filter(value => value != null);
      if (questionId && returnedIds.length && !returnedIds.some(value => String(value) === questionId)) throw new Error('判题回执的题目 ID 不一致，已停止，避免把其他题的错误用于修正');
      const result = data?.submission?.status;
      status(`提交 ${id}\n${result || '等待判题'}`);
      if (result && !WAITING.has(result)) return { status: result, submissionId: id, score: data.submission.score, maxScore, feedback: PTA_FLOW.judgeFeedback(data.submission) };
      await delay(5000);
    }
    throw new Error(`提交 ${id} 尚未得到最终判题，请先核对提交列表`);
    });
  }
  async function codeFor(ctx, item) {
    const cacheKey = `${ctx.set}/${item.id}`;
    const data = problemCache.get(cacheKey) || await api(ctx, `/api/problem-sets/${ctx.set}/exam-problems/${item.id}`);
    const p = data?.problemSetProblem;
    if (p?.id != null && String(p.id) !== item.id) throw new Error('返回的题目 ID 与当前任务不一致，已停止生成');
    problemCache.set(cacheKey, data);
    item.title ||= p?.title;
    item.maxScore = p?.score ?? item.maxScore;
    let text = PTA_FLOW.completeProblem(data);
    if (context()?.id === item.id && mode === 'page') {
      const heading = [...document.querySelectorAll('h1,h2,h3,h4')].find(x => /函数接口定义|裁判测试程序/.test(x.textContent));
      let section = heading;
      while (section?.parentElement && !section.parentElement.querySelector('.cm-content[contenteditable="true"]') && section.parentElement !== document.body) section = section.parentElement;
      if (heading && section) text += '\n当前页面完整题面（含接口与裁判示例）：\n' + section.innerText;
    }
    if (!text?.trim()) throw new Error('未取得完整题面');
    const images = await readQuestionImages(ctx, data, item.id);
    check(ctx);
    status(`${activeAiLabel()} 正在解答 ${item.title || item.id}…`);
    const result = await withPetActivity('ai', { title: item.title, repair: !!item.repair, thinking: selectedAiProvider() !== 'chatgpt' && item.repair?.errorCount >= 5, restart: item.repair?.strategy === 'restart', imageCount: images.length }, () => generateWithDeepSeek({ type: 'generate-code', shouldStop: () => stop || ctx.runEpoch !== runEpoch, onFatal: error => haltForAI(ctx, error), problemSetId: ctx.set, questionId: item.id, origin: item.requestOrigin, deliveryMode: item.deliveryMode, compiler: item.compiler, kind: TYPE[item.type], language: /GXX|CLANGXX/.test(item.compiler) ? 'C++17' : 'C99', problem: text, repair: item.repair, images }));
    item.aiMetrics = result.metrics;
    check(ctx);
    if (!result?.code?.trim()) throw new Error('模型未返回代码');
    if (ui && context()?.id === item.id) ui.code.value = result.code;
    return result.code;
  }
  const editor = () => document.querySelector('.cm-content[contenteditable="true"]');
  const editorText = () => [...(editor()?.querySelectorAll('.cm-line') || [])].map(x => x.textContent).join('\n');
  async function simulateInput(ctx, item, program) {
    if (context()?.id !== item.id || context()?.type !== item.type) throw new Error('当前题目与任务不符');
    const target = editor();
    if (!target) throw new Error('未找到可编辑代码框');
    target.focus();
    const range = document.createRange(); range.selectNodeContents(target);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    let prefix = '';
    for (let i = 0; i < program.length; i += 120) {
      check(ctx);
      if (context()?.id !== item.id) throw new Error('输入期间题目发生变化');
      const chunk = program.slice(i, i + 120);
      if (!document.execCommand('insertText', false, chunk)) throw new Error('浏览器未接受模拟编辑输入');
      prefix += chunk;
      await delay(0);
      if (editorText() !== prefix) throw new Error('模拟输入读回不一致，停止提交并保留现场');
      status(`模拟输入 ${prefix.length}/${program.length} 字符`);
    }
  }
  async function pageSubmit(ctx, job) {
    return withPetActivity('page', {}, async () => {
    check(ctx);
    const button = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '提交本题作答' && x.getClientRects().length && !x.disabled);
    if (!button) throw new Error('未找到 PTA 原生提交按钮');
    const modal = () => [...document.querySelectorAll('.pc-modal-container,[role="dialog"]')].find(x => x.getClientRects().length);
    const oldDialog = modal();
    if (oldDialog) throw new Error('页面已有弹窗，请先处理后再运行');
    setPhase(job, 'submitting');
    button.click();
    let confirmed = false;
    for (let i = 0; i < 60; i++) {
      check(ctx);
      const dialog = modal();
      const text = dialog?.innerText || '';
      const result = PTA_FLOW.overallResult(text);
      if (result) {
        const close = [...dialog.querySelectorAll('button')].find(x => /^(确认|确定|关闭)$/.test(x.textContent.trim()));
        close?.click();
        return { status: result, ...PTA_FLOW.scoreFromText(text), feedback: text.slice(text.indexOf('状态'), text.indexOf('提交代码') > 0 ? text.indexOf('提交代码') : undefined) + '\n' + (text.split('编译器输出')[1] || '') };
      }
      if (dialog && !confirmed && /确认.*提交|确定.*提交/.test(text)) {
        const buttons = [...dialog.querySelectorAll('button')].filter(x => /^(确认|确定|提交|确认提交)$/.test(x.textContent.trim()));
        if (buttons.length !== 1) throw new Error('无法识别提交确认按钮，请手动处理');
        check(ctx); buttons[0].click(); confirmed = true;
      }
      await delay(1000);
    }
    throw new Error('页面提交结果尚未核实；先检查 PTA 提交列表，勿重复提交');
    });
  }
  async function generateSafe(ctx, item) {
    for (let attempt = 0;; attempt++) {
      check(ctx);
      try { return await codeFor(ctx, item); }
      catch (error) {
        check(ctx);
        if (error.imageError) { petUI?.react?.('wave', '主人，题图没能完整读到，我先停住这道题，免得看漏信息乱答。'); throw error; }
        if (error.noRetry || selectedAiProvider() === 'chatgpt') throw error;
        if (!/HTTP (429|5\d\d)|网络|超时/.test(error.message)) throw error;
        status('AI 请求暂未完成，自动重试中…');
        const waitMs = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
        const reason = /HTTP 429/.test(error.message) ? 'rate' : /HTTP 5\d\d/.test(error.message) ? 'service' : /超时/.test(error.message) ? 'timeout' : 'network';
        await withPetActivity('retry', { reason, source: /^PTA/.test(error.message) ? 'PTA' : 'AI', seconds: waitMs / 1000 }, () => delay(waitMs));
      }
    }
  }
  function selectedCompilerLabel() {
    for (const input of document.querySelectorAll('[role="combobox"]')) {
      const control = input.closest('.select__control') || input.closest('[class*="-control"]') || input.parentElement?.parentElement;
      const label = control?.textContent?.trim() || '';
      if (PTA_FLOW.compilerFromLabel(label)) return label;
    }
    return '';
  }
  function compilerFor(item) {
    return PTA_FLOW.resolveCompiler({ configured: GM_getValue('compilerPreference', 'auto'), title: item.title || '', pageTitle: document.title || '', label: context()?.id === item.id ? selectedCompilerLabel() : '' });
  }
  async function runCode(ctx, item, selectedMode, job, existing, deferAfter = Infinity) {
    if (selectedAiProvider() === 'chatgpt') deferAfter = Infinity;
    if (job) {
      const key = `${ctx.set}/${item.type}/${item.id}`;
      if (job.questionKey && job.questionKey !== key) throw new Error('修正状态属于另一道题，已停止，避免沿用其他题的代码');
      job.questionKey = key;
    }
    item.requestOrigin = job ? 'batch' : 'single';
    item.deliveryMode = selectedMode;
    item.compiler ||= compilerFor(item);
    const pendingId = job?.phase === 'judging' ? job.submissionId : null;
    const pendingResult = job?.lastResult || null;
    let recover = !!(pendingId || pendingResult);
    if (!recover) setPhase(job, 'generating');
    const initial = existing ?? job?.program ?? await generateSafe(ctx, item);
    let attemptedCode = initial;
    let failureHistory = job?.failureHistory || [];
    if (item.aiMetrics) status(`${item.title || item.id} · AI ${(item.aiMetrics.elapsedMs / 1000).toFixed(1)} 秒 · ${item.compiler} · 提交中…`);
    const examId = job?.examId || (selectedMode === 'fast' || pendingId ? await exam(ctx) : null);
    const limit = selectedAiProvider() === 'chatgpt' ? lunaRepairLimit() : Infinity;

    const result = await PTA_FLOW.solveWithRepair({
      initial, startRound: job?.round || 0, startFailures: job?.errorCount || 0, limit, deferAfter,
      onVerdict: (result, round) => {
        if (!PTA_FLOW.fullScore(result)) {
          const entry = { round, status: result.status, score: result.score, maxScore: result.maxScore,
            code: PTA_FLOW.clipContext(attemptedCode, 2500), feedback: PTA_FLOW.clipContext(result.feedback, 1500) };
          failureHistory = failureHistory.filter(previous => previous.round !== round).concat(entry).slice(-3);
          if (job) job.failureHistory = failureHistory;
        }
        if (job) job.errorCount = result.errorCount;
        const tracker = job || item;
        if (selectedAiProvider() !== 'chatgpt' && result.errorCount >= 5 && !tracker.difficultyNotice) {
          tracker.difficultyNotice = true;
          petUI?.react?.('wave', '这道题太难啦，主人，稍后一起处理');
          status('这道题先记下啦；我继续处理其他题，之后再回来。');
          if (job?.persist) job.persist();
        }
      },
      check: () => check(ctx),
      onAttempt: (program, round) => { attemptedCode = program; if (job) { job.program = program; job.round = round; if (job.persist) job.persist(); else saveJob(job); } if (ui && context()?.id === item.id) ui.code.value = program; status(`${item.title || item.id} · ${round ? '自动修正第 ' + round + ' 轮' : '首次作答'}`); },
      submit: async program => {
        check(ctx);
        if (recover) { recover = false; return pendingResult || poll(ctx, examId, pendingId, item.maxScore, item.title, item.id); }
        if (job) delete job.lastResult;
        if (selectedMode === 'page') {
          setPhase(job, 'inputting');
          await withPetActivity('inputting', { title: item.title }, () => simulateInput(ctx, item, program));
          await delay(700);
          if (editorText() !== program) throw new Error('提交前代码已变化，已阻止提交');
          editor()?.blur();
          await delay(300);
          return pageSubmit(ctx, job);
        }
        setPhase(job, 'submitting');
        // Do not retry a POST whose receipt is unknown.
        const data = await api(ctx, `/api/exams/${examId}/exam-submissions`, { method: 'POST', body: JSON.stringify(PTA_FLOW.payload(item, program)) });
        const id = typeof data === 'string' ? data : data?.submissionId;
        if (!id) throw new Error('PTA 响应缺少提交 ID，请核对提交列表');
        if (job) { job.submissionId = id; setPhase(job, 'judging'); }
        trace(job, item, `已提交 ${id}，等待判题`);
        return poll(ctx, examId, id, item.maxScore, item.title, item.id);
      },
      repair: async (program, result, round, context = {}) => {
        if (job) job.lastResult = result;
        trace(job, item, `正在请求 ${activeAiLabel()} 修正第 ${round}/${limit} 轮；附上原代码及 ${result.feedback?.length || 0} 字符判题反馈`);
        setPhase(job, 'generating');
        status(`${item.title || item.id} · ${result.status}，自动修正第 ${round} 轮…`);
        sessionStorage.setItem('pta-last-failure', JSON.stringify({ questionId: item.id, compiler: item.compiler, code: program, result }));
        const stagnant = ['WRONG_ANSWER', 'PARTIAL_ACCEPTED', 'ACCEPTED'].includes(result.status) && failureHistory.length >= 3 && failureHistory.every(entry => entry.status === result.status && entry.score === result.score && entry.feedback === PTA_FLOW.clipContext(result.feedback, 1500));
        const restart = stagnant || context.repeatedOutputs >= 2 || (result.errorCount > 0 && result.errorCount % 5 === 0);
        const tracker = job || item;
        if (restart && !tracker.restartNotice) {
          tracker.restartNotice = true;
          petUI?.react?.('wave', '这条思路绕圈圈啦，主人。我换个起点，重新读题再解一次～');
        }
        const repaired = { ...item, repair: { ...result, code: program, history: failureHistory.slice(0, -1), strategy: restart ? 'restart' : 'repair' } };
        await delay(500);
        check(ctx);
        const code = await generateSafe(ctx, repaired);
        if (repaired.aiMetrics) item.aiMetrics = { ...repaired.aiMetrics, elapsedMs: (item.aiMetrics?.elapsedMs || 0) + repaired.aiMetrics.elapsedMs };
        return code;
      }
    });
    trace(job, item, PTA_FLOW.fullScore(result) ? `已通过，修正后重交 ${result.repairs || 0} 次` : `未满分，停止原因：${result.repairStopped || result.status}`);
    if (PTA_FLOW.fullScore(result) && job) delete job.failureHistory;
    return { ...result, aiMetrics: item.aiMetrics, compiler: item.compiler };
  }
  function fillGroups() {
    return [...document.querySelectorAll('div[id]')].filter(x => /^\d{10,}$/.test(x.id) && x.querySelector('.cm-content input'));
  }
  function fillTemplate(group) {
    const lines = [...group.querySelectorAll('.cm-content .cm-line')].map(line => {
      const copy = line.cloneNode(true);
      for (const input of copy.querySelectorAll('input')) (input.closest('.inline-flex') || input).replaceWith(document.createTextNode('[[空格]]'));
      return copy.textContent;
    });
    return group.innerText + '\n完整框架（按标记顺序逐空回答）：\n' + lines.join('\n');
  }
  async function runFill(ctx, ids, job) {
    let groups = fillGroups().filter(x => !ids || ids.includes(x.id));
    if (!groups.length) throw new Error('未找到要处理的填空题');
    if (ids && ids.some(id => !groups.some(group => group.id === id))) throw new Error('本页未加载全部目标填空题，已停止，避免漏题');
    const expected = {};
    for (const group of groups) {
      const inputs = [...group.querySelectorAll('.cm-content input')];
      if (inputs.every(x => x.value.trim()) && !ui.overwrite.checked) continue;
      if (inputs.some(x => x.value.trim()) && !ui.overwrite.checked) throw new Error('填空已有部分答案，请检查或允许覆盖');
      setPhase(job, 'generating');
      let images = [];
      if ([...group.querySelectorAll('img,svg')].some(image => !image.closest('.cm-content, .inline-flex, button, [role="button"]'))) {
        const cacheKey = `${ctx.set}/${group.id}`;
        const data = problemCache.get(cacheKey) || await api(ctx, `/api/problem-sets/${ctx.set}/exam-problems/${group.id}`);
        problemCache.set(cacheKey, data);
        images = await readQuestionImages(ctx, data, group.id, group);
      }
      const response = await withPetActivity('ai', { title: '程序填空', imageCount: images.length }, () => generateWithDeepSeek({ type: 'generate-fill', shouldStop: () => stop || ctx.runEpoch !== runEpoch, onFatal: error => haltForAI(ctx, error), problem: fillTemplate(group), blankCount: inputs.length, images }));
      check(ctx);
      expected[group.id] = response.answers;
    }
    if (!Object.keys(expected).length) return { status: 'EXISTING_SAVED', note: '已有答案，跳过覆盖；未重新核验保存' };
    setPhase(job, 'inputting');
    for (const [id, answers] of Object.entries(expected)) {
      for (let i = 0; i < answers.length; i++) {
        check(ctx);
        const input = document.getElementById(id)?.querySelectorAll('.cm-content input')[i];
        if (!input) throw new Error('填空控件已变化');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, answers[i]);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(0);
      }
    }
    for (const [id, answers] of Object.entries(expected)) {
      const values = [...document.getElementById(id).querySelectorAll('.cm-content input')].map(x => x.value);
      if (JSON.stringify(values) !== JSON.stringify(answers)) throw new Error('填空整体读回不一致，未保存');
    }
    check(ctx);
    const save = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '保存' && !x.disabled);
    if (!save) throw new Error('未找到保存按钮');
    if (job) { job.fillExpected = expected; job.fillDocument = DOCUMENT_ID; setPhase(job, 'verifying-fill'); }
    else sessionStorage.setItem('pta-single-fill-verify', JSON.stringify({ set: ctx.set, expected }));
    save.click();
    await delay(1800);
    if (stop) throw new Error('已暂停；填空已触发保存，刷新核验待完成');
    location.reload();
    return null;
  }
  async function collect(ctx) {
    const examId = await exam(ctx);
    const statusData = await api(ctx, `/api/exams/${examId}/problem-sets/${ctx.set}/problem-status`);
    if (!Array.isArray(statusData.problemStatus)) throw new Error('未取得个人题目状态，停止题集自动化');
    const accepted = new Set(statusData.problemStatus.filter(x => x.problemSubmissionStatus === 'PROBLEM_ACCEPTED').map(x => String(x.id)));
    const items = []; let skipped = 0;
    for (const type of [6, 7, 5]) {
      let page = 0, total = Infinity, count = 0;
      const fillIds = [];
      while (count < total) {
        const data = await api(ctx, `/api/problem-sets/${ctx.set}/exam-problem-list?exam_id=${examId}&problem_type=${TYPE[type]}&page=${page}&limit=100`);
        if (!Array.isArray(data.problemSetProblems)) throw new Error(`题型 ${type} 列表结构不兼容`);
        total = Number(data.total ?? data.problemSetProblems.length);
        if (!data.problemSetProblems.length) { if (count < total) throw new Error('题目列表分页缺失'); break; }
        for (const p of data.problemSetProblems) {
          const id = String(p.id || '');
          if (!/^\d+$/.test(id)) throw new Error('题目 ID 格式不兼容');
          if (accepted.has(id)) { skipped++; continue; }
          if (type === 5) fillIds.push(id);
          else items.push({ type, id, title: p.title || id, compiler: compilerFor({ id, title: p.title || '' }) });
        }
        count += data.problemSetProblems.length; page++;
        if (page > 100) throw new Error('分页异常，已停止');
      }
      if (fillIds.length) items.push({ type: 5, id: fillIds[0], ids: fillIds, title: `程序填空（${fillIds.length} 题）` });
    }
    return { version: 6, set: ctx.set, examId, mode, items, skipped, index: 0, records: [], state: 'running', phase: 'ready', startedAt: Date.now() };
  }
  function targetUrl(job, item) {
    return `https://pintia.cn/problem-sets/${job.set}/exam/problems/type/${item.type}?problemSetProblemId=${item.id}`;
  }
  // lmengx/fuckpta: start one independent pipeline every 500 ms.
  async function processFastBatch(ctx, job) {
    busy = true; stop = false; ctx.runEpoch = runEpoch;
    const start = job.index;
    const tasks = [];
    for (let i = start; i < job.items.length && job.items[i].type !== 5; i++) tasks.push(job.items[i]);
    let segmentEnd = start + tasks.length;
    job.phase = 'parallel'; job.parallelDocument = DOCUMENT_ID;
    const persist = () => { if (ctx.runEpoch !== runEpoch) return; if (stop) job.state = 'paused'; saveJob(job); updateProgress(job); };
    persist();
    try {
      await PTA_FLOW.staggered(tasks, async item => {
        if (job.records.some(record => record.id === item.id)) return;
        const task = item.task || (item.task = { examId: job.examId, phase: 'ready' });
        Object.defineProperty(task, 'persist', { value: persist, configurable: true, enumerable: false });
        Object.defineProperty(task, 'trace', { value: text => { job.events = [...(job.events || []), text].slice(-100); persist(); }, configurable: true, enumerable: false });
        try {
          let result;
          if (task.phase === 'submitting') throw new Error('提交回执不明，请先核对 PTA 提交列表');
          else {
            if (task.deferred) {
              status(`其他题已处理，正在用思考模式继续：${item.title || item.id}`);
              petUI?.react?.('wave', '其他题忙完啦，我们回来攻克这道难题');
            }
            result = await runCode(ctx, item, 'fast', task, undefined, task.deferred ? Infinity : 5);
          }
          check(ctx);
          if (result.deferred) {
            task.deferred = true;
            task.lastResult = result;
            task.phase = 'ready';
            trace(task, item, '连续五次未通过，已暂缓到当前题集末尾，届时启用思考模式继续修正');
            status('这道题太难啦，主人，先放到最后；我正在继续其他题。');
            petUI?.react?.('wave', '这道题太难啦，主人，稍后一起处理');
            return;
          }
          job.records.push({ id: item.id, title: item.title, ...result });
          delete task.deferred; delete task.difficultyNotice;
          task.phase = 'done';
          delete task.program; delete task.lastResult;
        } catch (error) {
          if (ctx.runEpoch !== runEpoch) return;
          task.error = error.message;
          trace(task, item, '暂停原因：' + error.message);
          status(item.title + '：' + error.message);
        } finally { persist(); }
      }, { interval: 500, concurrency: selectedAiProvider() === 'chatgpt' ? 1 : 2, cancelled: () => stop || ctx.runEpoch !== runEpoch });
      if (ctx.runEpoch !== runEpoch) return;
      const deferred = tasks.filter(item => item.task?.deferred);
      const allHandled = tasks.every(item => job.records.some(record => record.id === item.id) || item.task?.deferred);
      if (deferred.length && allHandled && !stop) {
        const prefix = job.items.slice(0, start);
        const tail = job.items.slice(start + tasks.length);
        const deferredSet = new Set(deferred);
        const regular = tasks.filter(item => !deferredSet.has(item));
        job.items = prefix.concat(regular, tail, deferred);
        job.index = start + regular.length;
        segmentEnd = job.index;
        status('这道题太难啦，主人，先放到整套题最后；我会继续其他题，之后开启思考再处理。');
        petUI?.react?.('wave', '先完成剩下的题，最后一起攻克难题');
      }
      while (job.index < segmentEnd && job.records.some(record => record.id === job.items[job.index].id)) job.index++;
      job.phase = 'ready';
      if (stop || job.index < segmentEnd) job.state = 'paused';
      else if (job.index === job.items.length) job.state = 'complete';
      status(job.state === 'complete' ? '并行队列结束，请查看通过数和各题判题结果。' : job.state === 'paused' ? '队列已暂停；已取得提交 ID 的题目可继续核验。' : job.items[job.index]?.type === 5 ? '其他编程题已处理，继续程序填空；之后再处理难题。' : '当前批次结束，继续处理队尾题目。');
      persist();
    } finally { if (ctx.runEpoch === runEpoch) { busy = false; updateProgress(job); } }
  }
  async function processJob() {
    const job = loadJob(); const ctx = context();
    if (ctx) ctx.runEpoch = runEpoch;
    if (busy || !job || job.set !== ctx?.set || job.state !== 'running') return;
    if (job.mode === 'page') attachDeferredTask(job, job.items[job.index]);
    if (job.mode === 'fast' && job.phase === 'parallel') {
      job.state = 'paused'; job.phase = 'ready'; saveJob(job); status('并行任务被刷新中断，点击继续核验已知提交；回执不明的题目不会重发。'); updateProgress(job); return;
    }
    if (job.mode === 'fast' && job.phase === 'ready' && job.items[job.index]?.type !== 5 && job.index < job.items.length) {
      await processFastBatch(ctx, job); return;
    }
    if (job.phase === 'judging' && job.submissionId) {
      busy = true;
      try {
        const currentItem = job.items[job.index];
        const result = await runCode(ctx, currentItem, job.mode, currentItem.task?.deferred ? currentItem.task : job);
        job.records.push({ id: job.items[job.index].id, ...result }); job.index++; job.phase = 'ready'; clearQuestionState(job);
        if (PTA_FLOW.fullScore(result)) delete currentItem.task;
        if (!PTA_FLOW.fullScore(result)) job.state = 'paused';
        saveJob(job); updateProgress(job);
      } catch (error) { if (ctx.runEpoch !== runEpoch) return; job.state = 'paused'; saveJob(job); status(error.message); updateProgress(job); }
      finally { if (ctx.runEpoch === runEpoch) { busy = false; updateProgress(); } }
      return;
    }
    if (job.phase === 'verifying-fill') {
      if (job.fillDocument === DOCUMENT_ID) return;
      if (!fillGroups().length) return;
      const good = Object.entries(job.fillExpected || {}).every(([id, values]) => JSON.stringify([...document.getElementById(id)?.querySelectorAll('.cm-content input') || []].map(x => x.value)) === JSON.stringify(values));
      if (!good) { job.state = 'paused'; saveJob(job); status('填空刷新读回不一致，任务暂停'); updateProgress(job); return; }
      job.records.push({ id: job.items[job.index].id, status: 'SAVED_PENDING' }); job.index++; job.phase = 'ready'; delete job.fillExpected; saveJob(job);
    }
    if (job.phase === 'generating' && (job.lastResult || job.items[job.index]?.task?.lastResult)) job.phase = 'ready';
    const action = PTA_FLOW.nextAction(job);
    if (action === 'uncertain') { job.state = 'paused'; saveJob(job); status('上次操作中断，结果不确定。请核对 PTA 提交列表；不会自动重发。'); updateProgress(job); return; }
    if (action === 'complete') { job.state = 'complete'; saveJob(job); status('题集队列已结束。代码判题与填空待判状态见进度。'); updateProgress(job); return; }
    const item = job.items[job.index];
    if ((job.mode === 'page' || item.type === 5) && (ctx.type !== item.type || ctx.id !== item.id)) {
      saveJob(job); location.assign(targetUrl(job, item)); return;
    }
    if (job.mode === 'page' && item.type !== 5 && !editor()) return;
    if (item.type === 5 && !fillGroups().length) return;
    if (item.task?.deferred) {
      attachDeferredTask(job, item);
      status(`其他题已处理，正在用思考模式继续：${item.title || item.id}`);
      petUI?.react?.('wave', '其他题忙完啦，我们回来攻克这道难题');
    }
    busy = true; stop = false; updateProgress(job);
    try {
      const result = item.type === 5 ? await runFill(ctx, item.ids, job) : await runCode(ctx, item, job.mode, item.task?.deferred ? item.task : job, undefined, job.mode === 'page' && !item.task?.deferred ? 5 : Infinity);
      if (!result) return;
      check(ctx);
      if (result.deferred) {
        const task = { examId: job.examId, deferred: true, phase: 'ready', lastResult: result };
        for (const key of ['program', 'round', 'errorCount', 'failureHistory', 'questionKey', 'restartNotice', 'difficultyNotice']) if (job[key] !== undefined) task[key] = job[key];
        item.task = task;
        job.items.splice(job.index, 1); job.items.push(item);
        clearQuestionState(job); job.phase = 'ready';
        saveJob(job); updateProgress(job);
        status('这道题先移到整套题最后；完成其他题和填空后，开启思考再处理。');
        return;
      }
      job.records.push({ id: item.id, ...result }); job.index++; job.phase = 'ready'; clearQuestionState(job);
      if (item.task) { if (PTA_FLOW.fullScore(result)) delete item.task; else { delete item.task.deferred; delete item.task.difficultyNotice; delete item.task.errorCount; delete item.task.error; } }
      if (!PTA_FLOW.fullScore(result) && result.status !== 'EXISTING_SAVED') { job.state = 'paused'; status(`判题 ${result.status}，任务已暂停`); }
      saveJob(job); updateProgress(job);
    } catch (error) {
      if (ctx.runEpoch !== runEpoch) return;
      const current = loadJob() || job; current.state = 'paused'; saveJob(current); status(error.message); updateProgress(current);
    } finally { if (ctx.runEpoch === runEpoch) { busy = false; updateProgress(); } }
  }
  async function single(existing) {
    if (busy || loadJob()?.state === 'running') return;
    const ctx = context();
    if (!ctx) { status('请回到 PTA 题目页面'); return; }
    ctx.scopeId = ctx.id; ctx.runEpoch = runEpoch;
    if (!ctx.id) { status('请先打开一道题目'); return; }
    delete ui.singleRecords;
    busy = true; stop = false;
    status(ctx.type === 5 ? '正在读取本题填空内容…' : '正在读取题目并连接 AI…');
    updateProgress();
    try {
      const result = ctx.type === 5 ? await runFill(ctx, [ctx.id]) : await runCode(ctx, ctx, mode, null, existing);
      if (result) { petUI?.setTaskState?.('complete'); ui.singleRecords = [{ id: ctx.id, title: document.title.split(' - ')[0], ...result }]; panelView?.render(ui.singleRecords); status(result.note || `本题结果：${result.status}${result.aiMetrics ? ' · AI ' + (result.aiMetrics.elapsedMs / 1000).toFixed(1) + 's' : ''}`); }
    } catch (error) { if (ctx.runEpoch === runEpoch) status(error.message); }
    finally { if (ctx.runEpoch === runEpoch) { busy = false; updateProgress(); } }
  }
  function mount() {
    const ctx = context();
    if (!ctx) { panelView?.dispose(); petUI?.dispose(); document.getElementById(ID)?.remove(); ui = null; return; }
    const keepOpen = ui?.panel.dataset.set === ctx.set && !ui.panel.classList.contains('pta-pet-only');
    panelView?.dispose(); petUI?.dispose();
    document.getElementById(ID)?.remove();
    const panel = document.createElement('section'); panel.id = ID; panel.dataset.set = ctx.set;
    panel.innerHTML = `<div class="pta-window"><header class="pta-head"><span class="pta-mark pta-crab">${PET}</span><div class="pta-heading"><strong>答题搭子</strong><small>PTA · AI · v0.11.1</small></div><button class="pta-fold pta-settings" aria-label="解题模型设置">⚙</button><button class="pta-fold pta-minimize" aria-label="收起为桌宠">−</button></header><div class="pta-body"><div class="pta-info"></div><div class="pta-modes" role="group" aria-label="答题模式"><button class="pta-mode" data-mode="fast" aria-pressed="true">快速提交</button><button class="pta-mode" data-mode="page" aria-pressed="false">模拟输入</button></div><div class="pta-description"></div><button class="pta-primary pta-single"><span>完成本题</span><span>↗</span></button><button class="pta-secondary pta-all">一键完成整个题目集</button><div class="pta-job-progress" role="status"></div><div class="pta-results" hidden><button class="pta-results-toggle" aria-expanded="false">最近结果 · 查看全部 ▾</button><div class="pta-result-rows" aria-label="题目结果"></div></div><div class="pta-tools"><button class="pta-secondary pta-pause" disabled>停止任务</button><button class="pta-secondary pta-resume" hidden>继续任务</button></div><label class="pta-check"><input type="checkbox" class="pta-overwrite">允许覆盖已有填空答案</label><details class="pta-details"><summary>查看与编辑代码</summary><textarea aria-label="待提交代码" spellcheck="false"></textarea><div class="pta-tools"><button class="pta-secondary pta-read">读取编辑器</button><button class="pta-secondary pta-existing">提交这段代码</button></div></details><div class="pta-status" role="status" aria-live="polite"></div></div><footer class="pta-footer"><span class="pta-live">${activeAiLabel()}</span><details class="pta-size"><summary>尺寸</summary><div class="pta-size-controls"><label>宽<input class="pta-size-width" type="number" aria-label="浮窗宽度" step="10"></label><label>高<input class="pta-size-height" type="number" aria-label="浮窗高度" step="10"></label><button class="pta-size-reset">重置</button></div></footer><button class="pta-resize-handle" aria-label="拖动调整浮窗大小" title="拖动调整大小">◺</button></div><button class="pta-launcher" aria-label="打开答题搭子" aria-expanded="true">${PET}<span>答题搭子</span></button>`;
    document.body.append(panel);
    const q = s => panel.querySelector(s);
    ui = { panel, repairLog: q('.pta-repair-log'), status: q('.pta-status'), progress: q('.pta-job-progress'), code: q('textarea'), overwrite: q('.pta-overwrite'), pause: q('.pta-pause'), resume: q('.pta-resume') };
    q('.pta-info').textContent = document.title.split(' - ')[0];
    ui.code.value = '';
    const select = m => { mode = m; panel.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m))); q('.pta-description').textContent = m === 'fast' ? (selectedAiProvider() === 'chatgpt' ? `${activeAiLabel()} · 每题最多修正 ${lunaRepairLimit()} 次。` : '最多两题并行，启动间隔 0.5 秒；读取题图，未满分自动修正。') : '分段模拟编辑输入，读回一致后通过页面提交。'; q('.pta-single span').textContent = m === 'fast' ? '完成本题' : '模拟输入本题'; q('.pta-all').textContent = m === 'fast' ? '一键完成整个题目集' : '自动模拟输入整个题目集'; };
    select(loadJob()?.mode || mode);
    panel.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (!busy && loadJob()?.state !== 'running') select(b.dataset.mode); });
    q('.pta-settings').onclick = configureDeepSeek;
    panelView = attachPanelView(panel, { startCollapsed: !keepOpen, loadSize: () => GM_getValue('panelSize', null), saveSize: value => GM_setValue('panelSize', value), onFold: () => petUI?.place() });
    petUI = attachPet(panel, { load: () => GM_getValue('petPosition', null), save: value => GM_setValue('petPosition', value), loadBond: () => GM_getValue('petBond', 0), saveBond: value => GM_setValue('petBond', value) });
    q('.pta-single').onclick = () => single();
    q('.pta-existing').onclick = () => single(ui.code.value);
    q('.pta-read').onclick = () => { ui.code.value = editorText(); };
    q('.pta-all').onclick = async () => {
      if (busy || loadJob()?.state === 'running') return;
      delete ui.singleRecords;
      const ctx = context();
      runEpoch++; ctx.runEpoch = runEpoch;
      busy = true; stop = false; status('正在盘点题目集和个人通过状态…');
      updateProgress();
      try { const job = await withPetActivity('scanning', {}, () => collect(ctx)); check(ctx); saveJob(job); updateProgress(job); status(`已建立 ${job.items.length} 项队列，开始执行`); }
      catch (error) { if (ctx.runEpoch === runEpoch) status(error.message); }
      finally { if (ctx.runEpoch === runEpoch) { busy = false; updateProgress(); } }
    };
    ui.pause.onclick = () => {
      runEpoch++; stop = true; busy = false;
      cancelDeepSeekRequests(); cancelPtaRequests();
      const job = loadJob();
      if (job) { job.state = 'stopped'; job.phase = 'ready'; saveJob(job); }
      updateProgress(); status('已停止。再次开始时自动扫描未满分题。');
      petUI?.react?.('wave', '收到，先歇歇～下次开始会重新看看哪些题还没满分。');
    };
    ui.resume.onclick = () => q('.pta-all').click();
    updateProgress();
    const singleVerify = sessionStorage.getItem('pta-single-fill-verify');
    if (singleVerify && fillGroups().length) {
      const saved = JSON.parse(singleVerify); sessionStorage.removeItem('pta-single-fill-verify');
      const good = saved.set === ctx.set && Object.entries(saved.expected).every(([id, values]) => JSON.stringify([...document.getElementById(id)?.querySelectorAll('.cm-content input') || []].map(x => x.value)) === JSON.stringify(values));
      status(good ? '填空刷新后读回一致，已保存待正式判分。' : '填空刷新核验不一致，请检查页面。');
    }
  }
  const legacy = loadJob();
  if (legacy && legacy.version !== 6) { legacy.state = 'stopped'; legacy.phase = 'ready'; legacy.version = 6; saveJob(legacy); }
  let lastUrl = '';
  setInterval(() => {
    if (location.href !== lastUrl || !document.getElementById(ID)) { lastUrl = location.href; mount(); }
    processJob().catch(error => status(error.message));
  }, 800);
  mount(); lastUrl = location.href;
})();







})();
