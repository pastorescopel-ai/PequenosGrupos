
import React, { useState } from 'react';
import { Search, UserPlus, Filter, RefreshCw, Plus } from 'lucide-react';
import { Leader, PG, ChangeRequest, Collaborator, Sector, PGMeetingPhoto } from '../types';
import LeaderCard from './LeaderCard';
import AddLeaderModal from './AddLeaderModal';
import LeaderDetailModal from './LeaderDetailModal';
import { doc, updateDoc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import ConfirmModal from './ConfirmModal';

interface AdminManagementProps {
  pgs: PG[];
  leaders: Leader[];
  setLeaders: React.Dispatch<React.SetStateAction<Leader[]>>;
  memberRequests: ChangeRequest[];
  onRequestAction: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  photos: PGMeetingPhoto[];
  allCollaborators: Collaborator[];
  sectors: Sector[];
}

const AdminManagement: React.FC<AdminManagementProps> = ({ 
  pgs, leaders, setLeaders, memberRequests, onRequestAction, photos, allCollaborators, sectors 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null);
  const [leaderToDelete, setLeaderToDelete] = useState<Leader | null>(null);

  const displayedLeaders = leaders.filter(l => 
    l.role !== 'ADMIN' && // Exclude admins from general leader list
    ((l.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
     (l.employee_id || '').includes(searchTerm))
  );

  const sortedLeaders = [...displayedLeaders].sort((a, b) => {
    const nameA = a.full_name || '';
    const nameB = b.full_name || '';
    
    if (showInactive) {
       if (a.active === b.active) return nameA.localeCompare(nameB);
       return a.active ? -1 : 1;
    }
    return nameA.localeCompare(nameB);
  });

  const handleAddLeader = async (data: any) => {
      try {
          const newLeaderRef = doc(collection(db, 'leaders'));
          // Simple ID generation for external or using employee_id for internal
          const docId = data.isExternal ? newLeaderRef.id : data.matricula; 
          const finalRef = doc(db, 'leaders', docId);

          const newLeader = {
              id: docId,
              full_name: data.name,
              employee_id: data.isExternal ? 'EXT-' + Date.now() : data.matricula,
              email: data.email.toLowerCase(),
              whatsapp: data.whatsapp,
              hospital: data.hospital,
              pg_name: data.pgId ? pgs.find(p => p.id === data.pgId)?.name : '',
              sector_name: data.sector,
              role: 'LIDER',
              status: 'approved',
              active: true,
              needs_password_change: true,
              is_admin: false
          };
          await setDoc(finalRef, newLeader);
          alert("Líder cadastrado com sucesso!");
          setIsAdding(false);
      } catch (e) {
          console.error(e);
          alert("Erro ao cadastrar.");
      }
  };

  const handleUpdateLeader = async (data: Partial<Leader>) => {
      if (!editingLeader) return;
      try {
          await updateDoc(doc(db, 'leaders', editingLeader.id), data);
          setEditingLeader(null);
      } catch (e) {
          console.error(e);
          alert("Erro ao atualizar.");
      }
  };

  const handleInactivate = async (reason: string) => {
      if (!leaderToDelete) return;
      try {
          await updateDoc(doc(db, 'leaders', leaderToDelete.id), { active: false });
          setLeaderToDelete(null);
      } catch (e) {
          console.error(e);
      }
  };

  const handleSendInvite = async (e: React.MouseEvent, email: string) => {
      e.stopPropagation();
      if (!auth) return;
      try {
          await auth.sendPasswordResetEmail(email);
          alert(`Convite enviado para ${email}`);
      } catch (e: any) {
          alert("Erro: " + e.message);
      }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
        <header className="flex justify-between items-center">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestão de Líderes</h2>
                <p className="text-slate-500 font-medium mt-1">Controle de cadastro e acesso dos líderes de PG.</p>
            </div>
            <button 
                onClick={() => setIsAdding(true)}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl active:scale-95"
            >
                <Plus size={20}/> Novo Líder
            </button>
        </header>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-2xl">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou matrícula..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent w-full pl-12 py-2 font-bold text-slate-700 outline-none placeholder:text-slate-400"
                    />
                </div>
                <div className="w-px bg-slate-200 hidden md:block"></div>
                <button 
                    onClick={() => setShowInactive(!showInactive)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showInactive ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Filter size={16}/> {showInactive ? 'Ocultar Inativos' : 'Ver Inativos'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedLeaders.filter(l => showInactive ? true : l.active).map(leader => (
                    <LeaderCard 
                        key={leader.id} 
                        leader={leader} 
                        onSelect={() => setEditingLeader(leader)}
                        onDelete={(e) => { e.stopPropagation(); setLeaderToDelete(leader); }}
                        onSendInvite={(e) => handleSendInvite(e, leader.email || '')}
                    />
                ))}
            </div>
        </div>

        {isAdding && (
            <AddLeaderModal 
                onClose={() => setIsAdding(false)} 
                onSave={handleAddLeader} 
                allCollaborators={allCollaborators} 
                pgs={pgs} 
                leaders={leaders}
                sectors={sectors}
            />
        )}

        {editingLeader && (
            <LeaderDetailModal 
                leader={editingLeader}
                pgs={pgs}
                leaders={leaders}
                photos={photos}
                sectors={sectors}
                onClose={() => setEditingLeader(null)}
                onUpdate={handleUpdateLeader}
                onInactivate={async (reason) => {
                    await updateDoc(doc(db, 'leaders', editingLeader.id), { active: false });
                    setEditingLeader(null);
                }}
                onResetPassword={(pass) => {
                    if(editingLeader.email) handleSendInvite({stopPropagation:()=>{}} as any, editingLeader.email);
                }}
            />
        )}

        {leaderToDelete && (
            <ConfirmModal 
                title="Inativar Líder?" 
                description={<>O líder <b>{leaderToDelete.full_name}</b> perderá acesso ao sistema, mas o histórico será mantido.</>} 
                onConfirm={() => handleInactivate('Outros')} 
                onCancel={() => setLeaderToDelete(null)} 
                confirmText="Inativar Acesso"
                variant="danger"
            />
        )}
    </div>
  );
}

export default AdminManagement;
