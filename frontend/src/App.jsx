import React, { useMemo } from 'react';
import CountUp from 'react-countup';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FileText, TrendingUp, Calendar, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

// Importa os dados que foram gerados pelo script Python
import dadosJson from './assets/processometro_dados.json';

const App = () => {
  // Processamento e formatação dos dados para o Recharts
  const chartData = useMemo(() => {
    return dadosJson.map(item => ({
      dataStr: item.Data_Curta,
      diario: item.Processos_do_Dia,
      acumulado: item.Processometro_Acumulado
    }));
  }, []);

  const totalProcessos = chartData.length > 0 ? chartData[chartData.length - 1].acumulado : 0;
  const mediaDiaria = chartData.length > 0 ? Math.round(totalProcessos / chartData.length) : 0;
  const ultimoDia = chartData.length > 0 ? chartData[chartData.length - 1].dataStr : '--/--/----';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 md:p-8">
      {/* Background Decorativo */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-br from-sagep-800 to-green-600 -z-10 rounded-b-[4rem] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-green-400/20 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 text-white">
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
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card: Volume Acumulado (Impostrômetro style) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="md:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col justify-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 text-slate-100">
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
                <span className="ml-4 text-2xl font-bold text-slate-400">processos</span>
              </div>
              <p className="mt-4 text-slate-500 font-medium">Contabilizados desde 02/01/2026</p>
            </div>
          </motion.div>

          {/* Cards Secundários */}
          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex-1 flex flex-col justify-center"
            >
              <div className="flex items-center gap-3 text-blue-500 mb-4">
                <TrendingUp size={24} />
                <h3 className="font-bold">Média Diária</h3>
              </div>
              <div className="text-4xl font-extrabold text-slate-800">
                <CountUp end={mediaDiaria} duration={3} /> <span className="text-lg font-medium text-slate-400">/dia</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 flex-1 flex flex-col justify-center"
            >
              <div className="flex items-center gap-3 text-purple-500 mb-4">
                <Calendar size={24} />
                <h3 className="font-bold">Dias Analisados</h3>
              </div>
              <div className="text-4xl font-extrabold text-slate-800">
                <CountUp end={chartData.length} duration={2.5} /> <span className="text-lg font-medium text-slate-400">dias</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Char Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100"
        >
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-sagep-500" />
              Evolução e Dinâmica de Processos
            </h3>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="dataStr"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                  tickFormatter={(val) => val.substring(0, 5)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="acumulado"
                  name="Total Acumulado"
                  stroke="#16a34a"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorAcumulado)"
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
