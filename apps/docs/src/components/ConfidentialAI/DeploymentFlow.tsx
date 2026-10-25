import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "@docusaurus/Link";
import "./styles.css";
import { deployment, PHASES, type PhaseId } from "./deployment";
import { ROLES, SCENARIOS, type RoleId } from "./scenarios";

// A deployment, step by step: each party as a lane with its build machine,
// registry, DSM and CCM accounts, servers and clients, and an arrow for what
// moves at each step. Day 0, day 1 and the day 2 updates are tabs.
//
// Props
//   scenario:  one scenario id (end-to-end and role guides)
//   scenarios: scenario ids to pick from; true for all of them (plan a deployment)
//   role:      highlight one role's lane and steps (role guides)

const AUTOPLAY_MS = 4000;

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

type Rect = { left: number; right: number; top: number; bottom: number };

// The gap between lanes, as in styles.css (.cai-deploy-stage gap).
const GUTTER = 28;

const midY = (r: Rect) => (r.top + r.bottom) / 2;
const midX = (r: Rect) => (r.left + r.right) / 2;

/** Does the segment from (x1, y1) to (x2, y2) pass through rectangle r? */
function crosses(r: Rect, x1: number, y1: number, x2: number, y2: number) {
  for (let t = 0.05; t < 1; t += 0.05) {
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x > r.left && x < r.right && y > r.top && y < r.bottom) return true;
  }
  return false;
}

/**
 * An arrow from box a to box b that never crosses another box. Straight when
 * nothing is in the way; otherwise at right angles, through the gutter between
 * lanes, or along the channel above them when the lanes aren't next to each other.
 */
