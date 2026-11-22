import { bindPageEntry, BookView, SINGLE_PAGE_QUERY, spreadFor, spreadLabel, stepFrom, ZOOM_LEVELS } from './book.js';
import { icon } from './icons.js';
import { canvasBlob, openPdf, pdfText, renderPdfPage } from './pdf.js';
import { getPdfSource, THEMES } from './publications.js';
import { $, element, matchText, status } from './ui.js';

const MAX_CACHED_PAGES = 6;
const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

export class Reader {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.root = $('#reader');
    this.stage = $('#read-stage');
    this.paper = $('#paper-frame');
    this.drawer = $('#reader-drawer');
    this.drawerContent = $('#drawer-content');
    this.message = $('#read-message');
    this.number = $('#page-number');
    this.pagesTool = $('#tool-pages');
    this.searchTool = $('#tool-search');
    this.layoutTool = $('#tool-layout');
    this.zoomOut = $('#zoom-out');
    this.zoomIn = $('#zoom-in');
    this.zoomLabel = $('#zoom-reset');
    this.fullscreen = $('#tool-fullscreen');
    this.settings = $('#reader-settings');
    this.share = $('#reader-share');
    this.prev = [$('#page-prev'), $('.toolbar-prev')];
    this.next = [$('#page-next'), $('.toolbar-next')];
    this.view = null;
    this.mode = null;
    this.narrow = matchMedia(SINGLE_PAGE_QUERY);
    this.book = new BookView(this.stage, this.paper, step => void this.turn(step));

