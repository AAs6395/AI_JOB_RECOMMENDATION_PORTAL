"""
app.py  ─  CareerAI Main Entry Point
Run:  python app.py
"""
import os
from flask import Flask, send_from_directory
from flask_cors import CORS

# ── Create app ────────────────────────────────────────────────
app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'careerai_secret_key_2024'
CORS(app, supports_credentials=True)

os.makedirs('static/uploads', exist_ok=True)

# ── Init MySQL database ───────────────────────────────────────
from backend.database import init_db
init_db()

# ── Register Blueprints ───────────────────────────────────────
from backend.routes_auth import auth_bp
from backend.routes_jobs import jobs_bp
app.register_blueprint(auth_bp)
app.register_blueprint(jobs_bp)

# ── Serve Frontend ────────────────────────────────────────────
@app.route('/')
def landing():
    return send_from_directory('templates', 'landing.html')

@app.route('/app')
def main_app():
    return send_from_directory('templates', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    for folder in ['templates', 'static']:
        full = os.path.join(folder, path)
        if os.path.exists(full):
            return send_from_directory(folder, path)
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
