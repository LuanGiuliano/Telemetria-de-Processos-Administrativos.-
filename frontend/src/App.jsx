import React, { useState } from 'react';
import DashboardMacro from './DashboardMacro';
import DashboardMicro from './DashboardMicro';
import { Info, X, Layers, PieChart as PieIcon, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [activeTab, setActiveTab] = useState('macro'); // 'macro' or 'micro'
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans text-slate-800 relative z-0">
      {/* Background Decorativo Baseado na SEAD/SEDUC (Verde Governamental) */}
      <div className="absolute top-0 left-0 w-full h-[450px] bg-gradient-to-br from-[#1A6521] to-[#124d19] -z-10 rounded-b-[4rem] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      </div>

      <div className="max-w-6xl mx-auto pt-8 px-4 md:px-8 relative z-10">

        <header className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 text-white relative">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
              SIRA - <span className="text-green-300">PAE 4.0</span>
            </h1>
            <p className="text-green-200 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mt-1 opacity-90 drop-shadow-sm">
              Sistema Inteligente de Rastreabilidade Administrativa
            </p>
            <p className="text-green-100 font-medium mt-4 text-lg border-t border-white/20 pt-2">
              Secretaria Adjunta de Gestão de Pessoas - SAGEP
            </p>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="mt-4 text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold tracking-wide transition-all border border-white/20 shadow-sm"
            >
              <Info size={16} /> O que é o SIRA?
            </button>
          </div>

          <div className="flex items-center gap-4 self-center md:self-start ml-auto">
            <img
              src="/logo.png"
              alt="PAE Logo"
              className="h-20 md:h-24 rounded-3xl object-contain drop-shadow-xl"
            />
            <img
              src="/seduc-logo.png"
              alt="SEDUC Logo"
              className="h-20 md:h-24 bg-white p-2 rounded-2xl shadow-xl object-contain"
            />
          </div>
        </header>

        <div className="flex justify-center mb-8">
          <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-2xl flex gap-2 shadow-lg border border-white/30">
            <button
              onClick={() => setActiveTab('macro')}
              className={`px-8 py-3 rounded-xl font-bold transition-all flex flex-col items-center min-w-[180px] ${activeTab === 'macro' ? 'bg-white text-emerald-700 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              <span className="text-sm uppercase tracking-widest">Visão Macro</span>
              <span className={`text-[10px] font-medium opacity-70 ${activeTab === 'macro' ? 'text-emerald-600' : 'text-green-100'}`}>Quantitativo de Processos</span>
            </button>
            <button
              onClick={() => setActiveTab('micro')}
              className={`px-8 py-3 rounded-xl font-bold transition-all flex flex-col items-center min-w-[180px] ${activeTab === 'micro' ? 'bg-white text-emerald-700 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              <span className="text-sm uppercase tracking-widest">Visão Micro</span>
              <span className={`text-[10px] font-medium opacity-70 ${activeTab === 'micro' ? 'text-emerald-600' : 'text-green-100'}`}>Tramitação entre setores</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Content */}
        {activeTab === 'macro' && <DashboardMacro />}
        {activeTab === 'micro' && <DashboardMicro />}

        {/* Créditos do Sistema */}
        <footer className="mt-16 pb-8 text-center border-t border-slate-200/60 pt-6">
          <p className="text-slate-500 text-xs font-medium tracking-wide">
            SAGEP - Secretaria Adjunta de Gestão de Pessoas &copy; {new Date().getFullYear()} - Desenvolvido por: <span className="font-bold text-emerald-700">Luan Giuliano</span>
          </p>
        </footer>

        {/* Modal de Ajuda (O que é o SIRA?) */}
        <AnimatePresence>
          {isHelpOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsHelpOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 text-slate-100 opacity-50">
                  <Info size={120} className="transform rotate-12 -translate-y-6 translate-x-6 text-emerald-50" />
                </div>

                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>

                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                    <Layers size={24} />
                  </div>
                  O que é o SIRA?
                </h2>

                <div className="text-slate-600 space-y-4 text-sm leading-relaxed relative z-10">
                  <p>
                    O <strong>Sistema Inteligente de Rastreabilidade Administrativa (SIRA)</strong> é uma plataforma analítica de alta performance desenvolvida para monitorar e otimizar o fluxo de Processos Administrativos Eletrônicos (PAE).
                  </p>
                  <p>
                    Seu objetivo principal é dar total transparência e celeridade ao ciclo de vida dos processos na Secretaria, permitindo que gestores identifiquem <strong>gargalos operacionais, acúmulo de demandas e métricas de desempenho.</strong>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><PieIcon size={16} className="text-emerald-500" /> Visão Macro</h4>
                      <p className="text-xs">Painel tático-executivo. Permite visualizar o estoque de todas as coordenadorias, identificar o Acúmulo Real do período (Delta) e monitorar a curva de exaustão das caixas (tendência zero).</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Activity size={16} className="text-blue-500" /> Visão Micro</h4>
                      <p className="text-xs">Motor Analítico Profundo. Permite filtrar movimentações diárias do sistema PAE, puxar relatórios e realizar auditoria precisa entre os diversos setores responsáveis.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end relative z-10">
                  <button
                    onClick={() => setIsHelpOpen(false)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-emerald-600/20"
                  >
                    Maravilha!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default App;
