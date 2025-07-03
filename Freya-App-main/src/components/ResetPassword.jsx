import React, { useState } from 'react';
import { resetPassword } from '../firebase'; 
import '../styles/bienvenida.css';
import { Link } from 'react-router-dom';

// Componente para recuperar la contraseña del usuario
function ResetPassword() {
  // Estado para almacenar el email del usuario que quiere recuperar su contraseña
  const [email, setEmail] = useState('');

  // Función para manejar el envío del formulario de recuperación
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevengo el comportamiento por defecto del formulario
    // Envío el email a la función de Firebase para procesar la recuperación
    await resetPassword(email);
  };

  return (
    <>
    {/* Contenedor principal del formulario de recuperación */}
    <div className="login__container">
      {/* Título de la página */}
      <h2 className='reset_title'>Recuperar contraseña</h2>
      {/* Formulario de recuperación con validación HTML5 */}
      <form className="login__form" onSubmit={handleSubmit}>
        {/* Campo de email con validación automática */}
        <input
          type="email"
          placeholder="Correo registrado"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {/* Botón para enviar el formulario */}
        <button type="submit">Enviar enlace</button>
      </form>
      {/* Enlace para volver al login si ya tiene cuenta */}
      <p>
        ¿Ya tienes cuenta?{' '}
        <Link to="/" className="register__link">
          Inicia sesión
        </Link>
      </p>
    </div>
    </>  
  );
}

// Exporto el componente para usarlo en la aplicación
export default ResetPassword;
