import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError } from '../api/http';
import { navigateTo, hrefFor } from '../app/router';
import { useNotify } from '../app/notifications';
import { firstName, useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { TextField } from '../components/TextField';
import { es } from '../i18n/es';
import styles from './AuthPage.module.css';

type AuthMode = 'login' | 'register';
type FieldName = 'fullName' | 'email' | 'password';

interface AuthPageProps {
  mode: AuthMode;
  next?: string;
}

const EMPTY_FORM: Record<FieldName, string> = { fullName: '', email: '', password: '' };

export function AuthPage({ mode, next }: AuthPageProps) {
  const auth = useAuth();
  const notify = useNotify();
  const [values, setValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>({});
  const isLogin = mode === 'login';
  const fields: FieldName[] = isLogin ? ['email', 'password'] : ['fullName', 'email', 'password'];

  useEffect(() => {
    if (auth.status === 'authenticated') {
      navigateTo(next ?? hrefFor({ name: 'home' }), { replace: true });
    }
  }, [auth.status, next]);

  useEffect(() => {
    const firstInvalid = fields.find((field) => fieldErrors[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
    }
  }, [fieldErrors]);

  const update = (field: FieldName) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const user = isLogin
        ? await auth.signIn(values.email.trim(), values.password)
        : await auth.signUp(values.fullName.trim(), values.email.trim(), values.password);
      notify({ tone: 'success', title: es.auth.welcome(firstName(user.fullName)) });
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.code === 'EMAIL_TAKEN') {
        setFieldErrors({ email: apiError.message });
      } else if (apiError && Object.keys(apiError.fields).length > 0) {
        setFieldErrors(apiError.fields);
      } else {
        setFormError(apiError?.message ?? es.errors.generic);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.panel} data-surface="ink" aria-label={es.auth.perksLabel}>
        <BrandLogo variant="lockup" spin className={styles.logo} />
        <ul className={styles.perks}>
          {es.auth.perks.map((perk) => (
            <li key={perk}>
              <Icon name="check" />
              {perk}
            </li>
          ))}
        </ul>
      </aside>

      <section className={styles.formSide} aria-labelledby="auth-title">
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.heading}>
            <h1 id="auth-title" className={styles.title}>
              {isLogin ? es.auth.loginTitle : es.auth.registerTitle}
            </h1>
            <p className={styles.subtitle}>{isLogin ? es.auth.loginSubtitle : es.auth.registerSubtitle}</p>
          </div>

          {!isLogin && (
            <TextField
              ref={(element) => {
                fieldRefs.current.fullName = element;
              }}
              label={es.auth.fullName}
              name="fullName"
              autoComplete="name"
              value={values.fullName}
              onChange={update('fullName')}
              error={fieldErrors.fullName}
              autoFocus
            />
          )}
          <TextField
            ref={(element) => {
              fieldRefs.current.email = element;
            }}
            label={es.auth.email}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={es.auth.emailPlaceholder}
            value={values.email}
            onChange={update('email')}
            error={fieldErrors.email}
            autoFocus={isLogin}
          />
          <TextField
            ref={(element) => {
              fieldRefs.current.password = element;
            }}
            label={es.auth.password}
            name="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            hint={isLogin ? undefined : es.auth.passwordHint}
            value={values.password}
            onChange={update('password')}
            error={fieldErrors.password}
          />

          {formError && (
            <p className={styles.formError} role="alert">
              <Icon name="alert" />
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" block loading={submitting}>
            {isLogin ? es.auth.submitLogin : es.auth.submitRegister}
          </Button>

          <p className={styles.switch}>
            {isLogin ? es.auth.noAccount : es.auth.hasAccount}{' '}
            <a href={hrefFor({ name: isLogin ? 'register' : 'login', next })}>
              {isLogin ? es.auth.toRegister : es.auth.toLogin}
            </a>
          </p>
        </form>
      </section>
    </div>
  );
}
