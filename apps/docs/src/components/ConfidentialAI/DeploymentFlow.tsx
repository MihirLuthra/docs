import React, { useEffect, useMemo, useState } from "react";
import Link from "@docusaurus/Link";
import SiteStorage from "@generated/site-storage";
import "./styles.css";
import {
  deployment, OPERATIONS, PHASES, pick, reached, RUNTIMES,
  type Account, type Asset, type AssetKind, type Deployment, type OperationId, type PhaseId, type Runtime, type Step, type Territory,
} from "./deployment";
import { ROLES, SCENARIOS, type RoleId } from "./scenarios";

// A deployment as a scene, step by step. Each party is a territory holding what
// it owns: its Fortanix accounts along the top row, its own machines along the
// bottom row. The parties are there from the start, since they are the
// scenario; their accounts, machines and the items in them appear at the step
// that brings them in. Each step's arrow curves through the space between or
// below the rows, so it never runs through anything.
//
// The scene is an SVG with a fixed shape that scales with the page, one shape
// for wide screens and one for narrow ones, so nothing around it ever moves.
//
// The runtime is chosen in day 0's first step. The choice is the page's
// runtime tab choice too (Docusaurus keeps it under docusaurus.tab.runtime).
//
// Props
//   scenario:  one scenario id (end-to-end guides)
//   scenarios: scenario ids to pick from, or true for all of them (role guides)
//   role:      highlight one role's territory and steps

// ---------- The runtime choice, shared with <Tabs groupId="runtime"> ----------

const TAB_KEY = `docusaurus.tab.runtime${SiteStorage.namespace}`;
const fromTab = (v: string | null): Runtime | null => RUNTIMES.find((r) => r.tab === v)?.id ?? null;

function writeRuntime(rt: Runtime) {
  try {
    const value = RUNTIMES.find((r) => r.id === rt)!.tab;
    const old = window.localStorage.getItem(TAB_KEY);
    window.localStorage.setItem(TAB_KEY, value);
    // Same-window listeners (the page's tabs) only hear a dispatched event.
    const event = document.createEvent("StorageEvent");
    event.initStorageEvent("storage", false, false, TAB_KEY, old, value, window.location.href, window.localStorage);
    window.dispatchEvent(event);
  } catch {
    // No storage: the choice holds for this diagram only.
  }
}

function useRuntime(): [Runtime, (rt: Runtime) => void] {
  const [rt, setRt] = useState<Runtime>("cc");
  useEffect(() => {
    try {
      const stored = fromTab(window.localStorage.getItem(TAB_KEY));
      if (stored) setRt(stored);
    } catch {
      // No storage: start from the default.
    }
    const listen = (e: StorageEvent) => {
      if (e.key === TAB_KEY) setRt(fromTab(e.newValue) ?? "cc");
    };
    window.addEventListener("storage", listen);
    return () => window.removeEventListener("storage", listen);
  }, []);
  return [rt, (next) => { setRt(next); writeRuntime(next); }];
}

// ---------- Layout ----------

type R = { x: number; y: number; w: number; h: number };

interface Layout {
  w: number;
  h: number;
  territories: Map<Territory, R>;
  items: Map<string, R>; // accounts and assets by id
  row: Map<string, "top" | "bottom">;
}

const LINE = 17; // an account item's line
const ACCOUNT_HEAD = 32;
const ASSET_H = 96;
const HEAD = 64; // a territory's name and roles, on up to two lines

/** About how wide text is at a font size; Inter averages a little over half an em. */
const textWidth = (text: string, size: number, bold = false) => text.length * size * (bold ? 0.6 : 0.55);
const charsFor = (avail: number, size: number) => Math.max(6, Math.floor(avail / (size * 0.55)));
/** Shrinks a line that would run past avail, so text never spills out of its card. */
const fit = (text: string, size: number, avail: number, bold = false) =>
  textWidth(text, size, bold) > avail ? { textLength: Math.max(10, avail), lengthAdjust: "spacingAndGlyphs" as const } : {};

