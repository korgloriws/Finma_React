import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
from dash.dependencies import Input, Output, State
import plotly.express as px
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
import dash_table
from complete_b3_logos_mapping import add_logo_column_to_data, get_logo_url



def buscar_detalhes_ativo(ticker):

    ticker = (ticker or '').strip().upper()
    if not ticker:
        return None

    if '.' not in ticker and len(ticker) <= 6:
        ticker += '.SA'
    try:
        acao = yf.Ticker(ticker)
        info = acao.info or {}
        historico = acao.history(period="max")
        dividends = acao.dividends if hasattr(acao, 'dividends') else None
        return {
            "info": info,
            "historico": historico,
            "dividends": dividends
        }
    except Exception as e:
        print(f"Erro ao buscar detalhes de {ticker}: {e}")
        return None

def fmt(val, prefixo="R$", casas=2, sufixo=""):
    if val is None:
        return "-"
    try:
        val = float(val)
    except:
        return str(val)
    if prefixo and abs(val) > 1e9:
        return f"{prefixo} {val/1e9:.2f} bi".replace('.', ',')
    if prefixo and abs(val) > 1e6:
        return f"{prefixo} {val/1e6:.2f} mi".replace('.', ',')
    if prefixo:
        return f"{prefixo} {val:,.{casas}f}{sufixo}".replace(',', 'X').replace('.', ',').replace('X', '.')
    return f"{val:.{casas}f}{sufixo}".replace('.', ',')

def fmt_pct(val, casas=2):
    if val is None:
        return "-"
    try:
        val = float(val)
    except:
        return str(val)
    return f"{val:.{casas}f}%".replace('.', ',')

def formatar_dividend_yield(val):
    if val is None:
        return "-"
    try:
        val = float(val)
        if val > 1:
            return f"{val:.2f}%".replace('.', ',')
        else:
            return f"{val*100:.2f}%".replace('.', ',')
    except:
        return str(val)

def layout(ticker_param=''):
    periodos = [
        {"label": "1 mês", "value": "1mo"},
        {"label": "3 meses", "value": "3mo"},
        {"label": "6 meses", "value": "6mo"},
        {"label": "1 ano", "value": "1y"},
        {"label": "5 anos", "value": "5y"},
        {"label": "Máximo", "value": "max"},
    ]
    return html.Div([
        html.H2("Detalhes do Ativo", className="mb-4"),
        dbc.Row([
            dbc.Col([
                dcc.Input(
                    id="input-ticker",
                    placeholder="Digite o ticker (ex: PETR4, AAPL, MSFT, ITUB4.SA, VISC11)...",
                    type="text",
                    value=ticker_param,
                    style={"width": "300px"}
                ),
                dbc.Button("Buscar", id="btn-buscar", color="primary", className="ml-2")
            ], width="auto"),
        ], className="mb-4"),

        dbc.Row([
            dbc.Col([
                html.Label("Comparar com outros ativos:", className="fw-bold me-2"),
                dcc.Dropdown(
                    id="dropdown-comparar-tickers",
                    options=[],  
                    multi=True,
                    placeholder="Digite ou selecione os tickers para comparar",
                    style={"width": "400px"}
                )
            ], width="auto"),
        ], className="mb-3"),
        html.Div(id="div-tabela-comparacao"),
        html.Div(id="div-detalhes"),
        html.Div([
            html.Label("Período dos Gráficos:", className="fw-bold me-2"),
            dcc.Dropdown(id="detalhes-periodo-grafico", options=periodos, value="1y", clearable=False, style={"width": "200px", "display": "inline-block"})
        ], className="mb-3"),
        html.Div(id="div-graficos-detalhes")
    ])

def info_row(label, value):
    return html.P([html.Strong(label+":"), f" {value}"], className="mb-2")

