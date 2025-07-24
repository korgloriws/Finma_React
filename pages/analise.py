from dash import html, dcc, Input, Output
import dash_bootstrap_components as dbc
import pandas as pd

from . import lista
from . import graficos
from models import carregar_ativos

def cards_resumo(df_ativos):
    qtd = len(df_ativos)
    media_dy = df_ativos['dividend_yield'].mean() if 'dividend_yield' in df_ativos else 0
    media_pl = df_ativos['pl'].mean() if 'pl' in df_ativos else 0
    media_roe = df_ativos['roe'].mean() if 'roe' in df_ativos else 0
    maior_dy = df_ativos.loc[df_ativos['dividend_yield'].idxmax(), 'dividend_yield'] if 'dividend_yield' in df_ativos and not df_ativos['dividend_yield'].isnull().all() else 0
    menor_pl = df_ativos.loc[df_ativos['pl'].idxmin(), 'pl'] if 'pl' in df_ativos and not df_ativos['pl'].isnull().all() else 0
    melhor_roe = df_ativos.loc[df_ativos['roe'].idxmax(), 'roe'] if 'roe' in df_ativos and not df_ativos['roe'].isnull().all() else 0
    

    def extract_ticker(ticker_value):
        if isinstance(ticker_value, str) and '<div' in ticker_value:

            import re
            match = re.search(r'<span[^>]*>([^<]+)</span>', ticker_value)
            if match:
                return match.group(1)
        return ticker_value
    
    ativo_maior_dy = extract_ticker(df_ativos.loc[df_ativos['dividend_yield'].idxmax(), 'ticker']) if 'dividend_yield' in df_ativos and not df_ativos['dividend_yield'].isnull().all() else '-'
    ativo_menor_pl = extract_ticker(df_ativos.loc[df_ativos['pl'].idxmin(), 'ticker']) if 'pl' in df_ativos and not df_ativos['pl'].isnull().all() else '-'
    ativo_melhor_roe = extract_ticker(df_ativos.loc[df_ativos['roe'].idxmax(), 'ticker']) if 'roe' in df_ativos and not df_ativos['roe'].isnull().all() else '-'
    
    return dbc.Row([
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H6("Ativos analisados", className="text-muted"),
                html.H4(f"{qtd}", className="fw-bold text-primary")
            ])
        ], className="mb-2 shadow-sm")),
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H6("Média DY", className="text-muted"),
                html.H4(f"{media_dy:.2f}%", className="fw-bold text-info")
            ])
        ], className="mb-2 shadow-sm")),
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H6("Média P/L", className="text-muted"),
                html.H4(f"{media_pl:.2f}", className="fw-bold text-warning")
            ])
        ], className="mb-2 shadow-sm")),
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H6("Média ROE", className="text-muted"),
                html.H4(f"{media_roe:.2f}%", className="fw-bold text-secondary")
            ])
        ], className="mb-2 shadow-sm")),
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H6("Maior DY", className="text-muted"),
                html.H4(f"{maior_dy:.2f}%", className="fw-bold text-success"),
                html.P(f"{ativo_maior_dy}", className="small text-muted mb-0")
            ])
        ], className="mb-2 shadow-sm")),
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H6("Menor P/L", className="text-muted"),
                html.H4(f"{menor_pl:.2f}", className="fw-bold text-danger"),
                html.P(f"{ativo_menor_pl}", className="small text-muted mb-0")
            ])
        ], className="mb-2 shadow-sm")),
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H6("Melhor ROE", className="text-muted"),
                html.H4(f"{melhor_roe:.2f}%", className="fw-bold text-primary"),
                html.P(f"{ativo_melhor_roe}", className="small text-muted mb-0")
            ])
        ], className="mb-2 shadow-sm")),
    ], className="g-2 mb-4")

def layout():
    return html.Div([
        html.H2("Análise de Oportunidades", className="my-3 text-center"),
        html.Div(id="cards-resumo-analise", className="mb-4"),
        dbc.Tabs(
            id="tabs-analise",
            active_tab="aba-lista",
            children=[
                dbc.Tab(label="📋 Lista", tab_id="aba-lista"),
                dbc.Tab(label="📊 Gráficos", tab_id="aba-graficos"),
            ]
        ),
        html.Div(id="conteudo-aba-selecionada", className="mt-4")
    ])

def register_callbacks(app):
    @app.callback(
        Output("conteudo-aba-selecionada", "children"),
        Output("cards-resumo-analise", "children"),
        Input("tabs-analise", "active_tab"),
        Input("ativos-filtrados-store", "data")
    )
    def alternar_abas(aba_selecionada, dados):
        df_ativos = pd.DataFrame(dados) if dados else None
        cards = cards_resumo(df_ativos) if df_ativos is not None else None
        if aba_selecionada == "aba-lista":

            return lista.layout(df_ativos), cards
        elif aba_selecionada == "aba-graficos":
            if not dados:
                return dbc.Alert("Aplique um filtro para ver os ativos.", color="info"), None
            return graficos.layout(df_ativos), cards
        else:
            return dbc.Alert("Aba desconhecida", color="danger"), cards