const userOnly = (t: Territory) => t.roles.length === 1 && t.roles[0] === "user";
const assetsFor = (t: Territory, _rt?: Runtime) => t.assets;
const accountHeight = (d: Deployment) => ACCOUNT_HEAD + Math.max(...d.territories.flatMap((t) => t.accounts.map((a) => a.items.length))) * LINE + 8;

/** Wide: territories side by side, accounts on the top row, machines on the bottom row. */
function wideLayout(d: Deployment, rt: Runtime): Layout {
  const W = 760, M = 4, GAP = 12, PAD = 8, ROW_GAP = 60, BELOW = 30;
  const HA = accountHeight(d);
  const units = d.territories.map((t) => (userOnly(t) ? 0.95 : Math.max(t.accounts.length * 1.35, assetsFor(t, rt).length, 1.35)));
  const unit = (W - 2 * M - GAP * (units.length - 1)) / units.reduce((a, b) => a + b, 0);
  const yA = M + HEAD;
  const yB = yA + HA + ROW_GAP;
  const th = yB + ASSET_H + 12 - M;
  const layout: Layout = { w: W, h: M + th + BELOW, territories: new Map(), items: new Map(), row: new Map() };
  let x = M;
  d.territories.forEach((t, n) => {
    const tw = units[n] * unit;
    layout.territories.set(t, { x, y: M, w: tw, h: th });
    const place = (ids: string[], y: number, h: number, max: number, row: "top" | "bottom") => {
      if (!ids.length) return;
      const iw = tw - 2 * PAD;
      const w = Math.min(max, (iw - 10 * (ids.length - 1)) / ids.length);
      const start = x + PAD + (iw - (w * ids.length + 10 * (ids.length - 1))) / 2;
      ids.forEach((id, k) => {
        layout.items.set(id, { x: start + k * (w + 10), y, w, h });
        layout.row.set(id, row);
      });
    };
    place(t.accounts.map((a) => a.id), yA, HA, 240, "top");
    place(assetsFor(t, rt).map((a) => a.id), yB, ASSET_H, 170, "bottom");
    x += tw + GAP;
  });
  return layout;
}

/** Narrow: territories stacked, each with its accounts then its machines two to a row. */
function narrowLayout(d: Deployment, rt: Runtime): Layout {
  const W = 340, M = 4, GAP = 12, PAD = 10, AH = 84;
  const HA = accountHeight(d);
  const layout: Layout = { w: W, h: 0, territories: new Map(), items: new Map(), row: new Map() };
  let y = M;
  for (const t of d.territories) {
    const top = y;
    const iw = W - 2 * M - 2 * PAD;
    y += HEAD - 6;
    if (t.accounts.length) {
      const w = (iw - 10 * (t.accounts.length - 1)) / t.accounts.length;
      t.accounts.forEach((a, k) => layout.items.set(a.id, { x: M + PAD + k * (w + 10), y, w, h: HA }));
      y += HA + 10;
    }
    const assets = assetsFor(t, rt);
    const w = (iw - 10) / 2;
    assets.forEach((a, k) => layout.items.set(a.id, { x: M + PAD + (k % 2) * (w + 10), y: y + Math.floor(k / 2) * (AH + 10), w, h: AH }));
    y += Math.ceil(assets.length / 2) * (AH + 10) + 4;
    layout.territories.set(t, { x: M, y: top, w: W - 2 * M, h: y - top });
    y += GAP;
  }
  layout.h = y;
  return layout;
}

// ---------- Arrows ----------

type P = [number, number];

