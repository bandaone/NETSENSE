import { useCallback, useEffect, useState } from 'react';
import { Shell } from './components/layout/Shell';
import { TopologyDataProvider } from './features/topology/components/TopologyDataBoundary';
import type { WorkspaceMode } from './features/workspace/types';
import { Dashboard } from './screens/dashboard';

function workspaceFromPath(pathname: string): WorkspaceMode {
  if (pathname.startsWith('/investigate')) return 'investigate';
  if (pathname.startsWith('/resolve')) return 'resolve';
  return 'observe';
}

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceMode>(() => workspaceFromPath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setWorkspace(workspaceFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((next: WorkspaceMode) => {
    const path = `/${next}`;
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setWorkspace(next);
  }, []);

  return (
    <TopologyDataProvider>
      <Shell activeWorkspace={workspace} onNavigate={navigate}>
        <Dashboard workspace={workspace} />
      </Shell>
    </TopologyDataProvider>
  );
}
