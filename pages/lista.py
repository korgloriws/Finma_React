from dash import html, dash_table, Input, Output, dcc, State, ctx, no_update
import dash_bootstrap_components as dbc
import pandas as pd
from models import processar_ativos_acoes_com_filtros, processar_ativos_bdrs_com_filtros, processar_ativos_fiis_com_filtros
from complete_b3_logos_mapping import add_logo_column_to_data
from utils import create_clickable_ticker

def layout(df_ativos=None):

    if isinstance(df_ativos, pd.DataFrame):
        for col in ['roe', 'dividend_yield', 'pl', 'pvp']:
            if col in df_ativos.columns:
                df_ativos[col] = pd.to_numeric(df_ativos[col], errors='coerce')
    tooltips = {
        'dividend_yield': 'Dividend Yield (%)',
        'pl': 'Preço/Lucro',
        'roe': 'Retorno sobre Patrimônio',
        'pvp': 'Preço/Valor Patrimonial',
        'liquidez_diaria': 'Liquidez média diária',
        'volume_medio': 'Volume médio negociado',
        'preco_atual': 'Preço de fechamento mais recente',
    }
    style_table = {
        'overflowX': 'auto',
        'borderRadius': '12px',
        'boxShadow': '0 2px 8px #e0e0e0',
        'backgroundColor': '#fff',
        'marginBottom': '18px',
    }
    style_header = {
        'backgroundColor': '#f8f9fa',
        'fontWeight': 'bold',
        'fontSize': '16px',
        'color': '#007bff',
        'border': 'none',
        'textAlign': 'center',
    }
    style_cell = {
        'textAlign': 'left',
        'fontFamily': 'Segoe UI',
        'fontSize': '15px',
        'padding': '8px',
        'border': 'none',
        'maxWidth': 220,
        'whiteSpace': 'normal',
    }
    style_data_conditional = [
        {'if': {'row_index': 'odd'}, 'backgroundColor': '#f2f2f2'},
        {'if': {'column_id': 'dividend_yield', 'filter_query': '{dividend_yield} > 8'}, 'color': 'green', 'fontWeight': 'bold'},
        {'if': {'column_id': 'pl', 'filter_query': '{pl} < 0'}, 'color': 'red', 'fontWeight': 'bold'},
        {'if': {'column_id': 'roe', 'filter_query': '{roe} > 15'}, 'color': '#007bff', 'fontWeight': 'bold'},
        {'if': {'state': 'active'}, 'backgroundColor': '#e3f2fd', 'border': '1px solid #90caf9'},
    ]
    def filtros_acoes():
        return dbc.Form([
            dbc.Row([
                dbc.Col([dbc.Label('ROE mínimo'), dcc.Input(id='filtro-roe-acoes', type='number', value=10, min=0, step=1, className='form-control')]),
                dbc.Col([dbc.Label('Dividend Yield mínimo'), dcc.Input(id='filtro-dy-acoes', type='number', value=15, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('P/L mínimo'), dcc.Input(id='filtro-plmin-acoes', type='number', value=1, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('P/L máximo'), dcc.Input(id='filtro-plmax-acoes', type='number', value=10, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('P/VP máximo'), dcc.Input(id='filtro-pvp-acoes', type='number', value=2, min=0, step=0.1, className='form-control')]),
            ], className='mb-2'),
            dbc.Button('Buscar', id='btn-buscar-acoes', color='primary', className='mt-2'),
        ], className='mb-3')
    def filtros_bdrs():
        return dbc.Form([
            dbc.Row([
                dbc.Col([dbc.Label('ROE mínimo'), dcc.Input(id='filtro-roe-bdrs', type='number', value=10, min=0, step=1, className='form-control')]),
                dbc.Col([dbc.Label('Dividend Yield mínimo'), dcc.Input(id='filtro-dy-bdrs', type='number', value=3, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('P/L mínimo'), dcc.Input(id='filtro-plmin-bdrs', type='number', value=1, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('P/L máximo'), dcc.Input(id='filtro-plmax-bdrs', type='number', value=10, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('P/VP máximo'), dcc.Input(id='filtro-pvp-bdrs', type='number', value=3, min=0, step=0.1, className='form-control')]),
            ], className='mb-2'),
            dbc.Button('Buscar', id='btn-buscar-bdrs', color='primary', className='mt-2'),
        ], className='mb-3')
    def filtros_fiis():
        return dbc.Form([
            dbc.Row([
                dbc.Col([dbc.Label('Dividend Yield mínimo'), dcc.Input(id='filtro-dymin-fiis', type='number', value=10, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('Dividend Yield máximo'), dcc.Input(id='filtro-dymax-fiis', type='number', value=12, min=0, step=0.1, className='form-control')]),
                dbc.Col([dbc.Label('Liquidez Diária mínima'), dcc.Input(id='filtro-liq-fiis', type='number', value=1000000, min=0, step=1000, className='form-control')]),
            ], className='mb-2'),
            dbc.Button('Buscar', id='btn-buscar-fiis', color='primary', className='mt-2'),
        ], className='mb-3')


    if isinstance(df_ativos, pd.DataFrame) and not df_ativos.empty:
        df_acoes = df_ativos[df_ativos['tipo'] == 'Ação']
        df_bdrs = df_ativos[df_ativos['tipo'] == 'BDR']
        df_fiis = df_ativos[df_ativos['tipo'] == 'FII']
    else:
        df_acoes = []
        df_bdrs = []
        df_fiis = []

    return html.Div([
        html.H2("Lista de Ativos", className="mb-3 mt-2 text-center"),
        dcc.Store(id="dados-ativos-lista"),  
        dbc.Tabs([
            dbc.Tab([
                filtros_acoes(),
                html.Div([
                    dash_table.DataTable(
                        id='tabela-acoes',
                        style_table=style_table,
                        style_header=style_header,
                        style_cell=style_cell,
                        style_data_conditional=style_data_conditional,
                        tooltip_header=tooltips,
                        tooltip_delay=0,
                        tooltip_duration=None,
                        page_size=15,
                        row_selectable='single',
                        columns=[
                            {"name": "Ticker", "id": "ticker", "presentation": "markdown"},
                            {"name": "Nome Completo", "id": "nome_completo"},
                            {"name": "Setor", "id": "setor"},
                            {"name": "Indústria", "id": "industria"},
                            {"name": "Website", "id": "website"},
                            {"name": "Preço Atual", "id": "preco_atual"},
                            {"name": "ROE", "id": "roe"},
                            {"name": "Dividend Yield", "id": "dividend_yield"},
                            {"name": "P/L", "id": "pl"},
                            {"name": "P/VP", "id": "pvp"},
                            {"name": "País", "id": "pais"},
                            {"name": "Tipo", "id": "tipo"},
                            {"name": "Liquidez Diária", "id": "liquidez_diaria"},
                            {"name": "Volume Médio", "id": "volume_medio"}
                        ],
                        data=df_acoes.to_dict('records') if isinstance(df_acoes, pd.DataFrame) else [],
                        markdown_options={"html": True}
                    ),
                    html.Div(id='alerta-tabela-acoes')
                ])
            ], label="Ações"),
            dbc.Tab([
                filtros_bdrs(),
                html.Div([
                    dash_table.DataTable(
                        id='tabela-bdrs',
                        style_table=style_table,
                        style_header=style_header,
                        style_cell=style_cell,
                        style_data_conditional=style_data_conditional,
                        tooltip_header=tooltips,
                        tooltip_delay=0,
                        tooltip_duration=None,
                        page_size=15,
                        row_selectable='single',
                        columns=[
                            {"name": "Ticker", "id": "ticker", "presentation": "markdown"},
                            {"name": "Nome Completo", "id": "nome_completo"},
                            {"name": "Setor", "id": "setor"},
                            {"name": "Indústria", "id": "industria"},
                            {"name": "Website", "id": "website"},
                            {"name": "Preço Atual", "id": "preco_atual"},
                            {"name": "ROE", "id": "roe"},
                            {"name": "Dividend Yield", "id": "dividend_yield"},
                            {"name": "P/L", "id": "pl"},
                            {"name": "P/VP", "id": "pvp"},
                            {"name": "País", "id": "pais"},
                            {"name": "Tipo", "id": "tipo"},
                            {"name": "Liquidez Diária", "id": "liquidez_diaria"},
                            {"name": "Volume Médio", "id": "volume_medio"}
                        ],
                        data=df_bdrs.to_dict('records') if isinstance(df_bdrs, pd.DataFrame) else [],
                        markdown_options={"html": True}
                    ),
                    html.Div(id='alerta-tabela-bdrs')
                ])
            ], label="BDRs"),
            dbc.Tab([
                filtros_fiis(),
                html.Div([
                    dash_table.DataTable(
                        id='tabela-fiis',
                        style_table=style_table,
                        style_header=style_header,
                        style_cell=style_cell,
                        style_data_conditional=style_data_conditional,
                        tooltip_header=tooltips,
                        tooltip_delay=0,
                        tooltip_duration=None,
                        page_size=15,
                        row_selectable='single',
                        columns=[
                            {"name": "Ticker", "id": "ticker", "presentation": "markdown"},
                            {"name": "Nome Completo", "id": "nome_completo"},
                            {"name": "Setor", "id": "setor"},
                            {"name": "Indústria", "id": "industria"},
                            {"name": "Website", "id": "website"},
                            {"name": "Preço Atual", "id": "preco_atual"},
                            {"name": "ROE", "id": "roe"},
                            {"name": "Dividend Yield", "id": "dividend_yield"},
                            {"name": "P/L", "id": "pl"},
                            {"name": "P/VP", "id": "pvp"},
                            {"name": "País", "id": "pais"},
                            {"name": "Tipo", "id": "tipo"},
                            {"name": "Liquidez Diária", "id": "liquidez_diaria"},
                            {"name": "Volume Médio", "id": "volume_medio"}
                        ],
                        data=df_fiis.to_dict('records') if isinstance(df_fiis, pd.DataFrame) else [],
                        markdown_options={"html": True}
                    ),
                    html.Div(id='alerta-tabela-fiis')
                ])
            ], label="FIIs"),
        ]),
        dbc.Modal(
            [
                dbc.ModalHeader("Detalhes Completos do Ativo"),
                dbc.ModalBody(id="modal-detalhes-body")
            ],
            id="modal-detalhes",
            size="lg",
            is_open=False
        )
    ])

def register_callbacks(app):

    @app.callback(
        Output('tabela-acoes', 'data'),
        Output('alerta-tabela-acoes', 'children'),
        [Input('btn-buscar-acoes', 'n_clicks')],
        [
            State('filtro-roe-acoes', 'value'),
            State('filtro-dy-acoes', 'value'),
            State('filtro-plmin-acoes', 'value'),
            State('filtro-plmax-acoes', 'value'),
            State('filtro-pvp-acoes', 'value'),
        ]
    )
    def buscar_acoes(n_clicks, roe, dy, plmin, plmax, pvp):
        if not n_clicks:
            return [], None
        dados = processar_ativos_acoes_com_filtros(roe, dy, plmin, plmax, pvp)
        if not dados:
            return [], dbc.Alert("Nenhum ativo encontrado para os filtros selecionados.", color="info", className="mt-2")
        
        # Adiciona logos aos dados
        dados_com_logos = add_logo_column_to_data(dados)
        return dados_com_logos, None


    @app.callback(
        Output('tabela-bdrs', 'data'),
        Output('alerta-tabela-bdrs', 'children'),
        [Input('btn-buscar-bdrs', 'n_clicks')],
        [
            State('filtro-roe-bdrs', 'value'),
            State('filtro-dy-bdrs', 'value'),
            State('filtro-plmin-bdrs', 'value'),
            State('filtro-plmax-bdrs', 'value'),
            State('filtro-pvp-bdrs', 'value'),
        ]
    )
    def buscar_bdrs(n_clicks, roe, dy, plmin, plmax, pvp):
        if not n_clicks:
            return [], None
        dados = processar_ativos_bdrs_com_filtros(roe, dy, plmin, plmax, pvp)
        if not dados:
            return [], dbc.Alert("Nenhum BDR encontrado para os filtros selecionados.", color="info", className="mt-2")
        
        # Adiciona logos aos dados
        dados_com_logos = add_logo_column_to_data(dados)
        return dados_com_logos, None

    @app.callback(
        Output('tabela-fiis', 'data'),
        Output('alerta-tabela-fiis', 'children'),
        [Input('btn-buscar-fiis', 'n_clicks')],
        [
            State('filtro-dymin-fiis', 'value'),
            State('filtro-dymax-fiis', 'value'),
            State('filtro-liq-fiis', 'value'),
        ]
    )
    def buscar_fiis(n_clicks, dymin, dymax, liq):
        if not n_clicks:
            return [], None
        dados = processar_ativos_fiis_com_filtros(dymin, dymax, liq)
        if not dados:
            return [], dbc.Alert("Nenhum FII encontrado para os filtros selecionados.", color="info", className="mt-2")
        
        # Adiciona logos aos dados
        dados_com_logos = add_logo_column_to_data(dados)
        return dados_com_logos, None

