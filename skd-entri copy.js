const { chromium } = require("playwright");
const mysql = require("mysql2/promise");

(async () => {
  // Koneksi ke database Laravel
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "db_penilaian_pelayanan"
  });


  // Ambil 1 data responden dengan status pending
  const [rows] = await conn.execute(
    "SELECT * FROM respondents WHERE status = 'pending' LIMIT 1"
  );
  if (rows.length === 0) {
    console.log("Tidak ada data baru untuk dientri.");
    process.exit(0);
  }
  const data = rows[0];


  const browser = await chromium.launch({ headless: false }); // headless:true kalau mau background
  const page = await browser.newPage();


  try {
    // Login SSO
    // await page.goto("https://sso.bps.go.id/login");
    // await page.fill("input[name='username']", "username_bps_anda");
    // await page.fill("input[name='password']", "password_rahasia_anda");
    // await page.click("button[type='submit']");
    // await page.waitForNavigation();


    // Masuk ke SKD blok1
    console.log("Membuka halaman entri SKD...");
    await page.goto("https://skd.bps.go.id/SKD2025/web/entri/responden/blok1?token=2jUMky70QC3wjY06Xim6ueswQJQrVQ466d_HVKW7yuOGU2FOZpuDjes9P2uPKj1L9slA4H6wIVvF6S9zLmbjFn8XX0VThjkCHnen");
    await page.waitForNavigation();

    await page.click("button[type='button']");

    console.log("📝 Mengisi Blok I: Keterangan Responden...");

    // Isi form sesuai data dari database
    await page.fill('#nama', data.nama);
    await page.fill('#email', data.email);
    await page.fill('#no_hp', data.no_hp);
    await page.fill('#nama_instansi', data.nama_instansi);

    if (data.jenis_kelamin) {
            await page.check(`input[name="jenis_kelamin"][value="${data.jenis_kelamin}"]`);
        }


        if (data.pendidikan_id) await page.selectOption('#pendidikan_id', { value: String(data.pendidikan_id) });
        if (data.pekerjaan_id) await page.selectOption('#pekerjaan_id', { value: String(data.pekerjaan_id) });
        if (data.instansi_id) await page.selectOption('#instansi_id', { value: String(data.instansi_id) });
        if (data.pemanfaatan_id) await page.selectOption('#pemanfaatan_id', { value: String(data.pemanfaatan_id) });

    if (data.jenis_layanan) {
            for (const layanan of JSON.parse(data.jenis_layanan)) {
                await page.check(`input[name="jenis_layanan[]"][value="${layanan}"]`);
            }
        }


    if (data.sarana_digunakan) {
            for (const sarana of JSON.parse(data.sarana_digunakan)) {
                await page.check(`input[name="sarana_digunakan[]"][value="${sarana}"]`);
            }
        }

       if (data.pekerjaan_lainnya) {
            await page.fill('#pekerjaan_lainnya', data.pekerjaan_lainnya);
        }
console.log("✅ Formulir Blok I selesai diisi.");
        console.log("▶️ Skrip dijeda. Silakan periksa isian di browser.");
        console.log("   Tutup jendela browser secara manual untuk mengakhiri skrip.");

        await page.pause();

    // Update status sukses
    // Submit form
    //     await page.click("button[type='submit']"); 
    //     await page.waitForTimeout(5000); 
    //     console.log("🚀 Formulir berhasil di-submit.");

    //     // Update status menjadi 'sukses'
    //     await conn.execute("UPDATE respondents SET status = 'sukses' WHERE id = ?", [data.id]);
    //     console.log(`✔️ Data responden ${data.nama} berhasil dientri.`);

  } catch (err) {
    console.error("❌ Gagal entri:", err);
    await conn.execute("UPDATE respondents SET status = 'gagal' WHERE id = ?", [data.id]);
  } finally {
    // await browser.close();
    await conn.end();
  }
})();
