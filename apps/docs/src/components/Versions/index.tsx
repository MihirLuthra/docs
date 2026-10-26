import type {ReactNode} from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import type {Combination, Component, VersionsData} from '../../../plugins/versions-data';
import styles from './styles.module.css';

const useVersions = () => usePluginData('versions') as VersionsData;

const current = (c: Component) => c.versions.find((v) => v.status === 'current');

/**
 * A component's current version from versions/, or its artifact or name, or
 * a requirement of its current version: <Version of="coco-keyprovider" />,
 * <Version of="fortanix-kata-deploy" field="requires.kubernetes" />.
 * Unknown references fail the build.
 */
export function Version({of, field = 'version'}: {of: string; field?: string}): ReactNode {
  const component = useVersions().components.find((c) => c.id === of);
  if (!component) throw new Error(`<Version>: unknown component "${of}"`);
  if (field === 'artifact' || field === 'name') return <code>{component[field]}</code>;
  const version = current(component);
  if (!version) throw new Error(`<Version>: "${of}" has no current version`);
  if (field === 'version') return <code>{version.version}</code>;
  const requirement = field.startsWith('requires.') ? version.requires?.[field.slice('requires.'.length)] : undefined;
  if (!requirement) throw new Error(`<Version>: "${of}" has no ${field}`);
  return <code>{requirement}</code>;
}

const STATUS_LABEL: Record<Combination['status'], string> = {
  verified: 'Verified',
  preview: 'Preview',
  documented: 'Documented, not yet verified by QA',
};

const PLATFORM_LABEL: Record<string, string> = {
  tee: 'TEE',
  gpu: 'GPU',
  host_os: 'Host OS',
  kubernetes: 'Kubernetes',
};

/**
 * The tested combinations from versions/tested.json, filtered to a solution
 * and/or a runtime: one card per combination, with its status, platform,
 * component versions, and who tested it when.
 */
/**
 * The TEEs a runtime runs on, from versions/runtimes.json:
 * <SupportedTees runtime="enclave-os" />. What QA has tested is the support
 * matrix (tested.json), not this. Unknown runtimes fail the build.
 */
export function SupportedTees({runtime}: {runtime: string}): ReactNode {
  const found = useVersions().runtimes.find((r) => r.id === runtime);
  if (!found) throw new Error(`<SupportedTees>: unknown runtime "${runtime}"`);
  return <>{found.tees.join(', ')}</>;
}

export function SupportMatrix({solution, runtime}: {solution?: string; runtime?: string}): ReactNode {
  const {components, combinations} = useVersions();
  const rows = combinations.filter(
    (c) => (!solution || c.solutions.includes(solution)) && (!runtime || c.runtime === runtime),
  );
  if (rows.length === 0) return <p className={styles.empty}>No tested combinations yet.</p>;
  const nameOf = (id: string) => components.find((c) => c.id === id)?.name ?? id;
  return (
    <div className={styles.matrix}>
      {rows.map((row) => (
        <section key={row.id} className={styles.card} aria-label={`Combination ${row.id}`}>
          <p className={styles.status} data-status={row.status}>
            {STATUS_LABEL[row.status]}
          </p>
          <table className={styles.table}>
            <tbody>
              {Object.entries(row.platform).map(([key, value]) => (
                <tr key={key}>
                  <th scope="row">{PLATFORM_LABEL[key] ?? key}</th>
                  <td>{value ?? <span className={styles.unknown}>Not confirmed</span>}</td>
                </tr>
              ))}
              {Object.entries(row.components).map(([id, version]) => (
                <tr key={id}>
                  <th scope="row">{nameOf(id)}</th>
                  <td>
                    <code>{version}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.meta}>
            {row.tested_by ? `Tested by ${row.tested_by}${row.date ? ` on ${row.date}` : ''}.` : 'Not tested by QA yet.'}
            {row.source && (
              <>
                {' '}
                <a href={row.source}>Source</a>
              </>
            )}
          </p>
        </section>
      ))}
    </div>
  );
}

/**
 * The current version of each listed component (all when `ids` is empty):
 * name, artifact, version, and its requirements.
 */
export function CurrentVersions({ids}: {ids?: string[]}): ReactNode {
  const {components} = useVersions();
  const list = ids?.length ? ids.map((id) => {
    const c = components.find((x) => x.id === id);
    if (!c) throw new Error(`<CurrentVersions>: unknown component "${id}"`);
    return c;
  }) : components;
  return (
    <table>
      <thead>
        <tr>
          <th>Component</th>
          <th>Artifact</th>
          <th>Current version</th>
          <th>Requires</th>
        </tr>
      </thead>
      <tbody>
        {list.map((c) => {
          const v = current(c);
          return (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>
                <code>{c.artifact}</code>
              </td>
              <td>{v ? <code>{v.version}</code> : <span className={styles.unknown}>Not published yet</span>}</td>
              <td>
                {v?.requires
                  ? Object.entries(v.requires)
                      .map(([name, range]) => `${name} ${range}`)
                      .join(', ')
                  : ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
