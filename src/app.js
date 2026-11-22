import { icon, insertIcons } from './icons.js';
import {
  addPublication, DEFAULT_THEME, demoPublications, getPdfSource, listPublications,
  removePublication, THEMES, updatePublication,
} from './publications.js';
import { canvasBlob, openPdf, renderPdfPage, validatePdf } from './pdf.js';
import { $, download, element, matchText, safeFilename, setBusy, status } from './ui.js';
import { Reader } from './reader.js';
import { createEmbed, createStandalone } from './export.js';

insertIcons();

const libraryGrid = $('#publication-grid');
const search = $('#library-search');
const sort = $('#library-sort');
const empty = $('#library-empty');
const importDialog = $('#import-dialog');
const importDrop = $('#import-drop');
const importStatus = $('#import-status');
const fileInput = $('#file-input');
const settingsDialog = $('#settings-dialog');
const settingsForm = $('#settings-form');
const settingsStatus = $('#settings-status');
const actionsDialog = $('#actions-dialog');
const removeDialog = $('#remove-dialog');
const shareDialog = $('#share-dialog');
const exportButton = $('#export-html');
const exportProgress = $('#export-progress');
const exportStatus = $('#export-status');
const cancelExport = $('#cancel-export');
const embedInput = $('#embed-url');
const embedCode = $('#embed-code');
const embedResult = $('#embed-result');
const embedStatus = $('#embed-status');

let publications = demoPublications();
let filter = 'all';
let importing;
let exporting;
let settingsRecord;
let actionRecord;
let deleteRecord;
let toastTimer;
let studioScroll = 0;
const coverUrls = new Map();

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4600);
}

function storageMessage(error, fallback) {
  if (error.name === 'QuotaExceededError') return 'Ruang penyimpanan browser hampir penuh. Hapus publikasi yang sudah dicadangkan atau gunakan profil browser lain.';
  return fallback;
}

const reader = new Reader({
  settings: openSettings,
  share: openShare,
  page(id, page) {
    updateInMemory(id, { page });
    void updatePublication(id, { page }).catch(() => {});
  },
  closed(id, trigger) {
    window.scrollTo(0, studioScroll);
    const selector = '[data-publication="' + CSS.escape(id) + '"] .publication-open';
    const focus = trigger?.isConnected ? trigger : $(selector) || $('[data-import]');
    focus?.focus({ preventScroll: true });
  },
  notify,
});

function readRecord(record, trigger) {
  studioScroll = window.scrollY;
  void reader.open(record, trigger);
}

function updateInMemory(id, patch) {
  publications = publications.map(record => record.id === id ? { ...record, ...patch } : record);
}

function coverFor(record) {
  if (record.coverUrl) return record.coverUrl;
  if (!record.cover) return '';
  const previous = coverUrls.get(record.id);
  if (previous?.blob === record.cover) return previous.url;
  if (previous) URL.revokeObjectURL(previous.url);
  const url = URL.createObjectURL(record.cover);
  coverUrls.set(record.id, { blob: record.cover, url });
  return url;
}

