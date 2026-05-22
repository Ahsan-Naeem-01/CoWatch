import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Room from './pages/Room.jsx';
import Toasts from './components/Toasts.jsx';

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="grain absolute inset-0 pointer-events-none" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:name" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </div>
  );
}
