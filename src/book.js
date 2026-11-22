export const SINGLE_PAGE_QUERY = '(max-width: 720px)';
export const ZOOM_LEVELS = [.75, 1, 1.25, 1.5, 1.75, 2];

export function spreadFor(page, total, singlePage = false) {
  if (singlePage || page === 1 || page === total) return [page];
  const left = page - page % 2;
  return left + 1 < total ? [left, left + 1] : [left];
}

export function stepFrom(spread, step, total) {
  return step < 0 ? Math.max(1, spread[0] - 1) : Math.min(total, spread.at(-1) + 1);
}

export function spreadLabel(spread) {
  return spread.join('–');
}

export function bindPageEntry(form, input, onPage, label) {
  const go = () => {
    const value = input.value.trim();
    if (/^\d+$/.test(value)) onPage(Number(value));
    input.value = label();
  };
  input.addEventListener('focus', () => input.select());
  input.addEventListener('change', go);
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    go();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    go();
  });
}

function makeLayer(className) {
  const layer = document.createElement('div');
  layer.className = className;
  return layer;
}

function copyPaper(source) {
  const copy = source.cloneNode(false);
  if (source instanceof HTMLCanvasElement) copy.getContext('2d').drawImage(source, 0, 0);
  return copy;
}

function relativeTo(box, origin) {
  return { x: box.left - origin.left, y: box.top - origin.top, width: box.width, height: box.height };
}

function position(layer, { x, y, width, height }) {
  Object.assign(layer.style, { left: x + 'px', top: y + 'px', width: width + 'px', height: height + 'px' });
}

export class BookView {
  constructor(stage, frame, onTurn) {
    this.stage = stage;
    this.frame = frame;
    this.onTurn = onTurn;
    this.pages = [];
    this.zoom = 1;
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');

    stage.addEventListener('pointerdown', event => this.pointerDown(event));
    stage.addEventListener('pointerup', event => this.pointerUp(event));
    for (const name of ['pointercancel', 'pointerleave']) {
      stage.addEventListener(name, () => { this.gesture = null; });
    }
    stage.addEventListener('click', event => this.clickPage(event));
    this.motion.addEventListener('change', () => this.stopTurn());
    if ('ResizeObserver' in window) new ResizeObserver(() => this.fit()).observe(stage);
    else window.addEventListener('resize', () => this.fit());
  }

  show(pages, direction = 0) {
    this.stopTurn();
    const canTurn = direction && this.zoom === 1 && !this.motion.matches && this.pages.length;
    const old = canTurn ? [...this.frame.querySelectorAll('.book-page')].map((leaf, index) => ({
      paper: this.pages[index].paper, box: leaf.getBoundingClientRect(),
    })) : [];
    const shelf = makeLayer('book-pages');
    const ratios = pages.map(({ width, height }) => width / height);
    this.ratio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    const leaves = pages.map(({ paper }, index) => {
      const leaf = makeLayer('book-page');
      if (pages.length === 2) leaf.dataset.side = index === 0 ? 'left' : 'right';
      leaf.style.width = (ratios[index] / this.ratio) * 100 + '%';
      leaf.append(paper);
      shelf.append(leaf);
      return leaf;
    });
    this.pages = pages;
    this.frame.replaceChildren(shelf);
    this.frame.classList.toggle('is-spread', pages.length === 2);
    this.stage.scrollTo(0, 0);
    this.fit();
    if (old.length && this.size) this.playTurn(old, leaves, direction);
  }

  clear() {
    this.stopTurn();
    this.frame.replaceChildren();
    this.frame.classList.remove('is-spread');
    this.frame.style.removeProperty('--book-width');
    this.frame.style.removeProperty('--book-height');
    this.stage.classList.remove('is-zoomed');
    this.pages = [];
    this.size = null;
    this.zoom = 1;
    this.gesture = null;
    this.ignoreClick = false;
  }

  setZoom(zoom) {
    this.zoom = zoom;
    this.stage.classList.toggle('is-zoomed', zoom > 1);
    this.fit();
  }

  fit() {
    if (!this.pages.length) return;
    const style = getComputedStyle(this.stage);
    const width = this.stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = this.stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (width <= 0 || height <= 0) return;
    const fittedHeight = Math.min(height, width / this.ratio) * this.zoom;
    const fittedWidth = fittedHeight * this.ratio;
    if (this.size?.width === fittedWidth && this.size?.height === fittedHeight) return;
    this.stopTurn();
    this.size = { width: fittedWidth, height: fittedHeight };
    this.frame.style.setProperty('--book-width', fittedWidth + 'px');
    this.frame.style.setProperty('--book-height', fittedHeight + 'px');
  }

