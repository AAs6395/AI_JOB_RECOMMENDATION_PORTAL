/* ═══════════════════════════════════════
   user.js  ─  Job Seeker Features
═══════════════════════════════════════ */

// ── PROFILE ───────────────────────────────────────────
async function renderProfile() {
  const area = document.getElementById('contentArea');
  let p = {};
  try { p = await fetch(`${API}/api/profile`, { credentials: 'include' }).then(r => r.json()); } catch (e) {}
  const skills = Array.isArray(p.skills) ? p.skills : [];
  area.innerHTML = `
    <div class="card">
      <div class="section-title">👤 My Profile</div>
      <div class="form-grid">
        <div class="form-group"><label>Full Name</label><input type="text" id="pName" value="${p.name || currentUser.name || ''}" disabled style="opacity:.6"></div>
        <div class="form-group"><label>Education</label><input type="text" id="pEdu" placeholder="B.Tech CSE, XYZ University" value="${p.education || ''}"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Experience</label><input type="text" id="pExp" placeholder="2 years as Python Developer" value="${p.experience || ''}"></div>
      </div>
      <div class="form-group">
        <label>Skills <span style="color:var(--text3);font-size:.75rem">(press Enter to add)</span></label>
        <div class="skills-input-area" id="skillsArea">
          ${skills.map(s => `<span class="skill-chip">${s}<button onclick="this.parentElement.remove()">×</button></span>`).join('')}
          <input class="skill-type-input" placeholder="Type a skill and press Enter..." onkeydown="addSkillChip(event)">
        </div>
      </div>
      <button class="btn-primary" style="max-width:200px" onclick="saveProfile()">Save Profile</button>
      <div id="profileMsg"></div>
    </div>`;
}

function addSkillChip(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(',', '');
    if (!val) return;
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.innerHTML = `${val}<button onclick="this.parentElement.remove()">×</button>`;
    document.getElementById('skillsArea').insertBefore(chip, e.target);
    e.target.value = '';
  }
}

