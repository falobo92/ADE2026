import { ESTADOS, ESTADO_COLORS } from '../constants.js';
import { obtenerDatosFiltrados, obtenerTodosLosReportes } from '../services/dataService.js';
import { getProgramacionConfig } from '../services/programacionService.js';
import { parseFechaFlexible, formatearFechaCorta, formatearFechaParaMostrar } from '../utils/date.js';
import { mostrarVistaItems } from './modalView.js';
import { AppState } from '../state.js';

let chartTotalGeneral = null;
let chartProgramacion = null;

const COLOR_DEFECTO = '#94a3b8';

// Usar colores de ESTADO_COLORS importados para consistencia
// Estos colores coinciden con los definidos en constants.js y styles.css

const ESTADO_ORDEN = ESTADOS.reduce((acc, estado, i) => {
    acc[estado] = i;
    return acc;
}, {});

function compararEstados(a, b) {
    const ordenA = ESTADO_ORDEN[a];
    const ordenB = ESTADO_ORDEN[b];
    if (ordenA !== undefined && ordenB !== undefined) return ordenA - ordenB;
    if (ordenA !== undefined) return -1;
    if (ordenB !== undefined) return 1;
    return a.localeCompare(b);
}

function getColor(estado) {
    return ESTADO_COLORS[estado] || COLOR_DEFECTO;
}

export function actualizarDashboard() {
    const datos = obtenerDatosFiltrados();
    
    if (datos.length === 0) {
        renderEmptyState();
        return;
    }

    const kpis = calcularKPIs(datos);
    const distribucion = calcularDistribucion(datos);
    const responsables = calcularResponsables(datos);
    const tematicas = calcularTematicas(datos);
    const alertas = calcularAlertas(datos);
    const programacion = prepararProgramacion(datos);

    renderResumenEjecutivo(datos, kpis);
    renderKPIs(kpis);
    renderDistribucion(distribucion, datos.length);
    renderAvanceGeneral(kpis, datos.length);
    renderResponsables(responsables);
    renderAlertas(alertas);
    renderTematicas(tematicas);
    
    inicializarGraficos(datos, programacion);
    renderTablaProgramacion(programacion);
    
    conectarEventos();
}

function renderEmptyState() {
    const containers = ['kpiCards', 'legendTable', 'progressOverview', 'responsablesList', 
                        'alertsContainer', 'tematicasGrid', 'programacionTable', 'summaryContent'];
    
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    const summaryContent = document.getElementById('summaryContent');
    if (summaryContent) {
        summaryContent.innerHTML = `
            <div class="empty-state-mini">
                <i class="fas fa-inbox"></i>
                <p>Carga datos para ver el resumen</p>
            </div>
        `;
    }
}

// ============================================
// CÁLCULOS
// ============================================

function calcularKPIs(datos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const incorporadas = datos.filter(d => d.Estado === 'Incorporada').length;
    const enEditorial = datos.filter(d => d.Estado === 'En editorial').length;
    const enElaboracion = datos.filter(d => d.Estado === 'En elaboración').length;
    const conObservaciones = datos.filter(d => d.Estado === 'Con observaciones').length;
    
    // Atrasos: solo items "En elaboración" con fecha vencida
    // NO incluye "Con observaciones" ya que están en proceso de corrección
    const atrasos = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
        const fecha = parseFechaFlexible(d.FechaEntrega);
        if (!fecha) return false;
        fecha.setHours(0, 0, 0, 0);
        return fecha < hoy;
    }).length;

    const porVencer = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado === 'Incorporada') return false;
        const fecha = parseFechaFlexible(d.FechaEntrega);
        if (!fecha) return false;
        fecha.setHours(0, 0, 0, 0);
        const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7;
    }).length;

    const listoParaCierre = incorporadas + enEditorial;
    const enProceso = datos.length - listoParaCierre;

    return {
        total: datos.length,
        incorporadas,
        enEditorial,
        enElaboracion,
        conObservaciones,
        listoParaCierre,
        enProceso,
        atrasos,
        porVencer,
        porcentajeAvance: datos.length > 0 ? ((incorporadas / datos.length) * 100).toFixed(1) : 0,
        porcentajeListo: datos.length > 0 ? ((listoParaCierre / datos.length) * 100).toFixed(1) : 0
    };
}

function calcularDistribucion(datos) {
    const dist = {};
    ESTADOS.forEach(e => dist[e] = 0);
    datos.forEach(d => {
        if (d.Estado && dist[d.Estado] !== undefined) {
            dist[d.Estado]++;
        }
    });
    return dist;
}

function calcularResponsables(datos) {
    const mapa = {};
    
    // Estados que se consideran "en proceso" (avanzando en el flujo)
    const estadosEnProceso = ['En revisor técnico', 'En cartografía', 'En coordinador', 'En elaboración cartografía'];
    
    datos.forEach(d => {
        const elaborador = d.Elaborador || 'Sin asignar';
        if (!mapa[elaborador]) {
            mapa[elaborador] = { 
                nombre: elaborador, 
                total: 0, 
                incorporadas: 0, 
                enEditorial: 0,
                enProceso: 0,
                atrasos: 0 
            };
        }
        mapa[elaborador].total++;
        
        if (d.Estado === 'Incorporada') {
            mapa[elaborador].incorporadas++;
        } else if (d.Estado === 'En editorial') {
            mapa[elaborador].enEditorial++;
        } else if (estadosEnProceso.includes(d.Estado)) {
            mapa[elaborador].enProceso++;
        }
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (d.FechaEntrega && d.Estado !== 'Incorporada' && d.Estado !== 'En editorial') {
            const fecha = parseFechaFlexible(d.FechaEntrega);
            if (fecha) {
                fecha.setHours(0, 0, 0, 0);
                if (fecha < hoy) mapa[elaborador].atrasos++;
            }
        }
    });

    return Object.values(mapa)
        .sort((a, b) => b.total - a.total);
}

function calcularTematicas(datos) {
    const mapa = {};
    
    datos.forEach(d => {
        const tematica = d.TematicaGeneral || d.Tematica || 'Sin temática';
        if (!mapa[tematica]) {
            mapa[tematica] = { nombre: tematica, total: 0, incorporadas: 0, enEditorial: 0 };
        }
        mapa[tematica].total++;
        if (d.Estado === 'Incorporada') mapa[tematica].incorporadas++;
        if (d.Estado === 'En editorial') mapa[tematica].enEditorial++;
    });

    return Object.values(mapa)
        .sort((a, b) => b.total - a.total);
}

function calcularAlertas(datos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const alertas = [];

    // Atrasos críticos (más de 14 días) - Solo "En elaboración"
    const atrasosCriticos = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
        const fecha = parseFechaFlexible(d.FechaEntrega);
        if (!fecha) return false;
        const diff = Math.ceil((hoy - fecha) / (1000 * 60 * 60 * 24));
        return diff > 14;
    });

    if (atrasosCriticos.length > 0) {
        alertas.push({
            tipo: 'danger',
            icono: 'fa-exclamation-circle',
            titulo: `${atrasosCriticos.length} atrasos críticos`,
            descripcion: 'Más de 14 días vencidos',
            items: atrasosCriticos
        });
    }

    // Vencen hoy
    const vencenHoy = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado === 'Incorporada') return false;
        const fecha = parseFechaFlexible(d.FechaEntrega);
        if (!fecha) return false;
        fecha.setHours(0, 0, 0, 0);
        return fecha.getTime() === hoy.getTime();
    });

    if (vencenHoy.length > 0) {
        alertas.push({
            tipo: 'warning',
            icono: 'fa-clock',
            titulo: `${vencenHoy.length} vencen hoy`,
            descripcion: 'Requieren atención inmediata',
            items: vencenHoy
        });
    }

    // Con observaciones pendientes
    const conObs = datos.filter(d => d.Estado === 'Con observaciones');
    if (conObs.length > 0) {
        alertas.push({
            tipo: 'info',
            icono: 'fa-comment-dots',
            titulo: `${conObs.length} con observaciones`,
            descripcion: 'Pendientes de corrección',
            items: conObs
        });
    }

    // Sin elaborador asignado
    const sinAsignar = datos.filter(d => !d.Elaborador && d.Estado !== 'Incorporada');
    if (sinAsignar.length > 0) {
        alertas.push({
            tipo: 'muted',
            icono: 'fa-user-slash',
            titulo: `${sinAsignar.length} sin asignar`,
            descripcion: 'Requieren asignación',
            items: sinAsignar
        });
    }

    return alertas;
}

