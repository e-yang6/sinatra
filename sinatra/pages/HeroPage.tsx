import React, { useState, useEffect } from 'react';
import { Music, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { useNavigate } from 'react-router-dom';

const sinatraLogo = new URL('../assets/SinAtraa-removebg-preview.png', import.meta.url).href;

export const HeroPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-200 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-zinc-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 max-w-2xl">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-4">
          <img 
            src={sinatraLogo} 
            alt="SINATRA" 
            className="h-20 object-contain"
          />
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-[#c9a961]" />
            <h1 className="text-5xl font-bold text-zinc-100">SINATRA</h1>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-xl text-zinc-400 text-center">
          Create music with AI-powered vocal-to-instrument transcription
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full">
          <div className="flex flex-col items-center gap-2 p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm">
            <Music size={32} className="text-[#c9a961] mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">Vocal to MIDI</h3>
            <p className="text-xs text-zinc-500 text-center">Transform your voice into musical instruments</p>
          </div>
          <div className="flex flex-col items-center gap-2 p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm">
            <Sparkles size={32} className="text-[#c9a961] mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">AI Assistant</h3>
            <p className="text-xs text-zinc-500 text-center">Get help with your music production</p>
          </div>
          <div className="flex flex-col items-center gap-2 p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm">
            <Music size={32} className="text-[#c9a961] mb-2" />
            <h3 className="text-sm font-semibold text-zinc-200">Real-time</h3>
            <p className="text-xs text-zinc-500 text-center">Record and edit in real-time</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full">
          <button
            onClick={() => {
              setAuthMode('signup');
              setShowAuthModal(true);
            }}
            className="flex-1 px-6 py-3 bg-[#c9a961] hover:bg-[#b89a51] text-zinc-950 font-semibold rounded-lg transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => {
              setAuthMode('signin');
              setShowAuthModal(true);
            }}
            className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>

        {/* Footer text */}
        <p className="text-xs text-zinc-600 mt-8 text-center">
          Start creating music in seconds. No credit card required.
        </p>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  );
};
