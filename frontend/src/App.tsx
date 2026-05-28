import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { PairPage } from './pages/PairPage';
import { DashboardPage } from './pages/DashboardPage';
import { SpacesPage } from './pages/SpacesPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { SyncPage } from './pages/SyncPage';
import { BackupsPage } from './pages/BackupsPage';
import { MemoryAtlasPage } from './pages/MemoryAtlasPage';

function App() {
  const { isPaired } = useAuth();

  if (!isPaired) {
    return <PairPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/spaces" element={<SpacesPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/memory" element={<MemoryAtlasPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/sync" element={<SyncPage />} />
      <Route path="/backups" element={<BackupsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
