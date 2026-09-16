# Mensagens do sistema

A classe `models.alerts.Alerts` define os tipos e a duração de 5 segundos.
O componente `templates/partials/alerts.html` carrega os ícones e o controlador
`static/js/alerts.js`, responsável pela interação no navegador.

| Tipo | Cor | Quando usar |
| --- | --- | --- |
| `info` | Azul | Problema inesperado, como indisponibilidade do banco |
| `sucesso` | Verde | Ação concluída |
| `aviso` | Amarelo | Situação que não impede continuar |
| `erro` | Vermelho | Ação impedida por erro de uso ou validação |

## Python

```python
from models.alerts import Alerts

# Exibir na próxima página, inclusive após redirecionamento.
Alerts('Operação concluída.', 'sucesso').enviar()

# Incluir em uma resposta JSON.
alerta = Alerts('Informe o e-mail.', 'erro')
return jsonify(success=False, message=alerta.mensagem, alert=alerta.to_dict()), 400
```

## JavaScript

```javascript
window.CentralTI.alerts.sucesso('Usuário cadastrado.');
window.CentralTI.alerts.erro('Informe um nome válido.');
window.CentralTI.alerts.aviso('Esta opção ainda não está disponível.');
window.CentralTI.alerts.info('Serviço indisponível. Tente novamente.');
```

Novas páginas devem incluir `{% include 'partials/alerts.html' %}` antes dos
scripts que emitem mensagens. A configuração vem automaticamente do contexto
Flask registrado pelas rotas. Mensagens são inseridas como texto, nunca HTML.

O botão X e o prazo de 5 segundos fecham cada alerta individualmente.
Na confirmação de exclusão, fechar ou deixar expirar cancela a operação;
somente o botão Confirmar autoriza a exclusão.

Conteúdo da página (conversa do chamado, dados, resumos e estados de carregamento)
continua no fluxo da página; notificações de operações usam o componente global.
