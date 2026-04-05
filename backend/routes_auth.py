"""
routes_auth.py  ─  Auth, Profile, Resume, AI Engine routes
"""
import os
from flask import Blueprint, request, jsonify, session
from backend.database import *
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

auth_bp = Blueprint('auth', __name__)
UPLOAD_FOLDER = 'static/uploads'

# ── REGISTER USER ────────────────────────────────────────────
@auth_bp.route('/api/register/user', methods=['POST'])
def register_user():
    d = request.json
    name = d.get('name','').strip()
    email = d.get('email','').strip().lower()
    pw = d.get('password','')
    if not name or not email or not pw:
        return jsonify({"error": "All fields required"}), 400
    if user_by_email(email):
        return jsonify({"error": "Email already registered"}), 400
    create_user(name, email, pw)
    return jsonify({"message": "Registered successfully! Please login."})

# ── REGISTER COMPANY ─────────────────────────────────────────
@auth_bp.route('/api/register/company', methods=['POST'])
def register_company():
    d = request.json
    name = d.get('name','').strip()
    email = d.get('email','').strip().lower()
    pw = d.get('password','')
    company_name = d.get('company_name','').strip()
    industry = d.get('industry','')
    website = d.get('website','')
    description = d.get('description','')
    if not name or not email or not pw or not company_name:
        return jsonify({"error": "All required fields must be filled"}), 400
    if company_by_email_or_username(email):
        return jsonify({"error": "Email already registered as HR/Company"}), 400
    cid = create_company(name, email, pw, company_name, industry, website, description)
    return jsonify({"message": f"Company '{company_name}' registered! You can now login as HR."})

# ── LOGIN ─────────────────────────────────────────────────────
@auth_bp.route('/api/login', methods=['POST'])
def login():
    d = request.json
    email = d.get('email','').strip().lower()
    pw = d.get('password','')
    role_type = d.get('role', 'user')   # 'user' or 'admin'

    if role_type == 'user':
        u = user_by_email(email)
        if u and u['password'] == hash_pw(pw):
            session['uid'] = u['id']
            session['role'] = 'user'
            session['name'] = u['name']
            session['email'] = u['email']
            return jsonify({"message": "Login successful", "name": u['name'], "role": "user"})
    else:
        # HR / Admin
        key = d.get('username', email)
        c = company_by_email_or_username(key)
        if c and c['password'] == hash_pw(pw):
            session['uid'] = c['id']
            session['role'] = c['role']        # 'admin' or 'recruiter'
            session['name'] = c['name']
            session['email'] = c['email']
            session['company'] = c['company_name']
            return jsonify({"message": "Login successful", "name": c['name'],
                            "role": c['role'], "company": c['company_name']})
    return jsonify({"error": "Invalid credentials"}), 401

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

# ── PROFILE ───────────────────────────────────────────────────
@auth_bp.route('/api/profile', methods=['GET', 'POST'])
def profile():
    if 'uid' not in session or session['role'] != 'user':
        return jsonify({"error": "Unauthorized"}), 401
    uid = session['uid']
    if request.method == 'POST':
        d = request.json
        skills_str = ','.join(d.get('skills', []))
        update_user_profile(uid, skills_str, d.get('education',''), d.get('experience',''))
        return jsonify({"message": "Profile updated"})
    u = user_by_id(uid)
    if not u: return jsonify({}), 404
    u['skills'] = [s.strip() for s in (u.get('skills') or '').split(',') if s.strip()]
    return jsonify(u)

# ── RESUME UPLOAD ─────────────────────────────────────────────
@auth_bp.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['resume']
    uid = session.get('uid', 'guest')
    filename = f"user_{uid}_resume.pdf"
    path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(path)
    parsed = _parse_pdf(path)
    if 'uid' in session and session['role'] == 'user':
        existing = user_by_id(session['uid'])
        existing_skills = [s.strip() for s in (existing.get('skills') or '').split(',') if s.strip()]
        merged = list(set(existing_skills + parsed['skills']))
        update_user_profile(session['uid'],
                            ','.join(merged),
                            parsed['education'] or existing.get('education',''),
                            parsed['experience'] or existing.get('experience',''))
        update_resume_file(session['uid'], filename)
    ats = _score_resume(parsed['skills'], parsed['education'], parsed['experience'], parsed['raw'])
    return jsonify({"parsed": parsed, "ats": ats})

