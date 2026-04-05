/* ═══════════════════════════════
   auth.js  ─  Auth + App Shell
═══════════════════════════════ */
const API = '';
let currentUser = null;

// ── TAB SWITCHER ──────────────────────────────────────
function showTab(t) {
  const tabs = ['login','userReg','companyReg','admin'];
  tabs.forEach((id, i) => {
    document.getElementById(id + 'Tab').classList.toggle('hidden', id !== t);
  });
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', tabs[i] === t);
  });
}

// ── LOGIN ─────────────────────────────────────────────
async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPw').value;
  if (!email || !pw) return showAuthMsg('Please fill all fields', 'error');
  try {
    const r = await fetch(`${API}/api/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw, role: 'user' })
    });
    const d = await r.json();
    if (!r.ok) return showAuthMsg(d.error, 'error');
    currentUser = { email, name: d.name, role: d.role };
    initApp();
  } catch (e) { showAuthMsg('Server error. Is Flask running?', 'error'); }
}

async function registerUser() {
  const name = document.getElementById('uRegName').value.trim();
  const email = document.getElementById('uRegEmail').value.trim();
  const pw = document.getElementById('uRegPw').value;
  if (!name || !email || !pw) return showAuthMsg('Please fill all fields', 'error');
  try {
    const r = await fetch(`${API}/api/register/user`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pw })
    });
    const d = await r.json();
    if (!r.ok) return showAuthMsg(d.error, 'error');
    showAuthMsg(d.message, 'success');
    setTimeout(() => showTab('login'), 1500);
  } catch (e) { showAuthMsg('Server error', 'error'); }
}

async function registerCompany() {
  const name = document.getElementById('cRegName').value.trim();
  const email = document.getElementById('cRegEmail').value.trim();
  const pw = document.getElementById('cRegPw').value;
  const company_name = document.getElementById('cRegCompany').value.trim();
  const industry = document.getElementById('cRegIndustry').value.trim();
  const website = document.getElementById('cRegWebsite').value.trim();
  const description = document.getElementById('cRegDesc').value.trim();
  if (!name || !email || !pw || !company_name)
    return showAuthMsg('Name, Email, Password and Company Name are required', 'error');
  try {
    const r = await fetch(`${API}/api/register/company`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pw, company_name, industry, website, description })
    });
    const d = await r.json();
    if (!r.ok) return showAuthMsg(d.error, 'error');
    showAuthMsg(d.message, 'success');
    setTimeout(() => showTab('admin'), 2000);
  } catch (e) { showAuthMsg('Server error', 'error'); }
}

async function adminLogin() {
  const username = document.getElementById('adminUser').value.trim();
  const pw = document.getElementById('adminPw').value;
  try {
    const r = await fetch(`${API}/api/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, username, password: pw, role: 'admin' })
    });
    const d = await r.json();
    if (!r.ok) return showAuthMsg(d.error, 'error');
    currentUser = { email: username, name: d.name, role: d.role, company: d.company || '' };
    initApp();
  } catch (e) { showAuthMsg('Server error', 'error'); }
}

async function logout() {
  await fetch(`${API}/api/logout`, { method: 'POST', credentials: 'include' });
  currentUser = null;
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('notifBellSlot').innerHTML = '';
  document.getElementById('msgBellSlot').innerHTML = '';
}

