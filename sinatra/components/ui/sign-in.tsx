import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Typewriter } from './typewriter';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

// --- TYPE DEFINITIONS ---

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isSignUp?: boolean;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-300 bg-slate-50/50 backdrop-blur-sm transition-colors focus-within:border-[#6993cf]/70 focus-within:bg-[#6993cf]/10">
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-slate-900 tracking-tighter">Welcome Back</span>,
  description = "Access your account and continue your flight with us",
  heroImageSrc,
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  isSignUp = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw] bg-white text-slate-900">
      {/* Left column: sign-in form */}
      <section className="flex-[0.4] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
            <p className="text-slate-600">{description}</p>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-slate-900 placeholder-slate-400" />
                </GlassInputWrapper>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-slate-900 placeholder-slate-400" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-slate-500 hover:text-slate-700 transition-colors" /> : <Eye className="w-5 h-5 text-slate-500 hover:text-slate-700 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {!isSignUp && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="w-4 h-4 rounded border-slate-300 bg-white text-[#6993cf] focus:ring-[#6993cf] focus:ring-offset-white" />
                    <span className="text-slate-700">Keep me signed in</span>
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="hover:underline text-[#6993cf] transition-colors">Reset password</a>
                </div>
              )}

              <button type="submit" className="w-full rounded-2xl bg-[#6993cf] py-4 font-medium text-white hover:bg-[#5476a6] transition-colors">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <span className="w-full border-t border-slate-300"></span>
              <span className="px-4 text-sm text-slate-500 bg-white absolute">Or continue with</span>
            </div>

            <button onClick={onGoogleSignIn} className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-2xl py-4 hover:bg-slate-50 transition-colors text-slate-900">
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="text-center text-sm text-slate-600">
              {isSignUp ? 'Already have an account? ' : 'New to our platform? '}
              <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-[#6993cf] hover:underline transition-colors">
                {isSignUp ? 'Sign In' : 'Create Account'}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: fill-in-the-blank typewriter */}
      {heroImageSrc && (
        <section className="hidden md:flex flex-[0.6] relative p-4 overflow-hidden items-center justify-center">
          <div className="absolute inset-4 rounded-3xl overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-bottom bg-no-repeat opacity-50 scale-[1.6]"
              style={{ backgroundImage: `url(${heroImageSrc})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/60 to-white/80" />
          </div>

          <div className="relative z-10 w-full px-8 lg:px-12 flex items-center justify-center">
            <h2 className="text-2xl lg:text-3xl xl:text-4xl font-light text-slate-900 tracking-tighter leading-tight text-center">
              <Typewriter
                prefix="Your voice, on "
                words={['any instrument.', 'piano.', 'strings.', 'guitar.', 'saxophone.']}
                speed={60}
                deleteSpeed={35}
                waitTime={2200}
                initialDelay={600}
                loop={true}
                showCursor={true}
                cursorChar="|"
                wordClassName="text-[#6993cf]"
                cursorClassName="ml-0.5 text-[#6993cf] font-light"
                className="inline"
              />
            </h2>
          </div>
        </section>
      )}
    </div>
  );
};
