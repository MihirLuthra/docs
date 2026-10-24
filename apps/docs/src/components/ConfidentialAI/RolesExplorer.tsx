import React, { useMemo, useState } from "react";
import "./styles.css";
import { KEY_RELEASE_LABEL, ROLES, ROLE_ORDER, SCENARIOS, USE_CASE_NAMES, type RoleId, type UseCaseId } from "./scenarios";

// Shows the Confidential AI roles and which real parties hold them.
// Picking a scenario animates the party outlines: roles held by one party merge into one box.
//
// Props
//   useCase:   show only that use case's scenarios (used on the use-case pages)
//   scenarios: explicit list of scenario ids (overrides useCase)
//   initial:   scenario id to open first

const SLOT = 100 / ROLE_ORDER.length;
const slotOf = (r: RoleId) => ROLE_ORDER.indexOf(r);

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
  const showUseCase = !useCase && !scenarios;

  const onKey = (e: React.KeyboardEvent) => {
    const n = list.findIndex((s) => s.id === sc.id);
    if (e.key === "ArrowRight") setId(list[(n + 1) % list.length].id);
    if (e.key === "ArrowLeft") setId(list[(n - 1 + list.length) % list.length].id);
  };

  return (
    <figure className="cai cai-roles" aria-label="Who holds which role">
      {/* One scenario (e.g. on an end-to-end guide): no picker. */}
      {list.length > 1 && (
        <div className="cai-picker" role="tablist" aria-label="Scenario" onKeyDown={onKey}>
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === sc.id}
              tabIndex={s.id === sc.id ? 0 : -1}
              onClick={() => setId(s.id)}
            >
              {showUseCase && <small>{USE_CASE_NAMES[s.useCase]}</small>}
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="cai-roles-stage">
        {sc.parties.map((p) => {
          const start = Math.min(...p.roles.map(slotOf));
          const span = p.roles.length;
          return (
            <div
              key={start}
              className="cai-party"
              style={{ left: `calc(${start * SLOT}% + 3px)`, width: `calc(${span * SLOT}% - 6px)` }}
            >
              <span className="cai-party-name">{p.name}</span>
              {p.note && <span className="cai-party-note">{p.note}</span>}
            </div>
          );
        })}
        {ROLE_ORDER.map((r) => (
          <div key={r} className={`cai-role is-${r}`} style={{ left: `calc(${slotOf(r) * SLOT}% + 10px)`, width: `calc(${SLOT}% - 20px)` }}>
            <span className="cai-role-full">{ROLES[r].name}</span>
            <span className="cai-role-short">{ROLES[r].short}</span>
            {r === "infra" && <span className="cai-role-tee">Runs the workload in a TEE</span>}
          </div>
        ))}
      </div>

      <figcaption className="cai-roles-text" aria-live="polite">
        <p className="cai-roles-summary">{sc.summary}</p>
        <div className="cai-roles-cols">
          <div>
            <p className="cai-roles-label">Protected</p>
            <ul>{sc.protects.map((t) => <li key={t}>{t}</li>)}</ul>
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
