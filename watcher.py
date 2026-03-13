import time
import os
import shutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Asserts extrator.py is in the current directory
import extrator

# Pastas configuradas
DESKTOP_PATH = os.path.join(os.path.expanduser("~"), "Desktop")
WATCH_FOLDER = os.path.join(DESKTOP_PATH, "Colocar_Relatorio_Aqui")
DEST_FOLDER = os.path.dirname(os.path.abspath(__file__))

class PDFHandler(FileSystemEventHandler):
    def on_created(self, event):
        # Ignora se for diretório
        if event.is_directory:
            return

        filepath = event.src_path
        filename = os.path.basename(filepath)

        # Verifica se é um PDF
        if filename.lower().endswith('.pdf'):
            print(f"\n[Watchdog] Novo PDF detectado: {filename}")
            
            # Pequeno delay para garantir que o sistema operacional terminou de copiar o arquivo
            time.sleep(2)
            
            # Copiar PDF e substituir o extrato_processos.pdf existente na raiz do projeto
            dest_path = os.path.join(DEST_FOLDER, "extrato_processos.pdf")
            try:
                print("[Watchdog] Copiando arquivo para o cérebro...")
                shutil.copy2(filepath, dest_path)
                
                print("[Watchdog] Iniciando extração e atualização do Dashboard...")
                # Chama a função principal do extrator
                extrator.executar_extracao(dest_path)
                
                print(f"[Watchdog] ✅ Dashboard atualizado com sucesso com {filename}!")
                print("[Watchdog] Você pode apagar o relatório da pasta do Desktop se desejar.")
            except Exception as e:
                print(f"[Watchdog] ❌ Erro ao processar o novo PDF: {e}")

if __name__ == "__main__":
    if not os.path.exists(WATCH_FOLDER):
        os.makedirs(WATCH_FOLDER)
        print(f"[Watchdog] Pasta de monitoramento criada em: {WATCH_FOLDER}")

    event_handler = PDFHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_FOLDER, recursive=False)
    observer.start()
    
    print(f"👀 [Watchdog] Monitorando a pasta '{WATCH_FOLDER}' por novos PDFs...")
    print("Mantenha esta janela aberta. Para parar, pressione Ctrl+C.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
