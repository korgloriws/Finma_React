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
from typing import Any, Dict, Optional, Tuple


USUARIO_ATUAL = None  
SESSION_LOCK = threading.Lock()

def set_usuario_atual(username):
   
    global USUARIO_ATUAL
    with SESSION_LOCK:
        USUARIO_ATUAL = username

def _create_sessions_table_if_needed():
    conn = _get_user_db_conn()
    try:
        c = conn.cursor()
        if USUARIOS_DB_IS_PG:
            c.execute(
                '''CREATE TABLE IF NOT EXISTS sessoes (
                    token TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    expira_em BIGINT NOT NULL
                )'''
            )
        else:
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
    conn = _get_user_db_conn()
    try:
        c = conn.cursor()
        if USUARIOS_DB_IS_PG:
            c.execute(
                'INSERT INTO sessoes (token, username, expira_em) VALUES (%s, %s, %s) ON CONFLICT (token) DO UPDATE SET username = EXCLUDED.username, expira_em = EXCLUDED.expira_em',
                (token, username, expira_em)
            )
        else:
            c.execute('INSERT OR REPLACE INTO sessoes (token, username, expira_em) VALUES (?, ?, ?)', (token, username, expira_em))
        conn.commit()
        return token
    finally:
        conn.close()

def invalidar_sessao(token: str) -> None:
    try:
        conn = _get_user_db_conn()
        c = conn.cursor()
        c.execute(_adapt_sql('DELETE FROM sessoes WHERE token = ?'), (token,))
        conn.commit()
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass

def invalidar_todas_sessoes() -> None:
    """Remove todas as sessões persistidas. Útil ao reiniciar o servidor."""
    try:
        _create_sessions_table_if_needed()
        conn = _get_user_db_conn()
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
        from flask import request
        token = request.cookies.get('session_token')
        if not token:
            return None
        _create_sessions_table_if_needed()
        conn = _get_user_db_conn()
        try:
            c = conn.cursor()
            c.execute(_adapt_sql('SELECT username, expira_em FROM sessoes WHERE token = ?'), (token,))
            row = c.fetchone()
            if not row:
                return None
            username, expira_em = row
            if expira_em < int(time.time()):
                # sessão expirada
                try:
                    c.execute(_adapt_sql('DELETE FROM sessoes WHERE token = ?'), (token,))
                    conn.commit()
                except Exception:
                    pass
                return None
            return username
        finally:
            conn.close()
    except Exception:
        return None

def limpar_sessoes_expiradas():
    try:
        _create_sessions_table_if_needed()
        conn = _get_user_db_conn()
        c = conn.cursor()
        agora = int(time.time())
        c.execute(_adapt_sql('DELETE FROM sessoes WHERE expira_em < ?'), (agora,))
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


USUARIOS_DB_URL = os.getenv("USUARIOS_DB_URL")
USUARIOS_DB_IS_PG = bool(USUARIOS_DB_URL)
if USUARIOS_DB_IS_PG:
    try:
        import psycopg2  
        from psycopg2.pool import ThreadedConnectionPool  
    except Exception:
        USUARIOS_DB_IS_PG = False
        USUARIOS_DB_URL = None

PG_POOL: Optional["ThreadedConnectionPool"] = None 
PG_USE_POOL: bool = os.getenv("PG_USE_POOL", "1") != "0"

class _PooledConn:
    def __init__(self, pool: "ThreadedConnectionPool", conn: Any):  
        self._pool = pool
        self._conn = conn
    def __getattr__(self, name):
        return getattr(self._conn, name)
    def close(self):
        try:
          
            self._conn.rollback()
        except Exception:
            pass
        try:
            self._pool.putconn(self._conn)
        except Exception:
            try:
                self._conn.close()
            except Exception:
                pass

def _init_pg_pool_if_needed() -> Optional["ThreadedConnectionPool"]:  
    global PG_POOL
    if not USUARIOS_DB_IS_PG or not PG_USE_POOL:
        return None
    if PG_POOL is None:
        try:
            
            minconn = int(os.getenv("PG_MINCONN", "1"))
            maxconn = int(os.getenv("PG_MAXCONN", "4"))
            PG_POOL = ThreadedConnectionPool(minconn=minconn, maxconn=maxconn, dsn=USUARIOS_DB_URL)  # type: ignore
        except Exception as e:
            try:
                print(f"[WARN] Falha ao criar pool Postgres: {e}. Usando conexões diretas.")
            except Exception:
                pass
            PG_POOL = None
    return PG_POOL

def _get_user_db_conn():
    if USUARIOS_DB_IS_PG:
        pool = _init_pg_pool_if_needed()
        if pool is not None:
            raw = pool.getconn()
            return _PooledConn(pool, raw)
        # fallback para conexão direta
        return psycopg2.connect(USUARIOS_DB_URL)  # type: ignore
    return sqlite3.connect(USUARIOS_DB_PATH)

def _adapt_sql(sql: str) -> str:
    return sql.replace('?', '%s') if USUARIOS_DB_IS_PG else sql

def _get_data_conn_for(usuario: str, tipo_db: str):
    if USUARIOS_DB_IS_PG:
        return _get_user_db_conn()
    return sqlite3.connect(get_db_path(usuario, tipo_db), check_same_thread=False)

