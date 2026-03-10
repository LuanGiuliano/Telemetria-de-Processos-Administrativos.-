import React, { useMemo } from 'react';
import CountUp from 'react-countup';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { FileText, TrendingUp, Calendar, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { motion } from 'framer-motion';

// Importa os novos dados formatados
import dadosJson from './assets/processometro_dados.json';

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];

const App = () => {
  // Dados Isolados do JSON atualizado
  const timelineData = dadosJson.timeline || [];
  const setoresData = dadosJson.setores || [];
  const assuntosData = dadosJson.assuntos || [];

  const totalProcessos = timelineData.length > 0 ? timelineData[timelineData.length - 1].Processometro_Acumulado : 0;
  const mediaDiaria = timelineData.length > 0 ? Math.round(totalProcessos / timelineData.length) : 0;
  const ultimoDia = timelineData.length > 0 ? timelineData[timelineData.length - 1].Data_Curta : '--/--/----';

  // Configuração para animações em lista (Fade in sequencial)
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 p-4 md:p-8 relative z-0">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-[450px] bg-gradient-to-br from-[#166534] to-[#16a34a] -z-10 rounded-b-[4rem] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-green-400/20 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="max-w-6xl mx-auto relative z-10"
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-center mb-10 text-white">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-md">
              Processômetro <span className="text-green-300">SAGEP</span>
            </h1>
            <p className="text-green-100 font-medium mt-1">
              Acompanhamento em Tempo Real do Sistema PAE 4.0
            </p>
          </div>
          <div className="mt-4 md:mt-0 glass-panel px-6 py-2 rounded-full border-white/20 text-white flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="font-semibold text-sm">Atualizado: {ultimoDia}</span>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card Jumbo */}
          <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-slate-100 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
              <FileText size={180} strokeWidth={1} className="transform rotate-12 -translate-y-10 translate-x-10 opacity-30 text-sagep-100" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-sagep-600 mb-2">
                <Activity size={24} />
                <h2 className="text-xl font-bold uppercase tracking-wider">Volume Total de Processos</h2>
              </div>
              <div className="mt-4 flex items-baseline">
                <span className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter shadow-sm">
                  <CountUp end={totalProcessos} separator="." duration={3.5} useEasing={true} />
                </span>
                <span className="ml-4 text-2xl font-bold text-slate-600">processos</span>
              </div>
              <p className="mt-4 text-slate-600 font-medium">Contabilizados desde 02/01/2026</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex-1 flex flex-col justify-center transform transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3 text-blue-500 mb-4">
                <TrendingUp size={24} />
                <h3 className="font-bold">Média Diária</h3>
              </div>
              <div className="text-4xl font-extrabold text-slate-800">
                <CountUp end={mediaDiaria} duration={3} /> <span className="text-lg font-medium text-slate-600">/dia</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex-1 flex flex-col justify-center transform transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3 text-purple-500 mb-4">
                <Calendar size={24} />
                <h3 className="font-bold">Dias Analisados</h3>
              </div>
              <div className="text-4xl font-extrabold text-slate-800">
                <CountUp end={timelineData.length} duration={2.5} /> <span className="text-lg font-medium text-slate-600">dias</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gráficos Secundários (Rosquinhas/Donuts) */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 text-slate-800 mb-4 px-2">
              <PieChartIcon className="text-amber-500" />
              <h3 className="text-lg font-bold">Top 5 - Setores com Mais Processos</h3>
            </div>
            <div className="h-96 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={setoresData}
                    cx="50%"
                    cy="40%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {setoresData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={80} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 text-slate-800 mb-4 px-2">
              <PieChartIcon className="text-rose-500" />
              <h3 className="text-lg font-bold">Top 5 - Assuntos Mais Frequentes</h3>
            </div>
            <div className="h-96 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assuntosData}
                    cx="50%"
                    cy="40%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {assuntosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={80} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Chart Area Principal */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-sagep-500" />
              Evolução e Dinâmica de Processos
            </h3>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="Data_Curta"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  dy={10}
                  tickFormatter={(val) => val.substring(0, 5)}
                />
                <YAxis
                  dataKey="Processometro_Acumulado"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="Processometro_Acumulado"
                  name="Total Acumulado"
                  stroke="#16a34a"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorAcumulado)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default App;
