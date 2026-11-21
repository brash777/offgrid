import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { fetchProducts, type ProductSummary } from '../api/catalog';
import { assetUrl } from '../api/http';
import { hrefFor } from '../app/router';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { es } from '../i18n/es';
import { formatCop } from '../lib/money';
import { loadGarment } from './garment';
import { useMirror } from './MirrorContext';
import { loadPoseTracker, setRunningMode, type PoseTracker, type RunningMode } from './poseTracker';
import { MirrorRenderer, type BodyStatus } from './renderer';
import { canTryOn, TRY_ON_CATEGORIES } from './tryOn';
import styles from './MirrorPanel.module.css';

type Source = 'camera' | 'photo';
type Phase = 'intro' | 'starting' | 'live' | 'error';
type ErrorKind = keyof typeof es.mirror.errors;

const CONSENT_KEY = 'flowstore.mirror-consent';
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_PHOTO_SIDE = 1600;
const PHOTO_ANIMATION_MS = 450;
const MAX_FRAME_ERRORS = 30;

class MirrorError extends Error {
  readonly kind: ErrorKind;

  constructor(kind: ErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

function cameraError(error: unknown): ErrorKind {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'denied';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'missing';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'busy';
  }
  return 'failed';
}

function readConsent(): boolean {
  try {
    return window.sessionStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberConsent() {
  try {
    window.sessionStorage.setItem(CONSENT_KEY, 'true');
  } catch {
    return;
  }
}

async function readPhoto(file: File): Promise<ImageBitmap> {
  if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    throw new MirrorError('photo');
  }
  const original = await createImageBitmap(file).catch(() => {
    throw new MirrorError('photo');
  });
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(original.width, original.height));
  if (scale === 1) {
    return original;
  }
  const resized = await createImageBitmap(original, {
    resizeWidth: Math.round(original.width * scale),
    resizeHeight: Math.round(original.height * scale),
    resizeQuality: 'high',
  });
  original.close();
  return resized;
}

function useTryOnProducts(): ProductSummary[] | null {
  const [products, setProducts] = useState<ProductSummary[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(TRY_ON_CATEGORIES.map((categorySlug) => fetchProducts({ categorySlug, size: 50 }, controller.signal)))
      .then((pages) =>
        setProducts(pages.flatMap((page) => page.content).filter((product) => canTryOn(product) && product.thumbnailUrl)),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setProducts([]);
        }
      });
    return () => controller.abort();
  }, []);

  return products;
}

