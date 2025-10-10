import threading
import pandas as pd
import yfinance as yf
from flask import Flask
from flask_caching import Cache
import time
import sqlite3
from datetime import datetime, timedelta
import bcrypt
import os
import json
import secrets
import re
try:
    import psycopg
except Exception:
    psycopg = None


USUARIO_ATUAL = None  
SESSION_LOCK = threading.Lock()

# ==================== ADAPTADOR DE BANCO (SQLite local x Postgres em produção) ====================

def _sanitize_db_url(url: str) -> str:
    if not url:
        return url
    try:
        from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
        parsed = urlparse(url)
        query_pairs = dict(parse_qsl(parsed.query))

        if query_pairs.get("channel_binding", "").lower() == "require":
            query_pairs.pop("channel_binding", None)
        # Garantir sslmode=require
        if not query_pairs.get("sslmode"):
            query_pairs["sslmode"] = "require"
        new_query = urlencode(query_pairs)
        parsed = parsed._replace(query=new_query)
        return urlunparse(parsed)
    except Exception:
        return url

DATABASE_URL = _sanitize_db_url(os.getenv("DATABASE_URL") or os.getenv("USUARIOS_DB_URL"))

def _is_postgres() -> bool:
    is_pg = bool(DATABASE_URL) and psycopg is not None
    print(f"_is_postgres: DATABASE_URL={bool(DATABASE_URL)}, psycopg={psycopg is not None}, resultado={is_pg}")
    return is_pg

def _get_pg_conn():
    print(f"_get_pg_conn: Conectando ao PostgreSQL")
    conn = psycopg.connect(DATABASE_URL)
    try:
        conn.autocommit = True
        print(f"_get_pg_conn: Conexão estabelecida com autocommit")
    except Exception as e:
        print(f"_get_pg_conn: Erro ao configurar autocommit: {e}")
        pass
    return conn

def _pg_schema_for_user(username: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_]", "_", (username or "anon").lower())
    if not base:
        base = "anon"
    schema = f"u_{base}"
    print(f"_pg_schema_for_user: Schema gerado para usuário {username}: {schema}")
    return schema

def _pg_use_schema(conn, username: str):
    schema = _pg_schema_for_user(username)
    print(f"_pg_use_schema: Usando schema {schema} para usuário {username}")
    with conn.cursor() as cur:
        cur.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
        cur.execute(f"SET search_path TO {schema}")
    print(f"_pg_use_schema: Schema {schema} configurado com sucesso")
    return schema

def _pg_conn_for_user(username: str):
    print(f"_pg_conn_for_user: Conectando para usuário {username}")
    conn = _get_pg_conn()
    _pg_use_schema(conn, username)
    print(f"_pg_conn_for_user: Conexão estabelecida para usuário {username}")
    return conn

def _ensure_rebalance_schema():

    usuario = get_usuario_atual()
    if not usuario:
        return
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                try:
                    c.execute('''
                        CREATE TABLE IF NOT EXISTS rebalance_config (
                            id SERIAL PRIMARY KEY,
                            periodo TEXT NOT NULL,
                            targets_json TEXT NOT NULL,
                            start_date TEXT,
                            last_rebalance_date TEXT,
                            updated_at TEXT NOT NULL
                        )
                    ''')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE rebalance_config ADD COLUMN IF NOT EXISTS last_rebalance_date TEXT')
                except Exception:
                    pass
                try:
                    c.execute('''
                        CREATE TABLE IF NOT EXISTS rebalance_history (
                            id SERIAL PRIMARY KEY,
                            data TEXT NOT NULL,
                            created_at TEXT NOT NULL
                        )
                    ''')
                except Exception:
                    pass
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            try:
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS rebalance_config (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        periodo TEXT NOT NULL,
                        targets_json TEXT NOT NULL,
                        start_date TEXT,
                        last_rebalance_date TEXT,
                        updated_at TEXT NOT NULL
                    )
                ''')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE rebalance_config ADD COLUMN last_rebalance_date TEXT')
            except Exception:
                pass
            try:
                cur.execute('''
                    CREATE TABLE IF NOT EXISTS rebalance_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        data TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                ''')
            except Exception:
                pass
            conn.commit()
        finally:
            conn.close()

def _ensure_asset_types_schema():
    usuario = get_usuario_atual()
    if not usuario:
        return
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('''
                    CREATE TABLE IF NOT EXISTS asset_types (
                        id SERIAL PRIMARY KEY,
                        nome TEXT UNIQUE NOT NULL,
                        created_at TEXT NOT NULL
                    )
                ''')
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            cur.execute('''
                CREATE TABLE IF NOT EXISTS asset_types (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL
                )
            ''')
            conn.commit()
        finally:
            conn.close()

def list_asset_types():
    usuario = get_usuario_atual()
    if not usuario:
        return []
    _ensure_asset_types_schema()
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('SELECT nome FROM asset_types ORDER BY nome ASC')
                rows = c.fetchall()
                return [r[0] for r in rows]
        finally:
            conn.close()
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        cur = conn.cursor()
        cur.execute('SELECT nome FROM asset_types ORDER BY nome ASC')
        rows = cur.fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()

def _ensure_indexador_schema():

    usuario = get_usuario_atual()
    if not usuario:
        return
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS indexador TEXT')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS indexador_pct NUMERIC')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS indexador_base_preco NUMERIC')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS indexador_base_data TEXT')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS preco_medio NUMERIC')
                except Exception:
                    pass
                # Campos adicionais de Renda Fixa
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS data_aplicacao TEXT')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS vencimento TEXT')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS isento_ir BOOLEAN')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS liquidez_diaria BOOLEAN')
                except Exception:
                    pass
                try:
                    c.execute('ALTER TABLE carteira ADD COLUMN IF NOT EXISTS preco_compra DECIMAL(10,2)')
                except Exception:
                    pass
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN indexador TEXT')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN indexador_pct REAL')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN indexador_base_preco REAL')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN indexador_base_data TEXT')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN preco_medio REAL')
            except Exception:
                pass
            
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN data_aplicacao TEXT')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN vencimento TEXT')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN isento_ir INTEGER')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN liquidez_diaria INTEGER')
            except Exception:
                pass
            try:
                cur.execute('ALTER TABLE carteira ADD COLUMN preco_compra REAL')
            except Exception:
                pass
            conn.commit()
        finally:
            conn.close()

def create_asset_type(nome: str):
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Não autenticado"}
    if not nome or not nome.strip():
        return {"success": False, "message": "Nome inválido"}
    _ensure_asset_types_schema()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('INSERT INTO asset_types (nome, created_at) VALUES (%s, %s) ON CONFLICT (nome) DO NOTHING', (nome.strip(), now))
        finally:
            conn.close()
        return {"success": True}
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        cur = conn.cursor()
        try:
            cur.execute('INSERT OR IGNORE INTO asset_types (nome, created_at) VALUES (?, ?)', (nome.strip(), now))
            conn.commit()
        finally:
            conn.close()
        return {"success": True}
    except Exception as e:
        return {"success": False, "message": str(e)}

def rename_asset_type(old: str, new: str):
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Não autenticado"}
    if not old or not new or not new.strip():
        return {"success": False, "message": "Nome inválido"}
    _ensure_asset_types_schema()
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('UPDATE asset_types SET nome=%s WHERE nome=%s', (new.strip(), old))
                # Atualizar carteira para refletir novo nome
                c.execute('UPDATE carteira SET tipo=%s WHERE tipo=%s', (new.strip(), old))
        finally:
            conn.close()
        return {"success": True}
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        cur = conn.cursor()
        cur.execute('UPDATE asset_types SET nome=? WHERE nome=?', (new.strip(), old))
        cur.execute('UPDATE carteira SET tipo=? WHERE tipo=?', (new.strip(), old))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

def _validate_rf_catalog_item(item: dict):
    """
    Valida e converte dados do item de renda fixa
    Funciona igual em SQLite e PostgreSQL
    """
    # Validar campos obrigatórios
    if not item.get('nome') or not str(item.get('nome')).strip():
        return { 'valid': False, 'message': 'Nome é obrigatório' }
    if not item.get('emissor') or not str(item.get('emissor')).strip():
        return { 'valid': False, 'message': 'Emissor é obrigatório' }
    if not item.get('tipo') or not str(item.get('tipo')).strip():
        return { 'valid': False, 'message': 'Tipo é obrigatório' }
    if not item.get('indexador') or not str(item.get('indexador')).strip():
        return { 'valid': False, 'message': 'Indexador é obrigatório' }
    
    # Validar e converter números
    try:
        quantidade_val = float(item.get('quantidade', 0)) if item.get('quantidade') else 0
        preco_val = float(item.get('preco', 0)) if item.get('preco') else 0
        taxa_percentual_val = float(item.get('taxa_percentual', 100)) if item.get('taxa_percentual') else 100
        taxa_fixa_val = float(item.get('taxa_fixa', 0)) if item.get('taxa_fixa') else 0
    except (ValueError, TypeError):
        return { 'valid': False, 'message': 'Quantidade, preço e taxas devem ser números válidos' }
    
    if quantidade_val <= 0:
        return { 'valid': False, 'message': 'Quantidade deve ser maior que zero' }
    if preco_val <= 0:
        return { 'valid': False, 'message': 'Preço deve ser maior que zero' }
    if taxa_percentual_val < 0 or taxa_percentual_val > 1000:
        return { 'valid': False, 'message': 'Taxa percentual deve estar entre 0 e 1000' }
    if taxa_fixa_val < 0 or taxa_fixa_val > 50:
        return { 'valid': False, 'message': 'Taxa fixa deve estar entre 0 e 50%' }
    
    # Converter booleanos
    liquidez_diaria = bool(item.get('liquidez_diaria', False))
    isento_ir = bool(item.get('isento_ir', False))
    
    # Preparar dados finais
    data = {
        'nome': str(item.get('nome')).strip(),
        'emissor': str(item.get('emissor')).strip(),
        'tipo': str(item.get('tipo')).strip(),
        'indexador': str(item.get('indexador')).strip(),
        'taxa_percentual': taxa_percentual_val,
        'taxa_fixa': taxa_fixa_val,
        'quantidade': quantidade_val,
        'preco': preco_val,
        'data_inicio': item.get('data_inicio') or None,
        'vencimento': item.get('vencimento') or None,
        'liquidez_diaria': liquidez_diaria,
        'isento_ir': isento_ir,
        'observacao': str(item.get('observacao', '')).strip() or None
    }
    
    return { 'valid': True, 'data': data }

def _ensure_rf_catalog_schema():
    """
    Cria/verifica schema da tabela rf_catalog com abstração completa
    Funciona igual em SQLite e PostgreSQL
    """
    usuario = get_usuario_atual()
    if not usuario:
        print("_ensure_rf_catalog_schema: Usuário não autenticado")
        return False
    
    # Schema unificado - funciona em ambos os bancos
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                try:
                    print(f"_ensure_rf_catalog_schema: Criando tabela para usuário {usuario}")
                    # PostgreSQL - usar tipos nativos otimizados
                    c.execute('''
                    CREATE TABLE IF NOT EXISTS rf_catalog (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL,
                        emissor TEXT,
                        tipo TEXT,
                        indexador TEXT,
                        taxa_percentual NUMERIC(10,4),
                        taxa_fixa NUMERIC(10,4),
                        quantidade NUMERIC(15,2),
                        preco NUMERIC(15,2),
                        data_inicio DATE,
                        vencimento DATE,
                        liquidez_diaria BOOLEAN DEFAULT FALSE,
                        isento_ir BOOLEAN DEFAULT FALSE,
                        observacao TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                    print(f"_ensure_rf_catalog_schema: Tabela PostgreSQL criada/verificada com sucesso")
                    return True
                except Exception as e:
                    print(f"Erro ao criar tabela rf_catalog PostgreSQL: {e}")
                    # Tentar recriar com fallback
                    try:
                        print(f"_ensure_rf_catalog_schema: Tentando recriar tabela PostgreSQL")
                        c.execute('DROP TABLE IF EXISTS rf_catalog')
                        c.execute('''
                            CREATE TABLE rf_catalog (
                                id SERIAL PRIMARY KEY,
                                nome TEXT NOT NULL,
                                emissor TEXT,
                                tipo TEXT,
                                indexador TEXT,
                                taxa_percentual NUMERIC(10,4),
                                taxa_fixa NUMERIC(10,4),
                                quantidade NUMERIC(15,2),
                                preco NUMERIC(15,2),
                                data_inicio DATE,
                                vencimento DATE,
                                liquidez_diaria BOOLEAN DEFAULT FALSE,
                                isento_ir BOOLEAN DEFAULT FALSE,
                                observacao TEXT,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )
                        ''')
                        print(f"_ensure_rf_catalog_schema: Tabela PostgreSQL recriada com sucesso")
                        return True
                    except Exception as e2:
                        print(f"Erro ao recriar tabela rf_catalog PostgreSQL: {e2}")
                        return False
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            # SQLite - usar tipos compatíveis com PostgreSQL
            cur.execute('''
                CREATE TABLE IF NOT EXISTS rf_catalog (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    emissor TEXT,
                    tipo TEXT,
                    indexador TEXT,
                    taxa_percentual NUMERIC,
                    taxa_fixa NUMERIC,
                    quantidade NUMERIC,
                    preco NUMERIC,
                    data_inicio TEXT,
                    vencimento TEXT,
                    liquidez_diaria INTEGER DEFAULT 0,
                    isento_ir INTEGER DEFAULT 0,
                    observacao TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            conn.commit()
            print(f"_ensure_rf_catalog_schema: Tabela SQLite criada/verificada com sucesso")
            return True
        finally:
            conn.close()

def rf_catalog_list():
    """
    Lista itens do catálogo de renda fixa com abstração completa
    Funciona igual em SQLite e PostgreSQL
    """
    usuario = get_usuario_atual()
    if not usuario:
        print("rf_catalog_list: Usuário não autenticado")
        return []
    
    schema_created = _ensure_rf_catalog_schema()
    if not schema_created:
        print("rf_catalog_list: Falha ao criar/verificar schema")
        return []
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                try:
                    # PostgreSQL - usar tipos nativos
                    c.execute('''
                        SELECT id, nome, emissor, tipo, indexador, taxa_percentual, taxa_fixa, 
                               quantidade, preco, data_inicio, vencimento, liquidez_diaria, 
                               isento_ir, observacao 
                        FROM rf_catalog 
                        ORDER BY nome ASC
                    ''')
                    rows = c.fetchall()
                    print(f"rf_catalog_list: Encontrados {len(rows)} itens para usuário {usuario}")
                    
                    def safe_convert(value, convert_func):
                        try:
                            return convert_func(value) if value is not None else None
                        except (ValueError, TypeError):
                            return None
                    
                    result = [
                        {
                            'id': r[0], 
                            'nome': r[1], 
                            'emissor': r[2], 
                            'tipo': r[3], 
                            'indexador': r[4],
                            'taxa_percentual': safe_convert(r[5], float),
                            'taxa_fixa': safe_convert(r[6], float),
                            'quantidade': safe_convert(r[7], float),
                            'preco': safe_convert(r[8], float),
                            'data_inicio': str(r[9]) if r[9] else None,
                            'vencimento': str(r[10]) if r[10] else None,
                            'liquidez_diaria': bool(r[11]) if r[11] is not None else False,
                            'isento_ir': bool(r[12]) if r[12] is not None else False,
                            'observacao': r[13]
                        } for r in rows
                    ]
                    print(f"rf_catalog_list: Retornando {len(result)} itens")
                    return result
                except Exception as e:
                    print(f"Erro ao listar rf_catalog PostgreSQL: {e}")
                    return []
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            cur.execute('''
                SELECT id, nome, emissor, tipo, indexador, taxa_percentual, taxa_fixa, 
                       quantidade, preco, data_inicio, vencimento, liquidez_diaria, 
                       isento_ir, observacao 
                FROM rf_catalog 
                ORDER BY nome ASC
            ''')
            rows = cur.fetchall()
            
            def safe_float(value):
                try:
                    return float(value) if value is not None else None
                except (ValueError, TypeError):
                    return None
            
            result = [
                {
                    'id': r[0], 
                    'nome': r[1], 
                    'emissor': r[2], 
                    'tipo': r[3], 
                    'indexador': r[4],
                    'taxa_percentual': safe_float(r[5]),
                    'taxa_fixa': safe_float(r[6]),
                    'quantidade': safe_float(r[7]),
                    'preco': safe_float(r[8]),
                    'data_inicio': r[9], 
                    'vencimento': r[10],
                    'liquidez_diaria': bool(r[11]) if r[11] else False,
                    'isento_ir': bool(r[12]) if r[12] else False,
                    'observacao': r[13]
                } for r in rows
            ]
            print(f"rf_catalog_list: Retornando {len(result)} itens SQLite")
            return result
        finally:
            conn.close()

def rf_catalog_create(item: dict):

    usuario = get_usuario_atual()
    if not usuario:
        return { 'success': False, 'message': 'Não autenticado' }
    
    schema_created = _ensure_rf_catalog_schema()
    if not schema_created:
        return { 'success': False, 'message': 'Falha ao criar/verificar schema' }
    

    validation_result = _validate_rf_catalog_item(item)
    if not validation_result['valid']:
        return { 'success': False, 'message': validation_result['message'] }
    

    data = validation_result['data']
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                try:

                    c.execute('''
                        INSERT INTO rf_catalog (nome, emissor, tipo, indexador, taxa_percentual, taxa_fixa, 
                                               quantidade, preco, data_inicio, vencimento, liquidez_diaria, 
                                               isento_ir, observacao)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    ''', (
                        data['nome'], data['emissor'], data['tipo'], data['indexador'],
                        data['taxa_percentual'], data['taxa_fixa'], data['quantidade'], data['preco'],
                        data['data_inicio'], data['vencimento'], data['liquidez_diaria'], 
                        data['isento_ir'], data['observacao']
                    ))
                    new_id = c.fetchone()[0]
                    print(f"rf_catalog_create: Item PostgreSQL criado com ID {new_id}")
                    return { 'success': True, 'id': new_id }
                except Exception as e:
                    print(f"Erro ao inserir em rf_catalog PostgreSQL: {e}")
                    return { 'success': False, 'message': f'Erro ao inserir: {str(e)}' }
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            # SQLite - usar tipos compatíveis
            cur.execute('''
                INSERT INTO rf_catalog (nome, emissor, tipo, indexador, taxa_percentual, taxa_fixa, 
                                       quantidade, preco, data_inicio, vencimento, liquidez_diaria, 
                                       isento_ir, observacao, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['nome'], data['emissor'], data['tipo'], data['indexador'],
                data['taxa_percentual'], data['taxa_fixa'], data['quantidade'], data['preco'],
                data['data_inicio'], data['vencimento'], data['liquidez_diaria'], 
                data['isento_ir'], data['observacao'], now, now
            ))
            conn.commit()
            new_id = cur.lastrowid
            print(f"rf_catalog_create: Item SQLite criado com ID {new_id}")
            return { 'success': True, 'id': new_id }
        finally:
            conn.close()

def rf_catalog_update(id_: int, item: dict):
    """
    Atualiza item no catálogo de renda fixa com abstração completa
    Funciona igual em SQLite e PostgreSQL
    """
    usuario = get_usuario_atual()
    if not usuario:
        return { 'success': False, 'message': 'Não autenticado' }
    
    schema_created = _ensure_rf_catalog_schema()
    if not schema_created:
        return { 'success': False, 'message': 'Falha ao criar/verificar schema' }
    
    # Validação unificada
    validation_result = _validate_rf_catalog_item(item)
    if not validation_result['valid']:
        return { 'success': False, 'message': validation_result['message'] }
    
    # Preparar dados com conversão segura
    data = validation_result['data']
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                try:
                    print(f"rf_catalog_update: Atualizando item {id_} PostgreSQL para usuário {usuario}")
                    # PostgreSQL - usar tipos nativos
                    c.execute('''
                        UPDATE rf_catalog SET nome=%s, emissor=%s, tipo=%s, indexador=%s, taxa_percentual=%s, 
                                             taxa_fixa=%s, quantidade=%s, preco=%s, data_inicio=%s, vencimento=%s, 
                                             liquidez_diaria=%s, isento_ir=%s, observacao=%s, updated_at=CURRENT_TIMESTAMP
                        WHERE id=%s
                    ''', (
                        data['nome'], data['emissor'], data['tipo'], data['indexador'],
                        data['taxa_percentual'], data['taxa_fixa'], data['quantidade'], data['preco'],
                        data['data_inicio'], data['vencimento'], data['liquidez_diaria'], 
                        data['isento_ir'], data['observacao'], id_
                    ))
                    print(f"rf_catalog_update: Item {id_} PostgreSQL atualizado com sucesso")
                    return { 'success': True }
                except Exception as e:
                    print(f"Erro ao atualizar rf_catalog PostgreSQL: {e}")
                    return { 'success': False, 'message': f'Erro ao atualizar: {str(e)}' }
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            cur.execute('''
                UPDATE rf_catalog SET nome=?, emissor=?, tipo=?, indexador=?, taxa_percentual=?, 
                                     taxa_fixa=?, quantidade=?, preco=?, data_inicio=?, vencimento=?, 
                                     liquidez_diaria=?, isento_ir=?, observacao=?, updated_at=?
                WHERE id=?
            ''', (
                data['nome'], data['emissor'], data['tipo'], data['indexador'],
                data['taxa_percentual'], data['taxa_fixa'], data['quantidade'], data['preco'],
                data['data_inicio'], data['vencimento'], data['liquidez_diaria'], 
                data['isento_ir'], data['observacao'], now, id_
            ))
            conn.commit()
            print(f"rf_catalog_update: Item {id_} SQLite atualizado com sucesso")
            return { 'success': True }
        finally:
            conn.close()

def rf_catalog_delete(id_: int):

    usuario = get_usuario_atual()
    if not usuario:
        return { 'success': False, 'message': 'Não autenticado' }
    
    schema_created = _ensure_rf_catalog_schema()
    if not schema_created:
        return { 'success': False, 'message': 'Falha ao criar/verificar schema' }
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                try:
                    print(f"rf_catalog_delete: Removendo item {id_} PostgreSQL para usuário {usuario}")
                    c.execute('DELETE FROM rf_catalog WHERE id=%s', (id_,))
                    print(f"rf_catalog_delete: Item {id_} PostgreSQL removido com sucesso")
                    return { 'success': True }
                except Exception as e:
                    print(f"Erro ao deletar rf_catalog PostgreSQL: {e}")
                    return { 'success': False, 'message': f'Erro ao deletar: {str(e)}' }
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            print(f"rf_catalog_delete: Removendo item {id_} SQLite para usuário {usuario}")
            cur.execute('DELETE FROM rf_catalog WHERE id=?', (id_,))
            conn.commit()
            print(f"rf_catalog_delete: Item {id_} SQLite removido com sucesso")
            return { 'success': True }
        finally:
            conn.close()
def delete_asset_type(nome: str):
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Não autenticado"}
    if not nome:
        return {"success": False, "message": "Nome inválido"}
    _ensure_asset_types_schema()
   
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('SELECT COUNT(1) FROM carteira WHERE tipo=%s', (nome,))
                cnt = c.fetchone()[0]
                if cnt and int(cnt) > 0:
                    return {"success": False, "message": "Existem ativos com esse tipo"}
                c.execute('DELETE FROM asset_types WHERE nome=%s', (nome,))
        finally:
            conn.close()
        return {"success": True}
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        cur = conn.cursor()
        cur.execute('SELECT COUNT(1) FROM carteira WHERE tipo=?', (nome,))
        cnt = cur.fetchone()[0]
        if cnt and int(cnt) > 0:
            conn.close()
            return {"success": False, "message": "Existem ativos com esse tipo"}
        cur.execute('DELETE FROM asset_types WHERE nome=?', (nome,))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()
def set_usuario_atual(username):
   
    global USUARIO_ATUAL
    with SESSION_LOCK:
        USUARIO_ATUAL = username

def _create_sessions_table_if_needed():
    if _is_postgres():
        conn = _get_pg_conn()
        try:
            with conn.cursor() as c:
                c.execute(
                    """
                    CREATE TABLE IF NOT EXISTS public.sessoes (
                        token TEXT PRIMARY KEY,
                        username TEXT NOT NULL,
                        expira_em BIGINT NOT NULL
                    )
                    """
                )
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USUARIOS_DB_PATH)
        try:
            c = conn.cursor()
            c.execute(
                '''CREATE TABLE IF NOT EXISTS sessoes (
                    token TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    expira_em INTEGER NOT NULL
                )'''
            )
            conn.commit()
        finally:
            conn.close()

