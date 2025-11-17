import { ESTADO_COLORS } from '../constants.js';
import { obtenerDatosFiltrados } from '../services/dataService.js';
import { applyStatusIndicatorColors, attachTextoFilter } from '../utils/table.js';
import { mostrarDetalleItem } from './modalView.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

let ordenActual = {
    columna: null,
    direccion: 'asc'
};

export function actualizarListado() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('listadoContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-table"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = crearTablaListado(datos);
    inicializarListadoEventos();
}

function crearTablaListado(datos) {
    let html = `
        <div class="listado-controls">
            <div class="search-box">
                <input type="text" id="buscarListado" placeholder="Buscar..." class="search-input">
                <i class="fas fa-search"></i>
            </div>
            <div class="orden-controls">
                <label>Ordenar por:</label>
                <select id="ordenarListado" class="filter-select">
                    <option value="">Sin orden</option>
                    <option value="Correlativo">N°</option>
                    <option value="ID">ID</option>
                    <option value="Item">Consulta</option>
                    <option value="Tematica">Temática</option>
                    <option value="Elaborador">Elaborador</option>
                    <option value="Revisor">Revisor</option>
                    <option value="Estado">Estado</option>
                    <option value="Subcontrato">Subcontrato</option>
                    <option value="FechaEntrega">Fecha Entrega</option>
                </select>
            </div>
        </div>
        <div class="table-wrapper">
            <table class="listado-table" id="tablaListado">
                <thead>
                    <tr>
                        <th data-col="Correlativo" class="sortable">N° <i class="fas fa-sort"></i></th>
                        <th data-col="ID" class="sortable">ID <i class="fas fa-sort"></i></th>
                        <th data-col="Item" class="sortable">Consulta <i class="fas fa-sort"></i></th>
                        <th data-col="Tematica" class="sortable">Temática <i class="fas fa-sort"></i></th>
                        <th data-col="Elaborador" class="sortable">Elaborador <i class="fas fa-sort"></i></th>
                        <th data-col="Revisor" class="sortable">Revisor <i class="fas fa-sort"></i></th>
                        <th data-col="Estado" class="sortable">Estado <i class="fas fa-sort"></i></th>
                        <th data-col="Subcontrato" class="sortable">Subcontrato <i class="fas fa-sort"></i></th>
                        <th data-col="FechaEntrega" class="sortable">Fecha Entrega <i class="fas fa-sort"></i></th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${renderListadoRows(datos)}
                </tbody>
            </table>
        </div>
        <div class="listado-footer">
            <span>Mostrando ${datos.length} registro(s)</span>
        </div>
    `;

    return html;
}

function renderListadoRows(datos) {
    return datos.map(item => {
        const claseEstado = item.Estado ? item.Estado.toLowerCase().replace(/\s+/g, '-') : '';
        const color = ESTADO_COLORS[item.Estado] || '#999';
        const fechaEntrega = formatearFechaParaMostrar(item.FechaEntrega, item.FechaEntrega || '');
        return `
            <tr class="clickable-row-detalle" data-id="${item.Correlativo}">
                <td>${item.Correlativo || ''}</td>
                <td>${item.ID || ''}</td>
                <td>${(item.Pregunta || item.Item || '').substring(0, 50)}${(item.Pregunta || item.Item || '').length > 50 ? '...' : ''}</td>
                <td>${item.Tematica || ''}</td>
                <td>${item.Elaborador || 'Sin asignar'}</td>
                <td>${item.Revisor || 'Sin asignar'}</td>
                <td>
                    <span class="status-indicator status-${claseEstado}" data-color="${color}"></span>
                    ${item.Estado || ''}
                </td>
                <td>${item.Subcontrato || ''}</td>
                <td>${fechaEntrega}</td>
                <td>
                    <button class="btn-icon btn-ver-detalle" data-id="${item.Correlativo}" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function inicializarListadoEventos() {
    applyStatusIndicatorColors();
    attachTextoFilter('#buscarListado', '#tablaListado tbody tr');

    const ordenarListado = document.getElementById('ordenarListado');
    if (ordenarListado) {
        ordenarListado.addEventListener('change', () => {
            if (ordenarListado.value) {
                ordenarPorColumna(ordenarListado.value);
            }
        });
    }

    document.querySelectorAll('#tablaListado .sortable').forEach(header => {
        header.addEventListener('click', () => {
            const columna = header.dataset.col;
            ordenarPorColumna(columna);
        });
    });

    document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const correlativo = parseInt(btn.dataset.id, 10);
            if (!Number.isNaN(correlativo)) {
                mostrarDetalleItem(correlativo);
            }
        });
    });

    document.querySelectorAll('.clickable-row-detalle').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.btn-icon')) return;
            const correlativo = parseInt(row.dataset.id, 10);
            if (!Number.isNaN(correlativo)) {
                mostrarDetalleItem(correlativo);
            }
        });
    });
}

function ordenarPorColumna(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'asc';
    }

    const datos = obtenerDatosFiltrados();
    const datosOrdenados = [...datos].sort((a, b) => compararValoresListado(a, b, columna));
    const tbody = document.querySelector('#tablaListado tbody');
    if (!tbody) return;

    tbody.innerHTML = renderListadoRows(datosOrdenados);
    inicializarListadoEventos();
    actualizarIconosOrden('#tablaListado', columna, ordenActual.direccion);
}

function compararValoresListado(a, b, columna) {
    let valorA;
    let valorB;

    if (columna === 'Item') {
        valorA = a.Pregunta || a.Item || '';
        valorB = b.Pregunta || b.Item || '';
    } else {
        valorA = a[columna] || '';
        valorB = b[columna] || '';
    }

    if (columna === 'Correlativo' && !isNaN(valorA) && !isNaN(valorB)) {
        valorA = parseInt(valorA, 10) || 0;
        valorB = parseInt(valorB, 10) || 0;
        const comparacion = valorA - valorB;
        return ordenActual.direccion === 'asc' ? comparacion : -comparacion;
    }

    if (columna === 'FechaEntrega' && valorA && valorB) {
        const fechaA = new Date(valorA);
        const fechaB = new Date(valorB);
        const comparacion = fechaA - fechaB;
        return ordenActual.direccion === 'asc' ? comparacion : -comparacion;
    }

    valorA = String(valorA).toLowerCase();
    valorB = String(valorB).toLowerCase();

    let comparacion = 0;
    if (valorA < valorB) comparacion = -1;
    if (valorA > valorB) comparacion = 1;

    return ordenActual.direccion === 'asc' ? comparacion : -comparacion;
}

function actualizarIconosOrden(tablaSelector, columna, direccion) {
    document.querySelectorAll(`${tablaSelector} .sortable i`).forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    const headerActual = document.querySelector(`${tablaSelector} [data-col="${columna}"]`);
    if (headerActual) {
        const icon = headerActual.querySelector('i');
        if (icon) {
            icon.className = direccion === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    }
}

