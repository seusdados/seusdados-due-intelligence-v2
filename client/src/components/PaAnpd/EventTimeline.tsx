import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, FileText, AlertTriangle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'incident' | 'case' | 'act' | 'deadline' | 'cis';
  status?: 'pending' | 'completed' | 'alert' | 'overdue';
}

interface EventTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}

export function EventTimeline({ events, isLoading }: EventTimelineProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'incident':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'case':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'act':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'deadline':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cis':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'alert':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'incident':
        return 'Incidente';
      case 'case':
        return 'Caso';
      case 'act':
        return 'Ato';
      case 'deadline':
        return 'Prazo';
      case 'cis':
        return 'CIS';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nenhum evento registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          {/* Timeline line and dot */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
              {getEventIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-200 mt-2" />
            )}
          </div>

          {/* Event content */}
          <div className="flex-1 pt-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-sm">{event.title}</h3>
                {event.description && (
                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                )}
              </div>
              <Badge className={getStatusColor(event.status)}>
                {getTypeLabel(event.type)}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(event.date).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
