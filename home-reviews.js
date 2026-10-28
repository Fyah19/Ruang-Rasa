// Menampilkan ulasan terbaru di landing page
(async function () {
  const box = document.getElementById('rvHome');
  const sum = document.getElementById('rvSummary');
  if (!box || !sum) return;

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  if (typeof db === 'undefined') { sum.textContent = 'Ulasan belum bisa dimuat.'; return; }

  const { data, error } = await db.from('reviews')
    .select('id, source, display_name, rating, content, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) { sum.textContent = 'Ulasan belum bisa dimuat.'; return; }
  if (!data.length) {
    sum.textContent = 'Belum ada ulasan. Jadilah yang pertama setelah mencoba Ruang Rasa.';
    box.hidden = true;
    return;
  }

  const rated = data.filter((r) => r.rating);
  if (rated.length) {
    const avg = (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(1);
    sum.textContent = '\u2605 ' + avg + ' / 5 dari ' + data.length + ' ulasan pengguna';
  } else {
    sum.textContent = data.length + ' ulasan pengguna';
  }

  box.replaceChildren();
  data.filter((r) => r.content || r.rating).slice(0, 12).forEach((r) => {
    const c = el('article', 'rev');
    const head = el('div', 'rev-head');
    if (r.source === 'system' && typeof avatar === 'function') head.append(avatar(r.display_name));
    head.append(el('strong', '', r.display_name));
    if (r.rating) {
      const st = el('span', 'stars', '\u2605'.repeat(r.rating) + '\u2606'.repeat(5 - r.rating));
      st.setAttribute('aria-label', 'Rating ' + r.rating + ' dari 5');
      head.append(st);
    }
    c.append(head);
    if (r.content) c.append(el('p', 'rev-text', r.content.length > 180 ? r.content.slice(0, 177) + '...' : r.content));
    c.append(el('p', 'small', r.source === 'whatsapp' ? 'Transaksi lewat WhatsApp' : r.source === 'user' ? 'Pengguna Ruang Rasa' : 'Transaksi terverifikasi di sistem'));
    box.append(c);
  });
  if (typeof makeSlider === 'function') makeSlider(box);
})();
