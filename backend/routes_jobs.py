"""
routes_jobs.py  ─  Jobs, Applications, Notifications, Messages, Trends, Admin, Chat
"""
from flask import Blueprint, request, jsonify, session
from backend.database import *
import os

jobs_bp = Blueprint('jobs', __name__)

# ── JOBS ─────────────────────────────────────────────────────
@jobs_bp.route('/api/jobs', methods=['GET'])
def get_jobs():
    q = request.args.get('q', '')
    cat = request.args.get('category', '')
    loc = request.args.get('location', '')
    jobs = all_jobs(q, cat, loc)
    for j in jobs:
        j['skills_list'] = [s.strip() for s in j['skills'].split(',')]
    return jsonify(jobs)

@jobs_bp.route('/api/jobs', methods=['POST'])
def add_job():
    if session.get('role') not in ['admin', 'recruiter']:
        return jsonify({"error": "Unauthorized"}), 401
    d = request.json
    skills_str = ','.join(d.get('skills', [])) if isinstance(d.get('skills'), list) else d.get('skills', '')
    cid = session.get('uid')
    company_name = d.get('company', session.get('company', ''))
    jid = insert_job(d['title'], company_name, cid,
                     d.get('location',''), d.get('category','Development'),
                     d.get('salary',''), d.get('type','Full-time'),
                     skills_str, d.get('description',''))
    return jsonify({"message": "Job posted successfully!", "id": jid})

@jobs_bp.route('/api/jobs/<int:jid>', methods=['DELETE'])
def del_job(jid):
    if session.get('role') not in ['admin', 'recruiter']:
        return jsonify({"error": "Unauthorized"}), 401
    job = job_by_id(jid)
    if not job: return jsonify({"error": "Not found"}), 404
    if session['role'] == 'recruiter' and job.get('company_id') != session['uid']:
        return jsonify({"error": "Cannot delete another company's job"}), 403
    delete_job_db(jid)
    return jsonify({"message": "Job deleted"})

# ── APPLY ─────────────────────────────────────────────────────
@jobs_bp.route('/api/apply', methods=['POST'])
def apply():
    if session.get('role') != 'user':
        return jsonify({"error": "Login as job seeker to apply"}), 401
    d = request.json
    job_id = d.get('job_id')
    job = job_by_id(job_id)
    if not job: return jsonify({"error": "Job not found"}), 404
    uid = session['uid']
    if app_exists(uid, job_id):
        return jsonify({"error": "Already applied for this job"}), 400
    u = user_by_id(uid)
    resume_file = u.get('resume_file') or ''
    app_id = insert_application(
        job_id, job['title'], job['company'], job.get('company_id'),
        uid, u['name'], u['email'],
        u.get('skills',''), u.get('education',''), u.get('experience',''),
        resume_file
    )
    return jsonify({"message": f"Applied for {job['title']} at {job['company']}!"})

@jobs_bp.route('/api/applications/mine', methods=['GET'])
def my_apps():
    if 'uid' not in session: return jsonify({"error": "Unauthorized"}), 401
    apps = apps_by_user(session['uid'])
    for a in apps:
        a['applied_at'] = str(a['applied_at']) if a.get('applied_at') else ''
        a['reviewed_at'] = str(a['reviewed_at']) if a.get('reviewed_at') else ''
    return jsonify(apps)

@jobs_bp.route('/api/applications/company', methods=['GET'])
def company_apps():
    role = session.get('role')
    if role not in ['admin', 'recruiter']: return jsonify({"error": "Unauthorized"}), 401
    apps = apps_by_company(session['uid'], role)
    for a in apps:
        a['applied_at'] = str(a['applied_at']) if a.get('applied_at') else ''
        a['reviewed_at'] = str(a['reviewed_at']) if a.get('reviewed_at') else ''
    return jsonify(apps)