def criar_sessao(username: str, duracao_segundos: int = 3600) -> str:
  
    _create_sessions_table_if_needed()
    token = secrets.token_urlsafe(32)
    expira_em = int(time.time()) + int(duracao_segundos)
    if _is_postgres():
        conn = _get_pg_conn()
        try:
            with conn.cursor() as c:
                c.execute('INSERT INTO public.sessoes (token, username, expira_em) VALUES (%s, %s, %s) ON CONFLICT (token) DO UPDATE SET username = EXCLUDED.username, expira_em = EXCLUDED.expira_em', (token, username, expira_em))
            return token
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USUARIOS_DB_PATH)
        try:
            c = conn.cursor()
            c.execute('INSERT OR REPLACE INTO sessoes (token, username, expira_em) VALUES (?, ?, ?)', (token, username, expira_em))
            conn.commit()
            return token
        finally:
            conn.close()

def invalidar_sessao(token: str) -> None:
    try:
        if _is_postgres():
            conn = _get_pg_conn()
            try:
                with conn.cursor() as c:
                    c.execute('DELETE FROM public.sessoes WHERE token = %s', (token,))
            finally:
                conn.close()
        else:
            conn = sqlite3.connect(USUARIOS_DB_PATH)
            c = conn.cursor()
            c.execute('DELETE FROM sessoes WHERE token = ?', (token,))
            conn.commit()
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass

def invalidar_todas_sessoes() -> None:
    
    try:
        _create_sessions_table_if_needed()
        if _is_postgres():
            conn = _get_pg_conn()
            try:
                with conn.cursor() as c:
                    c.execute('DELETE FROM public.sessoes')
            finally:
                conn.close()
        else:
            conn = sqlite3.connect(USUARIOS_DB_PATH)
            c = conn.cursor()
            c.execute('DELETE FROM sessoes')
            conn.commit()
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass
def get_usuario_atual():
   
    try:
        from flask import request, g
    except Exception:
        request = None
        g = None
    # Cache por requisição para evitar consultas repetidas ao banco
    if g is not None:
        try:
            cached_user = getattr(g, "_usuario_atual_cached")
            return cached_user
        except Exception:
            pass
    try:
        token = request.cookies.get('session_token') if request else None
        if not token:
            if g is not None:
                try:
                    setattr(g, "_usuario_atual_cached", None)
                except Exception:
                    pass
            return None
        _create_sessions_table_if_needed()
        if _is_postgres():
            conn = _get_pg_conn()
            try:
                with conn.cursor() as c:
                    c.execute('SELECT username, expira_em FROM public.sessoes WHERE token = %s', (token,))
                    row = c.fetchone()
                    if not row:
                        if g is not None:
                            try:
                                setattr(g, "_usuario_atual_cached", None)
                            except Exception:
                                pass
                        return None
                    username, expira_em = row
                    if int(expira_em) < int(time.time()):
                        try:
                            c.execute('DELETE FROM public.sessoes WHERE token = %s', (token,))
                        except Exception:
                            pass
                        if g is not None:
                            try:
                                setattr(g, "_usuario_atual_cached", None)
                            except Exception:
                                pass
                        return None
                    if g is not None:
                        try:
                            setattr(g, "_usuario_atual_cached", username)
                        except Exception:
                            pass
                    return username
            finally:
                try:
                    conn.close()
                except Exception:
                    pass
        else:
            conn = sqlite3.connect(USUARIOS_DB_PATH)
            try:
                c = conn.cursor()
                c.execute('SELECT username, expira_em FROM sessoes WHERE token = ?', (token,))
                row = c.fetchone()
                if not row:
                    if g is not None:
                        try:
                            setattr(g, "_usuario_atual_cached", None)
                        except Exception:
                            pass
                    return None
                username, expira_em = row
                if expira_em < int(time.time()):
                    # sessão expirada
                    try:
                        c.execute('DELETE FROM sessoes WHERE token = ?', (token,))
                        conn.commit()
                    except Exception:
                        pass
                    if g is not None:
                        try:
                            setattr(g, "_usuario_atual_cached", None)
                        except Exception:
                            pass
                    return None
                if g is not None:
                    try:
                        setattr(g, "_usuario_atual_cached", username)
                    except Exception:
                        pass
                return username
            finally:
                conn.close()
    except Exception:
        return None

def limpar_sessoes_expiradas():
    try:
        _create_sessions_table_if_needed()
        agora = int(time.time())
        if _is_postgres():
            conn = _get_pg_conn()
            try:
                with conn.cursor() as c:
                    c.execute('DELETE FROM public.sessoes WHERE expira_em < %s', (agora,))
            finally:
                conn.close()
        else:
            conn = sqlite3.connect(USUARIOS_DB_PATH)
            c = conn.cursor()
            c.execute('DELETE FROM sessoes WHERE expira_em < ?', (agora,))
            conn.commit()
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass

def get_db_path(usuario, tipo_db):

    if not usuario:
        raise ValueError("Usuário não especificado")
    

    current_dir = os.path.dirname(os.path.abspath(__file__))
    

    db_dir = os.path.join(current_dir, "bancos_usuarios", usuario)
    os.makedirs(db_dir, exist_ok=True)
    
    db_path = os.path.join(db_dir, f"{tipo_db}.db")
    return db_path



_base_dir = os.path.dirname(os.path.abspath(__file__))
_legacy_path = os.path.join(_base_dir, "usuarios.db")  
_auth_dir = os.path.join(_base_dir, "bancos_usuarios", "_auth")
try:
    os.makedirs(_auth_dir, exist_ok=True)
except Exception:
    pass
_default_persist_path = os.path.join(_auth_dir, "usuarios.db")


env_db = os.getenv("USUARIOS_DB_PATH")
if env_db:
    USUARIOS_DB_PATH = env_db
else:
    USUARIOS_DB_PATH = _legacy_path if os.path.exists(_legacy_path) else _default_persist_path




try:
    from .assets_lists import LISTA_ACOES, LISTA_FIIS, LISTA_BDRS
except ImportError:
    from assets_lists import LISTA_ACOES, LISTA_FIIS, LISTA_BDRS

df_ativos = None
carregamento_em_andamento = False
lock = threading.Lock()  


cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})

global_state = {"df_ativos": None, "carregando": False}

def carregar_ativos():
    acoes = LISTA_ACOES
    fiis = LISTA_FIIS
    bdrs = LISTA_BDRS
    
    try:
        print("🔄 Iniciando carregamento de ativos...")
        


        acoes_filtradas = processar_ativos(acoes, 'Ação')
        bdrs_filtradas = processar_ativos(bdrs, 'BDR')
        fiis_filtradas = processar_ativos(fiis, 'FII')



        ativos_filtrados = acoes_filtradas + bdrs_filtradas + fiis_filtradas

        if not ativos_filtrados:
            print(" Nenhum ativo foi carregado. Algo deu errado!")
            return

        df_ativos = pd.DataFrame(ativos_filtrados)
        
        if df_ativos.empty:
            print(" O DataFrame gerado está vazio! Verifique os filtros.")
        else:
            print(f" Carregamento concluído! {len(df_ativos)} ativos carregados.")
            print(f" Colunas disponíveis: {df_ativos.columns.tolist()}")

        global_state["df_ativos"] = df_ativos

    except Exception as e:
        print(f" Erro no carregamento dos ativos: {e}")


def obter_preco_historico(ticker, data, max_retentativas=3):
    """
    Obtém o preço histórico de um ativo em uma data específica
    """
    def to_float_or_none(valor):
        try:
            result = float(valor)
            return result if result != float('inf') and result > 0 else None
        except (ValueError, TypeError):
            return None

    tentativas = 0
    while tentativas < max_retentativas:
        try:
            print(f"🔍 Buscando preço histórico para {ticker} na data {data}...")
            
            # Normalizar ticker para yfinance
            ticker_yf = ticker.strip().upper()
            if '-' not in ticker_yf and '.' not in ticker_yf and len(ticker_yf) <= 6:
                ticker_yf += '.SA'
            
            acao = yf.Ticker(ticker_yf)
            
            # Converter data para datetime
            if isinstance(data, str):
                data_obj = datetime.strptime(data[:10], '%Y-%m-%d').date()
            else:
                data_obj = data
            
            # Buscar histórico com margem de segurança
            start_date = data_obj - timedelta(days=30)
            end_date = data_obj + timedelta(days=1)
            
            historico = acao.history(start=start_date.isoformat(), end=end_date.isoformat())
            
            if historico is None or historico.empty:
                print(f"❌ Nenhum histórico encontrado para {ticker}")
                return None
            
            # Buscar o preço mais próximo da data (não posterior)
            preco_encontrado = None
            for idx, row in historico[::-1].iterrows():
                data_historico = idx.date()
                if data_historico <= data_obj:
                    preco_encontrado = to_float_or_none(row.get('Close') or row.get('Adj Close'))
                    if preco_encontrado:
                        print(f"✅ Preço encontrado: R$ {preco_encontrado:.2f} em {data_historico}")
                        return {
                            "preco": preco_encontrado,
                            "data_historico": data_historico.isoformat(),
                            "data_solicitada": data_obj.isoformat(),
                            "ticker": ticker
                        }
            
            print(f"❌ Nenhum preço válido encontrado para {ticker} na data {data}")
            return None
            
        except Exception as e:
            tentativas += 1
            print(f"⚠️ Tentativa {tentativas} falhou para {ticker}: {str(e)}")
            if tentativas >= max_retentativas:
                print(f"❌ Falha definitiva ao buscar preço histórico para {ticker}")
                return None
            time.sleep(1)
    
    return None

def obter_preco_atual(ticker, max_retentativas=3):
    """
    Obtém o preço atual de um ativo
    """
    tentativas = 0
    while tentativas < max_retentativas:
        try:
            print(f"🔍 Buscando preço atual para {ticker}...")
            
            # Normalizar ticker para yfinance
            ticker_yf = ticker.strip().upper()
            if '-' not in ticker_yf and '.' not in ticker_yf and len(ticker_yf) <= 6:
                ticker_yf += '.SA'
            
            acao = yf.Ticker(ticker_yf)
            info = acao.info
            
            if not info:
                return None
            
            preco_atual = info.get("currentPrice")
            if preco_atual is None:
                preco_atual = info.get("regularMarketPrice")
            
            if preco_atual and preco_atual > 0:
                print(f"✅ Preço atual encontrado: R$ {preco_atual:.2f}")
                return {
                    "preco": float(preco_atual),
                    "data": datetime.now().strftime('%Y-%m-%d'),
                    "ticker": ticker
                }
            
            return None
            
        except Exception as e:
            tentativas += 1
            print(f"⚠️ Tentativa {tentativas} falhou para {ticker}: {str(e)}")
            if tentativas >= max_retentativas:
                return None
            time.sleep(1)
    
    return None

def obter_informacoes(ticker, tipo_ativo, max_retentativas=3):
    def to_float_or_inf(valor):
        try:
            result = float(valor)
            return result if result != float('inf') else None
        except (ValueError, TypeError):
            return None

    tentativas = 0
    while tentativas < max_retentativas:
        try:
            print(f"🔍 Buscando informações para {ticker}...")

            acao = yf.Ticker(ticker)
            info = acao.info

           
            if not info:
                return None


            if tipo_ativo == 'FII':
                if not info.get("longName") and not info.get("shortName"):
                    print(f" Ativo {ticker} não encontrado na API do Yahoo Finance. Ignorando...")
                    return None
            else:

                if "sector" not in info:
                    print(f" Ativo {ticker} não encontrado na API do Yahoo Finance. Ignorando...")
                    return None

            preco_atual = info.get("currentPrice")
            if preco_atual is None:
                preco_atual = info.get("regularMarketPrice") or 0.0
            roe_raw = info.get("returnOnEquity", 0.0)
            dividend_yield_api = info.get("dividendYield")
            average_volume = info.get("averageVolume") or 0  
            liquidez_diaria = preco_atual * average_volume

            trailing_pe_raw = info.get("trailingPE")
            price_to_book_raw = info.get("priceToBook")

            pl = to_float_or_inf(trailing_pe_raw)
            if pl is None:
                pl = float('inf') if tipo_ativo != 'FII' else 0.0
            pvp = to_float_or_inf(price_to_book_raw)
            if pvp is None:
                pvp = float('inf') if tipo_ativo != 'FII' else 0.0

            roe = round(roe_raw * 100, 2) if roe_raw else 0.0
            

            if dividend_yield_api is None:
                dividend_yield = 0.0
            elif tipo_ativo == 'FII':
                dividend_yield = round((dividend_yield_api * 100) if dividend_yield_api < 1 else dividend_yield_api, 2)
            else:
                dividend_yield = round(dividend_yield_api, 6)
                
            setor = info.get("sector", "").strip() or "Desconhecido"

            return {
                "ticker": ticker,
                "nome_completo": info.get("longName", ""),
                "setor": setor,
                "industria": info.get("industry", ""),
                "website": info.get("website", ""),
                "roe": roe,
                "preco_atual": preco_atual,
                "dividend_yield": dividend_yield,
                "pl": pl,
                "pvp": pvp,
                "pais": info.get("country", ""),
                "tipo": tipo_ativo,
                "liquidez_diaria": liquidez_diaria,
                "volume_medio": average_volume,
            }

        except Exception as e:
            msg_erro = str(e).lower()
            if "too many requests" in msg_erro or "rate limited" in msg_erro:
                print(f"⚠️ Rate limit detectado para {ticker}. Aguardando 60s e tentando novamente...")
                time.sleep(60)
                tentativas += 1
            else:
                print(f" Erro ao obter informações para {ticker}: {e}")
                return None

    print(f"⚠️ Não foi possível obter {ticker} após {max_retentativas} tentativas. Ignorando...")
    return None



def aplicar_filtros_acoes(dados):

    return sorted([
        ativo for ativo in dados if (
            ativo['roe'] >= 15 and
            ativo['dividend_yield'] > 12 and
            1 <= ativo['pl'] <= 10 and
            ativo['pvp'] <= 2
        )
    ], key=lambda x: x['dividend_yield'], reverse=True)[:10]


def aplicar_filtros_bdrs(dados):

    return sorted([
        ativo for ativo in dados if (
            ativo['roe'] >= 15 and
            ativo['dividend_yield'] > 3 and
            1 <= ativo['pl'] <= 15 and
            ativo['pvp'] <= 3
        )
    ], key=lambda x: x['dividend_yield'], reverse=True)[:10]


def aplicar_filtros_fiis(dados):
    return sorted([
        ativo for ativo in dados if (
            12 <= ativo['dividend_yield'] <= 15 and
            ativo.get("liquidez_diaria", 0) > 1000_000
        )
    ], key=lambda x: x['dividend_yield'], reverse=True)[:10]



def processar_ativos(lista, tipo):

    dados = [obter_informacoes(ticker, tipo) for ticker in lista]
    dados = [d for d in dados if d is not None] 

    print(f"🔍 {tipo}: {len(dados)} ativos recuperados antes dos filtros.")

    if not dados:
        print(f" Nenhum ativo válido foi encontrado para {tipo}. Verifique a API.")
        return []

    ativos_filtrados = (
        aplicar_filtros_acoes(dados) if tipo == 'Ação' else
        aplicar_filtros_bdrs(dados) if tipo == 'BDR' else
        aplicar_filtros_fiis(dados) if tipo == 'FII' else
        []
    )


    ativos_rejeitados = set(d['ticker'] for d in dados) - set(d['ticker'] for d in ativos_filtrados)
    print(f" {len(ativos_rejeitados)} {tipo}s foram rejeitados pelos filtros: {ativos_rejeitados}")

    print(f" {len(ativos_filtrados)} {tipo}s passaram nos filtros.")
    return ativos_filtrados



def formatar_dados(ativos):

    for ativo in ativos:
        ativo['preco_atual_display'] = formatar_numero(ativo.get('preco_atual', 0), 'preco')
        ativo['roe_display'] = formatar_numero(ativo.get('roe', 0), 'percentual')
        if ativo["dividend_yield"] is not None:
            ativo["dividend_yield_display"] = f"{ativo['dividend_yield'] * 100:.2f}%".replace(".", ",")
        else:
            ativo["dividend_yield_display"] = "N/A"  


    return ativos


def formatar_numero(numero, tipo='preco'):

    if tipo == 'preco':
        return f'R$ {numero:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    elif tipo == 'percentual':
        return f'{numero:.2f}%'.replace('.', ',')
    return numero


def obter_todas_informacoes(ticker):
    try:
        acao = yf.Ticker(ticker)
        print(f"Obtendo informações brutas para {ticker}...")
        info = acao.info
        historico = acao.history(period="max")

        return {
            "info": info if info else {},
            "historico": historico,
            "dividends": acao.dividends,
            "splits": acao.splits,
            "recomendacoes": acao.recommendations,
            "sustainability": acao.sustainability,
            "holders": acao.major_holders,
            "earnings": acao.earnings,
            "quarterly_earnings": acao.quarterly_earnings,
            "balance_sheet": acao.balance_sheet,
            "cashflow": acao.cashflow,
            "quarterly_balance_sheet": acao.quarterly_balance_sheet,
            "quarterly_cashflow": acao.quarterly_cashflow,
            "financials": acao.financials,
            "quarterly_financials": acao.quarterly_financials
        }
    except Exception as e:
        print(f"Erro ao obter informações para {ticker}: {e}")
        return None



