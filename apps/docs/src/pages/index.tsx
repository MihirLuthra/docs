import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import {products, productPath, type Product} from '@site/src/data/products';
import styles from './index.module.css';

function Hero(): ReactNode {
  // A plain GET form to the search page: works without client-side JS.
  const searchUrl = useBaseUrl('/search');
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.title}>Fortanix Documentation</h1>
        <form className={styles.search} action={searchUrl} method="get" role="search">
          <label htmlFor="hero-search" className="sr-only">
            Search the documentation
          </label>
          <input
            id="hero-search"
            className={styles.searchInput}
            type="search"
            name="q"
            placeholder="Search the documentation"
            autoComplete="off"
          />
          <button type="submit" className={styles.searchButton}>
            Search
          </button>
        </form>
      </div>
    </header>
  );
}

function ProductCard({product}: {product: Product}): ReactNode {
  return (
    <li className={styles.card}>
      <h2 className={styles.cardTitle}>
        <Link to={productPath(product)}>{product.name}</Link>
      </h2>
      <p className={styles.cardDescription}>{product.description}</p>
      <ul className={styles.cardLinks}>
        {product.links.map((link) => (
          <li key={link.label}>
            <Link to={productPath(product, link.to)}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout description="Documentation for Fortanix products.">
      <Hero />
      <main className={styles.main}>
        <h2 className="sr-only">Products</h2>
        <ul className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      </main>
    </Layout>
  );
}
