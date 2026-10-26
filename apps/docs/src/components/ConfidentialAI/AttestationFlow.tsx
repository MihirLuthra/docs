import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import "./styles.css";
import { charsFor, fit, textWidth, wrap } from "./scene";

// How Confidential AI works, as a scene in the style of DeploymentFlow:
// run in a TEE, get a certificate from CCM for an approved workload and,
// when the workload needs one, get the model key from DSM over mutual TLS.
// An intro, so it stays simple: one workload, two services, short steps.
//
// CCM and DSM are on the top row. The host is below, untrusted, with the TEE
// inside it and the workload in the TEE. The workload spans both columns, so
// each exchange is a short vertical arrow under its service that crosses
// nothing. One fixed shape for wide screens and one for narrow ones, so
// nothing around the scene moves.
//
// Props
//   keyRelease: "toggle" (default) lets the reader choose; "required" or "optional" fixes the path.
//   initialKey: the starting choice when keyRelease="toggle" (default true).

type Spot = "ccm" | "dsm" | "tee" | "workload";

interface Step {
  id: string;
  title: string;
  text: string;
  focus: Spot; // what the step is about: its halo
  from?: Spot; // an arrow from here to focus
  carries?: string;
}

// Example value shown in the diagram. Not real.
const MEASUREMENT = "9c2e…41a7";

const COMMON: Step[] = [
  {
    id: "run", focus: "tee", title: "Run inside a TEE",
    text: "The model workload starts in a trusted execution environment, with the GPU in confidential computing mode. The TEE records its measurement, a fingerprint of exactly what is running. The host cannot read or change anything inside it.",
  },
  {
    id: "evidence", focus: "ccm", from: "workload", carries: "Evidence", title: "Ask CCM for a certificate",
    text: "The workload creates a key pair inside the TEE and asks CCM to certify it. With the request, it sends signed evidence from the CPU and GPU that includes its measurement.",
  },
  {
    id: "verify", focus: "ccm", title: "CCM verifies",
    text: "CCM checks that the hardware is genuine, that the platform is up to date, and that the measurement matches an approved model.",
  },
  {
    id: "cert", focus: "workload", from: "ccm", carries: "Certificate", title: "CCM issues a certificate",
    text: "If every check passes, CCM signs the workload's certificate with its zone CA. A modified workload has a different measurement and gets no certificate.",
  },
];

const WITH_KEY: Step[] = [
  {
    id: "present", focus: "dsm", from: "workload", carries: "Mutual TLS", title: "Connect to DSM",
    text: "The workload connects to DSM over mutual TLS with its certificate. DSM trusts the CCM zone CA, so it knows this is an approved workload.",
  },
  {
    id: "key", focus: "workload", from: "dsm", carries: "Model key", title: "DSM releases the key",
    text: "DSM sends the model key straight into the TEE. No other workload can get it.",
  },
  {
    id: "serve", focus: "workload", title: "Decrypt and serve",
    text: "The workload decrypts the model weights inside the TEE and serves requests.",
  },
];

const WITHOUT_KEY: Step[] = [
  {
    id: "serve", focus: "workload", title: "Serve",
    text: "The workload serves requests. Whenever it needs a key from DSM, or to prove itself to another service, it uses its certificate over mutual TLS.",
  },
];

const CHIPS = ["Memory encrypted", "CPU TEE", "GPU in confidential computing mode", "CPU to GPU traffic encrypted"];
const CHECKS = ["Genuine TEE hardware", "Platform up to date", "Approved model measurement"];
const HOST = "The host operating system, hypervisor and administrators cannot read or change what runs inside the TEE";

// ---------- Layout ----------

type R = { x: number; y: number; w: number; h: number };

interface Layout {
  w: number;
  h: number;
  spots: Record<Spot, R>;
  host: R;
  hostText: { x: number; y: number; lines: string[] }; // under the TEE, clear of the arrows
  measurement: R;
  chips: (R & { text: string })[];
  pillY?: number; // wide only: where an arrow's label sits, in the clear gap
}

