import os
import glob
import pdfplumber
import pandas as pd
import re
import json
import multiprocessing
from concurrent.futures import ProcessPoolExecutor, as_completed

# ─────────────────────────────────────────────────────────────────────────────
# Constantes globais — devem ficar no nível do módulo para serem pickleable
# no Windows (spawn context), onde cada worker reimporta este módulo.
# ─────────────────────────────────────────────────────────────────────────────
_BOUNDS_LIST = [
    ('DATA',  (0,    68)),
    ('PROT',  (68,  129)),
    ('TIPO',  (129, 155)),
    ('DPROT', (155, 174)),
    ('INTER', (174, 410)),
    ('ASSUN', (410, 480)),
    ('COMPL', (480, 2000)),
]

_KEY_MAP = {
    'DATA':  'DATA TRAMITAÇÃO',
    'PROT':  'PROTOCOLO',
    'TIPO':  'TIPO PROTOCOLO',
    'DPROT': 'DATA PROTOCOLO',
    'INTER': 'INTERESSADO',
    'ASSUN': 'ASSUNTO',
    'COMPL': 'COMPLEMENTO',
}


# ─────────────────────────────────────────────────────────────────────────────
# Worker de pré-scan (detecta Setor Origem em cada página — rápido)
# ─────────────────────────────────────────────────────────────────────────────
def _prescan_setores(pdf_path: str) -> list:
    """
    Passagem rápida e sequencial usando apenas extract_text() para determinar
    o setor_origem de cada página. Retorna uma lista indexada por número de página.
    extract_text() é ~5× mais rápido que extract_words(), tornando esta varredura leve.
    """
    page_setores = []
    current_setor = "DESCONHECIDO"
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.split('\n'):
                if "SETOR ORIGEM:" in line.upper():
                    try:
                        current_setor = line.upper().split('ORIGEM:')[1].strip()
                    except Exception:
                        pass
            page_setores.append(current_setor)
    return page_setores


# ─────────────────────────────────────────────────────────────────────────────
# Worker paralelo — DEVE ser função top-level para ser pickleable no Windows
# ─────────────────────────────────────────────────────────────────────────────
def _process_page_range(args: tuple) -> list:
    """
    Processa as páginas [start_page, end_page) de um PDF.
    Recebe args = (pdf_path, start_page, end_page, page_setores).
    Retorna lista de dicts de processos extraídos.
    """
    pdf_path, start_page, end_page, page_setores = args
    dados = []
    proc_atual = None

    with pdfplumber.open(pdf_path) as pdf:
        n_pages = len(pdf.pages)
        for page_idx in range(start_page, min(end_page, n_pages)):
            page = pdf.pages[page_idx]
            setor_origem = (page_setores[page_idx]
                            if page_idx < len(page_setores)
                            else "DESCONHECIDO")

            words = page.extract_words()
            if not words:
                continue

            # O(n) Y-bucketing — antes era O(n²)
            linhas_y: dict = {}
            for w in words:
                y_center = (w['top'] + w['bottom']) / 2
                bin_y = round(y_center / 7) * 7
                linhas_y.setdefault(bin_y, []).append(w)

            for y in sorted(linhas_y):
                word_list = sorted(linhas_y[y], key=lambda x: x['x0'])
                full_line = ' '.join(w['text'] for w in word_list)

                # Classificação por coluna (7 iterações fixas)
                colunas: dict = {col: [] for col, _ in _BOUNDS_LIST}
                for w in word_list:
                    x_center = (w['x0'] + w['x1']) / 2
                    for col, (xmin, xmax) in _BOUNDS_LIST:
                        if xmin <= x_center < xmax:
                            colunas[col].append(w)
                            break

                textos = {
                    k: ' '.join(
                        w['text'] for w in sorted(
                            v, key=lambda ww: (round(ww['top'] / 4), ww['x0'])
                        )
                    ).strip()
                    for k, v in colunas.items()
                }

                # Filtros de cabeçalhos / lixo
                if 'PROTOCOLO' in textos['PROT'] or 'INTERESSADO' in textos['INTER']:
                    continue
                if ('SISTEMA DE PROCESSO' in textos['DATA']
                        or 'RELATÓRIO DE TRAMITAÇÕES' in textos['DATA']
                        or 'DATA PROTOCO' in full_line.upper()):
                    continue
                if 'Página' in full_line:
                    continue

                match_prot = re.search(r'\d{4}/\d+', textos['PROT'])

                if textos['DATA'] and match_prot:
                    if proc_atual:
                        dados.append(proc_atual)
                    proc_atual = {
                        'DATA TRAMITAÇÃO': textos['DATA'],
                        'PROTOCOLO':       textos['PROT'],
                        'TIPO PROTOCOLO':  textos['TIPO'],
                        'DATA PROTOCOLO':  textos['DPROT'],
                        'INTERESSADO':     textos['INTER'],
                        'ASSUNTO':         textos['ASSUN'],
                        'COMPLEMENTO':     textos['COMPL'],
                        'SETOR_ORIGEM':    setor_origem,
                    }
                elif proc_atual:
                    for k, mapped in _KEY_MAP.items():
                        if textos[k]:
                            proc_atual[mapped] = (
                                proc_atual[mapped] + ' ' + textos[k]
                            ).strip()

    if proc_atual:
        dados.append(proc_atual)

    return dados


