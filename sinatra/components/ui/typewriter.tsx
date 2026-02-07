import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

interface TypewriterProps {
  /** Static prefix text shown before the rotating word */
  prefix: string;
  /** Array of words that rotate in/out */
  words: string[];
  speed?: number;
  deleteSpeed?: number;
  waitTime?: number;
  initialDelay?: number;
  loop?: boolean;
  className?: string;
  wordClassName?: string;
  showCursor?: boolean;
  cursorChar?: string | React.ReactNode;
  cursorClassName?: string;
}

const Typewriter: React.FC<TypewriterProps> = ({
  prefix,
  words,
  speed = 50,
  deleteSpeed = 30,
  waitTime = 2000,
  initialDelay = 0,
  loop = true,
  className,
  wordClassName,
  showCursor = true,
  cursorChar = '|',
  cursorClassName = 'ml-0.5',
}) => {
  const [displayWord, setDisplayWord] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const currentWord = words[wordIndex];

    const tick = () => {
      if (isDeleting) {
        if (displayWord === '') {
          setIsDeleting(false);
          if (wordIndex === words.length - 1 && !loop) return;
          setWordIndex((prev) => (prev + 1) % words.length);
          setCharIndex(0);
          timeout = setTimeout(() => {}, 300);
        } else {
          timeout = setTimeout(() => {
            setDisplayWord((prev) => prev.slice(0, -1));
          }, deleteSpeed);
        }
      } else {
        if (charIndex < currentWord.length) {
          timeout = setTimeout(() => {
            setDisplayWord((prev) => prev + currentWord[charIndex]);
            setCharIndex((prev) => prev + 1);
          }, speed);
        } else if (words.length > 1) {
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, waitTime);
        }
      }
    };

    if (charIndex === 0 && !isDeleting && displayWord === '') {
      timeout = setTimeout(tick, wordIndex === 0 ? initialDelay : 300);
    } else {
      tick();
    }

    return () => clearTimeout(timeout);
  }, [charIndex, displayWord, isDeleting, speed, deleteSpeed, waitTime, words, wordIndex, loop, initialDelay]);

  return (
    <span className={className}>
      {prefix}
      <span className={wordClassName}>{displayWord}</span>
      {showCursor && (
        <span className={cn(cursorClassName, 'animate-cursor-blink')}>
          {cursorChar}
        </span>
      )}
    </span>
  );
};

export { Typewriter };
