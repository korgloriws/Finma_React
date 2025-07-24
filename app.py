import dash
import dash_bootstrap_components as dbc

app = dash.Dash(
    __name__,
    external_stylesheets=[
        dbc.themes.JOURNAL,
        '/assets/custom_logos.css'
    ],
    suppress_callback_exceptions=True
)

from dash import dcc, html
from dash.dependencies import Input, Output
import pandas as pd
from pages import graficos, rankers, detalhes, marmitas, carteira, analise, lista, controle, ia, assistente_ia
from models import global_state, carregar_ativos
import plotly.io as pio
import pages.carteira as carteira_mod

pio.templates.default = "simple_white"

carteira_mod.atualizar_precos_carteira()
carteira_mod.salvar_historico()


@app.server.route("/start_load", methods=["POST"])
def iniciar():
    carregar_ativos()
    return {"status": "Carregamento iniciado"}, 202

@app.server.route("/get_data", methods=["GET"])
def get_data():
    df = global_state.get("df_ativos")
    return df.to_dict("records") if isinstance(df, pd.DataFrame) else []

sidebar = html.Div([
    html.H2("Finma", className="display-4"),
    html.Hr(),
    html.P("Menu", className="lead"),
    dbc.Nav([
        dbc.NavLink("Análise", href="/analise", active="exact"),
        dbc.NavLink("Detalhes", href="/detalhes", active="exact"),
        dbc.NavLink("Marmitas", href="/marmitas", active="exact"),
        dbc.NavLink("Carteira", href="/carteira", active="exact"),
        dbc.NavLink("controle Financeiro", href="/controle", active="exact"),
        dbc.NavLink("assistente IA", href="/assistente_ia", active="exact"),
    ], vertical=True, pills=True),
    html.Div([
        dbc.Switch(id="switch-darkmode", label="Modo Escuro", value=True, className="mb-3"),
    ], style={"marginTop": "2rem"}),
], style={"position": "fixed", "top": 0, "left": 0, "bottom": 0, "width": "16rem", "padding": "2rem 1rem", "background-color": "#f8f9fa"}, className="sidebar")

content = html.Div([
    dcc.Store(id="ativos-filtrados-store"), 
    dcc.Location(id="url"),
    html.Div(id="page-content", style={"margin-left": "18rem", "margin-right": "2rem", "padding": "2rem 1rem"})
])

app.layout = html.Div([sidebar, content])

@app.callback(Output("page-content", "children"), [Input("url", "pathname"), Input("url", "search")])
def render_page_content(pathname, search):
    # Extrair parâmetros da URL
    params = {}
    if search:
        from urllib.parse import parse_qs
        params = parse_qs(search.lstrip('?'))
        # Converter listas de um item para strings
        params = {k: v[0] if v else '' for k, v in params.items()}
    
    telas_independentes = {
        "/": assistente_ia.layout(),
        "/detalhes": detalhes.layout(params.get('ticker', '')),
        "/marmitas": marmitas.layout(),
        "/carteira": carteira.layout(),
        "/controle": controle.layout(),
        "/assistente_ia": assistente_ia.layout(),
    }
    if pathname in telas_independentes:
        return telas_independentes[pathname]
    if pathname == "/lista":
        return lista.layout()
    if pathname == "/rankers":
        return rankers.layout()
    if pathname == "/graficos":
        return graficos.layout()
    if pathname == "/analise":
        return analise.layout()
    return html.H1("404: Página não encontrada", className="text-danger")


@app.callback(
    Output("ativos-filtrados-store", "data"),
    [Input("tabela-acoes", "data"), Input("tabela-bdrs", "data"), Input("tabela-fiis", "data")],
    prevent_initial_call=True
)
def atualizar_store_ativos(data_acoes, data_bdrs, data_fiis):

    frames = []
    if data_acoes: frames.append(pd.DataFrame(data_acoes))
    if data_bdrs: frames.append(pd.DataFrame(data_bdrs))
    if data_fiis: frames.append(pd.DataFrame(data_fiis))
    if frames:
        df = pd.concat(frames, ignore_index=True)
        return df.to_dict("records")
    return []

app.clientside_callback(
    """
    function(is_dark) {
        if(is_dark) {
            document.body.classList.add('dark-mode');
            if(window.Plotly) { window.Plotly.setPlotConfig && window.Plotly.setPlotConfig({}); window.Plotly.react && window.Plotly.react; window.Plotly.defaults = window.Plotly.defaults || {}; window.Plotly.defaults.template = 'plotly_dark'; }
        } else {
            document.body.classList.remove('dark-mode');
            if(window.Plotly) { window.Plotly.setPlotConfig && window.Plotly.setPlotConfig({}); window.Plotly.react && window.Plotly.react; window.Plotly.defaults = window.Plotly.defaults || {}; window.Plotly.defaults.template = 'simple_white'; }
        }
        return window.dash_clientside.no_update;
    }
    """,
    Output("page-content", "style"),
    Input("switch-darkmode", "value")
)

marmitas.registrar_callbacks(app)
lista.register_callbacks(app)
graficos.register_callbacks(app)
rankers.register_callbacks(app)
detalhes.register_callbacks(app)
carteira.registrar_callbacks(app)
analise.register_callbacks(app)
controle.registrar_callbacks(app)
assistente_ia.registrar_callbacks(app)

if __name__ == "__main__":
    app.run_server(debug=False, port=5000, host='0.0.0.0')