async function saveProfile() {
  const skills = [...document.querySelectorAll('#skillsArea .skill-chip')]
    .map(c => c.textContent.replace('×', '').trim()).filter(Boolean);
  const body = { skills, education: document.getElementById('pEdu').value, experience: document.getElementById('pExp').value };
  const r = await fetch(`${API}/api/profile`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  document.getElementById('profileMsg').innerHTML = `<div class="alert alert-success" style="margin-top:12px">✅ ${d.message}</div>`;
}

// ── UPLOAD RESUME ─────────────────────────────────────
function renderUpload() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <div class="section-title">📄 Upload Resume</div>
      <div class="upload-zone" id="dropZone" onclick="document.getElementById('resumeFile').click()"
           ondragover="event.preventDefault();this.classList.add('drag-over')"
           ondragleave="this.classList.remove('drag-over')"
           ondrop="handleDrop(event)">
        <div class="upload-icon">📤</div>
        <h3>Drop your PDF resume here</h3>
        <p>Auto-extracts skills, education & experience · Scores ATS compatibility</p>
        <input type="file" id="resumeFile" accept=".pdf" onchange="uploadResume(this.files[0])" style="display:none">
      </div>
      <div id="uploadResult"></div>
    </div>`;
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('drag-over');
  if (e.dataTransfer.files[0]) uploadResume(e.dataTransfer.files[0]);
}

async function uploadResume(file) {
  if (!file) return;
  const res = document.getElementById('uploadResult');
  res.innerHTML = `<div class="alert alert-info" style="margin-top:16px">⏳ Parsing resume<span class="loading-dots"></span></div>`;
  const fd = new FormData(); fd.append('resume', file);
  try {
    const r = await fetch(`${API}/api/upload-resume`, { method: 'POST', credentials: 'include', body: fd });
    const d = await r.json();
    const p = d.parsed, ats = d.ats;
    res.innerHTML = `
      <div class="ats-result">
        <div class="ats-score-ring">
          <div class="score-circle">${ats.score}<span style="font-size:.55rem">/100</span></div>
          <div><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem">ATS Resume Score</div>
          <div style="color:var(--text2);font-size:.82rem;margin-top:4px">${ats.score >= 70 ? '✅ Good resume!' : ats.score >= 50 ? '⚠️ Average' : '❌ Needs work'}</div></div>
        </div>
        ${ats.tips.map(t => `<div style="color:var(--text2);font-size:.84rem;margin-bottom:5px">• ${t}</div>`).join('')}
      </div>
      <div class="parsed-results">
        <h4>📋 Extracted Data</h4>
        <div style="margin-bottom:8px"><span style="color:var(--text2);font-size:.78rem;text-transform:uppercase">Skills Found</span>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
            ${(p.skills || []).map(s => `<span class="tag matched">${s}</span>`).join('') || '<span style="color:var(--text3)">None detected</span>'}
          </div>
        </div>
        <div style="margin-bottom:6px"><span style="color:var(--text2);font-size:.78rem;text-transform:uppercase">Education</span><br><span style="font-size:.88rem">${p.education || 'Not detected'}</span></div>
        <div><span style="color:var(--text2);font-size:.78rem;text-transform:uppercase">Experience</span><br><span style="font-size:.88rem">${p.experience || 'Not detected'}</span></div>
      </div>`;
  } catch (e) { res.innerHTML = `<div class="alert" style="background:rgba(255,101,132,.1);color:var(--accent2);margin-top:16px">Error. Is Flask running?</div>`; }
}

// ── RECOMMENDATIONS ───────────────────────────────────
async function renderRecommend() {
  const area = document.getElementById('contentArea');
  let p = { skills: [], education: '', experience: '' };
  try { p = await fetch(`${API}/api/profile`, { credentials: 'include' }).then(r => r.json()); } catch (e) {}
  const skills = Array.isArray(p.skills) ? p.skills : [];
  area.innerHTML = `
    <div class="card">
      <div class="section-title">🎯 AI Job Matcher</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Your Skills <span style="color:var(--text3);font-size:.75rem">(Enter to add)</span></label>
          <div class="skills-input-area" id="skillsArea">
            ${skills.map(s => `<span class="skill-chip">${s}<button onclick="this.parentElement.remove()">×</button></span>`).join('')}
            <input class="skill-type-input" placeholder="Add skill..." onkeydown="addSkillChip(event)">
          </div>
        </div>
        <div class="form-group"><label>Filter Location</label>
          <select id="locFilter"><option value="">All Locations</option>
            ${['Bangalore','Hyderabad','Mumbai','Delhi','Pune','Chennai','Remote'].map(l => `<option>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Education</label><input type="text" id="recEdu" value="${p.education || ''}" placeholder="B.Tech CSE"></div>
        <div class="form-group"><label>Experience</label><input type="text" id="recExp" value="${p.experience || ''}" placeholder="2 years Python developer"></div>
      </div>
      <button class="btn-primary" style="max-width:230px" onclick="getRecommendations()">🤖 Find Best Jobs</button>
    </div>
    <div id="recResults"></div>`;
}

async function getRecommendations() {
  const skills = [...document.querySelectorAll('#skillsArea .skill-chip')].map(c => c.textContent.replace('×', '').trim()).filter(Boolean);
  const location = document.getElementById('locFilter').value;
  const education = document.getElementById('recEdu').value;
  const experience = document.getElementById('recExp').value;
  const res = document.getElementById('recResults');
  res.innerHTML = `<div class="alert alert-info" style="margin-top:20px">🤖 AI matching<span class="loading-dots"></span></div>`;
  try {
    const r = await fetch(`${API}/api/recommend`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, location, education, experience })
    });
    const jobs = await r.json();
    if (!jobs.length) { res.innerHTML = `<div class="empty-state"><div class="ei">🔍</div><p>No matches. Add more skills!</p></div>`; return; }
    res.innerHTML = `<div class="section-title" style="margin-top:24px">🏆 Top ${jobs.length} AI Matches</div>
      <div class="card-grid">${jobs.map(j => jobCardHTML(j, true)).join('')}</div>`;
    setTimeout(() => document.querySelectorAll('.progress-fill').forEach(el => el.style.width = el.dataset.w), 100);
  } catch (e) { res.innerHTML = `<div class="alert" style="background:rgba(255,101,132,.1);color:var(--accent2)">Server error.</div>`; }
}

// ── MY APPLICATIONS + MESSAGING ───────────────────────
async function renderMyApplications() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `<div class="alert alert-info">Loading<span class="loading-dots"></span></div>`;
  try {
    const apps = await fetch(`${API}/api/applications/mine`, { credentials: 'include' }).then(r => r.json());
    if (!apps.length) {
      area.innerHTML = `<div class="empty-state"><div class="ei">📭</div><p>No applications yet. Apply from Get Jobs or Browse Jobs!</p></div>`;
      return;
    }
    area.innerHTML = `
      <div class="section-title">📋 My Applications (${apps.length})</div>
      <div class="card-grid">${apps.map(a => myAppCardHTML(a)).join('')}</div>`;
  } catch (e) { area.innerHTML = `<div class="alert" style="background:rgba(255,101,132,.1);color:var(--accent2)">Error loading.</div>`; }
}

