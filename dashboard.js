async function init() {
  // Halaman ini hanya untuk yang sudah login
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.href = 'auth.html';
    return;
  }

  const { data: profile, error } = await db
    .from('profiles')
    .select('nickname, plan, premium_until, is_admin')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    document.getElementById('hello').textContent = 'Halo, Teman!';
    return;
  }

  document.getElementById('hello').textContent = 'Halo, ' + fruitEmoji(profile.nickname) + ' ' + profile.nickname;
  document.getElementById('planBadge').textContent = (profile.plan === 'premium' && (!profile.premium_until || new Date(profile.premium_until) > new Date())) ? 'Premium' : 'Free';
  if (profile.is_admin) {
    const a = document.createElement('a');
    a.href = 'admin.html';
    a.className = 'btn ghost';
    a.textContent = 'Admin';
    a.style.marginRight = '.6rem';
    document.querySelector('header nav').prepend(a);
  }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  location.href = 'index.html';
});

init();

// Kalimat penyemangat harian
const QUOTES = [
  'Tidak apa-apa kalau hari ini belum baik-baik saja. Kamu boleh berhenti sejenak.',
  'Perasaan yang diceritakan biasanya terasa lebih ringan.',
  'Langkah kecil hari ini tetap langkah maju.',
  'Kamu tidak harus kuat sendirian.',
  'Istirahat bukan tanda menyerah, tapi bagian dari proses.'
];
document.getElementById('quote').textContent = QUOTES[new Date().getDate() % QUOTES.length];
