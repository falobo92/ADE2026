import { obtenerDatosFiltrados } from '../services/dataService.js';
import { attachTextoFilter, toggleSortState, actualizarIconosOrden } from '../utils/table.js';
import { mostrarDetalleItem, mostrarVistaItems } from './modalView.js';
import { formatearFechaParaMostrar, parseFechaFlexible } from '../utils/date.js';

let ordenActual = { columna: 'diasAtraso', direccion: 'desc' };

export function actualizarAtrasos() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('atrasosContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = renderEmpty('No hay datos disponibles');
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Calcular atrasos (solo "En elaboración" con fecha vencida)
    // NO incluye "Con observaciones" - esos están en proceso de corrección
    const atrasos = datos
        .filter(d => {
            if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
            const fecha = parseFechaFlexible(d.FechaEntrega);
            if (!fecha) return false;
            fecha.setHours(0, 0, 0, 0);
            return fecha < hoy;
        })
        .map(d => {
            const fecha = parseFechaFlexible(d.FechaEntrega);
            fecha.setHours(0, 0, 0, 0);
            const dias = Math.ceil((hoy - fecha) / (1000 * 60 * 60 * 24));
            return { ...d, diasAtraso: dias };
        })
        .sort((a, b) => b.diasAtraso - a.diasAtraso);

    // Calcular "Con observaciones" (seguimiento especial, NO son atrasos)
    const conObservaciones = datos.filter(d => d.Estado === 'Con observaciones');

    // Calcular próximos a vencer (7 días)
    const porVencer = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado === 'Incorporada' || d.Estado === 'En editorial') return false;
        const fecha = parseFechaFlexible(d.FechaEntrega);
        if (!fecha) return false;
        fecha.setHours(0, 0, 0, 0);
        const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
    }).map(d => {
        const fecha = parseFechaFlexible(d.FechaEntrega);
        fecha.setHours(0, 0, 0, 0);
        const dias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
        return { ...d, diasRestantes: dias };
    }).sort((a, b) => a.diasRestantes - b.diasRestantes);

    // Agrupar por categorías de severidad
    const criticos = atrasos.filter(a => a.diasAtraso > 14);
    const moderados = atrasos.filter(a => a.diasAtraso > 7 && a.diasAtraso <= 14);
    const leves = atrasos.filter(a => a.diasAtraso <= 7);

    // Agrupar por persona y subcontrato
    const porPersona = agruparPorPersona(atrasos);
    const porSubcontrato = agruparPorSubcontrato(atrasos);

    // Estadísticas
    const diasPromedio = atrasos.length > 0 
        ? Math.round(atrasos.reduce((s, a) => s + a.diasAtraso, 0) / atrasos.length) 
        : 0;
    const diasMax = atrasos.length > 0 ? Math.max(...atrasos.map(a => a.diasAtraso)) : 0;

    container.innerHTML = `
        <!-- Resumen Ejecutivo Atrasos -->
        <section class="atrasos-summary">
            <div class="atrasos-summary-header">
                <div class="summary-title-section">
                    <h2><i class="fas fa-exclamation-triangle"></i> Control de Atrasos</h2>
                    <span class="summary-subtitle">Seguimiento de compromisos vencidos</span>
                </div>
                <div class="summary-actions">
                    <button class="btn-icon-action" id="btnCopiarAtrasos" title="Copiar resumen">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            
            ${atrasos.length === 0 ? `
                <div class="atrasos-success-banner">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <strong>¡Sin atrasos!</strong>
                        <span>Todos los compromisos están al día</span>
                    </div>
                </div>
            ` : `
                <div class="atrasos-alert-banner ${criticos.length > 0 ? 'critical' : 'warning'}">
                    <i class="fas fa-${criticos.length > 0 ? 'fire' : 'clock'}"></i>
                    <div>
                        <strong>${atrasos.length} compromiso${atrasos.length !== 1 ? 's' : ''} con atraso</strong>
                        <span>${criticos.length > 0 ? `${criticos.length} críticos (>14 días)` : 'Requieren atención'}</span>
                    </div>
                </div>
            `}
        </section>

        <!-- KPIs -->
        <section class="atrasos-kpis">
            <div class="kpi-grid-atrasos">
                <div class="kpi-card-atrasos ${atrasos.length > 0 ? 'danger' : 'success'}">
                    <div class="kpi-icon"><i class="fas fa-${atrasos.length > 0 ? 'clock' : 'check'}"></i></div>
                    <div class="kpi-content">
                        <span class="kpi-value">${atrasos.length}</span>
                        <span class="kpi-label">Atrasos</span>
                    </div>
                </div>
                <div class="kpi-card-atrasos ${criticos.length > 0 ? 'critical' : 'neutral'}">
                    <div class="kpi-icon"><i class="fas fa-fire"></i></div>
                    <div class="kpi-content">
                        <span class="kpi-value">${criticos.length}</span>
                        <span class="kpi-label">Críticos</span>
                    </div>
                    <span class="kpi-badge-info">>14 días</span>
                </div>
                <div class="kpi-card-atrasos ${porVencer.length > 0 ? 'warning' : 'neutral'}">
                    <div class="kpi-icon"><i class="fas fa-hourglass-half"></i></div>
                    <div class="kpi-content">
                        <span class="kpi-value">${porVencer.length}</span>
                        <span class="kpi-label">Por Vencer</span>
                    </div>
                    <span class="kpi-badge-info">7 días</span>
                </div>
                <div class="kpi-card-atrasos ${conObservaciones.length > 0 ? 'info' : 'neutral'}">
                    <div class="kpi-icon"><i class="fas fa-comment-dots"></i></div>
                    <div class="kpi-content">
                        <span class="kpi-value">${conObservaciones.length}</span>
                        <span class="kpi-label">Con Obs.</span>
                    </div>
                </div>
                <div class="kpi-card-atrasos neutral">
                    <div class="kpi-icon"><i class="fas fa-calendar-day"></i></div>
                    <div class="kpi-content">
                        <span class="kpi-value">${diasPromedio}</span>
                        <span class="kpi-label">Días Prom.</span>
                    </div>
                </div>
                <div class="kpi-card-atrasos ${diasMax > 30 ? 'danger' : 'neutral'}">
                    <div class="kpi-icon"><i class="fas fa-arrow-up"></i></div>
                    <div class="kpi-content">
                        <span class="kpi-value">${diasMax}</span>
                        <span class="kpi-label">Máx. Días</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Distribución por Severidad -->
        ${atrasos.length > 0 ? `
        <section class="atrasos-distribucion">
            <div class="distribucion-grid">
                <div class="distribucion-card" data-tipo="criticos">
                    <div class="distribucion-header critical">
                        <i class="fas fa-fire"></i>
                        <span>Críticos (>14 días)</span>
                    </div>
                    <div class="distribucion-value">${criticos.length}</div>
                    <div class="distribucion-bar">
                        <div class="bar-fill critical" style="width: ${atrasos.length > 0 ? (criticos.length / atrasos.length) * 100 : 0}%"></div>
                    </div>
                </div>
                <div class="distribucion-card" data-tipo="moderados">
                    <div class="distribucion-header warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Moderados (8-14 días)</span>
                    </div>
                    <div class="distribucion-value">${moderados.length}</div>
                    <div class="distribucion-bar">
                        <div class="bar-fill warning" style="width: ${atrasos.length > 0 ? (moderados.length / atrasos.length) * 100 : 0}%"></div>
                    </div>
                </div>
                <div class="distribucion-card" data-tipo="leves">
                    <div class="distribucion-header info">
                        <i class="fas fa-clock"></i>
                        <span>Leves (1-7 días)</span>
                    </div>
                    <div class="distribucion-value">${leves.length}</div>
                    <div class="distribucion-bar">
                        <div class="bar-fill info" style="width: ${atrasos.length > 0 ? (leves.length / atrasos.length) * 100 : 0}%"></div>
                    </div>
                </div>
            </div>
        </section>
        ` : ''}

        <!-- Grid de Análisis -->
        <section class="atrasos-analysis">
            <div class="analysis-grid">
                <!-- Por Persona -->
                <div class="analysis-card">
                    <div class="analysis-header">
                        <h3><i class="fas fa-users"></i> Por Responsable</h3>
                        <span class="analysis-count">${porPersona.length} personas</span>
                    </div>
                    <div class="analysis-body">
                        ${porPersona.length > 0 ? `
                            <div class="persona-list">
                                ${porPersona.slice(0, 8).map(p => `
                                    <div class="persona-row" data-persona="${escapeHtml(p.persona)}">
                                        <div class="persona-info">
                                            <span class="persona-name">${p.persona}</span>
                                            <span class="persona-detail">${p.promedio} días prom.</span>
                                        </div>
                                        <div class="persona-stats">
                                            <span class="persona-count ${p.cantidad > 3 ? 'danger' : ''}">${p.cantidad}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted text-center">Sin datos</p>'}
                    </div>
                </div>

                <!-- Por Subcontrato -->
                <div class="analysis-card">
                    <div class="analysis-header">
                        <h3><i class="fas fa-building"></i> Por Subcontrato</h3>
                        <span class="analysis-count">${porSubcontrato.length} subcontratos</span>
                    </div>
                    <div class="analysis-body">
                        ${porSubcontrato.length > 0 ? `
                            <div class="subcontrato-list">
                                ${porSubcontrato.slice(0, 8).map(s => `
                                    <div class="subcontrato-row" data-subcontrato="${escapeHtml(s.subcontrato)}">
                                        <div class="subcontrato-info">
                                            <span class="subcontrato-name">${s.subcontrato}</span>
                                            <span class="subcontrato-detail">${s.promedio} días prom.</span>
                                        </div>
                                        <div class="subcontrato-stats">
                                            <span class="subcontrato-count ${s.cantidad > 5 ? 'danger' : ''}">${s.cantidad}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted text-center">Sin datos</p>'}
                    </div>
                </div>

                <!-- Próximos a Vencer -->
                <div class="analysis-card warning-card">
                    <div class="analysis-header">
                        <h3><i class="fas fa-hourglass-half"></i> Próximos a Vencer</h3>
                        <span class="analysis-count">${porVencer.length} items</span>
                    </div>
                    <div class="analysis-body">
                        ${porVencer.length > 0 ? `
                            <div class="vencer-list">
                                ${porVencer.slice(0, 6).map(v => `
                                    <div class="vencer-row clickable-item" data-id="${v.Correlativo}">
                                        <div class="vencer-info">
                                            <span class="vencer-id">${v.ID || v.Correlativo}</span>
                                            <span class="vencer-text">${truncar(v.Pregunta || v.Item || '', 30)}</span>
                                        </div>
                                        <span class="vencer-dias ${v.diasRestantes === 0 ? 'today' : v.diasRestantes <= 2 ? 'urgent' : ''}">
                                            ${v.diasRestantes === 0 ? 'HOY' : `${v.diasRestantes}d`}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                            ${porVencer.length > 6 ? `
                                <button class="btn-ver-todos" id="btnVerPorVencer">
                                    Ver todos (${porVencer.length})
                                </button>
                            ` : ''}
                        ` : `
                            <div class="empty-mini">
                                <i class="fas fa-check-circle"></i>
                                <span>Sin vencimientos próximos</span>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Con Observaciones -->
                <div class="analysis-card info-card">
                    <div class="analysis-header">
                        <h3><i class="fas fa-comment-dots"></i> Con Observaciones</h3>
                        <span class="analysis-count">${conObservaciones.length} items</span>
                    </div>
                    <div class="analysis-body">
                        ${conObservaciones.length > 0 ? `
                            <div class="observaciones-list">
                                ${conObservaciones.slice(0, 6).map(o => `
                                    <div class="observacion-row clickable-item" data-id="${o.Correlativo}">
                                        <div class="observacion-info">
                                            <span class="observacion-id">${o.ID || o.Correlativo}</span>
                                            <span class="observacion-text">${truncar(o.Pregunta || o.Item || '', 30)}</span>
                                        </div>
                                        <span class="observacion-elaborador">${o.Elaborador || '—'}</span>
                                    </div>
                                `).join('')}
                            </div>
                            ${conObservaciones.length > 6 ? `
                                <button class="btn-ver-todos" id="btnVerObservaciones">
                                    Ver todos (${conObservaciones.length})
                                </button>
                            ` : ''}
                        ` : `
                            <div class="empty-mini">
                                <i class="fas fa-check-circle"></i>
                                <span>Sin observaciones pendientes</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </section>

        <!-- Tabla de Detalle -->
        ${atrasos.length > 0 ? `
        <section class="atrasos-detalle">
            <div class="detalle-header">
                <h3><i class="fas fa-list"></i> Detalle de Atrasos</h3>
                <div class="detalle-controls">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="buscarAtrasos" placeholder="Buscar..." class="search-input">
                    </div>
                </div>
            </div>
            <div class="table-wrapper">
                <table class="atrasos-table-modern" id="tablaAtrasos">
                    <thead>
                        <tr>
                            <th data-col="ID" class="sortable">ID <i class="fas fa-sort"></i></th>
                            <th data-col="Item" class="sortable">Consulta <i class="fas fa-sort"></i></th>
                            <th data-col="Elaborador" class="sortable">Elaborador <i class="fas fa-sort"></i></th>
                            <th data-col="Subcontrato" class="sortable">Subcontrato <i class="fas fa-sort"></i></th>
                            <th data-col="FechaEntrega" class="sortable">Fecha <i class="fas fa-sort"></i></th>
                            <th data-col="diasAtraso" class="sortable">Atraso <i class="fas fa-sort"></i></th>
                            <th style="width: 50px;"></th>
                        </tr>
                    </thead>
                    <tbody>${renderFilas(atrasos)}</tbody>
                </table>
            </div>
            <div class="detalle-footer">
                <span>${atrasos.length} registro${atrasos.length !== 1 ? 's' : ''} con atraso</span>
            </div>
        </section>
        ` : ''}
    `;

    inicializarEventos(atrasos, conObservaciones, criticos, moderados, leves, porVencer);
}

function renderEmpty(mensaje) {
    return `
        <div class="empty-state">
            <i class="fas fa-clock"></i>
            <p>${mensaje}</p>
        </div>
    `;
}

function agruparPorPersona(atrasos) {
    const mapa = {};
    atrasos.forEach(item => {
        const persona = item.Elaborador || 'Sin asignar';
        if (!mapa[persona]) {
            mapa[persona] = { persona, cantidad: 0, totalDias: 0 };
        }
        mapa[persona].cantidad++;
        mapa[persona].totalDias += item.diasAtraso;
    });

    return Object.values(mapa)
        .map(p => ({ ...p, promedio: Math.round(p.totalDias / p.cantidad) }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

function agruparPorSubcontrato(atrasos) {
    const mapa = {};
    atrasos.forEach(item => {
        const subcontrato = item.Subcontrato || 'Sin subcontrato';
        if (!mapa[subcontrato]) {
            mapa[subcontrato] = { subcontrato, cantidad: 0, totalDias: 0 };
        }
        mapa[subcontrato].cantidad++;
        mapa[subcontrato].totalDias += item.diasAtraso;
    });

    return Object.values(mapa)
        .map(s => ({ ...s, promedio: Math.round(s.totalDias / s.cantidad) }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

function renderFilas(atrasos) {
    return atrasos.map(item => {
        const severidad = item.diasAtraso > 14 ? 'critical' :
                          item.diasAtraso > 7 ? 'warning' : 'info';
        const fecha = formatearFechaParaMostrar(item.FechaEntrega, '');
        const consulta = truncar(item.Pregunta || item.Item || '', 50);

        return `
            <tr class="clickable-row-detalle ${severidad}" data-id="${item.Correlativo}">
                <td class="col-id">${item.ID || item.Correlativo || ''}</td>
                <td class="col-consulta" title="${escapeHtml(item.Pregunta || item.Item || '')}">${consulta}</td>
                <td class="col-persona">${item.Elaborador || '<span class="text-muted">—</span>'}</td>
                <td class="col-subcontrato">${item.Subcontrato || ''}</td>
                <td class="col-fecha">${fecha}</td>
                <td class="col-atraso">
                    <span class="dias-badge ${severidad}">${item.diasAtraso}d</span>
                </td>
                <td class="col-action">
                    <button class="btn-mini btn-ver-detalle" data-id="${item.Correlativo}" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function inicializarEventos(atrasos, conObservaciones, criticos, moderados, leves, porVencer) {
    // Búsqueda
    attachTextoFilter('#buscarAtrasos', '#tablaAtrasos tbody tr');

    // Ordenamiento en headers
    document.querySelectorAll('#tablaAtrasos .sortable').forEach(th => {
        th.addEventListener('click', () => ordenarPorColumna(th.dataset.col, atrasos));
    });

    // Click en filas de tabla
    document.querySelectorAll('#tablaAtrasos .clickable-row-detalle').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.closest('.btn-mini')) return;
            const id = parseInt(row.dataset.id, 10);
            if (!Number.isNaN(id)) mostrarDetalleItem(id);
        });
    });

    // Botones ver detalle
    document.querySelectorAll('#tablaAtrasos .btn-ver-detalle').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id, 10);
            if (!Number.isNaN(id)) mostrarDetalleItem(id);
        });
    });

    // Click en cards de distribución
    document.querySelectorAll('.distribucion-card').forEach(card => {
        card.addEventListener('click', () => {
            const tipo = card.dataset.tipo;
            let items = [];
            let titulo = '';
            if (tipo === 'criticos') { items = criticos; titulo = 'Atrasos Críticos (>14 días)'; }
            if (tipo === 'moderados') { items = moderados; titulo = 'Atrasos Moderados (8-14 días)'; }
            if (tipo === 'leves') { items = leves; titulo = 'Atrasos Leves (1-7 días)'; }
            if (items.length > 0) mostrarVistaItems(titulo, items);
        });
    });

    // Click en filas de persona
    document.querySelectorAll('.persona-row').forEach(row => {
        row.addEventListener('click', () => {
            const persona = row.dataset.persona;
            const items = atrasos.filter(a => (a.Elaborador || 'Sin asignar') === persona);
            mostrarVistaItems(`Atrasos de ${persona}`, items);
        });
    });

    // Click en filas de subcontrato
    document.querySelectorAll('.subcontrato-row').forEach(row => {
        row.addEventListener('click', () => {
            const subcontrato = row.dataset.subcontrato;
            const items = atrasos.filter(a => (a.Subcontrato || 'Sin subcontrato') === subcontrato);
            mostrarVistaItems(`Atrasos de ${subcontrato}`, items);
        });
    });

    // Click en items individuales
    document.querySelectorAll('.clickable-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id, 10);
            if (!Number.isNaN(id)) mostrarDetalleItem(id);
        });
    });

    // Botón ver todas las observaciones
    const btnVerObs = document.getElementById('btnVerObservaciones');
    if (btnVerObs) {
        btnVerObs.addEventListener('click', () => {
            mostrarVistaItems('Con Observaciones', conObservaciones);
        });
    }

    // Botón ver todos por vencer
    const btnVerVencer = document.getElementById('btnVerPorVencer');
    if (btnVerVencer) {
        btnVerVencer.addEventListener('click', () => {
            mostrarVistaItems('Próximos a Vencer (7 días)', porVencer);
        });
    }

    // Botón copiar resumen
    const btnCopiar = document.getElementById('btnCopiarAtrasos');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', () => copiarResumenAtrasos(atrasos, conObservaciones, porVencer));
    }
}

