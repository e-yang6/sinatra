import React, { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
import { Users, Calendar, ThumbsUp, ShieldCheck, Clock, Share, Rocket, Zap, Gem } from 'lucide-react';

// --- Component Interfaces ---
export interface Testimonial {
  id: string | number;
  initials: string;
  name: string;
  role: string;
  quote: string;
  tags: { text: string; type: 'featured' | 'default' }[];
  stats: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; text: string; }[];
  avatarGradient: string;
}

export interface TestimonialStackProps {
  testimonials: Testimonial[];
  /** How many cards to show on each side of the center */
  visibleSides?: number;
  /** Auto-swipe interval in milliseconds (0 to disable) */
  autoSwipeInterval?: number;
}

// --- The Component ---
export const TestimonialStack = ({ testimonials, visibleSides = 1, autoSwipeInterval = 0 }: TestimonialStackProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalCards = testimonials.length;
  const autoSwipeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useCallback((newIndex: number) => {
    setActiveIndex((newIndex + totalCards) % totalCards);
  }, [totalCards]);

  // Auto-swipe functionality
  useEffect(() => {
    if (autoSwipeInterval > 0 && !isDragging) {
      autoSwipeTimerRef.current = setInterval(() => {
        navigate(activeIndex + 1);
      }, autoSwipeInterval);

      return () => {
        if (autoSwipeTimerRef.current) {
          clearInterval(autoSwipeTimerRef.current);
        }
      };
    } else {
      if (autoSwipeTimerRef.current) {
        clearInterval(autoSwipeTimerRef.current);
      }
    }
  }, [activeIndex, autoSwipeInterval, isDragging, navigate]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (index !== activeIndex) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartRef.current = clientX;
    cardRefs.current[activeIndex]?.classList.add('is-dragging');
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragOffset(clientX - dragStartRef.current);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    cardRefs.current[activeIndex]?.classList.remove('is-dragging');
    
    // Smooth threshold with momentum consideration
    const threshold = 80;
    const velocity = Math.abs(dragOffset);
    
    if (velocity > threshold) {
      navigate(activeIndex + (dragOffset < 0 ? 1 : -1));
    }
    
    // Smooth reset with slight delay for better visual flow
    setTimeout(() => {
      setIsDragging(false);
      setDragOffset(0);
    }, 50);
  }, [isDragging, dragOffset, activeIndex, navigate]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);
  
  if (!testimonials?.length) return null;

  return (
    <section className="testimonials-carousel relative w-full h-full flex items-center justify-center overflow-hidden">
      <style>{`
        .testimonials-carousel {
          perspective: 1000px;
        }
        .testimonial-card {
          position: absolute;
          width: 320px;
          border-radius: 0.5rem;
          background: rgba(9, 9, 11, 0.6);
          border: 1px solid rgba(63, 63, 70, 0.5);
          backdrop-filter: blur(16px);
          transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), scale 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          cursor: grab;
          user-select: none;
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .testimonial-card.is-dragging {
          cursor: grabbing;
          transition: transform 0.1s ease-out, opacity 0.1s ease-out;
        }
        .pagination-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(161, 161, 170, 0.4);
          border: none;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .pagination-dot.active {
          background: #6993cf;
          width: 24px;
          border-radius: 4px;
        }
        .pagination-dot:hover {
          background: rgba(59, 130, 246, 0.6);
        }
      `}</style>
      {testimonials.map((testimonial, index) => {
        // Calculate the card's position relative to the active card
        const offset = (index - activeIndex + totalCards) % totalCards;
        const displayOffset = offset > totalCards / 2 ? offset - totalCards : offset;

        // --- DYNAMIC STYLE CALCULATION ---
        const style: CSSProperties = {};
        const cardWidth = 320;
        const gap = 40;
        const baseTranslateX = displayOffset * (cardWidth + gap);
        const centerX = 0;
        
        // Smooth easing for scale and opacity based on distance
        const distance = Math.abs(displayOffset);
        const maxVisibleDistance = visibleSides + 1;
        
        if (displayOffset === 0) { // The active (center) card
          style.transform = `translateX(${centerX + dragOffset}px) scale(1)`;
          style.opacity = 1;
          style.zIndex = totalCards + 1;
          style.pointerEvents = 'auto';
        } else if (distance <= maxVisibleDistance) { // Cards visible on sides
          // Smooth scale curve: starts at 0.95 for adjacent, decreases smoothly
          const scaleProgress = distance / maxVisibleDistance;
          const scale = 1 - (scaleProgress * 0.15); // Scale from 1.0 to 0.85
          
          // Smooth opacity curve: fades more gradually
          const opacityProgress = distance / maxVisibleDistance;
          const opacity = 1 - (opacityProgress * 0.7); // Opacity from 1.0 to 0.3
          
          // Parallax effect: side cards move less when dragging
          const parallaxFactor = 0.4 - (distance * 0.1);
          style.transform = `translateX(${baseTranslateX + dragOffset * Math.max(0.1, parallaxFactor)}px) scale(${scale})`;
          style.opacity = Math.max(0.15, opacity);
          style.zIndex = totalCards - distance;
          style.pointerEvents = distance <= 1 ? 'auto' : 'none';
        } else { // Cards that are out of view
          style.transform = `translateX(${baseTranslateX}px) scale(0.8)`;
          style.opacity = 0;
          style.zIndex = 0;
          style.pointerEvents = 'none';
        }

        const tagClasses = (type: 'featured' | 'default') => type === 'featured' 
          ? 'bg-[#6993cf]/20 text-[#6993cf] border border-[#6993cf]/30' 
          : 'bg-zinc-800 text-zinc-300 border border-zinc-700';
          
        return (
          <div
            ref={el => cardRefs.current[index] = el}
            key={testimonial.id}
            className="testimonial-card"
            style={style}
            onMouseDown={(e) => handleDragStart(e, index)}
            onTouchStart={(e) => handleDragStart(e, index)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-xs" style={{ background: testimonial.avatarGradient }}>
                    {testimonial.initials}
                  </div>
                  <div>
                    <h3 className="text-zinc-100 font-medium text-sm">{testimonial.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{testimonial.role}</p>
                  </div>
                </div>
              </div>
              
              <blockquote className="text-zinc-200 leading-relaxed text-sm mb-4">"{testimonial.quote}"</blockquote>
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-t border-zinc-800 pt-3 gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {testimonial.tags.map((tag, i) => (
                    <span key={i} className={['text-[10px]', 'px-1.5', 'py-0.5', 'rounded', 'border', tagClasses(tag.type)].join(' ')}>
                      {tag.text}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  {testimonial.stats.map((stat, i) => {
                    const IconComponent = stat.icon;
                    return (
                      <span key={i} className="flex items-center">
                        <IconComponent className="mr-1 h-3 w-3" />
                        {stat.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      <div className="pagination flex gap-2 justify-center absolute bottom-0 left-0 right-0">
        {testimonials.map((_, index) => (
          <button key={index} aria-label={`Go to testimonial ${index + 1}`} onClick={() => navigate(index)} className={`pagination-dot ${activeIndex === index ? 'active' : ''}`} />
        ))}
      </div>
    </section>
  );
};
