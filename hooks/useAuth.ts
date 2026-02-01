
import React, { useState, useEffect } from 'react';
import { auth, db, isConfigValid } from '../lib/firebase';
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

// Função auxiliar para limpar parâmetros da URL (evita loop de tela de registro)
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
    console.log("🔄 [AUTH HOOK] Iniciando observador de autenticação...");
    setAuthError(null); // Limpa erros ao montar

    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'register') {
      setAuthViewMode('register');
    }

    if (!isConfigValid || !auth) {
        console.warn("Auth não disponível.");
        setInitializing(false);
        return;
    }

    let mounted = true;
    const safetyTimeout = setTimeout(() => {
      if (mounted && initializing) {
        console.warn("⚠️ [TIMEOUT] Auth demorou mais de 3s. Forçando liberação da tela.");
        setInitializing(false);
      }
    }, 3000);

    const unsubscribe = auth.onAuthStateChanged(
      async (user: any) => {
        if (!mounted) return;
        
        const start = performance.now();

        try {
          if (user) {
            console.log(`👤 [AUTH DETECTADO] Usuário: ${user.email} (UID: ${user.uid})`);
            console.time("🕒 Tempo de Busca no Firestore");

            if (user.email === ADMIN_EMAIL) {
              console.log("🛡️ [ADMIN] Login de Super Admin detectado. Ignorando Firestore.");
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
            } else if (db) {
              const q = query(collection(db, "leaders"), where("email", "==", user.email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const leaderDoc = querySnapshot.docs[0];
                const leaderData = leaderDoc.data() as Leader;
                console.log(`✅ [FIRESTORE] Líder encontrado: ${leaderData.full_name}`);
                
                if (leaderData.id !== user.uid) {
                    await updateDoc(doc(db, "leaders", leaderDoc.id), { 
                        id: user.uid,
                    });
                }
                
                setCurrentUser({ ...leaderData, id: user.uid });
                // Limpa URL após login automático (recuperação de sessão)
                clearUrlParams();
              } else {
                console.warn("⚠️ [FIRESTORE] Usuário autenticado mas NÃO encontrado na coleção 'leaders'.");
                setCurrentUser(null);
              }
            }
            console.timeEnd("🕒 Tempo de Busca no Firestore");
          } else {
            console.log("👋 [AUTH] Nenhum usuário logado.");
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("❌ [ERRO CRÍTICO] Falha ao processar dados do usuário:", error);
          setAuthError("Erro ao processar dados do usuário.");
        } finally {
          const end = performance.now();
          console.log(`⏱️ [PERFORMANCE] Processo de Auth finalizado em ${(end - start).toFixed(2)}ms`);
          
          setInitializing(false);
          clearTimeout(safetyTimeout);
        }
      },
      (error: any) => {
        console.error("Erro crítico no Auth State Changed:", error);
        setInitializing(false);
        clearTimeout(safetyTimeout);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent, email: string, pass: string) => {
    e.preventDefault();
    setAuthError(null); // Limpa erros anteriores
    console.log("🚀 [LOGIN] Iniciando processo de login manual...");
    console.time("🕒 Tempo Total do Login (Firebase)");

    if (!isConfigValid || !auth) {
        setAuthError("Erro de configuração: Firebase não conectado corretamente.");
        return;
    }

    if (!pass) {
        setAuthError("Por favor, digite sua senha.");
        return;
    }

    try {
      await auth.signInWithEmailAndPassword(email, pass);
      console.log("✅ [LOGIN] Sucesso no signInWithEmailAndPassword.");
      clearUrlParams(); // Limpa URL para garantir navegação limpa
    } catch (error: any) {
      console.error("[LOGIN ERROR]", error);
      
      // Tratamento especial para criar admin automaticamente (DEV only logic mostly)
      if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') && email === ADMIN_EMAIL) {
          const tryCreate = window.confirm(
              `A conta ADMIN '${ADMIN_EMAIL}' ainda não existe no Firebase.\n\nDeseja criar ela AUTOMATICAMENTE agora com essa senha?`
          );
          
          if (tryCreate) {
              try {
                  await auth.createUserWithEmailAndPassword(email, pass);
                  alert("✅ Conta ADMIN criada com sucesso! Você será logado.");
                  clearUrlParams();
                  return;
              } catch (createError: any) {
                  setAuthError("Erro ao criar Admin: " + createError.message);
                  return;
              }
          }
      }

      // Mensagens de erro amigáveis para UI
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
         setAuthError("E-mail ou senha incorretos. Verifique suas credenciais.");
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError("Muitas tentativas falhas. Tente novamente mais tarde ou redefina sua senha.");
      } else if (error.code === 'auth/invalid-email') {
        setAuthError("O formato do e-mail é inválido.");
      } else {
        setAuthError("Erro ao entrar: " + (error.message || "Tente novamente."));
      }
    } finally {
      console.timeEnd("🕒 Tempo Total do Login (Firebase)");
    }
  };

  const handleRegister = async (e: React.FormEvent, rawEmail: string, pass: string) => {
    e.preventDefault();
    setAuthError(null);
    console.time("🕒 Tempo de Registro");
    
    if (!isConfigValid || !auth || !db) {
        setAuthError("Erro de configuração interna.");
        return;
    }

    // Validação de senha mínima
    if (pass.length < 6) {
        setAuthError("A senha deve conter no mínimo 6 caracteres.");
        return;
    }
    
    const email = rawEmail.toLowerCase().trim();
    
    if (email.endsWith("@gmai.com") || email.endsWith("@hotmai.com")) {
        setAuthError("⚠️ ATENÇÃO: Verifique se digitou o e-mail corretamente (ex: gmail.com, hotmail.com).");
        return;
    }

    try {
      // 1. TENTA CRIAR O USUÁRIO PRIMEIRO (Para ganhar permissão de leitura autenticada)
      const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
      const user = userCredential.user;

      // 2. AGORA VERIFICA NO BANCO SE ELE TEM CONVITE (Com permissão de usuário logado)
      if (email !== ADMIN_EMAIL) {
        const q = query(collection(db, "leaders"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          // 3. NÃO ENCONTRADO? DELETA A CONTA CRIADA E DÁ ERRO
          console.warn(`[REGISTER] E-mail ${email} não encontrado na base de líderes. Deletando conta Auth.`);
          await user.delete(); 
          setAuthError(`ACESSO NEGADO: O e-mail "${email}" não possui um convite de líder pré-cadastrado. Solicite ao administrador.`);
          return;
        }

        // 4. ENCONTRADO? VINCULA O UID E FINALIZA
        const leaderDoc = snapshot.docs[0];
        await updateDoc(doc(db, "leaders", leaderDoc.id), { 
          id: user.uid, 
          active: true,
          status: 'approved',
          needs_password_change: false 
        });
        console.log(`✅ [REGISTER] Conta vinculada com sucesso ao líder: ${leaderDoc.id}`);
      }
      
      clearUrlParams(); // Limpa URL para garantir que não volte ao registro
    } catch (error: any) {
      console.error("❌ [ERRO NO REGISTRO]:", error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError("Este e-mail já possui conta cadastrada. Tente fazer login.");
      } else if (error.code === 'auth/operation-not-allowed') {
         setAuthError("O login por E-mail/Senha não está ativado no Firebase.");
      } else if (error.code === 'auth/weak-password') {
         setAuthError("A senha escolhida é muito fraca.");
      } else if (error.code === 'auth/requires-recent-login') {
         setAuthError("Sessão expirada. Atualize a página e tente novamente.");
      } else {
        setAuthError(`Erro ao criar conta: ${error.message}`);
      }
    } finally {
      console.timeEnd("🕒 Tempo de Registro");
    }
  };

  const handleLogout = () => { 
    if(auth) auth.signOut(); 
    else setCurrentUser(null);
    
    // Remove parâmetros da URL para evitar que a tela de "Cadastrar Senha" reapareça
    clearUrlParams();
    
    // Garante que se o usuário sair, a tela volta para Login e não fica travada em Registro
    setAuthViewMode('login');
  };

  const handlePasswordReset = async (email: string) => {
    setAuthError(null);
    if (!email) {
      setAuthError("Digite seu e-mail no campo acima antes de clicar em 'Esqueci minha senha'.");
      return;
    }
    
    if (!auth || !isConfigValid) {
        setAuthError("Sistema Offline. Verifique conexão.");
        return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      alert(`✅ SUCESSO!\n\nLink enviado para: ${email}\nVerifique Caixa de Entrada e Spam.`);
    } catch (error: any) {
      console.error("Erro no reset:", error);
      if (error.code === 'auth/user-not-found') {
          setAuthError("E-mail não encontrado no sistema.");
      } else if (error.code === 'auth/invalid-email') {
          setAuthError("E-mail inválido.");
      } else {
          setAuthError("Erro ao enviar e-mail: " + error.message);
      }
    }
  };

  // Limpa o erro ao trocar de modo
  const toggleAuthMode = (mode: 'login' | 'register') => {
      setAuthError(null);
      setAuthViewMode(mode);
  };

  return {
    initializing,
    currentUser,
    setCurrentUser,
    authViewMode,
    setAuthViewMode: toggleAuthMode,
    authError,
    handleLogin,
    handleRegister,
    handleLogout,
    handlePasswordReset
  };
};
