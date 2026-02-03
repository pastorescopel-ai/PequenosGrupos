
import React, { useState, useRef, useEffect } from 'react';
import { Layers, Maximize2, MousePointer2, Type, Loader2, AlertCircle } from 'lucide-react';
import { UnitLayout, ElementPosition } from '../types';

interface VisualPageBuilderProps {
  layout: UnitLayout;
  headerUrl?: string;
  footerUrl?: string;
  signatureUrl?: string;
  directorName: string;
  directorTitle: string;
  onChange: (newLayout: UnitLayout) => void;
}

const VisualPageBuilder: React.FC<VisualPageBuilderProps> = ({ 
  layout, headerUrl, footerUrl, signatureUrl, directorName, directorTitle, onChange 
}) => {
  const [activeElement, setActiveElement] = useState<keyof UnitLayout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scale = 400 / 210; 

  useEffect(() => {
    const bottomOfHeader = layout.header.y + layout.header.h;
    if (layout.content_y < bottomOfHeader) {
        onChange({ ...layout, content_y: bottomOfHeader });
    }
  }, [layout.header.y, layout.header.h]);

  const handleDrag = (e: React.MouseEvent, element: keyof UnitLayout) => {
    if (element === 'content_y') return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...layout[element] as ElementPosition };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      const newPos = {
        ...startPos,
        x: Math.max(0, Math.min(210 - startPos.w, startPos.x + dx)),
        y: Math.max(0, Math.min(297 - startPos.h, startPos.y + dy)),
      };

      let newContentY = layout.content_y;
      if (element === 'header') {
          const bottomOfNewHeader = newPos.y + newPos.h;
          if (Math.abs(layout.content_y - (startPos.y + startPos.h)) < 2) {
              newContentY = bottomOfNewHeader;
          } else {
              newContentY = Math.max(newContentY, bottomOfNewHeader);
          }
      }

      onChange({ ...layout, [element]: newPos, content_y: newContentY });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setActiveElement(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    setActiveElement(element);
  };

  const handleResize = (e: React.MouseEvent, element: keyof UnitLayout) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = { ...layout[element] as ElementPosition };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dw = (moveEvent.clientX - startX) / scale;
      const dh = (moveEvent.clientY - startY) / scale;

      const newSize = {
        ...startSize,
        w: Math.max(10, startSize.w + dw),
        h: Math.max(5, startSize.h + dh),
      };

      let newContentY = layout.content_y;
      if (element === 'header') {
          const bottomOfHeader = startSize.y + newSize.h;
          newContentY = Math.max(newContentY, bottomOfHeader);
      }

      onChange({
        ...layout,
        [element]: newSize,
        content_y: newContentY
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-10 items-start p-8 bg-slate-50 rounded-[3rem] border border-slate-200 shadow-inner">
      <div 
        ref={containerRef}
        style={{ width: '400px', height: `${297 * scale}px` }}
        className="bg-white shadow-2xl relative border border-slate-300 overflow-hidden shrink-0 select-none"
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '10mm 10mm' }}>
        </div>

        <DraggableBox 
            id="header" 
            label="Cabeçalho" 
            pos={layout.header} 
            scale={scale} 
            active={activeElement === 'header'} 
            onDrag={(e) => handleDrag(e, 'header')} 
            onResize={(e) => handleResize(e, 'header')}
            color="border-blue-500"
            bgColor={layout.header_bg_color || '#ffffff'}
        >
            <div className="w-full h-full p-2 flex items-center justify-start overflow-hidden">
                {headerUrl ? <img src={headerUrl} className="h-full w-auto object-contain pointer-events-none" alt="Header" crossOrigin="anonymous"/> : <div className="flex flex-col items-center justify-center w-full h-full opacity-30"><Layers className="text-blue-500" /><span className="text-[6px] font-black uppercase text-blue-500">Logo</span></div>}
            </div>
        </DraggableBox>

        <DraggableBox 
            id="footer" 
            label="Rodapé" 
            pos={layout.footer} 
            scale={scale} 
            active={activeElement === 'footer'} 
            onDrag={(e) => handleDrag(e, 'footer')} 
            onResize={(e) => handleResize(e, 'footer')}
            color="border-indigo-500"
        >
            {footerUrl ? <img src={footerUrl} className="w-full h-full object-contain pointer-events-none" crossOrigin="anonymous" /> : <Layers className="text-indigo-300" />}
        </DraggableBox>

        <DraggableBox 
            id="signature" 
            label="Assinatura" 
            pos={layout.signature} 
            scale={scale} 
            active={activeElement === 'signature'} 
            onDrag={(e) => handleDrag(e, 'signature')} 
            onResize={(e) => handleResize(e, 'signature')}
            color="border-emerald-500"
            forceCenter
        >
            {signatureUrl ? <img src={signatureUrl} className="w-full h-full object-contain pointer-events-none" crossOrigin="anonymous" /> : <Maximize2 className="text-emerald-300" />}
        </DraggableBox>

        <DraggableBox 
            id="director_name_pos" 
            label="Nome Diretor" 
            pos={layout.director_name_pos} 
            scale={scale} 
            active={activeElement === 'director_name_pos'} 
            onDrag={(e) => handleDrag(e, 'director_name_pos')} 
            onResize={(e) => handleResize(e, 'director_name_pos')}
            color="border-purple-500"
            forceCenter
        >
            <span className="text-[7px] font-black text-purple-700 truncate px-1 text-center uppercase leading-none">{directorName || 'NOME DIRETOR'}</span>
        </DraggableBox>

        <DraggableBox 
            id="director_title_pos" 
            label="Cargo Diretor" 
            pos={layout.director_title_pos} 
            scale={scale} 
            active={activeElement === 'director_title_pos'} 
            onDrag={(e) => handleDrag(e, 'director_title_pos')} 
            onResize={(e) => handleResize(e, 'director_title_pos')}
            color="border-orange-500"
            forceCenter
        >
            <span className="text-[6px] font-bold text-orange-700 truncate px-1 text-center uppercase leading-none">{directorTitle || 'CARGO'}</span>
        </DraggableBox>

        {/* Simulação dos Cards - AGORA LIMITADO A 3 */}
        <div style={{ top: `${layout.content_y * scale}px`, width: '100%' }} className="absolute left-0 pointer-events-none space-y-[2mm]">
            {[1, 2, 3].map(i => (
                <div key={i} style={{ height: `${50 * scale}px`, marginLeft: `${10 * scale}px`, marginRight: `${10 * scale}px`, width: `${190 * scale}px` }} className="border-2 border-dashed border-red-200 bg-red-500/5 flex flex-col items-center justify-center rounded-2xl">
                    <span className="text-[7px] font-black text-red-300 uppercase">Espaço Card {i}</span>
                </div>
            ))}
        </div>

        <div style={{ top: `${layout.content_y * scale}px` }} className="absolute left-0 right-0 border-t-2 border-red-600 flex items-center justify-center z-40">
            <div onMouseDown={(e) => {
                    const startY = e.clientY;
                    const startVal = layout.content_y;
                    const onMove = (mv: MouseEvent) => {
                        const dy = (mv.clientY - startY) / scale;
                        onChange({ ...layout, content_y: Math.max(layout.header.y + layout.header.h, Math.min(200, startVal + dy)) });
                    };
                    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                }}
                className="bg-red-600 text-white text-[8px] font-black px-5 py-2 rounded-full cursor-ns-resize shadow-2xl -mt-3.5 border-2 border-white flex items-center gap-2"
            >
                <MousePointer2 size={10}/> ÂNCORA MAGNÉTICA
            </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 w-full text-left">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h4 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6 uppercase tracking-tight">
                <MousePointer2 className="text-blue-600" /> Precisão de Composição
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SectionCoord label="Header" color="bg-blue-50 text-blue-600" pos={layout.header} onChange={p => onChange({...layout, header: p})} />
                <SectionCoord label="Footer" color="bg-indigo-50 text-indigo-600" pos={layout.footer} onChange={p => onChange({...layout, footer: p})} />
                <SectionCoord label="Assinatura" color="bg-emerald-50 text-emerald-600" pos={layout.signature} onChange={p => onChange({...layout, signature: p})} />
                <SectionCoord label="Diretor (Nome)" color="bg-purple-50 text-purple-600" pos={layout.director_name_pos} onChange={p => onChange({...layout, director_name_pos: p})} />
                <SectionCoord label="Diretor (Cargo)" color="bg-orange-50 text-orange-600" pos={layout.director_title_pos} onChange={p => onChange({...layout, director_title_pos: p})} />
            </div>
        </div>
        <div className="bg-blue-950 text-white p-8 rounded-[2.5rem] shadow-xl border border-blue-900">
            <h5 className="font-black text-xs uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2"><Type size={16}/> Limite de 3 Unidades</h5>
            <p className="text-[11px] text-blue-100/60 leading-relaxed font-medium">O PDF foi configurado para exibir no máximo 3 cards por folha. Isso evita que os dados ultrapassem a área da assinatura e do cargo do diretor.</p>
        </div>
      </div>
    </div>
  );
};

