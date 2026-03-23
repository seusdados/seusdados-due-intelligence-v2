import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export interface KPICardData {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: "violet" | "blue" | "emerald" | "purple" | "red" | "amber" | "orange" | "green" | "cyan" | "pink";
  onClick?: () => void;
  tooltip?: string;
}

interface KPICardsProps {
  cards: KPICardData[];
  columns?: 2 | 3 | 4 | 5 | 6;
}

const colorMap = {
  violet: {
    gradient: "from-violet-500 to-violet-600",
    border: "from-violet-500 to-violet-600",
  },
  blue: {
    gradient: "from-blue-500 to-blue-600",
    border: "from-blue-500 to-blue-600",
  },
  emerald: {
    gradient: "from-emerald-500 to-emerald-600",
    border: "from-emerald-500 to-emerald-600",
  },
  purple: {
    gradient: "from-purple-500 to-purple-600",
    border: "from-purple-500 to-purple-600",
  },
  red: {
    gradient: "from-red-500 to-red-600",
    border: "from-red-500 to-red-600",
  },
  amber: {
    gradient: "from-amber-500 to-amber-600",
    border: "from-amber-500 to-amber-600",
  },
  orange: {
    gradient: "from-orange-500 to-orange-600",
    border: "from-orange-500 to-orange-600",
  },
  green: {
    gradient: "from-green-500 to-green-600",
    border: "from-green-500 to-green-600",
  },
  cyan: {
    gradient: "from-cyan-500 to-cyan-600",
    border: "from-cyan-500 to-cyan-600",
  },
  pink: {
    gradient: "from-pink-500 to-pink-600",
    border: "from-pink-500 to-pink-600",
  },
};

const columnsMap = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 md:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

/**
 * Componente de cards de KPI padronizado
 * Segue o padrão visual Seusdados com borda colorida no topo
 */
export function KPICards({ cards, columns = 4 }: KPICardsProps) {
  return (
    <div className={`grid grid-cols-1 ${columnsMap[columns]} gap-4`}>
      {cards.map((card, index) => {
        const colors = colorMap[card.color];
        const Icon = card.icon;
        const isClickable = !!card.onClick;
        
        return (
          <Card 
            key={index} 
            className={`overflow-hidden border-0 shadow-lg transition-all duration-300 ${
              isClickable 
                ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' 
                : 'hover:shadow-xl'
            }`}
            onClick={card.onClick}
            title={card.tooltip}
          >
            <div className={`h-1 bg-gradient-to-r ${colors.border}`} />
            <CardHeader className="pb-2">
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                {card.title}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold truncate">
                    {typeof card.value === "number" 
                      ? String(card.value).padStart(2, "0") 
                      : card.value}
                  </p>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
