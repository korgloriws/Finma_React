from dash import html, dcc
import dash_bootstrap_components as dbc
import pandas as pd
import plotly.express as px
from dash.dependencies import Input, Output
from complete_b3_logos_mapping import get_logo_url
from utils import create_clickable_ticker
import re

def extract_ticker_clean(ticker_value):

    if isinstance(ticker_value, str) and '<div' in ticker_value:

        match = re.search(r'<span[^>]*>([^<]+)</span>', ticker_value)
        if match:
            return match.group(1)
    return ticker_value

def clean_ticker_column(df):

    if 'ticker' in df.columns:
        df['ticker_clean'] = df['ticker'].apply(extract_ticker_clean)
    return df

def layout(df_ativos=None):
    filtro_tipo = dcc.Dropdown(
        id='rankers-filtro-tipo',
        options=[],
        placeholder='Filtrar por tipo',
        clearable=True,
        style={'marginBottom': '18px', 'width': '300px'}
    )
    return html.Div([
        html.H2("Rankings de Oportunidades", className="text-center my-4 fw-bold text-primary"),
        html.Div(filtro_tipo, className="d-flex justify-content-center"),
        dbc.Row([
            dbc.Col([
                dbc.Card([
                    dbc.CardHeader([
                        html.I(className="bi bi-bar-chart-fill me-2", style={"color": "#6610f2", "fontSize": "1.5rem"}),
                        "Top 7 ROE"
                    ], className="card-header-rankers fw-bold text-primary"),
                    dbc.CardBody([
                        dcc.Graph(id='rankers-bar-roe', config={'displayModeBar': False}),
                        dbc.ListGroup(id='top-roe', className="mt-2")
                    ])
                ], className="mb-4 shadow-sm animate__animated animate__fadeInUp")
            ], width=6),
            dbc.Col([
                dbc.Card([
                    dbc.CardHeader([
                        html.I(className="bi bi-cash-coin me-2", style={"color": "#198754", "fontSize": "1.5rem"}),
                        "Top 7 Dividend Yield"
                    ], className="card-header-rankers fw-bold text-success"),
                    dbc.CardBody([
                        dcc.Graph(id='rankers-bar-dy', config={'displayModeBar': False}),
                        dbc.ListGroup(id='top-dividend-yield', className="mt-2")
                    ])
                ], className="mb-4 shadow-sm animate__animated animate__fadeInUp")
            ], width=6)
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Card([
                    dbc.CardHeader([
                        html.I(className="bi bi-graph-up-arrow me-2", style={"color": "#ffc107", "fontSize": "1.5rem"}),
                        "Top 7 P/L"
                    ], className="card-header-rankers fw-bold text-warning"),
                    dbc.CardBody([
                        dcc.Graph(id='rankers-bar-pl', config={'displayModeBar': False}),
                        dbc.ListGroup(id='top-pl', className="mt-2")
                    ])
                ], className="mb-4 shadow-sm animate__animated animate__fadeInUp")
            ], width=6),
            dbc.Col([
                dbc.Card([
                    dbc.CardHeader([
                        html.I(className="bi bi-pie-chart-fill me-2", style={"color": "#fd7e14", "fontSize": "1.5rem"}),
                        "Top 7 P/VP"
                    ], className="card-header-rankers fw-bold text-danger"),
                    dbc.CardBody([
                        dcc.Graph(id='rankers-bar-pvp', config={'displayModeBar': False}),
                        dbc.ListGroup(id='top-pvp', className="mt-2")
                    ])
                ], className="mb-4 shadow-sm animate__animated animate__fadeInUp")
            ], width=6)
        ])
    ], className="container-fluid animate__animated animate__fadeIn")