/** The arrow for a step: a curve through the gap between the rows, or below the bottom row. */
function arrowFor(l: Layout, from: string, to: string, badged: Set<string>): { path: string; mid: P } | null {
  const a0 = l.items.get(from);
  const b0 = l.items.get(to);
  if (!a0 || !b0) return null;
  // A card with a badge on its top edge: the arrow meets the badge, not the card under it.
  const lift = (r: R, id: string): R => (badged.has(id) ? { ...r, y: r.y - 11, h: r.h + 11 } : r);
  const a = lift(a0, from);
  const b = lift(b0, to);
  const ra = l.row.get(from);
  const rb = l.row.get(to);
  const cx = (r: R) => r.x + r.w / 2;
  let p: [P, P, P, P];
  if (ra === "top" && rb === "top") {
    const y = a.y + a.h;
    p = [[cx(a), y], [cx(a), y + 40], [cx(b), y + 40], [cx(b), y]];
  } else if (ra === "bottom" && rb === "bottom") {
    const y = a.y + a.h;
    p = [[cx(a), y], [cx(a), y + 34], [cx(b), y + 34], [cx(b), y]];
  } else {
    const [y1, y2] = ra === "top" ? [a.y + a.h, b.y] : [a.y, b.y + b.h];
    const m = (y1 + y2) / 2;
    p = [[cx(a), y1], [cx(a), m], [cx(b), m], [cx(b), y2]];
  }
  const mid: P = [0, 1].map((k) => 0.125 * p[0][k] + 0.375 * p[1][k] + 0.375 * p[2][k] + 0.125 * p[3][k]) as P;
  const f = (q: P) => `${Math.round(q[0])},${Math.round(q[1])}`;
  return { path: `M${f(p[0])} C${f(p[1])} ${f(p[2])} ${f(p[3])}`, mid };
}

// ---------- Drawing ----------

/** Splits text into lines of about n characters. */
function wrap(text: string, n: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > n) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

const ICONS: Record<AssetKind | "ccm" | "dsm", React.ReactNode> = {
  build: <><rect x="4" y="5" width="24" height="16" rx="2" /><path d="M1 25h30l-2 3H3z" /></>,
  registry: <><rect x="5" y="4" width="22" height="6" rx="2" /><rect x="5" y="12" width="22" height="6" rx="2" /><rect x="5" y="20" width="22" height="6" rx="2" /></>,
  infra: <><rect x="3" y="3" width="26" height="7" rx="2" /><rect x="3" y="12.5" width="26" height="7" rx="2" /><rect x="3" y="22" width="26" height="7" rx="2" /><circle cx="8" cy="6.5" r="1.2" /><circle cx="8" cy="16" r="1.2" /><circle cx="8" cy="25.5" r="1.2" /></>,
  clients: <><circle cx="11" cy="10" r="4.5" /><path d="M3 27c0-5 3.5-8 8-8s8 3 8 8" /><circle cx="23" cy="12" r="3.5" /><path d="M21 19.5c4.5-.5 8 2 8 7" /></>,
  hub: <path d="M9 25h15a6 6 0 0 0 .5-12 8 8 0 0 0-15.5 2A5 5 0 0 0 9 25z" />,
  ccm: <><path d="M8 1.5 2.5 3.5v4c0 3.4 2.3 5.9 5.5 7 3.2-1.1 5.5-3.6 5.5-7v-4z" /><path d="m5.5 8 1.8 1.8L10.8 6" /></>,
  dsm: <><circle cx="5" cy="8" r="3" /><path d="M8 8h6.5M12 8v2.5M14 8v2" /></>,
};

