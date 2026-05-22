import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { PairPage } from './pages/PairPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  const { isPaired } = useAuth();

  if (!isPaired) {
    return <PairPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
