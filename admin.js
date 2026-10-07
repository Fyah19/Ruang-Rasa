let rows = [], premiumActive = 0;
const $ = (id) => document.getElementById(id);
const NAMES = { premium_1m: 'Premium 1 bulan', session_1on1: 'Sesi teman curhat 1-on-1' };
const STATUS = { paid: 'Lunas', pending: 'Menunggu', cancelled: 'Dibatalkan' };
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const fmtDate = (iso) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

async function load() {
  const { data, error } = await db.from('payments')
    .select('order_id, amount, status, product, method, note, created_at, confirmed_at, profiles(nickname)')
    .order('created_at', { ascending: false });
  if (error) { $('pending').replaceChildren(el('p', 'msg', 'Gagal memuat: ' + error.message)); return; }
  rows = data;

  const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
    .eq('plan', 'premium').gt('premium_until', new Date().toISOString());
  premiumActive = count || 0;

  renderStats(); renderChart(); renderPending(); renderTable();
}

function renderStats() {
  const paid = rows.filter((r) => r.status === 'paid');
  const total = paid.reduce((s, r) => s + r.amount, 0);
  const pending = rows.filter((r) => r.status === 'pending').length;
  const cards = [
    ['Total pendapatan', rp(total), 'trend'],
    ['Transaksi lunas', paid.length, 'check'],
    ['Menunggu konfirmasi', pending, 'timer'],
    ['Premium aktif', premiumActive, 'star']
  ];
  $('stats').replaceChildren(...cards.map(([label, val, ic]) => {
    const c = el('div', 'stat');
    const i = el('span', 'ico');
    i.dataset.icon = ic;
    c.append(i, el('span', 'small', label), el('strong', '', String(val)));
    return c;
  }));
  paintIcons();

  const per = {};
  paid.forEach((r) => { per[r.product] = (per[r.product] || 0) + r.amount; });
  $('byProduct').textContent = Object.keys(per).length
    ? 'Per produk: ' + Object.entries(per).map(([k, v]) => (NAMES[k] || k) + ' ' + rp(v)).join(' · ')
    : 'Belum ada transaksi lunas.';
}

function renderChart() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: d.toLocaleDateString('sv-SE').slice(0, 7), label: d.toLocaleDateString('id-ID', { month: 'short' }), sum: 0 });
  }
  rows.filter((r) => r.status === 'paid').forEach((r) => {
    const k = new Date(r.confirmed_at || r.created_at).toLocaleDateString('sv-SE').slice(0, 7);
    const m = months.find((x) => x.key === k);
    if (m) m.sum += r.amount;
  });
  const max = Math.max(...months.map((m) => m.sum), 1);
  const chart = $('chart');
  chart.replaceChildren();
  months.forEach((m) => {
    const col = el('div', 'bar-col');
    col.append(el('span', 'bar-val', m.sum ? rp(m.sum) : ''));
    const bar = el('div', 'bar');
    bar.style.height = Math.max((m.sum / max) * 85, 3) + '%';
    bar.style.background = m.sum ? 'var(--periwinkle)' : 'var(--lavender)';
    bar.title = m.label + ': ' + rp(m.sum);
    col.append(bar, el('span', 'bar-label', m.label));
    chart.append(col);
  });
}

function renderPending() {
  const box = $('pending');
  box.replaceChildren();
  const list = rows.filter((r) => r.status === 'pending');
  if (!list.length) { box.append(el('p', 'small', 'Tidak ada pesanan yang menunggu.')); return; }
  list.forEach((r) => {
    const card = el('div', 'pending-card');
    const info = el('div', 'entry-body');
    info.append(el('strong', '', r.order_id + ' · ' + (NAMES[r.product] || r.product) + ' · ' + rp(r.amount)));
    info.append(el('p', 'small', (r.profiles?.nickname || 'Pembeli') + ' · dipesan ' + fmtDate(r.created_at)));

    const method = el('select');
    ['QRIS', 'Transfer bank', 'Tunai'].forEach((m) => method.append(new Option(m, m)));
    method.setAttribute('aria-label', 'Metode pembayaran');
    const note = el('input');
    note.placeholder = 'Catatan (opsional)';
    note.maxLength = 200;
    note.setAttribute('aria-label', 'Catatan');

    const ok = el('button', 'btn', 'Konfirmasi lunas');
    ok.type = 'button';
    ok.onclick = async () => {
      if (!confirm('Pastikan uang ' + rp(r.amount) + ' dari pesanan ' + r.order_id + ' sudah masuk. Lanjutkan?')) return;
      ok.disabled = true;
      const { error } = await db.rpc('confirm_order', { p_order: r.order_id, p_method: method.value, p_note: note.value.trim() || null });
      if (error) { alert('Gagal: ' + error.message); ok.disabled = false; return; }
      load();
    };
    const no = el('button', 'link-btn', 'Batalkan');
    no.type = 'button';
    no.onclick = async () => {
      if (!confirm('Batalkan pesanan ' + r.order_id + '?')) return;
      const { error } = await db.rpc('cancel_order', { p_order: r.order_id });
      if (error) { alert('Gagal: ' + error.message); return; }
      load();
    };

    const actions = el('div', 'pending-actions');
    actions.append(method, note, ok, no);
    card.append(info, actions);
    box.append(card);
  });
}

function renderTable() {
  const tb = $('rows');
  tb.replaceChildren();
  if (!rows.length) {
    const tr = el('tr'); const td = el('td', '', 'Belum ada transaksi.'); td.colSpan = 7; tr.append(td); tb.append(tr);
    return;
  }
  rows.forEach((r) => {
    const tr = el('tr');
    [fmtDate(r.created_at), r.order_id, r.profiles?.nickname || '-', NAMES[r.product] || r.product,
     rp(r.amount), r.method || '-', STATUS[r.status] || r.status].forEach((v) => tr.append(el('td', '', v)));
    tb.append(tr);
  });
}

