import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, PlayCircle, PlusCircle, Package, Trash2, CheckCircle, AlertOctagon } from 'lucide-react';
import { App } from '@capacitor/app';

function TasksManager() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [orders, setOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ESPERANDO');
  
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedOrderLogs, setSelectedOrderLogs] = useState([]);
  
  const [formData, setFormData] = useState({ technician_id: '', observations: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]); // Array of { id, title, message, type }
  
  // Ref to store previous counts for change detection (avoids stale closure)
  const prevCountsRef = useRef({ reports: 0, approvals: 0 });

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  useEffect(() => {
    fetchData();

    // Polling every 30 seconds for Admin
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    // Refresh when app comes back to foreground
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) fetchData(true);
    });

    return () => {
      clearInterval(interval);
      appStateListener.remove();
    };
  }, []);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      
      const [resTasks, resUsers] = await Promise.all([
        fetch(`${apiUrl}/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resTasks.ok) {
        const dataTasks = await resTasks.json();
        const newReports = dataTasks.faultReports || [];
        const newOrders = dataTasks.workOrders || [];
        
        setReports(newReports);
        setOrders(newOrders);

        // COMPARISON LOGIC for Notifications
        if (isSilent) {
          const pendingCount = newReports.filter(r => r.status === 'PENDIENTE').length;
          const approvalCount = newOrders.filter(o => o.status === 'ESPERANDO_REPUESTOS' && o.requestedParts.some(p => p.status === 'PENDIENTE_APROBACION')).length;

          if (pendingCount > prevCountsRef.current.reports) {
            addToast('Nuevo Reporte', 'Se ha recibido una nueva falla de un conductor.', 'warning');
          }
          if (approvalCount > prevCountsRef.current.approvals) {
            addToast('Repuestos Pendientes', 'Hay nuevas solicitudes de repuestos esperando tu aprobación.', 'info');
          }

          prevCountsRef.current = { reports: pendingCount, approvals: approvalCount };
        } else {
          // Initialize counts on first non-silent load
          const pendingCount = newReports.filter(r => r.status === 'PENDIENTE').length;
          const approvalCount = newOrders.filter(o => o.status === 'ESPERANDO_REPUESTOS' && o.requestedParts.some(p => p.status === 'PENDIENTE_APROBACION')).length;
          prevCountsRef.current = { reports: pendingCount, approvals: approvalCount };
        }
      }
      if (resUsers.ok) {
        const users = await resUsers.json();
        setTechnicians(users.filter(u => u.role === 'TECNICO'));
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      await fetch(`${apiUrl}/api/tasks/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, report_id: selectedReportId })
      });
      setShowOrderModal(false);
      setSelectedReportId(null);
      setFormData({ technician_id: '', observations: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm('¿Seguro que deseas rechazar y eliminar este repuesto de la lista?')) return;
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      await fetch(`${apiUrl}/api/tasks/parts/${partId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const handleApprovePartsList = async (orderId) => {
    if (!window.confirm('¿Aprobar y enviar esta lista a bodega/almacén?')) return;
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      await fetch(`${apiUrl}/api/tasks/work-orders/${orderId}/parts-review`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}>
            <ArrowLeft size={24} />
          </button>
          <FileText size={32} color="var(--primary)" />
          <h1 style={{ fontSize: '1.75rem' }}>Gestión Operativa</h1>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '1rem' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>v1.1-build-sync</span>
            <span style={{ fontSize: '0.5rem', color: '#10b981', cursor: 'pointer' }} onClick={() => alert(`Total Reports: ${reports.length}\nTotal Orders: ${orders.length}\nToken: ${localStorage.getItem('mtto_token') ? 'YES' : 'NO'}`)}>
              API: {import.meta.env.VITE_API_URL || 'Localh:3005'} [VER INFO]
            </span>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('ESPERANDO')} style={{ flex: 1, padding: '1rem', background: activeTab === 'ESPERANDO' ? 'var(--primary)' : 'var(--surface-color)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
          Reportes Pendientes
        </button>
        <button onClick={() => setActiveTab('ESPERANDO_REPUESTOS')} style={{ flex: 1, padding: '1rem', background: activeTab === 'ESPERANDO_REPUESTOS' ? '#a855f7' : 'var(--surface-color)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} /> Aprobación Repuestos
        </button>
        <button onClick={() => setActiveTab('ORDENES')} style={{ flex: 1, padding: '1rem', background: activeTab === 'ORDENES' ? 'var(--primary)' : 'var(--surface-color)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
          Monitor General
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '2rem', textAlign: 'center' }}>
          <strong>Error de Carga:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="loading-spinner" color="var(--primary)" size={48} /></div>
      ) : (
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', padding: '1.5rem' }}>
          
          {/* TAB: REPORTES */}
          {activeTab === 'ESPERANDO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reports.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay reportes de fallas.</p>}
              {reports.map(r => (
                <div key={r.id} style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', opacity: r.status === 'PENDIENTE' ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <strong style={{ fontSize: '1rem', color: r.status === 'PENDIENTE' ? '#f59e0b' : '#3b82f6' }}>{r.status === 'PENDIENTE' ? 'NUEVA FALLA' : r.status.replace(/_/g, ' ')}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : 'No date'}</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{r.vehicle?.plate || 'S/P'} - {r.vehicle?.brand || 'Genérico'}</div>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: '0.5rem 0' }}>"{r.description || 'Sin descripción'}"</p>
                  {r.system_affected && <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{r.system_affected.replace('_', ' ')}</span>}
                  
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>De: {r.driver?.name || r.driver?.email || 'Desconocido'}</span>
                      {r.status === 'PENDIENTE' && (
                        <button onClick={() => { setSelectedReportId(r.id); setShowOrderModal(true); }} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#10b981', border: '1px solid #10b981', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Asignar</button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: APROBACION DE REPUESTOS */}
          {activeTab === 'ESPERANDO_REPUESTOS' && (
            <div>
              {orders.filter(o => o.status === 'ESPERANDO_REPUESTOS').length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay partes pendientes por revisar.</p>}
              
              {orders.filter(o => o.status === 'ESPERANDO_REPUESTOS').map(o => {
                const pendingParts = o.requestedParts?.filter(p => p.status === 'PENDIENTE_APROBACION') || [];
                const shortages = o.requestedParts?.filter(p => p.status === 'NO_DISPONIBLE') || [];
                
                return (
                  <div key={o.id} style={{ padding: '1.5rem', border: '1px dashed #a855f7', background: 'rgba(168,85,247,0.05)', borderRadius: '12px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <strong style={{ fontSize: '1.1rem', color: '#d8b4fe', marginBottom: '0.25rem', display: 'block' }}>Vehículo: {o.report?.vehicle?.plate}</strong>
                        <p style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>Técnico a cargo: {o.technician?.name || o.technician?.email}</p>
                        {o.concepts && <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic', fontSize: '0.85rem' }}>Hallazgos: {o.concepts}</p>}
                      </div>
                    </div>

                    {shortages.length > 0 && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <AlertOctagon color="#ef4444" size={20} />
                        <div>
                          <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>Atención: Almacén reporta faltantes</strong>
                          <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, color: 'white', fontSize: '0.85rem' }}>
                            {shortages.map(p => <li key={p.id}>{p.quantity}x {p.name}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}

                    {pendingParts.length > 0 && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem' }}>
                        <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem' }}>Lista de Solicitud (Por Revisar):</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <tbody>
                            {pendingParts.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '0.5rem', color: 'white', width: '50px' }}>{p.quantity}x</td>
                                <td style={{ padding: '0.5rem', color: 'var(--text-main)' }}>{p.name}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                  <button onClick={() => handleDeletePart(p.id)} style={{ padding: '0.4rem', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer' }} title="Rechazar/Eliminar">
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                          <button onClick={() => handleApprovePartsList(o.id)} style={{ padding: '0.75rem 1.5rem', background: '#a855f7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={18} /> Aprobar Lista hacia Almacén
                          </button>
                        </div>
                      </div>
                    )}

                    {pendingParts.length === 0 && shortages.length === 0 && (
                       <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Esta lista ya está procesándose en bodega.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: MONITOR */}
          {activeTab === 'ORDENES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {orders.map(o => (
                <div key={o.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ color: 'white' }}>{o.report?.vehicle?.plate}</strong>
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', borderRadius: '4px', background: o.status.includes('TERMINADA') ? 'rgba(16,185,129,0.2)' : o.status === 'ESPERANDO_REPUESTOS' ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.2)', color: o.status.includes('TERMINADA') ? '#10b981' : o.status === 'ESPERANDO_REPUESTOS' ? '#d8b4fe' : '#60a5fa' }}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {o.technician?.name || o.technician?.email} • {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedOrderLogs(o.logs); setShowHistoryModal(true); }} style={{ padding: '0.4rem 0.75rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    Ver Historial
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {showOrderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '420px', borderTop: '4px solid #10b981' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Asignar Técnico</h2>
            <form onSubmit={handleCreateOrder}>
              <div className="input-group">
                <label>Mecánico / Especialista</label>
                <select required style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.technician_id} onChange={e => setFormData({...formData, technician_id: e.target.value})}>
                  <option value="">-- Seleccionar --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name || t.email} ({t.specialty?.replace('_',' ') || 'General'})</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Notas Administrativas</label>
                <textarea rows="3" style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})}></textarea>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowOrderModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>Cerrar</button>
                <button type="submit" className="submit-btn" style={{ flex: 1, margin: 0, background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={submitting}>
                  {submitting ? <div className="loading-spinner"></div> : 'Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlayCircle color="#3b82f6" /> Trazabilidad de la Orden</h2>
            <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
              <div style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '2px', background: 'rgba(255,255,255,0.1)' }}></div>
              {selectedOrderLogs.map((log) => (
                <div key={log.id} style={{ position: 'relative', marginBottom: '2rem' }}>
                  <div style={{ position: 'absolute', top: '5px', left: '-1.85rem', width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6', border: '3px solid var(--surface-color)' }}></div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#60a5fa' }}>{log.new_status.replace(/_/g, ' ')}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Por: {log.user?.name || log.user?.email} ({log.user?.role})</div>
                    {log.notes && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic', whiteSpace: 'pre-line' }}>{log.notes}</div>
                    )}
                  </div>
                </div>
              ))}
              {selectedOrderLogs.length === 0 && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay registros.</div>}
            </div>
            <button onClick={() => setShowHistoryModal(false)} style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '1rem', fontWeight: 'bold' }}>Cerrar</button>
          </div>
        </div>
      )}
      {/* TOAST NOTIFICATIONS */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TasksManager;
