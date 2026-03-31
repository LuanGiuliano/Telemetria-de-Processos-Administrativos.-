from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from extrator import extract_from_pdf
from motor_etl.batch_processor import extract_from_pdf as extract_micro_from_pdf
import os
import shutil
import pandas as pd

# Supabase Credentials
SUPABASE_URL = "https://walwxmghofttunxbeyyr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbHd4bWdob2Z0dHVueGJleXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDkyMTYsImV4cCI6MjA4ODgyNTIxNn0.ej8UUgSjeHJLChpG0zuCB7GeuetW5M8txaEvPMV44yc"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Processômetro API")

# Habilitar CORS para o Frontend React (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def converter_data_iso(data_str: str):
    try:
        partes = str(data_str).strip().split('/')
        if len(partes) == 3:
            return f"{partes[2]}-{partes[1]}-{partes[0]}"
        return None
    except Exception:
        return None

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")
    
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print("Extraindo dados com python (pdfplumber)...")
        linhas_processos = extract_from_pdf(temp_path)
        
        if not linhas_processos:
            raise HTTPException(status_code=400, detail="Não foi possível extrair a tabela do PDF (Zero linhas válidas encontradas).")
        
        print(f"[{len(linhas_processos)}] processos limpos extraídos. Deletando base de dados antiga no Supabase...")
        supabase.table("processos_raw").delete().neq("protocolo", "000").execute()
        
        print("Base limpa. Fazendo upload das novas linhas pro Supabase...")
        chunk_size = 1000
        for i in range(0, len(linhas_processos), chunk_size):
            chunk = linhas_processos[i:i + chunk_size]
            supabase.table("processos_raw").insert(chunk).execute()
        
        return {
            "status": "success", 
            "message": "Upload, extração e banco de dados atualizados com sucesso!",
            "rows_inserted": len(linhas_processos)
        }
            
    except Exception as e:
        print(f"Erro Fatal na API (Macro): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/upload-micro")
async def upload_pdf_micro(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")
    
    temp_path = f"temp_micro_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print("Extraindo dados MICRO com python (pdfplumber)...")
        dados_raw = extract_micro_from_pdf(temp_path)
        
        if not dados_raw:
            raise HTTPException(status_code=400, detail="Não foi possível extrair a tabela do PDF Micro (Zero linhas válidas encontradas).")
        
        # Processar e limpar os dados com pandas
        df = pd.DataFrame(dados_raw)
        df = df.fillna('')
        df = df.replace('\n', ' ', regex=True)

        df['Data_Curta'] = df['DATA TRAMITAÇÃO'].apply(lambda x: str(x).strip().split(' ')[0] if x else '')
        df['data'] = df['Data_Curta'].apply(converter_data_iso)
        df = df.dropna(subset=['data'])

        df = df.rename(columns={
            "DATA TRAMITAÇÃO": "data_tramitacao",
            "PROTOCOLO": "protocolo",
            "TIPO PROTOCOLO": "tipo_protocolo",
            "DATA PROTOCOLO": "data_protocolo",
            "INTERESSADO": "interessado",
            "ASSUNTO": "assunto",
            "COMPLEMENTO": "complemento",
            "SETOR_ORIGEM": "Setor_Origem",
        })

        # Colunas que existem na tabela tramitacoes_micro no Supabase
        colunas_finais = ["protocolo", "data", "tipo_protocolo",
                          "data_protocolo", "interessado", "assunto", "complemento", "Setor_Origem"]

        for c in colunas_finais:
            if c not in df.columns:
                df[c] = ''

        df_final = df[colunas_finais]
        df_final = df_final.where(pd.notnull(df_final), None)
        linhas_processos = df_final.to_dict(orient='records')

        print(f"[{len(linhas_processos)}] processos MICRO extraídos. Deletando base antiga no Supabase...")
        supabase.table("tramitacoes_micro").delete().neq("protocolo", "000").execute()

        print("Base limpa. Fazendo upload das novas linhas MICRO pro Supabase...")
        chunk_size = 1000
        for i in range(0, len(linhas_processos), chunk_size):
            chunk = linhas_processos[i:i + chunk_size]
            supabase.table("tramitacoes_micro").insert(chunk).execute()

        return {
            "status": "success",
            "message": "Upload Micro concluído com sucesso!",
            "rows_inserted": len(linhas_processos)
        }

    except Exception as e:
        print(f"Erro Fatal na API (Micro): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
