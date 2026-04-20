import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ArrowLeft, Loader2, User } from 'lucide-react';

function TenantsManager() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', nit: '', plan_type: 'BASIC', adminEmail: '', adminPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/tenants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error recuperando tenants');
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la empresa');
      
      setShowModal(false);
      setFormData({ name: '', nit: '', plan_type: 'BASIC', adminEmail: '', adminPassword: '' });
      fetchTenants();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/superadmin-dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <ArrowLeft size={24} />
          </button>
          <Building2 size={32} color="var(--primary)" />
          <h1 style={{ fontSize: '1.75rem' }}>Gestión de Instancias</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="submit-btn" style={{ margin: 0, width: 'auto', padding: '0.75rem 1.5rem' }}>
          <Plus size={20} /> Nueva Empresa
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="loading-spinner" color="var(--primary)" size={48} /></div>
      ) : (
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Empresa</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>NIT</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Plan</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Administrador</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{t.nit}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', background: t.plan_type === 'PREMIUM' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(99, 102, 241, 0.2)', color: t.plan_type === 'PREMIUM' ? '#ec4899' : '#818cf8' }}>{t.plan_type}</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <User size={16} /> {t.users && t.users[0] ? t.users[0].email : 'N/A'}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay empresas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nueva Empresa */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)', zIndex: 100 }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '480px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Registrar Empresa</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label>Nombre de la Empresa</label>
                <input required placeholder="Ej. Transportes del Norte" style={{ paddingLeft: '1rem' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>NIT</label>
                  <input required placeholder="NIT o RUT" style={{ paddingLeft: '1rem' }} value={formData.nit} onChange={e => setFormData({...formData, nit: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Plan</label>
                  <select style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.plan_type} onChange={e => setFormData({...formData, plan_type: e.target.value})}>
                    <option value="BASIC">Básico</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
              </div>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '1rem 0 1.5rem' }} />
              <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Datos del Administrador</h3>
              <div className="input-group">
                <label>Correo del Admin</label>
                <input required type="email" placeholder="admin@empresa.com" style={{ paddingLeft: '1rem' }} value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Contraseña</label>
                <input required type="password" placeholder="••••••••" style={{ paddingLeft: '1rem' }} value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>Cancelar</button>
                <button type="submit" className="submit-btn" style={{ flex: 1, margin: 0 }} disabled={submitting}>
                  {submitting ? <div className="loading-spinner"></div> : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantsManager;
