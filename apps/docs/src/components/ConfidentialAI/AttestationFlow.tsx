import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

// Step-through animation of the Confidential AI flow:
// run in a TEE -> attest to CCM -> certificate for an approved model
// -> (when needed) DSM releases the model encryption key into the TEE.
//
// Props
//   keyRelease: "toggle" (default) shows a switch; "required" or "optional" fixes the path.
//   initialKey: starting position of the switch when keyRelease="toggle" (default true).

type NodeId = "ccm" | "wl" | "dsm";
type TokenKind = "evidence" | "cert" | "mtls" | "key";

interface Step {
  id: string;
  title: string;
  text: string;
  token?: { from: NodeId; to: NodeId; kind: TokenKind };
}

// Example value shown in the diagram. Not real.
const MEASUREMENT = "9c2e…41a7";

const COMMON: Step[] = [
  {
    id: "run",
    title: "Run inside a TEE",
    text: "The model workload starts inside a trusted execution environment, with the GPU in confidential computing mode. Its memory is encrypted and isolated, so the host operating system, the hypervisor and their administrators cannot read or change it.",
  },
  {
    id: "evidence",
    title: "Send evidence to CCM",
    text: "The attestation client inside the workload collects signed evidence from the CPU and GPU. The evidence includes the workload's measurement, a fingerprint of exactly what is running.",
    token: { from: "wl", to: "ccm", kind: "evidence" },
  },
  {
    id: "verify",
    title: "CCM verifies",
    text: "CCM checks that the hardware is genuine, that its firmware and security settings meet policy, and that the measurement matches an approved model.",
  },
  {
    id: "cert",
    title: "CCM issues a certificate",
    text: "When every check passes, CCM issues the workload a certificate for that approved model.",
    token: { from: "ccm", to: "wl", kind: "cert" },
  },
];

const WITH_KEY: Step[] = [
  {
    id: "present",
    title: "Authenticate to DSM over mutual TLS",
    text: "The workload connects to DSM over mutual TLS, with its certificate as its client certificate, and asks for the model encryption key. The certificate stays with the workload. The TLS handshake proves the workload holds it.",
    token: { from: "wl", to: "dsm", kind: "mtls" },
  },
  {
    id: "key",
    title: "DSM releases the key",
    text: "DSM trusts certificates from CCM. It checks that the client certificate is for the approved model, then releases the key directly into the TEE over that connection. A modified workload has a different measurement, so it gets no certificate and no key.",
    token: { from: "dsm", to: "wl", kind: "key" },
  },
  {
    id: "serve",
    title: "Decrypt and serve",
    text: "Only the approved code around the model can use the key. It decrypts the weights inside the TEE and serves requests.",
  },
];

const WITHOUT_KEY: Step[] = [
  {
    id: "serve",
    title: "Serve",
    text: "The workload serves requests. Whenever it needs a key, or needs to prove itself to another service, it authenticates with its certificate over mutual TLS.",
  },
];

const AUTOPLAY_MS = 3200;

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const Icon = {
  lock: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" /><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  ),
  unlock: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" /><path d="M5 7V5a3 3 0 0 1 5.8-1" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 2.5 3.5v4c0 3.4 2.3 5.9 5.5 7 3.2-1.1 5.5-3.6 5.5-7v-4z" fill="currentColor" /></svg>
  ),
  cert: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10.5" cy="10.5" r="2.4" fill="currentColor" /><path d="M9.3 12.5 8.8 15l1.7-.9 1.7.9-.5-2.5" fill="currentColor" /><path d="M4.5 5.5h7M4.5 8h3.5" stroke="currentColor" strokeWidth="1.3" /></svg>
  ),
  mtls: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5.5h10M9.5 3 12 5.5 9.5 8M14 10.5H4M6.5 8 4 10.5 6.5 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  key: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M8 8h6.5M12 8v2.5M14 8v2" stroke="currentColor" strokeWidth="1.7" /></svg>
  ),
  evidence: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M6 8h5M6 10.5h5" stroke="currentColor" strokeWidth="1.3" /></svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
};