@jobs_bp.route('/api/applications/<int:app_id>/status', methods=['POST'])
def update_status(app_id):
    role = session.get('role')
    if role not in ['admin', 'recruiter']: return jsonify({"error": "Unauthorized"}), 401
    a = app_by_id(app_id)
    if not a: return jsonify({"error": "Not found"}), 404
    if role == 'recruiter' and a.get('company_id') != session['uid']:
        return jsonify({"error": "Unauthorized"}), 403
    new_status = request.json.get('status')
    if new_status not in ['accepted', 'rejected']:
        return jsonify({"error": "Invalid status"}), 400
    update_app_status(app_id, new_status, session['name'])
    emoji = "🎉" if new_status == 'accepted' else "😔"
    action = "ACCEPTED" if new_status == 'accepted' else "REJECTED"
    msg = (f"{emoji} Your application for <b>{a['job_title']}</b> at <b>{a['company']}</b> "
           f"has been <b>{action}</b> by {session['name']}.")
    if new_status == 'accepted':
        msg += " They may reach out with further interview details via the portal."
    add_notification(a['user_id'], msg, new_status)
    return jsonify({"message": f"Application {new_status}"})

# ── MESSAGING (HR ↔ Accepted Applicant) ─────────────────────
@jobs_bp.route('/api/messages/<int:app_id>', methods=['GET'])
def get_msgs(app_id):
    if 'uid' not in session: return jsonify({"error": "Unauthorized"}), 401
    a = app_by_id(app_id)
    if not a: return jsonify({"error": "Application not found"}), 404

    role = session['role']
    uid = session['uid']
    # Authorization check
    if role == 'user' and a['user_id'] != uid:
        return jsonify({"error": "Unauthorized"}), 403
    if role == 'recruiter' and a.get('company_id') != uid:
        return jsonify({"error": "Unauthorized"}), 403
    # admin can read all messages - no extra check needed
    if a['status'] != 'accepted':
        return jsonify({"error": "Messaging only available after acceptance"}), 403

    msgs = get_messages(app_id)
    mark_messages_read(app_id, role)
    for m in msgs:
        m['created_at'] = str(m['created_at'])
    return jsonify({"messages": msgs, "application": {
        "job_title": a['job_title'], "company": a['company'],
        "user_name": a['user_name'], "status": a['status']
    }})

@jobs_bp.route('/api/messages/<int:app_id>', methods=['POST'])
def send_msg(app_id):
    if 'uid' not in session: return jsonify({"error": "Unauthorized"}), 401
    a = app_by_id(app_id)
    if not a: return jsonify({"error": "Not found"}), 404
    if a['status'] != 'accepted':
        return jsonify({"error": "Cannot message before acceptance"}), 403

    role = session['role']
    msg_content = request.json.get('content', '').strip()
    if not msg_content: return jsonify({"error": "Empty message"}), 400

    sender_id = session['uid']
    sender_role = role
    sender_name = session['name']

    if role == 'user':
        # Job seeker sending message to HR/Admin
        if a['user_id'] != sender_id:
            return jsonify({"error": "Unauthorized"}), 403
        # Find receiver: company_id may be NULL for seeded/admin-accepted jobs
        receiver_id = a.get('company_id')
        if receiver_id:
            hr = company_by_id(receiver_id)
            receiver_role = hr.get('role', 'recruiter') if hr else 'recruiter'
        else:
            # No company_id — fall back to super admin
            receiver_id = get_admin_id()
            receiver_role = 'admin'
        if not receiver_id:
            return jsonify({"error": "Cannot determine HR recipient. Please contact support."}), 400
    else:
        # HR or Admin sending to job seeker
        if role == 'recruiter' and a.get('company_id') != sender_id:
            return jsonify({"error": "Unauthorized"}), 403
        receiver_id = a['user_id']
        receiver_role = 'user'

    mid = send_message(app_id, sender_id, sender_role, sender_name, receiver_id, receiver_role, msg_content)

    if receiver_role == 'user':
        add_notification(receiver_id,
                         f"💬 New message from <b>{sender_name}</b> regarding your application for <b>{a['job_title']}</b>.",
                         'message')
    return jsonify({"message": "Message sent", "id": mid})

@jobs_bp.route('/api/messages/unread', methods=['GET'])
def unread_msgs():
    if 'uid' not in session: return jsonify({"count": 0})
    role = session['role']
    # admin can receive messages as either 'admin' or 'recruiter' role
    cnt = unread_message_count(session['uid'], role)
    return jsonify({"count": cnt})

# ── NOTIFICATIONS ─────────────────────────────────────────────
@jobs_bp.route('/api/notifications', methods=['GET'])
def notifs():
    if 'uid' not in session or session['role'] != 'user': return jsonify([])
    rows = get_notifications(session['uid'])
    for r in rows:
        r['created_at'] = str(r['created_at'])
    return jsonify(rows)

