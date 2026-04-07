import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Layers, Clock, Cpu } from 'lucide-react';

export default function Admin() {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState('');
    const [statusType, setStatusType] = useState(''); // 'success' | 'error'
    const [uploadType, setUploadType] = useState('macro');

    // Job tracking
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [progressMsg, setProgressMsg] = useState('');
    const [elapsedSecs, setElapsedSecs] = useState(0);

    const pollIntervalRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const startTimeRef = useRef(null);

    // ── Cleanup ao desmontar ──────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    const stopAll = () => {
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    };

    const startTimer = () => {
        startTimeRef.current = Date.now();
        timerIntervalRef.current = setInterval(() => {
            setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
    };

    const startPolling = (id) => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/job-status/${id}`);
                if (!res.ok) return;
                const data = await res.json();

                setProgress(data.progress || 0);
                setProgressMsg(data.message || '');

                if (data.status === 'done') {
                    stopAll();
                    setIsProcessing(false);
                    setStatusType('success');
                    setStatus(
                        `✅ ${data.result?.rows_inserted?.toLocaleString('pt-BR')} processos inseridos com sucesso no Supabase!`
                    );
                    setTimeout(() => { window.location.href = '/'; }, 4000);
                } else if (data.status === 'error') {
                    stopAll();
                    setIsProcessing(false);
                    setStatusType('error');
                    setStatus(`❌ ${data.message}`);
                }
            } catch (err) {
                console.error('Erro no polling:', err);
            }
        }, 2000);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsProcessing(true);
        setStatus('');
        setStatusType('');
        setProgress(0);
        setProgressMsg('🚀 Enviando arquivo para o servidor...');
        setElapsedSecs(0);
        startTimer();

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
                throw new Error(data.detail || "Falha desconhecida no servidor");
            }

            if (data.job_id) {
                setJobId(data.job_id);
                setProgressMsg('Processamento iniciado...');
                startPolling(data.job_id);
            } else {
                // Resposta síncrona (fallback)
                stopAll();
                setIsProcessing(false);
                setStatusType('success');
                setStatus(`✅ Sucesso! ${data.rows_inserted} processos inseridos.`);
                setTimeout(() => { window.location.href = '/'; }, 3000);
            }
        } catch (error) {
            stopAll();
            console.error(error);
            setIsProcessing(false);
            setStatusType('error');
            setStatus(`❌ Erro: ${error.message}`);
        }
    };

    const formatElapsed = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const isMicro = uploadType === 'micro';
    const accentColor = isMicro ? 'teal' : 'emerald';

    return (
        <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
            <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">

                {/* Header */}
                <div className={`bg-${accentColor}-600 p-6 text-center`}
                    style={{ background: isMicro ? '#0d9488' : '#059669' }}>
                    <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                        <Layers className="opacity-80" />
                        Central de Uploads — SAGEP
                    </h1>
                    <p className="text-white/80 mt-1 text-sm">Painel Administrativo para Atualização de Processos</p>
                </div>

                <div className="p-8">

                    {/* Tipo de Relatório */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Tipo de Relatório do SISPAE:
                        </label>
                        <div className="flex gap-4">
                            {[
                                { value: 'macro', label: 'Visão Macro', sub: 'Caixa de Entrada (por Setor)', color: '#059669' },
                                { value: 'micro', label: 'Visão Micro', sub: 'Relatório Completo (Hierárquico)', color: '#0d9488' },
                            ].map(opt => (
                                <label key={opt.value}
                                    className={`flex-1 flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${uploadType === opt.value
                                        ? 'border-2 ring-2'
                                        : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    style={uploadType === opt.value
                                        ? { borderColor: opt.color, ringColor: opt.color, background: `${opt.color}10` }
                                        : {}}>
                                    <input type="radio" value={opt.value}
                                        checked={uploadType === opt.value}
                                        onChange={() => setUploadType(opt.value)}
                                        className="hidden"
                                    />
                                    <span className="font-bold text-slate-800">{opt.label}</span>
                                    <span className="text-xs text-slate-500 mt-1">{opt.sub}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Aviso para PDF grande */}
                    {isMicro && !isProcessing && (
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-700">
                            <Cpu size={18} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Processamento Paralelo Ativado</p>
                                <p className="text-blue-600 mt-0.5">PDFs grandes são processados em paralelo entre os núcleos da CPU. O upload ocorre em background — você verá o progresso aqui em tempo real.</p>
                            </div>
                        </div>
                    )}

                    {/* Área de upload */}
                    {!isProcessing && (
                        <>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 mb-6 text-center hover:bg-slate-50 transition-colors">
                                <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                                <h3 className="text-lg font-medium text-slate-900 mb-1">Selecione o Relatório em PDF</h3>
                                <p className="text-sm text-slate-500 mb-4">Arraste o arquivo ou clique abaixo para procurar</p>
                                <input type="file" accept="application/pdf" id="file-upload"
                                    className="hidden" onChange={handleFileChange} />
                                <label htmlFor="file-upload"
                                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors">
                                    Escolher Arquivo
                                </label>
                                {file && (
                                    <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center gap-2 text-sm font-medium border border-emerald-100">
                                        <FileText size={16} />
                                        {file.name}
                                        <span className="text-emerald-500 text-xs">
                                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                style={{ background: isMicro ? '#0d9488' : '#059669' }}
                            >
                                <UploadCloud size={18} />
                                Iniciar Processamento
                            </button>
                        </>
                    )}

                    {/* ── Painel de Progresso ── */}
                    {isProcessing && (
                        <div className="mt-2">
                            {/* Timer */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-slate-600">Processando...</span>
                                <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                                    <Clock size={12} />
                                    {formatElapsed(elapsedSecs)}
                                </span>
                            </div>

                            {/* Barra de progresso */}
                            <div className="w-full bg-slate-100 rounded-full h-4 mb-3 overflow-hidden">
                                <div
                                    className="h-4 rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${progress}%`,
                                        background: isMicro
                                            ? 'linear-gradient(90deg, #0d9488, #06b6d4)'
                                            : 'linear-gradient(90deg, #059669, #10b981)',
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-slate-600 font-medium">{progressMsg}</p>
                                <span className="text-sm font-black text-slate-700">{progress}%</span>
                            </div>

                            {/* Etapas visuais */}
                            <div className="space-y-2">
                                {[
                                    { label: 'Analisando estrutura do PDF', threshold: 2 },
                                    { label: 'Pré-scan de setores (sequencial)', threshold: 15 },
                                    { label: 'Extração paralela das páginas', threshold: 85 },
                                    { label: 'Processando registros', threshold: 90 },
                                    { label: 'Enviando ao Supabase', threshold: 99 },
                                ].map((step, i) => {
                                    const done = progress > step.threshold;
                                    const active = !done && progress >= (i === 0 ? 0 : [0, 2, 15, 85, 90][i]);
                                    return (
                                        <div key={i} className={`flex items-center gap-2 text-xs transition-all ${done ? 'text-emerald-600' : active ? 'text-slate-700 font-semibold' : 'text-slate-300'}`}>
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-emerald-500' : active ? 'bg-blue-400 animate-pulse' : 'bg-slate-200'}`} />
                                            {step.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Status final */}
                    {status && !isProcessing && (
                        <div className={`mt-6 p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${statusType === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {statusType === 'error'
                                ? <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                                : <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />}
                            <p>{status}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
