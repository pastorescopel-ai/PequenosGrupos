
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
  getDoc,
  setDoc,
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
          
          // BYPASS_V35: Identidade Incondicional para o Master
          if (userEmailLower === ADMIN_EMAIL.toLowerCase()) {
            const masterDefaults: Leader = {
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
            };
            
            // Define o acesso imediatamente para não travar a inicialização
            setCurrentUser(masterDefaults);
            setInitializing(false);
            setAuthError(null);
            clearUrlParams();

            // Tenta sincronizar com o Firestore em segundo plano (Não-bloqueante)
            if (db) {
              try {
                const userRef = doc(db, "leaders", user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                  // Se existir registro personalizado, mescla com os defaults (Mantendo ADMIN)
                  const storedData = userSnap.data() as Leader;
                  setCurrentUser({
                    ...masterDefaults,
                    ...storedData,
                    role: 'ADMIN', // Segurança: Garante que nunca perde o papel
                    is_admin: true,
                    id: user.uid
                  });
                } else {
                  // Se não existir, tenta criar o rastro inicial silenciosamente
                  await setDoc(userRef, masterDefaults, { merge: true });
                }
              } catch (bgError) {
                console.warn("Aviso: Falha na sincronização silenciosa do Master.", bgError);
              }
            }
            return; // Encerra fluxo para o Master
          }

          // Fluxo Normal para outros usuários
          if (db) {
            try {
              const userRef = doc(db, "leaders", user.uid);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const leaderData = userSnap.data() as Leader;
                if (!leaderData.active) {
                  setAuthError("Sua conta está inativa. Contate a administração.");
                  setCurrentUser(null);
                  await signOut(auth);
                } else {
                  setCurrentUser({ ...leaderData, id: user.uid });
                  setAuthError(null);
                  clearUrlParams();
                }
              } else {
                // Fallback por e-mail para usuários pré-cadastrados via Import
                const q = query(collection(db, "leaders"), where("email", "==", userEmailLower));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                  const leaderDoc = querySnapshot.docs[0];
                  const leaderData = leaderDoc.data() as Leader;
                  
                  // Migra o ID do documento para o UID oficial
                  const migratedData = { ...leaderData, id: user.uid };
                  await setDoc(doc(db, "leaders", user.uid), migratedData);
                  
                  setCurrentUser(migratedData);
                  setAuthError(null);
                  clearUrlParams();
                } else {
                  setAuthError("Seu e-mail está autenticado, mas seu registro não foi encontrado.");
                  setCurrentUser(null);
                }
              }
            } catch (firestoreErr: any) {
              setAuthError("Erro ao validar acesso no banco de dados.");
              setCurrentUser(null);
            }
          }
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Erro no Auth Observer:", error);
        setAuthError("Erro crítico de conexão.");
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
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError("E-mail ou senha incorretos.");
      } else {
        setAuthError("Erro ao entrar. Tente novamente.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent, rawEmail: string, pass: string) => {
    e.preventDefault();
    setAuthError(null);
    if (!auth || !db) return;

    const email = rawEmail.toLowerCase().trim();
    try {
      // Verifica se o e-mail Master está tentando se registrar (caso tenha perdido a conta Auth)
      if (email !== ADMIN_EMAIL.toLowerCase()) {
        const qCheck = query(collection(db, "leaders"), where("email", "==", email));
        const checkSnapshot = await getDocs(qCheck);
        if (checkSnapshot.empty) {
          setAuthError("Este e-mail não foi pré-cadastrado pela administração.");
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      // No registro do Master, garantimos que o Firestore tenha o rastro
      if (email === ADMIN_EMAIL.toLowerCase()) {
         await setDoc(doc(db, "leaders", user.uid), {
             id: user.uid,
             email: email,
             full_name: 'Administrador Master',
             role: 'ADMIN',
             is_admin: true,
             active: true,
             status: 'approved',
             hospital: 'Belém'
         });
      }
      clearUrlParams();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("Este e-mail já possui uma conta.");
      } else {
        setAuthError("Erro ao criar conta.");
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
      alert("E-mail de redefinição enviado!");
    } catch (error: any) {
      setAuthError("Erro ao enviar reset.");
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
