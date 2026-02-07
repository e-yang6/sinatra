import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SignInPage } from '../components/ui/sign-in';
import { TestimonialStack, Testimonial } from '../components/ui/glass-testimonial-swiper';
import { Users, Calendar, ThumbsUp, ShieldCheck, Clock, Share, Rocket, Zap, Gem } from 'lucide-react';

const testimonialsData: Testimonial[] = [
  {
    id: 1,
    initials: 'SM',
    name: 'Sarah Mitchell',
    role: 'Music Producer at SoundFlow',
    quote: "This platform has completely transformed how I create music. The AI-powered vocal-to-MIDI transcription is incredibly accurate, and the real-time collaboration features are game-changing. Best music production tool I've used this year.",
    tags: [{ text: 'FEATURED', type: 'featured' }, { text: 'Producer', type: 'default' }],
    stats: [{ icon: Users, text: '50+ tracks' }, { icon: Calendar, text: '2 years user' }],
    avatarGradient: 'linear-gradient(135deg, #5e6ad2, #8b5cf6)',
  },
  {
    id: 2,
    initials: 'MC',
    name: 'Marcus Chen',
    role: 'Composer at FilmScore Studio',
    quote: "The real-time recording and editing features are incredible. Our team can collaborate seamlessly, and the platform's reliability is outstanding. The mobile experience works perfectly for on-the-go production.",
    tags: [{ text: 'Studio', type: 'default' }, { text: 'Mobile', type: 'default' }],
    stats: [{ icon: ThumbsUp, text: '5 stars' }, { icon: ShieldCheck, text: 'Verified' }],
    avatarGradient: 'linear-gradient(135deg, #10b981, #059669)',
  },
  {
    id: 3,
    initials: 'AR',
    name: 'Alex Rodriguez',
    role: 'Independent Artist',
    quote: "Incredible performance and the AI assistant is incredibly helpful. Support team is responsive and the feature roadmap aligns perfectly with my needs. The customization options let me create exactly what I envision.",
    tags: [{ text: 'Artist', type: 'default' }, { text: 'Solo', type: 'default' }],
    stats: [{ icon: Clock, text: '6 months ago' }, { icon: Share, text: 'Shared 12 times' }],
    avatarGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  {
    id: 4,
    initials: 'EJ',
    name: 'Emily Johnson',
    role: 'Podcast Producer',
    quote: "As a content creator, speed is everything. This tool allowed me to produce professional-quality music twice as fast without needing expensive equipment. A must-have for any creative professional.",
    tags: [{ text: 'Creator', type: 'default' }, { text: 'Growth', type: 'featured' }],
    stats: [{ icon: Rocket, text: '2x faster' }, { icon: Zap, text: 'Quick Setup' }],
    avatarGradient: 'linear-gradient(135deg, #ec4899, #d946ef)',
  },
  {
    id: 5,
    initials: 'DW',
    name: 'David Wong',
    role: 'Sound Designer at GameDev Co.',
    quote: "The user interface is not just beautiful, it's intuitive. Our sound design team was able to adopt it instantly, streamlining our entire workflow and improving creative output significantly.",
    tags: [{ text: 'Game Audio', type: 'default' }],
    stats: [{ icon: Gem, text: 'Top Quality' }],
    avatarGradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  }
];

export const SignUpPageRoute: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signUp(email, password);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email to confirm your account!');
      setTimeout(() => {
        navigate('/signin');
      }, 3000);
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    console.log("Continue with Google clicked");
  };

  const handleResetPassword = () => {
    // Not applicable for sign up
  };

  const handleCreateAccount = () => {
    navigate('/signin');
  };

  return (
    <div className="bg-zinc-950 text-zinc-200">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm">
          {message}
        </div>
      )}
      <SignInPage
        title={<span className="font-light text-zinc-100 tracking-tighter">Create Account</span>}
        description="Join us and start creating amazing music"
        heroImageSrc="https://res.cloudinary.com/drhx7imeb/image/upload/v1756215257/gradient-optimized_nfrakk.svg"
        testimonialStack={<TestimonialStack testimonials={testimonialsData} autoSwipeInterval={1500} />}
        onSignIn={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        isSignUp={true}
      />
    </div>
  );
};
