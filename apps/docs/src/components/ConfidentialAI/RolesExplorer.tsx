import React, { useMemo, useState } from "react";
import "./styles.css";
import { KEY_RELEASE_LABEL, ROLES, ROLE_ORDER, SCENARIOS, USE_CASE_NAMES, type RoleId, type Scenario, type UseCaseId } from "./scenarios";

// The Confidential AI roles and which real parties hold them, in the style of
// the deployment scene: each party is a blue territory around the roles it
// holds, and each role is a card with what it puts at stake. A lock marks what
// confidential computing protects. Picking another deployment slides the
// territories, so roles held by one party merge into one territory.
//
// Wide screens show the roles side by side. Narrow ones stack the parties,
// each with its roles.
//
// Props
//   useCase:   show only that use case's scenarios (used on the use-case pages)
//   scenarios: explicit list of scenario ids (overrides useCase)
//   initial:   scenario id to open first

const SLOT = 100 / ROLE_ORDER.length;
const slotOf = (r: RoleId) => ROLE_ORDER.indexOf(r);

/** What each role puts at stake, and whether confidential computing protects it here. */
function stake(role: RoleId, s: Scenario): { text: string; locked: boolean; tee?: boolean } {
  const open = s.useCase === "open-source";
  switch (role) {
    case "owner": return open ? { text: "Public weights", locked: false } : { text: "Model weights", locked: true };
    case "consumer": return { text: "Prompts and data", locked: true };
    case "infra": return { text: "Cannot see inside the TEE", locked: false, tee: true };
    case "user": return { text: "Requests", locked: true };
  }
}

const ROLE_ICON: Record<RoleId, React.ReactNode> = {
  // Stacked layers: the model.
  owner: <><path d="M16 4 4 10l12 6 12-6z" /><path d="m4 16 12 6 12-6" /><path d="m4 22 12 6 12-6" /></>,
  // A chat window: the application that uses the model.
  consumer: <><rect x="3" y="5" width="26" height="18" rx="3" /><path d="M9 23v5l6-5" /><path d="M9 12h14M9 16h9" /></>,
  // Hosts.
  infra: <><rect x="3" y="3" width="26" height="7" rx="2" /><rect x="3" y="12.5" width="26" height="7" rx="2" /><rect x="3" y="22" width="26" height="7" rx="2" /><circle cx="8" cy="6.5" r="1.2" /><circle cx="8" cy="16" r="1.2" /><circle cx="8" cy="25.5" r="1.2" /></>,
  // People.
  user: <><circle cx="11" cy="10" r="4.5" /><path d="M3 27c0-5 3.5-8 8-8s8 3 8 8" /><circle cx="23" cy="12" r="3.5" /><path d="M21 19.5c4.5-.5 8 2 8 7" /></>,
};

const Lock = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="cai-lock"><rect x="3" y="7" width="10" height="7.5" rx="1.5" /><path d="M5 7V5a3 3 0 0 1 6 0v2" /></svg>
);

function RoleCard({ role, s }: { role: RoleId; s: Scenario }) {
  const st = stake(role, s);
  return (
    <div className={`cai-rc${st.tee ? " is-infra" : ""}`}>
      {st.tee && <span className="cai-rc-tee">Runs the TEE</span>}
      <svg viewBox="0 0 32 32" aria-hidden="true" className="cai-rc-icon">{ROLE_ICON[role]}</svg>
      <span className="cai-rc-name">{ROLES[role].name}</span>
      <span key={st.text} className={`cai-rc-stake${st.locked ? " is-locked" : ""}`}>
        {st.locked && <Lock />}
        {st.text}
      </span>
    </div>
  );
}

export function RolesExplorer({
  useCase,
  scenarios,
  initial,
}: {
  useCase?: UseCaseId;
  scenarios?: string[];
  initial?: string;
}) {
  const list = useMemo(() => {
    if (scenarios) return SCENARIOS.filter((s) => scenarios.includes(s.id));
    if (useCase) return SCENARIOS.filter((s) => s.useCase === useCase);
    return SCENARIOS;
  }, [useCase, scenarios]);

  const [id, setId] = useState(initial && list.some((s) => s.id === initial) ? initial : list[0].id);
  const sc = list.find((s) => s.id === id) ?? list[0];
  const groups = useMemo(() => {
    const g: { useCase: UseCaseId; items: Scenario[] }[] = [];
    for (const s of list) {
      const last = g[g.length - 1];
      if (last && last.useCase === s.useCase) last.items.push(s);
      else g.push({ useCase: s.useCase, items: [s] });
    }
    return g;
  }, [list]);
  const showUseCase = groups.length > 1;

  return (
    <figure className="cai cai-roles" aria-label="Who holds which role">
      {/* One scenario (e.g. on an end-to-end guide): no picker. */}
      {list.length > 1 && (
        <div className="cai-picker" aria-label="Deployment">
          {groups.map((g) => (
            <div key={g.useCase} className="cai-picker-group" role="group" aria-label={USE_CASE_NAMES[g.useCase]}>
              {showUseCase && <span className="cai-picker-label">{USE_CASE_NAMES[g.useCase]}</span>}
              <div className="cai-picker-options">
                {g.items.map((s) => (
                  <button key={s.id} type="button" aria-pressed={s.id === sc.id} onClick={() => setId(s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wide: the roles side by side, the parties' territories sliding over them. */}
      <div className="cai-roles-stage" aria-hidden="true">
        {sc.parties.map((p) => {
          const start = Math.min(...p.roles.map(slotOf));
          return (
            <div
              key={start}
              className="cai-party"
              style={{ left: `calc(${start * SLOT}% + 3px)`, width: `calc(${p.roles.length * SLOT}% - 6px)` }}
            >
              <span key={p.name} className="cai-party-name">{p.name}</span>
              {p.note && <span key={p.note} className="cai-party-note">{p.note}</span>}
            </div>
          );
        })}
        {ROLE_ORDER.map((r) => (
          <div key={r} className="cai-role-slot" style={{ left: `calc(${slotOf(r) * SLOT}% + 12px)`, width: `calc(${SLOT}% - 24px)` }}>
            <RoleCard role={r} s={sc} />
          </div>
        ))}
      </div>

      {/* Narrow, and for screen readers: each party with the roles it holds. */}
      <ul className="cai-roles-list">
        {sc.parties.map((p) => (
          <li key={p.name} className="cai-party-block">
            <span className="cai-party-name">{p.name}</span>
            {p.note && <span className="cai-party-note">{p.note}</span>}
            <div className="cai-party-roles">
              {p.roles.map((r) => <React.Fragment key={r}><RoleCard role={r} s={sc} /></React.Fragment>)}
            </div>
          </li>
        ))}
      </ul>

      <figcaption className="cai-roles-text" aria-live="polite">
        <p className="cai-roles-summary">{sc.summary}</p>
        <div className="cai-roles-cols">
          <div>
            <p className="cai-roles-label">Protected</p>
            <ul className="cai-protected">
              {sc.protects.map((t) => <li key={t}><Lock />{t}</li>)}
            </ul>
          </div>
          <div>
            <p className="cai-roles-label">
              Key release{" "}
              <span className={`cai-pill is-${sc.keyRelease}`}>{KEY_RELEASE_LABEL[sc.keyRelease]}</span>
            </p>
            <p>{sc.keyNote}</p>
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

export default RolesExplorer;
