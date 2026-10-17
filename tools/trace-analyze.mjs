// Attribution des à-coups d’un duel joué (passe 12), à partir du relevé de la page (`perf-trace.mjs` :
// intervalles rAF, contexte de jeu, Long Animation Frames) et, si présente, de la trace Chrome (CDP).
// Pour chaque intervalle rAF > 50 ms : contexte (tour, phase, temps de résolution), LoAF chevauchantes
// (scripts responsables ramenés au code source par la source map du build), et dans la trace :
// occupation du fil principal, temps propre par catégorie (script, style, mise en page, peinture, GC,
// décodage d’image, compilation, attentes GPU), fonctions échantillonnées par V8 (temps propre et
// inclusif, ramenées à `src/…:ligne fonction`) et activité du fil principal du processus GPU.
//
// Ligne de commande (ré-analyse d’un relevé existant) :
//   node tools/trace-analyze.mjs <relevé.page.json> [<trace.json.gz>] [<dossier du build>=dist] [<sortie.json>]
import { createReadStream, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip, gzipSync } from 'node:zlib';
import { basename, join } from 'node:path';
import readline from 'node:readline';

export const HITCH_MS = 50;

// --- Source map (VLQ base64, format v3) ----------------------------------------------------------
const B64 = new Int8Array(128).fill(-1);
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach((ch, i) => { B64[ch.charCodeAt(0)] = i; });

function decodeMappings(mappings) {
  const lines = [];
  let line = [];
  let genCol = 0;
  let src = 0;
  let sLine = 0;
  let sCol = 0;
  let name = 0;
  let seg = [];
  let value = 0;
  let shift = 0;
  const flush = () => {
    if (!seg.length) return;
    genCol += seg[0];
    const s = [genCol, -1, 0, 0, -1];
    if (seg.length >= 4) { src += seg[1]; sLine += seg[2]; sCol += seg[3]; s[1] = src; s[2] = sLine; s[3] = sCol; }
    if (seg.length >= 5) { name += seg[4]; s[4] = name; }
    line.push(s);
    seg = [];
  };
  for (let i = 0; i < mappings.length; i++) {
    const ch = mappings.charCodeAt(i);
    if (ch === 44) { flush(); continue; } // ,
    if (ch === 59) { flush(); lines.push(line); line = []; genCol = 0; continue; } // ;
    const d = B64[ch];
    value += (d & 31) << shift;
    if (d & 32) shift += 5;
    else { seg.push(value & 1 ? -(value >>> 1) : value >>> 1); value = 0; shift = 0; }
  }
  flush();
  lines.push(line);
  return lines;
}

/** Nom de la fonction déclarée sur une ligne de source (déclaration, méthode, flèche affectée). */
function fnNameOnLine(text) {
  if (!text) return null;
  const pats = [
    /function\s*\*?\s*([\w$]+)\s*\(/,
    /([\w$]+)\s*[:=]\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|[\w$]+\s*=>)/,
    /^\s*(?:export\s+)?(?:async\s+)?(?:static\s+)?(?:private\s+|public\s+|protected\s+)?(?:readonly\s+)?(?:get\s+|set\s+)?([\w$]+)\s*(?:<[^>]*>)?\s*\(/,
    /class\s+([\w$]+)/,
  ];
  for (const p of pats) {
    const m = text.match(p);
    if (m && !['if', 'for', 'while', 'switch', 'return', 'catch', 'function'].includes(m[1])) return m[1];
  }
  return null;
}

/** Correspondance positions du bundle → source pour le build servi (`<dist>/assets/*.js(.map)`). */
export function loadBundleMapper(distDir) {
  const dir = join(distDir, 'assets');
  const js = existsSync(dir) ? readdirSync(dir).find((f) => f.endsWith('.js')) : null;
  if (!js || !existsSync(join(dir, `${js}.map`))) return null;
  const map = JSON.parse(readFileSync(join(dir, `${js}.map`), 'utf8'));
  const lines = decodeMappings(map.mappings);
  const code = readFileSync(join(dir, js), 'utf8');
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) lineStarts.push(i + 1);
  const srcLines = new Map();
  const sourceLine = (si, ln) => {
    if (!srcLines.has(si)) srcLines.set(si, (map.sourcesContent?.[si] ?? '').split('\n'));
    return srcLines.get(si)[ln] ?? '';
  };
  const short = (s) => s.replace(/^(\.\.\/)+/, '').replace(/^node_modules\//, '');
  const mapPos = (line0, col0) => {
    const segs = lines[line0];
    if (!segs?.length) return null;
    let lo = 0;
    let hi = segs.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (segs[mid][0] <= col0) lo = mid; else hi = mid - 1; }
    const s = segs[lo];
    if (s[0] > col0 || s[1] < 0) return null;
    return { source: short(map.sources[s[1]]), line: s[2] + 1, col: s[3], name: s[4] >= 0 ? map.names[s[4]] : null, text: sourceLine(s[1], s[2]) };
  };
  const label = (line0, col0, fallback) => {
    const p = mapPos(line0, col0);
    if (!p) return `${fallback || '(anonyme)'} [bundle ${line0 + 1}:${col0 + 1}]`;
    return `${p.source}:${p.line} ${fnNameOnLine(p.text) ?? p.name ?? fallback ?? '(anonyme)'}`;
  };
  const charToPos = (pos) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return [lo, pos - lineStarts[lo]];
  };
  return { file: js, mapPos, label, labelAtChar: (pos, fallback) => { const [l, c] = charToPos(pos); return label(l, c, fallback); }, isBundle: (url) => !!url && url.endsWith(`/${js}`) };
}

