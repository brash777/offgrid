import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { BRAND_NAME, BRAND_TAGLINE } from '../brand';
import { NotificationsProvider, useNotify } from '../app/notifications';
import { Badge, Kbd, RarityTag } from '../components/Badge';
import { Button, ButtonLink, type ButtonVariant, type PreviewState } from '../components/Button';
import { BrandLogo } from '../components/BrandLogo';
import { GarmentArt } from '../components/garment/GarmentArt';
import { IntroSplash } from '../components/IntroSplash';
import { Marquee } from '../components/Marquee';
import { OptionPicker } from '../components/OptionPicker';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';
import { TextField } from '../components/TextField';
import { es } from '../i18n/es';
import { contrastRatio } from '../lib/color';
import { readToken } from '../lib/tokens';
import { GARMENT_SAMPLES, SAMPLE_PRODUCTS } from './sampleProducts';
import styles from './Styleguide.module.css';

const copy = es.styleguide;
const MIN_CONTRAST = 4.5;

const SECTIONS = [
  ['logo', copy.nav.logo],
  ['color', copy.nav.color],
  ['type', copy.nav.type],
  ['buttons', copy.nav.buttons],
  ['forms', copy.nav.forms],
  ['tags', copy.nav.tags],
  ['garments', copy.nav.garments],
  ['cards', copy.nav.cards],
  ['motion', copy.nav.motion],
  ['access', copy.nav.access],
] as const;

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'ai', 'danger'];
const BUTTON_STATES: Array<PreviewState | 'normal' | 'disabled' | 'loading'> = [
  'normal',
  'hover',
  'focus',
  'disabled',
  'loading',
];

const SWATCHES = [
  ['--color-bg', copy.color.swatches.bg],
  ['--color-tile', copy.color.swatches.tile],
  ['--color-text', copy.color.swatches.text],
  ['--color-text-muted', copy.color.swatches.textMuted],
  ['--color-primary', copy.color.swatches.primary],
  ['--color-accent', copy.color.swatches.accent],
  ['--color-hero', copy.color.swatches.hero],
  ['--color-ai', copy.color.swatches.ai],
  ['--palette-ink-950', copy.color.swatches.ink],
  ['--color-success', copy.color.swatches.success],
  ['--color-warning', copy.color.swatches.warning],
  ['--color-danger', copy.color.swatches.danger],
] as const;

const CONTRAST_PAIRS = [
  ['--color-text', '--color-bg'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-tile'],
  ['--color-on-primary', '--color-primary'],
  ['--color-accent', '--color-bg'],
  ['--color-on-accent', '--color-accent'],
  ['--color-on-hero', '--color-hero'],
  ['--color-ai', '--color-bg'],
  ['--color-on-ai', '--color-ai'],
  ['--color-danger', '--color-bg'],
  ['--color-success', '--color-bg'],
  ['--color-warning', '--color-bg'],
  ['--palette-ink-300', '--palette-ink-950'],
  ['--palette-paper-50', '--palette-ink-950'],
] as const;

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <header className={styles.sectionHeader}>
        <h2 id={`${id}-title`} className={styles.sectionTitle}>
          {title}
        </h2>
        {intro && <p className={styles.sectionIntro}>{intro}</p>}
      </header>
      {children}
    </section>
  );
}

