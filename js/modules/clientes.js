let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  pageSize: 10,
  editingId: null,
  paises: [],
  detalleClienteId: null,
  showInactive: false,
};

const REGIMENES_FISCALES = [
  { value: "601", label: "601 - General de Ley Personas Morales" },
  { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
  { value: "605", label: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { value: "606", label: "606 - Arrendamiento" },
  { value: "607", label: "607 - Enajenaci\u00f3n o Adquisici\u00f3n de Bienes" },
  { value: "608", label: "608 - Dem\u00e1s Ingresos" },
  { value: "610", label: "610 - Residentes en el Extranjero sin EP" },
  { value: "611", label: "611 - Dividendos (Socios y Accionistas)" },
  { value: "612", label: "612 - Personas F\u00edsicas con Act. Empresariales" },
  { value: "614", label: "614 - Ingresos por Intereses" },
  { value: "616", label: "616 - Sin Obligaciones Fiscales" },
  { value: "621", label: "621 - R\u00e9gimen de Incorporaci\u00f3n Fiscal" },
  { value: "625", label: "625 - Act. Empresariales con Plataformas Tecnol\u00f3gicas" },
  { value: "626", label: "626 - R\u00e9gimen Simplificado de Confianza" },
];

export function init() {
  bindEvents();
  cargarClientes(0);
}

function bindEvents() {
  if (!Utils.hasPermiso('CLIENTES_CREAR')) {
    const btn = document.getElementById('btnNuevoCliente');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevoCliente')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarCliente')?.addEventListener('click', guardarCliente);
  document.getElementById('tableClientesBody')?.addEventListener('click', handleTableClick);
  document.getElementById('searchCliente')?.addEventListener('input', Utils.debounce(() => cargarClientes(0), 400));
  document.getElementById('btnToggleClientesInactivos')?.addEventListener('click', toggleInactivos);
}

async function cargarPaises() {
  try {
    state.paises = await API.get('/catalogos/paises');
    const sel = document.getElementById('clientePais');
    if (sel) {
      sel.innerHTML = '<option value="">Seleccionar...</option>' +
        state.paises.map(p => `<option value="${p.codigo}">${p.nombre} (${p.prefijo})</option>`).join('');
      Utils.makeSearchableSelect('clientePais');
      sel.addEventListener('change', aplicarPrefijoPais);
      aplicarPrefijoPais();
    }
  } catch (_) {}
}

function aplicarPrefijoPais() {
  const span = document.getElementById('clientePrefijo');
  if (!span) return;
  const codigo = document.getElementById('clientePais')?.value || '';
  const pais = state.paises.find(p => p.codigo === codigo);
  const prefijo = pais && pais.prefijo ? pais.prefijo : '+52';
  if (span.textContent !== prefijo) span.textContent = prefijo;
}

function cargarRegimenes() {
  const sel = document.getElementById('clienteRegimen');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      REGIMENES_FISCALES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');
  }
}

async function cargarClientes(page) {
  state.currentPage = page;
  const search = document.getElementById('searchCliente')?.value || '';
  try {
    const result = await API.get('/clientes?search=' + encodeURIComponent(search) + '&activo=' + (state.showInactive ? 'false' : 'true') + '&page=' + page + '&size=' + state.pageSize);
    state.data = result.content;
    state.totalPages = result.totalPages;
    renderTable();
    renderPagination();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableClientesBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-address-book"></i><p>No hay clientes</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(c => {
    return `<tr>
    <td>${Utils.esc(c.nombre)}</td>
    <td>${Utils.esc(c.apellidoPaterno || '')} ${Utils.esc(c.apellidoMaterno || '')}</td>
      <td>${Utils.esc(c.employeeNo || '-')}</td>
     <td>${Utils.esc(c.tipoMembresia || '-')}</td>
     <td>${c.fechaFinMembresia ? Utils.formatDate(c.fechaFinMembresia) : '-'}</td>
    <td>${c.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
    <td class="acciones-cell">
      <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${c.idCliente}" data-action="menu" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
    </td>
  </tr>`;
  }).join('');

}

function toggleInactivos() {
  state.showInactive = !state.showInactive;
  state.currentPage = 0;
  const btn = document.getElementById('btnToggleClientesInactivos');
  if (btn) {
    btn.innerHTML = state.showInactive
      ? '<i class="fas fa-eye-slash me-1"></i> Mostrar activos'
      : '<i class="fas fa-eye me-1"></i> Mostrar inactivos';
  }
  cargarClientes(0);
}

