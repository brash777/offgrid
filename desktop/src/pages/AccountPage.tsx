import { useEffect, useState, type FormEvent } from 'react';
import { fetchProfile, updateProfile, type BodyBuild, type Profile, type SessionUser } from '../api/auth';
import { ApiError } from '../api/http';
import { fetchOrders } from '../api/orders';
import { useNotify } from '../app/notifications';
import { hrefFor, navigate } from '../app/router';
import { firstName, useAuth } from '../auth/AuthContext';
import { Badge } from '../components/Badge';
import { Button, ButtonLink } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { OptionPicker } from '../components/OptionPicker';
import { SkeletonBlock } from '../components/Skeleton';
import { TextField } from '../components/TextField';
import { useAsync } from '../hooks/useAsync';
import { es } from '../i18n/es';
import { formatDateTime } from '../lib/dates';
import { formatCop } from '../lib/money';
import styles from './AccountPage.module.css';
import { ORDER_TONE } from './OrderPage';

const BUILDS: BodyBuild[] = ['SLIM', 'REGULAR', 'ATHLETIC', 'PLUS'];
const USUAL_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export function AccountPage() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === 'anonymous') {
      navigate({ name: 'login', next: hrefFor({ name: 'account' }) }, { replace: true });
    }
  }, [auth.status]);

  if (auth.status !== 'authenticated' || !auth.user) {
    return (
      <div className={styles.page}>
        <SkeletonBlock className={styles.titleSkeleton} />
      </div>
    );
  }
  return <AccountView user={auth.user} />;
}

function AccountView({ user }: { user: SessionUser }) {
  const auth = useAuth();
  const notify = useNotify();
  const { state, reload } = useAsync((signal) => fetchProfile(signal), [user.id]);

  const signOut = async () => {
    await auth.signOut();
    notify({ tone: 'success', title: es.auth.signedOut });
    navigate({ name: 'home' });
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <nav className={styles.crumb} aria-label={es.product.breadcrumb}>
          <a href={hrefFor({ name: 'home' })}>{es.nav.home}</a> / {es.account.title}
        </nav>
        <h1 className={styles.title}>{es.account.greeting(firstName(user.fullName))}</h1>
        <p className={styles.identity}>
          <span>{user.email}</span>
          <Badge tone={user.role === 'ADMIN' ? 'solid' : 'neutral'}>{es.account.roles[user.role]}</Badge>
        </p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="measures-title">
          <h2 id="measures-title" className={styles.cardTitle}>
            {es.account.measuresTitle}
          </h2>
          <p className={styles.cardBody}>{es.account.measuresBody}</p>
          {state.status === 'error' && <ErrorState error={state.error} onRetry={reload} />}
          {state.status === 'loading' && <SkeletonBlock className={styles.formSkeleton} />}
          {state.status === 'success' && (
            <MeasuresForm
              profile={state.data}
              onSaved={() => notify({ tone: 'success', title: es.account.saved })}
            />
          )}
        </section>

        <section className={styles.card} aria-labelledby="session-title">
          <h2 id="session-title" className={styles.cardTitle}>
            {es.account.sessionTitle}
          </h2>
          <p className={styles.cardBody}>{es.account.sessionBody}</p>
          <Button variant="secondary" onClick={signOut}>
            {es.account.signOut}
          </Button>
        </section>
      </div>

      <OrdersSection userId={user.id} />
    </div>
  );
}

function OrdersSection({ userId }: { userId: string }) {
  const { state, reload } = useAsync((signal) => fetchOrders(signal), [userId]);

  return (
    <section className={styles.orders} aria-labelledby="orders-title">
      <h2 id="orders-title" className={styles.ordersTitle}>
        {es.orders.title}
      </h2>
      {state.status === 'loading' && <SkeletonBlock className={styles.formSkeleton} />}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={reload} />}
      {state.status === 'success' && state.data.content.length === 0 && (
        <div className={styles.noOrders}>
          <p>{es.orders.empty}</p>
          <ButtonLink href={hrefFor({ name: 'catalog' })}>{es.cart.emptyCta}</ButtonLink>
        </div>
      )}
      {state.status === 'success' && state.data.content.length > 0 && (
        <table className={styles.orderTable}>
          <thead>
            <tr>
              <th scope="col">{es.orders.column}</th>
              <th scope="col">{es.orders.date}</th>
              <th scope="col">{es.orders.items}</th>
              <th scope="col">{es.orders.total}</th>
              <th scope="col">
                <span className="visually-hidden">{es.orders.view}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {state.data.content.map((order) => (
              <tr key={order.id}>
                <td>
                  <span className={styles.orderCode}>{es.orders.code(order.id)}</span>
                  <Badge tone={ORDER_TONE[order.status]}>{es.orders.status[order.status]}</Badge>
                </td>
                <td>{formatDateTime(order.createdAt)}</td>
                <td>{order.items.map((line) => line.productName).join(', ')}</td>
                <td className={styles.orderTotal}>{formatCop(Number(order.total))}</td>
                <td>
                  <a className={styles.orderLink} href={hrefFor({ name: 'order', id: order.id })}>
                    {es.orders.view}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

interface MeasuresFormProps {
  profile: Profile;
  onSaved: () => void;
}

function MeasuresForm({ profile, onSaved }: MeasuresFormProps) {
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '');
  const [build, setBuild] = useState<string>(profile.build ?? '');
  const [usualSize, setUsualSize] = useState(profile.usualSize ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await updateProfile({
        heightCm: height.trim() ? Number(height) : null,
        build: (build || null) as BodyBuild | null,
        usualSize: usualSize || null,
      });
      onSaved();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError && Object.keys(apiError.fields).length > 0) {
        setErrors(apiError.fields);
      } else {
        setFormError(apiError?.message ?? es.errors.generic);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label={es.account.height}
        name="heightCm"
        type="number"
        inputMode="numeric"
        min={100}
        max={230}
        placeholder={es.account.heightPlaceholder}
        value={height}
        onChange={(event) => setHeight(event.target.value)}
        error={errors.heightCm}
        className={styles.heightField}
      />
      <OptionPicker
        legend={es.account.build}
        options={BUILDS.map((value) => ({ value, label: es.account.builds[value] }))}
        value={build}
        onChange={setBuild}
      />
      <OptionPicker
        legend={es.account.usualSize}
        options={USUAL_SIZES.map((value) => ({ value, label: value }))}
        value={usualSize}
        onChange={setUsualSize}
      />
      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}
      <Button type="submit" loading={saving} className={styles.save}>
        {es.account.save}
      </Button>
    </form>
  );
}
