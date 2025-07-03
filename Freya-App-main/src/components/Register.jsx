// src/components/Register.jsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';

import '../styles/bienvenida.css';

const Register = () => {
  // Estado para el email del usuario que se está registrando
  const [email, setEmail] = useState('');
  // Estado para la contraseña del usuario que se está registrando
  const [password, setPassword] = useState('');
  // Hook de navegación para redirigir después del registro
  const navigate = useNavigate();

  // Función para manejar el registro de un nuevo usuario
  const handleRegister = async (e) => {
    e.preventDefault(); // Prevengo el comportamiento por defecto del formulario
    try {
      // Creo un nuevo usuario en Firebase Authentication
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/'); // Redirijo a la ruta protegida (Notes) después del registro exitoso
    } catch (error) {
      // Muestro un mensaje de error genérico al usuario
      alert('No se pudo registrar. Verifica los datos.');
      // Registro el error completo en la consola para debugging
      console.error(error);
    }
  };

  return (
    <>
    {/* Contenedor principal del formulario de registro */}
    <div className="login__container">
      {/* Formulario de registro con validación HTML5 */}
      <form onSubmit={handleRegister} className="login__form">
        <h2>Crear Cuenta</h2>
        {/* Campo de email con validación automática */}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus // El cursor se posiciona automáticamente en este campo
        />
        {/* Campo de contraseña con validación de longitud mínima */}
        <input
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6} // Firebase requiere mínimo 6 caracteres
        />
        {/* Botón para enviar el formulario */}
        <button type="submit">Registrarme</button>
        {/* Enlace para ir al login si ya tiene cuenta */}
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/" className="register__link">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
    </>
  );
};

// Exporto el componente para usarlo en la aplicación
export default Register;