function renderPagination() {
  const container = document.getElementById('paginationClientes');
  if (!container) return;
  if (state.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
      html += `<li class="page-item ${i === state.currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
      html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
    }
  }
  html += `<li class="page-item ${state.currentPage === state.totalPages - 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = parseInt(el.dataset.page);
      if (page >= 0 && page < state.totalPages) cargarClientes(page);
    });
  });
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    abrirAccionesCliente(kebab, id);
    return;
  }
  const item = e.target.closest('.btn-action');
  if (!item) return;
  e.preventDefault();
  const id = parseInt(item.dataset.id);
  if (item.dataset.action === 'edit' || item.classList.contains('btn-action-edit')) abrirModal(id);
  else if (item.dataset.action === 'delete' || item.classList.contains('btn-action-delete')) confirmarEliminar(id);
}

function abrirAccionesCliente(anchor, id) {
  const c = (state.data || []).find(x => x.idCliente === id);
  const membresiaActiva = Boolean(c && c.activo && c.fechaFinMembresia &&
    new Date(c.fechaFinMembresia + 'T23:59:59') >= new Date());
  const items = [
    { icon: 'fa-eye', text: 'Ver', color: 'var(--info)', onClick: () => abrirDetalleCliente(id) },
    { icon: 'fa-cash-register', text: membresiaActiva ? 'Renovar membresía' : 'Añadir membresía', color: 'var(--success)', onClick: () => renovarEnPOS(id, c) },
  ];
  if (Utils.hasPermiso('CLIENTES_EDITAR')) {
    items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
  }
  if (Utils.hasPermiso('CLIENTES_ELIMINAR')) {
    items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
  }
  if (items.length === 0) {
    items.push({ icon: 'fa-eye', text: 'Ver', color: 'var(--info)', onClick: () => abrirDetalleCliente(id) });
  }
  Utils.abrirMenuKebab(anchor, items);
}

function renovarEnPOS(id, c) {
  localStorage.setItem('membresiaParaPOS', JSON.stringify({
    idCliente: id,
    nombre: (c?.nombre || '') + ' ' + (c?.apellidoPaterno || ''),
    tipoMembresia: c?.tipoMembresia || null,
    fechaFinMembresia: c?.fechaFinMembresia || null,
    membresiaActiva: Boolean(c && c.activo && c.fechaFinMembresia &&
      new Date(c.fechaFinMembresia + 'T23:59:59') >= new Date()),
    accion: c && c.activo && c.fechaFinMembresia && new Date(c.fechaFinMembresia + 'T23:59:59') >= new Date() ? 'renovar' : 'anadir',
  }));
  Utils.showToast('Abriendo POS para renovar la membresía', 'info');
  document.querySelector('[data-view="pages/ventas.html"]')?.click();
}

