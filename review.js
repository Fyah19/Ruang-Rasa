const $ = (id) => document.getElementById(id);
const pub = (p) => db.storage.from('review-images').getPublicUrl(p).data.publicUrl;
const dateId = (iso) => new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'medium' });

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function starsEl(n) {
  if (!n) return null;
  const s = el('span', 'stars', '\u2605'.repeat(n) + '\u2606'.repeat(5 - n));
  s.setAttribute('aria-label', 'Rating ' + n + ' dari 5');
  return s;
}

function figure(path, label) {
  const f = el('figure');
  const img = el('img');
  img.src = pub(path);
  img.alt = label;
  img.loading = 'lazy';
  img.onclick = () => {
    $('lbImg').src = img.src;
    $('lbImg').alt = label;
    $('lightbox').showModal();
  };
  f.append(img, el('figcaption', '', label));
  return f;
}

function waCard(r) {
  const c = el('article', 'rev');
  const head = el('div', 'rev-head');
  head.append(el('strong', '', r.display_name));
  const st = starsEl(r.rating);
  if (st) head.append(st);
  c.append(head, el('p', 'small', dateId(r.created_at)));
  if (r.content) c.append(el('p', 'rev-text', r.content));
  if (r.chat_path || r.proof_path) {
    const g = el('div', 'rev-imgs');
    if (r.chat_path) g.append(figure(r.chat_path, 'Chat testimoni'));
    if (r.proof_path) g.append(figure(r.proof_path, 'Bukti pembayaran'));
    c.append(g);
  }
  return c;
}

function usrCard(r) {
  const c = waCard(r);
  return c;
}

function sysCard(r) {
  const c = el('article', 'rev');
  const head = el('div', 'rev-head');
  head.append(avatar(r.display_name), el('strong', '', r.display_name));
  const st = starsEl(r.rating);
  if (st) head.append(st);
  c.append(head, el('p', 'small', dateId(r.created_at) + ' \u00b7 Transaksi terverifikasi di sistem'));
  if (r.content) c.append(el('p', 'rev-text', r.content));
  return c;
}

function fill(box, list, build, emptyText) {
  box.replaceChildren();
  if (!list.length) { box.append(el('p', 'small', emptyText)); return; }
  list.forEach((r) => box.append(build(r)));
  makeSlider(box);
}

$('lbClose').onclick = () => $('lightbox').close();

(async function init() {
  const { data, error } = await db.from('reviews')
    .select('id, source, display_name, rating, content, chat_path, proof_path, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    $('wa').replaceChildren(el('p', 'msg', 'Gagal memuat ulasan: ' + error.message));
    $('sys').replaceChildren();
    $('usr').replaceChildren();
    return;
  }

  const wa = data.filter((r) => r.source === 'whatsapp');
  const sys = data.filter((r) => r.source === 'system');
  const usr = data.filter((r) => r.source === 'user');
  const rated = data.filter((r) => r.rating);
  const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : '-';

  const cards = [
    ['Rating rata-rata', avg + ' / 5', 'star'],
    ['Total ulasan', data.length, 'message'],
    ['Via WhatsApp', wa.length, 'phone'],
    ['Via sistem', sys.length + usr.length, 'check']
  ];
  $('sum').replaceChildren(...cards.map(([label, val, ic]) => {
    const c = el('div', 'stat');
    const i = el('span', 'ico');
    i.dataset.icon = ic;
    c.append(i, el('span', 'small', label), el('strong', '', String(val)));
    return c;
  }));

  fill($('wa'), wa, waCard, 'Belum ada ulasan dari transaksi WhatsApp.');
  fill($('sys'), sys, sysCard, 'Belum ada ulasan dari transaksi sistem.');
  fill($('usr'), usr, usrCard, 'Belum ada ulasan lain. Jadilah yang pertama!');
  paintIcons();
})();

// Kalau pengguna sudah login, tampilkan menu aplikasi (bukan tombol Masuk)
document.addEventListener('DOMContentLoaded', async function authNav() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  const nav = document.querySelector('header .appnav');
  if (!nav) return;
  nav.replaceChildren();
  [['feed.html', 'message', 'Curhat'], ['mood.html', 'smile', 'Mood'], ['journal.html', 'book', 'Jurnal'],
   ['review.html', 'star', 'Ulasan'], ['akun.html', 'user', 'Akun']].forEach(([h, i, t]) => {
    const a = document.createElement('a');
    a.href = h; a.dataset.icon = i; a.dataset.size = 18; a.textContent = t;
    nav.append(a);
  });
  const out = el('button', 'btn ghost', 'Keluar');
  out.type = 'button';
  out.onclick = async () => { await db.auth.signOut(); location.href = 'index.html'; };
  nav.append(out);
  const logo = document.querySelector('.logo');
  if (logo) logo.href = 'dashboard.html';
  paintIcons();
  buildTabbar();
});