@jobs_bp.route('/api/notifications/read', methods=['POST'])
def read_notifs():
    if 'uid' not in session: return jsonify({"error": "Unauthorized"}), 401
    mark_notifications_read(session['uid'])
    return jsonify({"message": "Marked read"})

# ── TRENDS ────────────────────────────────────────────────────
@jobs_bp.route('/api/trends', methods=['GET'])
def trends():
    jobs = all_jobs()
    skill_count, cat_count, loc_count = {}, {}, {}
    for j in jobs:
        for s in [x.strip() for x in j['skills'].split(',')]:
            skill_count[s] = skill_count.get(s, 0) + 1
        cat_count[j['category']] = cat_count.get(j['category'], 0) + 1
        loc_count[j['location']] = loc_count.get(j['location'], 0) + 1
    return jsonify({
        "top_skills": sorted(skill_count.items(), key=lambda x: -x[1])[:10],
        "categories": cat_count,
        "locations": loc_count
    })

# ── ADMIN ─────────────────────────────────────────────────────
@jobs_bp.route('/api/admin/users', methods=['GET'])
def admin_users():
    if session.get('role') != 'admin': return jsonify({"error": "Unauthorized"}), 401
    rows = all_users()
    for r in rows:
        r['skills'] = [s.strip() for s in (r.get('skills') or '').split(',') if s.strip()]
        r['created_at'] = str(r['created_at'])
    return jsonify(rows)

@jobs_bp.route('/api/admin/companies', methods=['GET'])
def admin_companies():
    if session.get('role') != 'admin': return jsonify({"error": "Unauthorized"}), 401
    rows = all_companies()
    for r in rows:
        r['created_at'] = str(r['created_at'])
    return jsonify(rows)

# ── CHATBOT ───────────────────────────────────────────────────
@jobs_bp.route('/api/chat', methods=['POST'])
def chat():
    msg = request.json.get('message', '').lower()
    jobs = all_jobs()
    if any(w in msg for w in ['hello','hi','hey']):
        reply = "Hello! 👋 I'm CareerBot. Ask me about jobs, skills, or career advice!"
    elif 'best job' in msg or 'which job' in msg:
        reply = "Tell me your skills and I'll find the best matches! Use 'Get Jobs' section. 🎯"
    elif 'skill' in msg and 'learn' in msg:
        reply = "Top skills: Python, Machine Learning, React, SQL, Cloud (AWS/GCP). Start with Python + ML! 🚀"
    elif 'salary' in msg or 'pay' in msg:
        reply = "Salaries: 6 LPA (Junior) to 35 LPA (AI Scientist). ML/AI pays the most! 💰"
    elif 'python' in msg:
        reply = "Python is #1! Used in AI/ML, backend, data science. Learn Django/Flask for web, Pandas/NumPy for data. 🐍"
    elif 'remote' in msg:
        rj = [j['title'] for j in jobs if 'remote' in j['location'].lower()]
        reply = f"Remote jobs: {', '.join(rj[:4])} and more! 🌍"
    elif 'interview' in msg:
        reply = "Interview tips: 1) Practice DSA on LeetCode 2) Build projects 3) Know your resume 4) System design basics 💪"
    elif 'resume' in msg:
        reply = "Resume tips: 1) Keep it 1 page 2) Add GitHub/LinkedIn 3) Quantify achievements 4) Use job keywords 📄"
    elif 'data science' in msg or 'data scientist' in msg:
        reply = "Data Science path: Python → Statistics → Pandas → ML → Deep Learning → Deployment. 6-12 months! 📊"
    elif 'apply' in msg:
        reply = "To apply: Go to 'Get Jobs' or 'Browse Jobs', find a matching role, and click 'Apply Now'! 🚀"
    elif 'message' in msg or 'contact' in msg:
        reply = "Once your application is accepted, HR can message you directly in 'My Applications' → Chat! 💬"
    else:
        cats = list(set(j['category'] for j in jobs))
        reply = f"I help with job recommendations, skill advice, career guidance! Jobs available in: {', '.join(cats[:6])}. 🤖"
    return jsonify({"reply": reply})
