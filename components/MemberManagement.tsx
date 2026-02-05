
import React, { useState, useMemo } from 'react';
import { Plus, User, History, ShieldCheck, Users, ChevronLeft, Briefcase, MapPin, Search, AlertCircle, CheckCircle2, Star, Clock, Check, X, Info } from 'lucide-react';
import { Leader, ChangeRequest, Collaborator, PG, Sector } from '../types';
import CollaboratorDetailModal from './CollaboratorDetailModal';
import LinkMemberModal from './LinkMemberModal';
import { doc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MemberManagementProps {
  user: Leader;
  onAddRequest: (req: ChangeRequest, pgName?: string) => void;
  onRequestAction: (id: string, status: 'approved' | 'rejected', request: ChangeRequest) => Promise<void>;
  memberRequests: ChangeRequest[];
  members: Collaborator[];
  setMembers: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  allCollaborators: Collaborator[];
  pgs: PG[];
  leaders?: Leader[];
  sectors: Sector[];
}

const MemberManagement: React.FC<MemberManagementProps> = ({ 
  user, onAddRequest, onRequestAction, memberRequests, members, setMembers, allCollaborators, pgs, leaders = [], sectors
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDetailCollab, setSelectedDetailCollab] = useState<Collaborator | null>(null);
  const [pgSearch, setPgSearch] = useState('');
  const [adminSelectedPG, setAdminSelectedPG] = useState<PG | null>(null);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [viewingRequestReason, setViewingRequestReason] = useState<string | null>(null);

  const isAdmin = user.role === 'ADMIN';
  const currentPGName = isAdmin ? adminSelectedPG?.name : user.pg_name;

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({type, msg});
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleLinkConfirm = async (collab: Collaborator, pgName: string, reason: string, crossSectorJustification?: string, autoSeen?: boolean) => {
    const isExternal = collab.id.startsWith('EXT-');
    const status = (crossSectorJustification || isExternal) ? 'pending' : 'approved';
    
    const request: ChangeRequest = {
      id: `REQ-${Date.now()}-${collab.employee_id}`,
      leader_id: user.id,
      leader_name: user.full_name,
      collaborator_id: collab.employee_id,
      collaborator_name: collab.full_name,
      collaborator_sector: collab.sector_name,
      type: 'add',
      reason_category: reason,
      status: status,
      created_at: new Date().toISOString(),
      admin_notes: crossSectorJustification || (isExternal ? 'MEMBRO EXTERNO / PRESTADOR' : ''),
      seen_by_leader: autoSeen || false,
      seen_by_admin: false
    };

    try {
        onAddRequest(request, currentPGName || user.pg_name);
        setIsAdding(false);
        showFeedback('success', status === 'approved' ? 'Membro vinculado com sucesso!' : 'Solicitação enviada para aprovação da Capelania.');
    } catch (e) {
        showFeedback('error', 'Erro ao processar vínculo. Tente novamente.');
    }
  };

  const handleAdminUpdate = async (updatedData: Partial<Collaborator>) => {
    if (!selectedDetailCollab || !db) return;
    try {
        const docId = selectedDetailCollab.employee_id || selectedDetailCollab.id; 
        await updateDoc(doc(db, "members", docId), updatedData);
        setSelectedDetailCollab(null);
        showFeedback('success', 'Cadastro atualizado pelo administrador.');
    } catch (e) {
        showFeedback('error', 'Erro ao atualizar cadastro.');
    }
  };

  // Solicitações pendentes para este PG específico (apenas para Admin)
  const pendingRequestsForThisPG = useMemo(() => {
    if (!isAdmin || !currentPGName) return [];
    return memberRequests.filter(r => 
        r.status === 'pending' && 
        leaders.find(l => l.id === r.leader_id)?.pg_name === currentPGName
    );
  }, [isAdmin, currentPGName, memberRequests, leaders]);

  const currentViewMembers = useMemo(() => {
    if (isAdmin && !adminSelectedPG) return [];
    
    const pgMembers = members.filter(m => (m as any).pg_name === currentPGName && m.active !== false);
    const pgLeader = leaders.find(l => l.pg_name === currentPGName && l.active);
    
    let finalList = [...pgMembers];
    
    if (pgLeader && !finalList.some(m => m.employee_id === pgLeader.employee_id)) {
        finalList = [{ 
            id: `leader-${pgLeader.id}`, 
            full_name: pgLeader.full_name, 
            employee_id: pgLeader.employee_id, 
            sector_name: pgLeader.sector_name || 'Liderança Ministerial', 
            active: true, 
            hospital: pgLeader.hospital, 
            pg_name: pgLeader.pg_name,
            is_leader: true
        } as any, ...finalList];
    }
    return finalList;
  }, [members, adminSelectedPG, isAdmin, leaders, currentPGName]);

  const pgCardsData = useMemo(() => {
      if (!isAdmin) return [];
      
      const pgsWithStats = pgs.map(pg => {
          const pgLeader = leaders.find(l => l.pg_name === pg.name && l.active);
          const countMembers = members.filter(m => (m as any).pg_name === pg.name && m.active !== false).length;
          const pendingCount = memberRequests.filter(r => r.status === 'pending' && (leaders.find(l => l.id === r.leader_id)?.pg_name === pg.name)).length;
          
          return {
              ...pg,
              leaderName: pgLeader ? pgLeader.full_name : 'Sem Líder Definido',
              memberCount: countMembers + (pgLeader ? 1 : 0),
              pendingCount
          };
      });

      return pgsWithStats
        .filter(p => p.active && (!pgSearch || p.name.toLowerCase().includes(pgSearch.toLowerCase()) || p.leaderName.toLowerCase().includes(pgSearch.toLowerCase())))
        .sort((a, b) => {
            if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
            return a.name.localeCompare(b.name);
        });
  }, [pgs, leaders, members, memberRequests, isAdmin, pgSearch]);

  if (isAdmin && !adminSelectedPG) {
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Gestão Unificada</h2>
                    <p className="text-slate-500 font-medium">PGs com solicitações pendentes aparecem primeiro.</p>
                </div>
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20}/>
                    <input 
                        type="text" placeholder="Buscar PG ou Líder..." value={pgSearch} onChange={(e) => setPgSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl font-bold text-slate-800 outline-none focus:border-blue-600 shadow-sm"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-left">
                {pgCardsData.map(pg => (
                    <div 
                        key={pg.id} onClick={() => setAdminSelectedPG(pg)}
                        className={`bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden ${pg.pendingCount > 0 ? 'border-orange-400 ring-4 ring-orange-500/5' : 'border-slate-100'}`}
                    >
                        {pg.pendingCount > 0 && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-600 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase animate-pulse shadow-lg">
                                <AlertCircle size={10}/> {pg.pendingCount} Pendência
                            </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all mb-4 ${pg.pendingCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            {pg.name.charAt(0)}
                        </div>
                        <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{pg.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pg.leaderName}</p>
                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-xs font-black text-slate-500 flex items-center gap-2"><Users size={14} className="text-blue-400"/> {pg.memberCount} Participantes</span>
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                <ChevronLeft size={16} className="rotate-180 text-slate-300 group-hover:text-blue-600" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
         <div>
            {isAdmin && (
                <button onClick={() => setAdminSelectedPG(null)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest mb-4 transition-colors"><ChevronLeft size={14}/> Retornar à lista</button>
            )}
            <h2 className="text-4xl font-black text-slate-800 tracking-tight flex flex-wrap gap-3 items-center">
                Participantes do <span className="text-blue-600 bg-blue-50 px-4 py-1 rounded-2xl border border-blue-100 shadow-sm">{currentPGName}</span>
            </h2>
         </div>
         <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">
           <Plus size={20} /> Vincular Membro
         </button>
      </header>

      {feedback && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${feedback.type === 'success' ? 'bg-green-600 text-white shadow-green-100' : 'bg-red-600 text-white shadow-red-100'} shadow-lg`}>
              {feedback.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              <span className="text-sm font-black uppercase tracking-widest">{feedback.msg}</span>
          </div>
      )}

      {/* SEÇÃO DE SOLICITAÇÕES PENDENTES PARA ADMIN */}
      {isAdmin && pendingRequestsForThisPG.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-100 rounded-[3rem] p-8 space-y-6">
              <div className="flex items-center gap-3 text-orange-700 mb-2">
                  <Clock size={24} className="animate-pulse" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Solicitações Aguardando Aprovação</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                  {pendingRequestsForThisPG.map(req => (
                      <div key={req.id} className="bg-white border border-orange-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div 
                                className="flex items-center gap-4 cursor-pointer group"
                                onClick={() => setViewingRequestReason(viewingRequestReason === req.id ? null : req.id)}
                              >
                                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black">
                                      {req.collaborator_name?.charAt(0)}
                                  </div>
                                  <div>
                                      <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{req.collaborator_name}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          Setor RH: {req.collaborator_sector} • Motivo: <span className="text-orange-600">{req.reason_category}</span>
                                      </p>
                                  </div>
                                  <Info size={16} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                              </div>
                              
                              <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => onRequestAction(req.id, 'rejected', req)}
                                    className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
                                  >
                                      <X size={14}/> Recusar
                                  </button>
                                  <button 
                                    onClick={() => onRequestAction(req.id, 'approved', req)}
                                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center gap-2"
                                  >
                                      <Check size={14}/> Aprovar Vínculo
                                  </button>
                              </div>
                          </div>
                          
                          {viewingRequestReason === req.id && (
                              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Justificativa do Líder ({req.leader_name}):</p>
                                  <p className="text-xs font-medium text-slate-600 italic leading-relaxed">"{req.admin_notes || 'Sem justificativa detalhada.'}"</p>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm min-h-[400px]">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
              {currentViewMembers.map(m => {
                const isLeaderCard = (m as any).is_leader;
                return (
                  <div 
                    key={m.id} 
                    onClick={() => !isLeaderCard && setSelectedDetailCollab(m)} 
                    className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer group relative overflow-hidden ${
                      isLeaderCard 
                        ? 'bg-blue-600 border-blue-600 shadow-blue-100 shadow-xl scale-[1.02] z-10' 
                        : 'border-slate-50 bg-slate-50/40 hover:bg-white hover:border-blue-500 hover:shadow-lg'
                    }`}
                  >
                    {isLeaderCard && (
                        <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                            <Star size={100} fill="currentColor" />
                        </div>
                    )}
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border ${
                        isLeaderCard 
                            ? 'bg-white text-blue-600 border-transparent' 
                            : 'bg-white text-blue-600 border-slate-100 group-hover:border-blue-200'
                      }`}>
                        {m.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-black truncate ${isLeaderCard ? 'text-white' : 'text-slate-800 group-hover:text-blue-600 transition-colors'}`}>
                            {m.full_name}
                        </p>
                        <div className="flex items-center gap-2">
                            <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${isLeaderCard ? 'text-blue-100' : 'text-slate-400'}`}>
                                {m.sector_name}
                            </p>
                            {isLeaderCard && (
                                <span className="bg-white text-blue-700 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Liderança</span>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>
      </div>

      {isAdding && (
        <LinkMemberModal 
            user={user} 
            allCollaborators={allCollaborators} 
            pgs={pgs} 
            existingMembers={currentViewMembers} 
            onClose={() => setIsAdding(false)} 
            onConfirm={handleLinkConfirm} 
        />
      )}
      {selectedDetailCollab && (
        <CollaboratorDetailModal 
            collaborator={selectedDetailCollab} 
            reasons={[]} 
            onClose={() => setSelectedDetailCollab(null)} 
            onRequestAction={() => {}} 
            isAdmin={isAdmin} 
            onUpdate={handleAdminUpdate} 
            sectors={sectors}
        />
      )}
    </div>
  );
};

export default MemberManagement;
