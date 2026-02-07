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
  /** How many cards to show behind the main card */
  visibleBehind?: number;
  /** Auto-swipe interval in milliseconds (0 to disable) */
  autoSwipeInterval?: number;
}

// --- The Component ---
export const TestimonialStack = ({ testimonials, visibleBehind = 2, autoSwipeInterval = 0 }: TestimonialStackProps) => {
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
    if (Math.abs(dragOffset) > 50) {
      navigate(activeIndex + (dragOffset < 0 ? 1 : -1));
    }
    setIsDragging(false);
    setDragOffset(0);
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
    <section className="testimonials-stack relative pb-10 w-full h-full flex items-center justify-center">
      <style>{`
        .testimonials-stack {
          perspective: 1000px;
        }
        .testimonial-card {
          position: absolute;
          width: 90%;
          max-width: 500px;
          border-radius: 1.5rem;
          background: rgba(9, 9, 11, 0.6);
          border: 1px solid rgba(63, 63, 70, 0.5);
          backdrop-filter: blur(16px);
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;
          cursor: grab;
          user-select: none;
        }
        .testimonial-card.is-dragging {
          cursor: grabbing;
          transition: none;
        }
        .pagination-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(161, 161, 170, 0.4);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .pagination-dot.active {
          background: #c9a961;
          width: 24px;
          border-radius: 4px;
        }
      `}</style>
      {testimonials.map((testimonial, index) => {
        const isActive = index === activeIndex;
        // Calculate the card's position in the display order
        const displayOrder = (index - activeIndex + totalCards) % totalCards;

        // --- DYNAMIC STYLE CALCULATION ---
        const style: CSSProperties = {};
        if (displayOrder === 0) { // The active card
          style.transform = `translateX(${dragOffset}px)`;
          style.opacity = 1;
          style.zIndex = totalCards;
        } else if (displayOrder <= visibleBehind) { // Cards stacked behind
          const scale = 1 - 0.05 * displayOrder;
          const translateY = -2 * displayOrder; // in rem
          style.transform = `scale(${scale}) translateY(${translateY}rem)`;
          style.opacity = 1 - 0.2 * displayOrder;
          style.zIndex = totalCards - displayOrder;
        } else { // Cards that are out of view
          style.transform = 'scale(0)';
          style.opacity = 0;
          style.zIndex = 0;
        }

        const tagClasses = (type: 'featured' | 'default') => type === 'featured' 
          ? 'bg-[#c9a961]/20 text-[#c9a961] border border-[#c9a961]/30' 
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
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-base" style={{ background: testimonial.avatarGradient }}>
                    {testimonial.initials}
                  </div>
                  <div>
                    <h3 className="text-zinc-100 font-medium text-lg">{testimonial.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1">{testimonial.role}</p>
                  </div>
                </div>
              </div>
              
              <blockquote className="text-zinc-200 leading-relaxed text-lg mb-6">"{testimonial.quote}"</blockquote>
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-t border-zinc-800 pt-4 gap-4">
                <div className="flex flex-wrap gap-2">
                  {testimonial.tags.map((tag, i) => (
                    <span key={i} className={['text-xs', 'px-2', 'py-1', 'rounded-md', 'border', tagClasses(tag.type)].join(' ')}>
                      {tag.text}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {testimonial.stats.map((stat, i) => {
                    const IconComponent = stat.icon;
                    return (
                      <span key={i} className="flex items-center">
                        <IconComponent className="mr-1.5 h-3.5 w-3.5" />
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
