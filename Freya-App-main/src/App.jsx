/* ===== IMPORTS DE REACT Y ROUTING ===== */
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './styles/header.css';

/* ===== IMPORTS DE COMPONENTES ===== */
// Componentes principales de la aplicación
import Home from './components/Home';
import Apuntes from './components/Notes';
import Calificaciones from './components/Calificaciones';
import Recordatorios from './components/Recordatorios';
import Configuracion from './components/Configuracion';

// Componentes de autenticación
import Register from './components/Register';
import RequireAuth from './components/RequireAuth';
import ResetPassword from './components/ResetPassword';
import Bienvenida from './components/Bienvenida';

/* ===== COMPONENTE PRINCIPAL DE LA APLICACIÓN ===== */
function App() {
  // Hook para obtener la ubicación actual de la ruta
  const location = useLocation();
  
  // Rutas donde el header debe estar oculto (páginas de autenticación)
  const hiddenHeaderRoutes = ['/', '/register', '/reset-password', '/home', '/apuntes', '/calificaciones', '/recordatorios', '/configuracion'];

  return (
    <div>
      {/* ===== SISTEMA DE RUTAS ===== */}
      <Routes>
        {/* ===== RUTAS PÚBLICAS (SIN AUTENTICACIÓN) ===== */}
        {/* Página de bienvenida/login */}
        <Route path="/" element={<Bienvenida />} />
        
        {/* Página de registro de usuarios */}
        <Route path="/register" element={<Register />} />
        
        {/* Página de restablecimiento de contraseña */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ===== RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN) ===== */}
        {/* Dashboard principal */}
        <Route
          path="/home"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        
        {/* Módulo de apuntes */}
        <Route
          path="/apuntes"
          element={
            <RequireAuth>
              <Apuntes />
            </RequireAuth>
          }
        />
        
        {/* Módulo de calificaciones */}
        <Route
          path="/calificaciones"
          element={
            <RequireAuth>
              <Calificaciones />
            </RequireAuth>
          }
        />
        
        {/* Módulo de recordatorios */}
        <Route
          path="/recordatorios"
          element={
            <RequireAuth>
              <Recordatorios />
            </RequireAuth>
          }
        />
        
        {/* Módulo de configuración */}
        <Route
          path="/configuracion"
          element={
            <RequireAuth>
              <Configuracion />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
