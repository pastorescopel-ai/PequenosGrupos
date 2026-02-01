
import React, { useState, useMemo } from 'react';
import { Plus, User, History, ShieldCheck } from 'lucide-react';
import { Leader, ChangeRequest, Collaborator, PG } from '../types';
import CollaboratorDetailModal from './CollaboratorDetailModal';
import LinkMemberModal from './LinkMemberModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ActionTooltip from './ActionTooltip';

interface MemberManagementProps {
  user: Leader;
  onAddRequest: (req: ChangeRequest, pgName?: string) => void;
  memberRequests: ChangeRequest[];
  members: Collaborator[];
  setMembers: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  allCollaborators: Collaborator[];
  pgs: PG[];
}

const MemberManagement: React.FC<MemberManagementProps> = ({ user, onAddRequest, memberRequests, members, setMembers, allCollaborators, pgs }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDetailCollab, setSelectedDetailCollab] = useState<Collaborator | null>(null);

  const handleLinkConfirm = (collab: Collaborator, pgName: string, reason: string, crossSectorJustification?: string) => {
    const isPending = !!crossSectorJustification && user.role !== 'ADMIN';
    const finalReason = crossSectorJustification 
        ? `${reason} | Obs: ${crossSectorJustification}` 
        : reason;

    if (!isPending) {
        const newMember = {
          ...collab,
          pg_name: pgName,
          active: true,
          join_date: new Date().toLocaleDateString()
        };
        setMembers(prev => [newMember as any, ...prev.filter(m => m.employee_id !== collab.employee_id)]);
        alert(`Membro adicionado com sucesso ao PG: ${pgName}!`);
    } else {
        alert("Solicitação enviada! Como o membro é de outro setor, a Capelania analisará o pedido.");
    }
    
    onAddRequest({
      id: `REQ-${Date.now()}`,
      leader_id: user.id,
      leader_name: user.full_name,
      collaborator_id: collab.employee_id,
      collaborator_name: collab.full_name,
      collaborator_sector: collab.sector_name,
      type: 'add',
      reason_category: finalReason,
      status: isPending ? 'pending' : 'approved',
      created_at: new Date().toISOString()
    }, pgName);

    setIsAdding(false);
  };

  const handleAdminUpdate = async (updatedData: Partial<Collaborator>) => {
    if (!selectedDetailCollab) return;
    setMembers(prev => prev.map(m => m.id === selectedDetailCollab.id ? { ...m, ...updatedData } : m));
    if (db) {
       try {
          const docId = selectedDetailCollab.employee_id || selectedDetailCollab.id; 
          await updateDoc(doc(db, "members", docId), updatedData);
          await updateDoc(doc(db, "collaborators", docId), updatedData).catch(() => console.log("Erro base RH"));
          alert("Dados atualizados com sucesso!");
       } catch (e) {
          console.error("Erro ao atualizar no banco:", e);
          alert("Erro ao salvar no banco de dados.");
       }
    }
  };

  // Consolidação da lista: Membros + Líder (se não estiver na lista)
  const currentViewMembers = useMemo(() => {
    const baseMembers = (user.role === 'ADMIN' ? members : members.filter(m => (m as any).pg_name === user.pg_name))
      .filter(m => m.active !== false && m.employee_id !== user.employee_id);

    // Se não for admin, adiciona o líder no topo
    if (user.role === 'LIDER') {
      const leaderAsCollab: Collaborator = {
        id: `leader-${user.id}`,
        full_name: user.full_name,
        employee_id: user.employee_id,
        sector_id: user.sector_id || '',
        sector_name: user.sector_name || '',
        active: true,
        hospital: user.hospital,
        pg_name: user.pg_name
      };
      return [leaderAsCollab, ...baseMembers];
    }
    
    return baseMembers;
  }, [members, user]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-left">
      <header className="flex justify-between items-end">
         <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Gestão de Membros</h2>
            <p className="text-slate-500 font-medium">Administre os integrantes vinculados à sua gestão virtual.</p>
         </div>
         <button 
           onClick={() => setIsAdding(true)}
           className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-blue-700 shadow-xl transition-all active:scale-95 animate-bounce"
         >
           <Plus size={20} /> Vincular Membro
         </button>
      </header>

      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm min-h-[500px]">
         {currentViewMembers.length === 0 ? (
           <div className="py-20 text-center opacity-40">
              <User size={64} className="mx-auto mb-4"/>
              <p className="font-bold italic">Nenhum membro ativo vinculado neste PG.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentViewMembers.map(m => {
                const isTheLeader = m.employee_id === user.employee_id;
                return (
                  <div 
                    key={m.id} 
                    onClick={() => !isTheLeader && setSelectedDetailCollab(m)}
                    className={`p-8 rounded-[2.5rem] border transition-all relative overflow-hidden ${
                      isTheLeader 
                        ? 'bg-blue-900 border-blue-800 shadow-xl' 
                        : 'bg-slate-50 border-slate-100 hover:border-blue-600 cursor-pointer group'
                    }`}
                  >
                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm transition-all ${
                        isTheLeader ? 'bg-white text-blue-900' : 'bg-white text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        {m.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <p className={`font-black text-lg tracking-tight truncate ${isTheLeader ? 'text-white' : 'text-slate-800'}`}>{m.full_name}</p>
                           {isTheLeader && <ActionTooltip content="Você é o Líder deste PG"><ShieldCheck size={16} className="text-blue-300" /></ActionTooltip>}
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isTheLeader ? 'text-blue-300' : 'text-slate-400'}`}>ID: {m.employee_id}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-[9px] font-bold uppercase px-3 py-1 rounded-lg ${
                            isTheLeader ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'
                          }`}>{m.sector_name}</span>
                          {isTheLeader && <span className="text-[9px] font-black uppercase px-3 py-1 bg-green-500 text-white rounded-lg">Líder</span>}
                        </div>
                      </div>
                    </div>
                    {(m as any).join_date && !isTheLeader && (
                      <div className="absolute top-4 right-4 text-slate-200 group-hover:text-blue-100 transition-colors">
                          <History size={16} />
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
         )}
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
          isAdmin={user.role === 'ADMIN'}
          onUpdate={handleAdminUpdate}
        />
      )}
    </div>
  );
};

export default MemberManagement;
