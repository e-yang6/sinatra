import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SignInPage } from '../components/ui/sign-in';

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
    <div className="bg-white text-slate-900">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-sm">
          {message}
        </div>
      )}
      <SignInPage
        title={<span className="font-light text-slate-900 tracking-tighter">Create Account</span>}
        description="Join us and start creating amazing music"
        heroImageSrc="https://res.cloudinary.com/drhx7imeb/image/upload/v1756215257/gradient-optimized_nfrakk.svg"
        onSignIn={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        isSignUp={true}
      />
    </div>
  );
};