def criar_tabela_usuarios():
    if _is_postgres():
        conn = _get_pg_conn()
        try:
            with conn.cursor() as c:
                c.execute('''
                    CREATE TABLE IF NOT EXISTS public.usuarios (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL,
                        username TEXT UNIQUE NOT NULL,
                        senha_hash TEXT NOT NULL,
                        pergunta_seguranca TEXT,
                        resposta_seguranca_hash TEXT,
                        data_cadastro TIMESTAMP NOT NULL
                    )
                ''')
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USUARIOS_DB_PATH)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL,
                pergunta_seguranca TEXT,
                resposta_seguranca_hash TEXT,
                data_cadastro TEXT NOT NULL
            )
        ''')
        conn.commit()
        conn.close()

def cadastrar_usuario(nome, username, senha, pergunta_seguranca=None, resposta_seguranca=None):
    senha_hash = bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    data_cadastro = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    

    resposta_hash = None
    if pergunta_seguranca and resposta_seguranca:
        resposta_hash = bcrypt.hashpw(resposta_seguranca.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if _is_postgres():
        conn = _get_pg_conn()
        try:
            with conn.cursor() as c:
                try:
                    c.execute('''
                        INSERT INTO public.usuarios (nome, username, senha_hash, pergunta_seguranca, resposta_seguranca_hash, data_cadastro)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    ''', (nome, username, senha_hash, pergunta_seguranca, resposta_hash, data_cadastro))
                    return True
                except Exception:
                    return False
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USUARIOS_DB_PATH)
        c = conn.cursor()
        try:
            c.execute('''INSERT INTO usuarios (nome, username, senha_hash, pergunta_seguranca, resposta_seguranca_hash, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)''',
                      (nome, username, senha_hash, pergunta_seguranca, resposta_hash, data_cadastro))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

def buscar_usuario_por_username(username):
    if _is_postgres():
        conn = _get_pg_conn()
        try:
            with conn.cursor() as c:
                c.execute('SELECT id, nome, username, senha_hash, pergunta_seguranca, resposta_seguranca_hash, data_cadastro FROM public.usuarios WHERE username = %s', (username,))
                row = c.fetchone()
                if row:
                    return {
                        'id': row[0],
                        'nome': row[1],
                        'username': row[2],
                        'senha_hash': row[3],
                        'pergunta_seguranca': row[4],
                        'resposta_seguranca_hash': row[5],
                        'data_cadastro': row[6]
                    }
                return None
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USUARIOS_DB_PATH)
        c = conn.cursor()
        c.execute('SELECT id, nome, username, senha_hash, pergunta_seguranca, resposta_seguranca_hash, data_cadastro FROM usuarios WHERE username = ?', (username,))
        row = c.fetchone()
        conn.close()
        if row:
            return {
                'id': row[0],
                'nome': row[1],
                'username': row[2],
                'senha_hash': row[3],
                'pergunta_seguranca': row[4],
                'resposta_seguranca_hash': row[5],
                'data_cadastro': row[6]
            }
        return None

def verificar_senha(username, senha):
    usuario = buscar_usuario_por_username(username)
    if usuario:
        return bcrypt.checkpw(senha.encode('utf-8'), usuario['senha_hash'].encode('utf-8'))
    return False

def verificar_resposta_seguranca(username, resposta):
    """Verificar resposta de segurança do usuário"""
    usuario = buscar_usuario_por_username(username)
    if not usuario or not usuario['resposta_seguranca_hash']:
        return False
    
    return bcrypt.checkpw(resposta.encode('utf-8'), usuario['resposta_seguranca_hash'].encode('utf-8'))



def alterar_senha_direta(username, nova_senha):
    """Alterar senha diretamente (usado após verificação de segurança)"""
    # Hash da nova senha
    nova_senha_hash = bcrypt.hashpw(nova_senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if _is_postgres():
        conn = _get_pg_conn()
        try:
            with conn.cursor() as c:
                c.execute('UPDATE public.usuarios SET senha_hash = %s WHERE username = %s', (nova_senha_hash, username))
                return True
        except Exception as e:
            print(f"Erro ao alterar senha: {e}")
            return False
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USUARIOS_DB_PATH)
        c = conn.cursor()
        try:
            c.execute('UPDATE usuarios SET senha_hash = ? WHERE username = ?', (nova_senha_hash, username))
            conn.commit()
            return True
        except Exception as e:
            print(f"Erro ao alterar senha: {e}")
            return False
        finally:
            conn.close()

def atualizar_pergunta_seguranca(username, pergunta, resposta):
    """Atualizar pergunta de segurança de um usuário"""
    if _is_postgres():
        conn = _get_pg_conn()
        try:
            resposta_hash = bcrypt.hashpw(resposta.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            with conn.cursor() as c:
                c.execute('UPDATE public.usuarios SET pergunta_seguranca = %s, resposta_seguranca_hash = %s WHERE username = %s',
                          (pergunta, resposta_hash, username))
                return True
        except Exception as e:
            print(f"Erro ao atualizar pergunta de segurança: {e}")
            return False
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(USUARIOS_DB_PATH)
        c = conn.cursor()
        try:
            resposta_hash = bcrypt.hashpw(resposta.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            c.execute('UPDATE usuarios SET pergunta_seguranca = ?, resposta_seguranca_hash = ? WHERE username = ?', 
                      (pergunta, resposta_hash, username))
            conn.commit()
            return True
        except Exception as e:
            print(f"Erro ao atualizar pergunta de segurança: {e}")
            return False
        finally:
            conn.close()

def processar_ativos_com_filtros_geral(lista_ativos, tipo_ativo, roe_min, dy_min, pl_min, pl_max, pvp_max):
    """Função genérica para processar ativos (ações e BDRs) com filtros"""
    dados = [obter_informacoes(ticker, tipo_ativo) for ticker in lista_ativos]
    dados = [d for d in dados if d is not None]
    filtrados = [
        ativo for ativo in dados if (
            ativo['roe'] >= (roe_min or 0) and
            ativo['dividend_yield'] > (dy_min or 0) and
            (pl_min or 0) <= ativo['pl'] <= (pl_max or float('inf')) and
            ativo['pvp'] <= (pvp_max or float('inf'))
        )
    ]
    return sorted(filtrados, key=lambda x: x['dividend_yield'], reverse=True)[:10]

def processar_ativos_acoes_com_filtros(roe_min, dy_min, pl_min, pl_max, pvp_max):
    """Processar ações com filtros - wrapper para compatibilidade"""
    return processar_ativos_com_filtros_geral(LISTA_ACOES, 'Ação', roe_min, dy_min, pl_min, pl_max, pvp_max)

def processar_ativos_bdrs_com_filtros(roe_min, dy_min, pl_min, pl_max, pvp_max):
    """Processar BDRs com filtros - wrapper para compatibilidade"""
    return processar_ativos_com_filtros_geral(LISTA_BDRS, 'BDR', roe_min, dy_min, pl_min, pl_max, pvp_max)

def processar_ativos_fiis_com_filtros(dy_min, dy_max, liq_min):
    fiis = LISTA_FIIS
    dados = [obter_informacoes(ticker, 'FII') for ticker in fiis]
    dados = [d for d in dados if d is not None]
    filtrados = [
        ativo for ativo in dados if (
            ativo['dividend_yield'] >= (dy_min or 0) and
            ativo['dividend_yield'] <= (dy_max or float('inf')) and
            ativo.get('liquidez_diaria', 0) > (liq_min or 0)
        )
    ]
    return sorted(filtrados, key=lambda x: x['dividend_yield'], reverse=True)[:10]

# ==================== FUNÇÕES DE CARTEIRA ====================

def init_carteira_db(usuario=None):
    """Inicializar banco de dados de carteira para um usuário específico"""
    if not usuario:
        usuario = get_usuario_atual()
        if not usuario:
            raise ValueError("Usuário não especificado")
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS carteira (
                        id SERIAL PRIMARY KEY,
                        ticker TEXT NOT NULL,
                        nome_completo TEXT NOT NULL,
                        quantidade NUMERIC NOT NULL,
                        preco_atual NUMERIC NOT NULL,
                        valor_total NUMERIC NOT NULL,
                        data_adicao TEXT NOT NULL,
                        tipo TEXT DEFAULT 'Desconhecido',
                        dy NUMERIC,
                        pl NUMERIC,
                        pvp NUMERIC,
                        roe NUMERIC
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS historico_carteira (
                        id SERIAL PRIMARY KEY,
                        data TEXT NOT NULL,
                        valor_total NUMERIC NOT NULL
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS movimentacoes (
                        id SERIAL PRIMARY KEY,
                        data TEXT NOT NULL,
                        ticker TEXT NOT NULL,
                        nome_completo TEXT,
                        quantidade NUMERIC NOT NULL,
                        preco NUMERIC NOT NULL,
                        tipo TEXT NOT NULL
                    )
                ''')
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes(data)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_movimentacoes_ticker ON movimentacoes(ticker)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_carteira_valor_total ON carteira(valor_total)")
                # Configuração de rebalanceamento (uma linha por usuário)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS rebalance_config (
                        id SERIAL PRIMARY KEY,
                        periodo TEXT NOT NULL,
                        targets_json TEXT NOT NULL,
                        start_date TEXT,
                        last_rebalance_date TEXT,
                        updated_at TEXT NOT NULL
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS rebalance_history (
                        id SERIAL PRIMARY KEY,
                        data TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                ''')
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        cursor = conn.cursor()
        # Tabela de carteira
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS carteira (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker TEXT NOT NULL,
                nome_completo TEXT NOT NULL,
                quantidade INTEGER NOT NULL,
                preco_atual REAL NOT NULL,
                valor_total REAL NOT NULL,
                data_adicao TEXT NOT NULL,
                tipo TEXT DEFAULT 'Desconhecido',
                dy REAL,
                pl REAL,
                pvp REAL,
                roe REAL
            )
        ''')
        # Tabela de histórico
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historico_carteira (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                valor_total REAL NOT NULL
            )
        ''')
        # Tabela de movimentações
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS movimentacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                ticker TEXT NOT NULL,
                nome_completo TEXT,
                quantidade REAL NOT NULL,
                preco REAL NOT NULL,
                tipo TEXT NOT NULL
            )
        ''')
        # Otimizações SQLite
        try:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA temp_store=MEMORY;")
        except Exception:
            pass
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes(data)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_movimentacoes_ticker ON movimentacoes(ticker)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_carteira_valor_total ON carteira(valor_total)")
        # Configuração de rebalanceamento (uma linha por usuário)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rebalance_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                periodo TEXT NOT NULL,
                targets_json TEXT NOT NULL,
                start_date TEXT,
                last_rebalance_date TEXT,
                updated_at TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rebalance_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        conn.commit()
        conn.close()

def obter_cotacao_dolar():

    try:
        cotacao = yf.Ticker("BRL=X").info.get("regularMarketPrice")
        return cotacao if cotacao else 5.0
    except:
        return 5.0

def _normalize_ticker_for_yf(ticker: str) -> str:

    try:
        t = (ticker or "").strip().upper()
        if not t:
            return t

        if '-' in t or '.' in t:
            return t
        
        if len(t) <= 6:
            return t + '.SA'
        return t
    except Exception:
        return (ticker or "").upper()

def obter_informacoes_ativo(ticker):

    try:
       
        normalized = _normalize_ticker_for_yf(ticker)
        acao = yf.Ticker(normalized)
        info = acao.info or {}
        
        if not info and normalized != ticker:
            acao = yf.Ticker(ticker)
            info = acao.info or {}
        preco_atual = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        
        tipo_map = {
            "EQUITY": "Ação",
            "ETF": "FII",
            "CRYPTOCURRENCY": "Criptomoeda",
            "CURRENCY": "Criptomoeda",
        }
        tipo_raw = info.get("quoteType", "Desconhecido")
        tipo = tipo_map.get(tipo_raw, "Desconhecido")
        
        if preco_atual is None:
            return None
            

        cotacao_brl = obter_cotacao_dolar()
        if tipo == "Criptomoeda":
            try:
                preco_atual = float(preco_atual) * float(cotacao_brl)
            except Exception:
                pass
            
        return {
            "ticker": ticker.upper(),
            "nome_completo": info.get("longName", "Desconhecido"),
            "preco_atual": preco_atual,
            "tipo": tipo,
            "pl": info.get("trailingPE"),
            "pvp": info.get("priceToBook"),
            "dy": info.get("dividendYield"),
            "roe": info.get("returnOnEquity"),
        }
    except Exception as e:
        print(f"Erro ao obter informações de {ticker}: {e}")
        return None

def obter_taxas_indexadores():
    """Obtém as taxas atuais dos indexadores (SELIC, CDI, IPCA)"""
    try:
        import requests
        from datetime import datetime, timedelta
        
        def sgs_last(series_id, use_range=False):
            try:
                if use_range:
                    end_date = datetime.now()
                    start_date = end_date - timedelta(days=90)
                    url = (f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}/dados?"
                           f"formato=json&dataInicial={start_date.strftime('%d/%m/%Y')}"
                           f"&dataFinal={end_date.strftime('%d/%m/%Y')}")
                    r = requests.get(url, timeout=10)
                    r.raise_for_status()
                    arr = r.json()
                    return float(arr[-1]['valor']) if arr else None
                else:
                    url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}/dados/ultimos/1?formato=json"
                    r = requests.get(url, timeout=10)
                    r.raise_for_status()
                    arr = r.json()
                    return float(arr[0]['valor']) if arr else None
            except Exception:
                return None
        
        # SELIC (série 432) - taxa anual
        selic = sgs_last(432, use_range=True)
        # CDI (série 12) - taxa anual
        cdi = sgs_last(12, use_range=True)
        # IPCA (série 433) - taxa mensal
        ipca = sgs_last(433)
        
        print(f"DEBUG: Taxas obtidas - SELIC: {selic}%, CDI: {cdi}%, IPCA: {ipca}%")
        
        # CORREÇÃO: Se as taxas estão muito baixas, usar valores padrão
        if cdi and cdi < 1.0:  # Se CDI < 1%, provavelmente está em decimal
            cdi = cdi * 100  # Converter para percentual
            print(f"DEBUG: CDI convertido de {cdi/100}% para {cdi}%")
        
        if selic and selic < 1.0:  # Se SELIC < 1%, provavelmente está em decimal
            selic = selic * 100  # Converter para percentual
            print(f"DEBUG: SELIC convertido de {selic/100}% para {selic}%")
        
        # FALLBACK: Se não conseguir obter taxas, usar valores padrão
        if not cdi or cdi < 5.0:  # CDI muito baixo, usar padrão
            cdi = 13.65
            print(f"DEBUG: CDI não obtido ou muito baixo, usando padrão: {cdi}%")
        
        if not selic or selic < 5.0:  # SELIC muito baixo, usar padrão
            selic = 13.75
            print(f"DEBUG: SELIC não obtido ou muito baixo, usando padrão: {selic}%")
        
        if not ipca or ipca < 0.1:  # IPCA muito baixo, usar padrão
            ipca = 0.5  # IPCA mensal padrão
            print(f"DEBUG: IPCA não obtido ou muito baixo, usando padrão: {ipca}%")
        
        return {
            "SELIC": selic,
            "CDI": cdi,
            "IPCA": ipca
        }
    except Exception as e:
        print(f"Erro ao obter taxas dos indexadores: {e}")
        return {"SELIC": None, "CDI": None, "IPCA": None}

