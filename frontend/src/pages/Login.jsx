import { useState } from 'react';
import { Mail, Lock, LogIn, HardHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setupPushNotifications } from '../utils/pushSetup';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciales inválidas');
      }

      localStorage.setItem('mtto_token', data.token);
      localStorage.setItem('mtto_user', JSON.stringify(data.user));
      
      try { await setupPushNotifications(); } catch(e){ console.error(e) }

      const userRole = data.user.role;
      if (userRole === 'SUPERADMIN') {
        navigate('/superadmin-dashboard');
      } else if (userRole === 'ADMIN_EMPRESA') {
        navigate('/admin-dashboard');
      } else if (userRole === 'CONDUCTOR') {
        navigate('/driver-dashboard');
      } else if (userRole === 'TECNICO') {
        navigate('/technician-dashboard');
      } else if (userRole === 'ALMACENISTA') {
        navigate('/warehouse-dashboard');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="logo-wrapper">
        <div className="logo-circle">
          <HardHat color="white" size={32} />
        </div>
      </div>
      
      <h1>MTTO Pro</h1>
      <p className="subtitle">Gestión inteligente de flotas y mantenimiento</p>
      
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label htmlFor="email">Correo Electrónico</label>
          <Mail className="input-icon" />
          <input 
            type="email" 
            id="email" 
            placeholder="ejemplo@empresa.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="password">Contraseña</label>
          <Lock className="input-icon" />
          <input 
            type="password" 
            id="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <>
              Ingresar
              <LogIn size={20} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;