const TOKEN_LABEL: Record<TokenKind, string> = { evidence: "Evidence", cert: "Certificate", mtls: "mTLS · certificate", key: "Encryption key" };

export function AttestationFlow({
  keyRelease = "toggle",
  initialKey = true,
}: {
  keyRelease?: "toggle" | "required" | "optional";
  initialKey?: boolean;
}) {
  const [needsKey, setNeedsKey] = useState(keyRelease === "toggle" ? initialKey : keyRelease === "required");
  const steps = useMemo(() => [...COMMON, ...(needsKey ? WITH_KEY : WITHOUT_KEY)], [needsKey]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = steps[Math.min(i, steps.length - 1)];
  const at = (id: string) => steps.findIndex((s) => s.id === id);
  const reached = (id: string) => at(id) >= 0 && i >= at(id);

  // Autoplay
  useEffect(() => {
    if (!playing) return;
    if (i >= steps.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setI((n) => n + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, i, steps.length]);

  // Moving token
  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = { ccm: useRef<HTMLDivElement>(null), wl: useRef<HTMLDivElement>(null), dsm: useRef<HTMLDivElement>(null) };
  const tokenRef = useRef<HTMLDivElement>(null);
  const lastI = useRef(i);
  const tokenKind = step.token?.kind ?? null;

  useLayoutEffect(() => {
    const forward = i > lastI.current;
    lastI.current = i;
    const tok = step.token;
    const el = tokenRef.current, stage = stageRef.current;
    if (!el) return;
    if (!tok || !forward || !stage || prefersReducedMotion()) { el.style.transition = "none"; el.style.opacity = "0"; return; }
    const center = (id: NodeId) => {
      const r = nodeRefs[id].current!.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
    };
    const a = center(tok.from), b = center(tok.to);
    el.style.transition = "none";
    el.style.opacity = "1";
    el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%)`;
    void el.offsetWidth; // restart the transition
    el.style.transition = "transform 900ms cubic-bezier(.45,.05,.3,1), opacity 250ms ease 750ms";
    el.style.transform = `translate(${b.x}px, ${b.y}px) translate(-50%, -50%)`;
    el.style.opacity = "0";
  }, [i, needsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback((n: number) => { setPlaying(false); setI(Math.max(0, Math.min(steps.length - 1, n))); }, [steps.length]);

  const sent = reached("evidence");
  const verified = reached("verify");
  const certified = reached("cert");
  const authed = needsKey && reached("present");
  const keyed = needsKey && reached("key");
  const serving = reached("serve");
  const active = (id: NodeId) => {
    if (step.token) return step.token.from === id || step.token.to === id;
    if (step.id === "verify") return id === "ccm";
    return id === "wl";
  };

  return (
    <figure className="cai cai-flow" aria-label="How Confidential AI works, step by step">
      {keyRelease === "toggle" && (
        <label className="cai-switch">
          <input
            type="checkbox"
            checked={needsKey}
            onChange={(e) => { setNeedsKey(e.target.checked); setPlaying(false); setI((n) => Math.min(n, COMMON.length - 1)); }}
          />
          <span className="cai-switch-track" aria-hidden="true"><span /></span>
          The workload needs a key from DSM
        </label>
      )}

      <div className="cai-flow-stage" ref={stageRef}>
        <div ref={nodeRefs.ccm} className={`cai-node ${active("ccm") ? "is-active" : ""}`}>
          <div className="cai-node-head"><strong>CCM</strong><span>Verifier</span></div>
          <ul className="cai-checks">
            {["Genuine TEE hardware", "Firmware and security settings", "Approved model measurement"].map((c) => (
              <li key={c} className={verified ? "is-ok" : ""}><span className="cai-tick">{verified ? Icon.check : null}</span>{c}</li>
            ))}
          </ul>
          {sent && !verified && <div className="cai-id cai-pop">Received <code>{MEASUREMENT}</code></div>}
          {verified && <div className="cai-id cai-pop">Matches an approved model</div>}
        </div>

        <div className="cai-host">
          <div className="cai-host-label">
            <strong>Host</strong> operating system, hypervisor and administrators
            <span>Cannot read or change what runs inside the TEE</span>
          </div>
          <div ref={nodeRefs.wl} className={`cai-node cai-node-tee ${active("wl") ? "is-active" : ""}`}>
            <div className="cai-node-head">
              <strong><i className="cai-shield">{Icon.shield}</i>Model workload</strong>
              <span>Trusted execution environment</span>
            </div>
            <div className="cai-chips">
              <span className="cai-chip">CPU TEE</span>
              <span className="cai-chip">GPU · CC mode</span>
            </div>
            <div className="cai-chips cai-protect">
              <span className="cai-chip">Memory encrypted</span>
              <span className="cai-chip">Isolated from host</span>
              <span className="cai-chip">CPU to GPU traffic encrypted</span>
            </div>
            <div className="cai-chips">
              <span className="cai-chip">Attestation client</span>
              {needsKey ? (
                <span className={`cai-chip cai-chip-model ${serving ? "is-open" : ""}`}>
                  <i>{serving ? Icon.unlock : Icon.lock}</i>
                  {serving ? "Model decrypted in TEE" : "Model weights, encrypted"}
                </span>
              ) : (
                <span className="cai-chip cai-chip-model">Model weights</span>
              )}
            </div>
            <div className="cai-id">Measurement <code>{MEASUREMENT}</code></div>
            {(certified || keyed) && (
              <div className="cai-chips">
                {certified && <span className="cai-chip cai-chip-cert cai-pop"><i>{Icon.cert}</i>Certificate for the model</span>}
                {keyed && <span className="cai-chip cai-chip-key cai-pop"><i>{Icon.key}</i>Encryption key</span>}
              </div>
            )}
          </div>
        </div>

        <div ref={nodeRefs.dsm} className={`cai-node ${active("dsm") ? "is-active" : ""} ${needsKey ? "" : "is-idle"}`}>
          <div className="cai-node-head"><strong>DSM</strong><span>Key management</span></div>
          {needsKey ? (
            <>
              <div className="cai-chips">
                <span className={`cai-chip cai-chip-key ${keyed ? "is-released" : ""}`}><i>{Icon.key}</i>{keyed ? "Released into the TEE" : "Model encryption key"}</span>
              </div>
              <div className="cai-id">Released only to a client holding the model's certificate</div>
              {authed && (
                <div className="cai-authed cai-pop">
                  <i>{Icon.check}</i>Client authenticated over mTLS
                </div>
              )}
            </>
          ) : (
            <div className="cai-chips"><span className="cai-chip">Available when needed</span></div>
          )}
        </div>

        <div ref={tokenRef} className="cai-token" aria-hidden="true">
          {tokenKind && <><i>{Icon[tokenKind]}</i>{TOKEN_LABEL[tokenKind]}</>}
        </div>
      </div>

      <figcaption className="cai-caption" aria-live="polite">
        <span className="cai-step-n">Step {i + 1} of {steps.length}</span>
        <strong>{step.title}</strong>
        <span>{step.text}</span>
      </figcaption>

      <div className="cai-controls">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0}>Back</button>
        <button
          type="button"
          className="cai-primary"
          onClick={() => { if (i >= steps.length - 1) { setI(0); setPlaying(true); } else setPlaying((p) => !p); }}
        >
          {playing ? "Pause" : i >= steps.length - 1 ? "Replay" : "Play"}
        </button>
        <button type="button" onClick={() => go(i + 1)} disabled={i === steps.length - 1}>Next</button>
        <ol className="cai-dots" aria-label="Steps">
          {steps.map((s, n) => (
            <li key={s.id}>
              <button
                type="button"
                aria-label={`Step ${n + 1}, ${s.title}`}
                aria-current={n === i ? "step" : undefined}
                className={n <= i ? "is-done" : ""}
                onClick={() => go(n)}
              />
            </li>
          ))}
        </ol>
      </div>
      <p className="cai-footnote">The measurement value is an example.</p>
    </figure>
  );
}

export default AttestationFlow;
