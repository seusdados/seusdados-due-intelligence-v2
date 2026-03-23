/**
 * Seusdados Due Diligence - Incident Response Module
 * API Service
 */

import {
  Incident,
  IncidentListResponse,
  IncidentCreateRequest,
  IncidentUpdateRequest,
  Phase,
  ChecklistItem,
  LogEntry,
  TriageAnswer,
  IncidentStats
} from '../types';

class IncidentApiService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    };
  }

  setAuthToken(token: string): void {
    this.headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.headers, ...options.headers }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Incident CRUD
  async listIncidents(
    organizationId: string,
    params?: {
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<IncidentListResponse> {
    const queryParams = new URLSearchParams({
      organizationId,
      ...(params?.status && { status: params.status }),
      ...(params?.page && { page: params.page.toString() }),
      ...(params?.pageSize && { pageSize: params.pageSize.toString() })
    });

    return this.request<IncidentListResponse>(`/incidents?${queryParams}`);
  }

  async getIncident(incidentId: string): Promise<Incident> {
    return this.request<Incident>(`/incidents/${incidentId}`);
  }

  async createIncident(data: IncidentCreateRequest): Promise<Incident> {
    return this.request<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateIncident(
    incidentId: string,
    data: IncidentUpdateRequest
  ): Promise<Incident> {
    return this.request<Incident>(`/incidents/${incidentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteIncident(incidentId: string): Promise<void> {
    await this.request(`/incidents/${incidentId}`, {
      method: 'DELETE'
    });
  }

  // Phase Management
  async updatePhase(
    incidentId: string,
    phaseId: number,
    data: Partial<Phase>
  ): Promise<Phase> {
    return this.request<Phase>(
      `/incidents/${incidentId}/phases/${phaseId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      }
    );
  }

  async completePhase(
    incidentId: string,
    phaseId: number,
    userId: string
  ): Promise<Phase> {
    return this.request<Phase>(
      `/incidents/${incidentId}/phases/${phaseId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ userId })
      }
    );
  }

  // Checklist Items
  async toggleChecklistItem(
    incidentId: string,
    phaseId: number,
    itemId: string,
    userId: string,
    isChecked: boolean
  ): Promise<ChecklistItem> {
    return this.request<ChecklistItem>(
      `/incidents/${incidentId}/phases/${phaseId}/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isChecked, userId })
      }
    );
  }

  // Triage
  async submitTriageAnswer(
    incidentId: string,
    answer: TriageAnswer
  ): Promise<Incident> {
    return this.request<Incident>(
      `/incidents/${incidentId}/triage`,
      {
        method: 'POST',
        body: JSON.stringify(answer)
      }
    );
  }

  // Logs
  async addLogEntry(
    incidentId: string,
    entry: Omit<LogEntry, 'id' | 'timestamp'>
  ): Promise<LogEntry> {
    return this.request<LogEntry>(
      `/incidents/${incidentId}/logs`,
      {
        method: 'POST',
        body: JSON.stringify(entry)
      }
    );
  }

  async getIncidentLogs(
    incidentId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<LogEntry[]> {
    const queryParams = new URLSearchParams({
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.offset && { offset: params.offset.toString() })
    });

    return this.request<LogEntry[]>(
      `/incidents/${incidentId}/logs?${queryParams}`
    );
  }

  // Statistics
  async getIncidentStats(organizationId: string): Promise<IncidentStats> {
    return this.request<IncidentStats>(
      `/incidents/stats?organizationId=${organizationId}`
    );
  }

  // Export
  async exportIncident(
    incidentId: string,
    format: 'json' | 'pdf' | 'csv'
  ): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/incidents/${incidentId}/export?format=${format}`,
      {
        headers: this.headers
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.blob();
  }

  // ANPD Communication
  async generateANPDReport(incidentId: string): Promise<{
    reportUrl: string;
    reportData: Record<string, unknown>;
  }> {
    return this.request(`/incidents/${incidentId}/anpd-report`, {
      method: 'POST'
    });
  }

  // Titular Notification
  async generateTitularNotification(
    incidentId: string,
    template?: string
  ): Promise<{ content: string; recipients: number }> {
    return this.request(`/incidents/${incidentId}/titular-notification`, {
      method: 'POST',
      body: JSON.stringify({ template })
    });
  }
}

// Singleton instance factory
let apiServiceInstance: IncidentApiService | null = null;

export const getIncidentApiService = (
  baseUrl?: string,
  authToken?: string
): IncidentApiService => {
  if (!apiServiceInstance && baseUrl) {
    apiServiceInstance = new IncidentApiService(baseUrl, authToken);
  }
  
  if (!apiServiceInstance) {
    throw new Error('IncidentApiService not initialized. Provide baseUrl.');
  }
  
  return apiServiceInstance;
};

export const initIncidentApiService = (
  baseUrl: string,
  authToken?: string
): IncidentApiService => {
  apiServiceInstance = new IncidentApiService(baseUrl, authToken);
  return apiServiceInstance;
};

export { IncidentApiService };
