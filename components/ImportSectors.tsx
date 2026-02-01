
import React, { useState } from 'react';
import { writeBatch, collection, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sector, HospitalUnit } from '../types';
import ConfirmModal from './ConfirmModal';

interface ImportSectorsProps {
  sectors: Sector[]; 
  setSectors: React.Dispatch<React.SetStateAction<Sector[]>>;
}

const ImportSectors: React.FC<ImportSectorsProps> = ({ sectors = [], setSectors }) => {
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
        // Remove a filtragem estrita por ponto e vírgula para aceitar colar do Excel ou apenas nomes
        const rows = dataToProcess.split('\n').filter(l => l.trim());
        let currentBatch = writeBatch(db);
        let count = 0;
        let totalCount = 0;

        for (const row of rows) {
            let code = '';
            let name = '';
            
            const cleanRow = row.replace(/\r/g, '').trim();
            if (!cleanRow) continue;

            // Lógica flexível de detecção de separador
            if (cleanRow.includes(';')) {
                // Formato CSV Padrão: CODIGO;NOME
                const parts = cleanRow.split(';');
                code = parts[0]?.trim();
                name = parts[1]?.trim();
            } else if (cleanRow.includes('\t')) {
                // Formato Excel (Tabulação): CODIGO   NOME
                const parts = cleanRow.split('\t');
                code = parts[0]?.trim();
                name = parts[1]?.trim();
            } else {
                // Formato Apenas Nome (gera código automático)
                name = cleanRow;
                // Pega as 3 primeiras letras + 3 letras finais ou algo similar para código curto
                code = name.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
            }

            // Fallbacks de segurança
            if (!name && code) name = code;
            if (!code && name) code = name.substring(0, 6).toUpperCase();

            if (!name) continue;

            const docRef = doc(collection(db, "sectors"));
            currentBatch.set(docRef, {
                id: docRef.id,
                code: code.toUpperCase(),
                name: name,
                active: true,
                created_at: new Date().toISOString(),
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
    } catch (error) {
        console.error(error);
        alert("Erro ao importar setores.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
        await deleteDoc(doc(db, "sectors", itemToDelete.id));
        setItemToDelete(null);
    } catch (error) {
        console.error("Erro ao deletar:", error);
    }
  };

  const filtered = sectors.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()));
  const isBarcarena = targetUnit === 'Barcarena';

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      <header className="flex justify-between items-start">
        <div>
          <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-sm">🏢</span> Importação de Setores
          </h4>
          <p className="text-slate-500 text-sm mt-1">Sincronize a estrutura hospitalar para o Dashboard.</p>
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
            <span className="text-lg">🏥</span> HAB (Belém)
          </button>
          <button
            onClick={() => setTargetUnit('Barcarena')}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isBarcarena ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-lg">🏥</span> HABA (Barcarena)
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 rounded-[3rem] border-2 transition-all ${isBarcarena ? 'bg-indigo-50/50 border-indigo-100' : 'bg-blue-50/50 border-blue-100'}`}>
        <div className="lg:col-span-1 space-y-4">
           <textarea 
            className={`w-full h-[300px] p-6 bg-white border rounded-[2.5rem] outline-none font-mono text-xs shadow-sm resize-none transition-all ${
                isBarcarena ? 'border-indigo-200 focus:ring-8 focus:ring-indigo-500/10' : 'border-blue-200 focus:ring-8 focus:ring-blue-500/10'
            }`}
            placeholder={`Setores para ${targetUnit} (Cole do Excel ou CSV):\n\nUTI Adulto\nCentro Cirúrgico\n\nOu:\nUTI;UTI Adulto`}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            disabled={isProcessing}
          />
          <div className="flex flex-col gap-3">
            {result && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl border border-green-100 animate-in zoom-in-95">
                <span className="text-lg">✅</span>
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
                {isProcessing ? '...' : <><span className="text-lg">➕</span> Importar para {targetUnit}</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
           <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg filter grayscale opacity-50">🔍</span>
              <input 
                type="text" 
                placeholder="Pesquisar setor..." 
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
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Código</th>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Nome</th>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Unidade</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filtered.map(s => (
                       <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 w-16">
                             <button onClick={() => setItemToDelete({id: s.id, name: s.name})} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-lg filter drop-shadow-sm hover:scale-110">🗑️</button>
                          </td>
                          <td className="p-4 font-mono font-bold text-blue-600 text-xs">{s.code}</td>
                          <td className="p-4 font-bold text-slate-700 text-sm">{s.name}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                s.hospital === 'Barcarena' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {s.hospital || 'Belém'}
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
          title="Excluir Setor?"
          description={<>Confirma a remoção de <b>{itemToDelete.name}</b>?</>}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
          confirmText="Excluir"
        />
      )}
    </div>
  );
};

export default ImportSectors;
