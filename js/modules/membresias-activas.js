let state = { data: [], page: 0, totalPages: 0, size: 15 };

export function init() {
  document.getElementById('searchMembresiaActiva')?.addEventListener('input', Utils.debounce(() => cargar(0), 350));
  document.getElementById('tableMembresiasActivasBody')?.addEventListener('click', manejarClick);
  ['filtroTipoMembresiaActiva', 'filtroInicioDesde', 'filtroFinHasta']
    .forEach(id => document.getElementById(id)?.addEventListener('change', () => cargar(0)));
  document.getElementById('btnLimpiarFiltrosMembresias')?.addEventListener('click', limpiarFiltros);
  cargarTipos();
  cargar(0);
}

async function cargarTipos() {
  try {
    const tipos = await API.get('/membresias/activas');
    const select = document.getElementById('filtroTipoMembresiaActiva');
    if (!select) return;
    select.innerHTML = '<option value="">Todos los tipos</option>' + (tipos || []).map(m =>
      '<option value="' + Utils.esc(m.nombre) + '">' + Utils.esc(m.nombre) + '</option>'
    ).join('');
  } catch (_) {}
}

function valorFiltro(id) {
  return document.getElementById(id)?.value || '';
}

async function cargar(page) {
  state.page = page;
  const search = document.getElementById('searchMembresiaActiva')?.value || '';
  try {
    const params = new URLSearchParams({ search, page: String(page), size: String(state.size) });
    const filtros = {
      tipo: valorFiltro('filtroTipoMembresiaActiva'),
      inicioDesde: valorFiltro('filtroInicioDesde'),
      finHasta: valorFiltro('filtroFinHasta'),
    };
    Object.entries(filtros).forEach(([key, value]) => { if (value) params.set(key, value); });
    const result = await API.get('/clientes/membresias-activas?' + params.toString());
    state.data = result.content || [];
    state.totalPages = result.totalPages || 0;
    render();
    renderPagination();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function limpiarFiltros() {
  ['searchMembresiaActiva', 'filtroTipoMembresiaActiva', 'filtroInicioDesde', 'filtroFinHasta']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  cargar(0);
}

function diasRestantes(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fecha + 'T00:00:00');
  return Math.max(1, Math.ceil((fin - hoy) / 86400000));
}

function fotoUrl(c) {
  return c.fotoUrl ? API.mediaBaseUrl + c.fotoUrl : '';
}

function render() {
  const body = document.getElementById('tableMembresiasActivasBody');
  if (!body) return;
  if (!state.data.length) {
    body.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-id-card"></i><p>No hay membresías activas</p></div></td></tr>';
    return;
  }
  body.innerHTML = state.data.map(c => {
    const dias = diasRestantes(c.fechaFinMembresia);
    const foto = fotoUrl(c);
    const avatar = foto
      ? '<img src="' + Utils.esc(foto) + '" class="rounded-circle" style="width:34px;height:34px;object-fit:cover" alt="">'
      : '<span class="rounded-circle d-inline-flex align-items-center justify-content-center bg-light text-primary" style="width:34px;height:34px"><i class="fas fa-user"></i></span>';
    return '<tr>' +
      '<td><div class="d-flex align-items-center gap-2">' + avatar + '<span>' + Utils.esc(c.nombre + ' ' + (c.apellidoPaterno || '') + ' ' + (c.apellidoMaterno || '')) + '</span></div></td>' +
      '<td>' + Utils.esc(c.employeeNo || '-') + '</td>' +
      '<td>' + Utils.esc(c.tipoMembresia || '-') + '</td>' +
      '<td>' + Utils.formatDate(c.fechaInicioMembresia) + '</td>' +
      '<td>' + Utils.formatDate(c.fechaFinMembresia) + '</td>' +
      '<td><span class="badge ' + (dias <= 7 ? 'bg-warning text-dark' : 'bg-success') + '">' + dias + '</span></td>' +
      '<td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + c.idCliente + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>' +
      '</tr>';
  }).join('');
}

function manejarClick(e) {
  const btn = e.target.closest('.kebab-trigger');
  if (!btn) return;
  const cliente = state.data.find(c => String(c.idCliente) === String(btn.dataset.id));
  if (!cliente) return;
  Utils.abrirMenuKebab(btn, [
    { icon: 'fa-eye', text: 'Ver cliente', color: 'var(--info)', onClick: () => verCliente(cliente.idCliente) },
    { icon: 'fa-cash-register', text: 'Renovar membresía', color: 'var(--success)', onClick: () => renovarEnPOS(cliente) },
  ]);
}

function renovarEnPOS(cliente) {
  localStorage.setItem('membresiaParaPOS', JSON.stringify({
    idCliente: cliente.idCliente,
    nombre: (cliente.nombre || '') + ' ' + (cliente.apellidoPaterno || ''),
    tipoMembresia: cliente.tipoMembresia || null,
    fechaFinMembresia: cliente.fechaFinMembresia || null,
    membresiaActiva: true,
    accion: 'renovar',
  }));
  document.querySelector('[data-view="pages/ventas.html"]')?.click();
}

function verCliente(id) {
  localStorage.setItem('clienteDetallePendiente', String(id));
  document.querySelector('[data-view="pages/clientes.html"]')?.click();
}

function renderPagination() {
  const container = document.getElementById('paginationMembresiasActivas');
  if (!container || state.totalPages <= 1) { if (container) container.innerHTML = ''; return; }
  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += '<li class="page-item ' + (state.page === 0 ? 'disabled' : '') + '"><a class="page-link" href="#" data-page="' + (state.page - 1) + '"><i class="fas fa-chevron-left"></i></a></li>';
  for (let i = 0; i < state.totalPages; i++) {
    html += '<li class="page-item ' + (i === state.page ? 'active' : '') + '"><a class="page-link" href="#" data-page="' + i + '">' + (i + 1) + '</a></li>';
  }
  html += '<li class="page-item ' + (state.page === state.totalPages - 1 ? 'disabled' : '') + '"><a class="page-link" href="#" data-page="' + (state.page + 1) + '"><i class="fas fa-chevron-right"></i></a></li></ul></nav>';
  container.innerHTML = html;
  container.querySelectorAll('[data-page]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const page = parseInt(a.dataset.page);
    if (page >= 0 && page < state.totalPages) cargar(page);
  }));
}
