
import { useState, useEffect } from 'react';
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
  DocumentData
} from 'firebase/firestore';
import { Leader, ChangeRequest, ReportSettings, MeetingSchedule, Chaplain, Sector, Collaborator, PG, PGMeetingPhoto } from '../types';

export const useFirestoreData = (currentUser: Leader | null) => {
  const [allCollaborators, setAllCollaborators] = useState<Collaborator[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [pgs, setPgs] = useState<PG[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [members, setMembers] = useState<Collaborator[]>([]);
  const [chaplains, setChaplains] = useState<Chaplain[]>([]);
  const [meetingSchedules, setMeetingSchedules] = useState<MeetingSchedule[]>([]);
  // Added pgPhotos state for meeting evidences
  const [pgPhotos, setPgPhotos] = useState<PGMeetingPhoto[]>([]);
  const [memberRequests, setMemberRequests] = useState<ChangeRequest[]>([]);
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    director_name: '',
    director_title: '',
    footer_text: 'Hospital Adventista - Pequenos Grupos'
  });

  useEffect(() => {
    if (!currentUser || !db) return;

    console.log(`📊 [DATA HOOK] Iniciando download de dados para: ${currentUser.role}`);
    const startLoad = performance.now();
    const unsubscribers: (() => void)[] = [];

    const logLoad = (name: string, count: number) => {
        const time = (performance.now() - startLoad).toFixed(0);
        console.log(`📥 [FIRESTORE] ${name}: ${count} itens recebidos (+${time}ms)`);
    };

    try {
      const isAdmin = currentUser.role === 'ADMIN';

      // --- DADOS LEVES (Globais) ---
      unsubscribers.push(onSnapshot(collection(db, "sectors"), (s: QuerySnapshot<DocumentData>) => {
          setSectors(s.docs.map(d => d.data() as Sector));
          logLoad("Setores", s.size);
      }));
      
      unsubscribers.push(onSnapshot(collection(db, "pgs"), (s: QuerySnapshot<DocumentData>) => {
          setPgs(s.docs.map(d => d.data() as PG));
          logLoad("PGs", s.size);
      }));

      unsubscribers.push(onSnapshot(collection(db, "chaplains"), (s: QuerySnapshot<DocumentData>) => {
          setChaplains(s.docs.map(d => ({ ...d.data(), id: d.id } as Chaplain)));
          logLoad("Capelães", s.size);
      }));

      unsubscribers.push(onSnapshot(doc(db, "settings", "global"), (s) => { 
          if (s.exists()) setReportSettings(s.data() as ReportSettings); 
          logLoad("Configurações", 1);
      }));

      // --- DADOS GERAIS ---
      unsubscribers.push(onSnapshot(collection(db, "collaborators"), (s: QuerySnapshot<DocumentData>) => {
          const data = s.docs.map(d => d.data() as Collaborator);
          setAllCollaborators(data);
          logLoad("Base RH (Colaboradores)", s.size);
      }));

      // --- DADOS ADMINISTRATIVOS ---
      if (isAdmin) {
        unsubscribers.push(onSnapshot(collection(db, "leaders"), (s: QuerySnapshot<DocumentData>) => {
            setLeaders(s.docs.map(d => ({ ...d.data(), id: d.id } as Leader)));
            logLoad("Líderes", s.size);
        }));

        unsubscribers.push(onSnapshot(collection(db, "members"), (s: QuerySnapshot<DocumentData>) => {
            setMembers(s.docs.map(d => d.data() as Collaborator));
            logLoad("Membros de PG", s.size);
        }));

        // Added onSnapshot for all pg_photos for Admin view
        unsubscribers.push(onSnapshot(collection(db, "pg_photos"), (s: QuerySnapshot<DocumentData>) => {
            setPgPhotos(s.docs.map(d => ({ ...d.data(), id: d.id } as PGMeetingPhoto)));
            logLoad("Fotos de PG", s.size);
        }));
      } else {
         if (currentUser.pg_name) {
            const qMembers = query(collection(db, "members"), where("pg_name", "==", currentUser.pg_name));
            unsubscribers.push(onSnapshot(qMembers, (s: QuerySnapshot<DocumentData>) => {
                setMembers(s.docs.map(d => d.data() as Collaborator));
                logLoad("Meus Membros", s.size);
            }));
         }
         // Added onSnapshot for personal pg_photos for Leader view
         const qPhotos = query(collection(db, "pg_photos"), where("leader_id", "==", currentUser.id));
         unsubscribers.push(onSnapshot(qPhotos, (s: QuerySnapshot<DocumentData>) => {
             setPgPhotos(s.docs.map(d => ({ ...d.data(), id: d.id } as PGMeetingPhoto)));
             logLoad("Minhas Fotos de PG", s.size);
         }));
      }

      // Agendamentos
      const qSchedules = query(collection(db, "meeting_schedules"));
      unsubscribers.push(onSnapshot(qSchedules, (s: QuerySnapshot<DocumentData>) => {
          setMeetingSchedules(s.docs.map(d => d.data() as MeetingSchedule));
          logLoad("Agendamentos (Todos)", s.size);
      }));

      // Solicitações
      let qRequests;
      if (isAdmin) {
        qRequests = query(collection(db, "change_requests"));
      } else {
        qRequests = query(collection(db, "change_requests"), where("leader_id", "==", currentUser.id));
      }
      unsubscribers.push(onSnapshot(qRequests, (s: QuerySnapshot<DocumentData>) => {
          setMemberRequests(s.docs.map(d => ({ ...d.data(), id: d.id } as ChangeRequest)));
          logLoad("Solicitações", s.size);
      }));

    } catch (e) {
      console.error("Erro ao conectar listeners do Firestore:", e);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [currentUser]);

  const safeDbAction = async (action: () => Promise<void>) => {
      if(!db) return;
      try { await action(); } catch(e) { console.error(e); }
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
    // Returned pgPhotos and setPgPhotos for use in App.tsx
    pgPhotos, setPgPhotos,
    memberRequests, setMemberRequests,
    reportSettings, setReportSettings,
    updateSchedule,
    safeDbAction
  };
};
