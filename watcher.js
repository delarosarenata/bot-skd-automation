// watcher.js — proses per-ID dari file job di automation\queue
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');

// ===== DB config (samain dgn .env) =====
const db = { host:'127.0.0.1', user:'root', password:'', database:'db_penilaian_pelayanan', port:3306, connectTimeout:10000 };

// ===== Path =====
const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const BOT_DIR = 'C:\\laragon\\www\\automation';
const SKD_ENTRI = path.join(BOT_DIR, 'skd-entri.js');
const QUEUE_DIR = path.join(BOT_DIR, 'queue');     // <-- folder job files
const INTERVAL_MS = 3000;

// Ambil satu file job-*.json (FIFO berdasar nama)
function ambilSatuJobFile() {
  if (!fs.existsSync(QUEUE_DIR)) fs.mkdirSync(QUEUE_DIR, { recursive: true });
  const files = fs.readdirSync(QUEUE_DIR).filter(f => /^job-\d+\.json$/i.test(f)).sort();
  return files.length ? path.join(QUEUE_DIR, files[0]) : null;
}

async function setStatus(conn, id, statusCol, statusVal) {
  // ganti 'status' -> 'status_entri' kalau kolommu itu
  const col = statusCol || 'status';
  await conn.execute(`UPDATE respondents SET ${col} = ? WHERE id = ?`, [statusVal, id]);
}

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(db);
    await conn.ping();
    console.log('✅ Watcher siap. Menunggu file job di:', QUEUE_DIR);

    for (;;) {
      const jobFile = ambilSatuJobFile();
      if (!jobFile) { process.stdout.write('.'); await new Promise(r => setTimeout(r, INTERVAL_MS)); continue; }

      // Baca JSON responden dari file job
      const raw = fs.readFileSync(jobFile, 'utf8');
      let row;
      try { row = JSON.parse(raw); } catch(e) {
        console.error('\n❌ Job rusak:', jobFile, e.message);
        fs.unlinkSync(jobFile);
        continue;
      }

      console.log(`\n▶ Memproses ID ${row.id} - ${row.nama}`);

      // Jalankan bot dengan payload JSON
      const payload = JSON.stringify(row);
      const child = spawn(NODE, [SKD_ENTRI, payload], { cwd: BOT_DIR });

      let err = '';
      child.stderr.on('data', d => err += d.toString());

      const code = await new Promise(resolve => child.on('close', resolve));

      if (code === 0) {
        console.log(`✅ Sukses ID ${row.id}`);
        await setStatus(conn, row.id, /*statusCol=*/'status', /*statusVal=*/'sukses'); // <-- ganti ke 'status_entri' kalau perlu
      } else {
        console.log(`❌ Gagal ID ${row.id}`);
        if (err) console.log(err);
        await setStatus(conn, row.id, 'status', 'gagal'); // <-- ganti ke 'status_entri' kalau perlu
      }

      // Hapus file job supaya nggak diulang
      try { fs.unlinkSync(jobFile); } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) {
    console.error('❌ Watcher error:', e.message);
  } finally {
    if (conn) { try { await conn.end(); } catch {} }
  }
})();
