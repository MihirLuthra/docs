import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

// Placeholder until the home page from ux-spec.md is built.
export default function Home(): ReactNode {
  return (
    <Layout description="Documentation for Fortanix products.">
      <main className="container margin-vert--lg">
        <h1>Fortanix Documentation</h1>
        <p>
          <Link to="/get-familiar/what-fortanix-does">Get familiar</Link>
        </p>
      </main>
    </Layout>
  );
}