def _obter_taxa_media_historica(indexador, data_inicio):
    """Obtém a taxa média histórica de um indexador desde uma data específica"""
    try:
        import requests
        from datetime import datetime, timedelta
        
        # Determinar série do indexador
        if indexador == "CDI":
            serie_id = 12
        elif indexador == "SELIC":
            serie_id = 432
        else:
            return 13.0  # Taxa padrão se não reconhecer
        
        # Calcular período desde a data de início
        data_fim = datetime.now()
        dias_periodo = (data_fim - data_inicio).days
        
        if dias_periodo <= 0:
            return 13.0
        
        # Buscar dados históricos do Banco Central
        try:
            url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie_id}/dados"
            params = {
                'formato': 'json',
                'dataInicial': data_inicio.strftime('%d/%m/%Y'),
                'dataFinal': data_fim.strftime('%d/%m/%Y')
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            dados = response.json()
            
            if not dados:
                print(f"DEBUG: Nenhum dado histórico encontrado para {indexador}")
                return 13.0
            
            # Calcular média das taxas
            taxas = []
            for item in dados:
                try:
                    taxa = float(item['valor'])
                    if taxa > 0:
                        taxas.append(taxa)
                except (ValueError, KeyError):
                    continue
            
            if not taxas:
                print(f"DEBUG: Nenhuma taxa válida encontrada para {indexador}")
                return 13.0
            
            # Calcular média ponderada (mais recente tem mais peso)
            if len(taxas) == 1:
                taxa_media = taxas[0]
            else:
                # Peso decrescente para dados mais recentes
                pesos = [i + 1 for i in range(len(taxas))]
                taxa_media = sum(t * p for t, p in zip(taxas, pesos)) / sum(pesos)
            
            print(f"DEBUG: Taxa média histórica {indexador} desde {data_inicio.strftime('%Y-%m-%d')}: {taxa_media:.2f}%")
            return taxa_media
            
        except Exception as e:
            print(f"DEBUG: Erro ao buscar dados históricos para {indexador}: {e}")
            return 13.0
            
    except Exception as e:
        print(f"DEBUG: Erro geral ao obter taxa média histórica: {e}")
        return 13.0

def _obter_ipca_medio_historico(data_inicio):
    """Obtém o IPCA médio mensal histórico desde uma data específica"""
    try:
        import requests
        from datetime import datetime
        
        # Buscar IPCA mensal (série 433)
        try:
            url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados"
            params = {
                'formato': 'json',
                'dataInicial': data_inicio.strftime('%d/%m/%Y'),
                'dataFinal': datetime.now().strftime('%d/%m/%Y')
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            dados = response.json()
            
            if not dados:
                print("DEBUG: Nenhum dado histórico de IPCA encontrado")
                return 0.5  # IPCA mensal padrão
            
            # Calcular média do IPCA mensal
            ipcas = []
            for item in dados:
                try:
                    ipca = float(item['valor'])
                    if ipca > 0:
                        ipcas.append(ipca)
                except (ValueError, KeyError):
                    continue
            
            if not ipcas:
                print("DEBUG: Nenhum IPCA válido encontrado")
                return 0.5
            
            ipca_medio = sum(ipcas) / len(ipcas)
            print(f"DEBUG: IPCA médio mensal desde {data_inicio.strftime('%Y-%m-%d')}: {ipca_medio:.2f}%")
            return ipca_medio
            
        except Exception as e:
            print(f"DEBUG: Erro ao buscar IPCA histórico: {e}")
            return 0.5
            
    except Exception as e:
        print(f"DEBUG: Erro geral ao obter IPCA médio: {e}")
        return 0.5

def _obter_taxa_atual_indexador(indexador):
    """Obtém a taxa atual de um indexador usando a mesma abordagem que já funciona"""
    try:
        import requests
        from datetime import datetime, timedelta
        
        # Determinar série do indexador
        if indexador == "CDI":
            serie_id = 12
        elif indexador == "SELIC":
            serie_id = 432
        elif indexador == "IPCA":
            serie_id = 433
        else:
            return 13.0  # Taxa padrão se não reconhecer
        
        # Buscar dados atuais do Banco Central
        try:
            url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie_id}/dados/ultimos/1?formato=json"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            dados = response.json()
            
            if not dados:
                print(f"DEBUG: Nenhum dado atual encontrado para {indexador}")
                return 13.0 if indexador in ["CDI", "SELIC"] else 0.5
            
            # Obter a taxa mais recente
            taxa = float(dados[0]['valor'])
            
            # Para IPCA, já vem em percentual mensal
            if indexador == "IPCA":
                print(f"DEBUG: IPCA atual: {taxa}% mensal")
                return taxa
            
            # Para CDI/SELIC, verificar se está em decimal
            if taxa < 1.0:  # Se está em decimal, converter para percentual
                taxa = taxa * 100
                print(f"DEBUG: {indexador} convertido de decimal para percentual: {taxa}%")
            
            print(f"DEBUG: {indexador} atual: {taxa}% a.a.")
            return taxa
            
        except Exception as e:
            print(f"DEBUG: Erro ao buscar taxa atual para {indexador}: {e}")
            return 13.0 if indexador in ["CDI", "SELIC"] else 0.5
            
    except Exception as e:
        print(f"DEBUG: Erro geral ao obter taxa atual: {e}")
        return 13.0 if indexador in ["CDI", "SELIC"] else 0.5

def calcular_preco_com_indexador(preco_inicial, indexador, indexador_pct, data_adicao):
    """Calcula o preço atual baseado no indexador e percentual - USANDO ABORDAGEM QUE JÁ FUNCIONA"""
    try:
        if not preco_inicial or not indexador or not indexador_pct:
            return preco_inicial
        
        # Converter data de adição para datetime
        from datetime import datetime
        try:
            data_adicao_dt = datetime.strptime(data_adicao, "%Y-%m-%d %H:%M:%S")
        except:
            # Se não conseguir parsear, usar data atual
            data_adicao_dt = datetime.now()
        
        # Calcular dias desde a adição
        dias_desde_adicao = (datetime.now() - data_adicao_dt).days
        
        if dias_desde_adicao <= 0:
            return preco_inicial
        
        print(f"DEBUG: Calculando valorização para {indexador} desde {data_adicao} ({dias_desde_adicao} dias)")
        
        # Aplicar percentual do indexador (ex: 110% = 1.1)
        fator_percentual = indexador_pct / 100
        if fator_percentual <= 0:
            return preco_inicial

        # USAR A MESMA ABORDAGEM QUE JÁ FUNCIONA NA TELA DE DETALHES
        if indexador in ["SELIC", "CDI"]:
            # Usar a mesma lógica da função obter_historico_carteira_comparado
            taxa_anual = _obter_taxa_atual_indexador(indexador)
            print(f"DEBUG: Taxa atual {indexador}: {taxa_anual}% a.a.")
            
            # Aplicar taxa anual com percentual do indexador
            taxa_anual_indexada = taxa_anual * fator_percentual
            taxa_diaria = (1 + taxa_anual_indexada / 100) ** (1/252) - 1
            fator_correcao = (1 + taxa_diaria) ** dias_desde_adicao
            
            print(f"DEBUG: {indexador} taxa={taxa_anual}% | indexada={taxa_anual_indexada}% | diaria={taxa_diaria:.8f} | fator={fator_correcao:.6f}")
            
        elif indexador == "CDI+":
            # CDI+: CDI atual + taxa fixa prefixada
            taxa_cdi_atual = _obter_taxa_atual_indexador("CDI")
            taxa_fixa_anual = (indexador_pct or 0)
            taxa_total_anual = taxa_cdi_atual + taxa_fixa_anual
            
            taxa_diaria = (1 + taxa_total_anual / 100) ** (1/252) - 1
            fator_correcao = (1 + taxa_diaria) ** dias_desde_adicao
            
            print(f"DEBUG: CDI+ CDI={taxa_cdi_atual}% + fixa={taxa_fixa_anual}% = {taxa_total_anual}% | diaria={taxa_diaria:.8f} | fator={fator_correcao:.6f}")
            
        elif indexador == "IPCA":
            # Para IPCA: usar IPCA atual mensal
            ipca_atual_mensal = _obter_taxa_atual_indexador("IPCA")
            meses_desde_adicao = dias_desde_adicao / 30.44
            taxa_mensal_indexada = ipca_atual_mensal * fator_percentual
            fator_correcao = (1 + taxa_mensal_indexada / 100) ** meses_desde_adicao
            
            print(f"DEBUG: IPCA mensal={ipca_atual_mensal}% | indexada={taxa_mensal_indexada}% | meses={meses_desde_adicao:.2f} | fator={fator_correcao:.6f}")
            
        elif indexador == "IPCA+":
            # IPCA+: IPCA atual + taxa fixa prefixada
            ipca_atual_mensal = _obter_taxa_atual_indexador("IPCA")
            taxa_fixa_mensal = (indexador_pct or 0) / 12  
            taxa_mensal_total = ipca_atual_mensal + taxa_fixa_mensal
            meses_desde_adicao = dias_desde_adicao / 30.44
            fator_correcao = (1 + taxa_mensal_total / 100) ** meses_desde_adicao
            
            print(f"DEBUG: IPCA+ IPCA={ipca_atual_mensal}% + fixa_mensal={taxa_fixa_mensal}% = {taxa_mensal_total}% | meses={meses_desde_adicao:.2f} | fator={fator_correcao:.6f}")
            
        elif indexador == "PREFIXADO":

            taxa_anual_decimal = (indexador_pct or 0) / 100.0
            taxa_diaria = (1 + taxa_anual_decimal) ** (1/365) - 1
            fator_correcao = (1 + taxa_diaria) ** dias_desde_adicao
            
            print(f"DEBUG: PREFIXADO anual={indexador_pct}% | diaria={taxa_diaria:.8f} | fator={fator_correcao:.6f}")
            
        else:
            print(f"DEBUG: Indexador não reconhecido: {indexador}")
            return preco_inicial
        
        # Preço final
        preco_final = preco_inicial * fator_correcao
        print(f"DEBUG: Preço inicial: {preco_inicial}, preço final: {preco_final}")
        
        return round(preco_final, 4)
        
    except Exception as e:
        print(f"Erro ao calcular preço com indexador: {e}")
        return preco_inicial

def atualizar_precos_indicadores_carteira():
  
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}
        
        print(f"DEBUG: Iniciando atualização de preços para usuário {usuario}")
        _ensure_indexador_schema()
        atualizados = 0
        erros = []
        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as c:
                    c.execute('SELECT id, ticker, quantidade, preco_atual, data_adicao, indexador, indexador_pct, indexador_base_preco, indexador_base_data FROM carteira')
                    rows = c.fetchall()
                    for row in rows:
                        _id, _ticker, _qtd = row[0], str(row[1] or ''), float(row[2] or 0)
                        _preco_atual = float(row[3] or 0)
                        _data_adicao = row[4]
                        _indexador = row[5]
                        _indexador_pct = float(row[6]) if row[6] is not None else None
                        base_preco = float(row[7]) if (len(row) > 7 and row[7] is not None) else None
                        base_data = row[8] if (len(row) > 8) else None
                        
                        if not _ticker:
                            continue
                        
                        # Se tem indexador configurado, calcular preço baseado no indexador
                        if _indexador and _indexador_pct:
                            print(f"DEBUG: Ativo {_ticker} tem indexador {_indexador} com {_indexador_pct}%")
                            
                            # Preço base: se houve edição manual (indexador_base_preco), usa como base
                            if base_preco is not None and base_data:
                                preco_inicial = base_preco
                                _data_adicao = base_data
                            else:
                                # Caso contrário, base das movimentações
                                c.execute('SELECT preco FROM movimentacoes WHERE ticker = %s ORDER BY data ASC LIMIT 1', (_ticker,))
                                mov_row = c.fetchone()
                                preco_inicial = float(mov_row[0]) if mov_row else _preco_atual
                            
                            print(f"DEBUG: Preço inicial encontrado: {preco_inicial}")
                            
                            preco_atual = calcular_preco_com_indexador(preco_inicial, _indexador, _indexador_pct, _data_adicao)
                            print(f"DEBUG: Preço calculado com indexador: {preco_atual}")
                            
                            dy = None
                            pl = None
                            pvp = None
                            roe = None
                        else:

                            info = obter_informacoes_ativo(_ticker)
                            if not info:
                                erros.append(_ticker)
                                continue
                            preco_atual = float(info.get('preco_atual') or 0.0)
                            dy = info.get('dy')
                            pl = info.get('pl')
                            pvp = info.get('pvp')
                            roe = info.get('roe')
                        
                        valor_total = preco_atual * _qtd
                        c.execute(
                            'UPDATE carteira SET preco_atual=%s, valor_total=%s, dy=%s, pl=%s, pvp=%s, roe=%s WHERE id=%s',
                            (preco_atual, valor_total, dy, pl, pvp, roe, _id)
                        )
                        atualizados += 1
                conn.commit()
            finally:
                conn.close()
        else:
            db_path = get_db_path(usuario, "carteira")
            conn = sqlite3.connect(db_path, check_same_thread=False)
            try:
                cur = conn.cursor()
                cur.execute('SELECT id, ticker, quantidade, preco_atual, data_adicao, indexador, indexador_pct, indexador_base_preco, indexador_base_data FROM carteira')
                rows = cur.fetchall()
                for row in rows:
                    _id, _ticker, _qtd = row[0], str(row[1] or ''), float(row[2] or 0)
                    _preco_atual = float(row[3] or 0)
                    _data_adicao = row[4]
                    _indexador = row[5]
                    _indexador_pct = float(row[6]) if row[6] is not None else None
                    base_preco = float(row[7]) if (len(row) > 7 and row[7] is not None) else None
                    base_data = row[8] if (len(row) > 8) else None
                    
                    if not _ticker:
                        continue
                    
                                        # Se tem indexador configurado, calcular preço baseado no indexador
                    if _indexador and _indexador_pct:
                        print(f"DEBUG: Ativo {_ticker} tem indexador {_indexador} com {_indexador_pct}%")
                        
                        if base_preco is not None and base_data:
                            preco_inicial = base_preco
                            _data_adicao = base_data
                        else:
                            cur.execute('SELECT preco FROM movimentacoes WHERE ticker = ? ORDER BY data ASC LIMIT 1', (_ticker,))
                            mov_row = cur.fetchone()
                            preco_inicial = float(mov_row[0]) if mov_row else _preco_atual
                        
                        print(f"DEBUG: Preço inicial encontrado: {preco_inicial}")
                        
                        preco_atual = calcular_preco_com_indexador(preco_inicial, _indexador, _indexador_pct, _data_adicao)
                        print(f"DEBUG: Preço calculado com indexador: {preco_atual}")
                        
                        dy = None
                        pl = None
                        pvp = None
                        roe = None
                    else:
                        # Buscar informações via yfinance
                        info = obter_informacoes_ativo(_ticker)
                        if not info:
                            erros.append(_ticker)
                            continue
                        preco_atual = float(info.get('preco_atual') or 0.0)
                        dy = info.get('dy')
                        pl = info.get('pl')
                        pvp = info.get('pvp')
                        roe = info.get('roe')
                    
                    valor_total = preco_atual * _qtd
                    cur.execute(
                        'UPDATE carteira SET preco_atual = ?, valor_total = ?, dy = ?, pl = ?, pvp = ?, roe = ? WHERE id = ?',
                        (preco_atual, valor_total, dy, pl, pvp, roe, _id)
                    )
                    atualizados += 1
                conn.commit()
            finally:
                conn.close()
        
        print(f"DEBUG: Atualização PostgreSQL concluída. {atualizados} ativos atualizados, {len(erros)} erros")
        return {"success": True, "updated": atualizados, "errors": erros}
    except Exception as e:
        return {"success": False, "message": f"Erro ao atualizar carteira: {str(e)}"}

def _determinar_preco_compra(ticker, preco_inicial, data_aplicacao, tipo):
    """
    Determina o preço de compra baseado em 3 opções:
    1. Preço manual (preco_inicial fornecido)
    2. Preço histórico (data_aplicacao + yfinance)
    3. Preço atual (yfinance atual)
    """
    # 1. Se preço manual fornecido, usar ele
    if preco_inicial is not None and float(preco_inicial) > 0:
        print(f"DEBUG: Usando preço manual para {ticker}: {preco_inicial}")
        return float(preco_inicial)
    
    # 2. Se data de aplicação fornecida, buscar preço histórico
    if data_aplicacao:
        try:
            from datetime import datetime, timedelta
            base_date = datetime.strptime(str(data_aplicacao)[:10], '%Y-%m-%d').date()
            start = base_date - timedelta(days=14)
            end = base_date + timedelta(days=1)
            
            # Normalizar ticker para yfinance
            t = ticker.strip().upper()
            t_yf = t + '.SA' if ('-' not in t and '.' not in t and len(t) <= 6) else t
            
            hist = yf.Ticker(t_yf).history(start=start.isoformat(), end=end.isoformat())
            if hist is not None and not hist.empty:
                close_val = None
                for idx, row in hist[::-1].iterrows():
                    d = idx.date()
                    if d <= base_date:
                        close_val = float(row.get('Close') or row.get('Adj Close') or 0)
                        break
                if close_val and close_val > 0:
                    print(f"DEBUG: Usando preço histórico para {ticker} em {data_aplicacao}: {close_val}")
                    return close_val
        except Exception as e:
            print(f"DEBUG: Erro ao buscar preço histórico para {ticker}: {e}")
    
    # 3. Buscar preço atual do yfinance
    try:
        info = obter_informacoes_ativo(ticker)
        if info and info.get('preco_atual'):
            preco_atual = float(info['preco_atual'])
            if preco_atual > 0:
                print(f"DEBUG: Usando preço atual para {ticker}: {preco_atual}")
                return preco_atual
    except Exception as e:
        print(f"DEBUG: Erro ao buscar preço atual para {ticker}: {e}")
    
    # 4. Fallback: 0.0 (será tratado como erro)
    print(f"DEBUG: Não foi possível determinar preço para {ticker}, usando 0.0")
    return 0.0

