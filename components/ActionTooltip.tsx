
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ActionTooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const ActionTooltip: React.FC<ActionTooltipProps> = ({ content, children, side = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  // Calcula a posição fixa na tela baseada no elemento gatilho
  const updatePosition = () => {
    if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        
        const gap = 10; // Distância do tooltip
        let top = 0;
        let left = 0;

        switch(side) {
            case 'top':
                top = rect.top - gap;
                left = rect.left + (rect.width / 2);
                break;
            case 'bottom':
                top = rect.bottom + gap;
                left = rect.left + (rect.width / 2);
                break;
            case 'left':
                top = rect.top + (rect.height / 2);
                left = rect.left - gap;
                break;
            case 'right':
                top = rect.top + (rect.height / 2);
                left = rect.right + gap;
                break;
        }
        setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  // Recalcula posição ao rolar a página ou redimensionar
  useEffect(() => {
    if (isVisible) {
        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);
    }
    return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  // Classes para centralizar o tooltip baseado no ponto de ancoragem
  const transformClasses = {
      top: '-translate-x-1/2 -translate-y-full',
      bottom: '-translate-x-1/2',
      left: '-translate-x-full -translate-y-1/2',
      right: '-translate-y-1/2'
  };

  // Classes para a setinha (arrow)
  const arrowClasses = {
      top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
      bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
      left: 'right-[-4px] top-1/2 -translate-y-1/2',
      right: 'left-[-4px] top-1/2 -translate-y-1/2'
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={() => setIsVisible(false)}
        className="relative inline-flex"
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div 
            className={`fixed z-[9999] pointer-events-none ${transformClasses[side]}`}
            style={{ 
                top: coords.top, 
                left: coords.left 
            }}
        >
             <div className="bg-slate-800 text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl text-center leading-relaxed relative animate-in fade-in zoom-in-95 duration-150 max-w-[200px] whitespace-normal">
                {content}
                {/* Seta do Tooltip */}
                <div className={`absolute w-2 h-2 bg-slate-800 transform rotate-45 ${arrowClasses[side]}`}></div>
             </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ActionTooltip;