function ColorSection() {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const names = new Set<string>([...SWATCHES.map(([name]) => name), ...CONTRAST_PAIRS.flat()]);
    setValues(Object.fromEntries([...names].map((name) => [name, readToken(name)])));
  }, []);

  return (
    <Section id="color" title={copy.nav.color} intro={copy.color.intro}>
      <div className={styles.swatchGrid}>
        {SWATCHES.map(([name, label]) => (
          <figure key={name} className={styles.swatch}>
            <span className={styles.swatchChip} style={{ background: `var(${name})` }} />
            <figcaption>
              <strong>{label}</strong>
              <code>{name}</code>
              <code>{values[name]}</code>
            </figcaption>
          </figure>
        ))}
      </div>
      <table className={styles.contrastTable}>
        <tbody>
          {CONTRAST_PAIRS.map(([foreground, background]) => {
            const ratio =
              values[foreground] && values[background] ? contrastRatio(values[foreground], values[background]) : 0;
            const passes = ratio >= MIN_CONTRAST;
            return (
              <tr key={`${foreground}-${background}`}>
                <td>
                  <span
                    className={styles.contrastSample}
                    style={{ color: `var(${foreground})`, background: `var(${background})` }}
                  >
                    Aa
                  </span>
                </td>
                <td>
                  <code>{foreground}</code> / <code>{background}</code>
                </td>
                <td className={styles.ratio}>{ratio.toFixed(2)}:1</td>
                <td>
                  <Badge tone={passes ? 'success' : 'warning'}>{passes ? copy.color.pass : copy.color.fail}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

function MotionSection() {
  const notify = useNotify();
  return (
    <Section id="motion" title={copy.nav.motion} intro={copy.motion.rules}>
      <h3 className={styles.subTitle}>{copy.motion.marquee}</h3>
      <Marquee items={es.announcement} />
      <h3 className={styles.subTitle}>{copy.motion.toast}</h3>
      <div className={styles.row}>
        <Button
          variant="secondary"
          onClick={() => notify({ tone: 'success', title: es.cart.added, detail: copy.sample.toastDetail })}
        >
          {copy.motion.showToast}
        </Button>
        <Button
          variant="danger"
          onClick={() => notify({ tone: 'error', title: es.errors.title, detail: es.errors.network })}
        >
          {es.errors.title}
        </Button>
      </div>
      <h3 className={styles.subTitle}>{copy.motion.skeleton}</h3>
      <div className={styles.cardGrid}>
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>
    </Section>
  );
}

export function Styleguide() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [size, setSize] = useState('M');
  const [color, setColor] = useState('#1a1a1a');

  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion ? 'reduced' : '';
  }, [reduceMotion]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <NotificationsProvider>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarLogo}>
              <BrandLogo variant="wordmark" />
            </div>
            <p className={styles.sidebarTitle}>{copy.title} · v0.2</p>
            <nav aria-label={copy.title}>
              <ol className={styles.nav}>
                {SECTIONS.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`} className={styles.navLink}>
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <ButtonLink href="index.html" variant="secondary" size="sm">
              {copy.openApp}
            </ButtonLink>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(event) => setReduceMotion(event.target.checked)}
              />
              <span>{copy.reduceMotion}</span>
            </label>
          </aside>

          <main className={styles.main}>
            <header className={styles.pageHeader}>
              <h1 className={styles.pageTitle}>{copy.subtitle}</h1>
            </header>

            <Section id="logo" title={copy.nav.logo} intro={copy.logo.intro}>
              <div className={styles.logoStage} data-surface="ink">
                <BrandLogo spin />
              </div>
              <div className={styles.row}>
                <div className={styles.flatLogo}>
                  <BrandLogo variant="wordmark" />
                </div>
                <Button onClick={() => setShowIntro(true)}>{copy.logo.playIntro}</Button>
              </div>
            </Section>

            <ColorSection />

            <Section id="type" title={copy.nav.type}>
              <div className={styles.typeStack}>
                <div>
                  <p className={styles.typeLabel}>{copy.type.logo}</p>
                  <p className={styles.typeLogo}>{BRAND_NAME}</p>
                </div>
                <div>
                  <p className={styles.typeLabel}>{copy.type.wide}</p>
                  <p className={styles.typeWide}>{BRAND_TAGLINE}</p>
                </div>
                <div>
                  <p className={styles.typeLabel}>{copy.type.display}</p>
                  <p className={styles.typeDisplay}>{copy.type.displaySample}</p>
                </div>
                <div>
                  <p className={styles.typeLabel}>{copy.type.body}</p>
                  <p className={styles.typeBody}>{copy.type.bodySample}</p>
                </div>
                <div>
                  <p className={styles.typeLabel}>{copy.type.label}</p>
                  <p className={styles.typeCaps}>Chaqueta Bomber Urbana · $ 150.000</p>
                </div>
              </div>
            </Section>

            <Section id="buttons" title={copy.nav.buttons}>
              <div
                className={styles.matrix}
                style={{ gridTemplateColumns: `120px repeat(${BUTTON_STATES.length}, 1fr)` }}
              >
                <span />
                {copy.buttons.states.map((state) => (
                  <span key={state} className={styles.matrixHead}>
                    {state}
                  </span>
                ))}
                {BUTTON_VARIANTS.map((variant) => (
                  <div key={variant} className={styles.matrixRow}>
                    <span className={styles.matrixHead}>{copy.buttons.variants[variant]}</span>
                    {BUTTON_STATES.map((state) => (
                      <div key={state} className={styles.matrixCell}>
                        <Button
                          variant={variant}
                          previewState={state === 'hover' || state === 'focus' ? state : undefined}
                          disabled={state === 'disabled'}
                          loading={state === 'loading'}
                          tabIndex={state === 'normal' ? undefined : -1}
                        >
                          {es.common.shopAll}
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className={styles.heroDemo} data-surface="hero">
                <Button size="lg">{es.common.shopAll}</Button>
                <Button variant="secondary" size="lg">
                  {es.common.viewCatalog}
                </Button>
              </div>
            </Section>

            <Section id="forms" title={copy.nav.forms}>
              <div className={styles.formGrid}>
                <TextField
                  label={copy.forms.emailLabel}
                  placeholder={copy.forms.emailPlaceholder}
                  hint={copy.forms.emailHint}
                />
                <TextField label={copy.forms.emailLabel} defaultValue="ana@correo.com" previewFocus />
                <TextField label={copy.forms.emailLabel} defaultValue="ana@correo" error={copy.forms.emailError} />
                <TextField label={copy.forms.disabledLabel} defaultValue="no editable" disabled />
              </div>
              <div className={styles.formGrid}>
                <OptionPicker
                  legend={es.common.size}
                  value={size}
                  onChange={setSize}
                  disabledSuffix={es.common.soldOut}
                  options={[
                    { value: 'S', label: 'S' },
                    { value: 'M', label: 'M' },
                    { value: 'L', label: 'L', disabled: true },
                    { value: 'XL', label: 'XL' },
                  ]}
                />
                <OptionPicker
                  legend={es.common.color}
                  value={color}
                  onChange={setColor}
                  options={[
                    { value: '#1a1a1a', label: 'Negro', swatch: '#1a1a1a' },
                    { value: '#f5f5f5', label: 'Blanco', swatch: '#f5f5f5' },
                    { value: '#4b5320', label: 'Verde Militar', swatch: '#4b5320' },
                  ]}
                />
              </div>
            </Section>

            <Section id="tags" title={copy.nav.tags}>
              <div className={styles.row}>
                <Badge tone="solid">{es.common.soldOut}</Badge>
                <Badge tone="accent">{es.common.lastUnits(3)}</Badge>
                <Badge tone="neutral">{es.catalog.title}</Badge>
                <Badge tone="ai">IA</Badge>
                <Badge tone="success">{copy.color.pass}</Badge>
                <Badge tone="warning">{copy.color.fail}</Badge>
              </div>
              <div className={styles.row}>
                <RarityTag rarity="common" />
                <RarityTag rarity="rare" />
                <RarityTag rarity="epic" />
                <RarityTag rarity="legendary" />
              </div>
            </Section>

            <Section id="garments" title={copy.nav.garments} intro={copy.garments.intro}>
              <div className={styles.garmentGrid}>
                {GARMENT_SAMPLES.map((sample) => (
                  <figure key={`${sample.kind}-${sample.color}-${sample.print ?? ''}`} className={styles.garment}>
                    <GarmentArt kind={sample.kind} color={sample.color} print={sample.print} />
                    <figcaption>
                      <code>{sample.kind}</code>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Section>

            <Section id="cards" title={copy.nav.cards} intro={copy.cards.intro}>
              <div className={styles.cardGrid}>
                {SAMPLE_PRODUCTS.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </Section>

            <MotionSection />

            <Section id="access" title={copy.nav.access} intro={copy.access.focus}>
              <dl className={styles.shortcuts}>
                {es.shortcuts.items.map((item) => (
                  <div key={item.label} className={styles.shortcut}>
                    <dt>
                      {item.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </dt>
                    <dd>{item.label}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </main>
        </div>

        <AnimatePresence>
          {showIntro && <IntroSplash key="intro" onEnter={() => setShowIntro(false)} />}
        </AnimatePresence>
      </NotificationsProvider>
    </MotionConfig>
  );
}
