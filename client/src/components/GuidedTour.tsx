import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { TourStep } from "@/hooks/useTour";

interface GuidedTourProps {
  isActive: boolean;
  currentStep: TourStep | undefined;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}

export function GuidedTour({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  progress,
  onNext,
  onPrev,
  onEnd,
}: GuidedTourProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !currentStep) return;

    const updatePosition = () => {
      const target = document.querySelector(currentStep.target);
      if (!target) {
        // If target not found, center the tooltip
        setPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 175,
        });
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipWidth = 350;
      const tooltipHeight = 200;
      const padding = currentStep.highlightPadding || 8;
      const gap = 12;

      let top = 0;
      let left = 0;

      const placement = currentStep.placement || "bottom";

      switch (placement) {
        case "top":
          top = rect.top - tooltipHeight - gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - gap;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
          break;
      }

      // Keep tooltip within viewport
      top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

      setPosition({ top, left });

      // Scroll target into view if needed
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStep]);

  if (!isActive || !currentStep) return null;

  const padding = currentStep.highlightPadding || 8;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {/* Dark overlay with hole for target */}
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.5)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Highlight border around target */}
        {targetRect && (
          <div
            className="absolute border-2 border-violet-500 rounded-lg pointer-events-none animate-pulse"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] w-[350px] pointer-events-auto"
        style={{ top: position.top, left: position.left }}
      >
        <Card className="shadow-2xl border-violet-200 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-100">
                  <HelpCircle className="h-4 w-4 text-violet-600" />
                </div>
                <CardTitle className="text-base font-medium">{currentStep.title}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onEnd}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.content}
            </p>
          </CardContent>
          <CardFooter className="pt-0 flex flex-col gap-3">
            <Progress value={progress} className="h-1" />
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                Passo {currentStepIndex + 1} de {totalSteps}
              </span>
              <div className="flex gap-2">
                {currentStepIndex > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrev}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onNext}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {currentStepIndex === totalSteps - 1 ? (
                    "Concluir"
                  ) : (
                    <>
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

// Botão para iniciar/reiniciar o tour
interface TourButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function TourButton({ onClick, label = "Tour Guiado", className = "" }: TourButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={`gap-2 ${className}`}
    >
      <HelpCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}

export default GuidedTour;