function abrirDetalleCliente(id) {
  const c = (state.data || []).find(x => x.idCliente === id);
  if (!c) { Utils.showToast('Cliente no encontrado', 'warning'); return; }
  state.detalleClienteId = id;

  const formatear = v => v ? Utils.esc(String(v)) : '-';
  const gen = [];
  gen.push('<div class="mb-1"><span class="text-muted">RFC:</span> <strong>' + formatear(c.rfc) + '</strong></div>');
  gen.push('<div class="mb-1"><span class="text-muted">R\u00e9gimen fiscal:</span> ' + formatear(c.regimenFiscal) + '</div>');
  gen.push('<div class="mb-1"><span class="text-muted">WhatsApp:</span> ' + formatear(c.whatsapp) + '</div>');
  gen.push('<div class="mb-1"><span class="text-muted">Empresa:</span> ' + formatear(c.empresa) + '</div>');
  gen.push('<div class="mb-1"><span class="text-muted">Contacto:</span> ' + formatear(c.representanteLegal) + '</div>');
  gen.push('<div class="mb-0"><span class="text-muted">Registro:</span> ' + (c.fechaRegistro ? Utils.formatDateTime(c.fechaRegistro) : '-') + '</div>');
  document.getElementById('clienteDetalleGeneral').innerHTML = gen.join('');

  const dir = [];
  const direccionNum = [c.calle, c.numExt, c.numInt].filter(Boolean).join(' ') || '-';
  dir.push('<div class="mb-1"><span class="text-muted">Direcci\u00f3n:</span> ' + formatear(direccionNum) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">Colonia:</span> ' + formatear(c.colonia) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">C.P.:</span> ' + formatear(c.cp) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">Municipio:</span> ' + formatear(c.municipio) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">Estado:</span> ' + formatear(c.estado) + '</div>');
  dir.push('<div class="mb-0"><span class="text-muted">Entrega:</span> ' + formatear(c.direccionEntrega) + '</div>');
  document.getElementById('clienteDetalleDireccion').innerHTML = dir.join('');

  const membresia = [];
  membresia.push('<div class="mb-1"><span class="text-muted">EmployeeNo:</span> <strong>' + formatear(c.employeeNo) + '</strong></div>');
  membresia.push('<div class="mb-1"><span class="text-muted">Tipo:</span> ' + formatear(c.tipoMembresia) + '</div>');
  membresia.push('<div class="mb-1"><span class="text-muted">Inicio:</span> ' + (c.fechaInicioMembresia ? Utils.formatDate(c.fechaInicioMembresia) : '-') + '</div>');
  membresia.push('<div class="mb-0"><span class="text-muted">Vencimiento:</span> ' + (c.fechaFinMembresia ? Utils.formatDate(c.fechaFinMembresia) : '-') + '</div>');
  document.getElementById('clienteDetalleMembresia').innerHTML = membresia.join('');

  new bootstrap.Modal(document.getElementById('clienteDetalleModal')).show();
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
  document.getElementById('clienteModalTitle').textContent = id ? 'Editar Cliente' : 'Nuevo Cliente';
  document.getElementById('formCliente').reset();

  if (id) {
    const c = state.data.find(c => c.idCliente === id);
    if (c) {
      document.getElementById('clienteId').value = c.idCliente;
      document.getElementById('clienteNombre').value = c.nombre || '';
      document.getElementById('clienteApaterno').value = c.apellidoPaterno || '';
      document.getElementById('clienteAmaterno').value = c.apellidoMaterno || '';
    }
  }
  modal.show();
}

function combinarTelefonoCliente() {
  const lada = document.getElementById('clienteLada')?.value.replace(/\D/g, '').trim() || '';
  const num = document.getElementById('clienteTelefono').value.trim();
  const local = num.replace(/\D/g, '');
  if (lada && local.length >= 7) return lada + local;
  return num;
}

async function guardarCliente() {
  const data = {
    nombre: document.getElementById('clienteNombre').value.trim(),
    apellidoPaterno: document.getElementById('clienteApaterno').value.trim(),
    apellidoMaterno: document.getElementById('clienteAmaterno').value.trim(),
    telefono: '',
    codigoPais: 'MX',
    regimenFiscal: 'N/A',
  };
  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  if (!data.apellidoPaterno) { Utils.showToast('El apellido paterno es obligatorio', 'warning'); return; }

  try {
    if (state.editingId) {
      await API.put('/clientes/' + state.editingId, data);
      Utils.showToast('Cliente actualizado', 'success');
    } else {
      await API.post('/clientes', data);
      Utils.showToast('Cliente creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('clienteModal'))?.hide();
    cargarClientes(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('\u00bfEliminar este cliente?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/clientes/' + id);
    Utils.showToast('Cliente eliminado', 'success');
    cargarClientes(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}


function buildDireccionString() {
  const calle = document.getElementById('clienteCalle').value.trim();
  const numExt = document.getElementById('clienteNumExt').value.trim();
  const numInt = document.getElementById('clienteNumInt').value.trim();
  const colonia = document.getElementById('clienteColonia')?.value || '';
  const municipio = document.getElementById('clienteMunicipio').value.trim();
  const estado = document.getElementById('clienteEstado').value.trim();
  const cp = document.getElementById('clienteCp').value.trim();

  const parts = [];
  if (calle) parts.push(calle);
  if (numExt) parts.push('Ext. ' + numExt);
  if (numInt) parts.push('Int. ' + numInt);
  if (colonia) parts.push(colonia);
  if (municipio) parts.push(municipio);
  if (estado) parts.push(estado);
  if (cp) parts.push('C.P. ' + cp);

  return parts.join(', ');
}

const cpCache = {};

async function cargarColonias(cp, selectedColonia) {
  if (!cp || cp.length !== 5) return;
  if (cpCache[cp]) {
    aplicarDatosCP(cpCache[cp], selectedColonia);
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://api.zippopotam.us/MX/' + cp, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data && data.places) {
      const result = {
        colonias: data.places.map(p => p['place name']),
        estado: data.places[0]?.state || ''
      };
      cpCache[cp] = result;
      aplicarDatosCP(result, selectedColonia);
    }
  } catch (_) {
    document.getElementById('clienteEstado').value = '';
    document.getElementById('clienteColonia').innerHTML = '<option value="">No disponible</option>';
  }
}

function aplicarDatosCP(result, selectedColonia) {
  const sel = document.getElementById('clienteColonia');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      result.colonias.map(c => `<option value="${c}" ${c === selectedColonia ? 'selected' : ''}>${c}</option>`).join('');
    sel.disabled = false;
  }
  const estadoInput = document.getElementById('clienteEstado');
  if (estadoInput) estadoInput.value = result.estado;
}
