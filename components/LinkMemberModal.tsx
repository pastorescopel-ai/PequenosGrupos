
import React, { useState, useEffect } from 'react';
import { X, Search, Plus, ScanText, Building2, Info, Sparkles, AlertTriangle, Users } from 'lucide-react';
import { Leader, Collaborator, PG } from '../types';
import { MOTIVOS_ADMISSAO } from '../constants';

interface LinkMemberModalProps {
  user: Leader;
  allCollaborators: Collaborator[];
  pgs: PG[];
  existingMembers: Collaborator[];
  onClose: () => void;
  onConfirm: (collab: Collaborator, pgName: string, reason: string, crossSectorJustification?: string) => void;
}

const LinkMemberModal: React.FC<LinkMemberModalProps> = ({ 
  user, allCollaborators, pgs, existingMembers, onClose, onConfirm 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Collaborator[]>([]);
  const [selectedCollabFromRH, setSelectedCollabFromRH] = useState<Collaborator | null>(null);
  
  const [selectedPG, setSelectedPG] = useState(user.pg_name || '');
  const [motivo, setMotivo] = useState('');
  const [crossSectorJustification, setCrossSectorJustification] = useState('');

  const canEditPG = user.role === 'ADMIN' || !user.pg_name;
  const isCrossSector = selectedCollabFromRH && user.role !== 'ADMIN' && selectedCollabFromRH.sector_name !== user.sector_name;

  // Sugestões inteligentes: Exclui o próprio líder da lista
  const suggestedCollabs = allCollaborators.filter(c => 
    c.active && 
    c.employee_id !== user.employee_id && // NÃO sugere o próprio líder
    c.sector_name === user.sector_name && 
    !existingMembers.some(m => m.employee_id === c.employee_id)
  ).slice(0, 4);

  useEffect(() => {
    if (searchTerm.length > 1 && !selectedCollabFromRH) {
      const lower = searchTerm.toLowerCase();
      const filtered = allCollaborators.filter(c => 
        c.active && 
        c.employee_id !== user.employee_id && // NÃO mostra o líder na busca
        (c.full_name.toLowerCase().includes(lower) || c.employee_id.includes(searchTerm))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedCollabFromRH, allCollaborators, user.employee_id]);

  const selectCollab = (collab: Collaborator) => {
    setSelectedCollabFromRH(collab);
    setSearchTerm(collab.full_name);
    setSearchResults([]);
    setCrossSectorJustification('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollabFromRH || !selectedPG || !motivo) return;

    if (isCrossSector && !crossSectorJustification.trim()) {
        alert("Por favor, explique o motivo de adicionar alguém de outro setor.");
        return;
    }

    const alreadyMember = existingMembers.find(m => m.employee_id === selectedCollabFromRH.employee_id);
    if (alreadyMember) {
      alert(`Este colaborador já está vinculado ao PG: ${(alreadyMember as any).pg_name}`);
      return;
    }

    onConfirm(selectedCollabFromRH, selectedPG, motivo, isCrossSector ? crossSectorJustification : undefined);
  };

  return (
    <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
         <div className="flex justify-between items-center mb-8">
            <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">Vincular Colaborador</h3>
                <p className="text-slate-500 text-xs font-medium mt-1">Adicione integrantes da base oficial ao seu PG.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-800"><X size={28}/></button>
         </div>

         <form onSubmit={handleSubmit} className="space-y-8">
            
            {!selectedCollabFromRH && suggestedCollabs.length > 0 && (
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-500"/> Sugestões do seu Setor ({user.sector_name})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {suggestedCollabs.map(sug => (
                            <button 
                                key={sug.employee_id}
                                type="button"
                                onClick={() => selectCollab(sug)}
                                className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all text-left group"
                            >
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center font-black text-blue-600 text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    {sug.full_name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-700 text-xs truncate">{sug.full_name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Mat: {sug.employee_id}</p>
                                </div>
                                <Plus size={16} className="ml-auto text-blue-300 group-hover:text-blue-600"/>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="relative">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">Buscar na Base RH (Geral)</label>
               <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24}/>
                  <input 
                    type="text" 
                    placeholder="Pesquisar por Nome ou Matrícula..." 
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); if (selectedCollabFromRH) setSelectedCollabFromRH(null); }}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-600/5 transition-all text-lg shadow-sm"
                  />
               </div>

               {searchTerm.length > 1 && !selectedCollabFromRH && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[140] max-h-48 overflow-y-auto custom-scrollbar">
                    {searchResults.length > 0 ? (
                        searchResults.map(res => (
                          <button key={res.employee_id} type="button" onClick={() => selectCollab(res)} className="w-full p-5 text-left hover:bg-blue-50 flex items-center gap-4 border-b border-slate-100 last:border-0 group">
                             <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600">{res.full_name.charAt(0)}</div>
                             <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm">{res.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{res.sector_name} • Matrícula: {res.employee_id}</p>
                             </div>
                             <Plus size={16} className="text-slate-300 group-hover:text-blue-500"/>
                          </button>
                        ))
                    ) : (
                        <div className="p-5 text-center">
                            <p className="text-sm font-bold text-slate-500">Nenhum colaborador encontrado.</p>
                            <p className="text-[10px] text-slate-400 mt-1">Verifique se o nome está correto ou se a pessoa está na Base RH (Importação).</p>
                        </div>
                    )}
                 </div>
               )}
            </div>

            {selectedCollabFromRH ? (
              <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-6 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-6">
                   <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-50 text-3xl font-black">
                      {selectedCollabFromRH.full_name.charAt(0)}
                   </div>
                   <div className="flex-1">
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Colaborador Selecionado</p>
                     <p className="text-xl font-black text-slate-800 leading-tight mb-2">{selectedCollabFromRH.full_name}</p>
                     <div className="flex gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><ScanText size={14}/> {selectedCollabFromRH.employee_id}</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Building2 size={14}/> {selectedCollabFromRH.sector_name}</span>
                     </div>
                   </div>
                   <button onClick={() => {setSelectedCollabFromRH(null); setSearchTerm('');}} className="p-2 bg-white rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"><X size={16}/></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">PG de Destino</label>
                    {canEditPG ? (
                      <select required value={selectedPG} onChange={e => setSelectedPG(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-600/5 transition-all">
                        <option value="">Escolha o PG...</option>
                        {pgs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    ) : (
                      <div className="px-5 py-4 bg-white border border-slate-100 rounded-xl font-bold text-slate-700 shadow-sm flex items-center gap-2">
                         <Users size={18} className="text-blue-500"/>
                        {selectedPG || 'PG não vinculado (Contate Admin)'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Motivo Admissão</label>
                    <select required value={motivo} onChange={e => setMotivo(e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-600/5 transition-all">
                      <option value="">Selecione o motivo...</option>
                      {MOTIVOS_ADMISSAO.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {isCrossSector && (
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 space-y-3 animate-in fade-in">
                        <div className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle size={18} />
                            <p className="text-xs font-black uppercase">Setor Diferente Detectado</p>
                        </div>
                        <p className="text-xs text-orange-800 font-medium leading-relaxed">
                            Este colaborador pertence ao setor <b>{selectedCollabFromRH.sector_name}</b>, que é diferente do seu. 
                            A inclusão ficará <b>Pendente de Aprovação</b> da Capelania/Gestão.
                        </p>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-orange-600 uppercase px-1 tracking-widest">Justificativa Obrigatória</label>
                            <textarea 
                                required
                                value={crossSectorJustification}
                                onChange={e => setCrossSectorJustification(e.target.value)}
                                placeholder="Por que este colaborador participará do seu PG e não do PG do setor dele?"
                                className="w-full h-24 p-4 bg-white border border-orange-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-orange-500/10 resize-none text-slate-700"
                            />
                        </div>
                    </div>
                )}
              </div>
            ) : (
              <div className="p-10 bg-slate-50 border border-slate-200 border-dashed rounded-[2.5rem] text-center">
                 <Info className="mx-auto text-slate-300 mb-4" size={40}/>
                 <p className="text-slate-400 font-bold italic text-sm">Pesquise por nome, matrícula ou use as sugestões acima.</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={!selectedCollabFromRH || !selectedPG || !motivo || (isCrossSector && !crossSectorJustification)} 
              className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-700 disabled:opacity-50 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              {isCrossSector ? 'Solicitar Aprovação de Vínculo' : 'Confirmar Vínculo ao PG'}
            </button>
         </form>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  );
};

export default LinkMemberModal;
