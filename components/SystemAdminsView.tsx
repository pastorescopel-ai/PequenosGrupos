
import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Key, Search } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Leader, Collaborator, PG, Sector } from '../types';
import UserRegistrationModal from './UserRegistrationModal';
import ConfirmModal from './ConfirmModal';
import LeaderDetailModal from './LeaderDetailModal';

interface SystemAdminsViewProps {
  leaders: Leader[];
  allCollaborators: Collaborator[];
  pgs: PG[];
  sectors: Sector[];
  onUpdateUser: (data: Partial<Leader>) => Promise<void>;
}

const SystemAdminsView: React.FC<SystemAdminsViewProps> = ({ leaders, allCollaborators, pgs, sectors, onUpdateUser }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Leader | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<{id: string, name: string} | null>(null);
  const [adminToReset, setAdminToReset] = useState<{email: string, name: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtra apenas administradores
  const admins = leaders.filter(l => l.active && l.role === 'ADMIN' && (
      (l.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (l.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const handleCreateAdmin = async (data: any) => {
    try {
      const emailFormatted = data.email.toLowerCase().trim();
      const exists = leaders.some(l => l.email === emailFormatted || (l.employee_id === data.matricula && !data.isExternal));
      
      if(exists) {
          alert("Usuário já cadastrado (E-mail ou Matrícula em uso).");
          return;
      }

      const newAdmin: Omit<Leader, 'id'> = {
        full_name: data.name,
        employee_id: data.isExternal ? 'EXTERNO' : data.matricula,
        hospital: data.hospital,
        is_admin: true,
        role: 'ADMIN',
        status: 'approved',
        sector_name: data.sector,
        pg_name: 'Administração',
        email: emailFormatted,
        whatsapp: data.whatsapp,
        active: true,
        needs_password_change: true 
      };
      
      await addDoc(collection(db, "leaders"), newAdmin);
      alert("Administrador cadastrado com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao criar administrador.");
    }
  };

  const handleUpdateAdmin = async (data: Partial<Leader>) => {
      if (!editingAdmin) return;
      try {
          await updateDoc(doc(db, 'leaders', editingAdmin.id), data);
          setEditingAdmin(null);
      } catch (e) {
          console.error(e);
          alert("Erro ao atualizar administrador.");
      }
  };

  const handleRevokeAdmin = async () => {
      if (!adminToDelete) return;
      // Em vez de deletar, apenas remove o papel de admin e inativa (ou muda para LIDER se preferir, mas inativar é mais seguro)
      try {
          await updateDoc(doc(db, "leaders", adminToDelete.id), { active: false });
          setAdminToDelete(null);
      } catch(e) {
          console.error(e);
      }
  };

  const handleSendReset = async () => {
      if (!adminToReset || !auth) return;
      try {
          await auth.sendPasswordResetEmail(adminToReset.email);
          setAdminToReset(null);
          alert(`E-mail de redefinição enviado para ${adminToReset.name}`);
      } catch(e: any) {
          alert("Erro: " + e.message);
      }
  };

  // Wrapper para envio de convite (usado no modal de detalhes)
  const handleSendInviteWrapper = async (email: string) => {
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
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <ShieldCheck className="text-orange-600" /> Administradores do Sistema
          </h2>
          <p className="text-slate-500 font-medium mt-1">Gestão de acessos privilegiados e segurança.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 active:scale-95"
        >
          <Plus size={20} /> Novo Admin
        </button>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-2xl">
             <Search className="text-slate-400" size={20}/>
             <input 
                type="text" 
                placeholder="Buscar administrador..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent w-full font-bold text-slate-700 outline-none placeholder:text-slate-400"
             />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {admins.map(admin => (
                 <div 
                    key={admin.id} 
                    onClick={() => setEditingAdmin(admin)}
                    className="p-6 rounded-[2rem] border border-slate-100 bg-white hover:border-orange-200 hover:shadow-lg transition-all group relative cursor-pointer"
                 >
                     <div className="flex items-start justify-between mb-4">
                         <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-lg">
                             {admin.full_name.charAt(0)}
                         </div>
                         <div className="flex gap-1">
                             <button 
                                onClick={(e) => { e.stopPropagation(); setAdminToReset({email: admin.email!, name: admin.full_name}); }} 
                                className="p-2 text-slate-300 hover:text-blue-600 transition-colors" 
                                title="Redefinir Senha"
                             >
                                <Key size={18}/>
                             </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); setAdminToDelete({id: admin.id, name: admin.full_name}); }} 
                                className="p-2 text-slate-300 hover:text-red-600 transition-colors" 
                                title="Revogar Acesso"
                             >
                                <Trash2 size={18}/>
                             </button>
                         </div>
                     </div>
                     <div>
                         <p className="font-black text-slate-800 text-lg leading-tight mb-1">{admin.full_name}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{admin.email}</p>
                     </div>
                     <div className="mt-4 flex gap-2">
                         <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">{admin.hospital}</span>
                         <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-[9px] font-black uppercase">Admin Master</span>
                     </div>
                 </div>
             ))}
         </div>
      </div>

      {showAddModal && (
        <UserRegistrationModal 
            onClose={() => setShowAddModal(false)} 
            onSave={handleCreateAdmin} 
            allCollaborators={allCollaborators} 
            pgs={pgs} 
            sectors={sectors} 
            leaders={leaders}
            initialUnit="Belém"
            forcedRole="ADMIN"
        />
      )}

      {editingAdmin && (
        <LeaderDetailModal 
            leader={editingAdmin}
            pgs={pgs}
            leaders={leaders}
            photos={[]} // Admins geralmente não tem fotos de PG para gerenciar aqui, passamos vazio
            sectors={sectors}
            onClose={() => setEditingAdmin(null)}
            onUpdate={handleUpdateAdmin}
            onInactivate={async (reason) => {
                await updateDoc(doc(db, 'leaders', editingAdmin.id), { active: false });
                setEditingAdmin(null);
            }}
            onResetPassword={(pass) => {
                if(editingAdmin.email) handleSendInviteWrapper(editingAdmin.email);
            }}
        />
      )}

      {adminToDelete && (
        <ConfirmModal 
            title="Revogar Acesso?" 
            description={<>Tem certeza que deseja remover o acesso de administrador de <b>{adminToDelete.name}</b>?</>} 
            onConfirm={handleRevokeAdmin} 
            onCancel={() => setAdminToDelete(null)} 
            confirmText="Revogar Acesso"
            variant="danger"
        />
      )}

      {adminToReset && (
        <ConfirmModal 
            title="Redefinir Senha?" 
            description={<>Enviar e-mail de redefinição para <b>{adminToReset.name}</b>?</>} 
            onConfirm={handleSendReset} 
            onCancel={() => setAdminToReset(null)} 
            confirmText="Enviar E-mail"
            variant="warning"
            icon={<Key size={32}/>}
        />
      )}
    </div>
  );
};

export default SystemAdminsView;
