import type {ReactNode} from 'react';
import Heading from '@theme-original/Heading';
import type HeadingType from '@theme/Heading';
import type {WrapperProps} from '@docusaurus/types';
import CopyPath from '@site/src/components/CopyPath';
import ListenFrom from '@site/src/components/Listen/ListenFrom';

type Props = WrapperProps<typeof HeadingType>;

// Section headings get a copy button for their path (page#section) in place
// of Docusaurus's "#" link (hidden in CopyPath's styles) and, on pages with
// audio, "Listen from here". The page title (h1) has both in the path above it.
export default function HeadingWrapper(props: Props): ReactNode {
  if (props.as === 'h1' || !props.id) return <Heading {...props} />;
  return (
    <Heading {...props}>
      {props.children}
      <CopyPath hash={props.id} label="Copy path to this section" />
      <ListenFrom />
    </Heading>
  );
}