LISTA_ACOES = [
    
"AALR3.sa",
"ABCB4.sa",
"ABEV3.sa",
"AERI3.sa",
"AFLT3.sa",
"AGRO3.sa",
"AGXY3.sa",
"AHEB5.sa",
"ALLD3.sa",
"ALOS3.sa",
"ALPA3.sa",
"ALPA4.sa",
"ALPK3.sa",
"ALUP11.sa",
"ALUP3.sa",
"ALUP4.sa",
"AMAR11.sa",
"AMAR3.sa",
"AMBP3.sa",
"AMER3.sa",
"AMOB3.sa",
"ANIM3.sa",
"ARML3.sa",
"ASAI3.sa",
"ATED3.sa",
"ATMP3.sa",
"AURE3.sa",
"AVLL3.sa",
"AZEV11.sa",
"AZEV3.sa",
"AZEV4.sa",
"AZTE3.sa",
"AZUL4.sa",
"AZZA3.sa",
"B3SA3.sa",
"BALM3.sa",
"BALM4.sa",
"BAUH4.sa",
"BAZA3.sa",
"BBAS3.sa",
"BBDC3.sa",
"BBDC4.sa",
"BBSE3.sa",
"BDLL3.sa",
"BDLL4.sa",
"BEEF3.sa",
"BEES3.sa",
"BEES4.sa",
"BGIP3.sa",
"BGIP4.sa",
"BHIA3.sa",
"BIED3.sa",
"BIOM3.sa",
"BLAU3.sa",
"BMEB3.sa",
"BMEB4.sa",
"BMGB4.sa",
"BMIN3.sa",
"BMIN4.sa",
"BMKS3.sa",
"BMOB3.sa",
"BNBR3.sa",
"BOBR4.sa",
"BPAC11.sa",
"BPAC3.sa",
"BPAC5.sa",
"BPAN4.sa",
"BRAP3.sa",
"BRAP4.sa",
"BRAV3.sa",
"BRBI11.sa",
"BRFS3.sa",
"BRKM3.sa",
"BRKM5.sa",
"BRKM6.sa",
"BRSR3.sa",
"BRSR5.sa",
"BRSR6.sa",
"BRST3.sa",
"BSLI3.sa",
"BSLI4.sa",
"CAMB3.sa",
"CAML3.sa",
"CASH3.sa",
"CBAV3.sa",
"CBEE3.sa",
"CCTY3.sa",
"CEAB3.sa",
"CEBR3.sa",
"CEBR5.sa",
"CEBR6.sa",
"CEDO4.sa",
"CEEB3.sa",
"CGAS3.sa",
"CGAS5.sa",
"CGRA3.sa",
"CGRA4.sa",
"CLSC3.sa",
"CLSC4.sa",
"CMIG3.sa",
"CMIG4.sa",
"CMIN3.sa",
"COCE3.sa",
"COCE5.sa",
"COGN3.sa",
"CPFE3.sa",
"CPLE3.sa",
"CPLE5.sa",
"CPLE6.sa",
"CRFB3.sa",
"CRPG3.sa",
"CRPG5.sa",
"CRPG6.sa",
"CSAN3.sa",
"CSED3.sa",
"CSMG3.sa",
"CSNA3.sa",
"CSUD3.sa",
"CTKA3.sa",
"CTKA4.sa",
"CTSA3.sa",
"CTSA4.sa",
"CURY3.sa",
"CVCB3.sa",
"CXSE3.sa",
"CYRE3.sa",
"DASA3.sa",
"DESK3.sa",
"DEXP3.sa",
"DEXP4.sa",
"DIRR3.sa",
"DMVF3.sa",
"DOHL3.sa",
"DOHL4.sa",
"DOTZ3.sa",
"DTCY3.sa",
"DXCO3.sa",
"EALT3.sa",
"EALT4.sa",
"ECOR3.sa",
"EGIE3.sa",
"EKTR3.sa",
"EKTR4.sa",
"ELET3.sa",
"ELET6.sa",
"ELMD3.sa",
"EMAE4.sa",
"EMBR3.sa",
"ENEV3.sa",
"ENGI11.sa",
"ENGI3.sa",
"ENGI4.sa",
"ENJU3.sa",
"ENMT3.sa",
"EPAR3.sa",
"EQMA3B.sa",
"EQPA3.sa",
"EQTL3.sa",
"ESPA3.sa",
"ESTR4.sa",
"ETER3.sa",
"EUCA3.sa",
"EUCA4.sa",
"EVEN3.sa",
"EZTC3.sa",
"FESA3.sa",
"FESA4.sa",
"FHER3.sa",
"FICT3.sa",
"FIEI3.sa",
"FIQE3.sa",
"FLRY3.sa",
"FRAS3.sa",
"FRIO3.sa",
"GEPA3.sa",
"GEPA4.sa",
"GFSA3.sa",
"GGBR3.sa",
"GGBR4.sa",
"GGPS3.sa",
"GMAT3.sa",
"GOAU3.sa",
"GOAU4.sa",
"GOLL4.sa",
"GPAR3.sa",
"GRND3.sa",
"GSHP3.sa",
"GUAR3.sa",
"HAGA3.sa",
"HAGA4.sa",
"HAPV3.sa",
"HBOR3.sa",
"HBRE3.sa",
"HBSA3.sa",
"HBTS5.sa",
"HETA4.sa",
"HOOT4.sa",
"HYPE3.sa",
"IFCM3.sa",
"IGTI11.sa",
"IGTI11.sa",
"IGTI3.sa",
"IGTI3.sa",
"INEP3.sa",
"INEP4.sa",
"INTB3.sa",
"IRBR3.sa",
"ISAE3.sa",
"ISAE4.sa",
"ITSA3.sa",
"ITSA4.sa",
"ITUB3.sa",
"ITUB4.sa",
"JALL3.sa",
"JBSS3.sa",
"JFEN3.sa",
"JHSF3.sa",
"JSLG3.sa",
"KEPL3.sa",
"KLBN11.sa",
"KLBN3.sa",
"KLBN4.sa",
"LAND3.sa",
"LAVV3.sa",
"LEVE3.sa",
"LIGT3.sa",
"LIPR3.sa",
"LJQQ3.sa",
"LOGG3.sa",
"LOGN3.sa",
"LPSB3.sa",
"LREN3.sa",
"LUPA3.sa",
"LUXM4.sa",
"LVTC3.sa",
"LWSA3.sa",
"MAPT3.sa",
"MATD3.sa",
"MBLY3.sa",
"MDIA3.sa",
"MDNE3.sa",
"MEAL3.sa",
"MELK3.sa",
"MGEL4.sa",
"MGLU3.sa",
"MILS3.sa",
"MLAS3.sa",
"MNDL3.sa",
"MNPR3.sa",
"MOAR3.sa",
"MOTV3.sa",
"MOVI3.sa",
"MRFG3.sa",
"MRSA3B.sa",
"MRVE3.sa",
"MTRE3.sa",
"MTSA3.sa",
"MTSA4.sa",
"MULT3.sa",
"MWET4.sa",
"MYPK3.sa",
"NEOE3.sa",
"NEXP3.sa",
"NGRD3.sa",
"NORD3.sa",
"NTCO3.sa",
"NUTR3.sa",
"ODPV3.sa",
"OFSA3.sa",
"OIBR3.sa",
"OIBR4.sa",
"ONCO3.sa",
"OPCT3.sa",
"ORVR3.sa",
"OSXB3.sa",
"PATI3.sa",
"PATI4.sa",
"PCAR3.sa",
"PDGR3.sa",
"PDTC3.sa",
"PEAB3.sa",
"PEAB4.sa",
"PETR3.sa",
"PETR4.sa",
"PETZ3.sa",
"PFRM3.sa",
"PGMN3.sa",
"PINE11.sa",
"PINE3.sa",
"PINE4.sa",
"PLAS3.sa",
"PLPL3.sa",
"PMAM3.sa",
"PNVL3.sa",
"POMO3.sa",
"POMO4.sa",
"PORT3.sa",
"POSI3.sa",
"PPLA11.sa",
"PRIO3.sa",
"PRNR3.sa",
"PSSA3.sa",
"PSVM11.sa",
"PTBL3.sa",
"PTNT3.sa",
"PTNT4.sa",
"QUAL3.sa",
"RADL3.sa",
"RAIL3.sa",
"RAIZ4.sa",
"RANI3.sa",
"RAPT3.sa",
"RAPT4.sa",
"RCSL3.sa",
"RCSL4.sa",
"RDNI3.sa",
"RDOR3.sa",
"REAG3.sa",
"RECV3.sa",
"REDE3.sa",
"RENT3.sa",
"RNEW11.sa",
"RNEW3.sa",
"RNEW4.sa",
"ROMI3.sa",
"RPAD3.sa",
"RPAD5.sa",
"RPMG3.sa",
"RSID3.sa",
"RSUL4.sa",
"SANB11.sa",
"SANB3.sa",
"SANB4.sa",
"SAPR11.sa",
"SAPR3.sa",
"SAPR4.sa",
"SBFG3.sa",
"SBSP3.sa",
"SCAR3.sa",
"SEER3.sa",
"SEQL3.sa",
"SHOW3.sa",
"SHUL4.sa",
"SIMH3.sa",
"SLCE3.sa",
"SMFT3.sa",
"SMTO3.sa",
"SNSY3.sa",
"SNSY5.sa",
"SOJA3.sa",
"SOND5.sa",
"SOND6.sa",
"SRNA3.sa",
"STBP3.sa",
"SUZB3.sa",
"SYNE3.sa",
"TAEE11.sa",
"TAEE3.sa",
"TAEE4.sa",
"TASA3.sa",
"TASA4.sa",
"TCSA3.sa",
"TECN3.sa",
"TELB3.sa",
"TELB4.sa",
"TEND3.sa",
"TFCO4.sa",
"TGMA3.sa",
"TIMS3.sa",
"TKNO4.sa",
"TOTS3.sa",
"TPIS3.sa",
"TRAD3.sa",
"TRIS3.sa",
"TTEN3.sa",
"TUPY3.sa",
"UCAS3.sa",
"UGPA3.sa",
"UNIP3.sa",
"UNIP5.sa",
"UNIP6.sa",
"USIM3.sa",
"USIM5.sa",
"USIM6.sa",
"VALE3.sa",
"VAMO3.sa",
"VBBR3.sa",
"VITT3.sa",
"VIVA3.sa",
"VIVR3.sa",
"VIVT3.sa",
"VLID3.sa",
"VSTE3.sa",
"VTRU3.sa",
"VULC3.sa",
"VVEO3.sa",
"WEGE3.sa",
"WEST3.sa",
"WHRL3.sa",
"WHRL4.sa",
"WIZC3.sa",
"WLMM3.sa",
"WLMM4.sa",
"YDUQ3.sa",
"ZAMP3.sa",

    
]
LISTA_FIIS = [
    "ARXD11.SA",
"CCME11.SA",
"ITIT11.SA",
"JASC11.SA",
"AFHI11.SA",
"AJFI11.SA",
"ALZC11.SA",
"ALZM11.SA",
"ALZR11.SA",
"AROA11.SA",
"AIEC11.SA",
"BCRI11.SA",
"BNFS11.SA",
"BTML11.SA",
"BBFO11.SA",
"BBRC11.SA",
"RNDP11.SA",
"BLMG11.SA",
"BCIA11.SA",
"FATN11.SA",
"BRCO11.SA",
"BICE11.SA",
"BIME11.SA",
"BRIM11.SA",
"BRIP11.SA",
"BIPD11.SA",
"BROF11.SA",
"LLAO11.SA",
"BTHI11.SA",
"BTLG11.SA",
"BTWR11.SA",
"BTSG11.SA",
"BTSI11.SA",
"CRFF11.SA",
"CXRI11.SA",
"CPOF11.SA",
"CPFF11.SA",
"CPTS11.SA",
"CPSH11.SA",
"CACR11.SA",
"CBOP11.SA",
"BLCA11.SA",
"CFHI11.SA",
"CFII11.SA",
"CJCT11.SA",
"CLIN11.SA",
"HGFF11.SA",
"HGLG11.SA",
"HGPO11.SA",
"HGRE11.SA",
"HGCR11.SA",
"HGRU11.SA",
"CYCR11.SA",
"DPRO11.SA",
"DEVA11.SA",
"EQIR11.SA",
"ERPA11.SA",
"KEVE11.SA",
"EXES11.SA",
"FLCR11.SA",
"VRTA11.SA",
"VRTM11.SA",
"MMPD11.SA",
"IBCR11.SA",
"IDGR11.SA",
"GAME11.SA",
"TRBL11.SA",
"FAED11.SA",
"BMLC11.SA",
"BPRP11.SA",
"BRCR11.SA",
"BTHF11.SA",
"FCFL11.SA",
"CNES11.SA",
"CEOC11.SA",
"EDGA11.SA",
"HCRI11.SA",
"NSLU11.SA",
"HTMX11.SA",
"MAXR11.SA",
"NCHB11.SA",
"NVHO11.SA",
"PQDP11.SA",
"RBRR11.SA",
"RECR11.SA",
"RECT11.SA",
"TRNT11.SA",
"OUFF11.SA",
"LVBI11.SA",
"BPFF11.SA",
"BVAR11.SA",
"BPML11.SA",
"BTRA11.SA",
"CXCI11.SA",
"CXCE11.SA",
"CXTL11.SA",
"FLMA11.SA",
"EURO11.SA",
"ABCP11.SA",
"GTWR11.SA",
"HUCG11.SA",
"HUSC11.SA",
"FIIB11.SA",
"FMOF11.SA",
"OULG11.SA",
"FPNG11.SA",
"FPAB11.SA",
"RBRY11.SA",
"RBRP11.SA",
"RCRB11.SA",
"RBED11.SA",
"RBVA11.SA",
"RNGO11.SA",
"FISC11.SA",
"SCPF11.SA",
"SHPH11.SA",
"TGAR11.SA",
"BARI11.SA",
"VERE11.SA",
"FVPQ11.SA",
"VTLT11.SA",
"VSHO11.SA",
"IDFI11.SA",
"PLCR11.SA",
"RELG11.SA",
"CVBI11.SA",
"MCCI11.SA",
"ARRI11.SA",
"BTAL11.SA",
"CXCO11.SA",
"HOSI11.SA",
"MGHT11.SA",
"RECX11.SA",
"PVBI11.SA",
"DVFF11.SA",
"RFOF11.SA",
"VVMR11.SA",
"BTCI11.SA",
"IRDM11.SA",
"GARE11.SA",
"KFOF11.SA",
"OURE11.SA",
"SNEL11.SA",
"BLUR11.SA",
"SPXS11.SA",
"APXM11.SA",
"BRLA11.SA",
"CXAG11.SA",
"HBCR11.SA",
"MINT11.SA",
"RZTR11.SA",
"ROOF11.SA",
"GCRI11.SA",
"GCOI11.SA",
"GZIT11.SA",
"FIGS11.SA",
"GLOG11.SA",
"GGRC11.SA",
"HABT11.SA",
"CPUR11.SA",
"HCTR11.SA",
"HCHG11.SA",
"HAAA11.SA",
"HGBL11.SA",
"HGBS11.SA",
"HDEL11.SA",
"FLRP11.SA",
"HLOG11.SA",
"HOFC11.SA",
"HREC11.SA",
"SEED11.SA",
"HPDP11.SA",
"HFOF11.SA",
"HGIC11.SA",
"HSAF11.SA",
"HSLG11.SA",
"HSML11.SA",
"HSRE11.SA",
"HUSI11.SA",
"ITIP11.SA",
"BICR11.SA",
"IRIM11.SA",
"ICRI11.SA",
"TMPS11.SA",
"ITRI11.SA",
"JBFO11.SA",
"JFLL11.SA",
"JCCJ11.SA",
"JPPA11.SA",
"JSAF11.SA",
"JSRE11.SA",
"KISU11.SA",
"KIVO11.SA",
"KCRE11.SA",
"KNHF11.SA",
"KNHY11.SA",
"KNIP11.SA",
"KORE11.SA",
"KNRI11.SA",
"KNCR11.SA",
"KNSC11.SA",
"KNUQ11.SA",
"LPLP11.SA",
"LASC11.SA",
"LSPA11.SA",
"LIFE11.SA",
"LFTT11.SA",
"LGCP11.SA",
"LUGG11.SA",
"MALL11.SA",
"MANA11.SA",
"MCHF11.SA",
"MCHY11.SA",
"MXRF11.SA",
"MFII11.SA",
"MFAI11.SA",
"MFCR11.SA",
"MORE11.SA",
"MORC11.SA",
"NCRI11.SA",
"NAVT11.SA",
"APTO11.SA",
"NEWL11.SA",
"NEWU11.SA",
"OCRE11.SA",
"OUJP11.SA",
"PNCR11.SA",
"PNDL11.SA",
"PNPR11.SA",
"PNRC11.SA",
"PMIS11.SA",
"PQAG11.SA",
"PATC11.SA",
"PATL11.SA",
"PEMA11.SA",
"PORD11.SA",
"PLRI11.SA",
"QAGR11.SA",
"RSPD11.SA",
"RBIR11.SA",
"RBLG11.SA",
"RRCI11.SA",
"RBRD11.SA",
"RBTS11.SA",
"RBRF11.SA",
"RCFF11.SA",
"RBRL11.SA",
"RBRX11.SA",
"RPRI11.SA",
"RMAI11.SA",
"RINV11.SA",
"RBHG11.SA",
"RBHY11.SA",
"RBVO11.SA",
"RBFF11.SA",
"RBOP11.SA",
"RBRS11.SA",
"RZAK11.SA",
"SADI11.SA",
"SAPI11.SA",
"SARE11.SA",
"SEQR11.SA",
"WPLZ11.SA",
"REIT11.SA",
"SPTW11.SA",
"PMFO11.SA",
"STRX11.SA",
"SNFF11.SA",
"SNLG11.SA",
"SNME11.SA",
"SNCI11.SA",
"TEPP11.SA",
"TSER11.SA",
"TVRI11.SA",
"TJKB11.SA",
"TSNC11.SA",
"TRXF11.SA",
"TRXB11.SA",
"URPR11.SA",
"VVCR11.SA",
"VVRI11.SA",
"VGIR11.SA",
"VGIP11.SA",
"VGII11.SA",
"VGHF11.SA",
"VGRI11.SA",
"BLMC11.SA",
"BLMO11.SA",
"RVBI11.SA",
"BLMR11.SA",
"FLFL11.SA",
"VCJR11.SA",
"VCRR11.SA",
"VSLH11.SA",
"VCRI11.SA",
"VIUR11.SA",
"VIFI11.SA",
"VILG11.SA",
"VINO11.SA",
"VISC11.SA",
"VOTS11.SA",
"WSEC11.SA",
"WHGR11.SA",
"XPCM11.SA",
"XPCI11.SA",
"XPIN11.SA",
"XPLG11.SA",
"XPML11.SA",
"XPPR11.SA",
"XPSF11.SA",
"YUFI11.SA",
"ZAGH11.SA",
"ZAVC11.SA",
"ZAVI11.SA",
]
LISTA_BDRS = [
    "ABUD34.SA",
"ABTT34.SA",
"ABBV34.SA",
"A1AP34.SA",
"A1EG34.SA",
"A1ES34.SA",
"A1FL34.SA",
"A1GI34.SA",
"A1PD34.SA",
"A1LB34.SA",
"A1RE34.SA",
"BABA34.SA",
"A1GN34.SA",
"A1LL34.SA",
"A1EN34.SA",
"A1TT34.SA",
"MOOO34.SA",
"A1CR34.SA",
"A1EE34.SA",
"A1EP34.SA",
"T1OW34.SA",
"A1WK34.SA",
"A1MP34.SA",
"A1ME34.SA",
"AMGN34.SA",
"A1PH34.SA",
"A1DI34.SA",
"A1OS34.SA",
"A1ON34.SA",
"A1PA34.SA",
"AAPL34.SA",
"A1MT34.SA",
"ARMT34.SA",
"A1DM34.SA",
"AWII34.SA",
"A1JG34.SA",
"ASML34.SA",
"A1SU34.SA",
"A1ZN34.SA",
"A1TM34.SA",
"A1TH34.SA",
"ADPR34.SA",
"A1VB34.SA",
"A1VY34.SA",
"B1KR34.SA",
"B1LL34.SA",
"B1SA34.SA",
"BOAC34.SA",
"B1CS34.SA",
"B1AX34.SA",
"B1BT34.SA",
"B1DX34.SA",
"BBYY34.SA",
"BILB34.SA",
"T1CH34.SA",
"BLAK34.SA",
"BKNG34.SA",
"B1WA34.SA",
"BOXP34.SA",
"B1PP34.SA",
"B1TI34.SA",
"AVGO34.SA",
"B1RF34.SA",
"B1AM34.SA",
"B1FC34.SA",
"C1AB34.SA",
"C1OG34.SA",
"C1PB34.SA",
"C2PT34.SA",
"CNIC34.SA",
"CPRL34.SA",
"CAON34.SA",
"C1AH34.SA",
"C1RR34.SA",
"CRIN34.SA",
"C1BO34.SA",
"C1BS34.SA",
"C1DW34.SA",
"C1NS34.SA",
"C1NP34.SA",
"C1FI34.SA",
"C1HR34.SA",
"C1BL34.SA",
"C1HT34.SA",
"CHDC34.SA",
"C1IC34.SA",
"CINF34.SA",
"C1TA34.SA",
"CSCO34.SA",
"CTGP34.SA",
"C1FG34.SA",
"CLXC34.SA",
"CHME34.SA",
"C1MS34.SA",
"CTSH34.SA",
"CMCS34.SA",
"C1MA34.SA",
"C1AG34.SA",
"E1DI34.SA",
"STZB34.SA",
"C1OO34.SA",
"COPH34.SA",
"G1LW34.SA",
"C1TV34.SA",
"COWC34.SA",
"C1CI34.SA",
"CSXC34.SA",
"C1MI34.SA",
"CVSH34.SA",
"DHER34.SA",
"D1RI34.SA",
"DEEC34.SA",
"D1EL34.SA",
"DEAI34.SA",
"XRAY34.SA",
"DBAG34.SA",
"D1VN34.SA",
"DEOP34.SA",
"F1AN34.SA",
"D1LR34.SA",
"D1FS34.SA",
"DGCO34.SA",
"D1OM34.SA",
"D2PZ34.SA",
"D1OV34.SA",
"D1OW34.SA",
"D1HI34.SA",
"R1DY34.SA",
"D1TE34.SA",
"E1MN34.SA",
"E1TN34.SA",
"EBAY34.SA",
"E1CL34.SA",
"E1CO34.SA",
"E1IX34.SA",
"EAIN34.SA",
"E1MR34.SA",
"E1TR34.SA",
"E1OG34.SA",
"EQIX34.SA",
"E1QN34.SA",
"E1QR34.SA",
"E1RI34.SA",
"E1SS34.SA",
"ELCI34.SA",
"E1VE34.SA",
"E1VR34.SA",
"E1SE34.SA",
"E1XP34.SA",
"E1XR34.SA",
"EXXO34.SA",
"FASL34.SA",
"F1NI34.SA",
"FFTD34.SA",
"F1EC34.SA",
"F1LS34.SA",
"F1MC34.SA",
"FDMO34.SA",
"F1TV34.SA",
"F1BH34.SA",
"FOXC34.SA",
"F2NV34.SA",
"F1RA34.SA",
"FCXO34.SA",
"FMSC34.SA",
"GPSI34.SA",
"G1RM34.SA",
"GEOO34.SA",
"G1MI34.SA",
"GMCO34.SA",
"G1PC34.SA",
"GPRK34.SA",
"GILD34.SA",
"G1SK34.SA",
"G1PI34.SA",
"G1LL34.SA",
"G1FI34.SA",
"GSGI34.SA",
"H1RB34.SA",
"HALI34.SA",
"THGI34.SA",
"H1OG34.SA",
"H1IG34.SA",
"H1AS34.SA",
"H1CA34.SA",
"H1DB34.SA",
"P1EA34.SA",
"H1EI34.SA",
"HSHY34.SA",
"H1ES34.SA",
"H1PE34.SA",
"H1LT34.SA",
"H1FC34.SA",
"HOME34.SA",
"HOND34.SA",
"H1RL34.SA",
"H1ST34.SA",
"ARNC34.SA",
"H1SB34.SA",
"H1TH34.SA",
"H1UM34.SA",
"H1BA34.SA",
"H1II34.SA",
"I1BN34.SA",
"I1EX34.SA",
"I1TW34.SA",
"I1FO34.SA",
"I1RP34.SA",
"ITLC34.SA",
"I1CE34.SA",
"I1HG34.SA",
"I1PC34.SA",
"I1FF34.SA",
"I1PH34.SA",
"INTU34.SA",
"I1VZ34.SA",
"I1RM34.SA",
"J1KH34.SA",
"J1EG34.SA",
"J1BH34.SA",
"JDCO34.SA",
"J1EF34.SA",
"J1CI34.SA",
"JPMC34.SA",
"J1NP34.SA",
"K1BF34.SA",
"K1EL34.SA",
"KMPR34.SA",
"K1EY34.SA",
"K1IM34.SA",
"KMIC34.SA",
"K1LA34.SA",
"K1SS34.SA",
"PHGN34.SA",
"K1RC34.SA",
"K1TC34.SA",
"L1HX34.SA",
"L1CA34.SA",
"L1RC34.SA",
"L1WH34.SA",
"L1VS34.SA",
"L1EG34.SA",
"L1DO34.SA",
"L1EN34.SA",
"LILY34.SA",
"L1NC34.SA",
"L1KQ34.SA",
"L1YG34.SA",
"L1OE34.SA",
"LOWC34.SA",
"L1YB34.SA",
"M1TB34.SA",
"MACY34.SA",
"M1RO34.SA",
"M1PC34.SA",
"M1KT34.SA",
"M1TT34.SA",
"M1MC34.SA",
"M1LM34.SA",
"M1AS34.SA",
"M1KC34.SA",
"MCDC34.SA",
"M1CK34.SA",
"MDTC34.SA",
"MRCK34.SA",
"M1CH34.SA",
"MUTC34.SA",
"MSFT34.SA",
"M1AA34.SA",
"M1UF34.SA",
"M1CB34.SA",
"MDLZ34.SA",
"MCOR34.SA",
"MOSC34.SA",
"M1SI34.SA",
"M1SC34.SA",
"N1DA34.SA",
"N1GG34.SA",
"N1OV34.SA",
"N1WG34.SA",
"N1TA34.SA",
"NETE34.SA",
"N1WL34.SA",
"N1EM34.SA",
"N1WS34.SA",
"N1WS35.SA",
"NEXT34.SA",
"N1IS34.SA",
"NOKI34.SA",
"NMRH34.SA",
"J1WN34.SA",
"N1SC34.SA",
"N1TR34.SA",
"NOCG34.SA",
"N1VS34.SA",
"N1VO34.SA",
"N1RG34.SA",
"N1UE34.SA",
"NVDC34.SA",
"N1XP34.SA",
"OXYP34.SA",
"O1DF34.SA",
"O1MC34.SA",
"O1KE34.SA",
"I1XC34.SA",
"O1TI34.SA",
"P1AC34.SA",
"P1KG34.SA",
"P1HC34.SA",
"P1AY34.SA",
"P1YC34.SA",
"P1NR34.SA",
"P1RG34.SA",
"PFIZ34.SA",
"PGCO34.SA",
"PHMO34.SA",
"P1SX34.SA",
"P1NW34.SA",
"P1IO34.SA",
"PNCS34.SA",
"P1KX34.SA",
"P1PG34.SA",
"P1PL34.SA",
"P1FG34.SA",
"P1LD34.SA",
"P1DT34.SA",
"P1UK34.SA",
"T1LK34.SA",
"P1EG34.SA",
"P1SA34.SA",
"P1HM34.SA",
"P1VH34.SA",
"QCOM34.SA",
"Q1UA34.SA",
"Q1UE34.SA",
"R1LC34.SA",
"R1JF34.SA",
"R1IN34.SA",
"R1EG34.SA",
"R1FC34.SA",
"R1EL34.SA",
"R1SG34.SA",
"R1MD34.SA",
"RIOT34.SA",
"R1HI34.SA",
"R1OK34.SA",
"R1OL34.SA",
"R1OP34.SA",
"ROST34.SA",
"R1YA34.SA",
"SPGI34.SA",
"SSFO34.SA",
"BCSA34.SA",
"SAPP34.SA",
"S1BA34.SA",
"SCHW34.SA",
"S1TX34.SA",
"S1EA34.SA",
"S1RE34.SA",
"S1BS34.SA",
"SIMN34.SA",
"SRXM34.SA",
"S1KM34.SA",
"S1SL34.SA",
"S1LG34.SA",
"S1NN34.SA",
"S1NA34.SA",
"SNEC34.SA",
"S1OU34.SA",
"S1SN34.SA",
"S1WK34.SA",
"S1TT34.SA",
"S1TE34.SA",
"STMN34.SA",
"S1YK34.SA",
"S1MF34.SA",
"S1YM34.SA",
"S1YF34.SA",
"S1YY34.SA",
"T1RO34.SA",
"TSMC34.SA",
"TAKP34.SA",
"TPRY34.SA",
"T1EL34.SA",
"T1EC34.SA",
"T1FX34.SA",
"TLNC34.SA",
"T2PX34.SA",
"T1SS34.SA",
"TXSA34.SA",
"T1XT34.SA",
"S1JM34.SA",
"P1GR34.SA",
"S1HW34.SA",
"T1SO34.SA",
"TMOS34.SA",
"TJXC34.SA",
"T1MU34.SA",
"TMCO34.SA",
"T1SC34.SA",
"T1DG34.SA",
"TRVC34.SA",
"TSNF34.SA",
"UBSG34.SA",
"U1DR34.SA",
"ULEV34.SA",
"UPAC34.SA",
"U1RI34.SA",
"UNHH34.SA",
"U1HS34.SA",
"U1NM34.SA",
"UPSS34.SA",
"USSX34.SA",
"VLOE34.SA",
"VLYB34.SA",
"V1TA34.SA",
"V1RS34.SA",
"VERZ34.SA",
"VFCO34.SA",
"V1IP34.SA",
"V1OD34.SA",
"V1NO34.SA",
"V1MC34.SA",
"W1AB34.SA",
"WALM34.SA",
"WGBA34.SA",
"W1MG34.SA",
"W1MC34.SA",
"W1SO34.SA",
"W1EC34.SA",
"W1BO34.SA",
"WFCO34.SA",
"W1EL34.SA",
"W2ST34.SA",
"WABC34.SA",
"WUNI34.SA",
"W1YC34.SA",
"W1HR34.SA",
"W1MB34.SA",
"W1LT34.SA",
"W1PP34.SA",
"W1RB34.SA",
"G1WW34.SA",
"W1YN34.SA",
"X1EL34.SA",
"X1YL34.SA",
"YUMR34.SA",
"Z1BH34.SA",
"Z1IO34.SA",
"Z1TS34.SA",
"Z1TO34.SA",
"ACNB34.SA",
"AIGB34.SA",
"AXPB34.SA",
"ATTB34.SA",
"BONY34.SA",
"BMYB34.SA",
"DUKB34.SA",
"DDNB34.SA",
"FDXB34.SA",
"FMXB34.SA",
"GDBR34.SA",
"HONB34.SA",
"HPQB34.SA",
"IBMB34.SA",
"JNJB34.SA",
"KMBB34.SA",
"KHCB34.SA",
"LMTB34.SA",
"METB34.SA",
"MSBR34.SA",
"PEPB34.SA",
"SBUB34.SA",
"TGTB34.SA",
"TEXA34.SA",
"VISA34.SA",
"DISB34.SA",
"XRXB34.SA",
"CATP34.SA",
"CHVX34.SA",
"COCA34.SA",
"COLG34.SA",
"MSCD34.SA",
"NIKE34.SA",
"ORCL34.SA",
"RYTT34.SA",
"SLBG34.SA",
"USBC34.SA",
"XPBR31.SA",
"STLA",

]

