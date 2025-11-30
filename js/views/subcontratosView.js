import { obtenerDatosFiltrados } from '../services/dataService.js';
import { ESTADO_COLORS } from '../constants.js';
import { mostrarVistaItems } from './modalView.js';

let chartSubcontrato = null;
let subcontratoSeleccionado = null;

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
                        <button class="btn-secondary btn-small" id="btnExpandirTodos">
                            <i class="fas fa-expand-alt"></i> Expandir todo
                        </button>
                    </div>
                </div>
                <div class="tabla-wrapper">
                    ${generarTablaSubcontratos(subcontratosOrdenados)}
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

function generarTablaSubcontratos(subcontratos) {
    let html = `
        <table class="subcontratos-table-full">
            <thead>
                <tr>
                    <th class="col-expand"></th>
                    <th>Subcontrato</th>
                    <th class="text-center">Total</th>
                    <th class="text-center col-green">Incorp.</th>
                    <th class="text-center col-purple">Editorial</th>
                    <th class="text-center col-blue">Proceso</th>
                    <th class="text-center col-yellow">Elaboración</th>
                    <th class="text-center col-red">Atrasos</th>
                    <th class="text-center">Obs.</th>
                    <th>Avance</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    subcontratos.forEach(sub => {
        // Avance total = incorporadas + en editorial + en proceso
        const avanceTotal = sub.incorporadas + sub.enEditorial + sub.enProceso;
        const porcentaje = sub.items.length > 0 ? Math.round((avanceTotal / sub.items.length) * 100) : 0;
        const pctIncorporadas = sub.items.length > 0 ? Math.round((sub.incorporadas / sub.items.length) * 100) : 0;
        const pctEditorial = sub.items.length > 0 ? Math.round((sub.enEditorial / sub.items.length) * 100) : 0;
        const pctProceso = sub.items.length > 0 ? Math.round((sub.enProceso / sub.items.length) * 100) : 0;

        html += `
            <tr class="subcontrato-row" data-subcontrato="${sub.nombre}">
                <td class="col-expand">
                    <button class="btn-expand" title="Ver estados detallados">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </td>
                <td>
                    <div class="subcontrato-cell">
                        <strong>${sub.nombre}</strong>
                        <span class="subcontrato-meta">${sub.elaboradores.size} elaborador${sub.elaboradores.size !== 1 ? 'es' : ''}</span>
                    </div>
                </td>
                <td class="text-center"><strong>${sub.items.length}</strong></td>
                <td class="text-center col-green">
                    <span class="badge-pill success">${sub.incorporadas}</span>
                </td>
                <td class="text-center col-purple">
                    ${sub.enEditorial > 0 
                        ? `<span class="badge-pill purple">${sub.enEditorial}</span>` 
                        : '<span class="text-muted">0</span>'}
                </td>
                <td class="text-center col-blue">
                    ${sub.enProceso > 0 
                        ? `<span class="badge-pill info">${sub.enProceso}</span>` 
                        : '<span class="text-muted">0</span>'}
                </td>
                <td class="text-center col-yellow">
                    ${sub.enElaboracion > 0 
                        ? `<span class="badge-pill warning">${sub.enElaboracion}</span>` 
                        : '<span class="text-muted">0</span>'}
                </td>
                <td class="text-center col-red">
                    ${sub.atrasos > 0 
                        ? `<span class="badge-pill danger">${sub.atrasos}</span>` 
                        : '<span class="text-muted">0</span>'}
                </td>
                <td class="text-center">
                    ${sub.conObservaciones > 0 
                        ? `<span class="badge-pill danger-light">${sub.conObservaciones}</span>` 
                        : '<span class="text-muted">0</span>'}
                </td>
                <td>
                    <div class="progress-cell">
                        <div class="progress-bar-table stacked">
                            <div class="progress-fill success" style="width: ${pctIncorporadas}%" title="Incorporadas: ${sub.incorporadas}"></div>
                            <div class="progress-fill purple" style="width: ${pctEditorial}%" title="En Editorial: ${sub.enEditorial}"></div>
                            <div class="progress-fill info" style="width: ${pctProceso}%" title="En Proceso: ${sub.enProceso}"></div>
                        </div>
                        <span class="progress-value">${porcentaje}%</span>
                    </div>
                </td>
                <td>
                    <div class="acciones-cell">
                        <button class="btn-icon-small btn-ver-items" data-subcontrato="${sub.nombre}" title="Ver items">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${sub.atrasos > 0 ? `
                            <button class="btn-icon-small btn-ver-atrasos danger" data-subcontrato="${sub.nombre}" title="Ver atrasos">
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

    html += '</tbody></table>';
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
                    cornerRadius: 6
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
                btn.querySelector('i').classList.toggle('fa-chevron-right');
                btn.querySelector('i').classList.toggle('fa-chevron-down');
            }
        });
    });

    // Botón expandir todos
    document.getElementById('btnExpandirTodos')?.addEventListener('click', () => {
        const detalleRows = document.querySelectorAll('.subcontrato-detalle-row');
        const allHidden = Array.from(detalleRows).every(r => r.classList.contains('hidden'));
        
        detalleRows.forEach(row => {
            row.classList.toggle('hidden', !allHidden);
        });

        document.querySelectorAll('.btn-expand i').forEach(icon => {
            icon.classList.toggle('fa-chevron-right', !allHidden);
            icon.classList.toggle('fa-chevron-down', allHidden);
        });
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

function truncar(texto, max) {
    if (!texto) return '';
    return texto.length > max ? texto.substring(0, max) + '...' : texto;
}
