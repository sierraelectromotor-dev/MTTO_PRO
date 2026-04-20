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
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('mtto_token');
    localStorage.removeItem('mtto_user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-color)', padding: '1rem 2rem', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="logo-circle" style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #10b981, #047857)' }}>
            <HardHat color="white" size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Panel de Empresa</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.email}</p>
          </div>
        </div>
        
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
          <LogOut size={18} />
          Salir
        </button>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div onClick={() => navigate('/admin/users')} style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <Users size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Personal y Usuarios</h3>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona conductores, mecánicos y usuarios administrativos de tu empresa.</p>
        </div>

        <div onClick={() => navigate('/admin/vehicles')} style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <Truck size={32} color="#ec4899" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Flota Vehicular</h3>
          <p style={{ color: 'var(--text-muted)' }}>Maneja el inventario de vehículos, estados y asignación a conductores.</p>
        </div>

        <div onClick={() => navigate('/admin/tasks')} style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'transform 0.2s ease', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          <Wrench size={32} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Mantenimiento</h3>
          <p style={{ color: 'var(--text-muted)' }}>Visualiza reportes de fallas y asigna órdenes de trabajo (O.T.) a los técnicos.</p>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
