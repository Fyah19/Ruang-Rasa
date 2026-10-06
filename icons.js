// Ikon (gaya garis, 24x24). Pakai: <span data-icon="heart" data-size="24"></span>
const ICONS = {
  logo: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M12 15.5s-3-1.9-3-4a1.7 1.7 0 0 1 3-1 1.7 1.7 0 0 1 3 1c0 2.1-3 4-3 4z"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.500 20.500 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.500-1.200 6.200-2.700a1.200 1.200 0 0 1 1.500 0C14.500 3.800 17 5 19 5a1 1 0 0 1 1 1z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eyeoff: '<path d="M9.900 9.900a3 3 0 1 0 4.200 4.200"/><path d="M10.700 5.100A10.400 10.400 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.700 2.700M6.600 6.600A13.500 13.500 0 0 0 2 12s3 7 10 7a9.700 9.700 0 0 0 5.400-1.600"/><path d="M2 2l20 20"/>',
  timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  list: '<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  cap: '<path d="M21.400 10.900a1 1 0 0 0 0-1.800L12.800 5.200a2 2 0 0 0-1.600 0L2.600 9.100a1 1 0 0 0 0 1.800l8.600 3.900a2 2 0 0 0 1.600 0z"/><path d="M22 10v6M6 12.500V16a6 3 0 0 0 12 0v-3.500"/>',
  calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  phone: '<path d="M22 16.900v3a2 2 0 0 1-2.200 2 19.800 19.800 0 0 1-8.600-3.100 19.500 19.500 0 0 1-6-6A19.800 19.800 0 0 1 2.100 4.200 2 2 0 0 1 4.100 2h3a2 2 0 0 1 2 1.700c.1 1 .4 1.900.7 2.800a2 2 0 0 1-.5 2.100L8.100 9.900a16 16 0 0 0 6 6l1.300-1.300a2 2 0 0 1 2.100-.4c.9.3 1.800.6 2.800.7a2 2 0 0 1 1.700 2z"/>',
  trend: '<path d="m22 7-8.500 8.500-5-5L2 17"/><path d="M16 7h6v6"/>',
  chart: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  star: '<path d="m12 2 3.100 6.300 6.900 1-5 4.900 1.200 6.900L12 17.800 5.800 21l1.200-6.900-5-4.900 6.900-1z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
};
function icon(n, s = 24) {
  return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
}
function paintIcons() {
  document.querySelectorAll('[data-icon]:not([data-done])').forEach((e) => {
    e.insertAdjacentHTML('afterbegin', icon(e.dataset.icon, +e.dataset.size || 24));
    e.dataset.done = 1;
  });
}
