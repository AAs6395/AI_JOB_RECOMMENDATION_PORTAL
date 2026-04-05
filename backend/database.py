"""
database.py  ─  MySQL connection + all table helpers
Uses PyMySQL (pip install pymysql)
"""
import pymysql
import hashlib
from datetime import datetime

# ── CONFIG ────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",          # change to your MySQL user
    "password": "",          # change to your MySQL password
    "db":       "careerai",
    "charset":  "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

def get_conn():
    return pymysql.connect(**DB_CONFIG)

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def now_str():
    return datetime.now().strftime("%d %b %Y, %I:%M %p")

# ── INIT DB  ──────────────────────────────────────────────────
def init_db():
    """Create database & all tables if they don't exist."""
    cfg = DB_CONFIG.copy()
    cfg.pop("db")
    conn = pymysql.connect(**cfg)
    with conn.cursor() as c:
        c.execute("CREATE DATABASE IF NOT EXISTS careerai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    conn.commit(); conn.close()

    conn = get_conn()
    with conn.cursor() as c:
        # Users (job seekers)
        c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(180) UNIQUE NOT NULL,
            password VARCHAR(64) NOT NULL,
            skills TEXT,
            education VARCHAR(300) DEFAULT '',
            experience VARCHAR(300) DEFAULT '',
            resume_file VARCHAR(200) DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")

        # Companies / HR accounts
        c.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            email VARCHAR(180) UNIQUE NOT NULL,
            password VARCHAR(64) NOT NULL,
            company_name VARCHAR(200) NOT NULL,
            industry VARCHAR(100) DEFAULT '',
            website VARCHAR(200) DEFAULT '',
            description TEXT,
            role ENUM('recruiter','admin') DEFAULT 'recruiter',
            approved TINYINT(1) DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")

        # Seed super-admin
        c.execute("SELECT id FROM companies WHERE email='admin'")
        if not c.fetchone():
            c.execute("""INSERT INTO companies (name,email,password,company_name,role)
                         VALUES ('Super Admin','admin',%s,'Platform Admin','admin')""",
                      (hash_pw('admin123'),))

        # Seed demo HR
        c.execute("SELECT id FROM companies WHERE email='hr@techcorp.com'")
        if not c.fetchone():
            c.execute("""INSERT INTO companies (name,email,password,company_name,industry,role)
                         VALUES ('TechCorp HR','hr@techcorp.com',%s,'TechCorp','Technology','recruiter')""",
                      (hash_pw('hr123'),))

        # Seed demo user
        c.execute("SELECT id FROM users WHERE email='test@test.com'")
        if not c.fetchone():
            c.execute("""INSERT INTO users (name,email,password,skills,education,experience)
                         VALUES ('Test User','test@test.com',%s,'Python,Machine Learning,SQL',
                         'B.Tech CSE, Demo University','1 year as Data Analyst intern')""",
                      (hash_pw('test123'),))

        # Jobs
        c.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            company VARCHAR(200) NOT NULL,
            company_id INT DEFAULT NULL,
            location VARCHAR(100) NOT NULL,
            category VARCHAR(100) DEFAULT 'Development',
            salary VARCHAR(80) DEFAULT '',
            job_type VARCHAR(60) DEFAULT 'Full-time',
            skills TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")

        # Applications
        c.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_id INT NOT NULL,
            job_title VARCHAR(200),
            company VARCHAR(200),
            company_id INT DEFAULT NULL,
            user_id INT NOT NULL,
            user_name VARCHAR(120),
            user_email VARCHAR(180),
            user_skills TEXT,
            user_education VARCHAR(300),
            user_experience VARCHAR(300),
            resume_file VARCHAR(200),
            status ENUM('pending','accepted','rejected') DEFAULT 'pending',
            reviewed_by VARCHAR(120) DEFAULT NULL,
            reviewed_at DATETIME DEFAULT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")

        # Notifications
        c.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(30) DEFAULT 'info',
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")

        # Messages (HR → User after acceptance)
        c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            application_id INT NOT NULL,
            sender_id INT NOT NULL,
            sender_role ENUM('user','recruiter','admin') NOT NULL,
            sender_name VARCHAR(120),
            receiver_id INT NOT NULL,
            receiver_role ENUM('user','recruiter','admin') NOT NULL,
            content TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")

        # Seed jobs if empty
        c.execute("SELECT COUNT(*) as cnt FROM jobs")
        if c.fetchone()['cnt'] == 0:
            _seed_jobs(c)

    conn.commit(); conn.close()
    print("✅ Database initialised successfully.")

# ── SEED JOBS ─────────────────────────────────────────────────
def _seed_jobs(c):
    jobs = [
        ("Python Developer","TechCorp","Bangalore","Development","8-12 LPA","Full-time",
         "Python,Django,REST API,SQL,Git",
         "Build scalable backend systems using Python and Django.",2),
        ("Data Scientist","DataMinds","Hyderabad","Data Science","12-18 LPA","Full-time",
         "Python,Machine Learning,SQL,Pandas,NumPy,Scikit-learn",
         "Analyse large datasets and build ML models.",None),
        ("Machine Learning Engineer","AI Solutions","Pune","AI/ML","15-22 LPA","Full-time",
         "Python,TensorFlow,PyTorch,Machine Learning,Deep Learning,NLP",
         "Design and deploy ML pipelines in production.",None),
        ("Frontend Developer","WebWorks","Mumbai","Development","6-10 LPA","Full-time",
         "HTML,CSS,JavaScript,React,TypeScript,Git",
         "Create responsive web interfaces using React.",None),
        ("Full Stack Developer","StartupHub","Delhi","Development","10-16 LPA","Full-time",
         "JavaScript,React,Node.js,MongoDB,REST API,Git",
         "Work on both frontend and backend web applications.",None),
        ("Data Analyst","Analytics Pro","Chennai","Data Science","6-10 LPA","Full-time",
         "Python,SQL,Excel,Power BI,Tableau,Statistics",
         "Transform raw data into actionable insights.",None),
        ("DevOps Engineer","CloudSys","Bangalore","DevOps","12-20 LPA","Full-time",
         "Docker,Kubernetes,AWS,Linux,CI/CD,Python,Jenkins",
         "Build and maintain CI/CD pipelines and cloud infra.",None),
        ("Java Developer","Enterprise Tech","Hyderabad","Development","8-14 LPA","Full-time",
         "Java,Spring Boot,Microservices,SQL,REST API,Maven",
         "Develop enterprise-grade Java applications.",None),
        ("NLP Engineer","LangTech","Remote","AI/ML","14-22 LPA","Full-time",
         "Python,NLP,spaCy,NLTK,Transformers,Machine Learning",
         "Build NLP solutions for text classification.",None),
        ("Cloud Architect","CloudFirst","Bangalore","Cloud","20-30 LPA","Full-time",
         "AWS,Azure,GCP,Kubernetes,Docker,Terraform,Python",
         "Design scalable cloud infrastructure.",None),
        ("React Developer","PixelCraft","Mumbai","Development","8-13 LPA","Full-time",
         "React,JavaScript,TypeScript,Redux,CSS,REST API",
         "Build high-performance React applications.",None),
        ("Data Engineer","DataFlow","Pune","Data Science","12-18 LPA","Full-time",
         "Python,Apache Spark,Kafka,SQL,AWS,ETL,Airflow",
         "Build robust data pipelines and ETL processes.",None),
        ("AI Research Scientist","ResearchLab","Bangalore","AI/ML","20-35 LPA","Full-time",
         "Python,Machine Learning,Deep Learning,PyTorch,Mathematics",
         "Conduct cutting-edge AI research.",None),
        ("Android Developer","MobileFirst","Chennai","Mobile","8-14 LPA","Full-time",
         "Java,Kotlin,Android,REST API,Firebase,Git",
         "Build native Android applications.",None),
        ("UI/UX Designer","DesignHub","Mumbai","Design","6-11 LPA","Full-time",
         "Figma,Adobe XD,UI Design,User Research,Prototyping,CSS",
         "Design beautiful and intuitive user interfaces.",None),
        ("Cybersecurity Analyst","SecureNet","Delhi","Security","10-16 LPA","Full-time",
         "Network Security,Python,Linux,SIEM,Penetration Testing",
         "Monitor and protect systems from cyber threats.",None),
        ("Business Analyst","BizConsult","Hyderabad","Business","7-12 LPA","Full-time",
         "SQL,Excel,Power BI,Communication,Agile,Stakeholder Management",
         "Bridge business needs with technical solutions.",None),
        ("iOS Developer","AppStudio","Remote","Mobile","10-18 LPA","Full-time",
         "Swift,Objective-C,iOS,Xcode,REST API,Git",
         "Develop feature-rich iOS applications.",None),
        ("Blockchain Developer","Web3Tech","Remote","Development","15-25 LPA","Full-time",
         "Solidity,Ethereum,Python,JavaScript,Smart Contracts,Web3.js",
         "Build decentralised applications on blockchain.",None),
        ("Product Manager","ProductFirst","Bangalore","Management","15-25 LPA","Full-time",
         "Product Strategy,Agile,SQL,Communication,Roadmapping,Analytics",
         "Lead product development from ideation to launch.",None),
    ]
    c.executemany("""INSERT INTO jobs
        (title,company,location,category,salary,job_type,skills,description,company_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""", jobs)

# ── USER HELPERS ──────────────────────────────────────────────
def user_by_email(email):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM users WHERE email=%s", (email,))
        row = c.fetchone()
    conn.close(); return row

def user_by_id(uid):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM users WHERE id=%s", (uid,))
        row = c.fetchone()
    conn.close(); return row

def create_user(name, email, password):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("INSERT INTO users (name,email,password) VALUES (%s,%s,%s)",
                  (name, email, hash_pw(password)))
    conn.commit(); conn.close()

def update_user_profile(uid, skills, education, experience):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("UPDATE users SET skills=%s,education=%s,experience=%s WHERE id=%s",
                  (skills, education, experience, uid))
    conn.commit(); conn.close()

def update_resume_file(uid, filename):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("UPDATE users SET resume_file=%s WHERE id=%s", (filename, uid))
    conn.commit(); conn.close()

def all_users():
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT id,name,email,skills,education,experience,created_at FROM users")
        rows = c.fetchall()
    conn.close(); return rows

# ── COMPANY HELPERS ───────────────────────────────────────────
def company_by_email_or_username(key):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM companies WHERE email=%s", (key,))
        row = c.fetchone()
    conn.close(); return row

def company_by_id(cid):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM companies WHERE id=%s", (cid,))
        row = c.fetchone()
    conn.close(); return row

def create_company(name, email, password, company_name, industry, website, description):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("""INSERT INTO companies
            (name,email,password,company_name,industry,website,description,role)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'recruiter')""",
                  (name, email, hash_pw(password), company_name, industry, website, description))
        new_id = c.lastrowid
    conn.commit(); conn.close(); return new_id

def all_companies():
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT id,name,email,company_name,industry,role,approved,created_at FROM companies WHERE email!='admin'")
        rows = c.fetchall()
    conn.close(); return rows

# ── JOB HELPERS ───────────────────────────────────────────────
def all_jobs(q='', category='', location=''):
    conn = get_conn()
    with conn.cursor() as c:
        sql = "SELECT * FROM jobs WHERE 1=1"
        params = []
        if q:
            sql += " AND (title LIKE %s OR company LIKE %s)"
            params += [f'%{q}%', f'%{q}%']
        if category:
            sql += " AND category=%s"; params.append(category)
        if location and location.lower() != 'all':
            sql += " AND (location LIKE %s OR location='Remote')"; params.append(f'%{location}%')
        sql += " ORDER BY id DESC"
        c.execute(sql, params)
        rows = c.fetchall()
    conn.close(); return rows

def job_by_id(jid):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM jobs WHERE id=%s", (jid,))
        row = c.fetchone()
    conn.close(); return row

def insert_job(title, company, company_id, location, category, salary, job_type, skills, description):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("""INSERT INTO jobs
            (title,company,company_id,location,category,salary,job_type,skills,description)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                  (title, company, company_id, location, category, salary, job_type, skills, description))
        new_id = c.lastrowid
    conn.commit(); conn.close(); return new_id

def delete_job_db(jid):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("DELETE FROM jobs WHERE id=%s", (jid,))
    conn.commit(); conn.close()

# ── APPLICATION HELPERS ───────────────────────────────────────
def insert_application(job_id, job_title, company, company_id, user_id,
                        user_name, user_email, user_skills, user_education,
                        user_experience, resume_file):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("""INSERT INTO applications
            (job_id,job_title,company,company_id,user_id,user_name,user_email,
             user_skills,user_education,user_experience,resume_file)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                  (job_id, job_title, company, company_id, user_id, user_name, user_email,
                   user_skills, user_education, user_experience, resume_file))
        new_id = c.lastrowid
    conn.commit(); conn.close(); return new_id

def app_exists(user_id, job_id):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT id FROM applications WHERE user_id=%s AND job_id=%s", (user_id, job_id))
        row = c.fetchone()
    conn.close(); return row is not None

def apps_by_user(user_id):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM applications WHERE user_id=%s ORDER BY applied_at DESC", (user_id,))
        rows = c.fetchall()
    conn.close(); return rows

def apps_by_company(company_id, role):
    conn = get_conn()
    with conn.cursor() as c:
        if role == 'admin':
            c.execute("SELECT * FROM applications ORDER BY applied_at DESC")
        else:
            c.execute("SELECT * FROM applications WHERE company_id=%s ORDER BY applied_at DESC", (company_id,))
        rows = c.fetchall()
    conn.close(); return rows

def app_by_id(app_id):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM applications WHERE id=%s", (app_id,))
        row = c.fetchone()
    conn.close(); return row

def update_app_status(app_id, status, reviewer_name):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("""UPDATE applications SET status=%s,reviewed_by=%s,reviewed_at=%s WHERE id=%s""",
                  (status, reviewer_name, datetime.now(), app_id))
    conn.commit(); conn.close()

# ── NOTIFICATION HELPERS ──────────────────────────────────────
def add_notification(user_id, message, ntype='info'):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("INSERT INTO notifications (user_id,message,type) VALUES (%s,%s,%s)",
                  (user_id, message, ntype))
    conn.commit(); conn.close()

def get_notifications(user_id):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 30", (user_id,))
        rows = c.fetchall()
    conn.close(); return rows

def mark_notifications_read(user_id):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("UPDATE notifications SET is_read=1 WHERE user_id=%s", (user_id,))
    conn.commit(); conn.close()

# ── MESSAGE HELPERS ───────────────────────────────────────────
def send_message(app_id, sender_id, sender_role, sender_name, receiver_id, receiver_role, content):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("""INSERT INTO messages
            (application_id,sender_id,sender_role,sender_name,receiver_id,receiver_role,content)
            VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                  (app_id, sender_id, sender_role, sender_name, receiver_id, receiver_role, content))
        new_id = c.lastrowid
    conn.commit(); conn.close(); return new_id

def get_messages(app_id):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT * FROM messages WHERE application_id=%s ORDER BY created_at ASC", (app_id,))
        rows = c.fetchall()
    conn.close(); return rows

def mark_messages_read(app_id, reader_role):
    conn = get_conn()
    with conn.cursor() as c:
        # mark messages sent TO this role as read
        c.execute("UPDATE messages SET is_read=1 WHERE application_id=%s AND receiver_role=%s",
                  (app_id, reader_role))
    conn.commit(); conn.close()

def unread_message_count(user_id, role):
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("""SELECT COUNT(*) as cnt FROM messages
                     WHERE receiver_id=%s AND receiver_role=%s AND is_read=0""",
                  (user_id, role))
        row = c.fetchone()
    conn.close(); return row['cnt'] if row else 0
def get_admin_id():
    """Return the ID of the first admin account (super admin fallback)."""
    conn = get_conn()
    with conn.cursor() as c:
        c.execute("SELECT id FROM companies WHERE role='admin' ORDER BY id ASC LIMIT 1")
        row = c.fetchone()
    conn.close()
    return row['id'] if row else None
