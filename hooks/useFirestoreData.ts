
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
  QuerySnapshot,
  DocumentData,
  DocumentChange
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

  const isInitialLoad = useRef({
    requests: true,
    schedules: true
  });

  useEffect(() => {
    if (!currentUser || !db) return;

    const unsubscribers: (() => void)[] = [];
    const isAdmin = currentUser.role === 'ADMIN';

    // 1. Ouvintes de Dados Estáticos/Globais
    unsubscribers.push(onSnapshot(collection(db, "sectors"), (s) => setSectors(s.docs.map(d => d.data() as Sector))));
    unsubscribers.push(onSnapshot(collection(db, "pgs"), (s) => setPgs(s.docs.map(d => d.data() as PG))));
    unsubscribers.push(onSnapshot(collection(db, "chaplains"), (s) => setChaplains(s.docs.map(d => ({ ...d.data(), id: d.id } as Chaplain)))));
    unsubscribers.push(onSnapshot(doc(db, "settings", "global"), (s) => { if (s.exists()) setReportSettings(s.data() as ReportSettings); }));
    unsubscribers.push(onSnapshot(collection(db, "collaborators"), (s) => setAllCollaborators(s.docs.map(d => d.data() as Collaborator))));

    // 2. Ouvintes Administrativos
    if (isAdmin) {
      unsubscribers.push(onSnapshot(collection(db, "leaders"), (s) => setLeaders(s.docs.map(d => ({ ...d.data(), id: d.id } as Leader)))));
      unsubscribers.push(onSnapshot(collection(db, "members"), (s) => setMembers(s.docs.map(d => d.data() as Collaborator))));
      unsubscribers.push(onSnapshot(collection(db, "pg_photos"), (s) => setPgPhotos(s.docs.map(d => ({ ...d.data(), id: d.id } as PGMeetingPhoto)))));
    } else {
      if (currentUser.pg_name) {
        const qMembers = query(collection(db, "members"), where("pg_name", "==", currentUser.pg_name));
        unsubscribers.push(onSnapshot(qMembers, (s) => setMembers(s.docs.map(d => d.data() as Collaborator))));
      }
      const qPhotos = query(collection(db, "pg_photos"), where("leader_id", "==", currentUser.id));
      unsubscribers.push(onSnapshot(qPhotos, (s) => setPgPhotos(s.docs.map(d => ({ ...d.data(), id: d.id } as PGMeetingPhoto)))));
    }

    // 3. Lógica de Notificações em Tempo Real (Solicitações)
    let qRequests;
    if (isAdmin) {
      qRequests = query(collection(db, "change_requests"));
    } else {
      qRequests = query(collection(db, "change_requests"), where("leader_id", "==", currentUser.id));
    }

    unsubscribers.push(onSnapshot(qRequests, (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ChangeRequest));
      setMemberRequests(data);

      if (isInitialLoad.current.requests) {
        isInitialLoad.current.requests = false;
        return;
      }

      if (!currentUser.browser_notifications_enabled) return;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && isAdmin) {
          const req = change.doc.data() as ChangeRequest;
          if (req.status === 'pending') {
            sendNativeNotification("Nova Solicitação de Membro", {
              body: `${req.leader_name} solicitou a ${req.type === 'add' ? 'entrada' : 'saída'} de ${req.collaborator_name}.`
            });
          }
        } else if (change.type === "modified" && !isAdmin) {
          const req = change.doc.data() as ChangeRequest;
          if (req.status !== 'pending') {
            sendNativeNotification(`Solicitação ${req.status === 'approved' ? 'Aprovada' : 'Recusada'}`, {
              body: `A gestão analisou o pedido para ${req.collaborator_name}.`
            });
          }
        }
      });
    }));

    // 4. Lógica de Notificações em Tempo Real (Agendamentos)
    const qSchedules = query(collection(db, "meeting_schedules"));
    unsubscribers.push(onSnapshot(qSchedules, (snapshot) => {
      setMeetingSchedules(snapshot.docs.map(d => d.data() as MeetingSchedule));

      if (isInitialLoad.current.schedules) {
        isInitialLoad.current.schedules = false;
        return;
      }

      if (!currentUser.browser_notifications_enabled) return;

      snapshot.docChanges().forEach((change) => {
        const schedule = change.doc.data() as MeetingSchedule;
        if (change.type === "added" && (isAdmin || currentUser.role === 'CAPELAO')) {
          if (schedule.request_chaplain && schedule.chaplain_status === 'pending') {
            sendNativeNotification("Novo Convite Pastoral", {
              body: `O PG ${schedule.pg_name} convidou a capelania para o encontro.`
            });
          }
        } else if (change.type === "modified" && schedule.leader_id === currentUser.id) {
          if (schedule.chaplain_status === 'confirmed') {
            sendNativeNotification("Presença Confirmada!", {
              body: `O Capelão ${schedule.chaplain_assigned_name} confirmou presença no seu PG.`
            });
          } else if (schedule.chaplain_status === 'declined') {
            sendNativeNotification("Agenda Indisponível", {
              body: "A capelania não poderá comparecer nesta data. Veja a justificativa no App."
            });
          }
        }
      });
    }));

    return () => unsubscribers.forEach(unsub => unsub());
  }, [currentUser]);

  const safeDbAction = async (action: () => Promise<void>) => {
    if (!db) return;
    try { await action(); } catch (e) { console.error(e); }
  };

  const updateSchedule = async (newSchedule: Partial<MeetingSchedule>) => {
    if (!currentUser) return;
    const scheduleId = `${currentUser.id}_${new Date().toISOString().split('T')[0]}`;
    await safeDbAction(async () => {
      await setDoc(doc(db, "meeting_schedules", scheduleId), {
        ...newSchedule,
        leader_id: currentUser.id,
        updated_at: new Date().toISOString()
      }, { merge: true });
    });
  };

  return {
    allCollaborators, setAllCollaborators,
    sectors, setSectors,
    pgs, setPgs,
    leaders, setLeaders,
    members, setMembers,
    chaplains, setChaplains,
    meetingSchedules, setMeetingSchedules,
    pgPhotos, setPgPhotos,
    memberRequests, setMemberRequests,
    reportSettings, setReportSettings,
    updateSchedule,
    safeDbAction
  };
};