# ─────────────────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────────────────
def extract_from_pdf(pdf_path: str, progress_cb=None) -> list:
    """
    Extrai todos os processos de um PDF usando processamento paralelo por CPU.

    Fluxo:
      1. Pré-scan rápido (sequencial) para mapear setor_origem por página.  (0→15%)
      2. Extração paralela — páginas divididas entre os núcleos disponíveis. (15→85%)

    progress_cb(pct: int): chamada periodicamente com 0-100.
    """
    if progress_cb:
        progress_cb(2)

    # Passo 1: pré-scan leve para detectar setores
    page_setores = _prescan_setores(pdf_path)
    n_pages = len(page_setores)
    if n_pages == 0:
        return []

    if progress_cb:
        progress_cb(15)

    # Passo 2: extração paralela
    n_cpus = max(1, multiprocessing.cpu_count() - 1)  # deixa 1 CPU livre para o OS

    # Muitos chunks pequenos para progresso granular; mínimo de 20 páginas por chunk
    chunk_size = max(20, n_pages // (n_cpus * 6))
    chunks = [
        (pdf_path, i, min(i + chunk_size, n_pages), page_setores)
        for i in range(0, n_pages, chunk_size)
    ]
    n_chunks = len(chunks)

    all_dados: list = []
    completed = 0

    with ProcessPoolExecutor(max_workers=n_cpus) as executor:
        futures = {executor.submit(_process_page_range, chunk): i
                   for i, chunk in enumerate(chunks)}
        for future in as_completed(futures):
            chunk_dados = future.result()   # propaga exceções do worker
            all_dados.extend(chunk_dados)
            completed += 1
            if progress_cb:
                pct = 15 + int(completed / n_chunks * 70)   # 15% → 85%
                progress_cb(pct)

    if progress_cb:
        progress_cb(86)

    return all_dados


# ─────────────────────────────────────────────────────────────────────────────
# Utilitários mantidos para compatibilidade com processar_lote / CLI
# ─────────────────────────────────────────────────────────────────────────────
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

    df = pd.DataFrame(todos_dados)
    df = df.fillna('')
    df = df.replace('\n', ' ', regex=True)

    df['Data_Curta'] = df['DATA TRAMITAÇÃO'].apply(
        lambda x: str(x).strip().split(' ')[0] if x else ''
    )
    df['Data_Curta_ISO'] = df['Data_Curta'].apply(converter_data_iso)
    df = df.dropna(subset=['Data_Curta_ISO'])

    df = df.rename(columns={
        "DATA TRAMITAÇÃO": "data_tramitacao",
        "PROTOCOLO":       "protocolo",
        "TIPO PROTOCOLO":  "tipo_protocolo",
        "DATA PROTOCOLO":  "data_protocolo",
        "INTERESSADO":     "interessado",
        "ASSUNTO":         "assunto",
        "COMPLEMENTO":     "complemento",
        "SETOR_ORIGEM":    "Setor_Origem",
    })

    df["data"] = df["Data_Curta_ISO"]
    colunas_finais = ["protocolo", "data", "tipo_protocolo", "data_protocolo",
                      "interessado", "assunto", "complemento", "Setor_Origem"]

    for c in colunas_finais:
        if c not in df.columns:
            df[c] = ''

    df_final = df[colunas_finais]
    df_final = df_final.where(pd.notnull(df_final), None)

    result = df_final.to_dict(orient='records')
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Processamento concluído. {len(result)} registros salvos em {arquivo_saida}")


if __name__ == '__main__':
    # Guarda obrigatória para multiprocessing no Windows (spawn context)
    multiprocessing.freeze_support()

    pasta_entrada = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "relatorios_semanais")
    )
    arquivo_saida = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "frontend", "public",
                     "tramitacoes_consolidadas.json")
    )
    processar_lote(pasta_entrada, arquivo_saida)
