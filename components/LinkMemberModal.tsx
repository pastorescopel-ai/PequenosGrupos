
import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Building2, AlertTriangle, Users, CheckCircle2, ArrowRight, Info, AlertCircle, UserPlus } from 'lucide-react';
import { Leader, Collaborator, PG } from '../types';
import { MOTIVOS_ADMISSAO } from '../constants';

interface LinkMemberModalProps {
  user: Leader;
  allCollaborators: Collaborator[];
  pgs: PG[];
  existingMembers: Collaborator[];
  onClose: () => void;
  onConfirm: (collab: Collaborator, pgName: string, reason: string, crossSectorJustification?: string, autoSeen?: boolean) => void;
}

const LinkMemberModal: React.FC<LinkMemberModalProps> = ({ 
  user, allCollaborators, pgs, existingMembers, onClose, onConfirm 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Collaborator[]>([]);
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(null);
  
  const [isExternal, setIsExternal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalSector, setExternalSector] = useState('');

  const [motivo, setMotivo] = useState('');
  const [justification, setJustification] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizeStr = (s?: string) => s ? s.trim().toUpperCase() : '';

  const isSameSector = useMemo(() => {
    if (!selectedCollab || isExternal) return false;
    return normalizeStr(selectedCollab.sector_name) === normalizeStr(user.sector_name);
  }, [selectedCollab, user.sector_name, isExternal]);

  const requiresApproval = useMemo(() => {
    return isExternal || (selectedCollab && !isSameSector);
  }, [isExternal, selectedCollab, isSameSector]);

  useEffect(() => {
    if (selectedCollab || isExternal) return;
    setErrorMsg(null);

    const lower = searchTerm.toLowerCase();
    const existingIds = new Set(existingMembers.map(m => m.employee_id));
    
    const baseFilter = (c: Collaborator) => {
        const isSameHospital = c.hospital === user.hospital || (!c.hospital && user.hospital === 'Belém');
        const isNotTheLeader = c.employee_id !== user.employee_id;
        const notInPg = !existingIds.has(c.employee_id);
        return c.active && isNotTheLeader && isSameHospital && notInPg;
    };

    if (searchTerm.length === 0) {
        const suggestions = allCollaborators
            .filter(c => baseFilter(c) && normalizeStr(c.sector_name) === normalizeStr(user.sector_name))
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .slice(0, 10);
        setSearchResults(suggestions);
    } else if (searchTerm.length > 1) {
        const filtered = allCollaborators.filter(c => {
            const matchesSearch = (c.full_name || '').toLowerCase().includes(lower) || (c.employee_id || '').includes(searchTerm);
            return baseFilter(c) && matchesSearch;
        }).sort((a, b) => {
            const aSame = normalizeStr(a.sector_name) === normalizeStr(user.sector_name);
            const bSame = normalizeStr(b.sector_name) === normalizeStr(user.sector_name);
            if (aSame && !bSame) return -1;
            if (!aSame && bSame) return 1;
            return a.full_name.localeCompare(b.full_name);
        }).slice(0, 10);
        setSearchResults(filtered);
    } else {
        setSearchResults([]);
    }
  }, [searchTerm, selectedCollab, allCollaborators, user, existingMembers, isExternal]);

  useEffect(() => {
    if (selectedCollab && isSameSector) {
        setMotivo('Faz parte do setor');
    } else if (isExternal) {
        setMotivo('Prestador de Serviço');
    } else {
        setMotivo('');
    }
  }, [selectedCollab, isSameSector, isExternal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isExternal) {
      if (!externalName.trim() || !externalSector.trim() || !justification.trim()) {
        setErrorMsg("Para prestadores externos, o nome, setor e justificativa são obrigatórios.");
        return;
      }
      
      const externalCollab: Collaborator = {
        id: `EXT-${Date.now()}`,
        employee_id: `EXT-${Date.now()}`,
        full_name: externalName.toUpperCase(),
        sector_id: 'EXTERNO',
        sector_name: externalSector.toUpperCase(),
        active: true,
        hospital: user.hospital
      };
      
      onConfirm(externalCollab, user.pg_name || '', 'Prestador / Externo', justification, false);
    } else {
      if (!selectedCollab || !motivo) return;
      if (requiresApproval && justification.trim().length < 5) {
          setErrorMsg("Por favor, descreva o motivo do vínculo para aprovação da Capelania.");
          return;
      }
      // Se for mesmo setor (isSameSector), passa autoSeen: true para não gerar notificação de volta ao líder
      onConfirm(selectedCollab, user.pg_name || '', motivo, requiresApproval ? justification : undefined, isSameSector);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar text-left text-slate-800">
         <div className="flex justify-between items-center mb-8">
            <div>
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Users className="text-blue-600" /> Vincular ao PG
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-1">Unidade: <b>{user.hospital}</b> • Seu PG: <b>{user.pg_name}</b></p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={28}/></button>
         </div>

         <div className="mb-8 p-1 bg-slate-100 rounded-2xl flex">
            <button 
                type="button"
                onClick={() => { setIsExternal(false); setSelectedCollab(null); }}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isExternal ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
                Colaborador (RH)
            </button>
            <button 
                type="button"
                onClick={() => { setIsExternal(true); setSelectedCollab(null); }}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isExternal ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}
            >
                Prestador / Externo
            </button>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            {isExternal ? (
              <div className="animate-in slide-in-from-top-2 duration-300 space-y-5">
                <div className="bg-orange-50 border-2 border-orange-100 rounded-3xl p-6">
                    <div className="flex items-center gap-3 text-orange-700 mb-4">
                        <AlertTriangle size={20} />
                        <p className="font-black uppercase text-[11px]">Inclusão de Pessoa Externa</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block mb-1">Nome Completo</label>
                            <input 
                                type="text" value={externalName} onChange={e => setExternalName(e.target.value)}
                                className="w-full px-5 py-4 bg-white border border-orange-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10"
                                placeholder="Ex: João da Silva (Terceirizado)"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block mb-1">Setor ou Empresa</label>
                            <input 
                                type="text" value={externalSector} onChange={e => setExternalSector(e.target.value)}
                                className="w-full px-5 py-4 bg-white border border-orange-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10"
                                placeholder="Ex: Higienização / Manutenção"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2">
                        Justificativa de Vínculo <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                        required value={justification} onChange={e => setJustification(e.target.value)}
                        placeholder="Explique à Capelania por que esta pessoa externa participará deste PG..."
                        className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-600/5 transition-all resize-none"
                    />
                </div>
              </div>
            ) : !selectedCollab ? (
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2 block">
                    {searchTerm.length === 0 ? 'Sugestões do seu Setor' : 'Resultados da Pesquisa'}
                </label>
                <div className="relative mb-4">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24}/>
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome ou matrícula..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-blue-50 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-600/5 transition-all text-lg"
                    />
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    {searchResults.length > 0 ? (
                      searchResults.map(res => {
                        const same = normalizeStr(res.sector_name) === normalizeStr(user.sector_name);
                        return (
                          <button key={res.id} type="button" onClick={() => setSelectedCollab(res)} className="w-full p-5 text-left hover:bg-blue-50 flex items-center gap-4 border-b border-slate-50 last:border-0 group transition-colors">
                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${same ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{res.full_name.charAt(0)}</div>
                             <div className="flex-1">
                                <p className="font-black text-slate-800 text-sm">{res.full_name}</p>
                                <div className="flex items-center gap-2">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${same ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {res.sector_name}
                                    </p>
                                    {same && <span className="bg-blue-100 text-blue-700 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Seu Setor</span>}
                                </div>
                             </div>
                             <Plus size={18} className="text-slate-300 group-hover:text-blue-600"/>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-10 text-center text-slate-400 font-medium">
                        {searchTerm.length === 0 ? 'Nenhum colega do seu setor disponível para vínculo.' : 'Nenhum colaborador encontrado.'}
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-top-2 duration-500 space-y-6">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative">
                    <button type="button" onClick={() => { setSelectedCollab(null); setMotivo(''); setErrorMsg(null); }} className="absolute top-4 right-4 text-[10px] font-black text-blue-600 uppercase hover:underline">Trocar</button>
                    <div className="flex items-center gap-6 mb-6">
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm text-2xl font-black border border-blue-50">{selectedCollab.full_name.charAt(0)}</div>
                       <div>
                         <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Colaborador Selecionado</p>
                         <p className="text-xl font-black text-slate-800 leading-tight">{selectedCollab.full_name}</p>
                         <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                             <Building2 size={14}/> {selectedCollab.sector_name}
                         </p>
                       </div>
                    </div>

                    <div className="space-y-4">
                        {isSameSector ? (
                            <div className="bg-blue-600 text-white p-6 rounded-3xl flex items-center gap-4 shadow-lg shadow-blue-100">
                                <CheckCircle2 size={24} className="shrink-0" />
                                <div>
                                    <p className="font-black uppercase text-[11px] tracking-widest">Vínculo Direto</p>
                                    <p className="text-xs font-medium opacity-90">Colaborador do seu setor. Motivo: <b>{motivo}</b>.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Motivo da Admissão (Outro Setor)</label>
                                <select 
                                  required value={motivo} onChange={e => setMotivo(e.target.value)}
                                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                >
                                  <option value="">Selecione o motivo...</option>
                                  {MOTIVOS_ADMISSAO.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>

                                <div className="bg-orange-50 border-2 border-orange-100 rounded-3xl p-6 space-y-3">
                                    <div className="flex items-center gap-3 text-orange-700">
                                        <AlertTriangle size={20} />
                                        <div>
                                            <p className="font-black uppercase text-[11px]">Vínculo de Outro Setor</p>
                                            <p className="text-[10px] font-bold opacity-80">Explique para a Capelania por que este colaborador participará do seu PG.</p>
                                        </div>
                                    </div>
                                    <textarea 
                                        required value={justification} onChange={e => setJustification(e.target.value)}
                                        placeholder="Digite aqui sua justificativa..."
                                        className="w-full h-24 p-4 bg-white border border-orange-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
              </div>
            )}

            {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-100 animate-shake">
                    <AlertCircle size={18} />
                    <span className="text-xs font-bold">{errorMsg}</span>
                </div>
            )}

            {(selectedCollab || isExternal) && (
                <button 
                    type="submit" 
                    className={`w-full py-5 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${requiresApproval ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
                >
                    {requiresApproval ? 'Solicitar Vínculo' : 'Confirmar Vínculo'} <ArrowRight size={18}/>
                </button>
            )}
         </form>
      </div>
    </div>
  );
};

export default LinkMemberModal;
