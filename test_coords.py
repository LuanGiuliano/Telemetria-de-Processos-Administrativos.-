import pdfplumber

doc = pdfplumber.open('extrato_processos.pdf')
page1 = doc.pages[0]

words = page1.extract_words()
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

s_rows = sorted(linhas_y.items(), key=lambda x: x[0])

for y, row_words in s_rows:
    row_words = sorted(row_words, key=lambda x: x['x0'])
    row_text = ' '.join(w['text'] for w in row_words)
    if 'atividade' in row_text.lower() or 'cessão' in row_text.lower() or 'tempo' in row_text.lower():
        print(f"--- ROW AT Y = {round(y, 1)} ---")
        for w in row_words:
            print(f"[{w['x0']:.1f}-{w['x1']:.1f}] {w['text']}")
