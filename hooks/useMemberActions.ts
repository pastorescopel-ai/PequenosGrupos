
import { doc, updateDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChangeRequest, Leader, Collaborator } from '../types';

export const useMemberActions = (currentUser: Leader, leaders: Leader[]) => {
  
  const handleMemberRequestAction = async (id: string, status: 'approved' | 'rejected', req: ChangeRequest) => {
    try {
        // 1. Atualiza o status da solicitação
        await updateDoc(doc(db, "change_requests", id), { 
            status,
            seen_by_admin: true,
            seen_by_leader: false 
        });

        // 2. Se for aprovação de inclusão, cria o membro efetivo
        if (status === 'approved' && req.type === 'add') {
            const targetLeader = leaders.find(l => l.id === req.leader_id);
            const memberRef = doc(db, "members", req.collaborator_id);
            await setDoc(memberRef, {
                id: req.collaborator_id,
                employee_id: req.collaborator_id,
                full_name: req.collaborator_name,
                sector_name: req.collaborator_sector,
                pg_name: targetLeader?.pg_name || 'Geral',
                hospital: targetLeader?.hospital || currentUser.hospital,
                active: true,
                join_date: new Date().toLocaleDateString()
            });
        }
        
        // 3. Se for aprovação de remoção, inativa o membro
        if (status === 'approved' && req.type === 'remove') {
            const memberRef = doc(db, "members", req.collaborator_id);
            await updateDoc(memberRef, { active: false });
        }
        return { success: true };
    } catch (e) {
        console.error("Erro ao processar ação de membro:", e);
        throw e;
    }
  };

  const createAddRequest = async (req: ChangeRequest, targetPgName?: string) => {
    try {
        await setDoc(doc(collection(db, "change_requests"), req.id), req);
        
        // Se já vier aprovado (mesmo setor), efetiva imediatamente
        if(req.type === 'add' && req.status === 'approved') {
            const memberRef = doc(db, "members", req.collaborator_id);
            await setDoc(memberRef, {
                id: req.collaborator_id,
                employee_id: req.collaborator_id,
                full_name: req.collaborator_name,
                sector_name: req.collaborator_sector,
                pg_name: targetPgName || currentUser.pg_name,
                hospital: currentUser.hospital,
                active: true,
                join_date: new Date().toLocaleDateString()
            });
        }
        return { success: true };
    } catch (e) {
        console.error("Erro ao criar solicitação:", e);
        throw e;
    }
  };

  return {
    handleMemberRequestAction,
    createAddRequest
  };
};