def _parse_pdf(filepath):
    text = ""
    try:
        import PyPDF2
        with open(filepath, 'rb') as f:
            r = PyPDF2.PdfReader(f)
            for page in r.pages:
                text += page.extract_text() or ""
    except:
        try:
            from pdfminer.high_level import extract_text as pe
            text = pe(filepath)
        except:
            return {"skills": [], "education": "", "experience": "", "raw": ""}
    tl = text.lower()
    SKILL_LIST = [
        "python","java","javascript","react","node.js","angular","vue","html","css",
        "sql","mysql","mongodb","postgresql","django","flask","spring","machine learning",
        "deep learning","tensorflow","pytorch","scikit-learn","pandas","numpy","nlp",
        "docker","kubernetes","aws","azure","gcp","git","linux","c++","c#","php","ruby",
        "swift","kotlin","android","ios","tableau","power bi","excel","r","spark","kafka",
        "rest api","graphql","typescript","redux","agile","scrum","figma"
    ]
    skills = [s for s in SKILL_LIST if s in tl]
    edu = exp = ""
    for line in text.split('\n'):
        ll = line.lower()
        if not edu and any(k in ll for k in ['b.tech','b.e.','m.tech','mca','bca','bachelor','master','university','college']):
            edu = line.strip()
        if not exp and any(k in ll for k in ['experience','worked','engineer','developer','analyst','intern']):
            exp = line.strip()
    return {"skills": skills, "education": edu, "experience": exp, "raw": text[:500]}

def _score_resume(skills, education, experience, text=""):
    score, tips = 0, []
    if len(skills) >= 5: score += 30
    elif len(skills) >= 3: score += 20; tips.append("Add more skills (aim for 5+)")
    else: score += 10; tips.append("⚠️ Very few skills — add more technical skills")
    if education: score += 20
    else: tips.append("Add your education details")
    if experience: score += 20
    else: tips.append("Add work/internship experience")
    kw = ['project','github','linkedin','certification','achievement']
    found = sum(1 for k in kw if k in text.lower())
    score += found * 5
    if found < 2: tips.append("Add GitHub/LinkedIn links and project descriptions")
    if len(text) > 300: score += 10
    else: tips.append("Resume seems short — add more details")
    score = min(score, 100)
    if not tips: tips.append("✅ Great resume! Keep it updated.")
    return {"score": score, "tips": tips}

# ── AI RECOMMENDATIONS ────────────────────────────────────────
@auth_bp.route('/api/recommend', methods=['POST'])
def recommend():
    d = request.json
    skills = d.get('skills', [])
    education = d.get('education', '')
    experience = d.get('experience', '')
    location = d.get('location', '')
    results = _get_recommendations(skills, education, experience, location)
    return jsonify(results)

def _get_recommendations(user_skills, edu="", exp="", location=""):
    jobs = all_jobs(location=location)
    if not jobs: return []
    user_profile = " ".join(user_skills) + " " + edu + " " + exp
    job_texts = [" ".join(j['skills'].split(',')) + " " + j['title'] + " " + j['description'] for j in jobs]
    all_texts = [user_profile] + job_texts
    try:
        vec = TfidfVectorizer(stop_words='english')
        mat = vec.fit_transform(all_texts)
        sims = cosine_similarity(mat[0:1], mat[1:])[0]
    except:
        sims = [0] * len(jobs)
    us = set(s.lower() for s in user_skills)
    results = []
    for i, job in enumerate(jobs):
        js = set(s.strip().lower() for s in job['skills'].split(','))
        score = float(sims[i]) * 100
        job['match_score'] = round(score, 1)
        job['matched_skills'] = list(us & js)
        job['missing_skills'] = list(js - us)
        job['skills_list'] = [s.strip() for s in job['skills'].split(',')]
        results.append(job)
    results.sort(key=lambda x: x['match_score'], reverse=True)
    return results[:10]