// --- Trace Chrome ---------------------------------------------------------------------------------
/** Lignes d’une trace gzip du flux de Chrome (un évènement JSON par ligne), sans tout charger. */
async function* traceLines(file) {
  const rl = readline.createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  for await (let line of rl) {
    line = line.replace(/^\{"traceEvents":\[/, '').replace(/,$/, '').replace(/\]\s*(,"metadata".*)?\}$/, '');
    if (line.startsWith('{')) yield line;
  }
}
const parse = (line) => { try { return JSON.parse(line); } catch { return null; } };

/**
 * Lecture filtrée en deux passes (une trace de duel pèse plusieurs centaines de Mo) : 1) métadonnées et
 * repères de synchronisation ; 2) évènements du fil principal de la page, du fil principal du processus
 * GPU et de l’échantillonneur V8 uniquement.
 */
export async function readTraceFiltered(file, markNames) {
  const meta = [];
  const marks = [];
  for await (const line of traceLines(file)) {
    if (line.includes('"ph":"M"')) { const e = parse(line); if (e) meta.push(e); } else if (markNames.some((m) => line.includes(m))) { const e = parse(line); if (e) marks.push(e); }
  }
  const mark = marks.find((e) => e.cat?.includes('blink.user_timing')) ?? marks[0];
  if (!mark) return { meta, marks, events: [] };
  const name = (kind, pid, tid = '') => meta.find((e) => e.name === kind && e.pid === pid && (kind === 'process_name' || e.tid === tid))?.args?.name;
  const gpuPid = meta.find((e) => e.name === 'process_name' && e.args?.name === 'GPU Process')?.pid ?? null;
  const gpuTid = gpuPid !== null ? meta.find((e) => e.name === 'thread_name' && e.pid === gpuPid && e.args?.name === 'CrGpuMain')?.tid ?? null : null;
  // Fils du processus GPU qui dessinent (compositeur d’affichage, Skia) : à qui appartient le travail GPU d’un à-coup.
  const gpuOther = gpuPid !== null ? meta.filter((e) => e.name === 'thread_name' && e.pid === gpuPid && /VizCompositor|DrDc|CompositorGpu/.test(e.args?.name ?? '')).map((e) => ({ tid: e.tid, name: e.args.name })) : [];
  const has = (line, pid, tid) => line.includes(`"pid":${pid},`) && (line.includes(`"tid":${tid},`) || line.includes(`"tid":${tid}}`));
  const events = [];
  for await (const line of traceLines(file)) {
    if (has(line, mark.pid, mark.tid) || (gpuPid !== null && has(line, gpuPid, gpuTid)) || gpuOther.some((t) => has(line, gpuPid, t.tid)) || (line.includes(`"pid":${mark.pid},`) && /"name":"Profile(Chunk)?"/.test(line))) {
      const e = parse(line);
      if (e && e.ph !== 'M') events.push(e);
    }
  }
  return { meta, marks, mark, events, main: { pid: mark.pid, tid: mark.tid, name: name('thread_name', mark.pid, mark.tid) }, gpu: gpuPid !== null && gpuTid !== null ? { pid: gpuPid, tid: gpuTid } : null, gpuOther };
}

