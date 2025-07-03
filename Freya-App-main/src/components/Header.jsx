import React from 'react';

const Header = ({
  notificaciones,
  onNotificacionesClick,
  userInitial,
  menuOpen,
  setMenuOpen,
  userMenuRef,
  handleMenuClick,
  onMenuClick,
  avatarUrl
}) => (
  <header className="dashboard__header">
    <button
      className="header__menu-btn"
      onClick={onMenuClick}
      aria-label="Abrir menú"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'none',
        marginRight: 16
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect y="4" width="24" height="2" rx="1" fill="#222"/>
        <rect y="11" width="24" height="2" rx="1" fill="#222"/>
        <rect y="18" width="24" height="2" rx="1" fill="#222"/>
      </svg>
    </button>
    <div></div>
    <div className="header__right">
      <span
        className="header__icon"
        style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}
        onClick={onNotificacionesClick}
      >
        🔔
        {notificaciones > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '2px solid white',
              zIndex: 1
            }}
          >
            {notificaciones > 99 ? '99+' : notificaciones}
          </span>
        )}
      </span>
      <span
        className="header__user"
        style={{ cursor: 'pointer', position: 'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', width:40, height:40, borderRadius:'50%', background:'#e5e7eb' }}
        onClick={() => setMenuOpen((v) => !v)}
        ref={userMenuRef}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{width:40, height:40, borderRadius:'50%', objectFit:'cover', overflow:'hidden'}} />
        ) : (
          userInitial
        )}
        {menuOpen && (
          <div className="user-menu-dropdown" style={{position:'absolute', top:48, right:0, zIndex:1001}}>
            <div className="user-menu-title">Mi cuenta</div>
            <button className="user-menu-item" onClick={() => handleMenuClick('perfil')}>Perfil</button>
            <button className="user-menu-item" onClick={() => handleMenuClick('seguridad')}>Seguridad</button>
            <button className="user-menu-item logout" onClick={() => handleMenuClick('logout')}>Cerrar sesión</button>
          </div>
        )}
      </span>
    </div>
  </header>
);

export default Header; 