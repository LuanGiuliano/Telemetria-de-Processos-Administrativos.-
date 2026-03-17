import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import CountUp from 'react-countup';
import { Layers, Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronRight, ArrowLeft, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

// URL do CSV Público no Google Sheets
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRKS0W7esYzKsp5jFoEwjQijfIPgYAZz0fgWVTiLYu2DBwCfNY5PCTh1MRC_iQwLNXGLvPtORCDIlGk/pub?output=csv";

const MOCK_DATA = [
  { Diretoria: 'DIOP', Coordenadoria: 'CCM', Setor: 'Férias', Estoque_Inicial: '50', Estoque_Final: '60', Data_Inicio: '02/03', Data_Fim: '06/03' },
  { Diretoria: 'DIOP', Coordenadoria: 'CCM', Setor: 'Licença Especial', Estoque_Inicial: '100', Estoque_Final: '120', Data_Inicio: '02/03', Data_Fim: '06/03' },
  { Diretoria: 'DIFOB', Coordenadoria: 'GAB', Setor: 'Administrativo', Estoque_Inicial: '45', Estoque_Final: '30', Data_Inicio: '02/03', Data_Fim: '06/03' },
  { Diretoria: 'DIPSE', Coordenadoria: 'TI', Setor: 'Suporte', Estoque_Inicial: '10', Estoque_Final: '0', Data_Inicio: '02/03', Data_Fim: '06/03' }
];

const DashboardMacro = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedSector, setSelectedSector] = useState(null);

  useEffect(() => {
    const fetchCSV = async () => {
      if (!CSV_URL) {
        setData(MOCK_DATA);
        setIsLoading(false);
        return;
      }

      Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0 && (results.data[0].Diretoria || results.data[0].Setor)) {
            setData(results.data);
          } else {
            setData(MOCK_DATA);
            setErrorStatus(true);
          }
          setIsLoading(false);
        },
        error: (err) => {
          console.error("Erro no PapaParse:", err);
          setData(MOCK_DATA);
          setErrorStatus(true);
          setIsLoading(false);
        }
      });
    };

    fetchCSV();
  }, []);

  const treeData = useMemo(() => {
    const root = {};
    data.forEach(item => {
      const dirName = item.Diretoria || "OUTROS";
      const coordName = item.Coordenadoria || "GERAL";
      const setorName = item.Setor || "PADRÃO";

      if (!root[dirName]) {
        root[dirName] = { name: dirName, seg: 0, sex: 0, delta: 0, coords: {} };
      }

      if (!root[dirName].coords[coordName]) {
        root[dirName].coords[coordName] = { name: coordName, seg: 0, sex: 0, delta: 0, setores: [] };
      }

      const seg = parseInt(item.Estoque_Inicial || item.Estoque_Segunda || 0, 10);
      const sex = parseInt(item.Estoque_Final || item.Estoque_Sexta || 0, 10);
      const delta = sex - seg;

      const leaf = {
        ...item,
        name: setorName,
        seg,
        sex,
        delta,
        Semana_Referencia: item.Semana_Referencia || `${item.Data_Inicio} a ${item.Data_Fim}`
      };

      root[dirName].coords[coordName].setores.push(leaf);
      root[dirName].coords[coordName].seg += seg;
      root[dirName].coords[coordName].sex += sex;
      root[dirName].coords[coordName].delta += delta;
      root[dirName].seg += seg;
      root[dirName].sex += sex;
      root[dirName].delta += delta;
    });

    return Object.values(root).map(dir => ({
      ...dir,
      coords: Object.values(dir.coords).sort((a, b) => b.delta - a.delta)
    })).sort((a, b) => b.delta - a.delta);
  }, [data]);

  const totalEstoqueHoje = treeData.reduce((acc, curr) => acc + curr.sex, 0);
  const totalDelta = treeData.reduce((acc, curr) => acc + curr.delta, 0);

  const toggleNode = (id) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));

  const timeframe = useMemo(() => {
    if (data.length === 0) return "Período Indefinido";
    const item = data[0];
    return item.Semana_Referencia || (item.Data_Inicio && item.Data_Fim ? `${item.Data_Inicio} a ${item.Data_Fim}` : "Período Indefinido");
  }, [data]);

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
      { name: 'Início da Semana', value: selectedSector.seg, color: '#94a3b8' },
      { name: 'Final da Semana', value: selectedSector.sex, color: selectedSector.delta > 0 ? '#ef4444' : '#10b981' }
    ];

    const efficiency = selectedSector.seg > 0
      ? Math.round(((selectedSector.seg - selectedSector.sex) / selectedSector.seg) * 100)
      : 0;

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
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Início Semana</p>
                    <p className="text-4xl font-black text-slate-700 mt-2">{selectedSector.seg}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase">Final Semana</p>
                    <p className="text-4xl font-black text-slate-900 mt-2">{selectedSector.sex}</p>
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

                <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-lg shadow-blue-200">
                  <p className="text-sm font-bold opacity-80 uppercase mb-2">Indice de Produtividade</p>
                  <p className="text-5xl font-black">{efficiency}%</p>
                  <p className="text-xs mt-2 opacity-80 font-medium leading-relaxed">Considerando a redução proporcional da caixa em relação ao estoque inicial do período.</p>
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
            <p className="text-sm">Houve um problema ao ler a planilha. Verifique se as colunas (Diretoria, Coordenadoria, Setor, Estoque_Inicial, Estoque_Final) estão presentes.</p>
          </div>
        </div>
      )}

      {/* KPI Global Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-slate-100 transition-transform duration-700 group-hover:scale-110">
            <Layers size={140} className="transform rotate-12 -translate-y-6 translate-x-6 opacity-40 text-blue-100" />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-slate-500 uppercase tracking-wider mb-2">VOLUME TOTAL - SAGEP</h2>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter">
                <CountUp end={totalEstoqueHoje} duration={1.5} />
              </span>
              <span className="text-xl font-bold text-slate-500">processos</span>
            </div>
            <div className="mt-4 inline-block bg-slate-100 rounded-full px-4 py-1 text-xs font-bold text-slate-600">
              Período: {timeframe}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-bold text-slate-500 uppercase tracking-wider">Vazão Líquida (Delta)</h2>
              <div className="group/tooltip relative">
                <Info size={18} className="text-slate-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-slate-900/95 backdrop-blur-sm text-white text-xs p-5 rounded-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] leading-relaxed border border-slate-700 pointer-events-none">
                  <div className="font-bold text-sm mb-2 text-emerald-400 border-b border-slate-700 pb-2">O que é o Delta?</div>
                  O Delta representa a variação líquida do estoque no período. É a métrica mais pura de produtividade.
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                      <span className="text-red-400 font-bold">Positivo (+):</span> O estoque aumentou. Entrou mais do que saiu.
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                      <span className="text-emerald-400 font-bold">Negativo (-):</span> O estoque baixou. Excelente produtividade!
                    </div>
                  </div>
                  {/* Tooltip Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-slate-900/95"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className={`text-6xl md:text-8xl font-black tracking-tighter ${totalDelta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {totalDelta > 0 ? '+' : ''}<CountUp end={totalDelta} duration={1.5} />
              </span>
              <div className="flex items-center justify-center p-3 rounded-full bg-slate-50 shadow-inner">
                {totalDelta > 0 ? <TrendingUp size={48} className="text-red-500" /> : <TrendingDown size={48} className="text-emerald-500" />}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

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
                <div className="w-20"><p className="text-[9px] font-bold text-slate-400 uppercase">Total</p><p className="font-extrabold text-slate-900">{dir.sex}</p></div>
                <div className="w-16"><p className="text-[9px] font-bold text-slate-400 uppercase">DELTA</p><p className={`font-black ${dir.delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{dir.delta > 0 ? '+' : ''}{dir.delta}</p></div>
              </div>
            </div>

            <AnimatePresence>
              {expandedNodes[`dir-${dir.name}`] && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-slate-50/50">
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
                          <div className="w-16"><p className="text-[8px] font-bold text-slate-300 uppercase underline decoration-emerald-200">Estoque</p><p className="font-bold text-slate-700">{coord.sex}</p></div>
                          <div className="w-12"><p className="text-[8px] font-bold text-slate-300 uppercase">DELTA</p><p className={`font-bold ${coord.delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{coord.delta > 0 ? '+' : ''}{coord.delta}</p></div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedNodes[`coord-${dir.name}-${coord.name}`] && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
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
                                    <div className="w-16"><p className="text-[7px] font-bold text-slate-400 leading-tight">INICIO SEMANA</p><p className="text-xs font-medium text-slate-500">{setor.seg}</p></div>
                                    <div className="text-right w-10"><p className="text-[7px] font-bold text-slate-400">DELTA</p><p className={`text-xs font-black ${setor.delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{setor.delta > 0 ? '+' : ''}{setor.delta}</p></div>
                                    <div className="w-16"><p className="text-[7px] font-bold text-slate-400 leading-tight">FINAL SEMANA</p><p className="text-xs font-bold text-slate-800">{setor.sex}</p></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default DashboardMacro;