def adicionar_ativo_carteira(ticker, quantidade, tipo=None, preco_inicial=None, nome_personalizado=None, indexador=None, indexador_pct=None, data_aplicacao=None, vencimento=None, isento_ir=None, liquidez_diaria=None):

    try:
        # Determinar preço de compra usando a nova lógica
        preco_compra_definitivo = _determinar_preco_compra(ticker, preco_inicial, data_aplicacao, tipo)
        
        # Se não conseguiu determinar preço, retornar erro
        if preco_compra_definitivo <= 0:
            return {"success": False, "message": f"Não foi possível determinar o preço de compra para {ticker}. Verifique se o ticker existe ou forneça um preço manual."}
        
        info = obter_informacoes_ativo(ticker)
        if not info:
            # Fallback: criar ativo manual
            info = {
                "ticker": (ticker or "").upper(),
                "nome_completo": nome_personalizado or (ticker or "Personalizado").upper(),
                "preco_atual": preco_compra_definitivo,  # Usar preço de compra como atual inicialmente
                "tipo": tipo or "Personalizado",
                "dy": None,
                "pl": None,
                "pvp": None,
                "roe": None,
            }
            
        if tipo:
            info["tipo"] = tipo

        # Sanitize optional fields for Postgres compatibility
        def _to_float_or_none(v):
            try:
                if v is None:
                    return None
                if isinstance(v, str) and v.strip() == "":
                    return None
                return float(v)
            except Exception:
                return None

        def _to_bool_or_none(v):
            if v is None:
                return None
            if isinstance(v, str) and v.strip() == "":
                return None
            if isinstance(v, bool):
                return v
            if isinstance(v, (int, float)):
                return bool(v)
            s = str(v).strip().lower()
            if s in ("true", "1", "sim", "yes", "y"):
                return True
            if s in ("false", "0", "nao", "não", "no", "n"):
                return False
            return None

        indexador_pct = _to_float_or_none(indexador_pct)
        isento_ir = _to_bool_or_none(isento_ir)
        liquidez_diaria = _to_bool_or_none(liquidez_diaria)
        data_aplicacao = data_aplicacao if (data_aplicacao and str(data_aplicacao).strip() != "") else None
        vencimento = vencimento if (vencimento and str(vencimento).strip() != "") else None

        quantidade_val = float(quantidade or 0)
        valor_total = float(info["preco_atual"] or 0) * quantidade_val
        data_adicao = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}
        # Ensure schema and tables exist in the user schema
        init_carteira_db(usuario)
        _ensure_indexador_schema()
        
        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    # Verificar se o ativo já existe na carteira
                    cursor.execute(
                        'SELECT id, quantidade FROM carteira WHERE ticker = %s',
                        (info["ticker"],)
                    )
                    ativo_existente = cursor.fetchone()

                    # Registrar movimentação usando a função dedicada
                    resultado_movimentacao = registrar_movimentacao(data_adicao, info["ticker"], info["nome_completo"], 
                                     quantidade_val, info["preco_atual"], "compra")
                    if not resultado_movimentacao["success"]:
                        return resultado_movimentacao

                    if ativo_existente:
                        # Ativo já existe - somar quantidades (PM ponderado)
                        id_existente, quantidade_existente = ativo_existente
                        try:
                            quantidade_existente = float(quantidade_existente)
                        except Exception:
                            quantidade_existente = float(quantidade_existente or 0)
                        # Obter preço_medio atual se existir
                        try:
                            cursor.execute('SELECT preco_medio FROM carteira WHERE id = %s', (id_existente,))
                            pm_row = cursor.fetchone()
                            preco_medio_atual = float(pm_row[0]) if pm_row and pm_row[0] is not None else float(info["preco_atual"] or 0)
                        except Exception:
                            preco_medio_atual = float(info["preco_atual"] or 0)
                        nova_quantidade = quantidade_existente + quantidade_val
                        preco_medio_novo = ((preco_medio_atual * quantidade_existente) + (float(info["preco_atual"] or 0) * quantidade_val)) / (nova_quantidade or 1)
                        novo_valor_total = float(info["preco_atual"] or 0) * nova_quantidade
                        cursor.execute(
                            'UPDATE carteira SET quantidade = %s, valor_total = %s, preco_atual = %s, dy = %s, pl = %s, pvp = %s, roe = %s, preco_medio = %s WHERE id = %s',
                            (nova_quantidade, novo_valor_total, info["preco_atual"], info.get("dy"), info.get("pl"), info.get("pvp"), info.get("roe"), preco_medio_novo, id_existente)
                        )
                        mensagem = f"Quantidade do ativo {info['ticker']} atualizada: {quantidade_existente} + {quantidade} = {nova_quantidade}"
                    else:
                        # Ativo não existe - criar novo registro
                        # Adicionar coluna preco_compra se não existir
                        try:
                            cursor.execute('ALTER TABLE carteira ADD COLUMN preco_compra DECIMAL(10,2)')
                        except Exception:
                            pass  # Coluna já existe
                        
                # Usar o preço de compra definitivo (já determinado pela função _determinar_preco_compra)
                preco_compra = preco_compra_definitivo
                
                cursor.execute(
                    'INSERT INTO carteira (ticker, nome_completo, quantidade, preco_atual, preco_compra, valor_total, data_adicao, tipo, dy, pl, pvp, roe, indexador, indexador_pct, data_aplicacao, vencimento, isento_ir, liquidez_diaria) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                    (info["ticker"], info["nome_completo"], quantidade_val, info["preco_atual"], preco_compra, valor_total, data_adicao, info["tipo"], info.get("dy"), info.get("pl"), info.get("pvp"), info.get("roe"), indexador, indexador_pct, data_aplicacao, vencimento, bool(isento_ir) if isento_ir is not None else None, bool(liquidez_diaria) if liquidez_diaria is not None else None) 
                )
                mensagem = f"Ativo {info['ticker']} adicionado com sucesso"
                try:
                    conn.commit()
                except Exception:
                    pass
            finally:
                conn.close()
        else:
            db_path = get_db_path(usuario, "carteira")
            conn = sqlite3.connect(db_path, check_same_thread=False)
            cursor = conn.cursor()
            
            # Verificar se o ativo já existe na carteira
            cursor.execute('SELECT id, quantidade FROM carteira WHERE ticker = ?', (info["ticker"],))
            ativo_existente = cursor.fetchone()
            
            # Registrar movimentação
            resultado_movimentacao = registrar_movimentacao(data_adicao, info["ticker"], info["nome_completo"], 
                                 quantidade_val, info["preco_atual"], "compra", conn)
            if not resultado_movimentacao["success"]:
                conn.close()
                return resultado_movimentacao
            
            if ativo_existente:
                # Ativo já existe - somar quantidades (PM ponderado)
                id_existente, quantidade_existente = ativo_existente
                try:
                    quantidade_existente = float(quantidade_existente)
                except Exception:
                    quantidade_existente = float(quantidade_existente or 0)
                try:
                    cursor.execute('SELECT preco_medio FROM carteira WHERE id = ?', (id_existente,))
                    pm_row = cursor.fetchone()
                    preco_medio_atual = float(pm_row[0]) if pm_row and pm_row[0] is not None else float(info["preco_atual"] or 0)
                except Exception:
                    preco_medio_atual = float(info["preco_atual"] or 0)
                nova_quantidade = quantidade_existente + quantidade_val
                preco_medio_novo = ((preco_medio_atual * quantidade_existente) + (float(info["preco_atual"] or 0) * quantidade_val)) / (nova_quantidade or 1)
                novo_valor_total = float(info["preco_atual"] or 0) * nova_quantidade
                cursor.execute('''
                    UPDATE carteira SET quantidade = ?, valor_total = ?, preco_atual = ?, dy = ?, pl = ?, pvp = ?, roe = ?, preco_medio = ?
                    WHERE id = ?
                ''', (nova_quantidade, novo_valor_total, info["preco_atual"], info.get("dy"), info.get("pl"), info.get("pvp"), info.get("roe"), preco_medio_novo, id_existente))
                mensagem = f"Quantidade do ativo {info['ticker']} atualizada: {quantidade_existente} + {quantidade} = {nova_quantidade}"
            else:
               
                # Adicionar coluna preco_compra se não existir
                try:
                    cursor.execute('ALTER TABLE carteira ADD COLUMN preco_compra REAL')
                except Exception:
                    pass  # Coluna já existe
                
                # Usar o preço de compra definitivo (já determinado pela função _determinar_preco_compra)
                preco_compra = preco_compra_definitivo
                
                cursor.execute('''
                    INSERT INTO carteira (ticker, nome_completo, quantidade, preco_atual, preco_compra, valor_total, 
                                        data_adicao, tipo, dy, pl, pvp, roe, indexador, indexador_pct, data_aplicacao, vencimento, isento_ir, liquidez_diaria)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (info["ticker"], info["nome_completo"], quantidade_val, info["preco_atual"], preco_compra,
                      valor_total, data_adicao, info["tipo"], info.get("dy"), info.get("pl"), 
                      info.get("pvp"), info.get("roe"), indexador, indexador_pct, data_aplicacao, vencimento, (1 if isento_ir else 0) if isento_ir is not None else None, (1 if liquidez_diaria else 0) if liquidez_diaria is not None else None))
                mensagem = f"Ativo {info['ticker']} adicionado com sucesso"
            
            conn.commit()
            conn.close()
        
        # Se o ativo tem indexador, forçar atualização dos preços
        if indexador and indexador_pct:
            print(f"DEBUG: Ativo com indexador adicionado, forçando atualização de preços")
            try:
                atualizar_precos_indicadores_carteira()
            except Exception as e:
                print(f"DEBUG: Erro ao atualizar preços após adicionar ativo: {e}")
        
        return {"success": True, "message": mensagem}
    except Exception as e:
        return {"success": False, "message": f"Erro ao adicionar ativo: {str(e)}"}

def remover_ativo_carteira(id):

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT ticker, nome_completo, quantidade, preco_atual FROM carteira WHERE id = %s', (id,))
                    ativo = cursor.fetchone()
                    if not ativo:
                        return {"success": False, "message": "Ativo não encontrado"}
                    data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    resultado_movimentacao = registrar_movimentacao(data, ativo[0], ativo[1], ativo[2], ativo[3], "venda")
                    if not resultado_movimentacao["success"]:
                        return resultado_movimentacao
                    cursor.execute('DELETE FROM carteira WHERE id = %s', (id,))
                return {"success": True, "message": "Ativo removido com sucesso"}
            finally:
                conn.close()
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('SELECT ticker, nome_completo, quantidade, preco_atual FROM carteira WHERE id = ?', (id,))
        ativo = cursor.fetchone()
        
        if not ativo:
            conn.close()
            return {"success": False, "message": "Ativo não encontrado"}
            

        data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        resultado_movimentacao = registrar_movimentacao(data, ativo[0], ativo[1], ativo[2], ativo[3], "venda", conn)
        
        if not resultado_movimentacao["success"]:
            conn.close()
            return resultado_movimentacao
        

        cursor.execute('DELETE FROM carteira WHERE id = ?', (id,))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Ativo removido com sucesso"}
    except Exception as e:
        return {"success": False, "message": f"Erro ao remover ativo: {str(e)}"}

def atualizar_ativo_carteira(id, quantidade=None, preco_atual=None, preco_compra=None):

  
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT ticker, nome_completo, preco_atual, quantidade, indexador, indexador_pct FROM carteira WHERE id = %s', (id,))
                    ativo = cursor.fetchone()
                    if not ativo:
                        return {"success": False, "message": "Ativo não encontrado"}
                    current_price = float(ativo[2]) if ativo[2] is not None else 0.0
                    current_qty = float(ativo[3]) if ativo[3] is not None else 0.0
                    new_qty = float(quantidade) if quantidade is not None else current_qty
                    

                    valor_total = current_price * new_qty
                    

                    update_fields = ['quantidade = %s', 'valor_total = %s']
                    update_values = [new_qty, valor_total]
                    

                    if preco_compra is not None:
                        update_fields.append('preco_compra = %s')
                        update_values.append(float(preco_compra))
                    
                    update_values.append(id)
        
       
                    cursor.execute(f'UPDATE carteira SET {", ".join(update_fields)} WHERE id = %s', update_values)

      
                    qty_diff = new_qty - current_qty
                    if abs(qty_diff) > 0:
                        tipo_mov = 'compra' if qty_diff > 0 else 'venda'
                        data_mov = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        preco_mov = float(preco_atual) if preco_atual is not None else current_price
                        try:
                            registrar_movimentacao(data_mov, str(ativo[0] or ''), str(ativo[1] or ''), abs(qty_diff), preco_mov, tipo_mov)
                        except Exception as _:
                            pass
                conn.commit()
                return {"success": True, "message": "Ativo atualizado com sucesso"}
            finally:
                conn.close()
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('SELECT ticker, nome_completo, preco_atual, quantidade, indexador, indexador_pct FROM carteira WHERE id = ?', (id,))
        ativo = cursor.fetchone()
        
        if not ativo:
            return {"success": False, "message": "Ativo não encontrado"}
            
        current_price = float(ativo[2]) if ativo[2] is not None else 0.0
        current_qty = float(ativo[3]) if ativo[3] is not None else 0.0
        new_qty = float(quantidade) if quantidade is not None else current_qty
        
      
        valor_total = current_price * new_qty
        
        
        update_fields = ['quantidade = ?', 'valor_total = ?']
        update_values = [new_qty, valor_total]
        
     
        if preco_compra is not None:
            update_fields.append('preco_compra = ?')
            update_values.append(float(preco_compra))
        
        update_values.append(id)
        
  
        cursor.execute(f'''
            UPDATE carteira 
            SET {", ".join(update_fields)}
            WHERE id = ?
        ''', update_values)

        
        qty_diff = new_qty - current_qty
        if abs(qty_diff) > 0:
            tipo_mov = 'compra' if qty_diff > 0 else 'venda'
            data_mov = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            preco_mov = float(preco_atual) if preco_atual is not None else current_price
            try:
                registrar_movimentacao(data_mov, str(ativo[0] or ''), str(ativo[1] or ''), abs(qty_diff), preco_mov, tipo_mov, conn)
            except Exception as _:
                pass
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Ativo atualizado com sucesso"}
    except Exception as e:
        return {"success": False, "message": f"Erro ao atualizar ativo: {str(e)}"}

def _ensure_goals_schema():
    usuario = get_usuario_atual()
    if not usuario:
        return
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('''
                    CREATE TABLE IF NOT EXISTS goals (
                        id SERIAL PRIMARY KEY,
                        tipo TEXT NOT NULL,         -- 'renda' | 'patrimonio'
                        alvo NUMERIC NOT NULL,      -- valor alvo (renda mensal ou patrimonio)
                        horizonte_meses INTEGER,    -- opcional
                        aporte_mensal NUMERIC,      -- opcional
                        premissas JSONB,            -- objeto com parametros (dy_por_classe etc.)
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                ''')
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            cur.execute('''
                CREATE TABLE IF NOT EXISTS goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo TEXT NOT NULL,
                    alvo REAL NOT NULL,
                    horizonte_meses INTEGER,
                    aporte_mensal REAL,
                    premissas TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            conn.commit()
        finally:
            conn.close()

def get_goals():
    usuario = get_usuario_atual()
    if not usuario:
        return []
    _ensure_goals_schema()
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('SELECT id, tipo, alvo, horizonte_meses, aporte_mensal, premissas, created_at, updated_at FROM goals ORDER BY id DESC LIMIT 1')
                row = c.fetchone()
                if not row:
                    return None
                return {
                    'id': row[0], 'tipo': row[1], 'alvo': float(row[2]), 'horizonte_meses': row[3],
                    'aporte_mensal': (float(row[4]) if row[4] is not None else None), 'premissas': row[5],
                    'created_at': row[6], 'updated_at': row[7]
                }
        finally:
            conn.close()
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        cur = conn.cursor()
        cur.execute('SELECT id, tipo, alvo, horizonte_meses, aporte_mensal, premissas, created_at, updated_at FROM goals ORDER BY id DESC LIMIT 1')
        row = cur.fetchone()
        if not row:
            return None
        import json
        premissas = None
        try:
            premissas = json.loads(row[5]) if row[5] else None
        except Exception:
            premissas = None
        return {
            'id': row[0], 'tipo': row[1], 'alvo': float(row[2]), 'horizonte_meses': row[3],
            'aporte_mensal': (float(row[4]) if row[4] is not None else None), 'premissas': premissas,
            'created_at': row[6], 'updated_at': row[7]
        }
    finally:
        conn.close()

def save_goals(payload: dict):
    usuario = get_usuario_atual()
    if not usuario:
        return { 'success': False, 'message': 'Não autenticado' }
    _ensure_goals_schema()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    tipo = (payload.get('tipo') or 'renda')
    alvo = float(payload.get('alvo') or 0)
    horizonte_meses = payload.get('horizonte_meses')
    aporte_mensal = payload.get('aporte_mensal')
    premissas = payload.get('premissas')
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('DELETE FROM goals')
                c.execute('INSERT INTO goals (tipo, alvo, horizonte_meses, aporte_mensal, premissas, created_at, updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s)', (tipo, alvo, horizonte_meses, aporte_mensal, json.dumps(premissas) if premissas is not None else None, now, now))
                conn.commit()
                return { 'success': True }
        finally:
            conn.close()
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        cur = conn.cursor()
        cur.execute('DELETE FROM goals')
        cur.execute('INSERT INTO goals (tipo, alvo, horizonte_meses, aporte_mensal, premissas, created_at, updated_at) VALUES (?,?,?,?,?,?,?)', (tipo, alvo, horizonte_meses, aporte_mensal, json.dumps(premissas) if premissas is not None else None, now, now))
        conn.commit()
        return { 'success': True }
    finally:
        conn.close()

def compute_goals_projection(goal: dict):
   
    itens = obter_carteira() or []
    total_atual = float(sum((it.get('valor_total') or 0.0) for it in itens)) if itens else 0.0
    tipo = (goal.get('tipo') or 'renda')
    alvo = float(goal.get('alvo') or 0)
    horizonte_meses = int(goal.get('horizonte_meses') or 0) if goal.get('horizonte_meses') is not None else 0
    aporte_mensal = float(goal.get('aporte_mensal') or 0)
    premissas = goal.get('premissas') or {}

   
    dy_por_classe = (premissas.get('dy_por_classe') or {}) if isinstance(premissas, dict) else {}
    
  
    taxa_crescimento = goal.get('taxa_crescimento')
    if taxa_crescimento is not None:
        retorno_anual = float(taxa_crescimento)
    else:
        retorno_anual = float(premissas.get('retorno_anual', 0.10)) if isinstance(premissas, dict) else 0.10
    
    taxa_mensal = (1 + retorno_anual) ** (1/12) - 1

   
    if tipo == 'renda':
        
        dy_mensal = float(premissas.get('dy_mensal_global', retorno_anual/12)) if isinstance(premissas, dict) else (retorno_anual/12)
        capital_alvo = alvo / max(1e-9, dy_mensal)
    else:
        capital_alvo = alvo

  
    aporte_sugerido = aporte_mensal
    if aporte_sugerido <= 0 and horizonte_meses > 0:
       
        from math import isfinite
        fv_residual = max(0.0, capital_alvo - (total_atual * ((1 + taxa_mensal) ** horizonte_meses)))
        if taxa_mensal > 0 and horizonte_meses > 0 and isfinite(fv_residual):
            aporte_sugerido = fv_residual * taxa_mensal / (((1 + taxa_mensal) ** horizonte_meses) - 1)
        else:
            aporte_sugerido = fv_residual / max(1, horizonte_meses)


    n = horizonte_meses if horizonte_meses and horizonte_meses > 0 else 120
    saldo = total_atual
    roadmap = []
    for m in range(1, n + 1):
        saldo = saldo * (1 + taxa_mensal) + (aporte_sugerido or 0)
        roadmap.append({ 'mes': m, 'saldo': round(saldo, 2), 'aporte': round(aporte_sugerido or 0, 2) })

    return {
        'capital_alvo': round(capital_alvo, 2),
        'aporte_sugerido': round(aporte_sugerido or 0, 2),
        'horizonte_meses': n,
        'saldo_inicial': round(total_atual, 2),
        'taxa_mensal': taxa_mensal,
        'taxa_anual_usada': retorno_anual,
        'taxa_manual': taxa_crescimento is not None,
        'roadmap': roadmap,
    }
def migrar_preco_compra_existente():
    """
    MIGRAÇÃO ÚNICA: Executa apenas uma vez para corrigir ativos existentes
    NÃO deve ser chamada automaticamente - apenas manualmente quando necessário
    """
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        print(f"DEBUG: Iniciando migração única de preco_compra para usuário {usuario}")
        migrados = 0
        
        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    # Buscar ativos sem preco_compra
                    cursor.execute('SELECT id, ticker FROM carteira WHERE preco_compra IS NULL')
                    ativos_sem_preco = cursor.fetchall()
                    
                    for ativo_id, ticker in ativos_sem_preco:
                        # Buscar primeira movimentação de compra
                        cursor.execute('''
                            SELECT preco FROM movimentacoes 
                            WHERE ticker = %s AND tipo = 'compra' 
                            ORDER BY data ASC LIMIT 1
                        ''', (ticker,))
                        primeira_compra = cursor.fetchone()
                        
                        if primeira_compra:
                            preco_compra = primeira_compra[0]
                            cursor.execute('''
                                UPDATE carteira SET preco_compra = %s WHERE id = %s
                            ''', (preco_compra, ativo_id))
                            print(f"DEBUG: Migrado preco_compra para {ticker}: {preco_compra}")
                            migrados += 1
                    
                    conn.commit()
            finally:
                conn.close()
        else:
            db_path = get_db_path(usuario, "carteira")
            conn = sqlite3.connect(db_path, check_same_thread=False)
            try:
                cursor = conn.cursor()
                # Buscar ativos sem preco_compra
                cursor.execute('SELECT id, ticker FROM carteira WHERE preco_compra IS NULL')
                ativos_sem_preco = cursor.fetchall()
                
                for ativo_id, ticker in ativos_sem_preco:
                    # Buscar primeira movimentação de compra
                    cursor.execute('''
                        SELECT preco FROM movimentacoes 
                        WHERE ticker = ? AND tipo = 'compra' 
                        ORDER BY data ASC LIMIT 1
                    ''', (ticker,))
                    primeira_compra = cursor.fetchone()
                    
                    if primeira_compra:
                        preco_compra = primeira_compra[0]
                        cursor.execute('''
                            UPDATE carteira SET preco_compra = ? WHERE id = ?
                        ''', (preco_compra, ativo_id))
                        print(f"DEBUG: Migrado preco_compra para {ticker}: {preco_compra}")
                        migrados += 1
                
                conn.commit()
            finally:
                conn.close()
        
        print(f"DEBUG: Migração concluída. {migrados} ativos migrados.")
        return {"success": True, "migrados": migrados}
    except Exception as e:
        print(f"Erro na migração de preco_compra: {e}")
        return {"success": False, "message": str(e)}

def obter_carteira():

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        
        try:
            _ensure_indexador_schema()
            # REMOVIDO: migrar_preco_compra_existente() - causava reescrita de preços
        except Exception:
            pass

        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        SELECT id, ticker, nome_completo, quantidade, preco_atual, preco_compra, valor_total,
                               data_adicao, tipo, dy, pl, pvp, roe, indexador, indexador_pct
                        FROM carteira
                        ORDER BY valor_total DESC
                    ''')
                    rows = cursor.fetchall()
            finally:
                conn.close()
            ativos = []
            for row in rows:
                preco_compra = float(row[5]) if row[5] is not None else None
                ativos.append({
                    "id": row[0],
                    "ticker": row[1],
                    "nome_completo": row[2],
                    "quantidade": float(row[3]) if row[3] is not None else 0,
                    "preco_atual": float(row[4]) if row[4] is not None else 0,
                    "preco_compra": preco_compra,
                    "valor_total": float(row[6]) if row[6] is not None else 0,
                    "data_adicao": row[7],
                    "tipo": row[8],
                    "dy": float(row[9]) if row[9] is not None else None,
                    "pl": float(row[10]) if row[10] is not None else None,
                    "pvp": float(row[11]) if row[11] is not None else None,
                    "roe": float(row[12]) if row[12] is not None else None,
                    "indexador": row[13],
                    "indexador_pct": float(row[14]) if (len(row) > 14 and row[14] is not None) else None,
                })
            return ativos
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, ticker, nome_completo, quantidade, preco_atual, preco_compra, valor_total,
                   data_adicao, tipo, dy, pl, pvp, roe, indexador, indexador_pct
            FROM carteira
            ORDER BY valor_total DESC
        ''')
        
        ativos = []
        for row in cursor.fetchall():
            row_len = len(row)
            preco_compra = row[5] if row_len > 5 else None
            ativos.append({
                "id": row[0],
                "ticker": row[1],
                "nome_completo": row[2],
                "quantidade": row[3],
                "preco_atual": row[4],
                "preco_compra": preco_compra,
                "valor_total": row[6] if row_len > 6 else row[5],
                "data_adicao": row[7] if row_len > 7 else row[6],
                "tipo": row[8] if row_len > 8 else row[7],
                "dy": row[9] if row_len > 9 else row[8],
                "pl": row[10] if row_len > 10 else row[9],
                "pvp": row[11] if row_len > 11 else row[10],
                "roe": row[12] if row_len > 12 else row[11],
                "indexador": row[13] if row_len > 13 else row[12],
                "indexador_pct": row[14] if row_len > 14 else row[13],
            })
        
        conn.close()
        return ativos
    except Exception as e:
        print(f"Erro ao obter carteira: {e}")
        return []

# ==================== REBALANCEAMENTO ====================

def save_rebalance_config(periodo: str, targets: dict, last_rebalance_date: str | None = None):
    import json as _json
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}
    _ensure_rebalance_schema()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    targets_json = _json.dumps(targets or {})
    # start_date: se não existe, define como agora; se existe, mantém
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('SELECT id, start_date FROM rebalance_config LIMIT 1')
                row = c.fetchone()
                if row:
                    start = row[1] or now
                    c.execute('UPDATE rebalance_config SET periodo=%s, targets_json=%s, last_rebalance_date=%s, updated_at=%s WHERE id=%s',
                              (periodo, targets_json, last_rebalance_date, now, row[0]))
                else:
                    c.execute('INSERT INTO rebalance_config (periodo, targets_json, start_date, last_rebalance_date, updated_at) VALUES (%s, %s, %s, %s, %s)',
                              (periodo, targets_json, now, last_rebalance_date, now))
        finally:
            conn.close()
        return {"success": True}
    # sqlite
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        c = conn.cursor()
        c.execute('SELECT id, start_date FROM rebalance_config LIMIT 1')
        row = c.fetchone()
        if row:
            start = row[1] or now
            c.execute('UPDATE rebalance_config SET periodo=?, targets_json=?, last_rebalance_date=?, updated_at=? WHERE id=?',
                      (periodo, targets_json, last_rebalance_date, now, row[0]))
        else:
            c.execute('INSERT INTO rebalance_config (periodo, targets_json, start_date, last_rebalance_date, updated_at) VALUES (?, ?, ?, ?, ?)',
                      (periodo, targets_json, now, last_rebalance_date, now))
        conn.commit()
    finally:
        conn.close()
    return {"success": True}

def get_rebalance_config():
    import json as _json
    usuario = get_usuario_atual()
    if not usuario:
        return None
    _ensure_rebalance_schema()
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('SELECT periodo, targets_json, start_date, last_rebalance_date, updated_at FROM rebalance_config LIMIT 1')
                row = c.fetchone()
                if not row:
                    return None
                periodo, targets_json, start_date, last_rebalance_date, updated_at = row
                return {
                    'periodo': periodo,
                    'targets': _json.loads(targets_json or '{}'),
                    'start_date': start_date,
                    'last_rebalance_date': last_rebalance_date,
                    'updated_at': updated_at,
                }
        finally:
            conn.close()
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        c = conn.cursor()
        c.execute('SELECT periodo, targets_json, start_date, last_rebalance_date, updated_at FROM rebalance_config LIMIT 1')
        row = c.fetchone()
        if not row:
            return None
        periodo, targets_json, start_date, last_rebalance_date, updated_at = row
        return {
            'periodo': periodo,
            'targets': json.loads(targets_json or '{}'),
            'start_date': start_date,
            'last_rebalance_date': last_rebalance_date,
            'updated_at': updated_at,
        }
    finally:
        conn.close()

def compute_rebalance_status():
    from datetime import datetime as _dt
    usuario = get_usuario_atual()
    if not usuario:
        return {"error": "Não autenticado"}
    _ensure_rebalance_schema()
    cfg = get_rebalance_config()
    carteira = obter_carteira() or []
    if not cfg or not carteira:
        return {
            'configured': bool(cfg),
            'can_rebalance': False,
            'since_start_days': None,
            'current_distribution': {},
            'targets': cfg.get('targets') if cfg else {},
            'periodo': cfg.get('periodo') if cfg else None,
            'deviations': {},
            'suggestions': [],
        }
    # distribuição atual por tipo
    total = sum((it.get('valor_total') or 0.0) for it in carteira)
    dist = {}
    for it in carteira:
        tipo = it.get('tipo') or 'Desconhecido'
        dist[tipo] = dist.get(tipo, 0.0) + float(it.get('valor_total') or 0.0)
    dist_pct = {k: (v/total*100.0 if total>0 else 0.0) for k, v in dist.items()}
    # metas
    targets = cfg.get('targets') or {}
    # desvios
    deviations = {}
    for tipo, tgt in targets.items():
        cur = dist_pct.get(tipo, 0.0)
        deviations[tipo] = cur - float(tgt or 0.0)
    # datas e janela
    start_str = cfg.get('start_date')
    last_str = cfg.get('last_rebalance_date')
    try:
        since_days = ( _dt.now() - _dt.strptime(start_str[:19], '%Y-%m-%d %H:%M:%S') ).days if start_str else None
    except Exception:
        since_days = None
    periodo = (cfg.get('periodo') or 'mensal').lower()
    period_days = {'mensal': 30, 'trimestral': 90, 'semestral': 180, 'anual': 365}.get(periodo, 30)
 
    base_date = None
    try:
        if last_str:
            base_date = _dt.strptime(last_str[:19], '%Y-%m-%d %H:%M:%S')
        elif start_str:
            base_date = _dt.strptime(start_str[:19], '%Y-%m-%d %H:%M:%S')
    except Exception:
        base_date = None
    next_due = None
    days_until_next = None
    if base_date:
        next_due = base_date + timedelta(days=period_days)
        days_until_next = (next_due - _dt.now()).days
    can_rebalance = (days_until_next is not None) and (days_until_next <= 0)
    
    suggestions = []
    for tipo, tgt in targets.items():
        cur_val = dist.get(tipo, 0.0)
        tgt_val = (float(tgt or 0.0)/100.0) * total
        diff_val = tgt_val - cur_val
        if abs(diff_val) < 1e-6:
            continue
        action = 'comprar' if diff_val > 0 else 'vender'
        suggestions.append({
            'classe': tipo,
            'acao': action,
            'valor': abs(diff_val)
        })
    return {
        'configured': True,
        'can_rebalance': can_rebalance,
        'since_start_days': since_days,
        'period_days': period_days,
        'periodo': periodo,
        'current_distribution': dist_pct,
        'targets': targets,
        'deviations': deviations,
        'suggestions': suggestions,
        'last_rebalance_date': last_str,
        'next_due_date': next_due.strftime('%Y-%m-%d %H:%M:%S') if next_due else None,
        'days_until_next': days_until_next,
    }

def registrar_rebalance_event(date_str: str | None = None):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}
    _ensure_rebalance_schema()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    event_date = date_str or now
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('INSERT INTO rebalance_history (data, created_at) VALUES (%s, %s)', (event_date, now))
                c.execute('UPDATE rebalance_config SET last_rebalance_date=%s, updated_at=%s', (event_date, now))
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "carteira")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            cur.execute('INSERT INTO rebalance_history (data, created_at) VALUES (?, ?)', (event_date, now))
            cur.execute('UPDATE rebalance_config SET last_rebalance_date=?, updated_at=?', (event_date, now))
            conn.commit()
        finally:
            conn.close()
    return {"success": True}

