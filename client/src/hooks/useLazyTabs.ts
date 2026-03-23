import { useState, useCallback, useMemo } from "react";

interface TabConfig {
  id: string;
  label: string;
  lazy?: boolean;
}

interface UseLazyTabsReturn {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  loadedTabs: Set<string>;
  shouldRenderTab: (tabId: string) => boolean;
}

export function useLazyTabs(
  tabs: TabConfig[],
  defaultTab: string = tabs[0]?.id || ""
): UseLazyTabsReturn {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    new Set([defaultTab])
  );

  const handleSetActiveTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setLoadedTabs((prev) => new Set([...prev, tabId]));
  }, []);

  const shouldRenderTab = useCallback(
    (tabId: string): boolean => {
      const tab = tabs.find((t) => t.id === tabId);
      // Renderizar se: não é lazy, ou já foi carregado, ou é a aba ativa
      return !tab?.lazy || loadedTabs.has(tabId) || tabId === activeTab;
    },
    [tabs, loadedTabs, activeTab]
  );

  return useMemo(
    () => ({
      activeTab,
      setActiveTab: handleSetActiveTab,
      loadedTabs,
      shouldRenderTab,
    }),
    [activeTab, handleSetActiveTab, loadedTabs, shouldRenderTab]
  );
}
