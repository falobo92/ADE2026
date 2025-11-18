import { obtenerDatosFiltrados } from '../services/dataService.js';
import { attachTextoFilter, toggleSortState, actualizarIconosOrden } from '../utils/table.js';
import { mostrarDetalleItem } from './modalView.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

let ordenActualAtrasos = {
    columna: null,
    direccion: 'asc'
};

export function actualizarAtrasos() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('atrasosContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const atrasos = datos
        .filter(d => {
            if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            return fechaEntrega < hoy;
        })
        .map(d => {
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            const diffTime = hoy - fechaEntrega;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return {
                ...d,
                diasAtraso: diffDays
            };
        })
        .sort((a, b) => b.diasAtraso - a.diasAtraso);

    if (atrasos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle success-icon"></i>
                <p>¡Excelente! No hay atrasos registrados</p>
            </div>
        `;
        return;
    }

    const personasOrdenadas = obtenerAtrasosPorPersona(atrasos);
    const diasPromedio = Math.round(atrasos.reduce((sum, a) => sum + a.diasAtraso, 0) / atrasos.length);

    container.innerHTML = `
        <div class="atrasos-section">
            <h3 class="section-subtitle">Resumen de Atrasos</h3>
            <div class="kpi-cards kpi-cards-compact">
                <div class="kpi-card red">
                    <div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="kpi-title">Total Atrasos</div>
                    <div class="kpi-value">${atrasos.length}</div>
                    <div class="kpi-subtitle">Preguntas con fecha vencida</div>
                </div>
                <div class="kpi-card orange">
                    <div class="kpi-icon"><i class="fas fa-users"></i></div>
                    <div class="kpi-title">Personas Afectadas</div>
                    <div class="kpi-value">${personasOrdenadas.length}</div>
                    <div class="kpi-subtitle">Elaboradores con atrasos</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon"><i class="fas fa-calendar"></i></div>
                    <div class="kpi-title">Días Promedio</div>
                    <div class="kpi-value">${diasPromedio}</div>
                    <div class="kpi-subtitle">Días de atraso promedio</div>
                </div>
            </div>
        </div>

        <h3 class="section-subtitle">Atrasos por Persona</h3>
        <table class="atrasos-table">
            <thead>
                <tr>
                    <th>Persona</th>
                    <th>Cantidad</th>
                    <th>Días Promedio</th>
                </tr>
            </thead>
            <tbody>
                ${personasOrdenadas.map(persona => `
                    <tr>
                        <td><strong>${persona.persona}</strong></td>
                        <td>${persona.cantidad}</td>
                        <td><span class="dias-atraso">${persona.promedioDias} días</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h3 class="section-subtitle">Detalle de Atrasos</h3>
        <div class="listado-controls">
            <div class="search-box">
                <input type="text" id="buscarAtrasos" placeholder="Buscar..." class="search-input">
                <i class="fas fa-search"></i>
            </div>
            <div class="orden-controls">
                <label>Ordenar por:</label>
                <select id="ordenarAtrasos" class="filter-select">
                    <option value="">Sin orden</option>
                    <option value="Correlativo">N°</option>
                    <option value="ID">ID</option>
                    <option value="Item">Consulta</option>
                    <option value="Tematica">Temática</option>
                    <option value="Elaborador">Elaborador</option>
                    <option value="Revisor">Revisor</option>
                    <option value="Subcontrato">Subcontrato</option>
                    <option value="FechaEntrega">Fecha Entrega</option>
                    <option value="diasAtraso">Días Atraso</option>
                </select>
            </div>
        </div>
        <div class="table-wrapper">
            <table class="listado-table" id="tablaAtrasos">
                <thead>
                    <tr>
                        <th data-col="Correlativo" class="sortable">N° <i class="fas fa-sort"></i></th>
                        <th data-col="ID" class="sortable">ID <i class="fas fa-sort"></i></th>
                        <th data-col="Item" class="sortable">Consulta <i class="fas fa-sort"></i></th>
                        <th data-col="Tematica" class="sortable">Temática <i class="fas fa-sort"></i></th>
                        <th data-col="Elaborador" class="sortable">Elaborador <i class="fas fa-sort"></i></th>
                        <th data-col="Revisor" class="sortable">Revisor <i class="fas fa-sort"></i></th>
                        <th data-col="Subcontrato" class="sortable">Subcontrato <i class="fas fa-sort"></i></th>
                        <th data-col="FechaEntrega" class="sortable">Fecha Entrega <i class="fas fa-sort"></i></th>
                        <th data-col="diasAtraso" class="sortable">Días Atraso <i class="fas fa-sort"></i></th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderAtrasosRows(atrasos)}
                </tbody>
            </table>
        </div>
        <div class="listado-footer">
            <span>Mostrando ${atrasos.length} registro(s)</span>
        </div>
    `;

    inicializarTablaAtrasos(atrasos);
}

function obtenerAtrasosPorPersona(atrasos) {
    const porPersona = {};
    atrasos.forEach(item => {
        const persona = item.Elaborador || 'Sin asignar';
        if (!porPersona[persona]) {
            porPersona[persona] = {
                persona,
                cantidad: 0,
                totalDias: 0,
                items: []
            };
        }
        porPersona[persona].cantidad += 1;
        porPersona[persona].totalDias += item.diasAtraso;
        porPersona[persona].items.push(item);
    });

    Object.keys(porPersona).forEach(persona => {
        porPersona[persona].promedioDias = Math.round(porPersona[persona].totalDias / porPersona[persona].cantidad);
    });

    return Object.values(porPersona).sort((a, b) => b.cantidad - a.cantidad);
}

function renderAtrasosRows(atrasos) {
    return atrasos.map(item => {
        const badgeClass = item.diasAtraso > 30 ? 'badge-danger' :
            item.diasAtraso > 14 ? 'badge-warning' : 'badge-success';
        const fechaEntrega = formatearFechaParaMostrar(item.FechaEntrega, item.FechaEntrega || '');

        return `
            <tr class="clickable-row-detalle" data-id="${item.Correlativo}">
                <td>${item.Correlativo || ''}</td>
                <td>${item.ID || ''}</td>
                <td>${(item.Pregunta || item.Item || '').substring(0, 50)}${(item.Pregunta || item.Item || '').length > 50 ? '...' : ''}</td>
                <td>${item.Tematica || ''}</td>
                <td>${item.Elaborador || 'Sin asignar'}</td>
                <td>${item.Revisor || 'Sin asignar'}</td>
                <td>${item.Subcontrato || ''}</td>
                <td>${fechaEntrega}</td>
                <td><span class="dias-atraso ${badgeClass}">${item.diasAtraso} días</span></td>
                <td>
                    <button class="btn-icon btn-ver-detalle" data-id="${item.Correlativo}" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function inicializarTablaAtrasos(atrasos) {
    attachTextoFilter('#buscarAtrasos', '#tablaAtrasos tbody tr');

    const ordenarAtrasos = document.getElementById('ordenarAtrasos');
    if (ordenarAtrasos) {
        ordenarAtrasos.addEventListener('change', () => {
            if (ordenarAtrasos.value) {
                ordenarPorColumnaAtrasos(ordenarAtrasos.value, atrasos);
            }
        });
    }

    document.querySelectorAll('#tablaAtrasos .sortable').forEach(header => {
        header.addEventListener('click', () => {
            const columna = header.dataset.col;
            ordenarPorColumnaAtrasos(columna, atrasos);
        });
    });

    document.querySelectorAll('#tablaAtrasos .btn-ver-detalle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const correlativo = parseInt(btn.dataset.id, 10);
            if (!Number.isNaN(correlativo)) {
                mostrarDetalleItem(correlativo);
            }
        });
    });

    document.querySelectorAll('#tablaAtrasos .clickable-row-detalle').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.btn-icon')) return;
            const correlativo = parseInt(row.dataset.id, 10);
            if (!Number.isNaN(correlativo)) {
                mostrarDetalleItem(correlativo);
            }
        });
    });
}

function ordenarPorColumnaAtrasos(columna, datosAtrasos) {
    ordenActualAtrasos = toggleSortState(ordenActualAtrasos, columna);

    const datosOrdenados = [...datosAtrasos].sort((a, b) => compararValoresAtrasos(a, b, columna));
    const tbody = document.querySelector('#tablaAtrasos tbody');
    if (!tbody) return;

    tbody.innerHTML = renderAtrasosRows(datosOrdenados);
    inicializarTablaAtrasos(datosOrdenados);
    actualizarIconosOrden('#tablaAtrasos', columna, ordenActualAtrasos.direccion);
}

function compararValoresAtrasos(a, b, columna) {
    let valorA;
    let valorB;

    if (columna === 'Item') {
        valorA = a.Pregunta || a.Item || '';
        valorB = b.Pregunta || b.Item || '';
    } else if (columna === 'diasAtraso') {
        valorA = a.diasAtraso || 0;
        valorB = b.diasAtraso || 0;
        const comparacion = valorA - valorB;
        return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
    } else {
        valorA = a[columna] || '';
        valorB = b[columna] || '';
    }

    if (columna === 'Correlativo' && !isNaN(valorA) && !isNaN(valorB)) {
        valorA = parseInt(valorA, 10) || 0;
        valorB = parseInt(valorB, 10) || 0;
        const comparacion = valorA - valorB;
        return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
    }

    if (columna === 'FechaEntrega' && valorA && valorB) {
        const fechaA = new Date(valorA);
        const fechaB = new Date(valorB);
        const comparacion = fechaA - fechaB;
        return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
    }

    valorA = String(valorA).toLowerCase();
    valorB = String(valorB).toLowerCase();

    let comparacion = 0;
    if (valorA < valorB) comparacion = -1;
    if (valorA > valorB) comparacion = 1;

    return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
}

