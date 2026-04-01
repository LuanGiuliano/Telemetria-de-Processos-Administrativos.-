import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import CountUp from 'react-countup';
import { Layers, Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronRight, ArrowLeft, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

// URL do CSV Público no Google Sheets (Planilha NOVA - Janeiro)
const CSV_URL_BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQSLPSJbJCJxPYEIMoNwTX7qfQ_OU6InYSnt6JJwDcXbNyt7KpZbPtce4sxDrL_lwjYsYRb6uHdA77G/pub?output=csv&gid=0";
const SHEET_SOURCES = [
  { mes: 'Janeiro', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQSLPSJbJCJxPYEIMoNwTX7qfQ_OU6InYSnt6JJwDcXbNyt7KpZbPtce4sxDrL_lwjYsYRb6uHdA77G/pub?output=csv&gid=803624263' },
  { mes: 'Fevereiro', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQSLPSJbJCJxPYEIMoNwTX7qfQ_OU6InYSnt6JJwDcXbNyt7KpZbPtce4sxDrL_lwjYsYRb6uHdA77G/pub?output=csv&gid=121971937' },
  { mes: 'Março', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQSLPSJbJCJxPYEIMoNwTX7qfQ_OU6InYSnt6JJwDcXbNyt7KpZbPtce4sxDrL_lwjYsYRb6uHdA77G/pub?output=csv&gid=2097433804' }
];

const MOCK_DATA = [
  { NOME: 'SEDUC > TESTE > GERAL', DIRETORIA: 'DIOP', 'INICIO SEMANA': '50', 'FINAL SEMANA': '60', SEMANA: '1' }
];

const DashboardMacro = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedSector, setSelectedSector] = useState(null);

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [selectedWeek, setSelectedWeek] = useState('Todas');
  const [weekPeriods, setWeekPeriods] = useState({});

  useEffect(() => {
    const fetchCSV = async () => {
      if (!SHEET_SOURCES || SHEET_SOURCES.length === 0) {
        setData(MOCK_DATA);
        setIsLoading(false);
        return;
      }

      try {
        const fetchPromises = [fetch(CSV_URL_BASE)];
        SHEET_SOURCES.forEach(s => fetchPromises.push(fetch(s.url)));

        const responses = await Promise.all(fetchPromises);
        const resBase = responses.shift();

        const baseText = await resBase.text();
        const sheetTexts = await Promise.all(responses.map(r => r.text()));

        // Processar as datas de cada semana da base
        const periods = {};
        let currentMonth = "";
        baseText.split('\n').forEach(line => {
          const cols = line.split(',');
          const c0 = (cols[0] || "").trim();
          const c1 = (cols[1] || "").trim();

          if (c0 && !c0.toUpperCase().includes('SEMANA') && (!c1 || c1 === '')) {
            currentMonth = c0.toUpperCase();
          } else if (c0.toUpperCase().includes('SEMANA')) {
            const m = c0.match(/SEMANA\s+(\d+)/i);
            if (m && currentMonth) {
              periods[`${currentMonth}_${m[1]}`] = c1;
            }
          }
        });
        setWeekPeriods(periods);

        const combinedData = [];
        let hasError = false;

        for (let i = 0; i < sheetTexts.length; i++) {
          const mOrder = { 'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12 };
          const source = SHEET_SOURCES[i];
          const mIdx = mOrder[source.mes] || 0;

          const lines = sheetTexts[i].split('\n');
          if (lines.length > 0 && lines[0].includes('UNIDADES PAE EM ORDEM')) {
            lines.shift(); // Remove a primeira linha inteira
          }
          const cleanCSV = lines.join('\n');

          Papa.parse(cleanCSV, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                const enhanced = results.data.filter(r => r && r.NOME && r.NOME !== '' && r.NOME.toUpperCase() !== 'NOME' && !r.NOME.includes('UNIDADES PAE EM ORDEM')).map(row => {
                  let weekVal = String(row.SEMANA || '').trim();
                  if (weekVal !== '' && weekVal.toUpperCase() !== 'SEMANA' && !isNaN(parseInt(weekVal, 10))) {
                    row.SEMANA = weekVal;
                  }
                  row._monthName = source.mes;
                  return row;
                });
                combinedData.push(...enhanced);
              } else {
                hasError = true;
              }
            },
            error: (err) => {
              console.error(err);
              hasError = true;
            }
          });
        }

        if (!hasError && combinedData.length > 0) {
          setData(combinedData);
          setErrorStatus(false);
        } else {
          setData(MOCK_DATA);
          setErrorStatus(true);
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Erro ao baixar o CSV:", err);
        setData(MOCK_DATA);
        setErrorStatus(true);
        setIsLoading(false);
      }
    };

    fetchCSV();
  }, []);

  const filteredData = useMemo(() => {
    if (selectedMonth === 'Ano') return data;
    return data.filter(item => item._monthName && item._monthName.toUpperCase() === selectedMonth.toUpperCase());
  }, [data, selectedMonth]);

  const availableWeeks = useMemo(() => {
    const weeks = new Set();
    filteredData.forEach(item => {
      const val = String(item.SEMANA || '').trim();
      // Ignorar strings vazias ou cabeçalhos repetidos tipo a palavra literal "SEMANA"
      if (val !== '' && val.toUpperCase() !== 'SEMANA' && !isNaN(parseInt(val, 10))) {
        weeks.add(val);
      }
    });

    return Array.from(weeks).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [filteredData]);

  const treeData = useMemo(() => {
    const root = {};
    const sectorMap = new Map();

    filteredData.forEach(item => {
      // Ignorar cabeçalhos extras
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

          if (isMain) {
            setorName = `Caixa Principal (${sigla})`;
          } else {
            setorName = rawName.replace(new RegExp(`^${sigla}[/\\-\\s]*`, 'i'), '').trim();
          }
          break;
        }
      }

      const rawWeek = parseInt(item.SEMANA || 0, 10) || 0;
      if (rawWeek === 0) return; // Ignora linhas de headers repetidas

      const rawSegStr = String(item['INICIO SEMANA'] || '').trim();
      const rawSexStr = String(item['FINAL SEMANA'] || '').trim();

      const isSegEmpty = rawSegStr === '' || rawSegStr === '-';
      const isSexEmpty = rawSexStr === '' || rawSexStr === '-';

      // Pular a inserção de semanas cujo valor ainda não foi preenchido na planilha para não zerar os dados finais
      if (isSegEmpty || isSexEmpty) return;

      const key = `${dirName}|${coordName}|${setorName}`;

      const segVal = parseInt(rawSegStr, 10) || 0;
      const sexVal = parseInt(rawSexStr, 10) || 0;

      if (!sectorMap.has(key)) {
        sectorMap.set(key, {
          itemObj: item,
          dirName,
          coordName,
          setorName,
          seg: segVal,
          sex: sexVal,
          minWeek: rawWeek,
          maxWeek: rawWeek,
          minMonth: item._monthName,
          maxMonth: item._monthName,
          allWeeksMsg: `Semana ${item.SEMANA}`,
          weeklyHistory: [{ week: rawWeek, init: segVal, final: sexVal, month: item._monthName }]
        });
      } else {
        const existing = sectorMap.get(key);
        // Em visão consolidada anual, a mínima semana global é a do mês mais antigo
        const mOrder = { 'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12 };
        
        const mIdx = item._monthName ? (mOrder[item._monthName] || 99) : 99;
        const eIdx = existing.minMonth ? (mOrder[existing.minMonth] || 99) : 99;
        const eMaxIdx = existing.maxMonth ? (mOrder[existing.maxMonth] || 0) : 0;

        // Atualiza o Seg inicial da Coordenadoria APENAS se fomos mais para o passado
        if (mIdx < eIdx || (mIdx === eIdx && rawWeek < existing.minWeek)) {
             existing.seg = segVal;
             existing.minWeek = rawWeek;
             existing.minMonth = item._monthName;
        }
        // Atualiza o Sex final APENAS se fomos mais para o futuro
        if (mIdx > eMaxIdx || (mIdx === eMaxIdx && rawWeek > existing.maxWeek)) {
             existing.sex = sexVal;
             existing.maxWeek = rawWeek;
             existing.maxMonth = item._monthName;
        }
        
        existing.allWeeksMsg = `Consolidado Histórico`;
        existing.weeklyHistory.push({ week: rawWeek, init: segVal, final: sexVal, month: item._monthName });
      }
    });

    // Mapeamento final para agrupamento hierárquico
    for (let [, sectorAgg] of sectorMap) {
      const { dirName, coordName, setorName, itemObj, weeklyHistory } = sectorAgg;

      const mOrder = { 'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12 };
      weeklyHistory.sort((a, b) => {
         const mA = mOrder[a.month] || 99;
         const mB = mOrder[b.month] || 99;
         if (mA !== mB) return mA - mB;
         return parseInt(a.week, 10) - parseInt(b.week, 10);
      });

      let globalResolved = 0;
      weeklyHistory.forEach(w => {
        if (w.init > w.final) globalResolved += (w.init - w.final);
      });
      for (let i = 1; i < weeklyHistory.length; i++) {
        const prevFinal = weeklyHistory[i - 1].final;
        const currFinal = weeklyHistory[i].final;
        if (currFinal < prevFinal) {
          globalResolved += (prevFinal - currFinal);
        }
      }

      let displaySeg = sectorAgg.seg;
      let displaySex = sectorAgg.sex;
      let displayDelta = displaySex - displaySeg;
      let displayResolved = globalResolved;
      let displayMsg = selectedMonth === 'Ano' ? 'Ano de 2026 (Consolidado)' : `Mês Inteiro (${sectorAgg.allWeeksMsg})`;

      if (selectedWeek !== 'Todas') {
        const wInt = parseInt(selectedWeek, 10);
        const targetW = weeklyHistory.find(w => w.week === wInt);

        if (!targetW) continue;

        displaySeg = targetW.init;
        displaySex = targetW.final;
        displayDelta = displaySex - displaySeg;

        let weekResolved = 0;
        if (targetW.init > targetW.final) {
          weekResolved += (targetW.init - targetW.final);
        }

        const wIdx = weeklyHistory.findIndex(w => w.week === wInt);
        if (wIdx > 0) {
          const prevW = weeklyHistory[wIdx - 1];
          if (targetW.final < prevW.final) {
            weekResolved += (prevW.final - targetW.final);
          }
        }

        displayResolved = weekResolved;
        displayMsg = weekPeriods[`${selectedMonth.toUpperCase()}_${selectedWeek}`] || `Semana ${selectedWeek}`;
      }

      if (!root[dirName]) {
        root[dirName] = { name: dirName, seg: 0, sex: 0, delta: 0, resolved: 0, coords: {} };
      }

      if (!root[dirName].coords[coordName]) {
        root[dirName].coords[coordName] = { name: coordName, seg: 0, sex: 0, delta: 0, resolved: 0, setores: [] };
      }

      const leaf = {
        ...itemObj,
        name: setorName,
        seg: displaySeg,
        sex: displaySex,
        delta: displayDelta,
        resolved: displayResolved,
        Semana_Referencia: displayMsg
      };

      root[dirName].coords[coordName].setores.push(leaf);
      root[dirName].coords[coordName].seg += displaySeg;
      root[dirName].coords[coordName].sex += displaySex;
      root[dirName].coords[coordName].delta += displayDelta;
      root[dirName].coords[coordName].resolved += displayResolved;
      root[dirName].seg += displaySeg;
      root[dirName].sex += displaySex;
      root[dirName].delta += displayDelta;
      root[dirName].resolved += displayResolved;
    }

    // Ordenação: maiores deltas primeiro
    return Object.values(root).map(dir => ({
      ...dir,
      coords: Object.values(dir.coords).sort((a, b) => b.delta - a.delta)
    })).sort((a, b) => b.delta - a.delta);
  }, [filteredData, selectedWeek, selectedMonth]);

  const totalEstoqueInicial = treeData.reduce((acc, curr) => acc + curr.seg, 0);
  const totalEstoqueHoje = treeData.reduce((acc, curr) => acc + curr.sex, 0);
  const totalDelta = treeData.reduce((acc, curr) => acc + curr.delta, 0);
  const totalResolved = treeData.reduce((acc, curr) => acc + curr.resolved, 0);
  const totalEntered = totalDelta + totalResolved;

  const donutChartData = useMemo(() => {
    let result = [];
    treeData.forEach(dir => {
      dir.coords.forEach(coord => {
        if (coord.sex > 0) {
          result.push({
            name: coord.name.split(' - ')[0],
            value: coord.sex,
            fullName: coord.name
          });
        }
      });
    });
    return result.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [treeData]);

  // Paleta Corporate: Emerald Escuro, Slate Azulado, Azul Celeste Escuro, Indigo, Teal Profundo, Slate Slate, Amber Sóbrio
  const DONUT_COLORS = ['#059669', '#1e293b', '#0369a1', '#4338ca', '#0f766e', '#334155', '#ea580c', '#475569'];

  const toggleNode = (id) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));

  const timeframe = useMemo(() => {
    if (selectedWeek !== 'Todas') {
      const period = weekPeriods[`${selectedMonth.toUpperCase()}_${selectedWeek}`];
      return period ? `${selectedMonth} (${period})` : `${selectedMonth} - Semana ${selectedWeek}`;
    }
    return `${selectedMonth} - Mês Inteiro`;
  }, [selectedMonth, selectedWeek, weekPeriods]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // Visão de Detalhe do Setor
  if (selectedSector) {
    const chartData = [
      { name: selectedWeek === 'Todas' ? 'Início do Período' : 'Início da Semana', value: selectedSector.seg, color: '#94a3b8' },
      { name: selectedWeek === 'Todas' ? 'Final do Período' : 'Final da Semana', value: selectedSector.sex, color: selectedSector.delta > 0 ? '#ef4444' : '#10b981' }
    ];

    const resolvedValue = selectedSector.resolved || 0;
    const totalVolume = selectedSector.sex + resolvedValue;
    const resolutionRate = totalVolume > 0 ? Math.round((resolvedValue / totalVolume) * 100) : 0;

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pt-4 pb-12 w-full z-10 relative">
        <button
          onClick={() => setSelectedSector(null)}
          className="flex items-center gap-2 text-white font-bold mb-8 hover:bg-white/10 px-4 py-2 rounded-xl transition-all"
        >
          <ArrowLeft size={20} /> Voltar para a Lista
        </button>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 text-slate-50 opacity-10">
            <PieIcon size={250} />
          </div>

          <div className="relative z-10">
            <div className="mb-10">
              <span className="text-emerald-600 font-bold uppercase tracking-widest text-sm bg-emerald-50 px-4 py-2 rounded-full">Dashboard Analítico</span>
              <h2 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter mt-4">{selectedSector.name}</h2>
              <p className="text-slate-400 font-medium text-lg mt-2">{selectedSector.Diretoria} • {selectedSector.Coordenadoria}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Gráfico de Rosca */}
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Métricas Detalhadas */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 lg:p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{selectedMonth === 'Ano' ? 'Início do Ano' : (selectedWeek === 'Todas' ? 'Início do Mês' : 'Início da Semana')}</p>
                    <p className="text-5xl font-black text-slate-700">{selectedSector.seg}</p>
                  </div>
                  <div className="bg-slate-50 p-6 lg:p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{selectedMonth === 'Ano' ? 'Final do Ano' : (selectedWeek === 'Todas' ? 'Final do Mês' : 'Final da Semana')}</p>
                    <p className="text-5xl font-black text-slate-900">{selectedSector.sex}</p>
                  </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] flex flex-col justify-center border-2 ${selectedSector.delta > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className="text-sm font-bold opacity-60 uppercase mb-2">Variação Líquida (Delta)</p>
                  <div className="flex items-center gap-4">
                    <span className={`text-6xl font-black ${selectedSector.delta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedSector.delta > 0 ? '+' : ''}{selectedSector.delta}
                    </span>
                    {selectedSector.delta > 0 ? <TrendingUp size={48} className="text-red-400" /> : <TrendingDown size={48} className="text-emerald-400" />}
                  </div>
                  <p className="text-sm font-medium mt-4 text-slate-600">
                    {selectedSector.delta > 0
                      ? "Atenção: O estoque cresceu neste período."
                      : "Excelente: Houve vazão líquida positiva (redução de estoque)."}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-[2.5rem] text-emerald-100 shadow-xl shadow-emerald-200 border border-emerald-400 flex flex-col justify-center">
                  <p className="text-xs font-bold opacity-90 uppercase mb-2">Produtividade (Tramitados)</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl lg:text-6xl font-black text-white">{resolvedValue}</p>
                    <p className="text-xl font-bold text-emerald-200">/ {totalVolume}</p>
                  </div>
                  <div className="mt-3 inline-block bg-white/20 rounded-full px-3 py-1 text-xs font-bold text-white self-start backdrop-blur-sm border border-emerald-400/50">
                    {resolutionRate}% de Taxa de Resolução
                  </div>
                  <p className="text-[10px] mt-4 opacity-80 font-medium leading-tight">
                    Dos {totalVolume} processos que passaram pela unidade no período (somando tudo), a equipe conseguiu tramitar e finalizar a grande maioria de {resolvedValue}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isLoading) return <div className="p-8 text-center text-white font-bold text-xl animate-pulse">Processando Hierarquia SAGEP...</div>;

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="pt-4 pb-12 w-full z-10 relative">

      {errorStatus && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 mb-8 rounded shadow-sm flex items-center gap-3">
          <AlertCircle size={24} />
          <div>
            <p className="font-bold">Aviso: Usando Dados de Demonstração</p>
            <p className="text-sm">Houve um problema ao ler a planilha. Verifique se as colunas (NOME, DIRETORIA, INICIO SEMANA, FINAL SEMANA, SEMANA) estão presentes.</p>
          </div>
        </div>
      )}

      {/* Filtros de Mês e Semana */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col sm:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-emerald-600" size={24} />
          <h2 className="font-bold text-slate-700 text-lg">Filtros de Período</h2>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mês</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                 setSelectedMonth(e.target.value);
                 if (e.target.value === 'Ano') setSelectedWeek('Todas');
              }}
              className="w-full sm:w-56 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="Janeiro">Janeiro</option>
              <option value="Fevereiro">Fevereiro</option>
              <option value="Março">Março</option>
              <option value="Ano">Ano de 2026 (Consolidado)</option>
            </select>
          </div>
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Período</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className={`w-full sm:w-64 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium ${selectedMonth === 'Ano' ? 'bg-slate-100 text-slate-400 opacity-70 cursor-not-allowed' : 'bg-slate-50 text-slate-700'}`}
              disabled={selectedMonth === 'Ano'}
            >
              <option value="Todas">{selectedMonth === 'Ano' ? 'Ano Inteiro (Todos os Meses)' : 'Mês Inteiro (Consolidado)'}</option>
              {selectedMonth !== 'Ano' && availableWeeks.map(week => (
                <option key={week} value={week}>
                  {weekPeriods[`${selectedMonth.toUpperCase()}_${week}`] ? `${weekPeriods[`${selectedMonth.toUpperCase()}_${week}`]}` : `Semana ${week}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Global Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

        {/* CARD 1: ESTOQUE INICIAL */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-slate-100 transition-transform duration-700 group-hover:scale-110">
            <Layers size={100} className="transform -rotate-12 -translate-y-6 translate-x-6 opacity-40 text-emerald-50" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2" title="Total exato de processos na gaveta no INÍCIO deste período.">ESTOQUE INICIAL (ABERTURA)</h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl xl:text-6xl font-black text-slate-400 tracking-tighter">
                <CountUp end={totalEstoqueInicial} duration={1.5} />
              </span>
            </div>
            <div className="mt-4 inline-block bg-slate-50 rounded-full px-4 py-1 text-[10px] font-bold text-slate-500 border border-slate-200">
              Abertura do Período Filtrado
            </div>
          </div>
        </motion.div>

        {/* CARD 2: ESTOQUE FINAL */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-slate-100 transition-transform duration-700 group-hover:scale-110">
            <Layers size={100} className="transform rotate-12 -translate-y-6 translate-x-6 opacity-40 text-blue-100" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2" title="Total exato de processos estocados/parados no fim deste período.">ESTOQUE ATUAL (FECHAMENTO)</h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl xl:text-6xl font-black text-slate-900 tracking-tighter">
                <CountUp end={totalEstoqueHoje} duration={1.5} />
              </span>
              <span className="text-xs font-bold text-slate-500 leading-tight">parados</span>
            </div>
            <div className="mt-4 inline-block bg-slate-100 rounded-full px-4 py-1 text-[10px] font-bold text-slate-600">
              Posição: {timeframe}
            </div>
          </div>
        </motion.div>

        {/* CARD 3: DELTA */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                {totalDelta > 0 ? 'ACÚMULO (+)' : totalDelta < 0 ? 'DESACÚMULO (-)' : 'SALDO ESTÁVEL'}
              </h2>
              <div className="group/tooltip relative">
                <Info size={16} className="text-slate-400 cursor-help" />
                <div className="absolute bottom-full right-0 lg:left-1/2 lg:-translate-x-1/2 mb-4 w-72 bg-slate-900/95 backdrop-blur-sm text-white text-xs p-5 rounded-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] leading-relaxed border border-slate-700 pointer-events-none">
                  <div className="font-bold text-sm mb-2 text-emerald-400 border-b border-slate-700 pb-2">Como ler o Delta?</div>
                  O Delta mostra a diferença matemática do estoque inicial para o estoque final.
                  <div className="mt-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] shrink-0"></span>
                      <span className="text-red-400 font-bold">Positivo (+): Retenção.</span> Mais processos entraram na rede. O estoque acumulou.
                    </div>
                  </div>
                  <div className="hidden lg:block absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900/95"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1 mt-2">
              <span className={`text-5xl xl:text-6xl font-black tracking-tighter ${totalDelta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {totalDelta > 0 ? '+' : ''}<CountUp end={totalDelta} duration={1.5} />
              </span>
              <div className="flex items-center justify-center p-2 xl:p-3 rounded-full bg-slate-50 shadow-inner shrink-0">
                {totalDelta > 0 ? <TrendingUp size={24} className="text-red-500" /> : <TrendingDown size={24} className="text-emerald-500" />}
              </div>
            </div>
          </div>
        </motion.div>

        {/* CARD 4: FLUXO DE PRODUÇÃO */}
        <motion.div variants={itemVariants} className="bg-slate-900 rounded-3xl p-6 lg:p-7 shadow-xl shadow-slate-300/50 border border-slate-800 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 text-slate-800 transition-transform duration-700 group-hover:scale-110">
            <Activity size={120} className="transform rotate-12 -translate-y-4 translate-x-4 opacity-50" />
          </div>
          <div className="relative z-10 w-full">
            <h2 className="text-xs lg:text-[11px] xl:text-xs font-bold text-slate-400 uppercase tracking-normal mb-4" title="Total de processos novos que chegaram vs Total que foram tramitados/saíram da gaveta.">FLUXO DO PERÍODO (ENTRADAS E BAIXAS)</h2>

            <div className="flex flex-col gap-3 w-full">
              {/* Entradas */}
              <div className="flex justify-between items-center bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <span className="text-[10px] xl:text-xs font-bold text-slate-300 uppercase">1. Chegaram (Novos) +</span>
                <span className="text-2xl lg:text-3xl font-black text-white tracking-tighter shadow-sm">
                  <CountUp end={totalEntered} duration={1.5} />
                </span>
              </div>

              {/* Saídas */}
              <div className="flex justify-between items-center bg-emerald-500/20 px-4 py-3 rounded-2xl border border-emerald-500/30 backdrop-blur-sm">
                <span className="text-[10px] xl:text-xs font-bold text-emerald-400 uppercase">2. Tramitados (Saíram) -</span>
                <span className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tighter shadow-sm">
                  <CountUp end={totalResolved} duration={1.5} />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráfico de Distribuição */}
      <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-100 mb-8 overflow-hidden relative group">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 shrink-0">
            <PieIcon size={18} className="text-blue-500" />
            Distribuição de Processos por Coordenadoria
          </h2>
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl max-w-sm">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-relaxed">
              Este gráfico exibe quais Coordenadorias detêm o maior volume do <strong className="font-bold text-slate-700">Estoque de Fechamento</strong> no período selecionado.
            </p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutChartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {donutChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value, name, props) => [`${value} processos`, props.payload.name]}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Renderização da Árvore Hierárquica */}
      <div className="space-y-4">
        {treeData.map((dir, dIdx) => (
          <div key={dIdx} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div
              className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-all border-l-8 border-emerald-600 group/dir"
              onClick={(e) => {
                const isChevron = e.target.closest('.chevron-area');
                if (isChevron) {
                  toggleNode(`dir-${dir.name}`);
                } else {
                  setSelectedSector({ ...dir, level: 'Diretoria' });
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-1 rounded bg-slate-100 chevron-area hover:bg-slate-200 transition-colors"
                  onClick={(e) => { e.stopPropagation(); toggleNode(`dir-${dir.name}`); }}
                >
                  {expandedNodes[`dir-${dir.name}`] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    {dir.name}
                    <Activity size={16} className="opacity-0 group-hover/dir:opacity-100 text-emerald-500 transition-opacity" />
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nível 1: Diretoria (Clique p/ detalhes)</p>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div className="w-24"><p className="text-[9px] font-bold text-slate-400 uppercase" title="Estoque retido fisicamente na gaveta no final do período filtrado.">Estoque Fim</p><p className="font-extrabold text-slate-900">{dir.sex}</p></div>
                <div className="w-24"><p className="text-[9px] font-bold text-slate-400 uppercase">ACÚMULO (+/-)</p><p className={`font-black ${dir.delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{dir.delta > 0 ? '+' : ''}{dir.delta}</p></div>
              </div>
            </div>

            {expandedNodes[`dir-${dir.name}`] && (
              <div className="bg-slate-50/50">
                {dir.coords.map((coord, cIdx) => (
                  <div key={cIdx} className="ml-8 border-l-2 border-slate-200">
                    <div
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-white transition-all border-b border-slate-100 group/coord"
                      onClick={(e) => {
                        const isChevron = e.target.closest('.chevron-area');
                        if (isChevron) {
                          toggleNode(`coord-${dir.name}-${coord.name}`);
                        } else {
                          setSelectedSector({ ...coord, level: 'Coordenadoria', Diretoria: dir.name });
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="p-1 rounded bg-white shadow-sm border border-slate-100 chevron-area hover:bg-slate-50 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleNode(`coord-${dir.name}-${coord.name}`); }}
                        >
                          {expandedNodes[`coord-${dir.name}-${coord.name}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-700 flex items-center gap-2">
                            {coord.name}
                            <Activity size={14} className="opacity-0 group-hover/coord:opacity-100 text-blue-500 transition-opacity" />
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Nível 2: Coordenadoria (Clique p/ detalhes)</p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-right">
                        <div className="w-20"><p className="text-[8px] font-bold text-slate-300 uppercase underline decoration-emerald-200" title="Estoque retido fisicamente na gaveta no final do período filtrado.">Estoque Fim</p><p className="font-bold text-slate-700">{coord.sex}</p></div>
                        <div className="w-20"><p className="text-[8px] font-bold text-slate-300 uppercase">ACÚMULO (+/-)</p><p className={`font-bold ${coord.delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{coord.delta > 0 ? '+' : ''}{coord.delta}</p></div>
                      </div>
                    </div>

                    {expandedNodes[`coord-${dir.name}-${coord.name}`] && (
                      <div className="ml-10 py-2 space-y-1">
                        {coord.setores.map((setor, sIdx) => (
                          <div
                            key={sIdx}
                            onClick={() => setSelectedSector({ ...setor, level: 'Setor', Coordenadoria: coord.name, Diretoria: dir.name })}
                            className="p-3 mr-4 flex justify-between items-center bg-white rounded-lg border border-slate-200/60 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group/leaf"
                          >
                            <div>
                              <p className="font-bold text-slate-600 text-sm flex items-center gap-2">
                                {setor.name}
                                <Activity size={14} className="opacity-0 group-hover/leaf:opacity-100 text-blue-500 transition-opacity" />
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Nível 3: Unidade Operacional (Clique p/ detalhes)</p>
                            </div>
                            <div className="flex gap-4 text-right">
                              <div className="w-16"><p className="text-[7px] font-bold text-slate-400 leading-tight">{selectedMonth === 'Ano' ? 'INÍCIO DO ANO' : (selectedWeek === 'Todas' ? 'INÍCIO DO MÊS' : 'INÍCIO SEMANA')}</p><p className="text-xs font-medium text-slate-500">{setor.seg}</p></div>
                              <div className="text-right w-16"><p className="text-[7px] font-bold text-slate-400">ACÚMULO</p><p className={`text-xs font-black ${setor.delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{setor.delta > 0 ? '+' : ''}{setor.delta}</p></div>
                              <div className="w-16"><p className="text-[7px] font-bold text-slate-400 leading-tight">{selectedMonth === 'Ano' ? 'FINAL DO ANO' : (selectedWeek === 'Todas' ? 'FINAL DO MÊS' : 'FINAL SEMANA')}</p><p className="text-xs font-bold text-slate-800">{setor.sex}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default DashboardMacro;

