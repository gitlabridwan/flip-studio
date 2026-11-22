(() => {
  'use strict';
  const id = name => document.getElementById(name);
  const { pages, animation } = JSON.parse(id('flipstudio-data').textContent);
  const stage = id('stage');
  const paper = id('paper');
  const number = id('page');
  const previous = [id('prev'), id('toolbar-prev')];
  const next = [id('next'), id('toolbar-next')];
  const toggle = id('search-toggle');
  const search = id('search-panel');
  const layout = id('layout');
  const narrow = matchMedia(SINGLE_PAGE_QUERY);
  const clamp = (number, lower, upper) => Math.max(lower, Math.min(upper, number));
  const book = new BookView(stage, paper, turn);
  let active = 1;
  let singlePage = false;
  let visiblePages = [];
  let revision = 0;

  function getSpread() {
    return spreadFor(active, pages.length, narrow.matches || singlePage);
  }

  function updateControls(spread) {
    number.value = spreadLabel(spread);
    for (const button of previous) button.disabled = spread[0] === 1;
    for (const button of next) button.disabled = spread.at(-1) === pages.length;
    layout.disabled = narrow.matches;
    layout.setAttribute('aria-pressed', String(!singlePage && !narrow.matches));
    id('smaller').disabled = book.zoom === ZOOM_LEVELS[0];
    id('larger').disabled = book.zoom === ZOOM_LEVELS.at(-1);
    id('fit').textContent = Math.round(book.zoom * 100) + '%';
    id('transcript').textContent = pages[active - 1].text || 'Halaman ini tidak memiliki teks yang dapat diekstrak.';
    for (const result of id('results').querySelectorAll('button')) {
      if (Number(result.dataset.page) === active) result.setAttribute('aria-current', 'page');
      else result.removeAttribute('aria-current');
    }
  }

  function turn(step) {
    void show(stepFrom(getSpread(), step, pages.length));
  }

  async function loadLeaf(number) {
    const { width, height, src } = pages[number - 1];
    const image = new Image(width, height);
    image.alt = 'Halaman ' + number + ' dari ' + pages.length;
    image.draggable = false;
    image.src = src;
    await image.decode();
    return { paper: image, width, height };
  }

  async function show(target, animate = true) {
    active = clamp(target, 1, pages.length);
    const current = ++revision;
    const spread = getSpread();
    updateControls(spread);
    const feedback = id('read-status');
    feedback.hidden = true;
    if (visiblePages.join(',') === spread.join(',')) {
      paper.setAttribute('aria-busy', 'false');
      return;
    }
    if (!visiblePages.length) {
      feedback.textContent = 'Memuat halaman…';
      feedback.hidden = false;
    }
    paper.setAttribute('aria-busy', 'true');
    try {
      const leaves = await Promise.all(spread.map(loadLeaf));
      if (current !== revision) return;
      const direction = animation && animate && visiblePages.length ? Math.sign(spread[0] - visiblePages[0]) : 0;
      book.show(leaves, direction);
      visiblePages = spread;
      feedback.hidden = true;
      id('announcement').textContent = 'Halaman ' + spreadLabel(spread) + ' dari ' + pages.length;
    } catch {
      if (current !== revision) return;
      feedback.textContent = 'Halaman ' + spreadLabel(spread) + ' gagal dimuat.';
      feedback.hidden = false;
    } finally {
      if (current === revision) paper.setAttribute('aria-busy', 'false');
    }
  }

  function setSearch(open) {
    search.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    book.fit();
    (open ? id('query') : toggle).focus();
  }

  function moveZoom(step) {
    const index = clamp(ZOOM_LEVELS.indexOf(book.zoom) + step, 0, ZOOM_LEVELS.length - 1);
    book.setZoom(ZOOM_LEVELS[index]);
    updateControls(getSpread());
  }

  function runSearch() {
    const query = id('query').value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id');
    const results = id('results');
    results.replaceChildren();
    if (query.length < 2) {
      id('search-status').textContent = 'Masukkan setidaknya dua karakter.';
      return;
    }
    for (const [index, page] of pages.entries()) {
      const text = page.text.normalize('NFKC');
      const found = text.toLocaleLowerCase('id').indexOf(query);
      if (found < 0) continue;
      const target = index + 1;
      const item = document.createElement('button');
      const heading = document.createElement('strong');
      const snippet = document.createElement('span');
      heading.textContent = 'Halaman ' + target;
      const start = Math.max(0, found - 32);
      const end = Math.min(text.length, found + query.length + 47);
      snippet.textContent = (start ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
      item.type = 'button';
      item.className = 'result-button';
      item.dataset.page = target;
      if (target === active) item.setAttribute('aria-current', 'page');
      item.append(heading, snippet);
      item.addEventListener('click', () => {
        void show(target);
        if (narrow.matches) setSearch(false);
      });
      results.append(item);
    }
    const count = results.childElementCount;
    id('search-status').textContent = count ? count + ' halaman cocok.' : 'Tidak ada teks yang cocok.';
  }

  for (const button of previous) button.addEventListener('click', () => turn(-1));
  for (const button of next) button.addEventListener('click', () => turn(1));
  bindPageEntry(id('page-form'), number, target => void show(target), () => spreadLabel(getSpread()));
  narrow.addEventListener('change', () => void show(active, false));
  layout.addEventListener('click', () => {
    singlePage = !singlePage;
    void show(active, false);
  });
  id('smaller').addEventListener('click', () => moveZoom(-1));
  id('larger').addEventListener('click', () => moveZoom(1));
  id('fit').addEventListener('click', () => {
    book.setZoom(1);
    updateControls(getSpread());
  });
  const fullscreen = id('fullscreen');
  fullscreen.disabled = !document.fullscreenEnabled;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      id('announcement').textContent = 'Layar penuh gagal diaktifkan.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? 'Keluar dari layar penuh' : 'Layar penuh';
    fullscreen.title = label;
    fullscreen.setAttribute('aria-label', label);
  });
  toggle.addEventListener('click', () => setSearch(search.hidden));
  id('search-close').addEventListener('click', () => setSearch(false));
  id('search-submit').addEventListener('click', runSearch);
  id('search-form').addEventListener('submit', event => {
    event.preventDefault();
    runSearch();
  });
  id('query').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    runSearch();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !search.hidden) setSearch(false);
    if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey || event.target.matches?.('input, select, textarea')) return;
    const actions = {
      ArrowLeft: () => turn(-1),
      ArrowRight: () => turn(1),
      Home: () => void show(1),
      End: () => void show(pages.length),
    };
    if (Object.hasOwn(actions, event.key)) {
      event.preventDefault();
      actions[event.key]();
    }
  });
  const incoming = Number(location.hash.match(/^#page=(\d+)$/)?.[1] || 1);
  id('total').textContent = pages.length;
  number.setAttribute('aria-label', 'Nomor halaman dari ' + pages.length);
  void show(incoming, false);
})();
