import Papa from 'papaparse';
import https from 'https';
import fs from 'fs';

const SHEET_SOURCES = [
  { mes: 'Janeiro', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQSLPSJbJCJxPYEIMoNwTX7qfQ_OU6InYSnt6JJwDcXbNyt7KpZbPtce4sxDrL_lwjYsYRb6uHdA77G/pub?output=csv&gid=803624263' },
  { mes: 'Fevereiro', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQSLPSJbJCJxPYEIMoNwTX7qfQ_OU6InYSnt6JJwDcXbNyt7KpZbPtce4sxDrL_lwjYsYRb6uHdA77G/pub?output=csv&gid=121971937' },
  { mes: 'Março', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQSLPSJbJCJxPYEIMoNwTX7qfQ_OU6InYSnt6JJwDcXbNyt7KpZbPtce4sxDrL_lwjYsYRb6uHdA77G/pub?output=csv&gid=2097433804' }
];

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function fetchCSV() {
  try {
      const fetchPromises = [];
      SHEET_SOURCES.forEach(s => fetchPromises.push(fetchUrl(s.url)));
      
      const sheetTexts = await Promise.all(fetchPromises);
      const combinedData = [];

      for (let i = 0; i < sheetTexts.length; i++) {
        const source = SHEET_SOURCES[i];
        const lines = sheetTexts[i].split('\n');
        if (lines.length > 0 && lines[0].includes('UNIDADES PAE EM ORDEM')) {
          lines.shift();
        }
        const cleanCSV = lines.join('\n');
        
        Papa.parse(cleanCSV, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const enhanced = results.data
                .filter(r => r && r.NOME && r.NOME !== '' && r.NOME.toUpperCase() !== 'NOME' && !r.NOME.includes('UNIDADES PAE EM ORDEM'))
                .map(row => {
                  let weekVal = String(row.SEMANA || '').trim();
                  if (weekVal !== '' && weekVal.toUpperCase() !== 'SEMANA' && !isNaN(parseInt(weekVal, 10))) {
                    row.SEMANA = weekVal;
                  }
                  row._monthName = source.mes;
                  return row;
                });
              combinedData.push(...enhanced);
            }
          }
        });
      }

      const sectorMap = new Map();
      combinedData.forEach(item => {
        if (!item.NOME || item.NOME.includes("UNIDADES PAE EM ORDEM")) return;

        const dirName = item.DIRETORIA && item.DIRETORIA !== '-' ? item.DIRETORIA : "OUTROS";
        let rawName = item.NOME || "PADRÃO";
        if (item.NOME && item.NOME.includes('>')) {
          const parts = item.NOME.split('>').map(p => p.trim());
          rawName = parts.length >= 3 ? parts[1] : parts[parts.length - 1];
        }

        const COORDENADORIAS = {
          "SAGEP": "SAGEP - SECRETARIA ADJUNTA DE GESTÃO DE PESSOAS",
          "CCM": "CCM - COORDENADORIA DE CONTROLE E MOVIMENTAÇÃO",
          "CVAS": "CVAS - COORDENADORIA DE VALORIZAÇÃO E ASSISTÊNCIA AO SERVIDOR",
          "COR": "COR - COORDENADORIA DE ORGANIZAÇÃO DE REDE",
          "CAPO": "CAPO - COORDENADORIA DE APOSENTADORIA",
          "CPS": "CPS - COORDENADORIA DE PLANEJAMENTO E SELEÇÃO",
          "CFOP": "CFOP - COORDENADORIA DE FOLHA DE PAGAMENTO",
          "CADDEP": "CADDEP - COORDENADORIA DE AVALIAÇÃO DE DESEMPENHO E DESENVOLVIMENTO DE PESSOAS"
        };

        let coordName = "DIRETORIAS";
        let setorName = rawName;

        for (const [sigla, descricao] of Object.entries(COORDENADORIAS)) {
          if (rawName.startsWith(sigla) || (item.NOME && item.NOME.includes(`> ${sigla}`))) {
            coordName = descricao;
            const isMain = rawName.toUpperCase().includes("COORDENADORIA") || rawName.toUpperCase().includes("SECRETARIA") || rawName.trim() === sigla;
            if (isMain) setorName = `Caixa Principal (${sigla})`;
            else setorName = rawName.replace(new RegExp(`^${sigla}[/\\-\\s]*`, 'i'), '').trim();
            break;
          }
        }

        const rawWeek = parseInt(item.SEMANA || 0, 10) || 0;
        if (rawWeek === 0) return;

        const rawSegStr = String(item['INICIO SEMANA'] || '').trim();
        const rawSexStr = String(item['FINAL SEMANA'] || '').trim();

        const isSegEmpty = rawSegStr === '' || rawSegStr === '-';
        const isSexEmpty = rawSexStr === '' || rawSexStr === '-';

        if (isSegEmpty || isSexEmpty) return;

        const key = `${dirName}|${coordName}|${setorName}`;
        const segVal = parseInt(rawSegStr, 10) || 0;
        const sexVal = parseInt(rawSexStr, 10) || 0;

        if (!sectorMap.has(key)) {
          sectorMap.set(key, {
            setorName, dirName, coordName,
            seg: segVal, sex: sexVal,
            minWeek: rawWeek, maxWeek: rawWeek,
            minMonth: item._monthName, maxMonth: item._monthName,
            weeklyHistory: [{ week: rawWeek, init: segVal, final: sexVal, month: item._monthName }]
          });
        } else {
          const existing = sectorMap.get(key);
          const mOrder = { 'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4 };
          const mIdx = mOrder[item._monthName] || 99;
          const eIdx = mOrder[existing.minMonth] || 99;
          const eMaxIdx = mOrder[existing.maxMonth] || 0;

          if (mIdx < eIdx || (mIdx === eIdx && rawWeek < existing.minWeek)) {
              existing.seg = segVal;
              existing.minWeek = rawWeek;
              existing.minMonth = item._monthName;
          }
          if (mIdx > eMaxIdx || (mIdx === eMaxIdx && rawWeek > existing.maxWeek)) {
              existing.sex = sexVal;
              existing.maxWeek = rawWeek;
              existing.maxMonth = item._monthName;
          }
          existing.weeklyHistory.push({ week: rawWeek, init: segVal, final: sexVal, month: item._monthName });
        }
      });

      let strOut = '--- RESULTADOS CPS ---\n';
      for (let [key, sectorAgg] of sectorMap) {
        if (sectorAgg.coordName.includes('CPS')) {
          const wH = sectorAgg.weeklyHistory;
          const mOrder = { 'Janeiro': 1, 'Fevereiro': 2, 'Março': 3 };
          wH.sort((a,b) => {
             const mA = mOrder[a.month]||99;
             const mB = mOrder[b.month]||99;
             if(mA!==mB) return mA-mB;
             return a.week - b.week;
          });
          let globalResolved = 0;
          wH.forEach(w => { if (w.init > w.final) globalResolved += (w.init - w.final); });
          for (let i = 1; i < wH.length; i++) {
            if (wH[i].final < wH[i-1].final) {
              globalResolved += (wH[i-1].final - wH[i].final);
            }
          }
          
          let delta = sectorAgg.sex - sectorAgg.seg;
          let totalEntered = delta + globalResolved;

          strOut += `SETOR: ${sectorAgg.setorName}\n`;
          strOut += `DIRETORIA: ${sectorAgg.dirName}\n`;
          strOut += `ESTOQUE INICIAL(JAN): ${sectorAgg.seg}\n`;
          strOut += `ESTOQUE FINAL(HOJE): ${sectorAgg.sex}\n`;
          strOut += `ACÚMULO (DELTA): ${delta}\n`;
          strOut += `TOTAL RESOLVIDO (TRAMITADO O ANO TODO): ${globalResolved}\n`;
          strOut += `TOTAL PROCESSOS QUE CHEGARAM (ENTRADAS O ANO TODO): ${totalEntered}\n`;
          strOut += '---------------------------\n';
        }
      }
      fs.writeFileSync('output_clean.txt', strOut, 'utf8');
  } catch(e) { fs.writeFileSync('output_clean.txt', String(e), 'utf8'); }
}

fetchCSV();
