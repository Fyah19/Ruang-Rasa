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
    .select('id, content, created_at, user_id, image_path, profiles!posts_user_id_fkey(nickname), replies(id, content, created_at, user_id, profiles!replies_user_id_fkey(nickname)), reactions(user_id)')
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
  const paths = data.filter((p) => p.image_path).map((p) => p.image_path);
  const urls = {};
  if (paths.length) {
    const { data: signed } = await db.storage.from('post-images').createSignedUrls(paths, 3600);
    (signed || []).forEach((s) => { if (s.signedUrl) urls[s.path] = s.signedUrl; });
  }
  data.forEach((p) => feed.append(renderPost(p, urls)));
}

function renderPost(p, urls = {}) {
  const card = el('article', 'post');

  const head = el('div', 'post-head');
  head.append(avatar(p.profiles?.nickname), el('strong', '', p.profiles?.nickname || 'Teman'));
  head.append(el('span', 'small', timeAgo(p.created_at)));
  if (p.user_id === me) {
    const del = el('button', 'link-btn', 'Hapus');
    del.type = 'button';
    del.insertAdjacentHTML('afterbegin', icon('trash', 14));
    del.onclick = async () => {
      if (!confirm('Hapus ceritamu?')) return;
      if (p.image_path) await db.storage.from('post-images').remove([p.image_path]);
      await db.from('posts').delete().eq('id', p.id);
      loadFeed();
    };
    head.append(del);
  }
  card.append(head);
  if (p.content) card.append(el('p', 'post-body', p.content));
  if (p.image_path && urls[p.image_path]) {
    const img = el('img', 'post-img');
    img.src = urls[p.image_path];
    img.alt = 'Foto yang dibagikan';
    img.loading = 'lazy';
    card.append(img);
  }

  // Tombol peluk virtual
  let reacted = p.reactions.some((r) => r.user_id === me);
  let count = p.reactions.length;
  const actions = el('div', 'post-actions');
  const hug = el('button', 'chip');
  hug.type = 'button';
  const paintHug = () => {
    hug.textContent = '🤗 Peluk virtual · ' + count;
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
  toggle.insertAdjacentHTML('afterbegin', icon('message', 16));
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
      item.append(avatar(r.profiles?.nickname), ' ', el('strong', '', r.profiles?.nickname || 'Teman'));
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
  send.insertAdjacentHTML('afterbegin', icon('send', 16));
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
  if (!text && !pickedFile) { msg.textContent = 'Tulis sesuatu atau pilih foto dulu ya.'; return; }
  if (Date.now() - lastPost < 10000) {
    msg.textContent = 'Tunggu beberapa detik sebelum mengirim lagi.';
    return;
  }

  $('postBtn').disabled = true;
  let imagePath = null;
  if (pickedFile) {
    try {
      const blob = await compressImage(pickedFile);
      imagePath = me + '/' + crypto.randomUUID() + '.jpg';
      const { error: upErr } = await db.storage.from('post-images').upload(imagePath, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
    } catch (e) {
      $('postBtn').disabled = false;
      msg.textContent = 'Gagal mengunggah foto: ' + e.message;
      return;
    }
  }
  const { error } = await db.from('posts').insert({ content: text, image_path: imagePath });
  $('postBtn').disabled = false;
  if (error && imagePath) await db.storage.from('post-images').remove([imagePath]);

  if (error) { msg.textContent = 'Gagal mengirim: ' + error.message; return; }

  lastPost = Date.now();
  $('postText').value = '';
  clearPick();
  $('count').textContent = '0 / 2000';
  msg.className = 'msg ok';
  msg.textContent = 'Ceritamu sudah terkirim.';
  if (isSensitive(text)) $('crisis').showModal();
  loadFeed();
});

// ---- Foto: dikompres dan dire-encode di browser (data lokasi/EXIF ikut terhapus)
let pickedFile = null;

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Foto gagal diproses'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => reject(new Error('File bukan gambar yang valid'));
    img.src = url;
  });
}

function clearPick() {
  pickedFile = null;
  $('fileInput').value = '';
  $('preview').hidden = true;
}

$('photoBtn').onclick = () => $('fileInput').click();
$('removeImg').onclick = clearPick;
$('fileInput').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const msg = $('postMsg');
  msg.className = 'msg';
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { msg.textContent = 'Gunakan foto berformat JPG, PNG, atau WebP.'; clearPick(); return; }
  if (f.size > 10 * 1024 * 1024) { msg.textContent = 'Ukuran foto maksimal 10 MB.'; clearPick(); return; }
  msg.textContent = '';
  pickedFile = f;
  $('previewImg').src = URL.createObjectURL(f);
  $('preview').hidden = false;
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
