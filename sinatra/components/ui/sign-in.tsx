import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  isSignUp?: boolean;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-colors focus-within:border-[#c9a961]/70 focus-within:bg-[#c9a961]/10">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`flex items-start gap-3 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 p-5 w-64`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium text-zinc-200">{testimonial.name}</p>
      <p className="text-zinc-500">{testimonial.handle}</p>
      <p className="mt-1 text-zinc-300">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-zinc-100 tracking-tighter">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
  isSignUp = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw] bg-zinc-950 text-zinc-200">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
            <p className="text-zinc-400">{description}</p>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-2 block">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Enter your email address" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-zinc-200 placeholder-zinc-600" />
                </GlassInputWrapper>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 mb-2 block">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-zinc-200 placeholder-zinc-600" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-zinc-500 hover:text-zinc-300 transition-colors" /> : <Eye className="w-5 h-5 text-zinc-500 hover:text-zinc-300 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {!isSignUp && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="rememberMe" className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#c9a961] focus:ring-[#c9a961] focus:ring-offset-zinc-950" />
                    <span className="text-zinc-300">Keep me signed in</span>
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="hover:underline text-[#c9a961] transition-colors">Reset password</a>
                </div>
              )}

              <button type="submit" className="w-full rounded-2xl bg-[#c9a961] py-4 font-medium text-zinc-950 hover:bg-[#b89a51] transition-colors">
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <span className="w-full border-t border-zinc-800"></span>
              <span className="px-4 text-sm text-zinc-500 bg-zinc-950 absolute">Or continue with</span>
            </div>

            <button onClick={onGoogleSignIn} className="w-full flex items-center justify-center gap-3 border border-zinc-800 rounded-2xl py-4 hover:bg-zinc-900 transition-colors text-zinc-200">
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="text-center text-sm text-zinc-500">
              {isSignUp ? 'Already have an account? ' : 'New to our platform? '}
              <a href="#" onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }} className="text-[#c9a961] hover:underline transition-colors">
                {isSignUp ? 'Sign In' : 'Create Account'}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div className="absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }}></div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
              {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
