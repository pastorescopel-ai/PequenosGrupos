
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const getEnv = (key: string, fallback: string) => {
  try {
    const val = (import.meta as any).env?.[key];
    if (val) return val;
    return fallback;
  } catch {
    return fallback;
  }
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyBXzx_Z2u0wpC32wc1Dnvwr9A1cUXScngo"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "pequenos-grupos-46c0d.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "pequenos-grupos-46c0d"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "pequenos-grupos-46c0d.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "330521787368"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:330521787368:web:c4e03cb0baed5d7fb4025d")
};

// Verificação de segurança
const isConfigValid = !!firebaseConfig.apiKey && 
                      !firebaseConfig.apiKey.includes("SUA_API_KEY");

let auth: any = null;
let db: any = null;
let storage: any = null;

if (isConfigValid) {
  try {
    // Inicializa o app e garante que temos a instância única
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Obtém os serviços a partir da instância do app
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log("✅ Firebase inicializado com sucesso via GStatic.");
  } catch (error) {
    console.error("❌ Erro ao inicializar serviços do Firebase:", error);
  }
}

export { auth, db, storage, isConfigValid };