df_ativos = None
carregamento_em_andamento = False
lock = threading.Lock()  


cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})

# Cache leve com TTL (em memória de processo)
_TTL_CACHE: Dict[str, Tuple[float, Any]] = {}

def cache_get(key: str) -> Any:
    item = _TTL_CACHE.get(key)
    if not item:
        return None
    expires_at, value = item
    if time.time() > expires_at:
        try:
            del _TTL_CACHE[key]
        except Exception:
            pass
        return None
    return value

def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    _TTL_CACHE[key] = (time.time() + ttl_seconds, value)


import threading
import pandas as pd
import yfinance as yf

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

            preco_atual = info.get("currentPrice", 0.0)
            roe_raw = info.get("returnOnEquity", 0.0)
            dividend_yield_api = info.get("dividendYield", 0.0)
            average_volume = info.get("averageVolume", 0)  
            liquidez_diaria = preco_atual * average_volume

            trailing_pe_raw = info.get("trailingPE", float('inf'))
            price_to_book_raw = info.get("priceToBook", float('inf'))

            pl = to_float_or_inf(trailing_pe_raw)
            pvp = to_float_or_inf(price_to_book_raw)

            roe = round(roe_raw * 100, 2) if roe_raw else 0.0
            

            if tipo_ativo == 'FII':

                dividend_yield = round(dividend_yield_api * 100, 2) if dividend_yield_api and dividend_yield_api < 1 else round(dividend_yield_api, 2)
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
        cache_key = f"yf_full:{ticker}"
        cached = cache_get(cache_key)
        if cached is not None:
            info, historico = cached
        else:
            acao = yf.Ticker(ticker)
            print(f"Obtendo informações brutas para {ticker}...")
            info = acao.info
            historico = acao.history(period="max")
            cache_set(cache_key, (info, historico), ttl_seconds=600)

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
    conn = _get_user_db_conn()
    c = conn.cursor()
    if USUARIOS_DB_IS_PG:
        c.execute('''
            CREATE TABLE IF NOT EXISTS usuarios (
                id BIGSERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL,
                pergunta_seguranca TEXT,
                resposta_seguranca_hash TEXT,
                data_cadastro TIMESTAMP NOT NULL
            )
        ''')
    else:
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
    
    conn = _get_user_db_conn()
    c = conn.cursor()
    try:
        if USUARIOS_DB_IS_PG:
            c.execute(
                'INSERT INTO usuarios (nome, username, senha_hash, pergunta_seguranca, resposta_seguranca_hash, data_cadastro) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (username) DO NOTHING',
                (nome, username, senha_hash, pergunta_seguranca, resposta_hash, data_cadastro)
            )
            conn.commit()
            return c.rowcount > 0
        else:
            c.execute('''INSERT INTO usuarios (nome, username, senha_hash, pergunta_seguranca, resposta_seguranca_hash, data_cadastro) VALUES (?, ?, ?, ?, ?, ?)''',
                      (nome, username, senha_hash, pergunta_seguranca, resposta_hash, data_cadastro))
            conn.commit()
            return True
    except Exception:
        # Para SQLite manter compatibilidade com IntegrityError, para PG qualquer exceção não prevista
        try:
            conn.rollback()
        except Exception:
            pass
        return False
    finally:
        conn.close()