function ordenarPorColumna(columna, datosAtrasos) {
    ordenActual = toggleSortState(ordenActual, columna);

    const ordenados = [...datosAtrasos].sort((a, b) => comparar(a, b, columna));
    const tbody = document.querySelector('#tablaAtrasos tbody');
    if (tbody) {
        tbody.innerHTML = renderFilas(ordenados);
        
        // Re-conectar eventos de la tabla
        document.querySelectorAll('#tablaAtrasos .clickable-row-detalle').forEach(row => {
            row.addEventListener('click', e => {
                if (e.target.closest('.btn-mini')) return;
                const id = parseInt(row.dataset.id, 10);
                if (!Number.isNaN(id)) mostrarDetalleItem(id);
            });
        });

        document.querySelectorAll('#tablaAtrasos .btn-ver-detalle').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id, 10);
                if (!Number.isNaN(id)) mostrarDetalleItem(id);
            });
        });

        actualizarIconosOrden('#tablaAtrasos', columna, ordenActual.direccion);
    }
}

function comparar(a, b, col) {
    let vA, vB;

    if (col === 'Item') {
        vA = a.Pregunta || a.Item || '';
        vB = b.Pregunta || b.Item || '';
    } else if (col === 'diasAtraso') {
        const cmp = (a.diasAtraso || 0) - (b.diasAtraso || 0);
        return ordenActual.direccion === 'asc' ? cmp : -cmp;
    } else {
        vA = a[col] || '';
        vB = b[col] || '';
    }

    if (col === 'ID') {
        vA = a.ID || a.Correlativo || '';
        vB = b.ID || b.Correlativo || '';
    }

    if (col === 'FechaEntrega' && vA && vB) {
        const cmp = new Date(vA) - new Date(vB);
        return ordenActual.direccion === 'asc' ? cmp : -cmp;
    }

    vA = String(vA).toLowerCase();
    vB = String(vB).toLowerCase();
    let cmp = 0;
    if (vA < vB) cmp = -1;
    if (vA > vB) cmp = 1;
    return ordenActual.direccion === 'asc' ? cmp : -cmp;
}

function copiarResumenAtrasos(atrasos, conObservaciones, porVencer) {
    const criticos = atrasos.filter(a => a.diasAtraso > 14).length;
    const diasPromedio = atrasos.length > 0 
        ? Math.round(atrasos.reduce((s, a) => s + a.diasAtraso, 0) / atrasos.length) 
        : 0;

    const texto = `
⚠️ REPORTE DE ATRASOS
━━━━━━━━━━━━━━━━━━━━━━

📊 Resumen:
• Total atrasos: ${atrasos.length}
• Críticos (>14 días): ${criticos}
• Promedio días: ${diasPromedio}

⏰ Por vencer (7 días): ${porVencer.length}
💬 Con observaciones: ${conObservaciones.length}

${atrasos.length > 0 ? `
📋 Top 5 más atrasados:
${atrasos.slice(0, 5).map((a, i) => `${i + 1}. ${a.ID || a.Correlativo} - ${a.diasAtraso} días (${a.Elaborador || 'Sin asignar'})`).join('\n')}
` : '✅ Sin atrasos registrados'}

Generado: ${new Date().toLocaleString('es-CL')}
    `.trim();

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btnCopiarAtrasos');
        if (btn) {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalIcon;
                btn.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Error al copiar:', err);
    });
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
