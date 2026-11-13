/* Motore comune dei mini lab nuovi (missioni, medaglie, coriandoli, piano cartesiano, comandi).
   Si usa così:  var L = Lab.init({chiave, missioni, medaglie});  poi L.tela(), L.piano(), ... */
(function () {
  'use strict';
  var MENO = '−';
  function $(id) { return document.getElementById(id); }
  function fmt(x, d) {
    var r = (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',');
    r = r.replace(/^-/, MENO);
    if (/^−0(,0+)?$/.test(r)) r = r.slice(1);
    return r;
  }
  function bello(x) { var r = fmt(x, 2); return r.replace(/,00$/, '').replace(/(,\d)0$/, '$1'); }
  function num(s) {
    s = String(s).replace(/−/g, '-').replace(/\s/g, '').replace(',', '.');
    var m = s.match(/^(-?[\d.]+)\/(-?[\d.]+)$/);
    if (m) { var d = parseFloat(m[2]); return d ? parseFloat(m[1]) / d : null; }
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    return parseFloat(s);
  }
  function lista(s) {
    return String(s).split(/;|\be\b|\s+/).map(function (t) { return t.trim(); }).filter(Boolean).map(num).filter(function (x) { return x != null; });
  }
  function col(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function colori() {
    return { ink: col('--inchiostro'), tenue: col('--tenue'), riga: col('--riga'), acc: col('--accento'), ros: col('--l3'), verde: col('--l1'),
      arancio: col('--l2'), viola: col('--l4'), oro: col('--oro'), rosso: col('--rosso'), foglio: col('--foglio'), carta: col('--carta'), ok: col('--ok') };
  }
  function freccia(ctx, x0, y0, x1, y1, c, w) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 3) return;
    var ux = dx / L, uy = dy / L, p = Math.min(10, L * 0.45);
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w || 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * p * 0.6, y1 - uy * p * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * p - uy * p * 0.5, y1 - uy * p + ux * p * 0.5);
    ctx.lineTo(x1 - ux * p + uy * p * 0.5, y1 - uy * p - ux * p * 0.5);
    ctx.closePath(); ctx.fill();
  }

  function init(cfg) {
    var L = window.__L = { $: $, fmt: fmt, bello: bello, num: num, lista: lista, col: col, colori: colori, freccia: freccia, MENO: MENO, mis: null, risposto: false, azioni: {}, cfg: cfg };
    var tent = {}, scelteDef = {}, chiave = 'palestra-lab-' + cfg.chiave, salvati = { stelle: {}, medaglie: {} }, esiti = {}, particelle = [], teli = [], fmts = {};
    try { var s0 = JSON.parse(localStorage.getItem(chiave)); if (s0 && s0.stelle) salvati = s0; } catch (e) {}
    function salva() { try { localStorage.setItem(chiave, JSON.stringify(salvati)); } catch (e) {} }
    L.salvati = salvati;

    // ---------- missioni e medaglie ----------
    function disegnaMissioni() {
      $('missioni').innerHTML = cfg.missioni.map(function (m) {
        var fatta = !!salvati.stelle[m.n], att = L.mis === m.n;
        return '<section class="missione' + (att ? ' attiva' : '') + (fatta ? ' fatta' : '') + '" id="mis-' + m.n + '"><h3><span class="stella">★</span>' + m.n + '. ' + m.titolo + '</h3><p>' + m.testo + '</p>' +
          '<div class="corpo">' + (m.corpo || '') + '<div class="esito" id="es-' + m.n + '" role="status"></div></div>' +
          '<div><button class="btn secondario" data-m="' + m.n + '">' + (att ? 'Esci dalla missione' : (fatta ? 'Rifai' : 'Inizia')) + '</button></div></section>';
      }).join('');
      Object.keys(esiti).forEach(function (k) { var e = $('es-' + k); if (e) { e.className = esiti[k].c; e.innerHTML = esiti[k].h; } });
      $('stelle').textContent = '★ ' + Object.keys(salvati.stelle).length + '/' + cfg.missioni.length;
      $('medaglie').innerHTML = cfg.medaglie.map(function (m) {
        var v = !!salvati.medaglie[m.id];
        return '<span class="medaglia' + (v ? ' vinta' : '') + '">' + (v ? '🏅' : '○') + ' ' + m.nome + (v ? '' : ': ' + m.come) + '</span>';
      }).join('');
    }
    L.esito = function (n, html, ok) { esiti[n] = { c: 'esito ' + (ok ? 'ok' : 'no'), h: html }; var e = $('es-' + n); if (e) { e.className = esiti[n].c; e.innerHTML = html; } };
    L.premia = function (id) { if (!salvati.medaglie[id]) { salvati.medaglie[id] = true; salva(); disegnaMissioni(); } };
    L.stella = function (n) {
      salvati.stelle[n] = true;
      if (cfg.missioni.every(function (m) { return salvati.stelle[m.n]; })) salvati.medaglie.tutte = true;
      salva(); disegnaMissioni(); L.festa();
    };
    L.sugg = function (t) { $('sugg').textContent = t; };
    $('missioni').addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.m) {
        var n = +b.dataset.m;
        if (L.mis === n) { L.mis = null; delete esiti[n]; disegnaMissioni(); if (L.onMissione) L.onMissione(null); return; }
        L.mis = n; L.risposto = false; esiti = {}; tent = {};
        disegnaMissioni();
        if (L.onMissione) L.onMissione(n);
        if (L.onMissione) { var t = $('tela'); if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        return;
      }
      if (b.closest('.scelte') && b.dataset.r !== undefined) {
        if (L.risposto) return; L.risposto = true;
        [].forEach.call(b.parentNode.children, function (x) { x.disabled = true; });
        if (L.onScelta) L.onScelta(L.mis, b.dataset.r, b); else L.rispScelta(L.mis, +b.dataset.r, b);
        return;
      }
      if (b.id && L.azioni[b.id]) L.azioni[b.id]();
    });
    $('missioni').addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' || !ev.target.closest('.prova')) return;
      var b = ev.target.closest('.prova').querySelector('button'); if (b) b.click();
    });
    L.fineMissione = function () { L.mis = null; disegnaMissioni(); };
    L.reset = function () { L.risposto = false; };

    // ---------- coriandoli ----------
    var inFesta = false;
    L.festa = function () {
      var cs = [col('--oro'), col('--accento'), col('--l3'), col('--l1'), col('--l4')], T = teli[0], w = T ? T.W : 300, h = T ? T.H : 300;
      for (var i = 0; i < 70; i++) particelle.push({ x: w / 2, y: h * 0.35, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 8 - 2, vita: 1, c: cs[i % cs.length] });
      if (!inFesta) { inFesta = true; requestAnimationFrame(cicloFesta); }
    };
    function cicloFesta() {
      particelle.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vita -= 0.015; });
      particelle = particelle.filter(function (p) { return p.vita > 0; });
      teli.forEach(function (T) { T.ridisegna(); });
      if (particelle.length) requestAnimationFrame(cicloFesta); else inFesta = false;
    }

    // ---------- canvas ----------
    L.tela = function (id, disegna) {
      var c = $(id), ctx = c.getContext('2d'), T = { c: c, ctx: ctx, W: 0, H: 0 };
      function dim() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2.5), r = c.getBoundingClientRect();
        T.W = r.width; T.H = r.height; c.width = Math.round(T.W * dpr); c.height = Math.round(T.H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); T.ridisegna();
      }
      T.ridisegna = function () {
        if (!T.W) return;
        ctx.clearRect(0, 0, T.W, T.H); ctx.textAlign = 'left'; ctx.lineCap = 'butt'; ctx.setLineDash([]);
        disegna(ctx, T.W, T.H, colori());
        particelle.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.vita); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 6, 6); });
        ctx.globalAlpha = 1;
      };
      window.addEventListener('resize', dim);
      if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { T.ridisegna(); });
      teli.push(T); dim(); return T;
    };
    L.puntatore = function (T, h) {
      var c = T.c, premuto = false;
      function pos(ev) { var r = c.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
      c.addEventListener('pointerdown', function (ev) {
        var p = pos(ev); if (h.giu && h.giu(p.x, p.y, ev) === false) return;
        premuto = true; try { c.setPointerCapture(ev.pointerId); } catch (e) {}
      });
      c.addEventListener('pointermove', function (ev) { if (premuto && h.muovi) { var p = pos(ev); h.muovi(p.x, p.y, ev); } });
      function su(ev) { if (!premuto) return; premuto = false; if (h.su) { var p = pos(ev); h.su(p.x, p.y, ev); } }
      c.addEventListener('pointerup', su); c.addEventListener('pointercancel', su);
    };
    L.ciclo = function (fn) {
      var ultimo = null;
      (function f(ora) { var dt = ultimo == null ? 0 : Math.min(0.05, (ora - ultimo) / 1000); ultimo = ora; fn(dt, ora / 1000); requestAnimationFrame(f); })(performance.now());
    };

    // ---------- piano cartesiano ----------
    L.piano = function (ctx, W, H, o) {
      var C = colori(), m = o.m == null ? 14 : o.m, xmin = o.x[0], xmax = o.x[1], ymin = o.y[0], ymax = o.y[1];
      var sx = (W - 2 * m) / (xmax - xmin), sy = (H - 2 * m) / (ymax - ymin);
      if (o.uguale) { sx = sy = Math.min(sx, sy); }
      var left = (W - sx * (xmax - xmin)) / 2, bottom = (H - sy * (ymax - ymin)) / 2;
      var P = { sx: sx, sy: sy, C: C, xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
      P.X = function (x) { return left + (x - xmin) * sx; };
      P.Y = function (y) { return H - bottom - (y - ymin) * sy; };
      P.x = function (px) { return xmin + (px - left) / sx; };
      P.y = function (py) { return ymin + (H - bottom - py) / sy; };
      P.griglia = function (p, et) {
        var i;
        ctx.lineWidth = 1; ctx.strokeStyle = C.riga; ctx.fillStyle = C.tenue; ctx.font = '12px ' + col('--testo');
        for (i = Math.ceil(xmin / p - 1e-9); i * p <= xmax + 1e-9; i++) { ctx.beginPath(); ctx.moveTo(P.X(i * p), P.Y(ymin)); ctx.lineTo(P.X(i * p), P.Y(ymax)); ctx.stroke(); }
        for (i = Math.ceil(ymin / p - 1e-9); i * p <= ymax + 1e-9; i++) { ctx.beginPath(); ctx.moveTo(P.X(xmin), P.Y(i * p)); ctx.lineTo(P.X(xmax), P.Y(i * p)); ctx.stroke(); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
        if (ymin <= 0 && ymax >= 0) { ctx.beginPath(); ctx.moveTo(P.X(xmin), P.Y(0)); ctx.lineTo(P.X(xmax), P.Y(0)); ctx.stroke(); }
        if (xmin <= 0 && xmax >= 0) { ctx.beginPath(); ctx.moveTo(P.X(0), P.Y(ymin)); ctx.lineTo(P.X(0), P.Y(ymax)); ctx.stroke(); }
        if (et !== false) {
          var e = et || p, ya = Math.min(Math.max(P.Y(0), 12), H - 6);
          ctx.fillStyle = C.tenue; ctx.textAlign = 'center';
          for (i = Math.ceil(xmin / e - 1e-9); i * e <= xmax + 1e-9; i++) if (i) ctx.fillText(bello(i * e), P.X(i * e), Math.min(ya + 14, H - 3));
          var xa = Math.min(Math.max(P.X(0), 22), W - 4); ctx.textAlign = 'right';
          for (i = Math.ceil(ymin / e - 1e-9); i * e <= ymax + 1e-9; i++) if (i) ctx.fillText(bello(i * e), xa - 4, P.Y(i * e) + 4);
          ctx.textAlign = 'left';
        }
      };
      P.curva = function (f, op) {
        op = op || {}; var a = op.da == null ? xmin : op.da, b = op.a == null ? xmax : op.a, N = op.N || 400, prev = null;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
        ctx.strokeStyle = op.c || C.acc; ctx.lineWidth = op.w || 3; ctx.lineCap = 'round'; ctx.setLineDash(op.dash || []);
        ctx.beginPath();
        for (var i = 0; i <= N; i++) {
          var x = a + (b - a) * i / N, y = f(x);
          if (y == null || !isFinite(y) || Math.abs(P.Y(y)) > H * 6) { prev = null; continue; }
          var X = P.X(x), Y = P.Y(y);
          if (prev && Math.abs(Y - prev) > H * 0.9) prev = null;
          if (prev == null) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          prev = Y;
        }
        ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
      };
      P.retta = function (A, B, Cc, op) { // retta A x + B y = C
        op = op || {};
        if (Math.abs(B) < 1e-12) { if (Math.abs(A) < 1e-12) return; var x0 = Cc / A; P.segm(x0, ymin, x0, ymax, op.c, op.w, op.dash); }
        else P.curva(function (x) { return (Cc - A * x) / B; }, { c: op.c, w: op.w, dash: op.dash, N: 120 });
      };
      P.segm = function (x1, y1, x2, y2, c, w, dash) {
        ctx.strokeStyle = c || C.ink; ctx.lineWidth = w || 2; ctx.setLineDash(dash || []); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(P.X(x1), P.Y(y1)); ctx.lineTo(P.X(x2), P.Y(y2)); ctx.stroke(); ctx.setLineDash([]);
      };
      P.punto = function (x, y, r, c, vuoto) {
        ctx.beginPath(); ctx.arc(P.X(x), P.Y(y), r || 6, 0, 2 * Math.PI);
        if (vuoto) { ctx.fillStyle = C.foglio; ctx.fill(); ctx.strokeStyle = c || C.ink; ctx.lineWidth = 2.5; ctx.stroke(); }
        else { ctx.fillStyle = c || C.acc; ctx.fill(); }
      };
      P.testo = function (t, x, y, c, al, font) { ctx.fillStyle = c || C.ink; ctx.font = font || '700 13px ' + col('--testo'); ctx.textAlign = al || 'left'; ctx.fillText(t, P.X(x), P.Y(y)); ctx.textAlign = 'left'; };
      P.freccia = function (x1, y1, x2, y2, c, w) { freccia(ctx, P.X(x1), P.Y(y1), P.X(x2), P.Y(y2), c, w); };
      return P;
    };


    // ---------- verifica automatica delle risposte ----------
    function aiuto(n, t, dir, o) {
      var h = t === 1 ? 'Non ci siamo' + (dir ? ': il tuo valore è ' + dir + '.' : '.') : (o.aiuto || 'Rimetti le mani sulla scena e rifai il conto con calma.');
      return h;
    }
    L.verifica = function (n, att, o) {
      o = o || {}; var tol = o.tol == null ? 0.03 : o.tol;
      L.azioni['b-' + n] = function () {
        var vals, ok = false, dir = '';
        if (o.lista) {
          vals = lista($('r-' + n).value);
          if (!vals.length) { L.esito(n, 'Scrivi i valori (anche separati da punto e virgola).', false); return; }
          var A = att.slice().sort(function (a, b) { return a - b; }), V = vals.slice().sort(function (a, b) { return a - b; });
          ok = A.length === V.length && A.every(function (a, i) { return Math.abs(a - V[i]) <= Math.max(tol, 1e-9); });
        } else if (Array.isArray(att)) {
          vals = att.map(function (a, i) { return num($('r-' + n + (i ? '-' + (i + 1) : '')).value); });
          if (vals.some(function (v) { return v == null; })) { L.esito(n, 'Riempi tutte le caselle con dei numeri.', false); return; }
          var bad = [];
          att.forEach(function (a, i) { var t = (o.tols && o.tols[i] != null) ? o.tols[i] : tol, good = o.abs ? Math.abs(vals[i] - a) <= t : (a === 0 ? Math.abs(vals[i]) <= t : Math.abs(vals[i] - a) <= t * Math.abs(a)); if (!good) bad.push(i + 1); });
          ok = !bad.length; if (!ok) dir = (o.nomi ? 'sbagliato: ' + bad.map(function (i) { return o.nomi[i - 1]; }).join(', ') : 'sbagliata la casella ' + bad.join(' e '));
        } else {
          var v = num($('r-' + n).value); if (v == null) { L.esito(n, 'Scrivi un numero.', false); return; }
          ok = o.abs ? Math.abs(v - att) <= tol : (att === 0 ? Math.abs(v) <= tol : Math.abs(v - att) <= tol * Math.abs(att));
          dir = v < att ? 'troppo piccolo' : 'troppo grande';
        }
        if (ok) { L.esito(n, o.ok || 'Esatto!', true); if (o.dopo) o.dopo(); L.stella(n); return; }
        tent[n] = (tent[n] || 0) + 1;
        var t = tent[n], h = t === 1 ? 'Non ci siamo' + (dir ? ' (' + dir + ').' : '.') : (o.aiuto || 'Rimetti le mani sulla scena e rifai il conto con calma.');
        if (t >= 2 && o.dir && dir) h += ' Il tuo valore è ' + dir + '.';
        L.esito(n, h, false);
      };
    };
    L.scelta = function (n, giusta, ok, no, dopo) { scelteDef[n] = { g: giusta, ok: ok, no: no, dopo: dopo }; };
    L.rispScelta = function (n, i, b) {
      var d = scelteDef[n]; if (!d) return;
      if (i === d.g) {
        b.classList.add('giusta'); L.esito(n, d.ok, true); if (d.dopo) d.dopo(true); L.stella(n);
      } else {
        tent[n] = (tent[n] || 0) + 1; L.esito(n, tent[n] > 1 && d.aiuto ? d.aiuto : d.no, false);
        b.classList.add('sbagliata'); L.risposto = false;
        [].forEach.call(b.parentNode.children, function (x) { if (!x.classList.contains('sbagliata')) x.disabled = false; });
        if (d.dopo) d.dopo(false);
      }
    };

    // ---------- comandi ----------
    L.cursore = function (id, f, cb) {
      fmts[id] = f; var el = $(id);
      el.addEventListener('input', function () { $('o-' + id).textContent = f(+el.value); if (cb) cb(+el.value); });
      $('o-' + id).textContent = f(+el.value);
    };
    L.imposta = function (id, v) { var el = $(id); el.value = v; $('o-' + id).textContent = fmts[id](+el.value); };
    L.valore = function (id) { return +$(id).value; };
    L.blocca = function (ids, b) { [].concat(ids).forEach(function (id) { $(id).disabled = b; var c = $('c-' + id); if (c) c.classList.toggle('bloccato', b); }); };
    L.tab = function (id, cb) {
      $(id).addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b || b.disabled) return; L.impostaTab(id, b.dataset.v); if (cb) cb(b.dataset.v); });
    };
    L.impostaTab = function (id, v) { [].forEach.call($(id).children, function (b) { b.setAttribute('aria-pressed', b.dataset.v === String(v)); }); };
    L.misure = function (lista) { $('misure').innerHTML = lista.map(function (x) { return '<div><small>' + x[0] + '</small><b>' + x[1] + '</b></div>'; }).join(''); };
    L.formule = function (html) { $('formule').innerHTML = html; };
    L.vicino = function (a, b, tol) { return Math.abs(a - b) <= tol; };
    L.rel = function (a, b, tol) { return Math.abs(a - b) <= tol * Math.abs(b); };

    (function rf() { teli.forEach(function (T) { T.ridisegna(); }); requestAnimationFrame(rf); })();
    disegnaMissioni();
    return L;
  }
  window.Lab = { init: init, fmt: fmt, bello: bello, num: num };
})();