  stopTurn() {
    this.finishTurn?.();
  }

  playTurn(old, leaves, direction) {
    const forward = direction > 0;
    const front = old[forward ? old.length - 1 : 0];
    const targetIndex = forward ? 0 : leaves.length - 1;
    const target = leaves[targetIndex];
    const origin = this.frame.getBoundingClientRect();
    const start = relativeTo(front.box, origin);
    const end = relativeTo(target.getBoundingClientRect(), origin);
    const hingeStart = start.x + (forward ? 0 : start.width);
    const hingeEnd = end.x + (forward ? end.width : 0);
    if (Math.min(start.width, start.height, end.width, end.height) < 1) return;

    const scene = makeLayer('book-turn-scene');
    const hinge = makeLayer('book-hinge');
    const sheet = makeLayer('book-turn-sheet');
    const outer = makeLayer('book-face front');
    const inner = makeLayer('book-face back');
    const frontShade = makeLayer('book-fold-shadow');
    const backShade = makeLayer('book-fold-shadow');
    scene.setAttribute('aria-hidden', 'true');
    scene.inert = true;
    hinge.dataset.direction = forward ? 'forward' : 'back';
    position(hinge, { ...start, x: hingeStart });
    outer.append(copyPaper(front.paper), frontShade);
    inner.append(copyPaper(this.pages[targetIndex].paper), backShade);
    sheet.append(outer, inner);
    hinge.append(sheet);
    const stationary = old.length === 2 ? makeLayer('book-previous') : null;
    if (stationary) {
      const previous = old[forward ? 0 : 1];
      position(stationary, relativeTo(previous.box, origin));
      stationary.append(copyPaper(previous.paper));
      scene.append(stationary);
    }
    scene.append(hinge);
    target.classList.add('is-turning');
    this.frame.append(scene);

    const timing = { duration: 440, easing: 'cubic-bezier(.38,.10,.30,1)', fill: 'both' };
    const angle = forward ? -180 : 180;
    const effects = [
      hinge.animate([
        { transform: 'translate(0, 0) scale(1)' },
        { transform: 'translate(' + (hingeEnd - hingeStart) + 'px, ' + (end.y - start.y) + 'px) scale(' +
          end.width / start.width + ', ' + end.height / start.height + ')' },
      ], timing),
      sheet.animate([
        { transform: 'rotateY(0deg) skewY(0deg)' },
        { transform: 'rotateY(' + angle * .5 + 'deg) skewY(' + (forward ? -2 : 2) + 'deg)', offset: .5 },
        { transform: 'rotateY(' + angle + 'deg) skewY(0deg)' },
      ], timing),
      frontShade.animate([{ opacity: .08 }, { opacity: .7, offset: .54 }, { opacity: .16 }], timing),
      backShade.animate([{ opacity: .25 }, { opacity: .61, offset: .51 }, { opacity: 0 }], timing),
    ];
    const revealedPage = leaves.length === 2 ? leaves[1 - targetIndex] : null;
    if (revealedPage && old.length === 1) {
      effects.push(revealedPage.animate([{ opacity: .04 }, { opacity: 1, offset: .77 }, { opacity: 1 }], timing));
    }
    if (stationary) {
      effects.push(stationary.animate([{ opacity: 1 }, { opacity: 1, offset: .62 }, { opacity: 0 }], timing));
    }
    this.finishTurn = () => {
      this.finishTurn = null;
      target.classList.remove('is-turning');
      for (const effect of effects) effect.cancel();
      scene.remove();
    };
    const finish = this.finishTurn;
    effects[1].finished.then(() => {
      if (this.finishTurn === finish) finish();
    }, () => {});
  }

  pointerDown(event) {
    if (!event.isPrimary || event.button !== 0 || !this.pages.length || this.zoom > 1) return;
    if (event.pointerType !== 'touch' && !event.target.closest('.book-page')) return;
    this.ignoreClick = false;
    this.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  pointerUp(event) {
    const start = this.gesture;
    if (!start || start.id !== event.pointerId) return;
    this.gesture = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      this.ignoreClick = true;
      this.onTurn(dx < 0 ? 1 : -1);
    }
  }

  clickPage(event) {
    if (this.ignoreClick) {
      this.ignoreClick = false;
      return;
    }
    if (this.zoom > 1 || !event.target.closest('.book-page')) return;
    const box = this.frame.getBoundingClientRect();
    const position = (event.clientX - box.left) / box.width;
    if (position <= .24) this.onTurn(-1);
    if (position >= .76) this.onTurn(1);
  }
}