function route(a: Rect, la: Rect, b: Rect, lb: Rect, others: Rect[], lanes: Rect[], channel: number): string {
  const pts: [number, number][] = [];
  if (la.left === lb.left && la.top === lb.top) {
    // Same lane: boxes stacked. Straight down or up, or a bracket along the lane's edge.
    const down = b.top >= a.bottom;
    const [x1, y1, x2, y2] = [midX(a), down ? a.bottom : a.top, midX(b), down ? b.top : b.bottom];
    if (!others.some((r) => crosses(r, x1, y1, x2, y2))) return `M${x1},${y1} L${x2},${y2}`;
    const gx = Math.max(a.right, b.right) + 4;
    pts.push([a.right, midY(a)], [gx, midY(a)], [gx, midY(b)], [b.right, midY(b)]);
  } else {
    const right = lb.left >= la.right;
    const ax = right ? a.right : a.left;
    const bx = right ? b.left : b.right;
    const [lo, hi] = right ? [la, lb] : [lb, la];
    const adjacent = !lanes.some((l) => l.left >= lo.right && l.right <= hi.left);
    if (adjacent) {
      const gx = (lo.right + hi.left) / 2;
      pts.push([ax, midY(a)], [gx, midY(a)], [gx, midY(b)], [bx, midY(b)]);
    } else {
      // Up to the channel above the lanes, across, and down beside the target lane.
      const ga = right ? la.right + GUTTER / 2 : la.left - GUTTER / 2;
      const gb = right ? lb.left - GUTTER / 2 : lb.right + GUTTER / 2;
      pts.push([ax, midY(a)], [ga, midY(a)], [ga, channel], [gb, channel], [gb, midY(b)], [bx, midY(b)]);
    }
  }
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${Math.round(x)},${Math.round(y)}`).join(" ");
}

export function DeploymentFlow({
  scenario,
  scenarios,
  role,
}: {
  scenario?: string;
  scenarios?: string[] | true;
  role?: RoleId;
}) {
  const ids = useMemo(() => {
    if (scenarios === true) return SCENARIOS.map((s) => s.id);
    if (scenarios) return scenarios;
    return [scenario ?? SCENARIOS[0].id];
  }, [scenario, scenarios]);

  const [scenarioId, setScenarioId] = useState(ids[0]);
  const [phase, setPhase] = useState<PhaseId>("day0");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [arrow, setArrow] = useState<string | null>(null);

  const d = useMemo(() => deployment(scenarioId), [scenarioId]);
  const steps = d.steps.filter((s) => s.phase === phase);
  const step = steps[Math.min(index, steps.length - 1)];
  const highlight = role ? d.scenario.parties.find((p) => p.roles.includes(role)) : undefined;

  const stage = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const root = stage.current;
    if (!root || !step?.from || !step.to || step.from === step.to) return setArrow(null);
    // Stacked lanes (narrow): no arrows, the boxes are marked instead.
    if (getComputedStyle(root).gridTemplateColumns.trim().split(/\s+/).length < 2) return setArrow(null);
    const o = root.getBoundingClientRect();
    const rel = (r: DOMRect): Rect => ({ left: r.left - o.left, right: r.right - o.left, top: r.top - o.top, bottom: r.bottom - o.top });
    const el = (id: string) => root.querySelector<HTMLElement>(`[data-box="${id}"]`);
    const ea = el(step.from);
    const eb = el(step.to);
    if (!ea || !eb) return setArrow(null);
    const lane = (e: HTMLElement) => rel(e.closest(".cai-lane")!.getBoundingClientRect());
    const others = [...root.querySelectorAll<HTMLElement>("[data-box]")].filter((e) => e !== ea && e !== eb).map((e) => rel(e.getBoundingClientRect()));
    const lanes = [...root.querySelectorAll<HTMLElement>(".cai-lane")].map((e) => rel(e.getBoundingClientRect()));
    setArrow(route(rel(ea.getBoundingClientRect()), lane(ea), rel(eb.getBoundingClientRect()), lane(eb), others, lanes, 9));
  }, [step]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    const root = stage.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!playing) return;
    if (index >= steps.length - 1) return setPlaying(false);
    const t = setTimeout(() => setIndex((i) => i + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, index, steps.length]);

  const pickScenario = (id: string) => {
    setScenarioId(id);
    setIndex(0);
    setPlaying(false);
  };
  const pickPhase = (p: PhaseId) => {
    setPhase(p);
    setIndex(0);
    setPlaying(false);
  };
  const tabKeys = <T,>(list: T[], current: T, pick: (v: T) => void) => (e: React.KeyboardEvent) => {
    const n = list.indexOf(current);
    if (e.key === "ArrowRight") pick(list[(n + 1) % list.length]);
    if (e.key === "ArrowLeft") pick(list[(n - 1 + list.length) % list.length]);
  };

  const animate = !reducedMotion();
  const path = arrow ?? "";

  return (
    <figure className="cai cai-deploy" aria-label="Deployment, step by step">
      {ids.length > 1 && (
        <div className="cai-picker" role="tablist" aria-label="Deployment" onKeyDown={tabKeys(ids, scenarioId, pickScenario)}>
          {ids.map((id) => {
            const s = SCENARIOS.find((x) => x.id === id)!;
            return (
              <button key={id} type="button" role="tab" aria-selected={id === scenarioId} tabIndex={id === scenarioId ? 0 : -1} onClick={() => pickScenario(id)}>
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="cai-phases" role="tablist" aria-label="Phase" onKeyDown={tabKeys(PHASES.map((p) => p.id), phase, pickPhase)}>
        {PHASES.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={p.id === phase} tabIndex={p.id === phase ? 0 : -1} onClick={() => pickPhase(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="cai-deploy-stage" ref={stage} style={{ "--lanes": d.lanes.length } as React.CSSProperties}>
        {d.lanes.map((lane) => {
          const acting = step?.party === lane.party;
          return (
            <section key={lane.party.name} className={`cai-lane${acting ? " is-acting" : ""}${highlight === lane.party ? " is-you" : ""}`} aria-label={lane.party.name}>
              <header className="cai-lane-head">
                <strong>{lane.party.name}</strong>
                <span>{lane.roles.map((r) => ROLES[r].name).join(" and ")}</span>
                {lane.party.note && <span>{lane.party.note}</span>}
              </header>
              <div className="cai-lane-boxes">
                {lane.boxes.map((b) => {
                  const state = step?.from === b.id ? " is-from" : step?.to === b.id ? " is-to" : "";
                  return (
                    <div key={b.id} data-box={b.id} className={`cai-box${b.tee ? " is-tee" : ""}${state}`}>
                      <strong>{b.name}</strong>
                      <span>{b.detail}</span>
                      {b.tee && <span className="cai-box-tee">Workload in a TEE</span>}
                      {step?.to === b.id && step.carries && step.from !== b.id && <span className="cai-box-carry">{step.carries}</span>}
                      {step?.from === b.id && step.to !== b.id && <span className="cai-box-send">Sends</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {arrow && (
          <svg className="cai-deploy-arrow" aria-hidden="true">
            <defs>
              <marker id={`cai-head-${scenarioId}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            </defs>
            <path d={path} stroke="currentColor" strokeWidth="2" fill="none" markerEnd={`url(#cai-head-${scenarioId})`} />
            {animate && (
              <circle key={`${phase}-${step.id}`} r="5" fill="currentColor">
                <animateMotion dur="1.1s" repeatCount="1" fill="freeze" path={path} />
              </circle>
            )}
          </svg>
        )}
      </div>

      <div className="cai-deploy-nav">
        <ol className="cai-deploy-dots">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                aria-label={`Step ${i + 1}, ${s.title}`}
                aria-current={i === index ? "step" : undefined}
                className={role && s.actor === role ? "is-yours" : undefined}
                onClick={() => { setIndex(i); setPlaying(false); }}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        <div className="cai-deploy-controls">
          <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>Previous</button>
          <button type="button" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))} disabled={index >= steps.length - 1}>Next</button>
          <button type="button" onClick={() => { if (index >= steps.length - 1) setIndex(0); setPlaying((p) => !p); }}>
            {playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      {/* Every step's text in one cell, so the panel is as tall as the longest and the page doesn't move. */}
      <div className="cai-deploy-panels" aria-live="polite">
        {d.steps.map((s) => {
          const active = s === step;
          const n = steps.indexOf(s) + 1;
          return (
            <div key={`${s.phase}-${s.id}`} className="cai-deploy-panel" data-active={active} aria-hidden={!active}>
              <p className="cai-deploy-who">
                {n > 0 ? `Step ${n} of ${steps.length} · ` : ""}{s.party.name} · {ROLES[s.actor].name}
                {role && s.actor === role && <span className="cai-deploy-you">Your step</span>}
              </p>
              <p className="cai-deploy-title">{s.title}</p>
              <p>{s.text}</p>
              {active && <Link to={s.task}>How to do it</Link>}
            </div>
          );
        })}
      </div>

      <div className="cai-deploy-accounts">
        <strong>Accounts</strong>
        {d.accounts.map((a) => (
          <p key={a}>{a}</p>
        ))}
      </div>
    </figure>
  );
}

/** The steps of one deployment as a table, linked to the how-to guides. */
export function DeploymentSteps({ scenario }: { scenario: string }) {
  const d = deployment(scenario);
  let n = 0;
  return (
    <table className="cai-steps-table">
      <thead>
        <tr><th>#</th><th>Day</th><th>Who</th><th>Task</th></tr>
      </thead>
      <tbody>
        {PHASES.map((p) =>
          d.steps.filter((s) => s.phase === p.id).map((s) => (
            <tr key={`${p.id}-${s.id}`}>
              <td>{++n}</td>
              <td>{p.day}</td>
              <td>{s.party.name} <small>· {ROLES[s.actor].name}</small></td>
              <td><Link to={s.task}>{s.title}</Link>{p.day === "2" && <small> · {p.label.replace(/^Day 2 · /, "")}</small>}</td>
            </tr>
          )),
        )}
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
