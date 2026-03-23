import { 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  Clock, 
  User, 
  Shield, 
  FileSearch, 
  Scale, 
  Bot, 
  Mail,
  Upload,
  Download,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Send,
  Eye,
  LucideIcon
} from "lucide-react";
import { TimelineNode, TimelineItem, NodeVariant } from "./TimelineNode";
import { SmartDPOButton } from './SmartDPOButton';

// Tipos de atividade
export type ActivityType = 
  | 'assessment_created'
  | 'assessment_completed'
  | 'assessment_updated'
  | 'document_uploaded'
  | 'document_downloaded'
  | 'document_shared'
  | 'action_created'
  | 'action_completed'
  | 'action_updated'
  | 'email_sent'
  | 'email_reminder'
  | 'user_invited'
  | 'user_joined'
  | 'risk_identified'
  | 'risk_mitigated'
  | 'ai_analysis'
  | 'review_scheduled'
  | 'review_completed'
  | 'contract_analyzed'
  | 'dpia_generated'
  | 'custom';

// Mapeamento de tipo de atividade para variante e ícone
const activityConfig: Record<ActivityType, { variant: NodeVariant; icon: LucideIcon; label: string }> = {
  assessment_created: { variant: 'crystal', icon: Plus, label: 'Avaliação criada' },
  assessment_completed: { variant: 'orb', icon: CheckCircle2, label: 'Avaliação concluída' },
  assessment_updated: { variant: 'glass', icon: Edit, label: 'Avaliação atualizada' },
  document_uploaded: { variant: 'link', icon: Upload, label: 'Documento enviado' },
  document_downloaded: { variant: 'glass', icon: Download, label: 'Documento baixado' },
  document_shared: { variant: 'link', icon: Send, label: 'Documento compartilhado' },
  action_created: { variant: 'crystal', icon: Plus, label: 'Ação criada' },
  action_completed: { variant: 'orb', icon: CheckCircle2, label: 'Ação concluída' },
  action_updated: { variant: 'glass', icon: Edit, label: 'Ação atualizada' },
  email_sent: { variant: 'link', icon: Mail, label: 'E-mail enviado' },
  email_reminder: { variant: 'pulse', icon: Clock, label: 'Lembrete enviado' },
  user_invited: { variant: 'key', icon: User, label: 'Usuário convidado' },
  user_joined: { variant: 'star', icon: User, label: 'Usuário ingressou' },
  risk_identified: { variant: 'ember', icon: AlertTriangle, label: 'Risco identificado' },
  risk_mitigated: { variant: 'orb', icon: Shield, label: 'Risco mitigado' },
  ai_analysis: { variant: 'neon', icon: Bot, label: 'Análise de IA' },
  review_scheduled: { variant: 'pulse', icon: Clock, label: 'Revisão agendada' },
  review_completed: { variant: 'orb', icon: CheckCircle2, label: 'Revisão concluída' },
  contract_analyzed: { variant: 'crystal', icon: Scale, label: 'Contrato analisado' },
  dpia_generated: { variant: 'aurora', icon: Shield, label: 'DPIA gerado' },
  custom: { variant: 'glass', icon: FileText, label: 'Atividade' },
};

// Interface para uma atividade
export interface Activity {
  id: string | number;
  type: ActivityType;
  title: string;
  description?: string;
  date: string | Date;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
  customIcon?: LucideIcon;
  customVariant?: NodeVariant;
}

// Props do componente
interface ActivityTimelineProps {
  activities: Activity[];
  showUserAvatar?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  className?: string;
}

// Formata data relativa
function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Formata data completa
function formatFullDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityTimeline({
  activities,
  showUserAvatar = true,
  maxItems,
  emptyMessage = 'Nenhuma atividade registrada',
  className = '',
}: ActivityTimelineProps) {
  const displayActivities = maxItems ? activities.slice(0, maxItems) : activities;

  if (displayActivities.length === 0) {
    return (
      <div className={`text-center py-8 text-[var(--text-muted)] ${className}`}>
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {displayActivities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const icon = activity.customIcon || config.icon;
        const variant = activity.customVariant || config.variant;
        const isLast = index === displayActivities.length - 1;

        return (
          <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Linha conectora */}
            {!isLast && (
              <div className="absolute left-5 top-12 w-0.5 h-[calc(100%-2.5rem)] bg-gradient-to-b from-[var(--border-default)] to-transparent" />
            )}
            
            {/* Node */}
            <div className="shrink-0">
              <TimelineNode variant={variant} icon={icon} size="sm" />
            </div>
            
            {/* Conteúdo */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-medium text-[var(--text-primary)] truncate">
                    {activity.title}
                  </h4>
                  {activity.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SmartDPOButton
                    context={{
                      module: 'Due Diligence',
                      page: 'Timeline de Atividades',
                      entityType: 'activity',
                      entityId: activity.id,
                      entityName: activity.title,
                      deepLink: `${window.location.pathname}#atividade-${activity.id}`,
                      snapshot: {
                        type: activity.type,
                        title: activity.title,
                        description: activity.description,
                        date: activity.date,
                      },
                    }}
                    variant="ghost"
                    size="sm"
                    iconOnly
                  />
                  <span 
                    className="text-xs text-[var(--text-muted)] whitespace-nowrap"
                    title={formatFullDate(activity.date)}
                  >
                    {formatRelativeDate(activity.date)}
                  </span>
                </div>
              </div>
              
              {/* Usuário */}
              {showUserAvatar && activity.user && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-xs font-medium text-[var(--text-muted)]">
                    {activity.user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {activity.user.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {maxItems && activities.length > maxItems && (
        <div className="text-center pt-4">
          <button className="text-sm text-[var(--brand-accent)] hover:underline">
            Ver todas as {activities.length} atividades
          </button>
        </div>
      )}
    </div>
  );
}

// Componente de Timeline compacta para cards
interface CompactTimelineProps {
  activities: Activity[];
  maxItems?: number;
  className?: string;
}

export function CompactTimeline({
  activities,
  maxItems = 5,
  className = '',
}: CompactTimelineProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className={`space-y-3 ${className}`}>
      {displayActivities.map((activity) => {
        const config = activityConfig[activity.type];
        const icon = activity.customIcon || config.icon;
        const Icon = icon;

        return (
          <div key={activity.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-primary)] truncate">
                {activity.title}
              </p>
              <span className="text-xs text-[var(--text-muted)]">
                {formatRelativeDate(activity.date)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ActivityTimeline;
