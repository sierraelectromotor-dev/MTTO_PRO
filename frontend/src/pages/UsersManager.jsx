import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowLeft, Loader2, Mail, BadgeCheck, Trash2 } from 'lucide-react';

function UsersManager() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ email: '', password: '', role: 'CONDUCTOR', name: '', specialty: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error recuperando usuarios');
      const data = await res.json();
      setUsers(data);
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
      const res = await fetch(`${apiUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
      
      setShowModal(false);
      setFormData({ email: '', password: '', role: 'CONDUCTOR', name: '', specialty: '' });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este usuario permanentemente? El sistema bloqueará la acción si tiene historial operativo.')) return;
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
      fetchUsers();
    } catch(e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <ArrowLeft size={24} />
          </button>
          <Users size={32} color="var(--primary)" />
          <h1 style={{ fontSize: '1.75rem' }}>Personal y Usuarios</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="submit-btn" style={{ margin: 0, width: 'auto', padding: '0.75rem 1.5rem' }}>
          <Plus size={20} /> Nuevo Usuario
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="loading-spinner" color="var(--primary)" size={48} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          {users.map(u => (
            <div key={u.id} style={{ 
              background: 'var(--surface-color)', 
              borderRadius: '16px', 
              border: '1px solid var(--border-color)', 
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Mail size={16} color="var(--primary)"/> 
                    <strong style={{ fontSize: '1rem', color: 'white', wordBreak: 'break-all' }}>{u.email}</strong>
                  </div>
                  {u.name && <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>{u.name}</div>}
                </div>
                <button onClick={() => handleDelete(u.id)} style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  padding: '0.5rem', 
                  borderRadius: '10px', 
                  cursor: 'pointer',
                  flexShrink: 0
                }} title="Eliminar Usuario">
                  <Trash2 size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '999px', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold', 
                  background: u.role === 'ADMIN_EMPRESA' ? 'rgba(236,72,153,0.2)' : u.role === 'TECNICO' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)', 
                  color: u.role === 'ADMIN_EMPRESA' ? '#ec4899' : u.role === 'TECNICO' ? '#f59e0b' : '#818cf8',
                  textTransform: 'uppercase'
                }}>
                  {u.role.replace('_', ' ')}
                </span>
                {u.specialty && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    {u.specialty}
                  </span>
                )}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  ID: {u.id}
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '16px' }}>
              No hay usuarios registrados.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)', zIndex: 100 }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Crear Usuario</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label>Nombre Completo</label>
                <input type="text" placeholder="Ej. Juan Pérez" style={{ paddingLeft: '1rem' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Correo Electrónico *</label>
                <input required type="email" placeholder="ejemplo@empresa.com" style={{ paddingLeft: '1rem' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Contraseña Temporal *</label>
                <input required type="password" placeholder="••••••••" style={{ paddingLeft: '1rem' }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Rol de Usuario</label>
                <select style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, specialty: ''})}>
                  <option value="CONDUCTOR">Conductor</option>
                  <option value="TECNICO">Técnico Mecánico</option>
                  <option value="ALMACENISTA">AlmacenistaBodega</option>
                  <option value="ADMIN_EMPRESA">Administrador Empresa</option>
                </select>
              </div>
              
              {formData.role === 'TECNICO' && (
                <div className="input-group">
                  <label>Especialidad del Técnico</label>
                  <select required style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})}>
                    <option value="">-- Seleccionar N/A --</option>
                    <option value="MECANICA">Mecánica General</option>
                    <option value="ELECTRICIDAD">Electricidad</option>
                    <option value="SUSPENSION">Suspensión</option>
                    <option value="FRENOS">Frenos</option>
                    <option value="AIRE_ACONDICIONADO">Aire Acondicionado</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              )}
              
              {error && <div className="error-message">{error}</div>}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'white'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>Cancelar</button>
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

export default UsersManager;
