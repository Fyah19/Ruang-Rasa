let me = null, plan = 'free';
const FREE_LIMIT = 5;
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

async function load() {
  const { data, error } = await db.from('journals')
    .select('id, title, content, created_at')
    .eq('user_id', me)
    .order('created_at', { ascending: false });

  const list = $('list');
  list.replaceChildren();
  if (error) { list.append(el('p', 'msg', 'Gagal memuat: ' + error.message)); return; }

  // Kuota bulan ini
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
  const used = data.filter((j) => new Date(j.created_at) >= start).length;
  if (plan === 'premium') {
    $('quota').textContent = 'Premium: jurnal tanpa batas';
    $('upsell').hidden = true;
  } else {
    $('quota').textContent = 'Kuota bulan ini: ' + used + ' / ' + FREE_LIMIT;
    $('upsell').hidden = used < FREE_LIMIT;
  }

  if (!data.length) { list.append(el('p', 'small', 'Belum ada jurnal. Tulis yang pertama di atas.')); return; }

  data.forEach((j) => {
    const card = el('article', 'post');
    const head = el('div', 'post-head');
    head.append(el('strong', '', j.title || 'Tanpa judul'));
    head.append(el('span', 'small', new Date(j.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })));
    const del = el('button', 'link-btn', 'Hapus');
    del.type = 'button';
    del.onclick = async () => {
      if (!confirm('Hapus jurnal ini?')) return;
      await db.from('journals').delete().eq('id', j.id);
      load();
    };
    head.append(del);
    card.append(head, el('p', 'post-body', j.content));
    list.append(card);
  });
}

$('saveBtn').addEventListener('click', async () => {
  const msg = $('msg');
  msg.className = 'msg';
  const content = $('jContent').value.trim();
  if (!content) { msg.textContent = 'Isi jurnal tidak boleh kosong.'; return; }

  $('saveBtn').disabled = true;
  const { error } = await db.from('journals').insert({
    title: $('jTitle').value.trim() || null,
    content
  });
  $('saveBtn').disabled = false;

  if (error) {
    msg.textContent = error.message.includes('JOURNAL_LIMIT')
      ? 'Kuota jurnal gratis bulan ini sudah habis.'
      : 'Gagal menyimpan: ' + error.message;
    if (error.message.includes('JOURNAL_LIMIT')) $('upsell').hidden = false;
    return;
  }
  msg.className = 'msg ok';
  msg.textContent = 'Jurnal tersimpan.';
  $('jTitle').value = '';
  $('jContent').value = '';
  load();
});

$('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  location.href = 'index.html';
});

(async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'auth.html'; return; }
  me = session.user.id;
  const { data: p } = await db.from('profiles').select('plan').eq('id', me).single();
  if (p) plan = p.plan;
  load();
})();
