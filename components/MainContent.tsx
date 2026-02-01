import React from 'react';
import { collection, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Leader, ChangeRequest, MeetingSchedule, Chaplain, Sector, Collaborator, PG, ReportSettings, PGMeetingPhoto } from '../types';

// Feature Components
import ImportCollaborators from './ImportCollaborators';
import ReportCoverage from './ReportCoverage';
import LeaderDashboard from './LeaderDashboard';
import ProfileView from './ProfileView';
import AdminManagement from './AdminManagement';
import SettingsView from './SettingsView';
import AdminDashboard from './AdminDashboard';
import MemberManagement from './MemberManagement';
import ChaplainScale from './ChaplainScale';
import PGPhotosView from './PGPhotosView';

interface MainContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Leader;
  
  // Dados
  allCollaborators: Collaborator[];
  sectors: Sector[];
  pgs: PG[];
  leaders: Leader[];
  members: Collaborator[];
  chaplains: Chaplain[];
  meetingSchedules: MeetingSchedule[];
  memberRequests: ChangeRequest[];
  reportSettings: ReportSettings;
  pgPhotos: PGMeetingPhoto[];

  // Setters
  setAllCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  setSectors: React.Dispatch<React.SetStateAction<Sector[]>>;
  setPgs: React.Dispatch<React.SetStateAction<PG[]>>;
  setLeaders: React.Dispatch<React.SetStateAction<Leader[]>>;
  setMembers: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  setChaplains: React.Dispatch<React.SetStateAction<Chaplain[]>>;
  setPgPhotos: React.Dispatch<React.SetStateAction<PGMeetingPhoto[]>>;

  // Actions
  handleUpdateUser: (data: Partial<Leader>) => Promise<void>;
  handleChaplainAction: (leaderId: string, action: 'confirmed' | 'declined', assignedId?: string, response?: string) => Promise<void>;
  updateSchedule: (schedule: Partial<MeetingSchedule>) => Promise<void>;
  safeDbAction: (action: () => Promise<void>) => Promise<void>;
}

const MainContent: React.FC<MainContentProps> = ({
  activeTab, setActiveTab, currentUser,
  allCollaborators, sectors, pgs, leaders, members, chaplains, meetingSchedules, memberRequests, reportSettings, pgPhotos,
  setAllCollaborators, setSectors, setPgs, setLeaders, setMembers, setChaplains, setPgPhotos,
  handleUpdateUser, handleChaplainAction, updateSchedule, safeDbAction
}) => {

  if (currentUser.needs_password_change) {
    return <ProfileView user={currentUser} onUpdate={handleUpdateUser} />;
  }

  switch (activeTab) {
    case 'dashboard':
      return currentUser.role === 'ADMIN' 
        ? <AdminDashboard 
            user={currentUser}
            onUpdateUser={handleUpdateUser}
            meetingSchedules={meetingSchedules} 
            onNavigateToScale={() => setActiveTab('chaplain-scale')} 
            leaders={leaders} 
            members={members} 
            sectors={sectors} 
            memberRequests={memberRequests} 
            onNavigateToMembers={() => setActiveTab('admin')} 
          /> 
        : <LeaderDashboard 
            user={currentUser} 
            onUpdateUser={handleUpdateUser}
            memberRequests={memberRequests} 
            chaplains={chaplains} 
            meetingSchedule={meetingSchedules.filter(s => s.leader_id === currentUser.id).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]} 
            allSchedules={meetingSchedules} 
            onUpdateSchedule={updateSchedule} 
            members={members} 
            photos={pgPhotos}
            leaders={leaders}
          />;

    case 'chaplain-scale':
      return (currentUser.role === 'ADMIN' || currentUser.role === 'CAPELAO') 
        ? <ChaplainScale 
            meetingSchedules={meetingSchedules} 
            chaplains={chaplains} 
            onChaplainAction={handleChaplainAction} 
          /> 
        : null;

    case 'members':
      return <MemberManagement 
          user={currentUser} 
          pgs={pgs} 
          onAddRequest={async (r) => {
             await safeDbAction(async () => {
               await setDoc(doc(collection(db, "change_requests"), r.id), r);
               if(r.type === 'add' && r.status === 'approved') {
                 await setDoc(doc(db, "members", r.collaborator_id), {
                    id: r.collaborator_id,
                    employee_id: r.collaborator_id,
                    full_name: r.collaborator_name,
                    sector_name: r.collaborator_sector,
                    pg_name: currentUser.pg_name,
                    active: true,
                    join_date: new Date().toLocaleDateString()
                 });
               }
             });
          }} 
          memberRequests={memberRequests} 
          members={members} 
          setMembers={setMembers} 
          allCollaborators={allCollaborators} 
      />;

    case 'import':
      return currentUser.role === 'ADMIN' 
        ? <ImportCollaborators 
            allCollaborators={allCollaborators} 
            setAllCollaborators={setAllCollaborators} 
            adminId={currentUser.id} 
            chaplains={chaplains} 
            setChaplains={setChaplains} 
            sectors={sectors} 
            setSectors={setSectors} 
            pgs={pgs} 
            setPgs={setPgs} 
        /> 
        : null;

    case 'reports':
      return <ReportCoverage 
        isAdmin={currentUser.role === 'ADMIN'} 
        user={currentUser} 
        settings={reportSettings} 
        sectors={sectors} 
        members={members} 
        allCollaborators={allCollaborators}
        leaders={leaders}
        photos={pgPhotos}
      />;

    case 'meetings':
      return <PGPhotosView 
        user={currentUser} 
        photos={pgPhotos} 
        onAddPhoto={async (d) => {
          const newPhoto = {
            id: Date.now().toString(),
            url: d.photo,
            description: d.description,
            uploaded_at: new Date().toISOString(),
            week_number: 1, 
            leader_id: currentUser.id
          };
          await safeDbAction(async () => {
              await setDoc(doc(collection(db, "pg_photos"), newPhoto.id), newPhoto);
          });
        }} 
      />;

    case 'admin':
      return currentUser.role === 'ADMIN' 
        ? <AdminManagement 
            pgs={pgs} 
            leaders={leaders} 
            setLeaders={setLeaders} 
            memberRequests={memberRequests} 
            onRequestAction={async (id, status) => {
               await safeDbAction(async () => await updateDoc(doc(db, "change_requests", id), { status }));
            }} 
            allCollaborators={allCollaborators} 
            photos={pgPhotos}
            sectors={sectors}
        /> 
        : null;

    case 'settings':
      return currentUser.role === 'ADMIN' 
        ? <SettingsView 
            settings={reportSettings} 
            onUpdate={async (s) => {
              await safeDbAction(async () => await setDoc(doc(db, "settings", "global"), s));
            }} 
        /> 
        : null;

    case 'profile':
      return <ProfileView user={currentUser} onUpdate={handleUpdateUser} />;

    default:
      return <div className="p-10 text-center font-bold text-slate-400 italic">Página em construção</div>;
  }
};

export default MainContent;