def get_rebalance_history():
    usuario = get_usuario_atual()
    if not usuario:
        return []
    _ensure_rebalance_schema()
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as c:
                c.execute('SELECT data FROM rebalance_history ORDER BY id DESC')
                return [r[0] for r in c.fetchall()]
        finally:
            conn.close()
    db_path = get_db_path(usuario, "carteira")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        cur = conn.cursor()
        cur.execute('SELECT data FROM rebalance_history ORDER BY id DESC')
        return [r[0] for r in cur.fetchall()]
    finally:
        conn.close()

def registrar_movimentacao(data, ticker, nome_completo, quantidade, preco, tipo, conn=None):

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        should_close = False
        local_conn = None
        if _is_postgres():
           
            pg_conn = _pg_conn_for_user(usuario)
            try:
                with pg_conn.cursor() as cursor:
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS movimentacoes (
                            id SERIAL PRIMARY KEY,
                            data TEXT NOT NULL,
                            ticker TEXT NOT NULL,
                            nome_completo TEXT,
                            quantidade NUMERIC NOT NULL,
                            preco NUMERIC NOT NULL,
                            tipo TEXT NOT NULL
                        )
                    ''')
                    cursor.execute(
                        'INSERT INTO movimentacoes (data, ticker, nome_completo, quantidade, preco, tipo) VALUES (%s, %s, %s, %s, %s, %s)',
                        (data, ticker, nome_completo, quantidade, preco, tipo)
                    )
            finally:
                pg_conn.close()
        else:
            if conn is None:
                db_path = get_db_path(usuario, "carteira")
                local_conn = sqlite3.connect(db_path, check_same_thread=False)
                should_close = True
            else:
                should_close = False
            cursor = (conn or local_conn).cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS movimentacoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data TEXT NOT NULL,
                    ticker TEXT NOT NULL,
                    nome_completo TEXT,
                    quantidade REAL NOT NULL,
                    preco REAL NOT NULL,
                    tipo TEXT NOT NULL
                )
            ''')
            cursor.execute('''
                INSERT INTO movimentacoes (data, ticker, nome_completo, quantidade, preco, tipo)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (data, ticker, nome_completo, quantidade, preco, tipo))
            if should_close and local_conn:
                local_conn.commit()
                local_conn.close()
        
        return {"success": True, "message": "Movimentação registrada com sucesso"}
    except Exception as e:
        try:
            if should_close and local_conn:
                local_conn.close()
        except Exception:
            pass
        return {"success": False, "message": f"Erro ao registrar movimentação: {str(e)}"}

def obter_movimentacoes(mes=None, ano=None):

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return []

        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    if mes and ano:
                        mes_int = int(mes)
                        ano_int = int(ano)
                        if mes_int == 12:
                            prox_ano, prox_mes = ano_int + 1, 1
                        else:
                            prox_ano, prox_mes = ano_int, mes_int + 1
                        inicio = f"{ano_int}-{mes_int:02d}-01"
                        fim = f"{prox_ano}-{prox_mes:02d}-01"
                        cursor.execute('SELECT * FROM movimentacoes WHERE data >= %s AND data < %s ORDER BY data DESC', (inicio, fim))
                    elif ano:
                        ano_int = int(ano)
                        inicio = f"{ano_int}-01-01"
                        fim = f"{ano_int+1}-01-01"
                        cursor.execute('SELECT * FROM movimentacoes WHERE data >= %s AND data < %s ORDER BY data DESC', (inicio, fim))
                    else:
                        cursor.execute('SELECT * FROM movimentacoes ORDER BY data DESC')
                    rows = cursor.fetchall()
            finally:
                conn.close()
        else:
            db_path = get_db_path(usuario, "carteira")
            conn = sqlite3.connect(db_path, check_same_thread=False)
            cursor = conn.cursor()
            if mes and ano:
                mes_int = int(mes)
                ano_int = int(ano)
                if mes_int == 12:
                    prox_ano, prox_mes = ano_int + 1, 1
                else:
                    prox_ano, prox_mes = ano_int, mes_int + 1
                inicio = f"{ano_int}-{mes_int:02d}-01"
                fim = f"{prox_ano}-{prox_mes:02d}-01"
                cursor.execute('SELECT * FROM movimentacoes WHERE data >= ? AND data < ? ORDER BY data DESC', (inicio, fim))
            elif ano:
                ano_int = int(ano)
                inicio = f"{ano_int}-01-01"
                fim = f"{ano_int+1}-01-01"
                cursor.execute('SELECT * FROM movimentacoes WHERE data >= ? AND data < ? ORDER BY data DESC', (inicio, fim))
            else:
                cursor.execute('SELECT * FROM movimentacoes ORDER BY data DESC')
            rows = cursor.fetchall()
        
        movimentacoes = []
        for row in rows:
            movimentacoes.append({
                "id": row[0],
                "data": row[1],
                "ticker": row[2],
                "nome_completo": row[3],
                "quantidade": row[4],
                "preco": row[5],
                "tipo": row[6]
            })
        
        return movimentacoes
    except Exception as e:
        print(f"Erro ao obter movimentações: {e}")
        return []

def obter_historico_carteira(periodo='mensal'):
    
    try:
        print(f"DEBUG: obter_historico_carteira chamada com período: {periodo}")
        usuario = get_usuario_atual()
        if not usuario:
            print("DEBUG: Usuário não encontrado")
            return []
            
        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT data, ticker, quantidade, preco, tipo 
                        FROM movimentacoes 
                        ORDER BY data ASC
                    """)
                    movimentacoes = cursor.fetchall()
            finally:
                conn.close()
        else:
            db_path = get_db_path(usuario, "carteira")
            conn = sqlite3.connect(db_path, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT data, ticker, quantidade, preco, tipo 
                FROM movimentacoes 
                ORDER BY data ASC
            """)
            movimentacoes = cursor.fetchall()
        
        print(f"DEBUG: Encontradas {len(movimentacoes)} movimentações para usuário {usuario}")
        
        if not movimentacoes:
            print("DEBUG: Nenhuma movimentação encontrada")
            return []
        

        print("DEBUG: Primeiras 3 movimentações:")
        for i, mov in enumerate(movimentacoes[:3]):
            print(f"  {i+1}. Data: '{mov[0]}', Ticker: {mov[1]}, Qtd: {mov[2]}, Preço: {mov[3]}")
        
      
        historico = []
        posicoes = {}  
        
      
        for mov in movimentacoes:
            data_mov = mov[0]
            ticker = mov[1]
            quantidade = float(mov[2])
            preco = float(mov[3])
            
    
 
            

            if ticker in posicoes:
                posicoes[ticker] += quantidade
            else:
                posicoes[ticker] = quantidade
            
            
            patrimonio_total = 0
            for ticker_pos, qtd in posicoes.items():
                if qtd > 0:
                    
                    patrimonio_total += qtd * preco
            
          
            item_historico = {
                'data': data_mov[:10],  
                'valor_total': patrimonio_total
            }
            historico.append(item_historico)
            print(f"DEBUG: Adicionado ao histórico: {item_historico}")
        
        print(f"DEBUG: Total de {len(historico)} itens no histórico")
        print("DEBUG: Primeiros 3 itens do histórico:")
        for i, item in enumerate(historico[:3]):
            print(f"  {i+1}. {item}")
        
        return historico
        
    except Exception as e:
        print(f"Erro ao obter histórico da carteira: {e}")
        import traceback
        traceback.print_exc()
        return []


def _month_end(dt: datetime) -> datetime:
    return ((dt.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1))


def _gerar_pontos_tempo(gran: str, data_inicio: datetime, data_fim: datetime) -> list:

    pontos = []
    if gran == 'semanal':
        # Normalizar para a segunda-feira da semana de data_inicio
        start_day = datetime(data_inicio.year, data_inicio.month, data_inicio.day)
        start_monday = start_day - timedelta(days=start_day.weekday())
        atual = datetime(start_monday.year, start_monday.month, start_monday.day)
        while atual <= data_fim:
            pontos.append(datetime(atual.year, atual.month, atual.day))
            atual = atual + timedelta(days=7)
        return pontos
    # Default: pontos mensais
    atual = datetime(data_inicio.year, data_inicio.month, 1)
    fim = datetime(data_fim.year, data_fim.month, 1)
    while atual <= fim:
        pontos.append(_month_end(atual))
        atual = (atual.replace(day=28) + timedelta(days=4)).replace(day=1)
    return pontos


def obter_historico_carteira_comparado(agregacao: str = 'mensal'):
    
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"datas": [], "carteira": [], "ibov": [], "ivvb11": [], "ifix": [], "ipca": []}

        if _is_postgres():
            conn = _pg_conn_for_user(usuario)
            try:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT data, ticker, quantidade, preco, tipo 
                        FROM movimentacoes 
                        ORDER BY data ASC
                    """)
                    movimentos = cursor.fetchall()
            finally:
                conn.close()
        else:
            db_path = get_db_path(usuario, "carteira")
            conn = sqlite3.connect(db_path, check_same_thread=False)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT data, ticker, quantidade, preco, tipo 
                FROM movimentacoes 
                ORDER BY data ASC
            """)
            movimentos = cursor.fetchall()

        if not movimentos:
            return {"datas": [], "carteira": [], "ibov": [], "ivvb11": [], "ifix": [], "ipca": []}


        datas_mov = [datetime.strptime(m[0][:10], '%Y-%m-%d') for m in movimentos]
        data_ini = min(datas_mov)
        data_fim = datetime.now()

        # granularidade pedida via agregacao
        gran = agregacao if agregacao in ('mensal','trimestral','semestral','anual','maximo','semanal') else 'mensal'
        pontos = _gerar_pontos_tempo(gran, data_ini, data_fim)


        tickers = sorted(list({m[1] for m in movimentos}))
        ticker_to_hist = {}
        for tk in tickers:
            try:
                yf_ticker = yf.Ticker(tk)
                hist = yf_ticker.history(start=data_ini - timedelta(days=5), end=data_fim + timedelta(days=5))
               
                try:
                    if hasattr(hist.index, 'tz') and hist.index.tz is not None:
                        hist.index = hist.index.tz_localize(None)
                except Exception:
                    pass
                ticker_to_hist[tk] = hist
            except Exception:
                ticker_to_hist[tk] = None


        def price_on_or_before(hist_df, dt):
            if hist_df is None or hist_df.empty:
                return None
            
            try:
                sub = hist_df[hist_df.index <= dt]
                if sub.empty:
                    return None
                return float(sub['Close'].iloc[-1])
            except Exception:
                return None


        mov_by_ticker = {}
        for data_str, tk, qtd, preco, tipo in movimentos:
            dt = datetime.strptime(data_str[:10], '%Y-%m-%d')
            mov_by_ticker.setdefault(tk, []).append((dt, float(qtd if qtd is not None else 0.0), str(tipo)))

        def quantity_until(tk, dt):
            q = 0.0
            for mdt, mq, mtype in mov_by_ticker.get(tk, []):
                if mdt <= dt:
                    if mtype == 'venda':
                        q -= mq
                    else:
                        q += mq
            return q

 
        carteira_vals = []
        datas_labels = []
        for pt in pontos:
            total = 0.0
            for tk in tickers:
                q = quantity_until(tk, pt)
                if q <= 0:
                    continue
                price = price_on_or_before(ticker_to_hist.get(tk), pt)
                if price is None:
                    continue
                total += q * price
            carteira_vals.append(total)
            if gran == 'semanal':
                datas_labels.append(pt.strftime('%Y-%m-%d'))
            else:
                datas_labels.append(pt.strftime('%Y-%m'))

 
        indices_map = {
            'ibov': ['^BVSP', 'BOVA11.SA'],
            'ivvb11': ['IVVB11.SA'],
            'ifix': ['^IFIX', 'XFIX11.SA']
        }
        indices_vals = {k: [] for k in indices_map.keys()}
        for key, candidates in indices_map.items():
            hist = None
            for cand in candidates:
                try:
                    h = yf.Ticker(cand).history(start=data_ini - timedelta(days=5), end=data_fim + timedelta(days=5))
                    if h is not None and not h.empty:
                        try:
                            if hasattr(h.index, 'tz') and h.index.tz is not None:
                                h.index = h.index.tz_localize(None)
                        except Exception:
                            pass
                        hist = h
                        break
                except Exception:
                    continue
            for pt in pontos:
                price = price_on_or_before(hist, pt) if hist is not None else None
                indices_vals[key].append(float(price) if price is not None else None)


        ipca_series = []
        try:
            import requests
            url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json'
            resp = requests.get(url, timeout=10)
            if resp.ok:
                dados = resp.json()

                ipca_map = {}
                for item in dados:
                    data_br = item['data']  
                    dia, mes, ano = data_br.split('/')
                    chave = f"{ano}-{mes}"
                    ipca_map[chave] = float(item['valor'])

                base = 100.0
                for lab in datas_labels:
                    var = ipca_map.get(lab)
                    if var is not None:
                        base *= (1.0 + var/100.0)
                    ipca_series.append(base)
        except Exception:
            ipca_series = [None for _ in datas_labels]

        # CDI acumulado (base 100) por mês usando série diária (SGS 12)
        cdi_series = []
        try:
            import requests
            start_date = data_ini.strftime('%d/%m/%Y')
            end_date = data_fim.strftime('%d/%m/%Y')
            url_cdi = (
                f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json"
                f"&dataInicial={start_date}&dataFinal={end_date}"
            )
            r = requests.get(url_cdi, timeout=10)
            if r.ok:
                arr = r.json() or []
                # Ordenar por data
                def _parse_br_date(d):
                    try:
                        dd, mm, yy = d.split('/')
                        return datetime(int(yy), int(mm), int(dd))
                    except Exception:
                        return None
                arr_sorted = sorted(
                    [( _parse_br_date(it.get('data')), it.get('valor') ) for it in arr if it.get('data') and it.get('valor')],
                    key=lambda x: (x[0] or datetime.min)
                )
                base = 100.0
                last_by_month = {}
                for dt, valor in arr_sorted:
                    if dt is None:
                        continue
                    try:
                        taxa_aa = float(str(valor).replace(',', '.'))
                    except Exception:
                        continue
                    # Fator diário aproximado com base 252
                    try:
                        daily_factor = (1.0 + taxa_aa/100.0) ** (1.0/252.0)
                    except Exception:
                        daily_factor = 1.0
                    base *= daily_factor
                    lab = f"{dt.year}-{str(dt.month).zfill(2)}"
                    last_by_month[lab] = base
                # Montar série mensal alinhada a datas_labels, com carry-forward
                for i, lab in enumerate(datas_labels):
                    if lab in last_by_month:
                        cdi_series.append(last_by_month[lab])
                    else:
                        cdi_series.append(cdi_series[-1] if cdi_series else None)
            else:
                cdi_series = [None for _ in datas_labels]
        except Exception:
            cdi_series = [None for _ in datas_labels]


        def rebase(series):
            vals = [v for v in series if v is not None and v > 0]
            if not vals:
                return [None for _ in series]
            base = vals[0]
            return [ (v / base * 100.0) if (v is not None and v > 0) else None for v in series ]


        def reduce_by_granularity(labels, series_dict, gran):
            # semanal não reduz; mensal/maximo não reduzem
            if gran in ('mensal', 'maximo', 'semanal'):
                return labels, series_dict
            keep_months = {
                'trimestral': {3, 6, 9, 12},
                'semestral': {6, 12},
                'anual': {12}
            }.get(gran, None)
            if keep_months is None:
                return labels, series_dict
            idxs = []
            for i, lab in enumerate(labels):
                try:
                    if '-' in lab and len(lab) == 7:  # YYYY-MM
                        _, m = lab.split('-')
                        m_int = int(m)
                    else:
                        # weekly labels YYYY-MM-DD -> usar mês
                        parts = lab.split('-')
                        m_int = int(parts[1]) if len(parts) >= 2 else 12
                except Exception:
                    m_int = 12
                if m_int in keep_months or i == len(labels) - 1:
                    idxs.append(i)
            new_labels = [labels[i] for i in idxs]
            new_series = {k: [v[i] for i in idxs] for k, v in series_dict.items()}
            return new_labels, new_series

        series_dict = {
            'carteira': carteira_vals,
            'ibov': indices_vals['ibov'],
            'ivvb11': indices_vals['ivvb11'],
            'ifix': indices_vals['ifix'],
            'ipca': ipca_series if ipca_series else [None for _ in datas_labels],
            'cdi': cdi_series if cdi_series else [None for _ in datas_labels]
        }
        datas_labels, series_dict = reduce_by_granularity(datas_labels, series_dict, gran)


        carteira_rebased = rebase(series_dict['carteira'])
        ibov_rebased = rebase(series_dict['ibov'])
        ivvb_rebased = rebase(series_dict['ivvb11'])
        ifix_rebased = rebase(series_dict['ifix'])
        ipca_rebased = rebase(series_dict['ipca']) if series_dict['ipca'] else [None for _ in datas_labels]
        cdi_rebased = rebase(series_dict['cdi']) if series_dict['cdi'] else [None for _ in datas_labels]

        return {
            "datas": datas_labels,
            "carteira": carteira_rebased,
            "ibov": ibov_rebased,
            "ivvb11": ivvb_rebased,
            "ifix": ifix_rebased,
            "ipca": ipca_rebased,
            "cdi": cdi_rebased,
            "carteira_valor": series_dict['carteira'],
        }
    except Exception as e:
        print(f"Erro em obter_historico_carteira_comparado: {e}")
        return {"datas": [], "carteira": [], "ibov": [], "ivvb11": [], "ifix": [], "ipca": [], "carteira_valor": []}


# ==================== FUNÇÕES DE CONTROLE FINANCEIRO ====================

def init_controle_db(usuario=None):

    if not usuario:
        usuario = get_usuario_atual()
        if not usuario:
            raise ValueError("Usuário não especificado")
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS receitas (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL,
                        valor NUMERIC NOT NULL,
                        data TEXT NOT NULL,
                        categoria TEXT,
                        tipo TEXT,
                        recorrencia TEXT,
                        parcelas_total INTEGER,
                        parcela_atual INTEGER,
                        grupo_parcela TEXT,
                        observacao TEXT
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS cartoes (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL,
                        valor NUMERIC NOT NULL,
                        pago TEXT NOT NULL,
                        data TEXT NOT NULL,
                        categoria TEXT,
                        tipo TEXT,
                        recorrencia TEXT,
                        parcelas_total INTEGER,
                        parcela_atual INTEGER,
                        grupo_parcela TEXT,
                        observacao TEXT
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS cartoes_cadastrados (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL,
                        bandeira TEXT NOT NULL,
                        limite NUMERIC NOT NULL,
                        vencimento INTEGER NOT NULL,
                        cor TEXT NOT NULL,
                        ativo BOOLEAN DEFAULT TRUE,
                        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        pago BOOLEAN DEFAULT FALSE,
                        mes_pagamento INTEGER,
                        ano_pagamento INTEGER,
                        data_pagamento TIMESTAMP
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS compras_cartao (
                        id SERIAL PRIMARY KEY,
                        cartao_id INTEGER NOT NULL,
                        nome TEXT NOT NULL,
                        valor NUMERIC NOT NULL,
                        data TEXT NOT NULL,
                        categoria TEXT,
                        observacao TEXT,
                        FOREIGN KEY (cartao_id) REFERENCES cartoes_cadastrados(id) ON DELETE CASCADE
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS outros_gastos (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL,
                        valor NUMERIC NOT NULL,
                        data TEXT NOT NULL,
                        categoria TEXT,
                        tipo TEXT,
                        recorrencia TEXT,
                        parcelas_total INTEGER,
                        parcela_atual INTEGER,
                        grupo_parcela TEXT,
                        observacao TEXT
                    )
                ''')
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_data ON cartoes(data)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_outros_gastos_data ON outros_gastos(data)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_pago ON cartoes(pago)")
                # Adicionar colunas de pagamento se não existirem
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN pago BOOLEAN DEFAULT FALSE")
                except Exception:
                    pass  # Coluna já existe
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN mes_pagamento INTEGER")
                except Exception:
                    pass  # Coluna já existe
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN ano_pagamento INTEGER")
                except Exception:
                    pass  # Coluna já existe
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN data_pagamento TIMESTAMP")
                except Exception:
                    pass  # Coluna já existe
                
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_cadastrados_ativo ON cartoes_cadastrados(ativo)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_cadastrados_pago ON cartoes_cadastrados(pago)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_cartao_id ON compras_cartao(cartao_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_data ON compras_cartao(data)")
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS receitas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            data TEXT NOT NULL,
            categoria TEXT,
            tipo TEXT,
            recorrencia TEXT,
            parcelas_total INTEGER,
            parcela_atual INTEGER,
            grupo_parcela TEXT,
            observacao TEXT
        )
    ''')
    

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cartoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            pago TEXT NOT NULL,
            data TEXT NOT NULL,
            categoria TEXT,
            tipo TEXT,
            recorrencia TEXT,
            parcelas_total INTEGER,
            parcela_atual INTEGER,
            grupo_parcela TEXT,
            observacao TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cartoes_cadastrados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            bandeira TEXT NOT NULL,
            limite REAL NOT NULL,
            vencimento INTEGER NOT NULL,
            cor TEXT NOT NULL,
            ativo BOOLEAN DEFAULT 1,
            data_criacao TEXT DEFAULT CURRENT_TIMESTAMP,
            pago BOOLEAN DEFAULT 0,
            mes_pagamento INTEGER,
            ano_pagamento INTEGER,
            data_pagamento TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS compras_cartao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cartao_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            data TEXT NOT NULL,
            categoria TEXT,
            observacao TEXT,
            FOREIGN KEY (cartao_id) REFERENCES cartoes_cadastrados(id) ON DELETE CASCADE
        )
    ''')
    

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS outros_gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            data TEXT NOT NULL,
            categoria TEXT,
            tipo TEXT,
            recorrencia TEXT,
            parcelas_total INTEGER,
            parcela_atual INTEGER,
            grupo_parcela TEXT,
            observacao TEXT
        )
    ''')

    try:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA temp_store=MEMORY;")
    except Exception:
        pass
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_data ON cartoes(data)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_outros_gastos_data ON outros_gastos(data)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_pago ON cartoes(pago)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_cadastrados_ativo ON cartoes_cadastrados(ativo)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_cartao_id ON compras_cartao(cartao_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_data ON compras_cartao(data)")
    
    conn.commit()
    conn.close()

def _upgrade_controle_schema(usuario=None):
    if not usuario:
        usuario = get_usuario_atual()
        if not usuario:
            return
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                tables = ['receitas','cartoes','outros_gastos']
                add_columns = [
                    ('categoria','TEXT'),
                    ('tipo','TEXT'),
                    ('recorrencia','TEXT'),
                    ('parcelas_total','INTEGER'),
                    ('parcela_atual','INTEGER'),
                    ('grupo_parcela','TEXT'),
                    ('observacao','TEXT'),
                ]
                for t in tables:
                    for col, coltype in add_columns:
                        try:
                            cursor.execute(f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS {col} {coltype}")
                        except Exception:
                            pass
            conn.commit()
        finally:
            conn.close()
        
        # Criar tabelas de cartões cadastrados se não existirem
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS cartoes_cadastrados (
                        id SERIAL PRIMARY KEY,
                        nome TEXT NOT NULL,
                        bandeira TEXT NOT NULL,
                        limite NUMERIC NOT NULL,
                        vencimento INTEGER NOT NULL,
                        cor TEXT NOT NULL,
                        ativo BOOLEAN DEFAULT TRUE,
                        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        pago BOOLEAN DEFAULT FALSE,
                        mes_pagamento INTEGER,
                        ano_pagamento INTEGER,
                        data_pagamento TIMESTAMP
                    )
                ''')
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS compras_cartao (
                        id SERIAL PRIMARY KEY,
                        cartao_id INTEGER NOT NULL,
                        nome TEXT NOT NULL,
                        valor NUMERIC NOT NULL,
                        data TEXT NOT NULL,
                        categoria TEXT,
                        observacao TEXT,
                        FOREIGN KEY (cartao_id) REFERENCES cartoes_cadastrados(id) ON DELETE CASCADE
                    )
                ''')
                # Adicionar colunas de pagamento se não existirem
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN pago BOOLEAN DEFAULT FALSE")
                except Exception:
                    pass  # Coluna já existe
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN mes_pagamento INTEGER")
                except Exception:
                    pass  # Coluna já existe
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN ano_pagamento INTEGER")
                except Exception:
                    pass  # Coluna já existe
                try:
                    cursor.execute("ALTER TABLE cartoes_cadastrados ADD COLUMN data_pagamento TIMESTAMP")
                except Exception:
                    pass  # Coluna já existe
                
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_cadastrados_ativo ON cartoes_cadastrados(ativo)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_cadastrados_pago ON cartoes_cadastrados(pago)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_cartao_id ON compras_cartao(cartao_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_data ON compras_cartao(data)")
            conn.commit()
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "controle")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.cursor()
            tables = ['receitas','cartoes','outros_gastos']
            add_columns = [
                ('categoria','TEXT'),
                ('tipo','TEXT'),
                ('recorrencia','TEXT'),
                ('parcelas_total','INTEGER'),
                ('parcela_atual','INTEGER'),
                ('grupo_parcela','TEXT'),
                ('observacao','TEXT'),
            ]
            for t in tables:
                cur.execute(f"PRAGMA table_info({t})")
                existing = {row[1] for row in cur.fetchall()}
                for col, coltype in add_columns:
                    if col not in existing:
                        try:
                            cur.execute(f"ALTER TABLE {t} ADD COLUMN {col} {coltype}")
                        except Exception:
                            pass
            conn.commit()
        finally:
            conn.close()
        
        # Criar tabelas de cartões cadastrados se não existirem
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cartoes_cadastrados (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    bandeira TEXT NOT NULL,
                    limite REAL NOT NULL,
                    vencimento INTEGER NOT NULL,
                    cor TEXT NOT NULL,
                    ativo BOOLEAN DEFAULT 1,
                    data_criacao TEXT DEFAULT CURRENT_TIMESTAMP,
                    pago BOOLEAN DEFAULT 0,
                    mes_pagamento INTEGER,
                    ano_pagamento INTEGER,
                    data_pagamento TEXT
                )
            ''')
            
 
            cursor.execute("PRAGMA table_info(cartoes_cadastrados)")
            existing_columns = {row[1] for row in cursor.fetchall()}
            
            colunas_pagamento = [
                ('pago', 'BOOLEAN DEFAULT 0'),
                ('mes_pagamento', 'INTEGER'),
                ('ano_pagamento', 'INTEGER'),
                ('data_pagamento', 'TEXT')
            ]
            
            for col_name, col_type in colunas_pagamento:
                if col_name not in existing_columns:
                    try:
                        cursor.execute(f"ALTER TABLE cartoes_cadastrados ADD COLUMN {col_name} {col_type}")
                    except Exception:
                        pass  # Coluna já existe ou erro ao adicionar
            
            conn.commit()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS compras_cartao (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cartao_id INTEGER NOT NULL,
                    nome TEXT NOT NULL,
                    valor REAL NOT NULL,
                    data TEXT NOT NULL,
                    categoria TEXT,
                    observacao TEXT,
                    FOREIGN KEY (cartao_id) REFERENCES cartoes_cadastrados(id) ON DELETE CASCADE
                )
            ''')
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cartoes_cadastrados_ativo ON cartoes_cadastrados(ativo)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_cartao_id ON compras_cartao(cartao_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_compras_cartao_data ON compras_cartao(data)")
            conn.commit()
        finally:
            conn.close()

def salvar_receita(nome, valor, data=None, categoria=None, tipo=None, recorrencia=None, parcelas_total=None, parcela_atual=None, grupo_parcela=None, observacao=None):

    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    data_atual = (data or datetime.now().strftime('%Y-%m-%d'))
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    INSERT INTO receitas 
                        (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (nome, valor, data_atual, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO receitas 
            (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (nome, valor, data_atual, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao))
    conn.commit()
    conn.close()

def atualizar_receita(id_registro, nome=None, valor=None, data=None, categoria=None, tipo=None, recorrencia=None, parcelas_total=None, parcela_atual=None, grupo_parcela=None, observacao=None):

    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE receitas SET 
                        nome = COALESCE(%s, nome),
                        valor = COALESCE(%s, valor),
                        data = COALESCE(%s, data),
                        categoria = COALESCE(%s, categoria),
                        tipo = COALESCE(%s, tipo),
                        recorrencia = COALESCE(%s, recorrencia),
                        parcelas_total = COALESCE(%s, parcelas_total),
                        parcela_atual = COALESCE(%s, parcela_atual),
                        grupo_parcela = COALESCE(%s, grupo_parcela),
                        observacao = COALESCE(%s, observacao)
                    WHERE id = %s
                ''', (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao, id_registro))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE receitas SET 
            nome = COALESCE(?, nome),
            valor = COALESCE(?, valor),
            data = COALESCE(?, data),
            categoria = COALESCE(?, categoria),
            tipo = COALESCE(?, tipo),
            recorrencia = COALESCE(?, recorrencia),
            parcelas_total = COALESCE(?, parcelas_total),
            parcela_atual = COALESCE(?, parcela_atual),
            grupo_parcela = COALESCE(?, grupo_parcela),
            observacao = COALESCE(?, observacao)
        WHERE id = ?
    ''', (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao, id_registro))
    conn.commit()
    conn.close()

def _remover_registro_generico(tabela, id_registro, banco="controle"):
    """Função genérica para remover registros de qualquer tabela"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute(f'DELETE FROM {tabela} WHERE id = %s', (id_registro,))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, banco)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute(f'DELETE FROM {tabela} WHERE id = ?', (id_registro,))
    conn.commit()
    conn.close()

def remover_receita(id_registro):
    """Remover receita - wrapper para compatibilidade"""
    return _remover_registro_generico("receitas", id_registro, "controle")

def carregar_receitas_mes_ano(mes, ano, pessoa=None):
   
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    mes_int = int(mes)
    ano_int = int(ano)
    if mes_int == 12:
        prox_ano, prox_mes = ano_int + 1, 1
    else:
        prox_ano, prox_mes = ano_int, mes_int + 1
    inicio = f"{ano_int}-{mes_int:02d}-01"
    fim = f"{prox_ano}-{prox_mes:02d}-01"
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            if pessoa:
                query = '''
                    SELECT * FROM receitas 
                    WHERE data >= %s AND data < %s AND nome = %s
                    ORDER BY data DESC
                '''
                df = pd.read_sql_query(query, conn, params=(inicio, fim, pessoa))
            else:
                query = '''
                    SELECT * FROM receitas 
                    WHERE data >= %s AND data < %s
                    ORDER BY data DESC
                '''
                df = pd.read_sql_query(query, conn, params=(inicio, fim))
            return df
        finally:
            conn.close()
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data)")
        except Exception:
            pass
        if pessoa:
            query = '''
                SELECT * FROM receitas 
                WHERE data >= ? AND data < ? AND nome = ?
                ORDER BY data DESC
            '''
            df = pd.read_sql_query(query, conn, params=(inicio, fim, pessoa))
        else:
            query = '''
                SELECT * FROM receitas 
                WHERE data >= ? AND data < ?
                ORDER BY data DESC
            '''
            df = pd.read_sql_query(query, conn, params=(inicio, fim))
        return df
    finally:
        conn.close()

def adicionar_cartao(nome, valor, pago, data=None, categoria=None, tipo=None, recorrencia=None, parcelas_total=None, parcela_atual=None, grupo_parcela=None, observacao=None):

    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    data_atual = (data or datetime.now().strftime('%Y-%m-%d'))
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    INSERT INTO cartoes 
                        (nome, valor, pago, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (nome, valor, pago, data_atual, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO cartoes 
            (nome, valor, pago, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (nome, valor, pago, data_atual, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao))
    conn.commit()
    conn.close()

def carregar_cartoes_mes_ano(mes, ano):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    mes_int = int(mes)
    ano_int = int(ano)
    if mes_int == 12:
        prox_ano, prox_mes = ano_int + 1, 1
    else:
        prox_ano, prox_mes = ano_int, mes_int + 1
    inicio = f"{ano_int}-{mes_int:02d}-01"
    fim = f"{prox_ano}-{prox_mes:02d}-01"
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            query = '''
                SELECT * FROM cartoes 
                WHERE data >= %s AND data < %s
                ORDER BY data DESC
            '''
            df = pd.read_sql_query(query, conn, params=(inicio, fim))
        finally:
            conn.close()
        return df.to_dict('records')
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        query = '''
            SELECT * FROM cartoes 
            WHERE data >= ? AND data < ?
            ORDER BY data DESC
        '''
        df = pd.read_sql_query(query, conn, params=(inicio, fim))
    finally:
        conn.close()
    return df.to_dict('records')

def atualizar_cartao(id_registro, nome=None, valor=None, pago=None, data=None, categoria=None, tipo=None, recorrencia=None, parcelas_total=None, parcela_atual=None, grupo_parcela=None, observacao=None):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE cartoes SET 
                        nome = COALESCE(%s, nome),
                        valor = COALESCE(%s, valor),
                        pago = COALESCE(%s, pago),
                        data = COALESCE(%s, data),
                        categoria = COALESCE(%s, categoria),
                        tipo = COALESCE(%s, tipo),
                        recorrencia = COALESCE(%s, recorrencia),
                        parcelas_total = COALESCE(%s, parcelas_total),
                        parcela_atual = COALESCE(%s, parcela_atual),
                        grupo_parcela = COALESCE(%s, grupo_parcela),
                        observacao = COALESCE(%s, observacao)
                    WHERE id = %s
                ''', (nome, valor, pago, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao, id_registro))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE cartoes SET 
            nome = COALESCE(?, nome),
            valor = COALESCE(?, valor),
            pago = COALESCE(?, pago),
            data = COALESCE(?, data),
            categoria = COALESCE(?, categoria),
            tipo = COALESCE(?, tipo),
            recorrencia = COALESCE(?, recorrencia),
            parcelas_total = COALESCE(?, parcelas_total),
            parcela_atual = COALESCE(?, parcela_atual),
            grupo_parcela = COALESCE(?, grupo_parcela),
            observacao = COALESCE(?, observacao)
        WHERE id = ?
    ''', (nome, valor, pago, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao, id_registro))
    conn.commit()
    conn.close()

def remover_cartao(id_registro):
    """Remover cartão - wrapper para compatibilidade"""
    return _remover_registro_generico("cartoes", id_registro, "controle")

def adicionar_outro_gasto(nome, valor, data=None, categoria=None, tipo=None, recorrencia=None, parcelas_total=None, parcela_atual=None, grupo_parcela=None, observacao=None):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    data_atual = (data or datetime.now().strftime('%Y-%m-%d'))
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    INSERT INTO outros_gastos 
                        (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (nome, valor, data_atual, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO outros_gastos 
            (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (nome, valor, data_atual, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao))
    conn.commit()
    conn.close()

def carregar_outros_mes_ano(mes, ano):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    mes_int = int(mes)
    ano_int = int(ano)
    if mes_int == 12:
        prox_ano, prox_mes = ano_int + 1, 1
    else:
        prox_ano, prox_mes = ano_int, mes_int + 1
    inicio = f"{ano_int}-{mes_int:02d}-01"
    fim = f"{prox_ano}-{prox_mes:02d}-01"
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            query = '''
                SELECT * FROM outros_gastos 
                WHERE data >= %s AND data < %s
                ORDER BY data DESC
            '''
            df = pd.read_sql_query(query, conn, params=(inicio, fim))
        finally:
            conn.close()
        return df.to_dict('records')
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    try:
        query = '''
            SELECT * FROM outros_gastos 
            WHERE data >= ? AND data < ?
            ORDER BY data DESC
        '''
        df = pd.read_sql_query(query, conn, params=(inicio, fim))
    finally:
        conn.close()
    return df.to_dict('records')

def atualizar_outro_gasto(id_registro, nome=None, valor=None, data=None, categoria=None, tipo=None, recorrencia=None, parcelas_total=None, parcela_atual=None, grupo_parcela=None, observacao=None):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE outros_gastos SET 
                        nome = COALESCE(%s, nome),
                        valor = COALESCE(%s, valor),
                        data = COALESCE(%s, data),
                        categoria = COALESCE(%s, categoria),
                        tipo = COALESCE(%s, tipo),
                        recorrencia = COALESCE(%s, recorrencia),
                        parcelas_total = COALESCE(%s, parcelas_total),
                        parcela_atual = COALESCE(%s, parcela_atual),
                        grupo_parcela = COALESCE(%s, grupo_parcela),
                        observacao = COALESCE(%s, observacao)
                    WHERE id = %s
                ''', (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao, id_registro))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE outros_gastos SET 
            nome = COALESCE(?, nome),
            valor = COALESCE(?, valor),
            data = COALESCE(?, data),
            categoria = COALESCE(?, categoria),
            tipo = COALESCE(?, tipo),
            recorrencia = COALESCE(?, recorrencia),
            parcelas_total = COALESCE(?, parcelas_total),
            parcela_atual = COALESCE(?, parcela_atual),
            grupo_parcela = COALESCE(?, grupo_parcela),
            observacao = COALESCE(?, observacao)
        WHERE id = ?
    ''', (nome, valor, data, categoria, tipo, recorrencia, parcelas_total, parcela_atual, grupo_parcela, observacao, id_registro))
    conn.commit()
    conn.close()

def remover_outro_gasto(id_registro):
    """Remover outro gasto - wrapper para compatibilidade"""
    return _remover_registro_generico("outros_gastos", id_registro, "controle")



# ==================== FUNÇÕES DE MARMITAS ====================

def init_marmitas_db(usuario=None):
 
    if not usuario:
        usuario = get_usuario_atual()
        if not usuario:
            raise ValueError("Usuário não especificado")
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS marmitas (
                        id SERIAL PRIMARY KEY,
                        data TEXT NOT NULL,
                        valor NUMERIC NOT NULL,
                        comprou INTEGER NOT NULL
                    )
                ''')
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_marmitas_data ON marmitas(data)")
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "marmitas")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS marmitas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            valor REAL NOT NULL,
            comprou INTEGER NOT NULL
        )
    ''')
    try:
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA temp_store=MEMORY;")
    except Exception:
        pass
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_marmitas_data ON marmitas(data)")
    conn.commit()
    conn.close()

def consultar_marmitas(mes=None, ano=None):
    """Consultar marmitas com filtros opcionais"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                if mes and ano:
                    mes_int = int(mes)
                    ano_int = int(ano)
                    if mes_int == 12:
                        prox_ano, prox_mes = ano_int + 1, 1
                    else:
                        prox_ano, prox_mes = ano_int, mes_int + 1
                    inicio = f"{ano_int}-{mes_int:02d}-01"
                    fim = f"{prox_ano}-{prox_mes:02d}-01"
                    cursor.execute('SELECT * FROM marmitas WHERE data >= %s AND data < %s ORDER BY data DESC', (inicio, fim))
                else:
                    cursor.execute('SELECT * FROM marmitas ORDER BY data DESC')
                return cursor.fetchall()
        finally:
            conn.close()
    db_path = get_db_path(usuario, "marmitas")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    if mes and ano:
        mes_int = int(mes)
        ano_int = int(ano)
        if mes_int == 12:
            prox_ano, prox_mes = ano_int + 1, 1
        else:
            prox_ano, prox_mes = ano_int, mes_int + 1
        inicio = f"{ano_int}-{mes_int:02d}-01"
        fim = f"{prox_ano}-{prox_mes:02d}-01"
        cursor.execute('SELECT * FROM marmitas WHERE data >= ? AND data < ? ORDER BY data DESC', (inicio, fim))
    else:
        cursor.execute('SELECT * FROM marmitas ORDER BY data DESC')
    registros = cursor.fetchall()
    conn.close()
    return registros

def adicionar_marmita(data, valor, comprou):
    """Adicionar nova marmita"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('INSERT INTO marmitas (data, valor, comprou) VALUES (%s, %s, %s)', (data, valor, comprou))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "marmitas")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO marmitas (data, valor, comprou) VALUES (?, ?, ?)', 
                  (data, valor, comprou))
    conn.commit()
    conn.close()

def atualizar_marmita(id_registro, data=None, valor=None, comprou=None):
    """Atualizar marmita"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                # Primeiro, buscar os dados atuais
                cursor.execute('SELECT data, valor, comprou FROM marmitas WHERE id = %s', (id_registro,))
                row = cursor.fetchone()
                if not row:
                    return {"success": False, "message": "Marmita não encontrada"}
                
                # Usar valores atuais se não fornecidos
                nova_data = data if data is not None else row[0]
                novo_valor = valor if valor is not None else row[1]
                novo_comprou = comprou if comprou is not None else bool(row[2])
                
                cursor.execute('UPDATE marmitas SET data = %s, valor = %s, comprou = %s WHERE id = %s', 
                             (nova_data, novo_valor, novo_comprou, id_registro))
                conn.commit()
                return {"success": True}
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "marmitas")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        cursor = conn.cursor()
        try:
            # Primeiro, buscar os dados atuais
            cursor.execute('SELECT data, valor, comprou FROM marmitas WHERE id = ?', (id_registro,))
            row = cursor.fetchone()
            if not row:
                return {"success": False, "message": "Marmita não encontrada"}
            
            # Usar valores atuais se não fornecidos
            nova_data = data if data is not None else row[0]
            novo_valor = valor if valor is not None else row[1]
            novo_comprou = comprou if comprou is not None else bool(row[2])
            
            cursor.execute('UPDATE marmitas SET data = ?, valor = ?, comprou = ? WHERE id = ?', 
                         (nova_data, novo_valor, novo_comprou, id_registro))
            conn.commit()
            return {"success": True}
        finally:
            conn.close()

def remover_marmita(id_registro):
    """Remover marmita"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('DELETE FROM marmitas WHERE id = %s', (id_registro,))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "marmitas")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM marmitas WHERE id = ?', (id_registro,))
    conn.commit()
    conn.close()

def gastos_mensais(periodo='6m'):
    """Calcular gastos mensais de marmitas"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    hoje = datetime.now()
    if periodo.endswith('m'):
        meses = int(periodo.replace('m', ''))
        data_inicio = hoje - timedelta(days=30*meses)
    elif periodo.endswith('y'):
        anos = int(periodo.replace('y', ''))
        data_inicio = hoje - timedelta(days=365*anos)
    else:
        data_inicio = hoje - timedelta(days=30)

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            query = '''
                SELECT left(data, 7) as "AnoMes", SUM(valor) as valor
                FROM marmitas
                WHERE data >= %s
                GROUP BY 1
                ORDER BY 1 DESC
            '''
            df = pd.read_sql_query(query, conn, params=(data_inicio.strftime('%Y-%m-%d'),))
        finally:
            conn.close()
        return df
    db_path = get_db_path(usuario, "marmitas")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    query = '''
        SELECT 
            substr(data, 1, 7) as AnoMes,
            SUM(valor) as valor
        FROM marmitas 
        WHERE data >= ?
        GROUP BY substr(data, 1, 7)
        ORDER BY AnoMes DESC
    '''
    df = pd.read_sql_query(query, conn, params=(data_inicio.strftime('%Y-%m-%d'),))
    conn.close()
    return df

def inicializar_bancos_usuario(usuario):

    init_carteira_db(usuario)
    init_controle_db(usuario)
    init_marmitas_db(usuario)

def calcular_saldo_mes_ano(mes, ano, pessoa=None):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    mes_int = int(mes)
    ano_int = int(ano)
    if mes_int == 12:
        prox_ano, prox_mes = ano_int + 1, 1
    else:
        prox_ano, prox_mes = ano_int, mes_int + 1
    inicio = f"{ano_int}-{mes_int:02d}-01"
    fim = f"{prox_ano}-{prox_mes:02d}-01"

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:

            df_receitas = pd.read_sql_query(
                'SELECT SUM(valor) as total FROM receitas WHERE data >= %s AND data < %s',
                conn,
                params=(inicio, fim)
            )
          
            # Cartões antigos migrados para outros_gastos
  
            df_outros = pd.read_sql_query(
                'SELECT valor FROM outros_gastos WHERE data >= %s AND data < %s',
                conn,
                params=(inicio, fim)
            )
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "controle")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        
        df_receitas = pd.read_sql_query(
            'SELECT SUM(valor) as total FROM receitas WHERE data >= ? AND data < ?',
            conn,
            params=(inicio, fim)
        )
        
        df_outros = pd.read_sql_query(
            'SELECT valor FROM outros_gastos WHERE data >= ? AND data < ?',
            conn,
            params=(inicio, fim)
        )
        conn.close()

    total_receitas = float(df_receitas['total'].iloc[0]) if not df_receitas.empty and df_receitas['total'].iloc[0] is not None else 0.0
    total_outros = float(df_outros['valor'].sum()) if not df_outros.empty else 0.0
    total_despesas = total_outros
    return total_receitas - total_despesas

# ==================== FUNÇÕES DE CARTÕES CADASTRADOS ====================

def adicionar_cartao_cadastrado(nome, bandeira, limite, vencimento, cor):
    """Adiciona um novo cartão cadastrado"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    INSERT INTO cartoes_cadastrados (nome, bandeira, limite, vencimento, cor)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (nome, bandeira, limite, vencimento, cor))
        finally:
            conn.close()
        return
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO cartoes_cadastrados (nome, bandeira, limite, vencimento, cor)
        VALUES (?, ?, ?, ?, ?)
    ''', (nome, bandeira, limite, vencimento, cor))
    conn.commit()
    conn.close()

