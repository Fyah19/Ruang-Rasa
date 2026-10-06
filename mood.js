let me = null, plan = 'free', selected = 0;
const $ = (id) => document.getElementById(id);
const MOODS = [
  { v: 1, e: '😞', t: 'Sangat buruk' },
  { v: 2, e: '🙁', t: 'Kurang baik' },
  { v: 3, e: '😐', t: 'Biasa saja' },
  { v: 4, e: '🙂', t: 'Baik' },
  { v: 5, e: '😄', t: 'Sangat baik' }
];
const COLORS = ['#9aa0c9', '#8E96E6', '#C7C2F2', '#FFCDAE', '#F59E72'];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const dayKey = (d) => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD (waktu lokal)

function buildPicker() {
  MOODS.forEach((m) => {
    const b = el('button', 'mood-btn');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.append(el('span', 'mood-emoji', m.e), el('span', 'mood-text', m.t));
    b.onclick = () => {
      selected = m.v;
      document.querySelectorAll('.mood-btn').forEach((x, i) => {
        x.classList.toggle('on', i === m.v - 1);
        x.setAttribute('aria-checked', i === m.v - 1);
      });
    };
    $('picker').append(b);
  });
}

async function load() {
  const days = plan === 'premium' ? 30 : 7;
  $('chartTitle').textContent = 'Mood ' + days + ' hari terakhir';
  $('upsell').hidden = plan === 'premium';

  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data, error } = await db.from('moods')
    .select('id, mood, note, created_at')
    .eq('user_id', me)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) { $('list').replaceChildren(el('p', 'msg', 'Gagal memuat: ' + error.message)); return; }

  // Grafik: mood terakhir per hari
  const byDay = {};
  [...data].reverse().forEach((r) => { byDay[dayKey(new Date(r.created_at))] = r.mood; });
  const chart = $('chart');
  chart.replaceChildren();
  chart.classList.toggle('dense', days > 7);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const v = byDay[dayKey(d)];
    const col = el('div', 'bar-col');
    const bar = el('div', 'bar');
    if (v) {
      bar.style.height = v * 20 + '%';
      bar.style.background = COLORS[v - 1];
      bar.title = d.toLocaleDateString('id-ID') + ': ' + MOODS[v - 1].t;
    } else {
      bar.classList.add('empty');
    }
    col.append(bar, el('span', 'bar-label', String(d.getDate())));
    chart.append(col);
  }

  const vals = Object.values(byDay);
  $('avg').textContent = vals.length
    ? 'Rata-rata: ' + (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + ' dari 5 (' + vals.length + ' hari tercatat)'
    : 'Belum ada catatan. Mulai dengan memilih mood di atas.';

  // Daftar catatan
  const list = $('list');
  list.replaceChildren();
  if (!data.length) { list.append(el('p', 'small', 'Belum ada catatan.')); return; }
  data.slice(0, 15).forEach((r) => {
    const m = MOODS[r.mood - 1];
    const row = el('div', 'entry');
    row.append(el('span', 'mood-emoji', m.e));
    const body = el('div', 'entry-body');
    body.append(el('strong', '', m.t));
    body.append(el('span', 'small', ' · ' + new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })));
    if (r.note) body.append(el('p', '', r.note));
    row.append(body);
    const del = el('button', 'link-btn', 'Hapus');
    del.type = 'button';
    del.onclick = async () => {
      if (!confirm('Hapus catatan ini?')) return;
      await db.from('moods').delete().eq('id', r.id);
      load();
    };
    row.append(del);
    list.append(row);
  });
}

$('saveBtn').addEventListener('click', async () => {
  const msg = $('msg');
  msg.className = 'msg';
  if (!selected) { msg.textContent = 'Pilih dulu mood kamu hari ini.'; return; }
  $('saveBtn').disabled = true;
  const { error } = await db.from('moods').insert({ mood: selected, note: $('note').value.trim() || null });
  $('saveBtn').disabled = false;
  if (error) { msg.textContent = 'Gagal menyimpan: ' + error.message; return; }
  msg.className = 'msg ok';
  msg.textContent = selected === 1
    ? 'Tersimpan. Hari yang berat ya. Kalau terasa terlalu berat, hubungi 119 ext. 8 atau ceritakan di Ruang Cerita.'
    : 'Mood tersimpan. Terima kasih sudah mengecek perasaanmu.';
  $('note').value = '';
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
  buildPicker();
  load();
})();
