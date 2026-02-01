
import React, { useState } from 'react';
import { 
  Plus, 
  Users,
  ShieldAlert,
  ArrowLeft,
  Eye,
  EyeOff,
  BellRing,
  Check,
  X,
  MessageSquare,
  AlertTriangle,
  Send,
  Key
} from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Leader, ChangeRequest, InactivationReason, PGMeetingPhoto, PG, Collaborator } from '../types';
import LeaderDashboard from './LeaderDashboard';
import AddLeaderModal from './AddLeaderModal';
import LeaderDetailModal from './LeaderDetailModal';
import ConfirmModal from './ConfirmModal';
import LeaderCard from './LeaderCard';

interface AdminManagementProps {
  leaders: Leader[];
  setLeaders: React.Dispatch<React.SetStateAction<Leader[]>>;
  memberRequests: ChangeRequest[];
  onRequestAction: (id: string, status: 'approved' | 'rejected') => void;
  photos: PGMeetingPhoto[];
  pgs: PG[];
  allCollaborators: Collaborator[];
}

const AdminManagement: React.FC<AdminManagementProps> = ({ leaders, setLeaders, memberRequests, onRequestAction, photos, pgs, allCollaborators }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [managingLeader, setManagingLeader] = useState<Leader | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<Leader | null>(null);
  const [leaderToDelete, setLeaderToDelete] = useState<{id: string, name: string} | null>(null);
  const [leaderToResetPass, setLeaderToResetPass] = useState<{email: string, name: string} | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  const [rejectionTarget, setRejectionTarget] = useState<ChangeRequest | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  const displayedLeaders = leaders.filter(l => showInactive ? true : l.active);
  const pendingRequests = memberRequests.filter(req => req.status === 'pending');

  const sortedLeaders = [...displayedLeaders].sort((a, b) => {
    if (showInactive) {
       if (a.active === b.active) return a.full_name.localeCompare(b.full_name);
       return a.active ? -1 : 1;
    }
    return a.full_name.localeCompare(b.full_name);
  });

  const handleApproveRequest = async (req: ChangeRequest) => {
    setProcessingReqId(req.id);
    try {
        await updateDoc(doc(db, "change_requests", req.id), { status: 'approved' });
        if (req.type === 'add') {
            const targetLeader = leaders.find(l => l.id === req.leader_id);
            let pgName = targetLeader?.pg_name || `PG do Líder ${req.leader_name}`; 

            await setDoc(doc(db, "members", req.collaborator_id), {
                id: req.collaborator_id,
                employee_id: req.collaborator_id,
                full_name: req.collaborator_name,
                sector_name: req.collaborator_sector,
                pg_name: pgName,
                active: true,
                join_date: new Date().toLocaleDateString()
            });
        }
    } catch (e) {
        console.error("Erro ao aprovar:", e);
    } finally {
        setProcessingReqId(null);
    }
  };

  const handleOpenRejectModal = (req: ChangeRequest) => {
      setRejectionTarget(req);
      setRejectionReasonText("");
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!rejectionTarget) return;
      setProcessingReqId(rejectionTarget.id);
      try {
          await updateDoc(doc(db, "change_requests", rejectionTarget.id), { 
              status: 'rejected',
              admin_notes: rejectionReasonText 
          });
          setRejectionTarget(null);
      } catch (e) {
          console.error(e);
      } finally {
          setProcessingReqId(null);
      }
  };

  const handleCreateLeader = async (data: any) => {
    try {
      const emailFormatted = data.email.toLowerCase().trim();
      const selectedPG = pgs.find(p => p.id === data.pgId);
      const pgName = selectedPG ? selectedPG.name : '';

      const newL: Omit<Leader, 'id'> = {
        full_name: data.name,
        employee_id: data.isExternal ? 'EXTERNO' : data.matricula,
        hospital: data.hospital,
        is_admin: false,
        role: 'LIDER',
        status: 'approved',
        sector_name: data.sector,
        pg_name: pgName,
        email: emailFormatted,
        whatsapp: data.whatsapp,
        active: true,
        needs_password_change: true 
      };
      
      await addDoc(collection(db, "leaders"), newL);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLeader = async (data: Partial<Leader>) => {
    if (!selectedLeader) return;
    try {
      await updateDoc(doc(db, "leaders", selectedLeader.id), data);
    } catch (error) {
      console.error(error);
    }
    setSelectedLeader(null);
  };

  const handleInactivateLeader = async (reason: InactivationReason) => {
    if (!selectedLeader) return;
    try {
        await updateDoc(doc(db, "leaders", selectedLeader.id), { active: false });
    } catch (e) {
        console.error(e);
    }
    setSelectedLeader(null);
  };

  const confirmDelete = async () => {
    if (!leaderToDelete) return;
    try {
      await deleteDoc(doc(db, "leaders", leaderToDelete.id));
      setLeaderToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetPassword = (tempPass: string) => {
    if (!selectedLeader || !selectedLeader.email) return;
    setLeaderToResetPass({ email: selectedLeader.email, name: selectedLeader.full_name });
  };

  const confirmResetPassword = async () => {
    if (!leaderToResetPass || !auth) return;
    try {
      await auth.sendPasswordResetEmail(leaderToResetPass.email);
      setLeaderToResetPass(null);
      alert(`Link de redefinição enviado com sucesso para ${leaderToResetPass.email}`);
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleSendInvite = (e: React.MouseEvent, leader: Leader) => {
    e.stopPropagation();
    const origin = window.location.origin;
    const inviteLink = `${origin}?mode=register&email=${encodeURIComponent(leader.email || '')}`;
    const message = `Olá *${leader.full_name.split(' ')[0]}*, \n\nVocê foi cadastrado como Líder de PG no sistema do Hospital Adventista.\n\nPara acessar, clique no link abaixo e crie sua senha pessoal:\n\n🔗 ${inviteLink}\n\nSeu e-mail de acesso é: *${leader.email}*`;

    if (leader.whatsapp) {
      const waLink = `https://wa.me/55${leader.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(waLink, '_blank');
    }
  };

  if (managingLeader) {
    return (
      <div className="space-y-6">
        <button onClick={() => setManagingLeader(null)} className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-blue-600 mb-4 transition-colors">
          <ArrowLeft size={16} /> Voltar ao Cadastro
        </button>
        <div className="bg-blue-950 p-8 rounded-[2.5rem] border border-blue-900 flex items-center justify-between mb-8 shadow-2xl">
          <div className="text-white">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
               <ShieldAlert className="text-blue-400"/> Gerindo PG de: {managingLeader.full_name}
            </h2>
            <p className="text-blue-300 text-sm font-medium">Sessão administrativa ativada.</p>
          </div>
          <button onClick={() => setManagingLeader(null)} className="bg-blue-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Encerrar Gestão</button>
        </div>
        {/* Added cast to Collaborator[] for empty members array to fix type mismatch */}
        <LeaderDashboard user={managingLeader} memberRequests={memberRequests} photos={photos} onUpdateSchedule={() => {}} members={[] as Collaborator[]} />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500 relative">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Cadastro de Líderes</h2>
          <p className="text-slate-500 font-medium">Gestão de acessos e pré-cadastros.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} /> Novo Líder
        </button>
      </header>

      {pendingRequests.length > 0 && (
          <div className="bg-orange-50 border border-orange-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3 text-orange-800">
                  <div className="p-3 bg-white rounded-xl shadow-sm"><BellRing size={20}/></div>
                  <div>
                      <h3 className="text-lg font-black tracking-tight">Solicitações Pendentes</h3>
                      <p className="text-xs font-medium opacity-80">Membros de outros setores aguardando aprovação.</p>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map(req => (
                      <div key={req.id} className="bg-white p-5 rounded-3xl border border-orange-100 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start">
                              <div>
                                  <p className="font-black text-slate-800 text-sm">{req.collaborator_name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.collaborator_sector}</p>
                              </div>
                              <div className="bg-blue-50 px-3 py-1 rounded-lg">
                                  <p className="text-[9px] font-black text-blue-600 uppercase">Para: {req.leader_name}</p>
                              </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-2 items-start">
                              <MessageSquare size={14} className="text-slate-400 mt-0.5 shrink-0"/>
                              <p className="text-xs text-slate-600 italic leading-relaxed">"{req.reason_category}"</p>
                          </div>
                          <div className="flex gap-2 pt-2">
                              <button onClick={() => handleOpenRejectModal(req)} disabled={processingReqId === req.id} className="flex-1 py-3 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                  <X size={14}/> Recusar
                              </button>
                              <button onClick={() => handleApproveRequest(req)} disabled={processingReqId === req.id} className="flex-1 py-3 bg-green-600 text-white hover:bg-green-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100">
                                  {processingReqId === req.id ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <><Check size={14}/> Aprovar</>}
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      <div className="flex justify-end">
         <button 
           onClick={() => setShowInactive(!showInactive)}
           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${showInactive ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
         >
            {showInactive ? <EyeOff size={14}/> : <Eye size={14}/>}
            {showInactive ? 'Ocultar Inativos' : 'Ver Histórico / Inativos'}
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedLeaders.map(l => (
          <LeaderCard 
            key={l.id}
            leader={l}
            onSelect={() => setSelectedLeader(l)}
            onDelete={(e) => { e.stopPropagation(); setLeaderToDelete({ id: l.id, name: l.full_name }); }}
            onSendInvite={(e) => handleSendInvite(e, l)}
          />
        ))}
      </div>

      {rejectionTarget && (
          <div className="fixed inset-0 bg-red-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={24} /></div>
                          <div>
                              <h3 className="text-xl font-black text-slate-800 tracking-tight">Recusar Solicitação</h3>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">Membro: {rejectionTarget.collaborator_name}</p>
                          </div>
                      </div>
                      <button onClick={() => setRejectionTarget(null)} className="p-2 text-slate-300 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleConfirmReject} className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Motivo Original do Líder</p><p className="text-sm font-medium text-slate-700 italic">"{rejectionTarget.reason_category}"</p></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-red-600 uppercase tracking-widest px-1">Motivo da Recusa (Obrigatório)</label><textarea required value={rejectionReasonText} onChange={e => setRejectionReasonText(e.target.value)} placeholder="Explique por que esta solicitação está sendo negada..." className="w-full h-32 p-4 bg-white border-2 border-red-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-300 resize-none transition-all placeholder:font-medium placeholder:text-slate-400" /></div>
                      <div className="flex gap-3 pt-2"><button type="button" onClick={() => setRejectionTarget(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button><button type="submit" disabled={processingReqId === rejectionTarget.id} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-2">{processingReqId === rejectionTarget.id ? 'Processando...' : <><Send size={14}/> Confirmar Recusa</>}</button></div>
                  </form>
              </div>
          </div>
      )}

      {selectedLeader && (
        <LeaderDetailModal leader={selectedLeader} pgs={pgs} leaders={leaders} photos={photos} onClose={() => setSelectedLeader(null)} onUpdate={handleUpdateLeader} onInactivate={handleInactivateLeader} onResetPassword={handleResetPassword} />
      )}

      {showAddModal && (
        <AddLeaderModal onClose={() => setShowAddModal(false)} onSave={handleCreateLeader} allCollaborators={allCollaborators} pgs={pgs} leaders={leaders} />
      )}

      {leaderToDelete && (
        <ConfirmModal title="Excluir Cadastro?" description={<>Você está prestes a remover o líder <b>{leaderToDelete.name}</b>.</>} onConfirm={confirmDelete} onCancel={() => setLeaderToDelete(null)} confirmText="Excluir Definitivamente" />
      )}

      {leaderToResetPass && (
        <ConfirmModal 
          title="Redefinir Senha?" 
          description={<>Enviar e-mail oficial de redefinição de senha para <b>{leaderToResetPass.name}</b> ({leaderToResetPass.email})?</>} 
          onConfirm={confirmResetPassword} 
          onCancel={() => setLeaderToResetPass(null)} 
          confirmText="Enviar E-mail" 
          variant="success"
          icon={<Key size={36}/>}
        />
      )}
    </div>
  );
};

export default AdminManagement;
