export const DEFAULT_THEME = 'lilac';
export const THEMES = ['paper', 'lilac', 'midnight'];

const demoAsset = (file) => new URL('../assets/demos/' + file, import.meta.url).href;
const demos = [
  {
    id: 'demo-ruang-bentuk', title: 'Ruang & Bentuk', pages: 6, theme: 'lilac',
    animation: true, demo: true, date: 2, page: 1, visual: 'architecture',
    pdfUrl: demoAsset('ruang-bentuk.pdf'), coverUrl: demoAsset('ruang-bentuk.webp'),
    originalName: 'ruang-bentuk.pdf',
  },
  {
    id: 'demo-buku-lapangan', title: 'Buku Lapangan', pages: 4, theme: 'paper',
    animation: true, demo: true, date: 1, page: 1, visual: 'field-notes',
    pdfUrl: demoAsset('buku-lapangan.pdf'), coverUrl: demoAsset('buku-lapangan.webp'),
    originalName: 'buku-lapangan.pdf',
  },
];

let connection;
function database() {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('flipstudio', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('publications', { keyPath: 'id' });
      request.result.createObjectStore('pdfs');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
      };
      db.onclose = () => { connection = undefined; };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  }).catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

async function read(store, operation, ...args) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store)[operation](...args);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function write(stores, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite');
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error('Penyimpanan dibatalkan.'));
    const store = name => transaction.objectStore(name);
    action(store, value => { result = value; });
  });
}

export async function listPublications() {
  const records = await read('publications', 'getAll');
  const known = new Map(records.map(record => [record.id, record]));
  return [
    ...demos.map(demo => ({ ...demo, ...known.get(demo.id) })),
    ...records.filter(record => !record.demo),
  ];
}

export function demoPublications() {
  return demos.map(demo => ({ ...demo }));
}

export function addPublication(record, file) {
  return write(['publications', 'pdfs'], store => {
    store('publications').add(record);
    store('pdfs').add(file, record.id);
  });
}

export function updatePublication(id, patch) {
  return write('publications', (store, setResult) => {
    const records = store('publications');
    const request = records.get(id);
    request.onsuccess = () => {
      const record = request.result || demos.find(demo => demo.id === id);
      if (!record) return;
      // Store only the changing fields of a demo so its asset URLs follow the deployment.
      const previous = record.demo
        ? { id, demo: true, title: record.title, page: record.page, theme: record.theme, animation: record.animation }
        : record;
      const next = { ...previous, ...patch };
      records.put(next);
      setResult(record.demo ? { ...demos.find(demo => demo.id === id), ...next } : next);
    };
  });
}

export function removePublication(id) {
  return write(['publications', 'pdfs'], store => {
    store('publications').delete(id);
    store('pdfs').delete(id);
  });
}

export async function getPdfSource(record) {
  if (record.demo) return record.pdfUrl;
  const file = await read('pdfs', 'get', record.id);
  if (!file) throw new Error('PDF sumber hilang dari penyimpanan browser. Impor kembali file aslinya.');
  return file;
}
