const form = document.getElementById('authForm');
const msg = document.getElementById('msg');
const submitBtn = document.getElementById('submitBtn');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
let mode = 'login';

function setMode(m) {
  mode = m;
  const isLogin = m === 'login';
  tabLogin.classList.toggle('active', isLogin);
  tabRegister.classList.toggle('active', !isLogin);
  document.getElementById('title').textContent = isLogin ? 'Selamat datang kembali' : 'Buat ruangmu';
  document.getElementById('subtitle').textContent = isLogin
    ? 'Masuk untuk melanjutkan ceritamu.'
    : 'Daftar gratis. Curhat tidak pernah dibatasi.';
  document.getElementById('password').autocomplete = isLogin ? 'current-password' : 'new-password';
  submitBtn.textContent = isLogin ? 'Masuk' : 'Daftar gratis';
  msg.textContent = '';
}

tabLogin.onclick = () => setMode('login');
tabRegister.onclick = () => setMode('register');
if (new URLSearchParams(location.search).get('mode') === 'register') setMode('register');

// Kalau sudah login, langsung ke dashboard
db.auth.getSession().then(({ data }) => {
  if (data.session) location.href = 'dashboard.html';
});

function translateError(err) {
  const t = (err.message || '').toLowerCase();
  if (t.includes('invalid login')) return 'Email atau kata sandi salah.';
  if (t.includes('already registered')) return 'Email ini sudah terdaftar. Coba masuk.';
  if (t.includes('at least 6')) return 'Kata sandi minimal 6 karakter.';
  if (t.includes('valid email') || t.includes('invalid email')) return 'Format email belum benar.';
  if (t.includes('not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masukmu.';
  if (t.includes('rate limit')) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  return 'Terjadi masalah: ' + err.message;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.className = 'msg';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || password.length < 6) {
    msg.textContent = 'Isi email dan kata sandi (minimal 6 karakter).';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Memproses...';

  const { data, error } = mode === 'login'
    ? await db.auth.signInWithPassword({ email, password })
    : await db.auth.signUp({ email, password });

  submitBtn.disabled = false;
  submitBtn.textContent = mode === 'login' ? 'Masuk' : 'Daftar gratis';

  if (error) {
    msg.textContent = translateError(error);
    return;
  }
  if (data.session) {
    location.href = 'dashboard.html';
  } else {
    msg.className = 'msg ok';
    msg.textContent = 'Pendaftaran berhasil. Cek email untuk konfirmasi, lalu masuk.';
  }
});
