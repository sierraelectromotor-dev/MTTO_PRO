import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, HardHat, Users, Truck, Wrench } from 'lucide-react';

function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('mtto_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN_EMPRESA') {
      navigate('/login'); // Basic redirection to avoid unauthorized access
      return;
    }
    
    setUser(parsedUser);
    fetchStats();
  }, [navigate]);

  const [stats, setStats] = useState({ reportedCount: 0, inServiceCount: 0, totalVehicles: 0 });
  const [fetchingStats, setFetchingStats] = useState(true);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/tasks/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setFetchingStats(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mtto_token');
    localStorage.removeItem('mtto_user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-color)', padding: '0.75rem 1rem', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo-circle" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #10b981, #047857)' }}>
            <HardHat color="white" size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Panel de Empresa</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.email}</p>
          </div>
        </div>
        
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '0.4rem 0.75rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
          <LogOut size={16} />
          Salir
        </button>
      </header>

      {/* MINI DASHBOARD */}
      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '0.75rem', 
        width: '100%'
      }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem 0.5rem', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>{fetchingStats ? '...' : stats.reportedCount}</div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Reportados</div>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1rem 0.5rem', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{fetchingStats ? '...' : stats.inServiceCount}</div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>En Taller</div>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem 0.5rem', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{fetchingStats ? '...' : stats.totalVehicles}</div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Flota Total</div>
        </div>
      </section>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <div onClick={() => navigate('/admin/tasks')} style={{ 
          background: 'var(--surface-color)', 
          padding: '1.25rem', 
          borderRadius: '18px', 
          border: '1px solid var(--border-color)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '14px' }}>
            <Wrench size={24} color="#f59e0b" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>Mantenimiento</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gestión de Reportes y Órdenes</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%' }}>
          <div onClick={() => navigate('/admin/users')} style={{ 
            background: 'var(--surface-color)', 
            padding: '1.5rem 1rem', 
            borderRadius: '18px', 
            border: '1px solid var(--border-color)', 
            cursor: 'pointer', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
              <Users size={24} color="var(--primary)" />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Usuarios</h4>
          </div>

          <div onClick={() => navigate('/admin/vehicles')} style={{ 
            background: 'var(--surface-color)', 
            padding: '1.5rem 1rem', 
            borderRadius: '18px', 
            border: '1px solid var(--border-color)', 
            cursor: 'pointer', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
             <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
              <Truck size={24} color="#ec4899" />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Flota</h4>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
