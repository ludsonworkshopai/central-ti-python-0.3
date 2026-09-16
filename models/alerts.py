from flask import flash, get_flashed_messages


class Alerts:
    """Mensagens reutilizáveis para respostas JSON e páginas HTML."""

    DURACAO = 5000
    TIPOS = {
        'info': {'classe': 'primary', 'icone': 'info-fill', 'rotulo': 'Alerta'},
        'sucesso': {'classe': 'success', 'icone': 'check-circle-fill', 'rotulo': 'Sucesso'},
        'aviso': {'classe': 'warning', 'icone': 'exclamation-triangle-fill', 'rotulo': 'Alerta'},
        'erro': {'classe': 'danger', 'icone': 'exclamation-triangle-fill', 'rotulo': 'Erro'},
    }

    def __init__(self, mensagem, tipo='info'):
        if tipo not in self.TIPOS:
            raise ValueError('Tipo de alerta inválido.')
        self.mensagem = str(mensagem)
        self.tipo = tipo

    def to_dict(self):
        return {'mensagem': self.mensagem, 'tipo': self.tipo}

    def enviar(self):
        """Exibe na próxima página, inclusive após redirecionamento."""
        flash(self.to_dict(), 'sistema')
        return self

    @classmethod
    def contexto(cls):
        return {'alerts_config': {'tipos': cls.TIPOS, 'duracao': cls.DURACAO},
                'alerts_iniciais': get_flashed_messages(category_filter=['sistema'])}
