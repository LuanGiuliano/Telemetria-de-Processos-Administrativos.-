import pdfplumber
import pandas as pd

# 1. Extração dos dados do PDF
dados = []
caminho_pdf = "tramitacoes-entre-setores-2026-01-02-2026-03-10.pdf"

print("Lendo as 132 páginas do PDF. Isso pode levar alguns segundos...")
with pdfplumber.open(caminho_pdf) as pdf:
    for pagina in pdf.pages:
        tabela = pagina.extract_table()
        if tabela:
            # Ignora a primeira linha (cabeçalho) de cada página
            for linha in tabela[1:]: 
                # Verifica se a linha tem o número correto de colunas (8) e não está vazia
                if len(linha) == 8 and linha[0]:
                    dados.append(linha)

# 2. Criação do DataFrame
colunas = ["DATA TRAMITAÇÃO", "PROTOCOLO", "TIPO PROTOCOLO", "DATA PROTOCOLO", 
           "INTERESSADO", "ASSUNTO", "COMPLEMENTO", "SETOR ATUAL"]

df = pd.DataFrame(dados, columns=colunas)

# 3. Tratamento e Matemática do Processômetro
# Limpa quebras de linha (\n) que o PDF gera dentro das células
df = df.replace('\n', ' ', regex=True)

# Extrai apenas a data (dd/mm/yyyy), removendo a hora exata da tramitação
df['Data_Curta'] = df['DATA TRAMITAÇÃO'].str.split(' ').str[0]
df['Data_Curta'] = pd.to_datetime(df['Data_Curta'], format='%d/%m/%Y', errors='coerce')

# Removemos possíveis linhas que não conseguiram ser convertidas para data (sujeira do PDF)
df = df.dropna(subset=['Data_Curta'])

# Conta quantos processos tramitaram por dia
contagem_diaria = df.groupby('Data_Curta').size().reset_index(name='Processos_do_Dia')

# A Mágica: Cria a linha do tempo do "Impostrômetro" usando Soma Acumulada (cumsum)
contagem_diaria['Processometro_Acumulado'] = contagem_diaria['Processos_do_Dia'].cumsum()

# Novas Métricas para os Gráficos de Rosquinha (Donut)
def truncate_label(label, max_len=40):
    text = str(label)
    return text[:max_len] + "..." if len(text) > max_len else text

top_setores = df['SETOR ATUAL'].value_counts().head(5).reset_index()
top_setores.columns = ['name', 'value']
top_setores['name'] = top_setores['name'].apply(truncate_label)

top_assuntos = df['ASSUNTO'].value_counts().head(5).reset_index()
top_assuntos.columns = ['name', 'value']
top_assuntos['name'] = top_assuntos['name'].apply(truncate_label)

top_tipos = df['TIPO PROTOCOLO'].value_counts().head(5).reset_index()
top_tipos.columns = ['name', 'value']
top_tipos['name'] = top_tipos['name'].apply(truncate_label)

# Mostra o resultado final ordenado de janeiro até março
print("\n--- Linha do Tempo do Processômetro ---")
print(contagem_diaria.to_string(index=False))

# 4. Exportação dos Dados para o Frontend (React/Next.js)
import json
caminho_json = "processometro_dados.json"

# Preparando o objeto completo
dados_exportacao = {
    "timeline": contagem_diaria.assign(
        Data_Curta=contagem_diaria['Data_Curta'].dt.strftime('%d/%m/%Y')
    ).to_dict(orient='records'),
    "setores": top_setores.to_dict(orient='records'),
    "assuntos": top_assuntos.to_dict(orient='records'),
    "tipos": top_tipos.to_dict(orient='records')
}

with open(caminho_json, 'w', encoding='utf-8') as f:
    json.dump(dados_exportacao, f, ensure_ascii=False, indent=2)

print(f"\n✅ Dados exportados com sucesso para: {caminho_json}")