function showAuthMsg(msg, type) {
  const el = document.getElementById('authMsg');
  el.className = `auth-msg ${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// ── INIT APP ──────────────────────────────────────────
function initApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');

  const isAdmin = currentUser.role === 'admin';
  const isRecruiter = currentUser.role === 'recruiter';
  const isUser = currentUser.role === 'user';

  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    ...(isUser ? [
      { id: 'profile', icon: '👤', label: 'My Profile' },
      { id: 'upload', icon: '📄', label: 'Upload Resume' },
      { id: 'recommend', icon: '🎯', label: 'Get Jobs' },
      { id: 'myapps', icon: '📋', label: 'My Applications' },
      { id: 'chatbot', icon: '🤖', label: 'CareerBot' },
      { id: 'interview', icon: '🧪', label: 'Interview Prep' },
    ] : []),
    { id: 'jobs', icon: '💼', label: 'Browse Jobs' },
    { id: 'trends', icon: '📈', label: 'Job Trends' },
    ...(isAdmin ? [{ id: 'admin', icon: '⚙️', label: 'Admin Panel' }] : []),
    ...((isAdmin || isRecruiter) ? [
      { id: 'postjob', icon: '➕', label: 'Post a Job' },
      { id: 'hrapps', icon: '📥', label: 'Applications' },
    ] : []),
  ];

  document.getElementById('navLinks').innerHTML = navItems.map(n => `
    <button class="nav-item" id="nav-${n.id}" onclick="navigate('${n.id}')">
      <span class="icon">${n.icon}</span>${n.label}
    </button>`).join('');

  document.getElementById('sidebarUser').innerHTML = `
    <div class="u-name">${currentUser.name}</div>
    <div class="u-role">${currentUser.role.toUpperCase()}${currentUser.company ? ' · ' + currentUser.company : ''}</div>`;

  // Notification bell (users only)
  if (isUser) {
    document.getElementById('notifBellSlot').innerHTML = `
      <div id="notifBell" style="position:relative;cursor:pointer" onclick="toggleNotifPanel()">
        <span style="font-size:1.3rem">🔔</span>
        <span id="notifCount" class="bell-badge hidden">0</span>
      </div>
      <div id="notifPanel" class="notif-panel hidden"></div>`;

    document.getElementById('msgBellSlot').innerHTML = `
      <div id="msgBell" style="position:relative;cursor:pointer" onclick="navigate('myapps')">
        <span style="font-size:1.3rem">💬</span>
        <span id="msgCount" class="bell-badge hidden">0</span>
      </div>`;

    startPolling();
  }

  navigate('dashboard');
}

// ── NAVIGATE ──────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const btn = document.getElementById('nav-' + page);
  if (btn) btn.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', profile: 'My Profile', upload: 'Upload Resume',
    recommend: 'AI Job Recommendations', myapps: 'My Applications',
    chatbot: 'CareerBot AI', interview: 'Interview Preparation',
    jobs: 'Browse Jobs', trends: 'Job Trends', admin: 'Admin Panel',
    postjob: 'Post a Job', hrapps: 'Applicant Review',
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  const pages = {
    dashboard: renderDashboard, profile: renderProfile, upload: renderUpload,
    recommend: renderRecommend, myapps: renderMyApplications,
    chatbot: renderChatbot, interview: renderInterview,
    jobs: renderJobs, trends: renderTrends, admin: renderAdmin,
    postjob: renderPostJob, hrapps: renderHRApplications,
  };
  if (pages[page]) pages[page]();
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ── NOTIFICATIONS ─────────────────────────────────────
let notifData = [];
let pollTimer = null;

function startPolling() {
  fetchNotifications();
  fetchMsgCount();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => { fetchNotifications(); fetchMsgCount(); }, 15000);
}

async function fetchNotifications() {
  try {
    const r = await fetch(`${API}/api/notifications`, { credentials: 'include' });
    notifData = await r.json();
    const unread = notifData.filter(n => !n.is_read).length;
    const cnt = document.getElementById('notifCount');
    if (cnt) {
      cnt.textContent = unread;
      cnt.classList.toggle('hidden', !unread);
    }
  } catch (e) {}
}

async function fetchMsgCount() {
  try {
    const r = await fetch(`${API}/api/messages/unread`, { credentials: 'include' });
    const d = await r.json();
    const cnt = document.getElementById('msgCount');
    if (cnt) {
      cnt.textContent = d.count;
      cnt.classList.toggle('hidden', !d.count);
    }
  } catch (e) {}
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    renderNotifPanel(panel);
    fetch(`${API}/api/notifications/read`, { method: 'POST', credentials: 'include' });
    const cnt = document.getElementById('notifCount');
    if (cnt) cnt.classList.add('hidden');
  }
}

function renderNotifPanel(panel) {
  panel.innerHTML = `
    <div class="notif-header">
      🔔 Notifications
      <button onclick="document.getElementById('notifPanel').classList.add('hidden')" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:1.1rem">×</button>
    </div>
    <div class="notif-body">
      ${notifData.length ? notifData.map(n => `
        <div class="notif-item ${!n.is_read ? 'unread' : ''}">
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${n.created_at || ''}</div>
        </div>`).join('') : '<div class="notif-empty">No notifications yet</div>'}
    </div>`;
}

// Close panels on outside click
document.addEventListener('click', e => {
  const np = document.getElementById('notifPanel');
  const nb = document.getElementById('notifBell');
  if (np && nb && !np.contains(e.target) && !nb.contains(e.target))
    np.classList.add('hidden');
});

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  const isErr = type === 'error';
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:14px 20px;
    border-radius:10px;font-size:.88rem;max-width:340px;animation:fadeIn .3s ease;
    background:${isErr ? 'rgba(255,101,132,.15)' : 'rgba(67,233,123,.15)'};
    border:1px solid ${isErr ? 'rgba(255,101,132,.3)' : 'rgba(67,233,123,.3)'};
    color:${isErr ? 'var(--accent2)' : 'var(--accent3)'}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ── SHARED HELPERS ────────────────────────────────────
const COURSES = {
  "machine learning": [{ name: "ML by Andrew Ng", url: "https://coursera.org/learn/machine-learning", pl: "Coursera" }],
  "python": [{ name: "Python Bootcamp", url: "https://www.udemy.com/course/complete-python-bootcamp/", pl: "Udemy" }],
  "sql": [{ name: "SQL for Data Science", url: "https://coursera.org/learn/sql-for-data-science", pl: "Coursera" }],
  "react": [{ name: "React - Complete Guide", url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/", pl: "Udemy" }],
  "deep learning": [{ name: "Deep Learning Spec.", url: "https://coursera.org/specializations/deep-learning", pl: "Coursera" }],
  "tensorflow": [{ name: "TF Developer Cert.", url: "https://coursera.org/professional-certificates/tensorflow-in-practice", pl: "Coursera" }],
  "aws": [{ name: "AWS Cloud Practitioner", url: "https://aws.amazon.com/training/", pl: "AWS" }],
  "docker": [{ name: "Docker Mastery", url: "https://www.udemy.com/course/docker-mastery/", pl: "Udemy" }],
  "nlp": [{ name: "NLP with Python", url: "https://www.udemy.com/course/nlp-natural-language-processing-with-python/", pl: "Udemy" }],
  "javascript": [{ name: "JS Complete Guide", url: "https://www.udemy.com/course/javascript-the-complete-guide-2020-beginner-advanced/", pl: "Udemy" }],
  "kubernetes": [{ name: "Kubernetes for Beginners", url: "https://coursera.org/learn/google-kubernetes-engine", pl: "Coursera" }],
};

async function renderDashboard() {
  const area = document.getElementById('contentArea');
  const jobs = await fetch(`${API}/api/jobs`, { credentials: 'include' }).then(r => r.json()).catch(() => []);
  const cats = [...new Set(jobs.map(j => j.category))].length;
  area.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">💼</div><div class="stat-val">${jobs.length}</div><div class="stat-label">Total Jobs</div></div>
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-val">${cats}</div><div class="stat-label">Categories</div></div>
      <div class="stat-card"><div class="stat-icon">🤖</div><div class="stat-val">AI</div><div class="stat-label">Powered Engine</div></div>
      <div class="stat-card"><div class="stat-icon">💬</div><div class="stat-val">Live</div><div class="stat-label">HR Messaging</div></div>
    </div>
    <div class="section-title">✨ Featured Jobs</div>
    <div class="card-grid">${jobs.slice(0, 6).map(j => jobCardHTML(j, false)).join('')}</div>`;
}

