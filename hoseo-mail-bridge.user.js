// ==UserScript==
// @name         앵커늘봄 강사서류 → 호서대 메일 보내기
// @namespace    https://hoseoican.github.io/hoseo_docs/
// @version      0.2.0
// @description  강사서류 작성 프로그램의 「학교 메일로 보내기」를 누르면 호서대 웹메일 쓰기 창에 받는 사람·제목·본문·ZIP 첨부를 채웁니다.
// @match        https://hoseoican.github.io/hoseo_docs/*
// @match        https://mail.hoseo.edu/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// @run-at       document-idle
// @downloadURL  https://hoseoican.github.io/hoseo_docs/hoseo-mail-bridge.user.js
// @updateURL    https://hoseoican.github.io/hoseo_docs/hoseo-mail-bridge.user.js
// ==/UserScript==
(function () {
  'use strict';
  var VERSION = '0.2.0';
  var MAIL_HOME = 'https://mail.hoseo.edu/mail/allmail';
  var JOB_TTL = 20 * 60 * 1000; // 20분 지난 작업은 버림

  /* ================= 강사서류 프로그램 쪽 ================= */
  if (location.hostname === 'hoseoican.github.io') {
    document.documentElement.dataset.hsMailBridge = '1';
    document.documentElement.dataset.hsMailBridgeVer = VERSION;
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (e.origin !== location.origin || !d || d.type !== 'hs-mail-send') return;
      try {
        var b64 = bufToB64(d.data);
        GM_setValue('hsJob', { id: d.id, school: d.school, names: d.names, to: d.to, toName: d.toName, subject: d.subject, body: d.body, bodyHtml: d.bodyHtml || '',
          fileName: d.fileName, data: b64, auto: !!d.auto, created: Date.now(), state: 'new' });
        GM_deleteValue('hsResult');
        GM_openInTab(MAIL_HOME, { active: true, insert: true });
        window.postMessage({ type: 'hs-mail-ack', id: d.id }, location.origin);
      } catch (er) {
        window.postMessage({ type: 'hs-mail-error', id: d.id, msg: String(er && er.message || er) }, location.origin);
      }
    });
    GM_addValueChangeListener('hsResult', function (k, o, n) {
      if (!n) return;
      window.postMessage(Object.assign({ type: n.ok ? 'hs-mail-sent' : 'hs-mail-error' }, n), location.origin);
    });
    return;
  }

  /* ================= 호서대 웹메일 쪽 ================= */
  var job = GM_getValue('hsJob');
  if (!job || Date.now() - job.created > JOB_TTL || job.state === 'done') return;
  if (/\/member\/login/.test(location.pathname)) { panel('로그인한 뒤 잠시 기다리면 메일 쓰기 창을 엽니다.', []); return; }

  var steps = [];
  function log(name, ok, note) { steps.push({ name: name, ok: ok, note: note || '' }); render(); }

  function txt(el) { return (el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function waitFor(fn, ms) { var t = Date.now(); while (Date.now() - t < (ms || 15000)) { var v = fn(); if (v) return v; await sleep(250); } return null; }

  // React 입력칸에 값 넣기
  function setVal(el, v) {
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    el.focus(); setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function key(el, k) {
    ['keydown', 'keypress', 'keyup'].forEach(function (t) { el.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, keyCode: k === 'Enter' ? 13 : 0, which: k === 'Enter' ? 13 : 0, bubbles: true })); });
  }
  // 라벨 글자 가까이에 있는 입력칸 찾기
  function inputByLabel(words) {
    var ins = Array.prototype.filter.call(document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea'), visible);
    var hit = ins.filter(function (i) { var s = [i.placeholder, i.getAttribute('aria-label'), i.name, i.id, i.title].join(' '); return words.some(function (w) { return s.indexOf(w) >= 0; }); })[0];
    if (hit) return hit;
    var labels = Array.prototype.filter.call(document.querySelectorAll('label, th, dt, span, div, p'), function (n) { var t = txt(n); return t.length < 12 && words.some(function (w) { return t === w || t.replace(/\s/g, '') === w.replace(/\s/g, ''); }) && visible(n); });
    for (var i = 0; i < labels.length; i++) {
      var box = labels[i];
      for (var up = 0; up < 4 && box; up++, box = box.parentElement) {
        var c = Array.prototype.filter.call(box.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=file]), textarea'), visible)[0];
        if (c) return c;
      }
    }
    return null;
  }
  function buttonByText(words) {
    return Array.prototype.filter.call(document.querySelectorAll('button, a, [role=button]'), function (b) { var t = txt(b).replace(/\s/g, ''); return visible(b) && words.some(function (w) { return t === w || t.indexOf(w) === 0 && t.length <= w.length + 2; }); })[0] || null;
  }
  function editorBody() {
    var frames = Array.prototype.filter.call(document.querySelectorAll('iframe'), visible);
    for (var i = 0; i < frames.length; i++) {
      try { var d = frames[i].contentDocument; if (d && d.body && (d.body.isContentEditable || d.designMode === 'on')) return d.body; } catch (e) { /* 다른 출처 */ }
    }
    var eds = Array.prototype.filter.call(document.querySelectorAll('[contenteditable=true], [contenteditable=""]'), visible);
    eds.sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return rb.width * rb.height - ra.width * ra.height; });
    return eds[0] || null;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  async function openCompose() {
    if (inputByLabel(['제목'])) return true;
    var b = await waitFor(function () { return buttonByText(['메일쓰기', '메일 쓰기', '편지쓰기', '새메일']); }, 15000);
    if (!b) return false;
    b.click();
    return !!(await waitFor(function () { return inputByLabel(['제목']); }, 15000));
  }

  async function fill() {
    steps = []; render();
    job.state = 'filling'; GM_setValue('hsJob', job);
    if (!(await openCompose())) { log('메일 쓰기 창 열기', false, '「메일쓰기」 버튼을 직접 눌러 주세요. 창이 열리면 「다시 채우기」를 누르세요.'); return; }
    log('메일 쓰기 창 열기', true);
    await sleep(600);

    var toIn = inputByLabel(['받는 사람', '받는사람', '수신', 'To', 'to']);
    if (toIn) { setVal(toIn, job.to); key(toIn, 'Enter'); await sleep(300); if (toIn.value) { toIn.dispatchEvent(new Event('blur', { bubbles: true })); } log('받는 사람', true, job.to); }
    else log('받는 사람', false, job.to + ' 를 직접 넣어 주세요');

    var subj = inputByLabel(['제목', 'subject', 'Subject']);
    if (subj) { setVal(subj, job.subject); log('제목', true); } else log('제목', false, '직접 넣어 주세요');

    var body = await waitFor(editorBody, 8000);
    if (body) {
      var html = job.bodyHtml || esc(job.body).split('\n').map(function (l) { return '<div>' + (l || '<br>') + '</div>'; }).join('');
      body.focus();
      body.insertAdjacentHTML('afterbegin', html);
      body.dispatchEvent(new Event('input', { bubbles: true }));
      log('본문', true);
    } else log('본문', false, '본문을 직접 붙여 넣어 주세요(미리보기의 본문 복사)');

    var ok = await attach();
    log('ZIP 첨부', ok, job.fileName);

    job.state = 'filled'; GM_setValue('hsJob', job);
    watchSend();
    if (job.auto && toIn && subj && body && ok) {
      await sleep(2500);
      var send = buttonByText(['보내기', '전송']);
      if (send) { log('보내기', true, '자동으로 눌렀습니다'); send.click(); }
    }
  }

  async function attach() {
    var bytes = b64ToBuf(job.data);
    var file = new File([bytes], job.fileName, { type: 'application/zip' });
    var inputs = Array.prototype.slice.call(document.querySelectorAll('input[type=file]'));
    if (!inputs.length) {
      var ab = buttonByText(['파일첨부', '첨부파일', '내PC', '내 PC', '첨부']);
      if (ab) { /* 클릭하면 파일 선택 창이 열리므로 누르지 않는다 */ }
      inputs = Array.prototype.slice.call(document.querySelectorAll('input[type=file]'));
    }
    if (inputs.length) {
      var inp = inputs.filter(function (i) { return i.multiple; })[0] || inputs[0];
      var dt = new DataTransfer(); dt.items.add(file);
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      var shown = await waitFor(function () { return document.body.innerText.indexOf(job.fileName) >= 0; }, 8000);
      if (shown) return true;
    }
    // 끌어다 놓기로 한 번 더
    var zone = Array.prototype.filter.call(document.querySelectorAll('div, section'), function (n) { var t = txt(n); return visible(n) && t.length < 80 && /끌어|드래그|첨부/.test(t); })[0];
    if (zone) {
      var dt2 = new DataTransfer(); dt2.items.add(file);
      ['dragenter', 'dragover', 'drop'].forEach(function (t) { zone.dispatchEvent(new DragEvent(t, { dataTransfer: dt2, bubbles: true, cancelable: true })); });
      if (await waitFor(function () { return document.body.innerText.indexOf(job.fileName) >= 0; }, 8000)) return true;
    }
    return false;
  }

  var watching = false;
  function watchSend() {
    if (watching) return; watching = true;
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button, a, [role=button]');
      if (!b || !/^(보내기|전송)$/.test(txt(b).replace(/\s/g, ''))) return;
      // 보내기 뒤 쓰기 창이 닫히거나 「보냈습니다」가 나오면 성공으로 본다
      waitFor(function () { return !inputByLabel(['제목']) || /(메일을|메일이)?\s*(보냈습니다|발송되었습니다|전송되었습니다|발송 완료|전송 완료)/.test(document.body.innerText); }, 30000).then(function (done) {
        if (!done) return;
        job.state = 'done'; GM_setValue('hsJob', job);
        GM_setValue('hsResult', { ok: true, id: job.id, school: job.school, names: job.names, at: Date.now() });
        steps.push({ name: '보내기 완료', ok: true, note: '강사서류 프로그램에 보냄 표시를 했습니다' }); render();
      });
    }, true);
  }

  /* 화면 오른쪽 아래 안내 상자 */
  var box;
  function panel(msg, list) {
    if (!box) {
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:300px;background:#fff;border:2px solid #89171A;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);font:13px/1.5 sans-serif;color:#222;padding:12px 14px';
      document.body.appendChild(box);
    }
    box.innerHTML = '<div style="font-weight:700;color:#89171A;margin-bottom:6px">앵커늘봄 강사서류 메일 · ' + esc(job.school) + '</div>' +
      (msg ? '<div style="margin-bottom:6px">' + esc(msg) + '</div>' : '') +
      list.map(function (s) { return '<div>' + (s.ok ? '✅' : '⚠️') + ' <b>' + esc(s.name) + '</b>' + (s.note ? ' <span style="color:#666">' + esc(s.note) + '</span>' : '') + '</div>'; }).join('') +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button data-a="refill" style="border:1px solid #89171A;background:#89171A;color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer">다시 채우기</button>' +
      '<button data-a="mark" style="border:1px solid #ccc;background:#fff;border-radius:6px;padding:4px 8px;cursor:pointer">보냄으로 표시</button>' +
      '<button data-a="cancel" style="border:1px solid #ccc;background:#fff;border-radius:6px;padding:4px 8px;cursor:pointer">취소</button></div>' +
      '<div style="margin-top:6px;color:#888;font-size:11px">확인한 뒤 웹메일의 「보내기」를 누르세요 · v' + VERSION + '</div>';
    box.querySelector('[data-a=refill]').onclick = function () { fill(); };
    box.querySelector('[data-a=mark]').onclick = function () { job.state = 'done'; GM_setValue('hsJob', job); GM_setValue('hsResult', { ok: true, id: job.id, school: job.school, names: job.names, at: Date.now() }); panel('보냄으로 표시했습니다.', steps); };
    box.querySelector('[data-a=cancel]').onclick = function () { GM_deleteValue('hsJob'); box.remove(); box = null; };
  }
  function render() { panel('', steps); }

  function bufToB64(buf) { var u = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
  function b64ToBuf(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }

  if (job.state === 'new' || job.state === 'filling') { panel('메일 쓰기 창을 채우는 중…', []); fill(); }
  else render();
})();
