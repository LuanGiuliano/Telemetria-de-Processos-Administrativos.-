from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from extrator import extract_from_pdf
import os
import shutil

# Supabase Credentials
SUPABASE_URL = "https://walwxmghofttunxbeyyr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbHd4bWdob2Z0dHVueGJleXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDkyMTYsImV4cCI6MjA4ODgyNTIxNn0.ej8UUgSjeHJLChpG0zuCB7GeuetW5M8txaEvPMV44yc"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Processômetro API")

# Habilitar CORS para o Frontend React (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Para desenvolvimento local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")
    
    # Salva o arquivo temporariamente
    temp_path = f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print("Extraindo dados com python (pdfplumber)...")
        # Roda o extrator clássico e robusto em Python
        linhas_processos = extract_from_pdf(temp_path)
        
        if not linhas_processos:
            raise HTTPException(status_code=400, detail="Não foi possível extrair a tabela do PDF (Zero linhas válidas encontradas).")
        
        print(f"[{len(linhas_processos)}] processos limpos extraídos. Deletando base de dados antiga no Supabase...")
        
        # Deleta as informações antigas usando query por uma regra generica pra não usar delete sem Where
        supabase.table("processos_raw").delete().neq("protocolo", "000").execute()
        
        print("Base limpa. Fazendo upload das novas linhas pro Supabase...")
        
        # Insere em lotes para evitar erro de payload muito grande
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
        print(f"Erro Fatal na API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Limpar arquivo temporário
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
