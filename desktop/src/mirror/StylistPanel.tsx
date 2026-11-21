import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { ProductSummary } from '../api/catalog';
import { ApiError, assetUrl } from '../api/http';
import { askStylist, type StylistOutfit } from '../api/stylist';
import { currentHref, hrefFor } from '../app/router';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { es } from '../i18n/es';
import { formatCop } from '../lib/money';
import { canTryOn } from './tryOn';
import styles from './StylistPanel.module.css';

interface StylistPanelProps {
  canCapture: boolean;
  capture: () => Promise<string | null>;
  wearingId: string | null;
  onTryOn: (productId: string) => void;
}

type State =
  | { status: 'idle' }
  | { status: 'thinking' }
  | { status: 'done'; outfit: StylistOutfit }
  | { status: 'error'; message: string };

const text = es.mirror.stylist;

export function StylistPanel({ canCapture, capture, wearingId, onTryOn }: StylistPanelProps) {
  const auth = useAuth();
  const [prompt, setPrompt] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [state, setState] = useState<State>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);
  const inputId = useId();
  const noticeId = useId();

  useEffect(() => () => controllerRef.current?.abort(), []);

  if (auth.status !== 'authenticated') {
    return (
      <div className={styles.signIn}>
        <p>{text.signIn}</p>
        <a className={styles.link} href={hrefFor({ name: 'login', next: currentHref() })}>
          {text.signInAction}
        </a>
      </div>
    );
  }

  const ask = async (question: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'thinking' });
    try {
      const photo = useCamera && canCapture ? await capture() : null;
      const outfit = await askStylist(
        { prompt: question.trim(), photo, photoConsent: photo !== null },
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }
      setState({ status: 'done', outfit });
      const wearable = outfit.items.find(canTryOn);
      if (wearable) {
        onTryOn(wearable.id);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: 'error', message: error instanceof ApiError ? error.message : text.failed });
      }
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(prompt);
  };

  if (state.status === 'done') {
    const { outfit } = state;
    return (
      <div className={styles.result} aria-live="polite">
        <div className={styles.meta}>
          <span className={styles.source} data-source={outfit.source}>
            <Icon name={outfit.source === 'AI' ? 'bolt' : 'check'} />
            {outfit.source === 'AI' ? text.sourceAi : text.sourceRules}
          </span>
          <span className={styles.remaining}>{text.remaining(outfit.remainingToday)}</span>
        </div>
        <p className={styles.message}>{outfit.message}</p>
        <ul className={styles.items}>
          {outfit.items.map((product) => (
            <OutfitItem key={product.id} product={product} wearing={product.id === wearingId} onTryOn={onTryOn} />
          ))}
        </ul>
        <button type="button" className={styles.link} onClick={() => setState({ status: 'idle' })}>
          {text.again}
        </button>
      </div>
    );
  }

  const thinking = state.status === 'thinking';
  return (
    <form className={styles.form} onSubmit={submit} aria-busy={thinking}>
      <p className={styles.intro}>{text.intro}</p>
      <div className={styles.ideas}>
        {text.ideas.map((idea) => (
          <button
            key={idea}
            type="button"
            className={styles.idea}
            disabled={thinking}
            onClick={() => {
              setPrompt(idea);
              void ask(idea);
            }}
          >
            {idea}
          </button>
        ))}
      </div>
      <label className={styles.label} htmlFor={inputId}>
        {text.label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        value={prompt}
        maxLength={300}
        placeholder={text.placeholder}
        disabled={thinking}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <label className={styles.check} data-disabled={!canCapture || undefined}>
        <input
          type="checkbox"
          checked={useCamera && canCapture}
          disabled={!canCapture || thinking}
          aria-describedby={noticeId}
          onChange={(event) => setUseCamera(event.target.checked)}
        />
        {text.useCamera}
      </label>
      <p id={noticeId} className={styles.notice}>
        <Icon name="shield" />
        {text.photoNotice}
      </p>
      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <Button
        type="submit"
        variant="ai"
        block
        loading={thinking}
        disabled={thinking || (prompt.trim() === '' && !(useCamera && canCapture))}
        icon={<Icon name="bolt" />}
      >
        {thinking ? text.thinking : text.submit}
      </Button>
    </form>
  );
}

interface OutfitItemProps {
  product: ProductSummary;
  wearing: boolean;
  onTryOn: (productId: string) => void;
}

function OutfitItem({ product, wearing, onTryOn }: OutfitItemProps) {
  const content = (
    <>
      <span className={styles.thumb}>
        <img src={assetUrl(product.thumbnailUrl) ?? undefined} alt="" draggable={false} />
      </span>
      <span className={styles.itemText}>
        <span className={styles.itemName}>{product.name}</span>
        <span className={styles.itemPrice}>{formatCop(product.basePrice)}</span>
      </span>
      {wearing ? (
        <span className={styles.wearing}>
          <Icon name="check" />
          {text.wearing}
        </span>
      ) : (
        <Icon name={canTryOn(product) ? 'camera' : 'arrow-up-right'} />
      )}
    </>
  );
  return (
    <li>
      {canTryOn(product) ? (
        <button
          type="button"
          className={styles.item}
          aria-pressed={wearing}
          aria-label={text.tryOn(product.name)}
          onClick={() => onTryOn(product.id)}
        >
          {content}
        </button>
      ) : (
        <a className={styles.item} href={hrefFor({ name: 'product', id: product.id })} aria-label={text.view(product.name)}>
          {content}
        </a>
      )}
    </li>
  );
}
