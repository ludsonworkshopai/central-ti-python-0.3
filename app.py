import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv(Path(__file__).with_name('.env'))
from routes import Routes

app = Flask(__name__)

app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,
    x_proto=1,
    x_host=1,
)

secret = os.environ.get('SECRET_KEY')
if not secret:
    raise RuntimeError('Configure SECRET_KEY no arquivo .env.')

app.config.update(
    SECRET_KEY=secret,
    ADMIN_PASSWORD=os.environ.get('ADMIN_PASSWORD', ''),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true',
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    SESSION_REFRESH_EACH_REQUEST=False,
    MAX_CONTENT_LENGTH=1024 * 1024,
)
routes = Routes()
app.register_blueprint(routes.routes)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
