import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Loader2, Package, Check, X, Bell, Truck, History, Info, AlertTriangle } from 'lucide-react';

function WarehouseDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('mtto_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ALMACENISTA') {
      navigate('/login');
      return;
    }
    setUser(parsedUser);
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [navigate]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/tasks/warehouse`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePartStatus = async (partId, newStatus) => {
    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      
      await fetch(`${apiUrl}/api/tasks/warehouse/parts/${partId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      
      fetchData(); // Refresh UI
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = async (orderId, type) => {
    const confirmMsg = type === 'dispatch' 
      ? '¿Confirmar que los repuestos están listos para que el técnico venga a buscarlos?' 
      : '¿Registrar la entrega física de los repuestos al técnico ahora?';
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('mtto_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const endpoint = type === 'dispatch' ? 'dispatch' : 'deliver';
      
      const res = await fetch(`${apiUrl}/api/tasks/warehouse/orders/${orderId}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) fetchData();
      else alert('Error al procesar la acción');
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.removeItem('mtto_token');
    localStorage.removeItem('mtto_user');
    navigate('/login');
  };

  // Helper to categorize orders
  const categorizeOrders = () => {
    const pending = [];
    const ready = [];
    const history = [];

    orders.forEach(o => {
      const parts = o.requestedParts || [];
      const isAllDelivered = parts.every(p => p.status === 'ENTREGADO' || p.status === 'NO_DISPONIBLE');
      const hasAprobado = parts.some(p => p.status === 'APROBADO' || p.status === 'PENDIENTE_APROBACION');

      if (isAllDelivered && parts.length > 0) {
        history.push(o);
      } else if (hasAprobado) {
        pending.push(o);
      } else {
        ready.push(o);
      }
    });

    return { pending, ready, history };
  };

  if (!user) return null;

  const { pending, ready, history } = categorizeOrders();

  const OrderCard = ({ o, statusType }) => {
    const parts = o.requestedParts || [];
    const hasShortages = parts.some(p => p.status === 'NO_DISPONIBLE');
    const isPartial = parts.some(p => p.status === 'NO_DISPONIBLE') && parts.some(p => p.status === 'DISPONIBLE' || p.status === 'ENTREGADO');

    return (
      <div key={o.id} style={{ background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', marginBottom: '1.5rem', opacity: statusType === 'history' ? 0.7 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>Ticket #{o.id.substring(0,6)}</strong>
              {statusType === 'pending' && <span style={{ padding: '0.1rem 0.6rem', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>PENDIENTE</span>}
              {statusType === 'ready' && <span style={{ padding: '0.1rem 0.6rem', background: 'rgba(16,185,129,0.2)', color: '#10b981', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>LISTO PARA RETIRO</span>}
              {statusType === 'history' && <span style={{ padding: '0.1rem 0.6rem', background: 'rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>ENTREGADO</span>}
            </div>
            <span style={{ fontSize: '0.9rem', color: 'white' }}>Vehículo: <strong>{o.report?.vehicle?.plate}</strong> - {o.report?.vehicle?.brand}</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Técnico: {o.technician?.name || o.technician?.email}</p>
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <th style={{ paddingBottom: '0.5rem' }}>QTY</th>
                <th style={{ paddingBottom: '0.5rem' }}>REPUESTO</th>
                <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>ESTADO / ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => {
                const isNoDisp = p.status === 'NO_DISPONIBLE';
                const isDisp = p.status === 'DISPONIBLE';
                const isEnt = p.status === 'ENTREGADO';
                
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', color: 'white', width: '50px', fontWeight: 'bold' }}>{p.quantity}x</td>
                    <td style={{ padding: '0.75rem 0', color: isNoDisp ? '#ef4444' : 'var(--text-main)', textDecoration: isNoDisp ? 'line-through' : 'none' }}>
                       {p.name}
                       {isNoDisp && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#ef4444', fontStyle: 'italic' }}>(Faltante)</span>}
                       {isEnt && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#3b82f6' }}>(Entregado)</span>}
                       {(p.status !== 'PENDIENTE_APROBACION') && p.approver && (
                         <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                           Autorizado por: <strong>{p.approver.name || p.approver.email}</strong>
                         </div>
                       )}
                    </td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right' }}>
                      {statusType === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => togglePartStatus(p.id, 'DISPONIBLE')} style={{ width: '40px', height: '40px', padding: 0, background: isDisp ? '#10b981' : 'transparent', color: isDisp ? 'white' : '#10b981', border: '1px solid #10b981', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="Sí hay existencias">
                            <Check size={20} />
                          </button>
                          <button onClick={() => togglePartStatus(p.id, 'NO_DISPONIBLE')} style={{ width: '40px', height: '40px', padding: 0, background: isNoDisp ? '#ef4444' : 'transparent', color: isNoDisp ? 'white' : '#ef4444', border: '1px solid #ef4444', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="No hay en inventario">
                            <X size={20} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isNoDisp ? '#ef4444' : isEnt ? '#3b82f6' : '#10b981' }}>
                          {isNoDisp ? 'FALTANTE' : isEnt ? 'ENTREGADO' : 'LISTO'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {statusType === 'pending' && (
             <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flex: 1 }}>
               <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
               Marca la disponibilidad de todos los items para avanzar.
             </p>
          )}
          
          {statusType === 'ready' && (
            <>
              {hasShortages && (
                <span style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={16} /> Contiene faltantes (Entrega parcial)
                </span>
              )}
              <button onClick={() => handleAction(o.id, 'dispatch')} style={{ padding: '0.75rem 1.25rem', background: 'transparent', color: '#10b981', border: '1px solid #10b981', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}>
                <Bell size={18} /> Notificar Recolección
              </button>
              <button onClick={() => handleAction(o.id, 'deliver')} style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                <Truck size={18} /> Marcar Entrega Física
              </button>
            </>
          )}
          
          {statusType === 'history' && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <History size={16} /> Entregado {hasShortages ? '(Parcial)' : '(Completo)'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', background: 'var(--surface-color)', padding: '1.25rem 2rem', borderRadius: '20px', border: '1px solid var(--border-color)', backdropFilter: 'blur(20px)' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
            <Package color="#10b981" size={28} /> Control de Almacén
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gestor: <strong>{user.name || user.email}</strong></p>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '0.6rem 1.2rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}>
          <LogOut size={18} /> Salir
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><Loader2 className="loading-spinner" color="#10b981" size={56} /></div>
      ) : (
        <div>
          {/* SECTION: PENDING */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#f59e0b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span> Pendientes por Verificar ({pending.length})
            </h3>
            {pending.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>No hay nuevas solicitudes de repuestos.</p> : pending.map(o => <OrderCard key={o.id} o={o} statusType="pending" />)}
          </div>

          {/* SECTION: READY */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#10b981', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> Listos para Entrega ({ready.length})
            </h3>
            {ready.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>Marca todos los repuestos de una orden para que aparezca aquí.</p> : ready.map(o => <OrderCard key={o.id} o={o} statusType="ready" />)}
          </div>

          {/* SECTION: HISTORY */}
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--text-muted)' }}></span> Historial de Entregas
            </h3>
            {history.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay entregas registradas aún.</p> : history.map(o => <OrderCard key={o.id} o={o} statusType="history" />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default WarehouseDashboard;
