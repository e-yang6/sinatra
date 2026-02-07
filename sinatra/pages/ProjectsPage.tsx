import React, { useState, useEffect } from 'react';
import { Plus, Music, Clock, ArrowRight, LogOut, Home, Settings, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sidebar, SidebarBody, SidebarLink } from '../components/ui/sidebar';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const sinatraLogo = new URL('../assets/SinAtraa-removebg-preview.png', import.meta.url).href;

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const Logo = () => {
  return (
    <Link
      to="/"
      className="font-normal flex space-x-2 items-center text-sm text-zinc-200 py-1 relative z-20"
    >
      <img src={sinatraLogo} alt="SINATRA" className="h-5 w-5 flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-zinc-200 whitespace-pre"
      >
        SINATRA
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      to="/"
      className="font-normal flex space-x-2 items-center text-sm text-zinc-200 py-1 relative z-20"
    >
      <img src={sinatraLogo} alt="SINATRA" className="h-5 w-5 flex-shrink-0" />
    </Link>
  );
};

export const ProjectsPage: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      // Fallback to localStorage if Supabase fails
      const localProjects = localStorage.getItem(`projects_${user.id}`);
      if (localProjects) {
        setProjects(JSON.parse(localProjects));
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  const createProject = async () => {
    if (!user || !newProjectName.trim()) return;

    const projectName = newProjectName.trim();
    setNewProjectName('');
    setShowNewProjectInput(false);

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: projectName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.id,
    };

    try {
      // Try Supabase first
      const { error } = await supabase
        .from('projects')
        .insert([newProject]);

      if (error) throw error;
      
      setProjects(prev => [newProject, ...prev]);
    } catch (error: any) {
      console.error('Error creating project:', error);
      // Fallback to localStorage
      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      localStorage.setItem(`projects_${user.id}`, JSON.stringify(updatedProjects));
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  if (loading || loadingProjects) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarLinks = [
    {
      label: "Projects",
      href: "/projects",
      icon: (
        <Home className="text-zinc-300 h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        <Settings className="text-zinc-300 h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  return (
    <div className={cn(
      "rounded-md flex flex-col md:flex-row bg-zinc-950 w-full flex-1 max-w-7xl mx-auto border border-zinc-800 overflow-hidden",
      "h-screen"
    )}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {sidebarOpen ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sidebarLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user.email || "User",
                href: "#",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-[#c9a961] flex items-center justify-center text-zinc-950 font-semibold text-xs">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                ),
              }}
            />
            <SidebarLink
              link={{
                label: "Sign Out",
                href: "#",
                icon: (
                  <LogOut className="text-zinc-300 h-5 w-5 flex-shrink-0" />
                ),
              }}
              className="mt-2"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                signOut();
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* Main Content */}
      <div className="flex flex-1">
        <div className="p-2 md:p-10 rounded-tl-2xl border-l border-zinc-800 bg-zinc-950 flex flex-col gap-2 flex-1 w-full h-full overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-zinc-200 mb-2">My Projects</h1>
            <p className="text-sm text-zinc-500">Create and manage your music projects</p>
          </div>

          {/* New Project Button/Input */}
          {!showNewProjectInput ? (
            <button
              onClick={() => setShowNewProjectInput(true)}
              className="w-full sm:w-auto mb-6 px-6 py-4 bg-zinc-900 hover:bg-zinc-800 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg flex items-center justify-center gap-3 text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium">New Project</span>
            </button>
          ) : (
            <div className="mb-6 flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createProject();
                  } else if (e.key === 'Escape') {
                    setShowNewProjectInput(false);
                    setNewProjectName('');
                  }
                }}
                placeholder="Project name..."
                autoFocus
                className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#c9a961]"
              />
              <button
                onClick={createProject}
                className="px-4 py-2 bg-[#c9a961] hover:bg-[#b89a51] text-zinc-950 font-medium rounded-lg transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewProjectInput(false);
                  setNewProjectName('');
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="mt-12 text-center">
              <Music size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 mb-2">No projects yet</p>
              <p className="text-sm text-zinc-600">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="p-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-left transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <Music size={24} className="text-[#c9a961]" />
                    <ArrowRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                  <h3 className="font-semibold text-zinc-200 mb-2 truncate">{project.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock size={12} />
                    <span>
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
