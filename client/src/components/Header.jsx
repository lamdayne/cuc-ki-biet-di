import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="header-logo" title="Cúc-Ki Biết Đi">
          <img
            src="/logo.png"
            alt="Logo Cúc-Ki Biết Đi"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 2px 6px rgba(122, 82, 56, 0.2)',
            }}
          />
          <span>CÚC-KI BIẾT ĐI</span>
        </Link>

        <nav className="header-nav">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Đặt bánh
          </Link>
          <Link
            to="/tra-cuu"
            className={`nav-link ${location.pathname === '/tra-cuu' ? 'active' : ''}`}
          >
            Tra cứu đơn
          </Link>
          <Link
            to="/quan-ly"
            className="admin-lock-link"
            title="Khu vực quản lý cho tiệm bánh"
          >
            <Lock size={14} />
            <span>Quản lý</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
