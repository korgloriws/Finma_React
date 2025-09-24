from flask import Flask, jsonify, request, make_response, send_from_directory, send_file
from flask_cors import CORS
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import (
    global_state, carregar_ativos, obter_carteira, adicionar_ativo_carteira, 
    remover_ativo_carteira, atualizar_ativo_carteira, obter_movimentacoes, obter_historico_carteira,

    salvar_receita, carregar_receitas_mes_ano, atualizar_receita, remover_receita,
    adicionar_cartao, carregar_cartoes_mes_ano, atualizar_cartao, remover_cartao, 
    adicionar_outro_gasto, carregar_outros_mes_ano, atualizar_outro_gasto, remover_outro_gasto, 
    calcular_saldo_mes_ano,

    consultar_marmitas, adicionar_marmita, remover_marmita, gastos_mensais,

    criar_tabela_usuarios, cadastrar_usuario, buscar_usuario_por_username, verificar_senha,
    set_usuario_atual, get_usuario_atual, inicializar_bancos_usuario, criar_sessao, invalidar_sessao,

    verificar_resposta_seguranca, alterar_senha_direta, atualizar_pergunta_seguranca,
    invalidar_todas_sessoes,
    obter_historico_carteira_comparado,
    save_rebalance_config,
    get_rebalance_config,
    compute_rebalance_status,
    registrar_rebalance_event,
    get_rebalance_history,
    list_asset_types,
    create_asset_type,
    rename_asset_type,
    delete_asset_type,
    atualizar_precos_indicadores_carteira,
    obter_taxas_indexadores,
    _upgrade_controle_schema,
    LISTA_ACOES,
    LISTA_FIIS,
    LISTA_BDRS,
    _ensure_rf_catalog_schema,
    rf_catalog_list,
    rf_catalog_create,
    rf_catalog_update,
    rf_catalog_delete,
    _ensure_goals_schema,
    get_goals,
    save_goals,
    compute_goals_projection,
)
from models import cache
import requests
try:
    import cloudscraper # type: ignore
except Exception:
    cloudscraper = None

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))

server = Flask(
    __name__,
    static_folder=FRONTEND_DIST,
    static_url_path=''
)


try:
    from flask_compress import Compress
    Compress(server)
except Exception:
    pass


try:
    cache.init_app(server)
except Exception:
    pass


try:
    FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN')
    allowed_origins = set()
    if FRONTEND_ORIGIN:
        allowed_origins.add(FRONTEND_ORIGIN)
  
    allowed_origins.update({
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    })
    CORS(
        server,
        supports_credentials=True,
        resources={r"/api/*": {"origins": list(allowed_origins)}},
    )
except Exception:

    CORS(server, supports_credentials=True)


try:
    criar_tabela_usuarios()
except Exception as e:
    try:
        print(f"WARN: falha ao criar tabela de usuários na inicialização: {e}")
    except Exception:
        pass


try:
    invalidar_todas_sessoes()
except Exception:
    pass



