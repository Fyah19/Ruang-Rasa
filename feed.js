let me = null;
let lastPost = 0;
const openPosts = new Set();
const $ = (id) => document.getElementById(id);

// Kata kunci yang memicu pesan bantuan (tambah sesuai kebutuhan)
const SENSITIVE = [
  'bunuh diri', 'mengakhiri hidup', 'akhiri hidup', 'ingin mati', 'pengen mati',
  'mau mati', 'menyakiti diri', 'nyakitin diri', 'self harm', 'selfharm',
  'nyilet', 'menyayat', 'gantung diri', 'tidak ingin hidup', 'gak ingin hidup',
  'capek hidup', 'lebih baik aku mati', 'overdosis'
];
const isSensitive = (t) => SENSITIVE.some((k) => t.toLowerCase().includes(k));

// Membuat elemen dengan textContent (aman dari XSS)
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  return Math.floor(s / 86400) + ' hari lalu';
}

async function loadFeed() {
  const { data, error } = await db
    .from('posts')
    .select('id, content, created_at, user_id, profiles!posts_user_id_fkey(nickname), replies(id, content, created_at, user_id, profiles!replies_user_id_fkey(nickname)), reactions(user_id)')
    .order('created_at', { ascending: false })
    .limit(50);

  const feed = $('feed');
  feed.replaceChildren();

  if (error) {
    feed.append(el('p', 'msg', 'Gagal memuat cerita: ' + error.message));
    return;
  }
  if (!data.length) {
    feed.append(el('p', 'small', 'Belum ada cerita. Jadi yang pertama berbagi.'));
    return;
  }
  data.forEach((p) => feed.append(renderPost(p)));
}

function renderPost(p) {
  const card = el('article', 'post');

  const head = el('div', 'post-head');
  head.append(el('strong', '', p.profiles?.nickname || 'Teman'));
  head.append(el('span', 'small', timeAgo(p.created_at)));
  if (p.user_id === me) {
    const del = el('button', 'link-btn', 'Hapus');
    del.type = 'button';
    del.onclick = async () => {
      if (!confirm('Hapus ceritamu?')) return;
      await db.from('posts').delete().eq('id', p.id);
      loadFeed();
    };
    head.append(del);
  }
  card.append(head);
  card.append(el('p', 'post-body', p.content));

  // Tombol peluk virtual
  let reacted = p.reactions.some((r) => r.user_id === me);
  let count = p.reactions.length;
  const actions = el('div', 'post-actions');
  const hug = el('button', 'chip');
  hug.type = 'button';
  const paintHug = () => {
    hug.textContent = 'Peluk virtual · ' + count;
    hug.classList.toggle('on', reacted);
    hug.setAttribute('aria-pressed', reacted);
  };
  paintHug();
  hug.onclick = async () => {
    hug.disabled = true;
    const { error } = reacted
      ? await db.from('reactions').delete().match({ post_id: p.id, user_id: me })
      : await db.from('reactions').insert({ post_id: p.id });
    if (!error) {
      reacted = !reacted;
      count += reacted ? 1 : -1;
      paintHug();
    }
    hug.disabled = false;
  };

  // Balasan
  const toggle = el('button', 'chip', 'Balas · ' + p.replies.length);
  toggle.type = 'button';
  const box = el('div', 'replies');
  box.hidden = !openPosts.has(p.id);
  toggle.onclick = () => {
    box.hidden = !box.hidden;
    box.hidden ? openPosts.delete(p.id) : openPosts.add(p.id);
  };
  actions.append(hug, toggle);
  card.append(actions);

  p.replies
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((r) => {
      const item = el('div', 'reply');
      item.append(el('strong', '', r.profiles?.nickname || 'Teman'));
      item.append(el('span', 'small', ' · ' + timeAgo(r.created_at)));
      item.append(el('p', '', r.content));
      box.append(item);
    });

  const form = el('div', 'reply-form');
  const input = el('input');
  input.maxLength = 1000;
  input.placeholder = 'Tulis balasan yang hangat...';
  input.setAttribute('aria-label', 'Tulis balasan');
  const send = el('button', 'btn', 'Kirim');
  send.type = 'button';
  send.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    const { error } = await db.from('replies').insert({ post_id: p.id, content: text });
    send.disabled = false;
    if (error) return alert('Gagal mengirim balasan: ' + error.message);
    openPosts.add(p.id);
    loadFeed();
  };
  form.append(input, send);
  box.append(form);
  card.append(box);

  return card;
}

// Kirim curhat
$('postText').addEventListener('input', (e) => {
  $('count').textContent = e.target.value.length + ' / 2000';
});

$('postBtn').addEventListener('click', async () => {
  const msg = $('postMsg');
  const text = $('postText').value.trim();
  msg.className = 'msg';
  if (!text) { msg.textContent = 'Tulis sesuatu dulu ya.'; return; }
  if (Date.now() - lastPost < 10000) {
    msg.textContent = 'Tunggu beberapa detik sebelum mengirim lagi.';
    return;
  }

  $('postBtn').disabled = true;
  const { error } = await db.from('posts').insert({ content: text });
  $('postBtn').disabled = false;

  if (error) { msg.textContent = 'Gagal mengirim: ' + error.message; return; }

  lastPost = Date.now();
  $('postText').value = '';
  $('count').textContent = '0 / 2000';
  msg.className = 'msg ok';
  msg.textContent = 'Ceritamu sudah terkirim.';
  if (isSensitive(text)) $('crisis').showModal();
  loadFeed();
});

$('crisisClose').onclick = () => $('crisis').close();

$('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  location.href = 'index.html';
});

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'auth.html'; return; }
  me = session.user.id;
  loadFeed();
})();
