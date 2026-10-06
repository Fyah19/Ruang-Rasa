// Menambahkan ikon logo dan footer ke semua halaman
const FOOTER = `
<footer class="site-footer">
  <div class="foot-grid">
    <div>
      <div class="foot-brand"><span data-icon="logo" data-size="26"></span> Ruang Rasa</div>
      <p>Ruang digital untuk bercerita, berkembang, dan menjalani hidup lebih seimbang. Cerita, Tumbuh, Bersama.</p>
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
  document.querySelectorAll('.logo').forEach((l) => { l.dataset.icon = 'logo'; l.dataset.size = 26; });
  if (!document.querySelector('footer')) document.body.insertAdjacentHTML('beforeend', FOOTER);
  paintIcons();
});
