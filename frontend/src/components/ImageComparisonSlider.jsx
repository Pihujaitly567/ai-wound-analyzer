import { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, Calendar } from 'lucide-react';

export default function ImageComparisonSlider({ beforeImage, afterImage, beforeDate, afterDate }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (event) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    let x;
    if (event.touches) {
      x = event.touches[0].clientX - left;
    } else {
      x = event.clientX - left;
    }
    const position = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(position);
  };

  const handleMouseDown = (e) => {
    const handleMouseMove = (mouseEvent) => handleMove(mouseEvent);
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    const handleTouchMove = (touchEvent) => handleMove(touchEvent);
    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="glass-card mb-8 p-6 md:p-8 bg-white/70 shadow-sm relative overflow-hidden">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <ArrowLeftRight className="text-indigo-500" /> Visual Healing Progress
      </h3>

      <div 
        ref={containerRef}
        className="relative w-full aspect-video rounded-2xl overflow-hidden cursor-crosshair select-none bg-slate-100 shadow-inner group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* BEFORE IMAGE (Bottom Layer) */}
        <div className="absolute inset-0">
          <img src={beforeImage} alt="Day 1" className="w-full h-full object-cover" draggable={false} />
          <div className="absolute top-4 left-4 bg-slate-900/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 z-0">
            <Calendar size={14} /> Day 1 {beforeDate && `(${beforeDate})`}
          </div>
        </div>

        {/* AFTER IMAGE (Top Layer, Clipped) */}
        <div 
          className="absolute inset-0" 
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img src={afterImage} alt="Latest" className="w-full h-full object-cover" draggable={false} />
        </div>
        
        {/* LATEST BADGE (Needs to be outside the clipped div but respect slider side) */}
        <div className="absolute top-4 right-4 bg-health-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 z-0">
          <Calendar size={14} /> Latest {afterDate && `(${afterDate})`}
        </div>

        {/* DRAG HANDLE */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize shadow-[0_0_10px_rgba(0,0,0,0.3)] z-10 transition-transform duration-75"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.3)] text-indigo-500 transition-transform hover:scale-110">
            <ArrowLeftRight size={20} className={isHovered ? 'animate-pulse' : ''} />
          </div>
        </div>
      </div>
      <p className="text-center text-sm font-medium text-slate-500 mt-4">Drag the slider to compare original condition to current progress</p>
    </div>
  );
}
