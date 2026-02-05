
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc,
  writeBatch,
  QuerySnapshot,
  DocumentData,
  orderBy
} from 'firebase/firestore';
import { Leader, ChangeRequest, ReportSettings, MeetingSchedule, Chaplain, Sector, Collaborator, PG, PGMeetingPhoto } from '../types';
import { sendNativeNotification } from '../lib/notifications';

export const useFirestoreData = (currentUser: Leader | null) => {
  const [allCollaborators, setAllCollaborators] = useState<Collaborator[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [pgs, setPgs] = useState<PG[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [members, setMembers] = useState<Collaborator[]>([]);
  const [chaplains, setChaplains] = useState<Chaplain[]>([]);
  const [meetingSchedules, setMeetingSchedules] = useState<MeetingSchedule[]>([]);
  const [pgPhotos, setPgPhotos] = useState<PGMeetingPhoto[]>([]);
  const [memberRequests, setMemberRequests] = useState<ChangeRequest[]>([]);
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    director_name: '',
    director_title: '',
    footer_text: 'Hospital Adventista - Pequenos Grupos'
  });

  const isInitialLoad = useRef({ requests: true, schedules: true });

  // --- BLINDAGEM DE INTEGRIDADE: AUTO-SYNC DE SETORES ---
  useEffect(() => {
    const syncSectors = async () => {
      if (currentUser?.role !== 'ADMIN' || members.length === 0 || allCollaborators.length === 0) return;

      const batch = writeBatch(db);
      let changesCount = 0;

      members.forEach(member => {
        if (!member.active) return;
        const rhOfficial = allCollaborators.find(c => c.employee_id === member.employee_id);
        if (rhOfficial && rhOfficial.active && member.sector_name !== rhOfficial.sector_name) {
          const memberRef = doc(db, "members", member.employee_id);
          batch.update(memberRef, { 
              sector_name: rhOfficial.sector_name,
              sector_id: rhOfficial.sector_id,
              sync_at: new Date().toISOString()
          });
          changesCount++;
        }
      });

      if (changesCount > 0) {
        try {
          await batch.commit();
          console.log(`[SHIELD] Auto-Sync: ${changesCount} membros atualizados.`);
        } catch (e) {
          console.error("[SHIELD_ERROR] Falha no Sync:", e);
        }
      }
    };
    const timeout = setTimeout(syncSectors, 5000);
    return () => clearTimeout(timeout);
  }, [members, allCollaborators, currentUser?.role]);

  // --- BLINDAGEM DE ACESSO: QUERIES ESTRITAS POR UNIDADE ---
  useEffect(() => {
    if (!currentUser || !db) return;

    const unsubscribers: (() => void)[] = [];
    const isAdmin = currentUser.role === 'ADMIN';
    const userHospital = currentUser.hospital;

    // Helper para queries seguras
    const createSecureQuery = (collName: string, forceHospital = true) => {
        const collRef = collection(db, collName);
        // LOCKED_GLOBAL_REPORTS_V32: Admins agora veem tudo para Auditoria Global
        if (isAdmin && !forceHospital) return collRef;
        return query(collRef, where("hospital", "==", userHospital));
    };

    // 1. Setores e PGs (Isolamento desativado para Admins permitirem auditoria HAB/HABA)
    unsubscribers.push(onSnapshot(createSecureQuery("sectors", false), (s) => setSectors(s.docs.map(d => d.data() as Sector))));
    unsubscribers.push(onSnapshot(createSecureQuery("pgs", false), (s) => setPgs(s.docs.map(d => d.data() as PG))));
    
    // 2. Capelães (Unificados)
    unsubscribers.push(onSnapshot(createSecureQuery("chaplains", false), (s) => setChaplains(s.docs.map(d => ({ ...d.data(), id: d.id } as Chaplain)))));
    
    // 3. Settings (Global)
    unsubscribers.push(onSnapshot(doc(db, "settings", "global"), (s) => { if (s.exists()) setReportSettings(s.data() as ReportSettings); }));

    // 4. Base RH (Global para Admin - Crucial para relatórios cruzados)
    unsubscribers.push(onSnapshot(createSecureQuery("collaborators", false), (s) => setAllCollaborators(s.docs.map(d => d.data() as Collaborator))));

    // 5. Líderes e Membros
    if (isAdmin) {
      unsubscribers.push(onSnapshot(collection(db, "leaders"), (s) => setLeaders(s.docs.map(d => ({ ...d.data(), id: d.id } as Leader)))));
      unsubscribers.push(onSnapshot(collection(db, "members"), (s) => setMembers(s.docs.map(d => d.data() as Collaborator))));
      unsubscribers.push(onSnapshot(collection(db, "pg_photos"), (s) => setPgPhotos(s.docs.map(d => ({ ...d.data(), id: d.id } as PGMeetingPhoto)))));
    } else {
      if (currentUser.pg_name) {
        const qMembers = query(collection(db, "members"), where("hospital", "==", userHospital), where("pg_name", "==", currentUser.pg_name));
        unsubscribers.push(onSnapshot(qMembers, (s) => setMembers(s.docs.map(d => d.data() as Collaborator))));
      }
      const qPhotos = query(collection(db, "pg_photos"), where("leader_id", "==", currentUser.id));
      unsubscribers.push(onSnapshot(qPhotos, (s) => setPgPhotos(s.docs.map(d => ({ ...d.data(), id: d.id } as PGMeetingPhoto)))));
    }

    // 6. Solicitações
    const qReq = isAdmin ? query(collection(db, "change_requests"), orderBy("created_at", "desc")) : query(collection(db, "change_requests"), where("leader_id", "==", currentUser.id));
    unsubscribers.push(onSnapshot(qReq, (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ChangeRequest));
      setMemberRequests(data);
      if (isInitialLoad.current.requests) { isInitialLoad.current.requests = false; return; }
      if (!currentUser.browser_notifications_enabled) return;
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && isAdmin) {
          const req = change.doc.data() as ChangeRequest;
          if (req.status === 'pending') sendNativeNotification("Nova Solicitação", { body: `${req.leader_name} solicitou vínculo para ${req.collaborator_name}.` });
        }
      });
    }));

    // 7. Escalas
    unsubscribers.push(onSnapshot(createSecureQuery("meeting_schedules", false), (snapshot) => {
      setMeetingSchedules(snapshot.docs.map(d => d.data() as MeetingSchedule));
    }));

    return () => unsubscribers.forEach(unsub => unsub());
  }, [currentUser]);

  const safeDbAction = async (action: () => Promise<void>) => {
    if (!db) return;
    try { await action(); } catch (e) { console.error("[SHIELD_ACTION_FAIL]", e); }
  };

  const updateSchedule = async (newSchedule: Partial<MeetingSchedule>) => {
    if (!currentUser) return;
    const scheduleId = `${currentUser.id}_${new Date().toISOString().split('T')[0]}`;
    await safeDbAction(async () => {
      await setDoc(doc(db, "meeting_schedules", scheduleId), {
        ...newSchedule,
        leader_id: currentUser.id,
        hospital: currentUser.hospital,
        updated_at: new Date().toISOString()
      }, { merge: true });
    });
  };

  return {
    allCollaborators, setAllCollaborators, sectors, setSectors, pgs, setPgs, leaders, setLeaders,
    members, setMembers, chaplains, setChaplains, meetingSchedules, setMeetingSchedules,
    pgPhotos, setPgPhotos, memberRequests, setMemberRequests, reportSettings, setReportSettings,
    updateSchedule, safeDbAction
  };
};