export function categoryOf(name) {
  if (/GC|Scavenge|Sweep|MarkCompact|Marking|BlinkGC|CppGC|ThreadState::/.test(name)) return 'gc';
  if (/[Cc]ompile|ParseOnBackground|v8\.parse|V8\.Parse|ScriptStreamer/.test(name)) return 'js-compile';
  if (/^(UpdateLayoutTree|RecalculateStyles|ScheduleStyleRecalculation|ParseAuthorStyleSheet|Document::Update|StyleEngine)/.test(name)) return 'style';
  if (/^(Layout|UpdateLayerTree|LocalFrameView::layout|IntersectionObserver|ComputeIntersections|HitTest)/.test(name)) return 'layout';
  if (/^(Paint|PrePaint|Layerize|Commit|PaintImage|UpdateLayer|CompositeLayers|LocalFrameView::RunPaint|LocalFrameView::RunPrePaint|LocalFrameView::RunLayerize|ProxyMain|LayerTreeHost|Animation)/.test(name)) return 'paint/commit';
  if (/Decode|LazyPixelRef|ImageResource|ImageFrameGenerator/.test(name)) return 'image-decode';
  if (/CommandBuffer|GLES2|GpuChannel|SyncToken|SharedImage|WebGL|Gpu|ANGLE|gl::/.test(name)) return 'gpu-ipc';
  if (/^(FunctionCall|EvaluateScript|TimerFire|FireAnimationFrame|EventDispatch|RunMicrotasks|FireIdleCallback|HandlePostMessage|v8\.|V8\.|ProfileCall|XHR|MessagePort|PerformanceObserver)/.test(name)) return 'script';
  if (name === 'ParseHTML') return 'html';
  return 'other';
}

/** Évènements « durée » d’un fil (X et paires B/E), triés, avec temps propre (enfants déduits). */
function threadIntervals(events) {
  const out = [];
  const open = new Map();
  for (const e of events) {
    if (e.ph === 'X' && typeof e.dur === 'number') out.push({ name: e.name, cat: e.cat, ts: e.ts, dur: e.dur, tdur: e.tdur, args: e.args });
    else if (e.ph === 'B') { if (!open.has(e.name)) open.set(e.name, []); open.get(e.name).push(e); }
    else if (e.ph === 'E') { const b = open.get(e.name)?.pop(); if (b) out.push({ name: b.name, cat: b.cat, ts: b.ts, dur: e.ts - b.ts, args: { ...b.args, ...e.args } }); }
  }
  out.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const stack = [];
  for (const ev of out) {
    ev.child = 0;
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= ev.ts) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) { parent.child += Math.min(ev.dur, parent.ts + parent.dur - ev.ts); ev.depth = parent.depth + 1; } else ev.depth = 0;
    stack.push(ev);
  }
  for (const ev of out) ev.self = Math.max(0, ev.dur - ev.child);
  return out;
}

const TOP_TASK = /^(RunTask|ThreadControllerImpl::RunTask|ThreadPool_RunTask)$/;
const ms = (us) => Math.round(us / 100) / 10;

