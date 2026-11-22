# PRD FlipStudio

| Atribut | Nilai |
| --- | --- |
| Versi | 0.2.0 |
| Tanggal | 22 November 2026 |
| Produk | Studio publikasi PDF berbasis browser |
| Distribusi awal | Repositori GitHub dan hosting statis |
| Status | Spesifikasi MVP dan peta jalan pengembangan |

## 1. Masalah dan tujuan

PDF mudah dikirim, tetapi dokumen seperti modul ajar, katalog, majalah, dan portofolio membutuhkan pengalaman baca yang nyaman di browser. Penulis perlu memeriksa hasil sebelum membagikannya, mempertahankan salinan sumber, serta memilih cara distribusi yang sesuai dengan audiens.

FlipStudio menyediakan alur untuk mengimpor PDF, membaca dengan dua halaman berhadapan dan animasi balik lembar, menyesuaikan tampilan pembaca, dan menerbitkan salinan HTML yang bisa dibagikan secara mandiri. Penyimpanan lokal membantu pengguna kembali ke publikasi dan halaman terakhir dari profil browser yang sama. Pemrosesan dan ekspor berjalan di perangkat pengguna tanpa layanan konversi terpusat.

## 2. Acuan produk FlipHTML5

Dokumentasi FlipHTML5 menunjukkan alur dari mengunggah dokumen hingga menyesuaikan dan membagikan publikasi. Pemetaan berikut menunjukkan fungsi yang diterapkan dalam versi awal FlipStudio dan fungsi yang masuk peta jalan.

