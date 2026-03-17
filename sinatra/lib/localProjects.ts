import { MusicalKey, QuantizeOption, ScaleType, TrackData } from '../types';

const PROJECTS_STORAGE_PREFIX = 'sinatra.projects.';

export interface StoredProjectData {
  bpm?: number;
  tracks?: TrackData[];
  musicalKey?: MusicalKey;
  scaleType?: ScaleType;
  quantize?: QuantizeOption;
  masterVolume?: number;
}

export interface StoredProject {
  id: string;
  name: string;
  genre?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  data?: StoredProjectData;
}

function getProjectsStorageKey(userId: string): string {
  return `${PROJECTS_STORAGE_PREFIX}${userId}`;
}

function readProjects(userId: string): StoredProject[] {
  try {
    const raw = localStorage.getItem(getProjectsStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Sinatra] Failed to read local projects:', error);
    return [];
  }
}

function writeProjects(userId: string, projects: StoredProject[]): void {
  localStorage.setItem(getProjectsStorageKey(userId), JSON.stringify(projects));
}

export function listStoredProjects(userId: string): StoredProject[] {
  return readProjects(userId).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export function getStoredProject(userId: string, projectId: string): StoredProject | null {
  return readProjects(userId).find((project) => project.id === projectId) ?? null;
}

export function createStoredProject(userId: string, project: Omit<StoredProject, 'user_id'>): StoredProject {
  const storedProject: StoredProject = {
    ...project,
    user_id: userId,
  };

  const projects = readProjects(userId);
  writeProjects(userId, [storedProject, ...projects]);
  return storedProject;
}

export function updateStoredProject(
  userId: string,
  projectId: string,
  updates: Partial<Omit<StoredProject, 'id' | 'user_id' | 'created_at'>>,
): StoredProject | null {
  const projects = readProjects(userId);
  let updatedProject: StoredProject | null = null;

  const nextProjects = projects.map((project) => {
    if (project.id !== projectId) {
      return project;
    }

    updatedProject = {
      ...project,
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    };

    return updatedProject;
  });

  if (!updatedProject) {
    return null;
  }

  writeProjects(userId, nextProjects);
  return updatedProject;
}

export function deleteStoredProject(userId: string, projectId: string): void {
  const projects = readProjects(userId);
  writeProjects(
    userId,
    projects.filter((project) => project.id !== projectId),
  );
}

export function saveStoredProjectData(
  userId: string,
  projectId: string,
  data: StoredProjectData,
  name?: string,
): StoredProject | null {
  return updateStoredProject(userId, projectId, {
    ...(name ? { name } : {}),
    data,
    updated_at: new Date().toISOString(),
  });
}