// ===== Pengguna menulis ulasan sendiri =====
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

(async function userReview() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { $('rvLoginHint').hidden = false; return; }
  const me = session.user.id;
  $('rvForm').hidden = false;

  let rating = 0;
  const stars = $('uStars');
  const paint = () => stars.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i < rating));
  for (let i = 1; i <= 5; i++) {
    const b = el('button', 'star-btn', '\u2605');
    b.type = 'button';
    b.setAttribute('aria-label', i + ' bintang');
    b.onclick = () => { rating = i; paint(); };
    stars.append(b);
  }

  async function upload(file) {
    if (!file) return null;
    if (file.size > 15 * 1024 * 1024) throw new Error('Ukuran gambar terlalu besar (maksimal 15 MB).');
    const blob = await rvCompress(file);
    const path = me + '/' + crypto.randomUUID() + '.jpg';
    const { error } = await db.storage.from('review-images').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    return path;
  }
  const remove = async (list) => {
    const l = list.filter(Boolean);
    if (l.length) await db.storage.from('review-images').remove(l);
  };

  async function mine() {
    const { data } = await db.from('reviews')
      .select('id, rating, content, published, chat_path, proof_path, created_at')
      .eq('user_id', me).is('order_id', null).order('created_at', { ascending: false });
    const box = $('myReviews');
    box.replaceChildren();
    if (!data || !data.length) return;
    box.append(el('p', 'small', 'Ulasanmu:'));
    data.forEach((r) => {
      const row = el('div', 'entry');
      const body = el('div', 'entry-body');
      body.append(el('span', 'small', (r.rating ? '\u2605'.repeat(r.rating) + ' \u00b7 ' : '') + dateId(r.created_at) + ' \u00b7 ' +
        (r.published ? 'Tampil' : 'Menunggu persetujuan admin')));
      if (r.content) body.append(el('p', 'small', r.content));
      const del = el('button', 'link-btn', 'Hapus');
      del.type = 'button';
      del.onclick = async () => {
        if (!confirm('Hapus ulasanmu?')) return;
        await remove([r.chat_path, r.proof_path]);
        await db.from('reviews').delete().eq('id', r.id);
        mine();
        location.reload();
      };
      row.append(body, del);
      box.append(row);
    });
  }
  mine();

  $('rvForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('uMsg');
    msg.className = 'msg';
    const text = $('uText').value.trim();
    const chatFile = $('uChat').files[0];
    const proofFile = $('uProof').files[0];
    if (!rating) { msg.textContent = 'Pilih rating bintang dulu.'; return; }
    if (!text && !chatFile && !proofFile) { msg.textContent = 'Tulis ulasan atau unggah minimal satu gambar.'; return; }
    if (!$('uConsent').checked) { msg.textContent = 'Centang persetujuan dan penyamaran data pribadi.'; return; }

    $('uSend').disabled = true;
    let chat = null, proof = null;
    try {
      chat = await upload(chatFile);
      proof = await upload(proofFile);
    } catch (err) {
      await remove([chat, proof]);
      $('uSend').disabled = false;
      msg.textContent = 'Gagal mengunggah gambar: ' + err.message;
      return;
    }
    const { data: status, error } = await db.rpc('submit_user_review', {
      p_rating: rating, p_content: text, p_chat: chat, p_proof: proof
    });
    $('uSend').disabled = false;
    if (error) {
      await remove([chat, proof]);
      msg.textContent = /LIMIT/.test(error.message)
        ? 'Kamu sudah mengirim 3 ulasan. Hapus salah satu dulu kalau mau menulis lagi.'
        : 'Gagal mengirim: ' + error.message;
      return;
    }
    msg.className = 'msg ok';
    msg.textContent = (chat || proof)
      ? 'Terima kasih! Ulasanmu menunggu persetujuan admin sebelum tampil.'
      : 'Terima kasih! Ulasanmu sudah tampil.';
    rating = 0; paint();
    ['uText', 'uChat', 'uProof'].forEach((id) => ($(id).value = ''));
    $('uConsent').checked = false;
    mine();
    if (!(chat || proof)) setTimeout(() => location.reload(), 1200);
  });
})();
