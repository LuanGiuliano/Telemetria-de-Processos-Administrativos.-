import React, { useMemo, useState, useEffect } from 'react';
import CountUp from 'react-countup';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  FileText, TrendingUp, Calendar, Activity, PieChart as PieChartIcon, Search, Filter, Layers, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Paleta Melhorada
const COLORS_SETORES = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
const COLORS_ASSUNTOS = ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

const DashboardMicro = () => {
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Busca os dados do JSON local gerado pelo batch_processor.py
  useEffect(() => {
    const fetchDados = async () => {
      try {
        const response = await fetch('/tramitacoes_consolidadas.json');
        if (!response.ok) throw new Error('Falha ao buscar JSON');
        const data = await response.json();

        const normalizedData = (data || []).map(row => ({
          PROTOCOLO: row.protocolo,
          ASSUNTO: row.assunto,
          INTERESSADO: row.interessado,
          Data_Curta: row.data, 
          Data_Protocolo: row.data_protocolo,
          Tipo_Protocolo: row.tipo_protocolo,
          SIGLA_SETOR: row.Setor_Origem,
          SETOR_ATUAL: row.Setor_Origem,
          COMPLEMENTO_SETOR_ATUAL: row.complemento
        }));

        // Ordena por data decrescente
        normalizedData.sort((a,b) => new Date(b.Data_Curta) - new Date(a.Data_Curta));

        setRawData(normalizedData);
      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDados();
  }, []);

  // State para os Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('Todos');
  const [cardTick, setCardTick] = useState(0);
  const [isSetorModalOpen, setIsSetorModalOpen] = useState(false);
  const [isAssuntoModalOpen, setIsAssuntoModalOpen] = useState(false);

  // Tabela Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Valores únicos para o Dropdown
  const uniqueSetores = useMemo(() => {
    const setores = new Set(rawData.map(item => item.SIGLA_SETOR).filter(Boolean));
    return ['Todos', ...Array.from(setores).sort()];
  }, [rawData]);

  // Aplicação dos Filtros nos dados brutos
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const matchSearch = item.PROTOCOLO?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ASSUNTO?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSetor = selectedSetor === 'Todos' || item.SIGLA_SETOR === selectedSetor;
      return matchSearch && matchSetor;
    });
  }, [rawData, searchTerm, selectedSetor]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSetor]);

  const activeTimeline = useMemo(() => {
    const contagem = {};
    filteredData.forEach(item => {
      const data = item.Data_Curta;
      if (data) {
        contagem[data] = (contagem[data] || 0) + 1;
      }
    });

    const datasOrdenadas = Object.keys(contagem).sort((a, b) => new Date(a) - new Date(b));

    let acumulado = 0;
    return datasOrdenadas.map(data => {
      acumulado += contagem[data];
      return {
        Data_Curta: data,
        Diario: contagem[data],
        Processometro_Acumulado: acumulado
      };
    });
  }, [filteredData]);

  const activeSetores = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      if (item.SIGLA_SETOR) counts[item.SIGLA_SETOR] = (counts[item.SIGLA_SETOR] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); 
  }, [filteredData]);

  const activeAssuntos = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      if (item.ASSUNTO) {
        const truncated = item.ASSUNTO.length > 40 ? item.ASSUNTO.substring(0, 40) + '...' : item.ASSUNTO;
        counts[truncated] = (counts[truncated] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  useEffect(() => {
    if (activeSetores.length === 0 && activeAssuntos.length === 0) return;
    const interval = setInterval(() => setCardTick((prev) => prev + 1), 4000);
    return () => clearInterval(interval);
  }, [activeSetores.length, activeAssuntos.length]);

  const currentSectorCard = activeSetores.length > 0 ? activeSetores[cardTick % activeSetores.length] : null;
  const currentAssuntoCard = activeAssuntos.length > 0 ? activeAssuntos[cardTick % activeAssuntos.length] : null;

  const totalProcessos = filteredData.length;
  const mediaDiaria = activeTimeline.length > 0 ? Math.round(totalProcessos / activeTimeline.length) : 0;
  const diasAnalisados = activeTimeline.length;

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="z-10 relative">
      <motion.div initial="hidden" animate="show" variants={containerVariants}>
        
        {/* Filtros em Glassmorphism */}
        <motion.div variants={itemVariants} className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-1/2 relative">
            <Search className="absolute left-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por Protocolo ou Assunto..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-green-500 focus:border-green-500 block pl-10 p-2.5 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-1/3 relative">
            <Filter className="absolute left-3 text-slate-400" size={18} />
            <select
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-green-500 focus:border-green-500 block pl-10 p-2.5 outline-none transition-all appearance-none cursor-pointer"
              value={selectedSetor}
              onChange={(e) => setSelectedSetor(e.target.value)}
            >
              {uniqueSetores.map(setor => (
                <option key={setor} value={setor}>{setor === 'Todos' ? 'Todos os Setores' : setor}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-slate-100 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
              <FileText size={180} strokeWidth={1} className="transform rotate-12 -translate-y-10 translate-x-10 opacity-30 text-emerald-100" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-emerald-600 mb-2">
                <Activity size={24} />
                <h2 className="text-xl font-bold uppercase tracking-wider">Volume de Processos</h2>
              </div>
              <div className="mt-4 flex items-baseline">
                <span className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter shadow-sm">
                  <CountUp end={totalProcessos} separator="." duration={1.5} useEasing={true} />
                </span>
                <span className="ml-4 text-2xl font-bold text-slate-600">itens filtrados</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 text-blue-500 mb-4">
                <TrendingUp size={24} />
                <h3 className="font-bold">Média Diária</h3>
              </div>
              <div className="text-4xl font-extrabold text-slate-800">
                <CountUp end={mediaDiaria} duration={1} /> <span className="text-lg font-medium text-slate-600">/dia</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 text-purple-500 mb-4">
                <Calendar size={24} />
                <h3 className="font-bold">Dias Analisados</h3>
              </div>
              <div className="text-4xl font-extrabold text-slate-800">
                <CountUp end={diasAnalisados} duration={1} /> <span className="text-lg font-medium text-slate-600">dias</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Banners em Tempo Real (Crossfade Separado) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 h-36">
          <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
              {currentSectorCard && (
                <motion.div
                  key={currentSectorCard.name}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-3xl p-6 shadow-xl text-white flex items-center justify-between overflow-hidden"
                >
                  <Layers size={140} className="absolute -right-4 -bottom-4 text-emerald-900 opacity-20 transform -rotate-12" />
                  <div className="z-10 flex-col w-2/3">
                     <span className="bg-emerald-800/50 text-emerald-100 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-emerald-500/30">Top Setor</span>
                    <h3 className="text-2xl font-extrabold tracking-tight mt-3 drop-shadow-sm line-clamp-2" title={currentSectorCard.name}>{currentSectorCard.name}</h3>
                  </div>
                  <div className="z-10 text-right w-1/3">
                    <div className="text-5xl font-black drop-shadow-md"><CountUp end={currentSectorCard.value} duration={1.5} preserveValue={true} /></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
              {currentAssuntoCard && (
                <motion.div
                  key={currentAssuntoCard.name}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.6 }}
                  className="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-800 rounded-3xl p-6 shadow-xl text-white flex items-center justify-between overflow-hidden"
                >
                  <Layers size={140} className="absolute -right-4 -bottom-4 text-teal-900 opacity-20 transform -rotate-12" />
                  <div className="z-10 flex-col w-2/3">
                    <span className="bg-teal-800/50 text-teal-100 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-teal-500/30">Top Assunto</span>
                    <h3 className="text-xl font-extrabold tracking-tight mt-3 drop-shadow-sm line-clamp-2" title={currentAssuntoCard.name}>{currentAssuntoCard.name}</h3>
                  </div>
                  <div className="z-10 text-right w-1/3">
                    <div className="text-5xl font-black drop-shadow-md"><CountUp end={currentAssuntoCard.value} duration={1.5} preserveValue={true} /></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Gráficos Secundários Dinâmicos */}
        <AnimatePresence mode='wait'>
          <motion.div key={`${selectedSetor}-${searchTerm}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative group" onClick={() => setIsSetorModalOpen(true)}>
              <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Ver Todos</div>
              <div className="flex items-center gap-3 text-slate-800 mb-4 px-2">
                <PieChartIcon className="text-emerald-500" />
                <h3 className="text-lg font-bold">Top 5 - Setores Demandantes</h3>
              </div>
              <div className="h-96 w-full mt-4">
                {activeSetores.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={activeSetores.slice(0, 5)} cx="50%" cy="40%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {activeSetores.slice(0, 5).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_SETORES[index % COLORS_SETORES.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#1e293b', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={80} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: '500' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (<div className="h-full flex items-center justify-center text-slate-400">Nenhum dado</div>)}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative group" onClick={() => setIsAssuntoModalOpen(true)}>
              <div className="absolute top-4 right-4 bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Ver Todos</div>
              <div className="flex items-center gap-3 text-slate-800 mb-4 px-2">
                <PieChartIcon className="text-teal-500" />
                <h3 className="text-lg font-bold">Top 5 - Assuntos Principais</h3>
              </div>
              <div className="h-96 w-full mt-4">
                {activeAssuntos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={activeAssuntos} cx="50%" cy="40%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {activeAssuntos.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_ASSUNTOS[index % COLORS_ASSUNTOS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} itemStyle={{ color: '#1e293b', fontWeight: 'bold' }} />
                      <Legend verticalAlign="bottom" height={80} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (<div className="h-full flex items-center justify-center text-slate-400">Nenhum dado</div>)}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Chart Area Principal */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 mb-8">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" />
              Evolução da Telemetria
            </h3>
          </div>
          <div className="h-96 w-full">
            {activeTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="Data_Curta" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} dy={10} tickFormatter={(val) => {
                    if (!val) return val;
                    const [ano, mes, dia] = String(val).split('-');
                    if (!ano || !mes || !dia) return val;
                    return `${dia}/${mes}`;
                  }} />
                  <YAxis dataKey="Processometro_Acumulado" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }} />
                  <Area type="monotone" dataKey="Processometro_Acumulado" name="Total Acumulado Filtrado" stroke="#059669" strokeWidth={4} fillOpacity={1} fill="url(#colorAcumulado)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (<div className="h-full flex items-center justify-center text-slate-400">Aguardando dados...</div>)}
          </div>
        </motion.div>

        {/* Tabela de Dados Brutos */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-10 pb-4">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-slate-500" />
              Últimos Processos Filtrados
              <span className="bg-slate-200 text-slate-600 text-xs py-1 px-3 rounded-full ml-2">Total: {totalItems}</span>
            </h3>
          </div>
          <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4">Protocolo</th>
                  <th scope="col" className="px-6 py-4">Data</th>
                  <th scope="col" className="px-6 py-4">Setor</th>
                  <th scope="col" className="px-6 py-4 w-1/3">Assunto</th>
                  <th scope="col" className="px-6 py-4">Interessado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  let formattedDate = item.Data_Curta || '';
                  if (formattedDate) {
                    const parts = formattedDate.split('-');
                    if (parts.length === 3) {
                      formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                  }
                  return (
                  <tr key={idx} className="bg-white border-b hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{item.PROTOCOLO}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formattedDate}</td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-emerald-200">
                        {item.SIGLA_SETOR || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600 truncate max-w-[300px]" title={item.ASSUNTO}>
                      {item.ASSUNTO?.length > 70 ? item.ASSUNTO.substring(0, 70) + '...' : item.ASSUNTO}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 truncate max-w-[200px]" title={item.INTERESSADO}>
                      {item.INTERESSADO?.length > 30 ? item.INTERESSADO.substring(0, 30) + '...' : item.INTERESSADO}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 pt-4 border-t border-slate-100">
              <div className="flex gap-2 mx-auto">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                >Anterior</button>
                <div className="flex items-center px-4 font-bold bg-slate-100 rounded-lg text-slate-700">{currentPage} / {totalPages}</div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
                >Próximo</button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardMicro;
