import { icon } from './icons.js';
import { pdfText, renderPdfPage } from './pdf.js';

const MAX_EXPORT_CHARS = 120 * 1024 * 1024;
const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => escapes[character]);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

let playerAssets;
async function loadAsset(file) {
  const response = await fetch(new URL(file, import.meta.url));
  if (!response.ok) throw new Error('Komponen ekspor gagal dimuat. Coba muat ulang FlipStudio.');
  return response.text();
}

function exportButton(id, label, symbol, attributes = '') {
  return '<button type="button" id="' + id + '" title="' + label + '" aria-label="' + label + '" ' + attributes + '>' + icon(symbol) + '</button>';
}

function buildHeader(record, styles) {
  const title = escapeHtml(record.title);
  return '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'">' +
    '<title>' + title + ' · FlipStudio</title><style>' + styles + '</style></head>' +
    '<body class="reader-shell" data-theme="' + escapeHtml(record.theme) + '">' +
    '<header class="reader-header"><div class="reader-identity"><span class="reader-mark" title="FlipStudio">' + icon('brand') +
    '</span><div class="reader-heading"><h1>' + title + '</h1></div></div>' +
    '<div class="reader-controls" role="group" aria-label="Kontrol pembaca"><div class="tool-set">' +
    exportButton('search-toggle', 'Cari teks', 'search', 'class="icon-button reader-tool" aria-expanded="false" aria-controls="search-panel"') +
    exportButton('layout', 'Mode dua halaman', 'layout', 'class="icon-button reader-tool layout-button" aria-pressed="false"') +
    '</div><form id="page-form" class="page-control">' +
    exportButton('toolbar-prev', 'Halaman sebelumnya', 'chevron-left', 'class="icon-button toolbar-prev"') +
    '<div class="page-field"><label class="sr-only" for="page">Nomor halaman</label>' +
    '<input id="page" type="text" inputmode="numeric" autocomplete="off" maxlength="7" value="1" title="Masukkan nomor halaman">' +
    '<span aria-hidden="true">/</span><span id="total"></span></div>' +
    exportButton('toolbar-next', 'Halaman berikutnya', 'chevron-right', 'class="icon-button toolbar-next"') +
    '</form><div class="tool-set zoom-set">' +
    exportButton('smaller', 'Perkecil halaman', 'minus', 'class="icon-button"') +
    '<button type="button" id="fit" class="zoom-label" aria-label="Sesuaikan halaman ke layar" title="Sesuaikan halaman ke layar">100%</button>' +
    exportButton('larger', 'Perbesar halaman', 'plus', 'class="icon-button"') + '</div></div>' +
    '<div class="reader-actions">' + exportButton('fullscreen', 'Layar penuh', 'maximize', 'class="icon-button"') + '</div></header>' +
    '<main class="reader-body"><aside id="search-panel" class="reader-drawer" aria-labelledby="search-title" hidden>' +
    '<div class="drawer-header"><h2 id="search-title">Cari teks</h2>' + exportButton('search-close', 'Tutup panel', 'x', 'class="icon-button"') + '</div>' +
    '<div class="drawer-content"><form id="search-form" class="drawer-search"><label class="sr-only" for="query">Cari teks</label>' +
    '<input id="query" type="search" maxlength="120" minlength="2" placeholder="Kata atau frasa" required autocomplete="off">' +
    '<button id="search-submit" type="button" class="button primary">Cari</button></form>' +
    '<p id="search-status" class="status-line" role="status"></p><div id="results" class="search-results"></div>' +
    '<details class="page-text-details"><summary>Teks halaman aktif</summary><p id="transcript"></p></details></div></aside>' +
    '<div class="read-area"><div class="read-stage" id="stage" tabindex="0" aria-label="Area baca"><div class="paper-frame" id="paper" aria-busy="true"></div>' +
    '<p id="read-status" class="read-message" role="status" hidden></p></div>' +
    exportButton('prev', 'Halaman sebelumnya', 'chevron-left', 'class="page-arrow page-prev"') +
    exportButton('next', 'Halaman berikutnya', 'chevron-right', 'class="page-arrow page-next"') +
    '</div></main><span class="sr-only" role="status" id="announcement"></span>';
}

export async function createStandalone(doc, record, { signal, onProgress }) {
  playerAssets ??= Promise.all([
    loadAsset('./player.css'), loadAsset('../assets/reader.css'), loadAsset('./book.js'), loadAsset('./player.js'),
  ]).catch(error => {
    playerAssets = undefined;
    throw error;
  });
  const [chrome, bookStyles, book, player] = await playerAssets;
  // Embed the shared reader inline so an exported flipbook can open without network requests.
  const script = book.replace(/^export (?=(?:const|function|class) )/gm, '') + '\n' + player;
  signal.throwIfAborted();
  const parts = [
    buildHeader(record, chrome + '\n' + bookStyles),
    '<script id="flipstudio-data" type="application/json">',
    '{"animation":' + json(record.animation) + ',"pages":[',
  ];
  let length = parts.reduce((size, part) => size + part.length, 0);
  for (let number = 1; number <= doc.numPages; number += 1) {
    signal.throwIfAborted();
    const canvas = await renderPdfPage(doc, number, 1800, signal);
    const page = {
      width: canvas.width,
      height: canvas.height,
      src: canvas.toDataURL('image/webp', .86),
      text: '',
    };
    canvas.width = canvas.height = 0;
    try {
      page.text = await pdfText(doc, number, signal);
    } catch {
      signal.throwIfAborted();
    }
    const entry = (number === 1 ? '' : ',') + json(page);
    length += entry.length;
    if (length > MAX_EXPORT_CHARS) throw new Error('Ekspor terlalu besar. Pisahkan PDF menjadi beberapa volume, lalu ekspor ulang.');
    parts.push(entry);
    onProgress(number, doc.numPages);
    // Give the progress indicator and cancel button time to update.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  signal.throwIfAborted();
  parts.push(']}</script><script>', script, '</script></body></html>');
  return new Blob(parts, { type: 'text/html;charset=utf-8' });
}

export function createEmbed(url, title) {
  let target;
  try {
    target = new URL(url);
  } catch {
    throw new Error('Masukkan URL publik yang lengkap.');
  }
  if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) {
    throw new Error('Gunakan URL HTTP atau HTTPS tanpa informasi login.');
  }
  return '<iframe src="' + escapeHtml(target.href) + '" title="' + escapeHtml(title) +
    '" width="100%" height="640" style="border:0" loading="lazy" sandbox="allow-scripts" allowfullscreen></iframe>';
}
