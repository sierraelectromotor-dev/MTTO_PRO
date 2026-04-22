import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Loader2, Wrench, CheckCircle, Package, Send, ArrowRight, BookOpen, Plus, Trash2 } from 'lucide-react';
import { App } from '@capacitor/app';

function TechnicianDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState({ visible: false, type: '', orderId: null, existingConcepts: '' });
  const [formData, setFormData] = useState({ textValue: '', statusSelection: '', technician_id: '' });
  
  // Dynamic Parts List
  const [partsList, setPartsList] = useState([{ name: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  // Refs for change detection (avoiding stale closures in polling)
  const prevOrdersCountRef = useRef(0);
  const prevReadyCountRef = useRef(0);

  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  useEffect(() => {
    const userData = localStorage.getItem('mtto_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'TECNICO') {
      navigate('/login');
      return;
    }
    setUser(parsedUser);
    fetchData();

    // Refresh when app comes back to foreground (e.g. after clicking notification)
    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('App active - Refreshing data...');
        fetchData(true);
      }
    });

    // Handle manual window focus (for web/emulator testing)
    window.addEventListener('focus', () => fetchData(true));

    // Live Updates: Refresh every 30 seconds (longer interval since we have foreground refresh)
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => {
      clearInterval(interval);
      appStateListener.remove();
      window.removeEventListener('focus', () => fetchData(true));
    };
  }, [navigate]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    if (!isSilent) setError(null);
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      
      const resOrders = await fetch(`${apiUrl}/api/tasks/my-orders`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });

      if (!resOrders.ok) {
        const errData = await resOrders.json();
        throw new Error(errData.error || 'Error al obtener órdenes');
      }

      const ordersData = await resOrders.json();
      
      // COMPARISON LOGIC for Notifications
      if (isSilent) {
        // 1. New Assignment
        if (ordersData.length > prevOrdersCountRef.current) {
          addToast('Nueva Asignación', 'Se te ha asignado una nueva orden de trabajo.', 'success');
        }

        // 2. Parts Ready for Pickup
        const currentReadyCount = ordersData.reduce((acc, o) => 
          acc + (o.requestedParts?.filter(p => p.status === 'DISPONIBLE').length || 0), 0
        );

        if (currentReadyCount > prevReadyCountRef.current) {
          addToast('Repuestos Listos', 'Tienes repuestos listos para recoger en bodega.', 'info');
        }
        prevReadyCountRef.current = currentReadyCount;
      } else {
        // Initialize counts on first non-silent load
        prevOrdersCountRef.current = ordersData.length;
        prevReadyCountRef.current = ordersData.reduce((acc, o) => 
          acc + (o.requestedParts?.filter(p => p.status === 'DISPONIBLE').length || 0), 0
        );
      }

      setOrders(ordersData);
      prevOrdersCountRef.current = ordersData.length;

      // Fetch users in separate try-catch so it doesn't block orders
      try {
        const resUsers = await fetch(`${apiUrl}/api/users`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (resUsers.ok) {
          const users = await resUsers.json();
          setTechnicians(users.filter(u => u.role === 'TECNICO'));
        }
      } catch (err) {
        console.warn("Could not fetch users list:", err);
      }

    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatusSimple = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/tasks/work-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || 'Error al actualizar estado');
      }
      addToast('Actualizado', `Orden movida a ${newStatus.replace(/_/g, ' ')}`, 'success');
      fetchData();
    } catch (err) {
      console.error(err);
      addToast('Error', err.message, 'error');
    }
  };

  const openModal = (type, order) => {
    setFormData({ textValue: type === 'findings' ? (order.concepts || '') : '', statusSelection: '', technician_id: '' });
    if (type === 'parts') setPartsList([{ name: '', quantity: 1 }]);
    setShowModal({ visible: true, type, orderId: order.id, existingConcepts: order.concepts || '' });
  }

  const handlePartsChange = (index, field, value) => {
    const newList = [...partsList];
    newList[index][field] = value;
    setPartsList(newList);
  };
  const addPartRow = () => setPartsList([...partsList, { name: '', quantity: 1 }]);
  const removePartRow = (index) => setPartsList(partsList.filter((_, i) => i !== index));

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      
      let res;
      if (showModal.type === 'parts') {
        const validParts = partsList.filter(p => p.name.trim() !== '');
        if (validParts.length === 0) {
          setSubmitting(false);
          return alert('Por favor ingresa al menos un repuesto válido.');
        }
        
        res = await fetch(`${apiUrl}/api/tasks/work-orders/${showModal.orderId}/parts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ parts: validParts })
        });
      } else {
        let payload = {};
        if (showModal.type === 'findings') {
          payload = { concepts: formData.textValue, log_notes: `Registró hallazgos técnicos.` };
        } else if (showModal.type === 'finalize') {
          payload = { status: formData.statusSelection, conclusion: formData.textValue };
        } else if (showModal.type === 'reassign') {
          payload = { status: 'ASIGNADA', technician_id: formData.technician_id, log_notes: `Motivo de reasignación: ${formData.textValue}` };
        }

        res = await fetch(`${apiUrl}/api/tasks/work-orders/${showModal.orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error en la operación');
      }
      
      addToast('Éxito', 'La operación se realizó correctamente', 'success');
      fetchData();
      setShowModal({ visible: false, type: '', orderId: null, existingConcepts: '' });
    } catch (err) {
      console.error(err);
      addToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mtto_token');
    localStorage.removeItem('mtto_user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'var(--surface-color)', padding: '1rem 2rem', borderRadius: '16px', border: '1px solid var(--border-color)', backdropFilter: 'blur(16px)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench color="#3b82f6" /> Panel Técnico {(user.specialty && user.specialty !== 'OTRO') ? `- ${user.specialty.replace('_',' ')}` : ''}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.name || user.email}</p>
        </div>
        
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
          <LogOut size={18} /> Salir
        </button>
      </header>

      <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Mis Tareas Asignadas</h3>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '2rem', textAlign: 'center' }}>
          <strong>Error de Carga:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="loading-spinner" color="#3b82f6" size={48} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.length === 0 && (
            <div style={{ background: 'var(--surface-color)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>No tienes órdenes asignadas.</div>
          )}
          {orders.map(o => {
            const isFinished = o.status.includes('TERMINADA');
            return (
              <div key={o.id} style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', opacity: isFinished ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: '#3b82f6', display: 'block' }}>{o.report?.vehicle?.plate}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{o.report?.vehicle?.brand}</span>
                  </div>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Falla reportada:</p>
                  <p style={{ color: 'var(--text-main)' }}>{o.report?.description}</p>
                </div>

                {o.concepts && (
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <p style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>Conceptos (Tus hallazgos):</p>
                    <p style={{ color: 'white', whiteSpace: 'pre-line' }}>{o.concepts}</p>
                  </div>
                )}

                {!isFinished && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {o.status === 'ASIGNADA' && (
                      <button onClick={() => updateStatusSimple(o.id, 'EN_PROCESO')} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', cursor: 'pointer' }}>Comenzar Tarea</button>
                    )}
                    {(o.status === 'EN_PROCESO' || o.status === 'REPUESTOS_RECIBIDOS') && (
                      <>
                        <button onClick={() => openModal('findings', o)} style={{ padding: '0.75rem', background: 'transparent', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', cursor: 'pointer' }}><BookOpen size={18} /> {o.concepts ? 'Editar Hallazgos' : 'Reportar Hallazgo'}</button>
                        {(o.status === 'EN_PROCESO' || o.status === 'REPUESTOS_RECIBIDOS' || o.status === 'ESPERANDO_REPUESTOS') && (
                          <button onClick={() => openModal('parts', o)} style={{ padding: '0.75rem', background: 'transparent', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', cursor: 'pointer' }}><Package size={18} /> {o.status === 'ESPERANDO_REPUESTOS' ? 'Pedir Más Repuestos' : 'Pedir Repuestos'}</button>
                        )}
                        <button onClick={() => openModal('finalize', o)} style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><CheckCircle size={18} /> Finalizar</button>
                        <button onClick={() => openModal('reassign', o)} style={{ padding: '0.75rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}><ArrowRight size={18} /> Reasignar</button>
                      </>
                    )}
                    {o.status === 'ESPERANDO_REPUESTOS' && (
                      <div style={{ flex: 1, padding: '1rem', background: 'rgba(168,85,247,0.1)', border: '1px dashed #a855f7', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#d8b4fe', fontSize: '0.9rem' }}>Comunícate con almacén si tus repuestos ya fueron aprobados...</span>
                          <button onClick={() => updateStatusSimple(o.id, 'REPUESTOS_RECIBIDOS')} style={{ padding: '0.5rem 1rem', background: '#a855f7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Recibidos</button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <button onClick={() => openModal('findings', o)} style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Editar Hallazgos</button>
                           <button onClick={() => openModal('parts', o)} style={{ flex: 1, padding: '0.6rem', background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Pedir Más Repuestos</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal.visible && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div className="login-container" style={{ margin: 0, width: '100%', maxWidth: showModal.type === 'parts' ? '600px' : '450px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: showModal.type === 'findings' ? '#10b981' : showModal.type === 'parts' ? '#a855f7' : '#3b82f6' }}>
              {showModal.type === 'findings' && 'Concepto Técnico'}
              {showModal.type === 'parts' && 'Lista Estructurada de Repuestos'}
              {showModal.type === 'finalize' && 'Finalizar Trabajo'}
              {showModal.type === 'reassign' && 'Reasignar Orden'}
            </h2>
            
            <form onSubmit={handleModalSubmit}>
              {showModal.type === 'findings' && (
                <div className="input-group">
                  <label>Daños o hallazgos encontrados</label>
                  <textarea required rows="4" style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none' }} value={formData.textValue} onChange={e => setFormData({...formData, textValue: e.target.value})}></textarea>
                </div>
              )}

              {showModal.type === 'parts' && (
                <div>
                  <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Añade los items uno a uno indicando su nombre y cantidad requerida.</div>
                  {partsList.map((part, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input required placeholder="Nombre del repuesto, ej. Filtro AIRE" style={{ flex: 1, padding: '0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }} value={part.name} onChange={e => handlePartsChange(idx, 'name', e.target.value)} />
                      <input required type="number" min="1" style={{ width: '80px', padding: '0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }} value={part.quantity} onChange={e => handlePartsChange(idx, 'quantity', e.target.value)} />
                      <button type="button" onClick={() => removePartRow(idx)} style={{ padding: '0.75rem', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addPartRow} style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px dashed var(--border-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Añadir fila
                  </button>
                </div>
              )}

              {showModal.type === 'finalize' && (
                <>
                  {!showModal.existingConcepts && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>Advertencia: Concepto Técnico vacío.</div>}
                  <div className="input-group">
                    <label>Estado Final</label>
                    <select required style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white' }} value={formData.statusSelection} onChange={e => setFormData({...formData, statusSelection: e.target.value})}>
                      <option value="">-- Seleccionar --</option>
                      <option value="TERMINADA">Terminada (Resuelto)</option>
                      <option value="TERMINADA_CON_NOVEDAD">Terminada (Con Novedades)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Conclusión</label>
                    <textarea required rows="3" style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white' }} value={formData.textValue} onChange={e => setFormData({...formData, textValue: e.target.value})}></textarea>
                  </div>
                </>
              )}

              {showModal.type === 'reassign' && (
                <>
                  <div className="input-group">
                    <label>Técnico a reasignar</label>
                    <select required style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white' }} value={formData.technician_id} onChange={e => setFormData({...formData, technician_id: e.target.value})}>
                      <option value="">-- Seleccionar --</option>
                      {technicians.filter(t => t.id !== user?.id).map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Motivo</label>
                    <textarea required rows="2" style={{ width: '100%', padding: '0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white' }} value={formData.textValue} onChange={e => setFormData({...formData, textValue: e.target.value})}></textarea>
                  </div>
                </>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowModal({visible: false, type: '', orderId: null, existingConcepts: ''})} style={{ flex: 1, padding: '0.875rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" className="submit-btn" style={{ flex: 1, margin: 0, background: 'var(--primary)' }} disabled={submitting}>
                  {submitting ? <div className="loading-spinner"></div> : 'Enviar'}
                </button>
              </div>
            </form>
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

export default TechnicianDashboard;
