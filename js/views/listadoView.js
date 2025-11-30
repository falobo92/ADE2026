import { ESTADO_COLORS } from '../constants.js';
import { obtenerDatosFiltrados } from '../services/dataService.js';
import { applyStatusIndicatorColors, attachTextoFilter, toggleSortState, actualizarIconosOrden } from '../utils/table.js';
import { mostrarDetalleItem } from './modalView.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

// Usar colores centralizados desde constants.js
function getColor(estado) {
    return ESTADO_COLORS[estado] || '#94a3b8';
}

let ordenActual = { columna: null, direccion: 'asc' };

export function actualizarListado() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('listadoContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-table"></i>
                <p>No hay datos disponibles</p>
            </div>
        `;
        return;
    }

    container.innerHTML = renderTabla(datos);
    inicializarEventos();
}

function renderTabla(datos) {
    return `
        <div class="listado-controls">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="buscarListado" placeholder="Buscar..." class="search-input">
            </div>
            <div class="orden-controls">
                <label>Ordenar:</label>
                <select id="ordenarListado" class="filter-select">
                    <option value="">—</option>
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
                        <th data-col="FechaEntrega" class="sortable">Fecha <i class="fas fa-sort"></i></th>
                        <th style="width: 60px;"></th>
                    </tr>
                </thead>
                <tbody>${renderFilas(datos)}</tbody>
            </table>
        </div>
        <div class="listado-footer">
            <span>${datos.length} registro${datos.length !== 1 ? 's' : ''}</span>
        </div>
    `;
}

function renderFilas(datos) {
    return datos.map(item => {
        const color = getColor(item.Estado);
        const fecha = formatearFechaParaMostrar(item.FechaEntrega, '');
        const consulta = truncar(item.Pregunta || item.Item || '', 45);

        return `
            <tr class="clickable-row-detalle" data-id="${item.Correlativo}">
                <td style="font-weight: 500;">${item.Correlativo || ''}</td>
                <td style="font-family: var(--font-mono, monospace); font-size: 0.75rem;">${item.ID || ''}</td>
                <td title="${escapeHtml(item.Pregunta || item.Item || '')}">${consulta}</td>
                <td>${item.Tematica || ''}</td>
                <td>${item.Elaborador || '<span style="color: var(--text-muted);">—</span>'}</td>
                <td>${item.Revisor || '<span style="color: var(--text-muted);">—</span>'}</td>
                <td>
                    <span class="status-indicator" data-color="${color}" style="background-color: ${color}"></span>
                    ${item.Estado || ''}
                </td>
                <td>${item.Subcontrato || ''}</td>
                <td>${fecha}</td>
                <td>
                    <button class="btn-icon btn-ver-detalle" data-id="${item.Correlativo}" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function inicializarEventos() {
    applyStatusIndicatorColors();
    attachTextoFilter('#buscarListado', '#tablaListado tbody tr');

    const selectOrden = document.getElementById('ordenarListado');
    if (selectOrden) {
        selectOrden.addEventListener('change', () => {
            if (selectOrden.value) ordenarPorColumna(selectOrden.value);
        });
    }

    document.querySelectorAll('#tablaListado .sortable').forEach(th => {
        th.addEventListener('click', () => ordenarPorColumna(th.dataset.col));
    });

    document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            if (!Number.isNaN(id)) mostrarDetalleItem(id);
        });
    });

    document.querySelectorAll('.clickable-row-detalle').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.closest('.btn-icon')) return;
            const id = parseInt(row.dataset.id, 10);
            if (!Number.isNaN(id)) mostrarDetalleItem(id);
        });
    });
}

function ordenarPorColumna(columna) {
    ordenActual = toggleSortState(ordenActual, columna);

    const datos = obtenerDatosFiltrados();
    const ordenados = [...datos].sort((a, b) => comparar(a, b, columna));

    const tbody = document.querySelector('#tablaListado tbody');
    if (tbody) {
        tbody.innerHTML = renderFilas(ordenados);
        inicializarEventos();
        actualizarIconosOrden('#tablaListado', columna, ordenActual.direccion);
    }
}

function comparar(a, b, col) {
    let vA, vB;

    if (col === 'Item') {
        vA = a.Pregunta || a.Item || '';
        vB = b.Pregunta || b.Item || '';
    } else {
        vA = a[col] || '';
        vB = b[col] || '';
    }

    // Numérico
    if (col === 'Correlativo' && !isNaN(vA) && !isNaN(vB)) {
        const cmp = (parseInt(vA, 10) || 0) - (parseInt(vB, 10) || 0);
        return ordenActual.direccion === 'asc' ? cmp : -cmp;
    }

    // Fecha
    if (col === 'FechaEntrega' && vA && vB) {
        const cmp = new Date(vA) - new Date(vB);
        return ordenActual.direccion === 'asc' ? cmp : -cmp;
    }

    // Texto
    vA = String(vA).toLowerCase();
    vB = String(vB).toLowerCase();
    let cmp = 0;
    if (vA < vB) cmp = -1;
    if (vA > vB) cmp = 1;
    return ordenActual.direccion === 'asc' ? cmp : -cmp;
}

function truncar(texto, max) {
    if (!texto) return '';
    return texto.length > max ? texto.substring(0, max) + '...' : texto;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
