
import React, { useState, useEffect } from 'react';
import { Hospital, User, KeyRound, AlertTriangle, Info, ShieldAlert, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { GLOBAL_BRAND_LOGO } from '../assets_base64';

interface AuthScreenProps {
  mode: 'login' | 'register';
  onSubmit: (e: React.FormEvent, email: string, pass: string) => void;
  onToggleMode: () => void;
  isConfigValid: boolean;
  onForgotPassword?: (email: string) => void;
  error?: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ mode, onSubmit, onToggleMode, isConfigValid, onForgotPassword, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get('email');
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, []);

  const handleForgotPasswordClick = () => {
    if (onForgotPassword) {
      onForgotPassword(email);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-6 relative overflow-hidden text-left">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80')] bg-cover opacity-5 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10 animate-in zoom-in-95 duration-500 border border-slate-100">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-block mb-6">
            {GLOBAL_BRAND_LOGO ? (
              <img src={GLOBAL_BRAND_LOGO} alt="App Logo" className="h-20 w-auto object-contain drop-shadow-xl" />
            ) : (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-[2rem] text-white shadow-xl shadow-blue-200">
                <Hospital size={40}/>
              </div>
            )}
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pequenos Grupos</h2>
          <p className="text-slate-400 font-medium text-sm mt-2 tracking-tight">Sistema Hospitalar Adventista</p>
        </div>
        
        <form className="space-y-6" onSubmit={(e) => onSubmit(e, email, password)}>
          {!isConfigValid && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 mb-4">
               <AlertTriangle className="text-red-600 shrink-0" size={18} />
               <p className="text-[10px] text-red-800 font-medium leading-relaxed">
                 <b>Atenção:</b> O Banco de Dados não está conectado.
               </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 mb-4 animate-in slide-in-from-top-2 fade-in">
               <AlertCircle className="text-red-600 shrink-0" size={18} />
               <p className="text-xs text-red-700 font-bold leading-relaxed">
                 {error}
               </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6 animate-in fade-in">
               <div className="flex items-center gap-2 mb-2">
                 <ShieldAlert className="text-blue-600" size={18} />
                 <p className="text-[10px] text-blue-800 font-black uppercase">Criar Senha de Acesso</p>
               </div>
               <p className="text-xs text-blue-900 leading-relaxed font-medium">
                 Utilize o <b>mesmo e-mail</b> onde você recebeu o convite.
               </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail Corporativo</label>
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                <User size={22}/>
              </div>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value.trim())} 
                required 
                disabled={!isConfigValid} 
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-600 focus:bg-white transition-all text-slate-800 disabled:opacity-50 text-base" 
                placeholder="nome@hospital.com"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {mode === 'login' ? 'Senha de Acesso' : 'Crie sua Senha'}
                </label>
            </div>
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                 <KeyRound size={22}/>
              </div>
              <input 
                 type={showPassword ? "text" : "password"} 
                 value={password} 
                 onChange={e => setPassword(e.target.value)} 
                 required 
                 disabled={!isConfigValid} 
                 className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-600 focus:bg-white transition-all text-slate-800 disabled:opacity-50 text-base" 
                 placeholder="••••••••"
                 autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-center text-slate-300 hover:text-slate-500 active:scale-95 transition-all"
              >
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>
            
            {mode === 'register' ? (
                <p className="text-[10px] text-slate-400 font-bold px-2 flex items-center gap-1 mt-1">
                  <Info size={12}/> Mínimo de 6 caracteres.
                </p>
            ) : (
              <div className="flex justify-end pt-1">
                <button 
                  type="button" 
                  onClick={handleForgotPasswordClick}
                  className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wide py-2"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
          </div>
          
          <button type="submit" disabled={!isConfigValid} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {mode === 'login' ? 'Acessar App' : 'Confirmar Cadastro'}
            <ArrowRight size={16} />
          </button>

          {mode === 'login' ? (
             <div className="pt-6 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  onClick={onToggleMode} 
                  className="w-full py-4 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  Primeiro Acesso? Cadastrar <ArrowRight size={14} />
                </button>
             </div>
          ) : (
             <button type="button" onClick={onToggleMode} className="w-full text-center text-xs font-bold text-slate-400 hover:text-blue-600 mt-4 underline decoration-2 decoration-transparent hover:decoration-blue-600 transition-all py-3">
               Já tenho senha, voltar para Login
             </button>
          )}
        </form>

        <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full">
               {isConfigValid ? (
                 <><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online</>
               ) : (
                 <><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div> Offline</>
               )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
