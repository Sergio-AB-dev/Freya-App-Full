// src/components/RequireAuth.jsx
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Navigate, useLocation } from 'react-router-dom';

// Componente de protección de rutas que verifica si el usuario está autenticado
const RequireAuth = ({ children }) => {
  // Estado para controlar si estoy verificando el estado de autenticación
  const [checkingStatus, setCheckingStatus] = useState(true);
  // Estado para almacenar el usuario autenticado (null si no está autenticado)
  const [user, setUser] = useState(null);
  // Obtengo la ubicación actual para preservarla en la redirección
  const location = useLocation();

  // Efecto para escuchar cambios en el estado de autenticación
  useEffect(() => {
    // Me suscribo a los cambios de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // Actualizo el estado del usuario
      setCheckingStatus(false); // Marco que ya terminé de verificar
    });
    // Limpio la suscripción cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  // Mientras verifico el estado de autenticación, muestro un indicador de carga
  if (checkingStatus) {
    return <div>Cargando...</div>;
  }

  // Si el usuario no está autenticado, lo redirijo al login
  if (!user) {
    // Redirijo a /login y preservo la ubicación original en el estado
    // para poder regresar después del login exitoso
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si el usuario está autenticado, renderizo el contenido protegido
  return children;
};

// Exporto el componente para usarlo como wrapper de rutas protegidas
export default RequireAuth;
