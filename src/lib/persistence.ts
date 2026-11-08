import type { EventContent, CreativeSettings } from '../data/types';

const WORKSPACE_URL = '/data/workspace.json';
const SETTINGS_URL = '/data/settings.json';

export interface WorkspaceData {
  version: string;
  lastModified: string;
  content: EventContent;
}

export interface SettingsData {
  version: string;
  lastModified: string;
  settings: Record<string, CreativeSettings>;
  photo: string | null;
}

/**
 * Charge le workspace depuis le fichier JSON
 */
export async function loadWorkspace(): Promise<WorkspaceData | null> {
  try {
    const response = await fetch(WORKSPACE_URL + '?t=' + Date.now());
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('Impossible de charger workspace.json:', err);
    return null;
  }
}

/**
 * Charge les settings depuis le fichier JSON
 */
export async function loadSettings(): Promise<SettingsData | null> {
  try {
    const response = await fetch(SETTINGS_URL + '?t=' + Date.now());
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('Impossible de charger settings.json:', err);
    return null;
  }
}

/**
 * Sauvegarde le workspace (nécessite un serveur de dev ou build)
 * En mode dev, on sauvegarde dans localStorage et on génère un fichier téléchargeable
 */
export function saveWorkspace(content: EventContent): WorkspaceData {
  const data: WorkspaceData = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    content
  };
  
  // Sauvegarde locale (backup)
  try {
    localStorage.setItem('workspace', JSON.stringify(data));
  } catch (err) {
    console.warn('Erreur sauvegarde localStorage:', err);
  }
  
  return data;
}

/**
 * Sauvegarde les settings
 */
export function saveSettings(settings: Record<string, CreativeSettings>, photo: string | null): SettingsData {
  const data: SettingsData = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    settings,
    photo
  };
  
  // Sauvegarde locale (backup)
  try {
    localStorage.setItem('settings', JSON.stringify(data));
  } catch (err) {
    console.warn('Erreur sauvegarde localStorage:', err);
  }
  
  return data;
}

/**
 * Télécharge les données en JSON pour commit Git
 */
export function downloadWorkspaceFile(data: WorkspaceData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workspace.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSettingsFile(data: SettingsData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'settings.json';
  a.click();
  URL.revokeObjectURL(url);
}