const SERVICE_H = 108;
const CARD_H = 58;
const CARD_H_NARROW = 84; // the credentials go on their own row
const CHIP_H = 22;
const chipWidth = (t: string) => textWidth(t, 11.5) + 20;
const MEASURE_LABEL = `Measurement ${MEASUREMENT}`;
const MEASURE_W = textWidth(MEASURE_LABEL, 11.5, true) + 24;

/** Lays chips out in rows within [x, x + w], each row centred. */
function placeChips(x: number, y: number, w: number): { chips: (R & { text: string })[]; bottom: number } {
  const rows: string[][] = [[]];
  let used = 0;
  for (const t of CHIPS) {
    const cw = chipWidth(t);
    if (rows[rows.length - 1].length && used + 8 + cw > w) {
      rows.push([]);
      used = 0;
    }
    used += (rows[rows.length - 1].length ? 8 : 0) + cw;
    rows[rows.length - 1].push(t);
  }
  const chips: (R & { text: string })[] = [];
  rows.forEach((row, k) => {
    const total = row.reduce((a, t) => a + chipWidth(t), 0) + 8 * (row.length - 1);
    let cx = x + (w - total) / 2;
    for (const t of row) {
      chips.push({ x: cx, y: y + k * (CHIP_H + 8), w: chipWidth(t), h: CHIP_H, text: t });
      cx += chipWidth(t) + 8;
    }
  });
  return { chips, bottom: y + rows.length * (CHIP_H + 8) - 8 };
}

function wideLayout(): Layout {
  const W = 760, M = 4;
  const half = (W - 2 * M - 16) / 2;
  const ccm = { x: M, y: M, w: half, h: SERVICE_H };
  const dsm = { x: M + half + 16, y: M, w: half, h: SERVICE_H };
  const hostY = M + SERVICE_H + 56;
  const tee = { x: 20, y: hostY + 24, w: W - 40, h: 0 };
  const cardY = tee.y + 24;
  // From under CCM to under DSM, so both arrows meet its top edge.
  const left = ccm.x + ccm.w / 2 - 150;
  const workload = { x: left, y: cardY, w: dsm.x + dsm.w / 2 + 150 - left, h: CARD_H };
  const measurement = { x: W / 2 - MEASURE_W / 2, y: cardY + CARD_H + 12, w: MEASURE_W, h: CHIP_H };
  const { chips, bottom } = placeChips(tee.x + 12, measurement.y + CHIP_H + 10, tee.w - 24);
  tee.h = bottom + 14 - tee.y;
  const textY = tee.y + tee.h + 20;
  const host = { x: M, y: hostY, w: W - 2 * M, h: textY + 12 - hostY };
  return {
    w: W, h: host.y + host.h + M,
    spots: { ccm, dsm, tee, workload }, host, measurement,
    hostText: { x: W / 2, y: textY, lines: [HOST] },
    chips, pillY: (ccm.y + ccm.h + hostY) / 2,
  };
}

function narrowLayout(): Layout {
  const W = 340, M = 4;
  const ccm = { x: M, y: M, w: W - 2 * M, h: SERVICE_H };
  const dsm = { x: M, y: ccm.y + SERVICE_H + 14, w: W - 2 * M, h: SERVICE_H };
  const hostY = dsm.y + SERVICE_H + 18;
  const lines = wrap(HOST, charsFor(W - 40, 11.5));
  const tee = { x: 16, y: hostY + 24, w: W - 32, h: 0 };
  const workload = { x: tee.x + 12, y: tee.y + 24, w: tee.w - 24, h: CARD_H_NARROW };
  const measurement = { x: W / 2 - MEASURE_W / 2, y: workload.y + CARD_H_NARROW + 12, w: MEASURE_W, h: CHIP_H };
  const { chips, bottom } = placeChips(tee.x + 10, measurement.y + CHIP_H + 10, tee.w - 20);
  tee.h = bottom + 14 - tee.y;
  const textY = tee.y + tee.h + 20;
  const host = { x: M, y: hostY, w: W - 2 * M, h: textY + (lines.length - 1) * 15 + 12 - hostY };
  return {
    w: W, h: host.y + host.h + M,
    spots: { ccm, dsm, tee, workload }, host, measurement,
    hostText: { x: W / 2, y: textY, lines },
    chips,
  };
}

