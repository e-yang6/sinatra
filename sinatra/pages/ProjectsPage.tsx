import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Music, Image as ImageIcon, X, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

const sinatraLogo = new URL('../assets/SinAtraa-removebg-preview.png', import.meta.url).href;

interface Project {
  id: string;
  name: string;
  genre?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const ProjectsPage: React.FC = () => {
  const { user, signOut, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGenre, setNewProjectGenre] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectImageUrl, setNewProjectImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'oldest'>('recent');
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
    const projectGenre = newProjectGenre.trim();
    const projectDescription = newProjectDescription.trim();
    const projectImageUrl = newProjectImageUrl.trim();

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: projectName,
      genre: projectGenre || undefined,
      description: projectDescription || undefined,
      image_url: projectImageUrl || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.id,
    };

    try {
      const { error } = await supabase
        .from('projects')
        .insert([newProject]);

      if (error) throw error;
      
      setProjects(prev => [newProject, ...prev]);
      setNewProjectName('');
      setNewProjectGenre('');
      setNewProjectDescription('');
      setNewProjectImageUrl('');
    } catch (error: any) {
      console.error('Error creating project:', error);
      const updatedProjects = [newProject, ...projects];
      setProjects(updatedProjects);
      localStorage.setItem(`projects_${user.id}`, JSON.stringify(updatedProjects));
      setNewProjectName('');
      setNewProjectGenre('');
      setNewProjectDescription('');
      setNewProjectImageUrl('');
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const handleEditProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt('Enter new project name:', project.name);
    if (!newName || newName.trim() === project.name) return;

    const newGenre = prompt('Enter new genre (optional):', project.genre || '');
    const newDescription = prompt('Enter new description (optional):', project.description || '');
    
    const updatedProject: Project = {
      ...project,
      name: newName.trim(),
      genre: newGenre?.trim() || undefined,
      description: newDescription?.trim() || undefined,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: updatedProject.name,
          genre: updatedProject.genre,
          description: updatedProject.description,
          updated_at: updatedProject.updated_at,
        })
        .eq('id', project.id);

      if (error) throw error;
      
      setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
    } catch (error: any) {
      console.error('Error updating project:', error);
      const updatedProjects = projects.map(p => p.id === project.id ? updatedProject : p);
      setProjects(updatedProjects);
      if (user) {
        localStorage.setItem(`projects_${user.id}`, JSON.stringify(updatedProjects));
      }
    }
  };

  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (error: any) {
      console.error('Error deleting project:', error);
      const updatedProjects = projects.filter(p => p.id !== project.id);
      setProjects(updatedProjects);
      if (user) {
        localStorage.setItem(`projects_${user.id}`, JSON.stringify(updatedProjects));
      }
    }
  };

  const handleCancelNewProject = () => {
    setNewProjectName('');
    setNewProjectGenre('');
    setNewProjectDescription('');
    setNewProjectImageUrl('');
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProjectImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Get unique genres from projects (must be before early returns)
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    projects.forEach(p => {
      if (p.genre) genreSet.add(p.genre);
    });
    return Array.from(genreSet).sort();
  }, [projects]);

  // Filter and sort projects (must be before early returns)
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.genre?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by genre
    if (selectedGenre) {
      filtered = filtered.filter(p => p.genre === selectedGenre);
    }

    // Sort projects
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'recent':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return sorted;
  }, [projects, searchQuery, selectedGenre, sortBy]);

  // Calculate stats (must be before early returns)
  const recentProjects = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return projects.filter(p => new Date(p.updated_at).getTime() > weekAgo).length;
  }, [projects]);

  const totalProjects = projects.length;

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

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden relative">
      <div className="h-full w-full p-8 flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
          {/* Logo and Sign Out - same line */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <img 
              src={sinatraLogo} 
              alt="Sinatra" 
              className="h-8 object-contain"
            />
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800/50 hover:border-zinc-700/50 rounded-lg bg-zinc-900/80 backdrop-blur-sm hover:bg-zinc-800/80 transition-all shadow-lg flex-shrink-0"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-zinc-900/50 border-zinc-800/50"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Total Projects</span>
                <span className="text-zinc-300 font-medium">{totalProjects}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Updated This Week</span>
                <span className="text-zinc-300 font-medium">{recentProjects}</span>
              </div>
            </div>

            {/* Sort */}
            <div className="mb-6">
              <Label className="text-xs text-zinc-400 mb-2 block">Sort By</Label>
              <div className="space-y-1.5">
                {(['recent', 'name', 'oldest'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSortBy(option)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                      sortBy === option
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                  >
                    {option === 'recent' && 'Most Recent'}
                    {option === 'name' && 'Name (A-Z)'}
                    {option === 'oldest' && 'Oldest First'}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre Filter */}
            {genres.length > 0 && (
              <div>
                <Label className="text-xs text-zinc-400 mb-2 block flex items-center gap-1.5">
                  <Filter size={12} />
                  Genre
                </Label>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                      !selectedGenre
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                  >
                    All Genres
                  </button>
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                        selectedGenre === genre
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cat Container */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm flex-shrink-0">
            <div className="flex flex-col items-center justify-center">
              <div className="text-6xl mb-2">🐱</div>
            </div>
          </div>
        </div>

        {/* Left Column - Projects List */}
        <div className="flex-[0.65] flex flex-col gap-6 min-w-0">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 h-full flex flex-col gap-6 backdrop-blur-sm">
            {/* Header */}
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                <span className="font-light text-zinc-100 tracking-tighter">Projects</span>
              </h1>
              <p className="text-zinc-500 mt-1.5 text-sm">{totalProjects} {totalProjects === 1 ? 'project' : 'projects'}</p>
            </div>

              {/* Projects Grid */}
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredAndSortedProjects.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <p className="text-zinc-500 mb-1 text-sm">
                      {searchQuery || selectedGenre ? 'No projects found' : 'No projects yet'}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {searchQuery || selectedGenre ? 'Try adjusting your filters' : 'Create your first project to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {filteredAndSortedProjects.map((project) => (
                    <motion.button
                      key={project.id}
                      onClick={() => handleProjectClick(project.id)}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="text-left group"
                    >
                      <div className="p-3 bg-zinc-900/40 border border-zinc-800/30 rounded-xl hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all backdrop-blur-sm">
                        <div className="grid grid-cols-2 gap-3 w-full">
                          <div className="rounded-lg w-full h-36 bg-zinc-800/30 border border-zinc-800/20 flex items-center justify-center overflow-hidden relative">
                            {project.image_url ? (
                              <>
                                <img
                                  src={project.image_url}
                                  alt={project.name}
                                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                  onError={(e) => {
                                    // Hide image on error, show icon instead
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const icon = target.nextElementSibling as HTMLElement;
                                    if (icon) icon.style.display = 'flex';
                                  }}
                                />
                                <Music className="w-12 h-12 text-zinc-500 hidden" />
                              </>
                            ) : (
                              <Music className="w-12 h-12 text-zinc-500" />
                            )}
                          </div>
                          <div className="flex flex-col gap-y-1.5 justify-between h-full">
                            <div>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <h2 className="text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors">
                                  {project.name}
                                </h2>
                                {project.genre && (
                                  <span className="text-xs text-zinc-500 font-normal">
                                    {project.genre}
                                  </span>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/30">
                              <button
                                onClick={(e) => handleEditProject(project, e)}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
                              >
                                <Edit2 size={12} />
                                Edit
                              </button>
                              <button
                                onClick={(e) => handleDeleteProject(project, e)}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - New Project Card */}
        <div className="flex-[0.35] flex-shrink-0">
          <Card className="w-full h-full flex flex-col bg-zinc-900/50 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Create project</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Start a new composition</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <form className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name" className="text-xs text-zinc-400">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newProjectName.trim()) {
                        e.preventDefault();
                        createProject();
                      }
                    }}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="genre" className="text-xs text-zinc-400">Genre</Label>
                  <Input 
                    id="genre" 
                    placeholder="Optional"
                    value={newProjectGenre}
                    onChange={(e) => setNewProjectGenre(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="description" className="text-xs text-zinc-400">Description</Label>
                    <Input 
                      id="description" 
                      placeholder="Optional"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <ImageIcon size={12} />
                      Project Image
                    </Label>
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`relative border-2 border-dashed rounded-lg p-4 transition-all ${
                        isDragging
                          ? 'border-[#c9a961] bg-[#c9a961]/10'
                          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                      }`}
                    >
                      {newProjectImageUrl ? (
                        <div className="relative">
                          <img
                            src={newProjectImageUrl}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setNewProjectImageUrl('')}
                            className="absolute top-2 right-2 w-6 h-6 bg-zinc-900/80 hover:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                          <ImageIcon className="w-8 h-8 text-zinc-600 mb-2" />
                          <p className="text-xs text-zinc-500 text-center mb-1">
                            Drag and drop an image here
                          </p>
                          <p className="text-xs text-zinc-600 text-center mb-2">or</p>
                          <label className="cursor-pointer">
                            <span className="text-xs text-[#c9a961] hover:text-[#b89a51] transition-colors">
                              Browse files
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileInputChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between pt-4 border-t border-zinc-800/30">
              <Button 
                variant="outline" 
                onClick={handleCancelNewProject}
                className="h-8 text-xs px-3"
              >
                Cancel
              </Button>
              <Button 
                onClick={createProject} 
                disabled={!newProjectName.trim()}
                className="h-8 text-xs px-4"
              >
                Create
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
