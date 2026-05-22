import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Room from './pages/Room.jsx';
import Toasts from './components/Toasts.jsx';

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="aurora" aria-hidden />
      <div className="grain" aria-hidden />
      <div className="relative z-10 min-h-screen flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:name" element={<Room />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toasts />
    </div>
  );
}
