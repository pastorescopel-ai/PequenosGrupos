
import React, { useState, useEffect } from 'react';
import { auth, db, isConfigValid } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { Leader } from '../types';

const ADMIN_EMAIL = "pastorescopel@gmail.com";

const clearUrlParams = () => {
    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('mode') || url.searchParams.has('email')) {
            url.searchParams.delete('mode');
            url.searchParams.delete('email');
            window.history.replaceState({}, '', url.toString());
        }
    }
};

export const useAuth = () => {
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<Leader | null>(null);
  const [authViewMode, setAuthViewMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigValid || !auth) {
        setInitializing(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userEmailLower = user.email?.toLowerCase().trim();
          
          if (db) {
            try {
              // Busca o documento do líder (Admin ou Comum) pelo e-mail
              const q = query(collection(db, "leaders"), where("email", "==", userEmailLower));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const leaderDoc = querySnapshot.docs[0];
                const leaderData = leaderDoc.data() as Leader;
                
                if (!leaderData.active) {
                  setAuthError("Sua conta está inativa. Contate a administração.");
                  setCurrentUser(null);
                  await signOut(auth);
                } else {
                  // Sincroniza o UID do Auth com o documento do Firestore se necessário
                  if (leaderData.id !== user.uid) {
                      await updateDoc(doc(db, "leaders", leaderDoc.id), { id: user.uid });
                  }
                  setCurrentUser({ ...leaderData, id: user.uid });
                  setAuthError(null);
                  clearUrlParams();
                }
              } else {
                // Caso especial: Admin Master logado pela primeira vez ou sem documento
                if (userEmailLower === ADMIN_EMAIL.toLowerCase()) {
                  setCurrentUser({
                    id: user.uid,
                    email: user.email!,
                    full_name: 'Administrador Master',
                    employee_id: 'ADM001',
                    hospital: 'Belém',
                    is_admin: true,
                    role: 'ADMIN',
                    status: 'approved',
                    active: true,
                    sector_name: 'Diretoria'
                  });
                  setAuthError(null);
                } else {
                  setAuthError("Seu e-mail está autenticado, mas não foi encontrado registro no banco de dados.");
                  setCurrentUser(null);
                }
              }
            } catch (firestoreErr: any) {
              if (firestoreErr.code === 'permission-denied') {
                setAuthError("Erro de Permissão no banco de dados.");
              } else {
                throw firestoreErr;
              }
            }
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Erro no Auth Observer:", error);
        setAuthError("Erro de conexão com o banco de dados.");
      } finally {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent, email: string, pass: string) => {
    e.preventDefault();
    setAuthError(null);
    if (!auth) return;

    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), pass);
      clearUrlParams();
    } catch (error: any) {
      console.error("Login Error:", error.code);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError("E-mail ou senha incorretos.");
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError("Muitas tentativas. Sua conta foi bloqueada temporariamente.");
      } else {
        setAuthError("Erro ao entrar. Verifique sua conexão de internet.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent, rawEmail: string, pass: string) => {
    e.preventDefault();
    setAuthError(null);
    if (!auth || !db) return;

    const email = rawEmail.toLowerCase().trim();
    try {
      let checkSnapshot;
      try {
        const qCheck = query(collection(db, "leaders"), where("email", "==", email));
        checkSnapshot = await getDocs(qCheck);
      } catch (permErr: any) {
        throw permErr;
      }

      if (checkSnapshot.empty && email !== ADMIN_EMAIL.toLowerCase()) {
        setAuthError("Acesso negado: Este e-mail não foi pré-cadastrado pela Capelania.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      if (email !== ADMIN_EMAIL.toLowerCase() && checkSnapshot) {
        const leaderDoc = checkSnapshot.docs[0];
        await updateDoc(doc(db, "leaders", leaderDoc.id), { 
          id: user.uid, 
          active: true,
          status: 'approved',
          needs_password_change: false 
        });
      }
      clearUrlParams();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("Este e-mail já possui uma conta. Tente fazer login.");
      } else {
        setAuthError("Erro ao criar conta: " + error.message);
      }
    }
  };

  const handleLogout = () => { 
    if(auth) signOut(auth); 
    setCurrentUser(null);
    setAuthViewMode('login');
    setAuthError(null);
  };

  const handlePasswordReset = async (email: string) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      alert("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
    } catch (error: any) {
      setAuthError("Erro ao enviar reset: " + error.message);
    }
  };

  return {
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
  };
};
