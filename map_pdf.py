import pdfplumber
doc = pdfplumber.open('extrato_processos.pdf')
page1 = doc.pages[0]
words = page1.extract_words()

# Find rows by Y coordinate
rows_y = {}
for w in words:
    y_center = (w['top'] + w['bottom']) / 2
    found_y = None
    for cy in rows_y.keys():
        if abs(cy - y_center) < 7:
            found_y = cy
            break
    if not found_y:
        found_y = y_center
        rows_y[found_y] = []
    rows_y[found_y].append(w)

s_rows = sorted(rows_y.items(), key=lambda x: x[0])

print('First 10 rows of PDF:')
for y, wl in s_rows[:10]:
    wl = sorted(wl, key=lambda x: x['x0'])
    print(f'Y={y:.1f} | ', ' '.join([w['text'] for w in wl]))
    for w in wl:
        print(f"  [{w['x0']:.1f}-{w['x1']:.1f}] {w['text']}")
