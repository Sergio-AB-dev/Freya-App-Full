import React, { useState, useRef, useEffect } from 'react';
import "../styles/home.css";
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, doc, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';
import Header from './Header';
import Sidebar from './Sidebar';
// Puedes instalar react-icons si lo deseas, aquí uso emojis para simplicidad

// Datos de resumen para las tarjetas principales
const resumen = [
  { titulo: 'Promedio General', valor: '4.0', desc: '', icon: '🎓' },
  { titulo: 'Materias Cursando', valor: 6, desc: 'Semestre actual', icon: '📄' },
  { titulo: 'Notificaciones', valor: 0, desc: 'Sin leer', icon: '🔔', dynamic: true },
];

// Recomendaciones para las tarjetas
const recomendaciones = [
  {
    icono: '🗓️',
    color: '#e3f0ff',
    iconBg: '#2563eb',
    titulo: 'Planifica tu semana',
    texto: 'Organiza tus actividades académicas al comenzar la semana. La claridad evita el estrés.',
    pie: 'Recomendado para ti'
  },
  {
    icono: '⏳',
    color: '#e6fbe8',
    iconBg: '#22c55e',
    titulo: 'Estudia por bloques de tiempo',
    texto: 'Estudiar en sesiones cortas y enfocadas mejora la concentración y retención.',
    pie: 'Mejora tu enfoque'
  },
  {
    icono: '🛌',
    color: '#f3e8ff',
    iconBg: '#a259f7',
    titulo: 'Respeta tus horas de sueño',
    texto: 'Dormir bien potencia la memoria, el estado de ánimo y el rendimiento.',
    pie: 'Tip científico'
  },
  {
    icono: '🎯',
    color: '#fffbe6',
    iconBg: '#facc15',
    titulo: 'Fija metas diarias',
    texto: 'Establecer pequeños objetivos diarios te mantiene motivado y enfocado.',
    pie: 'Motivación diaria'
  },
  {
    icono: '🔁',
    color: '#e6fbe8',
    iconBg: '#22c55e',
    titulo: 'Repasa con frecuencia',
    texto: 'El repaso constante es más efectivo que estudiar todo de una vez al final.',
    pie: 'Aprendizaje efectivo'
  },
  {
    icono: '🥗',
    color: '#ffe6e6',
    iconBg: '#ffb3b3',
    titulo: 'Aliméntate bien e hidrátate',
    texto: 'Una mente activa necesita energía y agua. Tu cuerpo también estudia contigo.',
    pie: 'Salud y energía'
  },
  {
    icono: '🧑‍🤝‍🧑',
    color: '#e3f0ff',
    iconBg: '#2563eb',
    titulo: 'Estudiar acompañado ayuda',
    texto: 'Compartir conocimientos con otros mejora la comprensión y la memoria.',
    pie: 'Aprende en grupo'
  },
  {
    icono: '🚫📱',
    color: '#f3e8ff',
    iconBg: '#a259f7',
    titulo: 'Reduce las distracciones',
    texto: 'Aleja el celular y redes sociales mientras estudias. Tu enfoque lo agradecerá.',
    pie: 'Concéntrate mejor'
  }
];

// Colores RYB para identificar materias
const coloresRYB = [
  '#ff0000', // rojo
  '#ff8000', // naranja
  '#ffff00', // amarillo
  '#80ff00', // amarillo verdoso
  '#00ff00', // verde
  '#00ff80', // verde azulado
  '#00ffff', // cian
  '#0080ff', // azul
  '#0000ff', // azul puro
  '#8000ff', // violeta
  '#ff00ff', // magenta
  '#ff0080'  // rosa
];

