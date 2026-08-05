import { Shell } from './components/layout/Shell';
import { TopologyDataProvider } from './features/topology/components/TopologyDataBoundary';
import { Dashboard } from './screens/dashboard';

export default function App() {
  return (
    <TopologyDataProvider>
      <Shell>
        <Dashboard />
      </Shell>
    </TopologyDataProvider>
  );
}