const DraggableBox = ({ pos, scale, active, onDrag, onResize, label, children, color, bgColor, forceCenter }: any) => (
    <div 
      onMouseDown={onDrag}
      style={{
        left: forceCenter ? `${(105 - (pos.w / 2)) * scale}px` : `${pos.x * scale}px`,
        top: `${pos.y * scale}px`,
        width: `${pos.w * scale}px`,
        height: `${pos.h * scale}px`,
        backgroundColor: bgColor || 'rgba(255,255,255,0.05)'
      }}
      className={`absolute border-2 cursor-move flex items-center justify-center transition-shadow group overflow-hidden ${active ? `${color} bg-white/40 z-30 shadow-2xl` : 'border-slate-200 hover:border-slate-400 z-10'}`}
    >
      {children}
      <div onMouseDown={onResize} className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-800 rounded-full cursor-nwse-resize border-2 border-white shadow-sm opacity-0 group-hover:opacity-100"></div>
      <span className="absolute -top-5 left-0 text-[7px] font-black uppercase text-slate-400 bg-white px-1 whitespace-nowrap">{label}</span>
    </div>
);

const SectionCoord = ({ label, color, pos, onChange }: { label: string, color: string, pos: ElementPosition, onChange: (p: ElementPosition) => void }) => (
    <div className={`p-4 rounded-2xl border border-slate-100 ${color.split(' ')[0]}`}>
        <p className={`text-[9px] font-black uppercase mb-3 tracking-widest ${color.split(' ')[1]}`}>{label}</p>
        <div className="grid grid-cols-4 gap-2">
            <CoordInput label="X" value={pos.x} onChange={v => onChange({...pos, x: v})} />
            <CoordInput label="Y" value={pos.y} onChange={v => onChange({...pos, y: v})} />
            <CoordInput label="L" value={pos.w} onChange={v => onChange({...pos, w: v})} />
            <CoordInput label="A" value={pos.h} onChange={v => onChange({...pos, h: v})} />
        </div>
    </div>
);

const CoordInput = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
    <div className="space-y-1">
        <label className="text-[7px] font-black text-slate-400 uppercase text-center block">{label}</label>
        <input type="number" value={value.toFixed(0)} onChange={e => onChange(Number(e.target.value))} className="w-full px-1 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-[9px] outline-none text-center focus:ring-2 focus:ring-blue-500/20" />
    </div>
);

export default VisualPageBuilder;