def buscar_usuario_por_username(username):
    conn = _get_user_db_conn()
    c = conn.cursor()
    c.execute(_adapt_sql('SELECT id, nome, username, senha_hash, pergunta_seguranca, resposta_seguranca_hash, data_cadastro FROM usuarios WHERE username = ?'), (username,))
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
    
    conn = _get_user_db_conn()
    c = conn.cursor()
    
    try:
        # Atualizar senha
        c.execute(_adapt_sql('UPDATE usuarios SET senha_hash = ? WHERE username = ?'), (nova_senha_hash, username))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao alterar senha: {e}")
        return False
    finally:
        conn.close()

def atualizar_pergunta_seguranca(username, pergunta, resposta):
    """Atualizar pergunta de segurança de um usuário"""
    conn = _get_user_db_conn()
    c = conn.cursor()
    
    try:
        # Hash da nova resposta
        resposta_hash = bcrypt.hashpw(resposta.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        c.execute(_adapt_sql('UPDATE usuarios SET pergunta_seguranca = ?, resposta_seguranca_hash = ? WHERE username = ?'), 
                  (pergunta, resposta_hash, username))
        conn.commit()
        return True
    except Exception as e:
        print(f"Erro ao atualizar pergunta de segurança: {e}")
        return False
    finally:
        conn.close()

def processar_ativos_acoes_com_filtros(roe_min, dy_min, pl_min, pl_max, pvp_max):
    acoes = LISTA_ACOES
    dados = [obter_informacoes(ticker, 'Ação') for ticker in acoes]
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

def processar_ativos_bdrs_com_filtros(roe_min, dy_min, pl_min, pl_max, pvp_max):
    bdrs = LISTA_BDRS
    dados = [obter_informacoes(ticker, 'BDR') for ticker in bdrs]
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
    
    conn = _get_data_conn_for(usuario, "carteira")
    cursor = conn.cursor()
    
    # Tabela de carteira
    if USUARIOS_DB_IS_PG:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS carteira (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                ticker TEXT NOT NULL,
                nome_completo TEXT NOT NULL,
                quantidade DOUBLE PRECISION NOT NULL,
                preco_atual DOUBLE PRECISION NOT NULL,
                valor_total DOUBLE PRECISION NOT NULL,
                data_adicao TIMESTAMP NOT NULL,
                tipo TEXT DEFAULT 'Desconhecido',
                dy DOUBLE PRECISION,
                pl DOUBLE PRECISION,
                pvp DOUBLE PRECISION,
                roe DOUBLE PRECISION
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_carteira_username ON carteira(username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_carteira_username_ticker ON carteira(username, ticker)')
    else:
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
    if USUARIOS_DB_IS_PG:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historico_carteira (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                data TIMESTAMP NOT NULL,
                valor_total DOUBLE PRECISION NOT NULL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_hist_username ON historico_carteira(username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_hist_username_data ON historico_carteira(username, data)')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historico_carteira (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                valor_total REAL NOT NULL
            )
        ''')
    
    # Tabela de movimentações
    if USUARIOS_DB_IS_PG:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS movimentacoes (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                data TIMESTAMP NOT NULL,
                ticker TEXT NOT NULL,
                nome_completo TEXT,
                quantidade DOUBLE PRECISION NOT NULL,
                preco DOUBLE PRECISION NOT NULL,
                tipo TEXT NOT NULL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_mov_username ON movimentacoes(username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_mov_username_data ON movimentacoes(username, data)')
    else:
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
    
    conn.commit()
    conn.close()

def obter_cotacao_dolar():

    try:
        cache_key = "yf_info:BRL=X"
        cached = cache_get(cache_key)
        if cached is not None:
            info = cached
        else:
            info = yf.Ticker("BRL=X").info
            cache_set(cache_key, info, ttl_seconds=600)
        cotacao = info.get("regularMarketPrice")
        return cotacao if cotacao else 5.0
    except:
        return 5.0

def obter_informacoes_ativo(ticker):

    try:
      
        cache_key = f"yf_info:{ticker}"
        cached = cache_get(cache_key)
        if cached is not None:
            info = cached
        else:
            acao = yf.Ticker(ticker)
            info = acao.info
            cache_set(cache_key, info, ttl_seconds=300)
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

def adicionar_ativo_carteira(ticker, quantidade, tipo=None):

    try:
        info = obter_informacoes_ativo(ticker)
        if not info:
            return {"success": False, "message": "Não foi possível obter informações do ativo"}
            
        if tipo:
            info["tipo"] = tipo
            
        valor_total = info["preco_atual"] * quantidade
        data_adicao = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        conn = _get_data_conn_for(usuario, "carteira")
        cursor = conn.cursor()
        
        
        resultado_movimentacao = registrar_movimentacao(data_adicao, info["ticker"], info["nome_completo"], 
                             quantidade, info["preco_atual"], "compra", conn)
        
        if not resultado_movimentacao["success"]:
            conn.close()
            return resultado_movimentacao
        
      
        if USUARIOS_DB_IS_PG:
            cursor.execute(
                'INSERT INTO carteira (username, ticker, nome_completo, quantidade, preco_atual, valor_total, data_adicao, tipo, dy, pl, pvp, roe) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
                (usuario, info["ticker"], info["nome_completo"], quantidade, info["preco_atual"], valor_total, data_adicao, info["tipo"], info["dy"], info["pl"], info["pvp"], info["roe"]) 
            )
        else:
            cursor.execute('''
                INSERT INTO carteira (ticker, nome_completo, quantidade, preco_atual, valor_total, 
                                    data_adicao, tipo, dy, pl, pvp, roe)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (info["ticker"], info["nome_completo"], quantidade, info["preco_atual"], 
                  valor_total, data_adicao, info["tipo"], info["dy"], info["pl"], 
                  info["pvp"], info["roe"]))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Ativo adicionado com sucesso"}
    except Exception as e:
        return {"success": False, "message": f"Erro ao adicionar ativo: {str(e)}"}

def remover_ativo_carteira(id):

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        conn = _get_data_conn_for(usuario, "carteira")
        cursor = conn.cursor()
        
        if USUARIOS_DB_IS_PG:
            cursor.execute('SELECT ticker, nome_completo, quantidade, preco_atual FROM carteira WHERE id = %s AND username = %s', (id, usuario))
        else:
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
        

        if USUARIOS_DB_IS_PG:
            cursor.execute('DELETE FROM carteira WHERE id = %s AND username = %s', (id, usuario))
        else:
            cursor.execute('DELETE FROM carteira WHERE id = ?', (id,))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Ativo removido com sucesso"}
    except Exception as e:
        return {"success": False, "message": f"Erro ao remover ativo: {str(e)}"}

def atualizar_ativo_carteira(id, quantidade):
  
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        conn = _get_data_conn_for(usuario, "carteira")
        cursor = conn.cursor()
        
        if USUARIOS_DB_IS_PG:
            cursor.execute('SELECT ticker, nome_completo, preco_atual FROM carteira WHERE id = %s AND username = %s', (id, usuario))
        else:
            cursor.execute('SELECT ticker, nome_completo, preco_atual FROM carteira WHERE id = ?', (id,))
        ativo = cursor.fetchone()
        
        if not ativo:
            return {"success": False, "message": "Ativo não encontrado"}
            
        valor_total = ativo[2] * quantidade
        
        if USUARIOS_DB_IS_PG:
            cursor.execute('UPDATE carteira SET quantidade = %s, valor_total = %s WHERE id = %s AND username = %s', (quantidade, valor_total, id, usuario))
        else:
            cursor.execute('''
                UPDATE carteira 
                SET quantidade = ?, valor_total = ?
                WHERE id = ?
            ''', (quantidade, valor_total, id))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Ativo atualizado com sucesso"}
    except Exception as e:
        return {"success": False, "message": f"Erro ao atualizar ativo: {str(e)}"}

def obter_carteira():

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}

        conn = _get_data_conn_for(usuario, "carteira")
        cursor = conn.cursor()
        
        if USUARIOS_DB_IS_PG:
            cursor.execute('''
                SELECT id, ticker, nome_completo, quantidade, preco_atual, valor_total,
                       data_adicao, tipo, dy, pl, pvp, roe
                FROM carteira
                WHERE username = %s
                ORDER BY valor_total DESC
            ''', (usuario,))
        else:
            cursor.execute('''
                SELECT id, ticker, nome_completo, quantidade, preco_atual, valor_total,
                       data_adicao, tipo, dy, pl, pvp, roe
                FROM carteira
                ORDER BY valor_total DESC
            ''')
        
        ativos = []
        for row in cursor.fetchall():
            ativos.append({
                "id": row[0],
                "ticker": row[1],
                "nome_completo": row[2],
                "quantidade": row[3],
                "preco_atual": row[4],
                "valor_total": row[5],
                "data_adicao": row[6],
                "tipo": row[7],
                "dy": row[8],
                "pl": row[9],
                "pvp": row[10],
                "roe": row[11]
            })
        
        conn.close()
        return ativos
    except Exception as e:
        print(f"Erro ao obter carteira: {e}")
        return []

def registrar_movimentacao(data, ticker, nome_completo, quantidade, preco, tipo, conn=None):

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"success": False, "message": "Usuário não autenticado"}


        if conn is None:
            conn = _get_data_conn_for(usuario, "carteira")
            should_close = True
        else:
            should_close = False
            
        cursor = conn.cursor()
        
        # Criar tabela se não existir (sempre)
        if USUARIOS_DB_IS_PG:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS movimentacoes (
                    id BIGSERIAL PRIMARY KEY,
                    username TEXT NOT NULL,
                    data TIMESTAMP NOT NULL,
                    ticker TEXT NOT NULL,
                    nome_completo TEXT,
                    quantidade DOUBLE PRECISION NOT NULL,
                    preco DOUBLE PRECISION NOT NULL,
                    tipo TEXT NOT NULL
                )
            ''')
        else:
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
        
        # Inserir movimentação
        if USUARIOS_DB_IS_PG:
            cursor.execute('INSERT INTO movimentacoes (username, data, ticker, nome_completo, quantidade, preco, tipo) VALUES (%s, %s, %s, %s, %s, %s, %s)', (usuario, data, ticker, nome_completo, quantidade, preco, tipo))
        else:
            cursor.execute('''
                INSERT INTO movimentacoes (data, ticker, nome_completo, quantidade, preco, tipo)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (data, ticker, nome_completo, quantidade, preco, tipo))
        
        if should_close:
            conn.commit()
            conn.close()
        
        return {"success": True, "message": "Movimentação registrada com sucesso"}
    except Exception as e:
        if should_close and conn:
            conn.close()
        return {"success": False, "message": f"Erro ao registrar movimentação: {str(e)}"}

