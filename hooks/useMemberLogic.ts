import { doc, updateDoc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChangeRequest, Leader } from '../types';

/**
 * @shield_v23_atomic_logic
 * Centraliza ações de membros com proteção contra falhas parciais de gravação.
 */
export const useMemberActions = (currentUser: Leader, leaders: Leader[]) => {
  
  const handleMemberRequestAction = async (id: string, status: 'approved' | 'rejected', req: ChangeRequest, refusalReason?: string) => {
    if (!db) return;
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    try {
        const requestRef = doc(db, "change_requests", id);
        const updateData: any = { 
            status,
            seen_by_admin: true,
            seen_by_leader: false,
            processed_at: now,
            processed_by: currentUser.full_name
        };

        if (status === 'rejected' && refusalReason) {
            updateData.refusal_reason = refusalReason;
        }

        // 1. Atualiza a solicitação no Batch
        batch.update(requestRef, updateData);

        if (status === 'approved') {
            const memberRef = doc(db, "members", req.collaborator_id);
            
            if (req.type === 'add') {
                const targetLeader = leaders.find(l => l.id === req.leader_id);
                const finalPgName = req.target_pg_name || targetLeader?.pg_name || 'Geral';

                // 2. Cria/Atualiza o membro no Batch (Atomicamente)
                batch.set(memberRef, {
                    id: req.collaborator_id,
                    employee_id: req.collaborator_id,
                    full_name: req.collaborator_name,
                    sector_name: req.collaborator_sector,
                    pg_name: finalPgName,
                    hospital: targetLeader?.hospital || currentUser.hospital,
                    active: true,
                    join_date: new Date().toLocaleDateString(),
                    last_transfer_at: now
                }, { merge: true });
            } else if (req.type === 'remove') {
                // 3. Inativa o membro no Batch
                batch.update(memberRef, { 
                    active: false,
                    removal_date: now,
                    removal_reason: req.reason_category
                });
            }
        }

        // EXECUÇÃO ATÔMICA: Se um falhar, nada é gravado.
        await batch.commit();
        return { success: true };
    } catch (e) {
        console.error("[SHIELD_TRANSACTION_ERROR]", e);
        throw e;
    }
  };

  const createAddRequest = async (req: ChangeRequest, targetPgName?: string) => {
    if (!db) return;
    try {
        const finalReq = { 
            ...req, 
            target_pg_name: targetPgName || req.target_pg_name,
            created_at: new Date().toISOString()
        };
        
        // Proteção contra auto-aprovação (mesmo setor)
        if(finalReq.status === 'approved') {
            const batch = writeBatch(db);
            const reqRef = doc(db, "change_requests", finalReq.id);
            const memRef = doc(db, "members", finalReq.collaborator_id);
            
            batch.set(reqRef, finalReq);
            batch.set(memRef, {
                id: finalReq.collaborator_id,
                employee_id: finalReq.collaborator_id,
                full_name: finalReq.collaborator_name,
                sector_name: finalReq.collaborator_sector,
                pg_name: finalReq.target_pg_name || currentUser.pg_name,
                hospital: currentUser.hospital,
                active: true,
                join_date: new Date().toLocaleDateString()
            }, { merge: true });
            
            await batch.commit();
        } else {
            await setDoc(doc(db, "change_requests", finalReq.id), finalReq);
        }
        return { success: true };
    } catch (e) {
        console.error("[SHIELD_REQUEST_FAIL]", e);
        throw e;
    }
  };

  // Adicionando handleUndoMemberAction para permitir desfazer ações de aprovação ou recusa
  const handleUndoMemberAction = async (req: ChangeRequest) => {
    if (!db) return;
    const batch = writeBatch(db);

    try {
        const requestRef = doc(db, "change_requests", req.id);
        
        // 1. Volta o status para pending
        batch.update(requestRef, { 
            status: 'pending',
            seen_by_admin: false,
            processed_at: null,
            processed_by: null,
            refusal_reason: null
        });

        // 2. Reverte o efeito colateral no membro
        const memberRef = doc(db, "members", req.collaborator_id);
        
        if (req.type === 'add') {
            // Se foi aprovado, o membro foi criado/vinculado. Para desfazer, removemos o vínculo de 'members'
            batch.delete(memberRef); 
        } else if (req.type === 'remove') {
            // Se foi aprovado, o membro foi inativado. Para desfazer, reativamos.
            batch.update(memberRef, { 
                active: true, 
                removal_date: null, 
                removal_reason: null 
            });
        }

        await batch.commit();
        return { success: true };
    } catch (e) {
        console.error("[SHIELD_UNDO_ERROR]", e);
        throw e;
    }
  };

  return { handleMemberRequestAction, createAddRequest, handleUndoMemberAction };
};
