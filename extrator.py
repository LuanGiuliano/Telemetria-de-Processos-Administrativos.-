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

# Mostra o resultado final ordenado de janeiro até março
print("\n--- Linha do Tempo do Processômetro ---")
print(contagem_diaria.to_string(index=False))

# 4. Exportação dos Dados para o Frontend (React/Next.js)
caminho_json = "processometro_dados.json"
# Formatando a data de volta para string legível antes de exportar
contagem_diaria['Data_Curta'] = contagem_diaria['Data_Curta'].dt.strftime('%d/%m/%Y')
contagem_diaria.to_json(caminho_json, orient='records', force_ascii=False)
print(f"\n✅ Dados exportados com sucesso para: {caminho_json}")