def obter_movimentacoes(mes=None, ano=None):

    try:
        usuario = get_usuario_atual()
        if not usuario:
            return []

        conn = _get_data_conn_for(usuario, "carteira")
        cursor = conn.cursor()
        
        if USUARIOS_DB_IS_PG:
            if mes and ano:
                cursor.execute('SELECT id, data, ticker, nome_completo, quantidade, preco, tipo FROM movimentacoes WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s ORDER BY data DESC', (usuario, int(mes), int(ano)))
            elif ano:
                cursor.execute('SELECT id, data, ticker, nome_completo, quantidade, preco, tipo FROM movimentacoes WHERE username = %s AND EXTRACT(YEAR FROM data) = %s ORDER BY data DESC', (usuario, int(ano)))
            else:
                cursor.execute('SELECT id, data, ticker, nome_completo, quantidade, preco, tipo FROM movimentacoes WHERE username = %s ORDER BY data DESC', (usuario,))
        else:
            query = 'SELECT * FROM movimentacoes'
            params = []
            if mes and ano:
                mes_str = f"{mes:02d}"
                query += ' WHERE data LIKE ?'
                params = [f"%{ano}-{mes_str}%"]
            elif ano:
                query += ' WHERE data LIKE ?'
                params = [f"%{ano}%"]
            query += ' ORDER BY data DESC'
            cursor.execute(query, params)
        
        movimentacoes = []
        for row in cursor.fetchall():
            movimentacoes.append({
                "id": row[0],
                "data": row[1],
                "ticker": row[2],
                "nome_completo": row[3],
                "quantidade": row[4],
                "preco": row[5],
                "tipo": row[6]
            })
        
        conn.close()
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
            
        conn = _get_data_conn_for(usuario, "carteira")
        cursor = conn.cursor()
        
        if USUARIOS_DB_IS_PG:
            cursor.execute("""
                SELECT data, ticker, quantidade, preco, tipo 
                FROM movimentacoes 
                WHERE username = %s
                ORDER BY data ASC
            """, (usuario,))
            movimentacoes = cursor.fetchall()
        else:
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
            
            # Debug da data
            print(f"DEBUG: Processando data '{data_mov}' -> data[:10] = '{data_mov[:10]}'")
            
            # Atualizar posições
            if ticker in posicoes:
                posicoes[ticker] += quantidade
            else:
                posicoes[ticker] = quantidade
            
            # Calcular patrimônio total (usando preço de compra como aproximação)
            patrimonio_total = 0
            for ticker_pos, qtd in posicoes.items():
                if qtd > 0:
                    # Usar o preço da última compra como aproximação
                    patrimonio_total += qtd * preco
            
            # Adicionar ao histórico
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
        
        conn.close()
        return historico
        
    except Exception as e:
        print(f"Erro ao obter histórico da carteira: {e}")
        import traceback
        traceback.print_exc()
        return []


