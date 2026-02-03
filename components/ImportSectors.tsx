
import React, { useState, useRef } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sector, HospitalUnit } from '../types';
import { Upload, Building, CheckCircle2 } from 'lucide-react';

interface ImportSectorsProps {
  sectors: Sector[]; 
  setSectors: React.Dispatch<React.SetStateAction<Sector[]>>;
}

const ImportSectors: React.FC<ImportSectorsProps> = ({ sectors, setSectors }) => {
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

            const code = parts[0]?.trim().toUpperCase() || '';
            const name = parts[1]?.trim() || '';
            const unidadeRaw = parts[2]?.trim().toLowerCase() || 'belém';
            
            let unit: HospitalUnit = 'Belém';
            if (unidadeRaw.includes('barcarena') || unidadeRaw.includes('haba')) unit = 'Barcarena';

            if (code && name) {
                // O código do setor é o ID. Isso impede duplicidade.
                const docRef = doc(db, "sectors", code);
                batch.set(docRef, { 
                  id: code, 
                  code, 
                  name, 
                  hospital: unit, 
                  active: true, 
                  created_at: new Date().toISOString() 
                }, { merge: true });
                count++;
            }
        }

        await batch.commit();
        setPasteData('');
        setSuccessCount(count);
    } catch (e) {
        alert("Erro na estrutura.");
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
      <div className="bg-emerald-50/50 p-10 rounded-[3rem] border-2 border-emerald-100 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-700">
               <Building size={28} />
               <h4 className="text-xl font-black">Setores Hospitalares</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium bg-white/70 p-5 rounded-[2rem] border border-emerald-100">
              Esquema: <span className="font-black text-emerald-700">ID ; SETOR ; UNIDADE</span><br/><br/>
              Utilize IDs numéricos para vincular colaboradores. Reimportar o mesmo ID corrige o nome do setor instantaneamente.
            </p>

            <button onClick={() => fileInputRef.current?.click()} className="w-full p-8 border-4 border-dashed border-emerald-200 rounded-[2.5rem] bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-all group flex flex-col items-center gap-3">
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={onFileChange}/>
                <Upload size={32} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-black text-[11px] uppercase text-emerald-600 tracking-widest">Subir Planilha</span>
            </button>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colagem Manual:</label>
                {successCount !== null && (
                    <div className="flex items-center gap-2 text-[10px] font-black text-green-600">
                        <CheckCircle2 size={14}/> {successCount} Setores Sincronizados!
                    </div>
                )}
              </div>
              <textarea className="w-full flex-1 h-40 p-8 rounded-[2rem] border-2 border-emerald-100 outline-none font-mono text-xs resize-none bg-white shadow-inner" placeholder="Ex: 101; UTI ADULTO; HAB" value={pasteData} onChange={e => setPasteData(e.target.value)} />
              <button onClick={() => handleProcess(pasteData)} disabled={isProcessing || !pasteData.trim()} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700">
                {isProcessing ? 'Trabalhando...' : 'Atualizar Lista de Setores'}
              </button>
          </div>
      </div>
    </div>
  );
};

export default ImportSectors;