    $('#reader-back').addEventListener('click', () => this.close());
    this.settings.addEventListener('click', () => callbacks.settings(this.view.record));
    this.share.addEventListener('click', () => callbacks.share());
    [...this.prev, ...this.next].forEach(button => button.addEventListener('click', () => {
      const step = this.prev.includes(button) ? -1 : 1;
      void this.turn(step);
    }));
    bindPageEntry($('#page-form'), this.number, page => void this.showPage(page), () => {
      return spreadLabel(this.currentSpread());
    });
    this.layoutTool.addEventListener('click', () => {
      if (!this.view?.pdf) return;
      this.view.singlePage = !this.view.singlePage;
      void this.showPage(this.view.page, false);
    });
    this.narrow.addEventListener('change', () => {
      if (this.view?.pdf) void this.showPage(this.view.page, false);
    });
    this.zoomOut.addEventListener('click', () => this.zoomBy(-1));
    this.zoomIn.addEventListener('click', () => this.zoomBy(1));
    this.zoomLabel.addEventListener('click', () => this.setZoom(1));
    this.fullscreen.addEventListener('click', () => void this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.updateFullscreen());
    this.pagesTool.addEventListener('click', () => this.toggleDrawer('pages'));
    this.searchTool.addEventListener('click', () => this.toggleDrawer('search'));
    $('#drawer-close').addEventListener('click', () => this.closeDrawer(true));
    document.addEventListener('keydown', event => this.onKey(event));

  }

  async open(record, trigger) {
    if (this.view) return;
    const view = {
      record, trigger, controller: new AbortController(), pdf: null, page: 1, displayedPage: 0,
      zoom: 1, singlePage: false, visiblePages: [], cache: new Map(),
      texts: new Map(), thumbs: new Map(), thumbQueue: Promise.resolve(),
    };
    this.view = view;
    $('#studio').hidden = true;
    this.root.hidden = false;
    this.applyRecord(record);
    this.updateControls();
    this.setMessage('Membuka PDF…');
    this.paper.setAttribute('aria-busy', 'true');
    $('#reader-back').focus();
    try {
      const source = await getPdfSource(record);
      const pdf = await openPdf(source, view.controller.signal);
      if (this.view !== view) {
        await pdf.destroy();
        return;
      }
      view.pdf = pdf;
      view.record = { ...view.record, pages: pdf.doc.numPages };
      this.applyRecord(view.record);
      await this.showPage(record.page || 1, false);
    } catch (error) {
      if (this.view !== view) return;
      this.paper.setAttribute('aria-busy', 'false');
      this.setMessage(error.message, true);
    }
  }

  close() {
    const view = this.view;
    if (!view) return;
    this.closeDrawer();
    this.view = null;
    view.controller.abort();
    view.render?.controller.abort();
    this.book.clear();
    for (const { paper } of view.cache.values()) paper.width = paper.height = 0;
    for (const url of view.thumbs.values()) URL.revokeObjectURL(url);
    if (view.pdf) void view.pdf.destroy();
    if (document.fullscreenElement === this.root) void document.exitFullscreen().catch(() => {});
    this.root.hidden = true;
    $('#studio').hidden = false;
    this.callbacks.closed(view.record.id, view.trigger);
  }

  applyRecord(record) {
    if (this.view?.record.id !== record.id) return;
    this.view.record = record;
    $('#reader-title').textContent = record.title;
    this.root.dataset.theme = THEMES.includes(record.theme) ? record.theme : 'lilac';
  }

  setMessage(message, error = false) {
    status(this.message, message, error);
    this.message.hidden = !message;
  }

  currentSpread() {
    const view = this.view;
    if (!view?.pdf) return [1];
    return spreadFor(view.page, view.pdf.doc.numPages, this.narrow.matches || view.singlePage);
  }

  updateControls() {
    const view = this.view;
    const ready = Boolean(view?.pdf);
    const page = view?.page || 1;
    const pages = view?.pdf?.doc.numPages || 0;
    const spread = this.currentSpread();
    this.number.value = spreadLabel(spread);
    $('#page-total').textContent = pages || '–';
    this.number.setAttribute('aria-label', pages ? 'Nomor halaman dari ' + pages : 'Nomor halaman');
    for (const node of [this.number, this.pagesTool, this.searchTool, this.zoomLabel, this.settings, this.share]) {
      node.disabled = !ready;
    }
    this.layoutTool.disabled = !ready || this.narrow.matches;
    this.layoutTool.setAttribute('aria-pressed', String(ready && !view.singlePage && !this.narrow.matches));
    this.fullscreen.disabled = !ready || !document.fullscreenEnabled;
    for (const button of this.prev) button.disabled = !ready || spread[0] === 1;
    for (const button of this.next) button.disabled = !ready || spread.at(-1) === pages;
    this.zoomOut.disabled = !ready || view.zoom === ZOOM_LEVELS[0];
    this.zoomIn.disabled = !ready || view.zoom === ZOOM_LEVELS.at(-1);
    this.zoomLabel.textContent = Math.round((view?.zoom || 1) * 100) + '%';
    for (const thumb of this.drawerContent.querySelectorAll('[data-page]')) {
      if (Number(thumb.dataset.page) === page) thumb.setAttribute('aria-current', 'page');
      else thumb.removeAttribute('aria-current');
    }
  }

  async turn(step) {
    const view = this.view;
    if (!view?.pdf) return;
    await this.showPage(stepFrom(this.currentSpread(), step, view.pdf.doc.numPages));
  }

  async renderLeaf(view, number, signal) {
    const cached = view.cache.get(number);
    if (cached) {
      view.cache.delete(number);
      view.cache.set(number, cached);
      return cached;
    }
    const side = this.narrow.matches ? 1600 : 1900;
    const paper = await renderPdfPage(view.pdf.doc, number, side, signal);
    if (signal.aborted) {
      paper.width = paper.height = 0;
      signal.throwIfAborted();
    }
    paper.setAttribute('role', 'img');
    paper.setAttribute('aria-label', 'Halaman ' + number + ' dari ' + view.pdf.doc.numPages);
    const leaf = { number, paper, width: paper.width, height: paper.height };
    const previous = view.cache.get(number);
    if (previous) {
      paper.width = paper.height = 0;
      return previous;
    }
    view.cache.set(number, leaf);
    return leaf;
  }

  trimCache(view, keep) {
    for (const [number, { paper }] of view.cache) {
      if (view.cache.size <= MAX_CACHED_PAGES) break;
      if (keep.includes(number) || paper.isConnected) continue;
      view.cache.delete(number);
      paper.width = paper.height = 0;
    }
  }

  commitPage(view) {
    view.displayedPage = view.page;
    $('#reader-announcement').textContent = 'Halaman ' + spreadLabel(view.visiblePages) + ' dari ' + view.pdf.doc.numPages;
    this.callbacks.page(view.record.id, view.page);
    this.drawerContent.dispatchEvent(new Event('pagechange'));
  }

  async showPage(requested, animate = true) {
    const view = this.view;
    if (!view?.pdf) return;
    const page = clamp(requested, 1, view.pdf.doc.numPages);
    view.page = page;
    const desired = this.currentSpread();
    const key = desired.join(',');
    this.updateControls();
    if (view.render?.key === key) return;
    view.render?.controller.abort();
    view.render = null;
    if (view.visiblePages.join(',') === key) {
      this.paper.setAttribute('aria-busy', 'false');
      this.setMessage('');
      if (view.displayedPage !== page) this.commitPage(view);
      this.trimCache(view, view.visiblePages);
      return;
    }
    const controller = new AbortController();
    const rendering = { key, controller };
    view.render = rendering;
    this.paper.setAttribute('aria-busy', 'true');
    if (!view.displayedPage) this.setMessage('Memuat halaman…');
    try {
      const leaves = await Promise.all(desired.map(number => this.renderLeaf(view, number, controller.signal)));
      if (this.view !== view || controller.signal.aborted) return;
      const direction = animate && view.record.animation && view.visiblePages.length
        ? Math.sign(desired[0] - view.visiblePages[0]) : 0;
      this.book.show(leaves, direction);
      view.visiblePages = desired;
      this.setMessage('');
      this.commitPage(view);
    } catch (error) {
      if (this.view !== view || controller.signal.aborted) return;
      controller.abort();
      this.setMessage('Halaman ' + spreadLabel(desired) + ' gagal dimuat. Coba buka halaman lain.', true);
      console.warn('FlipStudio: render halaman gagal', error.name);
    } finally {
      if (this.view === view && view.render === rendering) {
        view.render = null;
        this.paper.setAttribute('aria-busy', 'false');
        this.trimCache(view, view.visiblePages);
      }
    }
  }

  zoomBy(step) {
    if (!this.view?.pdf) return;
    const index = ZOOM_LEVELS.indexOf(this.view.zoom);
    this.setZoom(ZOOM_LEVELS[clamp(index + step, 0, ZOOM_LEVELS.length - 1)]);
  }

  setZoom(value) {
    if (!this.view?.pdf) return;
    this.view.zoom = value;
    this.book.setZoom(value);
    this.updateControls();
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement === this.root) await document.exitFullscreen();
      else await this.root.requestFullscreen();
    } catch {
      this.callbacks.notify('Layar penuh tidak dapat diaktifkan di browser ini.');
    }
  }

  updateFullscreen() {
    const fullscreen = document.fullscreenElement === this.root;
    const label = fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh';
    this.fullscreen.innerHTML = icon(fullscreen ? 'minimize' : 'maximize');
    this.fullscreen.title = label;
    this.fullscreen.setAttribute('aria-label', label);
  }

  onKey(event) {
    if (!this.view || event.defaultPrevented || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape' && this.mode) {
      this.closeDrawer(true);
      return;
    }
    if (!this.view.pdf || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const actions = {
      ArrowLeft: () => this.turn(-1),
      ArrowRight: () => this.turn(1),
      Home: () => this.showPage(1),
      End: () => this.showPage(this.view.pdf.doc.numPages),
    };
    if (Object.hasOwn(actions, event.key)) {
      event.preventDefault();
      void actions[event.key]();
    }
  }

  closeDrawer(restoreFocus = false) {
    const previous = this.mode;
    this.mode = null;
    this.drawerAbort?.abort();
    this.observer?.disconnect();
    this.drawer.hidden = true;
    this.drawerContent.replaceChildren();
    this.pagesTool.setAttribute('aria-expanded', 'false');
    this.searchTool.setAttribute('aria-expanded', 'false');
    if (restoreFocus && previous) (previous === 'pages' ? this.pagesTool : this.searchTool).focus();
  }

  toggleDrawer(mode) {
    const view = this.view;
    if (!view?.pdf) return;
    if (this.mode === mode) {
      this.closeDrawer(true);
      return;
    }
    this.closeDrawer();
    this.mode = mode;
    this.drawerAbort = new AbortController();
    const signal = this.drawerAbort.signal;
    this.drawer.hidden = false;
    $('#drawer-title').textContent = mode === 'pages' ? 'Halaman' : 'Cari teks';
    (mode === 'pages' ? this.pagesTool : this.searchTool).setAttribute('aria-expanded', 'true');
    if (mode === 'pages') this.buildThumbnails(view, signal);
    else this.buildSearch(view, signal);
  }

  buildThumbnails(view, signal) {
    const grid = element('div', 'thumbs-grid');
    const load = frame => {
      const number = Number(frame.dataset.thumb);
      view.thumbQueue = view.thumbQueue.then(async () => {
        if (signal.aborted || !frame.isConnected) return;
        let url = view.thumbs.get(number);
        if (!url) {
          const canvas = await renderPdfPage(view.pdf.doc, number, 155, signal);
          const blob = await canvasBlob(canvas, .76);
          canvas.width = canvas.height = 0;
          if (signal.aborted) return;
          url = URL.createObjectURL(blob);
          view.thumbs.set(number, url);
        }
        const img = element('img');
        img.src = url;
        img.alt = '';
        frame.replaceChildren(img);
      }).catch(() => {});
    };
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(entries => {
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting) continue;
          this.observer?.unobserve(target);
          load(target);
        }
      }, { root: this.drawerContent, rootMargin: '85px' });
    }
    this.drawerContent.append(grid);
    for (let number = 1; number <= view.pdf.doc.numPages; number += 1) {
      const button = element('button', 'page-thumb');
      button.type = 'button';
      button.dataset.page = number;
      button.setAttribute('aria-label', 'Buka halaman ' + number);
      const frame = element('span', 'thumb-frame');
      frame.dataset.thumb = number;
      button.append(frame, element('span', '', String(number)));
      button.addEventListener('click', () => {
        void this.showPage(number);
        if (this.narrow.matches) this.closeDrawer(true);
      });
      grid.append(button);
      if (this.observer) this.observer.observe(frame);
      else load(frame);
    }
    this.updateControls();
    grid.querySelector('[aria-current]')?.focus({ preventScroll: false });
  }

  async getText(view, number, signal) {
    signal.throwIfAborted();
    const cached = view.texts.get(number);
    if (cached !== undefined) return cached;
    const extracted = await pdfText(view.pdf.doc, number, signal);
    view.texts.set(number, extracted);
    return extracted;
  }

  buildSearch(view, drawerSignal) {
    const form = element('form', 'drawer-search');
    const input = element('input');
    input.type = 'search';
    input.placeholder = 'Kata atau frasa';
    input.required = true;
    input.minLength = 2;
    input.maxLength = 120;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Kata atau frasa');
    const button = element('button', 'button primary', 'Cari');
    const output = element('div', 'search-results');
    const feedback = element('div', 'status-line');
    feedback.setAttribute('role', 'status');
    const textDetails = element('details', 'page-text-details');
    const summary = element('summary', '', 'Teks halaman aktif');
    const textOutput = element('p', 'status-line');
    textDetails.append(summary, textOutput);
    const refreshText = async () => {
      if (!textDetails.open) return;
      const page = view.displayedPage || view.page;
      textOutput.textContent = 'Memuat teks…';
      try {
        const extracted = await this.getText(view, page, drawerSignal);
        if (!drawerSignal.aborted && view.displayedPage === page) {
          textOutput.textContent = extracted || 'Halaman ini tidak memiliki teks yang dapat diekstrak.';
        }
      } catch {
        if (!drawerSignal.aborted) textOutput.textContent = 'Teks halaman gagal dibaca.';
      }
    };
    textDetails.addEventListener('toggle', () => void refreshText(), { signal: drawerSignal });
    this.drawerContent.addEventListener('pagechange', () => void refreshText(), { signal: drawerSignal });
    let search;
    form.append(input, button);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const query = input.value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id');
      if (query.length < 2) {
        status(feedback, 'Masukkan setidaknya dua karakter.', true);
        return;
      }
      search?.abort();
      search = new AbortController();
      const signal = AbortSignal.any([drawerSignal, search.signal]);
      output.replaceChildren();
      const total = view.pdf.doc.numPages;
      let matches = 0;
      let skipped = 0;
      status(feedback, 'Mencari teks…');
      try {
        for (let page = 1; page <= total; page += 1) {
          signal.throwIfAborted();
          let original;
          try {
            original = await this.getText(view, page, signal);
          } catch (error) {
            if (signal.aborted) return;
            skipped += 1;
            continue;
          }
          if (matchText(original, query)) {
            const normalized = original.normalize('NFKC');
            const index = normalized.toLocaleLowerCase('id').indexOf(query);
            const result = element('button', 'result-button');
            result.type = 'button';
            const start = Math.max(0, index - 42);
            const end = Math.min(normalized.length, index + query.length + 55);
            result.append(element('strong', '', 'Halaman ' + page),
              element('span', '', (start ? '…' : '') + normalized.slice(start, end) + (end < normalized.length ? '…' : '')));
            result.addEventListener('click', () => {
              void this.showPage(page);
              if (this.narrow.matches) this.closeDrawer(true);
            });
            output.append(result);
            matches += 1;
          }
          if (page % 5 === 0) status(feedback, 'Diperiksa ' + page + ' dari ' + total + ' halaman…');
        }
        if (signal.aborted) return;
        const result = matches ? matches + ' halaman cocok.' : 'Tidak ada teks yang cocok.';
        status(feedback, result + (skipped ? ' Teks gagal dibaca pada ' + skipped + ' halaman.' : ''), skipped === total);
      } catch (error) {
        if (!signal.aborted) status(feedback, 'Pencarian gagal. Coba kembali.', true);
      }
    });
    this.drawerContent.append(form, feedback, output, textDetails);
    input.focus();
  }
}