// ============================================
// RENDERS
// ============================================

function renderResumenEjecutivo(datos, kpis) {
    const summaryDate = document.getElementById('summaryDate');
    const summaryContent = document.getElementById('summaryContent');
    
    if (!summaryContent) return;

    // Obtener fecha del último reporte
    let ultimaFecha = null;
    datos.forEach(d => {
        if (d.FechaReporte) {
            const fecha = parseFechaFlexible(d.FechaReporte);
            if (fecha && (!ultimaFecha || fecha > ultimaFecha)) {
                ultimaFecha = fecha;
            }
        }
    });

    if (summaryDate) {
        summaryDate.textContent = ultimaFecha 
            ? `Actualizado: ${formatearFechaCorta(ultimaFecha.toISOString().split('T')[0])}`
            : '';
    }

    const tendencia = kpis.porcentajeAvance >= 50 ? 'positiva' : 'atención';
    
    summaryContent.innerHTML = `
        <div class="summary-metrics">
            <div class="summary-metric main">
                <div class="metric-circle ${kpis.porcentajeAvance >= 75 ? 'success' : kpis.porcentajeAvance >= 50 ? 'warning' : 'danger'}">
                    <span class="metric-value">${kpis.porcentajeAvance}%</span>
                </div>
                <div class="metric-info">
                    <span class="metric-label">Avance Global</span>
                    <span class="metric-detail">${kpis.incorporadas} de ${kpis.total} incorporadas</span>
                </div>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-stats">
                <div class="summary-stat">
                    <i class="fas fa-check-circle text-success"></i>
                    <div>
                        <strong>${kpis.listoParaCierre}</strong>
                        <span>Listo para cierre</span>
                    </div>
                </div>
                <div class="summary-stat">
                    <i class="fas fa-spinner text-info"></i>
                    <div>
                        <strong>${kpis.enProceso}</strong>
                        <span>En proceso</span>
                    </div>
                </div>
                <div class="summary-stat ${kpis.atrasos > 0 ? 'highlight-danger' : ''}">
                    <i class="fas fa-exclamation-triangle text-danger"></i>
                    <div>
                        <strong>${kpis.atrasos}</strong>
                        <span>Atrasos</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderKPIs(kpis) {
    const container = document.getElementById('kpiCards');
    if (!container) return;

    container.innerHTML = `
        <div class="kpi-card success">
            <div class="kpi-icon"><i class="fas fa-check-double"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.incorporadas}</span>
                <span class="kpi-label">Incorporadas</span>
            </div>
            <div class="kpi-badge">${kpis.porcentajeAvance}%</div>
        </div>
        <div class="kpi-card purple">
            <div class="kpi-icon"><i class="fas fa-file-signature"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.enEditorial}</span>
                <span class="kpi-label">En Editorial</span>
            </div>
        </div>
        <div class="kpi-card info">
            <div class="kpi-icon"><i class="fas fa-cogs"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.enProceso}</span>
                <span class="kpi-label">En Proceso</span>
            </div>
        </div>
        <div class="kpi-card ${kpis.atrasos > 0 ? 'danger' : 'neutral'}">
            <div class="kpi-icon"><i class="fas fa-clock"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.atrasos}</span>
                <span class="kpi-label">Atrasos</span>
            </div>
        </div>
        <div class="kpi-card ${kpis.porVencer > 0 ? 'warning' : 'neutral'}">
            <div class="kpi-icon"><i class="fas fa-hourglass-half"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.porVencer}</span>
                <span class="kpi-label">Por Vencer</span>
            </div>
            <div class="kpi-badge-small">7 días</div>
        </div>
        <div class="kpi-card neutral">
            <div class="kpi-icon"><i class="fas fa-list-ol"></i></div>
            <div class="kpi-content">
                <span class="kpi-value">${kpis.total}</span>
                <span class="kpi-label">Total</span>
            </div>
        </div>
    `;
}

function renderDistribucion(distribucion, total) {
    const container = document.getElementById('legendTable');
    if (!container) return;

    const items = Object.entries(distribucion)
        .filter(([, cant]) => cant > 0)
        .sort(([a], [b]) => compararEstados(a, b))
        .map(([estado, cant]) => {
            const pct = total > 0 ? ((cant / total) * 100).toFixed(1) : 0;
            const color = getColor(estado);
            return `
                <div class="legend-row clickable" data-estado="${estado}">
                    <div class="legend-color" style="background: ${color}"></div>
                    <span class="legend-label">${estado}</span>
                    <span class="legend-value">${cant}</span>
                    <span class="legend-pct">${pct}%</span>
                </div>
            `;
        }).join('');

    container.innerHTML = items || '<p class="text-muted">Sin datos</p>';
}

function renderAvanceGeneral(kpis, total) {
    const container = document.getElementById('progressOverview');
    if (!container) return;

    const pctIncorporadas = total > 0 ? (kpis.incorporadas / total) * 100 : 0;
    const pctEditorial = total > 0 ? (kpis.enEditorial / total) * 100 : 0;
    const pctProceso = 100 - pctIncorporadas - pctEditorial;

    container.innerHTML = `
        <div class="progress-bar-stacked">
            <div class="progress-segment success" style="width: ${pctIncorporadas}%" title="Incorporadas: ${kpis.incorporadas}"></div>
            <div class="progress-segment purple" style="width: ${pctEditorial}%" title="En Editorial: ${kpis.enEditorial}"></div>
            <div class="progress-segment neutral" style="width: ${pctProceso}%" title="En Proceso: ${kpis.enProceso}"></div>
        </div>
        <div class="progress-legend">
            <div class="progress-legend-item">
                <span class="dot success"></span>
                <span>Incorporadas (${pctIncorporadas.toFixed(1)}%)</span>
            </div>
            <div class="progress-legend-item">
                <span class="dot purple"></span>
                <span>En Editorial (${pctEditorial.toFixed(1)}%)</span>
            </div>
            <div class="progress-legend-item">
                <span class="dot neutral"></span>
                <span>En Proceso (${pctProceso.toFixed(1)}%)</span>
            </div>
        </div>
        <div class="progress-milestone">
            <div class="milestone-info">
                <i class="fas fa-flag-checkered"></i>
                <span>Meta: 100% incorporadas</span>
            </div>
            <div class="milestone-remaining">
                Faltan <strong>${total - kpis.incorporadas}</strong> preguntas
            </div>
        </div>
    `;
}

function renderResponsables(responsables) {
    const container = document.getElementById('responsablesList');
    if (!container) return;

    if (responsables.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Sin datos de responsables</p>';
        return;
    }

    const items = responsables.map(r => {
        // Avance total = incorporadas + en editorial + en proceso
        const avanceTotal = r.incorporadas + r.enEditorial + r.enProceso;
        const pctAvance = r.total > 0 ? ((avanceTotal / r.total) * 100).toFixed(0) : 0;
        const pctIncorporadas = r.total > 0 ? ((r.incorporadas / r.total) * 100).toFixed(0) : 0;
        const pctEditorial = r.total > 0 ? ((r.enEditorial / r.total) * 100).toFixed(0) : 0;
        const pctProceso = r.total > 0 ? ((r.enProceso / r.total) * 100).toFixed(0) : 0;
        
        return `
            <div class="responsable-item">
                <div class="responsable-info">
                    <span class="responsable-name">${r.nombre}</span>
                    <span class="responsable-stats">
                        <span class="stat-total">${r.total}</span>
                        ${r.atrasos > 0 ? `<span class="stat-atrasos">${r.atrasos} atrasos</span>` : ''}
                    </span>
                </div>
                <div class="responsable-progress">
                    <div class="mini-progress stacked">
                        <div class="mini-progress-fill success" style="width: ${pctIncorporadas}%" title="Incorporadas: ${r.incorporadas}"></div>
                        <div class="mini-progress-fill purple" style="width: ${pctEditorial}%" title="En Editorial: ${r.enEditorial}"></div>
                        <div class="mini-progress-fill info" style="width: ${pctProceso}%" title="En Proceso: ${r.enProceso}"></div>
                    </div>
                    <span class="responsable-pct">${pctAvance}%</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = items;
}

