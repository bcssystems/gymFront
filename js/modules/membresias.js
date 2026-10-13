let state = { data: [], editingId: null };

export function init() {
  document.getElementById('btnNuevaMembresia')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarMembresia')?.addEventListener('click', guardar);
  document.getElementById('tableMembresiasBody')?.addEventListener('click', manejarClick);
  cargar();
}

async function cargar() {
  try {
    const result = await API.get('/membresias?size=100');
    state.data = result.content || [];
    render();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function render() {
  const body = document.getElementById('tableMembresiasBody');
  if (!body) return;
  if (!state.data.length) { body.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-id-card"></i><p>No hay membresías</p></div></td></tr>'; return; }
  const money = value => Utils.formatMonto(value || 0);
  body.innerHTML = state.data.map(m => `<tr>
    <td><strong>${Utils.esc(m.nombre)}</strong><small class="d-block text-muted">${Utils.esc(m.descripcion || '')}</small></td>
    <td>${money(m.precioDia)}</td><td>${money(m.precioSemana)}</td><td>${money(m.precioMes)}</td><td>${money(m.precioAnio)}</td>
    <td><span class="badge ${m.activa ? 'bg-success' : 'bg-secondary'}">${m.activa ? 'Activa' : 'Inactiva'}</span></td>
    <td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${m.idMembresia}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>
  </tr>`).join('');
}

function manejarClick(e) {
  const btn = e.target.closest('.kebab-trigger');
  if (!btn) return;
  const m = state.data.find(x => x.idMembresia === parseInt(btn.dataset.id));
  if (!m) return;
  const items = [
    { icon: 'fa-eye', text: 'Ver membresía', color: 'var(--info)', onClick: () => verMembresia(m) },
  ];
  if (Utils.hasPermiso('MEMBRESIAS_EDITAR')) {
    items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(m.idMembresia) });
  }
  if (m.activa && Utils.hasPermiso('MEMBRESIAS_ELIMINAR')) {
    items.push({ icon: 'fa-ban', text: 'Desactivar', color: 'var(--danger)', onClick: () => desactivar(m.idMembresia) });
  }
  Utils.abrirMenuKebab(btn, items);
}

function verMembresia(m) {
  const money = value => Utils.formatMonto(value || 0);
  document.getElementById('membresiaDetalleBody').innerHTML = `
    <h5>${Utils.esc(m.nombre)}</h5>
    <p class="text-muted">${Utils.esc(m.descripcion || 'Sin descripción')}</p>
    <div class="row g-2 small">
      <div class="col-6">Día: <strong>${money(m.precioDia)}</strong></div>
      <div class="col-6">Semana: <strong>${money(m.precioSemana)}</strong></div>
      <div class="col-6">Mes: <strong>${money(m.precioMes)}</strong></div>
      <div class="col-6">Año: <strong>${money(m.precioAnio)}</strong></div>
    </div>`;
  new bootstrap.Modal(document.getElementById('membresiaDetalleModal')).show();
}

async function desactivar(id) {
  const ok = await Utils.confirmAction('¿Desactivar esta membresía?', 'Confirmar', 'Desactivar');
  if (!ok) return;
  try {
    await API.del('/membresias/' + id);
    Utils.showToast('Membresía desactivada', 'success');
    cargar();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function abrirModal(id) {
  state.editingId = id;
  document.getElementById('formMembresia').reset();
  document.getElementById('membresiaModalTitle').textContent = id ? 'Editar membresía' : 'Nueva membresía';
  const m = state.data.find(x => x.idMembresia === id);
  if (m) {
    document.getElementById('membresiaNombre').value = m.nombre || '';
    document.getElementById('membresiaDescripcion').value = m.descripcion || '';
    document.getElementById('membresiaPrecioDia').value = m.precioDia ?? 0;
    document.getElementById('membresiaPrecioSemana').value = m.precioSemana ?? 0;
    document.getElementById('membresiaPrecioMes').value = m.precioMes ?? 0;
    document.getElementById('membresiaPrecioAnio').value = m.precioAnio ?? 0;
    document.getElementById('membresiaActiva').checked = m.activa !== false;
  } else document.getElementById('membresiaActiva').checked = true;
  new bootstrap.Modal(document.getElementById('membresiaModal')).show();
}

async function guardar() {
  const data = {
    nombre: document.getElementById('membresiaNombre').value.trim(),
    descripcion: document.getElementById('membresiaDescripcion').value.trim(),
    precioDia: Number(document.getElementById('membresiaPrecioDia').value || 0),
    precioSemana: Number(document.getElementById('membresiaPrecioSemana').value || 0),
    precioMes: Number(document.getElementById('membresiaPrecioMes').value || 0),
    precioAnio: Number(document.getElementById('membresiaPrecioAnio').value || 0),
    activa: document.getElementById('membresiaActiva').checked,
  };
  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  try {
    if (state.editingId) await API.put('/membresias/' + state.editingId, data);
    else await API.post('/membresias', data);
    bootstrap.Modal.getInstance(document.getElementById('membresiaModal'))?.hide();
    Utils.showToast('Membresía guardada', 'success');
    cargar();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
