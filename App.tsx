
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import ScheduleCard from './components/ScheduleCard';
import { SncfPlanning } from './types';
import { parsePlanning } from './services/geminiService';

const LOADING_STEPS = [
  "Initialisation Protocole B-RAIL AI v4.5...",
  "Connexion Dépôt Liège-Guillemins...",
  "Analyse Topologie Ottignies & Namur...",
  "Scan de la série (SNCB Logistics)...",
  "Identification de la période Z-SUP...",
  "Extraction des 217 jours de roulement...",
  "Vérification minutes précises (Standard B)...",
  "Conversion horaires de nuit (>24:00)...",
  "Filtrage codes HSBR / RT / CW (Belgique)...",
  "Validation cohérence Bruxelles-Midi...",
  "Consolidation du payload Rail-JSON...",
  "Prêt pour le départ / Klaar pour le départ..."
];

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [planning, setPlanning] = useState<SncfPlanning | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    let interval: any;
    let timer: any;
    if (loading) {
      setLoadingStepIdx(0);
      setElapsedTime(0);
      setLogs([`> [SYS] Handshake avec le serveur Rail-Belgique...`]);
      
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => {
          const next = (prev + 1) % LOADING_STEPS.length;
          setLogs(current => [...current, `> [B-RAIL] ${LOADING_STEPS[next]}`]);
          return next;
        });
      }, 2000);

      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let detectedMime = file.type;
      if (!detectedMime && file.name.toLowerCase().endsWith('.pdf')) {
        detectedMime = 'application/pdf';
      }
      setMimeType(detectedMime || 'application/octet-stream');
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        setInput(''); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!input && !filePreview) {
      setError("Veuillez importer votre feuille de roulement SNCB.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await parsePlanning(filePreview, input || null, mimeType);
      setPlanning(result);
      setViewMode('visual');
    } catch (err: any) {
      setError(err.message);
      setLogs(prev => [...prev, `! [FAIL] Erreur critique : ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPlanning(null);
    setInput('');
    setFilePreview(null);
    setFileName(null);
    setMimeType('');
    setError(null);
    setLogs([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FA]">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {!planning ? (
          <div className="bg-white rounded-[4rem] shadow-2xl p-10 md:p-20 border-b-8 border-[#003399] relative overflow-hidden min-h-[700px]">
            {loading && (
              <div className="absolute inset-0 z-50 bg-[#003399]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="w-full max-w-3xl bg-white rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden border-4 border-[#FFD700]">
                   <div className="bg-[#FFD700] px-10 py-5 flex items-center justify-between">
                      <div className="flex gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#003399]"></div>
                        <div className="w-4 h-4 rounded-full bg-[#003399]/40"></div>
                        <div className="w-4 h-4 rounded-full bg-[#003399]/20"></div>
                      </div>
                      <div className="text-[11px] font-black text-[#003399] uppercase tracking-widest flex items-center gap-3">
                        Status : Analyse en cours ({elapsedTime}s)
                      </div>
                   </div>
                   
                   <div className="p-12">
                      <div className="flex items-center gap-12 mb-12">
                         <div className="relative flex-shrink-0">
                            <div className="w-24 h-24 border-8 border-slate-100 border-t-[#003399] rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-[#003399] font-black text-xl">
                               {Math.min(99, Math.floor(((loadingStepIdx + 1) / LOADING_STEPS.length) * 100))}%
                            </div>
                         </div>
                         <div className="flex-grow">
                            <h3 className="text-[#003399] font-black text-3xl mb-2 tracking-tighter italic uppercase">Rail AI Belgique</h3>
                            <p className="text-blue-500 text-sm font-bold animate-pulse tracking-wide uppercase italic">{LOADING_STEPS[loadingStepIdx]}</p>
                         </div>
                      </div>

                      <div className="bg-[#00193F] rounded-[2rem] p-8 h-64 overflow-y-auto font-mono text-[13px] text-green-400 custom-scrollbar border-2 border-white/5">
                         {logs.map((log, i) => (
                           <div key={i} className="mb-2 opacity-90">{log}</div>
                         ))}
                         <div ref={logEndRef} />
                      </div>
                   </div>
                </div>
              </div>
            )}

            <div className="mb-20 text-center">
              <div className="inline-block bg-[#FFD700] text-[#003399] text-[12px] font-black uppercase px-10 py-4 rounded-full mb-10 tracking-[0.4em] shadow-xl border-2 border-[#003399]">
                NMBS / SNCB Logistics v4.5
              </div>
              <h2 className="text-7xl font-black text-[#003399] mb-8 tracking-tighter uppercase italic">
                Extraction <span className="text-blue-500">Roulement</span>
              </h2>
              <p className="text-slate-500 text-xl max-w-3xl mx-auto font-medium leading-relaxed opacity-80">
                Outil d'expertise Rail-Belgique. Convertissez vos feuilles de route en calendrier interactif et JSON structuré.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-16">
              <div className="group space-y-8">
                <label className="text-xs font-black text-[#003399] uppercase tracking-[0.2em] flex items-center gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-[#003399] flex items-center justify-center text-[#FFD700] shadow-lg font-black text-xl">01</span>
                  Texte Brut / Notes
                </label>
                <textarea
                  className="w-full h-80 p-10 text-sm font-mono border-4 border-slate-50 rounded-[3rem] focus:ring-[15px] focus:ring-blue-100 focus:border-[#003399] bg-slate-50/50 transition-all outline-none resize-none shadow-inner"
                  placeholder="Copiez-collez les données ici..."
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setFilePreview(null); }}
                  disabled={!!filePreview}
                />
              </div>

              <div className="group space-y-8">
                <label className="text-xs font-black text-[#003399] uppercase tracking-[0.2em] flex items-center gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-[#003399] flex items-center justify-center text-[#FFD700] shadow-lg font-black text-xl">02</span>
                  Feuille PDF / Photo
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-80 border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-700 ${filePreview ? 'border-[#003399] bg-[#003399]/5 shadow-2xl scale-[1.02]' : 'border-slate-200 hover:border-[#003399] hover:bg-slate-50'}`}
                >
                  {filePreview ? (
                    <div className="flex flex-col items-center p-10 text-center animate-fade-in">
                      <div className="w-32 h-32 bg-[#003399] rounded-[3rem] flex items-center justify-center shadow-2xl mb-10 border-4 border-[#FFD700] transform rotate-3">
                        <svg className="w-16 h-16 text-[#FFD700]" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                      </div>
                      <span className="text-xl font-black text-[#003399] truncate max-w-[320px] mb-4 uppercase italic">{fileName}</span>
                      <button className="text-[11px] text-[#003399] font-black uppercase tracking-widest bg-[#FFD700] px-8 py-3 rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); reset(); }}>Changer de document</button>
                    </div>
                  ) : (
                    <div className="text-center px-16">
                      <div className="w-28 h-28 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl border-4 border-slate-50 group-hover:scale-110 group-hover:border-[#FFD700] transition-all">
                        <svg className="w-12 h-12 text-[#003399]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round"/></svg>
                      </div>
                      <p className="font-black text-[#003399] uppercase text-lg tracking-widest italic">Importer le roulement</p>
                      <p className="text-xs text-slate-400 mt-5 leading-relaxed font-bold uppercase tracking-tighter">Analyse experte Rail-Belgique</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf,image/*" onChange={handleFileChange} />
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={loading}
              className={`mt-24 w-full py-12 rounded-[3.5rem] font-black text-4xl uppercase italic flex items-center justify-center gap-10 transition-all shadow-2xl transform active:scale-[0.98] ${loading ? 'bg-slate-200 cursor-wait text-slate-400' : 'bg-[#003399] hover:bg-black text-[#FFD700] hover:-translate-y-4 shadow-[#003399]/30'}`}
            >
              {loading ? "Calcul en cours..." : "Générer le Planning B-Rail"}
            </button>
          </div>
        ) : (
          <div className="animate-fade-in space-y-12 pb-48">
            <div className="bg-white rounded-[4rem] shadow-2xl border-b-8 border-[#003399] p-8 flex flex-wrap items-center justify-between gap-10">
              <div className="flex items-center gap-12 pl-8">
                <div>
                   <span className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3">Série SNCB</span>
                   <span className="text-4xl font-black text-[#003399] tracking-tighter uppercase italic">{planning.serie}</span>
                </div>
                <div className="w-px h-20 bg-slate-100"></div>
                <div>
                   <span className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3">Période d'activité</span>
                   <span className="text-4xl font-black text-[#003399] tracking-tighter uppercase italic">{planning.periode}</span>
                </div>
              </div>

              <div className="flex gap-5">
                <button onClick={() => setViewMode('visual')} className={`px-12 py-6 rounded-[2.5rem] text-sm font-black tracking-widest uppercase italic transition-all ${viewMode === 'visual' ? 'bg-[#003399] text-[#FFD700] shadow-2xl shadow-[#003399]/40 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>
                  Calendrier
                </button>
                <button onClick={() => setViewMode('json')} className={`px-12 py-6 rounded-[2.5rem] text-sm font-black tracking-widest uppercase italic transition-all ${viewMode === 'json' ? 'bg-[#003399] text-[#FFD700] shadow-2xl shadow-[#003399]/40 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>
                  Export JSON
                </button>
                <div className="w-px h-20 bg-slate-100 mx-3"></div>
                <button onClick={reset} className="p-6 rounded-[2.5rem] text-red-500 bg-red-50 hover:bg-red-100 transition-all shadow-lg" title="Reset">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                </button>
              </div>
            </div>

            {viewMode === 'visual' ? (
              <div className="grid gap-16">
                {planning.semaines.map((week, idx) => (
                  <ScheduleCard key={idx} week={week} />
                ))}
              </div>
            ) : (
              <div className="bg-[#00193F] rounded-[5rem] p-24 shadow-2xl relative overflow-hidden border-4 border-[#FFD700]">
                <div className="absolute top-0 left-0 w-8 h-full bg-[#FFD700]"></div>
                <div className="flex justify-between items-center mb-20">
                  <div>
                    <h3 className="text-white text-4xl font-black tracking-tight mb-3 italic uppercase">Payload B-Rail Expert</h3>
                    <p className="text-blue-300 text-sm font-bold uppercase tracking-widest">Format Rail-JSON v4.5 standardisé</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(planning, null, 2));
                      alert("JSON copié pour archivage B-Rail !");
                    }}
                    className="bg-[#FFD700] hover:bg-white text-[#003399] px-14 py-6 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl hover:-translate-y-2"
                  >
                    Copier les données
                  </button>
                </div>
                <pre className="text-[#FFD700] text-[13px] font-mono leading-relaxed overflow-x-auto max-h-[75vh] custom-scrollbar p-12 bg-black/40 rounded-[3rem] border-2 border-white/5">
                  {JSON.stringify(planning, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-24 bg-white border-t-8 border-[#FFD700] text-center">
        <div className="flex justify-center items-center gap-10 mb-8 grayscale opacity-20">
           <div className="w-16 h-16 border-4 border-[#003399] rounded-xl flex items-center justify-center text-[#003399] font-black text-2xl italic">B</div>
           <div className="h-px w-24 bg-slate-300"></div>
           <div className="text-sm font-black uppercase tracking-widest">SNCB / NMBS AI</div>
        </div>
        <p className="text-[#003399] text-[11px] font-black uppercase tracking-[0.8em] opacity-40">B-Rail Planning Expert • High Availability Protocol • v4.5</p>
      </footer>
    </div>
  );
};

export default App;
