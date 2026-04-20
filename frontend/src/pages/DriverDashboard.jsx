import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertTriangle, Plus, Loader2 } from 'lucide-react';

function DriverDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({ vehicle_id: '', description: '', system_affected: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('mtto_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'CONDUCTOR') {
      navigate('/login');
      return;
    }
    setUser(parsedUser);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      
      const [resReports, resVehicles] = await Promise.all([
        fetch(`${apiUrl}/api/tasks/my-reports`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!resReports.ok || !resVehicles.ok) {
        let errStr = '';
        if (!resReports.ok) errStr += `Reports Error: ${resReports.status} - ${(await resReports.json()).error || ''}. `;
        if (!resVehicles.ok) errStr += `Vehicles Error: ${resVehicles.status} - ${(await resVehicles.json()).error || ''}. `;
        throw new Error(errStr);
      }

      const dataR = await resReports.json();
      const dataV = await resVehicles.json();
      setReports(dataR || []);
      setVehicles(dataV.data || []);
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mtto_token');
    localStorage.removeItem('mtto_user');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/tasks/fault-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reportar');
      
      setShowModal(false);
      setFormData({ vehicle_id: '', description: '', system_affected: '' });
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'var(--surface-color)', padding: '1rem 2rem', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle color="#ef4444" /> Panel de Conductor
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.email}</p>
        </div>
        
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
          <LogOut size={18} />
          Salir
        </button>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem' }}>Mis Reportes</h3>
        <button onClick={() => setShowModal(true)} className="submit-btn" style={{ margin: 0, width: 'auto', padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
          <Plus size={20} /> Reportar Falla
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="loading-spinner" color="#ef4444" size={48} /></div>
      ) : (
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', overflow: 'hidden' }}>
          {reports.length === 0 && <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No tienes reportes pendientes o pasados.</p>}
          {reports.map(r => (
            <div key={r.id} style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>Vehículo: {r.vehicle?.plate}</strong>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', background: r.status === 'PENDIENTE' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: r.status === 'PENDIENTE' ? '#ef4444' : '#10b981' }}>
                  {r.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>{r.description}</p>
              {r.system_affected && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>Sistema afectado: {r.system_affected}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal Reporte */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)', zIndex: 100 }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '420px', borderTop: '4px solid #ef4444' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Reportar Problema</h2>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Vehículo Afectado</label>
                <select required style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})}>
                  <option value="">-- Seleccionar --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate} ({v.brand})</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Sistema Afectado</label>
                <select required style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.system_affected} onChange={e => setFormData({...formData, system_affected: e.target.value})}>
                  <option value="">-- No lo sé / Es general --</option>
                  <option value="MOTOR">Motor / Transmisión</option>
                  <option value="SISTEMA_ELECTRICO">Sistema Eléctrico</option>
                  <option value="FRENOS">Frenos</option>
                  <option value="SUSPENSION_LLANTAS">Suspensión y Llantas</option>
                  <option value="AIRE_ACONDICIONADO">Aire Acondicionado</option>
                  <option value="HIDRAULICA">Sistemas Hidráulicos</option>
                  <option value="CARROCERIA">Carrocería / Cabina</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className="input-group">
                <label>Descripción de Falla</label>
                <textarea required rows="4" style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none', resize: 'vertical' }} placeholder="¿Qué sucede con el vehículo?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="submit-btn" style={{ flex: 1, margin: 0, background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }} disabled={submitting}>
                  {submitting ? <div className="loading-spinner"></div> : 'Subir Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DriverDashboard;