def listar_cartoes_cadastrados():
    """Lista todos os cartões cadastrados"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

   
    _upgrade_controle_schema(usuario)

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    SELECT * FROM cartoes_cadastrados 
                    WHERE ativo = TRUE 
                    ORDER BY nome
                ''')
                columns = [desc[0] for desc in cursor.description]
                results = cursor.fetchall()
                return [dict(zip(columns, row)) for row in results]
        finally:
            conn.close()
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM cartoes_cadastrados 
        WHERE ativo = 1 
        ORDER BY nome
    ''')
    columns = [desc[0] for desc in cursor.description]
    results = cursor.fetchall()
    conn.close()
    return [dict(zip(columns, row)) for row in results]

def atualizar_cartao_cadastrado(id_cartao, nome=None, bandeira=None, limite=None, vencimento=None, cor=None, ativo=None):
    """Atualiza um cartão cadastrado"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE cartoes_cadastrados SET 
                        nome = COALESCE(%s, nome),
                        bandeira = COALESCE(%s, bandeira),
                        limite = COALESCE(%s, limite),
                        vencimento = COALESCE(%s, vencimento),
                        cor = COALESCE(%s, cor),
                        ativo = COALESCE(%s, ativo)
                    WHERE id = %s
                ''', (nome, bandeira, limite, vencimento, cor, ativo, id_cartao))
        finally:
            conn.close()
        return
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE cartoes_cadastrados SET 
            nome = COALESCE(?, nome),
            bandeira = COALESCE(?, bandeira),
            limite = COALESCE(?, limite),
            vencimento = COALESCE(?, vencimento),
            cor = COALESCE(?, cor),
            ativo = COALESCE(?, ativo)
        WHERE id = ?
    ''', (nome, bandeira, limite, vencimento, cor, ativo, id_cartao))
    conn.commit()
    conn.close()

