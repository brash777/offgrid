import { hrefFor } from '../app/router';
import { ButtonLink } from '../components/Button';
import { es } from '../i18n/es';
import styles from './ProductPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.message}>
      <h1 className={styles.title}>{es.product.notFound}</h1>
      <ButtonLink href={hrefFor({ name: 'catalog' })}>{es.product.backToCatalog}</ButtonLink>
    </div>
  );
}