| Area | Pola dalam FlipHTML5 | Implementasi FlipStudio |
| --- | --- | --- |
| Konversi | Unggah dokumen, termasuk PDF, untuk membuat publikasi dengan efek balik halaman. [Panduan membuat flipbook](https://support.fliphtml5.com/en/articles/7990119-create-a-digital-flipbook-in-minutes) | Impor satu PDF, buat sampul dari halaman pertama, lalu buka pembaca. |
| Manajemen | Kelola publikasi dari dashboard dan akses tindakan melalui menu proyek. [Panduan dashboard](https://help.fliphtml5.com/docs/getting-started-with-dashboard/) | Ruang kerja lokal dengan kartu sampul, pencarian judul, pengurutan, dan filter. |
| Penyesuaian | Sesuaikan tampilan dan tambahkan media melalui editor halaman. [Editor halaman](https://help.fliphtml5.com/docs/getting-started-with-the-page-editor/) | Ubah judul, tema pembaca, dan preferensi animasi. Editor media direncanakan setelah publikasi daring. |
| Distribusi | Bagikan melalui tautan atau sematan, serta unduh salinan untuk penggunaan lain. [Berbagi](https://support.fliphtml5.com/en/articles/8003848-share-flipbooks) · [Sematan](https://support.fliphtml5.com/en/articles/8003828-embed-a-flipbook) · [Unduhan](https://support.fliphtml5.com/en/articles/8003826-download-flipbooks) | Ekspor satu HTML mandiri. Pembuat publikasi dapat mengunggahnya ke hosting statis dan membuat iframe dari URL publik tersebut. |
| Evaluasi | Lacak performa publikasi yang dihosting pada layanan. [Statistik publikasi](https://support.fliphtml5.com/en/articles/8003852-statistics-a-single-book) | Analitik pembaca daring direncanakan setelah hosting dan pengaturan akses tersedia. |

## 3. Pengguna dan pekerjaan utama

| Pengguna | Kebutuhan | Skenario penerimaan |
| --- | --- | --- |
| Pengajar dan pengelola materi | Membagikan modul dan membuka topik tertentu dengan cepat | Impor modul, cari istilah, uji halaman tujuan, lalu distribusikan HTML kepada mahasiswa. |
| Pelaku UMKM dan pemasar | Memperlihatkan katalog atau portofolio lewat ponsel | Impor katalog, ubah judul dan tema, terbitkan HTML, lalu salin kode sematan untuk situs. |
| Pembaca | Membaca dan menemukan informasi tanpa proses pendaftaran | Buka HTML atau iframe lalu pindah halaman menggunakan tombol, keyboard, atau layar sentuh. |

## 4. Alur utama

1. Pembuat publikasi memilih **Impor PDF** atau menyeret file ke kartu **Publikasi baru**.
2. Aplikasi memeriksa tipe, ukuran, jumlah halaman, dan keterbacaan PDF. Setelah valid, aplikasi menyimpan dokumen dan sampul lalu membuka pembaca.
3. Pembuat membaca buku dalam tampilan selebar layar, menemukan halaman lewat thumbnail atau pencarian teks, dan menyimpan pengaturan pembaca.
4. Melalui **Bagikan**, pembuat mengunduh HTML. Untuk distribusi lewat URL, pembuat menerbitkan HTML pada hosting statis dan menggunakan URL tersebut untuk berbagi atau membuat iframe.
5. Pembaca membuka URL, iframe, atau HTML yang diterima dan dapat langsung membaca.

## 5. Kebutuhan fungsional dan kriteria penerimaan MVP

| ID | Kebutuhan | Kriteria penerimaan |
| --- | --- | --- |
| FR-01 | Impor satu PDF dari pemilih file atau area seret | PDF valid hingga 50 MiB dan 150 halaman menghasilkan kartu dengan sampul dan membuka pembaca. Format keliru, file korup, PDF terkunci, ukuran berlebih, dan jumlah halaman berlebih mendapat pesan yang sesuai. Kegagalan tidak membuat kartu publikasi baru. |
| FR-02 | Kelola katalog lokal | Pengguna bisa memfilter **Semua**, **Milik saya**, dan **Contoh**, mencari judul, serta mengurutkan berdasarkan waktu, judul, atau halaman. Impor yang berhasil tetap muncul setelah muat ulang. |
| FR-03 | Baca dan navigasi | Isi PDF tampil berpasangan pada layar lebar. Halaman pertama, halaman terakhir, dan halaman isi tanpa pasangan tampil tunggal. Pada layar kecil atau mode satu halaman, seluruh PDF tampil per halaman. Panah di sisi buku, keyboard, nomor halaman, thumbnail, klik tepi, dan geser layar sentuh mendukung navigasi. Saat berganti bentangan pada zoom 100%, lembar bergerak dengan dua sisi dan bayangan. Posisi terakhir yang berhasil ditampilkan disimpan. |
| FR-04 | Sesuaikan tampilan baca | Pengguna dapat memilih zoom 75–200%, kembali ke ukuran yang pas dengan layar, dan mengaktifkan layar penuh jika tersedia. Tata letak mendukung ponsel dan desktop. |
| FR-05 | Cari dan akses teks | Pencarian kata atau frasa dua karakter atau lebih menemukan halaman yang cocok pada PDF dengan lapisan teks. Hasil memuat cuplikan dan membuka halaman yang dipilih. Teks halaman aktif tersedia di panel pencarian. |
| FR-06 | Ubah pengaturan publikasi | Judul hingga 100 karakter, salah satu dari tiga tema, dan preferensi animasi bisa disimpan. Perubahan bertahan setelah halaman dimuat ulang dan diterapkan pada ekspor berikutnya. |
| FR-07 | Ekspor HTML mandiri | Semua halaman tampil dari satu HTML yang dibuka langsung di browser. Tema, bentangan halaman, zoom, pencarian teks jika tersedia, dan animasi mengikuti pembaca FlipStudio. Proses ekspor menampilkan progres, dapat dibatalkan, dan melaporkan hasil. Halaman divisualkan sebagai gambar dengan sisi terpanjang 1.800 piksel. |
| FR-08 | Buat sematan | URL HTTP atau HTTPS valid menghasilkan iframe yang bisa disalin. Judul dan URL di-escape sebelum dibuat menjadi markup. Pembuat publikasi memasukkan alamat file yang sudah terbit. |
| FR-09 | Kelola sumber dan hapus publikasi lokal | Pengguna bisa mengunduh kembali PDF asli. Penghapusan meminta konfirmasi dan menghapus data katalog beserta Blob PDF dari browser. Dua publikasi contoh tersedia untuk eksplorasi. |
| FR-10 | Laporkan kegagalan operasi | Kegagalan membuka PDF, penyimpanan penuh, error render, dan ekspor besar memberi umpan balik. Percobaan ulang impor atau ekspor dapat dilakukan tanpa menyisakan entri ganda akibat kegagalan sebelumnya. |

## 6. Arsitektur dan data

Aplikasi HTML, CSS, dan JavaScript disajikan sebagai situs statis. PDF.js dimuat saat dibutuhkan. Worker memproses PDF sebelum halaman dirender ke kanvas. File sumber dan metadata ditulis dalam satu transaksi IndexedDB. Ekspor membuat satu HTML yang memuat gambar halaman, teks yang dapat diekstrak, gaya, dan kode pembaca.

| Entitas | Data | Siklus hidup |
| --- | --- | --- |
| Publikasi | ID, judul, jumlah halaman, sampul, tema, animasi, nama PDF sumber, tanggal perubahan, halaman terakhir | Tersimpan pada IndexedDB untuk asal situs dan profil browser saat ini. |
| Sumber PDF | Blob impor yang ditautkan ke ID publikasi | Ditulis dan dihapus bersama publikasi pengguna. Demo membaca PDF bawaan aplikasi. |
| Ekspor | Judul, tema, preferensi animasi, gambar, dan teks per halaman | Diunduh ke perangkat. Salinan yang telah dikirim atau dipublikasikan dikelola secara terpisah oleh pembuat publikasi. |

Pembaca menyajikan tampilan halaman PDF. Fungsionalitas formulir dinamis, tautan PDF aktif, OCR, dan penyuntingan isi halaman berada di luar cakupan MVP. Ekspor dibatasi sekitar 120 juta karakter data untuk membatasi penggunaan memori. Batas ruang IndexedDB bergantung pada browser dan perangkat. Pengguna dapat mengunduh PDF sumber untuk memindahkan publikasi ke profil atau perangkat lain.

## 7. Persyaratan kualitas dan target uji

| Area | Target dan cara verifikasi |
| --- | --- |
| Performa | Uji PDF teks 10 halaman hingga 5 MiB di Chrome desktop, dengan target 5 detik untuk pembaca pertama setelah impor dan 1 detik untuk pindah halaman biasa. Praktik pengujian mencatat perangkat, versi browser, dan jenis dokumen. |
| Responsivitas | Pada lebar 360, 768, dan 1.440 piksel, cek semua kontrol utama, dialog, serta daftar halaman. Pada zoom di atas 100%, area baca dapat digeser tanpa menggeser ruang kerja. |
| Aksesibilitas | Periksa urutan fokus, nama aksesibel tombol, pengoperasian dengan keyboard, pengumuman status, panel teks, dan preferensi pengurangan gerakan. |
| Ketahanan | Uji buka ulang setelah refresh, pembatalan ekspor, file invalid dan terkunci, navigasi cepat, serta penghapusan setelah konfirmasi. |
| Distribusi | Ekstrak ZIP di direktori kosong. Jalankan server lokal. Uji publikasi di path subdirektori hosting, buka HTML ekspor dengan jaringan terputus, dan uji iframe. |
| Privasi | Periksa permintaan jaringan ketika mengimpor PDF lokal. File diproses di browser. Aset runtime berasal dari situs yang sama dan ekspor bisa dibuka mandiri. |

Target di atas digunakan sebagai pedoman pengukuran rilis. Mutu rendering dan durasi dapat berbeda berdasarkan algoritme kompresi, resolusi gambar, serta perangkat.

## 8. Ukuran keberhasilan pilot

| Metrik | Definisi | Target awal |
| --- | --- | --- |
| Keberhasilan tugas pertama | Pengguna pilot yang berhasil mengimpor, membuka, dan membalik halaman dari PDF uji | Minimal 9 dari 10 pengguna |
| Waktu hingga HTML pertama | Median waktu sejak pemilihan file uji 10 halaman hingga unduhan HTML dimulai | Maksimum 90 detik |
| Distribusi berhasil | HTML dari sesi pilot dapat dibuka di profil browser baru dan menampilkan seluruh halaman | 10 dari 10 file uji yang valid |

Pengukuran pilot dilakukan melalui pengamatan sesi dan catatan uji. MVP tidak mengirim analitik pembaca.

## 9. Peta jalan setelah MVP

| Tahap | Prioritas | Kriteria lanjut |
| --- | --- | --- |
| 0.2.1 | Daftar isi dari outline PDF dan ekspor atau impor cadangan pengaturan | Uji navigasi dari outline serta pemulihan preferensi di profil browser baru. |
| 0.3 | Akun, penyimpanan publikasi daring, slug, pengaturan akses, dan URL publikasi yang dikelola aplikasi | Uji autentikasi, hak akses objek, kuota, penghapusan, dan pembatalan tautan. |
| 0.4 | Editor hotspot untuk tautan dan media, templat merek, dan rak buku daring | Uji editor dan pembaca pada desktop serta seluler dengan kebijakan sumber media yang jelas. |
| 0.5 | Analitik agregat untuk publikasi daring dan peningkatan aksesibilitas pembaca | Validasi definisi tayangan, pengungkapan pengukuran kepada pengguna, dan kesesuaian data agregat. |

## 10. Referensi teknis

- Mozilla PDF.js untuk memuat dan merender dokumen PDF. [Dokumentasi PDF.js](https://mozilla.github.io/pdf.js/getting_started/)
- GitHub Pages untuk menerbitkan situs statis dari branch dan direktori akar. [Dokumentasi sumber publikasi](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
