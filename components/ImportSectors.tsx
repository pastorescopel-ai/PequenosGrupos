
import React, { useState, useRef } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sector, HospitalUnit, Collaborator } from '../types';
import { Upload, Building, CheckCircle2, ShieldAlert, Sparkles, ChevronLeft, ChevronRight, XCircle, RefreshCw, Plus } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface ImportSectorsProps {
  sectors: Sector[]; 
  setSectors: React.Dispatch<React.SetStateAction<Sector[]>>;
  allCollaborators: Collaborator[];
  defaultUnit: HospitalUnit;
}

interface SectorPreview {
    id: string;
    code: string;
    name: string;
    unit: HospitalUnit;
    status: 'new' | 'updated' | 'inactivated' | 'unchanged' | 'wrong_unit';
    rawObj?: any;
}

const ImportSectors: React.FC<ImportSectorsProps> = ({ sectors, setSectors, allCollaborators, defaultUnit }) => {
  const [pasteData, setPasteData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<SectorPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleAnalyze = async (dataToProcess: string) => {
    if (!dataToProcess.trim()) return;
    setIsAnalyzing(true);
    setPreviewData([]);
    
    try {
        const rows = dataToProcess.split('\n').filter(l => l.trim());
        const presentCodes = new Set<string>();
        const reportList: SectorPreview[] = [];

        for (const row of rows) {
            const parts = row.includes(';') ? row.split(';') : row.split('\t');
            if (parts.length < 2) continue;

            const code = parts[0]?.trim().toUpperCase() || '';
            const name = parts[1]?.trim() || '';
            const unidadeRaw = parts[2]?.trim().toLowerCase();
            
            let unit: HospitalUnit = defaultUnit;
            if (unidadeRaw) {
                if (unidadeRaw.includes('barcarena') || unidadeRaw.includes('haba')) unit = 'Barcarena';
                else if (unidadeRaw.includes('belem') || unidadeRaw.includes('hab')) unit = 'Belém';
            }

            if (code && name) {
                let status: SectorPreview['status'] = 'new';
                if (unit !== defaultUnit) {
                    status = 'wrong_unit';
                } else {
                    presentCodes.add(code);
                    const existing = sectors.find(s => s.code === code);
                    status = existing ? 'unchanged' : 'new';
                    if (existing && (!existing.active || existing.name !== name || existing.hospital !== unit)) {
                        status = 'updated';
                    }
                }

                reportList.push({
                    id: code, code, name, unit, status,
                    rawObj: status !== 'wrong_unit' ? { id: code, code, name, hospital: unit, active: true, created_at: new Date().toISOString() } : null
                });
            }
        }

        // INATIVAÇÃO ESTRITA: Apenas da unidade selecionada
        const toInactivate = sectors.filter(s => 
            s.active && 
            (s.hospital === defaultUnit || (!s.hospital && defaultUnit === 'Belém')) && 
            !presentCodes.has(s.code)
        );

        toInactivate.forEach(s => {
            reportList.push({
                id: s.id, code: s.code, name: s.name, unit: s.hospital || 'Belém', status: 'inactivated'
            });
        });

        setPreviewData(reportList.sort((a, b) => a.name.localeCompare(b.name)));
        setShowPreview(true);
        setCurrentPage(1);
    } catch (e) {
        alert("Erro na análise.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleConfirmSave = async () => {
      setIsSaving(true);
      try {
          const batchSize = 400; 
          let batch = writeBatch(db);
          let opCount = 0;

          const toSave = previewData.filter(i => i.status !== 'inactivated' && i.status !== 'unchanged' && i.status !== 'wrong_unit' && i.rawObj);
          for (const item of toSave) {
              const docRef = doc(db, "sectors", item.id);
              batch.set(docRef, item.rawObj, { merge: true });
              opCount++;
              if (opCount >= batchSize) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
          }

          const toInactivate = previewData.filter(i => i.status === 'inactivated');
          for (const item of toInactivate) {
              const docRef = doc(db, "sectors", item.id);
              batch.update(docRef, { active: false });
              opCount++;
              if (opCount >= batchSize) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
          }

          if (opCount > 0) await batch.commit();
          alert("Setores atualizados com isolamento de unidade!");
          setShowPreview(false);
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setIsSaving(false);
      }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = previewData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(previewData.length / itemsPerPage);

  return (
    <div className="space-y-8 text-left">
      <div className="bg-emerald-50/50 p-10 rounded-[3rem] border-2 border-emerald-100 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-700">
               <Building size={28} />
               <div>
                   <h4 className="text-xl font-black">Setores Hospitalares</h4>
                   <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Unidade Alvo: {defaultUnit}</p>
               </div>
            </div>
            <p className="text-xs text-slate-500 font-medium bg-white/70 p-5 rounded-[2rem] border border-emerald-100">
              Isolamento: Setores pertencentes a outras unidades serão ignorados durante o processamento.
            </p>
            <button onClick={() => fileInputRef.current?.click()} className="w-full p-8 border-4 border-dashed border-emerald-200 rounded-[2.5rem] bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-all group flex flex-col items-center gap-3">
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => handleAnalyze(ev.target?.result as string);
                        reader.readAsText(file);
                    }
                }}/>
                <Upload size={32} className="text-emerald-400" />
                <span className="font-black text-[11px] uppercase text-emerald-600 tracking-widest">Subir Planilha Estrita</span>
            </button>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
              <textarea className="w-full flex-1 h-40 p-8 rounded-[2rem] border-2 border-emerald-100 outline-none font-mono text-xs resize-none bg-white shadow-inner" placeholder="Matrícula; Nome; Unidade..." value={pasteData} onChange={e => setPasteData(e.target.value)} />
              <button onClick={() => handleAnalyze(pasteData)} disabled={isAnalyzing || !pasteData.trim()} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                {isAnalyzing ? 'Processando Unidade...' : 'Analisar Setores'}
              </button>
          </div>
      </div>

      {showPreview && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm mb-8">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                          <tr>
                              <th className="p-6">Status</th>
                              <th className="p-6">Código ID</th>
                              <th className="p-6">Nome do Setor</th>
                              <th className="p-6">Unidade</th>
                          </tr>
                      </thead>
                      <tbody className="text-xs font-medium text-slate-600">
                          {currentItems.map((item) => (
                              <tr key={item.id} className={`border-b border-slate-50 last:border-0 ${item.status === 'inactivated' ? 'bg-red-50/50' : item.status === 'wrong_unit' ? 'bg-orange-50/30' : 'hover:bg-slate-50'}`}>
                                  <td className="p-6">
                                      {item.status === 'wrong_unit' ? <span className="text-orange-600 font-black">IGNORADO</span> : 
                                       item.status === 'new' ? <span className="text-green-600">NOVO</span> :
                                       item.status === 'inactivated' ? <span className="text-red-600">INATIVAR</span> : 'MANTIDO'}
                                  </td>
                                  <td className="p-6 font-mono">{item.code}</td>
                                  <td className="p-6 font-bold">{item.name}</td>
                                  <td className="p-6">{item.unit}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {totalPages > 1 && (
                      <div className="bg-slate-50 p-4 flex items-center justify-between">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={20}/></button>
                          <span className="text-xs font-bold">Pág {currentPage} / {totalPages}</span>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={20}/></button>
                      </div>
                  )}
              </div>
              <div className="flex justify-end gap-4">
                  <button onClick={() => setShowPreview(false)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl">Cancelar</button>
                  <button onClick={handleConfirmSave} disabled={isSaving} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 flex items-center gap-2">
                      {isSaving ? 'Salvando...' : 'Confirmar Sincronização Estrita'} <CheckCircle2 size={18}/>
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default ImportSectors;