// Export CSV (sel yang diawali = + - @ diberi tanda kutip agar aman dibuka di Excel)
function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
$('csvBtn').addEventListener('click', () => {
  const head = ['Tanggal pesan', 'Tanggal konfirmasi', 'Kode', 'Pembeli', 'Produk', 'Nominal', 'Metode', 'Status', 'Catatan'];
  const lines = [head.map(csvCell).join(',')];
  rows.forEach((r) => lines.push([
    r.created_at, r.confirmed_at || '', r.order_id, r.profiles?.nickname || '',
    NAMES[r.product] || r.product, r.amount, r.method || '', STATUS[r.status] || r.status, r.note || ''
  ].map(csvCell).join(',')));
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'laporan-keuangan-ruang-rasa.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  location.href = 'index.html';
});

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'auth.html'; return; }
  const { data: p } = await db.from('profiles').select('is_admin').eq('id', session.user.id).single();
  if (!p || !p.is_admin) { location.href = 'dashboard.html'; return; }
  load();
  loadReviews();
})();

// ===== Ulasan dan bukti transaksi =====
const rvPub = (p) => db.storage.from('review-images').getPublicUrl(p).data.publicUrl;

function rvCompress(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Gambar gagal diproses'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error('File bukan gambar yang valid'));
    img.src = url;
  });
}

async function rvUpload(file) {
  if (!file) return null;
  const blob = await rvCompress(file);
  const path = 'wa/' + crypto.randomUUID() + '.jpg';
  const { error } = await db.storage.from('review-images').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

async function rvRemove(paths) {
  const list = paths.filter(Boolean);
  if (list.length) await db.storage.from('review-images').remove(list);
}

$('rvSave').addEventListener('click', async () => {
  const msg = $('rvMsg');
  msg.className = 'msg';
  const name = $('rvName').value.trim();
  const text = $('rvText').value.trim();
  const chatFile = $('rvChat').files[0];
  const proofFile = $('rvProof').files[0];
  if (!name) { msg.textContent = 'Isi nama tampilan.'; return; }
  if (!text && !chatFile && !proofFile) { msg.textContent = 'Isi testimoni atau unggah minimal satu gambar.'; return; }
  if (!$('rvConsent').checked) { msg.textContent = 'Centang persetujuan pelanggan dan penyamaran data pribadi.'; return; }

  $('rvSave').disabled = true;
  let chat = null, proof = null;
  try {
    chat = await rvUpload(chatFile);
    proof = await rvUpload(proofFile);
  } catch (e) {
    await rvRemove([chat, proof]);
    $('rvSave').disabled = false;
    msg.textContent = 'Gagal mengunggah gambar: ' + e.message;
    return;
  }
  const { error } = await db.from('reviews').insert({
    source: 'whatsapp', display_name: name,
    order_id: $('rvOrder').value.trim() || null,
    rating: Number($('rvRating').value) || null,
    content: text || null, chat_path: chat, proof_path: proof
  });
  $('rvSave').disabled = false;
  if (error) { await rvRemove([chat, proof]); msg.textContent = 'Gagal menyimpan: ' + error.message; return; }

  msg.className = 'msg ok';
  msg.textContent = 'Ulasan tersimpan dan tampil di halaman Ulasan.';
  ['rvName', 'rvOrder', 'rvText', 'rvChat', 'rvProof'].forEach((id) => ($(id).value = ''));
  $('rvRating').value = '';
  $('rvConsent').checked = false;
  loadReviews();
});

async function loadReviews() {
  const { data, error } = await db.from('reviews')
    .select('id, source, display_name, rating, content, chat_path, proof_path, published, created_at')
    .order('created_at', { ascending: false });
  const box = $('rvList');
  box.replaceChildren();
  if (error) { box.append(el('p', 'msg', 'Gagal memuat ulasan: ' + error.message)); return; }
  if (!data.length) { box.append(el('p', 'small', 'Belum ada ulasan.')); return; }

  data.forEach((r) => {
    const row = el('div', 'entry');
    const body = el('div', 'entry-body');
    body.append(el('strong', '', r.display_name));
    body.append(el('span', 'small', ' \u00b7 ' + (r.source === 'whatsapp' ? 'WhatsApp' : 'Sistem') +
      ' \u00b7 ' + (r.rating ? r.rating + '/5' : 'tanpa rating') +
      ' \u00b7 ' + (r.published ? 'Tampil' : 'Disembunyikan')));
    if (r.content) body.append(el('p', 'small', r.content));
    [['Lihat chat', r.chat_path], ['Lihat bukti bayar', r.proof_path]].forEach(([label, path]) => {
      if (!path) return;
      const a = el('a', 'small', label);
      a.href = rvPub(path);
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.marginRight = '.8rem';
      body.append(a);
    });
    row.append(body);

    const toggle = el('button', 'link-btn', r.published ? 'Sembunyikan' : 'Tampilkan');
    toggle.type = 'button';
    toggle.style.color = 'var(--indigo)';
    toggle.onclick = async () => {
      await db.from('reviews').update({ published: !r.published }).eq('id', r.id);
      loadReviews();
    };
    const del = el('button', 'link-btn', 'Hapus');
    del.type = 'button';
    del.onclick = async () => {
      if (!confirm('Hapus ulasan dari ' + r.display_name + '?')) return;
      await rvRemove([r.chat_path, r.proof_path]);
      await db.from('reviews').delete().eq('id', r.id);
      loadReviews();
    };
    row.append(toggle, del);
    box.append(row);
  });
}
