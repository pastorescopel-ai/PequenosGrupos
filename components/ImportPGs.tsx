
import React, { useState } from 'react';
import { Network, CheckCircle, Plus, Trash2, Search, Building2 } from 'lucide-react';
import { writeBatch, collection, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PG, HospitalUnit } from '../types';
import ConfirmModal from './ConfirmModal';

interface ImportPGsProps {
  pgs: PG[]; 
  setPgs: React.Dispatch<React.SetStateAction<PG[]>>;
}

const ImportPGs: React.FC<ImportPGsProps> = ({ pgs = [], setPgs }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
  const [targetUnit, setTargetUnit] = useState<HospitalUnit>('Belém');

  const handleProcess = async (dataToProcess: string) => {
    if (!dataToProcess.trim()) return;
    setIsProcessing(true);
    
    try {
        const names = dataToProcess.split('\n').filter(l => l.trim());
        let currentBatch = writeBatch(db);
        let count = 0;
        let totalCount = 0;

        for (const name of names) {
            const docRef = doc(collection(db, "pgs"));
            currentBatch.set(docRef, { 
                id: docRef.id, 
                name: name.trim(), 
                active: true,
                hospital: targetUnit
            });
            count++;
            totalCount++;
            if (count >= 450) {
                await currentBatch.commit();
                currentBatch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) await currentBatch.commit();
        setResult({ total: totalCount, status: 'success', unit: targetUnit });
        setPasteData('');
    } catch(e) { console.error(e); alert("Erro ao importar PGs."); } finally { setIsProcessing(false); }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
        await deleteDoc(doc(db, "pgs", itemToDelete.id));
        setItemToDelete(null);
    } catch (error) { console.error("Erro ao deletar:", error); }
  };

  const filtered = pgs.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const isBarcarena = targetUnit === 'Barcarena';

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-left relative">
      <header className="flex justify-between items-center">
        <div>
           <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Network className="text-blue-600" size={28}/> Lista Oficial de PGs
           </h4>
           <p className="text-slate-500 text-sm mt-1">Defina os nomes oficiais dos Pequenos Grupos disponíveis.</p>
        </div>
      </header>

      {/* SELETOR DE UNIDADE */}
      <div className="flex justify-center mb-4">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          <button
            onClick={() => setTargetUnit('Belém')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              !isBarcarena ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building2 size={16} /> HAB (Belém)
          </button>
          <button
            onClick={() => setTargetUnit('Barcarena')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isBarcarena ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building2 size={16} /> HABA (Barcarena)
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 rounded-[3rem] border-2 transition-all ${isBarcarena ? 'bg-indigo-50/50 border-indigo-100' : 'bg-blue-50/50 border-blue-100'}`}>
        <div className="lg:col-span-1 space-y-4">
          <textarea 
            className={`w-full h-[300px] p-6 bg-white border rounded-[2.5rem] outline-none font-mono text-xs shadow-sm resize-none transition-all ${
                isBarcarena ? 'border-indigo-200 focus:ring-8 focus:ring-indigo-500/10' : 'border-blue-200 focus:ring-8 focus:ring-blue-500/10'
            }`}
            placeholder={`PGs do ${targetUnit}:\n\nPG Amigos da Fé\nPG Restaurar`}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            disabled={isProcessing}
          />
          <div className="flex flex-col gap-3">
            {result && (
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 animate-in zoom-in-95">
                    <CheckCircle size={14}/> 
                    <span className="text-[10px] font-black uppercase tracking-widest">{result.total} Salvos em {result.unit}</span>
                </div>
            )}
            <button 
                disabled={isProcessing || !pasteData.trim()} 
                onClick={() => handleProcess(pasteData)} 
                className={`w-full py-4 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${
                    isBarcarena ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
                >
                {isProcessing ? '...' : <><Plus size={16}/> Cadastrar PGs em {targetUnit}</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar PG..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold shadow-sm"
              />
           </div>
           
           <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar shadow-sm">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 sticky top-0">
                    <tr>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Ação</th>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Nome do PG</th>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Unidade</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filtered.map(p => (
                       <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 w-16">
                             <button onClick={() => setItemToDelete({id: p.id, name: p.name})} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          </td>
                          <td className="p-4 font-bold text-slate-700 text-sm">{p.name}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                p.hospital === 'Barcarena' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {p.hospital || 'Belém'}
                            </span>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {itemToDelete && (
        <ConfirmModal
          title="Excluir PG?"
          description={<>Confirma a remoção de <b>{itemToDelete.name}</b>?</>}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
          confirmText="Excluir"
        />
      )}
    </div>
  );
};

export default ImportPGs;
