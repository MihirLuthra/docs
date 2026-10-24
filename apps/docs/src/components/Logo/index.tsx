import type {ReactNode} from 'react';

// Fortanix mark (from fortanix.com), without the wordmark.
const MARK =
  'M14.2178 35.6221H10.6455V21.5801H14.2178V35.6221ZM8.89551 30.9854H5.32227V5.79492H8.89551V30.9854ZM19.541 30.9854H15.9688V5.79492H19.541V30.9854ZM3.57324 25.1318H0V11.0889H3.57324V25.1318ZM24.8643 25.1318H21.291V11.0889H24.8643V25.1318ZM14.2178 19.8369H10.6455V16.2852H14.2178V19.8369ZM14.2178 14.542H10.6455V5.79492H14.2178V14.542ZM3.57324 9.34668H0V5.79492H3.57324V9.34668ZM24.8643 9.34668H21.291V5.79492H24.8643V9.34668ZM3.57324 4.05176H0V0.5H3.57324V4.05176ZM14.2178 4.05176H10.6455V0.5H14.2178V4.05176ZM24.8643 4.05176H21.291V0.5H24.8643V4.05176Z';

export default function Logo({className}: {className?: string}): ReactNode {
  return (
    <svg className={className} width="17" height="24" viewBox="0 0 25 36" role="img" aria-label="Fortanix">
      <defs>
        <linearGradient id="fx-logo-gradient" x1="0" y1="18" x2="24.8" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--fx-purple)" />
          <stop offset="1" stopColor="var(--fx-blue)" />
        </linearGradient>
      </defs>
      <path d={MARK} fill="url(#fx-logo-gradient)" />
    </svg>
  );
}