export function DeploymentFlow({ scenario, scenarios, role }: { scenario?: string; scenarios?: string[] | true; role?: RoleId }) {
  const ids = useMemo(() => {
    if (scenarios === true) return SCENARIOS.map((s) => s.id);
    if (scenarios) return scenarios;
    return [scenario ?? SCENARIOS[0].id];
  }, [scenario, scenarios]);

  const [scenarioId, setScenarioId] = useState(ids[0]);
  const [runtime, setRuntime] = useRuntime();
  const [phase, setPhase] = useState<PhaseId>("day0");
  const [op, setOp] = useState<OperationId>(OPERATIONS[0].id);
  const [index, setIndex] = useState(0);

  const d = useMemo(() => deployment(scenarioId), [scenarioId]);
  const all = d.steps[runtime];
  const byPhase = (p: PhaseId) => all.filter((s) => s.phase === p && (p !== "day2" || s.op === op));
  const steps = byPhase(phase);
  const i = Math.min(index, steps.length - 1);
  const step = steps[i];

  // Everything up to this step has happened: that is what the scene shows.
  const past = [...(phase === "day0" ? [] : byPhase("day0")), ...(phase === "day2" ? byPhase("day1") : []), ...steps.slice(0, i + 1)];
  const seen = new Set(past.map((s) => s.id));
  const has = (at: string[]) => reached(at, seen, runtime);
  const highlight = role ? d.scenario.parties.find((p) => p.roles.includes(role)) : undefined;

  const go = (p: PhaseId, n: number) => { setPhase(p); setIndex(n); };
  const order: PhaseId[] = ["day0", "day1", "day2"];
  const next = () => {
    if (i < steps.length - 1) return setIndex(i + 1);
    const p = order[order.indexOf(phase) + 1];
    if (p) go(p, 0);
  };
  const prev = () => {
    if (i > 0) return setIndex(i - 1);
    const p = order[order.indexOf(phase) - 1];
    if (p) go(p, byPhase(p).length - 1);
  };
  const atEnd = phase === "day2" && i === steps.length - 1;
  const atStart = phase === "day0" && i === 0;

  const wide = useMemo(() => wideLayout(d, runtime), [d, runtime]);
  const narrow = useMemo(() => narrowLayout(d, runtime), [d, runtime]);
  const key = `${scenarioId}-${runtime}-${phase}-${op}-${step?.id}`;

  const state = (id: string) => (step?.from === id && step.to !== id ? "from" : step?.to === id ? "to" : undefined);

  const renderAccount = (a: Account, r: R) => {
    if (!has(a.at)) return null;
    const label = a.service === "ccm" ? "CCM account" : "DSM account";
    return (
      <g key={a.id} className="cai-s-account" data-state={state(a.id)}>
        <rect className="cai-s-halo" x={r.x - 4} y={r.y - 4} width={r.w + 8} height={r.h + 8} rx="12" />
        <rect className="cai-s-card" x={r.x} y={r.y} width={r.w} height={r.h} rx="9" />
        <svg x={r.x + 10} y={r.y + 9} width="15" height="15" viewBox="0 0 16 16" className={`cai-s-icon is-${a.service}`}>{ICONS[a.service]}</svg>
        <text x={r.x + 31} y={r.y + 21} className="cai-s-title" {...fit(label, 13, r.w - 41, true)}>{label}</text>
        {a.items.map((it, k) => {
          if (!has(it.at)) return null;
          const text = pick(it.label, runtime);
          const y = r.y + ACCOUNT_HEAD + 12 + k * LINE;
          // The status goes right after the label: in words when it fits, else a tick or a dot.
          const avail = r.w - 24;
          const sx = r.x + 12 + Math.min(textWidth(text, 12), avail) + 6;
          const room = r.x + r.w - 8 - sx;
          const approved = it.done && has(it.done);
          return (
            <g key={it.id}>
              <text x={r.x + 12} y={y} className="cai-s-item" {...fit(text, 12, avail)}>{text}</text>
              {it.done && (
                <text x={sx} y={y} className={approved ? "cai-s-done" : "cai-s-pending"}>
                  {approved ? (room > 62 ? "✓ approved" : "✓") : room > 50 ? "pending" : "…"}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const renderAsset = (a: Asset, r: R) => {
    if (!has(a.at)) return null;
    const avail = r.w - 14;
    const title = wrap(a.name, charsFor(avail, 14)).slice(0, 2);
    const lines = wrap(pick(a.detail, runtime), charsFor(avail, 11.5)).slice(0, 3 - title.length);
    const teeOn = a.tee && seen.has(a.tee);
    return (
      <g key={a.id} className={`cai-s-asset${a.id === "infra" ? " is-infra" : ""}`} data-state={state(a.id)}>
        <rect className="cai-s-halo" x={r.x - 4} y={r.y - 4} width={r.w + 8} height={r.h + 8} rx="13" />
        <rect className="cai-s-card" x={r.x} y={r.y} width={r.w} height={r.h} rx="10" />
        <svg x={r.x + r.w / 2 - 15} y={r.y + 9} width="30" height="30" viewBox="0 0 32 32" className="cai-s-icon">{ICONS[a.id]}</svg>
        {title.map((t, k) => <text key={`t${k}`} x={r.x + r.w / 2} y={r.y + 56 + k * 14} textAnchor="middle" className="cai-s-title" {...fit(t, 13, avail, true)}>{t}</text>)}
        {lines.map((t, k) => <text key={k} x={r.x + r.w / 2} y={r.y + 57 + title.length * 14 + k * 13} textAnchor="middle" className="cai-s-muted" {...fit(t, 11.5, avail)}>{t}</text>)}
        {/* The workload, once deployed: a badge on the card's top edge, clear of its text. */}
        {teeOn && (() => {
          const full = "TEE · llama-chat";
          const label = textWidth(full, 11.5, true) + 20 <= r.w - 8 ? full : "TEE";
          const bw = textWidth(label, 11.5, true) + 20;
          return (
            <g className="cai-s-tee">
              <rect x={r.x + r.w / 2 - bw / 2} y={r.y - 11} width={bw} height="22" rx="11" />
              <text x={r.x + r.w / 2} y={r.y + 4} textAnchor="middle">{label}</text>
            </g>
          );
        })()}
      </g>
    );
  };

  const renderScene = (l: Layout, arrows: boolean, cls: string) => {
    const badged = new Set<string>(d.territories.flatMap((t) => t.assets.filter((a) => a.tee && seen.has(a.tee)).map((a) => a.id)));
    const arrow = arrows && step?.from && step.to && step.from !== step.to ? arrowFor(l, step.from, step.to, badged) : null;
    const target = !arrow && step?.carries && step.to ? l.items.get(step.to) : undefined;
    const pill = (x: number, y: number, text: string) => {
      const w = textWidth(text, 12, true) + 20;
      return (
        <g className="cai-s-carry" key={`${key}-pill`}>
          <rect x={x - w / 2} y={y - 11} width={w} height="22" rx="11" />
          <text x={x} y={y + 4} textAnchor="middle">{text}</text>
        </g>
      );
    };
    return (
      <svg className={`cai-scene ${cls}`} viewBox={`0 0 ${l.w} ${l.h}`} role="img" aria-label={`${d.scenario.label}, ${step?.title ?? ""}`}>
        <defs>
          <marker id={`cai-head-${cls}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="cai-s-head" />
          </marker>
        </defs>
        {d.territories.map((t) => {
          const r = l.territories.get(t)!;
          return (
            <g key={t.party.name} className="cai-s-territory" data-acting={step?.party === t.party} data-you={highlight === t.party}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="14" />
              <text x={r.x + 12} y={r.y + 22} className="cai-s-party" {...fit(`${t.party.name}${highlight === t.party ? " · you" : ""}`, 15, r.w - 24, true)}>
                {t.party.name}{highlight === t.party ? " · you" : ""}
              </text>
              {wrap(t.roles.map((x) => ROLES[x].name).join(" and "), charsFor(r.w - 24, 11.5)).slice(0, 2).map((line, k) => (
                <text key={k} x={r.x + 12} y={r.y + 38 + k * 14} className="cai-s-muted" {...fit(line, 11.5, r.w - 24)}>{line}</text>
              ))}
              {/* Nothing of theirs yet: what this party cares about, in their own space. */}
              {!t.accounts.some((a) => has(a.at)) && !assetsFor(t, runtime).some((a) => has(a.at)) && (
                wrap(t.party.cares ?? t.roles.map((x) => ROLES[x].cares).join(" "), charsFor(r.w - 28, 12.5)).slice(0, 6).map((line, k) => (
                  <text key={`c${k}`} x={r.x + 14} y={r.y + HEAD + 22 + k * 15} className="cai-s-cares">{line}</text>
                ))
              )}
              {t.accounts.map((a) => renderAccount(a, l.items.get(a.id)!))}
              {assetsFor(t, runtime).map((a) => renderAsset(a, l.items.get(a.id)!))}
            </g>
          );
        })}
        {arrow && (
          <g key={key} className="cai-s-arrow">
            <path d={arrow.path} pathLength={1} markerEnd={`url(#cai-head-${cls})`} />
            {step.carries && pill(arrow.mid[0], arrow.mid[1], step.carries)}
          </g>
        )}
        {target && step.carries && pill(target.x + target.w / 2, target.y + target.h + 2, step.carries)}
      </svg>
    );
  };

  const runtimeLabel = RUNTIMES.find((r) => r.id === runtime)!.label;

  return (
    <figure className="cai cai-deploy" aria-label="Deployment, step by step">
      {ids.length > 1 && (
        <label className="cai-select">
          <span>Deployment</span>
          <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); go("day0", 0); }}>
            {ids.map((id) => <option key={id} value={id}>{SCENARIOS.find((s) => s.id === id)!.label}</option>)}
          </select>
        </label>
      )}

      <nav className="cai-timeline" aria-label="Steps">
        {PHASES.map((p) => {
          const list = byPhase(p.id);
          return (
            <div key={p.id} className="cai-day" data-current={p.id === phase}>
              <span className="cai-day-label">{p.label}</span>
              {p.id === "day2" && (
                <select aria-label="Day 2 operation" value={op} onChange={(e) => { setOp(e.target.value as OperationId); go("day2", 0); }}>
                  {OPERATIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              )}
              <ol>
                {list.map((s, n) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-label={`${p.label}, step ${n + 1}, ${s.title}`}
                      aria-current={p.id === phase && n === i ? "step" : undefined}
                      data-done={order.indexOf(p.id) < order.indexOf(phase) || (p.id === phase && n < i)}
                      className={role && s.actor === role ? "is-yours" : undefined}
                      onClick={() => go(p.id, n)}
                    >
                      {n + 1}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
        <span className="cai-deploy-step-nav">
          <button type="button" onClick={prev} disabled={atStart}>Previous</button>
          <button type="button" onClick={next} disabled={atEnd}>Next</button>
        </span>
      </nav>

      <div className="cai-scene-wrap">
        {renderScene(wide, true, "is-wide")}
        {renderScene(narrow, false, "is-narrow")}
      </div>

      {/* Every step's text, for both runtimes, in one cell: the panel is as tall as the longest and the page doesn't move. */}
      <div className="cai-deploy-panels" aria-live="polite">
        {RUNTIMES.flatMap((r) => d.steps[r.id].map((s) => ({ s, r: r.id }))).map(({ s, r }) => {
          const active = r === runtime && s === step;
          return (
            <div key={`${r}-${s.phase}-${s.op ?? ""}-${s.id}`} className="cai-deploy-panel" data-active={active} aria-hidden={!active}>
              <p className="cai-deploy-who">
                {PHASES.find((p) => p.id === s.phase)!.label}
                {s.op ? ` · ${OPERATIONS.find((o) => o.id === s.op)!.label}` : ""}
                {" · "}
                {s.party ? `${s.party.name}, ${ROLES[s.actor as RoleId].name.toLowerCase()}` : "All parties"}
                {role && s.actor === role && <span className="cai-deploy-you">Your step</span>}
              </p>
              <p className="cai-deploy-title">{s.title}</p>
              <p>{s.text}</p>
              {s.id === "runtime" && (
                <div className="cai-runtime-choice" role="radiogroup" aria-label="Runtime">
                  {RUNTIMES.map((x) => (
                    <button key={x.id} type="button" role="radio" aria-checked={x.id === runtime} tabIndex={active ? 0 : -1} onClick={() => setRuntime(x.id)} title={x.summary}>
                      {x.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="cai-deploy-actions">
                <Link className="cai-deploy-guide" to={s.task} tabIndex={active ? 0 : -1}>
                  Open the how-to for this step
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <p className="cai-deploy-accounts">
        {d.accounts.join(" ")}{" "}
        {step?.id !== "runtime" && (
          <>The runtime is {runtimeLabel}. <button type="button" className="cai-link" onClick={() => go("day0", 0)}>Change</button></>
        )}
      </p>
    </figure>
  );
}

/** The steps of one deployment as a table, linked to the how-to guides. Runtime-specific steps say so. */
export function DeploymentSteps({ scenario }: { scenario: string }) {
  const d = deployment(scenario);
  const rows: { s: Step; only?: Runtime }[] = [];
  for (const s of d.steps.cc) rows.push({ s, only: d.steps.eos.some((e) => e.id === s.id) ? undefined : "cc" });
  for (const s of d.steps.eos) if (!d.steps.cc.some((c) => c.id === s.id)) rows.push({ s, only: "eos" });
  const rank = (s: Step) => PHASES.findIndex((p) => p.id === s.phase) * 100 + (s.op ? OPERATIONS.findIndex((o) => o.id === s.op) * 20 : 0);
  rows.sort((a, b) => rank(a.s) - rank(b.s));
  return (
    <table className="cai-steps-table">
      <thead>
        <tr><th>#</th><th>Day</th><th>Who</th><th>Task</th></tr>
      </thead>
      <tbody>
        {rows.map(({ s, only }, n) => {
          const eos = d.steps.eos.find((e) => e.id === s.id);
          const title = eos && eos.title !== s.title ? `${s.title}, or with Enclave OS, ${eos.title.toLowerCase()}` : s.title;
          const day = PHASES.find((p) => p.id === s.phase)!.day;
          return (
            <tr key={`${s.phase}-${s.op ?? ""}-${s.id}`}>
              <td>{n + 1}</td>
              <td>{day}</td>
              <td>{s.party ? <>{s.party.name} <small>· {ROLES[s.actor as RoleId].name}</small></> : "All parties"}</td>
              <td>
                <Link to={s.task}>{title}</Link>
                {s.op && <small> · {OPERATIONS.find((o) => o.id === s.op)!.label}</small>}
                {only && <small> · {RUNTIMES.find((r) => r.id === only)!.label} only</small>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const ROLE_PAGES: Record<Exclude<RoleId, "user">, string> = {
  owner: "/solutions/confidential-ai/how-to-guides/by-role/model-owner",
  infra: "/solutions/confidential-ai/how-to-guides/by-role/infrastructure-provider",
  consumer: "/solutions/confidential-ai/how-to-guides/by-role/model-consumer",
};

/** Who holds which role in each deployment, from scenarios.ts. */
export function DeploymentsTable({ useCase }: { useCase?: string }) {
  const list = SCENARIOS.filter((s) => !useCase || s.useCase === useCase);
  const roles = ["owner", "infra", "consumer"] as const;
  return (
    <table>
      <thead>
        <tr>
          <th>Deployment</th>
          {roles.map((r) => <th key={r}><Link to={ROLE_PAGES[r]}>{ROLES[r].name}</Link></th>)}
        </tr>
      </thead>
      <tbody>
        {list.map((s) => (
          <tr key={s.id}>
            <td><Link to={`/solutions/confidential-ai/how-to-guides/end-to-end/${s.guide}`}>{s.label}</Link></td>
            {roles.map((r) => {
              const p = s.parties.find((x) => x.roles.includes(r))!;
              return <td key={r}>{p.name}{p.note ? <><br /><small>{p.note}</small></> : null}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
