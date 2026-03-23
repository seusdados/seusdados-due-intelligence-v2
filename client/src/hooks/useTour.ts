import { useState, useEffect, useCallback } from "react";

const TOUR_STORAGE_KEY = "seusdados_tour_completed";

export interface TourStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  highlightPadding?: number;
}

export interface TourConfig {
  id: string;
  name: string;
  steps: TourStep[];
}

interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  completedTours: string[];
}

export function useTour(tourConfig: TourConfig) {
  const [state, setState] = useState<TourState>({
    isActive: false,
    currentStepIndex: 0,
    completedTours: [],
  });

  // Load completed tours from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      if (stored) {
        const completedTours = JSON.parse(stored) as string[];
        setState(prev => ({ ...prev, completedTours }));
      }
    } catch (e) {
      console.error("Error loading tour state:", e);
    }
  }, []);

  // Save completed tours to localStorage
  const saveCompletedTours = useCallback((tours: string[]) => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tours));
    } catch (e) {
      console.error("Error saving tour state:", e);
    }
  }, []);

  // Check if tour was already completed
  const isTourCompleted = useCallback(() => {
    return state.completedTours.includes(tourConfig.id);
  }, [state.completedTours, tourConfig.id]);

  // Start the tour
  const startTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      currentStepIndex: 0,
    }));
  }, []);

  // Go to next step
  const nextStep = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= tourConfig.steps.length) {
        // Tour completed
        const newCompletedTours = [...prev.completedTours, tourConfig.id];
        saveCompletedTours(newCompletedTours);
        return {
          ...prev,
          isActive: false,
          currentStepIndex: 0,
          completedTours: newCompletedTours,
        };
      }
      return {
        ...prev,
        currentStepIndex: nextIndex,
      };
    });
  }, [tourConfig.steps.length, tourConfig.id, saveCompletedTours]);

  // Go to previous step
  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  // Skip/end the tour
  const endTour = useCallback(() => {
    const newCompletedTours = [...state.completedTours, tourConfig.id];
    saveCompletedTours(newCompletedTours);
    setState(prev => ({
      ...prev,
      isActive: false,
      currentStepIndex: 0,
      completedTours: newCompletedTours,
    }));
  }, [state.completedTours, tourConfig.id, saveCompletedTours]);

  // Reset tour (allow to run again)
  const resetTour = useCallback(() => {
    const newCompletedTours = state.completedTours.filter(id => id !== tourConfig.id);
    saveCompletedTours(newCompletedTours);
    setState(prev => ({
      ...prev,
      completedTours: newCompletedTours,
    }));
  }, [state.completedTours, tourConfig.id, saveCompletedTours]);

  // Reset all tours
  const resetAllTours = useCallback(() => {
    saveCompletedTours([]);
    setState(prev => ({
      ...prev,
      completedTours: [],
    }));
  }, [saveCompletedTours]);

  const currentStep = tourConfig.steps[state.currentStepIndex];
  const progress = tourConfig.steps.length > 0 
    ? ((state.currentStepIndex + 1) / tourConfig.steps.length) * 100 
    : 0;

  return {
    isActive: state.isActive,
    currentStep,
    currentStepIndex: state.currentStepIndex,
    totalSteps: tourConfig.steps.length,
    progress,
    isTourCompleted,
    startTour,
    nextStep,
    prevStep,
    endTour,
    resetTour,
    resetAllTours,
  };
}

export default useTour;
