import os
import glob
import pdfplumber
import pandas as pd
import re
import json

def extract_from_pdf(pdf_file) -> list:
    dados = []
    
    BOUNDS = {
        'DATA': (0, 68),
        'PROT': (68, 129),
        'TIPO': (129, 155),
        'DPROT': (155, 174),
        'INTER': (174, 410),
        'ASSUN': (410, 480),
        'COMPL': (480, 2000)
    }

    setor_origem = "DESCONHECIDO"

    with pdfplumber.open(pdf_file) as pdf:
        # 1. Obter "SETOR ORIGEM" na primeira página
        primeira_pagina = pdf.pages[0]
        texto_pag_1 = primeira_pagina.extract_text()
        if texto_pag_1:
            for linha in texto_pag_1.split('\n'):
                if "SETOR ORIGEM:" in linha.upper():
                    # Capturar a variável do setor de origem
                    try:
                        setor_origem = linha.upper().split('ORIGEM:')[1].strip()
                    except Exception:
                        pass
                        
        # 2. Extração via coordenadas
        for page in pdf.pages:
            words = page.extract_words()
            
            # Agrupamento Y
            linhas_y = {}
            for w in words:
                y_center = (w['top'] + w['bottom']) / 2
                found_y = None
                for cy in linhas_y.keys():
                    if abs(cy - y_center) < 7:
                        found_y = cy
                        break
                if not found_y:
                    found_y = y_center
                    linhas_y[found_y] = []
                linhas_y[found_y].append(w)
                
            linhas_ordenadas = sorted(linhas_y.items(), key=lambda x: x[0])
            proc_atual = None
            
            for y, word_list in linhas_ordenadas:
                word_list = sorted(word_list, key=lambda x: x['x0'])
                full_line = ' '.join([w['text'] for w in word_list]).strip()
                
                colunas = {k: [] for k in BOUNDS.keys()}
                for w in word_list:
                    x_center = (w['x0'] + w['x1']) / 2
                    found_col = None
                    for col, (xmin, xmax) in BOUNDS.items():
                        if xmin <= x_center < xmax:
                            found_col = col
                            break
                    if found_col:
                        colunas[found_col].append(w)
                            
                textos = {}
                for k, v in colunas.items():
                    # Classifica as palavras verticalmente primeiro para reconstruir colunas limpas
                    v_sorted = sorted(v, key=lambda w: (round(w['top'] / 4), w['x0']))
                    textos[k] = ' '.join([w['text'] for w in v_sorted]).strip()
                
                # Ignorar lixos de tabelas etc
                if 'PROTOCOLO' in textos['PROT'] or 'INTERESSADO' in textos['INTER']:
                    continue
                if 'SISTEMA DE PROCESSO' in textos['DATA'] or 'RELATÓRIO DE TRAMITAÇÕES' in textos['DATA'] or 'DATA PROTOCO' in full_line.upper():
                    continue
                if 'Página' in full_line:
                    continue
                    
                match_prot = re.search(r'\d{4}/\d+', textos['PROT'])
                
                if textos['DATA'] and match_prot:
                    if proc_atual:
                        dados.append(proc_atual)
                        
                    proc_atual = {
                        "DATA TRAMITAÇÃO": textos['DATA'],
                        "PROTOCOLO": textos['PROT'],
                        "TIPO PROTOCOLO": textos['TIPO'],
                        "DATA PROTOCOLO": textos['DPROT'],
                        "INTERESSADO": textos['INTER'],
                        "ASSUNTO": textos['ASSUN'],
                        "COMPLEMENTO": textos['COMPL'],
                        "SETOR_ORIGEM": setor_origem 
                    }
                elif proc_atual:
                    for k in BOUNDS.keys():
                        if textos[k]:
                            key_map = {
                                'DATA': 'DATA TRAMITAÇÃO', 'PROT': 'PROTOCOLO', 'TIPO': 'TIPO PROTOCOLO',
                                'DPROT': 'DATA PROTOCOLO', 'INTER': 'INTERESSADO', 'ASSUN': 'ASSUNTO',
                                'COMPL': 'COMPLEMENTO'
                            }
                            proc_atual[key_map[k]] += ' ' + textos[k]
                            proc_atual[key_map[k]] = proc_atual[key_map[k]].strip()
                            
            if proc_atual:
                dados.append(proc_atual)

    if not dados:
        return []

    return dados

def converter_data_iso(data_str: str):
    try:
        partes = str(data_str).strip().split('/')
        if len(partes) == 3:
            return f"{partes[2]}-{partes[1]}-{partes[0]}"
        return None
    except Exception:
        return None

def processar_lote(pasta_entrada, arquivo_saida):
    os.makedirs(pasta_entrada, exist_ok=True)
    os.makedirs(os.path.dirname(arquivo_saida), exist_ok=True)
    
    arquivos_pdf = glob.glob(os.path.join(pasta_entrada, "*.pdf"))
    
    if not arquivos_pdf:
        print(f"Nenhum arquivo PDF encontrado na pasta {pasta_entrada}")
        with open(arquivo_saida, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return

    todos_dados = []
    
    for pdf in arquivos_pdf:
        print(f"Processando arquivo: {pdf}")
        dados_pdf = extract_from_pdf(pdf)
        todos_dados.extend(dados_pdf)
        
    if not todos_dados:
        print("Nenhum dado extraído.")
        with open(arquivo_saida, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return
        
    # Converter para DF usando pandas e higienizar dados
    df = pd.DataFrame(todos_dados)
    df = df.fillna('')
    df = df.replace('\n', ' ', regex=True)

    df['Data_Curta'] = df['DATA TRAMITAÇÃO'].apply(lambda x: str(x).strip().split(' ')[0] if x else '')
    df['Data_Curta_ISO'] = df['Data_Curta'].apply(converter_data_iso)
    df = df.dropna(subset=['Data_Curta_ISO'])

    df = df.rename(columns={
        "DATA TRAMITAÇÃO": "data_tramitacao",
        "PROTOCOLO": "protocolo",
        "TIPO PROTOCOLO": "tipo_protocolo",
        "DATA PROTOCOLO": "data_protocolo",
        "INTERESSADO": "interessado",
        "ASSUNTO": "assunto",
        "COMPLEMENTO": "complemento",
        "SETOR_ORIGEM": "Setor_Origem"
    })

    df["data"] = df["Data_Curta_ISO"]
    
    colunas_finais = ["protocolo", "data", "tipo_protocolo", "data_protocolo", 
                      "interessado", "assunto", "complemento", "Setor_Origem"]

    for c in colunas_finais:
        if c not in df.columns:
            df[c] = ''

    df_final = df[colunas_finais]
    df_final = df_final.where(pd.notnull(df_final), None)

    # Exportar para JSON na pasta do Frontend
    result = df_final.to_dict(orient='records')
    
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"Processamento concluído. {len(result)} registros salvos em {arquivo_saida}")

if __name__ == '__main__':
    pasta_entrada = os.path.join(os.path.dirname(__file__), "..", "relatorios_semanais")
    arquivo_saida = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "tramitacoes_consolidadas.json")
    
    pasta_entrada = os.path.abspath(pasta_entrada)
    arquivo_saida = os.path.abspath(arquivo_saida)
    
    processar_lote(pasta_entrada, arquivo_saida)
