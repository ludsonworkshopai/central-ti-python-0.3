from connDB import Database
import re
import unicodedata
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    def __init__(self):
        self.db = Database()
        self.table = "users"

    @staticmethod
    def normalizar_nome(nome):
        if not isinstance(nome, str):
            raise ValueError("Nome inválido.")
        nome = re.sub(r'[\u0300-\u036f]', '', unicodedata.normalize('NFD', nome.upper())).strip()
        if not 2 <= len(nome) <= 255:
            raise ValueError("O nome deve possuir entre 2 e 255 caracteres.")
        return nome

    @staticmethod
    def validar_funcao(funcao):
        if type(funcao) is not int or funcao not in (0, 1):
            raise ValueError("Selecione uma função válida: Técnico ou Funcionário.")
        return funcao

    def create(self, nome, email, senha, funcao=1):

        nome = self.normalizar_nome(nome)

        if not email:
            raise ValueError("E-mail obrigatório.")

        if not senha or len(senha) < 6:
            raise ValueError("A senha deve possuir pelo menos 6 caracteres.")

        senha_hash = generate_password_hash(senha)

        data = {
            "nome": nome,
            "email": email.lower().strip(),
            "senha": senha_hash,
            "funcao": self.validar_funcao(funcao),
        }

        result = self.db.insert(self.table, data)
        return self.public(result[0]) if result else None
    
    def list_all(self):
        return self.db.select(
            self.table,
            ["id", "nome", "email", "funcao", "created_at", "updated_at"]
        )

    def get_by_id(self, user_id):
        result = (self.db.supabase.table(self.table)
                  .select('id,nome,email,funcao')
                  .eq('id', user_id).limit(1).execute())
        return self.public(result.data[0]) if result.data else None

    def update(self, user_id, nome, email, senha=None, funcao=None):
        data = {
            "nome": self.normalizar_nome(nome),
            "email": email.strip().lower(),
        }

        if funcao is not None:
            data["funcao"] = self.validar_funcao(funcao)

        if senha is not None and senha != "":
            if not isinstance(senha, str) or len(senha) < 6:
                raise ValueError("A senha deve possuir pelo menos 6 caracteres.")
            data["senha"] = generate_password_hash(senha)

        result = self.db.update(self.table, user_id, data)
        return self.public(result[0]) if result else None

    def delete(self, user_id):
        result = self.db.delete(self.table, user_id)
        return self.public(result[0]) if result else None
    @staticmethod
    def public(user):
        return {key: user[key] for key in ('id', 'nome', 'email', 'funcao', 'created_at', 'updated_at') if key in user}

    def authenticate(self, email, password):
        result = self.db.supabase.table(self.table).select('id,nome,email,senha,funcao').eq('email', email).limit(1).execute()
        user = result.data[0] if result.data else None
        if not user:
            return None
        try:
            valid = check_password_hash(user['senha'], password)
        except (ValueError, TypeError):
            valid = False
        return self.public(user) if valid else None
