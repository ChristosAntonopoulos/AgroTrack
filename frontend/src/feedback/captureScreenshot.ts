import html2canvas from 'html2canvas-pro';

const waitFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });

const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('screenshot-timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });

const shouldIgnore = (el: Element) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.id === 'webpack-dev-server-client-overlay') return true;
  if (el.hasAttribute('data-feedback-ignore') || el.closest('[data-feedback-ignore]')) return true;
  const tag = el.tagName;
  if (tag === 'CANVAS' || tag === 'VIDEO' || tag === 'IFRAME') return true;
  if (el === document.body || el === document.documentElement) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  return rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth;
};

const toFile = (canvas: HTMLCanvasElement) =>
  new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], `oleachron-screen-${Date.now()}.png`, { type: 'image/png' }))
          : reject(new Error('screenshot')),
      'image/png',
      0.88
    );
  });

/** Capture the visible app viewport as a PNG, skipping the feedback overlay. */
export async function captureAppScreenshot(): Promise<File> {
  await waitFrame();
  const target =
    (document.querySelector('.main-layout') as HTMLElement | null) ||
    (document.querySelector('#root') as HTMLElement | null) ||
    document.body;

  const canvas = await withTimeout<HTMLCanvasElement>(
    html2canvas(target, {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      backgroundColor: '#f4efe4',
      width: Math.min(target.clientWidth || window.innerWidth, window.innerWidth),
      height: Math.min(window.innerHeight, 900),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      ignoreElements: shouldIgnore,
    }),
    12000
  );

  if (!canvas.width || !canvas.height) {
    throw new Error('empty-canvas');
  }
  return toFile(canvas);
}
