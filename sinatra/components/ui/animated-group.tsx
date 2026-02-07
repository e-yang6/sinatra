import { ReactNode, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import React from 'react';

type PresetType =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'blur'
  | 'blur-slide'
  | 'zoom'
  | 'flip'
  | 'bounce'
  | 'rotate'
  | 'swing';

type AnimatedGroupProps = {
  children: ReactNode;
  className?: string;
  variants?: {
    container?: any;
    item?: any;
  };
  preset?: PresetType;
};

const presetStyles: Record<PresetType, { hidden: React.CSSProperties; visible: React.CSSProperties }> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slide: {
    hidden: { opacity: 0, transform: 'translateY(20px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  scale: {
    hidden: { opacity: 0, transform: 'scale(0.8)' },
    visible: { opacity: 1, transform: 'scale(1)' },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(4px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  },
  'blur-slide': {
    hidden: { opacity: 0, filter: 'blur(4px)', transform: 'translateY(20px)' },
    visible: { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' },
  },
  zoom: {
    hidden: { opacity: 0, transform: 'scale(0.5)' },
    visible: { opacity: 1, transform: 'scale(1)' },
  },
  flip: {
    hidden: { opacity: 0, transform: 'rotateX(-90deg)' },
    visible: { opacity: 1, transform: 'rotateX(0)' },
  },
  bounce: {
    hidden: { opacity: 0, transform: 'translateY(-50px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  rotate: {
    hidden: { opacity: 0, transform: 'rotate(-180deg)' },
    visible: { opacity: 1, transform: 'rotate(0)' },
  },
  swing: {
    hidden: { opacity: 0, transform: 'rotate(-10deg)' },
    visible: { opacity: 1, transform: 'rotate(0)' },
  },
};

export function AnimatedGroup({
  children,
  className,
  variants,
  preset,
}: AnimatedGroupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const styles = preset ? presetStyles[preset] : presetStyles.fade;

  return (
    <div className={cn(className)}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          style={{
            ...(visible ? styles.visible : styles.hidden),
            transition: `all 0.4s ease ${index * 0.1}s`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
