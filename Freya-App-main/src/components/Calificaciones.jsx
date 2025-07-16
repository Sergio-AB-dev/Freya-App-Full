import React, { useState, useEffect, useRef } from 'react';
import '../styles/calificaciones.css';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { db, auth } from '../firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Header from './Header';
import Sidebar from './Sidebar';

// Defino los colores RYB para identificar visualmente las materias
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

// Loader visual reutilizable
const Loader = () => (
  <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'70vh',width:'100%'}}>
    <div className="loader-spinner" style={{width:60,height:60,border:'6px solid #e0e7ef',borderTop:'6px solid #2563eb',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
    <style>{`@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`}</style>
  </div>
);

function Calificaciones() {
  // -------------------- Estados principales del componente --------------------
  // Manejo la pestaña activa (resumen o detalle)
  const [tab, setTab] = useState('resumen');
  // Lista de materias del usuario
  const [materias, setMaterias] = useState(null);
  // ID de la materia que se está editando
  const [editId, setEditId] = useState(null);
  // Estado del modal de materia (abierto/cerrado y materia seleccionada)
  const [modal, setModal] = useState({ open: false, materia: null });
  // Estado para los datos de una nueva materia o edición
  const [nuevo, setNuevo] = useState({ nombre: '', profesor: '', periodo: '2025-1', nota: '', color: '#2563eb', extra: '#2563eb' });
  // Mensaje de error en el formulario de materia
  const [error, setError] = useState('');
  // Estado del modal de calculadora de aprobación
  const [modalCalc, setModalCalc] = useState(false);
  // Materia seleccionada en la calculadora
  const [calcMateria, setCalcMateria] = useState('');
  // Resultado de la calculadora
  const [calcResultado, setCalcResultado] = useState(null);
  // Mensaje de error en la calculadora
  const [calcError, setCalcError] = useState('');
  // Materia seleccionada para ver el detalle
  const [materiaSel, setMateriaSel] = useState(materias?.[0]?.id || 1);
  // Notas por materia (diccionario)
  const [detalleNotas, setDetalleNotas] = useState({});
  // Estado del modal de calificación
  const [modalNota, setModalNota] = useState(false);
  // Estado para la calificación en edición
  const [notaEdit, setNotaEdit] = useState({ id: null, nombre: '', nota: '' });
  // Mensaje de error en la calificación
  const [errorNota, setErrorNota] = useState('');
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
  // -------------------- Usuario autenticado --------------------
  // Guardo el ID del usuario autenticado
  const [userId, setUserId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Estado de carga
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  // Estado para el avatar del usuario
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    // Escucho cambios de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Obtengo el nombre real y avatar del usuario desde Firestore
  useEffect(() => {
    if (!userId) return;
    const perfilRef = doc(db, 'usuarios', userId, 'perfil', 'datos');
    const unsubscribe = onSnapshot(perfilRef, (docSnap) => {
      const data = docSnap.data();
      let nombre = data?.profileData?.nombre || '';
      if (nombre) nombre = nombre.trim().split(' ')[0];
      setUserName(nombre || 'Usuario');
      setAvatarUrl(data?.profileData?.avatar || null);
    });
    return () => unsubscribe();
  }, [userId]);
  // Inicial para el avatar del usuario
  const userInitial = userName?.[0]?.toUpperCase() || 'U';

  // -------------------- Sincronización en tiempo real con Firestore --------------------
  useEffect(() => {
    if (!userId) return;
    const materiasRef = collection(db, 'usuarios', userId, 'materias');
    // Listener de materias
    const unsubscribeMaterias = onSnapshot(materiasRef, async (snapshot) => {
      let materiasFS = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      // Ordeno alfabéticamente por nombre
      materiasFS = materiasFS.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
      // Asigno color si no tiene y actualizo en la base de datos
      for (let i = 0; i < materiasFS.length; i++) {
        if (!materiasFS[i].color) {
          const color = coloresRYB[i % coloresRYB.length];
          materiasFS[i].color = color;
          await setDoc(doc(materiasRef, String(materiasFS[i].id)), { ...materiasFS[i], color }, { merge: true });
        }
      }
      setMaterias(materiasFS);
      // Listeners de notas por cada materia
      const unsubNotas = {};
      materiasFS.forEach(materia => {
        const notasRef = collection(db, 'usuarios', userId, 'materias', materia.id, 'notas');
        unsubNotas[materia.id] = onSnapshot(notasRef, (notasSnap) => {
          // Ordeno notas por fecha de creación (createdAt) o por orden natural si no existe
          const notasOrdenadas = notasSnap.docs
            .map(n => ({ id: n.id, ...n.data() }))
            .sort((a, b) => {
              if (a.createdAt && b.createdAt) {
                return a.createdAt.seconds - b.createdAt.seconds;
              }
              return 0;
            });
          setDetalleNotas(prev => ({
            ...prev,
            [materia.id]: notasOrdenadas
          }));
        });
      });
      // Limpio listeners de notas al desmontar o cambiar materias
      return () => {
        Object.values(unsubNotas).forEach(unsub => unsub && unsub());
      };
    });
    return () => unsubscribeMaterias();
  }, [userId]);

  // -------------------- Función auxiliar para fechas de Firestore --------------------
  // Convierto un valor de fecha de Firestore a un objeto Date de JS
  const convertFirestoreDate = (dateValue) => {
    if (!dateValue) return null;
    if (typeof dateValue.toDate === 'function') return dateValue.toDate();
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  };

  // -------------------- Efecto para escuchar cambios en recordatorios --------------------
  // Actualizo el número de notificaciones activas
  useEffect(() => {
    if (!userId) return;
    const recordatoriosCollectionRef = collection(db, 'usuarios', userId, 'recordatorios');
    const unsubscribe = onSnapshot(recordatoriosCollectionRef, (snapshot) => {
      const recordatorios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const ahora = new Date();
      const notificacionesActivas = recordatorios.filter(r => {
        if (r.completado) return false;
        const fechaRecordatorio = convertFirestoreDate(r.fecha);
        return fechaRecordatorio instanceof Date && fechaRecordatorio <= ahora;
      });
      setNotificacionesCount(notificacionesActivas.length);
    });
    return () => unsubscribe();
  }, [userId]);

  // -------------------- Año actual para el periodo --------------------
  // Obtengo el año actual para sugerirlo en el formulario
  const anioActual = new Date().getFullYear();

  // -------------------- Funciones para abrir modales --------------------
  // Abro el modal para editar una materia existente
  const abrirEditar = (materia) => {
    setNuevo({ ...materia });
    setEditId(materia.id);
    setModal({ open: true, materia });
    setError('');
  };
  // Abro el modal para crear una nueva materia
  const abrirNueva = () => {
    const colorIndex = typeof materias?.length === 'number' ? materias.length % coloresRYB.length : 0;
    setNuevo({ nombre: '', profesor: '', periodo: anioActual + '-1', nota: '', color: coloresRYB[colorIndex], extra: coloresRYB[colorIndex] });
    setEditId(null);
    setModal({ open: true, materia: null });
    setError('');
  };

  // -------------------- Guardar o eliminar materias (Firestore) --------------------
  // Guardo una materia nueva o editada en Firestore
  const guardarMateria = async () => {
    if (!nuevo.nombre.trim() || !nuevo.profesor.trim() || !nuevo.periodo.trim()) {
      setError('Completa todos los campos');
      return;
    }
    if (!userId) {
      setError('Usuario no autenticado');
      return;
    }
    // Valido que no exista una materia con el mismo nombre
    if (!editId) {
      const nombreNormalizado = nuevo.nombre.trim().toLowerCase();
      const existe = (materias || []).some(m => m.nombre.trim().toLowerCase() === nombreNormalizado);
      if (existe) {
        setError('Ya existe una materia con ese nombre. Ingresa un nombre diferente.');
        return;
      }
    }
    const materiasRef = collection(db, 'usuarios', userId, 'materias');
    if (editId) {
      // Confirmo antes de guardar cambios editados
      const result = await Swal.fire({
        title: '¿Deseas guardar los cambios?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#d33',
        reverseButtons: true
      });
      if (!result.isConfirmed) return;
      await setDoc(doc(materiasRef, String(editId)), { ...nuevo });
      Swal.fire('¡Actualizado!', 'Materia modificada correctamente', 'success');
    } else {
      // Asigno color RYB al crear nueva materia
      const colorIndex = typeof materias?.length === 'number' ? materias.length % coloresRYB.length : 0;
      const color = coloresRYB[colorIndex];
      const docRef = await addDoc(materiasRef, { ...nuevo, color });
      setDetalleNotas(prev => ({ ...prev, [docRef.id]: [] }));
      Swal.fire('¡Éxito!', 'Materia agregada correctamente', 'success');
    }
    setModal({ open: false, materia: null });
    setEditId(null);
  };
  // Elimino una materia de Firestore
  const eliminarMateria = async (id) => {
    if (!userId) return;
    const result = await Swal.fire({
      title: '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2563eb',
      reverseButtons: false
    });
    if (!result.isConfirmed) return;
    await deleteDoc(doc(db, 'usuarios', userId, 'materias', String(id)));
    Swal.fire('Eliminado!', 'La materia ha sido eliminada.', 'success');
  };

  // -------------------- Calculadora de aprobación --------------------
  // Abro el modal de calculadora
  const abrirCalculadora = () => {
    setModalCalc(true);
    setCalcMateria('');
    setCalcResultado(null);
    setCalcError('');
  };
  // Calculo la nota mínima necesaria para aprobar
  const calcularAprobacion = () => {
    if (!calcMateria) {
      setCalcError('Selecciona una materia');
      setCalcResultado(null);
      return;
    }
    // Busco la materia por id
    const materia = materias.find(m => String(m.id) === String(calcMateria));
    if (!materia) {
      setCalcError('Materia no encontrada');
      setCalcResultado(null);
      return;
    }
    // Busco calificaciones de la materia seleccionada
    const notas = detalleNotas[materia.id] || [];
    if (notas.length === 0) {
      setCalcResultado('Agrega al menos una calificación para calcular.');
      setCalcError('');
      return;
    }
    // Calculo la nota necesaria en la próxima calificación para aprobar con 3.0
    const suma = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    const n = notas.length;
    const necesaria = 3.0 * (n + 1) - suma;
    if (necesaria > 5) {
      setCalcResultado('No es posible aprobar con una sola calificación más.');
      setCalcError('');
      return;
    }
    const necesariaPositiva = necesaria < 0 ? 0 : necesaria;
    setCalcResultado(`Necesitas al menos un ${necesariaPositiva.toFixed(1)} en la próxima calificación para aprobar con 3.0.`);
    setCalcError('');
  };

  // -------------------- Cálculo de promedios --------------------
  // Calculo el promedio simple de una materia
  const calcPromedioMateria = (notas) => {
    if (!notas.length) return null;
    const suma = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    return (suma / notas.length).toFixed(1);
  };
  // Calculo promedios de todas las materias y el promedio general
  const promediosMaterias = (materias || []).map(m => {
    const notas = detalleNotas[m.id] || [];
    return calcPromedioMateria(notas);
  });
  const promediosValidos = promediosMaterias.filter(p => p !== null);
  const promedioGeneral = promediosValidos.length > 0 ? (promediosValidos.reduce((acc, p) => acc + Number(p), 0) / promediosValidos.length).toFixed(1) : '-';

  // -------------------- Acciones para calificaciones --------------------
  // Abro el modal para agregar una nueva calificación
  const abrirNuevaNota = () => {
    setNotaEdit({ id: null, nombre: '', nota: '' });
    setErrorNota('');
    setModalNota(true);
  };
  // Abro el modal para editar una calificación existente
  const abrirEditarNota = (nota) => {
    setNotaEdit({ ...nota });
    setErrorNota('');
    setModalNota(true);
  };
  // Guardo una calificación nueva o editada en Firestore
  const guardarNota = async () => {
    if (!userId || !materiaSel) return;
    const notaNum = parseFloat(notaEdit.nota);
    // Valido que la nota tenga máximo un decimal
    const notaValida = /^\d(\.\d)?$|^5(\.0)?$/.test(notaEdit.nota);
    if (!notaEdit.nombre.trim() || isNaN(notaNum) || notaNum < 0 || notaNum > 5 || !notaValida) {
      setErrorNota('La nota debe estar entre 0.0 y 5.0 y tener máximo un decimal (ej: 3.5)');
      return;
    }
    const notasRef = collection(db, 'usuarios', userId, 'materias', String(materiaSel), 'notas');
    if (notaEdit.id) {
      // Confirmo antes de guardar cambios editados
      const result = await Swal.fire({
        title: '¿Deseas guardar los cambios?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#d33',
        reverseButtons: true
      });
      if (!result.isConfirmed) return;
      // Mantengo el createdAt original si existe
      const notaOriginal = (detalleNotas[materiaSel] || []).find(n => n.id === notaEdit.id);
      const createdAt = notaOriginal && notaOriginal.createdAt ? notaOriginal.createdAt : new Date();
      await setDoc(doc(notasRef, String(notaEdit.id)), { nombre: notaEdit.nombre, nota: notaNum, createdAt });
      Swal.fire('¡Actualizado!', 'Nota modificada correctamente', 'success');
    } else {
      await addDoc(notasRef, { nombre: notaEdit.nombre, nota: notaNum, createdAt: new Date() });
      Swal.fire('¡Éxito!', 'Nota agregada correctamente', 'success');
    }
    setModalNota(false);
    setNotaEdit({ id: null, nombre: '', nota: '' });
  };
  // Elimino una calificación de Firestore
  const eliminarNota = async (id) => {
    if (!userId || !materiaSel) return;
    const result = await Swal.fire({
      title: '¿Estás seguro de eliminar esta nota?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2563eb',
      reverseButtons: false
    });
    if (!result.isConfirmed) return;
    await deleteDoc(doc(db, 'usuarios', userId, 'materias', String(materiaSel), 'notas', String(id)));
    Swal.fire('Eliminado!', 'La nota ha sido eliminada.', 'success');
  };

  // -------------------- Cambios en el formulario de materia --------------------
  // Cambio el periodo (1 o 2)
  const handlePeriodoChange = (e) => {
    const [anio, ] = nuevo.periodo.split('-');
    setNuevo({ ...nuevo, periodo: anio + '-' + e.target.value });
  };
  // Cambio el año
  const handleAnioChange = (e) => {
    const [, periodo] = nuevo.periodo.split('-');
    setNuevo({ ...nuevo, periodo: e.target.value + '-' + (periodo || '1') });
  };

  // -------------------- Cierre automático del menú de usuario --------------------
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

  // -------------------- Acciones del menú de usuario --------------------
  // Manejo las opciones del menú de usuario
  const handleMenuClick = (option) => {
    setMenuOpen(false);
    if (option === 'perfil') navigate('/configuracion?tab=perfil');
    if (option === 'seguridad') navigate('/configuracion?tab=seguridad');
    if (option === 'logout') navigate('/');
  };

  // -------------------- Color de barra según promedio --------------------
  // Devuelvo el color de la barra de progreso según el promedio
  const getColorBarra = (prom) => {
    if (prom === null) return '#e5e7eb'; // gris si no hay nota
    const p = Number(prom);
    if (p >= 0 && p <= 1) return '#ef4444'; // rojo
    if (p > 1 && p < 2) return '#f97316'; // naranja
    if (p >= 2 && p < 3) return '#facc15'; // amarillo
    if (p >= 3 && p <= 4) return '#2563eb'; // azul (antes verde claro)
    if (p > 4 && p <= 5) return '#00F510'; // verde personalizado
    return '#e5e7eb';
  };

  // Delay para mostrar el loader solo si la carga tarda más de 350ms
  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(true), 350);
    return () => clearTimeout(timer);
  }, []);

  // Cuando materias y userName están listos, oculto el loader
  useEffect(() => {
    if (userId && userName !== null && materias !== null) {
      setLoading(false);
      setShowLoader(false);
    }
  }, [userId, userName, materias]);

  // -------------------- Render principal --------------------
  // Aquí incluyo sidebar, header, tabs, modales y el contenido principal
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
        <div className="calificaciones-dashboard__container">
          <div className="calificaciones-dashboard__topbar">
            <div>
              <h1 className="calificaciones-dashboard__title">Calificaciones</h1>
              <p className="calificaciones-dashboard__subtitle">Gestiona tus calificaciones por materia</p>
            </div>
            <div className="calificaciones-dashboard__actions">
              <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={abrirNueva}>+ Nueva Materia</button>
              <button className="calificaciones-dashboard__btn" onClick={abrirCalculadora}>📅 Calculadora de Aprobación</button>
            </div>
          </div>
          {/* Tabs para cambiar entre resumen y detalle */}
          <div className="calificaciones-dashboard__tabs">
            <button className={tab === 'resumen' ? 'tab active' : 'tab'} onClick={()=>setTab('resumen')}>Resumen</button>
            <button className={tab === 'detalle' ? 'tab active' : 'tab'} onClick={()=>setTab('detalle')}>Detalle por Materia</button>
          </div>
          {/* Resumen de calificaciones */}
          {tab === 'resumen' && (
            <>
              <div className="calificaciones-dashboard__promedio-card">
                <div className="calificaciones-dashboard__promedio-title">Promedio General</div>
                <div className="calificaciones-dashboard__promedio-desc">Tu promedio general de todas las materias</div>
                <div className="calificaciones-dashboard__promedio-valor">{promedioGeneral}</div>
                <div className="calificaciones-dashboard__promedio-bar-bg">
                  <div className="calificaciones-dashboard__promedio-bar" style={{width: `${(promedioGeneral/5)*100}%`, background: getColorBarra(promedioGeneral)}}></div>
                </div>
                <div className="calificaciones-dashboard__promedio-max">de 5.0</div>
              </div>
              <div className="calificaciones-dashboard__materias-grid">
                {materias.map((m, i) => (
                  <div className="calificaciones-dashboard__materia-card" key={m.id}>
                    <div className="calificaciones-dashboard__materia-header">
                      <div className="calificaciones-dashboard__materia-title">{m.nombre}</div>
                    </div>
                    <div className="calificaciones-dashboard__materia-prof">{m.profesor} • {m.periodo}</div>
                    <div className="calificaciones-dashboard__materia-nota">{(() => {
                      const notas = detalleNotas[m.id] || [];
                      const prom = calcPromedioMateria(notas);
                      return prom !== null ? prom : '-';
                    })()}</div>
                    <div className="calificaciones-dashboard__materia-bar-bg">
                      {(() => {
                        const notas = detalleNotas[m.id] || [];
                        const prom = calcPromedioMateria(notas);
                        const color = getColorBarra(prom);
                        const ancho = prom !== null ? (Number(prom)/5)*100 : 0;
                        return <div className="calificaciones-dashboard__materia-bar" style={{width: `${ancho}%`, background: color}}></div>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Detalle por Materia */}
          {tab === 'detalle' && (
            <div className="detalle-materias__grid">
              {/* Panel izquierdo: lista de materias */}
              <div className="detalle-materias__list">
                <div className="detalle-materias__list-title">Materias</div>
                {materias.map((m, i) => (
                  <div
                    key={m.id}
                    className={`detalle-materias__item${materiaSel === m.id ? ' active' : ''}`}
                    onClick={()=>setMateriaSel(m.id)}
                  >
                    <span className="detalle-materias__dot" style={{background: m.color || coloresRYB[i % coloresRYB.length]}}></span>
                    {m.nombre}
                  </div>
                ))}
              </div>
              {/* Panel derecho: detalle de la materia seleccionada */}
              <div className="detalle-materias__detail">
                {(() => {
                  const m = materias.find(x => x.id === materiaSel);
                  const notas = detalleNotas[materiaSel] || [];
                  return m ? (
                    <>
                      <div className="detalle-materias__detail-header">
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                          <div>
                            <div className="detalle-materias__detail-title">{m.nombre}</div>
                            <div className="detalle-materias__detail-prof">{m.profesor} • {m.periodo}</div>
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <span title="Editar" style={{cursor:'pointer', fontSize:'1.15rem'}} onClick={()=>abrirEditar(m)}>✏️</span>
                            <span title="Eliminar" style={{cursor:'pointer', fontSize:'1.15rem'}} onClick={()=>eliminarMateria(m.id)}>🗑️</span>
                            <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={abrirNuevaNota} style={{marginLeft:12}}>+ Nueva Calificación</button>
                          </div>
                        </div>
                      </div>
                      <div className="detalle-materias__detail-nota">{calcPromedioMateria(notas)}</div>
                      <div className="detalle-materias__detail-bar-bg">
                        <div className="detalle-materias__detail-bar" style={{width: `${(calcPromedioMateria(notas)/5)*100}%`, background: getColorBarra(calcPromedioMateria(notas))}}></div>
                      </div>
                      <table className="detalle-materias__table">
                        <thead>
                          <tr>
                            <th>Evaluación</th>
                            <th>Calificación</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notas.map(n => (
                            <tr key={n.id}>
                              <td>{n.nombre}</td>
                              <td>{Number(n.nota).toFixed(1)}</td>
                              <td>
                                <span style={{cursor:'pointer', marginRight:8}} title="Editar" onClick={()=>abrirEditarNota(n)}>✏️</span>
                                <span style={{cursor:'pointer'}} title="Eliminar" onClick={()=>eliminarNota(n.id)}>🗑️</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : null;
                })()}
                {/* Modal para agregar/editar calificación */}
                {modalNota && (
                  <div className="calificaciones-dashboard__modal-bg" onClick={()=>setModalNota(false)}>
                    <div className="calificaciones-dashboard__modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
                      <h2>{notaEdit.id ? 'Editar Calificación' : 'Nueva Calificación'}</h2>
                      <input className="calificaciones-dashboard__input" type="text" placeholder="Nombre de la evaluación" value={notaEdit.nombre} onChange={e=>setNotaEdit({...notaEdit, nombre:e.target.value})} style={{marginBottom:2, width:'100%'}} maxLength={60} />
                      <div style={{fontSize:'0.92em', color:'#64748b', marginBottom:8, width:'100%', textAlign:'right'}}>{notaEdit.nombre.length}/60</div>
                      <input className="calificaciones-dashboard__input" type="number" placeholder="Nota (0-5)" value={notaEdit.nota} onChange={e=>setNotaEdit({...notaEdit, nota:e.target.value})} min={0} max={5} step={0.1} style={{marginBottom:10, width:'100%'}} />
                      {errorNota && <div style={{color:'#ef4444', marginBottom:8}}>{errorNota}</div>}
                      <div style={{display:'flex', gap:10, width:'100%', justifyContent:'flex-end'}}>
                        <button className="calificaciones-dashboard__btn" onClick={()=>setModalNota(false)}>Cancelar</button>
                        <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={guardarNota}>Guardar</button>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
            </div>
          )}
          {/* Modal Nueva/Editar Materia */}
          {modal.open && (
            <div className="calificaciones-dashboard__modal-bg" onClick={()=>{setModal({open:false, materia:null}); setEditId(null);}}>
              <div className="calificaciones-dashboard__modal" onClick={e=>e.stopPropagation()}>
                <h2>{editId ? 'Editar Materia' : 'Nueva Materia'}</h2>
                <input className="calificaciones-dashboard__input" type="text" placeholder="Nombre" value={nuevo.nombre} onChange={e=>setNuevo({...nuevo, nombre:e.target.value})} style={{marginBottom:2, width:'100%'}} maxLength={60} />
                <div style={{fontSize:'0.92em', color:'#64748b', marginBottom:8, width:'100%', textAlign:'right'}}>{nuevo.nombre.length}/60</div>

                <input className="calificaciones-dashboard__input" type="text" placeholder="Profesor" value={nuevo.profesor} onChange={e=>setNuevo({...nuevo, profesor:e.target.value})} style={{marginBottom:2, width:'100%'}} maxLength={60} />
                <div style={{fontSize:'0.92em', color:'#64748b', marginBottom:8, width:'100%', textAlign:'right'}}>{nuevo.profesor.length}/60</div>
                <div style={{display:'flex', gap:8, marginBottom:10, width:'100%'}}>
                  <input className="calificaciones-dashboard__input" type="number" min={2000} max={2100} value={nuevo.periodo.split('-')[0]} onChange={handleAnioChange} style={{width:'60%', minWidth:90}} placeholder="Año" />
                  <select className="calificaciones-dashboard__input" value={nuevo.periodo.split('-')[1]} onChange={handlePeriodoChange} style={{width:'40%', minWidth:60}}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
                {error && <div style={{color:'#ef4444', marginBottom:8}}>{error}</div>}
                <div style={{display:'flex', gap:10, width:'100%', justifyContent:'flex-end'}}>
                  <button className="calificaciones-dashboard__btn" onClick={()=>{setModal({open:false, materia:null}); setEditId(null);}}>Cancelar</button>
                  <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={guardarMateria}>Guardar</button>
                </div>
              </div>
            </div>
          )}
          {/* Modal Calculadora de Aprobación */}
          {modalCalc && (
            <div className="calificaciones-dashboard__modal-bg" onClick={()=>setModalCalc(false)}>
              <div className="calificaciones-dashboard__modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <div>
                    <h2 style={{marginBottom:0}}>Calculadora de Aprobación</h2>
                    <div style={{color:'#64748b', fontSize:'1rem', marginBottom:18}}>Calcula la calificación mínima que necesitas en tu próxima evaluación para aprobar la materia con 3.0</div>
                  </div>
                  <span style={{cursor:'pointer', fontSize:22, color:'#888'}} onClick={()=>setModalCalc(false)}>✕</span>
                </div>
                <div style={{marginBottom:14, width:'100%'}}>
                  <label style={{fontWeight:500, color:'#222'}}>Materia</label>
                  <select className="calificaciones-dashboard__input" style={{width:'100%', marginTop:4}} value={calcMateria} onChange={e=>setCalcMateria(e.target.value)}>
                    <option value="">Selecciona una materia</option>
                    {materias.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                {calcError && <div style={{color:'#ef4444', marginBottom:8}}>{calcError}</div>}
                {calcResultado && <div style={{color:'#2563eb', fontWeight:500, marginBottom:8}}>{calcResultado}</div>}
                <div style={{display:'flex', gap:10, width:'100%', justifyContent:'flex-end', marginTop:8}}>
                  <button className="calificaciones-dashboard__btn" onClick={()=>setModalCalc(false)}>Cerrar</button>
                  <button className="calificaciones-dashboard__btn calificaciones-dashboard__btn--primary" onClick={calcularAprobacion}>Calcular</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Exporto el componente para usarlo en la aplicación
export default Calificaciones;



