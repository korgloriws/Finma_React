"""
Módulo otimizado para scraping de dados de FIIs brasileiros
Fontes: FundsExplorer (usando regex no HTML bruto)
"""
import requests
import re
import time
from typing import Optional, Dict


def obter_dados_fii_fundsexplorer(ticker: str) -> Optional[Dict]:
    """
    Obtém dados de FII do FundsExplorer usando regex no HTML bruto
    """
    ticker_limpo = ticker.replace('.SA', '').replace('.sa', '').upper()
    
    url = f'https://www.fundsexplorer.com.br/funds/{ticker_limpo}'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    }
    
    try:
        print(f"[FundsExplorer] Buscando {ticker_limpo}...")
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            print(f"[ERRO] Status {response.status_code}")
            return None
        
        html = response.text
        
        # Verificar se existe
        if 'não encontrado' in html.lower() or len(html) < 5000:
            print(f"[ERRO] FII não encontrado")
            return None
        
        resultado = {
            'ticker': ticker_limpo,
            'fonte': 'FundsExplorer'
        }
        
        # Extrair TIPO - Padrão universal: "do tipo X"
        tipo_match = re.search(r'do\s+tipo\s+([a-záàâãéèêíïóôõöúçñ\s]+)', html, re.I)
        tipo_text = None
        if tipo_match:
            tipo_text = tipo_match.group(1).strip()
            # Limitar ao primeiro ponto, vírgula ou nova linha
            tipo_text = tipo_text.split('.')[0].split(',')[0].split('\n')[0].strip()
            
            if tipo_text and len(tipo_text) < 100:
                tipo_lower = tipo_text.lower()
                
                # Classificar o tipo
                if 'papel' in tipo_lower or 'fof' in tipo_lower or 'receb' in tipo_lower or 'cri' in tipo_lower:
                    resultado['tipo'] = 'Papel'
                elif 'híbrido' in tipo_lower or 'hibrido' in tipo_lower or 'misto' in tipo_lower:
                    resultado['tipo'] = 'Híbrido'
                elif 'tijolo' in tipo_lower:
                    resultado['tipo'] = 'Tijolo'
                else:
                    # Se não identificou claramente, assume Tijolo
                    resultado['tipo'] = 'Tijolo'
        
        # Extrair SEGMENTO - Múltiplos padrões
        segmento_patterns = [
            r'do\s+segmento\s+de\s+([a-záàâãéèêíïóôõöúçñ\s]+)',
            r'de\s+segmento\s+([a-záàâãéèêíïóôõöúçñ\s]+)',
            r'do\s+segmento\s+([a-záàâãéèêíïóôõöúçñ\s]+)',
        ]
        
        segmento_text = None
        for pattern in segmento_patterns:
            match = re.search(pattern, html, re.I)
            if match:
                segmento_text = match.group(1).strip()
                # Limitar ao primeiro ponto, vírgula ou nova linha
                segmento_text = segmento_text.split('.')[0].split(',')[0].split('\n')[0].strip()
                
                # Validar tamanho
                if segmento_text and len(segmento_text) < 50:
                    # Capitalizar primeira letra
                    segmento_text = segmento_text.capitalize()
                    resultado['segmento'] = segmento_text
                    break
        
        # Se não achou tipo ainda, tentar extrair do segmento
        if 'tipo' not in resultado and segmento_text:
            seg_lower = segmento_text.lower()
            if 'híbrido' in seg_lower or 'hibrido' in seg_lower:
                resultado['tipo'] = 'Híbrido'
            elif 'papel' in seg_lower or 'titulo' in seg_lower or 'crédito' in seg_lower:
                resultado['tipo'] = 'Papel'
            else:
                resultado['tipo'] = 'Tijolo'
        
        # Tentar extrair gestora
        gestora_patterns = [
            r'gestora[:\s]+([a-zA-Z\s&]+)',
            r'gestão:\s*([a-zA-Z\s&]+)',
        ]
        
        for pattern in gestora_patterns:
            match = re.search(pattern, html, re.I)
            if match:
                gestora = match.group(1).strip()
                if len(gestora) < 50:
                    resultado['gestora'] = gestora
                    break
        
        # Sucesso se temos pelo menos o tipo ou segmento
        if 'tipo' in resultado or 'segmento' in resultado:
            print(f"[SUCESSO] {resultado}")
            return resultado
        else:
            print(f"[ERRO] Não encontrou tipo/segmento")
            return None
            
    except Exception as e:
        print(f"[ERRO] Exception: {e}")
        return None


def obter_metadata_fii(ticker: str) -> Optional[Dict]:
    """
    Função principal para obter metadados de FII
    """
    return obter_dados_fii_fundsexplorer(ticker)


# Teste
if __name__ == '__main__':
    print("\n=== TESTE DE SCRAPING DE FIIs (V2) ===\n")
    
    tickers = ['HGLG11', 'MXRF11', 'VISC11', 'KNRI11', 'XPML11']
    
    for ticker in tickers:
        print(f"\n--- {ticker} ---")
        dados = obter_metadata_fii(ticker)
        if dados:
            print(f"[OK] Tipo: {dados.get('tipo')}, Segmento: {dados.get('segmento')}")
        else:
            print(f"[FAIL]")
        print("-" * 50)
        time.sleep(1)

