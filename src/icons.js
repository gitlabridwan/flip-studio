const paths = {
  brand: '<path d="M5 6.7c3.1-.8 5.5 0 7 1.8 1.5-1.8 3.9-2.6 7-1.8v10.6c-3.1-.8-5.5 0-7 1.8-1.5-1.8-3.9-2.6-7-1.8z"/><path d="M12 8.5v10.6"/>',
  layout: '<path d="M12 6.6c-3-1.5-5.8-1.7-9-.6v12.4c3.2-1 6-.8 9 .7 3-1.5 5.8-1.7 9-.7V6c-3.2-1.1-6-1-9 .6v12.5"/><path d="M6.6 9.2h2m6.9 0h2"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
  book: '<path d="M12 7c-2-2-5-2.5-9-2v13.5c4-.5 7 0 9 2 2-2 5-2.5 9-2V5c-4-.5-7 0-9 2v13.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9.2a2.5 2.5 0 0 1 4.9.7c0 1.8-2.6 2.2-2.6 3.8m0 3h.01"/>',
  shield: '<path d="M12 22s7-3.5 7-10V5l-7-3-7 3v7c0 6.5 7 10 7 10z"/><path d="m9 12 2 2 4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.4 15.4 4.3 4.3"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/>',
  download: '<path d="M12 4v12m-5-5 5 5 5-5M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M8 13h8m-8 4h5"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  share: '<path d="M12 15V3m-4 4 4-4 4 4M6 11H4v9h16v-9h-2"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5" fill="var(--icon-fill,white)"/><circle cx="15" cy="17" r="2.5" fill="var(--icon-fill,white)"/>',
  trash: '<path d="M4 6h16m-9-3h2m-7 3 1 14h10l1-14M10 10v6m4-6v6"/>',
  maximize: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',
  minimize: '<path d="M4 8h4V4m12 4h-4V4M4 16h4v4m12-4h-4v4"/>',
  code: '<path d="m9 7-5 5 5 5m6-10 5 5-5 5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
};

export function icon(name) {
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
}

export function insertIcons(root = document) {
  for (const node of root.querySelectorAll('[data-icon]')) {
    node.innerHTML = icon(node.dataset.icon);
  }
}
