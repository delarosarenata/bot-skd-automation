// skd-entri.js (Versi Final Lengkap)
const { chromium } = require("playwright");
const mysql = require("mysql2/promise");

// ============================ PENGATURAN ============================
const dbConfig = {
    host: "127.0.0.1",
    user: "root",
    password: "", // Sesuaikan jika ada password
    database: "db_penilaian_pelayanan",
    port: 3306
};

// Ganti dengan URL Entri SKD Asli Anda yang masih valid
const entriUrl = "https://skd.bps.go.id/SKD2025/web/entri/responden/blok1?token=2jUMky70QC3wjY06Xim6ueswQJQrVQ466d_HVKW7yuOGU2FOZpuDjes9P2uPKj1L9slA4H6wIVvF6S9zLmbjFn8XX0VThjkCHnen";
// ====================================================================


(async () => {
    const conn = await mysql.createConnection(dbConfig);

    const [rows] = await conn.execute(
    "SELECT * FROM respondents WHERE status IN ('pending', 'gagal') ORDER BY id ASC LIMIT 1"
);

    if (rows.length === 0) {
        console.log("✅ Tidak ada data baru untuk dientri.");
        await conn.end();
        process.exit(0);
    }
    const data = rows[0];
    console.log(`🚀 Mencoba mengentri data untuk ID: ${data.id} - ${data.nama}`);

    const browser = await chromium.launch({ headless: false, slowMo: 200 });
    const page = await browser.newPage();

    try {
        console.log("Membuka halaman entri SKD...");
        await page.goto(entriUrl);
        
        console.log("Menunggu pop-up petunjuk...");
        await page.locator('button[data-dismiss="modal"].btn-success').click();
        console.log("Pop-up ditutup.");

        await page.locator('#verblok1-blok1_r_nama').waitFor(); // Tunggu form utama siap
        
        // --- Mengisi Formulir Blok I ---
        console.log("📝 Mengisi Blok I: Keterangan Responden...");
        
        await page.fill('#verblok1-blok1_r_nama', data.nama);
        await page.fill('#verblok1-blok1_r_email', data.email);
        await page.fill('#verblok1-blok1_r_nohp', data.no_hp);
        await page.fill('#verblok1-blok1_r_namains', data.nama_instansi);
        
        if (data.jenis_kelamin === 'Laki-laki') {
            await page.locator('label[for="i0"]').click(); // Klik label untuk 'Laki-laki'
        } else if (data.jenis_kelamin === 'Perempuan') {
            await page.locator('label[for="i1"]').click(); // Klik label untuk 'Perempuan'
        }
        
        if (data.pendidikan_id) await page.selectOption('#blok1_r_pt', { value: String(data.pendidikan_id) });
        if (data.pekerjaan_id) await page.selectOption('#blok1_r_pu', { value: String(data.pekerjaan_id) });
        if (data.instansi_id) await page.selectOption('#blok1_r_ki', { value: String(data.instansi_id) });
        if (data.pemanfaatan_id) await page.selectOption('#blok1_r_dd', { value: String(data.pemanfaatan_id) });

        // Mengisi input "Lainnya" jika ada
        if (data.pekerjaan_id === 7 && data.pekerjaan_lainnya) { // Asumsi ID 7 adalah 'Lainnya'
            await page.fill('#verblok1-blok1_r_pul', data.pekerjaan_lainnya);
        }
        if (data.instansi_id === 9 && data.instansi_lainnya) { // Asumsi ID 9 adalah 'Lainnya'
            await page.fill('#verblok1-blok1_r_kil', data.instansi_lainnya);
        }
        if (data.pemanfaatan_id === 5 && data.pemanfaatan_lainnya) { // Asumsi ID 5 adalah 'Lainnya'
            await page.fill('#verblok1-blok1_r_ddl', data.pemanfaatan_lainnya);
        }
        
        // Checkbox Jenis Layanan (KLIK LABELNYA)
        if (data.jenis_layanan) {
            const layananMap = { "Perpustakaan": "i2", "Konsultasi Statistik": "i6", "Rekomendasi Kegiatan": "i7" };
            for (const layananText of JSON.parse(data.jenis_layanan)) {
                const labelFor = layananMap[layananText];
                if (labelFor) {
                    await page.locator(`label[for="${labelFor}"]`).click();
                }
            }
        }
        
        // Mengisi Checkbox Sarana Digunakan
        if (data.sarana_digunakan) {
            const saranaMap = { 
                "PST Datang Langsung": "i8", 
                "PST Online": "i9", 
                "Website BPS": "i10", 
                "Surat/Email": "i11", 
                "Aplikasi Chat": "i12", 
                "Lainnya": "i13" 
            };
            for (const saranaText of JSON.parse(data.sarana_digunakan)) {
                const labelFor = saranaMap[saranaText];
                if (labelFor) {
                    await page.locator(`label[for="${labelFor}"]`).click();
                }
            }
        }

        if (data.sarana_digunakan && JSON.parse(data.sarana_digunakan).includes('Lainnya') && data.sarana_lainnya) {
            console.log("Mengisi input Sarana Lainnya...");
            // Gunakan selektor 'id' dari hasil inspect element Anda sebelumnya
            await page.fill('#verblok1fasilitaskunjungan-blok1_r_fkl', data.sarana_lainnya);
        }
        
        // Radio Button Pengaduan (KLIK LABELNYA)
        if (data.pernah_pengaduan === 'Ya') {
            await page.locator('label[for="i14"]').click();
        } else if (data.pernah_pengaduan === 'Tidak') {
            await page.locator('label[for="i15"]').click();
        }
        
        // --- NAVIGASI KE BLOK II ---
        console.log("Navigasi ke Blok II...");
        // Ganti selektor ini jika tombol 'Selanjutnya' di Blok I berbeda
        await page.locator('button[type="submit"]:has-text("Selanjutnya")').click();
        await page.waitForNavigation();
        console.log("Berhasil pindah ke Blok II.");
        await page.locator('#verblok2-blok2_r1a').waitFor(); // Tunggu elemen pertama Blok II muncul

        console.log("📝 Mengisi Blok II: Penilaian Pelayanan...");
        if (data.penilaian) {
            const penilaianData = JSON.parse(data.penilaian);

            // ==================================================================
            // [LOGIKA BARU] Menangani Dropdown Rincian 8 secara kondisional
            // ==================================================================
            if (data.sarana_digunakan) {
                const saranaArray = JSON.parse(data.sarana_digunakan);
                
                // HANYA jalankan jika sarana yang dipilih LEBIH DARI SATU
                if (saranaArray.length > 1) { 
                    const fasilitasUtamaText = saranaArray[0]; // Ambil pilihan pertama
                    const saranaMapToValue = {
                        "PST Datang Langsung": "7", "PST Online": "8", "Website BPS": "9",
                        "Surat/Email": "10", "Aplikasi Chat": "11", "Lainnya": "12"
                    };
                    const fasilitasValue = saranaMapToValue[fasilitasUtamaText];
                    
                    if (fasilitasValue) {
                        console.log(`   Memilih fasilitas utama: "${fasilitasUtamaText}" (value: ${fasilitasValue})`);
                        await page.selectOption('#verblok2-blok2_rspesial', { value: fasilitasValue });
                    } else {
                        console.log(`   ⚠️ Peringatan: Fasilitas utama "${fasilitasUtamaText}" tidak ditemukan dalam kamus. Dropdown dilewati.`);
                    }
                } else {
                    console.log("   (Hanya 1 sarana dipilih, dropdown rincian 8 tidak muncul dan dilewati)");
                }
            } else {
                console.log("   ⚠️ Peringatan: Kolom 'sarana_digunakan' kosong. Dropdown dilewati.");
            }
            // ==================================================================
            //                      AKHIR LOGIKA DROPDOWN
            // ==================================================================


            // Loop untuk setiap pertanyaan (q1, q2, ...) untuk mengisi rating bintang
            for (const [questionId, values] of Object.entries(penilaianData)) {
                const r_number = questionId.substring(1); 

                // Mengisi Tingkat Kepentingan
                if (values.kepentingan) {
                    const ratingContainer = page.locator(`.field-verblok2-blok2_r${r_number}a .rating-stars`);
                    const targetStar = ratingContainer.locator('.star').nth(values.kepentingan - 1);
                    await targetStar.hover();
                    await targetStar.click();
                }

                // Mengisi Tingkat Kepuasan
                if (values.kepuasan) {
                    const ratingContainer = page.locator(`.field-verblok2-blok2_r${r_number}b .rating-stars`);
                    const targetStar = ratingContainer.locator('.star').nth(values.kepuasan - 1);
                    await targetStar.hover();
                    await targetStar.click();
                }
            }
        }
        console.log("✅ Blok II selesai diisi.");

        // =======================================================
        //             JEDA UNTUK INVESTIGASI MANUAL
        // =======================================================
        // console.log("▶️ Skrip dijeda di akhir Blok II. Silakan periksa halaman.");
        // console.log("   Coba klik tombol 'Selanjutnya' secara manual. Apakah berhasil?");
        // await page.pause();
        // =======================================================

        let skipBlok3 = false;
        if (data.jenis_layanan) {
            const jenisLayanan = JSON.parse(data.jenis_layanan);
            // Cek jika HANYA ada 1 layanan dan itu adalah "Rekomendasi Kegiatan Statistik"
            if (jenisLayanan.length === 1 && jenisLayanan[0] === 'Rekomendasi Kegiatan') {
                skipBlok3 = true;
            }
        }

        if (skipBlok3) {
            console.log("⏩ Hanya Rekomendasi Kegiatan dipilih. Melompati Blok III...");
        } else {

        console.log("Navigasi ke Blok III...");
        await page.locator('button[type="submit"].btn-success').click();
        await page.waitForNavigation();

        console.log("Memastikan halaman Blok III sudah dimuat sepenuhnya...");
        // Tunggu sampai judul H4 yang berisi teks "BLOK III" muncul
        console.log("Berhasil pindah ke Blok III.");
        await page.locator('h4:has-text("BLOK III. Kebutuhan Data")').waitFor();

        // =======================================================
        //             MENGISI FORMULIR BLOK III (BARU)
        // =======================================================
        console.log("📝 Mengisi Blok III: Kebutuhan Data...");
        
        if (data.kebutuhan_data) {
            const kebutuhanDataArray = JSON.parse(data.kebutuhan_data);
            
            const levelDataMap = { "nasional": "1", "provinsi": "2", "kabupaten/kota": "3", "kecamatan": "4", "desa/kelurahan": "5", "individu": "6", "lainnya": "7" };
            const periodeDataMap = { "sepuluh tahunan": "11", "lima tahunan": "12", "tiga tahunan": "13", "tahunan": "14", "semesteran": "15", "triwulanan": "16", "bulanan": "17", "mingguan":"18", "harian": "19", "lainnya": "20" };
            const diperolehMap = { "ya sesuai": "1", "ya belum sesuai": "2", "tidak diperoleh": "3", "belum diperoleh": "4" };
            const jenisPublikasiMap = { "publikasi": "1", "data mikro": "2", "peta": "3", "tabulasi data": "4", "tabel di website": "5"};

            for (const kebutuhan of kebutuhanDataArray) {
                
                await page.locator('#tambahdata').click();
                await page.locator('#verblok3-blok3_r_jenisdata').waitFor();
                console.log(` -> Menambahkan rincian: ${kebutuhan.rincian_data}`);

                // Mengisi semua field di dalam modal
                if (kebutuhan.rincian_data) await page.fill('#verblok3-blok3_r_jenisdata', kebutuhan.rincian_data);
                if (kebutuhan.wilayah_data) await page.fill('#verblok3-blok3_r_wilayahjenisdata', kebutuhan.wilayah_data);
                
                let tahunAwal = kebutuhan.tahun_awal || (kebutuhan.tahun_data ? kebutuhan.tahun_data.split(/\s*-\s*|\s*s\/d\s*/)[0] : null);
                let tahunAkhir = kebutuhan.tahun_akhir || (kebutuhan.tahun_data ? (kebutuhan.tahun_data.split(/\s*-\s*|\s*s\/d\s*/)[1] || tahunAwal) : tahunAwal);
                if (tahunAwal) await page.fill('#verblok3-blok3_r_tahunjenisdata', String(tahunAwal));
                if (tahunAkhir) await page.fill('#verblok3-blok3_r_tahunjenisdata2', String(tahunAkhir));
                
                const levelValue = levelDataMap[String(kebutuhan.level_data).toLowerCase()];
                if (levelValue) {
                    await page.selectOption('#verblok3-blok3_r_leveldata', { value: levelValue });
                    if (kebutuhan.level_data === 'lainnya' && kebutuhan.level_data_lainnya) {
                        await page.fill('#verblok3-blok3_r_leveldatal', kebutuhan.level_data_lainnya);
                    }
                }

                const periodeValue = periodeDataMap[String(kebutuhan.periode_data).toLowerCase()];
                if (periodeValue) {
                    await page.selectOption('#verblok3-blok3_r_periodedata', { value: periodeValue });
                    if (kebutuhan.periode_data === 'lainnya' && kebutuhan.periode_data_lainnya) {
                        await page.fill('#verblok3-blok3_r_periodedatal', kebutuhan.periode_data_lainnya);
                    }
                }
                
                const diperolehValue = diperolehMap[String(kebutuhan.data_diperoleh).toLowerCase()];
                if (diperolehValue) {
                    await page.selectOption('#verblok3-blok3_r_datadiperoleh', { value: diperolehValue })
                    
                    if (kebutuhan.data_diperoleh === 'ya sesuai' || kebutuhan.data_diperoleh === 'ya belum sesuai') {
                        console.log('   Mengisi pertanyaan tambahan...');
                        await page.locator('#verblok3-blok3_r_jenispublikasi').waitFor(); 
                        
                        const jenisPubValue = jenisPublikasiMap[String(kebutuhan.jenis_publikasi).toLowerCase()];
                        if (jenisPubValue) await page.selectOption('#verblok3-blok3_r_jenispublikasi', { value: jenisPubValue });
                        
                        if (kebutuhan.judul_publikasi) await page.fill('#verblok3-blok3_r_judulpubl', kebutuhan.judul_publikasi);
                        if (kebutuhan.tahun_publikasi) await page.fill('#verblok3-blok3_r_tahun', kebutuhan.tahun_publikasi);

                        // Mengisi pertanyaan Perencanaan jika instansi sesuai
                        const triggerInstansiIds = [1, 2, 3, 4];
                        if (triggerInstansiIds.includes(data.instansi_id)) {
                            console.log(`   -> Instansi sesuai, mengisi pertanyaan perencanaan...`);
                            if (kebutuhan.digunakan_perencanaan === 'Ya') {
                                // Menggunakan label karena inputnya tersembunyi
                                await page.locator('label.custom-control-label[for="i0"]').click();
                            } else if (kebutuhan.digunakan_perencanaan === 'Tidak') {
                                await page.locator('label.custom-control-label[for="i1"]').click();
                            }
                        }

                        if (kebutuhan.kualitas_data) {
                             const ratingContainer = page.locator(`.field-verblok3-blok3_r_kualitas .rating-stars`);
                             const targetStar = ratingContainer.locator('.star').nth(kebutuhan.kualitas_data - 1);
                             await targetStar.hover();
                             await targetStar.click();
                        }
                    }
                }
                
                await page.locator('#form_blok3 button.save').click();
                await page.locator('#form-blok3').waitFor({ state: 'hidden' });
                await page.waitForTimeout(500);
                // await page.locator('#form-blok3').waitFor({ state: 'hidden' });
                console.log(`    ...rincian ${kebutuhan.rincian_data} berhasil disimpan.`);
            }
        }
        console.log("✅ Blok III selesai diisi.");
      }
        // Navigasi ke Blok IV
        console.log("Navigasi ke Blok IV...");
        // Bot akan mengklik tombol 'Selanjutnya' yang sesuai
        if (skipBlok3) {
            // Jika skip, berarti kita masih di Blok II, klik tombol 'Selanjutnya' di form Blok II
            await page.locator('form#w2 button[type="submit"]').click();
        } else {
            // Jika tidak skip, kita ada di Blok III, klik tombol 'Selanjutnya' di form Blok III
            await page.locator('#lanjutaja').click();
        }
        // await page.waitForNavigation(); // Tunggu halaman (Blok IV) termuat

        await page.locator('#verblok4-blok4_r_catatan').waitFor();
        console.log("Berhasil pindah ke Blok IV.");

        console.log("📝 Mengisi Blok IV: Catatan...");
        if (data.catatan) {
            await page.fill('#verblok4-blok4_r_catatan', data.catatan);
        }
        console.log("✅ Blok IV selesai diisi.");


        console.log("🚀 Menekan tombol 'Selesai'...");
        await page.locator('button[type="submit"].btn-success:has-text("Selesai")').click();
        
        // Tunggu beberapa detik untuk memastikan data terkirim
        await page.waitForTimeout(5000); 
        console.log("🎉 Formulir berhasil di-submit!");
        // await page.pause();
        
        // Update status di database menjadi 'sukses'
        await conn.execute("UPDATE respondents SET status = 'sukses' WHERE id = ?", [data.id]);
        console.log(`✔️ Status untuk ID ${data.id} telah diupdate menjadi 'sukses'.`);

    } catch (err) {
        console.error("❌ Gagal entri:", err);
        await page.screenshot({ path: 'screenshot_error.png' });
        await conn.execute("UPDATE respondents SET status = 'gagal' WHERE id = ?", [data.id]);
    } finally {
        console.log("Menutup browser...");
        await browser.close();
        await conn.end();
    }
})();