import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronRight, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { AnimatedGroup } from '../components/ui/animated-group';
import { VideoPlayer } from '../components/VideoPlayer';
import { cn } from '../lib/utils';
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from '../components/ui/carousel';
import AutoplayPlugin from 'embla-carousel-autoplay';
import { Feature72 } from '../components/Feature72';
import { Footer } from '../components/Footer';
import { Github, Twitter, Instagram, Linkedin } from 'lucide-react';

const sinatraLogo = new URL('../assets/sinalogo.png', import.meta.url).href;
const earlyDemoVideo = new URL('../assets/Demo.mp4', import.meta.url).href;

const transitionVariants = {
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
        stiffness: 100,
        damping: 20,
        mass: 0.5,
        duration: 0.8,
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Animate from compressed to stretched on initial load
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 50);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header>
      <nav
        data-state={menuState ? 'active' : undefined}
        className="fixed z-20 w-full px-2 group bg-white/0">
        <div className={cn(
          'mx-auto mt-2 px-6 border rounded-2xl transition-[max-width,padding,background-color,border-color,backdrop-filter] duration-700 ease-out',
          isInitialLoad 
            ? 'max-w-4xl bg-white/80 border-slate-300 backdrop-blur-lg lg:px-5'
            : isScrolled
              ? 'max-w-4xl bg-white/80 border-slate-300 backdrop-blur-lg lg:px-5'
              : 'max-w-6xl border-transparent lg:px-12'
        )}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                to="/"
                aria-label="home"
                className="flex items-center space-x-2">
                <img src={sinatraLogo} alt="SINATRA" className="h-12 object-contain" />
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
                      className="text-slate-700 hover:text-slate-900 block duration-150">
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(
              "bg-white mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-slate-300 p-6 shadow-2xl shadow-slate-200/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent",
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
                   size="sm"
                   className="bg-[#6993cf] hover:bg-[#5476a6] text-white px-7 py-5"
                   onClick={() => {
                     if (user) {
                       navigate('/projects');
                     } else {
                       navigate('/signup');
                     }
                   }}>
                   <span>Start Building</span>
                 </Button>
              </div>
            </div>
          </div>
          </div>
        </nav>
      </header>
  );
};

