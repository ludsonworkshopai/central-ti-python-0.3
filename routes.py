import hmac
from werkzeug.exceptions import HTTPException
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, current_app
from models.users import User
from models.alerts import Alerts


class Routes:

    def __init__(self):
        self.routes = Blueprint("routes", __name__)
        self._user = None
        self.routes.app_context_processor(Alerts.contexto)
        self.register_routes()

    @property
    def user(self):
        if self._user is None:
            self._user = User()
        return self._user

    @staticmethod
    def _is_local_admin(user):
        # Identidade reservada ao login local, autenticado com ADMIN_PASSWORD.
        # Usuários do banco possuem ID inteiro e não recebem esta exceção.
        return isinstance(user, dict) and user.get('id') == 'admin' and user.get('email') == 'admin'

    @staticmethod
    def _erro_api(error, mensagem="Erro ao processar a solicitação."):
        print(f"Erro na API: {error}")
        tipo = 'erro' if isinstance(error, ValueError) or getattr(error, 'code', None) in {'23505', '23514', '23502'} else 'info'
        if isinstance(error, ValueError):
            mensagem = str(error)
        return jsonify({
            "success": False,
            "message": mensagem,
            "alert": Alerts(mensagem, tipo).to_dict(),
        }), 400

    def register_routes(self):

        @self.routes.app_errorhandler(HTTPException)
        def http_error(error):
            mensagem = {
                404: 'A página solicitada não foi encontrada.',
                405: 'Esta ação não está disponível neste endereço.',
                413: 'Os dados enviados ultrapassam o limite permitido.',
            }.get(error.code, 'Não foi possível concluir a solicitação.')
            alerta = Alerts(mensagem, 'info' if error.code >= 500 else 'erro')
            if request.path.startswith(('/api/', '/usuarios')):
                response = error.get_response()
                response.data = current_app.json.dumps({'success': False, 'message': mensagem, 'alert': alerta.to_dict()})
                response.content_type = 'application/json'
                return response
            alerta.enviar()
            return render_template('erro.html'), error.code

        @self.routes.before_request
        def protect():
            private = request.endpoint in {'routes.dashboard', 'routes.equipe'} or request.path.startswith('/usuarios')
            if private and not session.get('user'):
                if request.path.startswith('/usuarios'):
                    return jsonify(success=False, message='Faça login para continuar.'), 401
                return redirect(url_for('routes.login'))
            # O administrador local tem acesso irrestrito às ferramentas,
            # independentemente de função ou nível de acesso.
            if request.endpoint == 'routes.dashboard' and not self._is_local_admin(session.get('user')):
                user = session['user']
                # Consulte a função atual para revogar o acesso mesmo em sessões abertas.
                try:
                    current_user = self.user.get_by_id(user['id']) if type(user.get('id')) is int else None
                except Exception:
                    current_app.logger.error('Falha ao verificar acesso ao dashboard.')
                    Alerts('Não foi possível verificar seu acesso. Tente novamente.', 'info').enviar()
                    return render_template('erro.html'), 503
                funcao = current_user.get('funcao') if current_user else None
                if type(funcao) is not int or funcao != 0:
                    Alerts('Acesso negado. O dashboard é exclusivo para técnicos.', 'erro').enviar()
                    return render_template('erro.html'), 403
                session['user'] = {**user, **current_user}
            if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
                # JSON cannot be submitted by a cross-site HTML form. No CORS is enabled.
                if not request.is_json:
                    return jsonify(success=False, message='Envie dados em JSON.'), 415
                origin = request.headers.get('Origin')
                if origin and origin != request.host_url.rstrip('/'):
                    return jsonify(success=False, message='Origem não permitida.'), 403
                if not isinstance(request.get_json(silent=True), dict):
                    return jsonify(success=False, message='JSON inválido.'), 400

        @self.routes.after_request
        def no_cache(response):
            if response.is_json:
                payload = response.get_json(silent=True)
                if isinstance(payload, dict) and payload.get('message') and 'alert' not in payload:
                    tipo = 'info' if response.status_code >= 500 else 'erro' if response.status_code >= 400 else 'sucesso'
                    payload['alert'] = Alerts(payload['message'], tipo).to_dict()
                    response.set_data(current_app.json.dumps(payload))
            if request.endpoint != 'static':
                response.headers['Cache-Control'] = 'no-store'
            return response

        @self.routes.route('/api/login', methods=['POST'])
        def authenticate():
            data = request.get_json()
            email, password = data.get('email'), data.get('senha')
            remember = data.get('lembrar', False)
            if not isinstance(email, str) or not isinstance(password, str) or not isinstance(remember, bool):
                return jsonify(success=False, message='Dados de login inválidos.'), 400
            email = email.strip().lower()
            if not email or not password or len(email) > 255 or len(password) > 1024:
                return jsonify(success=False, message='Informe usuário e senha válidos.'), 400
            if email == 'admin':
                expected = current_app.config['ADMIN_PASSWORD']
                user = {'id': 'admin', 'nome': 'ADMINISTRADOR', 'email': 'admin'} if expected and hmac.compare_digest(password.encode(), expected.encode()) else None
            else:
                try:
                    user = self.user.authenticate(email, password)
                except Exception:
                    current_app.logger.error('Falha ao consultar o banco no login.')
                    return jsonify(success=False, message='Login indisponível. Tente novamente.'), 503
            if not user:
                return jsonify(success=False, message='Usuário ou senha incorretos.'), 401
            user['iniciais'] = ''.join(part[0] for part in user['nome'].split()[:2]).upper()
            session.clear()
            session.permanent = remember
            session['user'] = user
            Alerts('Login realizado com sucesso.', 'sucesso').enviar()
            return jsonify(success=True, data=user)

        @self.routes.route('/api/logout', methods=['POST'])
        def logout():
            session.clear()
            Alerts('Você saiu do sistema.', 'sucesso').enviar()
            return jsonify(success=True)


        @self.routes.route("/")
        def index():
            user = session.get('user')
            pode_acessar_dashboard = self._is_local_admin(user) or (
                isinstance(user, dict) and type(user.get('funcao')) is int and user['funcao'] == 0
            )
            return render_template("index.html", pode_acessar_dashboard=pode_acessar_dashboard)

        @self.routes.route("/login")
        def login():
            if session.get("user"):
                user = session['user']
                destino = 'routes.dashboard' if self._is_local_admin(user) or (type(user.get('funcao')) is int and user['funcao'] == 0) else 'routes.index'
                return redirect(url_for(destino))
            return render_template("login.html")

        @self.routes.route("/dashboard")
        def dashboard():
            return render_template("base.html", page="dashboard")

        @self.routes.route("/equipe")
        def equipe():
            return render_template("base.html", page="equipe")

        @self.routes.route("/usuarios", methods=["GET"])
        def listar_usuarios():
            try:
                usuarios = self.user.list_all()
                return jsonify({
                    "success": True,
                    "data": usuarios,
                }), 200
            except Exception as error:
                return self._erro_api(error, "Não foi possível carregar os usuários.")

        @self.routes.route("/usuarios", methods=["POST"])
        def criar_usuario():
            try:
                data = request.get_json(silent=True) or {}

                try:
                    nome = User.normalizar_nome(data.get("nome"))
                except ValueError as error:
                    return jsonify(success=False, message=str(error)), 400
                email = (data.get("email") or "").strip().lower()
                senha = data.get("senha") or ""

                if len(nome) < 2:
                    return jsonify({
                        "success": False,
                        "message": "Informe um nome válido."
                    }), 400

                if not email:
                    return jsonify({
                        "success": False,
                        "message": "Informe o e-mail."
                    }), 400

                if not senha.strip():
                    return jsonify({
                        "success": False,
                        "message": "Informe a senha."
                    }), 400

                try:
                    funcao = User.validar_funcao(data.get("funcao", 1))
                except ValueError as error:
                    return jsonify(success=False, message=str(error)), 400

                resultado = self.user.create(nome, email, senha, funcao=funcao)

                return jsonify({
                    "success": True,
                    "data": resultado,
                }), 201

            except Exception as error:
                return self._erro_api(
                    error,
                    "Não foi possível cadastrar o usuário. Verifique se o e-mail já está cadastrado."
                )

        @self.routes.route("/usuarios/<int:user_id>", methods=["PUT"])
        def atualizar_usuario(user_id):
            try:
                data = request.get_json(silent=True) or {}

                try:
                    nome = User.normalizar_nome(data.get("nome"))
                except ValueError as error:
                    return jsonify(success=False, message=str(error)), 400
                email = (data.get("email") or "").strip().lower()
                senha = data.get("senha")

                if len(nome) < 2:
                    return jsonify({
                        "success": False,
                        "message": "Informe um nome válido."
                    }), 400

                if not email:
                    return jsonify({
                        "success": False,
                        "message": "Informe o e-mail."
                    }), 400

                funcao = None
                if "funcao" in data:
                    try:
                        funcao = User.validar_funcao(data["funcao"])
                    except ValueError as error:
                        return jsonify(success=False, message=str(error)), 400

                resultado = self.user.update(user_id, nome, email, senha, funcao=funcao)

                if not resultado:
                    return jsonify({
                        "success": False,
                        "message": "Usuário não encontrado."
                    }), 404

                return jsonify({
                    "success": True,
                    "data": resultado,
                }), 200

            except Exception as error:
                return self._erro_api(
                    error,
                    "Não foi possível atualizar o usuário. Verifique se o e-mail já está cadastrado."
                )

        @self.routes.route("/usuarios/<int:user_id>", methods=["DELETE"])
        def excluir_usuario(user_id):
            try:
                resultado = self.user.delete(user_id)

                if not resultado:
                    return jsonify({
                        "success": False,
                        "message": "Usuário não encontrado."
                    }), 404

                return jsonify({
                    "success": True,
                    "data": resultado,
                }), 200

            except Exception as error:
                return self._erro_api(error, "Não foi possível excluir o usuário.")
