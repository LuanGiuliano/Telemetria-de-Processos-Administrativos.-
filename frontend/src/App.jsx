import React, { useState } from 'react';
import DashboardMacro from './DashboardMacro';
import DashboardMicro from './DashboardMicro';

const App = () => {
  const [activeTab, setActiveTab] = useState('macro'); // 'macro' or 'micro'

  return (
    <div className="min-h-screen font-sans text-slate-800 relative z-0">
      {/* Background Decorativo Baseado na SEAD/SEDUC (Verde Governamental) */}
      <div className="absolute top-0 left-0 w-full h-[450px] bg-gradient-to-br from-[#166534] to-[#16a34a] -z-10 rounded-b-[4rem] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      </div>

      <div className="max-w-6xl mx-auto pt-8 px-4 md:px-8 relative z-10">
        
        {/* Header App Title */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 text-white">
          <div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-5">
                <img src="/logo.png" alt="Telemetria PAE Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-xl" />
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-md">
                  Telemetria <span className="text-green-300">PAE 4.0</span>
                </h1>
              </div>
              <img 
                src="/seduc-logo.png" 
                alt="Governo do Pará / SEDUC Logo" 
                className="h-10 md:h-14 bg-white p-2 rounded-xl shadow-lg object-contain" 
              />
            </div>
            <p className="text-green-100 font-medium mt-2 text-lg text-center md:text-left">
              Sistema Inteligente de Telemetria e Rastreabilidade Administrativa
            </p>
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
