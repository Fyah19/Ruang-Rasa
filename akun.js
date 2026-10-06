const WA_NUMBER = '6289630970671';
const PRODUCTS = {
  premium_1m: { name: 'Premium 1 bulan' },
  session_1on1: { name: 'Sesi curhat 1-on-1' }
};
const STATUS = { paid: 'Lunas', pending: 'Menunggu pembayaran', cancelled: 'Dibatalkan' };

let me = null, nickname = '';
const $ = (id) => document.getElementById(id);
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function waLink(orderId, amount, product) {
  const text =
    'Halo admin Ruang Rasa, aku mau membeli ' + PRODUCTS[product].name + '.\n' +
    'Kode pesanan: ' + orderId + '\n' +
    'Nama samaran: ' + nickname + '\n' +
    'Nominal: ' + rp(amount) + '\n' +
    'Aku akan bayar lewat QRIS. Mohon dikirimkan kodenya.';
  return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
}

async function loadProfile() {
  const { data: p } = await db.from('profiles').select('nickname, plan, premium_until').eq('id', me).single();
  if (!p) return;
  nickname = p.nickname;
  $('nick').value = p.nickname;
  const prem = p.plan === 'premium' && (!p.premium_until || new Date(p.premium_until) > new Date());
  $('planName').textContent = prem ? 'Premium' : 'Free';
  $('planInfo').textContent = prem && p.premium_until
    ? 'Aktif sampai ' + new Date(p.premium_until).toLocaleDateString('id-ID', { dateStyle: 'long' })
    : 'Curhat dan dukungan teman selalu gratis. Upgrade untuk fitur tambahan.';
}

async function loadHistory() {
  const { data } = await db.from('payments')
    .select('order_id, amount, status, product, created_at')
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .limit(10);
  const box = $('history');
  box.replaceChildren();
  if (!data || !data.length) { box.append(el('p', 'small', 'Belum ada pesanan.')); return; }
  data.forEach((r) => {
    const row = el('div', 'entry');
    const body = el('div', 'entry-body');
    body.append(el('strong', '', (PRODUCTS[r.product]?.name || r.product) + ' - ' + rp(r.amount)));
    body.append(el('p', 'small',
      r.order_id + ' · ' +
      new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) +
      ' · ' + (STATUS[r.status] || r.status)));
    row.append(body);
    if (r.status === 'pending') {
      const a = el('a', 'link-btn', 'Buka WhatsApp');
      a.href = waLink(r.order_id, r.amount, r.product);
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.textDecoration = 'underline';
      a.style.color = 'var(--indigo)';
      row.append(a);
    }
    box.append(row);
  });
}

document.querySelectorAll('[data-product]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const key = btn.dataset.product;
    const msg = $('payMsg');
    msg.className = 'msg';
    msg.textContent = '';
    document.querySelectorAll('[data-product]').forEach((b) => (b.disabled = true));

    const { data, error } = await db.rpc('create_order', { p_product: key });

    document.querySelectorAll('[data-product]').forEach((b) => (b.disabled = false));
    if (error) {
      msg.textContent = error.message.includes('TOO_MANY_PENDING')
        ? 'Kamu masih punya 3 pesanan yang belum dibayar. Selesaikan atau hubungi admin dulu.'
        : 'Gagal membuat pesanan: ' + error.message;
      return;
    }
    const o = data[0];
    $('orderCode').textContent = o.o_id;
    $('orderInfo').textContent = PRODUCTS[key].name + ', ' + rp(o.o_amount);
    $('waLink').href = waLink(o.o_id, o.o_amount, key);
    $('orderBox').hidden = false;
    $('orderBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    loadHistory();
  });
});

$('nickBtn').addEventListener('click', async () => {
  const msg = $('nickMsg');
  const nick = $('nick').value.trim();
  msg.className = 'msg';
  if (nick.length < 3) { msg.textContent = 'Nama samaran minimal 3 karakter.'; return; }
  const { error } = await db.from('profiles').update({ nickname: nick }).eq('id', me);
  if (error) { msg.textContent = 'Gagal menyimpan: ' + error.message; return; }
  nickname = nick;
  msg.className = 'msg ok';
  msg.textContent = 'Nama samaran diperbarui.';
});

$('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  location.href = 'index.html';
});

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'auth.html'; return; }
  me = session.user.id;
  await loadProfile();
  loadHistory();
})();
