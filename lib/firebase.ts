
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const getEnv = (key: string, fallback: string) => {
  try {
    const val = (import.meta as any).env?.[key];
    if (val) return val;
    // Log discreto para avisar que está usando fallback
    console.debug(`[CONFIG] Var ${key} não encontrada. Usando fallback.`);
    return fallback;
  } catch {
    return fallback;
  }
};

// Configuração do projeto
const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyBXzx_Z2u0wpC32wc1Dnvwr9A1cUXScngo"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "pequenos-grupos-46c0d.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "pequenos-grupos-46c0d"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "pequenos-grupos-46c0d.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "330521787368"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:330521787368:web:c4e03cb0baed5d7fb4025d")
};

// Log de Diagnóstico (Seguro - esconde parte da API Key)
console.log("--- [DEBUG] FIREBASE CONFIG ---");
console.log("Project ID:", firebaseConfig.projectId);
console.log("Auth Domain:", firebaseConfig.authDomain);
console.log("API Key Carregada:", firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : "NÃO ENCONTRADA");
console.log("-------------------------------");

// Verificação de segurança
const isConfigValid = !!firebaseConfig.apiKey && 
                      !firebaseConfig.apiKey.includes("const firebaseConfig") && 
                      !firebaseConfig.apiKey.includes("SUA_API_KEY");

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isConfigValid) {
  try {
    // Inicializa apenas se não houver apps já inicializados (usando compat)
    app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
    
    // Inicializa serviços
    auth = firebase.auth();
    // Usa a instância do app compat com as funções modulares (geralmente suportado)
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log("✅ Firebase inicializado com sucesso.");
  } catch (error) {
    console.error("❌ Erro CRÍTICO ao inicializar Firebase:", error);
  }
} else {
  console.warn("⚠️ Configuração do Firebase inválida ou ausente.");
}

export { auth, db, storage, isConfigValid };