function card(record) {
  const article = element('article', 'publication-card');
  article.dataset.publication = record.id;
  const open = element('button', 'publication-open');
  open.type = 'button';
  const cover = element('span', 'cover-stage');
  if (record.visual) cover.classList.add(record.visual);
  const src = coverFor(record);
  if (src) {
    const image = element('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = '';
    image.src = src;
    cover.append(image);
  } else {
    const placeholder = element('span', 'cover-placeholder');
    placeholder.innerHTML = icon('file');
    cover.append(placeholder);
  }
  const details = element('span', 'card-details');
  const title = element('span', 'card-title', record.title);
  title.title = record.title;
  details.append(title, element('span', 'card-meta', record.pages + ' halaman · ' + (record.demo ? 'Contoh' : 'Lokal')));
  open.append(cover, details);
  open.addEventListener('click', () => readRecord(currentRecord(record.id) || record, open));

  const action = element('button', 'icon-button card-actions');
  action.type = 'button';
  action.setAttribute('aria-label', 'Tindakan untuk ' + record.title);
  action.title = 'Tindakan publikasi';
  action.innerHTML = icon('more');
  action.addEventListener('click', () => openActions(currentRecord(record.id) || record));
  article.append(open, action);
  return article;
}

function uploadTile() {
  const button = element('button', 'upload-tile');
  button.type = 'button';
  const marker = element('span', 'drop-icon');
  marker.innerHTML = icon('upload');
  button.append(marker, element('strong', '', 'Publikasi baru'), element('small', '', 'Klik atau seret PDF ke sini'));
  button.addEventListener('click', openImport);
  connectDrop(button, files => {
    openImport();
    void importFiles(files);
  });
  return button;
}

function currentRecord(id) {
  return publications.find(record => record.id === id);
}

function renderLibrary() {
  const query = search.value.normalize('NFKC').trim().toLocaleLowerCase('id');
  const visible = publications.filter(record =>
    (filter === 'all' || (filter === 'demo' ? record.demo : !record.demo)) && matchText(record.title, query));
  const orders = {
    recent: (a, b) => b.date - a.date,
    title: (a, b) => a.title.localeCompare(b.title, 'id'),
    pages: (a, b) => b.pages - a.pages || a.title.localeCompare(b.title, 'id'),
  };
  visible.sort(orders[sort.value] || orders.recent);
  const entries = visible.map(card);
  if (filter !== 'demo' && !query) entries.push(uploadTile());
  libraryGrid.replaceChildren(...entries);
  $('#publication-count').textContent = visible.length + (filter === 'demo' ? ' publikasi contoh' : ' publikasi');
  empty.hidden = visible.length > 0 || (filter === 'own' && !query);
  if (!empty.hidden) empty.textContent = query ? 'Tidak ada publikasi yang cocok. Coba kata kunci lain.' : 'Belum ada publikasi.';
  for (const button of document.querySelectorAll('[data-filter]')) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  }
  for (const button of document.querySelectorAll('[data-nav]')) {
    if (button.dataset.nav === filter || (button.dataset.nav === 'all' && filter === 'own')) {
      button.setAttribute('aria-current', 'page');
    } else button.removeAttribute('aria-current');
  }
}

function currentFilter(next, jump = false) {
  filter = next;
  renderLibrary();
  if (jump) {
    $('#publications').focus({ preventScroll: true });
    $('#publications').scrollIntoView({ block: 'start' });
  }
}

function titleOf(file) {
  return file.name.replace(/\.pdf$/i, '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100) || 'Publikasi baru';
}

function openImport() {
  if (importDialog.open) return;
  status(importStatus);
  importDialog.showModal();
  importDrop.focus();
}

function connectDrop(target, onFiles) {
  target.addEventListener('dragover', event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    target.classList.add('is-dragover');
  });
  target.addEventListener('dragleave', event => {
    if (!target.contains(event.relatedTarget)) target.classList.remove('is-dragover');
  });
  target.addEventListener('drop', event => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    target.classList.remove('is-dragover');
    onFiles(Array.from(event.dataTransfer.files));
  });
}

async function importFiles(files) {
  if (importing || !files.length) return;
  if (files.length !== 1) {
    status(importStatus, 'Pilih satu PDF dalam setiap impor.', true);
    return;
  }
  const file = files[0];
  const controller = new AbortController();
  const job = { controller, committing: false };
  importing = job;
  let pdf;
  const signal = controller.signal;
  setBusy(importDrop, true);
  status(importStatus, 'Memeriksa PDF…');
  try {
    await validatePdf(file);
    pdf = await openPdf(file, signal);
    status(importStatus, 'Membuat sampul…');
    const canvas = await renderPdfPage(pdf.doc, 1, 560, signal);
    const cover = await canvasBlob(canvas);
    canvas.width = canvas.height = 0;
    signal.throwIfAborted();
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const record = {
      id, title: titleOf(file), originalName: file.name, cover,
      pages: pdf.doc.numPages, theme: DEFAULT_THEME, animation: true,
      date: Date.now(), page: 1,
    };
    job.committing = true;
    status(importStatus, 'Menyimpan publikasi…');
    try {
      await addPublication(record, file);
    } catch (error) {
      throw new Error(storageMessage(error, 'Penyimpanan browser gagal. Muat ulang halaman lalu coba lagi.'), { cause: error });
    }
    await pdf.destroy();
    publications.push(record);
    search.value = '';
    currentFilter('all');
    importDialog.close();
    readRecord(record, $('[data-import]'));
  } catch (error) {
    if (!signal.aborted) status(importStatus, error.message || 'Impor gagal. Coba kembali.', true);
  } finally {
    if (pdf) await pdf.destroy();
    importing = undefined;
    setBusy(importDrop, false);
  }
}

