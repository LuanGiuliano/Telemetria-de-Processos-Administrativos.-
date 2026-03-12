import pdfplumber

BOUNDS = {
    'INTER': (174, 410),
    'ASSUN': (410, 480),
    'COMPL': (480, 2000)
}

doc = pdfplumber.open('extrato_processos.pdf')

for page_idx, page in enumerate(doc.pages[:2]):
    words = page.extract_words()
    
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
    
    print(f"=== PAGE {page_idx + 1} ===")
    
    recording = False
    proc_text = []
    
    for y, row_words in s_rows:
        row_words = sorted(row_words, key=lambda x: x['x0'])
        full_line = ' '.join(w['text'] for w in row_words)
        
        if 'PROTOCOLO' in full_line or 'SETOR DESTINO' in full_line:
            continue
            
        assun_words = [w for w in row_words if 410 <= (w['x0'] + w['x1'])/2 < 480]
        inter_words = [w for w in row_words if 174 <= (w['x0'] + w['x1'])/2 < 410]
        compl_words = [w for w in row_words if 480 <= (w['x0'] + w['x1'])/2 < 2000]
        
        a_str = ' '.join(w['text'] for w in assun_words)
        i_str = ' '.join(w['text'] for w in inter_words)
        c_str = ' '.join(w['text'] for w in compl_words)
        
        if '2026/2088468' in full_line or '2025/3159360' in full_line or '2026/2028348' in full_line:
            recording = True
            
        if recording:
            print(f"Y={y:.1f} | INT: {i_str:30} | ASSUN: {a_str:30} | COMPL: {c_str}")
            if not i_str and not a_str and not c_str:
                recording = False
