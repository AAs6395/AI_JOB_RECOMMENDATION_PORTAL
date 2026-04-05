/* ═══════════════════════════════════════
   jobs.js  ─  Browse Jobs + Trends
═══════════════════════════════════════ */

async function renderJobs() {
  document.getElementById('contentArea').innerHTML = `
    <div class="filter-row">
      <input type="text" id="jobSearch" placeholder="🔍 Search jobs or companies..." oninput="filterJobs()" style="flex:1;max-width:300px">
      <select id="catFilter" onchange="filterJobs()">
        <option value="">All Categories</option>
        ${['Development','Data Science','AI/ML','DevOps','Cloud','Mobile','Security','Design','Business','Management'].map(c => `<option>${c}</option>`).join('')}
      </select>
      <select id="locFilter2" onchange="filterJobs()">
        <option value="">All Locations</option>
        ${['Bangalore','Hyderabad','Mumbai','Delhi','Pune','Chennai','Remote'].map(l => `<option>${l}</option>`).join('')}
      </select>
    </div>
    <div id="jobsGrid" class="card-grid"></div>`;
  filterJobs();
}

async function filterJobs() {
  const q = document.getElementById('jobSearch')?.value || '';
  const cat = document.getElementById('catFilter')?.value || '';
  const loc = document.getElementById('locFilter2')?.value || '';
  try {
    const params = new URLSearchParams({ q, category: cat, location: loc });
    const jobs = await fetch(`${API}/api/jobs?${params}`, { credentials: 'include' }).then(r => r.json());
    const grid = document.getElementById('jobsGrid');
    if (!grid) return;
    grid.innerHTML = jobs.length
      ? jobs.map(j => jobCardHTML(j, false)).join('')
      : `<div class="empty-state"><div class="ei">😕</div><p>No jobs found for your filters.</p></div>`;
    setTimeout(() => document.querySelectorAll('.progress-fill').forEach(el => el.style.width = el.dataset.w), 50);
  } catch (e) {}
}

async function renderTrends() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `<div class="alert alert-info">📊 Loading trends<span class="loading-dots"></span></div>`;
  try {
    const data = await fetch(`${API}/api/trends`, { credentials: 'include' }).then(r => r.json());
    const maxSkill = Math.max(...data.top_skills.map(s => s[1]));
    const maxCat = Math.max(...Object.values(data.categories));
    const maxLoc = Math.max(...Object.values(data.locations));
    area.innerHTML = `
      <div class="trends-grid">
        <div class="card">
          <div class="section-title">🔥 Top In-Demand Skills</div>
          ${data.top_skills.map(([skill, count]) => `
            <div class="skill-bar-row">
              <div class="skill-bar-label">${skill}</div>
              <div class="skill-bar-track"><div class="skill-bar-fill" data-w="${(count / maxSkill * 100).toFixed(0)}%" style="width:0%"></div></div>
              <div class="skill-bar-count">${count}</div>
            </div>`).join('')}
        </div>
        <div>
          <div class="card" style="margin-bottom:20px">
            <div class="section-title">📂 Jobs by Category</div>
            ${Object.entries(data.categories).map(([cat, count]) => `
              <div class="skill-bar-row">
                <div class="skill-bar-label">${cat}</div>
                <div class="skill-bar-track"><div class="skill-bar-fill" data-w="${(count / maxCat * 100).toFixed(0)}%" style="width:0%"></div></div>
                <div class="skill-bar-count">${count}</div>
              </div>`).join('')}
          </div>
          <div class="card">
            <div class="section-title">🌍 Jobs by Location</div>
            ${Object.entries(data.locations).map(([loc, count]) => `
              <div class="skill-bar-row">
                <div class="skill-bar-label">${loc}</div>
                <div class="skill-bar-track"><div class="skill-bar-fill" data-w="${(count / maxLoc * 100).toFixed(0)}%" style="width:0%"></div></div>
                <div class="skill-bar-count">${count}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    setTimeout(() => document.querySelectorAll('.skill-bar-fill').forEach(el => el.style.width = el.dataset.w), 100);
  } catch (e) { area.innerHTML = `<div class="alert" style="background:rgba(255,101,132,.1);color:var(--accent2)">Cannot load trends.</div>`; }
}
