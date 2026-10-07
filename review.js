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
    return;
  }

  const wa = data.filter((r) => r.source === 'whatsapp');
  const sys = data.filter((r) => r.source === 'system');
  const rated = data.filter((r) => r.rating);
  const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : '-';

  const cards = [
    ['Rating rata-rata', avg + ' / 5', 'star'],
    ['Total ulasan', data.length, 'message'],
    ['Via WhatsApp', wa.length, 'phone'],
    ['Via sistem', sys.length, 'check']
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
  paintIcons();
})();