export default function MirrorPanel() {
  const mirror = useMirror();
  const reduceMotion = useReducedMotion() ?? false;
  const products = useTryOnProducts();
  const [source, setSource] = useState<Source>('camera');
  const [phase, setPhase] = useState<Phase>('intro');
  const [errorKind, setErrorKind] = useState<ErrorKind>('failed');
  const [loadingLabel, setLoadingLabel] = useState<string>(es.mirror.starting);
  const [body, setBody] = useState<BodyStatus>('searching');
  const [expanded, setExpanded] = useState(false);
  const [garmentVersion, setGarmentVersion] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<MirrorRenderer | null>(null);
  const trackerRef = useRef<PoseTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoRef = useRef<ImageBitmap | null>(null);
  const bodyRef = useRef<BodyStatus>('searching');
  const runRef = useRef(0);
  const selected = products?.find((product) => product.id === mirror.productId) ?? products?.[0] ?? null;

  const report = useCallback((status: BodyStatus) => {
    if (status !== bodyRef.current) {
      bodyRef.current = status;
      setBody(status);
    }
  }, []);

  const fail = useCallback((run: number, error: unknown) => {
    if (run === runRef.current) {
      setErrorKind(error instanceof MirrorError ? error.kind : 'failed');
      setPhase('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    runRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const prepareTracker = useCallback(async (mode: RunningMode) => {
    setLoadingLabel(es.mirror.loadingModel);
    try {
      const tracker = await loadPoseTracker();
      await setRunningMode(tracker, mode);
      trackerRef.current = tracker;
    } catch {
      throw new MirrorError('model');
    }
  }, []);

  const goLive = useCallback(
    (nextSource: Source) => {
      rendererRef.current?.reset();
      bodyRef.current = 'searching';
      setBody('searching');
      setSource(nextSource);
      setPhase('live');
    },
    [],
  );

  const startCamera = useCallback(async () => {
    stopCamera();
    const run = runRef.current;
    setSource('camera');
    setPhase('starting');
    setLoadingLabel(es.mirror.starting);
    try {
      const stream = await navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
        .catch((error: unknown) => {
          throw new MirrorError(cameraError(error));
        });
      const video = videoRef.current;
      if (run !== runRef.current || !video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      await prepareTracker('VIDEO');
      if (run === runRef.current) {
        rememberConsent();
        goLive('camera');
      }
    } catch (error) {
      fail(run, error);
    }
  }, [fail, goLive, prepareTracker, stopCamera]);

  const openPhoto = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      stopCamera();
      const run = runRef.current;
      setSource('photo');
      setPhase('starting');
      try {
        const image = await readPhoto(file);
        await prepareTracker('IMAGE');
        if (run !== runRef.current) {
          image.close();
          return;
        }
        photoRef.current?.close();
        photoRef.current = image;
        goLive('photo');
      } catch (error) {
        fail(run, error);
      }
    },
    [fail, goLive, prepareTracker, stopCamera],
  );

  const choosePhoto = useCallback(() => fileRef.current?.click(), []);

  useLayoutEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (context) {
      rendererRef.current = new MirrorRenderer(context);
    }
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.reducedMotion = reduceMotion;
    }
  }, [reduceMotion]);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    if (readConsent()) {
      void startCamera();
    }
    return () => {
      stopCamera();
      photoRef.current?.close();
      photoRef.current = null;
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const url = assetUrl(selected?.thumbnailUrl);
    if (!url) {
      return;
    }
    let active = true;
    loadGarment(url)
      .then((garment) => {
        if (active) {
          rendererRef.current?.setGarment(garment, performance.now());
          setGarmentVersion((version) => version + 1);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [selected?.thumbnailUrl]);

  useEffect(() => {
    const video = videoRef.current;
    const tracker = trackerRef.current;
    const renderer = rendererRef.current;
    if (phase !== 'live' || source !== 'camera' || !video || !tracker || !renderer) {
      return;
    }
    let active = true;
    let handle = 0;
    let errors = 0;
    const step = () => {
      if (!active) {
        return;
      }
      if (video.videoWidth > 0) {
        const now = performance.now();
        try {
          tracker.landmarker.detectForVideo(video, now, (result) => {
            const frame = { source: video, width: video.videoWidth, height: video.videoHeight, mirrored: true };
            report(renderer.render(frame, result, now, tracker.cutout));
          });
          errors = 0;
        } catch {
          errors += 1;
          if (errors > MAX_FRAME_ERRORS) {
            fail(runRef.current, new MirrorError('model'));
            return;
          }
        }
      }
      handle = video.requestVideoFrameCallback(step);
    };
    handle = video.requestVideoFrameCallback(step);
    return () => {
      active = false;
      video.cancelVideoFrameCallback(handle);
    };
  }, [phase, source, report, fail]);

  useEffect(() => {
    const image = photoRef.current;
    const tracker = trackerRef.current;
    const renderer = rendererRef.current;
    if (phase !== 'live' || source !== 'photo' || !image || !tracker || !renderer) {
      return;
    }
    const startedAt = performance.now();
    let handle = 0;
    const step = () => {
      const now = performance.now();
      tracker.landmarker.detect(image, (result) => {
        const frame = { source: image, width: image.width, height: image.height, mirrored: false };
        report(renderer.render(frame, result, now, tracker.cutout));
      });
      if (now - startedAt < PHOTO_ANIMATION_MS) {
        handle = requestAnimationFrame(step);
      }
    };
    step();
    return () => cancelAnimationFrame(handle);
  }, [phase, source, garmentVersion, report]);

  const moveSelection = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!products || !selected || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) {
      return;
    }
    event.preventDefault();
    const index = products.indexOf(selected);
    const next = products[(index + (event.key === 'ArrowRight' ? 1 : products.length - 1)) % products.length];
    mirror.select(next.id);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-id="${next.id}"]`)?.focus();
  };

  const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      mirror.close();
    }
  };

  const live = phase === 'live';
  const otherSource = source === 'camera' ? choosePhoto : startCamera;

  return (
    <motion.section
      ref={panelRef}
      className={styles.panel}
      data-expanded={expanded || undefined}
      aria-label={es.mirror.region}
      tabIndex={-1}
      onKeyDown={closeOnEscape}
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.97 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.stage} data-source={source}>
        <video ref={videoRef} className={styles.video} muted playsInline aria-hidden="true" />
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          data-visible={live || undefined}
          role="img"
          aria-label={selected ? es.mirror.wearing(selected.name) : es.mirror.region}
        />

        <div className={styles.topBar}>
          {live ? (
            <span className={styles.badge}>
              <span className={styles.badgeDot} data-source={source} aria-hidden="true" />
              {source === 'camera' ? es.mirror.live : es.mirror.photo}
            </span>
          ) : (
            <span className={styles.badge}>{es.mirror.region}</span>
          )}
          <div className={styles.tools}>
            <button
              type="button"
              className={styles.tool}
              onClick={() => setExpanded((current) => !current)}
              aria-label={expanded ? es.mirror.collapse : es.mirror.expand}
            >
              <Icon name={expanded ? 'collapse' : 'expand'} />
            </button>
            <button type="button" className={styles.tool} onClick={mirror.close} aria-label={es.mirror.close}>
              <Icon name="close" />
            </button>
          </div>
        </div>

        {phase === 'intro' && (
          <div className={styles.card}>
            <span className={styles.cardIcon} aria-hidden="true">
              <Icon name="camera" />
            </span>
            <h2 className={styles.cardTitle}>{es.mirror.introTitle}</h2>
            <p className={styles.cardText}>{es.mirror.introBody}</p>
            <Button variant="accent" block onClick={() => void startCamera()} icon={<Icon name="camera" />}>
              {es.mirror.start}
            </Button>
            <button type="button" className={styles.link} onClick={choosePhoto}>
              {es.mirror.usePhoto}
            </button>
            <p className={styles.privacy}>
              <Icon name="shield" />
              {es.mirror.privacy}
            </p>
          </div>
        )}

        {phase === 'starting' && (
          <p className={styles.loading} role="status">
            <span className={styles.scan} aria-hidden="true" />
            {loadingLabel}
          </p>
        )}

        {phase === 'error' && (
          <div className={styles.card} role="alert">
            <span className={styles.cardIcon} data-tone="danger" aria-hidden="true">
              <Icon name="alert" />
            </span>
            <p className={styles.cardText}>{es.mirror.errors[errorKind]}</p>
            <Button
              variant="accent"
              block
              onClick={() => (source === 'camera' ? void startCamera() : choosePhoto())}
            >
              {es.mirror.retry}
            </Button>
            <button type="button" className={styles.link} onClick={() => void otherSource()}>
              {source === 'camera' ? es.mirror.usePhoto : es.mirror.useCamera}
            </button>
          </div>
        )}

        {live && body === 'searching' && (
          <p className={styles.hint} role="status">
            {source === 'camera' ? es.mirror.searching : es.mirror.noBodyInPhoto}
          </p>
        )}
      </div>

      <div className={styles.dock}>
        {selected && (
          <div className={styles.current}>
            <div className={styles.currentText}>
              <p className={styles.currentName}>{selected.name}</p>
              <p className={styles.currentPrice}>{formatCop(selected.basePrice)}</p>
            </div>
            <a className={styles.view} href={hrefFor({ name: 'product', id: selected.id })}>
              {es.mirror.viewProduct}
              <Icon name="arrow-up-right" />
            </a>
          </div>
        )}

        {products && products.length === 0 ? (
          <p className={styles.empty}>{es.mirror.noGarments}</p>
        ) : (
          <div className={styles.strip} role="group" aria-label={es.mirror.garments} onKeyDown={moveSelection}>
            {(products ?? []).map((product) => (
              <button
                key={product.id}
                type="button"
                data-id={product.id}
                className={styles.thumb}
                aria-pressed={product.id === selected?.id}
                aria-label={product.name}
                title={product.name}
                onClick={() => mirror.select(product.id)}
              >
                <img src={assetUrl(product.thumbnailUrl) ?? undefined} alt="" draggable={false} />
              </button>
            ))}
          </div>
        )}

        {live && (
          <button type="button" className={styles.switch} onClick={() => void otherSource()}>
            <Icon name={source === 'camera' ? 'image' : 'camera'} />
            {source === 'camera' ? es.mirror.usePhoto : es.mirror.useCamera}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={PHOTO_TYPES.join(',')}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void openPhoto(event)}
      />
    </motion.section>
  );
}
