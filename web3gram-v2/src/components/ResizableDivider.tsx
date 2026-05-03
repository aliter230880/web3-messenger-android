import { useState, useCallback, useEffect, useRef } from 'react';

interface ResizableDividerProps {
  onResize: (width: number) => void;
  minWidth: number;
  maxWidth: number;
}

export function ResizableDivider({ onResize, minWidth, maxWidth }: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    
    const newWidth = e.clientX;
    console.log('Resizing to:', newWidth);
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      onResize(newWidth);
    }
  }, [isDragging, minWidth, maxWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.overflowX = 'hidden';
      
      window.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true });
      window.addEventListener('mouseup', handleMouseUp, { capture: true });
      
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.overflowX = '';
        window.removeEventListener('mousemove', handleMouseMove, { capture: true });
        window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={dividerRef}
      onMouseDown={handleMouseDown}
      className={`w-4 h-full cursor-col-resize hover:bg-[#3390ec]/20 transition-colors flex items-center justify-center group relative z-50 ${
        isDragging ? 'bg-[#3390ec]/40' : 'bg-transparent'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Visible divider line */}
      <div className={`w-0.5 h-full transition-all ${
        isDragging ? 'bg-[#3390ec] w-1' : 'bg-gray-400 group-hover:bg-[#3390ec]'
      }`} />
      
      {/* Handle grip indicator */}
      <div className={`absolute top-1/2 -translate-y-1/2 flex flex-col gap-1.5 transition-opacity pointer-events-none ${
        isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div className="w-1 h-1 bg-[#3390ec] rounded-full" />
        <div className="w-1 h-1 bg-[#3390ec] rounded-full" />
        <div className="w-1 h-1 bg-[#3390ec] rounded-full" />
      </div>
    </div>
  );
}