// ---------- Drawing ----------

const ICON: Record<"ccm" | "dsm" | "lock" | "unlock" | "check", React.ReactNode> = {
  ccm: <><path d="M8 1.5 2.5 3.5v4c0 3.4 2.3 5.9 5.5 7 3.2-1.1 5.5-3.6 5.5-7v-4z" /><path d="m5.5 8 1.8 1.8L10.8 6" /></>,
  dsm: <><circle cx="5" cy="8" r="3" /><path d="M8 8h6.5M12 8v2.5M14 8v2" /></>,
  lock: <><rect x="3" y="7" width="10" height="7.5" rx="1.5" /><path d="M5 7V5a3 3 0 0 1 6 0v2" /></>,
  unlock: <><rect x="3" y="7" width="10" height="7.5" rx="1.5" /><path d="M5 7V5a3 3 0 0 1 5.8-1" /></>,
  check: <path d="m4 8.5 2.6 2.6L12 5.5" />,
};

const Icon = ({ name, x, y, size = 15, className = "" }: { name: keyof typeof ICON; x: number; y: number; size?: number; className?: string }) => (
  <svg x={x} y={y} width={size} height={size} viewBox="0 0 16 16" className={`cai-s-icon ${className}`}>{ICON[name]}</svg>
);

export function AttestationFlow({
  keyRelease = "toggle",
  initialKey = true,
}: {
  keyRelease?: "toggle" | "required" | "optional";
  initialKey?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [needsKey, setNeedsKey] = useState(keyRelease === "toggle" ? initialKey : keyRelease === "required");
  const variants = useMemo(() => ({ key: [...COMMON, ...WITH_KEY], none: [...COMMON, ...WITHOUT_KEY] }), []);
  const steps = needsKey ? variants.key : variants.none;
  const [index, setIndex] = useState(0);
  const i = Math.min(index, steps.length - 1);
  const step = steps[i];
  const reached = (id: string) => steps.findIndex((s) => s.id === id) <= i && steps.some((s) => s.id === id);

  const choose = (v: boolean) => { setNeedsKey(v); setIndex((n) => Math.min(n, COMMON.length - 1)); };

  // "Listen" (components/Listen) shows each step while it reads it.
  const figureRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return undefined;
    const onStep = (e: Event) => setIndex((e as CustomEvent<{ step: number }>).detail.step);
    el.addEventListener("fx-speech-step", onStep);
    return () => el.removeEventListener("fx-speech-step", onStep);
  }, []);

  const wide = useMemo(wideLayout, []);
  const narrow = useMemo(narrowLayout, []);

  const sent = reached("evidence");
  const verified = reached("verify");
  const certified = reached("cert");
  const authed = needsKey && reached("present");
  const keyed = needsKey && reached("key");
  const serving = reached("serve");

  const state = (s: Spot) => (step.focus === s ? "to" : step.from === s ? "from" : undefined);
  const key = `${needsKey}-${step.id}`;

  const pill = (x: number, y: number, text: string) => {
    const w = textWidth(text, 12, true) + 20;
    return (
      <g className="cai-s-carry" key={`${key}-pill`}>
        <rect x={x - w / 2} y={y - 11} width={w} height="22" rx="11" />
        <text x={x} y={y + 4} textAnchor="middle">{text}</text>
      </g>
    );
  };

  /** A credential the workload now holds: a filled pill. */
  const credential = (x: number, y: number, text: string) => {
    const w = textWidth(text, 11, true) + 22;
    return (
      <g className="cai-s-tee cai-s-fade" key={text}>
        <rect x={x} y={y} width={w} height="22" rx="11" />
        <text x={x + w / 2} y={y + 15} textAnchor="middle" className="cai-s-badge">{text}</text>
      </g>
    );
  };
  const credWidth = (text: string) => textWidth(text, 11, true) + 22;

  const service = (r: R, id: "ccm" | "dsm", title: string, sub: string, body: React.ReactNode, idle = false) => {
    const subX = r.x + 31 + title.length * 9.5 + 8; // the title is in capitals, wider than average text
    return (
    <g className={`cai-s-account${idle ? " is-idle" : ""}`} data-state={state(id)}>
      <rect className="cai-s-halo" x={r.x - 4} y={r.y - 4} width={r.w + 8} height={r.h + 8} rx="12" />
      <rect className="cai-s-card" x={r.x} y={r.y} width={r.w} height={r.h} rx="9" />
      <Icon name={id} x={r.x + 10} y={r.y + 10} className={`is-${id}`} />
      <text x={r.x + 31} y={r.y + 22} className="cai-s-title">{title}</text>
      <text x={subX} y={r.y + 22} className="cai-s-muted" {...fit(sub, 11.5, r.x + r.w - 10 - subX)}>{sub}</text>
      {body}
    </g>
    );
  };

  const ccmBody = (r: R) => {
    const status = certified ? "Certificate issued" : verified ? "Matches an approved model" : sent ? "Received the evidence" : "";
    return (
      <>
        {CHECKS.map((c, k) => {
          const y = r.y + 44 + k * 18;
          return (
            <g key={c}>
              <circle cx={r.x + 18} cy={y - 4} r="7" className={verified ? "cai-s-tick is-ok" : "cai-s-tick"} style={verified ? { animationDelay: `${k * 180}ms` } : undefined} />
              {verified && <Icon name="check" x={r.x + 13} y={y - 9} size={10} className="cai-s-tick-mark" />}
              <text x={r.x + 32} y={y} className={verified ? "cai-s-item" : "cai-s-muted"} {...fit(c, 12, r.w - 44)}>{c}</text>
            </g>
          );
        })}
        <text key={status} x={r.x + 12} y={r.y + r.h - 12} className={verified ? "cai-s-done" : "cai-s-pending"} {...fit(status, 11.5, r.w - 24, verified)}>
          {verified ? `✓ ${status}` : status}
        </text>
      </>
    );
  };

  const dsmBody = (r: R) =>
    needsKey ? (
      <>
        <Icon name={keyed ? "unlock" : "lock"} x={r.x + 11} y={r.y + 35} size={14} className="is-dsm" />
        <text x={r.x + 32} y={r.y + 46} className="cai-s-item">Model encryption key</text>
        <text x={r.x + 32} y={r.y + 62} className="cai-s-muted" {...fit("Released only to approved workloads", 11.5, r.w - 44)}>Released only to approved workloads</text>
        {/* What has happened, in order. */}
        {authed && <text key="authed" x={r.x + 12} y={r.y + r.h - 29} className="cai-s-done" {...fit("✓ Workload authenticated over mutual TLS", 11.5, r.w - 24, true)}>✓ Workload authenticated over mutual TLS</text>}
        {keyed && <text key="keyed" x={r.x + 12} y={r.y + r.h - 12} className="cai-s-done">✓ Key released into the TEE</text>}
      </>
    ) : (
      <>
        <text x={r.x + 12} y={r.y + 46} className="cai-s-item">No model key needed</text>
        {wrap("The workload can still get any key it needs, the same way.", charsFor(r.w - 24, 11.5)).slice(0, 2).map((t, k) => (
          <text key={k} x={r.x + 12} y={r.y + 64 + k * 15} className="cai-s-muted">{t}</text>
        ))}
      </>
    );

  const workloadCard = (r: R, narrow: boolean) => {
    const sub = needsKey
      ? serving ? "Model weights decrypted, serving requests" : "Model weights encrypted"
      : serving ? "Serving requests" : "Model weights loaded";
    const creds = [certified && "✓ Certificate", keyed && "✓ Model key"].filter(Boolean) as string[];
    // Wide: the credentials at the card's right end. Narrow: on a row of their own.
    let cx = narrow ? r.x + 48 : r.x + r.w - 12 - creds.reduce((a, t) => a + credWidth(t) + 8, -8);
    const cy = narrow ? r.y + 52 : r.y + r.h / 2 - 11;
    return (
      <g className="cai-s-asset is-infra" data-state={state("workload")}>
        <rect className="cai-s-halo" x={r.x - 4} y={r.y - 4} width={r.w + 8} height={r.h + 8} rx="13" />
        <rect className="cai-s-card" x={r.x} y={r.y} width={r.w} height={r.h} rx="10" />
        <Icon name={needsKey && !serving ? "lock" : "unlock"} x={r.x + 14} y={narrow ? r.y + 14 : r.y + r.h / 2 - 11} size={22} />
        <text x={r.x + 48} y={r.y + 25} className="cai-s-title">Model workload</text>
        <text key={sub} x={r.x + 48} y={r.y + 42} className="cai-s-muted cai-s-fade" {...fit(sub, 11.5, r.w - 58)}>{sub}</text>
        {creds.map((t) => {
          const el = credential(cx, cy, t);
          cx += credWidth(t) + 8;
          return el;
        })}
      </g>
    );
  };

  const renderScene = (l: Layout, cls: string) => {
    const { ccm, dsm, tee, workload } = l.spots;
    const to = l.spots[step.focus];
    const from = step.from ? l.spots[step.from] : undefined;
    let arrow: React.ReactNode = null;
    let target: React.ReactNode = null;
    if (from && step.carries) {
      if (l.pillY !== undefined) {
        const service = step.focus === "ccm" || step.focus === "dsm" ? to : from;
        const x = service.x + service.w / 2;
        const up = from.y > to.y;
        const y1 = up ? from.y : from.y + from.h;
        const y2 = up ? to.y + to.h : to.y;
        arrow = (
          <g key={key} className="cai-s-arrow">
            <path d={`M${x},${y1} L${x},${y2 + (up ? 4 : -4)}`} pathLength={1} markerEnd={`url(#${uid}-${cls})`} />
            {pill(x, l.pillY, step.carries)}
          </g>
        );
      } else if (step.focus === "ccm" || step.focus === "dsm") {
        // Narrow: no arrows. The label goes under the service that receives it; the workload shows what it got.
        target = pill(to.x + to.w / 2, to.y + to.h, step.carries);
      }
    }
    const teeLabel = "Trusted execution environment";
    const tw = textWidth(teeLabel, 11.5, true) + 22;
    return (
      <svg className={`cai-scene ${cls}`} viewBox={`0 0 ${l.w} ${l.h}`} role="img" aria-label={`How Confidential AI works, ${step.title}`}>
        <defs>
          <marker id={`${uid}-${cls}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="cai-s-head" />
          </marker>
        </defs>

        {service(ccm, "ccm", "CCM", "Checks the workload", ccmBody(ccm))}
        {service(dsm, "dsm", "DSM", "Keeps the model key", dsmBody(dsm), !needsKey)}

        <g className="cai-s-host">
          <rect x={l.host.x} y={l.host.y} width={l.host.w} height={l.host.h} rx="14" />
          {l.hostText.lines.map((t, k) => (
            <text key={k} x={l.hostText.x} y={l.hostText.y + k * 15} textAnchor="middle" className="cai-s-host-name" {...fit(t, 11.5, l.host.w - 24, true)}>{t}</text>
          ))}
        </g>

        <g className="cai-s-teebox" data-state={state("tee")}>
          <rect className="cai-s-halo" x={tee.x - 4} y={tee.y - 4} width={tee.w + 8} height={tee.h + 8} rx="16" />
          <rect className="cai-s-card" x={tee.x} y={tee.y} width={tee.w} height={tee.h} rx="12" />
          {l.chips.map((c) => (
            <g key={c.text} className="cai-s-chip">
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="11" />
              <text x={c.x + c.w / 2} y={c.y + 15} textAnchor="middle">{c.text}</text>
            </g>
          ))}
          {/* Recorded as the TEE starts, so it joins just after the TEE. */}
          <g className="cai-s-measure">
            <rect x={l.measurement.x} y={l.measurement.y} width={l.measurement.w} height={l.measurement.h} rx="11" />
            <text x={l.measurement.x + l.measurement.w / 2} y={l.measurement.y + 15} textAnchor="middle">{MEASURE_LABEL}</text>
          </g>
          <g className="cai-s-tee">
            <rect x={tee.x + tee.w / 2 - tw / 2} y={tee.y - 11} width={tw} height="22" rx="11" />
            <text x={tee.x + tee.w / 2} y={tee.y + 4} textAnchor="middle">{teeLabel}</text>
          </g>
        </g>

        {workloadCard(workload, l.pillY === undefined)}
        {arrow}
        {target}
      </svg>
    );
  };

  // Every step of both paths in one cell: the panel is as tall as the longest and the page doesn't move.
  const panels = [...variants.key.map((s, n) => ({ s, n, v: true, of: variants.key.length })), ...variants.none.map((s, n) => ({ s, n, v: false, of: variants.none.length }))];

  return (
    <figure
      ref={figureRef}
      className="cai cai-deploy cai-attest"
      aria-label="How Confidential AI works, step by step"
      data-speech="steps"
      data-speech-intro="A diagram follows, showing how Confidential AI works"
      data-speech-variant={needsKey ? "key" : "none"}>
      <nav className="cai-timeline" aria-label="Steps">
        <div className="cai-day" data-current="true">
          <span className="cai-day-label">Steps</span>
          <ol>
            {steps.map((s, n) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-label={`Step ${n + 1}, ${s.title}`}
                  aria-current={n === i ? "step" : undefined}
                  data-done={n < i}
                  onClick={() => setIndex(n)}
                >
                  {n + 1}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <span className="cai-deploy-step-nav">
          <button type="button" onClick={() => setIndex(i - 1)} disabled={i === 0}>Previous</button>
          <button type="button" onClick={() => setIndex(i + 1)} disabled={i === steps.length - 1}>Next</button>
        </span>
      </nav>

      <div className="cai-scene-wrap">
        {renderScene(wide, "is-wide")}
        {renderScene(narrow, "is-narrow")}
      </div>

      <div className="cai-deploy-panels" aria-live="polite">
        {panels.map(({ s, n, v, of }) => {
          const active = v === needsKey && s === step;
          return (
            <div
              key={`${v}-${s.id}`}
              className="cai-deploy-panel"
              data-active={active}
              aria-hidden={!active}
              data-speech-step={n}
              data-speech-variant={v ? "key" : "none"}>
              <p className="cai-deploy-who" data-speech-skip>Step {n + 1} of {of}</p>
              <p className="cai-deploy-title">{s.title}</p>
              <p>{s.text}</p>
              {keyRelease === "toggle" && s.id === "run" && (
                <div className="cai-runtime-choice" role="radiogroup" aria-label="Does the workload need a key from DSM">
                  {[true, false].map((x) => (
                    <button key={String(x)} type="button" role="radio" aria-checked={x === needsKey} tabIndex={active ? 0 : -1} onClick={() => choose(x)}>
                      {x ? "Gets the model key from DSM" : "Needs no key"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="cai-deploy-accounts">
        {keyRelease === "toggle" && step.id !== "run" && (
          <>{needsKey ? "The workload gets the model key from DSM." : "The workload needs no key from DSM."} <button type="button" className="cai-link" onClick={() => setIndex(0)}>Change</button></>
        )}
      </p>
    </figure>
  );
}

export default AttestationFlow;
