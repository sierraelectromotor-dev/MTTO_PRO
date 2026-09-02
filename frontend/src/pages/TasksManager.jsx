import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, PlayCircle, PlusCircle, Package, Trash2, CheckCircle, AlertOctagon, MapPin, ExternalLink, RefreshCw } from 'lucide-react';
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

  const traccarUrl = import.meta.env.VITE_TRACCAR_URL || 'http://187.77.3.156:8585/';

  return (
    <div style={{ padding: '1rem', minHeight: '100vh', width: '100%', maxWidth: activeTab === 'MAPA' ? '1200px' : '600px', margin: '0 auto', boxSizing: 'border-box', transition: 'max-width 0.2s ease-in-out' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate('/admin-dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', marginLeft: '-0.5rem' }}>
              <ArrowLeft size={24} />
            </button>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Gestión Operativa</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>v1.1-build-sync</div>
          </div>
        </div>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '0.5rem', 
        marginBottom: '1.5rem' 
      }}>
        <button onClick={() => setActiveTab('ESPERANDO')} style={{ 
          padding: '0.75rem', 
          background: activeTab === 'ESPERANDO' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
          color: 'white', 
          border: '1px solid ' + (activeTab === 'ESPERANDO' ? 'var(--primary)' : 'var(--border-color)'), 
          borderRadius: '10px', 
          fontWeight: 'bold',
          fontSize: '0.85rem'
        }}>
          Reportes
        </button>
        <button onClick={() => setActiveTab('ESPERANDO_REPUESTOS')} style={{ 
          padding: '0.75rem', 
          background: activeTab === 'ESPERANDO_REPUESTOS' ? '#a855f7' : 'rgba(255,255,255,0.05)', 
          color: 'white', 
          border: '1px solid ' + (activeTab === 'ESPERANDO_REPUESTOS' ? '#a855f7' : 'var(--border-color)'), 
          borderRadius: '10px', 
          fontWeight: 'bold',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem'
        }}>
          <Package size={16} /> Repuestos
        </button>
        <button onClick={() => setActiveTab('ORDENES')} style={{ 
          padding: '0.75rem', 
          background: activeTab === 'ORDENES' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
          color: 'white', 
          border: '1px solid ' + (activeTab === 'ORDENES' ? 'var(--primary)' : 'var(--border-color)'), 
          borderRadius: '10px', 
          fontWeight: 'bold',
          fontSize: '0.85rem'
        }}>
          Monitor General
        </button>
        <button onClick={() => setActiveTab('MAPA')} style={{ 
          padding: '0.75rem', 
          background: activeTab === 'MAPA' ? '#0284c7' : 'rgba(255,255,255,0.05)', 
          color: 'white', 
          border: '1px solid ' + (activeTab === 'MAPA' ? '#0284c7' : 'var(--border-color)'), 
          borderRadius: '10px', 
          fontWeight: 'bold',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem'
        }}>
          <MapPin size={16} color={activeTab === 'MAPA' ? '#ffffff' : '#38bdf8'} /> Mapa GPS
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
        <div style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', padding: '1rem' }}>
          
          {/* TAB: REPORTES */}
          {activeTab === 'ESPERANDO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {reports.filter(r => r.status === 'PENDIENTE').length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No hay reportes de fallas pendientes.</p>
              )}
              {reports.filter(r => r.status === 'PENDIENTE').map(r => (
                <div key={r.id} style={{ 
                  padding: '1rem', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  overflowWrap: 'anywhere'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#f59e0b', whiteSpace: 'nowrap' }}>NUEVA FALLA</strong>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'right' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '0.4rem' }}>{r.vehicle?.plate || 'S/P'} - {r.vehicle?.brand || ''}</div>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.875rem', margin: '0.4rem 0', lineHeight: '1.3' }}>"{r.description || 'Sin descripción'}"</p>
                  {r.system_affected && (
                    <span style={{ 
                      display: 'inline-block',
                      color: '#ef4444', 
                      fontSize: '0.65rem', 
                      fontWeight: 600, 
                      background: 'rgba(239,68,68,0.1)', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '4px',
                      marginTop: '0.4rem',
                      textTransform: 'uppercase'
                    }}>{r.system_affected.replace('_', ' ')}</span>
                  )}
                  
                  <div style={{ 
                    marginTop: '0.75rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '0.6rem',
                    borderTop: '1px solid rgba(255,255,255,0.05)', 
                    paddingTop: '0.75rem' 
                  }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>De: <strong style={{ color: 'white' }}>{r.driver?.name || r.driver?.email || 'Desconocido'}</strong></div>
                      <button onClick={() => { setSelectedReportId(r.id); setShowOrderModal(true); }} style={{ 
                        width: '100%',
                        padding: '0.75rem', 
                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontSize: '0.9rem', 
                        fontWeight: 'bold' 
                      }}>Asignar Técnico</button>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {pendingParts.map(p => (
                            <div key={p.id} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              background: 'rgba(255,255,255,0.03)', 
                              padding: '0.5rem 0.75rem', 
                              borderRadius: '8px' 
                            }}>
                              <div style={{ color: 'white', fontSize: '0.9rem' }}>
                                <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{p.quantity}x</span> {p.name}
                              </div>
                              <button onClick={() => handleDeletePart(p.id)} style={{ padding: '0.4rem', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ marginTop: '1.25rem' }}>
                          <button onClick={() => handleApprovePartsList(o.id)} style={{ width: '100%', padding: '0.85rem', background: '#a855f7', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={18} /> Aprobar Lista
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              {orders.map(o => (
                <div key={o.id} style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                  gap: '1rem'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ color: 'white' }}>{o.report?.vehicle?.plate || 'S/P'}</strong>
                      <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: 'bold', 
                        padding: '0.15rem 0.4rem', 
                        borderRadius: '4px', 
                        background: o.status.includes('TERMINADA') ? 'rgba(16,185,129,0.2)' : o.status === 'ESPERANDO_REPUESTOS' ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.2)', 
                        color: o.status.includes('TERMINADA') ? '#10b981' : o.status === 'ESPERANDO_REPUESTOS' ? '#d8b4fe' : '#60a5fa' 
                      }}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.technician?.name || o.technician?.email} • {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedOrderLogs(o.logs); setShowHistoryModal(true); }} style={{ 
                    padding: '0.5rem', 
                    background: 'transparent', 
                    color: 'var(--text-muted)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontSize: '0.7rem',
                    flexShrink: 0 
                  }}>
                    Historial
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB: MAPA TRACCAR */}
          {activeTab === 'MAPA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} color="#38bdf8" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'white' }}>Telemetría GPS (Traccar)</span>
                  <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 'bold' }}>EN VIVO</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => {
                      const iframe = document.getElementById('traccar-iframe');
                      if (iframe) iframe.src = iframe.src;
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem' }}
                    title="Recargar mapa">
                    <RefreshCw size={14} /> Recargar
                  </button>
                  <a 
                    href={traccarUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 'bold' }}>
                    <ExternalLink size={14} /> Abrir en pestaña
                  </a>
                </div>
              </div>

              <div style={{ 
                width: '100%', 
                height: 'calc(100vh - 280px)', 
                minHeight: '520px', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                background: '#0f172a', 
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}>
                <iframe
                  id="traccar-iframe"
                  src={traccarUrl}
                  title="Traccar GPS"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="geolocation; camera; microphone"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {showOrderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '420px', borderTop: '4px solid #10b981', background: '#1a1d24', opacity: 1 }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', background: '#1a1d24', opacity: 1 }}>
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