function openSettings(record) {
  settingsRecord = record;
  $('#settings-name').value = record.title;
  $('#settings-theme').value = record.theme;
  $('#settings-animation').checked = record.animation;
  status(settingsStatus);
  settingsDialog.showModal();
  $('#settings-name').focus();
  $('#settings-name').select();
}

settingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = $('#settings-name').value.trim();
  if (!name) {
    status(settingsStatus, 'Masukkan judul publikasi.', true);
    return;
  }
  const theme = $('#settings-theme').value;
  const changed = { title: name, theme: THEMES.includes(theme) ? theme : DEFAULT_THEME, animation: $('#settings-animation').checked, date: Date.now() };
  const submit = $('button[type="submit"]', settingsForm);
  const record = settingsRecord;
  setBusy(submit, true);
  status(settingsStatus);
  try {
    const updated = await updatePublication(record.id, changed);
    if (!updated) throw new Error('Publikasi sudah dihapus. Muat ulang ruang kerja.');
    updateInMemory(record.id, changed);
    reader.applyRecord(updated);
    if (settingsRecord === record) settingsDialog.close();
    renderLibrary();
    if (!reader.view) $('.card-actions', $('[data-publication="' + CSS.escape(record.id) + '"]') || document)?.focus({ preventScroll: true });
    notify('Pengaturan tersimpan.');
  } catch (error) {
    status(settingsStatus, storageMessage(error, error.message || 'Pengaturan gagal disimpan.'), true);
  } finally {
    setBusy(submit, false);
  }
});

function openActions(record) {
  actionRecord = record;
  $('#actions-title').textContent = record.title;
  $('#action-remove').hidden = Boolean(record.demo);
  status($('#actions-status'));
  actionsDialog.showModal();
  $('#action-read').focus();
}

$('#action-read').addEventListener('click', () => {
  actionsDialog.close();
  readRecord(actionRecord, $('[data-publication="' + CSS.escape(actionRecord.id) + '"] .publication-open'));
});
$('#action-edit').addEventListener('click', () => {
  actionsDialog.close();
  openSettings(actionRecord);
});
$('#action-pdf').addEventListener('click', async event => {
  const button = event.currentTarget;
  const record = actionRecord;
  setBusy(button, true);
  status($('#actions-status'));
  try {
    const source = await getPdfSource(record);
    let blob = source;
    if (typeof source === 'string') {
      const response = await fetch(source);
      if (!response.ok) throw new Error('PDF sumber gagal diunduh. Coba lagi.');
      blob = await response.blob();
    }
    download(blob, record.originalName);
    if (actionRecord === record) status($('#actions-status'), 'PDF siap diunduh.');
  } catch (error) {
    if (actionRecord === record) status($('#actions-status'), error.message, true);
  } finally {
    setBusy(button, false);
  }
});
$('#action-remove').addEventListener('click', () => {
  if (actionRecord.demo) return;
  deleteRecord = actionRecord;
  actionsDialog.close();
  $('#remove-description').textContent = '“' + deleteRecord.title + '” akan dihapus dari ruang kerja di browser ini.';
  status($('#remove-status'));
  removeDialog.showModal();
  $('.dialog-footer [data-close]', removeDialog).focus();
});
$('#remove-confirm').addEventListener('click', async event => {
  const button = event.currentTarget;
  const record = deleteRecord;
  setBusy(button, true);
  try {
    await removePublication(record.id);
    publications = publications.filter(publication => publication.id !== record.id);
    const previous = coverUrls.get(record.id);
    if (previous) URL.revokeObjectURL(previous.url);
    coverUrls.delete(record.id);
    if (deleteRecord === record) removeDialog.close();
    renderLibrary();
    $('[data-import]').focus();
    notify('Publikasi dihapus.');
  } catch {
    status($('#remove-status'), 'Publikasi gagal dihapus. Coba lagi.', true);
  } finally {
    setBusy(button, false);
  }
});