@server.route("/api/auth/registro", methods=["POST"])
def api_registro():
    
    try:
        data = request.get_json()
        nome = data.get('nome')
        username = data.get('username')
        senha = data.get('senha')
        pergunta_seguranca = data.get('pergunta_seguranca') 
        resposta_seguranca = data.get('resposta_seguranca')  
        
        if not nome or not username or not senha:
            return jsonify({"error": "Nome, username e senha são obrigatórios"}), 400
        
 
        usuario_existente = buscar_usuario_por_username(username)
        if usuario_existente:
            return jsonify({"error": "Usuário já existe"}), 400
        
        
        resultado = cadastrar_usuario(nome, username, senha, pergunta_seguranca, resposta_seguranca)
        if resultado:
           
            inicializar_bancos_usuario(username)
            return jsonify({"message": "Usuário cadastrado com sucesso"}), 201
        else:
            return jsonify({"error": "Erro ao cadastrar usuário"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/login", methods=["POST"])
def api_login():
    
    try:
        data = request.get_json()
        username = data.get('username')
        senha = data.get('senha')
        
        if not username or not senha:
            return jsonify({"error": "Username e senha são obrigatórios"}), 400
        
      
        if verificar_senha(username, senha):

            try:
                import os
                current_dir = os.path.dirname(os.path.abspath(__file__))
                bancos_dir = os.path.join(current_dir, "bancos_usuarios", username)
                
                if not os.path.exists(bancos_dir):
                    inicializar_bancos_usuario(username)
                else:
             
                    bancos_necessarios = ['carteira.db', 'controle.db', 'marmitas.db']
                    bancos_existentes = [f for f in os.listdir(bancos_dir) if f.endswith('.db')]
                    
                    if len(bancos_existentes) < 3:
                        inicializar_bancos_usuario(username)
            except Exception as e:
               
                pass
            

            set_usuario_atual(username)
           
            session_token = criar_sessao(username, duracao_segundos=3600)
           
            response = make_response(jsonify({
                "message": "Login realizado com sucesso",
                "username": username
            }), 200)

           
            is_production = bool(os.getenv('FLY_APP_NAME')) or os.getenv('ENVIRONMENT') == 'production'
            cookie_samesite = 'None' if is_production else 'Lax'
            cookie_secure = True if is_production else False

            
            response.set_cookie(
                'session_token',
                session_token,
                httponly=True,
                samesite=cookie_samesite,
                secure=cookie_secure
            )
            
            return response
        else:
            return jsonify({"error": "Credenciais inválidas"}), 401
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/logout", methods=["POST"])
def api_logout():

    try:
       
        from models import limpar_sessoes_expiradas, SESSION_LOCK
        import threading
        
     
        try:
            token = request.cookies.get('session_token')
            if token:
                invalidar_sessao(token)
        except Exception:
            pass
        
        
        limpar_sessoes_expiradas()
        
     
        response = make_response(jsonify({"message": "Logout realizado com sucesso"}), 200)
        response.delete_cookie('session_token')
        
      
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/usuario-atual", methods=["GET"])
def api_usuario_atual():

    try:
        usuario = get_usuario_atual()
        if usuario:
            return jsonify({"username": usuario}), 200
        else:
            return jsonify({"error": "Nenhum usuário logado"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/debug-bancos", methods=["GET"])
def api_debug_bancos():
    
    try:
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        bancos_dir = os.path.join(current_dir, "bancos_usuarios")
        
        if not os.path.exists(bancos_dir):
            return jsonify({"error": "Diretório bancos_usuarios não existe"}), 404
        
        usuarios = []
        for user_dir in os.listdir(bancos_dir):
            user_path = os.path.join(bancos_dir, user_dir)
            if os.path.isdir(user_path):
                bancos = []
                for file in os.listdir(user_path):
                    if file.endswith('.db'):
                        bancos.append(file)
                usuarios.append({
                    "usuario": user_dir,
                    "bancos": bancos,
                    "caminho": user_path
                })
        
        return jsonify({
            "bancos_dir": bancos_dir,
            "usuarios": usuarios
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/criar-bancos/<username>", methods=["POST"])
def api_criar_bancos(username):
    
    try:

        usuario_existente = buscar_usuario_por_username(username)
        if not usuario_existente:
            return jsonify({"error": "Usuário não encontrado"}), 404
        
       
        inicializar_bancos_usuario(username)
        
        return jsonify({
            "message": f"Bancos criados com sucesso para {username}",
            "username": username
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== APIs DE RECUPERAÇÃO DE SENHA ====================

@server.route("/api/auth/obter-pergunta", methods=["POST"])
def api_obter_pergunta():
  
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
            return jsonify({"error": "Username é obrigatório"}), 400
        
        # Buscar usuário
        usuario = buscar_usuario_por_username(username)
        if not usuario:
            return jsonify({"error": "Usuário não encontrado"}), 404
        
        if not usuario.get('pergunta_seguranca'):
            return jsonify({"error": "Usuário não possui pergunta de segurança configurada"}), 400
        
        return jsonify({
            "pergunta": usuario['pergunta_seguranca']
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/verificar-resposta", methods=["POST"])
def api_verificar_resposta():
    """Verificar resposta de segurança"""
    try:
        data = request.get_json()
        username = data.get('username')
        resposta = data.get('resposta')
        
        if not username or not resposta:
            return jsonify({"error": "Username e resposta são obrigatórios"}), 400
        
        # Verificar resposta
        if verificar_resposta_seguranca(username, resposta):
            return jsonify({"message": "Resposta correta"}), 200
        else:
            return jsonify({"error": "Resposta incorreta"}), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/redefinir-senha", methods=["POST"])
def api_redefinir_senha():
    """Redefinir senha após verificação de segurança"""
    try:
        data = request.get_json()
        username = data.get('username')
        nova_senha = data.get('nova_senha')
        
        if not username or not nova_senha:
            return jsonify({"error": "Username e nova senha são obrigatórios"}), 400
        
        if len(nova_senha) < 6:
            return jsonify({"error": "A senha deve ter pelo menos 6 caracteres"}), 400
        
        # Alterar senha
        if alterar_senha_direta(username, nova_senha):
            return jsonify({"message": "Senha alterada com sucesso"}), 200
        else:
            return jsonify({"error": "Erro ao alterar senha"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/atualizar-pergunta", methods=["POST"])
def api_atualizar_pergunta():
    """Atualizar pergunta de segurança de um usuário"""
    try:
        data = request.get_json()
        username = data.get('username')
        pergunta = data.get('pergunta')
        resposta = data.get('resposta')
        
        if not username or not pergunta or not resposta:
            return jsonify({"error": "Username, pergunta e resposta são obrigatórios"}), 400
        
        # Atualizar pergunta de segurança
        if atualizar_pergunta_seguranca(username, pergunta, resposta):
            return jsonify({"message": "Pergunta de segurança atualizada com sucesso"}), 200
        else:
            return jsonify({"error": "Erro ao atualizar pergunta de segurança"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/auth/verificar-pergunta", methods=["POST"])
def api_verificar_pergunta():
    """Verificar se o usuário tem pergunta de segurança configurada"""
    try:
        data = request.get_json()
        username = data.get('username')
        
        if not username:
            return jsonify({"error": "Username é obrigatório"}), 400
        
        # Buscar usuário
        usuario = buscar_usuario_por_username(username)
        if not usuario:
            return jsonify({"error": "Usuário não encontrado"}), 404
        
        # Verificar se tem pergunta configurada
        tem_pergunta = bool(usuario.get('pergunta_seguranca'))
        
        return jsonify({
            "tem_pergunta": tem_pergunta,
            "pergunta": usuario.get('pergunta_seguranca') if tem_pergunta else None
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== APIs REST ====================

@server.route("/api/analise/ativos", methods=["POST"])
def api_analise_ativos():
    try:
        data = request.get_json()
        tipo = data.get('tipo', 'acoes')  
        filtros = data.get('filtros', {})
        
        from models import (
            processar_ativos_acoes_com_filtros,
            processar_ativos_bdrs_com_filtros,
            processar_ativos_fiis_com_filtros
        )
        
        if tipo == 'acoes':
            dados = processar_ativos_acoes_com_filtros(
                filtros.get('roe_min', 0),
                filtros.get('dy_min', 0),
                filtros.get('pl_min', 0),
                filtros.get('pl_max', float('inf')),
                filtros.get('pvp_max', float('inf'))
            )
        elif tipo == 'bdrs':
            dados = processar_ativos_bdrs_com_filtros(
                filtros.get('roe_min', 0),
                filtros.get('dy_min', 0),
                filtros.get('pl_min', 0),
                filtros.get('pl_max', float('inf')),
                filtros.get('pvp_max', float('inf'))
            )
        elif tipo == 'fiis':
            dados = processar_ativos_fiis_com_filtros(
                filtros.get('dy_min', 0),
                filtros.get('dy_max', float('inf')),
                filtros.get('liq_min', 0)
            )
        else:
            return jsonify({"error": "Tipo inválido"}), 400
            
        return jsonify(dados)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/listas/ativos", methods=["GET"])
def api_listas_ativos():
    try:
        tipo = (request.args.get('tipo') or '').lower()
        if tipo in ('acao','acoes','ação','ações'):
            return jsonify({"tipo":"acoes","tickers": LISTA_ACOES})
        if tipo in ('fii','fiis'):
            return jsonify({"tipo":"fiis","tickers": LISTA_FIIS})
        if tipo in ('bdr','bdrs'):
            return jsonify({"tipo":"bdrs","tickers": LISTA_BDRS})
        # Sem filtro: retorna todos (cuidado com tamanho)
        return jsonify({
            "acoes": LISTA_ACOES,
            "fiis": LISTA_FIIS,
            "bdrs": LISTA_BDRS,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route('/api/rf/catalog', methods=['GET','POST','PUT','DELETE'])
def api_rf_catalog():
    try:
        if request.method == 'GET':
            return jsonify({ 'items': rf_catalog_list() })
        data = request.get_json() or {}
        if request.method == 'POST':
            res = rf_catalog_create(data)
            return jsonify(res)
        if request.method == 'PUT':
            id_ = int(data.get('id'))
            res = rf_catalog_update(id_, data)
            return jsonify(res)
        if request.method == 'DELETE':
            id_ = int(data.get('id'))
            res = rf_catalog_delete(id_)
            return jsonify(res)
        return jsonify({"error":"Método não suportado"}), 405
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/analise/resumo", methods=["GET"])
def api_analise_resumo():
    """API para obter resumo dos ativos"""
    try:
        df_ativos = carregar_ativos()
        
        if df_ativos.empty:
            return jsonify({
                "total_ativos": 0,
                "media_dy": 0,
                "media_pl": 0,
                "media_roe": 0,
                "maior_dy": 0,
                "menor_pl": 0,
                "melhor_roe": 0,
                "ativo_maior_dy": "-",
                "ativo_menor_pl": "-",
                "ativo_melhor_roe": "-"
            })
        
        # Calcular estatísticas
        total_ativos = len(df_ativos)
        media_dy = df_ativos['dividend_yield'].mean() if 'dividend_yield' in df_ativos.columns else 0
        media_pl = df_ativos['pl'].mean() if 'pl' in df_ativos.columns else 0
        media_roe = df_ativos['roe'].mean() if 'roe' in df_ativos.columns else 0
        
        # Encontrar melhores
        maior_dy = df_ativos['dividend_yield'].max() if 'dividend_yield' in df_ativos.columns else 0
        menor_pl = df_ativos['pl'].min() if 'pl' in df_ativos.columns else 0
        melhor_roe = df_ativos['roe'].max() if 'roe' in df_ativos.columns else 0
        
        # Encontrar ativos com melhores indicadores
        ativo_maior_dy = df_ativos.loc[df_ativos['dividend_yield'].idxmax(), 'ticker'] if 'dividend_yield' in df_ativos.columns and not df_ativos['dividend_yield'].isnull().all() else '-'
        ativo_menor_pl = df_ativos.loc[df_ativos['pl'].idxmin(), 'ticker'] if 'pl' in df_ativos.columns and not df_ativos['pl'].isnull().all() else '-'
        ativo_melhor_roe = df_ativos.loc[df_ativos['roe'].idxmax(), 'ticker'] if 'roe' in df_ativos.columns and not df_ativos['roe'].isnull().all() else '-'
        
        return jsonify({
            "total_ativos": total_ativos,
            "media_dy": float(media_dy),
            "media_pl": float(media_pl),
            "media_roe": float(media_roe),
            "maior_dy": float(maior_dy),
            "menor_pl": float(menor_pl),
            "melhor_roe": float(melhor_roe),
            "ativo_maior_dy": str(ativo_maior_dy),
            "ativo_menor_pl": str(ativo_menor_pl),
            "ativo_melhor_roe": str(ativo_melhor_roe)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/start_load", methods=["POST"])
def api_iniciar():
    carregar_ativos()
    return jsonify({"status": "Carregamento iniciado"}), 202

@server.route("/api/get_data", methods=["GET"])
def api_get_data():
    df = global_state.get("df_ativos")
    return jsonify(df.to_dict("records") if isinstance(df, pd.DataFrame) else [])

@server.route("/api/ativo/<ticker>", methods=["GET"])
def api_get_ativo_details(ticker):
    try:
        ticker = ticker.strip().upper()
        # Se contiver hifen (criptos ex: BTC-USD), não acrescentar .SA
        if '-' not in ticker and '.' not in ticker and len(ticker) <= 6:
            ticker += '.SA'
        
        acao = yf.Ticker(ticker)
        info = acao.info or {}
        historico = acao.history(period="max")
        dividends = acao.dividends if hasattr(acao, 'dividends') else None
        
        def convert_timestamps(obj):
            if isinstance(obj, dict):
                return {k: convert_timestamps(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_timestamps(item) for item in obj]
            elif hasattr(obj, 'isoformat'): 
                return obj.isoformat()
            else:
                return obj
        
        historico_json = []
        if historico is not None and not historico.empty:
            for index, row in historico.iterrows():
                row_dict = row.to_dict()
                row_dict['Date'] = index.isoformat()
                historico_json.append(row_dict)
        
        dividends_json = {}
        if dividends is not None and not dividends.empty:
            for index, value in dividends.items():
                dividends_json[index.isoformat()] = float(value)

        # Enriquecimento específico para FII
        fii_extra = None
        try:
            # Heurística simples para identificar FII brasileiro (ex.: VISC11.SA)
            is_brazilian_fii = ticker.endswith('11.SA') or ticker.endswith('11')
            if is_brazilian_fii:
                current_price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
                # DY 12 meses a partir da série de dividendos
                dy_12m = None
                dividendo_medio_12m = None
                ultimo_rendimento_valor = None
                ultimo_rendimento_data = None
                if dividends is not None and not dividends.empty and current_price:
                    from datetime import datetime, timedelta
                    cutoff = datetime.utcnow() - timedelta(days=365)
                    # Índice é DatetimeIndex
                    last_12m = dividends[dividends.index >= cutoff]
                    soma_12m = float(last_12m.sum()) if last_12m is not None else 0.0
                    dy_12m = (soma_12m / float(current_price) * 100.0) if current_price and soma_12m is not None else None
                    # Média por evento (não mensal) nos últimos 12 meses
                    if last_12m is not None and len(last_12m) > 0:
                        dividendo_medio_12m = float(soma_12m / len(last_12m))
                    # Último rendimento
                    try:
                        ultimo_rendimento_valor = float(dividends.iloc[-1])
                        ultimo_rendimento_data = dividends.index[-1].isoformat()
                    except Exception:
                        pass

                # Classificação por palavras-chave (resumo do negócio)
                summary = (info.get('longBusinessSummary') or '').lower()
                fii_tipo = None
                segmento = None
                if any(k in summary for k in ['híbrido', 'hibrido', 'hybrid']):
                    fii_tipo = 'Híbrido'
                elif any(k in summary for k in ['recebível', 'recebiveis', 'cri', 'crédito imobiliário', 'credito imobiliario', 'papel']):
                    fii_tipo = 'Papel'
                elif any(k in summary for k in ['shopping', 'logística', 'logistica', 'laje', 'lajes', 'galpão', 'galpao', 'escritório', 'escritorio', 'residencial', 'industrial', 'hospital', 'educacional']):
                    fii_tipo = 'Tijolo'


                segmentos = ['shopping', 'logística', 'logistica', 'lajes corporativas', 'escritórios', 'escritorios', 'residencial', 'industrial', 'hospitalar', 'educacional', 'galpões', 'galpoes']
                for seg in segmentos:
                    if seg in summary:
                        segmento = seg.capitalize()
                        break
                if not segmento and fii_tipo == 'Papel':
                    segmento = 'Recebíveis/CRI'

                # Estimativa de VP por cota (se P/VP disponível)
                pvp = info.get('priceToBook')
                vp_por_cota = (float(current_price) / float(pvp)) if current_price and pvp not in (None, 0) else None

                fii_extra = {
                    'tipo': fii_tipo,  # Tijolo | Papel | Híbrido | None
                    'segmento': segmento,  # Ex.: Shopping, Logística, etc.
                    'gestora': info.get('fundFamily') or None,
                    'administradora': info.get('legalType') or None,
                    'vacancia': None,  # Não disponível no yfinance
                    'patrimonio_liquido': info.get('totalAssets'),
                    'num_cotistas': None,
                    'num_imoveis': None,
                    'vp_por_cota': vp_por_cota,
                    'dy_12m': dy_12m,
                    'dividendo_medio_12m': dividendo_medio_12m,
                    'ultimo_rendimento_valor': ultimo_rendimento_valor,
                    'ultimo_rendimento_data': ultimo_rendimento_data,
                }
        except Exception as _:
            fii_extra = None
        
        dados = {
            "info": info,
            "historico": historico_json,
            "dividends": dividends_json,
            "fii": fii_extra
        }
        
        return jsonify(dados)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/ativo/<ticker>/historico", methods=["GET"])
def api_get_ativo_historico(ticker):
    try:
        periodo = request.args.get('periodo', '1y')
        ticker = ticker.strip().upper()
        if '-' not in ticker and '.' not in ticker and len(ticker) <= 6:
            ticker += '.SA'
        
        acao = yf.Ticker(ticker)
        historico = acao.history(period=periodo)
        
        if periodo != "max" and historico is not None and not historico.empty:
            if periodo.endswith("mo"):
                meses = int(periodo.replace("mo", ""))
                dt_ini = historico.index.max() - timedelta(days=30*meses)
            elif periodo.endswith("y"):
                anos = int(periodo.replace("y", ""))
                dt_ini = historico.index.max() - timedelta(days=365*anos)
            else:
                dt_ini = historico.index.min()
            
            historico = historico[historico.index >= dt_ini]
        
        historico_json = []
        if historico is not None and not historico.empty:
            for index, row in historico.iterrows():
                row_dict = row.to_dict()
                row_dict['Date'] = index.isoformat()
                historico_json.append(row_dict)
        
        return jsonify(historico_json)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/comparar", methods=["POST"])
def api_comparar_ativos():
    try:
        data = request.get_json()
        tickers = data.get('tickers', [])
        
        if not tickers:
            return jsonify({"error": "Nenhum ticker fornecido"}), 400
        
        resultados = []
        for ticker in tickers:
            try:
                ticker = ticker.strip().upper()
                if '.' not in ticker and len(ticker) <= 6:
                    ticker_yf = ticker + '.SA'
                else:
                    ticker_yf = ticker
                
                acao = yf.Ticker(ticker_yf)
                info = acao.info or {}
                
                resultados.append({
                    "ticker": ticker,
                    "nome": info.get('longName', '-'),
                    "preco_atual": info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose'),
                    "pl": info.get('trailingPE'),
                    "pvp": info.get('priceToBook'),
                    "dy": info.get('dividendYield'),
                    "roe": info.get('returnOnEquity'),
                    "setor": info.get('sector', '-'),
                    "pais": info.get('country', '-'),
                })
            except Exception as e:
                resultados.append({
                    "ticker": ticker,
                    "nome": f"Erro: {str(e)}",
                    "preco_atual": None,
                    "pl": None,
                    "pvp": None,
                    "dy": None,
                    "roe": None,
                    "setor": "-",
                    "pais": "-"
                })
        
        return jsonify(resultados)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/tickers/sugestoes", methods=["GET"])
def api_get_ticker_sugestoes():
    try:
        ativos = obter_carteira()
        opcoes = [{"label": f"{a['ticker']} - {a['nome_completo']}", "value": a['ticker']} for a in ativos]
        
        exemplos = [
            {"label": "PETR4.SA - Petrobras", "value": "PETR4.SA"},
            {"label": "ITUB4.SA - Itaú Unibanco", "value": "ITUB4.SA"},
            {"label": "BOVA11.SA - BOVA11 ETF", "value": "BOVA11.SA"},
            {"label": "AAPL - Apple", "value": "AAPL"},
            {"label": "MSFT - Microsoft", "value": "MSFT"},
            {"label": "TSLA - Tesla", "value": "TSLA"},
        ]
        
        tickers_existentes = set([o['value'] for o in opcoes])
        for ex in exemplos:
            if ex['value'] not in tickers_existentes:
                opcoes.append(ex)
        
        return jsonify(opcoes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/logo/<ticker>", methods=["GET"])
def api_get_logo_url(ticker):
    try:
        from complete_b3_logos_mapping import get_logo_url
        logo_url = get_logo_url(ticker)
        return jsonify({"logo_url": logo_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/logos", methods=["POST"])
def api_get_logos_batch():
    try:
        data = request.get_json() or {}
        tickers = data.get('tickers') or []
        if not isinstance(tickers, list):
            return jsonify({"error": "tickers deve ser lista"}), 400
        from complete_b3_logos_mapping import get_logo_url
        out = {}
        for t in tickers[:500]:
            try:
                out[t] = get_logo_url(str(t))
            except Exception:
                out[t] = None
        return jsonify({"logos": out})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== SERVE FRONTEND (SPA) ====================

@server.route('/', defaults={'path': ''})
@server.route('/<path:path>')
def serve_frontend(path):
    # Evitar capturar rotas de API
    if path.startswith('api/'):
        return jsonify({"error": "Not Found"}), 404

    # Servir arquivos estáticos gerados pelo Vite e service worker/manifest
    requested_path = os.path.join(server.static_folder, path) if path else None
    if path and os.path.exists(requested_path):
        return send_from_directory(server.static_folder, path)
    # Service worker e manifest que ficam na raiz do build do Vite
    if path in ('sw.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'):
        return send_from_directory(server.static_folder, path)

    # Fallback para index.html (React Router)
    index_path = os.path.join(server.static_folder, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(server.static_folder, 'index.html')
    return jsonify({"message": "Frontend não construído. Rode npm run build em frontend/"}), 200

# ==================== APIs DE CARTEIRA ====================

@server.route("/api/carteira", methods=["GET"])
def api_get_carteira():
    """API para obter todos os ativos da carteira"""
    try:
        refresh = request.args.get('refresh') in ('1', 'true', 'True')
        # Debug: verificar qual usuário está sendo usado
        usuario_atual = get_usuario_atual()
        print(f"DEBUG - Carteira: Usuário atual = {usuario_atual}")
        # Refresh solicitado: atualiza preços/indicadores e ignora cache
        if refresh:
            try:
                atualizar_precos_indicadores_carteira()
                if usuario_atual and cache:
                    cache.delete(f"carteira:{usuario_atual}")
                    cache.delete(f"carteira_insights:{usuario_atual}")
            except Exception as _:
                pass
        # Cache por usuário (30s)
        cache_key = f"carteira:{usuario_atual}" if (usuario_atual and not refresh) else None
        if cache_key and cache:
            cached = cache.get(cache_key)
            if cached is not None:
                return jsonify(cached)
        carteira = obter_carteira()
        if cache_key and cache:
            try:
                cache.set(cache_key, carteira, timeout=30)
            except Exception:
                pass
        return jsonify(carteira)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/refresh", methods=["POST"])
def api_refresh_carteira():
    try:
        print("DEBUG: Iniciando refresh da carteira...")
        result = atualizar_precos_indicadores_carteira()
        print(f"DEBUG: Resultado do refresh: {result}")
        
        # Invalida caches relacionados
        try:
            usuario_atual = get_usuario_atual()
            if usuario_atual and cache:
                cache.delete(f"carteira:{usuario_atual}")
                cache.delete(f"carteira_insights:{usuario_atual}")
        except Exception:
            pass
        
        if not result.get("success"):
            return jsonify(result), 500
        return jsonify(result)
    except Exception as e:
        print(f"DEBUG: Erro no refresh da carteira: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@server.route("/api/carteira/refresh-indexadores", methods=["POST"])
def api_refresh_indexadores():
    """Endpoint específico para atualizar apenas ativos com indexadores"""
    try:
        print("DEBUG: Iniciando refresh específico de indexadores...")
        result = atualizar_precos_indicadores_carteira()
        print(f"DEBUG: Resultado do refresh de indexadores: {result}")
        
        # Invalida caches relacionados
        try:
            usuario_atual = get_usuario_atual()
            if usuario_atual and cache:
                cache.delete(f"carteira:{usuario_atual}")
                cache.delete(f"carteira_insights:{usuario_atual}")
        except Exception:
            pass
        
        if not result.get("success"):
            return jsonify(result), 500
        return jsonify(result)
    except Exception as e:
        print(f"DEBUG: Erro no refresh de indexadores: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@server.route("/api/carteira/insights", methods=["GET"])
def api_carteira_insights():
    try:
        usuario_atual = get_usuario_atual()
        if not usuario_atual:
            return jsonify({"error": "Não autenticado"}), 401
        cache_key = f"carteira_insights:{usuario_atual}"
        if cache:
            cached = cache.get(cache_key)
            if cached is not None:
                return jsonify(cached)

        itens = obter_carteira() or []
        total_investido = float(sum((it.get('valor_total') or 0.0) for it in itens)) if itens else 0.0
        num_ativos = len(itens)
        tipos_map = {}
        for it in itens:
            tipos_map[it.get('tipo') or 'Desconhecido'] = tipos_map.get(it.get('tipo') or 'Desconhecido', 0) + (it.get('valor_total') or 0.0)

        # Percentuais por ativo
        enriched = []
        for it in itens:
            valor = float(it.get('valor_total') or 0.0)
            pct = (valor / total_investido * 100.0) if total_investido > 0 else 0.0
            enriched.append({
                **it,
                'percentual_carteira': pct
            })
        top_positions = sorted(enriched, key=lambda x: x.get('valor_total') or 0.0, reverse=True)[:5]

   
        concentration_alerts = []
        for it in enriched:
            if it['percentual_carteira'] > 25.0:
                concentration_alerts.append({
                    'ticker': it['ticker'],
                    'percentual': it['percentual_carteira']
                })

       
        soma_valor_dy = 0.0
        for it in itens:
            dy_raw = it.get('dy')
            if dy_raw is None:
                continue
            try:
                dy_val = float(dy_raw)
            except Exception:
                continue
            dy_frac = (dy_val / 100.0) if dy_val > 1.5 else dy_val
            soma_valor_dy += float((it.get('valor_total') or 0.0)) * dy_frac
        weighted_dy = (soma_valor_dy / total_investido) if total_investido > 0 else None
        weighted_dy_pct = (round(weighted_dy * 100.0, 2) if weighted_dy is not None else None)

        # Médias/contagens de métricas
        def _safe_vals(key):
            vals = [float(it.get(key)) for it in itens if it.get(key) is not None]
            return vals
        vals_pl = _safe_vals('pl')
        vals_pvp = _safe_vals('pvp')
        vals_roe = _safe_vals('roe')

        avg_pl = (sum(vals_pl)/len(vals_pl)) if vals_pl else None
        avg_pvp = (sum(vals_pvp)/len(vals_pvp)) if vals_pvp else None
        avg_roe = (sum(vals_roe)/len(vals_roe)) if vals_roe else None

        high_pl = len([v for v in vals_pl if v is not None and v > 25.0])
        low_pl = len([v for v in vals_pl if v is not None and 0.0 < v <= 10.0])
        undervalued_pvp = len([v for v in vals_pvp if v is not None and v <= 1.0])
        over_pvp = len([v for v in vals_pvp if v is not None and v >= 3.0])
        negative_roe = len([v for v in vals_roe if v is not None and v < 0.0])

        # Top DY (até 5)
        top_dy = sorted(
            [it for it in itens if it.get('dy') is not None],
            key=lambda x: x.get('dy') or 0.0,
            reverse=True
        )[:5]
        top_dy = [
            {
                'ticker': it['ticker'],
                'nome_completo': it.get('nome_completo'),
                'dy': float(it.get('dy') or 0.0),
                'dy_pct': (round(float(it.get('dy')), 2) if (it.get('dy') is not None and float(it.get('dy')) > 1.5) else round((float(it.get('dy') or 0.0) * 100.0), 2)),
                'percentual_carteira': next((e['percentual_carteira'] for e in enriched if e['ticker']==it['ticker']), 0.0)
            } for it in top_dy
        ]

        # Diversificação (HHI simples)
        shares = [(v / total_investido) for v in tipos_map.values()] if total_investido > 0 else []
        hhi = sum([s*s for s in shares]) if shares else None

        payload = {
            'resumo': {
                'total_investido': total_investido,
                'num_ativos': num_ativos,
                'tipos': {k: {'valor': float(v), 'percentual': (float(v)/total_investido*100.0 if total_investido>0 else 0.0)} for k, v in tipos_map.items()},
                'weighted_dy': weighted_dy,  # fração (compat)
                'weighted_dy_pct': weighted_dy_pct,
                'avg_pl': avg_pl,
                'avg_pvp': avg_pvp,
                'avg_roe': avg_roe,  # fração
                'hhi': hhi,
            },
            'concentracao': {
                'top_positions': [
                    {
                        'ticker': it.get('ticker'),
                        'valor_total': float(it.get('valor_total') or 0.0),
                        'percentual': it.get('percentual_carteira')
                    } for it in top_positions
                ],
                'alerts': concentration_alerts
            },
            'avaliacao': {
                'pl': {
                    'avg': avg_pl,
                    'high_count': high_pl,
                    'low_count': low_pl,
                },
                'pvp': {
                    'avg': avg_pvp,
                    'undervalued_count': undervalued_pvp,
                    'overpriced_count': over_pvp,
                },
                'roe': {
                    'avg': avg_roe,
                    'negative_count': negative_roe,
                }
            },
            'renda': {
                'weighted_dy': weighted_dy,
                'weighted_dy_pct': weighted_dy_pct,
                'top_dy': top_dy,
                'ativos_sem_dy': len([1 for it in itens if not it.get('dy')])
            }
        }

        if cache:
            try:
                cache.set(cache_key, payload, timeout=30)
            except Exception:
                pass
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@server.route('/api/goals', methods=['GET', 'POST'])
def api_goals():
    try:
        usuario_atual = get_usuario_atual()
        if not usuario_atual:
            return jsonify({"error": "Não autenticado"}), 401
        _ensure_goals_schema()
        if request.method == 'GET':
            g = get_goals() or {}
            return jsonify(g)
        data = request.get_json() or {}
        res = save_goals(data)
        try:
            if cache:
                cache.delete(f"goals:{usuario_atual}")
        except Exception:
            pass
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@server.route('/api/goals/projecao', methods=['POST'])
def api_goals_projecao():
    try:
        usuario_atual = get_usuario_atual()
        if not usuario_atual:
            return jsonify({"error": "Não autenticado"}), 401
        payload = request.get_json() or {}
        goal = payload or (get_goals() or {})
        proj = compute_goals_projection(goal or {})
        return jsonify(proj)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== EXPORT RELATÓRIOS ====================

def _parse_periodo_args():
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    inicio = request.args.get('inicio')
    fim = request.args.get('fim')
    return mes, ano, inicio, fim


@server.route('/api/relatorios/movimentacoes.csv', methods=['GET'])
def export_movimentacoes_csv():
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return jsonify({"error": "Não autenticado"}), 401
        mes, ano, inicio, fim = _parse_periodo_args()
        if inicio or fim:
            movs = obter_movimentacoes() or []
            def to_date(s):
                from datetime import datetime
                try:
                    return datetime.strptime(s[:10], '%Y-%m-%d')
                except Exception:
                    return None
            di = to_date(inicio) if inicio else None
            df = to_date(fim) if fim else None
            filtered = []
            for m in movs:
                dt = to_date(m.get('data') or '')
                if dt is None:
                    continue
                if di and dt < di:
                    continue
                if df and dt > df:
                    continue
                filtered.append(m)
            rows = filtered
        else:
            rows = obter_movimentacoes(mes, ano) or []

        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['data', 'ticker', 'nome', 'quantidade', 'preco', 'tipo'])
        for r in rows:
            writer.writerow([
                r.get('data'), r.get('ticker'), r.get('nome_completo'), r.get('quantidade'), r.get('preco'), r.get('tipo')
            ])
        resp = make_response(output.getvalue())
        resp.headers['Content-Type'] = 'text/csv; charset=utf-8'
        resp.headers['Content-Disposition'] = 'attachment; filename="movimentacoes.csv"'
        return resp
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@server.route('/api/relatorios/posicoes.csv', methods=['GET'])
def export_posicoes_csv():
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return jsonify({"error": "Não autenticado"}), 401
        itens = obter_carteira() or []
        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ticker', 'nome', 'quantidade', 'preco_atual', 'valor_total', 'tipo', 'dy', 'pl', 'pvp', 'roe'])
        for it in itens:
            writer.writerow([
                it.get('ticker'), it.get('nome_completo'), it.get('quantidade'), it.get('preco_atual'),
                it.get('valor_total'), it.get('tipo'), it.get('dy'), it.get('pl'), it.get('pvp'), it.get('roe')
            ])
        resp = make_response(output.getvalue())
        resp.headers['Content-Type'] = 'text/csv; charset=utf-8'
        resp.headers['Content-Disposition'] = 'attachment; filename="posicoes.csv"'
        return resp
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@server.route('/api/relatorios/rendimentos.csv', methods=['GET'])
def export_rendimentos_csv():
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return jsonify({"error": "Não autenticado"}), 401
        periodo = request.args.get('periodo', 'mensal')
        hist = obter_historico_carteira_comparado(periodo or 'mensal') or {}
        datas = hist.get('datas') or []
        carteira = hist.get('carteira_valor') or []
        import csv, io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['periodo', 'valor_carteira'])
        for i, d in enumerate(datas):
            writer.writerow([d, carteira[i] if i < len(carteira) else None])
        resp = make_response(output.getvalue())
        resp.headers['Content-Type'] = 'text/csv; charset=utf-8'
        resp.headers['Content-Disposition'] = 'attachment; filename="rendimentos.csv"'
        return resp
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@server.route('/api/relatorios/movimentacoes.pdf', methods=['GET'])
def export_movimentacoes_pdf():
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return jsonify({"error": "Não autenticado"}), 401
        mes, ano, inicio, fim = _parse_periodo_args()
        if inicio or fim:
            rows = obter_movimentacoes() or []
        else:
            rows = obter_movimentacoes(mes, ano) or []
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from io import BytesIO
        except Exception:
            return jsonify({"error": "PDF indisponível no momento (dependência ausente)"}), 500
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 40
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, "Relatório de Movimentações")
        y -= 20
        c.setFont("Helvetica", 9)
        for r in rows:
            if y < 40:
                c.showPage(); y = height - 40; c.setFont("Helvetica", 9)
            line = f"{r.get('data','')}  {r.get('ticker',''):8}  {r.get('tipo',''):7}  qtd={r.get('quantidade','')}  preco={r.get('preco','')}"
            c.drawString(40, y, line)
            y -= 14
        c.showPage()
        c.save()
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name='movimentacoes.pdf', mimetype='application/pdf')
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@server.route('/api/relatorios/posicoes.pdf', methods=['GET'])
def export_posicoes_pdf():
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return jsonify({"error": "Não autenticado"}), 401
        itens = obter_carteira() or []
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from io import BytesIO
        except Exception:
            return jsonify({"error": "PDF indisponível no momento (dependência ausente)"}), 500
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 40
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, "Relatório de Posições")
        y -= 20
        c.setFont("Helvetica", 9)
        for it in itens:
            if y < 40:
                c.showPage(); y = height - 40; c.setFont("Helvetica", 9)
            line = f"{it.get('ticker',''):8}  {it.get('nome_completo','')[:40]}  qtd={it.get('quantidade','')}  val={it.get('valor_total','')}"
            c.drawString(40, y, line)
            y -= 14
        c.showPage()
        c.save()
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name='posicoes.pdf', mimetype='application/pdf')
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@server.route('/api/relatorios/rendimentos.pdf', methods=['GET'])
def export_rendimentos_pdf():
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return jsonify({"error": "Não autenticado"}), 401
        periodo = request.args.get('periodo', 'mensal')
        hist = obter_historico_carteira_comparado(periodo or 'mensal') or {}
        datas = hist.get('datas') or []
        carteira = hist.get('carteira_valor') or []
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from io import BytesIO
        except Exception:
            return jsonify({"error": "PDF indisponível no momento (dependência ausente)"}), 500
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 40
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, "Relatório de Rendimentos")
        y -= 20
        c.setFont("Helvetica", 9)
        for i, d in enumerate(datas):
            if y < 40:
                c.showPage(); y = height - 40; c.setFont("Helvetica", 9)
            val = carteira[i] if i < len(carteira) else None
            line = f"{d}: {val}"
            c.drawString(40, y, line)
            y -= 14
        c.showPage()
        c.save()
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name='rendimentos.pdf', mimetype='application/pdf')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Rotas sem extensão para evitar conflitos com estáticos
@server.route('/api/relatorios/movimentacoes', methods=['GET'])
def export_movimentacoes_generic():
    formato = (request.args.get('formato') or 'csv').lower()
    if formato == 'pdf':
        return export_movimentacoes_pdf()
    return export_movimentacoes_csv()

@server.route('/api/relatorios/posicoes', methods=['GET'])
def export_posicoes_generic():
    formato = (request.args.get('formato') or 'csv').lower()
    if formato == 'pdf':
        return export_posicoes_pdf()
    return export_posicoes_csv()

@server.route('/api/relatorios/rendimentos', methods=['GET'])
def export_rendimentos_generic():
    formato = (request.args.get('formato') or 'csv').lower()
    if formato == 'pdf':
        return export_rendimentos_pdf()
    return export_rendimentos_csv()

@server.route("/api/carteira/adicionar", methods=["POST"])
def api_adicionar_ativo():
    """API para adicionar um ativo à carteira"""
    try:
        data = request.get_json()
        ticker = data.get('ticker')
        quantidade = data.get('quantidade')
        tipo = data.get('tipo')
        preco_inicial = data.get('preco_inicial')
        nome_personalizado = data.get('nome_personalizado')
        indexador = data.get('indexador')  # 'CDI' | 'IPCA' | 'SELIC' | 'PREFIXADO' | None
        indexador_pct = data.get('indexador_pct')  # percentual (ex.: 110) ou taxa fixa (% a.a.)
        data_aplicacao = data.get('data_aplicacao')  # 'YYYY-MM-DD'
        vencimento = data.get('vencimento')  # 'YYYY-MM-DD'
        isento_ir = data.get('isento_ir')  # bool
        liquidez_diaria = data.get('liquidez_diaria')  # bool
        
        if not ticker or not quantidade:
            return jsonify({"error": "Ticker e quantidade são obrigatórios"}), 400

        # Estimar preço histórico para RV quando data_aplicacao informada e sem preco
        try:
            tipo_lc = (tipo or '').strip().lower()
            is_rv = any(k in tipo_lc for k in ['ação','acoes','acao','fii','bdr'])
            if (preco_inicial is None or preco_inicial == '' or float(preco_inicial) == 0.0) and data_aplicacao and is_rv and not indexador:
                t = (ticker or '').strip().upper()
                t_yf = t + '.SA' if ('-' not in t and '.' not in t and len(t) <= 6) else t
                from datetime import datetime, timedelta
                try:
                    base_date = datetime.strptime(str(data_aplicacao)[:10], '%Y-%m-%d').date()
                except Exception:
                    base_date = datetime.utcnow().date()
                start = base_date - timedelta(days=14)
                end = base_date + timedelta(days=1)
                try:
                    hist = yf.Ticker(t_yf).history(start=start.isoformat(), end=end.isoformat())
                    if hist is not None and not hist.empty:
                        close_val = None
                        for idx, row in hist[::-1].iterrows():
                            d = idx.date()
                            if d <= base_date:
                                close_val = float(row.get('Close') or row.get('Adj Close') or 0)
                                break
                        if close_val and close_val > 0:
                            preco_inicial = close_val
                except Exception:
                    pass
        except Exception:
            pass

        resultado = adicionar_ativo_carteira(
            ticker, quantidade, tipo, preco_inicial, nome_personalizado,
            indexador, indexador_pct, data_aplicacao, vencimento, isento_ir, liquidez_diaria
        )
        # invalidar cache simples
        try:
            if cache:
                cache.clear()
        except Exception:
            pass
        if resultado["success"]:
            return jsonify(resultado), 201
        else:
            return jsonify(resultado), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/remover/<int:id>", methods=["DELETE"])
def api_remover_ativo(id):
    """API para remover um ativo da carteira"""
    try:
        resultado = remover_ativo_carteira(id)
        try:
            if cache:
                cache.clear()
        except Exception:
            pass
        
        if resultado["success"]:
            return jsonify(resultado), 200
        else:
            return jsonify(resultado), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/atualizar/<int:id>", methods=["PUT"])
def api_atualizar_ativo(id):
    """API para atualizar quantidade e/ou preço do ativo"""
    try:
        data = request.get_json() or {}
        quantidade = data.get('quantidade')
        preco_atual = data.get('preco_atual')
        if quantidade is None and preco_atual is None:
            return jsonify({"error": "Informe quantidade e/ou preco_atual"}), 400
        resultado = atualizar_ativo_carteira(id, quantidade, preco_atual)
        try:
            if cache:
                cache.clear()
        except Exception:
            pass
        
        if resultado["success"]:
            return jsonify(resultado), 200
        else:
            return jsonify(resultado), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/movimentacoes", methods=["GET"])
def api_get_movimentacoes():

    try:
        mes = request.args.get('mes', type=int)
        ano = request.args.get('ano', type=int)
        
        usuario_atual = get_usuario_atual()
        cache_key = None
        if cache and usuario_atual:
            cache_key = f"movimentacoes:{usuario_atual}:{mes or ''}:{ano or ''}"
            cached = cache.get(cache_key)
            if cached is not None:
                return jsonify(cached)
        movimentacoes = obter_movimentacoes(mes, ano)
        if cache and cache_key:
            try:
                cache.set(cache_key, movimentacoes, timeout=30)
            except Exception:
                pass
        return jsonify(movimentacoes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/rebalance/config", methods=["GET", "POST"])
def api_rebalance_config():
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            periodo = str(data.get('periodo') or 'mensal').lower()
            targets = data.get('targets') or {}
            last_rebalance_date = data.get('last_rebalance_date')
            res = save_rebalance_config(periodo, targets, last_rebalance_date)
            return jsonify(res)
        else:
            cfg = get_rebalance_config() or {}
            return jsonify(cfg)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/rebalance/status", methods=["GET"])
def api_rebalance_status():
    try:
        status = compute_rebalance_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/rebalance/history", methods=["GET", "POST"])
def api_rebalance_history():
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            date_str = data.get('date')
            res = registrar_rebalance_event(date_str)
            return jsonify(res)
        else:
            hist = get_rebalance_history() or []
            return jsonify({"history": hist})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Indicadores (SELIC, CDI, IPCA) via BCB SGS
@server.route("/api/indicadores", methods=["GET"])
def api_indicadores():
    try:

        def sgs_last(series_id, use_range=False):
            if use_range:
                end_date = datetime.now()
                start_date = end_date - timedelta(days=90)
                url = (f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}/dados?"
                       f"formato=json&dataInicial={start_date.strftime('%d/%m/%Y')}"
                       f"&dataFinal={end_date.strftime('%d/%m/%Y')}")
                r = requests.get(url, timeout=10)
                r.raise_for_status()
                arr = r.json()
                return arr[-1] if arr else None
            else:
                url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}/dados/ultimos/1?formato=json"
                r = requests.get(url, timeout=10)
                r.raise_for_status()
                arr = r.json()
                return arr[0] if arr else None

        selic = sgs_last(432, use_range=True)
        cdi = sgs_last(12, use_range=True)
        ipca = sgs_last(433)
        
        return jsonify({
            "selic": selic,
            "cdi": cdi,
            "ipca": ipca,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Taxas de indexadores (SELIC, CDI, IPCA) via função do models.py
@server.route("/api/taxas-indexadores", methods=["GET"])
def api_taxas_indexadores():
    try:
        taxas = obter_taxas_indexadores()
        
        return jsonify({
            "selic": taxas.get('SELIC', 0),
            "cdi": taxas.get('CDI', 0),
            "ipca": taxas.get('IPCA', 0),
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        print(f"Erro ao obter taxas de indexadores: {e}")
        return jsonify({"error": str(e)}), 500

@server.route("/api/teste-indexador", methods=["POST"])
def api_teste_indexador():
    """Endpoint para testar o cálculo de indexadores"""
    try:
        from models import calcular_preco_com_indexador, obter_taxas_indexadores
        data = request.get_json()
        
        preco_inicial = float(data.get('preco_inicial', 100))
        indexador = data.get('indexador', 'CDI')
        indexador_pct = float(data.get('indexador_pct', 100))
        data_adicao = data.get('data_adicao', datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        # Primeiro obter as taxas para debug
        taxas = obter_taxas_indexadores()
        print(f"DEBUG: Taxas disponíveis para teste: {taxas}")
        
        # Testar com diferentes cenários
        resultados = []
        
        # Cenário 1: Taxa atual da API
        preco_calculado = calcular_preco_com_indexador(preco_inicial, indexador, indexador_pct, data_adicao)
        resultados.append({
            "cenario": "Taxa atual da API",
            "preco_calculado": preco_calculado,
            "variacao": ((preco_calculado - preco_inicial) / preco_inicial) * 100
        })
        
        # Cenário 2: Taxa padrão (CDI 13.65%, SELIC 13.75%)
        if indexador == "CDI":
            taxa_padrao = 13.65
        elif indexador == "SELIC":
            taxa_padrao = 13.75
        else:
            taxa_padrao = taxas.get(indexador, 0)
        
        # Simular cálculo com taxa padrão
        from datetime import datetime
        data_adicao_dt = datetime.strptime(data_adicao, "%Y-%m-%d %H:%M:%S")
        dias_desde_adicao = (datetime.now() - data_adicao_dt).days
        
        if indexador in ["SELIC", "CDI"] and dias_desde_adicao > 0:
            taxa_anual_decimal = taxa_padrao / 100
            taxa_diaria = (1 + taxa_anual_decimal) ** (1/252) - 1
            fator_correcao = (1 + taxa_diaria) ** dias_desde_adicao
            fator_percentual = indexador_pct / 100
            preco_padrao = preco_inicial * fator_percentual * fator_correcao
            
            resultados.append({
                "cenario": f"Taxa padrão ({taxa_padrao}%)",
                "preco_calculado": round(preco_padrao, 4),
                "variacao": ((preco_padrao - preco_inicial) / preco_inicial) * 100,
                "dias_desde_adicao": dias_desde_adicao,
                "fator_correcao": round(fator_correcao, 6),
                "fator_percentual": fator_percentual
            })
        
        return jsonify({
            "success": True,
            "preco_inicial": preco_inicial,
            "indexador": indexador,
            "indexador_pct": indexador_pct,
            "data_adicao": data_adicao,
            "resultados": resultados,
            "taxas_disponiveis": taxas
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/tesouro/titulos", methods=["GET"])
def api_tesouro_titulos():
    try:
        # Cache curto para evitar excesso de chamadas
        try:
            if cache:
                cached = cache.get("tesouro_titulos")
                if cached is not None:
                    return jsonify(cached)
        except Exception:
            pass

        url = "https://www.tesourodireto.com.br/json/consulta/PrecoTaxaTitulo.json"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.tesourodireto.com.br/",
        }
        r = requests.get(url, timeout=15, headers=headers)
        r.raise_for_status()
        try:
            data = r.json()
        except Exception:
            
            r2 = requests.get(url + f"?cb={int(datetime.now().timestamp())}", timeout=15, headers=headers)
            r2.raise_for_status()
            data = r2.json()

        # Se vier vazio, tentar cloudscraper (bypass de proteção)
        if (not data or not data.get('response')) and cloudscraper is not None:
            scraper = cloudscraper.create_scraper()
            resp = scraper.get(url, timeout=20, headers=headers)
            try:
                data = resp.json()
            except Exception:
                pass

        def _norm_index(idx: str | None) -> str | None:
            if not idx:
                return None
            s = str(idx).lower()
            if 'selic' in s:
                return 'SELIC'
            if 'ipca' in s:
                return 'IPCA'
            if 'prefix' in s or 'pre' in s:
                return 'PREFIXADO'
            return idx

        def _familia(type_str: str | None, nome: str | None) -> str | None:
            ts = (type_str or '').upper()
            if ts in ('LFT', 'LTN', 'NTN-B', 'NTN-F'):
                return ts
            nome_s = (nome or '').upper()
            if 'SELIC' in nome_s:
                return 'LFT'
            if 'PREFIX' in nome_s:
                return 'LTN' if 'SEMET' not in nome_s else 'NTN-F'
            if 'IPCA' in nome_s and 'SEMEST' in nome_s:
                return 'NTN-B'
            if 'IPCA' in nome_s:
                return 'NTN-B PRINCIPAL'
            return type_str

        def _cupom(type_str: str | None, nome: str | None) -> bool:
            ts = (type_str or '').upper()
            if ts in ('NTN-B', 'NTN-F'):
                return True
            nome_s = (nome or '').upper()
            return ('SEMEST' in nome_s) or ('JUROS' in nome_s)

        from datetime import datetime as _dt

        titulos = []
        updated_at = _dt.now().isoformat()
        for grupo in (data.get('response', {}).get('TrsrBondMkt', []) or []):
            for t in (grupo.get('TrsrBd', []) or []):
                nome = t.get('bond')
                venc = t.get('maturityDate')
                idx_raw = t.get('index')
                type_raw = t.get('type')
                taxa_compra = t.get('invstRate')
                taxa_resgate = t.get('invstRedRate') if 'invstRedRate' in t else t.get('redRate')
                pu = t.get('unitPrice') if 'unitPrice' in t else t.get('minInvstAmt')
                min_invest = t.get('minInvstAmt')

                # Heurística de disponibilidade
                disponivel_compra = taxa_compra is not None and min_invest is not None
                disponivel_resgate = taxa_resgate is not None

                # Prazo até vencimento (dias)
                prazo_dias = None
                try:
                    if venc:
                        # remover timezone se vier com 'Z'
                        v = str(venc).replace('Z', '')
                        dt_venc = _dt.fromisoformat(v)
                        prazo_dias = (dt_venc.date() - _dt.now().date()).days
                except Exception:
                    prazo_dias = None

                item = {
                    # Campos existentes para compatibilidade
                    "nome": nome,
                    "vencimento": venc,
                    "taxaCompra": taxa_compra,
                    "pu": pu,
                    "indexador": idx_raw,
                    "tipoRent": type_raw,
                    # Campos novos/normalizados
                    "indexador_normalizado": _norm_index(idx_raw),
                    "familia_td": _familia(type_raw, nome),
                    "cupom_semestral": _cupom(type_raw, nome),
                    "taxa_compra_aa": taxa_compra,
                    "taxa_resgate_aa": taxa_resgate,
                    "min_invest": min_invest,
                    "disponivel_compra": disponivel_compra,
                    "disponivel_resgate": disponivel_resgate,
                    "prazo_dias": prazo_dias,
                    "updated_at": updated_at,
                }
                titulos.append(item)

        payload = {"titulos": titulos}
        try:
            if cache:
                cache.set("tesouro_titulos", payload, timeout=60)
        except Exception:
            pass
        return jsonify(payload)
    except Exception as e:
        try:
            print(f"TESOURO ERROR: {e}")
        except Exception:
            pass
       
        return jsonify({"titulos": [], "fallback": True, "error": str(e)}), 200

@server.route("/api/carteira/tipos", methods=["GET", "POST", "PUT", "DELETE"])
def api_asset_types():
    try:
        if request.method == 'GET':
            return jsonify({"tipos": list_asset_types()})
        data = request.get_json() or {}
        if request.method == 'POST':
            nome = str(data.get('nome') or '').strip()
            res = create_asset_type(nome)
            return jsonify(res)
        if request.method == 'PUT':
            old = str(data.get('old') or '').strip()
            new = str(data.get('new') or '').strip()
            res = rename_asset_type(old, new)
            return jsonify(res)
        if request.method == 'DELETE':
            nome = str(data.get('nome') or '').strip()
            res = delete_asset_type(nome)
            return jsonify(res)
        return jsonify({"error": "Método não suportado"}), 405
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/historico", methods=["GET"])
def api_get_historico_carteira():

    try:
        agregacao = request.args.get('periodo', 'mensal')  
        print(f"DEBUG: API /api/carteira/historico chamada com agregacao: {agregacao}")
        dados = obter_historico_carteira_comparado(agregacao)
        return jsonify(dados)
    except Exception as e:
        print(f"DEBUG: Erro na API: {e}")
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/proventos", methods=["POST"])
def api_get_proventos():

    try:
        data = request.get_json()
        tickers = data.get('tickers', [])
        periodo = data.get('periodo', 'total')  
        
        if not tickers:
            return jsonify([])
        
        resultado = []
        

        data_inicio = None
        if periodo != 'total':
            hoje = datetime.now()
            if periodo == 'mes':
                data_inicio = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            elif periodo == '6meses':
                data_inicio = hoje - timedelta(days=180)
                data_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
            elif periodo == '1ano':
                data_inicio = hoje - timedelta(days=365)
                data_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
            elif periodo == '5anos':
                data_inicio = hoje - timedelta(days=365*5)
                data_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
        
        for ticker in tickers:
            try:

                if not ticker.endswith('.SA') and not '.' in ticker:
                    ticker_normalizado = f"{ticker}.SA"
                else:
                    ticker_normalizado = ticker
                

                ativo = yf.Ticker(ticker_normalizado)
                

                dividendos = ativo.dividends
                
                if dividendos is not None and not dividendos.empty:
                    proventos = []
                    for data, valor in dividendos.items():
                      
                        data_sem_timezone = data.replace(tzinfo=None)
                        

                        if data_inicio is None or data_sem_timezone >= data_inicio:
                            proventos.append({
                                'data': data.strftime('%Y-%m-%d'),
                                'valor': float(valor),
                                'tipo': 'Dividendo'
                            })
                    

                    info = ativo.info
                    nome = info.get('longName', ticker_normalizado)
                    
                    resultado.append({
                        'ticker': ticker,
                        'nome': nome,
                        'proventos': proventos
                    })
                else:
                    resultado.append({
                        'ticker': ticker,
                        'nome': ticker,
                        'proventos': [],
                        'erro': 'Nenhum provento encontrado'
                    })
                    
            except Exception as e:
                resultado.append({
                    'ticker': ticker,
                    'nome': ticker,
                    'proventos': [],
                    'erro': f'Erro ao buscar dados: {str(e)}'
                })
        
        return jsonify(resultado)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/carteira/proventos-recebidos", methods=["GET"])
def api_get_proventos_recebidos():
    """API para obter proventos recebidos baseado na carteira do usuário"""
    try:
        periodo = request.args.get('periodo', 'total')
        
        # Obter carteira do usuário
        carteira = obter_carteira()
        if not carteira:
            return jsonify([])
        
        # Calcular data de início baseada no período
        data_inicio = None
        if periodo != 'total':
            hoje = datetime.now()
            if periodo == 'mes':
                data_inicio = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            elif periodo == '6meses':
                data_inicio = hoje - timedelta(days=180)
                data_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
            elif periodo == '1ano':
                data_inicio = hoje - timedelta(days=365)
                data_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
            elif periodo == '5anos':
                data_inicio = hoje - timedelta(days=365*5)
                data_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
        
        resultado = []
        
        for ativo in carteira:
            try:
                ticker = ativo['ticker']
                quantidade = ativo['quantidade']
                data_aquisicao = ativo.get('data_adicao')  # Data quando foi adicionado à carteira
                
                if not ticker.endswith('.SA') and not '.' in ticker:
                    ticker_normalizado = f"{ticker}.SA"
                else:
                    ticker_normalizado = ticker
                
                ativo_yf = yf.Ticker(ticker_normalizado)
                dividendos = ativo_yf.dividends
                
                if dividendos is not None and not dividendos.empty:
                    proventos_recebidos = []
                    for data, valor in dividendos.items():
                        # Converter para datetime sem timezone para comparação
                        data_sem_timezone = data.replace(tzinfo=None)
                        
                        # Só considerar dividendos pagos após a data de aquisição
                        if data_aquisicao:
                            try:
                                data_aquisicao_dt = datetime.strptime(data_aquisicao, '%Y-%m-%d %H:%M:%S')
                                if data_sem_timezone < data_aquisicao_dt:
                                    continue  # Pular dividendos pagos antes da aquisição
                            except ValueError:
                                # Se não conseguir fazer o parse, tentar só a data
                                try:
                                    data_aquisicao_dt = datetime.strptime(data_aquisicao, '%Y-%m-%d')
                                    if data_sem_timezone < data_aquisicao_dt:
                                        continue  # Pular dividendos pagos antes da aquisição
                                except ValueError:
                                    # Se ainda não conseguir, ignorar a data de aquisição
                                    pass
                        
                        
                        if data_inicio is None or data_sem_timezone >= data_inicio:
                       
                            valor_recebido = float(valor) * quantidade
                            proventos_recebidos.append({
                                'data': data.strftime('%Y-%m-%d'),
                                'valor_unitario': float(valor),
                                'quantidade': quantidade,
                                'valor_recebido': valor_recebido,
                                'tipo': 'Dividendo'
                            })
                    
                    if proventos_recebidos:
                        info = ativo_yf.info
                        nome = info.get('longName', ticker_normalizado)
                        
                        resultado.append({
                            'ticker': ticker,
                            'nome': nome,
                            'quantidade_carteira': quantidade,
                            'data_aquisicao': data_aquisicao,
                            'proventos_recebidos': proventos_recebidos,
                            'total_recebido': sum(p['valor_recebido'] for p in proventos_recebidos)
                        })
                        
            except Exception as e:
                print(f"Erro ao processar proventos para {ticker}: {str(e)}")
                continue
        
        return jsonify(resultado)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== MARMITAS API ====================

@server.route("/api/marmitas", methods=["GET"])
def api_get_marmitas():
  
    try:
        mes = request.args.get('mes', type=int)
        ano = request.args.get('ano', type=int)
        
        usuario = get_usuario_atual()
        mes_key = str(mes).zfill(2) if mes else ''
        ano_key = str(ano) if ano else ''
        cache_key = None
        if cache and usuario:
            cache_key = f"marmitas:{usuario}:{mes_key}:{ano_key}"
            cached = cache.get(cache_key)
            if cached is not None:
                registros = cached
            else:
                registros = consultar_marmitas(mes_key or None, ano_key or None)
        else:
            registros = consultar_marmitas(mes_key or None, ano_key or None)
        

        marmitas = []
        for registro in registros:
            marmitas.append({
                'id': registro[0],
                
                'data': str(registro[1])[:10] if registro and len(str(registro[1])) >= 10 else str(registro[1]),
                'valor': float(registro[2]) if registro[2] else 0,
                'comprou': bool(registro[3])
            })
        
        if cache and cache_key:
            try:
                cache.set(cache_key, registros, timeout=30)
            except Exception:
                pass
        return jsonify(marmitas)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/marmitas", methods=["POST"])
def api_adicionar_marmita():

    try:
        data = request.get_json()
        data_marmita = data.get('data')
        valor = data.get('valor', 0)
        comprou = data.get('comprou', True)
        
        if not data_marmita:
            return jsonify({"error": "Data é obrigatória"}), 400
            

        data_limpa = str(data_marmita)[:10]
        adicionar_marmita(data_limpa, valor, 1 if comprou else 0)
        try:
            if cache:
                cache.clear()
        except Exception:
            pass
        
        return jsonify({"success": True, "message": "Marmita adicionada com sucesso"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/marmitas/<int:id>", methods=["DELETE"])
def api_remover_marmita(id):

    try:
        remover_marmita(id)
        try:
            if cache:
                cache.clear()
        except Exception:
            pass
        return jsonify({"success": True, "message": "Marmita removida com sucesso"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/marmitas/gastos-mensais", methods=["GET"])
def api_get_gastos_mensais():

    try:
        periodo = request.args.get('periodo', '6m')
        
        usuario = get_usuario_atual()
        cache_key = None
        if cache and usuario:
            cache_key = f"marmitas_gastos:{usuario}:{periodo}"
            cached = cache.get(cache_key)
            if cached is not None:
                return jsonify(cached)
        df_gastos = gastos_mensais(periodo)
        
        gastos = []
        for _, row in df_gastos.iterrows():
            gastos.append({
                'mes': row['AnoMes'],
                'valor': float(row['valor'])
            })
        
        if cache and cache_key:
            try:
                cache.set(cache_key, gastos, timeout=30)
            except Exception:
                pass
        return jsonify(gastos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== APIs DE CONTROLE FINANCEIRO ====================

@server.route("/api/controle/receitas", methods=["GET", "POST", "PUT", "DELETE"])
def api_receitas():

    try:
        if request.method == "POST":
            data = request.get_json()
            nome = data.get('nome')
            valor = data.get('valor')
            if valor and nome:
                try:
                    _upgrade_controle_schema()
                except Exception:
                    pass
                salvar_receita(
                    nome, valor,
                    data=data.get('data'),
                    categoria=data.get('categoria'),
                    tipo=data.get('tipo'),
                    recorrencia=data.get('recorrencia'),
                    parcelas_total=data.get('parcelas_total'),
                    parcela_atual=data.get('parcela_atual'),
                    grupo_parcela=data.get('grupo_parcela'),
                    observacao=data.get('observacao')
                )
                try:
                    if cache:
                        cache.clear()
                except Exception:
                    pass
                return jsonify({"message": "Receita salva com sucesso"})
            return jsonify({"error": "Nome e valor são obrigatórios"}), 400
        elif request.method == "PUT":
            data = request.get_json()
            try:
                _upgrade_controle_schema()
            except Exception:
                pass
            atualizar_receita(
                data.get('id'),
                nome=data.get('nome'),
                valor=data.get('valor'),
                data=data.get('data'),
                categoria=data.get('categoria'),
                tipo=data.get('tipo'),
                recorrencia=data.get('recorrencia'),
                parcelas_total=data.get('parcelas_total'),
                parcela_atual=data.get('parcela_atual'),
                grupo_parcela=data.get('grupo_parcela'),
                observacao=data.get('observacao')
            )
            try:
                if cache:
                    cache.clear()
            except Exception:
                pass
            return jsonify({"message": "Receita atualizada com sucesso"})
        elif request.method == "DELETE":
            id_registro = request.args.get('id', type=int)
            if id_registro:
                remover_receita(id_registro)
                try:
                    if cache:
                        cache.clear()
                except Exception:
                    pass
                return jsonify({"message": "Receita removida com sucesso"})
            return jsonify({"error": "ID é obrigatório"}), 400
        else:
            mes = request.args.get('mes', type=str)
            ano = request.args.get('ano', type=str)
            usuario = get_usuario_atual()
            cache_key = None
            if cache and usuario:
                cache_key = f"receitas:{usuario}:{mes or ''}:{ano or ''}"
                cached = cache.get(cache_key)
                if cached is not None:
                    return jsonify(cached)
            receitas = carregar_receitas_mes_ano(mes, ano)
            payload = receitas.to_dict('records') if not receitas.empty else []
            if cache and cache_key:
                try:
                    cache.set(cache_key, payload, timeout=30)
                except Exception:
                    pass
            return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/controle/cartoes", methods=["GET", "POST", "PUT", "DELETE"])
def api_cartoes():

    try:
        if request.method == "POST":
            data = request.get_json()
            try:
                _upgrade_controle_schema()
            except Exception:
                pass
            adicionar_cartao(
                data.get('nome'),
                data.get('valor'),
                data.get('pago'),
                data=data.get('data'),
                categoria=data.get('categoria'),
                tipo=data.get('tipo'),
                recorrencia=data.get('recorrencia'),
                parcelas_total=data.get('parcelas_total'),
                parcela_atual=data.get('parcela_atual'),
                grupo_parcela=data.get('grupo_parcela'),
                observacao=data.get('observacao')
            )
            try:
                if cache:
                    cache.clear()
            except Exception:
                pass
            return jsonify({"message": "Cartão adicionado com sucesso"})
        elif request.method == "PUT":
            data = request.get_json()
            try:
                _upgrade_controle_schema()
            except Exception:
                pass
            atualizar_cartao(
                data.get('id'),
                nome=data.get('nome'),
                valor=data.get('valor'),
                pago=data.get('pago'),
                data=data.get('data'),
                categoria=data.get('categoria'),
                tipo=data.get('tipo'),
                recorrencia=data.get('recorrencia'),
                parcelas_total=data.get('parcelas_total'),
                parcela_atual=data.get('parcela_atual'),
                grupo_parcela=data.get('grupo_parcela'),
                observacao=data.get('observacao')
            )
            try:
                if cache:
                    cache.clear()
            except Exception:
                pass
            return jsonify({"message": "Cartão atualizado com sucesso"})
        elif request.method == "DELETE":
            id_registro = request.args.get('id', type=int)
            if id_registro:
                remover_cartao(id_registro)
                try:
                    if cache:
                        cache.clear()
                except Exception:
                    pass
                return jsonify({"message": "Cartão removido com sucesso"})
            return jsonify({"error": "ID é obrigatório"}), 400
        else:
            mes = request.args.get('mes', type=str)
            ano = request.args.get('ano', type=str)
            usuario = get_usuario_atual()
            if cache and usuario:
                key = f"cartoes:{usuario}:{mes or ''}:{ano or ''}"
                cached = cache.get(key)
                if cached is not None:
                    return jsonify(cached)
                cartoes = carregar_cartoes_mes_ano(mes, ano)
                try:
                    cache.set(key, cartoes, timeout=30)
                except Exception:
                    pass
                return jsonify(cartoes)
            cartoes = carregar_cartoes_mes_ano(mes, ano)
            return jsonify(cartoes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/controle/outros", methods=["GET", "POST", "PUT", "DELETE"])
def api_outros():

    try:
        if request.method == "POST":
            data = request.get_json()
            try:
                _upgrade_controle_schema()
            except Exception:
                pass
            adicionar_outro_gasto(
                data.get('nome'), data.get('valor'),
                data=data.get('data'),
                categoria=data.get('categoria'),
                tipo=data.get('tipo'),
                recorrencia=data.get('recorrencia'),
                parcelas_total=data.get('parcelas_total'),
                parcela_atual=data.get('parcela_atual'),
                grupo_parcela=data.get('grupo_parcela'),
                observacao=data.get('observacao')
            )
            try:
                if cache:
                    cache.clear()
            except Exception:
                pass
            return jsonify({"message": "Gasto adicionado com sucesso"})
        elif request.method == "PUT":
            data = request.get_json()
            try:
                _upgrade_controle_schema()
            except Exception:
                pass
            atualizar_outro_gasto(
                data.get('id'), 
                nome=data.get('nome'), 
                valor=data.get('valor'),
                data=data.get('data'),
                categoria=data.get('categoria'),
                tipo=data.get('tipo'),
                recorrencia=data.get('recorrencia'),
                parcelas_total=data.get('parcelas_total'),
                parcela_atual=data.get('parcela_atual'),
                grupo_parcela=data.get('grupo_parcela'),
                observacao=data.get('observacao')
            )
            try:
                if cache:
                    cache.clear()
            except Exception:
                pass
            return jsonify({"message": "Gasto atualizado com sucesso"})
        elif request.method == "DELETE":
            id_registro = request.args.get('id', type=int)
            if id_registro:
                remover_outro_gasto(id_registro)
                try:
                    if cache:
                        cache.clear()
                except Exception:
                    pass
                return jsonify({"message": "Gasto removido com sucesso"})
            return jsonify({"error": "ID é obrigatório"}), 400
        else:
            mes = request.args.get('mes', type=str)
            ano = request.args.get('ano', type=str)
            usuario = get_usuario_atual()
            if cache and usuario:
                key = f"outros:{usuario}:{mes or ''}:{ano or ''}"
                cached = cache.get(key)
                if cached is not None:
                    return jsonify(cached)
                outros = carregar_outros_mes_ano(mes, ano)
                try:
                    cache.set(key, outros, timeout=30)
                except Exception:
                    pass
                return jsonify(outros)
            outros = carregar_outros_mes_ano(mes, ano)
            return jsonify(outros)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/controle/saldo", methods=["GET"])
def api_saldo():

    try:
        mes = request.args.get('mes', type=str)
        ano = request.args.get('ano', type=str)
        
        usuario = get_usuario_atual()
        if cache and usuario:
            key = f"saldo:{usuario}:{mes or ''}:{ano or ''}"
            cached = cache.get(key)
            if cached is not None:
                return jsonify({"saldo": cached})
        saldo = calcular_saldo_mes_ano(mes, ano)
        if cache and usuario:
            try:
                cache.set(key, saldo, timeout=30)
            except Exception:
                pass
        return jsonify({"saldo": saldo})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/controle/total-por-pessoa", methods=["GET"])
def api_total_por_pessoa():
   
    try:
        
        return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/controle/evolucao-financeira", methods=["GET"])
def api_evolucao_financeira():
  
    try:
        mes = request.args.get('mes', type=str)
        ano = request.args.get('ano', type=str)
        
        
        df_receita = carregar_receitas_mes_ano(mes, ano)
        df_cartao = pd.DataFrame(carregar_cartoes_mes_ano(mes, ano))
        df_outros = pd.DataFrame(carregar_outros_mes_ano(mes, ano))
        
    
        if not df_receita.empty:
            df_receita["data"] = pd.to_datetime(df_receita["data"])
            df_receita_grouped = df_receita.groupby("data")["valor"].sum().reset_index(name="receitas")
        else:
            df_receita_grouped = pd.DataFrame(columns=["data", "receitas"])
        
      
        df_cartao["data"] = pd.to_datetime(df_cartao["data"]) if not df_cartao.empty else pd.Series(dtype='datetime64[ns]')
        df_outros["data"] = pd.to_datetime(df_outros["data"]) if not df_outros.empty else pd.Series(dtype='datetime64[ns]')
        df_cartao_ = df_cartao[["data", "valor"]] if not df_cartao.empty else pd.DataFrame(columns=["data", "valor"])
        df_outros_ = df_outros[["data", "valor"]] if not df_outros.empty else pd.DataFrame(columns=["data", "valor"])
        df_despesas = pd.concat([df_cartao_, df_outros_]) if not df_cartao_.empty or not df_outros_.empty else pd.DataFrame(columns=["data", "valor"])
        
        if df_despesas.empty:
            df_despesas_grouped = pd.DataFrame({"data": [], "despesas": []})
        else:
            df_despesas_grouped = df_despesas.groupby("data")["valor"].sum().reset_index(name="despesas")
        

        dias = pd.date_range(
            start=f"{ano}-{mes.zfill(2)}-01", 
            end=pd.Timestamp(f"{ano}-{mes.zfill(2)}-01") + pd.offsets.MonthEnd(0)
        )
        df_base = pd.DataFrame({"data": dias})
        
 
        df_merged = pd.merge(df_base, df_receita_grouped, on="data", how="left").merge(df_despesas_grouped, on="data", how="left")
        df_merged["receitas"] = df_merged["receitas"].fillna(0)
        df_merged["despesas"] = df_merged["despesas"].fillna(0)
        df_merged["saldo_dia"] = df_merged["receitas"] - df_merged["despesas"]
        df_merged["saldo_acumulado"] = df_merged["saldo_dia"].cumsum()
        

        evolucao = []
        for _, row in df_merged.iterrows():
            evolucao.append({
                'data': row['data'].strftime('%Y-%m-%d'),
                'receitas': float(row['receitas']),
                'despesas': float(row['despesas']),
                'saldo_dia': float(row['saldo_dia']),
                'saldo_acumulado': float(row['saldo_acumulado'])
            })
        
        return jsonify(evolucao)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/controle/receitas-despesas", methods=["GET"])
def api_receitas_despesas():
   
    try:
        mes = request.args.get('mes', type=str)
        ano = request.args.get('ano', type=str)
        
       
        usuario = get_usuario_atual()
        if cache and usuario:
            key = f"receitas_despesas:{usuario}:{mes or ''}:{ano or ''}"
            cached = cache.get(key)
            if cached is not None:
                return jsonify(cached)
        df_receita = carregar_receitas_mes_ano(mes, ano)
        df_cartao = pd.DataFrame(carregar_cartoes_mes_ano(mes, ano))
        df_outros = pd.DataFrame(carregar_outros_mes_ano(mes, ano))
        
        despesas = 0
        if not df_cartao.empty:
            despesas += df_cartao["valor"].sum()
        if not df_outros.empty:
            despesas += df_outros["valor"].sum()
        
        total_receita = df_receita["valor"].sum() if not df_receita.empty else 0
        
        payload = {
            "receitas": float(total_receita),
            "despesas": float(despesas)
        }
        if cache and usuario:
            try:
                cache.set(key, payload, timeout=30)
            except Exception:
                pass
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@server.route("/api/home/resumo", methods=["GET"])
def api_home_resumo():

    try:
       
        def _cache_key():
            try:
                user = get_usuario_atual() or 'anon'
            except Exception:
                user = 'anon'
            mes_q = request.args.get('mes', type=str) or ''
            ano_q = request.args.get('ano', type=str) or ''
            return f"home_resumo:{user}:{mes_q}:{ano_q}"
        if cache:
            cached_payload = cache.get(_cache_key())
            if cached_payload is not None:
                return jsonify(cached_payload)
        mes = request.args.get('mes', type=str)
        ano = request.args.get('ano', type=str)
       
        usuario = get_usuario_atual()
        if not usuario:
            return jsonify({"error": "Não autenticado"}), 401
        
        if not mes or not ano:
            return jsonify({"error": "Mês e ano são obrigatórios"}), 400
        

        carteira = obter_carteira()
        total_investido = sum(ativo.get('valor_total', 0) for ativo in carteira)
        ativos_por_tipo = {}
        for ativo in carteira:
            tipo = ativo.get('tipo', 'Desconhecido')
            ativos_por_tipo[tipo] = ativos_por_tipo.get(tipo, 0) + ativo.get('valor_total', 0)
        

        df_receitas = carregar_receitas_mes_ano(mes, ano)
        receitas = df_receitas.to_dict('records') if not df_receitas.empty else []
        total_receitas = df_receitas['valor'].sum() if not df_receitas.empty else 0
        
  
        cartoes = carregar_cartoes_mes_ano(mes, ano)
        total_cartoes = sum(cartao.get('valor', 0) for cartao in cartoes)
        
   
        outros = carregar_outros_mes_ano(mes, ano)
        total_outros = sum(outro.get('valor', 0) for outro in outros)
        

        marmitas = consultar_marmitas(mes, ano)
        marmitas_formatted = []
        total_marmitas = 0
        for registro in marmitas:
            marmita = {
                'id': registro[0],
                'data': registro[1],
                'valor': float(registro[2]) if registro[2] else 0,
                'comprou': bool(registro[3])
            }
            marmitas_formatted.append(marmita)
            total_marmitas += marmita['valor']
        
     
        saldo = calcular_saldo_mes_ano(mes, ano)
        
  
        df_receita = carregar_receitas_mes_ano(mes, ano)
        df_cartao = pd.DataFrame(carregar_cartoes_mes_ano(mes, ano))
        df_outros = pd.DataFrame(carregar_outros_mes_ano(mes, ano))
        
       
        if not df_receita.empty:
            df_receita["data"] = pd.to_datetime(df_receita["data"])
            df_receita_grouped = df_receita.groupby("data")["valor"].sum().reset_index(name="receitas")
        else:
            df_receita_grouped = pd.DataFrame(columns=["data", "receitas"])
        
   
        df_cartao["data"] = pd.to_datetime(df_cartao["data"]) if not df_cartao.empty else pd.Series(dtype='datetime64[ns]')
        df_outros["data"] = pd.to_datetime(df_outros["data"]) if not df_outros.empty else pd.Series(dtype='datetime64[ns]')
        df_cartao_ = df_cartao[["data", "valor"]] if not df_cartao.empty else pd.DataFrame(columns=["data", "valor"])
        df_outros_ = df_outros[["data", "valor"]] if not df_outros.empty else pd.DataFrame(columns=["data", "valor"])
        df_despesas = pd.concat([df_cartao_, df_outros_]) if not df_cartao_.empty or not df_outros_.empty else pd.DataFrame(columns=["data", "valor"])
        
        if df_despesas.empty:
            df_despesas_grouped = pd.DataFrame({"data": [], "despesas": []})
        else:
            df_despesas_grouped = df_despesas.groupby("data")["valor"].sum().reset_index(name="despesas")
        

        dias = pd.date_range(
            start=f"{ano}-{mes.zfill(2)}-01", 
            end=pd.Timestamp(f"{ano}-{mes.zfill(2)}-01") + pd.offsets.MonthEnd(0)
        )
        df_base = pd.DataFrame({"data": dias})
        

        df_merged = pd.merge(df_base, df_receita_grouped, on="data", how="left").merge(df_despesas_grouped, on="data", how="left")
        df_merged["receitas"] = df_merged["receitas"].fillna(0)
        df_merged["despesas"] = df_merged["despesas"].fillna(0)
        df_merged["saldo_dia"] = df_merged["receitas"] - df_merged["despesas"]
        df_merged["saldo_acumulado"] = df_merged["saldo_dia"].cumsum()
        

        evolucao = []
        for _, row in df_merged.iterrows():
            evolucao.append({
                'data': row['data'].strftime('%Y-%m-%d'),
                'receitas': float(row['receitas']),
                'despesas': float(row['despesas']),
                'saldo_dia': float(row['saldo_dia']),
                'saldo_acumulado': float(row['saldo_acumulado'])
            })
        

        df_gastos = gastos_mensais('6m')
        gastos_mensais_data = []
        for _, row in df_gastos.iterrows():
            gastos_mensais_data.append({
                'mes': row['AnoMes'],
                'valor': float(row['valor'])
            })
        

        resumo = {
            'carteira': {
                'ativos': carteira,
                'total_investido': total_investido,
                'quantidade_ativos': len(carteira),
                'distribuicao_por_tipo': ativos_por_tipo
            },
            'receitas': {
                'registros': receitas,
                'total': total_receitas,
                'quantidade': len(receitas)
            },
            'cartoes': {
                'registros': cartoes,
                'total': total_cartoes,
                'quantidade': len(cartoes)
            },
            'outros': {
                'registros': outros,
                'total': total_outros,
                'quantidade': len(outros)
            },
            'marmitas': {
                'registros': marmitas_formatted,
                'total': total_marmitas,
                'quantidade': len(marmitas_formatted)
            },
            'saldo': saldo,
            'evolucao_financeira': evolucao,
            'gastos_mensais': gastos_mensais_data,
            'total_despesas': total_cartoes + total_outros + total_marmitas
        }
        

        

        try:
            if cache:
                cache.set(_cache_key(), resumo, timeout=60)
        except Exception:
            pass
        return jsonify(resumo)
    except Exception as e:
        print(f"Erro na API home/resumo: {str(e)}")
        return jsonify({"error": str(e)}), 500


@server.route("/api/exchange-rate/<symbol>", methods=["GET"])
def api_get_exchange_rate(symbol):
    try:
        # Buscar dados de taxa de câmbio usando yfinance
        ticker = yf.Ticker(symbol)
        historico = ticker.history(period='1d')
        
        if historico is not None and not historico.empty:
            # Pegar o último valor de fechamento
            latest_data = historico.iloc[-1]
            return jsonify({
                "symbol": symbol,
                "rate": float(latest_data['Close']),
                "date": latest_data.name.isoformat(),
                "volume": float(latest_data['Volume']) if 'Volume' in latest_data else 0
            })
        else:
            return jsonify({"error": "Dados não encontrados"}), 404
            
    except Exception as e:
        print(f"Erro ao buscar taxa de câmbio para {symbol}: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    server.run(debug=False, port=5005, host='0.0.0.0') 