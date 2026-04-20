import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, ArrowLeft, Loader2, Gauge } from 'lucide-react';

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
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Placa</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Marca / Modelo</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Estado</th>
                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>Reportes Activos</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>{v.plate.toUpperCase()}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>{v.brand} <span style={{ color: 'var(--text-muted)' }}>{v.model}</span></td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', background: v.status === 'TALLER' ? 'rgba(245,158,11,0.2)' : v.status === 'PARADA_CRITICA' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: v.status === 'TALLER' ? '#f59e0b' : v.status === 'PARADA_CRITICA' ? '#ef4444' : '#10b981' }}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                    {v.faultReports?.length || 0} Fallas
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay vehículos registrados en la flota.</td>
                </tr>
              )}
            </tbody>
          </table>
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
