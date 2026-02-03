
import React, { useState, useRef } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PG, HospitalUnit } from '../types';
import { Upload, Share2, CheckCircle2 } from 'lucide-react';

interface ImportPGsProps {
  pgs: PG[]; 
  setPgs: React.Dispatch<React.SetStateAction<PG[]>>;
}

const ImportPGs: React.FC<ImportPGsProps> = ({ pgs, setPgs }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async (dataToProcess: string) => {
    if (!dataToProcess.trim()) return;
    setIsProcessing(true);
    setSuccessCount(null);
    
    try {
        const rows = dataToProcess.split('\n').filter(l => l.trim());
        const batch = writeBatch(db);
        let count = 0;

        for (const row of rows) {
            const parts = row.includes(';') ? row.split(';') : row.split('\t');
            if (parts.length < 2) continue;

            const idRaw = parts[0]?.trim() || '';
            const pgName = parts[1]?.trim() || '';
            const unidadeRaw = parts[2]?.trim().toUpperCase() || 'HAB';
            
            let unit: HospitalUnit = 'Belém';
            let prefix = 'HAB';
            
            if (unidadeRaw.includes('BARCARENA') || unidadeRaw.includes('HABA')) {
                unit = 'Barcarena';
                prefix = 'HABA';
            }

            if (idRaw && pgName) {
                // Lógica de ID estruturado: PREFIXO_ID (Ex: HAB_1, HABA_5)
                const finalId = `${prefix}_${idRaw}`;
                const docRef = doc(db, "pgs", finalId);
                
                batch.set(docRef, { 
                    id: finalId, 
                    name: pgName, 
                    hospital: unit, 
                    active: true 
                }, { merge: true });
                count++;
            }
        }

        await batch.commit();
        setPasteData('');
        setSuccessCount(count);
    } catch (e) {
        console.error(e);
        alert("Erro na importação dos PGs.");
    } finally {
        setIsProcessing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => handleProcess(ev.target?.result as string);
        reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div className="bg-indigo-50/50 p-10 rounded-[3rem] border-2 border-indigo-100 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-indigo-700">
               <Share2 size={28} />
               <h4 className="text-xl font-black">Lista Mestra de PGs</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium bg-white/70 p-5 rounded-[2rem] border border-indigo-100">
              Formato: <span className="font-black text-indigo-700">ID ; PG ; UNIDADE</span><br/><br/>
              O sistema criará IDs técnicos como <span className="italic font-bold text-blue-600">HAB_01</span> ou <span className="italic font-bold text-indigo-600">HABA_01</span>. Isso permite nomes iguais em unidades diferentes sem conflitos.
            </p>

            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-4 border-dashed border-indigo-200 rounded-[2.5rem] bg-white hover:bg-indigo-50 hover:border-indigo-400 transition-all group flex flex-col items-center gap-3"
            >
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={onFileChange}/>
                <Upload size={32} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="font-black text-[11px] uppercase text-indigo-600 tracking-widest">Upload PGs</span>
            </button>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colagem manual:</label>
                {successCount !== null && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 animate-bounce">
                        <CheckCircle2 size={14}/> {successCount} PGs Processados com Sucesso!
                    </div>
                )}
              </div>
              <textarea 
                className="w-full flex-1 h-40 p-8 rounded-[2rem] border-2 border-indigo-100 outline-none focus:ring-8 focus:ring-indigo-600/5 font-mono text-xs resize-none bg-white shadow-inner" 
                placeholder="Exemplo: 1; PG Betel; HAB" 
                value={pasteData} 
                onChange={e => setPasteData(e.target.value)} 
              />
              <button 
                onClick={() => handleProcess(pasteData)} 
                disabled={isProcessing || !pasteData.trim()} 
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
              >
                {isProcessing ? 'Sincronizando PGs...' : 'Sincronizar Lista de PGs'}
              </button>
          </div>
      </div>
    </div>
  );
};

export default ImportPGs;
