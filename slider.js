// Mengubah daftar kartu menjadi slider geser (swipe di HP, tombol panah di desktop)
function makeSlider(track) {
  if (!track || track.dataset.slider) return;
  track.dataset.slider = '1';

  const wrap = document.createElement('div');
  wrap.className = 'slider';
  track.parentNode.insertBefore(wrap, track);
  wrap.append(track);
  track.classList.add('slider-track');
  track.tabIndex = 0;
  track.setAttribute('aria-label', 'Daftar ulasan, geser untuk melihat lainnya');

  const mk = (cls, label, txt) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slider-btn ' + cls;
    b.setAttribute('aria-label', label);
    b.textContent = txt;
    return b;
  };
  const prev = mk('prev', 'Ulasan sebelumnya', '‹');
  const next = mk('next', 'Ulasan berikutnya', '›');
  wrap.append(prev, next);

  const step = () => {
    const first = track.firstElementChild;
    return first ? first.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
  };
  prev.onclick = () => track.scrollBy({ left: -step(), behavior: 'smooth' });
  next.onclick = () => track.scrollBy({ left: step(), behavior: 'smooth' });

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const scrollable = max > 4;
    prev.hidden = !scrollable || track.scrollLeft < 4;
    next.hidden = !scrollable || track.scrollLeft > max - 4;
  };
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // gambar yang dimuat belakangan bisa mengubah lebar
  track.addEventListener('load', update, true);
  update();
}