const Loader = () => (
  <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'70vh',width:'100%'}}>
    <div className="loader-spinner" style={{width:60,height:60,border:'6px solid #e0e7ef',borderTop:'6px solid #2563eb',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
    <style>{`@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`}</style>
  </div>
);

const Home = () => {
  // Manejo la pestaña activa
  const [tab, setTab] = useState('calificaciones');
  // Estado del menú de usuario
  const [menuOpen, setMenuOpen] = useState(false);
  // Número de notificaciones activas
  const [notificacionesCount, setNotificacionesCount] = useState(0);
  // Referencia para cerrar el menú de usuario al hacer click fuera
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Nombre del usuario autenticado
  const [userName, setUserName] = useState(null);
  // Índice para el carrusel de recomendaciones
  const [recomendacionIndex, setRecomendacionIndex] = useState(0);
  // Número de tarjetas visibles en el carrusel
  const recomendacionesVisibles = 3; // Se muestran 3 tarjetas a la vez
  // Total de páginas para el carrusel
  const totalPaginas = recomendaciones.length - recomendacionesVisibles + 1; // Cambio en el cálculo para movimiento de una en una
  // Fecha seleccionada en el calendario
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  // Fechas que tienen recordatorios para marcarlas en el calendario
  const [fechasConRecordatorios, setFechasConRecordatorios] = useState([]);
  // Estado del sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // -------------------- Usuario autenticado --------------------
  // Guardo el ID del usuario autenticado
  const [userId, setUserId] = useState(null);
  // Estado de carga
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  // Estado para el avatar del usuario
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Delay para mostrar el loader solo si la carga tarda más de 350ms
  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(true), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Escucho cambios de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Obtengo el nombre real del usuario y avatar desde Firestore
  useEffect(() => {
    if (!userId) return;
    const perfilRef = doc(db, 'usuarios', userId, 'perfil', 'datos');
    const unsubscribe = onSnapshot(perfilRef, (docSnap) => {
      const data = docSnap.data();
      let nombre = data?.profileData?.nombre || '';
      // Solo el primer nombre
      if (nombre) nombre = nombre.trim().split(' ')[0];
      setUserName(nombre || 'Usuario');
      setAvatarUrl(data?.profileData?.avatar || null);
    });
    return () => unsubscribe();
  }, [userId]);

  // -------------------- Materias y notas desde Firestore --------------------
  // Lista de materias del usuario
  const [materias, setMaterias] = useState(null);
  // Notas por materia (diccionario)
  const [detalleNotas, setDetalleNotas] = useState({});
  useEffect(() => {
    if (!userId) return;
    const materiasRef = collection(db, 'usuarios', userId, 'materias');
    // Listener de materias
    const unsubscribeMaterias = onSnapshot(materiasRef, (snapshot) => {
      const materiasFS = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setMaterias(materiasFS);
      // Listeners de notas por cada materia
      const unsubNotas = {};
      materiasFS.forEach(materia => {
        const notasRef = collection(db, 'usuarios', userId, 'materias', materia.id, 'notas');
        unsubNotas[materia.id] = onSnapshot(notasRef, (notasSnap) => {
          setDetalleNotas(prev => ({
            ...prev,
            [materia.id]: notasSnap.docs.map(n => ({ id: n.id, ...n.data() }))
          }));
        });
      });
      // Limpiar listeners de notas al desmontar o cambiar materias
      return () => {
        Object.values(unsubNotas).forEach(unsub => unsub && unsub());
      };
    });
    return () => unsubscribeMaterias();
  }, [userId]);

  // Función auxiliar para convertir fecha de Firestore a objeto Date de JS
  const convertFirestoreDate = (dateValue) => {
    if (!dateValue) return null;
    // Si es un objeto Timestamp de Firestore
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    // Si es un string (formato ISO)
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      // Verificar que el string se haya podido convertir a una fecha válida
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null; // Devolver null si el formato no es reconocido
  };

  // Efecto para obtener las notificaciones activas
  useEffect(() => {
    if (!userId) return;
    const recordatoriosCollectionRef = collection(db, 'usuarios', userId, 'recordatorios');
    const unsubscribe = onSnapshot(recordatoriosCollectionRef, (snapshot) => {
      const recordatorios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Calcular notificaciones activas: recordatorios pendientes cuya fecha y hora ya han pasado
      const ahora = new Date();
      const notificacionesActivas = recordatorios.filter(r => {
        if (r.completado) return false; // Solo recordatorios no completados
        const fechaRecordatorio = convertFirestoreDate(r.fecha);
        return fechaRecordatorio instanceof Date && fechaRecordatorio <= ahora;
      });
      setNotificacionesCount(notificacionesActivas.length);
      const fechas = recordatorios
        .filter(r => !r.completado) // Filtrar solo los no completados
        .map(r => convertFirestoreDate(r.fecha))
        .filter(fecha => fecha instanceof Date);
      setFechasConRecordatorios(fechas);
    });
    return () => unsubscribe();
  }, [userId]);

  // Efecto para el carrusel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setRecomendacionIndex((prev) => {
        if (prev >= totalPaginas - 1) {
          return 0; // Volver al inicio cuando llegue al final
        }
        return prev + 1;
      });
    }, 7000); // 7 segundos

    return () => clearInterval(interval);
  }, [totalPaginas]);

  // Función para calcular promedio simple de una materia
  const calcPromedioMateria = (notas) => {
    if (!notas || !notas.length) return null;
    const suma = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    return parseFloat((suma / notas.length).toFixed(1));
  };

  // Prepara los datos para la gráfica
  const materiasOrdenadas = [...(materias || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  const datosGrafica = materiasOrdenadas.map((materia) => {
    const notas = detalleNotas[materia.id] || [];
    const promedio = calcPromedioMateria(notas);
    return {
      ...materia,
      nota: promedio,
      color: materia.color,
    };
  });

  // Componente personalizado para los ticks del eje X de la gráfica
  const CustomXAxisTick = ({ x, y, payload }) => {
    if (!payload || !payload.value) return null;
    const materia = datosGrafica.find(m => m.nombre === payload.value);
    const color = materia ? materia.color : '#ccc';

    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-60} y={5} width={120} height={22}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: color,
              flexShrink: 0
            }}></span>
            <span style={{ color: '#666', fontSize: '14px', whiteSpace: 'nowrap' }}>{payload.value}</span>
          </div>
        </foreignObject>
      </g>
    );
  };

  // Función para obtener color de barra según la nota (escala 1-10)
  const getColorBarra = (prom) => {
    if (prom === null) return '#e5e7eb'; // gris si no hay nota
    const p = Number(prom);
    if (p >= 0 && p <= 1) return '#ef4444'; // rojo
    if (p > 1 && p < 2) return '#f97316'; // naranja
    if (p >= 2 && p < 3) return '#facc15'; // amarillo
    if (p >= 3 && p <= 4) return '#4ade80'; // verde claro
    if (p > 4 && p <= 5) return '#059669'; // verde oscuro
    return '#e5e7eb';
  };

  // Cierro el menú si se hace click fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Manejo las opciones del menú de usuario
  const handleMenuClick = (option) => {
    setMenuOpen(false);
    if (option === 'perfil') navigate('/configuracion?tab=perfil');
    if (option === 'seguridad') navigate('/configuracion?tab=seguridad');
    if (option === 'logout') navigate('/');
  };

  // Configuración para el calendario
  const modifiers = {
    conRecordatorio: fechasConRecordatorios,
  };
  const modifiersClassNames = {
    conRecordatorio: 'rdp-day_conRecordatorio'
  };

  // Manejo la navegación del carrusel de recomendaciones
  const handlePrev = () => {
    setRecomendacionIndex((prev) => {
      if (prev <= 0) {
        return totalPaginas - 1; // Ir al final cuando esté en el inicio
      }
      return prev - 1;
    });
  };
  const handleNext = () => {
    setRecomendacionIndex((prev) => {
      if (prev >= totalPaginas - 1) {
        return 0; // Volver al inicio cuando llegue al final
      }
      return prev + 1;
    });
  };

  // Calculo el promedio general usando los datos reales
  const promedioGeneral = (() => {
    const promedios = datosGrafica.map(m => m.nota).filter(n => typeof n === 'number' && !isNaN(n));
    if (!promedios.length) return '—';
    return (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1);
  })();
  // Actualizo el resumen con los datos reales
  const resumen = [
    { titulo: 'Promedio General', valor: promedioGeneral, desc: '', icon: '🎓' },
    { titulo: 'Materias Cursando', valor: (materias || []).length, desc: 'Semestre actual', icon: '📄' },
    { titulo: 'Notificaciones', valor: notificacionesCount, desc: 'Sin leer', icon: '🔔', dynamic: true },
  ];

  // Inicial para el avatar del usuario
  const userInitial = userName?.[0]?.toUpperCase() || 'U';

  // Hook para detectar si es móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 800);
  const [isSmallMobile, setIsSmallMobile] = useState(window.innerWidth <= 600);
  const [isExtraSmallMobile, setIsExtraSmallMobile] = useState(window.innerWidth <= 400);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 800);
      setIsSmallMobile(window.innerWidth <= 600);
      setIsExtraSmallMobile(window.innerWidth <= 400);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cuando materias y userName están listos, oculto el loader
  useEffect(() => {
    if (userId && userName !== null && materias !== null) {
      setLoading(false);
      setShowLoader(false);
    }
  }, [userId, userName, materias]);

  if (loading && showLoader) return <Loader />;
  if (materias === null || userName === null) return null;

  return (
    <div className="dashboard__container">
      {/* Sidebar */}
      <Sidebar location={location} navigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Main */}
      <div className="dashboard__main">
        {/* Header */}
        <Header
          notificaciones={notificacionesCount}
          onNotificacionesClick={() => navigate('/recordatorios')}
          userInitial={userInitial}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          userMenuRef={userMenuRef}
          handleMenuClick={handleMenuClick}
          onMenuClick={() => setSidebarOpen(true)}
          avatarUrl={avatarUrl}
        />
        {/* Contenido principal */}
        <div className="dashboard__content">
          <h1 className="dashboard__title">Bienvenido, {userName}</h1>
          <p className="dashboard__subtitle">Aquí tienes un resumen de tu progreso académico</p>
          {/* Tarjetas de resumen y recomendaciones */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
            {isMobile ? (
              <>
                {/* Recomendaciones primero en móvil */}
                <div style={{ flex: 2, minWidth: 0, background: 'white', borderRadius: '18px', boxShadow: '0 2px 8px #0001', padding: '24px 0 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '18px', color: '#222', marginLeft: '32px', marginBottom: '10px' }}>Recomendaciones</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button onClick={handlePrev} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#2563eb', padding: '0 8px' }} aria-label="Anterior">&#8592;</button>
                    <div style={{ overflow: 'hidden', width: isExtraSmallMobile ? 'calc(1 * 280px + 16px)' : isSmallMobile ? 'calc(1 * 300px + 16px)' : 'calc(1 * 320px + 16px)' }}>
                      <div style={{ display: 'flex', transition: 'transform 0.4s', transform: `translateX(-${recomendacionIndex * (isExtraSmallMobile ? 296 : isSmallMobile ? 316 : 336)}px)` }}>
                        {recomendaciones.map((rec, idx) => (
                          <div key={idx} style={{ 
                            minWidth: isExtraSmallMobile ? 280 : isSmallMobile ? 300 : 320, 
                            maxWidth: isExtraSmallMobile ? 280 : isSmallMobile ? 300 : 320, 
                            marginRight: 16, 
                            background: rec.color, 
                            borderRadius: '16px', 
                            boxShadow: '0 2px 8px #0001', 
                            padding: isExtraSmallMobile ? '14px 14px 8px 14px' : isSmallMobile ? '16px 16px 10px 16px' : '18px 18px 12px 18px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '10px', 
                            minHeight: isExtraSmallMobile ? '100px' : isSmallMobile ? '105px' : '110px' 
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ 
                                background: rec.iconBg, 
                                color: '#fff', 
                                borderRadius: '50%', 
                                width: isExtraSmallMobile ? 32 : isSmallMobile ? 35 : 38, 
                                height: isExtraSmallMobile ? 32 : isSmallMobile ? 35 : 38, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: isExtraSmallMobile ? '18px' : isSmallMobile ? '20px' : '22px', 
                                boxShadow: '0 1px 4px #0001' 
                              }}>{rec.icono}</span>
                              <span style={{ 
                                fontWeight: 600, 
                                fontSize: isExtraSmallMobile ? '14px' : isSmallMobile ? '15px' : '16px', 
                                color: '#222' 
                              }}>{rec.titulo}</span>
                            </div>
                            <div style={{ 
                              color: '#555', 
                              fontSize: isExtraSmallMobile ? '12px' : isSmallMobile ? '13px' : '14px', 
                              marginLeft: '50px', 
                              marginTop: '-6px' 
                            }}>{rec.texto}</div>
                            <div style={{ 
                              color: '#888', 
                              fontSize: isExtraSmallMobile ? '11px' : isSmallMobile ? '12px' : '13px', 
                              marginLeft: '50px', 
                              marginTop: '2px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px' 
                            }}>
                              <span style={{ fontSize: isExtraSmallMobile ? '13px' : isSmallMobile ? '14px' : '15px' }}>⭐</span> {rec.pie}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleNext} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#2563eb', padding: '0 8px' }} aria-label="Siguiente">&#8594;</button>
                  </div>
                  {/* Indicadores de página */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, gap: 6 }}>
                    {Array.from({ length: totalPaginas }).map((_, i) => (
                      <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i === recomendacionIndex ? '#2563eb' : '#cbd5e1', display: 'inline-block', transition: 'background 0.2s' }}></span>
                    ))}
                  </div>
                </div>
                {/* Promedio General después en móvil */}
                <div className="resumen__card" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0', paddingLeft: '32px' }}>
                  <img
                    src={process.env.PUBLIC_URL + '/ASSETS/animacion_1.png'}
                    alt="Animación"
                    style={{
                      height: isExtraSmallMobile ? '80px' : isSmallMobile ? '95px' : '110px',
                      maxWidth: isExtraSmallMobile ? '100px' : isSmallMobile ? '120px' : '140px',
                      objectFit: 'contain',
                      marginRight: '-40px',
                      marginLeft: '0',
                      zIndex: 2,
                    }}
                  />
                  <div className="resumen__info" style={{ display: 'flex', alignItems: 'center', gap: '0', justifyContent: 'center', zIndex: 1 }}>
                    <div>
                      <div className="resumen__valor" style={{ 
                        fontSize: isExtraSmallMobile ? '3.5rem' : isSmallMobile ? '4.2rem' : '4.2rem', 
                        fontWeight: 700 
                      }}>{resumen[0].valor}</div>
                      <div className="resumen__titulo" style={{ 
                        fontSize: isExtraSmallMobile ? '1.3rem' : isSmallMobile ? '1.5rem' : '1.5rem', 
                        fontWeight: 500 
                      }}>{resumen[0].titulo}</div>
                      <div className="resumen__desc">{resumen[0].desc}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Promedio General primero en desktop */}
                <div className="resumen__card" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0', paddingLeft: '32px' }}>
                  <img
                    src={process.env.PUBLIC_URL + '/ASSETS/animacion_1.png'}
                    alt="Animación"
                    style={{
                      height: '200px',
                      maxWidth: '240px',
                      objectFit: 'contain',
                      marginRight: '-40px',
                      marginLeft: '0',
                      zIndex: 2,
                    }}
                  />
                  <div className="resumen__info" style={{ display: 'flex', alignItems: 'center', gap: '0', justifyContent: 'center', zIndex: 1 }}>
                    <div>
                      <div className="resumen__valor" style={{ fontSize: '6.9rem', fontWeight: 700 }}>{resumen[0].valor}</div>
                      <div className="resumen__titulo" style={{ fontSize: '1.7rem', fontWeight: 500 }}>{resumen[0].titulo}</div>
                      <div className="resumen__desc">{resumen[0].desc}</div>
                    </div>
                  </div>
                </div>
                {/* Recomendaciones después en desktop */}
                <div style={{ flex: 2, minWidth: 0, background: 'white', borderRadius: '18px', boxShadow: '0 2px 8px #0001', padding: '24px 0 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '18px', color: '#222', marginLeft: '32px', marginBottom: '10px' }}>Recomendaciones</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button onClick={handlePrev} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#2563eb', padding: '0 8px' }} aria-label="Anterior">&#8592;</button>
                    <div style={{ overflow: 'hidden', width: 'calc(3 * 320px + 32px)' }}>
                      <div style={{ display: 'flex', transition: 'transform 0.4s', transform: `translateX(-${recomendacionIndex * 336}px)` }}>
                        {recomendaciones.map((rec, idx) => (
                          <div key={idx} style={{ minWidth: 320, maxWidth: 320, marginRight: 16, background: rec.color, borderRadius: '16px', boxShadow: '0 2px 8px #0001', padding: '18px 18px 12px 18px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '110px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ background: rec.iconBg, color: '#fff', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 1px 4px #0001' }}>{rec.icono}</span>
                              <span style={{ fontWeight: 600, fontSize: '16px', color: '#222' }}>{rec.titulo}</span>
                            </div>
                            <div style={{ color: '#555', fontSize: '14px', marginLeft: '50px', marginTop: '-6px' }}>{rec.texto}</div>
                            <div style={{ color: '#888', fontSize: '13px', marginLeft: '50px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '15px' }}>⭐</span> {rec.pie}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleNext} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#2563eb', padding: '0 8px' }} aria-label="Siguiente">&#8594;</button>
                  </div>
                  {/* Indicadores de página */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, gap: 6 }}>
                    {Array.from({ length: totalPaginas }).map((_, i) => (
                      <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i === recomendacionIndex ? '#2563eb' : '#cbd5e1', display: 'inline-block', transition: 'background 0.2s' }}></span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Tabs */}
          <div className="dashboard__tabs">
            <button className={tab === 'calificaciones' ? 'tab active' : 'tab'} onClick={()=>setTab('calificaciones')}>Calificaciones Recientes</button>
          </div>
          {/* Calificaciones Recientes y Recomendaciones */}
          {tab === 'calificaciones' && (
            <div style={{ display: 'flex', gap: '32px', marginTop: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
              {/* Gráfica de barras */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  width: '100%', 
                  height: isExtraSmallMobile ? 250 : isSmallMobile ? 280 : 350, 
                  background: 'white', 
                  borderRadius: '16px', 
                  padding: isExtraSmallMobile ? '12px 8px' : isSmallMobile ? '16px 12px' : '24px', 
                  boxSizing: 'border-box', 
                  boxShadow: '0 2px 8px #0001' 
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGrafica} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                      <Bar dataKey="nota" name="Calificación" radius={[8, 8, 0, 0]}>
                        {datosGrafica.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Tarjeta de calendario */}
              <div style={{ 
                width: isExtraSmallMobile ? '100%' : isSmallMobile ? '100%' : 340, 
                height: isExtraSmallMobile ? 250 : isSmallMobile ? 280 : 350, 
                background: 'white', 
                borderRadius: '16px', 
                padding: isExtraSmallMobile ? '8px 12px' : isSmallMobile ? '12px 16px' : '16px 24px', 
                boxShadow: '0 2px 8px #0001', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                overflow: 'hidden' 
              }}>
                <div className="calendario-wrapper">
                  <h3 style={{ marginBottom: '16px', color: '#2563eb' }}>Calendario</h3>
                  <DayPicker
                    mode="single"
                    selected={fechaSeleccionada}
                    onSelect={setFechaSeleccionada}
                    locale={es}
                    className="calendario-day-picker"
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Exporto el componente para usarlo en la aplicación
export default Home;