function myAppCardHTML(a) {
  const statusCls = a.status === 'accepted' ? 'match-high' : a.status === 'rejected' ? 'match-low' : 'match-mid';
  const statusLabel = a.status === 'accepted' ? '✅ Accepted' : a.status === 'rejected' ? '❌ Rejected' : '⏳ Pending';
  return `<div class="job-card">
    <div class="job-header">
      <div class="job-title">${a.job_title}</div>
      <span class="match-badge ${statusCls}">${statusLabel}</span>
    </div>
    <div class="job-company">🏢 ${a.company}</div>
    <div style="font-size:.78rem;color:var(--text3);margin-top:6px">Applied: ${a.applied_at}</div>
    ${a.reviewed_at ? `<div style="font-size:.78rem;color:var(--text3)">Reviewed by ${a.reviewed_by} · ${a.reviewed_at}</div>` : ''}
    ${a.status === 'accepted' ? `
      <div style="margin-top:12px">
        <button class="btn-sm btn-apply" onclick="openChat(${a.id},'${a.job_title.replace(/'/g,"\\'")}','${a.company.replace(/'/g,"\\'")}')">💬 Message HR</button>
      </div>` : ''}
  </div>`;
}

// ── CHAT MODAL ────────────────────────────────────────
async function openChat(appId, jobTitle, company) {
  const modal = document.createElement('div');
  modal.id = 'chatModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:700">💬 ${jobTitle}</div>
          <div style="font-size:.8rem;color:var(--text2)">@ ${company}</div>
        </div>
        <button onclick="document.getElementById('chatModal').remove()" style="background:none;border:none;color:var(--text2);font-size:1.4rem;cursor:pointer">×</button>
      </div>
      <div id="chatMsgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--surface2)">
        <div style="text-align:center;color:var(--text3);font-size:.8rem">Loading messages<span class="loading-dots"></span></div>
      </div>
      <div style="padding:12px;border-top:1px solid var(--border);display:flex;gap:8px">
        <input id="chatMsgInput" placeholder="Type your message..." style="flex:1;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.9rem;outline:none"
               onkeydown="if(event.key==='Enter')sendChatMsg(${appId})">
        <button onclick="sendChatMsg(${appId})" style="padding:10px 18px;background:var(--gradient);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer">Send</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  loadChatMsgs(appId);
}

async function loadChatMsgs(appId) {
  try {
    const r = await fetch(`${API}/api/messages/${appId}`, { credentials: 'include' });
    const d = await r.json();
    if (!r.ok) { document.getElementById('chatMsgs').innerHTML = `<div style="color:var(--accent2);text-align:center;font-size:.85rem">${d.error}</div>`; return; }
    const msgs = d.messages;
    const myRole = currentUser ? currentUser.role : 'user';
    const container = document.getElementById('chatMsgs');
    container.innerHTML = msgs.length
      ? msgs.map(m => {
          const isMine = m.sender_role === 'user';
          return `
          <div style="display:flex;flex-direction:column;align-items:${isMine ? 'flex-end' : 'flex-start'}">
            <div style="max-width:75%;padding:10px 14px;border-radius:${isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px'};font-size:.87rem;line-height:1.5;
              background:${isMine ? 'var(--gradient)' : 'var(--card)'};
              color:${isMine ? '#fff' : 'var(--text)'};
              border:${isMine ? 'none' : '1px solid var(--border)'}">
              ${m.content}
            </div>
            <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${m.sender_name} · ${m.created_at}</div>
          </div>`;
        }).join('')
      : `<div style="text-align:center;color:var(--text3);font-size:.85rem;padding:20px">No messages yet. Say hello to HR! 👋</div>`;
    container.scrollTop = container.scrollHeight;
    fetchMsgCount();
  } catch (e) {}
}

