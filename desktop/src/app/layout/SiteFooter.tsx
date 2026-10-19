import { BRAND_NAME } from '../../brand';
import { Kbd } from '../../components/Badge';
import { BrandLogo } from '../../components/BrandLogo';
import { es } from '../../i18n/es';
import { hrefFor } from '../router';
import styles from './SiteFooter.module.css';

function MarqueeRow() {
  return (
    <ul className={styles.marqueeRow}>
      {es.footer.marquee.map((item) => (
        <li key={item} className={styles.marqueeItem}>
          {item}
          <span className={styles.marqueeDot} />
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer} data-surface="ink">
      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          <MarqueeRow />
          <MarqueeRow />
          <MarqueeRow />
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.brand}>
          <span className={styles.brandLogo}>
            <BrandLogo variant="wordmark" />
          </span>
          <p className={styles.about}>{es.footer.about}</p>
        </div>

        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className={styles.heading}>
            {es.footer.shop}
          </h2>
          <ul className={styles.list}>
            {es.nav.links.map((link) => (
              <li key={link.label}>
                <a className={styles.link} href={hrefFor({ name: 'catalog', category: link.category })}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-account">
          <h2 id="footer-account" className={styles.heading}>
            {es.footer.account}
          </h2>
          <ul className={styles.list}>
            <li>
              <a className={styles.link} href={hrefFor({ name: 'login' })}>
                {es.nav.signIn}
              </a>
            </li>
            <li>
              <a className={styles.link} href={hrefFor({ name: 'register' })}>
                {es.footer.register}
              </a>
            </li>
            <li>
              <a className={styles.link} href={hrefFor({ name: 'account' })}>
                {es.nav.account}
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
          <p className={styles.text}>{es.footer.credits}</p>
        </div>
      </div>

      <div className={styles.mega} aria-hidden="true">
        <BrandLogo variant="wordmark" />
      </div>
      <p className={styles.legal}>{es.footer.rights(BRAND_NAME)}</p>
    </footer>
  );
}