/** Échantillons V8 du fil principal : [{ t (µs trace), node }], nœuds avec parent et libellé source. */
function cpuSamples(events, pid, tid, mapper) {
  const profiles = new Map();
  for (const e of events) {
    if (e.pid !== pid || (e.name !== 'Profile' && e.name !== 'ProfileChunk')) continue;
    if (!profiles.has(e.id)) profiles.set(e.id, { tid: null, start: 0, nodes: new Map(), samples: [], t: 0 });
    const p = profiles.get(e.id);
    if (e.name === 'Profile') { p.tid = e.tid; p.start = e.args?.data?.startTime ?? e.ts; p.t = p.start; continue; }
    const d = e.args?.data ?? {};
    for (const n of d.cpuProfile?.nodes ?? []) p.nodes.set(n.id, n);
    const smp = d.cpuProfile?.samples ?? [];
    const dt = d.timeDeltas ?? [];
    for (let k = 0; k < smp.length; k++) { p.t += dt[k] ?? 0; p.samples.push([p.t, smp[k]]); }
  }
  const p = [...profiles.values()].filter((x) => x.tid === tid).sort((a, b) => b.samples.length - a.samples.length)[0]
    ?? [...profiles.values()].sort((a, b) => b.samples.length - a.samples.length)[0];
  if (!p) return null;
  const labels = new Map();
  const labelOf = (n) => {
    if (labels.has(n.id)) return labels.get(n.id);
    const cf = n.callFrame ?? {};
    let l;
    if (mapper?.isBundle(cf.url)) l = mapper.label(cf.lineNumber, cf.columnNumber, cf.functionName);
    else if (cf.url) l = `${cf.functionName || '(anonyme)'} [${basename(cf.url)}]`;
    else l = cf.functionName || '(natif)';
    labels.set(n.id, l);
    return l;
  };
  return { samples: p.samples.sort((a, b) => a[0] - b[0]), nodes: p.nodes, labelOf, isApp: (n) => mapper?.isBundle(n.callFrame?.url) };
}

function top(obj, n = 10) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, ms: ms(v) }));
}