def filtrar_historico(historico, periodo):
    if periodo == "max":
        return historico
    if historico is None or historico.empty:
        return historico
    try:
        if periodo.endswith("mo"):
            meses = int(periodo.replace("mo", ""))
            dt_ini = historico.index.max() - timedelta(days=30*meses)
        elif periodo.endswith("y"):
            anos = int(periodo.replace("y", ""))
            dt_ini = historico.index.max() - timedelta(days=365*anos)
        else:
            return historico
        return historico[historico.index >= dt_ini]
    except:
        return historico

def get_ticker_options():
    # Exemplo: pode buscar tickers da carteira ou sugerir alguns populares
    from pages.carteira import consultar_carteira
    ativos = consultar_carteira()
    opcoes = [{"label": f"{a['ticker']} - {a['nome_completo']}", "value": a['ticker']} for a in ativos]
    # Adiciona alguns exemplos populares
    exemplos = [
        {"label": "PETR4.SA - Petrobras", "value": "PETR4.SA"},
        {"label": "ITUB4.SA - Itaú Unibanco", "value": "ITUB4.SA"},
        {"label": "BOVA11.SA - BOVA11 ETF", "value": "BOVA11.SA"},
        {"label": "AAPL - Apple", "value": "AAPL"},
        {"label": "MSFT - Microsoft", "value": "MSFT"},
        {"label": "TSLA - Tesla", "value": "TSLA"},
    ]
    # Evita duplicatas
    tickers_existentes = set([o['value'] for o in opcoes])
    for ex in exemplos:
        if ex['value'] not in tickers_existentes:
            opcoes.append(ex)
    return opcoes

