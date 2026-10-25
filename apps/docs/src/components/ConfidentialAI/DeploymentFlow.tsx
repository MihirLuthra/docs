import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "@docusaurus/Link";
import SiteStorage from "@generated/site-storage";
import "./styles.css";
import { deployment, OPERATIONS, PHASES, RUNTIMES, type Account, type Box, type OperationId, type PhaseId, type Runtime, type Step } from "./deployment";
import { ROLES, SCENARIOS, type RoleId } from "./scenarios";

// A deployment, step by step. Each party is a lane, Fortanix's services are a
// column, and the picture fills in as the steps go: a box, an account or an
// item shows up at the step that brings it in. Arrows show what moves.
//
// The runtime is the first step of day 0. The choice changes the steps and the
// boxes, and it is the same choice as the page's runtime tabs (Docusaurus keeps
// it under docusaurus.tab.runtime), so picking it in one place picks it in all.
//
// Props
//   scenario:  one scenario id (end-to-end guides)
//   scenarios: scenario ids to pick from, or true for all of them
//   role:      highlight one role's lane and steps (role guides)

const AUTOPLAY_MS = 4500;
// The gap between lanes, as in styles.css (.cai-deploy-stage gap).
const GUTTER = 24;
// Shorter than this, a straight arrow is hard to see, so it goes round the side instead.
const MIN_ARROW = 40;

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// ---------- The runtime choice, shared with <Tabs groupId="runtime"> ----------

const TAB_KEY = `docusaurus.tab.runtime${SiteStorage.namespace}`;
const fromTab = (v: string | null): Runtime | null => RUNTIMES.find((r) => r.tab === v)?.id ?? null;

function readRuntime(): Runtime | null {
  try {
    return fromTab(window.localStorage.getItem(TAB_KEY));
  } catch {
    return null;
  }
}

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
    const stored = readRuntime();
    if (stored) setRt(stored);
    const listen = (e: StorageEvent) => {
      if (e.key === TAB_KEY) setRt(fromTab(e.newValue) ?? "cc");
    };
    window.addEventListener("storage", listen);
    return () => window.removeEventListener("storage", listen);
  }, []);
  return [rt, (next) => { setRt(next); writeRuntime(next); }];
}

// ---------- Arrows ----------

type Rect = { left: number; right: number; top: number; bottom: number };
const midY = (r: Rect) => (r.top + r.bottom) / 2;
const midX = (r: Rect) => (r.left + r.right) / 2;

function crosses(r: Rect, x1: number, y1: number, x2: number, y2: number) {
  for (let t = 0.05; t < 1; t += 0.05) {
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x > r.left && x < r.right && y > r.top && y < r.bottom) return true;
  }
  return false;
}

