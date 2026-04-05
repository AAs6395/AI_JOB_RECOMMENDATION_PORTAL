/* ═══════════════════════════════════════════════
   admin.js  ─  Admin Panel + HR Dashboard + Post Job
═══════════════════════════════════════════════ */

// ── ADMIN PANEL ───────────────────────────────────────
async function renderAdmin() {
  const area = document.getElementById('contentArea');
  try {
    const [users, jobs, companies] = await Promise.all([
      fetch(`${API}/api/admin/users`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API}/api/jobs`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API}/api/admin/companies`, { credentials: 'include' }).then(r => r.json()),
    ]);
    area.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val">${users.length}</div><div class="stat-label">Job Seekers</div></div>
        <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-val">${companies.length}</div><div class="stat-label">Companies</div></div>
        <div class="stat-card"><div class="stat-icon">💼</div><div class="stat-val">${jobs.length}</div><div class="stat-label">Active Jobs</div></div>
      </div>

      <div class="section-title">👥 Registered Job Seekers</div>
      <div class="card table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Skills</th><th>Registered</th></tr></thead>
          <tbody>${users.map(u => `<tr>
            <td>${u.name}</td><td>${u.email}</td>
            <td><span class="badge badge-blue">${(u.skills || []).length} skills</span></td>
            <td style="color:var(--text3);font-size:.8rem">${u.created_at || ''}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-title">🏢 Registered Companies / HR</div>
      <div class="card table-wrapper">
        <table>
          <thead><tr><th>HR Name</th><th>Email</th><th>Company</th><th>Industry</th><th>Role</th></tr></thead>
          <tbody>${companies.map(c => `<tr>
            <td>${c.name}</td><td>${c.email}</td>
            <td>${c.company_name}</td><td>${c.industry || '—'}</td>
            <td><span class="badge ${c.role === 'admin' ? 'badge-blue' : 'badge-green'}">${c.role}</span></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>

      <div class="section-title">💼 All Job Listings</div>
      <div class="card table-wrapper">
        <table>
          <thead><tr><th>Title</th><th>Company</th><th>Location</th><th>Category</th><th>Action</th></tr></thead>
          <tbody id="jobsTableBody">${jobs.map(j => `<tr id="jr-${j.id}">
            <td>${j.title}</td><td>${j.company}</td><td>${j.location}</td>
            <td><span class="badge badge-blue">${j.category}</span></td>
            <td><button class="btn-danger" onclick="deleteJob(${j.id})">Delete</button></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>`;
  } catch (e) { area.innerHTML = `<div class="alert" style="background:rgba(255,101,132,.1);color:var(--accent2)">Unauthorized or server error.</div>`; }
}

async function deleteJob(id) {
  if (!confirm('Delete this job permanently?')) return;
  const r = await fetch(`${API}/api/jobs/${id}`, { method: 'DELETE', credentials: 'include' });
  if (r.ok) { document.getElementById(`jr-${id}`)?.remove(); showToast('Job deleted'); }
  else showToast('Failed to delete', 'error');
}

// ── HR APPLICATIONS ───────────────────────────────────
async function renderHRApplications() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `<div class="alert alert-info">Loading applications<span class="loading-dots"></span></div>`;
  try {
    const apps = await fetch(`${API}/api/applications/company`, { credentials: 'include' }).then(r => r.json());
    const pending = apps.filter(a => a.status === 'pending');
    const reviewed = apps.filter(a => a.status !== 'pending');

    area.innerHTML = `
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-icon">📥</div><div class="stat-val">${apps.length}</div><div class="stat-label">Total Applications</div></div>
        <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-val">${pending.length}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-val">${apps.filter(a => a.status === 'accepted').length}</div><div class="stat-label">Accepted</div></div>
        <div class="stat-card"><div class="stat-icon">❌</div><div class="stat-val">${apps.filter(a => a.status === 'rejected').length}</div><div class="stat-label">Rejected</div></div>
      </div>

      ${pending.length ? `<div class="section-title">⏳ Pending Review (${pending.length})</div>
        <div class="card-grid">${pending.map(a => applicantCardHTML(a, true)).join('')}</div>` : ''}

      ${reviewed.length ? `<div class="section-title" style="margin-top:24px">📁 Reviewed</div>
        <div class="card-grid">${reviewed.map(a => applicantCardHTML(a, false)).join('')}</div>` : ''}

      ${!apps.length ? `<div class="empty-state"><div class="ei">📭</div><p>No applications yet for your company's jobs.</p></div>` : ''}`;
  } catch (e) { area.innerHTML = `<div class="alert" style="background:rgba(255,101,132,.1);color:var(--accent2)">Error loading.</div>`; }
}

function applicantCardHTML(a, showActions) {
  const statusCls = a.status === 'accepted' ? 'match-high' : a.status === 'rejected' ? 'match-low' : 'match-mid';
  const statusLabel = a.status === 'accepted' ? '✅ Accepted' : a.status === 'rejected' ? '❌ Rejected' : '⏳ Pending';
  const skills = (a.user_skills || '').split(',').map(s => s.trim()).filter(Boolean);
  return `<div class="job-card" id="appcard-${a.id}">
    <div class="job-header">
      <div>
        <div class="job-title">${a.user_name}</div>
        <div style="font-size:.76rem;color:var(--text2)">${a.user_email}</div>
      </div>
      <span class="match-badge ${statusCls}">${statusLabel}</span>
    </div>
    <div class="job-company">💼 Applied for: <b>${a.job_title}</b></div>
    <div style="margin:10px 0 6px;font-size:.76rem;color:var(--text2);text-transform:uppercase;letter-spacing:.05em">Skills</div>
    <div class="job-tags">${skills.map(s => `<span class="tag matched">${s}</span>`).join('') || '<span style="color:var(--text3);font-size:.8rem">No skills listed</span>'}</div>
    <div style="font-size:.82rem;color:var(--text2);margin:8px 0 2px">📚 ${a.user_education || '—'}</div>
    <div style="font-size:.82rem;color:var(--text2);margin-bottom:10px">💼 ${a.user_experience || '—'}</div>
    <div style="font-size:.75rem;color:var(--text3);margin-bottom:12px">Applied: ${a.applied_at}</div>
    <div class="job-footer" style="flex-wrap:wrap;gap:8px">
      ${a.resume_file ? `<a href="/static/uploads/${a.resume_file}" target="_blank" class="btn-sm btn-gap" style="text-decoration:none">📄 Resume</a>` : '<span style="font-size:.78rem;color:var(--text3)">No resume</span>'}
      ${showActions ? `
        <button class="btn-sm btn-apply" onclick="reviewApp(${a.id},'accepted')">✅ Accept</button>
        <button class="btn-sm" style="background:rgba(255,101,132,.1);border:1px solid rgba(255,101,132,.3);color:var(--accent2)" onclick="reviewApp(${a.id},'rejected')">❌ Reject</button>
      ` : `<span style="font-size:.78rem;color:var(--text3)">By ${a.reviewed_by || '—'}</span>`}
      ${a.status === 'accepted' ? `
        <button class="btn-sm" style="background:rgba(67,233,123,.1);border:1px solid rgba(67,233,123,.3);color:var(--accent3)" onclick="openHRChat(${a.id},'${(a.job_title||'').replace(/'/g,"\\'")}','${(a.user_name||'').replace(/'/g,"\\'")}')">💬 Message</button>
      ` : ''}
    </div>
  </div>`;
}

