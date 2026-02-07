import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SignInPage } from '../components/ui/sign-in';

export const SignInPageRoute: React.FC = () => {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    } else {
      navigate('/projects');
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    console.log("Continue with Google clicked");
  };

  const handleResetPassword = () => {
    // TODO: Implement password reset
    console.log("Reset Password clicked");
  };

  const handleCreateAccount = () => {
    navigate('/signup');
  };

  return (
    <div className="bg-white text-slate-900">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      <SignInPage
        heroImageSrc="https://res.cloudinary.com/drhx7imeb/image/upload/v1756215257/gradient-optimized_nfrakk.svg"
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
        isSignUp={false}
      />
    </div>
  );
};
