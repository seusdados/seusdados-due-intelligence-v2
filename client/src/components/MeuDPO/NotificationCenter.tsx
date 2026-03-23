// =====================================================
// MEUDPO PREMIUM - NOTIFICATION CENTER
// Seusdados Due Diligence - Módulo MeuDPO v2.0
// Centro de Notificações em Tempo Real
// =====================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Icons
import {
  Bell, BellRing, Check, CheckCheck, X, MessageSquare,
  AlertTriangle, Clock, UserPlus, FileText, Shield,
  ExternalLink, Trash2, Settings, Volume2, VolumeX
} from "lucide-react";

// =====================================================
// TIPOS
// =====================================================

export type NotificationType = 
  | "novo_ticket"
  | "novo_comentario"
  | "status_alterado"
  | "sla_alerta"
  | "sla_violado"
  | "atribuicao"
  | "mencao"
  | "resolucao";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  ticketId?: number;
  ticketNumber?: string;
  createdAt: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onNavigate?: (url: string) => void;
}

// =====================================================
// CONFIGURAÇÃO DE TIPOS DE NOTIFICAÇÃO
// =====================================================

const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: typeof Bell;
  color: string;
  bgColor: string;
}> = {
  novo_ticket: {
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  novo_comentario: {
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  status_alterado: {
    icon: Shield,
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  sla_alerta: {
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100"
  },
  sla_violado: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100"
  },
  atribuicao: {
    icon: UserPlus,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  },
  mencao: {
    icon: Bell,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100"
  },
  resolucao: {
    icon: CheckCheck,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100"
  }
};

// =====================================================
// COMPONENTE DE ITEM DE NOTIFICAÇÃO
// =====================================================

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: (url: string) => void;
}) {
  const config = NOTIFICATION_CONFIG[notification.type];
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionUrl && onNavigate) {
      onNavigate(notification.actionUrl);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "flex gap-3 p-3 rounded-lg cursor-pointer transition-colors group",
        notification.read 
          ? "bg-background hover:bg-muted/50" 
          : "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={handleClick}
    >
      {/* Ícone */}
      <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm line-clamp-1",
            !notification.read && "font-medium"
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: ptBR
            })}
          </span>
          {notification.ticketNumber && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              #{notification.ticketNumber}
            </Badge>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onNavigate
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const hasUnread = unreadCount > 0;

  // Efeito de som para novas notificações
  useEffect(() => {
    if (soundEnabled && hasUnread) {
      // Poderia tocar um som aqui
    }
  }, [unreadCount, soundEnabled, hasUnread]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <AnimatePresence mode="wait">
            {hasUnread ? (
              <motion.div
                key="ringing"
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 15, -15, 10, -10, 5, -5, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <BellRing className="h-5 w-5" />
              </motion.div>
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </AnimatePresence>
          
          {hasUnread && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center",
                "h-5 w-5 rounded-full bg-destructive text-destructive-foreground",
                "text-xs font-medium"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[380px] p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notificações</h3>
            {hasUnread && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nova{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={onMarkAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* Lista */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 bg-muted rounded-full mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você será notificado sobre atualizações
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <AnimatePresence>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onDelete={onDelete}
                    onNavigate={onNavigate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={onClearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar todas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.("/meudpo?view=list");
                }}
              >
                Ver todos os tickets
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// =====================================================
// HOOK PARA GERENCIAR NOTIFICAÇÕES
// =====================================================

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "createdAt" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    unreadCount: notifications.filter(n => !n.read).length
  };
}

export default NotificationCenter;
