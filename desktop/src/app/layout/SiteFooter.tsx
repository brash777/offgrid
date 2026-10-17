import { BRAND_NAME } from '../../brand';
import { Kbd } from '../../components/Badge';
import { BrandLogo } from '../../components/BrandLogo';
import { es } from '../../i18n/es';
import { hrefFor } from '../router';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer} data-surface="ink">
      <div className={styles.columns}>
        <p className={styles.about}>{es.footer.about}</p>
        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className={styles.heading}>
            {es.footer.shop}
          </h2>
          <ul className={styles.list}>
            <li>
              <a className={styles.link} href={hrefFor({ name: 'home' })}>
                {es.nav.home}
              </a>
            </li>
            <li>
              <a className={styles.link} href={hrefFor({ name: 'catalog' })}>
                {es.nav.catalog}
              </a>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className={styles.heading}>{es.shortcuts.title}</h2>
          <ul className={styles.list}>
            {es.shortcuts.items.map((item) => (
              <li key={item.label} className={styles.shortcut}>
                <span className={styles.keys}>
                  {item.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={styles.heading}>{es.footer.project}</h2>
          <p className={styles.text}>{es.footer.privacy}</p>
        </div>
      </div>
      <div className={styles.mega} aria-hidden="true">
        <BrandLogo variant="wordmark" />
      </div>
      <p className={styles.legal}>{es.footer.rights(BRAND_NAME)}</p>
    </footer>
  );
}