function renderAlertas(alertas) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    if (alertas.length === 0) {
        container.innerHTML = `
            <div class="no-alerts">
                <i class="fas fa-check-circle"></i>
                <span>Sin alertas críticas</span>
            </div>
        `;
        return;
    }

    const items = alertas.map(a => `
        <div class="alert-item alert-${a.tipo}" data-items='${JSON.stringify(a.items.map(i => i.Correlativo))}'>
            <div class="alert-icon">
                <i class="fas ${a.icono}"></i>
            </div>
            <div class="alert-content">
                <span class="alert-title">${a.titulo}</span>
                <span class="alert-desc">${a.descripcion}</span>
            </div>
            <i class="fas fa-chevron-right alert-arrow"></i>
        </div>
    `).join('');

    container.innerHTML = items;
}

function renderTematicas(tematicas) {
    const container = document.getElementById('tematicasGrid');
    if (!container) return;

    if (tematicas.length === 0) {
        container.innerHTML = '<p class="text-muted">Sin datos de temáticas</p>';
        return;
    }

    const items = tematicas.slice(0, 12).map(t => {
        const pctAvance = t.total > 0 ? ((t.incorporadas / t.total) * 100).toFixed(0) : 0;
        const listos = t.incorporadas + t.enEditorial;
        return `
            <div class="tematica-card">
                <div class="tematica-header">
                    <span class="tematica-name" title="${t.nombre}">${t.nombre}</span>
                    <span class="tematica-total">${t.total}</span>
                </div>
                <div class="tematica-progress">
                    <div class="tematica-bar">
                        <div class="tematica-fill success" style="width: ${(t.incorporadas / t.total) * 100}%"></div>
                        <div class="tematica-fill purple" style="width: ${(t.enEditorial / t.total) * 100}%"></div>
                    </div>
                </div>
                <div class="tematica-stats">
                    <span class="text-success">${t.incorporadas} inc.</span>
                    <span class="text-purple">${t.enEditorial} edit.</span>
                    <span class="text-muted">${pctAvance}%</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = items;
}

function renderTablaProgramacion(data) {
    const container = document.getElementById('programacionTable');
    if (!container || !data.estados?.length) {
        if (container) container.innerHTML = '';
        return;
    }

    const headers = data.estados.map(e => `<th>${e}</th>`).join('');
    const rows = data.tabla.map(fila => `
        <tr>
            <td class="fecha-col">${fila.fecha}</td>
            ${fila.valores.map((v, i) => `
                <td class="${v > 0 ? 'has-value' : ''}" style="--estado-color: ${getColor(data.estados[i])}">${v || '-'}</td>
            `).join('')}
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="programacion-table-compact">
            <thead>
                <tr>
                    <th>Fecha</th>
                    ${headers}
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ============================================
// GRÁFICOS
// ============================================

function inicializarGraficos(datos, programacion) {
    inicializarGraficoDistribucion(datos);
    inicializarGraficoProgramacion(programacion);
}

function inicializarGraficoDistribucion(datos) {
    destruirGrafico(chartTotalGeneral);
    chartTotalGeneral = null;

    setTimeout(() => {
        const canvas = document.getElementById('chartTotalGeneral');
        if (!canvas || datos.length === 0) return;

        const distribucion = calcularDistribucion(datos);
        const total = datos.length;

        const datosGrafico = Object.entries(distribucion)
            .filter(([, cant]) => cant > 0)
            .sort(([a], [b]) => compararEstados(a, b))
            .map(([estado, cant]) => ({
                label: estado,
                value: cant,
                color: getColor(estado)
            }));

        if (datosGrafico.length === 0) return;

        destruirGraficoCanvas(canvas);
        const ctx = canvas.getContext('2d');

        chartTotalGeneral = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: datosGrafico.map(d => d.label),
                datasets: [{
                    data: datosGrafico.map(d => d.value),
                    backgroundColor: datosGrafico.map(d => d.color),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: 10 },
                animation: { duration: 600, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        padding: 12,
                        titleFont: { size: 13, weight: '600' },
                        bodyFont: { size: 12 },
                        cornerRadius: 8,
                        displayColors: true,
                        boxPadding: 6,
                        callbacks: {
                            label: ctx => {
                                const val = ctx.parsed || 0;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${val} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '68%',
                onHover: (e, els) => {
                    if (e.native?.target) {
                        e.native.target.style.cursor = els.length ? 'pointer' : 'default';
                    }
                },
                onClick: (_, els) => {
                    if (els.length > 0) {
                        const estado = datosGrafico[els[0].index]?.label;
                        if (estado) {
                            const filtrados = obtenerDatosFiltrados().filter(d => d.Estado === estado);
                            mostrarVistaItems(estado, filtrados);
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                beforeDraw: chart => {
                    if (!chart.chartArea?.left) return;
                    const { left, right, top, bottom } = chart.chartArea;
                    const cx = left + (right - left) / 2;
                    const cy = top + (bottom - top) / 2;
                    const ctx = chart.ctx;

                    ctx.save();
                    ctx.font = 'bold 1.75rem Inter, sans-serif';
                    ctx.fillStyle = '#1e293b';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(total.toString(), cx, cy - 6);
                    ctx.font = '500 0.7rem Inter, sans-serif';
                    ctx.fillStyle = '#64748b';
                    ctx.fillText('Preguntas', cx, cy + 14);
                    ctx.restore();
                }
            }]
        });
    }, 150);
}

function inicializarGraficoProgramacion(data) {
    destruirGrafico(chartProgramacion);
    chartProgramacion = null;

    if (!data?.labels?.length || !data?.datasets?.length) return;

    const canvas = document.getElementById('chartProgramacion');
    if (!canvas) return;

    setTimeout(() => {
        destruirGraficoCanvas(canvas);
        const ctx = canvas.getContext('2d');

        chartProgramacion = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: data.datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'rectRounded',
                            padding: 16,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y || 0}`
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 20 }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { precision: 0, font: { size: 10 } }
                    }
                }
            }
        });
    }, 200);
}

function prepararProgramacion(datos) {
    const estadosProg = ['En elaboración', 'En revisor técnico', 'Con observaciones', 'En cartografía', 'En editorial'];
    const { claves, fechas, etiquetas } = getProgramacionConfig();
    const agrupado = {};

    fechas.forEach(({ clave, etiqueta }) => {
        agrupado[clave] = { displayLabel: etiqueta || formatearFechaCorta(clave), total: 0 };
        estadosProg.forEach(e => agrupado[clave][e] = 0);
    });

    const fechasControl = claves.map(c => ({ clave: c, fecha: parseFechaFlexible(c) })).filter(x => x.fecha);

    datos.forEach(item => {
        if (!estadosProg.includes(item.Estado) || !item.FechaEntrega) return;
        const fechaEntrega = parseFechaFlexible(item.FechaEntrega);
        if (!fechaEntrega) return;

        let semana = null;
        for (const fc of fechasControl) {
            if (fechaEntrega <= fc.fecha) {
                semana = fc.clave;
                break;
            }
        }
        if (!semana && fechasControl.length) {
            semana = fechasControl[fechasControl.length - 1].clave;
        }

        if (semana && agrupado[semana]) {
            agrupado[semana].total++;
            agrupado[semana][item.Estado]++;
        }
    });

    const llavesOrd = claves.filter(Boolean);
    let estadosConDatos = estadosProg.filter(e => llavesOrd.some(k => (agrupado[k]?.[e] || 0) > 0));
    if (!estadosConDatos.length) estadosConDatos = [...estadosProg];

    if (!llavesOrd.length) return { labels: [], datasets: [], tabla: [], estados: [] };

    const labels = llavesOrd.map(k => agrupado[k]?.displayLabel || etiquetas[k] || formatearFechaCorta(k));

    const datasets = estadosConDatos.map(e => ({
        label: e,
        data: llavesOrd.map(k => agrupado[k]?.[e] || 0),
        backgroundColor: getColor(e) + 'CC',
        borderColor: '#ffffff',
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 40
    }));

    const tabla = llavesOrd.map(k => ({
        fecha: agrupado[k]?.displayLabel || etiquetas[k] || formatearFechaCorta(k),
        valores: estadosConDatos.map(e => agrupado[k]?.[e] || 0)
    }));

    return { labels, datasets, tabla, estados: estadosConDatos };
}

// ============================================
// EVENTOS
// ============================================

function conectarEventos() {
    // Click en leyenda de distribución
    document.querySelectorAll('.legend-row.clickable').forEach(row => {
        row.addEventListener('click', () => {
            const estado = row.dataset.estado;
            const filtrados = obtenerDatosFiltrados().filter(d => d.Estado === estado);
            mostrarVistaItems(estado, filtrados);
        });
    });

    // Click en alertas
    document.querySelectorAll('.alert-item').forEach(item => {
        item.addEventListener('click', () => {
            const correlativosStr = item.dataset.items;
            if (correlativosStr) {
                try {
                    const correlativos = JSON.parse(correlativosStr);
                    const datos = obtenerDatosFiltrados();
                    const filtrados = datos.filter(d => correlativos.includes(d.Correlativo));
                    const titulo = item.querySelector('.alert-title')?.textContent || 'Alertas';
                    mostrarVistaItems(titulo, filtrados);
                } catch (e) { /* ignore */ }
            }
        });
    });

    // Botón copiar resumen
    const btnCopiar = document.getElementById('btnCopiarResumen');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', copiarResumenAlPortapapeles);
    }

    // Botón imprimir
    const btnImprimir = document.getElementById('btnImprimirDashboard');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', generarInformePDF);
    }
}

// ============================================
// GENERACIÓN DE INFORME PDF PROFESIONAL
// ============================================

function generarInformePDF() {
    const datos = obtenerDatosFiltrados();
    if (datos.length === 0) {
        alert('No hay datos para generar el informe');
        return;
    }

    const kpis = calcularKPIs(datos);
    const distribucion = calcularDistribucion(datos);
    const responsables = calcularResponsables(datos);
    const tematicas = calcularTematicas(datos);
    const alertas = calcularAlertas(datos);

    // Obtener fecha del último reporte
    let ultimaFecha = null;
    datos.forEach(d => {
        if (d.FechaReporte) {
            const fecha = parseFechaFlexible(d.FechaReporte);
            if (fecha && (!ultimaFecha || fecha > ultimaFecha)) {
                ultimaFecha = fecha;
            }
        }
    });

    const fechaReporte = ultimaFecha 
        ? formatearFechaCorta(ultimaFecha.toISOString().split('T')[0])
        : new Date().toLocaleDateString('es-CL');

    // ======== GRÁFICO DE DONA CSS - Distribución ========
    const distribucionGrafico = generarGraficoDonaCSS(distribucion, datos.length);

    // ======== GRÁFICO DE BARRAS HORIZONTALES - Estados ========
    const barrasEstadosHTML = generarGraficoBarrasEstados(distribucion, datos.length);

    // Generar tabla de responsables CON GRÁFICO
    const responsablesHTML = generarTablaResponsablesConGrafico(responsables);

    // Generar tabla de temáticas CON GRÁFICO
    const tematicasHTML = generarTablaTematicasConGrafico(tematicas);

    // Generar alertas
    const alertasHTML = alertas.length > 0 
        ? alertas.map(a => {
            const colorMap = {
                'danger': { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' },
                'warning': { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
                'info': { bg: '#e0f2fe', border: '#0284c7', text: '#075985' },
                'muted': { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' }
            };
            const colors = colorMap[a.tipo] || colorMap.muted;
            return `
                <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 12px 16px; margin-bottom: 10px; border-radius: 4px;">
                    <div style="font-weight: 600; color: ${colors.text}; margin-bottom: 4px;">${a.titulo}</div>
                    <div style="font-size: 12px; color: ${colors.text};">${a.descripcion}</div>
                </div>
            `;
        }).join('')
        : '<div style="padding: 16px; text-align: center; color: #059669; background: #d1fae5; border-radius: 6px;"><strong>✓ Sin alertas críticas</strong></div>';

    // Calcular porcentajes para barra de progreso
    const pctIncorporadas = datos.length > 0 ? (kpis.incorporadas / datos.length) * 100 : 0;
    const pctEditorial = datos.length > 0 ? (kpis.enEditorial / datos.length) * 100 : 0;
    const pctProceso = 100 - pctIncorporadas - pctEditorial;

    // ======== DATOS DE EVOLUCIÓN CON GRÁFICO ========
    const evolucionData = prepararDatosEvolucion();
    const evolucionHTML = generarGraficoEvolucion(evolucionData);

    // ======== DATOS DE SUBCONTRATOS CON GRÁFICO ========
    const subcontratosData = prepararDatosSubcontratos(datos);
    const subcontratosHTML = generarGraficoSubcontratos(subcontratosData);

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    
    printWindow.document.write(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Control ADE - ${fechaReporte}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page {
            size: A4;
            margin: 15mm 12mm;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #1e293b;
            background: white;
            padding: 0;
        }
        
        .report-container {
            max-width: 100%;
            margin: 0 auto;
        }
        
        /* Header del informe */
        .report-header {
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
            color: white;
            padding: 24px 28px;
            margin-bottom: 24px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .report-header h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        
        .report-header .subtitle {
            font-size: 13px;
            opacity: 0.9;
        }
        
        .report-header .date-badge {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
        }
        
        /* Resumen ejecutivo */
        .executive-summary {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px 24px;
            margin-bottom: 24px;
        }
        
        .summary-title {
            font-size: 14px;
            font-weight: 700;
            color: #1a365d;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #3182ce;
            display: inline-block;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        
        .summary-item {
            text-align: center;
            padding: 16px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .summary-item.highlight {
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
            color: white;
            border: none;
        }
        
        .summary-value {
            font-size: 28px;
            font-weight: 700;
            display: block;
            margin-bottom: 4px;
        }
        
        .summary-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
        }
        
        /* Barra de progreso */
        .progress-section {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        
        .progress-bar-container {
            background: #e2e8f0;
            height: 24px;
            border-radius: 12px;
            overflow: hidden;
            display: flex;
            margin-bottom: 12px;
        }
        
        .progress-segment {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
            color: white;
        }
        
        .progress-segment.success { background: #059669; }
        .progress-segment.purple { background: #8b5cf6; }
        .progress-segment.neutral { background: #94a3b8; }
        
        .progress-legend {
            display: flex;
            justify-content: center;
            gap: 24px;
            font-size: 11px;
        }
        
        .progress-legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        
        /* KPIs Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        
        .kpi-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
            text-align: center;
        }
        
        .kpi-card.success { border-left: 4px solid #059669; }
        .kpi-card.purple { border-left: 4px solid #8b5cf6; }
        .kpi-card.info { border-left: 4px solid #0284c7; }
        .kpi-card.danger { border-left: 4px solid #dc2626; }
        .kpi-card.warning { border-left: 4px solid #d97706; }
        .kpi-card.neutral { border-left: 4px solid #94a3b8; }
        
        .kpi-value {
            font-size: 22px;
            font-weight: 700;
            color: #1e293b;
            display: block;
        }
        
        .kpi-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        /* Secciones */
        .section {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #1a365d;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 2px solid #3182ce;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Tablas */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        
        th {
            background: #1a365d;
            color: white;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        th:not(:first-child) {
            text-align: center;
        }
        
        tr:nth-child(even) {
            background: #f8fafc;
        }
        
        /* Grid de dos columnas */
        .two-column-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
        }
        
        /* Footer */
        .report-footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
        }
        
        /* Page break */
        .page-break {
            page-break-before: always;
        }
        
        /* Gráficos CSS */
        .charts-section {
            margin-bottom: 24px;
        }
        
        .chart-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 16px;
        }
        
        .chart-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
        }
        
        /* Gráfico de Dona CSS */
        .donut-chart {
            position: relative;
            width: 160px;
            height: 160px;
            margin: 0 auto 16px;
        }
        
        .donut-ring {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            position: relative;
        }
        
        .donut-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90px;
            height: 90px;
            background: white;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .donut-value {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
        }
        
        .donut-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
        }
        
        .donut-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
        }
        
        .donut-legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            padding: 4px 8px;
            background: white;
            border-radius: 4px;
        }
        
        .donut-legend-color {
            width: 10px;
            height: 10px;
            border-radius: 2px;
        }
        
        /* Barras Horizontales */
        .bar-chart {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .bar-item {
            display: grid;
            grid-template-columns: 100px 1fr 50px;
            align-items: center;
            gap: 10px;
        }
        
        .bar-label {
            font-size: 10px;
            font-weight: 500;
            color: #475569;
            text-align: right;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .bar-track {
            height: 20px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }
        
        .bar-fill {
            height: 100%;
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding-left: 6px;
            font-size: 9px;
            font-weight: 600;
            color: white;
            min-width: 24px;
        }
        
        .bar-value {
            font-size: 11px;
            font-weight: 600;
            color: #1e293b;
            text-align: right;
        }
        
        /* Gráfico de Evolución */
        .evolution-chart {
            display: flex;
            align-items: flex-end;
            gap: 4px;
            height: 140px;
            padding: 10px 0;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 12px;
        }
        
        .evolution-bar {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
        }
        
        .evolution-bar-stack {
            width: 100%;
            max-width: 40px;
            display: flex;
            flex-direction: column;
            border-radius: 4px 4px 0 0;
            overflow: hidden;
        }
        
        .evolution-segment {
            width: 100%;
        }
        
        .evolution-label {
            font-size: 8px;
            color: #64748b;
            margin-top: 6px;
            text-align: center;
            transform: rotate(-45deg);
            white-space: nowrap;
        }
        
        .evolution-legend {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 8px;
        }
        
        .evolution-legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
        }
        
        .evolution-legend-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
        }
        
        /* Responsables Visual */
        .responsable-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        
        .responsable-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
        }
        
        .responsable-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .responsable-name {
            font-weight: 600;
            font-size: 12px;
            color: #1e293b;
        }
        
        .responsable-badge {
            font-size: 10px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
            background: #dbeafe;
            color: #1e40af;
        }
        
        .responsable-stats {
            display: flex;
            gap: 12px;
            margin-bottom: 10px;
        }
        
        .responsable-stat {
            text-align: center;
        }
        
        .responsable-stat-value {
            font-size: 16px;
            font-weight: 700;
            display: block;
        }
        
        .responsable-stat-label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
        }
        
        .responsable-progress {
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            display: flex;
        }
        
        .responsable-progress-fill {
            height: 100%;
        }
        
        /* Temáticas Visual */
        .tematica-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        
        .tematica-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
        }
        
        .tematica-name {
            font-size: 10px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .tematica-mini-chart {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .tematica-progress {
            flex: 1;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
            display: flex;
        }
        
        .tematica-pct {
            font-size: 11px;
            font-weight: 700;
            color: #059669;
            min-width: 35px;
            text-align: right;
        }
        
        /* Subcontratos Visual */
        .subcontrato-visual {
            margin-bottom: 20px;
        }
        
        .subcontrato-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
        }
        
        .subcontrato-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .subcontrato-name {
            font-weight: 700;
            font-size: 13px;
            color: #1e293b;
        }
        
        .subcontrato-pct {
            font-size: 18px;
            font-weight: 700;
            color: #059669;
        }
        
        .subcontrato-bar {
            height: 24px;
            background: #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            display: flex;
            margin-bottom: 12px;
        }
        
        .subcontrato-segment {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 600;
            color: white;
        }
        
        .subcontrato-stats {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            text-align: center;
        }
        
        .subcontrato-stat {
            padding: 8px;
            background: white;
            border-radius: 4px;
        }
        
        .subcontrato-stat-value {
            font-size: 14px;
            font-weight: 700;
            display: block;
        }
        
        .subcontrato-stat-label {
            font-size: 8px;
            color: #64748b;
            text-transform: uppercase;
        }
        
        /* Page Header */
        .page-header {
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .page-header h2 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }
        
        .page-date {
            font-size: 11px;
            opacity: 0.9;
        }
        
        .alerts-section {
            max-height: none;
        }
        
        @media print {
            body { 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .report-header {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .summary-item.highlight,
            th,
            .progress-segment {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <div class="report-header">
            <div>
                <h1>📊 Informe de Control ADE</h1>
                <div class="subtitle">Reporte de Estado y Avance del Proyecto</div>
            </div>
            <div class="date-badge">
                📅 ${fechaReporte}
            </div>
        </div>
        
        <!-- Resumen Ejecutivo -->
        <div class="executive-summary">
            <div class="summary-title">📋 Resumen Ejecutivo</div>
            <div class="summary-grid">
                <div class="summary-item highlight">
                    <span class="summary-value">${kpis.porcentajeAvance}%</span>
                    <span class="summary-label">Avance Global</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value" style="color: #059669;">${kpis.incorporadas}</span>
                    <span class="summary-label">Incorporadas</span>
                </div>
                <div class="summary-item">
                    <span class="summary-value" style="color: #8b5cf6;">${kpis.enEditorial}</span>
                    <span class="summary-label">En Editorial</span>
                </div>
            </div>
        </div>
        
        <!-- Barra de Progreso -->
        <div class="progress-section">
            <div class="progress-bar-container">
                <div class="progress-segment success" style="width: ${pctIncorporadas}%">${pctIncorporadas > 8 ? pctIncorporadas.toFixed(1) + '%' : ''}</div>
                <div class="progress-segment purple" style="width: ${pctEditorial}%">${pctEditorial > 8 ? pctEditorial.toFixed(1) + '%' : ''}</div>
                <div class="progress-segment neutral" style="width: ${pctProceso}%">${pctProceso > 8 ? pctProceso.toFixed(1) + '%' : ''}</div>
            </div>
            <div class="progress-legend">
                <div class="progress-legend-item">
                    <span class="legend-dot" style="background: #059669;"></span>
                    <span>Incorporadas (${pctIncorporadas.toFixed(1)}%)</span>
                </div>
                <div class="progress-legend-item">
                    <span class="legend-dot" style="background: #8b5cf6;"></span>
                    <span>En Editorial (${pctEditorial.toFixed(1)}%)</span>
                </div>
                <div class="progress-legend-item">
                    <span class="legend-dot" style="background: #94a3b8;"></span>
                    <span>En Proceso (${pctProceso.toFixed(1)}%)</span>
                </div>
            </div>
        </div>
        
        <!-- KPIs -->
        <div class="kpi-grid">
            <div class="kpi-card success">
                <span class="kpi-value">${kpis.incorporadas}</span>
                <span class="kpi-label">Incorporadas</span>
            </div>
            <div class="kpi-card purple">
                <span class="kpi-value">${kpis.enEditorial}</span>
                <span class="kpi-label">En Editorial</span>
            </div>
            <div class="kpi-card info">
                <span class="kpi-value">${kpis.enProceso}</span>
                <span class="kpi-label">En Proceso</span>
            </div>
            <div class="kpi-card ${kpis.atrasos > 0 ? 'danger' : 'neutral'}">
                <span class="kpi-value">${kpis.atrasos}</span>
                <span class="kpi-label">Atrasos</span>
            </div>
            <div class="kpi-card ${kpis.porVencer > 0 ? 'warning' : 'neutral'}">
                <span class="kpi-value">${kpis.porVencer}</span>
                <span class="kpi-label">Por Vencer</span>
            </div>
            <div class="kpi-card neutral">
                <span class="kpi-value">${kpis.total}</span>
                <span class="kpi-label">Total</span>
            </div>
        </div>
        
        <!-- Sección de Gráficos Principal -->
        <div class="charts-section">
            <div class="section-title">📊 Distribución por Estado</div>
            <div class="chart-row">
                <!-- Gráfico de Dona -->
                <div class="chart-box">
                    ${distribucionGrafico}
                </div>
                <!-- Gráfico de Barras Horizontales -->
                <div class="chart-box">
                    ${barrasEstadosHTML}
                </div>
            </div>
        </div>
        
        <!-- Alertas -->
        <div class="section alerts-section">
            <div class="section-title">⚠️ Alertas y Atención</div>
            ${alertasHTML}
        </div>
        
        <!-- Responsables con Gráfico Visual -->
        <div class="section">
            <div class="section-title">👥 Carga por Responsable</div>
            ${responsablesHTML}
        </div>
        
        <!-- PÁGINA 2: Evolución y Subcontratos -->
        <div class="page-break"></div>
        
        <!-- Header Página 2 -->
        <div class="page-header">
            <h2>📈 Evolución y Estado de Subcontratos</h2>
            <span class="page-date">${fechaReporte}</span>
        </div>
        
        <!-- Gráfico de Evolución Temporal -->
        <div class="section">
            <div class="section-title">📈 Evolución Temporal</div>
            <p style="font-size: 11px; color: #64748b; margin-bottom: 16px;">Histórico de avance por fecha de reporte</p>
            ${evolucionHTML}
        </div>
        
        <!-- Temáticas con Gráfico -->
        <div class="section">
            <div class="section-title">📑 Avance por Temática</div>
            ${tematicasHTML}
        </div>
        
        <!-- PÁGINA 3: Subcontratos -->
        <div class="page-break"></div>
        
        <!-- Header Página 3 -->
        <div class="page-header">
            <h2>🏢 Estado de Subcontratos</h2>
            <span class="page-date">${fechaReporte}</span>
        </div>
        
        <!-- Estado de Subcontratos con Gráfico -->
        <div class="section">
            ${subcontratosHTML}
        </div>
        
        <!-- Footer -->
        <div class="report-footer">
            <div>
                <strong>Control ADE</strong> - Sistema de Gestión de Preguntas
            </div>
            <div>
                Generado: ${new Date().toLocaleString('es-CL')}
            </div>
        </div>
    </div>
    
    <script>
        // Auto-imprimir cuando cargue
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
    `);
    
    printWindow.document.close();
}

// ============================================
// FUNCIONES AUXILIARES PARA EL REPORTE PDF
// ============================================

// Gráfico de Dona CSS
function generarGraficoDonaCSS(distribucion, total) {
    const items = Object.entries(distribucion)
        .filter(([, cant]) => cant > 0)
        .sort(([a], [b]) => compararEstados(a, b));
    
    if (items.length === 0) {
        return '<div style="text-align: center; color: #64748b;">Sin datos</div>';
    }

    // Calcular grados para conic-gradient
    let acumulado = 0;
    const segmentos = items.map(([estado, cant]) => {
        const pct = (cant / total) * 100;
        const inicio = acumulado;
        acumulado += pct;
        return { estado, cant, pct, inicio, fin: acumulado, color: getColor(estado) };
    });

    const gradientParts = segmentos.map(s => 
        `${s.color} ${s.inicio}% ${s.fin}%`
    ).join(', ');

    const leyenda = segmentos.map(s => `
        <div class="donut-legend-item">
            <span class="donut-legend-color" style="background: ${s.color};"></span>
            <span>${s.cant}</span>
        </div>
    `).join('');

    return `
        <div class="donut-chart">
            <div class="donut-ring" style="background: conic-gradient(${gradientParts});">
                <div class="donut-center">
                    <span class="donut-value">${total}</span>
                    <span class="donut-label">Total</span>
                </div>
            </div>
        </div>
        <div class="donut-legend">${leyenda}</div>
    `;
}

// Gráfico de Barras Horizontales
function generarGraficoBarrasEstados(distribucion, total) {
    const items = Object.entries(distribucion)
        .filter(([, cant]) => cant > 0)
        .sort(([a], [b]) => compararEstados(a, b));
    
    if (items.length === 0) {
        return '<div style="text-align: center; color: #64748b;">Sin datos</div>';
    }

    const maxCant = Math.max(...items.map(([, cant]) => cant));

    const barras = items.map(([estado, cant]) => {
        const pct = (cant / maxCant) * 100;
        const pctTotal = ((cant / total) * 100).toFixed(1);
        const color = getColor(estado);
        return `
            <div class="bar-item">
                <span class="bar-label">${estado}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${pct}%; background: ${color};">
                        ${pct > 20 ? cant : ''}
                    </div>
                </div>
                <span class="bar-value">${pctTotal}%</span>
            </div>
        `;
    }).join('');

    return `<div class="bar-chart">${barras}</div>`;
}

// Tabla de Responsables con Gráfico Visual
function generarTablaResponsablesConGrafico(responsables) {
    if (responsables.length === 0) {
        return '<div style="padding: 16px; text-align: center; color: #64748b;">Sin datos de responsables</div>';
    }

    const cards = responsables.slice(0, 8).map(r => {
        const avanceTotal = r.incorporadas + r.enEditorial + r.enProceso;
        const pctAvance = r.total > 0 ? Math.round((avanceTotal / r.total) * 100) : 0;
        const pctInc = r.total > 0 ? (r.incorporadas / r.total) * 100 : 0;
        const pctEdit = r.total > 0 ? (r.enEditorial / r.total) * 100 : 0;
        const pctProc = r.total > 0 ? (r.enProceso / r.total) * 100 : 0;

        return `
            <div class="responsable-card">
                <div class="responsable-header">
                    <span class="responsable-name">${r.nombre}</span>
                    <span class="responsable-badge">${r.total} items</span>
                </div>
                <div class="responsable-stats">
                    <div class="responsable-stat">
                        <span class="responsable-stat-value" style="color: #059669;">${r.incorporadas}</span>
                        <span class="responsable-stat-label">Incorp.</span>
                    </div>
                    <div class="responsable-stat">
                        <span class="responsable-stat-value" style="color: #8b5cf6;">${r.enEditorial}</span>
                        <span class="responsable-stat-label">Editorial</span>
                    </div>
                    <div class="responsable-stat">
                        <span class="responsable-stat-value" style="color: #0284c7;">${r.enProceso}</span>
                        <span class="responsable-stat-label">Proceso</span>
                    </div>
                    <div class="responsable-stat">
                        <span class="responsable-stat-value" style="color: ${r.atrasos > 0 ? '#dc2626' : '#64748b'};">${r.atrasos}</span>
                        <span class="responsable-stat-label">Atrasos</span>
                    </div>
                </div>
                <div class="responsable-progress">
                    <div class="responsable-progress-fill" style="width: ${pctInc}%; background: #059669;"></div>
                    <div class="responsable-progress-fill" style="width: ${pctEdit}%; background: #8b5cf6;"></div>
                    <div class="responsable-progress-fill" style="width: ${pctProc}%; background: #0284c7;"></div>
                </div>
            </div>
        `;
    }).join('');

    return `<div class="responsable-grid">${cards}</div>`;
}

// Tabla de Temáticas con Gráfico Visual
function generarTablaTematicasConGrafico(tematicas) {
    if (tematicas.length === 0) {
        return '<div style="padding: 16px; text-align: center; color: #64748b;">Sin datos de temáticas</div>';
    }

    const cards = tematicas.slice(0, 12).map(t => {
        const pctIncorp = t.total > 0 ? (t.incorporadas / t.total) * 100 : 0;
        const pctEdit = t.total > 0 ? (t.enEditorial / t.total) * 100 : 0;
        const pctAvance = pctIncorp + pctEdit;

        return `
            <div class="tematica-card">
                <div class="tematica-name" title="${t.nombre}">${t.nombre}</div>
                <div class="tematica-mini-chart">
                    <div class="tematica-progress">
                        <div style="width: ${pctIncorp}%; height: 100%; background: #059669;"></div>
                        <div style="width: ${pctEdit}%; height: 100%; background: #8b5cf6;"></div>
                    </div>
                    <span class="tematica-pct">${pctAvance.toFixed(0)}%</span>
                </div>
                <div style="font-size: 9px; color: #64748b; margin-top: 4px;">${t.incorporadas}/${t.total} incorp.</div>
            </div>
        `;
    }).join('');

    return `<div class="tematica-grid">${cards}</div>`;
}

function prepararDatosEvolucion() {
    const todosLosDatos = obtenerTodosLosReportes();
    if (todosLosDatos.length === 0) return [];

    const porFecha = {};
    todosLosDatos.forEach(d => {
        const fecha = d.FechaReporte || 'Sin fecha';
        if (!porFecha[fecha]) {
            porFecha[fecha] = { 
                fecha, 
                total: 0, 
                incorporadas: 0, 
                enEditorial: 0,
                enProceso: 0 
            };
        }
        porFecha[fecha].total++;
        
        if (d.Estado === 'Incorporada') {
            porFecha[fecha].incorporadas++;
        } else if (d.Estado === 'En editorial') {
            porFecha[fecha].enEditorial++;
        } else {
            porFecha[fecha].enProceso++;
        }
    });

    // Ordenar por fecha
    return Object.values(porFecha).sort((a, b) => {
        const fechaA = parseFechaFlexible(a.fecha);
        const fechaB = parseFechaFlexible(b.fecha);
        if (fechaA && fechaB) return fechaA - fechaB;
        return a.fecha.localeCompare(b.fecha);
    });
}

// Gráfico de Evolución Temporal con barras apiladas
function generarGraficoEvolucion(evolucionData) {
    if (evolucionData.length === 0) {
        return '<div style="padding: 16px; text-align: center; color: #64748b; background: #f1f5f9; border-radius: 6px;">No hay datos de evolución disponibles</div>';
    }

    const maxTotal = Math.max(...evolucionData.map(d => d.total));

    const barras = evolucionData.map(item => {
        const alturaTotal = (item.total / maxTotal) * 100;
        const pctInc = item.total > 0 ? (item.incorporadas / item.total) * alturaTotal : 0;
        const pctEdit = item.total > 0 ? (item.enEditorial / item.total) * alturaTotal : 0;
        const pctProc = item.total > 0 ? (item.enProceso / item.total) * alturaTotal : 0;
        const fechaCorta = formatearFechaParaMostrar(item.fecha, item.fecha).split(' ')[0];

        return `
            <div class="evolution-bar">
                <div class="evolution-bar-stack" style="height: ${alturaTotal}%;">
                    <div class="evolution-segment" style="height: ${pctProc}%; background: #94a3b8;"></div>
                    <div class="evolution-segment" style="height: ${pctEdit}%; background: #8b5cf6;"></div>
                    <div class="evolution-segment" style="height: ${pctInc}%; background: #059669;"></div>
                </div>
                <span class="evolution-label">${fechaCorta}</span>
            </div>
        `;
    }).join('');

    // Tabla complementaria
    const tabla = evolucionData.map(item => {
        const listos = item.incorporadas + item.enEditorial;
        const pctAvance = item.total > 0 ? ((listos / item.total) * 100).toFixed(1) : 0;
        const fechaFormateada = formatearFechaParaMostrar(item.fecha, item.fecha);
        
        return `
            <tr>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${fechaFormateada}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 10px;">${item.total}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #059669; font-weight: 600;">${item.incorporadas}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #8b5cf6;">${item.enEditorial}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 10px;">${item.enProceso}</td>
                <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${pctAvance}%; height: 100%; background: linear-gradient(90deg, #059669, #10b981);"></div>
                        </div>
                        <span style="font-weight: 600; font-size: 10px; min-width: 35px;">${pctAvance}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="evolution-chart">${barras}</div>
        <div class="evolution-legend">
            <div class="evolution-legend-item">
                <span class="evolution-legend-color" style="background: #059669;"></span>
                <span>Incorporadas</span>
            </div>
            <div class="evolution-legend-item">
                <span class="evolution-legend-color" style="background: #8b5cf6;"></span>
                <span>En Editorial</span>
            </div>
            <div class="evolution-legend-item">
                <span class="evolution-legend-color" style="background: #94a3b8;"></span>
                <span>En Proceso</span>
            </div>
        </div>
        <table style="margin-top: 16px;">
            <thead>
                <tr>
                    <th style="font-size: 9px;">Fecha</th>
                    <th style="font-size: 9px;">Total</th>
                    <th style="font-size: 9px;">Incorp.</th>
                    <th style="font-size: 9px;">Edit.</th>
                    <th style="font-size: 9px;">Proceso</th>
                    <th style="font-size: 9px;">Avance</th>
                </tr>
            </thead>
            <tbody>${tabla}</tbody>
        </table>
    `;
}

function prepararDatosSubcontratos(datos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const porSubcontrato = {};
    
    const estadosEnProceso = ['En revisor técnico', 'En cartografía', 'En coordinador', 'En elaboración cartografía'];

    datos.forEach(d => {
        const sub = d.Subcontrato || 'Sin subcontrato';
        if (!porSubcontrato[sub]) {
            porSubcontrato[sub] = {
                nombre: sub,
                total: 0,
                incorporadas: 0,
                enEditorial: 0,
                enProceso: 0,
                enElaboracion: 0,
                conObservaciones: 0,
                atrasos: 0
            };
        }
        porSubcontrato[sub].total++;

        const estado = d.Estado || 'Sin estado';
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

        // Atrasos
        if (d.FechaEntrega && d.Estado === 'En elaboración') {
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            if (fechaEntrega < hoy) {
                porSubcontrato[sub].atrasos++;
            }
        }
    });

    return Object.values(porSubcontrato).sort((a, b) => b.total - a.total);
}

// Gráfico Visual de Subcontratos
function generarGraficoSubcontratos(subcontratosData) {
    if (subcontratosData.length === 0) {
        return '<div style="padding: 16px; text-align: center; color: #64748b; background: #f1f5f9; border-radius: 6px;">No hay datos de subcontratos disponibles</div>';
    }

    // Calcular totales
    const totales = subcontratosData.reduce((acc, sub) => {
        acc.total += sub.total;
        acc.incorporadas += sub.incorporadas;
        acc.enEditorial += sub.enEditorial;
        acc.enProceso += sub.enProceso;
        acc.enElaboracion += sub.enElaboracion;
        acc.atrasos += sub.atrasos;
        return acc;
    }, { total: 0, incorporadas: 0, enEditorial: 0, enProceso: 0, enElaboracion: 0, atrasos: 0 });

    const totalAvance = totales.incorporadas + totales.enEditorial + totales.enProceso;
    const pctTotalAvance = totales.total > 0 ? ((totalAvance / totales.total) * 100).toFixed(1) : 0;

    // KPIs de Subcontratos
    const kpisHTML = `
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px;">
            <div style="background: linear-gradient(135deg, #1a365d, #2c5282); color: white; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 28px; font-weight: 700;">${subcontratosData.length}</div>
                <div style="font-size: 10px; opacity: 0.9; text-transform: uppercase;">Subcontratos</div>
            </div>
            <div style="background: white; border: 2px solid #059669; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: #059669;">${totales.incorporadas}</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Incorporadas</div>
            </div>
            <div style="background: white; border: 2px solid #8b5cf6; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: #8b5cf6;">${totales.enEditorial}</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">En Editorial</div>
            </div>
            <div style="background: white; border: 2px solid #0284c7; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: #0284c7;">${totales.enProceso}</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">En Proceso</div>
            </div>
            <div style="background: white; border: 2px solid ${totales.atrasos > 0 ? '#dc2626' : '#e2e8f0'}; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: ${totales.atrasos > 0 ? '#dc2626' : '#64748b'};">${totales.atrasos}</div>
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Atrasos</div>
            </div>
        </div>
    `;

    // Tarjetas visuales de cada subcontrato
    const cards = subcontratosData.map(sub => {
        const avance = sub.incorporadas + sub.enEditorial + sub.enProceso;
        const pctAvance = sub.total > 0 ? Math.round((avance / sub.total) * 100) : 0;
        const pctInc = sub.total > 0 ? (sub.incorporadas / sub.total) * 100 : 0;
        const pctEdit = sub.total > 0 ? (sub.enEditorial / sub.total) * 100 : 0;
        const pctProc = sub.total > 0 ? (sub.enProceso / sub.total) * 100 : 0;
        const pctElab = sub.total > 0 ? (sub.enElaboracion / sub.total) * 100 : 0;

        return `
            <div class="subcontrato-card">
                <div class="subcontrato-header">
                    <span class="subcontrato-name">${sub.nombre}</span>
                    <span class="subcontrato-pct">${pctAvance}%</span>
                </div>
                <div class="subcontrato-bar">
                    <div class="subcontrato-segment" style="width: ${pctInc}%; background: #059669;">${pctInc > 10 ? sub.incorporadas : ''}</div>
                    <div class="subcontrato-segment" style="width: ${pctEdit}%; background: #8b5cf6;">${pctEdit > 10 ? sub.enEditorial : ''}</div>
                    <div class="subcontrato-segment" style="width: ${pctProc}%; background: #0284c7;">${pctProc > 10 ? sub.enProceso : ''}</div>
                    <div class="subcontrato-segment" style="width: ${pctElab}%; background: #d97706;">${pctElab > 10 ? sub.enElaboracion : ''}</div>
                </div>
                <div class="subcontrato-stats">
                    <div class="subcontrato-stat">
                        <span class="subcontrato-stat-value">${sub.total}</span>
                        <span class="subcontrato-stat-label">Total</span>
                    </div>
                    <div class="subcontrato-stat">
                        <span class="subcontrato-stat-value" style="color: #059669;">${sub.incorporadas}</span>
                        <span class="subcontrato-stat-label">Incorp.</span>
                    </div>
                    <div class="subcontrato-stat">
                        <span class="subcontrato-stat-value" style="color: #8b5cf6;">${sub.enEditorial}</span>
                        <span class="subcontrato-stat-label">Editorial</span>
                    </div>
                    <div class="subcontrato-stat">
                        <span class="subcontrato-stat-value" style="color: #0284c7;">${sub.enProceso}</span>
                        <span class="subcontrato-stat-label">Proceso</span>
                    </div>
                    <div class="subcontrato-stat">
                        <span class="subcontrato-stat-value" style="color: #d97706;">${sub.enElaboracion}</span>
                        <span class="subcontrato-stat-label">Elabor.</span>
                    </div>
                    <div class="subcontrato-stat">
                        <span class="subcontrato-stat-value" style="color: ${sub.atrasos > 0 ? '#dc2626' : '#64748b'};">${sub.atrasos}</span>
                        <span class="subcontrato-stat-label">Atrasos</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Leyenda
    const leyendaHTML = `
        <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 14px; height: 14px; background: #059669; border-radius: 3px;"></span>
                <span style="font-size: 11px;">Incorporadas</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 14px; height: 14px; background: #8b5cf6; border-radius: 3px;"></span>
                <span style="font-size: 11px;">En Editorial</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 14px; height: 14px; background: #0284c7; border-radius: 3px;"></span>
                <span style="font-size: 11px;">En Proceso</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 14px; height: 14px; background: #d97706; border-radius: 3px;"></span>
                <span style="font-size: 11px;">En Elaboración</span>
            </div>
        </div>
    `;

    return `
        ${kpisHTML}
        ${leyendaHTML}
        <div class="subcontrato-visual">
            ${cards}
        </div>
        <div style="background: linear-gradient(135deg, #1a365d, #2c5282); color: white; padding: 16px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 12px; opacity: 0.9;">Avance Total del Proyecto</div>
                <div style="font-size: 10px; opacity: 0.7;">${totales.incorporadas + totales.enEditorial} listos para cierre de ${totales.total}</div>
            </div>
            <div style="font-size: 32px; font-weight: 700;">${pctTotalAvance}%</div>
        </div>
    `;
}

function copiarResumenAlPortapapeles() {
    const datos = obtenerDatosFiltrados();
    const kpis = calcularKPIs(datos);
    
    const texto = `
📊 RESUMEN CONTROL ADE
━━━━━━━━━━━━━━━━━━━━━━

📈 Avance General: ${kpis.porcentajeAvance}%
✅ Incorporadas: ${kpis.incorporadas} de ${kpis.total}
📝 En Editorial: ${kpis.enEditorial}
⚙️ En Proceso: ${kpis.enProceso}
⚠️ Atrasos: ${kpis.atrasos}
⏰ Por Vencer (7 días): ${kpis.porVencer}

🎯 Listo para cierre: ${kpis.listoParaCierre} (${kpis.porcentajeListo}%)
📋 Pendientes: ${kpis.total - kpis.incorporadas}

Generado: ${new Date().toLocaleString('es-CL')}
    `.trim();

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('btnCopiarResumen');
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

// ============================================
// UTILIDADES
// ============================================

function destruirGrafico(chart) {
    if (chart && typeof chart.destroy === 'function') {
        try { chart.destroy(); } catch (e) { /* ignore */ }
    }
}

function destruirGraficoCanvas(canvas) {
    if (typeof Chart !== 'undefined' && typeof Chart.getChart === 'function') {
        const existing = Chart.getChart(canvas);
        if (existing) {
            try { existing.destroy(); } catch (e) { /* ignore */ }
        }
    }
}
