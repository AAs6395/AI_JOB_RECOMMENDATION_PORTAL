# ⚡ CareerAI — AI-Powered Job Portal

> An intelligent full-stack job portal that uses **TF-IDF + Cosine Similarity** to match job seekers with the most relevant job listings based on their skills, education, and experience.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0.0-black?style=flat-square&logo=flask)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange?style=flat-square&logo=mysql)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4.0-F7931E?style=flat-square&logo=scikit-learn)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📌 Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Credentials](#demo-credentials)
- [User Roles](#user-roles)
- [Screenshots](#screenshots)
- [Author](#author)

---

## 📖 About the Project

**CareerAI** is a full-stack web application built as a PBL (Project-Based Learning) Full Stack Development project. It bridges the gap between job seekers and companies using AI-powered job matching. Users upload their resume, and the platform automatically extracts skills and ranks job listings by match percentage using machine learning.

The platform supports three distinct user roles — **Job Seekers**, **HR/Recruiters**, and **Super Admin** — each with their own dashboard and feature set.

---

## ✨ Features

### 👤 Job Seeker
- 🤖 **AI Job Matching** — TF-IDF + Cosine Similarity ranks jobs by % match to your profile
- 📄 **Resume Upload & Parsing** — Auto-extracts skills, education, and experience from PDF
- 📊 **ATS Resume Scorer** — Scores resume out of 100 with improvement tips
- 🧠 **Skill Gap Analyser** — Shows missing skills with Coursera/Udemy course recommendations
- 📋 **Application Tracker** — View all applied jobs and their statuses in real time
- 💬 **Two-way HR Messaging** — Chat directly with HR after application acceptance
- 🔔 **Real-time Notifications** — In-portal alerts for acceptance, rejection, and messages
- 🤖 **CareerBot AI Chatbot** — Ask career questions, get salary info, job advice
- 🧪 **Interview Prep** — MCQ quizzes and expert interview tips

### 🏢 HR / Recruiter
- ➕ Post unlimited job listings with skills, salary, category, and location
- 📥 View all applicants for company jobs with full profiles and resumes
- ✅ Accept or Reject applications with one click
- 💬 Message accepted candidates directly through the portal
- 📈 View job trend analytics (top skills, categories, locations)

### ⚙️ Super Admin
- 👥 View all registered job seekers and companies
- 💼 Manage all job listings (view & delete)
- 📊 Access all applications across all companies
- Full access to HR features

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python, Flask 3.0, Flask-CORS |
| **Database** | MySQL 8.0+ (via PyMySQL) |
| **AI / ML** | scikit-learn (TF-IDF, Cosine Similarity), NumPy |
| **Resume Parsing** | PyPDF2, pdfminer.six |
| **Frontend** | Vanilla HTML, CSS, JavaScript (no framework) |
| **Fonts** | Google Fonts — Syne, DM Sans |
| **Auth** | Flask Session (server-side, SHA-256 password hashing) |

---

## 📁 Project Structure

```
AI_JOB_PORTAL_V2/
│
├── app.py                  # Flask app entry point
├── requirements.txt        # Python dependencies
│
├── backend/
│   ├── __init__.py
│   ├── database.py         # MySQL connection, table creation, all DB helpers
│   ├── routes_auth.py      # Auth, profile, resume upload, AI recommendations
│   └── routes_jobs.py      # Jobs, applications, messaging, notifications, trends
│
├── templates/
│   ├── landing.html        # Public landing page
│   └── index.html          # Main app (auth + dashboard shell)
│
└── static/
    ├── css/
    │   └── style.css       # Full light-mode UI styles
    ├── js/
    │   ├── auth.js         # Login, register, session, navigation, notifications
    │   ├── user.js         # Job seeker features (profile, resume, chat, interview)
    │   ├── jobs.js         # Browse jobs, trends
    │   └── admin.js        # HR dashboard, post job, applicant review, HR chat
    └── uploads/            # Uploaded resume PDFs (auto-created)
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- MySQL 8.0+ (running locally)
- pip

### 1. Clone the Repository

```bash
git clone https://github.com/AAs6395/AI_JOB_PORTAL_V2.git
cd AI_JOB_PORTAL_V2
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure MySQL

Open `backend/database.py` and update the DB config with your MySQL credentials:

```python
DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",        # your MySQL username
    "password": "",            # your MySQL password
    "db":       "careerai",
    "charset":  "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}
```

> The database `careerai` and all tables are created **automatically** on first run. No manual SQL setup needed.

### 4. Run the App

```bash
python app.py
```

Visit **http://127.0.0.1:5000** in your browser.

---

## 🔑 Demo Credentials

| Role | Username / Email | Password |
|---|---|---|
| Job Seeker | `test@test.com` | `test123` |
| Super Admin | `admin` | `admin123` |
| HR (TechCorp) | `hr@techcorp.com` | `hr123` |

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Job Seeker** | Profile, Resume Upload, AI Jobs, Applications, Chat, CareerBot, Interview Prep |
| **Recruiter (HR)** | Post Jobs, View Applications, Accept/Reject, Message Candidates |
| **Admin** | All HR features + View all users, companies, and jobs |

---

## 🗃 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register/user` | Register job seeker |
| POST | `/api/register/company` | Register HR/Company |
| POST | `/api/login` | Login (user or admin/HR) |
| POST | `/api/logout` | Logout |
| GET/POST | `/api/profile` | Get or update user profile |
| POST | `/api/upload-resume` | Upload & parse PDF resume |
| POST | `/api/recommend` | AI job recommendations |
| GET | `/api/jobs` | List jobs (with filters) |
| POST | `/api/jobs` | Post a new job (HR/Admin) |
| DELETE | `/api/jobs/<id>` | Delete a job (HR/Admin) |
| POST | `/api/apply` | Apply for a job |
| GET | `/api/applications/mine` | User's applications |
| GET | `/api/applications/company` | Company's received applications |
| POST | `/api/applications/<id>/status` | Accept or reject application |
| GET/POST | `/api/messages/<app_id>` | Get or send messages |
| GET | `/api/notifications` | Get notifications |
| GET | `/api/trends` | Job market trends |
| POST | `/api/chat` | CareerBot AI chatbot |

---

## 🤖 How AI Matching Works

1. User's skills, education, and experience are combined into a **text profile**
2. Each job's skills, title, and description are combined into a **job text**
3. All texts are vectorised using **TF-IDF** (Term Frequency-Inverse Document Frequency)
4. **Cosine Similarity** is calculated between the user profile vector and each job vector
5. Jobs are ranked by similarity score (0–100%) and the top 10 are returned

---

## 👨‍💻 Author

**Aashish** (AAs6395)

- 📧 Email: [jaashish109@gmail.com](mailto:jaashish109@gmail.com)
- 🐙 GitHub: [@AAs6395](https://github.com/AAs6395)

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute.

---

> Built with ❤️ using Flask + MySQL + scikit-learn | PBL Full Stack Development Project
