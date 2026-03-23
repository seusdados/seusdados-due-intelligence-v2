/**
 * Seusdados Due Diligence - Incident Response Module
 * Local Storage Service (Offline Support)
 */

import { Incident, LogEntry } from '../types';

const STORAGE_KEYS = {
  INCIDENTS: 'seusdados_incidents',
  ACTIVE_INCIDENT: 'seusdados_active_incident',
  DRAFT_LOGS: 'seusdados_draft_logs',
  USER_PREFERENCES: 'seusdados_user_preferences',
  EMERGENCY_CONTACTS: 'seusdados_emergency_contacts'
} as const;

class LocalStorageService {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getItem<T>(key: string): T | null {
    if (!this.isAvailable) return null;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private setItem<T>(key: string, value: T): boolean {
    if (!this.isAvailable) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  private removeItem(key: string): boolean {
    if (!this.isAvailable) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  // Incident Methods
  saveIncident(incident: Incident): boolean {
    const incidents = this.getIncidents();
    const index = incidents.findIndex((i) => i.id === incident.id);
    
    if (index >= 0) {
      incidents[index] = { ...incident, updatedAt: new Date() };
    } else {
      incidents.push(incident);
    }
    
    return this.setItem(STORAGE_KEYS.INCIDENTS, incidents);
  }

  getIncidents(): Incident[] {
    return this.getItem<Incident[]>(STORAGE_KEYS.INCIDENTS) || [];
  }

  getIncidentById(id: string): Incident | null {
    const incidents = this.getIncidents();
    return incidents.find((i) => i.id === id) || null;
  }

  removeIncident(id: string): boolean {
    const incidents = this.getIncidents().filter((i) => i.id !== id);
    return this.setItem(STORAGE_KEYS.INCIDENTS, incidents);
  }

  // Active Incident (for quick resume)
  setActiveIncident(incidentId: string): boolean {
    return this.setItem(STORAGE_KEYS.ACTIVE_INCIDENT, incidentId);
  }

  getActiveIncidentId(): string | null {
    return this.getItem<string>(STORAGE_KEYS.ACTIVE_INCIDENT);
  }

  clearActiveIncident(): boolean {
    return this.removeItem(STORAGE_KEYS.ACTIVE_INCIDENT);
  }

  // Draft Logs (for offline support)
  saveDraftLog(incidentId: string, log: Omit<LogEntry, 'id'>): boolean {
    const drafts = this.getDraftLogs(incidentId);
    drafts.push({
      ...log,
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } as LogEntry);
    return this.setItem(`${STORAGE_KEYS.DRAFT_LOGS}_${incidentId}`, drafts);
  }

  getDraftLogs(incidentId: string): LogEntry[] {
    return this.getItem<LogEntry[]>(`${STORAGE_KEYS.DRAFT_LOGS}_${incidentId}`) || [];
  }

  clearDraftLogs(incidentId: string): boolean {
    return this.removeItem(`${STORAGE_KEYS.DRAFT_LOGS}_${incidentId}`);
  }

  // User Preferences
  saveUserPreferences(prefs: Record<string, unknown>): boolean {
    return this.setItem(STORAGE_KEYS.USER_PREFERENCES, prefs);
  }

  getUserPreferences(): Record<string, unknown> | null {
    return this.getItem<Record<string, unknown>>(STORAGE_KEYS.USER_PREFERENCES);
  }

  // Emergency Contacts
  saveEmergencyContacts(contacts: Array<{
    id: string;
    role: string;
    name: string;
    email: string;
    phone: string;
  }>): boolean {
    return this.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, contacts);
  }

  getEmergencyContacts(): Array<{
    id: string;
    role: string;
    name: string;
    email: string;
    phone: string;
  }> {
    return this.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS) || [];
  }

  // Sync Status
  markForSync(incidentId: string): boolean {
    const pendingSync = this.getItem<string[]>('seusdados_pending_sync') || [];
    if (!pendingSync.includes(incidentId)) {
      pendingSync.push(incidentId);
    }
    return this.setItem('seusdados_pending_sync', pendingSync);
  }

  getPendingSync(): string[] {
    return this.getItem<string[]>('seusdados_pending_sync') || [];
  }

  clearPendingSync(incidentId: string): boolean {
    const pendingSync = this.getPendingSync().filter((id) => id !== incidentId);
    return this.setItem('seusdados_pending_sync', pendingSync);
  }

  // Clear all module data
  clearAllData(): boolean {
    if (!this.isAvailable) return false;
    
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    
    // Clear dynamic keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('seusdados_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    
    return true;
  }

  // Export all local data (for debugging/backup)
  exportLocalData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('seusdados_')) {
        data[key] = this.getItem(key);
      }
    }
    
    return data;
  }
}

// Singleton
export const localStorageService = new LocalStorageService();
export { LocalStorageService };
