import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Layers } from 'lucide-react';

export default function Admin() {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [uploadType, setUploadType] = useState('macro'); // 'macro' ou 'micro'

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsProcessing(true);
        setStatus('🚀 Enviando relatório para o Motor de Processamento Python...');

        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const endpoint = uploadType === 'macro' ? '/api/upload' : '/api/upload-micro';

            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Falha desconhecida no servidor Python");
            }

            setStatus(`✅ Sucesso! ${data.rows_inserted} processos foram extraídos 100% perfeitamente e salvos no Supabase (${uploadType === 'macro' ? 'Visão Macro' : 'Visão Micro'}).`);

            setTimeout(() => {
                window.location.href = '/';
            }, 3000);

        } catch (error) {
            console.error(error);
            setStatus(`❌ Erro: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-emerald-600 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                        <Layers className="text-emerald-200" />
                        Central de Uploads - SAGEP
                    </h1>
                    <p className="text-emerald-100 mt-2 text-sm">Painel Administrativo para Atualização de Processos</p>
                </div>

                <div className="p-8">
                    
                    {/* Seletor de Tipo de Relatório */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Tipo de Relatório do SISPAE:</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${uploadType === 'macro' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" value="macro" checked={uploadType === 'macro'} onChange={() => setUploadType('macro')} className="hidden" />
                                <span className="font-bold text-slate-800">Visão Macro</span>
                                <span className="text-xs text-slate-500 mt-1">Caixa de Entrada (1 Setor)</span>
                            </label>
                            <label className={`flex-1 flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${uploadType === 'micro' ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" value="micro" checked={uploadType === 'micro'} onChange={() => setUploadType('micro')} className="hidden" />
                                <span className="font-bold text-slate-800">Visão Micro</span>
                                <span className="text-xs text-slate-500 mt-1">Relatório Completo (Hierárquico)</span>
                            </label>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 mb-6 text-center hover:bg-slate-50 transition-colors">
                        <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Selecione o Relatório em PDF</h3>
                        <p className="text-sm text-slate-500 mb-4">Arraste o arquivo ou clique abaixo para procurar no computador</p>

                        <input
                            type="file"
                            accept="application/pdf"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Escolher Arquivo
                        </label>

                        {file && (
                            <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center gap-2 text-sm font-medium border border-emerald-100">
                                <FileText size={16} />
                                {file.name}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!file || isProcessing}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${uploadType === 'macro' ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500'}`}
                    >
                        {isProcessing ? (
                            <>Processando na API Python...</>
                        ) : (
                            <>Atualizar Base de Dados</>
                        )}
                    </button>

                    {status && (
                        <div className={`mt-6 p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${status.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {status.includes('Erro') ? <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" /> : <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />}
                            <p>{status}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