function jobCardHTML(job, showGap = false) {
  const score = job.match_score || 0;
  const cls = score >= 60 ? 'match-high' : score >= 30 ? 'match-mid' : 'match-low';
  const skills = job.skills_list || (job.skills || '').split(',').map(s => s.trim());
  const matched = job.matched_skills || [];
  const missing = job.missing_skills || [];
  const rest = skills.filter(s => !matched.includes(s.toLowerCase()) && !missing.includes(s.toLowerCase())).slice(0, 3);
  return `<div class="job-card">
    <div class="job-header">
      <div class="job-title">${job.title}</div>
      ${score > 0 ? `<span class="match-badge ${cls}">${score.toFixed(0)}%</span>` : ''}
    </div>
    <div class="job-company">🏢 ${job.company} &nbsp;·&nbsp; 📍 ${job.location} &nbsp;·&nbsp; 💰 ${job.salary || 'N/A'}</div>
    ${score > 0 ? `<div class="progress-bar"><div class="progress-fill" data-w="${score}%" style="width:0%"></div></div>` : ''}
    <div class="job-tags">
      ${matched.map(s => `<span class="tag matched">✓ ${s}</span>`).join('')}
      ${missing.map(s => `<span class="tag missing">✗ ${s}</span>`).join('')}
      ${rest.map(s => `<span class="tag">${s}</span>`).join('')}
    </div>
    <div class="job-footer">
      <button class="btn-sm btn-apply" onclick="applyJob(${job.id},'${job.title.replace(/'/g, "\\'")}','${job.company.replace(/'/g, "\\'")}')">Apply 🚀</button>
      ${showGap && missing.length ? `<button class="btn-sm btn-gap" onclick="toggleGap(${job.id})">Skill Gap 🧠</button>` : ''}
    </div>
    ${showGap && missing.length ? `<div id="gap-${job.id}" class="gap-panel hidden">${buildGapPanel(job, matched, missing)}</div>` : ''}
  </div>`;
}

function buildGapPanel(job, matched, missing) {
  const courses = missing.flatMap(s => (COURSES[s.toLowerCase()] || []).map(c => ({ ...c, skill: s })));
  return `<h4>📊 Skill Gap: ${job.title}</h4>
    <div class="gap-row">
      ${matched.map(s => `<span class="gap-skill have">✅ ${s}</span>`).join('')}
      ${missing.map(s => `<span class="gap-skill need">❌ ${s}</span>`).join('')}
    </div>
    ${courses.length ? `<div class="course-list">${courses.slice(0, 3).map(c => `
      <div class="course-item"><span>🎯 ${c.skill} → ${c.name}</span><a href="${c.url}" target="_blank">${c.pl} →</a></div>`).join('')}</div>` : ''}`;
}

function toggleGap(id) {
  document.getElementById(`gap-${id}`)?.classList.toggle('hidden');
}

async function applyJob(jobId, title, company) {
  if (!confirm(`Apply for "${title}" at ${company}?`)) return;
  try {
    const r = await fetch(`${API}/api/apply`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId })
    });
    const d = await r.json();
    if (!r.ok) return showToast(d.error, 'error');
    showToast(d.message, 'success');
  } catch (e) { showToast('Server error', 'error'); }
}