const ArtistsCarousel: React.FC = () => {
  const [api, setApi] = useState<CarouselApi>();
  // Import carousel assets
  const carouselAssets = [
    new URL('../assets/carousel-assets/dax1.jpg', import.meta.url).href,
    new URL('../assets/carousel-assets/dax2.jpg', import.meta.url).href,
    new URL('../assets/carousel-assets/dax3.png', import.meta.url).href,
    new URL('../assets/carousel-assets/dax4.jpg', import.meta.url).href,
    new URL('../assets/carousel-assets/dax5.jpg', import.meta.url).href,
    new URL('../assets/carousel-assets/ethan.jpg', import.meta.url).href,
  ];
  // Duplicate logos many times for seamless infinite scroll (10 sets = 40 items total)
  // More sets = more buffer for seamless reset
  const duplicatedLogos = Array(10).fill(carouselAssets).flat();
  const autoplayPlugin = React.useRef(
    AutoplayPlugin({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: false })
  );

  useEffect(() => {
    if (!api) {
      return;
    }

    // Start at a middle position for seamless looping
    const startIndex = carouselAssets.length * 5;
    api.scrollTo(startIndex, false);

    // Handle seamless reset
    const handleSelect = () => {
      const currentIndex = api.selectedScrollSnap();
      const totalSlides = api.scrollSnapList().length;
      const resetPoint = carouselAssets.length * 8; // Near the end
      const resetTarget = carouselAssets.length * 5; // Back to middle
      
      if (currentIndex >= resetPoint) {
        // Reset instantly to middle - appears seamless since content is identical
        api.scrollTo(resetTarget, false);
      }
    };

    api.on('select', handleSelect);

    return () => {
      api.off('select', handleSelect);
    };
  }, [api, carouselAssets.length]);

    return (
      <div className="w-full pt-20 pb-16 lg:pt-40 lg:pb-24">
        <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-10">
          <h2 className="text-xl md:text-3xl lg:text-5xl tracking-tighter lg:max-w-xl font-light text-left text-slate-900">
            Trusted by thousands of artists worldwide.
          </h2>
          <Carousel 
            setApi={setApi} 
            className="w-full"
            opts={{
              align: "start",
              loop: false,
              dragFree: true,
              duration: 25,
            }}
            plugins={[autoplayPlugin.current]}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {duplicatedLogos.map((logoSrc, index) => (
                <CarouselItem className="pl-2 md:pl-4 basis-1/4 lg:basis-1/6" key={index}>
                  <div className="flex rounded-xl aspect-square bg-slate-100 border border-slate-300 items-center justify-center p-2 hover:border-[#6993cf]/50 hover:bg-slate-200 transition-all duration-300 overflow-hidden">
                    <img 
                      src={logoSrc} 
                      alt={`Artist logo ${index + 1}`}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
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
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden" style={{ willChange: 'transform, opacity' }}>
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-24">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 0.3,
                      staggerChildren: 0.1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                  },
                  visible: {
                    opacity: 1,
                    transition: {
                      type: 'spring',
                      stiffness: 120,
                      damping: 25,
                      mass: 0.5,
                      duration: 0.6,
                    },
                  },
                },
              }}
              className="absolute inset-0 -z-20">
              <div className="absolute inset-x-0 top-56 -z-20 hidden lg:top-32 lg:block bg-white" />
            </AnimatedGroup>
            <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,rgb(255_255_255)_75%)]" />
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup 
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.15,
                          delayChildren: 0.2,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}>
                    <h1 className="mt-12 max-w-4xl mx-auto text-balance text-4xl md:text-5xl lg:mt-16 xl:text-6xl font-light text-slate-900 tracking-tighter">
                      Fly your music{' '}
                      <span
                        className="relative group inline-block cursor-pointer select-none"
                        style={{ perspective: 800 }}
                      >
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6993cf] via-[#8ba8d9] to-[#6993cf] transition-all duration-700 ease-out inline-block">
                          to the moon.
                        </span>
                        <span
                          className="pointer-events-none absolute inset-0 rounded bg-gradient-to-r from-[#6993cf]/0 via-[#8ba8d9]/30 to-[#6993cf]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer"
                          style={{ mixBlendMode: 'overlay' }}
                        />
                      </span>
                    </h1>

                    <p className="mt-4 max-w-2xl mx-auto text-balance text-lg text-slate-600">
                      Sinatra empowers anyone to make music, easily. 
                    </p>
                  </AnimatedGroup>

              </div>
            </div>

            <AnimatedGroup
              variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.08,
                          delayChildren: 0.8,
                        },
                      },
                    },
                ...transitionVariants,
              }}>
              <div className="relative -mr-56 mt-16 overflow-hidden px-2 sm:mr-0 sm:mt-20 md:mt-24">
                 <div className="inset-shadow-2xs ring-slate-300 bg-white relative mx-auto w-fit overflow-hidden rounded-2xl border border-slate-300 shadow-lg shadow-slate-200/15 ring-1 h-[600px] p-3">
                   {/* Video Player Demo */}
                   <VideoPlayer src={earlyDemoVideo} />
                 </div>
              </div>
            </AnimatedGroup>
          </div>
          </section>

          {/* Artists Carousel Section */}
          <ArtistsCarousel />

          {/* Features Section */}
          <Feature72
            heading="Empowering Features"
            description="Discover the features that make Sinatra the perfect tool for music production."
            linkUrl="#"
            linkText="Explore features"
            features={[
              {
                id: "feature-1",
                title: "Intuitive Editor",
                description:
                  "Professional editor with everything an artist needs to create music, instantly.",
                image: "https://www.shadcnblocks.com/images/block/placeholder-1.svg",
              },
              {
                id: "feature-2",
                title: "Voice-to-Instrument Conversion",
                description:
                  "Convert your voice to any instrument of your choice. No need to hesitate. Just speak and create.",
                image: "https://www.shadcnblocks.com/images/block/placeholder-2.svg",
              },
              {
                id: "feature-3",
                title: "AI-Powered Assistant",
                description:
                  "Use Frank to shave off repetitive tasks, and focus on creating your music instead.",
                image: "https://www.shadcnblocks.com/images/block/placeholder-3.svg",
              },
            ]}
          />

          {/* Footer */}
          <Footer
            logo={
              <img 
                src={sinatraLogo} 
                alt="SINATRA" 
                className="h-12 object-contain" 
              />
            }
            brandName="Sinatra"
            socialLinks={[
              {
                icon: <Github className="h-5 w-5" />,
                href: "https://github.com/e-yang6/sinatra",
                label: "GitHub"
              },
              {
                icon: <Instagram className="h-5 w-5" />,
                href: "https://www.instagram.com/jeffreywongg_/",
                label: "Instagram"
              },
              {
                icon: <Linkedin className="h-5 w-5" />,
                href: "https://www.linkedin.com/in/jmyl/",
                label: "LinkedIn"
              },
            ]}
            mainLinks={[
              { href: "#features", label: "Features" },
              { href: "#how-it-works", label: "How It Works" },
              { href: "#examples", label: "Examples" },
              { href: "#support", label: "Support" },
            ]}
            legalLinks={[
              { href: "#privacy", label: "Privacy Policy" },
              { href: "#terms", label: "Terms of Service" },
              { href: "#cookies", label: "Cookie Policy" },
            ]}
            copyright={{
              text: `© ${new Date().getFullYear()} Sinatra. All rights reserved.`,
            }}
          />
        </main>
      </>
    );
  };
