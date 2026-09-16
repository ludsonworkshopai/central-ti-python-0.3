import unittest
from unittest.mock import Mock
from flask import Flask, render_template
from pathlib import Path

from models.alerts import Alerts
from routes import Routes


class AlertTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__, template_folder=str(Path(__file__).resolve().parents[1] / 'templates'))
        self.app.config.update(TESTING=True, SECRET_KEY='test', ADMIN_PASSWORD='test-password')
        self.routes = Routes()
        self.routes._user = Mock()
        self.app.register_blueprint(self.routes.routes)
        self.client = self.app.test_client()

    def test_all_templates_include_alerts(self):
        with self.app.test_request_context('/'):
            for name in ('index', 'login', 'acompanhar', 'erro'):
                html = render_template(name + '.html')
                self.assertEqual(html.count('id="system-alerts"'), 1)
                self.assertIn('"duracao": 5000', html)
            for page in ('dashboard', 'equipe'):
                html = render_template('base.html', page=page)
                self.assertEqual(html.count('id="system-alerts"'), 1)
                self.assertIn('"duracao": 5000', html)

    def test_flash_once_and_escape_script(self):
        with self.client.session_transaction() as session:
            session['_flashes'] = [('sistema', Alerts('</script><script>alert(1)</script>', 'aviso').to_dict())]
        html = self.client.get('/').get_data(as_text=True)
        self.assertNotIn('</script><script>alert(1)</script>', html)
        self.assertIn('alert(1)', html)
        self.assertNotIn('alert(1)', self.client.get('/').get_data(as_text=True))

    def test_login_logout_and_error_categories(self):
        result = self.client.post('/api/login', json={'email': 'admin', 'senha': 'wrong'})
        self.assertEqual(result.json['alert']['tipo'], 'erro')
        result = self.client.post('/api/login', json={'email': 'admin', 'senha': 'test-password'})
        self.assertEqual(result.status_code, 200)
        self.assertIn('Login realizado', self.client.get('/').get_data(as_text=True))
        self.routes._user.list_all.side_effect = RuntimeError('database unavailable')
        result = self.client.get('/usuarios')
        self.assertEqual(result.json['alert']['tipo'], 'info')
        result = self.client.post('/usuarios', json={'nome': 'A'})
        self.assertEqual(result.json['alert']['tipo'], 'erro')
        self.client.post('/api/logout', json={})
        self.assertIn('saiu do sistema', self.client.get('/').get_data(as_text=True))

    def test_access_denied_and_missing_page(self):
        with self.client.session_transaction() as session:
            session['user'] = {'id': 1, 'funcao': 1}
        self.routes._user.get_by_id.return_value = {'id': 1, 'funcao': 1}
        result = self.client.get('/dashboard')
        self.assertEqual(result.status_code, 403)
        self.assertIn('id="system-alerts"', result.get_data(as_text=True))
        self.assertEqual(self.client.get('/missing').status_code, 404)


if __name__ == '__main__':
    unittest.main()