function openShare() {
  status(exportStatus);
  status(embedStatus);
  embedInput.value = '';
  embedCode.value = '';
  embedResult.hidden = true;
  shareDialog.showModal();
  exportButton.focus();
}

async function exportHtml() {
  const view = reader.view;
  if (!view?.pdf || exporting) return;
  const controller = new AbortController();
  exporting = controller;
  const { signal } = controller;
  const filename = safeFilename(view.record.title) + '.html';
  setBusy(exportButton, true);
  cancelExport.hidden = false;
  exportProgress.hidden = false;
  exportProgress.max = view.pdf.doc.numPages;
  exportProgress.value = 0;
  status(exportStatus, 'Menyiapkan ekspor…');
  try {
    const html = await createStandalone(view.pdf.doc, view.record, {
      signal,
      onProgress(done, total) {
        exportProgress.value = done;
        status(exportStatus, 'Dirender ' + done + ' dari ' + total + ' halaman.');
      },
    });
    signal.throwIfAborted();
    download(html, filename);
    status(exportStatus, 'HTML siap diunduh sebagai ' + filename + '.');
  } catch (error) {
    status(exportStatus, signal.aborted ? 'Ekspor dibatalkan.' : error.message || 'Ekspor gagal. Coba lagi.', !signal.aborted);
  } finally {
    exporting = undefined;
    setBusy(exportButton, false);
    cancelExport.hidden = true;
    exportProgress.hidden = true;
  }
}

$('#embed-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    embedCode.value = createEmbed(embedInput.value.trim(), reader.view.record.title);
    embedResult.hidden = false;
    status(embedStatus);
  } catch (error) {
    embedResult.hidden = true;
    embedCode.value = '';
    status(embedStatus, error.message, true);
  }
});

embedInput.addEventListener('input', () => {
  embedResult.hidden = true;
  status(embedStatus);
});

$('#embed-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(embedCode.value);
    status(embedStatus, 'Kode sematan disalin.');
  } catch {
    embedCode.focus();
    embedCode.select();
    status(embedStatus, 'Kode sematan dipilih. Gunakan perintah Salin di perangkat Anda.');
  }
});

document.querySelectorAll('dialog [data-close]').forEach(button => {
  button.addEventListener('click', () => {
    const dialog = button.closest('dialog');
    if (dialog === importDialog && importing?.committing) return;
    if (dialog === importDialog) importing?.controller.abort();
    if (dialog === shareDialog) exporting?.abort();
    dialog.close();
  });
});
importDialog.addEventListener('cancel', event => {
  if (importing?.committing) event.preventDefault();
  else importing?.controller.abort();
});
shareDialog.addEventListener('cancel', () => exporting?.abort());
importDrop.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  fileInput.value = '';
  void importFiles(files);
});
connectDrop(importDrop, files => void importFiles(files));
document.addEventListener('dragover', event => {
  if (event.dataTransfer.types.includes('Files')) event.preventDefault();
});
document.addEventListener('drop', event => {
  if (event.dataTransfer.files.length) event.preventDefault();
});
document.querySelectorAll('[data-import]').forEach(button => button.addEventListener('click', openImport));
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => currentFilter(button.dataset.filter));
});
document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => {
  search.value = '';
  currentFilter(button.dataset.nav, true);
}));
for (const button of [$('#help-button'), $('#mobile-help')]) {
  button.addEventListener('click', () => $('#help-dialog').showModal());
}
$('#open-featured').addEventListener('click', event => {
  readRecord(currentRecord('demo-ruang-bentuk'), event.currentTarget);
});
search.addEventListener('input', renderLibrary);
sort.addEventListener('change', renderLibrary);
exportButton.addEventListener('click', () => void exportHtml());
cancelExport.addEventListener('click', () => exporting?.abort());

try {
  publications = await listPublications();
} catch {
  notify('Penyimpanan browser tidak tersedia. Anda masih bisa mencoba flipbook contoh.');
}
renderLibrary();
