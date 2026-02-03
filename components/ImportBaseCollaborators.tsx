
import React, { useState, useRef } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Collaborator, HospitalUnit, Sector } from '../types';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface ImportBaseCollaboratorsProps {
  allCollaborators: Collaborator[]; 
  setAllCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  sectors: Sector[]; 
}

const ImportBaseCollaborators: React.FC<ImportBaseCollaboratorsProps> = ({ allCollaborators, setAllCollaborators, sectors = [] }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async (dataToProcess: string) => {
    if (!dataToProcess.trim()) return;
    setIsProcessing(true);
    setLog(null);
    
    try {
      const rows = dataToProcess.split('\n').filter(l => l.trim());
      const newCollabs: Collaborator[] = [];

      rows.forEach(row => {
        const cleanRow = row.replace(/\r/g, '').trim();
        if (!cleanRow) return;

        const parts = cleanRow.includes(';') ? cleanRow.split(';') : cleanRow.split('\t'); 
        if (parts.length < 2) return;

        // Formato: MATRICULA (0); NOME (1); ID SETOR (2); SETOR (3); [UNIDADE Opcional (4)]
        const matricula = parts[0]?.trim() || '';
        const nome = parts[1]?.trim().toUpperCase() || '';
        const idSetor = parts[2]?.trim() || '';
        const nomeSetor = parts[3]?.trim() || 'GERAL';
        const unidadeRaw = parts[4]?.trim().toLowerCase() || 'belém';

        let targetUnit: HospitalUnit = 'Belém';
        if (unidadeRaw.includes('barcarena') || unidadeRaw.includes('haba')) {
            targetUnit = 'Barcarena';
        }

        if (matricula && nome) {
            newCollabs.push({
              id: matricula,
              employee_id: matricula,
              full_name: nome,
              sector_id: idSetor,
              sector_name: nomeSetor,
              active: true,
              join_date: new Date().toLocaleDateString(),
              hospital: targetUnit
            });
        }
      });

      if (newCollabs.length === 0) {
        setLog({ msg: "Nenhum dado válido encontrado nas colunas Matrícula e Nome.", type: 'error' });
        setIsProcessing(false);
        return;
      }

      // Processamento em Lotes (Batch) - Limite 500 por transação
      const batchSize = 400; 
      for (let i = 0; i < newCollabs.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = newCollabs.slice(i, i + batchSize);
          chunk.forEach((collab) => {
              const docRef = doc(db, "collaborators", collab.employee_id);
              // Sobrescreve dados se a matrícula já existir (Correção de nomes/setores)
              batch.set(docRef, collab, { merge: true });
          });
          await batch.commit();
      }

      setPasteData('');
      setLog({ msg: `Sincronização concluída: ${newCollabs.length} colaboradores processados (Novos ou Atualizados).`, type: 'success' });
    } catch (error) {
      console.error(error);
      setLog({ msg: "Erro técnico ao salvar no banco de dados.", type: 'error' });
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
    <div className="space-y-10 text-left">
      <div className="bg-blue-50/50 p-10 rounded-[3rem] border-2 border-blue-100 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                <FileText size={24}/>
             </div>
             <h4 className="text-xl font-black text-slate-800">Base RH</h4>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed bg-white/50 p-4 rounded-2xl border border-blue-100">
            Formato da Planilha:<br/>
            <span className="font-black text-blue-700">MATRICULA ; NOME ; ID_SETOR ; SETOR</span><br/><br/>
            O sistema utiliza a <span className="underline">Matrícula</span> como chave única. Se importar novamente com outro setor ou nome, o registro será corrigido automaticamente sem duplicar.
          </p>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 border-4 border-dashed border-blue-200 rounded-[2.5rem] text-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all group bg-white flex flex-col items-center gap-3"
          >
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={onFileChange}/>
            <Upload size={32} className="text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="font-black text-[11px] uppercase text-blue-600 tracking-widest">Selecionar Arquivo</span>
          </button>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
           <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ou cole os dados aqui:</label>
              {log && (
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${log.type === 'success' ? 'text-green-600' : 'text-red-600'} animate-in fade-in`}>
                   {log.type === 'success' ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
                   {log.msg}
                </div>
              )}
           </div>
           <textarea 
             className="w-full flex-1 h-[250px] p-8 rounded-[2.5rem] border-2 border-blue-100 outline-none focus:ring-8 focus:ring-blue-600/5 font-mono text-xs resize-none bg-white shadow-inner" 
             placeholder="Ex: 1001; JOÃO SILVA; 10; UTI ADULTO" 
             value={pasteData} 
             onChange={e => setPasteData(e.target.value)} 
           />
           <button 
             onClick={() => handleProcess(pasteData)} 
             disabled={isProcessing || !pasteData.trim()} 
             className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
           >
             {isProcessing ? 'Sincronizando Base...' : 'Processar e Atualizar Colaboradores'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ImportBaseCollaborators;