def register_callbacks(app):
    @app.callback(
        Output("div-detalhes", "children"),
        [Input("btn-buscar", "n_clicks"), Input("switch-darkmode", "value"), Input("input-ticker", "value")],
        [State("input-ticker", "value")]
    )
    def atualizar_detalhes(n_clicks, is_dark, ticker_input, ticker):
        if not ticker:
            return html.Div("Por favor, digite um ticker para buscar os detalhes.", className="text-muted")
        dados = buscar_detalhes_ativo(ticker)
        if not dados or not dados.get("info") or not dados["info"].get("longName"):
            return html.Div([
                html.Div("Nenhuma informação detalhada disponível para o ticker informado.", className="text-danger mb-2"),
                html.Div("Exemplos válidos: PETR4, AAPL, MSFT, ITUB4.SA, VISC11, TSLA, BOVA11.SA, AMZO34.SA")
            ])
        info = dados["info"]
        

        ticker_symbol = info.get('symbol', ticker)
        logo_url = get_logo_url(ticker_symbol)
        

        if logo_url:
            header_content = html.Div([
                html.Div([
                    html.Img(src=logo_url, alt=ticker_symbol, style={
                        "width": "100px", "height": "100px", "borderRadius": "10px",
                        "objectFit": "contain", "border": "2px solid #e0e0e0",
                        "background": "white", "padding": "5px", "boxShadow": "0 3px 6px rgba(0,0,0,0.1)"
                    }),
                    html.Div([
                        html.H4(info.get('longName', ticker_symbol), className="mb-1"),
                        html.H6(ticker_symbol, className="text-muted mb-0")
                    ], style={"marginLeft": "15px"})
                ], style={"display": "flex", "alignItems": "center"}),
            ])
        else:

            ticker_short = ticker_symbol.replace('.SA', '').replace('.sa', '')[:4]
            header_content = html.Div([
                html.Div([
                    html.Div(ticker_short, style={
                        "width": "100px", "height": "100px", "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        "borderRadius": "10px", "display": "flex", "alignItems": "center", "justifyContent": "center",
                        "fontSize": "16px", "fontWeight": "bold", "color": "white", "textShadow": "1px 1px 2px rgba(0,0,0,0.3)"
                    }),
                    html.Div([
                        html.H4(info.get('longName', ticker_symbol), className="mb-1"),
                        html.H6(ticker_symbol, className="text-muted mb-0")
                    ], style={"marginLeft": "15px"})
                ], style={"display": "flex", "alignItems": "center"}),
            ])
        

        card_geral = dbc.Card([
            dbc.CardHeader(header_content),
            dbc.CardBody([
                info_row("Nome Completo", info.get('longName', '-')),
                info_row("Ticker", info.get('symbol', '-')),
                info_row("País", info.get('country', '-')),
                info_row("Setor", info.get('sector', '-')),
                info_row("Indústria", info.get('industry', '-')),
                info_row("Segmento", info.get('segment', '-')),
                info_row("Website", info.get('website', '-')),
                info_row("Resumo", info.get('longBusinessSummary', '-')),
                info_row("Funcionários", info.get('fullTimeEmployees', '-')),
                info_row("Moeda", info.get('currency', '-')),
                
            ])
        ], className="mb-4")

        card_indicadores = dbc.Card([
            dbc.CardHeader("Indicadores Fundamentais"),
            dbc.CardBody([
                info_row("Preço Atual", fmt(info.get('currentPrice'))),
                info_row("P/L", fmt(info.get('trailingPE'), prefixo="", casas=2)),
                info_row("P/VP", fmt(info.get('priceToBook'), prefixo="", casas=2)),
                info_row(
                    "Dividend Yield",
                    formatar_dividend_yield(info.get('dividendYield'))
                ),
                info_row("ROE", fmt_pct(info.get('returnOnEquity', None)*100 if info.get('returnOnEquity') is not None else None, casas=2)),
                info_row("Market Cap", fmt(info.get('marketCap'))),
                info_row("Volume Médio", fmt(info.get('averageVolume'))),
                info_row("Beta", fmt(info.get('beta'), prefixo="", casas=2)),
                info_row("Média 50 dias", fmt(info.get('fiftyDayAverage'))),
                info_row("Média 200 dias", fmt(info.get('twoHundredDayAverage'))),
                info_row("Máx 52 Semanas", fmt(info.get('fiftyTwoWeekHigh'))),
                info_row("Mín 52 Semanas", fmt(info.get('fiftyTwoWeekLow'))),
            ])
        ], className="mb-4")

        card_resultados = dbc.Card([
            dbc.CardHeader("Resultados e Crescimento"),
            dbc.CardBody([
                info_row("Receita Total", fmt(info.get('totalRevenue'))),
                info_row("Lucro Líquido", fmt(info.get('netIncomeToCommon'))),
                info_row("EBITDA", fmt(info.get('ebitda'))),
                info_row("Lucro por Ação (EPS)", fmt(info.get('trailingEps'), prefixo="", casas=2)),
                info_row("BVPS (Valor Patrimonial/Ação)", fmt(info.get('bookValue'))),
                info_row("Crescimento Receita (5y)", fmt_pct(info.get('revenueGrowth', None)*100 if info.get('revenueGrowth') is not None else None, casas=2)),
                info_row("Crescimento Lucro (5y)", fmt_pct(info.get('earningsGrowth', None)*100 if info.get('earningsGrowth') is not None else None, casas=2)),
            ])
        ], className="mb-4")

        card_dividas = dbc.Card([
            dbc.CardHeader("Endividamento"),
            dbc.CardBody([
                info_row("Dívida Líquida", fmt(info.get('debtToEquity'), prefixo="", casas=2)),
                info_row("Dívida/EBITDA", fmt_pct(info.get('debtToEbitda', None)*100 if info.get('debtToEbitda') is not None else None, casas=2)),
                info_row("Dívida/Ativos", fmt_pct(info.get('debtToAssets', None)*100 if info.get('debtToAssets') is not None else None, casas=2)),
                info_row("Dívida/Capital", fmt_pct(info.get('debtToCapital', None)*100 if info.get('debtToCapital') is not None else None, casas=2)),
                info_row("Dívida/Fluxo de Caixa", fmt_pct(info.get('debtToCashFlow', None)*100 if info.get('debtToCashFlow') is not None else None, casas=2)),
                info_row("Dívida/Fluxo de Caixa Livre", fmt_pct(info.get('debtToFreeCashFlow', None)*100 if info.get('debtToFreeCashFlow') is not None else None, casas=2)),
                info_row("Dívida/EBIT", fmt_pct(info.get('debtToEbit', None)*100 if info.get('debtToEbit') is not None else None, casas=2)),
                info_row("Dívida/Lucro Líquido", fmt_pct(info.get('debtToNetIncome', None)*100 if info.get('debtToNetIncome') is not None else None, casas=2)),
            ])
        ], className="mb-4")
      
        card_dividendos = dbc.Card([
            dbc.CardHeader("Dividendos"),
            dbc.CardBody([
                info_row("Último Dividendo", fmt(info.get('lastDiv'))),
                info_row("Dividendos por Ação", fmt(info.get('dividendRate'))),
                info_row("Payout Ratio", fmt_pct(info.get('payoutRatio', None)*100 if info.get('payoutRatio') is not None else None, casas=2)),
            ])
        ], className="mb-4")
        return html.Div([
            card_geral,
            card_indicadores,
            card_resultados,
            card_dividas,
            card_dividendos
        ])

    @app.callback(
        Output("div-graficos-detalhes", "children"),
        [Input("btn-buscar", "n_clicks"), Input("switch-darkmode", "value"), Input("detalhes-periodo-grafico", "value"), Input("input-ticker", "value")],
        [State("input-ticker", "value")]
    )
    def atualizar_graficos(n_clicks, is_dark, periodo, ticker_input, ticker):
        if not ticker:
            return None
        dados = buscar_detalhes_ativo(ticker)
        if not dados or not dados.get("info") or not dados["info"].get("longName"):
            return None
        historico = dados.get("historico")
        dividends = dados.get("dividends")
        template = "plotly_dark" if is_dark else "simple_white"
        historico_filtrado = filtrar_historico(historico, periodo)
        # Gráfico de Preço
        if historico_filtrado is not None and not historico_filtrado.empty:
            fig_preco = px.line(historico_filtrado, x=historico_filtrado.index, y='Close', title="Evolução do Preço de Fechamento", template=template)
            card_preco = dbc.Card([
                dbc.CardHeader("Evolução do Preço de Fechamento"),
                dbc.CardBody(dcc.Graph(figure=fig_preco, config={'displayModeBar': False}))
            ], className="mb-4")
        else:
            card_preco = dbc.Card([
                dbc.CardHeader("Evolução do Preço de Fechamento"),
                dbc.CardBody(html.Div("Histórico não disponível."))
            ], className="mb-4")
        
        if dividends is not None and not dividends.empty and historico_filtrado is not None and not historico_filtrado.empty:
            df_dividends = dividends.to_frame(name='Dividend')
            df_dividends = df_dividends.join(historico_filtrado['Close'], how='inner')
            df_dividends['DividendYield'] = (df_dividends['Dividend'] / df_dividends['Close']) * 100
            fig_dividend = px.bar(df_dividends, x=df_dividends.index, y='DividendYield',
                                  title="Evolução do Dividend Yield", template=template)
            card_dividend = dbc.Card([
                dbc.CardHeader("Evolução do Dividend Yield"),
                dbc.CardBody(dcc.Graph(figure=fig_dividend, config={'displayModeBar': False}))
            ], className="mb-4")
        else:
            card_dividend = dbc.Card([
                dbc.CardHeader("Evolução do Dividend Yield"),
                dbc.CardBody(html.Div("Dados não disponíveis."))
            ], className="mb-4")
        return html.Div([
            card_preco,
            card_dividend
        ])


    @app.callback(
        Output("dropdown-comparar-tickers", "options"),
        Input("input-ticker", "value")
    )
    def atualizar_opcoes_dropdown_comparar(ticker):
        return get_ticker_options()

    @app.callback(
        Output("div-tabela-comparacao", "children"),
        [Input("btn-buscar", "n_clicks"),
         Input("dropdown-comparar-tickers", "value"),
         Input("switch-darkmode", "value")],
        [State("input-ticker", "value")]
    )
    def atualizar_tabela_comparacao(n_clicks, tickers_comparar, is_dark, ticker_principal):
        if not ticker_principal and not tickers_comparar:
            return None
        tickers = []
        if ticker_principal:
            tickers.append(ticker_principal.strip().upper())
        if tickers_comparar:
            tickers += [t.strip().upper() for t in tickers_comparar if t.strip().upper() not in tickers]
        dados = []
        for t in tickers:
            try:
                if '.' not in t and len(t) <= 6:
                    t_yf = t + '.SA'
                else:
                    t_yf = t
                acao = yf.Ticker(t_yf)
                info = acao.info or {}
                dados.append({
                    "Ticker": t,
                    "Nome": info.get('longName', '-'),
                    "Preço Atual": info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose'),
                    "P/L": info.get('trailingPE'),
                    "P/VP": info.get('priceToBook'),
                    "DY": info.get('dividendYield'),
                    "ROE": info.get('returnOnEquity'),
                    "Setor": info.get('sector', '-'),
                    "País": info.get('country', '-'),
                })
            except Exception as e:
                dados.append({"Ticker": t, "Nome": f"Erro: {e}"})
        if not dados:
            return None
        df = pd.DataFrame(dados)
        

        data_with_logos = add_logo_column_to_data(df.to_dict('records'))
        

        if 'DY' in df.columns:
            df['DY'] = df['DY'].apply(lambda x: f"{x*100:.2f}%" if pd.notnull(x) else '-')
        if 'ROE' in df.columns:
            df['ROE'] = df['ROE'].apply(lambda x: f"{x*100:.2f}%" if pd.notnull(x) else '-')
        if 'P/L' in df.columns:
            df['P/L'] = df['P/L'].apply(lambda x: f"{x:.2f}" if pd.notnull(x) else '-')
        if 'P/VP' in df.columns:
            df['P/VP'] = df['P/VP'].apply(lambda x: f"{x:.2f}" if pd.notnull(x) else '-')
        if 'Preço Atual' in df.columns:
            df['Preço Atual'] = df['Preço Atual'].apply(lambda x: f"R$ {x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if pd.notnull(x) else '-')
        
        
        for i, row in enumerate(data_with_logos):
            if 'DY' in row:
                row['DY'] = df.iloc[i]['DY'] if 'DY' in df.columns else '-'
            if 'ROE' in row:
                row['ROE'] = df.iloc[i]['ROE'] if 'ROE' in df.columns else '-'
            if 'P/L' in row:
                row['P/L'] = df.iloc[i]['P/L'] if 'P/L' in df.columns else '-'
            if 'P/VP' in row:
                row['P/VP'] = df.iloc[i]['P/VP'] if 'P/VP' in df.columns else '-'
            if 'Preço Atual' in row:
                row['Preço Atual'] = df.iloc[i]['Preço Atual'] if 'Preço Atual' in df.columns else '-'
        
        style = {
            'backgroundColor': '#202124', 'color': '#E4E6EB', 'border': '1px solid #3A3B3C'
        } if is_dark else {
            'backgroundColor': '#fff', 'color': '#222', 'border': '1px solid #dee2e6'
        }
        

        columns = []
        for col in df.columns:
            if col == 'Ticker':
                columns.append({"name": col, "id": col, "presentation": "markdown"})
            else:
                columns.append({"name": col, "id": col})
        
        return dash_table.DataTable(
            columns=columns,
            data=data_with_logos,
            style_table={'overflowX': 'auto'},
            style_cell={'textAlign': 'left'},
            style_header=style,
            style_data=style,
            page_size=10,
            markdown_options={"html": True}
        )

