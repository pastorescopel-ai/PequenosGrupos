
import React from 'react';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Leader, ChangeRequest, MeetingSchedule, Chaplain, Sector, Collaborator, PG, ReportSettings, PGMeetingPhoto } from '../types';

import { useMemberActions } from '../hooks/useMemberLogic';

// Componentes protegidos
import AdminDashboard from './AdminDashboard';
import LeaderDashboard from './LeaderDashboard';
import AdminMemberView from './MemberManagement/AdminMemberView';
import LeaderMemberView from './MemberManagement/LeaderMemberView';
import ChaplainScale from './ChaplainScale';
import ImportCollaborators from './ImportCollaborators';
import ReportCoverage from './ReportCoverage';
import PGPhotosView from './PGPhotosView';
import AdminPhotoGallery from './AdminPhotoGallery';
import SettingsView from './SettingsView';
import ProfileView from './ProfileView';
import AdminManagement from './AdminManagement';
import SystemAdminsView from './SystemAdminsView';
import PendingRequestsView from './PendingRequestsView';

interface MainContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Leader;
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
  setAllCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  setSectors: React.Dispatch<React.SetStateAction<Sector[]>>;
  setPgs: React.Dispatch<React.SetStateAction<PG[]>>;
  setLeaders: React.Dispatch<React.SetStateAction<Leader[]>>;
  setMembers: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  setChaplains: React.Dispatch<React.SetStateAction<Chaplain[]>>;
  handleUpdateUser: (data: Partial<Leader>) => Promise<void>;
  handleChaplainAction: (leaderId: string, action: 'confirmed' | 'declined', assignedId?: string, response?: string) => Promise<void>;
  updateSchedule: (schedule: Partial<MeetingSchedule>) => Promise<void>;
  safeDbAction: (action: () => Promise<void>) => Promise<void>;
}

const MainContent: React.FC<MainContentProps> = ({
  activeTab, setActiveTab, currentUser,
  allCollaborators, sectors, pgs, leaders, members, chaplains, meetingSchedules, memberRequests, reportSettings, pgPhotos,
  handleUpdateUser, handleChaplainAction, updateSchedule, safeDbAction,
  setAllCollaborators, setSectors, setPgs, setLeaders, setMembers, setChaplains
}) => {

  const { handleMemberRequestAction, createAddRequest } = useMemberActions(currentUser, leaders);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return currentUser.role === 'ADMIN' 
          ? <AdminDashboard 
              user={currentUser} onUpdateUser={handleUpdateUser} meetingSchedules={meetingSchedules} 
              onNavigateToScale={() => setActiveTab('chaplain-scale')} leaders={leaders} members={members} 
              sectors={sectors} memberRequests={memberRequests} onNavigateToMembers={(pgName) => {
                  setActiveTab('pending-approvals');
              }} 
              allCollaborators={allCollaborators} 
              photos={pgPhotos}
            /> 
          : <LeaderDashboard 
              user={currentUser} onUpdateUser={handleUpdateUser} memberRequests={memberRequests} 
              chaplains={chaplains} meetingSchedule={meetingSchedules.filter(s => s.leader_id === currentUser.id).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]} 
              allSchedules={meetingSchedules} onUpdateSchedule={updateSchedule} members={members} 
              photos={pgPhotos} leaders={leaders} onMarkRequestAsSeen={async(id)=>{}}
            />;

      case 'members':
        return currentUser.role === 'ADMIN'
          ? <AdminMemberView user={currentUser} memberRequests={memberRequests} members={members} allCollaborators={allCollaborators} pgs={pgs} leaders={leaders} sectors={sectors} onAddRequest={(r, pg) => safeDbAction(() => createAddRequest(r, pg))} onRequestAction={(id, status, req) => safeDbAction(() => handleMemberRequestAction(id, status, req))} />
          : <LeaderMemberView user={currentUser} members={members} allCollaborators={allCollaborators} pgs={pgs} leaders={leaders} sectors={sectors} onAddRequest={(r, pg) => safeDbAction(() => createAddRequest(r, pg))} memberRequests={memberRequests} />;

      case 'pending-approvals':
        return <PendingRequestsView memberRequests={memberRequests} leaders={leaders} sectors={sectors} onRequestAction={(id, status, req, reason) => safeDbAction(() => handleMemberRequestAction(id, status, req, reason))} />;

      case 'admin':
        return <AdminManagement pgs={pgs} leaders={leaders} setLeaders={setLeaders} memberRequests={memberRequests} onRequestAction={async () => {}} allCollaborators={allCollaborators} photos={pgPhotos} sectors={sectors} />;

      case 'chaplain-scale':
        return <ChaplainScale meetingSchedules={meetingSchedules} chaplains={chaplains} onChaplainAction={handleChaplainAction} />;

      case 'reports':
        return <ReportCoverage isAdmin={currentUser.role === 'ADMIN'} user={currentUser} settings={reportSettings} sectors={sectors} members={members} allCollaborators={allCollaborators} leaders={leaders} photos={pgPhotos} pgs={pgs} />;

      case 'import':
        return <ImportCollaborators adminId={currentUser.id} chaplains={chaplains} sectors={sectors} setSectors={setSectors} allCollaborators={allCollaborators} setAllCollaborators={setAllCollaborators} pgs={pgs} setPgs={setPgs} />;

      case 'meetings':
        return currentUser.role === 'ADMIN'
          ? <AdminPhotoGallery photos={pgPhotos} />
          : <PGPhotosView user={currentUser} photos={pgPhotos} onAddPhoto={async (d) => {
              const newPhoto = { 
                  id: Date.now().toString(), 
                  url: d.photo, 
                  description: d.description, 
                  uploaded_at: new Date().toISOString(), 
                  week_number: 1, 
                  leader_id: currentUser.id, 
                  leader_name: currentUser.full_name, 
                  hospital: currentUser.hospital, 
                  pg_name: currentUser.pg_name,
                  sector_name: d.sector_name // LOCKED_REPORT_SHIELD_V31: Persistindo setor
              };
              await safeDbAction(async () => await setDoc(doc(collection(db, "pg_photos"), newPhoto.id), newPhoto));
            }} 
          />;

      case 'settings':
        return <SettingsView settings={reportSettings} sectors={sectors} allCollaborators={allCollaborators} onUpdate={async (s) => await safeDbAction(async () => await setDoc(doc(db, "settings", "global"), s))} />;

      case 'sys-admins':
        return <SystemAdminsView leaders={leaders} allCollaborators={allCollaborators} pgs={pgs} sectors={sectors} onUpdateUser={handleUpdateUser} />;

      case 'profile':
        return <ProfileView user={currentUser} onUpdate={handleUpdateUser} />;

      default:
        return <div className="p-20 text-center text-slate-300 font-bold italic text-sm">Selecione uma opção no menu lateral.</div>;
    }
  };

  return <div className="animate-in fade-in duration-500 h-full">{renderTabContent()}</div>;
};

export default MainContent;