def _month_end(dt: datetime) -> datetime:
    return ((dt.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1))


def _gerar_pontos_tempo(_: str, data_inicio: datetime, data_fim: datetime) -> list:
    # Sempre gerar pontos no fim do mês; agregação é aplicada depois
    pontos = []
    atual = datetime(data_inicio.year, data_inicio.month, 1)
    fim = datetime(data_fim.year, data_fim.month, 1)
    while atual <= fim:
        pontos.append(_month_end(atual))
        atual = (atual.replace(day=28) + timedelta(days=4)).replace(day=1)
    return pontos


def obter_historico_carteira_comparado(agregacao: str = 'mensal'):
    """Calcula evolução patrimonial real por agregação e séries comparativas (rebased=100)."""
    try:
        usuario = get_usuario_atual()
        if not usuario:
            return {"datas": [], "carteira": [], "ibov": [], "ivvb11": [], "ifix": [], "ipca": []}

        conn = _get_data_conn_for(usuario, "carteira")
        cursor = conn.cursor()
        if USUARIOS_DB_IS_PG:
            cursor.execute("""
                SELECT data, ticker, quantidade, preco, tipo 
                FROM movimentacoes 
                WHERE username = %s
                ORDER BY data ASC
            """, (usuario,))
            movimentos = cursor.fetchall()
        else:
            cursor.execute("""
                SELECT data, ticker, quantidade, preco, tipo 
                FROM movimentacoes 
                ORDER BY data ASC
            """)
            movimentos = cursor.fetchall()
        conn.close()

        if not movimentos:
            return {"datas": [], "carteira": [], "ibov": [], "ivvb11": [], "ifix": [], "ipca": []}

        # Preparar datas
        datas_mov = [datetime.strptime(m[0][:10], '%Y-%m-%d') for m in movimentos]
        data_ini = min(datas_mov)
        data_fim = datetime.now()
        # Sempre gere pontos mensais; a janela será aplicada depois
        pontos = _gerar_pontos_tempo('mensal', data_ini, data_fim)

        # Tickers e histórico de preços
        tickers = sorted(list({m[1] for m in movimentos}))
        ticker_to_hist = {}
        for tk in tickers:
            try:
                cache_key = f"yf_hist:{tk}:{data_ini.date()}:{data_fim.date()}"
                hist = cache_get(cache_key)
                if hist is None:
                    yf_ticker = yf.Ticker(tk)
                    hist = yf_ticker.history(start=data_ini - timedelta(days=5), end=data_fim + timedelta(days=5))
                    cache_set(cache_key, hist, ttl_seconds=1800)
                
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
            datas_labels.append(pt.strftime('%Y-%m'))

      
        indices_map = {
            'ibov': ['^BVSP', 'BOVA11.SA'],
            'ivvb11': ['IVVB11.SA'],
            'ifix': ['^IFIX', 'XFIX11.SA'],
            'ipca': ['^IPCA']
        }
        indices_vals = {k: [] for k in indices_map.keys()}
        for key, candidates in indices_map.items():
            hist = None
            for cand in candidates:
                try:
                    cache_key = f"yf_hist:{cand}:{data_ini.date()}:{data_fim.date()}"
                    h = cache_get(cache_key)
                    if h is None:
                        h = yf.Ticker(cand).history(start=data_ini - timedelta(days=5), end=data_fim + timedelta(days=5))
                        cache_set(cache_key, h, ttl_seconds=1800)
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


        def rebase(series):
            vals = [v for v in series if v is not None and v > 0]
            if not vals:
                return [None for _ in series]
            base = vals[0]
            return [ (v / base * 100.0) if (v is not None and v > 0) else None for v in series ]


        def reduce_by_granularity(labels, series_dict, gran):
            if gran in ('mensal', 'maximo'):
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
                    y, m = lab.split('-')
                    m_int = int(m)
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
            'ipca': ipca_series if ipca_series else [None for _ in datas_labels]
        }
        datas_labels, series_dict = reduce_by_granularity(datas_labels, series_dict, agregacao)


        carteira_rebased = rebase(series_dict['carteira'])
        ibov_rebased = rebase(series_dict['ibov'])
        ivvb_rebased = rebase(series_dict['ivvb11'])
        ifix_rebased = rebase(series_dict['ifix'])
        ipca_rebased = rebase(series_dict['ipca']) if series_dict['ipca'] else [None for _ in datas_labels]

        return {
            "datas": datas_labels,
            "carteira": carteira_rebased,
            "ibov": ibov_rebased,
            "ivvb11": ivvb_rebased,
            "ifix": ifix_rebased,
            "ipca": ipca_rebased,
            "carteira_valor": series_dict['carteira'],
        }
    except Exception as e:
        print(f"Erro em obter_historico_carteira_comparado: {e}")
        return {"datas": [], "carteira": [], "ibov": [], "ivvb11": [], "ifix": [], "ipca": [], "carteira_valor": []}




