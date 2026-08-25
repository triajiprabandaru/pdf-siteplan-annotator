# 🗺️ PDF Siteplan Node Annotator

Aplikasi web interaktif modern untuk anotasi denah masterplan/siteplan PDF, penempatan node kavling digital, pengelolaan status, manajemen metadata (Zona, Tipe, Dimensi, Luas, Properti Kustom), serta ekspor data ke format **Excel (.xlsx)**, **JSON**, dan **Gambar Resolusi Tinggi (PNG)**.

---

## ✨ Fitur Utama

- 📄 **High-DPI PDF Rendering**: Rendering vektor PDF tajam hingga resolusi 300 DPI dengan dukungan zoom & pan halus (GPU-accelerated).
- 📍 **Manajemen Node Kavling**:
  - Penambahan node instan dengan input kode otomatis berurutan.
  - Mode **Pan & Select** dan mode **Pindahkan (Drag & Drop)**.
  - Pewarnaan status otomatis:
    - ⚪ **Rencana** (`#64748b` - Abu-abu)
    - ⚫ **Construction** (`#334155` - Abu-abu Gelap)
    - 🟠 **Funeral Ready** (`#fb923c` - Orange Muda)
    - 🟢 **Finish** (`#4ade80` - Hijau Muda)
  - Otomatis mengingat status terakhir (*Inherit Last Used Status*) untuk pembuatan node berikutnya.
- 🏷️ **Metadata Lengkap**:
  - **Zona**: Pilihan zona masterplan (*Saakuuraa, Khuzaamaa, Zanbaqah, Yaasmiin, Sahliyah, Wardah, General, Fasilitas, Infrastruktur*).
  - **Tipe (Type)**: Pilihan tipe (*Single [default], Double, Super Double, Double Varian D, Family, Super Family, Royal Family*).
  - **Dimensi & Luas (m²)**.
  - **Properti Kustom**: Tambah pasangan atribut *Key-Value* tak terbatas (misal: *Sertifikat, No Pemakaman, Owner, dll.*).
- 📊 **Ekspor Data Lengkap**:
  - 📗 **Excel (.xlsx)**: Tabel spreadsheet rapi dengan penataan lebar kolom otomatis. Kolom kosong diabaikan secara pintar.
  - 📑 **Data JSON**: Format data standar terstruktur untuk backup dan restore.
  - 🖼️ **Gambar Siteplan (.png)**: Ekspor gambar HD lengkap dengan Judul Denah & Tanggal di pojok kiri atas serta Legenda Keterangan Status di pojok kanan atas.
- ↩️ **Undo & Redo (Ctrl+Z / Ctrl+Y)**: Riwayat perubahan tersimpan aman.
- 💾 **Local Persistence**: Data tersimpan otomatis di *Local Storage* peramban.

---

## 🚀 Cara Menjalankan Secara Lokal

Aplikasi ini murni berbasis client-side (*vanilla HTML5, CSS3, JavaScript*), sehingga tidak memerlukan instalasi runtime khusus.

### Opsi 1: Menggunakan Python (Simple Server)
```bash
python -m http.server 8080
```
Buka browser dan akses: `http://localhost:8080`

### Opsi 2: Menggunakan VS Code Live Server
1. Buka folder proyek di VS Code.
2. Klik kanan pada file `index.html` dan pilih **Open with Live Server**.

---

## 🛠️ Teknologi yang Digunakan

- **HTML5 & CSS3**
- **JavaScript (ES6+)**
- [Tailwind CSS](https://tailwindcss.com/)
- [Font Awesome 6](https://fontawesome.com/)
- [PDF.js by Mozilla](https://mozilla.github.io/pdf.js/)
- [SheetJS (xlsx)](https://sheetjs.com/)

---

## 📄 Lisensi
MIT License.
