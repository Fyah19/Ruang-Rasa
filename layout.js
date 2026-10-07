// Menambahkan logo, favicon, dan footer ke semua halaman
const FOOTER = `
<footer class="site-footer">
  <div class="foot-grid">
    <div>
      <div class="foot-brand"><img src="logo-icon.png" alt="" width="40" height="38"> Ruang Rasa</div>
      <p>Ruang digital untuk bercerita, berkembang, dan menjalani hidup lebih seimbang. Cerita, Tumbuh, Bersama.</p>
      <div class="socials">
        <a href="https://www.instagram.com/ruangrasa.my.id" target="_blank" rel="noopener"><span data-icon="instagram" data-size="20"></span> @ruangrasa.my.id</a>
        <a href="https://www.tiktok.com/@ruangrasa.my.id" target="_blank" rel="noopener"><span data-icon="tiktok" data-size="20"></span> @ruangrasa.my.id</a>
      </div>
    </div>
    <div>
      <h4>Jelajahi</h4>
      <a href="index.html#fitur">Fitur</a>
      <a href="index.html#harga">Harga</a>
      <a href="index.html#roadmap">Roadmap</a>
      <a href="index.html#faq">FAQ</a>
    </div>
    <div>
      <h4>Ruangmu</h4>
      <a href="feed.html">Curhat</a>
      <a href="mood.html">Mood Tracker</a>
      <a href="journal.html">Jurnal</a>
      <a href="akun.html">Akun</a>
    </div>
    <div>
      <h4>Bantuan</h4>
      <p>Layanan kesehatan jiwa<br><strong>119 ext. 8</strong></p>
      <a href="https://wa.me/6289630970671" target="_blank" rel="noopener">Hubungi admin via WhatsApp</a>
    </div>
  </div>
  <div class="foot-bottom">
    <span>Ruang Rasa adalah dukungan sebaya, bukan pengganti psikolog atau psikiater.</span>
    <span>&copy; 2026 Ruang Rasa. Dibuat untuk tugas mata kuliah produk digital.</span>
  </div>
</footer>`;

document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('link[rel="icon"]')) {
    const f = document.createElement('link');
    f.rel = 'icon';
    f.href = 'favicon.png';
    document.head.append(f);
  }
  const NAVICONS = { 'feed.html': 'message', 'mood.html': 'smile', 'journal.html': 'book', 'akun.html': 'user' };
  document.querySelectorAll('.appnav a').forEach((a) => {
    const n = NAVICONS[a.getAttribute('href')];
    if (n) { a.dataset.icon = n; a.dataset.size = 18; }
  });
  document.querySelectorAll('.logo').forEach((l) =>
    l.insertAdjacentHTML('afterbegin', '<img src="logo-icon.png" alt="" width="38" height="35">'));
  if (!document.querySelector('footer')) document.body.insertAdjacentHTML('beforeend', FOOTER);
  paintIcons();
});
