/**
 * GOOGLE APPS SCRIPT TEMPLATE FOR FACE ATTENDANCE
 * 
 * CARA SETUP:
 * 1. Buka Google Sheets (spreadsheet baru atau yang sudah ada).
 * 2. Klik menu 'Ekstensi' -> 'Apps Script'.
 * 3. Hapus semua kode default di dalam editor `Kode.gs`.
 * 4. Paste kode di bawah ini ke dalam editor tersebut.
 * 5. Simpan proyek dengan menekan tombol save (ikon disket).
 * 6. Klik tombol 'Terapkan' (Deploy) di bagian kanan atas -> 'Penerapan baru' (New deployment).
 * 7. Pilih tipe penerapan: 'Aplikasi web' (Web app).
 * 8. Konfigurasi:
 *    - Deskripsi: Absensi Wajah Web App
 *    - Jalankan sebagai (Execute as): Saya (Me / email Anda)
 *    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone)
 * 9. Klik 'Terapkan' (Deploy). Anda mungkin perlu memberikan izin akses akun Google Anda.
 * 10. Salin 'URL Aplikasi Web' (Web app URL) yang dihasilkan.
 * 11. Buka website absensi wajah Anda, klik ikon gerigi/settings di sudut kanan atas, lalu paste URL tersebut ke input field yang disediakan.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Tunggu maksimal 30 detik untuk menghindari race condition penulisan baris
  lock.waitLock(30000);
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Validasi data input
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No data received or invalid request format.");
    }
    
    var data = JSON.parse(e.postData.contents);
    
    var nama = data.nama || "Tanpa Nama";
    var tanggal = data.tanggal || "";
    var jam = data.jam || "";
    var foto = data.foto || ""; // Base64 data image
    
    // Jika sheet masih kosong, buat header
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Nama Mahasiswa", "Tanggal", "Jam", "Foto Wajah (Base64)"]);
      // Format header agar bold
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#F5EFEB");
    }
    
    // Tambah baris data baru
    sheet.appendRow([nama, tanggal, jam, foto]);
    
    // Set response headers untuk CORS
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: "Absensi berhasil disimpan ke spreadsheet.",
        data: { nama: nama, tanggal: tanggal, jam: jam }
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    // Lepaskan lock script
    lock.releaseLock();
  }
}

// Handler GET untuk sekadar verifikasi status API
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "running",
      message: "Google Apps Script untuk Absensi Wajah aktif dan siap menerima data."
    })
  ).setMimeType(ContentService.MimeType.JSON);
}
