import pdfplumber

doc = pdfplumber.open('extrato_processos.pdf')

for page_idx, page in enumerate(doc.pages[:2]):
    words = page.extract_words()
    print(f"=== PAGE {page_idx + 1} ===")
    for w in words:
        if w['text'] == 'ASSUNTO':
            print(f"HEADER ASSUNTO: X=[{w['x0']:.1f} - {w['x1']:.1f}]")
        if w['text'] == 'INTERESSADO':
            print(f"HEADER INTERESSADO: X=[{w['x0']:.1f} - {w['x1']:.1f}]")
        if w['text'] == 'COMPLEMENTO':
            print(f"HEADER COMPLEMENTO: X=[{w['x0']:.1f} - {w['x1']:.1f}]")

