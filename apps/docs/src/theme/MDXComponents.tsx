import {Children, isValidElement, type ReactNode} from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import Admonition from '@theme/Admonition';
import TabItem from '@theme/TabItem';
import DocusaurusTabs from '@theme/Tabs';
import AttestationFlow from '@site/src/components/ConfidentialAI/AttestationFlow';
import {DeploymentFlow, DeploymentSteps, DeploymentsTable} from '@site/src/components/ConfidentialAI/DeploymentFlow';
import RolesExplorer from '@site/src/components/ConfidentialAI/RolesExplorer';
import {Screenshot, Screenshots} from '@site/src/components/Screenshots';
import {CurrentVersions, SupportMatrix, Version} from '@site/src/components/Versions';

// Components MDX pages in content/ use without importing them (content/ holds
// no code). The diagrams are imported, not lazy: loaded lazily, React drops
// their server-rendered HTML while the chunk loads and puts it back, which
// shifts the page (~3KB gzipped to keep them in).

type TabProps = {label: string; children?: ReactNode};

/** `<Tab label="…">`: one tab of `<Tabs>`. */
function Tab({children}: TabProps): ReactNode {
  return children;
}

/**
 * `<Tabs>` of `<Tab label>`: Docusaurus's tabs, each tab's value its label.
 * Tabs with the same `groupId` switch together, and the choice is kept
 * (e.g. groupId="runtime": pick the runtime once per page).
 */
function Tabs({groupId, children}: {groupId?: string; children?: ReactNode}): ReactNode {
  return (
    <DocusaurusTabs groupId={groupId}>
      {Children.toArray(children)
        .filter((child) => isValidElement<TabProps>(child))
        .map((child) => {
          const {label, children: content} = (child as {props: TabProps}).props;
          return (
            <TabItem key={label} value={label} label={label}>
              {content}
            </TabItem>
          );
        })}
    </DocusaurusTabs>
  );
}

/** `<Callout type title>`: Docusaurus's admonitions (note, tip, warning). */
function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: 'note' | 'tip' | 'warning';
  title?: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <Admonition type={type} title={title}>
      {children}
    </Admonition>
  );
}

export default {
  ...MDXComponents,
  AttestationFlow,
  DeploymentFlow,
  DeploymentSteps,
  DeploymentsTable,
  RolesExplorer,
  Version,
  SupportMatrix,
  CurrentVersions,
  Tabs,
  Tab,
  Callout,
  Screenshots,
  Screenshot,
};
