import pdfplumber

doc = pdfplumber.open('extrato_processos.pdf')
page = doc.pages[0]
words = page.extract_words()

print("--- RAW WORDS IN ASSUNTO ---")
for w in words:
    if 410 < w['x0'] < 480:
        if w['text'] in ['CONCESSÃO', 'BENEFÍCIOS', 'DE']:
            y_center = (w['top'] + w['bottom']) / 2
            print(f"Word: {w['text']:15} | Y: {y_center:.2f} | X: {w['x0']:.2f}")
