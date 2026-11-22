export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_PAGES = 150;

const local = path => new URL('../vendor/pdfjs/' + path, import.meta.url).href;
let engine;
function pdfEngine() {
  engine ??= import('../vendor/pdfjs/pdf.min.mjs').then(api => {
    api.GlobalWorkerOptions.workerSrc = local('pdf.worker.min.mjs');
    return api;
  }).catch(error => {
    engine = undefined;
    throw error;
  });
  return engine;
}

export async function validatePdf(file) {
  if (file.size > MAX_PDF_BYTES) throw new Error('File melebihi batas 50 MB. Kompres atau pisahkan PDF, lalu coba lagi.');
  const prefix = await file.slice(0, 1024).text();
  if (!prefix.includes('%PDF-')) throw new Error('Pilih file PDF yang valid.');
}

export async function openPdf(source, signal) {
  signal?.throwIfAborted();
  const { getDocument } = await pdfEngine();
  const input = typeof source === 'string' ? { url: source } : { data: new Uint8Array(await source.arrayBuffer()) };
  signal?.throwIfAborted();

  const task = getDocument({
    ...input,
    cMapUrl: local('cmaps/'),
    standardFontDataUrl: local('standard_fonts/'),
    iccUrl: local('iccs/'),
    wasmUrl: local('wasm/'),
    enableXfa: false,
    stopAtErrors: true,
    canvasMaxAreaInBytes: 64 * 1024 * 1024,
  });
  let destruction;
  const destroy = () => destruction ??= task.destroy().catch(() => {});
  let cancelLoad;
  const cancellation = new Promise((_, reject) => {
    cancelLoad = () => {
      reject(signal.reason);
      void destroy();
    };
  });
  signal?.addEventListener('abort', cancelLoad, { once: true });
  let doc;
  try {
    doc = await Promise.race([task.promise, cancellation]);
  } catch (error) {
    await destroy();
    if (signal?.aborted) throw signal.reason;
    const messages = {
      PasswordException: 'PDF terkunci. Buka kuncinya di aplikasi PDF, lalu impor salinannya.',
      InvalidPDFException: 'PDF rusak atau formatnya tidak dapat dibaca.',
      ResponseException: 'File PDF gagal dimuat. Periksa koneksi dan coba lagi.',
    };
    throw new Error(messages[error.name] || 'PDF gagal dibuka. Periksa file atau gunakan browser terbaru.', { cause: error });
  } finally {
    signal?.removeEventListener('abort', cancelLoad);
  }
  if (signal?.aborted || doc.numPages < 1 || doc.numPages > MAX_PDF_PAGES) {
    await destroy();
    signal?.throwIfAborted();
    throw new Error('Gunakan PDF dengan 1 hingga 150 halaman.');
  }
  return { doc, destroy };
}

export async function renderPdfPage(doc, number, maxSide, signal) {
  signal?.throwIfAborted();
  const page = await doc.getPage(number);
  signal?.throwIfAborted();
  const size = page.getViewport({ scale: 1 });
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
    throw new Error('Ukuran halaman PDF tidak valid.');
  }
  const viewport = page.getViewport({ scale: maxSide / Math.max(size.width, size.height) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const render = page.render({ canvas, viewport, background: '#ffffff' });
  const cancel = () => render.cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    await render.promise;
    signal?.throwIfAborted();
    return canvas;
  } catch (error) {
    canvas.width = canvas.height = 0;
    signal?.throwIfAborted();
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    page.cleanup();
  }
}

export function canvasBlob(canvas, quality = .85) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Pratinjau halaman gagal dibentuk.'));
    }, 'image/webp', quality);
  });
}

export async function pdfText(doc, number, signal) {
  signal?.throwIfAborted();
  const page = await doc.getPage(number);
  try {
    signal?.throwIfAborted();
    const { items } = await page.getTextContent();
    signal?.throwIfAborted();
    return items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
  } finally {
    page.cleanup();
  }
}
