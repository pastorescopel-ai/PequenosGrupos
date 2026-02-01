
import React, { useState } from 'react';
import { X, HelpCircle, BookOpen, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { UserRole } from '../types';

interface HelpSystemProps {
  role: UserRole;
  onClose: () => void;
}

const FAQ_DATA = {
  ADMIN: [
    {
      category: "Gestão de Pessoas",
      questions: [
        {
          q: "Qual a diferença entre Inativar e Remover um Capelão?",
          a: "Inativar (Ícone de Usuário): O capelão permanece no banco de dados e mantém seu histórico de visitas, mas não aparecerá mais na lista de seleção para novas escalas. Use isso para férias ou licenças.\n\nRemover (Ícone de Lixeira): Exclui o vínculo de capelania. Só deve ser usado se o cadastro foi feito errado ou se não há histórico importante vinculado."
        },
        {
          q: "Como promover um Colaborador a Líder?",
          a: "Vá em 'Cadastro de Líderes' > 'Novo Líder'. Se o colaborador for interno (CLT), digite a matrícula para puxar os dados. Se for externo/voluntário, marque a opção 'Externo'."
        }
      ]
    },
    {
      category: "Importação de Dados",
      questions: [
        {
          q: "Como funciona a importação de Setores e PGs?",
          a: "O sistema aceita colar dados direto do Excel. Basta selecionar a coluna de nomes ou códigos e colar na caixa de texto. O sistema detecta automaticamente separadores como ponto e vírgula ou tabulação."
        }
      ]
    }
  ],
  LIDER: [
    {
      category: "Reuniões e Frequência",
      questions: [
        {
          q: "Até quando posso enviar a foto do PG?",
          a: "A foto deve ser enviada preferencialmente no dia da reunião ou até o final da semana corrente (Sábado). O sistema contabiliza a presença baseada na semana do envio."
        },
        {
          q: "Minha foto não está carregando, o que fazer?",
          a: "Verifique sua conexão. O sistema otimiza as imagens automaticamente, mas arquivos muito pesados (>10MB) podem demorar. Tente tirar a foto direto pelo aplicativo se estiver no celular."
        }
      ]
    },
    {
      category: "Membros",
      questions: [
        {
          q: "Como adicionar um novo membro ao meu PG?",
          a: "Vá na aba 'Membros' e clique em 'Vincular Membro'. Digite o nome ou matrícula. Se o membro já estiver em outro PG, o sistema avisará."
        },
        {
          q: "Um membro saiu do setor, como proceder?",
          a: "Clique no card do membro e selecione 'Alteração de Membro'. Escolha o motivo (ex: Transferência). Isso enviará um pedido para a Capelania validar a mudança."
        }
      ]
    }
  ],
  CAPELAO: [
    {
      category: "Escalas",
      questions: [
        {
            q: "Como confirmar uma visita?",
            a: "Acesse a aba 'Escala Pastoral'. Você verá os pedidos pendentes. Clique no card e confirme sua disponibilidade."
        }
      ]
    }
  ]
};

const HelpSystem: React.FC<HelpSystemProps> = ({ role, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const data = FAQ_DATA[role as keyof typeof FAQ_DATA] || FAQ_DATA['LIDER'];

  const toggleAccordion = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  const filteredData = data.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
        q.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-8 bg-blue-600 text-white flex justify-between items-start shrink-0">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-white/20 rounded-xl"><HelpCircle size={24}/></div>
                 <h2 className="text-2xl font-black tracking-tight">Central de Ajuda</h2>
              </div>
              <p className="text-blue-100 text-sm font-medium ml-1">Guia completo para {role === 'ADMIN' ? 'Administradores' : role === 'CAPELAO' ? 'Capelães' : 'Líderes de PG'}</p>
           </div>
           <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
              <X size={24}/>
           </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
              <input 
                type="text" 
                placeholder="Qual sua dúvida hoje?" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
              />
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
           {filteredData.length === 0 ? (
             <div className="text-center py-20 opacity-50">
                <BookOpen size={48} className="mx-auto mb-4 text-slate-300"/>
                <p className="font-bold text-slate-400">Nenhum resultado encontrado para "{searchTerm}"</p>
             </div>
           ) : (
             <div className="space-y-8">
                {filteredData.map((category, catIdx) => (
                   <div key={catIdx}>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">{category.category}</h3>
                      <div className="space-y-3">
                         {category.questions.map((item, qIdx) => {
                            const id = `${catIdx}-${qIdx}`;
                            const isOpen = openIndex === id;
                            return (
                               <div key={id} className={`border rounded-2xl transition-all duration-300 overflow-hidden ${isOpen ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                  <button 
                                    onClick={() => toggleAccordion(id)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                  >
                                     <span className={`font-bold text-sm ${isOpen ? 'text-blue-800' : 'text-slate-700'}`}>{item.q}</span>
                                     {isOpen ? <ChevronUp size={18} className="text-blue-500"/> : <ChevronDown size={18} className="text-slate-300"/>}
                                  </button>
                                  {isOpen && (
                                     <div className="px-5 pb-5 animate-in slide-in-from-top-2">
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">{item.a}</p>
                                     </div>
                                  )}
                               </div>
                            );
                         })}
                      </div>
                   </div>
                ))}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 text-center shrink-0">
           <p className="text-[10px] text-slate-400 font-bold uppercase">Ainda precisa de ajuda? Contate o suporte da Capelania.</p>
        </div>
      </div>
    </div>
  );
};

export default HelpSystem;