def register_callbacks(app):
    @app.callback(
        [
            Output('top-roe', 'children'),
            Output('top-dividend-yield', 'children'),
            Output('top-pl', 'children'),
            Output('top-pvp', 'children'),
            Output('rankers-bar-roe', 'figure'),
            Output('rankers-bar-dy', 'figure'),
            Output('rankers-bar-pl', 'figure'),
            Output('rankers-bar-pvp', 'figure'),
        ],
        [Input("ativos-filtrados-store", "data"), Input('rankers-filtro-tipo', 'value'), Input('switch-darkmode', 'value')]
    )
    def atualizar_rankers(dados, tipo, is_dark):
        if not dados:
            alert = dbc.Alert("Carregando dados...", color="warning")
            fig = px.bar(title="Carregando...")
            return alert, alert, alert, alert, fig, fig, fig, fig
        df_ativos = pd.DataFrame(dados)
        
        # Limpa a coluna ticker se necessário
        df_ativos = clean_ticker_column(df_ativos)
        
        if tipo:
            df_ativos = df_ativos[df_ativos['tipo'] == tipo]
        # Conversão para numérico
        for col in ['roe', 'dividend_yield', 'pl', 'pvp']:
            if col in df_ativos.columns:
                df_ativos[col] = pd.to_numeric(df_ativos[col], errors='coerce')
        template = 'plotly_dark' if is_dark else 'simple_white'
        # ROE
        top_roe = df_ativos.nlargest(7, 'roe')[['ticker_clean', 'nome_completo', 'roe']].dropna().to_dict('records')
        # DY
        top_dividend_yield = df_ativos.nlargest(7, 'dividend_yield')[['ticker_clean', 'nome_completo', 'dividend_yield']].dropna().to_dict('records')
        # P/L
        top_pl = df_ativos.nsmallest(7, 'pl')[['ticker_clean', 'nome_completo', 'pl']].dropna().to_dict('records')
        # P/VP
        top_pvp = df_ativos.nsmallest(7, 'pvp')[['ticker_clean', 'nome_completo', 'pvp']].dropna().to_dict('records')
        def format_item(item, value_key, is_percentage=False, badge_color=None):
            value = item[value_key]
            if is_percentage:
                formatted = f"{value:.2f}%".replace('.', ',')
            else:
                formatted = f"{value:.2f}".replace('.', ',')
            
            # Criar link clicável para o ticker
            ticker_link = create_clickable_ticker(
                item['ticker_clean'], 
                item['nome_completo'], 
                show_logo=True, 
                size="small"
            )
            
            return dbc.ListGroupItem([
                ticker_link,
                dbc.Badge(formatted, color=badge_color or "primary", className="ms-2 fw-bold", style={"fontSize": "1.1rem"})
            ], className="d-flex justify-content-between align-items-center animate__animated animate__fadeInUp")
        # Listas
        top_roe_items = [format_item(item, 'roe', is_percentage=True, badge_color="primary" if i==0 else "secondary") for i, item in enumerate(top_roe)]
        top_dividend_items = [format_item(item, 'dividend_yield', is_percentage=True, badge_color="success" if i==0 else "secondary") for i, item in enumerate(top_dividend_yield)]
        top_pl_items = [format_item(item, 'pl', badge_color="warning" if i==0 else "secondary") for i, item in enumerate(top_pl)]
        top_pvp_items = [format_item(item, 'pvp', badge_color="danger" if i==0 else "secondary") for i, item in enumerate(top_pvp)]
        # Gráficos de barras horizontais
        fig_roe = px.bar(
            top_roe, y='nome_completo', x='roe', orientation='h', text='roe',
            color='roe', color_continuous_scale=px.colors.sequential.Blues, title='Top 7 ROE (%)', template=template
        ) if top_roe else px.bar(title='Top 7 ROE', template=template)
        fig_roe.update_layout(margin=dict(l=10, r=10, t=40, b=10), height=260, font=dict(family='Segoe UI'))
        fig_roe.update_traces(texttemplate='%{x:.2f}%', textposition='outside')
        fig_dy = px.bar(
            top_dividend_yield, y='nome_completo', x='dividend_yield', orientation='h', text='dividend_yield',
            color='dividend_yield', color_continuous_scale=px.colors.sequential.Greens, title='Top 7 Dividend Yield (%)', template=template
        ) if top_dividend_yield else px.bar(title='Top 7 Dividend Yield', template=template)
        fig_dy.update_layout(margin=dict(l=10, r=10, t=40, b=10), height=260, font=dict(family='Segoe UI'))
        fig_dy.update_traces(texttemplate='%{x:.2f}%', textposition='outside')
        fig_pl = px.bar(
            top_pl, y='nome_completo', x='pl', orientation='h', text='pl',
            color='pl', color_continuous_scale=px.colors.sequential.Oranges, title='Top 7 Menor P/L', template=template
        ) if top_pl else px.bar(title='Top 7 Menor P/L', template=template)
        fig_pl.update_layout(margin=dict(l=10, r=10, t=40, b=10), height=260, font=dict(family='Segoe UI'))
        fig_pl.update_traces(texttemplate='%{x:.2f}', textposition='outside')
        fig_pvp = px.bar(
            top_pvp, y='nome_completo', x='pvp', orientation='h', text='pvp',
            color='pvp', color_continuous_scale=px.colors.sequential.Reds, title='Top 7 Menor P/VP', template=template
        ) if top_pvp else px.bar(title='Top 7 Menor P/VP', template=template)
        fig_pvp.update_layout(margin=dict(l=10, r=10, t=40, b=10), height=260, font=dict(family='Segoe UI'))
        fig_pvp.update_traces(texttemplate='%{x:.2f}', textposition='outside')
        return (
            dbc.ListGroup(top_roe_items),
            dbc.ListGroup(top_dividend_items),
            dbc.ListGroup(top_pl_items),
            dbc.ListGroup(top_pvp_items),
            fig_roe, fig_dy, fig_pl, fig_pvp
        )

    @app.callback(
        Output('rankers-filtro-tipo', 'options'),
        Input('ativos-filtrados-store', 'data')
    )
    def atualizar_opcoes_tipo(dados):
        if not dados:
            return []
        df = pd.DataFrame(dados)
        tipos = sorted(df['tipo'].dropna().unique()) if 'tipo' in df else []
        return [{'label': t, 'value': t} for t in tipos]
