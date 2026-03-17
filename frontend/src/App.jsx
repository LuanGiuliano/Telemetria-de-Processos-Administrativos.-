import React, { useState } from 'react';
import DashboardMacro from './DashboardMacro';
import DashboardMicro from './DashboardMicro';

const App = () => {
  const [activeTab, setActiveTab] = useState('macro'); // 'macro' or 'micro'

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
          </div>

          <div className="flex items-center gap-4 self-center md:self-start ml-auto">
            <img
              src="/logo.png"
              alt="PAE Logo"
              className="h-20 md:h-24 object-contain drop-shadow-xl mix-blend-multiply"
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

      </div>
    </div>
  );
};

export default App;
