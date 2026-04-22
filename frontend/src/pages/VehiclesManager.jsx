import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, ArrowLeft, Loader2, Gauge, Trash2 } from 'lucide-react';

function VehiclesManager() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ plate: '', brand: '', model: '', status: 'OPERATIVO' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/vehicles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error limitando vehículos');
      const data = await res.json();
      setVehicles(data.data || []);
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
      const res = await fetch(`${apiUrl}/api/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar vehículo');
      
      setShowModal(false);
      setFormData({ plate: '', brand: '', model: '', status: 'OPERATIVO' });
      fetchVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo de forma permanente? El sistema bloqueará la acción si tiene historial operativo.')) return;
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar vehículo');
      fetchVehicles();
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
          <Truck size={32} color="#ec4899" />
          <h1 style={{ fontSize: '1.75rem' }}>Flota Vehicular</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="submit-btn" style={{ margin: 0, width: 'auto', padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
          <Plus size={20} /> Registrar Vehículo
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="loading-spinner" color="#ec4899" size={48} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          {vehicles.map(v => (
            <div key={v.id} style={{ 
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <div style={{ background: 'rgba(236,72,153,0.1)', padding: '0.5rem', borderRadius: '10px' }}>
                     <Truck size={20} color="#ec4899" />
                   </div>
                   <div>
                     <div style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '2px', color: 'white' }}>{v.plate.toUpperCase()}</div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{v.brand} {v.model}</div>
                   </div>
                </div>
                <button onClick={() => handleDelete(v.id)} style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  padding: '0.5rem', 
                  borderRadius: '10px', 
                  cursor: 'pointer' 
                }} title="Eliminar Vehículo">
                  <Trash2 size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '999px', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold', 
                  background: v.status === 'TALLER' ? 'rgba(245,158,11,0.2)' : v.status === 'PARADA_CRITICA' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', 
                  color: v.status === 'TALLER' ? '#f59e0b' : v.status === 'PARADA_CRITICA' ? '#ef4444' : '#10b981' 
                }}>
                  {v.status.replace('_', ' ')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <Gauge size={14} />
                  {v.faultReports?.length || 0} Reportes
                </div>
              </div>
            </div>
          ))}
          {vehicles.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '16px' }}>
              No hay vehículos registrados en la flota.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)', zIndex: 100 }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '420px', borderTop: '4px solid #ec4899' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Añadir a la Flota</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label>Placa del Vehículo</label>
                <input required placeholder="AAA-123 o 12345" style={{ paddingLeft: '1rem', textTransform: 'uppercase' }} value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Marca</label>
                  <input required placeholder="Ej. Ford" style={{ paddingLeft: '1rem' }} value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Modelo (Año)</label>
                  <input required placeholder="Ej. 2024" style={{ paddingLeft: '1rem' }} value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Estado Inicial</label>
                <select style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="OPERATIVO">OPERATIVO</option>
                  <option value="TALLER">TALLER</option>
                  <option value="PARADA_CRITICA">PARADA CRITICA</option>
                </select>
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="submit-btn" style={{ flex: 1, margin: 0, background: 'linear-gradient(135deg, #ec4899, #be185d)' }} disabled={submitting}>
                  {submitting ? <div className="loading-spinner"></div> : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehiclesManager;
