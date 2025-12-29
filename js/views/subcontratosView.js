import { obtenerDatosFiltrados } from '../services/dataService.js';
import { ESTADO_COLORS } from '../constants.js';
import { mostrarVistaItems } from './modalView.js';

let chartSubcontrato = null;
let subcontratoSeleccionado = null;
let ordenActual = { columna: null, direccion: 'asc' };
let datosSubcontratosGlobal = [];

export function actualizarSubcontratos() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('subcontratosContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <p>No hay datos para mostrar</p>
                <span class="empty-hint">Carga un reporte para ver el control de subcontratos</span>
            </div>
        `;
        return;
    }

    const agrupados = agruparPorSubcontrato(datos);
    const subcontratosOrdenados = Object.values(agrupados)
        .sort((a, b) => b.items.length - a.items.length);

    const totales = calcularTotales(subcontratosOrdenados);

    container.innerHTML = `
        <div class="subcontratos-dashboard">
            <!-- KPIs Generales -->
            <div class="subcontratos-kpis">
                ${generarKPIsSubcontratos(totales, subcontratosOrdenados)}
            </div>

            <!-- Layout principal -->
            <div class="subcontratos-layout">
                <!-- Panel izquierdo: Lista de subcontratos -->
                <div class="subcontratos-lista-panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-list"></i> Subcontratos</h3>
                        <span class="contador">${subcontratosOrdenados.length} subcontratos</span>
                    </div>
                    <div class="subcontratos-lista">
                        ${generarListaSubcontratos(subcontratosOrdenados)}
                    </div>
                </div>

                <!-- Panel derecho: Detalle del subcontrato -->
                <div class="subcontrato-detalle-panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-chart-pie"></i> Detalle del Subcontrato</h3>
                    </div>
                    <div id="subcontratoDetalle" class="subcontrato-detalle">
                        <div class="detalle-placeholder">
                            <i class="fas fa-hand-pointer"></i>
                            <p>Selecciona un subcontrato para ver el detalle</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabla resumen completa -->
            <div class="subcontratos-tabla-section">
                <div class="tabla-header">
                    <h3><i class="fas fa-table"></i> Resumen General de Subcontratos</h3>
                    <div class="tabla-acciones">
                        <button class="btn-secondary btn-small" id="btnExportarTabla" title="Exportar a Excel">
                            <i class="fas fa-file-excel"></i>
                        </button>
                        <button class="btn-secondary btn-small" id="btnExpandirTodos">
                            <i class="fas fa-expand-alt"></i> Expandir
                        </button>
                    </div>
                </div>
                <div class="tabla-toolbar">
                    <div class="tabla-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchTablaSubcontratos" placeholder="Buscar subcontrato...">
                    </div>
                    <div class="tabla-info">
                        <span class="tabla-contador"><strong>${subcontratosOrdenados.length}</strong> subcontratos</span>
                    </div>
                </div>
                <div class="tabla-wrapper">
                    ${generarTablaSubcontratos(subcontratosOrdenados, totales)}
                </div>
            </div>
        </div>
    `;

    inicializarEventosSubcontratos(subcontratosOrdenados);
}

function agruparPorSubcontrato(datos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const porSubcontrato = {};
    
    // Estados que se consideran "en proceso" (avanzando en el flujo)
    const estadosEnProceso = ['En revisor técnico', 'En cartografía', 'En coordinador', 'En elaboración cartografía'];

    datos.forEach(d => {
        const sub = d.Subcontrato || 'Sin subcontrato';
        if (!porSubcontrato[sub]) {
            porSubcontrato[sub] = {
                nombre: sub,
                items: [],
                estados: {},
                atrasos: 0,
                itemsAtrasados: [],
                elaboradores: new Set(),
                revisores: new Set(),
                tematicas: new Set(),
                // Contadores específicos
                incorporadas: 0,
                enEditorial: 0,
                enProceso: 0,
                enElaboracion: 0,
                conObservaciones: 0
            };
        }
        porSubcontrato[sub].items.push(d);

        const estado = d.Estado || 'Sin estado';
        porSubcontrato[sub].estados[estado] = (porSubcontrato[sub].estados[estado] || 0) + 1;

        // Contadores específicos por estado
        if (estado === 'Incorporada') {
            porSubcontrato[sub].incorporadas++;
        } else if (estado === 'En editorial') {
            porSubcontrato[sub].enEditorial++;
        } else if (estadosEnProceso.includes(estado)) {
            porSubcontrato[sub].enProceso++;
        } else if (estado === 'En elaboración') {
            porSubcontrato[sub].enElaboracion++;
        } else if (estado === 'Con observaciones') {
            porSubcontrato[sub].conObservaciones++;
        }

        // Atrasos: items en elaboración con fecha de entrega vencida
        if (d.FechaEntrega && d.Estado === 'En elaboración') {
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            if (fechaEntrega < hoy) {
                porSubcontrato[sub].atrasos += 1;
                porSubcontrato[sub].itemsAtrasados.push(d);
            }
        }

        if (d.Elaborador) porSubcontrato[sub].elaboradores.add(d.Elaborador);
        if (d.Revisor) porSubcontrato[sub].revisores.add(d.Revisor);
        if (d.Tematica || d.TematicaGeneral) {
            porSubcontrato[sub].tematicas.add(d.Tematica || d.TematicaGeneral);
        }
    });

    return porSubcontrato;
}

function calcularTotales(subcontratos) {
    return subcontratos.reduce((acc, sub) => {
        acc.total += sub.items.length;
        acc.incorporadas += sub.incorporadas;
        acc.enEditorial += sub.enEditorial;
        acc.enProceso += sub.enProceso;
        acc.enElaboracion += sub.enElaboracion;
        acc.conObservaciones += sub.conObservaciones;
        acc.atrasos += sub.atrasos;
        return acc;
    }, { 
        total: 0, 
        incorporadas: 0, 
        enEditorial: 0, 
        enProceso: 0, 
        enElaboracion: 0, 
        conObservaciones: 0, 
        atrasos: 0 
    });
}

function generarKPIsSubcontratos(totales, subcontratos) {
    // Avance total = incorporadas + en editorial + en proceso
    const avanceTotal = totales.incorporadas + totales.enEditorial + totales.enProceso;
    const porcentajeAvance = totales.total > 0 
        ? Math.round((avanceTotal / totales.total) * 100) 
        : 0;
    const porcentajeIncorporadas = totales.total > 0 
        ? Math.round((totales.incorporadas / totales.total) * 100) 
        : 0;

    const subcontratoMasAvanzado = subcontratos.reduce((mejor, sub) => {
        const avance = sub.incorporadas + sub.enEditorial + sub.enProceso;
        const porcentaje = sub.items.length > 0 ? (avance / sub.items.length) * 100 : 0;
        if (porcentaje > mejor.porcentaje) {
            return { nombre: sub.nombre, porcentaje };
        }
        return mejor;
    }, { nombre: '—', porcentaje: 0 });

    const subcontratoMasAtrasado = subcontratos.reduce((peor, sub) => {
        if (sub.atrasos > peor.atrasos) {
            return { nombre: sub.nombre, atrasos: sub.atrasos };
        }
        return peor;
    }, { nombre: '—', atrasos: 0 });

    return `
        <div class="kpi-card subcontrato-kpi">
            <div class="kpi-icon"><i class="fas fa-building"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${subcontratos.length}</span>
                <span class="kpi-title">Subcontratos Activos</span>
            </div>
        </div>
        <div class="kpi-card subcontrato-kpi green">
            <div class="kpi-icon"><i class="fas fa-check-double"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${totales.incorporadas}</span>
                <span class="kpi-title">Incorporadas</span>
                <span class="kpi-subtitle">${porcentajeIncorporadas}% del total</span>
            </div>
        </div>
        <div class="kpi-card subcontrato-kpi purple">
            <div class="kpi-icon"><i class="fas fa-file-signature"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${totales.enEditorial}</span>
                <span class="kpi-title">En Editorial</span>
            </div>
        </div>
        <div class="kpi-card subcontrato-kpi blue">
            <div class="kpi-icon"><i class="fas fa-cogs"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${totales.enProceso}</span>
                <span class="kpi-title">En Proceso</span>
            </div>
        </div>
        <div class="kpi-card subcontrato-kpi red">
            <div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${totales.atrasos}</span>
                <span class="kpi-title">Con Atrasos</span>
                ${subcontratoMasAtrasado.atrasos > 0 ? `<span class="kpi-subtitle">Mayor: ${truncar(subcontratoMasAtrasado.nombre, 15)}</span>` : ''}
            </div>
        </div>
        <div class="kpi-card subcontrato-kpi">
            <div class="kpi-icon"><i class="fas fa-trophy"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${Math.round(subcontratoMasAvanzado.porcentaje)}%</span>
                <span class="kpi-title">Mejor Avance</span>
                <span class="kpi-subtitle">${truncar(subcontratoMasAvanzado.nombre, 20)}</span>
            </div>
        </div>
    `;
}

function generarListaSubcontratos(subcontratos) {
    return subcontratos.map((sub, index) => {
        // Avance total = incorporadas + en editorial + en proceso
        const avanceTotal = sub.incorporadas + sub.enEditorial + sub.enProceso;
        const porcentaje = sub.items.length > 0 ? Math.round((avanceTotal / sub.items.length) * 100) : 0;
        const pctIncorporadas = sub.items.length > 0 ? Math.round((sub.incorporadas / sub.items.length) * 100) : 0;
        const pctEditorial = sub.items.length > 0 ? Math.round((sub.enEditorial / sub.items.length) * 100) : 0;
        const pctProceso = sub.items.length > 0 ? Math.round((sub.enProceso / sub.items.length) * 100) : 0;
        const tieneAtrasos = sub.atrasos > 0;

        return `
            <div class="subcontrato-item ${index === 0 ? 'active' : ''}" data-subcontrato="${sub.nombre}">
                <div class="subcontrato-item-header">
                    <span class="subcontrato-nombre">${sub.nombre}</span>
                    ${tieneAtrasos ? '<span class="atraso-badge"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                </div>
                <div class="subcontrato-item-stats">
                    <div class="stat-mini">
                        <span class="stat-value">${sub.items.length}</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="stat-mini green">
                        <span class="stat-value">${sub.incorporadas}</span>
                        <span class="stat-label">Incorp.</span>
                    </div>
                    <div class="stat-mini purple">
                        <span class="stat-value">${sub.enEditorial}</span>
                        <span class="stat-label">Edit.</span>
                    </div>
                    <div class="stat-mini ${tieneAtrasos ? 'red' : ''}">
                        <span class="stat-value">${sub.atrasos}</span>
                        <span class="stat-label">Atrasos</span>
                    </div>
                </div>
                <div class="subcontrato-progress">
                    <div class="progress-bar-mini stacked">
                        <div class="progress-fill success" style="width: ${pctIncorporadas}%"></div>
                        <div class="progress-fill purple" style="width: ${pctEditorial}%"></div>
                        <div class="progress-fill info" style="width: ${pctProceso}%"></div>
                    </div>
                    <span class="progress-text">${porcentaje}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function generarTablaSubcontratos(subcontratos, totales) {
    // Guardar referencia global para ordenamiento
    datosSubcontratosGlobal = subcontratos;
    
    // Calcular avance total para ordenar y determinar ranking
    const subcontratosConAvance = subcontratos.map(sub => {
        const avanceTotal = sub.incorporadas + sub.enEditorial + sub.enProceso;
        const porcentaje = sub.items.length > 0 ? (avanceTotal / sub.items.length) * 100 : 0;
        return { ...sub, porcentajeAvance: porcentaje };
    });
    
    // Ordenar por porcentaje para ranking
    const ranking = [...subcontratosConAvance].sort((a, b) => b.porcentajeAvance - a.porcentajeAvance);
    
    let html = `
        <table class="subcontratos-table-full">
            <thead>
                <tr>
                    <th class="col-expand"></th>
                    <th class="sortable" data-sort="nombre">
                        Subcontrato <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="text-center sortable" data-sort="total">
                        Total <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="text-center col-green sortable" data-sort="incorporadas">
                        Incorp. <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="text-center col-purple sortable" data-sort="editorial">
                        Editorial <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="text-center col-blue sortable" data-sort="proceso">
                        Proceso <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="text-center col-yellow sortable" data-sort="elaboracion">
                        Elaboración <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="text-center col-red sortable" data-sort="atrasos">
                        Atrasos <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="text-center sortable" data-sort="observaciones">
                        Obs. <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th class="sortable" data-sort="avance">
                        Avance <i class="fas fa-sort sort-icon"></i>
                    </th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    subcontratos.forEach((sub, index) => {
        // Avance total = incorporadas + en editorial + en proceso
        const avanceTotal = sub.incorporadas + sub.enEditorial + sub.enProceso;
        const porcentaje = sub.items.length > 0 ? Math.round((avanceTotal / sub.items.length) * 100) : 0;
        const pctIncorporadas = sub.items.length > 0 ? Math.round((sub.incorporadas / sub.items.length) * 100) : 0;
        const pctEditorial = sub.items.length > 0 ? Math.round((sub.enEditorial / sub.items.length) * 100) : 0;
        const pctProceso = sub.items.length > 0 ? Math.round((sub.enProceso / sub.items.length) * 100) : 0;
        
        // Determinar ranking
        const posicionRanking = ranking.findIndex(r => r.nombre === sub.nombre);
        let rankingBadge = '';
        let rowClass = 'subcontrato-row';
        
        if (posicionRanking === 0 && porcentaje > 0) {
            rankingBadge = '<span class="ranking-badge gold">1°</span>';
            rowClass += ' top-performer';
        } else if (posicionRanking === 1 && porcentaje > 0) {
            rankingBadge = '<span class="ranking-badge silver">2°</span>';
        } else if (posicionRanking === 2 && porcentaje > 0) {
            rankingBadge = '<span class="ranking-badge bronze">3°</span>';
        }
        
        // Clase para filas con problemas
        if (sub.atrasos > 3) {
            rowClass += ' has-issues';
        }
        
        // Clase de color para el porcentaje
        let progressClass = 'low';
        if (porcentaje >= 80) progressClass = 'excellent';
        else if (porcentaje >= 60) progressClass = 'good';
        else if (porcentaje >= 40) progressClass = 'warning';

        html += `
            <tr class="${rowClass}" data-subcontrato="${sub.nombre}" data-avance="${porcentaje}">
                <td class="col-expand">
                    <button class="btn-expand" title="Ver estados detallados">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </td>
                <td>
                    <div class="subcontrato-cell">
                        <div style="display: flex; align-items: center;">
                            ${rankingBadge}
                            <strong>${sub.nombre}</strong>
                        </div>
                        <span class="subcontrato-meta">
                            <i class="fas fa-users"></i> ${sub.elaboradores.size} elaborador${sub.elaboradores.size !== 1 ? 'es' : ''}
                            ${sub.tematicas.size > 0 ? `<span style="margin-left: 8px;"><i class="fas fa-tags"></i> ${sub.tematicas.size} temática${sub.tematicas.size !== 1 ? 's' : ''}</span>` : ''}
                        </span>
                    </div>
                </td>
                <td class="text-center"><strong>${sub.items.length}</strong></td>
                <td class="text-center col-green">
                    <span class="badge-pill success" title="Incorporadas: ${sub.incorporadas} de ${sub.items.length}">${sub.incorporadas}</span>
                </td>
                <td class="text-center col-purple">
                    ${sub.enEditorial > 0 
                        ? `<span class="badge-pill purple" title="En Editorial: ${sub.enEditorial}">${sub.enEditorial}</span>` 
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-center col-blue">
                    ${sub.enProceso > 0 
                        ? `<span class="badge-pill info" title="En Proceso: ${sub.enProceso}">${sub.enProceso}</span>` 
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-center col-yellow">
                    ${sub.enElaboracion > 0 
                        ? `<span class="badge-pill warning" title="En Elaboración: ${sub.enElaboracion}">${sub.enElaboracion}</span>` 
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-center col-red">
                    ${sub.atrasos > 0 
                        ? `<span class="badge-pill danger ${sub.atrasos > 3 ? 'pulse' : ''}" title="Atrasos: ${sub.atrasos}"><i class="fas fa-exclamation"></i> ${sub.atrasos}</span>` 
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-center">
                    ${sub.conObservaciones > 0 
                        ? `<span class="badge-pill danger-light" title="Con Observaciones: ${sub.conObservaciones}">${sub.conObservaciones}</span>` 
                        : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    <div class="progress-cell">
                        <div class="progress-bar-table stacked" title="Incorporadas: ${pctIncorporadas}% | Editorial: ${pctEditorial}% | Proceso: ${pctProceso}%">
                            <div class="progress-fill success" style="width: ${pctIncorporadas}%"></div>
                            <div class="progress-fill purple" style="width: ${pctEditorial}%"></div>
                            <div class="progress-fill info" style="width: ${pctProceso}%"></div>
                        </div>
                        <span class="progress-value ${progressClass}">${porcentaje}%</span>
                    </div>
                </td>
                <td>
                    <div class="acciones-cell">
                        <button class="btn-icon-small btn-ver-items" data-subcontrato="${sub.nombre}" title="Ver todos los items">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${sub.atrasos > 0 ? `
                            <button class="btn-icon-small btn-ver-atrasos danger" data-subcontrato="${sub.nombre}" title="Ver ${sub.atrasos} atrasos">
                                <i class="fas fa-exclamation-triangle"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
            <tr class="subcontrato-detalle-row hidden" data-subcontrato-detalle="${sub.nombre}">
                <td colspan="11">
                    <div class="estados-detalle">
                        ${generarDetalleEstados(sub)}
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody>';
    
    // Agregar fila de totales
    if (totales) {
        const avanceTotalGeneral = totales.incorporadas + totales.enEditorial + totales.enProceso;
        const porcentajeTotal = totales.total > 0 ? Math.round((avanceTotalGeneral / totales.total) * 100) : 0;
        
        html += `
            <tfoot>
                <tr>
                    <td></td>
                    <td>
                        <span class="total-label">
                            <i class="fas fa-calculator"></i>
                            <strong>TOTALES</strong>
                        </span>
                    </td>
                    <td class="text-center"><span class="badge-total">${totales.total}</span></td>
                    <td class="text-center"><span class="badge-total">${totales.incorporadas}</span></td>
                    <td class="text-center"><span class="badge-total">${totales.enEditorial}</span></td>
                    <td class="text-center"><span class="badge-total">${totales.enProceso}</span></td>
                    <td class="text-center"><span class="badge-total">${totales.enElaboracion}</span></td>
                    <td class="text-center"><span class="badge-total">${totales.atrasos}</span></td>
                    <td class="text-center"><span class="badge-total">${totales.conObservaciones}</span></td>
                    <td><span class="badge-total">${porcentajeTotal}%</span></td>
                    <td></td>
                </tr>
            </tfoot>
        `;
    }
    
    html += '</table>';
    return html;
}

function generarDetalleEstados(sub) {
    const estadosOrdenados = Object.entries(sub.estados)
        .sort((a, b) => b[1] - a[1]);

    return `
        <div class="estados-grid">
            ${estadosOrdenados.map(([estado, cantidad]) => `
                <div class="estado-chip" style="--estado-color: ${ESTADO_COLORS[estado] || '#94a3b8'}">
                    <span class="estado-indicator" style="background-color: ${ESTADO_COLORS[estado] || '#94a3b8'}"></span>
                    <span class="estado-nombre">${estado}</span>
                    <span class="estado-cantidad">${cantidad}</span>
                </div>
            `).join('')}
        </div>
        <div class="detalle-info">
            <div class="info-item">
                <i class="fas fa-users"></i>
                <span><strong>Elaboradores:</strong> ${Array.from(sub.elaboradores).join(', ') || 'Sin asignar'}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-user-check"></i>
                <span><strong>Revisores:</strong> ${Array.from(sub.revisores).join(', ') || 'Sin asignar'}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-tags"></i>
                <span><strong>Temáticas:</strong> ${Array.from(sub.tematicas).slice(0, 3).join(', ') || '—'}${sub.tematicas.size > 3 ? ` (+${sub.tematicas.size - 3} más)` : ''}</span>
            </div>
        </div>
    `;
}

function mostrarDetalleSubcontrato(subcontrato, subcontratos) {
    const detalleContainer = document.getElementById('subcontratoDetalle');
    if (!detalleContainer) return;

    const sub = subcontratos.find(s => s.nombre === subcontrato);
    if (!sub) return;

    subcontratoSeleccionado = sub;

    // Avance total = incorporadas + en editorial + en proceso
    const avanceTotal = sub.incorporadas + sub.enEditorial + sub.enProceso;
    const porcentaje = sub.items.length > 0 ? Math.round((avanceTotal / sub.items.length) * 100) : 0;
    const pendientes = sub.items.length - avanceTotal;

    detalleContainer.innerHTML = `
        <div class="detalle-content">
            <div class="detalle-header">
                <h4>${sub.nombre}</h4>
                <span class="detalle-badge ${porcentaje === 100 ? 'complete' : porcentaje >= 50 ? 'progress' : 'pending'}">
                    ${porcentaje}% avance
                </span>
            </div>

            <div class="detalle-stats">
                <div class="stat-box">
                    <span class="stat-number">${sub.items.length}</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="stat-box green">
                    <span class="stat-number">${sub.incorporadas}</span>
                    <span class="stat-label">Incorporadas</span>
                </div>
                <div class="stat-box purple">
                    <span class="stat-number">${sub.enEditorial}</span>
                    <span class="stat-label">Editorial</span>
                </div>
                <div class="stat-box blue">
                    <span class="stat-number">${sub.enProceso}</span>
                    <span class="stat-label">Proceso</span>
                </div>
                <div class="stat-box ${sub.atrasos > 0 ? 'red' : ''}">
                    <span class="stat-number">${sub.atrasos}</span>
                    <span class="stat-label">Atrasos</span>
                </div>
            </div>

            <div class="detalle-chart-section">
                <h5>Distribución por Estado</h5>
                <div class="chart-container-small">
                    <canvas id="chartSubcontrato"></canvas>
                </div>
            </div>

            <div class="detalle-acciones">
                <button class="btn-primary" id="btnVerTodosItems">
                    <i class="fas fa-list"></i>
                    Ver todos los items
                </button>
                ${sub.atrasos > 0 ? `
                    <button class="btn-danger" id="btnVerAtrasosDetalle">
                        <i class="fas fa-exclamation-triangle"></i>
                        Ver ${sub.atrasos} atrasos
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    renderizarGraficoSubcontrato(sub);

    document.getElementById('btnVerTodosItems')?.addEventListener('click', () => {
        mostrarVistaItems(`Items de ${sub.nombre}`, sub.items);
    });

    document.getElementById('btnVerAtrasosDetalle')?.addEventListener('click', () => {
        mostrarVistaItems(`Atrasos de ${sub.nombre}`, sub.itemsAtrasados);
    });
}

function renderizarGraficoSubcontrato(sub) {
    if (chartSubcontrato) {
        chartSubcontrato.destroy();
        chartSubcontrato = null;
    }

    const canvas = document.getElementById('chartSubcontrato');
    if (!canvas) return;

    const estadosData = Object.entries(sub.estados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const ctx = canvas.getContext('2d');
    
    chartSubcontrato = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: estadosData.map(([estado]) => estado),
            datasets: [{
                data: estadosData.map(([, cantidad]) => cantidad),
                backgroundColor: estadosData.map(([estado]) => ESTADO_COLORS[estado] || '#94a3b8'),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 10,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    padding: 10,
                    cornerRadius: 0
                }
            }
        }
    });
}

function inicializarEventosSubcontratos(subcontratos) {
    // Selección de subcontrato en la lista
    document.querySelectorAll('.subcontrato-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.subcontrato-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            mostrarDetalleSubcontrato(item.dataset.subcontrato, subcontratos);
        });
    });

    // Mostrar primer subcontrato por defecto
    if (subcontratos.length > 0) {
        mostrarDetalleSubcontrato(subcontratos[0].nombre, subcontratos);
    }

    // Botones de expandir en la tabla
    document.querySelectorAll('.btn-expand').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = btn.closest('.subcontrato-row');
            const subcontrato = row.dataset.subcontrato;
            const detalleRow = document.querySelector(`[data-subcontrato-detalle="${subcontrato}"]`);
            
            if (detalleRow) {
                detalleRow.classList.toggle('hidden');
                btn.classList.toggle('expanded');
                btn.querySelector('i').classList.toggle('fa-chevron-right');
                btn.querySelector('i').classList.toggle('fa-chevron-down');
            }
        });
    });

    // Botón expandir todos
    document.getElementById('btnExpandirTodos')?.addEventListener('click', () => {
        const detalleRows = document.querySelectorAll('.subcontrato-detalle-row');
        const allHidden = Array.from(detalleRows).every(r => r.classList.contains('hidden'));
        const btn = document.getElementById('btnExpandirTodos');
        
        detalleRows.forEach(row => {
            row.classList.toggle('hidden', !allHidden);
        });

        document.querySelectorAll('.btn-expand').forEach(expandBtn => {
            expandBtn.classList.toggle('expanded', allHidden);
            const icon = expandBtn.querySelector('i');
            icon.classList.toggle('fa-chevron-right', !allHidden);
            icon.classList.toggle('fa-chevron-down', allHidden);
        });
        
        // Actualizar texto del botón
        if (btn) {
            btn.innerHTML = allHidden 
                ? '<i class="fas fa-compress-alt"></i> Colapsar' 
                : '<i class="fas fa-expand-alt"></i> Expandir';
        }
    });

    // Búsqueda en tabla
    const searchInput = document.getElementById('searchTablaSubcontratos');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase().trim();
            const filas = document.querySelectorAll('.subcontrato-row');
            let contadorVisible = 0;
            
            filas.forEach(fila => {
                const subcontrato = fila.dataset.subcontrato.toLowerCase();
                const visible = subcontrato.includes(termino);
                fila.style.display = visible ? '' : 'none';
                
                // Ocultar también la fila de detalle
                const detalleRow = document.querySelector(`[data-subcontrato-detalle="${fila.dataset.subcontrato}"]`);
                if (detalleRow) {
                    detalleRow.style.display = visible ? '' : 'none';
                    if (!visible) {
                        detalleRow.classList.add('hidden');
                    }
                }
                
                if (visible) contadorVisible++;
            });
            
            // Actualizar contador
            const contador = document.querySelector('.tabla-contador');
            if (contador) {
                contador.innerHTML = `<strong>${contadorVisible}</strong> de ${subcontratos.length} subcontratos`;
            }
        });
    }

    // Ordenamiento de columnas
    document.querySelectorAll('.subcontratos-table-full th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const columna = th.dataset.sort;
            const direccion = ordenActual.columna === columna && ordenActual.direccion === 'asc' ? 'desc' : 'asc';
            
            ordenarTabla(columna, direccion, subcontratos);
            
            // Actualizar estilos de headers
            document.querySelectorAll('.subcontratos-table-full th.sortable').forEach(header => {
                header.classList.remove('sorted');
                const icon = header.querySelector('.sort-icon');
                if (icon) {
                    icon.classList.remove('fa-sort-up', 'fa-sort-down');
                    icon.classList.add('fa-sort');
                }
            });
            
            th.classList.add('sorted');
            const icon = th.querySelector('.sort-icon');
            if (icon) {
                icon.classList.remove('fa-sort');
                icon.classList.add(direccion === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
            }
            
            ordenActual = { columna, direccion };
        });
    });

    // Exportar tabla
    document.getElementById('btnExportarTabla')?.addEventListener('click', () => {
        exportarTablaSubcontratos(subcontratos);
    });

    // Botones ver items
    document.querySelectorAll('.btn-ver-items').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const subcontrato = btn.dataset.subcontrato;
            const sub = subcontratos.find(s => s.nombre === subcontrato);
            if (sub) {
                mostrarVistaItems(`Items de ${sub.nombre}`, sub.items);
            }
        });
    });

    // Botones ver atrasos
    document.querySelectorAll('.btn-ver-atrasos').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const subcontrato = btn.dataset.subcontrato;
            const sub = subcontratos.find(s => s.nombre === subcontrato);
            if (sub && sub.itemsAtrasados.length > 0) {
                mostrarVistaItems(`Atrasos de ${sub.nombre}`, sub.itemsAtrasados);
            }
        });
    });
}

function ordenarTabla(columna, direccion, subcontratos) {
    const tbody = document.querySelector('.subcontratos-table-full tbody');
    if (!tbody) return;
    
    const filas = Array.from(tbody.querySelectorAll('.subcontrato-row'));
    
    filas.sort((a, b) => {
        const subA = subcontratos.find(s => s.nombre === a.dataset.subcontrato);
        const subB = subcontratos.find(s => s.nombre === b.dataset.subcontrato);
        
        if (!subA || !subB) return 0;
        
        let valorA, valorB;
        
        switch (columna) {
            case 'nombre':
                valorA = subA.nombre.toLowerCase();
                valorB = subB.nombre.toLowerCase();
                break;
            case 'total':
                valorA = subA.items.length;
                valorB = subB.items.length;
                break;
            case 'incorporadas':
                valorA = subA.incorporadas;
                valorB = subB.incorporadas;
                break;
            case 'editorial':
                valorA = subA.enEditorial;
                valorB = subB.enEditorial;
                break;
            case 'proceso':
                valorA = subA.enProceso;
                valorB = subB.enProceso;
                break;
            case 'elaboracion':
                valorA = subA.enElaboracion;
                valorB = subB.enElaboracion;
                break;
            case 'atrasos':
                valorA = subA.atrasos;
                valorB = subB.atrasos;
                break;
            case 'observaciones':
                valorA = subA.conObservaciones;
                valorB = subB.conObservaciones;
                break;
            case 'avance':
                valorA = parseInt(a.dataset.avance || '0');
                valorB = parseInt(b.dataset.avance || '0');
                break;
            default:
                return 0;
        }
        
        if (typeof valorA === 'string') {
            return direccion === 'asc' 
                ? valorA.localeCompare(valorB) 
                : valorB.localeCompare(valorA);
        }
        
        return direccion === 'asc' ? valorA - valorB : valorB - valorA;
    });
    
    // Reordenar filas en el DOM
    filas.forEach(fila => {
        const detalleRow = document.querySelector(`[data-subcontrato-detalle="${fila.dataset.subcontrato}"]`);
        tbody.appendChild(fila);
        if (detalleRow) {
            tbody.appendChild(detalleRow);
        }
    });
}

function exportarTablaSubcontratos(subcontratos) {
    // Crear datos para exportación
    const datos = subcontratos.map(sub => {
        const avanceTotal = sub.incorporadas + sub.enEditorial + sub.enProceso;
        const porcentaje = sub.items.length > 0 ? Math.round((avanceTotal / sub.items.length) * 100) : 0;
        
        return {
            'Subcontrato': sub.nombre,
            'Total Items': sub.items.length,
            'Incorporadas': sub.incorporadas,
            'En Editorial': sub.enEditorial,
            'En Proceso': sub.enProceso,
            'En Elaboración': sub.enElaboracion,
            'Atrasos': sub.atrasos,
            'Con Observaciones': sub.conObservaciones,
            'Avance (%)': porcentaje,
            'Elaboradores': sub.elaboradores.size,
            'Revisores': sub.revisores.size,
            'Temáticas': sub.tematicas.size
        };
    });
    
    // Verificar si existe XLSX
    if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Subcontratos');
        
        // Ajustar anchos de columna
        const maxWidth = datos.reduce((acc, row) => {
            Object.keys(row).forEach((key, i) => {
                const len = String(row[key]).length;
                acc[i] = Math.max(acc[i] || 10, len + 2);
            });
            return acc;
        }, {});
        
        ws['!cols'] = Object.values(maxWidth).map(w => ({ wch: Math.min(w, 30) }));
        
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Resumen_Subcontratos_${fecha}.xlsx`);
    } else {
        // Fallback: exportar como CSV
        const headers = Object.keys(datos[0] || {}).join(',');
        const rows = datos.map(d => Object.values(d).join(','));
        const csv = [headers, ...rows].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Resumen_Subcontratos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
}

function truncar(texto, max) {
    if (!texto) return '';
    return texto.length > max ? texto.substring(0, max) + '...' : texto;
}