def init_controle_db(usuario=None):

    if not usuario:
        usuario = get_usuario_atual()
        if not usuario:
            raise ValueError("Usuário não especificado")
    
    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    

    if USUARIOS_DB_IS_PG:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS receitas (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                nome TEXT NOT NULL,
                valor DOUBLE PRECISION NOT NULL,
                data DATE NOT NULL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_receitas_username ON receitas(username)')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS receitas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                valor REAL NOT NULL,
                data TEXT NOT NULL
            )
        ''')
    

    if USUARIOS_DB_IS_PG:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cartoes (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                nome TEXT NOT NULL,
                valor DOUBLE PRECISION NOT NULL,
                pago TEXT NOT NULL,
                data DATE NOT NULL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cartoes_username ON cartoes(username)')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cartoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                valor REAL NOT NULL,
                pago TEXT NOT NULL,
                data TEXT NOT NULL
            )
        ''')
    

    if USUARIOS_DB_IS_PG:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS outros_gastos (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                nome TEXT NOT NULL,
                valor DOUBLE PRECISION NOT NULL,
                data DATE NOT NULL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_outros_username ON outros_gastos(username)')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS outros_gastos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                valor REAL NOT NULL,
                data TEXT NOT NULL
            )
        ''')
    
    conn.commit()
    conn.close()

def salvar_receita(nome, valor):
    """Salvar uma nova receita"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    data_atual = datetime.now().strftime('%Y-%m-%d')
    if USUARIOS_DB_IS_PG:
        cursor.execute('INSERT INTO receitas (username, nome, valor, data) VALUES (%s, %s, %s, %s)', (usuario, nome, valor, data_atual))
    else:
        cursor.execute('INSERT INTO receitas (nome, valor, data) VALUES (?, ?, ?)', (nome, valor, data_atual))
    conn.commit()
    conn.close()

def atualizar_receita(id_registro, nome, valor):
    """Atualizar uma receita existente"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('UPDATE receitas SET nome = %s, valor = %s WHERE id = %s AND username = %s', (nome, valor, id_registro, usuario))
    else:
        cursor.execute('UPDATE receitas SET nome = ?, valor = ? WHERE id = ?', (nome, valor, id_registro))
    conn.commit()
    conn.close()

def remover_receita(id_registro):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('DELETE FROM receitas WHERE id = %s AND username = %s', (id_registro, usuario))
    else:
        cursor.execute('DELETE FROM receitas WHERE id = ?', (id_registro,))
    conn.commit()
    conn.close()

def carregar_receitas_mes_ano(mes, ano, pessoa=None):
    
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    
    # Formatar mês com zero à esquerda se necessário
    mes_formatado = f"{int(mes):02d}"
    
    if pessoa:
        query = '''
            SELECT * FROM receitas 
            WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ? AND nome = ?
            ORDER BY data DESC
        '''
        if USUARIOS_DB_IS_PG:
            query = '''
                SELECT id, nome, valor, data FROM receitas
                WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s AND nome = %s
                ORDER BY data DESC
            '''
            df = pd.read_sql_query(query, conn, params=(usuario, int(mes), int(ano), pessoa))
        else:
            df = pd.read_sql_query(query, conn, params=(mes_formatado, ano, pessoa))
    else:
        if USUARIOS_DB_IS_PG:
            query = '''
                SELECT id, nome, valor, data FROM receitas
                WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s
                ORDER BY data DESC
            '''
            df = pd.read_sql_query(query, conn, params=(usuario, int(mes), int(ano)))
        else:
            query = '''
                SELECT * FROM receitas 
                WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?
                ORDER BY data DESC
            '''
            df = pd.read_sql_query(query, conn, params=(mes_formatado, ano))
    
    conn.close()
    return df

def adicionar_cartao(nome, valor, pago):
    """Adicionar um novo cartão"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    data_atual = datetime.now().strftime('%Y-%m-%d')
    if USUARIOS_DB_IS_PG:
        cursor.execute('INSERT INTO cartoes (username, nome, valor, pago, data) VALUES (%s, %s, %s, %s, %s)', (usuario, nome, valor, pago, data_atual))
    else:
        cursor.execute('INSERT INTO cartoes (nome, valor, pago, data) VALUES (?, ?, ?, ?)', 
                      (nome, valor, pago, data_atual))
    conn.commit()
    conn.close()

def carregar_cartoes_mes_ano(mes, ano):
    """Carregar cartões de um mês/ano específico"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    
    # Formatar mês com zero à esquerda se necessário
    mes_formatado = f"{int(mes):02d}"
    
    if USUARIOS_DB_IS_PG:
        query = '''
            SELECT id, nome, valor, pago, data FROM cartoes
            WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s
            ORDER BY data DESC
        '''
        df = pd.read_sql_query(query, conn, params=(usuario, int(mes), int(ano)))
    else:
        query = '''
            SELECT * FROM cartoes 
            WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?
            ORDER BY data DESC
        '''
        df = pd.read_sql_query(query, conn, params=(mes_formatado, ano))
    conn.close()
    return df.to_dict('records')

def atualizar_cartao(id_registro, nome, valor, pago):
    """Atualizar um cartão existente"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('UPDATE cartoes SET nome = %s, valor = %s, pago = %s WHERE id = %s AND username = %s', (nome, valor, pago, id_registro, usuario))
    else:
        cursor.execute('UPDATE cartoes SET nome = ?, valor = ?, pago = ? WHERE id = ?', 
                      (nome, valor, pago, id_registro))
    conn.commit()
    conn.close()

def remover_cartao(id_registro):
    """Remover um cartão"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('DELETE FROM cartoes WHERE id = %s AND username = %s', (id_registro, usuario))
    else:
        cursor.execute('DELETE FROM cartoes WHERE id = ?', (id_registro,))
    conn.commit()
    conn.close()

def adicionar_outro_gasto(nome, valor):
    """Adicionar outro gasto"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    data_atual = datetime.now().strftime('%Y-%m-%d')
    if USUARIOS_DB_IS_PG:
        cursor.execute('INSERT INTO outros_gastos (username, nome, valor, data) VALUES (%s, %s, %s, %s)', (usuario, nome, valor, data_atual))
    else:
        cursor.execute('INSERT INTO outros_gastos (nome, valor, data) VALUES (?, ?, ?)', 
                      (nome, valor, data_atual))
    conn.commit()
    conn.close()

def carregar_outros_mes_ano(mes, ano):
    """Carregar outros gastos de um mês/ano específico"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    
    # Formatar mês com zero à esquerda se necessário
    mes_formatado = f"{int(mes):02d}"
    
    if USUARIOS_DB_IS_PG:
        query = '''
            SELECT id, nome, valor, data FROM outros_gastos
            WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s
            ORDER BY data DESC
        '''
        df = pd.read_sql_query(query, conn, params=(usuario, int(mes), int(ano)))
    else:
        query = '''
            SELECT * FROM outros_gastos 
            WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?
            ORDER BY data DESC
        '''
        df = pd.read_sql_query(query, conn, params=(mes_formatado, ano))
    conn.close()
    return df.to_dict('records')

def atualizar_outro_gasto(id_registro, nome, valor):
    """Atualizar outro gasto"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('UPDATE outros_gastos SET nome = %s, valor = %s WHERE id = %s AND username = %s', (nome, valor, id_registro, usuario))
    else:
        cursor.execute('UPDATE outros_gastos SET nome = ?, valor = ? WHERE id = ?', 
                      (nome, valor, id_registro))
    conn.commit()
    conn.close()

def remover_outro_gasto(id_registro):
    """Remover outro gasto"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('DELETE FROM outros_gastos WHERE id = %s AND username = %s', (id_registro, usuario))
    else:
        cursor.execute('DELETE FROM outros_gastos WHERE id = ?', (id_registro,))
    conn.commit()
    conn.close()



# ==================== FUNÇÕES DE MARMITAS ====================

def init_marmitas_db(usuario=None):
    """Inicializar banco de dados de marmitas para um usuário específico"""
    if not usuario:
        usuario = get_usuario_atual()
        if not usuario:
            raise ValueError("Usuário não especificado")
    
    conn = _get_data_conn_for(usuario, "marmitas")
    cursor = conn.cursor()
    
    if USUARIOS_DB_IS_PG:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marmitas (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                data DATE NOT NULL,
                valor DOUBLE PRECISION NOT NULL,
                comprou INTEGER NOT NULL
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marmitas_username ON marmitas(username)')
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marmitas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                valor REAL NOT NULL,
                comprou INTEGER NOT NULL
            )
        ''')
    
    conn.commit()
    conn.close()

