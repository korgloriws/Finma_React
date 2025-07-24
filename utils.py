from dash import html
import dash_bootstrap_components as dbc
from complete_b3_logos_mapping import get_logo_url

def create_clickable_ticker(ticker, nome_completo=None, show_logo=True, size="normal"):

    ticker_clean = ticker.replace('.SA', '').replace('.sa', '') if ticker else ''
    

    if size == "small":
        logo_size = "20px"
        font_size = "0.9rem"
        padding = "2px 6px"
    elif size == "large":
        logo_size = "40px"
        font_size = "1.1rem"
        padding = "8px 12px"
    else:  # normal
        logo_size = "30px"
        font_size = "1rem"
        padding = "4px 8px"
    
    # Obter logo se solicitado
    logo_element = None
    if show_logo and ticker:
        logo_url = get_logo_url(ticker)
        if logo_url:
            logo_element = html.Img(
                src=logo_url,
                alt=ticker,
                style={
                    "width": logo_size,
                    "height": logo_size,
                    "borderRadius": "4px",
                    "objectFit": "contain",
                    "border": "1px solid #e0e0e0",
                    "background": "white",
                    "marginRight": "8px"
                }
            )
        else:
            # Placeholder se não houver logo
            ticker_short = ticker_clean[:3] if ticker_clean else "N/A"
            logo_element = html.Div(
                ticker_short,
                style={
                    "width": logo_size,
                    "height": logo_size,
                    "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    "borderRadius": "4px",
                    "display": "flex",
                    "alignItems": "center",
                    "justifyContent": "center",
                    "fontSize": f"calc({logo_size} * 0.4)",
                    "fontWeight": "bold",
                    "color": "white",
                    "marginRight": "8px"
                }
            )
    
    # Criar o conteúdo do link
    if nome_completo:
        content = [
            html.Strong(ticker_clean, style={"fontSize": font_size}),
            html.Br(),
            html.Small(nome_completo, className="text-muted", style={"fontSize": f"calc({font_size} * 0.8)"})
        ]
    else:
        content = html.Strong(ticker_clean, style={"fontSize": font_size})
    
    # Criar o link
    link_content = html.Div([
        logo_element,
        html.Div(content)
    ], style={"display": "flex", "alignItems": "center"})
    
    return dbc.Button(
        link_content,
        href=f"/detalhes?ticker={ticker}",
        color="link",
        className="p-0 border-0 bg-transparent text-decoration-none",
        style={
            "padding": padding,
            "borderRadius": "6px",
            "transition": "all 0.2s ease",
            "textAlign": "left",
            "minWidth": "fit-content"
        }
    )

def create_ticker_badge(ticker, nome_completo=None, color="primary"):
    """
    Cria um badge clicável para um ticker
    """
    ticker_clean = ticker.replace('.SA', '').replace('.sa', '') if ticker else ''
    
    return dbc.Badge(
        html.A(
            ticker_clean,
            href=f"/detalhes?ticker={ticker}",
            className="text-white text-decoration-none"
        ),
        color=color,
        className="me-1 mb-1",
        style={"cursor": "pointer"}
    ) 