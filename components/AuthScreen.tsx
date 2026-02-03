
import React, { useState, useEffect } from 'react';
import { User, KeyRound, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get('email');
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      await onSubmit(e, email, password);
      setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 md:p-6 relative overflow-hidden text-left font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80')] bg-cover opacity-[0.03] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] relative z-10 animate-in zoom-in-95 duration-500 border border-slate-100">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-block mb-6 relative">
            {GLOBAL_BRAND_LOGO ? (
              <img src={GLOBAL_BRAND_LOGO} alt="App Logo" className="h-24 w-auto object-contain drop-shadow-lg" />
            ) : (
              <div className="text-6xl filter drop-shadow-md animate-[wiggle_3s_ease-in-out_infinite]">
                🏥
              </div>
            )}
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Pequenos Grupos</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Gestão Hospitalar</p>
        </div>
        
        <form className="space-y-5" onSubmit={handleSubmit}>
          {!isConfigValid && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-4 mb-4">
               <span className="text-2xl">🔌</span>
               <p className="text-[10px] text-red-800 font-bold leading-tight"><b>Offline:</b> Banco de dados desconectado.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-4 mb-4 animate-in slide-in-from-top-2 fade-in">
               <span className="text-2xl filter drop-shadow-sm">🚫</span>
               <p className="text-xs text-red-700 font-bold leading-tight">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail Corporativo</label>
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <User size={20}/>
              </div>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value.trim())} 
                required 
                disabled={!isConfigValid} 
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500 focus:bg-white transition-all text-slate-800 disabled:opacity-50 text-sm placeholder:text-slate-300" 
                placeholder="nome@hospital.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Senha</label>
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center text-slate-300 group-focus-within:text-blue-500 transition-colors">
                 <KeyRound size={20}/>
              </div>
              <input 
                 type={showPassword ? "text" : "password"} 
                 value={password} 
                 onChange={e => setPassword(e.target.value)} 
                 required 
                 disabled={!isConfigValid} 
                 className="w-full pl-14 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500 focus:bg-white transition-all text-slate-800 disabled:opacity-50 text-sm placeholder:text-slate-300" 
                 placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 bottom-0 w-14 flex items-center justify-center text-slate-300 hover:text-slate-500 active:scale-95 transition-all"
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div>
          
          <button type="submit" disabled={!isConfigValid || isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 mt-4 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (
                mode === 'login' ? <>Entrar <ArrowRight size={16}/></> : <>Criar Conta <span className="text-base">✨</span></>
            )}
          </button>

          <div className="flex justify-center mt-4">
             <button type="button" onClick={onToggleMode} className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-all">
                {mode === 'login' ? 'Primeiro acesso? Crie sua conta' : 'Já tenho senha, voltar para Login'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
