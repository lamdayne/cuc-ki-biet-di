import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AdminPinPage() {
  const navigate = useNavigate();
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();

    // Check if already authenticated
    api
      .checkAdminAuth()
      .then(() => {
        navigate('/quan-ly', { replace: true });
      })
      .catch(() => {
        // Not logged in, stay on pin page
      });
  }, [navigate]);

  const handleChange = (index, value) => {
    setError(null);
    const cleaned = value.replace(/\D/g, '');

    if (!cleaned) {
      const newDigits = [...pinDigits];
      newDigits[index] = '';
      setPinDigits(newDigits);
      return;
    }

    // Single digit entry
    const newDigits = [...pinDigits];
    newDigits[index] = cleaned[cleaned.length - 1];
    setPinDigits(newDigits);

    // Auto-focus next input
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }

    // If 6 digits filled, submit immediately
    if (index === 5 || newDigits.every((d) => d !== '')) {
      const fullPin = newDigits.join('');
      if (fullPin.length === 6) {
        submitPin(fullPin);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...pinDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setPinDigits(newDigits);

    if (pasted.length === 6) {
      submitPin(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const submitPin = async (fullPin) => {
    setLoading(true);
    setError(null);
    try {
      await api.adminLogin(fullPin);
      navigate('/quan-ly', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('Mã PIN không đúng, vui lòng thử lại');
      setPinDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container"
      style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div className="form-card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <Lock size={28} />
        </div>

        <h1 style={{ fontSize: '1.7rem', marginBottom: '8px' }}>
          Quản Lý Cúc-Ki
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
          Vui lòng nhập mã PIN 6 chữ số để vào khu vực quản trị
        </p>

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: '12px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="pin-grid" onPaste={handlePaste}>
          {pinDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="pin-input-box"
              disabled={loading}
            />
          ))}
        </div>

        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', marginTop: '10px' }}
          onClick={() => submitPin(pinDigits.join(''))}
          disabled={loading || pinDigits.some((d) => !d)}
        >
          {loading ? 'Đang kiểm tra...' : 'Xác Nhận'}
        </button>
      </div>
    </div>
  );
}
