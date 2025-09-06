// index.js

const { chromium } = require('playwright');

// --- KONFIGURASI ---
// Ganti dengan URL halaman login SSO BPS yang sebenarnya
const loginUrl = '<URL_HALAMAN_LOGIN_SSO_ANDA>'; 

// Ganti dengan username dan password Anda
const username = '<USERNAME_ANDA>';
const password = '<PASSWORD_ANDA>';

// Ganti dengan selektor yang Anda temukan saat inspect element
const usernameSelector = '#username'; // Contoh: '#username' atau '[name="username"]'
const passwordSelector = '#password'; // Contoh: '#password' atau '[name="password"]'
const loginButtonSelector = '#login-button'; // Contoh: '#login-button' atau 'button[type="submit"]'


async function main() {
    console.log('Membuka browser...');
    const browser = await chromium.launch({ headless: false, slowMo: 100 }); // slowMo memberi jeda agar kita bisa lihat prosesnya
    const page = await browser.newPage();

    try {
        console.log(`Membuka halaman login: ${loginUrl}`);
        await page.goto(loginUrl);

        console.log('Mencari input username dan password...');
        // 1. Mengisi username
        await page.fill(usernameSelector, username);
        console.log('Username diisi.');

        // 2. Mengisi password
        await page.fill(passwordSelector, password);
        console.log('Password diisi.');
        
        console.log('Mencoba mengklik tombol login...');
        // 3. Mengklik tombol login
        await page.click(loginButtonSelector);
        
        // 4. Tunggu navigasi setelah login selesai
        // Ini penting agar bot menunggu halaman berikutnya termuat
        await page.waitForNavigation();
        console.log('Berhasil login! Halaman setelah login termuat.');
        
        // 5. Ambil screenshot SETELAH berhasil login
        await page.screenshot({ path: 'screenshot_setelah_login.png' });
        console.log('Screenshot setelah login berhasil disimpan.');

    } catch (error) {
        console.error('Terjadi kesalahan saat proses login:', error);
        // Jika gagal, ambil screenshot halaman saat ini untuk debug
        await page.screenshot({ path: 'screenshot_gagal_login.png' });
        console.log('Screenshot saat gagal login disimpan untuk analisis.');
    } finally {
        console.log('Proses selesai. Browser akan ditutup.');
        await browser.close();
    }
}

main();