# FlipStudio

FlipStudio mengubah PDF menjadi buku digital yang bisa dibalik halaman, dicari, dan dibagikan dalam satu file HTML. Aplikasi berjalan di browser dan dapat diterbitkan sebagai situs statis. Dua PDF contoh tersedia saat aplikasi dibuka.

**Versi 0.2.0** · [PRD dan peta jalan](docs/PRD-FlipStudio.md)

## Jalankan di komputer

Siapkan Node.js 20 atau lebih baru, ekstrak ZIP, lalu buka terminal di folder yang berisi `index.html`.

```bash
npm start
```

Buka [http://localhost:4173](http://localhost:4173). Paket sudah menyertakan mesin PDF dan aset antarmuka, sehingga langkah ini bisa dijalankan langsung. Untuk mengganti port, gunakan `npm start -- --port 8080`.

## Buat dan bagikan flipbook

1. Klik **Impor PDF** atau seret satu PDF ke kartu **Publikasi baru**. Ukuran maksimum 50 MiB (52.428.800 byte) dengan 150 halaman. Gunakan PDF yang bisa dibuka tanpa kata sandi.
2. Klik sampul di ruang kerja untuk membuka pembaca. Pada layar lebar, isi tampil sebagai dua halaman berhadapan. Halaman pertama, halaman terakhir, dan halaman isi yang tidak berpasangan tampil tunggal. Pada layar kecil, semua halaman tampil tunggal. Gunakan panah, nomor halaman, daftar halaman, keyboard, atau klik tepi buku. Pada layar sentuh, geser secara horizontal saat zoom 100%. Pilih **Cari teks** untuk menemukan frasa dengan teks bawaan PDF.
3. Buka **Pengaturan publikasi** untuk mengganti judul, tema, dan animasi. Browser menyimpan PDF, perubahan, dan halaman terakhir khusus untuk alamat situs dan profil browser yang sedang dipakai.
4. Pilih **Bagikan → Unduh HTML**. Kirim file HTML kepada pembaca atau unggah ke hosting statis. Pembaca bisa membuka HTML langsung di browser, termasuk tanpa koneksi internet.
5. Untuk menampilkan flipbook pada situs lain, tempel URL publik file HTML di **Sematkan di situs**. Salin kode iframe ke editor HTML situs tujuan.

Ekspor HTML memakai tampilan buku yang sama. File menyertakan gambar dan teks yang bisa diekstrak dari setiap halaman. Pencarian memakai teks bawaan PDF. Untuk dokumen hasil pindai, jalankan OCR sebelum mengimpor. Konten PDF ditampilkan sebagai halaman visual di pembaca. Tautan, formulir, lampiran, dan skrip PDF interaktif berada di luar cakupan pembaca FlipStudio.

## Unggah ke GitHub

Buat repositori kosong bernama `flipstudio`. Dari folder hasil ekstrak, jalankan perintah berikut. Ganti `NAMA_AKUN` dengan akun atau organisasi GitHub yang memiliki repositori tersebut.

```bash
git init -b main
git add .
git commit -m "Tambahkan FlipStudio v0.2.0"
git remote add origin https://github.com/NAMA_AKUN/flipstudio.git
git push -u origin main
```

Untuk GitHub Pages, buka **Settings → Pages**, pilih **Deploy from a branch**, lalu pilih **main** dan **/(root)**. Buka alamat yang ditampilkan GitHub setelah penerbitan selesai. Direktori akar memuat `index.html` dan `.nojekyll`. [Panduan GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Untuk menerbitkan satu flipbook, tambahkan file hasil ekspor ke folder `publikasi/` di repositori. Setelah Pages memperbarui situs, URL-nya akan berbentuk `https://NAMA_AKUN.github.io/flipstudio/publikasi/nama-buku.html`. Penerima URL publik dapat membaca seluruh isi flipbook. Pertahankan PDF asli sebagai cadangan di lokasi yang Anda kendalikan.

## Struktur proyek

| Lokasi | Isi |
| --- | --- |
| `index.html` | Ruang kerja, pembaca, dan dialog |
| `assets/` | Gaya antarmuka dan pembaca, font, serta PDF demo |
| `src/` | Impor, IndexedDB, pembaca, dan mesin ekspor |
| `vendor/pdfjs/` | PDF.js dan aset runtime yang dipaketkan dari rilis Mozilla |
| `scripts/` | Server lokal dan pengujian urutan halaman |
| `docs/PRD-FlipStudio.md` | Referensi FlipHTML5, lingkup MVP, kriteria penerimaan, dan peta jalan |

Gunakan browser desktop atau seluler versi terbaru dengan JavaScript dan IndexedDB aktif. Penyimpanan browser dapat dibersihkan melalui pengaturan browser. Layar penuh mengikuti dukungan browser dan konteks sematan.

Jalankan `npm test` untuk memeriksa pengelompokan halaman, sampul, dan urutan baca.

[Lihat lisensi komponen pihak ketiga](THIRD_PARTY_NOTICES.md).
