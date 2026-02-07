import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronRight, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { AnimatedGroup } from '../components/ui/animated-group';
import { cn } from '../lib/utils';

const sinatraLogo = new URL('../assets/SinAtraa-removebg-preview.png', import.meta.url).href;

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const menuItems = [
  { name: 'Features', href: '#features' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'Examples', href: '#examples' },
  { name: 'Support', href: '#support' },
];

const HeroHeader: React.FC = () => {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header>
      <nav
        data-state={menuState ? 'active' : undefined}
        className="fixed z-20 w-full px-2 group bg-zinc-950/0">
        <div className={cn(
          'mx-auto mt-2 max-w-6xl px-6 transition-[max-width,padding,background-color,border-color] duration-300 lg:px-12 border border-transparent rounded-2xl',
          isScrolled && 'bg-zinc-950/50 max-w-4xl border-zinc-800 backdrop-blur-lg lg:px-5'
        )}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                to="/"
                aria-label="home"
                className="flex items-center space-x-2">
                <img src={sinatraLogo} alt="SINATRA" className="h-6 w-auto" />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                <Menu className={cn(
                  "m-auto size-6 duration-200",
                  menuState && "rotate-180 scale-0 opacity-0"
                )} />
                <X className={cn(
                  "absolute inset-0 m-auto size-6 duration-200",
                  menuState ? "rotate-0 scale-100 opacity-100" : "-rotate-180 scale-0 opacity-0"
                )} />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <a
                      href={item.href}
                      className="text-zinc-400 hover:text-zinc-200 block duration-150">
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(
              "bg-zinc-950 mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-zinc-800 p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent",
              menuState && "lg:group-data-[state=active]:flex block"
            )}>
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        className="text-zinc-400 hover:text-zinc-200 block duration-150">
                        <span>{item.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(isScrolled && 'lg:hidden')}
                  onClick={() => navigate('/signin')}>
                  <span>Login</span>
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "bg-[#c9a961] hover:bg-[#b89a51] text-zinc-950",
                    isScrolled && 'lg:hidden'
                  )}
                  onClick={() => navigate('/signup')}>
                  <span>Sign Up</span>
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "bg-[#c9a961] hover:bg-[#b89a51] text-zinc-950",
                    isScrolled ? 'lg:inline-flex' : 'hidden'
                  )}
                  onClick={() => {
                    if (user) {
                      navigate('/projects');
                    } else {
                      navigate('/signup');
                    }
                  }}>
                  <span>Get Started</span>
                </Button>
              </div>
            </div>
          </div>
          </div>
        </nav>
      </header>
  );
};

export const HeroPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/projects');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: 'spring',
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className="absolute inset-0 -z-20">
              <div className="absolute inset-x-0 top-56 -z-20 hidden lg:top-32 lg:block bg-zinc-950" />
            </AnimatedGroup>
            <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,rgb(9_9_11)_75%)]" />
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <h1 className="mt-8 max-w-4xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] font-light text-zinc-100">
                    Modern Solutions for Music Production
                  </h1>
                  <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-zinc-400">
                    Highly customizable music production tools for building modern compositions that sound and feel the way you mean it.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                  <div
                    key={1}
                    className="bg-zinc-800/50 rounded-[14px] border border-zinc-700 p-0.5">
                    <Button
                      size="lg"
                      className="rounded-xl px-5 text-base bg-[#c9a961] hover:bg-[#b89a51] text-zinc-950"
                      onClick={() => navigate('/signup')}>
                      <span className="text-nowrap">Start Building</span>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    size="lg"
                    variant="ghost"
                    className="h-11 rounded-xl px-5 text-zinc-300 hover:text-zinc-100"
                    onClick={() => navigate('/signin')}>
                    <span className="text-nowrap">Sign In</span>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}>
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div
                  aria-hidden
                  className="bg-gradient-to-b to-zinc-950 absolute inset-0 z-10 from-transparent from-35%"
                />
                <div className="inset-shadow-2xs ring-zinc-800 bg-zinc-950 relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 p-4 shadow-lg shadow-zinc-950/15 ring-1">
                  {/* Mock Editor Demo */}
                  <div className="aspect-15/8 relative rounded-2xl bg-zinc-900 overflow-hidden">
                    {/* Editor Header */}
                    <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center">
                          <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                        </div>
                        <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center">
                          <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                        </div>
                        <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center">
                          <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 font-mono">BPM</span>
                          <span className="text-xs text-zinc-300 font-mono">124</span>
                        </div>
                        <div className="w-16 h-0.5 bg-zinc-800 rounded">
                          <div className="w-3/4 h-full bg-[#c9a961] rounded" />
                        </div>
                      </div>
                    </div>

                    {/* Timeline Area */}
                    <div className="flex-1 bg-zinc-950 p-4 h-[calc(100%-3rem)]">
                      {/* Time Ruler */}
                      <div className="h-8 border-b border-zinc-800 flex items-end px-32 mb-2">
                        {[0, 4, 8, 12, 16, 20, 24].map((sec) => (
                          <div key={sec} className="flex-1 flex flex-col items-start">
                            <div className="h-2 w-px bg-[#c9a961]/50" />
                            <span className="text-[10px] text-[#c9a961]/70 font-mono mt-1">{sec}s</span>
                          </div>
                        ))}
                      </div>

                      {/* Tracks */}
                      <div className="space-y-2 relative">
                        {['Drum Loop', 'Piano', 'Bass', 'Synth'].map((name, idx) => (
                          <div key={name} className="h-12 bg-zinc-900 border border-zinc-800 rounded flex items-center px-2">
                            <div className="w-24 text-xs text-zinc-400 truncate">{name}</div>
                            <div className="flex-1 h-full relative">
                              <div className="absolute inset-0 flex items-center">
                                <div
                                  className="h-6 bg-gradient-to-r from-[#c9a961]/40 via-[#c9a961]/60 to-[#c9a961]/40 rounded"
                                  style={{
                                    width: `${60 + idx * 10}%`,
                                    marginLeft: `${10 + idx * 5}%`,
                                  }}
                                />
                              </div>
                              <div className="absolute left-[20%] top-0 bottom-0 w-px bg-[#c9a961]/70" />
                            </div>
                          </div>
                        ))}
                        {/* Playhead */}
                        <div className="absolute top-0 bottom-0 w-px bg-[#c9a961]" style={{ left: '35%' }}>
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#c9a961] rounded-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
          </section>
        </main>
      </>
    );
  };