def consultar_marmitas(mes=None, ano=None):
    """Consultar marmitas com filtros opcionais"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "marmitas")
    cursor = conn.cursor()
    
    if USUARIOS_DB_IS_PG:
        if mes and ano:
            cursor.execute('SELECT id, data, valor, comprou FROM marmitas WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s ORDER BY data DESC', (usuario, int(mes), int(ano)))
        else:
            cursor.execute('SELECT id, data, valor, comprou FROM marmitas WHERE username = %s ORDER BY data DESC', (usuario,))
    else:
        if mes and ano:
            mes_formatado = f"{int(mes):02d}"
            query = '''
                SELECT * FROM marmitas 
                WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?
                ORDER BY data DESC
            '''
            cursor.execute(query, (mes_formatado, ano))
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

    conn = _get_data_conn_for(usuario, "marmitas")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('INSERT INTO marmitas (username, data, valor, comprou) VALUES (%s, %s, %s, %s)', (usuario, data, valor, comprou))
    else:
        cursor.execute('INSERT INTO marmitas (data, valor, comprou) VALUES (?, ?, ?)', 
                      (data, valor, comprou))
    conn.commit()
    conn.close()

def remover_marmita(id_registro):
    """Remover marmita"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "marmitas")
    cursor = conn.cursor()
    if USUARIOS_DB_IS_PG:
        cursor.execute('DELETE FROM marmitas WHERE id = %s AND username = %s', (id_registro, usuario))
    else:
        cursor.execute('DELETE FROM marmitas WHERE id = ?', (id_registro,))
    conn.commit()
    conn.close()

def gastos_mensais(periodo='6m'):
    """Calcular gastos mensais de marmitas"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "marmitas")
    
    # Calcular data de início baseada no período
    hoje = datetime.now()
    if periodo.endswith('m'):
        meses = int(periodo.replace('m', ''))
        data_inicio = hoje - timedelta(days=30*meses)
    elif periodo.endswith('y'):
        anos = int(periodo.replace('y', ''))
        data_inicio = hoje - timedelta(days=365*anos)
    else:
        data_inicio = hoje - timedelta(days=180)  # Default 6 meses
    
    if USUARIOS_DB_IS_PG:
        query = '''
            SELECT 
                TO_CHAR(data, 'YYYY-MM') as AnoMes,
                SUM(valor) as valor
            FROM marmitas 
            WHERE username = %s AND data >= %s
            GROUP BY 1
            ORDER BY 1 DESC
        '''
        df = pd.read_sql_query(query, conn, params=(usuario, data_inicio.strftime('%Y-%m-%d')))
    else:
        query = '''
            SELECT 
                strftime('%Y-%m', data) as AnoMes,
                SUM(valor) as valor
            FROM marmitas 
            WHERE data >= ?
            GROUP BY AnoMes
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
    """Calcular saldo de um mês/ano específico"""
    usuario = get_usuario_atual()
    if not usuario:
        return {"success": False, "message": "Usuário não autenticado"}

    conn = _get_data_conn_for(usuario, "controle")
    
    # Formatar mês com zero à esquerda se necessário
    mes_formatado = f"{int(mes):02d}"
  
    if USUARIOS_DB_IS_PG:
        query_receitas = '''
            SELECT COALESCE(SUM(valor),0) as total FROM receitas 
            WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s
        '''
        df_receitas = pd.read_sql_query(query_receitas, conn, params=(usuario, int(mes), int(ano)))
    else:
        query_receitas = '''
            SELECT SUM(valor) as total FROM receitas 
            WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?
        '''
        df_receitas = pd.read_sql_query(query_receitas, conn, params=(mes_formatado, ano))
    

    if USUARIOS_DB_IS_PG:
        query_cartoes = '''
            SELECT id, nome, valor, pago, data FROM cartoes 
            WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s
        '''
        df_cartoes = pd.read_sql_query(query_cartoes, conn, params=(usuario, int(mes), int(ano)))
    else:
        query_cartoes = '''
            SELECT * FROM cartoes 
            WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?
        '''
        df_cartoes = pd.read_sql_query(query_cartoes, conn, params=(mes_formatado, ano))
    

    if USUARIOS_DB_IS_PG:
        query_outros = '''
            SELECT id, nome, valor, data FROM outros_gastos 
            WHERE username = %s AND EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s
        '''
        df_outros = pd.read_sql_query(query_outros, conn, params=(usuario, int(mes), int(ano)))
    else:
        query_outros = '''
            SELECT * FROM outros_gastos 
            WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?
        '''
        df_outros = pd.read_sql_query(query_outros, conn, params=(mes_formatado, ano))
    
    conn.close()
    
    total_receitas = df_receitas['total'].iloc[0] if not df_receitas.empty and df_receitas['total'].iloc[0] is not None else 0
    

    if not df_cartoes.empty:
        df_cartoes_pagos = df_cartoes[df_cartoes['pago'] == 'Sim']
        total_cartoes = df_cartoes_pagos['valor'].sum() if not df_cartoes_pagos.empty else 0
    else:
        total_cartoes = 0
    
    total_outros = df_outros['valor'].sum() if not df_outros.empty else 0
    total_despesas = total_cartoes + total_outros
    
    return total_receitas - total_despesas

# ==================== FUNÇÕES DE ASSISTENTE IA ====================