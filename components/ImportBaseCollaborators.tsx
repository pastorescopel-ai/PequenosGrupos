
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AlertTriangle, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { writeBatch, doc, deleteDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Collaborator, HospitalUnit, Sector } from '../types';
import ConfirmModal from './ConfirmModal';
import ActionTooltip from './ActionTooltip';
import CollaboratorDetailModal from './CollaboratorDetailModal';

interface ImportBaseCollaboratorsProps {
  allCollaborators: Collaborator[]; 
  setAllCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  sectors: Sector[]; 
}

const ImportBaseCollaborators: React.FC<ImportBaseCollaboratorsProps> = ({ allCollaborators, setAllCollaborators, sectors = [] }) => {
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetUnit, setTargetUnit] = useState<HospitalUnit>('Belém');
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
  const [itemToToggle, setItemToToggle] = useState<Collaborator | null>(null);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 100;

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
        let setor = parts[2]?.trim() || 'GERAL';

        // Auto-Correção de Setor
        const lowerSetor = setor.toLowerCase();
        if (!validSectorNames.has(lowerSetor)) {
            const matches = sectors.filter(s => 
                (s.hospital === targetUnit || !s.hospital) &&
                (s.name.toLowerCase() === lowerSetor || (lowerSetor.length > 3 && s.name.toLowerCase().includes(lowerSetor)))
            );
            if (matches.length === 1) {
                setor = matches[0].name;
            }
        }

        newCollabs.push({
          id: matricula, // ID do documento = Matrícula (Evita duplicidade)
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

      // Processamento em Lote
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
              batch.set(docRef, collab, { merge: true });
          });
          await batch.commit();
          totalSaved += chunk.length;
      }

      setResult({ total: totalSaved, status: 'success', unit: targetUnit });
      setPasteData('');
      alert(`Processamento concluído!\n${totalSaved} colaboradores atualizados/criados.`);
      
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao salvar no banco de dados.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCollab = async (updatedData: Partial<Collaborator>) => {
      if (!editingCollab) return;
      try {
          const docId = editingCollab.employee_id || editingCollab.id;
          await updateDoc(doc(db, "collaborators", docId), updatedData);
          setEditingCollab(null);
      } catch (e) {
          console.error("Erro ao atualizar:", e);
          alert("Erro ao salvar alterações.");
      }
  };

  const handleConfirmToggleStatus = async () => {
    if (!itemToToggle) return;
    setIsProcessing(true);
    try {
        const batch = writeBatch(db);
        const isActivating = !itemToToggle.active;
        const collabRef = doc(db, "collaborators", itemToToggle.id);
        batch.update(collabRef, { active: isActivating });

        if (!isActivating) {
            const qLeader = query(collection(db, "leaders"), where("employee_id", "==", itemToToggle.employee_id));
            const snapLeader = await getDocs(qLeader);
            snapLeader.forEach(d => batch.update(d.ref, { active: false }));

            const qMember = query(collection(db, "members"), where("employee_id", "==", itemToToggle.employee_id));
            const snapMember = await getDocs(qMember);
            snapMember.forEach(d => batch.update(d.ref, { active: false }));
        } 
        await batch.commit();
        setItemToToggle(null);
    } catch (error) {
        console.error("Erro ao alterar status:", error);
        alert("Erro ao atualizar status.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    const target = itemToDelete;
    if (!target) return;
    
    setItemToDelete(null); // Fecha modal imediatamente

    try {
        await deleteDoc(doc(db, "collaborators", target.id));
        setAllCollaborators(prev => prev.filter(c => c.id !== target.id)); // Atualiza visualmente
        console.log(`Colaborador ${target.name} excluído.`);
    } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao excluir registro. Tente recarregar a página.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => handleProcess(event.target?.result as string);
    reader.readAsText(file);
  };

  // --- LÓGICA DE LISTA PROCESSADA (Filtro + Ordenação + Paginação) ---
  const processedList = useMemo(() => {
      // 1. Filtragem
      let filtered = allCollaborators.filter(c => {
          const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                c.employee_id.includes(searchTerm) ||
                                c.sector_name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesUnit = c.hospital === targetUnit || (!c.hospital && targetUnit === 'Belém');
          return matchesSearch && matchesUnit;
      });

      // 2. Ordenação Inteligente: Inválidos primeiro, depois alfabético
      return filtered.sort((a, b) => {
          const aValid = validSectorNames.has(a.sector_name.trim().toLowerCase());
          const bValid = validSectorNames.has(b.sector_name.trim().toLowerCase());
          
          if (aValid !== bValid) {
              return aValid ? 1 : -1; // Inválido (false) vem antes de Válido (true)
          }
          return a.full_name.localeCompare(b.full_name);
      });
  }, [allCollaborators, searchTerm, targetUnit, validSectorNames]);

  // Reseta para página 1 se mudar filtros
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, targetUnit]);

  const totalPages = Math.ceil(processedList.length / ITEMS_PER_PAGE);
  const currentData = processedList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const isBarcarena = targetUnit === 'Barcarena';

  return (
    <div className="space-y-12 animate-in fade-in duration-300 text-left relative">
      <header className="flex justify-between items-start">
        <div>
          <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-sm">👤</span> Base Oficial de Colaboradores
          </h4>
          <p className="text-slate-500 text-sm mt-1">Sincronização master de integrantes ativos no hospital.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3 bg-blue-50 px-5 py-2 rounded-2xl border border-blue-100">
             <span className="text-xl">🗃️</span>
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
               <span className="text-4xl filter drop-shadow-sm">☁️</span>
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
                <span className="text-lg">✅</span>
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
              {isProcessing ? 'Processando...' : <><span className="text-lg">📥</span> Processar para {targetUnit}</>}
            </button>
          </div>
        </div>
      </div>

      {/* TABELA DE VISUALIZAÇÃO DOS DADOS */}
      <div className="pt-10 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h4 className="text-xl font-black text-slate-800">Base Atual Consolidada</h4>
          <div className="relative w-full max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg filter grayscale opacity-50">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar colaborador..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold"
            />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest w-40">Ações</th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Matrícula</th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome</th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Setor (Validação)</th>
                  <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentData.map((collab) => {
                  const isSectorValid = validSectorNames.has(collab.sector_name.trim().toLowerCase());
                  
                  return (
                    <tr key={collab.id} className={`transition-colors ${collab.active ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-60'}`}>
                      <td className="p-5 flex gap-1">
                        <ActionTooltip content="Editar Dados / Corrigir Setor">
                          <button 
                            onClick={() => setEditingCollab(collab)}
                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-lg filter drop-shadow-sm hover:scale-110"
                          >
                              <Pencil size={16} />
                          </button>
                        </ActionTooltip>
                        <ActionTooltip content={collab.active ? "Inativar" : "Reativar"}>
                          <button 
                            onClick={() => setItemToToggle(collab)}
                            className={`p-2 rounded-lg transition-all text-lg filter drop-shadow-sm hover:scale-110`}
                          >
                              {collab.active ? '🟢' : '🔴'}
                          </button>
                        </ActionTooltip>
                        <ActionTooltip content="Excluir Definitivamente">
                          <button 
                            onClick={() => setItemToDelete({id: collab.id, name: collab.full_name})}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all text-lg filter drop-shadow-sm hover:scale-110"
                          >
                              🗑️
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
                              <ActionTooltip content="Setor não cadastrado na lista oficial.">
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
                {currentData.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 italic text-sm">Nenhum registro encontrado.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* PAGINAÇÃO */}
          {totalPages > 1 && (
              <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50">
                  <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100 flex items-center gap-2 transition-all"
                  >
                      <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Página {currentPage} de {totalPages} • Total: {processedList.length}
                  </span>
                  <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-100 flex items-center gap-2 transition-all"
                  >
                      Próxima <ChevronRight size={14} />
                  </button>
              </div>
          )}
        </div>
      </div>

      {editingCollab && (
        <CollaboratorDetailModal 
            collaborator={editingCollab}
            reasons={[]}
            onClose={() => setEditingCollab(null)}
            onRequestAction={() => {}}
            isAdmin={true}
            onUpdate={handleUpdateCollab}
            sectors={sectors}
        />
      )}

      {itemToToggle && (
         <ConfirmModal
            title={itemToToggle.active ? "Inativar Colaborador?" : "Reativar Colaborador?"}
            description={
                itemToToggle.active ? 
                <><b>{itemToToggle.full_name}</b> será removido automaticamente dos PGs.</> : 
                <><b>{itemToToggle.full_name}</b> voltará a estar disponível.</>
            }
            onConfirm={handleConfirmToggleStatus}
            onCancel={() => setItemToToggle(null)}
            confirmText="Confirmar"
            variant={itemToToggle.active ? "warning" : "success"}
         />
      )}

      {itemToDelete && (
        <ConfirmModal
          title="Excluir Definitivamente?"
          description={<>Atenção: A remoção de <b>{itemToDelete.name}</b> é irreversível. Esta ação removerá o colaborador da base.</>}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
          confirmText="Sim, Excluir Registro"
          variant="danger"
        />
      )}
    </div>
  );
};

export default ImportBaseCollaborators;