def remover_cartao_cadastrado(id_cartao):
    """Remove um cartão cadastrado (soft delete)"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE cartoes_cadastrados SET ativo = FALSE WHERE id = %s
                ''', (id_cartao,))
        finally:
            conn.close()
        return
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE cartoes_cadastrados SET ativo = 0 WHERE id = ?
    ''', (id_cartao,))
    conn.commit()
    conn.close()

# ==================== FUNÇÕES DE COMPRAS DO CARTÃO ====================

def adicionar_compra_cartao(cartao_id, nome, valor, data, categoria=None, observacao=None):
    """Adiciona uma compra ao cartão"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    data_atual = data or datetime.now().strftime('%Y-%m-%d')
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    INSERT INTO compras_cartao (cartao_id, nome, valor, data, categoria, observacao)
                    VALUES (%s, %s, %s, %s, %s, %s)
                ''', (cartao_id, nome, valor, data_atual, categoria, observacao))
        finally:
            conn.close()
        return
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO compras_cartao (cartao_id, nome, valor, data, categoria, observacao)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (cartao_id, nome, valor, data_atual, categoria, observacao))
    conn.commit()
    conn.close()

def listar_compras_cartao(cartao_id, mes=None, ano=None):
    """Lista compras de um cartão específico"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                if mes and ano:
                    mes_int = int(mes)
                    ano_int = int(ano)
                    if mes_int == 12:
                        prox_ano, prox_mes = ano_int + 1, 1
                    else:
                        prox_ano, prox_mes = ano_int, mes_int + 1
                    inicio = f"{ano_int}-{mes_int:02d}-01"
                    fim = f"{prox_ano}-{prox_mes:02d}-01"
                    cursor.execute('''
                        SELECT * FROM compras_cartao 
                        WHERE cartao_id = %s AND data >= %s AND data < %s
                        ORDER BY data DESC
                    ''', (cartao_id, inicio, fim))
                else:
                    cursor.execute('''
                        SELECT * FROM compras_cartao 
                        WHERE cartao_id = %s
                        ORDER BY data DESC
                    ''', (cartao_id,))
                columns = [desc[0] for desc in cursor.description]
                results = cursor.fetchall()
                return [dict(zip(columns, row)) for row in results]
        finally:
            conn.close()
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    if mes and ano:
        mes_int = int(mes)
        ano_int = int(ano)
        if mes_int == 12:
            prox_ano, prox_mes = ano_int + 1, 1
        else:
            prox_ano, prox_mes = ano_int, mes_int + 1
        inicio = f"{ano_int}-{mes_int:02d}-01"
        fim = f"{prox_ano}-{prox_mes:02d}-01"
        cursor.execute('''
            SELECT * FROM compras_cartao 
            WHERE cartao_id = ? AND data >= ? AND data < ?
            ORDER BY data DESC
        ''', (cartao_id, inicio, fim))
    else:
        cursor.execute('''
            SELECT * FROM compras_cartao 
            WHERE cartao_id = ?
            ORDER BY data DESC
        ''', (cartao_id,))
    columns = [desc[0] for desc in cursor.description]
    results = cursor.fetchall()
    conn.close()
    return [dict(zip(columns, row)) for row in results]

def atualizar_compra_cartao(id_compra, nome=None, valor=None, data=None, categoria=None, observacao=None):
    """Atualiza uma compra do cartão"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE compras_cartao SET 
                        nome = COALESCE(%s, nome),
                        valor = COALESCE(%s, valor),
                        data = COALESCE(%s, data),
                        categoria = COALESCE(%s, categoria),
                        observacao = COALESCE(%s, observacao)
                    WHERE id = %s
                ''', (nome, valor, data, categoria, observacao, id_compra))
        finally:
            conn.close()
        return
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE compras_cartao SET 
            nome = COALESCE(?, nome),
            valor = COALESCE(?, valor),
            data = COALESCE(?, data),
            categoria = COALESCE(?, categoria),
            observacao = COALESCE(?, observacao)
        WHERE id = ?
    ''', (nome, valor, data, categoria, observacao, id_compra))
    conn.commit()
    conn.close()

def remover_compra_cartao(id_compra):
    """Remove uma compra do cartão"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                cursor.execute('DELETE FROM compras_cartao WHERE id = %s', (id_compra,))
        finally:
            conn.close()
        return
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM compras_cartao WHERE id = ?', (id_compra,))
    conn.commit()
    conn.close()

def calcular_total_compras_cartao(cartao_id, mes=None, ano=None):
    """Calcula o total de compras de um cartão"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                if mes and ano:
                    mes_int = int(mes)
                    ano_int = int(ano)
                    if mes_int == 12:
                        prox_ano, prox_mes = ano_int + 1, 1
                    else:
                        prox_ano, prox_mes = ano_int, mes_int + 1
                    inicio = f"{ano_int}-{mes_int:02d}-01"
                    fim = f"{prox_ano}-{prox_mes:02d}-01"
                    cursor.execute('''
                        SELECT COALESCE(SUM(valor), 0) as total FROM compras_cartao 
                        WHERE cartao_id = %s AND data >= %s AND data < %s
                    ''', (cartao_id, inicio, fim))
                else:
                    cursor.execute('''
                        SELECT COALESCE(SUM(valor), 0) as total FROM compras_cartao 
                        WHERE cartao_id = %s
                    ''', (cartao_id,))
                result = cursor.fetchone()
                return float(result[0]) if result else 0.0
        finally:
            conn.close()
    
    db_path = get_db_path(usuario, "controle")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    if mes and ano:
        mes_int = int(mes)
        ano_int = int(ano)
        if mes_int == 12:
            prox_ano, prox_mes = ano_int + 1, 1
        else:
            prox_ano, prox_mes = ano_int, mes_int + 1
        inicio = f"{ano_int}-{mes_int:02d}-01"
        fim = f"{prox_ano}-{prox_mes:02d}-01"
        cursor.execute('''
            SELECT COALESCE(SUM(valor), 0) as total FROM compras_cartao 
            WHERE cartao_id = ? AND data >= ? AND data < ?
        ''', (cartao_id, inicio, fim))
    else:
        cursor.execute('''
            SELECT COALESCE(SUM(valor), 0) as total FROM compras_cartao 
            WHERE cartao_id = ?
        ''', (cartao_id,))
    result = cursor.fetchone()
    conn.close()
    return float(result[0]) if result else 0.0

def marcar_cartao_como_pago(cartao_id, mes_pagamento, ano_pagamento):
    """Marca um cartão como pago e converte em despesa"""
    usuario = get_usuario_atual()
    if not usuario:
        return False
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:

                cursor.execute("SELECT nome, limite FROM cartoes_cadastrados WHERE id = %s", [cartao_id])
                cartao = cursor.fetchone()
                if not cartao:
                    return False
                
                nome_cartao, limite = cartao
                

                total_compras = calcular_total_compras_cartao(cartao_id)
                

                cursor.execute("""
                    UPDATE cartoes_cadastrados 
                    SET pago = TRUE, mes_pagamento = %s, ano_pagamento = %s, data_pagamento = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, [mes_pagamento, ano_pagamento, cartao_id])
                
                # Limpar compras do cartão (devolver limite)
                cursor.execute("""
                    DELETE FROM compras_cartao WHERE cartao_id = %s
                """, [cartao_id])
                
                # Adicionar como despesa no mês do pagamento
                data_pagamento = f"{ano_pagamento}-{mes_pagamento:02d}-01"
                cursor.execute("""
                    INSERT INTO outros_gastos (nome, valor, data, categoria, tipo, observacao)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, [f"Pagamento {nome_cartao}", total_compras, data_pagamento, "cartao", "variavel", f"Pagamento do cartão {nome_cartao}"])
                
                conn.commit()
                return True
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "controle")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cursor = conn.cursor()
            
            # Buscar dados do cartão
            cursor.execute("SELECT nome, limite FROM cartoes_cadastrados WHERE id = ?", [cartao_id])
            cartao = cursor.fetchone()
            if not cartao:
                return False
            
            nome_cartao, limite = cartao
            
            # Calcular total de compras não pagas (todas as compras do cartão)
            total_compras = calcular_total_compras_cartao(cartao_id)
            
            # Marcar cartão como pago
            cursor.execute("""
                UPDATE cartoes_cadastrados 
                SET pago = 1, mes_pagamento = ?, ano_pagamento = ?, data_pagamento = CURRENT_TIMESTAMP
                WHERE id = ?
            """, [mes_pagamento, ano_pagamento, cartao_id])
            
            # Limpar compras do cartão (devolver limite)
            cursor.execute("""
                DELETE FROM compras_cartao WHERE cartao_id = ?
            """, [cartao_id])
            
            # Adicionar como despesa no mês do pagamento
            data_pagamento = f"{ano_pagamento}-{mes_pagamento:02d}-01"
            cursor.execute("""
                INSERT INTO outros_gastos (nome, valor, data, categoria, tipo, observacao)
                VALUES (?, ?, ?, ?, ?, ?)
            """, [f"Pagamento {nome_cartao}", total_compras, data_pagamento, "cartao", "variavel", f"Pagamento do cartão {nome_cartao}"])
            
            conn.commit()
            return True
        finally:
            conn.close()

def desmarcar_cartao_como_pago(cartao_id):
    """Desmarca um cartão como pago e remove a despesa correspondente"""
    usuario = get_usuario_atual()
    if not usuario:
        return False
    
    if _is_postgres():
        conn = _pg_conn_for_user(usuario)
        try:
            with conn.cursor() as cursor:
                # Buscar dados do cartão
                cursor.execute("SELECT nome FROM cartoes_cadastrados WHERE id = %s", [cartao_id])
                cartao = cursor.fetchone()
                if not cartao:
                    return False
                
                nome_cartao = cartao[0]
                
                # Desmarcar cartão como pago
                cursor.execute("""
                    UPDATE cartoes_cadastrados 
                    SET pago = FALSE, mes_pagamento = NULL, ano_pagamento = NULL, data_pagamento = NULL
                    WHERE id = %s
                """, [cartao_id])
                
                # Remover despesa correspondente
                cursor.execute("""
                    DELETE FROM outros_gastos 
                    WHERE nome = %s AND categoria = 'cartao'
                """, [f"Pagamento {nome_cartao}"])
                
                conn.commit()
                return True
        finally:
            conn.close()
    else:
        db_path = get_db_path(usuario, "controle")
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cursor = conn.cursor()
            
            # Buscar dados do cartão
            cursor.execute("SELECT nome FROM cartoes_cadastrados WHERE id = ?", [cartao_id])
            cartao = cursor.fetchone()
            if not cartao:
                return False
            
            nome_cartao = cartao[0]
            
            # Desmarcar cartão como pago
            cursor.execute("""
                UPDATE cartoes_cadastrados 
                SET pago = 0, mes_pagamento = NULL, ano_pagamento = NULL, data_pagamento = NULL
                WHERE id = ?
            """, [cartao_id])
            
            # Remover despesa correspondente
            cursor.execute("""
                DELETE FROM outros_gastos 
                WHERE nome = ? AND categoria = 'cartao'
            """, [f"Pagamento {nome_cartao}"])
            
            conn.commit()
            return True
        finally:
            conn.close()

# ==================== FUNÇÕES DE SIMULAÇÃO DE CHOQUES ====================

def simular_choques_indexadores(choques_cdi=0, choques_ipca=0, choques_selic=0):
    """
    Simula choques nos indexadores e calcula o impacto na carteira
    """
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"error": "Usuário não autenticado"}
        
        carteira = obter_carteira()
        if not carteira:
            return {"carteira_simulada": [], "totais": {"valor_atual": 0, "valor_simulado": 0, "variacao": 0, "variacao_percentual": 0}}
        
        carteira_simulada = []
        valor_atual_total = 0
        valor_simulado_total = 0
        
        for ativo in carteira:
            # Calcular novo preço baseado no indexador
            novo_preco = ativo['preco_atual']
            impacto = 0
            
            # Aplicar choque baseado no indexador
            if ativo.get('indexador') == 'CDI':
                impacto = choques_cdi
            elif ativo.get('indexador') == 'IPCA':
                impacto = choques_ipca
            elif ativo.get('indexador') == 'SELIC':
                impacto = choques_selic
            
            # Calcular novo preço (simplificado: 1% de choque = 1% no preço)
            if impacto != 0:
                novo_preco = ativo['preco_atual'] * (1 + impacto / 100)
            
            # Calcular novos valores
            novo_valor_total = novo_preco * ativo['quantidade']
            variacao = novo_valor_total - ativo['valor_total']
            variacao_percentual = (variacao / ativo['valor_total']) * 100 if ativo['valor_total'] > 0 else 0
            
            # Adicionar à carteira simulada
            ativo_simulado = {
                **ativo,
                'preco_simulado': novo_preco,
                'valor_total_simulado': novo_valor_total,
                'variacao': variacao,
                'variacao_percentual': variacao_percentual
            }
            carteira_simulada.append(ativo_simulado)
            
            # Somar totais
            valor_atual_total += ativo['valor_total']
            valor_simulado_total += novo_valor_total
        
        # Calcular totais
        variacao_total = valor_simulado_total - valor_atual_total
        variacao_percentual_total = (variacao_total / valor_atual_total) * 100 if valor_atual_total > 0 else 0
        
        return {
            "carteira_simulada": carteira_simulada,
            "totais": {
                "valor_atual": valor_atual_total,
                "valor_simulado": valor_simulado_total,
                "variacao": variacao_total,
                "variacao_percentual": variacao_percentual_total
            }
        }
        
    except Exception as e:
        print(f"Erro na simulação de choques: {e}")
        return {"error": str(e)}

def obter_cenarios_predefinidos():

    return [
        {
            "nome": "Otimista",
            "descricao": "Economia em crescimento",
            "choques": {"cdi": 2, "ipca": -1, "selic": 2},
            "cor": "text-green-600"
        },
        {
            "nome": "Pessimista", 
            "descricao": "Crise econômica",
            "choques": {"cdi": -3, "ipca": 3, "selic": -3},
            "cor": "text-red-600"
        },
        {
            "nome": "Crise",
            "descricao": "Crise severa",
            "choques": {"cdi": -5, "ipca": 5, "selic": -5},
            "cor": "text-red-800"
        },
        {
            "nome": "Inflação Alta",
            "descricao": "Inflação descontrolada",
            "choques": {"cdi": 1, "ipca": 4, "selic": 1},
            "cor": "text-orange-600"
        }
    ]

def executar_monte_carlo(n_simulacoes=10000, periodo_anos=5, confianca=95):
    """
    Executa simulação Monte Carlo para a carteira
    """
    try:
        import numpy as np
        import random
        
        print(f"Iniciando Monte Carlo: {n_simulacoes} simulações, {periodo_anos} anos")
        
        usuario = get_usuario_atual()
        if not usuario:
            return {"error": "Usuário não autenticado"}
        
        carteira = obter_carteira()
        if not carteira:
            return {"error": "Carteira vazia"}
        
        print(f"Carteira encontrada: {len(carteira)} ativos")
        
        # Calcular valor atual total
        valor_atual_total = sum(ativo['valor_total'] for ativo in carteira)
        print(f"Valor atual total: R$ {valor_atual_total:,.2f}")
        
        # Parâmetros para simulação (baseados em dados históricos médios)
        retorno_medio_anual = 0.12  # 12% ao ano (média histórica do mercado brasileiro)
        volatilidade_anual = 0.20   # 20% de volatilidade anual
        
     
        cenarios = []
        
        for _ in range(n_simulacoes):
           
            retorno_anual = np.random.normal(retorno_medio_anual, volatilidade_anual)
            
           
            valor_final = valor_atual_total * ((1 + retorno_anual) ** periodo_anos)
            cenarios.append(valor_final)
        
  
        cenarios_ordenados = sorted(cenarios)
        n_cenarios = len(cenarios_ordenados)
        
      
        percentis = {
            "p5": cenarios_ordenados[int(0.05 * n_cenarios)],
            "p25": cenarios_ordenados[int(0.25 * n_cenarios)],
            "p50": cenarios_ordenados[int(0.50 * n_cenarios)],
            "p75": cenarios_ordenados[int(0.75 * n_cenarios)],
            "p95": cenarios_ordenados[int(0.95 * n_cenarios)]
        }
        
    
        valor_esperado = np.mean(cenarios)
        
   
        volatilidade = np.std(cenarios) / valor_esperado
        
    
        cenarios_perda = [c for c in cenarios if c < valor_atual_total]
        probabilidade_perda = len(cenarios_perda) / n_cenarios * 100
        

        sharpe = (valor_esperado - valor_atual_total) / (np.std(cenarios) * np.sqrt(periodo_anos))
        
        resultado = {
            "percentis": percentis,
            "probabilidade_perda": probabilidade_perda,
            "valor_esperado": valor_esperado,
            "volatilidade": volatilidade,
            "sharpe": sharpe,
            "cenarios": cenarios[:1000]  
        }
        
        print(f"Monte Carlo concluído: Valor esperado R$ {valor_esperado:,.2f}")
        return resultado
        
    except Exception as e:
        print(f"Erro na simulação Monte Carlo: {e}")
        return {"error": str(e)}