/** Analyse d’un duel : relevé de la page (+ trace). Renvoie la liste des à-coups attribués et un résumé. */
export async function analyzeRun({ pageRecord, rawTrace, mapper, trimOut = null, commandFamily = null }) {
  const rec = JSON.parse(readFileSync(pageRecord, 'utf8'));
  const t0 = rec.frames[0]?.[0] ?? 0;
  const ctxAt = (t) => { let c = null; for (const [ct, s] of rec.ctx) { if (ct <= t) c = s; else break; } return c; };
  const hitches = rec.frames.filter(([, dt]) => dt > HITCH_MS).map(([t, dt, tag]) => ({ atS: Math.round((t - t0) / 100) / 10, dtMs: Math.round(dt * 10) / 10, tag, ctxStart: ctxAt(t - dt), ctxEnd: ctxAt(t), win: [t - dt, t] }));
  for (const h of hitches) {
    h.loaf = rec.loaf.filter((l) => l.startTime < h.win[1] && l.startTime + l.duration > h.win[0]).map((l) => ({
      durationMs: Math.round(l.duration), blockingMs: Math.round(l.blockingDuration),
      styleLayoutMs: Math.round(l.startTime + l.duration - l.styleAndLayoutStart), renderMs: Math.round(l.startTime + l.duration - l.renderStart),
      scripts: l.scripts.sort((a, b) => b.duration - a.duration).slice(0, 4).map((s) => ({
        ms: Math.round(s.duration), invoker: s.invoker, type: s.invokerType,
        fn: s.sourceCharPosition >= 0 && mapper?.isBundle(s.sourceURL) ? mapper.labelAtChar(s.sourceCharPosition, s.sourceFunctionName) : `${s.sourceFunctionName || '?'} [${s.sourceURL ? basename(s.sourceURL) : 'sans source'}]`,
        forcedStyleLayoutMs: Math.round(s.forcedStyleAndLayoutDuration),
      })),
    }));
  }
  let traceInfo = null;
  if (rawTrace && existsSync(rawTrace)) {
    const syncs = Array.isArray(rec.sync) ? rec.sync : rec.sync ? [rec.sync] : [];
    const tr = await readTraceFiltered(rawTrace, syncs.map((s) => s.mark));
    const sync = tr.mark ? syncs.find((s) => s.mark === tr.mark.name) : null;
    if (!sync) traceInfo = { error: 'repère de synchronisation absent de la trace' };
    else {
      const { events } = tr;
      const { pid, tid } = tr.main;
      const off = tr.mark.ts - sync.perfNow * 1000; // µs trace = performance.now() × 1000 + off
      const main = threadIntervals(events.filter((e) => e.pid === pid && e.tid === tid));
      const gpu = tr.gpu ? threadIntervals(events.filter((e) => e.pid === tr.gpu.pid && e.tid === tr.gpu.tid)) : [];
      const others = (tr.gpuOther ?? []).map((t) => ({ name: t.name, list: threadIntervals(events.filter((e) => e.pid === tr.gpu?.pid && e.tid === t.tid)) }));
      const prof = cpuSamples(events, pid, tid, mapper);
      traceInfo = { mainThread: tr.main.name, gpuThread: tr.gpu ? 'CrGpuMain' : null, syncMark: sync.mark, profileSamples: prof?.samples.length ?? 0, events: events.length };
      const clipSelf = (list, a, b) => {
        const by = {};
        for (const ev of list) {
          const e0 = ev.ts;
          const e1 = ev.ts + ev.dur;
          if (e1 <= a || e0 >= b || !ev.self) continue;
          const frac = ev.dur ? (Math.min(e1, b) - Math.max(e0, a)) / ev.dur : 0;
          by[ev.name] = (by[ev.name] ?? 0) + ev.self * frac;
        }
        return by;
      };
      for (const h of hitches) {
        const a = h.win[0] * 1000 + off;
        const b = h.win[1] * 1000 + off;
        const tasks = main.filter((ev) => ev.depth === 0 && TOP_TASK.test(ev.name) && ev.ts < b && ev.ts + ev.dur > a);
        const busy = tasks.reduce((s, ev) => s + Math.min(b, ev.ts + ev.dur) - Math.max(a, ev.ts), 0);
        const selfBy = clipSelf(main, a, b);
        const cats = {};
        for (const [n, v] of Object.entries(selfBy)) if (!TOP_TASK.test(n)) cats[categoryOf(n)] = (cats[categoryOf(n)] ?? 0) + v;
        const longTasks = tasks.filter((ev) => ev.dur > 10000).map((ev) => {
          const kids = main.filter((k) => k.depth === ev.depth + 1 && k.ts >= ev.ts && k.ts < ev.ts + ev.dur).sort((x, y) => y.dur - x.dur).slice(0, 3);
          return { startMs: ms(ev.ts - a), durMs: ms(ev.dur), top: kids.map((k) => `${k.name}${k.args?.data?.type ? `(${k.args.data.type})` : ''}${k.args?.data?.functionName ? `:${k.args.data.functionName}` : ''} ${ms(k.dur)} ms`) };
        });
        const js = { self: {}, incl: {} };
        if (prof) {
          const s = prof.samples;
          let i = 0;
          while (i < s.length && s[i][0] < a) i++;
          for (; i < s.length && s[i][0] < b; i++) {
            const w = Math.min(2000, (s[i + 1]?.[0] ?? s[i][0] + 100) - s[i][0]);
            let n = prof.nodes.get(s[i][1]);
            if (!n) continue;
            const leaf = prof.labelOf(n);
            if (leaf === '(idle)') continue;
            js.self[leaf] = (js.self[leaf] ?? 0) + w;
            const seen = new Set();
            for (; n; n = prof.nodes.get(n.parent)) {
              if (!prof.isApp(n)) continue;
              const l = prof.labelOf(n);
              if (!seen.has(l)) { seen.add(l); js.incl[l] = (js.incl[l] ?? 0) + w; }
            }
          }
        }
        h.trace = { busyMs: ms(busy), busyPct: Math.round((busy / (b - a)) * 100), categories: top(cats, 8), selfTop: top(Object.fromEntries(Object.entries(selfBy).filter(([n]) => !TOP_TASK.test(n))), 8), longTasks, jsSelf: top(js.self, 8), jsInclusive: top(js.incl, 10), gpuMain: top(clipSelf(gpu, a, b), 6), gpuOther: Object.fromEntries(others.map((o) => [o.name, top(clipSelf(o.list, a, b), 4)]).filter(([, v]) => v.length)) };
      }
      // Passe 13 : temps propre par catégorie dans chaque commande mesurée par la page (`rec.cmds`,
      // partie synchrone + style / mise en page forcés juste après), moyenne par famille ; et temps
      // PROCESSEUR du fil principal (`tdur`) de la tâche qui exécute la commande : il exclut le temps où le
      // fil attendait le processeur, donc la charge des autres programmes d’un poste partagé.
      if (commandFamily && Array.isArray(rec.cmds)) {
        const fams = {};
        const tasks = main.filter((ev) => ev.depth === 0 && TOP_TASK.test(ev.name));
        traceInfo.commandTasks = [];
        for (const x of rec.cmds.filter((y) => y.depth === 0 && y.ok)) {
          const a = x.t * 1000 + off;
          const b = (x.t + x.sync + x.flush) * 1000 + off;
          const cats = {};
          for (const [n, v] of Object.entries(clipSelf(main, a, b))) if (!TOP_TASK.test(n)) cats[categoryOf(n)] = (cats[categoryOf(n)] ?? 0) + v;
          const task = tasks.find((ev) => ev.ts <= a && ev.ts + ev.dur >= b);
          traceInfo.commandTasks.push({ type: x.type, player: x.player, phase: x.phase, family: commandFamily(x), wallMs: task ? ms(task.dur) : null, cpuMs: task && typeof task.tdur === 'number' ? ms(task.tdur) : null });
          for (const fam of [commandFamily(x), 'toutes commandes']) {
            const f = (fams[fam] ??= { n: 0, sum: {}, cpu: [] });
            f.n++;
            for (const [k, v] of Object.entries(cats)) f.sum[k] = (f.sum[k] ?? 0) + v;
            if (task && typeof task.tdur === 'number') f.cpu.push(task.tdur / 1000);
          }
        }
        traceInfo.commands = Object.fromEntries(Object.entries(fams).map(([k, f]) => [k, { n: f.n, meanMsByCategory: Object.fromEntries(Object.entries(f.sum).sort((p, q) => q[1] - p[1]).map(([c, v]) => [c, Math.round(v / f.n / 10) / 100])), taskCpuMs: distribution(f.cpu) }]));
      }
      if (trimOut) {
        // Trace réduite (DevTools › Performance › Charger) : métadonnées + fil principal et GPU autour des à-coups.
        const wins = hitches.map((h) => [h.win[0] * 1000 + off - 150000, h.win[1] * 1000 + off + 150000]);
        const metaKeep = tr.meta.filter((e) => e.pid === pid || e.pid === tr.gpu?.pid);
        const keep = [...metaKeep, ...events.filter((e) => e.name !== 'ProfileChunk' && e.name !== 'Profile' && wins.some(([x, y]) => e.ts >= x && e.ts <= y))];
        writeFileSync(trimOut, gzipSync(JSON.stringify({ traceEvents: keep })));
        traceInfo.trimmed = { file: trimOut, events: keep.length };
      }
    }
  }
  // Cause dominante par à-coup (règle explicite, consignée avec les chiffres qui la justifient).
  for (const h of hitches) h.cause = classify(h);
  const byCause = {};
  for (const h of hitches) byCause[h.cause] = (byCause[h.cause] ?? 0) + 1;
  return { count: hitches.length, over100: hitches.filter((h) => h.dtMs > 100).length, byCause, trace: traceInfo, hitches: hitches.map(({ win, ...rest }) => rest) };
}

