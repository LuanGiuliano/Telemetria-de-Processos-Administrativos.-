import pdfplumber
import pandas as pd
import re

def extract_from_pdf(pdf_file) -> list:
    """
    Extrator Supremo baseado em Coordenadas X/Y + Máquina de Estado do Cabeçalho.
    Lê a posição física exata de cada palavra para reconstruir as colunas principais,
    e usa a linha cinza de 'SETOR DESTINO' como âncora absoluta para o setor de todo o bloco.
    """
    dados = []
    
    BOUNDS = {
        'DATA': (0, 68),
        'PROT': (68, 129),
        'TIPO': (129, 155),
        'DPROT': (155, 174),
        'INTER': (174, 410),      # Segura nomes gigantes do Interessado
        'ASSUN': (410, 480),      # Isola estritamente a 6ª Coluna
        'COMPL': (480, 2000)      # O Complemento agora absorve o resto da página. Sem bleeding!
    }

    with pdfplumber.open(pdf_file) as pdf:
        setor_destino_atual = "DESCONHECIDO"
        
        for page in pdf.pages:
            words = page.extract_words()
            
            # Agrupar palavras por linha (Eixo Y com tolerância de 5pts)
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
                
                # --- MÁQUINA DE ESTADO DO SETOR ---
                if 'SETOR DESTINO:' in full_line.upper():
                    try:
                        raw = full_line.upper().split('DESTINO:')[1].strip()
                        parts = [p.strip() for p in raw.split('-') if p.strip()]
                        if parts:
                            orgao_principal = parts[0]
                            # Regra: Se a primeira palavra do órgão for SEDUC, pegue a sigla seguinte
                            if 'SEDUC' in orgao_principal and len(parts) > 1:
                                setor_destino_atual = f"SEDUC {parts[1]}"
                            else:
                                setor_destino_atual = orgao_principal
                    except Exception:
                        pass
                    continue
                # ----------------------------------
                
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
                    # Classifica as palavras verticalmente primeiro (para reconstruir linhas empilhadas) e depois horizontalmente
                    v_sorted = sorted(v, key=lambda w: (round(w['top'] / 4), w['x0']))
                    textos[k] = ' '.join([w['text'] for w in v_sorted]).strip()
                
                # Ignorar lixos de cabeçalho da tabela ou cabeçalhos de página
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
                        "SETOR ATUAL": setor_destino_atual # Usa o estado da máquina!
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

    # ======================================================
    # Criação do DataFrame e processamento
    # ======================================================
    df = pd.DataFrame(dados)
    df = df.fillna('')
    df = df.replace('\n', ' ', regex=True)

    df['Data_Curta'] = df['DATA TRAMITAÇÃO'].apply(lambda x: str(x).strip().split(' ')[0] if x else '')
    
    # Sigla_setor se torna igual ao Setor Atual pois o Setor Atual já foi limpo no Header
    df['SIGLA_SETOR'] = df['SETOR ATUAL'].apply(lambda x: extrair_sigla(x))
    
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
        "SETOR ATUAL": "setor_atual",
        "SIGLA_SETOR": "sigla_setor",
        "Data_Curta_ISO": "data_curta"
    })

    colunas_finais = ["protocolo", "data_tramitacao", "data_curta", "tipo_protocolo",
                      "data_protocolo", "interessado", "assunto", "complemento",
                      "sigla_setor", "setor_atual"]

    for c in colunas_finais:
        if c not in df.columns:
            df[c] = ''

    df_final = df[colunas_finais]
    df_final = df_final.where(pd.notnull(df_final), None)

    result = df_final.to_dict(orient='records')
    print(f"[extrator] Processos finalizados para upload via StateMachine: {len(result)}")
    return result

def extrair_sigla(setor: str) -> str:
    # Retorna o nome até 30 caracteres para caber no dashboard sem quebrar os gráficos,
    # caso passe um orgão bizarramente grande, mas geralmente SEDUC CCM ou SEPLAD são curtos
    return setor.strip()[:30]

def converter_data_iso(data_str: str):
    try:
        partes = str(data_str).strip().split('/')
        if len(partes) == 3:
            return f"{partes[2]}-{partes[1]}-{partes[0]}"
        return None
    except Exception:
        return None