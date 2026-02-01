
import React, { useState, useRef, useMemo } from 'react';
import { UserCircle2, ScanText, CheckCircle, UploadCloud, Database, Search, Trash2, Building2, UserX, UserCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { writeBatch, doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Collaborator, HospitalUnit, Sector } from '../types';
import ConfirmModal from './ConfirmModal';
import ActionTooltip from './ActionTooltip';

interface ImportBaseCollaboratorsProps {
  allCollaborators: Collaborator[]; 
  setAllCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  sectors: Sector[]; // Nova prop para validação
}

const ImportBaseCollaborators: React.FC<ImportBaseCollaboratorsProps> = ({ allCollaborators, setAllCollaborators, sectors = [] }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetUnit, setTargetUnit] = useState<HospitalUnit>('Belém');
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
  const [itemToToggle, setItemToToggle] = useState<Collaborator | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cache dos nomes de setores válidos para validação rápida
  const validSectorNames = useMemo(() => {
      return new Set(sectors.map(s => s.name.trim().toLowerCase()));
  }, [sectors]);

  const handleProcess = async (dataToProcess: string) => {
    if (!dataToProcess.trim()) return;
    setIsProcessing(true);
    
    try {
      const rows = dataToProcess.split('\n').filter(l => l.trim());
      const newCollabs: Collaborator[] = [];

      rows.forEach(row => {
        const cleanRow = row.replace(/\r/g, '').trim();
        if (!cleanRow) return;

        const parts = cleanRow.includes(';') ? cleanRow.split(';') : cleanRow.split(/\t/); 
        
        if (parts.length < 2) return;

        const matricula = parts[0]?.trim() || '000';
        const nome = parts[1]?.trim().toUpperCase() || 'SEM NOME';
        const setor = parts[2]?.trim() || 'GERAL';

        newCollabs.push({
          id: matricula,
          employee_id: matricula,
          full_name: nome,
          sector_name: setor,
          sector_id: setor.toLowerCase().replace(/\s/g, '_'),
          active: true,
          join_date: new Date().toLocaleDateString(),
          hospital: targetUnit
        });
      });

      if (newCollabs.length === 0) {
        alert("Nenhum dado válido encontrado.");
        setIsProcessing(false);
        return;
      }

      const batchSize = 450; 
      const chunks = [];
      for (let i = 0; i < newCollabs.length; i += batchSize) {
          chunks.push(newCollabs.slice(i, i + batchSize));
      }

      let totalSaved = 0;

      for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((collab) => {
              const docRef = doc(db, "collaborators", collab.employee_id);
              batch.set(docRef, collab);
          });
          await batch.commit();
          totalSaved += chunk.length;
      }

      setResult({ total: totalSaved, status: 'success', unit: targetUnit });
      setPasteData('');
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao salvar no banco de dados.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Lógica Inteligente de Status
  const handleConfirmToggleStatus = async () => {
    if (!itemToToggle) return;
    setIsProcessing(true);

    try {
        const batch = writeBatch(db);
        const isActivating = !itemToToggle.active; // Se true, estamos reativando. Se false, inativando.

        // 1. Atualiza SEMPRE na Base de Colaboradores (RH)
        const collabRef = doc(db, "collaborators", itemToToggle.id);
        batch.update(collabRef, { active: isActivating });

        if (!isActivating) {
            // --- CASO: INATIVAÇÃO (Desliga tudo) ---
            // Remove acessos de liderança, capelania e MEMBRESIA DE PG, mas mantém o documento para histórico.
            
            // 2. Inativar registro de LÍDER
            const qLeader = query(collection(db, "leaders"), where("employee_id", "==", itemToToggle.employee_id));
            const snapLeader = await getDocs(qLeader);
            snapLeader.forEach(d => {
                batch.update(d.ref, { active: false });
            });

            // 3. Inativar registro de CAPELÃO
            const qChap = query(collection(db, "chaplains"), where("employee_id", "==", itemToToggle.employee_id));
            const snapChap = await getDocs(qChap);
            snapChap.forEach(d => {
                batch.update(d.ref, { active: false });
            });

            // 4. Inativar registro de MEMBRO de PG (Isso o remove da lista do Líder)
            const qMember = query(collection(db, "members"), where("employee_id", "==", itemToToggle.employee_id));
            const snapMember = await getDocs(qMember);
            snapMember.forEach(d => {
                batch.update(d.ref, { active: false });
            });
        } 
        // --- CASO: REATIVAÇÃO ---
        // Se isActivating === true, NÃO fazemos nada nas coleções 'leaders', 'chaplains' ou 'members'.
        // O colaborador volta apenas como um funcionário ativo na base RH.
        // O Líder precisará vinculá-lo novamente ao PG para ele aparecer na lista.

        await batch.commit();
        
        // Atualiza estado local imediatamente para refletir na UI
        setAllCollaborators(prev => prev.map(c => 
            c.id === itemToToggle.id ? { ...c, active: isActivating } : c
        ));
        
        setItemToToggle(null);

    } catch (error) {
        console.error("Erro ao alterar status:", error);
        alert("Erro ao atualizar status.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
        await deleteDoc(doc(db, "collaborators", itemToDelete.id));
        // Remove localmente
        setAllCollaborators(prev => prev.filter(c => c.id !== itemToDelete.id));
        setItemToDelete(null);
    } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao excluir registro.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => handleProcess(event.target?.result as string);
    reader.readAsText(file);
  };

  const filteredList = allCollaborators.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.employee_id.includes(searchTerm) ||
    c.sector_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isBarcarena = targetUnit === 'Barcarena';

  return (
    <div className="space-y-12 animate-in fade-in duration-300 text-left relative">
      <header className="flex justify-between items-start">
        <div>
          <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <UserCircle2 className="text-blue-600" size={28}/> Base Oficial de Colaboradores
          </h4>
          <p className="text-slate-500 text-sm mt-1">Sincronização master de integrantes ativos no hospital.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3 bg-blue-50 px-5 py-2 rounded-2xl border border-blue-100">
             <Database size={18} className="text-blue-600"/>
             <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
               {allCollaborators.length} Registros
             </span>
           </div>
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

      {/* ÁREA DE IMPORTAÇÃO */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 rounded-[3rem] border-2 transition-all ${isBarcarena ? 'bg-indigo-50/50 border-indigo-100' : 'bg-blue-50/50 border-blue-100'}`}>
        <div className="space-y-6">
          <div 
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer group bg-white ${
              isProcessing ? 'opacity-50 pointer-events-none' : 
              isBarcarena ? 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform ${isBarcarena ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
               <UploadCloud size={32} />
            </div>
            <p className="font-black text-slate-800 mb-2 text-sm">Upload Arquivo {targetUnit}</p>
            <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed">Arraste seu arquivo ou clique para selecionar.</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <textarea 
            className={`w-full h-[250px] p-10 bg-white border rounded-[3rem] outline-none font-mono text-sm shadow-sm transition-all resize-none ${
                isBarcarena ? 'border-indigo-200 focus:ring-8 focus:ring-indigo-500/10' : 'border-blue-200 focus:ring-8 focus:ring-blue-500/10'
            }`}
            placeholder={`Cole aqui os dados para ${targetUnit}...\nEx: 1001; João Silva; UTI Adulto`}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            disabled={isProcessing}
          />
          <div className="flex justify-end gap-4">
            {result && (
              <div className="flex items-center gap-3 px-6 py-2 bg-green-50 text-green-700 rounded-2xl border border-green-100 animate-in zoom-in-95">
                <CheckCircle size={18}/> 
                <span className="text-xs font-black uppercase tracking-widest">{result.total} Salvos em {result.unit}</span>
              </div>
            )}
            <button 
              disabled={isProcessing || !pasteData.trim()} 
              onClick={() => handleProcess(pasteData)} 
              className={`px-10 py-5 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 active:scale-95 ${
                  isBarcarena ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              {isProcessing ? 'Processando...' : <><ScanText size={20} /> Processar para {targetUnit}</>}
            </button>
          </div>
        </div>
      </div>

      {/* TABELA DE VISUALIZAÇÃO DOS DADOS */}
      <div className="pt-10 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h4 className="text-xl font-black text-slate-800">Base Atual Consolidada</h4>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar colaborador..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold"
            />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest w-32">Ações</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Matrícula</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Setor (Validação)</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.slice(0, 100).map((collab) => {
                // Validação de Setor
                const isSectorValid = validSectorNames.has(collab.sector_name.trim().toLowerCase());
                
                return (
                  <tr key={collab.id} className={`transition-colors ${collab.active ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-60'}`}>
                    <td className="p-5 flex gap-2">
                       <ActionTooltip content={collab.active ? "Inativar: Revoga acessos e remove do PG." : "Reativar: Habilita apenas como colaborador base."}>
                         <button 
                           onClick={() => setItemToToggle(collab)}
                           className={`p-2 rounded-lg transition-all ${collab.active ? 'text-slate-300 hover:text-orange-500 hover:bg-orange-50' : 'text-orange-500 bg-orange-50 hover:bg-orange-100'}`}
                         >
                            {collab.active ? <UserX size={16}/> : <UserCheck size={16}/>}
                         </button>
                       </ActionTooltip>
                       <ActionTooltip content="Excluir Definitivamente">
                         <button 
                           onClick={() => setItemToDelete({id: collab.id, name: collab.full_name})}
                           className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                         >
                            <Trash2 size={16}/>
                         </button>
                       </ActionTooltip>
                    </td>
                    <td className="p-5">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${collab.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {collab.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-5 font-mono font-bold text-slate-500 text-xs">{collab.employee_id}</td>
                    <td className="p-5 font-bold text-slate-700 text-sm">{collab.full_name}</td>
                    <td className="p-5">
                       <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${!isSectorValid && collab.active ? 'text-amber-700' : 'text-slate-500'}`}>
                             {collab.sector_name}
                          </span>
                          {!isSectorValid && collab.active && (
                             <ActionTooltip content="Setor não cadastrado na lista oficial. Corrija a importação ou adicione o setor na aba 'Setores'.">
                                <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
                             </ActionTooltip>
                          )}
                       </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                          collab.hospital === 'Barcarena' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                          {collab.hospital || 'Belém'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {itemToToggle && (
         <ConfirmModal
            title={itemToToggle.active ? "Inativar Colaborador?" : "Reativar Colaborador?"}
            description={
                itemToToggle.active ? 
                <>
                   <b>{itemToToggle.full_name}</b> será removido automaticamente dos PGs, Liderança e Capelania.
                   <br/><br/>
                   <span className="text-xs text-orange-600">O histórico será preservado, mas ele não aparecerá mais nas listas ativas.</span>
                </> : 
                <>
                   <b>{itemToToggle.full_name}</b> voltará a estar disponível na base RH.
                   <br/><br/>
                   <span className="text-xs text-blue-600">Atenção: Ele NÃO volta automaticamente para o PG. O líder deverá vinculá-lo novamente.</span>
                </>
            }
            onConfirm={handleConfirmToggleStatus}
            onCancel={() => setItemToToggle(null)}
            confirmText={itemToToggle.active ? "Confirmar Inativação" : "Reativar Cadastro"}
            cancelText="Cancelar"
            variant={itemToToggle.active ? "warning" : "success"}
            icon={itemToToggle.active ? <AlertCircle size={36}/> : <CheckCircle size={36}/>}
         />
      )}

      {itemToDelete && (
        <ConfirmModal
          title="Excluir Definitivamente?"
          description={<>Atenção: A remoção de <b>{itemToDelete.name}</b> é irreversível. Prefira usar a inativação se houver histórico.</>}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
          confirmText="Excluir Registro"
          variant="danger"
        />
      )}
    </div>
  );
};

export default ImportBaseCollaborators;