/** Cause dominante d’un à-coup : trace si présente, sinon LoAF. */
export function classify(h) {
  if (h.trace) {
    if (h.trace.busyPct < 35) return 'fil principal libre (attente GPU / compositeur / horloge)';
    const cat = h.trace.categories[0]?.k ?? 'inconnu';
    const fn = h.trace.jsInclusive.find((x) => /^src\//.test(x.k))?.k ?? h.trace.jsInclusive[0]?.k;
    if (cat === 'script' && fn) return `script : ${fn.replace(/^(\S+) (.*)$/, '$2 ($1)')}`;
    if (cat === 'script') return `script : ${h.trace.jsSelf[0]?.k ?? 'non attribué'}`;
    return cat;
  }
  const l = h.loaf?.[0];
  if (!l) return 'aucune LoAF (attente hors fil principal ?)';
  if (l.styleLayoutMs > l.durationMs / 2) return 'style + mise en page';
  const s = l.scripts[0];
  return s ? `script : ${s.fn}` : 'LoAF sans script';
}

/** Famille d’une cause (comparaison entre builds : chemins de source normalisés, lignes ignorées). */
export function causeFamily(cause) {
  const c = cause.replace(/\S*src\//g, 'src/');
  if (/arena\.ts:\d+ loop/.test(c)) return 'boucle de l’arène (WebGL)';
  if (/board\.ts:55\d/.test(c)) return 'clic « Tour suivant » (re-rendu + illustrations)';
  if (/board\.ts:(49\d|5[0-4]\d)/.test(c)) return 'clic de commande (re-rendu)';
  if (/controller\.ts:5\d\d run/.test(c)) return 'réponse du rival (re-rendu de la révélation)';
  if (/^script/.test(c)) return 'autre script';
  if (/LoAF sans script|fil principal libre|aucune LoAF/.test(c)) return 'fil principal libre (GPU : Skia / compositeur)';
  return c;
}

/** Résumé par build d’une série de duels (`perf-trace`) : à-coups par duel et familles de causes. */
export function summarizeRuns(runs) {
  const out = {};
  for (const r of runs) {
    const k = r.build;
    out[k] ??= { duels: 0, over50: [], over100: [], maxMs: [], p99Ms: [], causes: {} };
    const o = out[k];
    o.duels++;
    o.over50.push(r.all?.over50ms ?? null);
    o.over100.push(r.all?.over100ms ?? null);
    o.maxMs.push(r.all?.maxMs ?? null);
    o.p99Ms.push(r.all?.p99Ms ?? null);
    for (const h of r.hitches?.hitches ?? []) { const fam = causeFamily(h.cause); o.causes[fam] = (o.causes[fam] ?? 0) + 1; }
  }
  for (const o of Object.values(out)) o.over50Total = o.over50.reduce((a, b) => a + (b ?? 0), 0);
  return out;
}

// --- Coût par commande (passe 13) : relevés `cmds` / `renders` / `beats` / `events` de perf-trace -----
const r1 = (x) => Math.round(x * 10) / 10;
/** Familles de tâches mesurées par commande (passe 13), noms alignés sur les causes de `trace-analyze`. */
export function commandFamily(x) {
  if (x.type === 'nextTurn') return 'clic « Tour suivant »';
  return x.player === 'p2' ? 'réponse du rival' : 'clic de commande';
}
function distribution(values) {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return null;
  const q = (k) => r1(s[Math.min(s.length - 1, Math.floor(k * s.length))]);
  const sum = s.reduce((a, b) => a + b, 0);
  return { n: s.length, medianMs: q(0.5), p75Ms: q(0.75), p95Ms: q(0.95), maxMs: r1(s[s.length - 1]), meanMs: r1(sum / s.length), sumMs: r1(sum) };
}
const total = (x) => x.sync + x.flush;
/** Valeurs par famille pour un relevé de page : tâche = partie synchrone + style / mise en page restants. */
function commandValues(rec) {
  const top = rec.cmds.filter((x) => x.depth === 0 && x.ok);
  const out = { 'toutes commandes': top.map(total) };
  for (const fam of ['clic de commande', 'clic « Tour suivant »', 'réponse du rival']) out[fam] = top.filter((x) => commandFamily(x) === fam).map(total);
  out['commandes avec changement de vue'] = top.filter((x) => x.viewChange).map(total);
  out['rendus hors commande'] = rec.renders.map(total);
  out['temps de résolution'] = rec.beats.map(total);
  out['clics (Event Timing ≥ 16 ms, jusqu’à l’image)'] = rec.events.filter((e) => e.name === 'click').map((e) => e.duration);
  return out;
}
export function summarizeCommands(rec) {
  return Object.fromEntries(Object.entries(commandValues(rec)).map(([k, v]) => [k, distribution(v)]));
}
/** Par build : toutes les commandes de tous les duels réunies (rondes entrelacées). */
export function summarizeCommandRuns(runs) {
  const raw = {};
  const duels = {};
  for (const r of runs) {
    const values = commandValues(JSON.parse(readFileSync(r.pageRecord, 'utf8')));
    duels[r.build] = (duels[r.build] ?? 0) + 1;
    raw[r.build] ??= {};
    for (const [k, v] of Object.entries(values)) (raw[r.build][k] ??= []).push(...v);
  }
  return Object.fromEntries(Object.entries(raw).map(([b, fams]) => [b, { duels: duels[b], families: Object.fromEntries(Object.entries(fams).map(([k, v]) => [k, distribution(v)])) }]));
}

/**
 * Deux builds, même seed : chaque ronde joue la même suite de commandes dans les deux builds. On compare
 * donc commande par commande, dans la même ronde (écart après − avant), ce qui retire la variance due au
 * type de commande ; la dérive du poste reste limitée par l’ordre ABBA. Les deux engagements d’un tour
 * sont secrets et simultanés : si le joueur verrouille avant la réponse du rival (650 ms), leur ordre
 * s’inverse et le hash final change (journal d’événements) sans changer la partie. L’appariement se fait
 * donc par type et phase de commande, et ces inversions sont comptées (`playerSwaps`).
 */
export function pairCommands(runs, metric = 'page') {
  const names = [...new Set(runs.map((r) => r.build))];
  if (names.length !== 2) return null;
  const [a, b] = names;
  // `page` : durée mesurée dans la page (synchrone + style / mise en page) ; `cpu` : temps processeur de la
  // tâche dans la trace (`commandTasks`, LQV_TRACE=1).
  const top = (r) => (metric === 'cpu'
    ? (r.hitches?.trace?.commandTasks ?? []).map((x) => ({ ...x, sync: x.cpuMs ?? NaN, flush: 0 }))
    : JSON.parse(readFileSync(r.pageRecord, 'utf8')).cmds.filter((x) => x.depth === 0 && x.ok));
  const rounds = [];
  const all = [];
  for (const round of [...new Set(runs.map((r) => r.round))]) {
    const ra = runs.find((r) => r.round === round && r.build === a && r.outcome === 'ended');
    const rb = runs.find((r) => r.round === round && r.build === b && r.outcome === 'ended');
    if (!ra || !rb || ra.turns !== rb.turns || ra.winner !== rb.winner) { rounds.push({ round, comparable: false }); continue; }
    const ca = top(ra);
    const cb = top(rb);
    const same = ca.length === cb.length && ca.every((x, i) => x.type === cb[i].type && x.phase === cb[i].phase);
    if (!same) { rounds.push({ round, comparable: false }); continue; }
    const d = ca.map((x, i) => total(cb[i]) - total(x)).filter(Number.isFinite);
    all.push(...d);
    rounds.push({ round, comparable: true, sameHash: ra.hash === rb.hash, playerSwaps: ca.filter((x, i) => x.player !== cb[i].player).length, n: d.length, medianDiffMs: distribution(d).medianMs, meanDiffMs: distribution(d).meanMs, fasterIn: d.filter((x) => x < 0).length, sumA: distribution(ca.map(total).filter(Number.isFinite)).sumMs, sumB: distribution(cb.map(total).filter(Number.isFinite)).sumMs });
  }
  return { metric, diff: `${b} − ${a}`, rounds, all: all.length ? { n: all.length, medianDiffMs: distribution(all).medianMs, meanDiffMs: distribution(all).meanMs, fasterIn: all.filter((x) => x < 0).length } : null };
}

// Ligne de commande : `--resume <perf-trace.json>` (résumé par build, coût par commande et comparaison
// appariée recalculés depuis les relevés de page), sinon analyse d’un relevé.
if (process.argv[1] && basename(process.argv[1]) === 'trace-analyze.mjs' && process.argv[2] === '--resume') {
  const runs = JSON.parse(readFileSync(process.argv[3], 'utf8')).runs;
  console.log(JSON.stringify({ summary: summarizeRuns(runs), commandSummary: summarizeCommandRuns(runs), commandPairs: pairCommands(runs), commandPairsCpu: runs.some((r) => r.hitches?.trace?.commandTasks) ? pairCommands(runs, 'cpu') : null }, null, 1));
} else if (process.argv[1] && basename(process.argv[1]) === 'trace-analyze.mjs') {
  const [pageRecord, rawTrace, dist = 'dist', out] = process.argv.slice(2);
  if (!pageRecord) { console.error('usage : node tools/trace-analyze.mjs <relevé.page.json> [<trace.json.gz>] [dist] [sortie.json]'); process.exit(2); }
  const res = await analyzeRun({ pageRecord, rawTrace: rawTrace && rawTrace !== '-' ? rawTrace : null, mapper: loadBundleMapper(dist), trimOut: process.env.LQV_TRIM_OUT ?? null, commandFamily });
  const text = JSON.stringify(res, null, 2);
  if (out) writeFileSync(out, text); else console.log(text);
}
