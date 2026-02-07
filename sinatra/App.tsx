import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { HeroPage } from './pages/HeroPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SignInPageRoute } from './pages/SignInPage';
import { SignUpPageRoute } from './pages/SignUpPage';
import DAWEditor from './DAWEditor';

const EditorWrapper: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  return <DAWEditor projectId={projectId} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HeroPage />} />
          <Route path="/signin" element={<SignInPageRoute />} />
          <Route path="/signup" element={<SignUpPageRoute />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/editor/:projectId" element={<EditorWrapper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
