// ---------- Данные ----------
const services = [
  { id: 'manicure',  name: 'Маникюр',    duration: 60,  price: 2000 },
  { id: 'gel',       name: 'Гель-лак',   duration: 90,  price: 3000 },
  { id: 'extension', name: 'Наращивание', duration: 150, price: 4500 }
];

const masters = [
  { id: 'anna',  name: 'Анна' },
  { id: 'maria', name: 'Мария' }
];

const times = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'];

const USERS_KEY    = 'demoManicureUsers';
const SESSION_KEY  = 'demoManicureSession';
const BOOKINGS_KEY = 'demoManicureBookings';

const $ = (id) => document.getElementById(id);

// ---------- Инициализация селектов ----------
services.forEach((s) => {
  $('service').insertAdjacentHTML(
    'beforeend',
    `<option value="${s.id}">${s.name} — ${s.price} ₽ / ${s.duration} мин</option>`
  );
});

masters.forEach((m) => {
  $('master').insertAdjacentHTML(
    'beforeend',
    `<option value="${m.id}">${m.name}</option>`
  );
});

// ---------- Работа с пользователями ----------
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch (e) { return []; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const email = localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  return getUsers().find((u) => u.email === email) || null;
}

function setSession(email) { localStorage.setItem(SESSION_KEY, email); }
function clearSession()    { localStorage.removeItem(SESSION_KEY); }

// ---------- UI авторизации ----------
function showAuthTab(tab) {
  const isLogin = tab === 'login';
  $('tabLogin').classList.toggle('active', isLogin);
  $('tabRegister').classList.toggle('active', !isLogin);
  $('loginForm').classList.toggle('hidden', !isLogin);
  $('registerForm').classList.toggle('hidden', isLogin);
}

$('tabLogin').addEventListener('click', () => showAuthTab('login'));
$('tabRegister').addEventListener('click', () => showAuthTab('register'));

function showMsg(el, text, type = 'info') {
  const node = $(el);
  node.className = 'msg ' + type;
  node.textContent = text;
}

$('doRegister').addEventListener('click', () => {
  const name     = $('regName').value.trim();
  const email    = $('regEmail').value.trim().toLowerCase();
  const password = $('regPassword').value;

  if (!name || !email || !password) {
    showMsg('regMsg', 'Заполните все поля', 'err');
    return;
  }
  if (getUsers().some((u) => u.email === email)) {
    showMsg('regMsg', 'Пользователь с таким email уже существует', 'err');
    return;
  }

  const users = getUsers();
  users.push({ name, email, password }); // демо: пароль в открытом виде
  saveUsers(users);
  setSession(email);
  showMsg('regMsg', 'Регистрация успешна! Входим...', 'ok');
  setTimeout(updateAuthUI, 500);
});

$('doLogin').addEventListener('click', () => {
  const email    = $('loginEmail').value.trim().toLowerCase();
  const password = $('loginPassword').value;

  const user = getUsers().find((u) => u.email === email && u.password === password);
  if (!user) {
    showMsg('loginMsg', 'Неверный email или пароль', 'err');
    return;
  }
  setSession(email);
  showMsg('loginMsg', 'Вход выполнен', 'ok');
  updateAuthUI();
});

$('logoutBtn').addEventListener('click', () => {
  clearSession();
  updateAuthUI();
});

function updateAuthUI() {
  const user = getCurrentUser();
  const loggedIn = !!user;

  $('authCard').classList.toggle('hidden', loggedIn);
  $('bookingSection').classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    $('currentUserName').textContent = user.name;
    renderBookings();
  } else {
    showAuthTab('login');
    $('loginPassword').value = '';
    $('regPassword').value = '';
  }
}

// ---------- Записи ----------
function getBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || []; }
  catch (e) { return []; }
}
function saveBookings(b) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(b));
}

function isBusy(master, date, time) {
  return getBookings().some(
    (b) => b.master === master && b.date === date && b.time === time
  );
}

function updateTimes() {
  const master = $('master').value;
  const date   = $('date').value;
  const sel    = $('time');
  sel.innerHTML = '';

  if (!master || !date) {
    sel.innerHTML = '<option value="">Сначала выберите дату и мастера</option>';
    return;
  }

  sel.innerHTML = '<option value="">Выберите время</option>';
  times.forEach((t) => {
    const busy = isBusy(master, date, t);
    sel.insertAdjacentHTML(
      'beforeend',
      `<option value="${t}" ${busy ? 'disabled' : ''}>${t}${busy ? ' — занято' : ''}</option>`
    );
  });
}

$('master').addEventListener('change', updateTimes);
$('date').addEventListener('change', updateTimes);

// Переход к оплате
let pendingBooking = null;

$('submitBtn').addEventListener('click', () => {
  const user = getCurrentUser();
  if (!user) return;

  const service = $('service').value;
  const master  = $('master').value;
  const date    = $('date').value;
  const time    = $('time').value;
  const phone   = $('phone').value.trim();

  if (!service || !master || !date || !time || !phone) {
    showMsg('bookingMsg', 'Заполните все поля', 'err');
    return;
  }
  if (isBusy(master, date, time)) {
    showMsg('bookingMsg', 'Это время уже занято, выберите другое', 'err');
    updateTimes();
    return;
  }

  pendingBooking = { service, master, date, time, phone, userEmail: user.email };
  $('paymentCard').classList.remove('hidden');
  showMsg('bookingMsg', 'Данные сохранены. Заполните платёжные данные ниже.', 'ok');
  $('paymentCard').scrollIntoView({ behavior: 'smooth' });
});

// Демо-оплата
$('payBtn').addEventListener('click', () => {
  if (!pendingBooking) {
    showMsg('payMsg', 'Сначала выберите услугу и время', 'err');
    return;
  }

  const card   = $('cardNumber').value.replace(/\s/g, '');
  const expiry = $('cardExpiry').value.trim();
  const cvc    = $('cardCvc').value.trim();

  if (card.length < 12 || !expiry || cvc.length < 3) {
    showMsg('payMsg', 'Введите любые корректные на вид данные карты', 'err');
    return;
  }

  showMsg('payMsg', 'Обработка платежа...', 'info');
  $('payBtn').disabled = true;

  // Имитация задержки платёжного шлюза
  setTimeout(() => {
    const bookings = getBookings();
    bookings.push({
      id: Date.now(),
      ...pendingBooking,
      paid: true,
      paidAt: new Date().toISOString()
    });
    saveBookings(bookings);

    $('payBtn').disabled = false;
    $('paymentCard').classList.add('hidden');
    $('cardNumber').value = '';
    $('cardExpiry').value = '';
    $('cardCvc').value = '';
    pendingBooking = null;

    showMsg('bookingMsg', 'Оплата прошла успешно (демо). Вы записаны!', 'ok');
    $('time').value = '';
    updateTimes();
    renderBookings();
  }, 1200);
});

// Отрисовка записей текущего пользователя
function renderBookings() {
  const user = getCurrentUser();
  if (!user) return;

  const my = getBookings().filter((b) => b.userEmail === user.email);
  if (!my.length) {
    $('bookings').textContent = 'Пока нет записей';
    return;
  }

  $('bookings').innerHTML = my.map((b) => {
    const s = services.find((v) => v.id === b.service)?.name || b.service;
    const m = masters.find((v) => v.id === b.master)?.name || b.master;
    const status = b.paid
      ? '<span class="paid">Оплачено</span>'
      : '<span class="unpaid">Не оплачено</span>';
    return `<div>${b.date} ${b.time} — ${s}, ${m} — ${status}</div>`;
  }).join('');
}

// ---------- Старт ----------
updateAuthUI();