async function reviewApp(appId, status) {
  if (!confirm(`${status === 'accepted' ? 'Accept' : 'Reject'} this application?`)) return;
  const r = await fetch(`${API}/api/applications/${appId}/status`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const d = await r.json();
  if (!r.ok) return showToast(d.error, 'error');
  showToast(`Application ${status}! Notification sent to applicant.`, 'success');
  renderHRApplications();
}

// ── HR → USER CHAT ────────────────────────────────────
async function openHRChat(appId, jobTitle, userName) {
  const modal = document.createElement('div');
  modal.id = 'hrChatModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-family:'Syne',sans-serif;font-weight:700">💬 ${jobTitle}</div>
          <div style="font-size:.8rem;color:var(--text2)">Chatting with: ${userName}</div>
        </div>
        <button onclick="document.getElementById('hrChatModal').remove()" style="background:none;border:none;color:var(--text2);font-size:1.4rem;cursor:pointer">×</button>
      </div>
      <div id="hrChatMsgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--surface2)">
        <div style="text-align:center;color:var(--text3);font-size:.8rem">Loading<span class="loading-dots"></span></div>
      </div>
      <div style="padding:12px;border-top:1px solid var(--border);display:flex;gap:8px">
        <input id="hrChatInput" placeholder="Type interview details, links..." style="flex:1;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.9rem;outline:none"
               onkeydown="if(event.key==='Enter')sendHRMsg(${appId})">
        <button onclick="sendHRMsg(${appId})" style="padding:10px 18px;background:var(--gradient);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer">Send</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  loadHRChatMsgs(appId);
}

async function loadHRChatMsgs(appId) {
  try {
    const r = await fetch(`${API}/api/messages/${appId}`, { credentials: 'include' });
    const d = await r.json();
    const container = document.getElementById('hrChatMsgs');
    if (!container) return;
    if (!r.ok) { container.innerHTML = `<div style="color:var(--accent2);text-align:center">${d.error}</div>`; return; }
    const msgs = d.messages;
    container.innerHTML = msgs.length
      ? msgs.map(m => `
          <div style="display:flex;flex-direction:column;align-items:${m.sender_role !== 'user' ? 'flex-end' : 'flex-start'}">
            <div style="max-width:75%;padding:10px 14px;border-radius:${m.sender_role !== 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px'};font-size:.87rem;line-height:1.5;
              background:${m.sender_role !== 'user' ? 'var(--gradient)' : 'var(--card)'};
              color:${m.sender_role !== 'user' ? '#fff' : 'var(--text)'};
              border:${m.sender_role !== 'user' ? 'none' : '1px solid var(--border)'}">
              ${m.content}
            </div>
            <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${m.sender_name} · ${m.created_at}</div>
          </div>`).join('')
      : `<div style="text-align:center;color:var(--text3);font-size:.85rem;padding:20px">No messages yet. Send the candidate interview details! 🎯</div>`;
    container.scrollTop = container.scrollHeight;
  } catch (e) {}
}

async function sendHRMsg(appId) {
  const input = document.getElementById('hrChatInput');
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  try {
    await fetch(`${API}/api/messages/${appId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    loadHRChatMsgs(appId);
  } catch (e) {}
}

// ── POST JOB ──────────────────────────────────────────
function renderPostJob() {
  const co = currentUser.company || '';
  document.getElementById('contentArea').innerHTML = `
    <div class="card" style="max-width:700px">
      <div class="section-title">➕ Post a New Job</div>
      <div class="form-grid">
        <div class="form-group"><label>Job Title *</label><input type="text" id="jTitle" placeholder="e.g. Python Developer"></div>
        <div class="form-group"><label>Company *</label><input type="text" id="jCompany" value="${co}" placeholder="e.g. TechCorp"></div>
        <div class="form-group"><label>Location *</label>
          <select id="jLocation">${['Bangalore','Hyderabad','Mumbai','Delhi','Pune','Chennai','Remote'].map(l => `<option>${l}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Category</label>
          <select id="jCat">${['Development','Data Science','AI/ML','DevOps','Cloud','Mobile','Security','Design','Business','Management'].map(c => `<option>${c}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Salary Range</label><input type="text" id="jSalary" placeholder="e.g. 8-12 LPA"></div>
        <div class="form-group"><label>Job Type</label>
          <select id="jType"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Required Skills * <span style="color:var(--text3);font-size:.75rem">(comma separated)</span></label>
          <input type="text" id="jSkills" placeholder="Python, Django, SQL, Git">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label>Job Description *</label>
          <textarea id="jDesc" placeholder="Describe the role, responsibilities, and requirements..."></textarea>
        </div>
      </div>
      <button class="btn-primary" style="max-width:200px" onclick="postJob()">Post Job →</button>
      <div id="postMsg"></div>
    </div>`;
}

async function postJob() {
  const title = document.getElementById('jTitle').value.trim();
  const company = document.getElementById('jCompany').value.trim();
  const description = document.getElementById('jDesc').value.trim();
  const skillsRaw = document.getElementById('jSkills').value.trim();
  if (!title || !company || !description || !skillsRaw)
    return showPostMsg('Please fill all required fields (*)', 'error');
  const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
  const body = {
    title, company, skills, description,
    location: document.getElementById('jLocation').value,
    category: document.getElementById('jCat').value,
    salary: document.getElementById('jSalary').value,
    type: document.getElementById('jType').value,
  };
  try {
    const r = await fetch(`${API}/api/jobs`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (!r.ok) return showPostMsg(d.error, 'error');
    showPostMsg(`✅ ${d.message}`, 'success');
  } catch (e) { showPostMsg('Server error', 'error'); }
}

function showPostMsg(msg, type) {
  const style = type === 'success'
    ? 'background:rgba(67,233,123,.1);border:1px solid rgba(67,233,123,.2);color:var(--accent3)'
    : 'background:rgba(255,101,132,.1);border:1px solid rgba(255,101,132,.2);color:var(--accent2)';
  document.getElementById('postMsg').innerHTML =
    `<div style="${style};padding:12px 16px;border-radius:8px;margin-top:12px;font-size:.88rem">${msg}</div>`;
}
