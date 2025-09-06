// skd-monitoring.js
const { chromium } = require("playwright");

// ============================ PENGATURAN ============================
// Ganti dengan kredensial login Anda ke website SKD asli
const loginUrl = "https://skd.bps.go.id/SKD2025/web/site/loginsso"; 
const monitoringUrl = "https://skd.bps.go.id/SKD2025/web/entri/responden/index";
const username = "renata.delarosa"; // Ganti dengan username SSO Anda
const password = "IPDSPinrang2025"; // Ganti dengan password SSO Anda
// ====================================================================

(async () => {
    const browser = await chromium.launch({ headless: false }); // Ganti ke true jika ingin jalan di background
    const page = await browser.newPage();
    
    try {
        // 1. Login ke SSO
        console.log("Mencoba login ke SSO...");
        await page.goto(loginUrl);
        await page.fill("#username", username);
        await page.fill("#password", password);
        await page.click("#kc-login");
        // await page.waitForNavigation();
        console.log("Login berhasil.");

        console.log("Mencari dan mengklik link 'Responden' di sidebar...");
        await page.locator('a[href="/SKD2025/web/entri/responden/index"]').click();
        await page.waitForURL('**/responden/index'); // Tunggu URL berubah
        await page.locator('#responden_wrapper').waitFor(); // Tunggu tabelnya muncul
        console.log("Berhasil masuk ke halaman data responden.");

        // 2. Buka halaman monitoring
        console.log("Membuka halaman data responden...");
        await page.goto(monitoringUrl);
        await page.locator('#responden_wrapper').waitFor(); // Tunggu tabelnya muncul

        // 3. "Baca" semua baris dari tabel
        const scrapedData = [];
        let pageCounter = 1;

        while (true) { // Loop akan berjalan selamanya sampai kita hentikan
            console.log(`Membaca data dari halaman ${pageCounter}...`);
            const tableRows = await page.locator('#responden tbody tr').all();

            for (const row of tableRows) {
                const cells = await row.locator('td').all();
                if (cells.length > 1) {
                    scrapedData.push({
                        nama: (await cells[2].textContent()).trim(),
                        email: (await cells[4].textContent()).trim(),
                        tanggal_cacah: (await cells[10].textContent()).trim(),
                    });
                }
            }

            // Cek status tombol "Next" dengan cara baru
            const nextButtonListItem = page.locator('#responden_next');
            const nextButtonClass = await nextButtonListItem.getAttribute('class');

            // Jika kelasnya mengandung kata "disabled", hentikan loop
            if (nextButtonClass.includes('disabled')) {
                hasNextPage = false;
                console.log("Sudah di halaman terakhir. Menghentikan proses baca.");
                break; // Keluar dari loop while
            } else {
                console.log("Pindah ke halaman berikutnya...");
                await nextButtonListItem.click();
                await page.waitForTimeout(1000); 
                pageCounter++;
            }
        }
        // ======================================================

        console.log(`Total data yang berhasil dibaca: ${scrapedData.length}`);
        console.log(JSON.stringify(scrapedData, null, 2));



    } catch (error) {
        console.error("Terjadi error saat scraping:", error);
        process.exit(1); // Keluar dengan status error
    } finally {
        await browser.close();
    }
})();