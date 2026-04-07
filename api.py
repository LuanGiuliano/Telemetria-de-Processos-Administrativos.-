from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from extrator import extract_from_pdf
from motor_etl.batch_processor import extract_from_pdf as extract_micro_from_pdf
import os
import shutil
import pandas as pd
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

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

# ─────────────────────────────────────────────────────────────────────────────
# Sistema de Jobs em Background
# ─────────────────────────────────────────────────────────────────────────────
# Armazena o estado de cada job em memória (suficiente para uso local)
# Estrutura: { job_id: { status, progress, message, result } }
_jobs: dict = {}


def _update_job(job_id: str, **kwargs):
    if job_id in _jobs:
        _jobs[job_id].update(kwargs)


def converter_data_iso(data_str: str):
    try:
        partes = str(data_str).strip().split('/')
        if len(partes) == 3:
            return f"{partes[2]}-{partes[1]}-{partes[0]}"
        return None
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Background workers
# ─────────────────────────────────────────────────────────────────────────────
def _run_micro_job(job_id: str, temp_path: str):
    """Thread em background: extrai PDF → processa com pandas → sobe ao Supabase."""

    def progress_cb(pct: int):
        if pct <= 15:
            msg = "Analisando estrutura do PDF..."
        elif pct <= 85:
            msg = f"Extraindo páginas em paralelo... {pct}%"
        elif pct <= 90:
            msg = "Processando e higienizando registros..."
        else:
            msg = f"Enviando ao banco de dados... {pct}%"
        _update_job(job_id, progress=pct, message=msg)

    try:
        _update_job(job_id, status="processing", progress=1,
                    message="Iniciando extração paralela do PDF...")

        # ── Extração paralela ──────────────────────────────────────────────
        dados_raw = extract_micro_from_pdf(temp_path, progress_cb=progress_cb)

        if not dados_raw:
            raise Exception("Nenhum dado extraído do PDF (zero linhas válidas).")

        _update_job(job_id, progress=87,
                    message=f"{len(dados_raw)} registros brutos extraídos. Processando...")

        # ── Processamento com pandas ───────────────────────────────────────
        df = pd.DataFrame(dados_raw)
        df = df.fillna('')
        df = df.replace('\n', ' ', regex=True)

        df['Data_Curta'] = df['DATA TRAMITAÇÃO'].apply(
            lambda x: str(x).strip().split(' ')[0] if x else ''
        )
        df['data'] = df['Data_Curta'].apply(converter_data_iso)
        df = df.dropna(subset=['data'])

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

        colunas_finais = ["protocolo", "data", "tipo_protocolo",
                          "data_protocolo", "interessado", "assunto",
                          "complemento", "Setor_Origem"]
        for c in colunas_finais:
            if c not in df.columns:
                df[c] = ''

        df_final = df[colunas_finais]
        df_final = df_final.where(pd.notnull(df_final), None)
        linhas_processos = df_final.to_dict(orient='records')

        _update_job(job_id, progress=90,
                    message="Limpando base antiga no Supabase...")

        # ── Upload ao Supabase (paralelo) ──────────────────────────────────
        supabase.table("tramitacoes_micro").delete().neq("protocolo", "000").execute()

        chunk_size = 500
        chunks = [linhas_processos[i:i + chunk_size]
                  for i in range(0, len(linhas_processos), chunk_size)]
        n_chunks = len(chunks)
        uploaded = 0

        def _insert_micro_chunk(chunk):
            supabase.table("tramitacoes_micro").insert(chunk).execute()

        with ThreadPoolExecutor(max_workers=6) as executor:
            futures_list = [executor.submit(_insert_micro_chunk, c) for c in chunks]
            for f in as_completed(futures_list):
                f.result()
                uploaded += 1
                pct = 90 + int(uploaded / n_chunks * 9)   # 90% → 99%
                _update_job(job_id, progress=pct,
                            message=f"Enviando ao banco... {uploaded}/{n_chunks} blocos")

        _update_job(
            job_id,
            status="done",
            progress=100,
            message=f"Concluído! {len(linhas_processos)} processos inseridos com sucesso.",
            result={"rows_inserted": len(linhas_processos)},
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        _update_job(job_id, status="error",
                    message=f"Erro: {str(e)}", result=None)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _run_macro_job(job_id: str, temp_path: str):
    """Thread em background para o upload macro (extrator.py)."""
    try:
        _update_job(job_id, status="processing", progress=5,
                    message="Extraindo dados do PDF Macro...")

        linhas_processos = extract_from_pdf(temp_path)

        if not linhas_processos:
            raise Exception("Nenhum dado extraído do PDF (zero linhas válidas).")

        _update_job(job_id, progress=70,
                    message=f"{len(linhas_processos)} processos extraídos. Limpando base...")

        supabase.table("processos_raw").delete().neq("protocolo", "000").execute()

        _update_job(job_id, progress=80, message="Enviando ao Supabase...")

        chunk_size = 500
        chunks = [linhas_processos[i:i + chunk_size]
                  for i in range(0, len(linhas_processos), chunk_size)]
        n_chunks = len(chunks)
        uploaded = 0

        def _insert_macro_chunk(chunk):
            supabase.table("processos_raw").insert(chunk).execute()

        with ThreadPoolExecutor(max_workers=6) as executor:
            futures_list = [executor.submit(_insert_macro_chunk, c) for c in chunks]
            for f in as_completed(futures_list):
                f.result()
                uploaded += 1
                pct = 80 + int(uploaded / n_chunks * 19)
                _update_job(job_id, progress=pct,
                            message=f"Enviando ao banco... {uploaded}/{n_chunks} blocos")

        _update_job(
            job_id,
            status="done",
            progress=100,
            message=f"Concluído! {len(linhas_processos)} processos inseridos.",
            result={"rows_inserted": len(linhas_processos)},
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        _update_job(job_id, status="error",
                    message=f"Erro: {str(e)}", result=None)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/job-status/{job_id}")
async def job_status(job_id: str):
    """Retorna o status atual de um job de upload."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return _jobs[job_id]


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload do relatório Macro — inicia job em background e retorna job_id imediatamente."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")

    job_id = str(uuid.uuid4())[:10]
    temp_path = f"temp_macro_{job_id}_{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    _jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Na fila — iniciando processamento...",
        "result": None,
    }

    thread = threading.Thread(
        target=_run_macro_job,
        args=(job_id, temp_path),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "queued",
            "message": "Processamento iniciado em background."}


@app.post("/api/upload-micro")
async def upload_pdf_micro(file: UploadFile = File(...)):
    """Upload do relatório Micro — inicia job em background e retorna job_id imediatamente."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são permitidos.")

    job_id = str(uuid.uuid4())[:10]
    temp_path = f"temp_micro_{job_id}_{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    _jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Na fila — iniciando processamento paralelo...",
        "result": None,
    }

    thread = threading.Thread(
        target=_run_micro_job,
        args=(job_id, temp_path),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "queued",
            "message": "Processamento iniciado em background."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
