// =====================================================
// MEUDPO PREMIUM - INDEX DE COMPONENTES
// Seusdados Due Diligence - Módulo MeuDPO v2.0
// Exportação centralizada de todos os componentes
// =====================================================

// UI Components Base
export {
  // Tipos
  type TicketType,
  type TicketPriority,
  type TicketStatus,
  
  // Configurações
  TICKET_TYPE_CONFIG,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  
  // Componentes de Badge
  PulseBadge,
  StatusBadge,
  PriorityBadge,
  TicketTypeBadge,
  
  // Componentes de Métrica
  AnimatedCounter,
  MetricCard,
  SLAIndicator,
  
  // Componentes de Ação
  QuickActionsBar,
  
  // Componentes de Estado
  EmptyState,
  TicketCardSkeleton,
  TicketListSkeleton,
  
  // Sistema de Toast
  useToast,
  ToastContainer
} from "./UIComponents";

// Smart DPO Button
export {
  SmartDPOButton,
  AcionarDPO,
  AcionarDPOFloating,
  AcionarDPOCompact,
  CriarDemandaDPO,
  type DPOButtonContext
} from "./SmartDPOButton";

// Notification Center
export {
  NotificationCenter,
  useNotifications,
  type Notification,
  type NotificationType
} from "./NotificationCenter";
