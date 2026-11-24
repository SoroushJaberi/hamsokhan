/* Hamsokhan website: one page, no external libraries. Talks to the Apps Script server (see code/webapp/server/Code.gs). */
(function () {
  'use strict';
  var CFG = window.HS_CONFIG || {};
  var C = window.HS_CONTENT;
  var PR = window.HS_PRACTICE;
  var APP_V = CFG.appVersion || '1.0.1';
  var GUIDE_V = CFG.guideVersion || '';
  var GAS = CFG.mode === 'gas';
  var app = document.getElementById('app');

  /* ------------------------------------------------------------ small helpers */
  function fa(x) { return String(x).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); }); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fill(t, o) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function bdi(s) { return '<bdi>' + esc(s) + '</bdi>'; }
  function fillHtml(t, o) { return esc(t).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function wrapTables(h) { return h.replace(/<table class="t">/g, '<div class="tablewrap"><table class="t">').replace(/<\/table>/g, '</table></div>'); }
  var store = {
    get: function (k) { try { var v = localStorage.getItem('hs:' + k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('hs:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del: function (k) { try { localStorage.removeItem('hs:' + k); } catch (e) { /* ignore */ } }
  };
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 2600);
  }
  function device() {
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return (coarse || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) ? 'mobile' : 'desktop';
  }
  function normCode(v) {
    var s = String(v || '').toUpperCase().replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
      .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }).replace(/[^0-9A-Z]/g, '');
    return s.length === 10 ? s : '';
  }
  function fmtCode(t) { return t ? t.slice(0, 5) + '-' + t.slice(5) : ''; }
  function vcmp(a, b) {
    var x = String(a).split('.'), y = String(b).split('.');
    for (var i = 0; i < 3; i++) { var d = (+x[i] || 0) - (+y[i] || 0); if (d) return d; }
    return 0;
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    return Promise.resolve(fallback());
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  }

  /* ------------------------------------------------------------ icons and logo */
  var LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#FBF8F2"/>' +
    '<path d="M10 9h26a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H19l-7 6v-6h-2a5 5 0 0 1-5-5V14a5 5 0 0 1 5-5z" fill="#1B2440"/>' +
    '<rect x="11" y="15" width="20" height="3" rx="1.5" fill="#FBF8F2" opacity=".9"/><rect x="17" y="22" width="14" height="3" rx="1.5" fill="#FBF8F2" opacity=".55"/>' +
    '<path d="M38 24h6a14 14 0 0 1 0 28h-1c1 3 3 5 6 6-6 0-10-2-12-6h-1a14 14 0 0 1 0-28z" fill="#0E7C7B"/>' +
    '<rect x="29.2" y="36.2" width="5.6" height="5.6" rx="1" transform="rotate(45 32 39)" fill="#FBF8F2"/>' +
    '<rect x="38.2" y="36.2" width="5.6" height="5.6" rx="1" transform="rotate(45 41 39)" fill="#E3A42B"/>' +
    '<rect x="47.2" y="36.2" width="5.6" height="5.6" rx="1" transform="rotate(45 50 39)" fill="#FBF8F2"/></svg>';
  var ICON = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M8 7h7M8 11h7"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l2 2M15 8l2 2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    out: '<path d="M10 17l-5-5 5-5M5 12h11M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>',
    leave: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    learn: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>'
  };
  function icon(n) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>';
  }

  /* ------------------------------------------------------------ state */
  var S = {
    token: store.get('token'),
    cfg: null,
    st: null,
    batch: null,       // { batch_id, items: [{code, q}], answered: [codes] }
    local: {},         // code -> { f, s, note, ms, rev, sentRev, skip }
    queue: [],         // answers waiting to be sent
    syncing: false,
    online: navigator.onLine !== false,
    auto: store.get('auto') !== false,
    join: store.get('join') || '',
    errorsSent: 0,
    lastDone: 0
  };
  function persist() {
    if (!S.token) return;
    store.set('q:' + S.token, S.queue);
    if (S.batch) store.set('b:' + S.token, { batch_id: S.batch.batch_id, local: S.local });
  }
  function restore() {
    if (!S.token) return;
    S.queue = store.get('q:' + S.token) || [];
  }

  /* ------------------------------------------------------------ server calls */
  function ApiError(code) { this.code = code; }
  function rawCall(req) {
    if (GAS) {
      return new Promise(function (resolve, reject) {
        if (!(window.google && google.script && google.script.run)) { reject(new ApiError('config')); return; }
        google.script.run.withSuccessHandler(function (r) {
          try { resolve(JSON.parse(r)); } catch (e) { reject(new ApiError('server_error')); }
        }).withFailureHandler(function () { reject(new ApiError('network')); }).api(JSON.stringify(req));
      });
    }
    if (!CFG.apiUrl) return Promise.reject(new ApiError('config'));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 35000);
    return fetch(CFG.apiUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req),
      redirect: 'follow', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new ApiError('network');
      return r.json().catch(function () { throw new ApiError('server_error'); });
    }, function () { clearTimeout(timer); throw new ApiError('network'); });
  }
  function api(action, payload, tries) {
    tries = tries == null ? 3 : tries;
    var req = Object.assign({ action: action, app_v: APP_V, guide_v: GUIDE_V, device: device() }, payload || {});
    if (S.token && !req.token && action !== 'register' && action !== 'config') req.token = S.token;
    return rawCall(req).then(function (r) {
      setOnline(true);
      if (r && r.ok) return r;
      var code = (r && r.error) || 'generic';
      if (code === 'busy' && tries > 1) return wait(1500).then(function () { return api(action, payload, tries - 1); });
      throw new ApiError(code);
    }, function (e) {
      var code = (e && e.code) || 'network';
      if (code === 'network') setOnline(false);
      if (code === 'network' && tries > 1) return wait(tries === 3 ? 1200 : 3500).then(function () { return api(action, payload, tries - 1); });
      throw e instanceof ApiError ? e : new ApiError(code);
    });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function errText(e) { var c = (e && e.code) || 'generic'; return C.errors[c] || C.errors.generic; }
  function setOnline(v) { if (S.online !== v) { S.online = v; paintSync(); } }

  /* ------------------------------------------------------------ answer queue (sent every few seconds) */
  function enqueue(code) {
    var a = S.local[code];
    if (!a || !S.batch) return;
    a.rev = a.rev == null ? 0 : a.rev + 1;     // every change is a new revision; the server keeps the highest
    var entry = { batch_id: S.batch.batch_id, code: code, f: a.skip ? 'SKIP' : a.f, s: a.skip ? '' : a.s, note: a.note || '', ms: Math.round(a.ms || 0),
      t: new Date().toISOString(), rev: a.rev || 0 };
    S.queue = S.queue.filter(function (q) { return !(q.batch_id === entry.batch_id && q.code === code); });
    S.queue.push(entry);
    persist();
    paintSync();
  }
  function sync() {
    if (S.syncing || !S.queue.length || !S.token) return Promise.resolve();
    S.syncing = true;
    paintSync();
    var bid = S.queue[0].batch_id;
    var chunk = S.queue.filter(function (q) { return q.batch_id === bid; }).slice(0, 20);
    return api('submit', { batch_id: bid, answers: chunk }, 1).then(function (r) {
      var saved = {};
      (r.saved || []).forEach(function (k) { saved[k] = true; });
      chunk.forEach(function (q) {
        var key = q.code + (q.rev ? '#' + q.rev : '');
        if (!saved[key]) return;
        S.queue = S.queue.filter(function (x) { return x !== q; });
        var a = S.local[q.code];
        if (a && q.batch_id === (S.batch && S.batch.batch_id)) a.sentRev = Math.max(a.sentRev == null ? -1 : a.sentRev, q.rev);
      });
      // answers the server refused (unknown batch, withdrawn) must not block the queue forever
      chunk.forEach(function (q) { if (!saved[q.code + (q.rev ? '#' + q.rev : '')]) q.failed = (q.failed || 0) + 1; });
      S.queue = S.queue.filter(function (q) { return (q.failed || 0) < 5; });
    }, function (e) {
      if (e.code === 'unknown_batch' || e.code === 'withdrawn' || e.code === 'unknown_code') {
        S.queue = S.queue.filter(function (q) { return q.batch_id !== bid; });
      }
    }).then(function () { S.syncing = false; persist(); paintSync(); });
  }
  function flush(maxMs) {
    var until = Date.now() + (maxMs || 60000);
    function step() {
      if (!S.queue.length) return Promise.resolve(true);
      if (Date.now() > until) return Promise.resolve(false);
      return sync().then(function () { return S.queue.length ? wait(S.online ? 400 : 2500).then(step) : true; });
    }
    return step();
  }
  setInterval(function () { if (S.queue.length) sync(); }, 4000);
  window.addEventListener('online', function () { setOnline(true); sync(); });
  window.addEventListener('offline', function () { setOnline(false); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { persist(); sync(); } });

  function paintSync() {
    var el = document.getElementById('sync');
    if (!el) return;
    var n = S.queue.length, cls = 'sync', txt = C.sync.saved;
    if (!S.online) { cls += ' off'; txt = C.sync.offline; } else if (S.syncing) { cls += ' wait'; txt = C.sync.sending; } else if (n) { cls += ' wait'; txt = fill(C.sync.queued, { n: fa(n) }); }
    el.className = cls;
    el.innerHTML = '<i></i><span>' + esc(txt) + '</span>';
    el.style.visibility = S.batch || n || !S.online ? 'visible' : 'hidden';
  }

  /* ------------------------------------------------------------ page frame and actions */
  var ACT = {};
  function page(inner, opts) {
    opts = opts || {};
    var menu = S.token && opts.menu !== false ? '<button class="icon-btn" data-act="menu" aria-label="' + esc(C.menu.title) + '">' + icon('menu') + '</button>' : '';
    app.innerHTML = '<header class="top"><div class="top-in"><a class="brand" href="#" data-act="home" aria-label="' + esc(C.brand) + '">' + LOGO +
      '<b>' + esc(C.brand) + '</b></a><span class="spacer"></span><span id="sync" class="sync" aria-live="polite"></span>' + menu + '</div></header>' +
      '<main class="wrap' + (opts.anim === false ? '' : ' fade-in') + '">' + inner + '</main>';
    paintSync();
    if (!opts.keepScroll) window.scrollTo(0, 0);
  }
  app.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t || !ACT[t.getAttribute('data-act')]) return;
    e.preventDefault();
    ACT[t.getAttribute('data-act')](t, e);
  });
  function setActs(a) {
    ACT = Object.assign({ menu: openMenu, home: function () { if (S.token && S.st) route(); else landing(); } }, a || {});
  }
  function loading() { setActs(); page('<div class="spinner" role="progressbar" aria-label="…"></div>', { menu: false }); }
  function failScreen(e, retry) {
    setActs({ retry: retry });
    page('<div class="card center stack"><h2>' + esc(errText(e)) + '</h2><button class="btn primary" data-act="retry">' + esc(C.errors.retry) + '</button></div>');
  }

  /* ------------------------------------------------------------ start */
  function boot() {
    // The backup page runs inside Google's frame, so its own address never carries ?join=. Ask Google for the outer address once.
    if (GAS && !boot.asked && window.google && google.script && google.script.url) {
      boot.asked = true;
      var once = false, go = function () { if (!once) { once = true; boot(); } };
      setTimeout(go, 2500);
      try {
        google.script.url.getLocation(function (loc) {
          var j = loc && loc.parameter && loc.parameter.join;
          if (j) { S.join = String(j); store.set('join', S.join); }
          go();
        });
      } catch (e) { go(); }
      return;
    }
    var q = new URLSearchParams(location.search);
    if (q.get('join')) { S.join = q.get('join'); store.set('join', S.join); }
    var m = /[#&]k=([^&]+)/.exec(location.hash);
    if (m) {
      var t = normCode(decodeURIComponent(m[1]));
      if (t) { S.token = t; store.set('token', t); }
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    }
    restore();
    loading();
    api('config').then(function (cfg) {
      S.cfg = cfg;
      if (vcmp(APP_V, cfg.min_app || '0') < 0) return updateScreen();
      if (!S.token) return landing();
      return api('hello').then(function (st) { S.st = st; route(); }, function (e) {
        if (e.code === 'unknown_code') { forget(); landing(); } else failScreen(e, boot);
      });
    }, function (e) { failScreen(e, boot); });
  }
  function updateScreen() {
    setActs({ reload: function () { location.replace(location.pathname + '?v=' + Date.now() + location.hash); } });
    page('<div class="card center stack"><h2>' + esc(C.errors.update) + '</h2><button class="btn primary" data-act="reload">' + esc(C.errors.reload) + '</button></div>', { menu: false });
  }
  function forget() {
    if (S.token) { store.del('q:' + S.token); store.del('b:' + S.token); store.del('tut:' + S.token); store.del('pr:main:' + S.token); store.del('pr:retry:' + S.token); }
    store.del('token');
    S.token = null; S.st = null; S.batch = null; S.local = {}; S.queue = [];
  }

  function route() {
    var st = S.st;
    if (!st) return landing();
    if (st.status === 'withdrawn') return home();
    if (st.stage === 'tutorial') return tutorial(store.get('tut:' + S.token) || 0);
    if (st.stage === 'practice') return practiceIntro('main');
    if (st.stage === 'retry') return practiceIntro('retry');
    if (st.stage === 'practice_failed') return finalFail();
    return home();
  }

  /* ------------------------------------------------------------ landing, resume */
  function landing() {
    var L = C.landing, cfg = S.cfg || {};
    setActs({
      start: function () { consent(); },
      resume: function () { resume(); }
    });
    var cards = L.cards.map(function (c) { return '<div class="feature">' + icon(c.icon) + '<div><b>' + esc(c.title) + '</b><span>' + esc(c.text) + '</span></div></div>'; }).join('');
    var journey = L.journey.map(function (j, i) {
      return '<li class="' + (i === 0 ? 'now' : '') + '"><span class="dot">' + fa(i + 1) + '</span><b>' + esc(j.title) + '</b><span class="badge">' + esc(j.badge) +
        '</span><div class="muted small">' + esc(j.text) + '</div></li>';
    }).join('');
    var open = cfg.registration_open !== false;
    page('<section class="hero"><span class="logo">' + LOGO + '</span><h1>' + esc(C.brand) + '</h1><div class="tag">' + esc(C.tagline) + '</div>' +
      '<p class="lead">' + esc(L.lead) + '</p></section>' +
      '<div class="features">' + cards + '</div>' +
      '<div class="cta">' + (open ? '<button class="btn primary big" data-act="start">' + esc(L.start) + '</button>' : '<div class="state">' + esc(L.closed) + '</div>') +
      '<button class="btn ghost" data-act="resume">' + esc(L.resume) + '</button></div>' +
      '<div class="card"><h3>' + esc(L.journeyTitle) + '</h3><ol class="journey">' + journey + '</ol></div>' +
      '<p class="foot">' + esc(L.footer) + (cfg.university ? ' · ' + bdi(cfg.university) : '') +
      (cfg.contact ? '<br>' + fillHtml(C.menu.contact, { contact: bdi(cfg.contact) }) : '') + '</p>', { menu: false });
  }
  function resume() {
    var R = C.resume;
    setActs({
      back: landing,
      go: function () {
        var t = normCode(document.getElementById('code').value);
        var err = document.getElementById('err');
        if (!t) { err.textContent = C.errors.unknown_code; return; }
        err.textContent = '';
        var prev = S.token;
        S.token = t;
        api('hello').then(function (st) {
          store.set('token', t); restore(); S.st = st; route();
        }, function (e) { S.token = prev; err.textContent = errText(e); });
      }
    });
    page('<div class="card stack"><h2>' + esc(R.title) + '</h2><p class="muted">' + esc(R.text) + '</p>' +
      '<input id="code" class="input ltr" style="display:block;text-align:center;font-size:1.3rem;letter-spacing:2px" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="' + esc(R.placeholder) + '">' +
      '<p id="err" class="err" role="alert"></p><div class="row"><button class="btn primary grow" data-act="go">' + esc(R.go) + '</button>' +
      '<button class="btn ghost" data-act="back">' + esc(R.back) + '</button></div></div>', { menu: false });
    var inp = document.getElementById('code');
    inp.focus();
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ACT.go(); });
  }

  /* ------------------------------------------------------------ consent, about you, code */
  function consent() {
    var K = C.consent, cfg = S.cfg || {};
    var dots = '…………';
    var people = fill(K.people, {
      researcher: bdi(cfg.researcher || dots), supervisor: bdi(cfg.supervisor || dots), university: bdi(cfg.university || dots), contact: bdi(cfg.contact || dots)
    });
    setActs({
      next: function () {
        var v = {};
        K.checks.forEach(function (c) { v[c.id] = document.getElementById('k_' + c.id).checked; });
        if (!v.native || !v.adult || !v.agree) { document.getElementById('err').textContent = K.needAll; return; }
        v.thanks_name = v.thanks ? document.getElementById('k_name').value.trim() : '';
        about(v);
      },
      back: landing
    });
    var checks = K.checks.map(function (c) {
      return '<label class="check' + (c.required ? ' req' : '') + '"><input type="checkbox" id="k_' + c.id + '"><span>' + esc(c.text) + (c.required ? '<b>*</b>' : '') + '</span></label>' +
        (c.id === 'thanks' ? '<input id="k_name" class="input hidden" style="margin-top:8px" maxlength="80" placeholder="' + esc(K.namePlaceholder) + '">' : '');
    }).join('');
    page('<div class="card stack"><h2>' + esc(K.title) + '</h2>' + people + '<div class="consent-text">' + K.body + '</div></div>' +
      '<div class="card stack">' + checks + '<p id="err" class="err" role="alert"></p>' +
      '<div class="row"><button class="btn primary grow" data-act="next">' + esc(K.next) + '</button><button class="btn ghost" data-act="back">' + esc(C.resume.back) + '</button></div>' +
      '<p class="hint small">' + esc(K.printable) + '</p></div>', { menu: false });
    document.getElementById('k_thanks').addEventListener('change', function (e) {
      document.getElementById('k_name').classList.toggle('hidden', !e.target.checked);
    });
  }
  function about(k) {
    var A = C.about, cfg = S.cfg || {}, picked = {};
    var needJoin = cfg.join_required && !S.join;
    setActs({
      chip: function (el) {
        var f = el.getAttribute('data-f'), v = el.getAttribute('data-v');
        picked[f] = picked[f] === v ? '' : v;
        [].forEach.call(document.querySelectorAll('[data-f="' + f + '"]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === picked[f])); });
      },
      submit: function (btn) {
        var join = needJoin ? document.getElementById('join').value : S.join;
        var err = document.getElementById('err');
        btn.disabled = true; err.textContent = '';
        api('register', {
          join: join, consent: { agree: true, native: true, adult: true, release: !!k.release, thanks: !!k.thanks, thanks_name: k.thanks_name },
          about: picked
        }).then(function (r) {
          S.token = r.token; store.set('token', r.token);
          if (needJoin) { S.join = join; store.set('join', join); }
          codeScreen(r.code);
        }, function (e) {
          btn.disabled = false;
          if (e.code === 'bad_join_code' && !needJoin) {
            // The code came from the link and is wrong: forget it and show the field, so the person can type the right one.
            S.join = ''; store.del('join');
            about(k);
            var f = document.getElementById('join');
            f.setAttribute('aria-invalid', 'true');
            f.insertAdjacentHTML('afterend', '<p class="err" role="alert">' + esc(errText(e)) + '</p>');
            f.focus();
            return;
          }
          err.textContent = errText(e);
        });
      }
    });
    var fields = A.fields.map(function (f) {
      return '<div class="field"><label>' + esc(f.label) + '</label><div class="chips" role="group">' + f.options.map(function (o) {
        return '<button type="button" class="chip" aria-pressed="false" data-act="chip" data-f="' + f.id + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
    page('<div class="card stack"><h2>' + esc(A.title) + '</h2>' +
      (needJoin ? '<div class="field"><label for="join">' + esc(A.join) + '</label><input id="join" class="input ltr" style="display:block" autocomplete="off"><p class="hint small">' + esc(A.joinHint) + '</p></div>' : '') +
      '<p class="muted">' + esc(A.text) + '</p>' + fields + '<p id="err" class="err" role="alert"></p>' +
      '<button class="btn primary block" data-act="submit">' + esc(A.next) + '</button></div>', { menu: false });
  }
  function codeScreen(code) {
    var K = C.code;
    var link = GAS ? '' : location.origin + location.pathname + '#k=' + code;
    setActs({
      copy: function () { copy(code).then(function () { toast(K.copied); }); },
      copyLink: function () { copy(link).then(function () { toast(K.copied); }); },
      next: function () {
        if (!document.getElementById('saved').checked) { document.getElementById('saved').focus(); toast(K.saved); return; }
        api('hello').then(function (st) { S.st = st; tutorial(0); }, function () { S.st = { stage: 'tutorial', status: 'active' }; tutorial(0); });
      }
    });
    page('<div class="card stack center"><h2>' + esc(K.title) + '</h2><div class="codebox" aria-label="code">' + esc(code) + '</div>' +
      '<div class="row" style="justify-content:center"><button class="btn ghost" data-act="copy">' + esc(K.copy) + '</button>' +
      (link ? '<button class="btn ghost" data-act="copyLink">' + esc(K.copyLink) + '</button>' : '') + '</div>' +
      '<p>' + esc(K.text) + '</p><p class="warn">' + esc(K.warn) + '</p>' +
      '<label class="check" style="text-align:right"><input type="checkbox" id="saved"><span>' + esc(K.saved) + '</span></label>' +
      '<button class="btn primary block" data-act="next">' + esc(K.next) + '</button></div>', { menu: false });
  }

  /* ------------------------------------------------------------ tutorial */
  function tutorial(i) {
    var T = C.tutorial, n = T.steps.length;
    i = Math.max(0, Math.min(n - 1, i || 0));
    store.set('tut:' + S.token, i);
    setActs({
      next: function () { tutorial(i + 1); },
      back: function () { tutorial(i - 1); },
      done: function () { rater('tryit', PR.tryit, function () { loading(); api('tutorialDone').catch(function () { return null; }).then(function (r) { if (r) S.st = r; practiceIntro('main'); }); }); }
    });
    var dots = '';
    for (var k = 0; k < n; k++) dots += '<i class="' + (k === i ? 'on' : '') + '"></i>';
    page('<div class="steps" aria-hidden="true">' + dots + '</div><div class="card">' + wrapTables(T.steps[i]) + '</div>' +
      '<div class="row">' + (i > 0 ? '<button class="btn ghost" data-act="back">' + esc(T.back) + '</button>' : '') +
      '<button class="btn primary grow" data-act="' + (i < n - 1 ? 'next' : 'done') + '">' + esc(i < n - 1 ? T.next : T.done) + '</button></div>');
  }

  /* ------------------------------------------------------------ practice */
  function practiceIntro(set) {
    var P = C.practice;
    setActs({ start: function () { practice(set); }, guide: openGuide });
    page('<div class="card stack"><h2>' + esc(P.introTitle) + '</h2>' + (set === 'main' ? P.intro : P.retryIntro) +
      '<button class="btn primary block" data-act="start">' + esc(P.start) + '</button><button class="btn link" data-act="guide">' + esc(C.menu.guide) + '</button></div>');
  }
  function practice(set) {
    var items = PR[set];
    rater(set, items, function (answers) {
      loading();
      var payload = answers.map(function (a, i) { return { i: i, f: a.f, s: a.s, ms: Math.round(a.ms || 0) }; });
      var send = function () {
        api('practice', { set: set, answers: payload }).then(function (r) {
          store.del('pr:' + set + ':' + S.token);
          S.st = r.state;
          practiceResult(set, r, answers);
        }, function (e) { failScreen(e, send); });
      };
      send();
    });
  }
  function practiceResult(set, r, answers) {
    var P = C.practice, items = PR[set];
    var need = set === 'main' ? 16 : 8;
    var nums = { f: fa(r.ok_f), s: fa(r.ok_s), n: fa(r.n), need: fa(need) };
    if (r.passed) {
      setActs({ go: function () { home(); } });
      page('<div class="card stack center"><h2>' + esc(P.pass) + '</h2><div class="score"><div><b>' + nums.f + '</b>' + esc(C.rate.formality) + '</div><div><b>' + nums.s + '</b>' +
        esc(C.rate.standalone) + '</div></div><p class="muted">' + esc(fill(P.passText, nums)) + '</p><button class="btn primary block" data-act="go">' + esc(P.toHome) + '</button></div>');
      return;
    }
    if (set === 'retry' || r.state.stage === 'practice_failed') return finalFail();
    var lab = function (opts, v) { var o = opts.filter(function (x) { return x.v === v; })[0]; return o ? o.t : v; };
    var wrong = items.map(function (it, i) { return { it: it, a: answers[i] }; }).filter(function (x) { return x.a.f !== x.it.f || x.a.s !== x.it.s; });
    var list = wrong.map(function (x) {
      return '<li><div class="q">' + esc(x.it.q) + '</div><div class="small">' + esc(P.yours) + ': ' + esc(lab(C.rate.fOpts, x.a.f)) + ' · ' + esc(lab(C.rate.sOpts, x.a.s)) + '</div>' +
        '<div class="small"><b>' + esc(P.right) + ':</b> ' + esc(lab(C.rate.fOpts, x.it.f)) + ' · ' + esc(lab(C.rate.sOpts, x.it.s)) + '</div><div class="small muted">' + esc(x.it.why) + '</div></li>';
    }).join('');
    setActs({ retry: function () { practiceIntro('retry'); }, guide: openGuide });
    page('<div class="card stack"><h2>' + esc(P.fail) + '</h2><p>' + esc(fill(P.failText, nums)) + '</p><h3>' + esc(P.review) + '</h3><ul class="review">' + list + '</ul>' +
      '<button class="btn primary block" data-act="retry">' + esc(P.toRetry) + '</button><button class="btn link" data-act="guide">' + esc(C.menu.guide) + '</button></div>');
  }
  function finalFail() {
    var P = C.practice;
    setActs();
    page('<div class="card stack center"><h2>' + esc(P.finalFail) + '</h2><p>' + esc(P.finalFailText) + '</p></div>');
  }

  /* ------------------------------------------------------------ the rating screen (try-it, practice, real batches) */
  var R = null;     // current rater
  function rater(mode, items, onDone, startIdx) {
    var saved = mode === 'main' || mode === 'retry' ? store.get('pr:' + mode + ':' + S.token) : null;
    R = { mode: mode, items: items, onDone: onDone, idx: 0, ans: [], t0: 0, acc: 0 };
    if (saved && saved.ans && saved.ans.length) { R.ans = saved.ans; R.idx = Math.min(saved.ans.length, items.length - 1); }
    if (mode === 'rate') {
      R.ans = items.map(function (it) { return S.local[it.code] || null; });
      R.idx = startIdx || 0;
    }
    showItem();
  }
  function feedbackMode() { return R && R.mode !== 'rate'; }
  function curAns() {
    var a = R.ans[R.idx];
    if (!a) { a = { f: '', s: '', note: '', ms: 0 }; R.ans[R.idx] = a; if (R.mode === 'rate') S.local[R.items[R.idx].code] = a; }
    return a;
  }
  function tick() {
    if (!R || !R.t0) return;
    var now = Date.now();
    curAns().ms = (curAns().ms || 0) + (now - R.t0);
    R.t0 = now;
  }
  document.addEventListener('visibilitychange', function () {
    if (!R) return;
    if (document.visibilityState === 'hidden') { tick(); R.t0 = 0; } else R.t0 = Date.now();
  });
  function showItem() {
    var it = R.items[R.idx], n = R.items.length, a = R.ans[R.idx] || { f: '', s: '', note: '' }, X = C.rate;
    var same = R.shown === R.idx;      // a re-draw of the same question: no animation, no jump to the top
    R.shown = R.idx;
    var locked = feedbackMode() && a.f && a.s;
    var title = R.mode === 'tryit' ? C.tryit.title : (R.mode === 'rate' ? '' : C.practice.introTitle);
    var done = R.ans.filter(function (x) { return x && (x.skip || (x.f && x.s)); }).length;
    var btn = function (o, field) {
      var sel = a[field] === o.v, cls = 'choice';
      if (locked) { var right = it[field] === o.v; if (right) cls += ' right'; else if (sel) cls += ' wrong'; }
      return '<button class="' + cls + '" aria-pressed="' + sel + '" data-act="pick" data-field="' + field + '" data-v="' + o.v + '"' + (locked ? ' disabled' : '') + '>' +
        '<span class="k">' + o.k + '</span>' + esc(o.t) + '</button>';
    };
    var fb = '';
    if (locked) {
      var okF = a.f === it.f, okS = a.s === it.s, lab = function (opts, v) { return opts.filter(function (x) { return x.v === v; })[0].t; };
      fb = '<div class="feedback ' + (okF && okS ? 'ok' : 'no') + '" role="status"><b>' + esc(okF && okS ? X.correct : X.wrong) + '</b>' +
        (okF && okS ? '' : esc(X.guideSays) + ' ' + esc(lab(X.fOpts, it.f)) + ' · ' + esc(lab(X.sOpts, it.s)) + '<br>') + esc(it.why) + '</div>';
    }
    var last = R.idx === n - 1;
    var canNext = a.skip || (a.f && a.s);
    var foot = '<div class="rate-foot">' +
      (R.idx > 0 && R.mode === 'rate' ? '<button class="btn ghost" data-act="prev">' + esc(X.back) + '</button>' : '') +
      (R.mode === 'rate' && !a.skip ? '<button class="btn link" data-act="skip">' + esc(X.skip) + '</button>' : '') +
      (R.mode === 'rate' ? '<button class="btn link" data-act="note">' + esc(X.note) + '</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn primary" data-act="next"' + (canNext ? '' : ' disabled') + '>' + esc(last ? (R.mode === 'rate' ? X.finish : C.tutorial.next) : X.next) + '</button></div>';
    setActs({
      pick: pick, next: next, prev: function () { if (R && R.idx > 0) { tick(); R.idx--; showItem(); } },
      skip: function () { if (!R) return; tick(); var x = curAns(); x.skip = true; x.f = ''; x.s = ''; enqueue(R.items[R.idx].code); next(); },
      note: function () { var w = document.getElementById('notewrap'); w.classList.toggle('hidden'); if (!w.classList.contains('hidden')) document.getElementById('note').focus(); },
      guide: openGuide
    });
    page((title ? '<h2 style="margin:14px 0 0">' + esc(title) + '</h2>' : '') +
      '<div class="rate-head"><div class="bar" aria-hidden="true"><b style="width:' + Math.round(100 * done / n) + '%"></b></div><span class="count">' +
      esc(fill(X.of, { i: fa(R.idx + 1), n: fa(n) })) + '</span></div>' +
      '<div class="card qcard"><p class="qtext" lang="fa">' + esc(it.q) + '</p>' +
      '<div class="group" role="group" aria-label="' + esc(X.formality) + '"><div class="group-label"><span>' + esc(X.formality) + '</span>' +
      (feedbackMode() ? '' : '<button class="btn link small" style="min-height:0;padding:0" data-act="guide">' + esc(C.menu.guide) + '</button>') + '</div>' +
      '<div class="choices f">' + X.fOpts.map(function (o) { return btn(o, 'f'); }).join('') + '</div></div>' +
      '<div class="group" role="group" aria-label="' + esc(X.standalone) + '"><div class="group-label"><span>' + esc(X.standalone) + '</span></div>' +
      '<div class="choices s">' + X.sOpts.map(function (o) { return btn(o, 's'); }).join('') + '</div></div>' + fb +
      (a.skip ? '<p class="hint">' + esc(X.skipped) + '</p>' : '') +
      (R.mode === 'rate' ? '<div id="notewrap" class="notewrap' + (a.note ? '' : ' hidden') + '"><textarea id="note" class="input" maxlength="500" placeholder="' + esc(X.notePh) + '">' + esc(a.note || '') + '</textarea></div>' : '') +
      foot + '</div>', { menu: true, anim: !same, keepScroll: same });
    var note = document.getElementById('note');
    if (note) note.addEventListener('change', function () { curAns().note = note.value.trim().slice(0, 500); if (curAns().f && curAns().s) enqueue(R.items[R.idx].code); });
    R.t0 = document.visibilityState === 'hidden' ? 0 : Date.now();
    if (R.mode === 'main' || R.mode === 'retry') store.set('pr:' + R.mode + ':' + S.token, { ans: R.ans });
  }
  function pick(el) {
    if (!R) return;           // a tap that lands after the set was closed (slow connection, double tap)
    var field = el.getAttribute('data-field'), v = el.getAttribute('data-v');
    var a = curAns();
    if (feedbackMode() && a.f && a.s) return;
    tick();
    a[field] = v;
    a.skip = false;
    if (R.mode === 'rate' && a.f && a.s) enqueue(R.items[R.idx].code);
    var complete = a.f && a.s;
    showItem();
    if (complete && R.mode === 'rate' && S.auto && R.idx < R.items.length - 1) {
      var at = R.idx;
      setTimeout(function () { if (R && R.idx === at && R.mode === 'rate') next(); }, 380);
    }
  }
  function next() {
    if (!R) return;
    var a = R.ans[R.idx];
    if (!a || !(a.skip || (a.f && a.s))) return;
    tick();
    if (R.mode === 'rate') {
      var nt = document.getElementById('note');
      if (nt && nt.value.trim() !== (a.note || '')) { a.note = nt.value.trim().slice(0, 500); if (!a.skip) enqueue(R.items[R.idx].code); }
    }
    if (R.idx < R.items.length - 1) { R.idx++; showItem(); return; }
    var all = R.ans.slice(0, R.items.length).every(function (x) { return x && (x.skip || (x.f && x.s)); });
    if (!all) { R.idx = R.ans.findIndex(function (x) { return !x || !(x.skip || (x.f && x.s)); }); if (R.idx < 0) R.idx = 0; showItem(); return; }
    var done = R.onDone, ans = R.ans;
    R = null;
    done(ans);
  }
  document.addEventListener('keydown', function (e) {
    if (!R || document.querySelector('.modal-back')) { if (e.key === 'Escape') closeModal(); return; }
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var map = { Digit1: ['f', '1'], Digit2: ['f', '2'], Digit3: ['f', '3'], Digit4: ['f', 'U'], Numpad1: ['f', '1'], Numpad2: ['f', '2'], Numpad3: ['f', '3'], Numpad4: ['f', 'U'],
      KeyY: ['s', 'Y'], KeyN: ['s', 'N'], KeyU: ['s', 'U'] };
    var m = map[e.code];
    if (m) {
      var b = app.querySelector('[data-act="pick"][data-field="' + m[0] + '"][data-v="' + m[1] + '"]');
      if (b && !b.disabled) { e.preventDefault(); pick(b); }
    } else if (e.key === 'Enter') {
      var nb = app.querySelector('[data-act="next"]');
      if (nb && !nb.disabled) { e.preventDefault(); next(); }
    }
  });

  /* ------------------------------------------------------------ home and batches */
  function home(msg) {
    R = null;
    var H = C.home, st = S.st || {}, my = st.my || { rated: 0 }, pr = st.progress || { percent: 0, volunteers: 0 };
    var b = st.open_batch;
    var stateMsg = '';
    if (st.status === 'withdrawn') stateMsg = '<div class="state">' + esc(H.withdrawn) + '</div>';
    else if (st.status === 'paused') stateMsg = '<div class="state bad">' + esc(H.paused) + '</div>';
    else if (st.status === 'excluded') stateMsg = '<div class="state">' + esc(H.excluded) + '</div>';
    else if (st.study_open === false) stateMsg = '<div class="state">' + esc(H.closed) + '</div>';
    else if (st.complete && !b) stateMsg = '<div class="state good">' + esc(H.complete) + '</div>';
    else if (st.cap && !b) stateMsg = '<div class="state good">' + esc(H.cap) + '</div>';
    else if (msg) stateMsg = '<div class="state' + (msg === H.none ? '' : ' good') + '">' + esc(msg) + '</div>';
    var canWork = st.status === 'active' && st.study_open !== false && st.stage === 'rating' && (b || (!st.complete && !st.cap));
    var main = '';
    if (canWork) {
      main = b ? '<button class="btn primary big block" data-act="work">' + esc(H.cont) + '<span class="sub">' + esc(fill(H.contSub, { a: fa(b.answered.length), n: fa(b.items.length) })) + '</span></button>'
        : '<button class="btn primary big block" data-act="work">' + esc(H.start) + '<span class="sub">' + esc(H.startSub) + '</span></button>';
    }
    var pct = Math.max(0, Math.min(100, pr.percent || 0)), circ = 2 * Math.PI * 46;
    setActs({ work: startWork });
    page('<div class="card"><div class="hello"><div class="ring" aria-label="' + fa(pct) + '%"><svg viewBox="0 0 112 112"><defs><linearGradient id="rg" x1="0" x2="1">' +
      '<stop offset="0" stop-color="#0E7C7B"/><stop offset="1" stop-color="#E3A42B"/></linearGradient></defs>' +
      '<circle class="bg" cx="56" cy="56" r="46" fill="none" stroke-width="10"/><circle class="fg" cx="56" cy="56" r="46" fill="none" stroke-width="10" stroke-dasharray="' +
      circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - pct / 100)).toFixed(1) + '"/></svg><span>' + fa(pct) + '٪</span></div>' +
      '<div><h2 style="margin:0">' + esc(H.hello) + '</h2><div class="stat">' + esc(my.rated ? fill(H.rated, { n: fa(my.rated) }) : H.ratedNone) + '</div>' +
      '<div class="mini">' + fa(pct) + '٪ ' + esc(H.progress) + '</div><div class="mini">' + esc(fill(H.volunteers, { n: fa(pr.volunteers || 0) })) + '</div></div></div></div>' +
      (stateMsg ? '<div class="card tight">' + stateMsg + '</div>' : '') +
      (main ? '<div class="stack">' + main + '<p class="hint center small">' + esc(H.tip) + '</p></div>' : '') +
      '<div class="card"><h3>' + esc(C.landing.journeyTitle) + '</h3><ol class="journey">' + C.landing.journey.map(function (j, i) {
        return '<li class="' + (i === 0 ? 'now' : '') + '"><span class="dot">' + fa(i + 1) + '</span><b>' + esc(j.title) + '</b><span class="badge">' + esc(j.badge) + '</span></li>';
      }).join('') + '</ol></div>');
  }
  function startWork(btn) {
    if (btn) btn.disabled = true;
    api('startBatch').then(function (r) {
      S.st = r.state;
      if (!r.batch) {
        var H = C.home, m = { complete: H.complete, cap: H.cap, none_available: H.none, paused: H.paused, excluded: H.excluded, withdrawn: H.withdrawn }[r.reason];
        return home(m || '');
      }
      openBatch(r.batch);
    }, function (e) { if (btn) btn.disabled = false; toast(errText(e)); });
  }
  function openBatch(b) {
    var keep = store.get('b:' + S.token);
    S.local = keep && keep.batch_id === b.batch_id ? keep.local || {} : {};
    S.batch = b;
    b.answered.forEach(function (code) {        // answered on another device: mark as done so the batch can finish
      if (!S.local[code]) S.local[code] = { f: '', s: '', note: '', ms: 0, rev: 0, sentRev: 0, remote: true, skip: true };
    });
    persist();
    var first = b.items.findIndex(function (it) { var a = S.local[it.code]; return !a || !(a.skip || (a.f && a.s)); });
    rater('rate', b.items, finishBatch, first < 0 ? b.items.length - 1 : first);
  }
  function finishBatch() {
    var b = S.batch;
    if (!b) return home();
    var sendFinish = function () {
      page('<div class="card center stack"><div class="spinner" style="margin:20px auto"></div><p>' + esc(fill(C.sync.waitEnd, { n: fa(S.queue.length) })) + '</p></div>');
      flush(90000).then(function (ok) {
        if (!ok) { failScreen({ code: 'network' }, sendFinish); return; }
        api('finishBatch', { batch_id: b.batch_id }).then(function (r) {
          S.st = r.state;
          store.del('b:' + S.token);
          var n = b.items.filter(function (it) { var a = S.local[it.code]; return a && a.f && a.s && !a.skip && !a.remote; }).length;
          S.batch = null; S.local = {};
          doneScreen(n);
        }, function (e) { failScreen(e, sendFinish); });
      });
    };
    sendFinish();
  }
  function doneScreen(n) {
    var D = C.done, st = S.st || {};
    var more = st.status === 'active' && !st.cap && !st.complete && st.study_open !== false;
    setActs({ more: startWork, later: function () { home(D.bye); } });
    var why = st.status === 'paused' ? C.home.paused : (st.cap ? C.home.cap : (st.complete ? C.home.complete : ''));
    page('<div class="card center stack"><h2>' + esc(D.title) + '</h2><p>' + esc(fill(D.text, { n: fa(n) })) + '</p>' +
      (why ? '<div class="state' + (st.status === 'paused' ? ' bad' : ' good') + '">' + esc(why) + '</div>' : '') +
      (more ? '<button class="btn primary big block" data-act="more">' + esc(D.more) + '<span class="sub">' + esc(C.home.startSub) + '</span></button>' : '') +
      '<button class="btn ghost block" data-act="later">' + esc(more ? D.later : C.menu.close) + '</button></div>');
  }

  /* ------------------------------------------------------------ menu and modals */
  function modal(html, acts) {
    closeModal();
    var back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    back.addEventListener('click', function (e) {
      if (e.target === back) return closeModal();
      var t = e.target.closest('[data-m]');
      if (t && acts && acts[t.getAttribute('data-m')]) { e.preventDefault(); acts[t.getAttribute('data-m')](t); }
    });
    document.body.appendChild(back);
    var f = back.querySelector('button, textarea, input');
    if (f) f.focus();
  }
  function closeModal() { var m = document.querySelector('.modal-back'); if (m) m.parentNode.removeChild(m); }
  function head(title) { return '<div class="modal-head"><h2 style="margin:0">' + esc(title) + '</h2><button class="icon-btn" data-m="close" aria-label="' + esc(C.menu.close) + '">' + icon('x') + '</button></div>'; }
  function openGuide() { modal(head(C.menu.guide) + wrapTables(C.guideHtml), { close: closeModal }); }
  function openMenu() {
    var M = C.menu, cfg = S.cfg || {};
    var inBatch = R && R.mode === 'rate' && S.batch;
    var item = function (act, ic, text, extra, cls) { return '<li><button data-m="' + act + '" class="' + (cls || '') + '">' + icon(ic) + '<span>' + esc(text) + '</span>' + (extra || '') + '</button></li>'; };
    modal(head(M.title) + '<ul class="menu-list">' +
      item('guide', 'book', M.guide) +
      item('code', 'key', M.code) +
      item('auto', 'bolt', M.auto, '<span class="switch' + (S.auto ? ' on' : '') + '" id="sw"></span>') +
      (inBatch ? item('end', 'flag', M.endBatch) : '') +
      item('msg', 'mail', M.message) +
      item('forget', 'out', M.forget) +
      (S.st && S.st.status !== 'withdrawn' ? item('withdraw', 'leave', M.withdraw, '', 'danger') : '') +
      '</ul><p class="hint small center">' + (cfg.contact ? fillHtml(M.contact, { contact: bdi(cfg.contact) }) + '<br>' : '') + esc(M.version) + ' ' + bdi(APP_V) + '</p>', {
      close: closeModal,
      guide: openGuide,
      code: function () {
        modal(head(M.code) + '<div class="codebox">' + esc(fmtCode(S.token)) + '</div><p class="hint">' + esc(C.code.text) + '</p>' +
          '<div class="row"><button class="btn ghost grow" data-m="copy">' + esc(C.code.copy) + '</button></div>', {
          close: closeModal, copy: function () { copy(fmtCode(S.token)).then(function () { toast(C.code.copied); }); }
        });
      },
      auto: function () { S.auto = !S.auto; store.set('auto', S.auto); document.getElementById('sw').className = 'switch' + (S.auto ? ' on' : ''); },
      end: function () {
        confirmBox(M.endBatchQ, M.endBatch, function () {
          if (R) { tick(); R = null; }
          finishBatch();
        });
      },
      msg: function () {
        modal(head(M.message) + '<textarea id="msg" class="input" maxlength="1500" placeholder="' + esc(M.msgPh) + '"></textarea><p id="merr" class="err"></p>' +
          '<button class="btn primary block" data-m="send">' + esc(M.send) + '</button>', {
          close: closeModal,
          send: function (b) {
            var t = document.getElementById('msg').value.trim();
            if (!t) return;
            b.disabled = true;
            api('message', { text: t }).then(function () { closeModal(); toast(M.msgSent); }, function (e) { b.disabled = false; document.getElementById('merr').textContent = errText(e); });
          }
        });
      },
      forget: function () { confirmBox(M.forgetQ, M.forgetYes, function () { forget(); R = null; landing(); }); },
      withdraw: function () {
        confirmBox(M.withdrawQ, M.withdrawYes, function () {
          api('withdraw', { confirm: true }).then(function (r) { S.st = r.state; S.queue = []; S.batch = null; persist(); R = null; home(); }, function (e) { toast(errText(e)); });
        }, true);
      }
    });
  }
  function confirmBox(q, yes, fn, danger) {
    modal('<p style="font-size:1.05rem">' + esc(q) + '</p><div class="row"><button class="btn ' + (danger ? 'danger' : 'primary') + ' grow" data-m="yes">' + esc(yes) +
      '</button><button class="btn ghost" data-m="close">' + esc(C.menu.cancel) + '</button></div>', { close: closeModal, yes: function () { closeModal(); fn(); } });
  }

  /* ------------------------------------------------------------ report unexpected errors (a few per visit) */
  window.addEventListener('error', function (e) {
    if (S.errorsSent >= 5) return;
    S.errorsSent++;
    var d = [APP_V, e.message, e.filename, e.lineno, e.colno, navigator.userAgent].join(' | ');
    api('clientError', { detail: d }, 1).catch(function () { return null; });
  });

  window.HS_DEBUG = { state: S, version: APP_V };
  boot();
})();
