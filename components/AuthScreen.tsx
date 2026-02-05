
import React, { useState, useEffect } from 'react';
import { User, KeyRound, ArrowRight, Eye, EyeOff, Loader2, HelpCircle } from 'lucide-react';
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
    if (urlEmail) setEmail(urlEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await onSubmit(e, email, password);
      } finally {
        setIsSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 md:p-6 relative overflow-hidden text-left font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80')] bg-cover opacity-[0.03] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-white p-7 md:p-12 rounded-[2.5rem] shadow-2xl relative z-10 animate-in zoom-in-95 duration-500 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-block mb-4 relative">
            <img src={GLOBAL_BRAND_LOGO} alt="App Logo" className="h-20 md:h-24 w-auto object-contain drop-shadow-lg" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Pequenos Grupos</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestão Ministerial Hospitalar</p>
        </div>
        
        <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit} autoComplete="on">
          {error && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start gap-3 mb-2 animate-in slide-in-from-top-2">
               <span className="text-xl shrink-0">⚠️</span>
               <div><p className="text-xs text-red-800 font-bold leading-tight">{error}</p></div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail Corporativo</label>
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <User size={18}/>
              </div>
              <input 
                type="email" 
                name="email"
                inputMode="email"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                disabled={!isConfigValid || isSubmitting} 
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-bold focus:border-blue-500 focus:bg-white transition-all text-slate-800 disabled:opacity-50 text-base" 
                placeholder="nome@hospital.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
                {mode === 'login' && (
                    <button type="button" onClick={() => email ? onForgotPassword?.(email) : alert("Digite seu e-mail.")} className="text-[9px] font-black uppercase text-blue-600 hover:underline">Esqueceu?</button>
                )}
            </div>
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-300 group-focus-within:text-blue-500 transition-colors">
                 <KeyRound size={18}/>
              </div>
              <input 
                 type={showPassword ? "text" : "password"} 
                 name="password"
                 value={password} 
                 onChange={e => setPassword(e.target.value)} 
                 required 
                 disabled={!isConfigValid || isSubmitting} 
                 className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none font-bold focus:border-blue-500 focus:bg-white transition-all text-slate-800 disabled:opacity-50 text-base" 
                 placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-300 hover:text-slate-500 active:scale-95 transition-all"
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div>
          
          <button type="submit" disabled={!isConfigValid || isSubmitting} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 mt-4 disabled:opacity-50 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (
                mode === 'login' ? <>Entrar Agora <ArrowRight size={16}/></> : <>Criar Minha Conta <span className="text-base">✨</span></>
            )}
          </button>

          <div className="flex flex-col items-center gap-3 mt-6">
             <button type="button" onClick={onToggleMode} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all">
                {mode === 'login' ? 'Novo por aqui? Cadastre-se' : 'Já sou Líder, entrar'}
             </button>
             <div className="flex items-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-4">
                <HelpCircle size={12} /> Suporte: capelania@hospital.com
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
