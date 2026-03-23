import { LucideIcon } from "lucide-react";

export type NodeVariant = 
  | 'orb'      // Concluído - Verde esfera
  | 'crystal'  // Conformidade - Violeta hexagonal
  | 'neon'     // IA/Automação - Rosa neon
  | 'ember'    // Crítico - Laranja/Vermelho
  | 'star'     // Destaque - Dourado
  | 'glass'    // Status - Azul glass
  | 'key'      // Permissão - Violeta chave
  | 'link'     // Integração - Índigo
  | 'pulse'    // Em progresso - Azul pulsante
  | 'aurora';  // Especial - Gradiente aurora

interface TimelineNodeProps {
  variant: NodeVariant;
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

const nodeStyles: Record<NodeVariant, string> = {
  orb: `
    bg-gradient-to-br from-green-400 via-green-500 to-green-700
    rounded-full shadow-[0_4px_16px_rgba(22,163,74,0.4)]
    before:absolute before:top-2 before:left-3 before:w-4 before:h-2.5 
    before:bg-gradient-to-b before:from-white/50 before:to-transparent before:rounded-full
  `,
  crystal: `
    bg-gradient-to-br from-violet-400 via-violet-600 to-violet-800
    [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]
    shadow-[0_4px_20px_rgba(124,58,237,0.35)]
  `,
  neon: `
    bg-gradient-to-br from-slate-900 to-slate-800
    [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]
    shadow-[0_0_20px_rgba(236,72,153,0.5)] animate-pulse
    border-2 border-pink-500/50
  `,
  ember: `
    bg-gradient-to-br from-amber-400 via-orange-500 to-red-600
    rounded-xl shadow-[0_4px_20px_rgba(249,115,22,0.4)]
  `,
  star: `
    bg-gradient-to-br from-amber-100 via-amber-400 to-amber-600
    rounded-full shadow-[0_4px_20px_rgba(245,158,11,0.4)]
    ring-[3px] ring-amber-300/40
  `,
  glass: `
    bg-gradient-to-br from-blue-500/90 to-blue-600/95
    rounded-xl backdrop-blur-sm border-2 border-white/25
    shadow-[0_8px_24px_rgba(37,99,235,0.3)]
  `,
  key: `
    bg-gradient-to-br from-violet-300 via-violet-600 to-violet-800
    rounded-[50%_50%_8px_8px] border-[3px] border-white/15
    shadow-[0_6px_20px_rgba(124,58,237,0.35)]
  `,
  link: `
    bg-gradient-to-br from-indigo-300 via-indigo-500 to-indigo-700
    rounded-lg shadow-[0_4px_16px_rgba(99,102,241,0.35)]
  `,
  pulse: `
    bg-white rounded-full border-4 border-blue-500
    animate-[pulse-ring_2s_ease-out_infinite]
  `,
  aurora: `
    bg-gradient-to-br from-emerald-500 via-cyan-500 via-indigo-500 via-purple-500 to-pink-500
    bg-[length:200%_200%] rounded-full animate-[aurora_4s_ease_infinite]
    shadow-[0_4px_20px_rgba(99,102,241,0.35)]
  `,
};

const iconColors: Record<NodeVariant, string> = {
  orb: 'text-white',
  crystal: 'text-white',
  neon: 'text-pink-400',
  ember: 'text-white',
  star: 'text-amber-900',
  glass: 'text-white',
  key: 'text-white',
  link: 'text-white',
  pulse: 'text-blue-500',
  aurora: 'text-white',
};

export function TimelineNode({ 
  variant, 
  icon: Icon, 
  size = 'md',
  className = ''
}: TimelineNodeProps) {
  return (
    <div 
      className={`
        relative flex items-center justify-center
        transition-transform hover:scale-110
        ${sizeClasses[size]}
        ${nodeStyles[variant]}
        ${className}
      `}
    >
      <Icon className={`relative z-10 ${iconSizeClasses[size]} ${iconColors[variant]}`} />
    </div>
  );
}

// Componente de Timeline completo
interface TimelineItemProps {
  variant: NodeVariant;
  icon: LucideIcon;
  title: string;
  description?: string;
  date?: string;
  status?: 'completed' | 'current' | 'pending';
  isLast?: boolean;
}

export function TimelineItem({
  variant,
  icon,
  title,
  description,
  date,
  status = 'pending',
  isLast = false,
}: TimelineItemProps) {
  return (
    <div className="relative flex gap-6 pb-8">
      {/* Linha conectora */}
      {!isLast && (
        <div className="absolute left-7 top-14 w-0.5 h-[calc(100%-3.5rem)] bg-gradient-to-b from-gray-300 to-gray-200" />
      )}
      
      {/* Node */}
      <TimelineNode variant={variant} icon={icon} />
      
      {/* Conteúdo */}
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-3 mb-1">
          <h4 className={`font-semibold ${status === 'completed' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
            {title}
          </h4>
          {status === 'current' && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              Em andamento
            </span>
          )}
          {status === 'completed' && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              Concluído
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mb-1">{description}</p>
        )}
        {date && (
          <span className="text-xs text-[var(--text-muted)]">{date}</span>
        )}
      </div>
    </div>
  );
}

export default TimelineNode;
