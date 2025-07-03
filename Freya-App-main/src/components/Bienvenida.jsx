// src/components/Bienvenida.jsx
// En este componente implemento la pantalla de bienvenida, login, registro y recuperación de contraseña.
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, resetPassword } from '../firebase';
import { useNavigate } from 'react-router-dom';
import '../styles/bienvenida.css';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Bienvenida = () => {
  // Manejo el tab activo: login, registro o recuperación
  const [activeTab, setActiveTab] = useState('login');
  // Estados para el login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Estados para el registro
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  // Estados para recuperación de contraseña
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  // Mensajes de error y éxito para registro
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  // Mensaje de error para login
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();

  // Cada vez que cambio de pestaña, limpio el error de login
  useEffect(() => {
    setLoginError('');
  }, [activeTab]);

  // Función para manejar el login de usuario
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      // Uso Firebase Auth para autenticar
      await signInWithEmailAndPassword(auth, email, password);
      // Si es exitoso, navego al home
      navigate('/home');
    } catch (error) {
      setLoginError('Correo o contraseña incorrectos');
      console.error(error);
    }
  };

  // Función para manejar el registro de usuario
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    // Valido que el usuario ingrese nombre y teléfono
    if (!regNombre.trim() || !regTelefono.trim()) {
      setRegError('Por favor ingresa tu nombre completo y número de teléfono.');
      return;
    }
    try {
      // Registro el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      // Guardo los datos adicionales en Firestore
      const userId = userCredential.user.uid;
      await setDoc(doc(db, 'usuarios', userId, 'perfil', 'datos'), {
        profileData: {
          nombre: regNombre,
          telefono: regTelefono,
          email: regEmail
        }
      });
      setRegSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
      setActiveTab('login');
      setRegEmail('');
      setRegPassword('');
      setRegNombre('');
      setRegTelefono('');
      setRegError('');
    } catch (error) {
      // Manejo el error si el correo ya está registrado
      if (error.code === 'auth/email-already-in-use') {
        setRegError(`El correo electrónico "${regEmail}" ya está registrado.`);
      } else {
        setRegError('No se pudo registrar. Verifica los datos.');
      }
      console.error(error);
    }
  };

  // Función para manejar la recuperación de contraseña
  const handleReset = async (e) => {
    e.preventDefault();
    try {
      // Uso la función personalizada de Firebase para enviar el correo de recuperación
      await resetPassword(resetEmail);
      setResetMsg('Enlace de recuperación enviado. Revisa tu correo.');
      setResetEmail('');
    } catch (error) {
      setResetMsg('No se pudo enviar el enlace. Intenta de nuevo.');
      console.error(error);
    }
  };

  return (
    <>
      <div className="bienvenida__main-container">
        {/* Wrapper para móvil: solo visible en móvil, oculta en desktop */}
        <div className="bienvenida__mobile-wrapper">
          <img src={process.env.PUBLIC_URL + '/ASSETS/freya_logo.svg'} alt="Logo Freya" className="bienvenida__logo" />
          <h1 className="bienvenida__title">Freya-app</h1>
          {/* FORMULARIO: va aquí en móvil */}
          <div className="bienvenida__card">
            <h2 className="bienvenida__welcome">Bienvenido</h2>
            <p className="bienvenida__subtitle">Accede a tu cuenta para continuar</p>
            <div className="bienvenida__tabs">
              <button className={`tab${activeTab === 'login' ? ' active' : ''}`} onClick={() => setActiveTab('login')}>Iniciar Sesión</button>
              <button className={`tab${activeTab === 'register' ? ' active' : ''}`} onClick={() => setActiveTab('register')}>Registrarse</button>
              <button className={`tab${activeTab === 'reset' ? ' active' : ''}`} onClick={() => setActiveTab('reset')}>Recuperar</button>
            </div>
            {/* Formulario de Login */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="login__form">
                <label className="bienvenida__label">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <label className="bienvenida__label">Contraseña</label>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" className="bienvenida__login-btn">Iniciar sesión</button>
                {loginError && <div style={{ color: '#ef4444', marginTop: 10, fontWeight: 500 }}>{loginError}</div>}
              </form>
            )}
            {/* Formulario de Registro */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="login__form">
                <label className="bienvenida__label">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={regNombre}
                  onChange={e => setRegNombre(e.target.value)}
                  required
                  maxLength={80}
                />
                <label className="bienvenida__label">Número de teléfono</label>
                <input
                  type="tel"
                  placeholder="Número de teléfono"
                  value={regTelefono}
                  onChange={e => setRegTelefono(e.target.value)}
                  required
                  maxLength={20}
                />
                <label className="bienvenida__label">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                />
                <label className="bienvenida__label">Contraseña</label>
                <input
                  type="password"
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                />
                <button type="submit" className="bienvenida__login-btn">Registrarse</button>
                {regError && <div style={{ color: '#ef4444', marginTop: 10, fontWeight: 500 }}>{regError}</div>}
                {regSuccess && <div style={{ color: '#22c55e', marginTop: 10, fontWeight: 500 }}>{regSuccess}</div>}
              </form>
            )}
            {/* Formulario de Recuperación */}
            {activeTab === 'reset' && (
              <form onSubmit={handleReset} className="login__form">
                <label className="bienvenida__label">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                />
                <button type="submit" className="bienvenida__login-btn">Enviar enlace</button>
                {resetMsg && <div style={{ color: '#2563eb', marginTop: 10, fontWeight: 500 }}>{resetMsg}</div>}
              </form>
            )}
          </div>
          {/* Fin del formulario móvil */}
          <p className="bienvenida__desc">Tu plataforma educativa para gestionar tus estudios de manera eficiente</p>
          <div className="bienvenida__benefits">
            <div className="benefit-item">
              <span className="benefit-check-circle">✔</span>
              <span>Gestiona tus calificaciones y progreso académico</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-check-circle">✔</span>
              <span>Organiza tus apuntes y tareas pendientes</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-check-circle">✔</span>
              <span>Configura recordatorios para eventos importantes</span>
            </div>
          </div>
        </div>
        {/* Layout original para desktop/tablet */}
        <div className="bienvenida__left">
          <img src={process.env.PUBLIC_URL + '/ASSETS/freya_logo.svg'} alt="Logo Freya" className="bienvenida__logo" />
          <h1 className="bienvenida__title">Freya-app</h1>
          <p className="bienvenida__desc">Tu plataforma educativa para gestionar tus estudios de manera eficiente</p>
          <div className="bienvenida__benefits">
            <div className="benefit-item">
              <span className="benefit-check-circle">✔</span>
              <span>Gestiona tus calificaciones y progreso académico</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-check-circle">✔</span>
              <span>Organiza tus apuntes y tareas pendientes</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-check-circle">✔</span>
              <span>Configura recordatorios para eventos importantes</span>
            </div>
          </div>
        </div>
        <div className="bienvenida__right">
          <div className="bienvenida__card">
            <h2 className="bienvenida__welcome">Bienvenido</h2>
            <p className="bienvenida__subtitle">Accede a tu cuenta para continuar</p>
            <div className="bienvenida__tabs">
              <button className={`tab${activeTab === 'login' ? ' active' : ''}`} onClick={() => setActiveTab('login')}>Iniciar Sesión</button>
              <button className={`tab${activeTab === 'register' ? ' active' : ''}`} onClick={() => setActiveTab('register')}>Registrarse</button>
              <button className={`tab${activeTab === 'reset' ? ' active' : ''}`} onClick={() => setActiveTab('reset')}>Recuperar</button>
            </div>
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="login__form">
                <label className="bienvenida__label">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <label className="bienvenida__label">Contraseña</label>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" className="bienvenida__login-btn">Iniciar sesión</button>
                {loginError && <div style={{ color: '#ef4444', marginTop: 10, fontWeight: 500 }}>{loginError}</div>}
              </form>
            )}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="login__form">
                <label className="bienvenida__label">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={regNombre}
                  onChange={e => setRegNombre(e.target.value)}
                  required
                  maxLength={80}
                />
                <label className="bienvenida__label">Número de teléfono</label>
                <input
                  type="tel"
                  placeholder="Número de teléfono"
                  value={regTelefono}
                  onChange={e => setRegTelefono(e.target.value)}
                  required
                  maxLength={20}
                />
                <label className="bienvenida__label">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                />
                <label className="bienvenida__label">Contraseña</label>
                <input
                  type="password"
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                />
                <button type="submit" className="bienvenida__login-btn">Registrarse</button>
                {regError && <div style={{ color: '#ef4444', marginTop: 10, fontWeight: 500 }}>{regError}</div>}
                {regSuccess && <div style={{ color: '#22c55e', marginTop: 10, fontWeight: 500 }}>{regSuccess}</div>}
              </form>
            )}
            {activeTab === 'reset' && (
              <form onSubmit={handleReset} className="login__form">
                <label className="bienvenida__label">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="tu@ejemplo.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                />
                <button type="submit" className="bienvenida__login-btn">Enviar enlace</button>
                {resetMsg && <div style={{ color: '#2563eb', marginTop: 10, fontWeight: 500 }}>{resetMsg}</div>}
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Exporto el componente para usarlo en las rutas principales
export default Bienvenida;