type Pt = [number, number];
const svgPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${Math.round(x)},${Math.round(y)}`).join(" ");

/** One end of an arrow: the element, its box, and its lane (none for Fortanix's band). */
interface End {
  r: Rect;
  box: Rect;
  lane?: Rect;
  topLevel: boolean; // a box, not an account inside one
}

interface Layout {
  lanes: Rect[];
  boxes: Rect[];
  channel: number; // y of the channel between the band and the lanes
  bus: number; // y of the bus under the accounts in the band
}

/** The gutter beside a lane, on the side facing x (or the other side at the stage's edge). */
function gutter(lane: Rect, x: number, l: Layout): number {
  const first = lane.left === Math.min(...l.lanes.map((r) => r.left));
  const last = lane.right === Math.max(...l.lanes.map((r) => r.right));
  const left = x < midX(lane) ? !first : last;
  return left ? lane.left - GUTTER / 2 : lane.right + GUTTER / 2;
}

/** From a lane box out to the channel: side, gutter, up. */
function toChannel(e: End, towardX: number, l: Layout): Pt[] {
  const gx = gutter(e.lane!, towardX, l);
  const side = gx < e.r.left ? e.r.left : e.r.right;
  return [[side, midY(e.r)], [gx, midY(e.r)], [gx, l.channel]];
}

/**
 * An arrow from a to b that never crosses a box and is never too short to see.
 * Fortanix's band sits above the lanes. Between accounts in the band, the arrow
 * runs along the bus under them. Between the band and a lane, along the channel
 * between band and lanes, then down the lane's gutter. Between lanes, through
 * the gutter when they are side by side, else along the channel. In one lane,
 * straight when clear and long enough, else a bracket along the lane's edge.
 */
function route(a: End, b: End, l: Layout): Pt[] {
  if (!a.lane && !b.lane) {
    return [[midX(a.r), a.r.bottom], [midX(a.r), l.bus], [midX(b.r), l.bus], [midX(b.r), b.r.bottom]];
  }
  if (!a.lane) return [[midX(a.r), a.r.bottom], [midX(a.r), l.channel], ...toChannel(b, midX(a.r), l).reverse()];
  if (!b.lane) return [...toChannel(a, midX(b.r), l), [midX(b.r), l.channel], [midX(b.r), b.r.bottom]];
  if (a.lane.left === b.lane.left) {
    if (a.topLevel && b.topLevel && a.box !== b.box) {
      const down = b.r.top >= a.r.bottom;
      const [x1, y1, x2, y2] = [midX(a.r), down ? a.r.bottom : a.r.top, midX(b.r), down ? b.r.top : b.r.bottom];
      if (Math.abs(y2 - y1) >= MIN_ARROW && !l.boxes.some((r) => r !== a.box && r !== b.box && crosses(r, x1, y1, x2, y2))) return [[x1, y1], [x2, y2]];
    }
    const gx = Math.max(a.box.right, b.box.right) + 6;
    return [[a.r.right, midY(a.r)], [gx, midY(a.r)], [gx, midY(b.r)], [b.r.right, midY(b.r)]];
  }
  const right = b.lane.left >= a.lane.right;
  const [lo, hi] = right ? [a.lane, b.lane] : [b.lane, a.lane];
  if (!l.lanes.some((c) => c.left >= lo.right && c.right <= hi.left)) {
    const gx = (lo.right + hi.left) / 2;
    const ax = right ? a.r.right : a.r.left;
    const bx = right ? b.r.left : b.r.right;
    return [[ax, midY(a.r)], [gx, midY(a.r)], [gx, midY(b.r)], [bx, midY(b.r)]];
  }
  return [...toChannel(a, midX(b.lane), l), ...toChannel(b, midX(a.lane), l).reverse()];
}

// ---------- The diagram ----------

const Tick = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="cai-tick-icon"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** Both runtimes' text in one cell, so switching never changes the size. */
function Variants({ v, rt }: { v: string | { cc: string; eos: string }; rt: Runtime }) {
  if (typeof v === "string") return <>{v}</>;
  if (v.cc === v.eos) return <>{v.cc}</>;
  return (
    <span className="cai-variants">
      {RUNTIMES.map((r) => <span key={r.id} data-on={r.id === rt} aria-hidden={r.id !== rt}>{v[r.id]}</span>)}
    </span>
  );
}

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
  const [playing, setPlaying] = useState(false);
  const [arrow, setArrow] = useState<string | null>(null);

  const d = useMemo(() => deployment(scenarioId), [scenarioId]);
  const all = d.steps[runtime];
  const day0 = all.filter((s) => s.phase === "day0");
  const day1 = all.filter((s) => s.phase === "day1");
  const steps = phase === "day0" ? day0 : phase === "day1" ? day1 : all.filter((s) => s.op === op);
  const i = Math.min(index, steps.length - 1);
  const step = steps[i];

  // Everything up to this step has happened: that is what the picture shows.
  const past = [...(phase === "day0" ? [] : day0), ...(phase === "day2" ? day1 : []), ...steps.slice(0, i + 1)];
  const seen = new Set(past.map((s) => s.id));
  const acted = new Set(past.map((s) => s.party));
  const shown = (at: string, runtimes?: Runtime[]) => seen.has(at) && (!runtimes || runtimes.includes(runtime));

  const highlight = role ? d.scenario.parties.find((p) => p.roles.includes(role)) : undefined;
  const stage = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const root = stage.current;
    if (!root || !step?.from || !step.to || step.from === step.to) return setArrow(null);
    // Stacked (narrow): no arrows, the ends are marked instead.
    const lanesEl = root.querySelector<HTMLElement>(".cai-lanes");
    if (!lanesEl || getComputedStyle(lanesEl).gridTemplateColumns.trim().split(/\s+/).length < 2) return setArrow(null);
    const o = root.getBoundingClientRect();
    const rel = (e: Element): Rect => {
      const r = e.getBoundingClientRect();
      return { left: r.left - o.left, right: r.right - o.left, top: r.top - o.top, bottom: r.bottom - o.top };
    };
    const ea = root.querySelector<HTMLElement>(`[data-el="${step.from}"]`);
    const eb = root.querySelector<HTMLElement>(`[data-el="${step.to}"]`);
    if (!ea || !eb) return setArrow(null);
    const boxEls = [...root.querySelectorAll(".cai-box")];
    const boxes = boxEls.map(rel);
    const end = (e: HTMLElement): End => {
      const boxEl = e.closest(".cai-box")!;
      const laneEl = e.closest(".cai-lane");
      return { r: rel(e), box: boxes[boxEls.indexOf(boxEl)], lane: laneEl ? rel(laneEl) : undefined, topLevel: e === boxEl };
    };
    const lanes = [...root.querySelectorAll(".cai-lane")].map(rel);
    const band = root.querySelector(".cai-band");
    const accounts = [...root.querySelectorAll(".cai-band .cai-account")].map(rel);
    const layout: Layout = {
      lanes,
      boxes,
      channel: band ? (rel(band).bottom + rel(lanesEl).top) / 2 : rel(lanesEl).top - 12,
      bus: Math.max(0, ...accounts.map((r) => r.bottom)) + 7,
    };
    setArrow(svgPath(route(end(ea), end(eb), layout)));
  }, [step]);

  useLayoutEffect(measure, [measure, runtime]);
  useEffect(() => {
    const root = stage.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!playing) return;
    if (i >= steps.length - 1) return setPlaying(false);
    const t = setTimeout(() => setIndex(i + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, i, steps.length]);

  const restart = () => { setIndex(0); setPlaying(false); };
  const tabKeys = <T,>(list: T[], current: T, choose: (v: T) => void) => (e: React.KeyboardEvent) => {
    const n = list.indexOf(current);
    if (e.key === "ArrowRight") choose(list[(n + 1) % list.length]);
    if (e.key === "ArrowLeft") choose(list[(n - 1 + list.length) % list.length]);
  };
  const choosePhase = (p: PhaseId) => { setPhase(p); restart(); };
  const chooseScenario = (id: string) => { setScenarioId(id); restart(); };
  const chooseRuntime = (rt: Runtime) => { setRuntime(rt); setIndex((n) => (phase === "day0" && steps[n]?.id === "runtime" ? n : 0)); };

  const state = (id: string) => (step?.from === id ? " is-from" : step?.to === id ? " is-to" : "");
  const animate = !reducedMotion();

  // The real picture shows only what has joined. A hidden copy with everything in
  // it sits in the same cell, so the stage is always as tall as it will get.
  const renderBox = (b: Box, ghost: boolean) => {
    if (!ghost && !shown(b.at, b.runtimes)) return null;
    return (
      <div key={b.id} data-el={ghost ? undefined : b.id} className={`cai-box${ghost ? "" : state(b.id)}`}>
        <strong>{b.name}</strong>
        <span><Variants v={b.detail} rt={runtime} /></span>
        {b.tee && (ghost || seen.has(b.tee)) && <span className="cai-box-tee">Workload in a TEE</span>}
        {!ghost && step?.to === b.id && step.carries && step.from !== b.id && <span className="cai-box-carry">{step.carries}</span>}
      </div>
    );
  };

  const renderAccount = (a: Account, ghost: boolean) => {
    if (!ghost && !shown(a.at)) return null;
    return (
      <div key={a.id} data-el={ghost ? undefined : a.id} className={`cai-account${ghost ? "" : state(a.id)}`}>
        <span className="cai-account-name">{a.party.name}</span>
        <ul>
          {a.items.map((it) => {
            if (!ghost && !shown(it.at, it.runtimes)) return null;
            return (
              <li key={it.id}>
                <Variants v={it.label} rt={runtime} />
                {it.done && (ghost || seen.has(it.done) ? <span className="cai-done"><Tick /> approved</span> : <span className="cai-pending">pending</span>)}
              </li>
            );
          })}
        </ul>
        {!ghost && step?.to === a.id && step.carries && step.from !== a.id && <span className="cai-box-carry">{step.carries}</span>}
      </div>
    );
  };

  const ccmOn = d.ccm.some((a) => shown(a.at));
  const dsmOn = d.dsm.some((a) => shown(a.at));
  const columns = d.lanes.map((l) => (l.roles.length === 1 && l.roles[0] === "user" ? "minmax(0, 0.8fr)" : "minmax(0, 1fr)")).join(" ");

  // Fortanix's services across the top, an account in them for each party that has one.
  const renderBand = (ghost: boolean) => (
    <section className="cai-band" data-shown={ghost || ccmOn || dsmOn} aria-label={ghost ? undefined : "Fortanix"}>
      <header className="cai-lane-head"><strong>Fortanix</strong><span>Services, with an account for each party that uses them</span></header>
      <div className="cai-band-boxes" data-dsm={d.dsm.length > 0}>
        {(ghost || ccmOn) && (
          <div className="cai-box is-service">
            <strong>Fortanix CCM</strong>
            <span>Attestation and certificates</span>
            <div className="cai-accounts">{d.ccm.map((a) => renderAccount(a, ghost))}</div>
          </div>
        )}
        {d.dsm.length > 0 && (ghost || dsmOn) && (
          <div className="cai-box is-service">
            <strong>Fortanix DSM</strong>
            <span>Keys, released after attestation</span>
            <div className="cai-accounts">{d.dsm.map((a) => renderAccount(a, ghost))}</div>
          </div>
        )}
      </div>
    </section>
  );

  const renderLanes = (ghost: boolean) => (
    <div className="cai-lanes" style={{ "--cols": columns } as React.CSSProperties}>
      {d.lanes.map((lane) => {
        const party = lane.party;
        const on = ghost || acted.has(party) || lane.boxes.some((b) => shown(b.at, b.runtimes));
        return (
          <section
            key={party.name}
            data-shown={on}
            className={`cai-lane${!ghost && step?.party === party ? " is-acting" : ""}${highlight === party ? " is-you" : ""}`}
            aria-label={ghost ? undefined : party.name}
          >
            <header className="cai-lane-head">
              <strong>{party.name}</strong>
              <span>{lane.roles.map((r) => ROLES[r].name).join(" and ")}</span>
              {party.note && <span>{party.note}</span>}
            </header>
            <div className="cai-lane-boxes">{lane.boxes.map((b) => renderBox(b, ghost))}</div>
          </section>
        );
      })}
    </div>
  );

  return (
    <figure className="cai cai-deploy" aria-label="Deployment, step by step">
      {ids.length > 1 && (
        <div className="cai-picker" role="tablist" aria-label="Deployment" onKeyDown={tabKeys(ids, scenarioId, chooseScenario)}>
          {ids.map((id) => {
            const s = SCENARIOS.find((x) => x.id === id)!;
            return (
              <button key={id} type="button" role="tab" aria-selected={id === scenarioId} tabIndex={id === scenarioId ? 0 : -1} onClick={() => chooseScenario(id)}>
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="cai-toolbar">
        <div className="cai-phases" role="tablist" aria-label="Phase" onKeyDown={tabKeys(PHASES.map((p) => p.id), phase, choosePhase)}>
          {PHASES.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={p.id === phase} tabIndex={p.id === phase ? 0 : -1} onClick={() => choosePhase(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="cai-runtime" role="radiogroup" aria-label="Runtime">
          {RUNTIMES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={r.id === runtime} onClick={() => chooseRuntime(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {phase === "day2" && (
        <label className="cai-operation">
          <span>Operation</span>
          <select value={op} onChange={(e) => { setOp(e.target.value as OperationId); restart(); }}>
            {OPERATIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      )}

      <div className="cai-deploy-frame">
      <div className="cai-deploy-stage is-ghost" aria-hidden="true">
        {renderBand(true)}
        {renderLanes(true)}
      </div>
      <div className="cai-deploy-stage" ref={stage}>
        {renderBand(false)}
        {renderLanes(false)}

        {step?.id === "runtime" && (
          <div className="cai-choose">
            <p className="cai-choose-title">Which runtime runs the model?</p>
            <div className="cai-runtime-cards" role="radiogroup" aria-label="Runtime">
              {RUNTIMES.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={x.id === runtime} onClick={() => chooseRuntime(x.id)}>
                  <strong>{x.label}</strong>
                  <span>{x.summary}</span>
                </button>
              ))}
            </div>
            <p className="cai-choose-note">You can change it at any step with the switch above. It also switches the runtime tabs on this page.</p>
          </div>
        )}

        {arrow && (
          <svg className="cai-deploy-arrow" aria-hidden="true">
            <defs>
              <marker id={`cai-head-${scenarioId}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>
            <path d={arrow} stroke="currentColor" strokeWidth="2" fill="none" markerEnd={`url(#cai-head-${scenarioId})`} />
            {animate && (
              <circle key={`${runtime}-${phase}-${op}-${step.id}`} r="5" fill="currentColor">
                <animateMotion dur="1.1s" repeatCount="1" fill="freeze" path={arrow} />
              </circle>
            )}
          </svg>
        )}
      </div>
      </div>

      <div className="cai-deploy-nav">
        <ol className="cai-deploy-dots">
          {steps.map((s, n) => (
            <li key={s.id}>
              <button
                type="button"
                aria-label={`Step ${n + 1}, ${s.title}`}
                aria-current={n === i ? "step" : undefined}
                className={role && s.actor === role ? "is-yours" : undefined}
                onClick={() => { setIndex(n); setPlaying(false); }}
              >
                {n + 1}
              </button>
            </li>
          ))}
        </ol>
        <div className="cai-deploy-controls">
          <button type="button" onClick={() => setIndex(Math.max(0, i - 1))} disabled={i === 0}>Previous</button>
          <button type="button" onClick={() => setIndex(Math.min(steps.length - 1, i + 1))} disabled={i >= steps.length - 1}>Next</button>
          <button type="button" onClick={() => { if (i >= steps.length - 1) setIndex(0); setPlaying((p) => !p); }}>{playing ? "Pause" : "Play"}</button>
        </div>
      </div>

      {/* Every step's text, for both runtimes, in one cell: the panel is as tall as the longest and the page doesn't move. */}
      <div className="cai-deploy-panels" aria-live="polite">
        {RUNTIMES.flatMap((r) => d.steps[r.id].map((s) => ({ s, r: r.id }))).map(({ s, r }) => {
          const active = r === runtime && s === step;
          const list = r === runtime ? steps : [];
          const n = list.indexOf(s) + 1;
          return (
            <div key={`${r}-${s.phase}-${s.op ?? ""}-${s.id}`} className="cai-deploy-panel" data-active={active} aria-hidden={!active}>
              <p className="cai-deploy-who">
                {n > 0 ? `Step ${n} of ${list.length} · ` : ""}
                {s.party ? `${s.party.name} · ${ROLES[s.actor as RoleId].name}` : "All parties"}
                {role && s.actor === role && <span className="cai-deploy-you">Your step</span>}
              </p>
              <p className="cai-deploy-title">{s.title}</p>
              <p>{s.text}</p>
              <Link className="cai-deploy-guide" to={s.task} tabIndex={active ? 0 : -1}>
                Open the how-to for this step
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="cai-deploy-accounts">
        <strong>Accounts</strong>
        {d.accounts.map((a) => <p key={a}>{a}</p>)}
      </div>
    </figure>
  );
}

/** The steps of one deployment as a table, linked to the how-to guides. Runtime-specific steps say so. */
export function DeploymentSteps({ scenario }: { scenario: string }) {
  const d = deployment(scenario);
  const rows: { s: Step; only?: Runtime }[] = [];
  for (const s of d.steps.cc) rows.push({ s, only: d.steps.eos.some((e) => e.id === s.id) ? undefined : "cc" });
  for (const s of d.steps.eos) if (!d.steps.cc.some((c) => c.id === s.id)) rows.push({ s, only: "eos" });
  const order = (s: Step) => PHASES.findIndex((p) => p.id === s.phase) * 100 + (s.op ? OPERATIONS.findIndex((o) => o.id === s.op) * 20 : 0);
  rows.sort((a, b) => order(a.s) - order(b.s));
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