async function sendChatMsg(appId) {
  const input = document.getElementById('chatMsgInput');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  try {
    const r = await fetch(`${API}/api/messages/${appId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const d = await r.json();
    if (r.ok) {
      loadChatMsgs(appId);
    } else {
      const container = document.getElementById('chatMsgs');
      if (container) {
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'text-align:center;color:var(--accent2);font-size:.8rem;padding:6px';
        errDiv.textContent = '⚠️ ' + (d.error || 'Failed to send');
        container.appendChild(errDiv);
      }
    }
  } catch (e) {
    const container = document.getElementById('chatMsgs');
    if (container) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'text-align:center;color:var(--accent2);font-size:.8rem;padding:6px';
      errDiv.textContent = '⚠️ Network error. Is Flask running?';
      container.appendChild(errDiv);
    }
  }
}

// ── CHATBOT ───────────────────────────────────────────
function renderChatbot() {
  document.getElementById('contentArea').innerHTML = `
    <div class="card" style="max-width:700px">
      <div class="section-title">🤖 CareerBot AI</div>
      <div class="chat-container">
        <div class="chat-messages" id="chatMessages">
          <div class="chat-bubble bot">👋 Hi! I'm CareerBot. Ask me anything about jobs, skills, or career guidance!</div>
        </div>
        <div class="chat-suggestions">
          ${['Which job suits me?','Skills to learn in 2025','Remote jobs available','Interview tips','How to improve resume','Message HR after acceptance'].map(s =>
            `<button class="sug-btn" onclick="sendSug('${s}')">${s}</button>`).join('')}
        </div>
        <div class="chat-input-row">
          <input type="text" id="chatInput" placeholder="Ask me anything..." onkeydown="if(event.key==='Enter')sendChat()">
          <button onclick="sendChat()">Send</button>
        </div>
      </div>
    </div>`;
}

function sendSug(msg) { document.getElementById('chatInput').value = msg; sendChat(); }

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendBubble(msg, 'user');
  try {
    const r = await fetch(`${API}/api/chat`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg }) });
    const d = await r.json();
    appendBubble(d.reply, 'bot');
  } catch (e) { appendBubble('Server error! Make sure Flask is running 🔧', 'bot'); }
}

function appendBubble(text, role) {
  const msgs = document.getElementById('chatMessages');
  const b = document.createElement('div');
  b.className = `chat-bubble ${role}`;
  b.textContent = text;
  msgs.appendChild(b);
  msgs.scrollTop = msgs.scrollHeight;
}

// ── INTERVIEW PREP ────────────────────────────────────
const QUIZ = [
  { q: "What does REST stand for?", opts: ["Representational State Transfer", "Remote Execution Service Tool", "Real-time Event Streaming Transfer", "Resource Endpoint State Transfer"], ans: 0 },
  { q: "Which data structure uses LIFO order?", opts: ["Queue", "Stack", "Linked List", "Tree"], ans: 1 },
  { q: "Time complexity of Binary Search?", opts: ["O(n)", "O(n²)", "O(log n)", "O(n log n)"], ans: 2 },
  { q: "Which is NOT a Python web framework?", opts: ["Django", "Flask", "FastAPI", "Spring"], ans: 3 },
  { q: "What does SQL stand for?", opts: ["Simple Query Language", "Structured Query Language", "Sequential Query Logic", "Standard Query Library"], ans: 1 },
  { q: "In ML, what is overfitting?", opts: ["Model works on train & test", "Model too simple", "Model learns noise, fails on new data", "Model has too few parameters"], ans: 2 },
];
const TIPS = [
  "Clarify requirements before coding", "Think aloud — explain your approach",
  "Practice DSA daily on LeetCode", "Prepare STAR-format behavioral answers",
  "Ask about team culture and tech stack", "Prepare 2-3 questions for the interviewer",
  "Know your resume projects thoroughly", "Understand Big-O notation for your solutions",
];

function renderInterview() {
  document.getElementById('contentArea').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div class="section-title">🧪 Quick Quiz</div>
        ${QUIZ.map((q, i) => `<div class="quiz-card">
          <div class="quiz-q">Q${i + 1}. ${q.q}</div>
          <div class="quiz-options">
            ${q.opts.map((o, j) => `<div class="quiz-opt" id="qo-${i}-${j}" onclick="answerQ(${i},${j})">${String.fromCharCode(65 + j)}. ${o}</div>`).join('')}
          </div>
        </div>`).join('')}
      </div>
      <div>
        <div class="section-title">💡 Interview Tips</div>
        <div class="card">${TIPS.map((t, i) => `<div style="display:flex;gap:12px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
          <span style="font-size:1.1rem;min-width:24px">${['🎯','💬','💻','⭐','🤝','❓','📁','⚡'][i]}</span>
          <span style="font-size:.88rem;color:var(--text2);line-height:1.5">${t}</span></div>`).join('')}</div>
        <div class="section-title" style="margin-top:20px">📚 Key Topics</div>
        <div class="card">${[
          ['Data Structures', 'Arrays, LinkedList, Trees, Graphs, Stacks, Queues'],
          ['Algorithms', 'Sorting, Searching, Dynamic Programming, Recursion'],
          ['System Design', 'Load Balancing, Caching, Databases, Microservices'],
          ['OOP Concepts', 'Inheritance, Polymorphism, Abstraction, Encapsulation'],
          ['Database', 'SQL queries, Normalization, Indexing, Transactions'],
        ].map(([t, d]) => `<div style="margin-bottom:12px"><div style="font-weight:600;font-size:.9rem;color:var(--accent)">${t}</div><div style="font-size:.82rem;color:var(--text2);margin-top:3px">${d}</div></div>`).join('')}</div>
      </div>
    </div>`;
}

function answerQ(qi, oi) {
  const q = QUIZ[qi];
  for (let j = 0; j < q.opts.length; j++) {
    const el = document.getElementById(`qo-${qi}-${j}`);
    if (j === q.ans) el.classList.add('correct');
    else if (j === oi && oi !== q.ans) el.classList.add('wrong');
    el.onclick = null;
  }
}
