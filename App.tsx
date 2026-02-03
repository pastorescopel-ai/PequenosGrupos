
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, doc, updateDoc, getDocs, query, where, setDoc } from 'firebase/firestore';

import { db, isConfigValid } from './lib/firebase';
import { Leader } from './types';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { useFirestoreData } from './hooks/useFirestoreData';
import { requestNotificationPermission } from './lib/notifications';

// Components
import AppLayout from './components/AppLayout';
import AuthScreen from './components/AuthScreen';
import MainContent from './components/MainContent';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 1. Hook de Autenticação
  const { 
    initializing, 
    currentUser, 
    setCurrentUser,
    authViewMode, 
    setAuthViewMode, 
    authError,
    handleLogin, 
    handleRegister, 
    handleLogout,
    handlePasswordReset 
  } = useAuth();

  // 2. Lógica de Permissão Automática (Primeiro Clique Global)
  const triggerAutoNotification = useCallback(async () => {
    if (!currentUser || !("Notification" in window)) return;
    
    // Se o navegador ainda não perguntou (estado 'default')
    if (Notification.permission === 'default') {
      const granted = await requestNotificationPermission();
      if (granted) {
        // Atualiza no perfil se o usuário aceitar
        const q = query(collection(db, "leaders"), where("email", "==", currentUser.email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await updateDoc(doc(db, "leaders", snapshot.docs[0].id), { 
            browser_notifications_enabled: true 
          });
          setCurrentUser(prev => prev ? { ...prev, browser_notifications_enabled: true } : null);
        }
      }
      // Remove o ouvinte após a primeira tentativa
      window.removeEventListener('click', triggerAutoNotification);
      window.removeEventListener('touchstart', triggerAutoNotification);
    }
  }, [currentUser, setCurrentUser]);

  useEffect(() => {
    if (currentUser && !initializing) {
      window.addEventListener('click', triggerAutoNotification);
      window.addEventListener('touchstart', triggerAutoNotification);
    }
    return () => {
      window.removeEventListener('click', triggerAutoNotification);
      window.removeEventListener('touchstart', triggerAutoNotification);
    };
  }, [currentUser, initializing, triggerAutoNotification]);

  // Resetar para dashboard sempre que o usuário sair
  useEffect(() => {
    if (!currentUser) {
      setActiveTab('dashboard');
    }
  }, [currentUser]);

  // 3. Hook de Dados
  const {
    allCollaborators, setAllCollaborators,
    sectors, setSectors,
    pgs, setPgs,
    leaders, setLeaders,
    members, setMembers,
    chaplains, setChaplains,
    meetingSchedules, setMeetingSchedules,
    pgPhotos, setPgPhotos,
    memberRequests,
    reportSettings,
    updateSchedule,
    safeDbAction
  } = useFirestoreData(currentUser);

  const handleUpdateUser = async (updatedData: Partial<Leader>) => {
    if (!currentUser) return;
    
    await safeDbAction(async () => {
       const q = query(collection(db, "leaders"), where("email", "==", currentUser.email));
       const snapshot = await getDocs(q);
       
       if (!snapshot.empty) {
         const leaderDocRef = doc(db, "leaders", snapshot.docs[0].id);
         await updateDoc(leaderDocRef, updatedData);
       } else if (currentUser.role === 'ADMIN') {
         await setDoc(doc(db, "leaders", currentUser.id), {
           ...currentUser,
           ...updatedData,
           active: true,
           status: 'approved'
         }, { merge: true });
       }
       
       setCurrentUser(prev => prev ? { ...prev, ...updatedData } : null);
    });
  };

  const handleChaplainAction = async (leaderId: string, action: 'confirmed' | 'declined', assignedId?: string, response?: string) => {
    await safeDbAction(async () => {
        const q = query(collection(db, "meeting_schedules"), 
            where("leader_id", "==", leaderId), 
            where("chaplain_status", "==", "pending"));
        const snap = await getDocs(q);
        if (!snap.empty) {
            await updateDoc(doc(db, "meeting_schedules", snap.docs[0].id), {
                chaplain_status: action,
                assigned_chaplain_id: assignedId || null,
                chaplain_response: response || null,
                chaplain_assigned_name: assignedId ? chaplains.find(c => c.id === assignedId)?.name : null,
                updated_at: new Date().toISOString()
            });
        }
    });
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-400 font-bold text-sm animate-pulse">Iniciando sistema...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen 
        mode={authViewMode} 
        error={authError}
        onSubmit={async (e, email, pass) => {
          // Gatilho de gesto do usuário no clique do login
          requestNotificationPermission();
          authViewMode === 'login' ? handleLogin(e, email, pass) : handleRegister(e, email, pass);
        }}
        onToggleMode={() => setAuthViewMode(authViewMode === 'login' ? 'register' : 'login')}
        isConfigValid={isConfigValid}
        onForgotPassword={handlePasswordReset}
      />
    );
  }

  return (
    <AppLayout 
      currentUser={currentUser} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      handleLogout={handleLogout} 
      meetingSchedules={meetingSchedules}
      memberRequests={memberRequests}
      sectors={sectors}
      allCollaborators={allCollaborators}
    >
      <MainContent 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        
        allCollaborators={allCollaborators}
        sectors={sectors}
        pgs={pgs}
        leaders={leaders}
        members={members}
        chaplains={chaplains}
        meetingSchedules={meetingSchedules}
        pgPhotos={pgPhotos}
        memberRequests={memberRequests}
        reportSettings={reportSettings}

        setAllCollaborators={setAllCollaborators}
        setSectors={setSectors}
        setPgs={setPgs}
        setLeaders={setLeaders}
        setMembers={setMembers}
        setChaplains={setChaplains}
        setPgPhotos={setPgPhotos}

        handleUpdateUser={handleUpdateUser}
        handleChaplainAction={handleChaplainAction}
        updateSchedule={updateSchedule}
        safeDbAction={safeDbAction}
      />
    </AppLayout>
  );
};

export default App;
