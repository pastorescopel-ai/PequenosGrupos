
import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle2, AlertCircle, Star, Clock, AlertTriangle } from 'lucide-react';
import { Leader, Collaborator, PG, Sector, ChangeRequest } from '../../types';
import LinkMemberModal from '../modals/LinkMemberModal';
import CollaboratorDetailModal from '../modals/CollaboratorDetailModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface LeaderMemberViewProps {
  user: Leader;
  members: Collaborator[];
  allCollaborators: Collaborator[];
  pgs: PG[];
  leaders: Leader[];
  sectors: Sector[];
  onAddRequest: (req: ChangeRequest, pgName?: string) => void;
  adminForcedPG?: string;
  memberRequests?: ChangeRequest[];
  onRequestAction?: (id: string, status: 'approved' | 'rejected', request: ChangeRequest) => Promise<void>;
}

const LeaderMemberView: React.FC<LeaderMemberViewProps> = ({ 
  user, members, allCollaborators, pgs, leaders, sectors, onAddRequest, adminForcedPG, memberRequests = [], onRequestAction
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDetailCollab, setSelectedDetailCollab] = useState<Collaborator | null>(null);
  const [selectedPendingRequest, setSelectedPendingRequest] = useState<ChangeRequest | null>(null);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const targetPGName = adminForcedPG || user.pg_name;
  const isAdmin = user.role === 'ADMIN';

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
      target_pg_name: pgName || targetPGName, // Garante que o nome do PG seja gravado
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
        onAddRequest(request, pgName || targetPGName);
        setIsAdding(false);
        showFeedback('success', status === 'approved' ? 'Membro vinculado!' : 'Solicitação enviada para a Capelania.');
    } catch (e) {
        showFeedback('error', 'Erro ao processar vínculo.');
    }
  };

  const currentViewItems = useMemo(() => {
    const pgMembers = members.filter(m => (m as any).pg_name === targetPGName && m.active !== false);
    const pgLeader = leaders.find(l => l.pg_name === targetPGName && l.active);
    
    const pendingReqs = memberRequests.filter(r => 
        r.status === 'pending' && 
        r.type === 'add' &&
        (r.target_pg_name === targetPGName || leaders.find(l => l.id === r.leader_id)?.pg_name === targetPGName)
    );

    let finalList: any[] = [...pgMembers];
    
    pendingReqs.forEach(req => {
        if (!finalList.some(m => m.employee_id === req.collaborator_id)) {
            finalList.push({
                id: req.id,
                employee_id: req.collaborator_id,
                full_name: req.collaborator_name,
                sector_name: req.collaborator_sector,
                is_pending: true,
                request_data: req
            });
        }
    });

    if (pgLeader && !finalList.some(m => m.employee_id === pgLeader.employee_id)) {
        finalList = [{ 
            id: `leader-${pgLeader.id}`, 
            full_name: pgLeader.full_name, 
            employee_id: pgLeader.employee_id, 
            sector_name: pgLeader.sector_name || 'Liderança Ministerial', 
            active: true, 
            hospital: pgLeader.hospital, 
            pg_name: pgLeader.pg_name,
            is_leader: true,
            leader_official_sector: pgLeader.sector_name
        }, ...finalList];
    }
    return finalList;
  }, [members, leaders, targetPGName, memberRequests]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
         <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight flex flex-wrap gap-3 items-center">
                Participantes do <span className="text-blue-600 bg-blue-50 px-4 py-1 rounded-2xl border border-blue-100 shadow-sm">{targetPGName}</span>
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

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm min-h-[400px]">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentViewItems.map(m => {
                const isLeaderCard = m.is_leader;
                const isPending = m.is_pending;
                const pgLeader = leaders.find(l => l.pg_name === targetPGName && l.active);
                const isDivergent = !isLeaderCard && !isPending && pgLeader && m.sector_name !== pgLeader.sector_name;
                const isExternal = !isLeaderCard && m.employee_id?.startsWith('EXT-');

                return (
                  <div key={m.id} 
                    onClick={() => {
                        if(isPending) {
                            setSelectedPendingRequest(m.request_data);
                        } else if(!isLeaderCard) {
                            setSelectedDetailCollab(m);
                        }
                    }} 
                    className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer group relative overflow-hidden ${
                      isLeaderCard ? 'bg-blue-600 border-blue-600 shadow-xl scale-[1.02] z-10' : 
                      isPending ? 'bg-orange-50 border-orange-200 hover:border-orange-400 ring-4 ring-orange-500/5' : 
                      isDivergent ? 'border-amber-200 bg-amber-50/30 hover:bg-white hover:border-amber-500' :
                      'border-slate-50 bg-slate-50/40 hover:bg-white hover:border-blue-500 hover:shadow-lg'
                    }`}
                  >
                    {isLeaderCard && <div className="absolute -right-4 -bottom-4 opacity-10 text-white"><Star size={100} fill="currentColor" /></div>}
                    
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border ${
                        isLeaderCard ? 'bg-white text-blue-600 border-transparent' : 
                        isPending ? 'bg-orange-100 text-orange-600 border-orange-200' :
                        isDivergent ? 'bg-amber-100 text-amber-600 border-amber-200' :
                        'bg-white text-blue-600 border-slate-100'
                      }`}>
                        {m.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black truncate ${isLeaderCard ? 'text-white' : 'text-slate-800'}`}>{m.full_name}</p>
                        <div className="flex items-center gap-2">
                            <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${isLeaderCard ? 'text-blue-100' : isPending ? 'text-orange-600' : isDivergent ? 'text-amber-600' : 'text-slate-400'}`}>
                                {isPending ? 'Aguardando Aprovação' : m.sector_name}
                            </p>
                            {isPending && <Clock size={12} className="text-orange-400 animate-pulse" />}
                            {isDivergent && <AlertTriangle size={12} className="text-amber-500" title="Setor Divergente do RH" />}
                            {isExternal && <span className="bg-orange-100 text-orange-700 text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase">Externo</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>
      </div>

      {isAdding && (
        <LinkMemberModal user={user} allCollaborators={allCollaborators} pgs={pgs} existingMembers={currentViewItems} onClose={() => setIsAdding(false)} onConfirm={handleLinkConfirm} />
      )}
      
      {(selectedDetailCollab || selectedPendingRequest) && (
        <CollaboratorDetailModal 
            collaborator={selectedDetailCollab || {
                id: selectedPendingRequest!.collaborator_id,
                employee_id: selectedPendingRequest!.collaborator_id,
                full_name: selectedPendingRequest!.collaborator_name!,
                sector_name: selectedPendingRequest!.collaborator_sector!,
                active: true, hospital: user.hospital, sector_id: ''
            }} 
            reasons={[]} 
            onClose={() => { setSelectedDetailCollab(null); setSelectedPendingRequest(null); }} 
            onRequestAction={() => {}} 
            isAdmin={isAdmin} 
            sectors={sectors}
            pendingRequest={selectedPendingRequest}
            onUpdate={async (data) => {
               if(selectedDetailCollab) {
                 await updateDoc(doc(db, "members", selectedDetailCollab.employee_id), data);
                 setSelectedDetailCollab(null);
                 showFeedback('success', 'Cadastro atualizado.');
               }
            }}
            onDecision={async (status) => {
                if(selectedPendingRequest && onRequestAction) {
                    await onRequestAction(selectedPendingRequest.id, status, selectedPendingRequest);
                    setSelectedPendingRequest(null);
                    showFeedback('success', status === 'approved' ? 'Vínculo aprovado!' : 'Solicitação recusada.');
                }
            }}
        />
      )}
    </div>
  );
};

export default LeaderMemberView;
