import { MusicalKey, QuantizeOption, ScaleType, TrackData } from '../types';
import { supabase } from './supabaseClient';

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

export async function listStoredProjects(userId: string): Promise<StoredProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Sinatra] Failed to list projects from Supabase:', error);
    throw error;
  }

  return (data ?? []) as StoredProject[];
}

export async function getStoredProject(userId: string, projectId: string): Promise<StoredProject | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Sinatra] Failed to get project from Supabase:', error);
    throw error;
  }

  return (data as StoredProject | null) ?? null;
}

export async function createStoredProject(
  userId: string,
  project: Omit<StoredProject, 'user_id' | 'created_at' | 'updated_at'>,
): Promise<StoredProject> {
  const now = new Date().toISOString();
  const payload = {
    ...project,
    user_id: userId,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from('projects').insert(payload).select().single();

  if (error) {
    console.error('[Sinatra] Failed to create project in Supabase:', error);
    throw error;
  }

  return data as StoredProject;
}

export async function updateStoredProject(
  userId: string,
  projectId: string,
  updates: Partial<Omit<StoredProject, 'id' | 'user_id' | 'created_at'>>,
): Promise<StoredProject | null> {
  const payload = {
    ...updates,
    updated_at: updates.updated_at ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[Sinatra] Failed to update project in Supabase:', error);
    throw error;
  }

  return (data as StoredProject | null) ?? null;
}

export async function deleteStoredProject(userId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Sinatra] Failed to delete project in Supabase:', error);
    throw error;
  }
}

export async function saveStoredProjectData(
  userId: string,
  projectId: string,
  data: StoredProjectData,
  name?: string,
): Promise<StoredProject | null> {
  return updateStoredProject(userId, projectId, {
    ...(name ? { name } : {}),
    data,
    updated_at: new Date().toISOString(),
  });
}

