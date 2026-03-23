export type DPOEntityType =
  | 'action_item'
  | 'checklist_item'
  | 'risk_item'
  | 'evidence'
  | 'activity'
  | 'question';

export interface DPOActionContext {
  module?: string;
  page?: string;
  entityType: DPOEntityType;
  entityId: number | string;
  entityName?: string;
  deepLink: string;
  snapshot?: Record<string, unknown>;
}
