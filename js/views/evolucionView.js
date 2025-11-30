import { obtenerTodosLosReportes } from '../services/dataService.js';
import { formatearFechaParaMostrar, parseFechaFlexible } from '../utils/date.js';

let chartEvolucion = null;

export function actualizarEvolucion() {
    // Usar TODOS los datos cargados, sin filtros, para mostrar la evolución completa
    const datos = obtenerTodosLosReportes();
    const container = document.getElementById('evolucionContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No hay datos disponibles</p>
                <span class="empty-hint">Carga reportes para visualizar la evolución temporal</span>
            </div>
        `;
        return;
    }

    const agrupado = agruparDatos(datos);
    const fechas = Object.keys(agrupado).sort((a, b) => {
        const fechaA = parseFechaFlexible(a);
        const fechaB = parseFechaFlexible(b);
        if (fechaA && fechaB) return fechaA - fechaB;
        return a.localeCompare(b);
    });
    
    const labels = fechas.map(f => formatearFechaParaMostrar(f, f));
    const datosGrafico = {
        total: fechas.map(f => agrupado[f].total),
        incorporadas: fechas.map(f => agrupado[f].incorporadas),
        enEditorial: fechas.map(f => agrupado[f].enEditorial),
        enProceso: fechas.map(f => agrupado[f].enProceso)
    };

    // Calcular KPIs para mostrar
    const ultimaFecha = fechas.length > 0 ? labels[labels.length - 1] : '--';
    const ultimoTotal = datosGrafico.total[datosGrafico.total.length - 1] || 0;
    const ultimasIncorporadas = datosGrafico.incorporadas[datosGrafico.incorporadas.length - 1] || 0;
    const ultimasEditorial = datosGrafico.enEditorial[datosGrafico.enEditorial.length - 1] || 0;
    const porcentajeAvance = ultimoTotal > 0 ? ((ultimasIncorporadas / ultimoTotal) * 100).toFixed(1) : 0;
    const listoParaCierre = ultimasIncorporadas + ultimasEditorial;

    container.innerHTML = `
        <div class="evolucion-header">
            <div class="evolucion-kpis-mini">
                <div class="kpi-mini">
                    <span class="kpi-mini-label">Reportes</span>
                    <span class="kpi-mini-value">${fechas.length}</span>
                </div>
                <div class="kpi-mini">
                    <span class="kpi-mini-label">Último reporte</span>
                    <span class="kpi-mini-value">${ultimaFecha}</span>
                </div>
                <div class="kpi-mini green">
                    <span class="kpi-mini-label">Incorporadas</span>
                    <span class="kpi-mini-value">${ultimasIncorporadas}</span>
                </div>
                <div class="kpi-mini purple">
                    <span class="kpi-mini-label">En Editorial</span>
                    <span class="kpi-mini-value">${ultimasEditorial}</span>
                </div>
                <div class="kpi-mini accent">
                    <span class="kpi-mini-label">Listo para cierre</span>
                    <span class="kpi-mini-value">${listoParaCierre}</span>
                </div>
                <div class="kpi-mini">
                    <span class="kpi-mini-label">Avance</span>
                    <span class="kpi-mini-value">${porcentajeAvance}%</span>
                </div>
            </div>
        </div>
        <div class="evolucion-chart-section">
            <div class="chart-legend-custom">
                <div class="legend-item">
                    <span class="legend-color" style="background: var(--success, #10b981);"></span>
                    <span>Incorporadas</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color" style="background: var(--purple, #8b5cf6);"></span>
                    <span>En Editorial</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color dashed" style="border-color: var(--primary, #1a365d);"></span>
                    <span>Total (referencia)</span>
                </div>
            </div>
            <div class="chart-container evolucion-chart">
                <canvas id="chartEvolucion"></canvas>
            </div>
        </div>
    `;

    inicializarGrafico(labels, datosGrafico);
}

function agruparDatos(datos) {
    const porFecha = {};
    datos.forEach(d => {
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
    return porFecha;
}

function inicializarGrafico(labels, datosGrafico) {
    destruirGrafico();

    const canvas = document.getElementById('chartEvolucion');
    if (!canvas) return;

    destruirGraficoCanvas(canvas);

    const ctx = canvas.getContext('2d');
    ajustarCanvas(canvas);

    const { total, incorporadas, enEditorial } = datosGrafico;

    // Calcular el máximo para el eje Y
    const maxValue = Math.max(...total);
    const suggestedMax = Math.ceil(maxValue * 1.15);

    chartEvolucion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                // Barras apiladas: Incorporadas (base)
                {
                    label: 'Incorporadas',
                    data: incorporadas,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1,
                    borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
                    stack: 'avance',
                    order: 2,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                },
                // Barras apiladas: En Editorial (encima)
                {
                    label: 'En Editorial',
                    data: enEditorial,
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 1,
                    borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                    stack: 'avance',
                    order: 2,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                },
                // Línea de referencia: Total
                {
                    label: 'Total',
                    data: total,
                    type: 'line',
                    borderColor: '#1a365d',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#1a365d',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { 
                duration: 800, 
                easing: 'easeOutQuart'
            },
            interaction: { 
                mode: 'index', 
                intersect: false 
            },
            plugins: {
                legend: {
                    display: false // Usamos leyenda custom
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    padding: 16,
                    cornerRadius: 8,
                    titleFont: { size: 13, weight: '600' },
                    bodyFont: { size: 12 },
                    bodySpacing: 8,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        title: (items) => `📅 ${items[0]?.label || ''}`,
                        label: (ctx) => {
                            const value = ctx.parsed.y || 0;
                            const datasetLabel = ctx.dataset.label;
                            
                            if (datasetLabel === 'Total') {
                                return ` 📊 ${datasetLabel}: ${value} registros`;
                            } else if (datasetLabel === 'Incorporadas') {
                                return ` ✅ ${datasetLabel}: ${value}`;
                            } else if (datasetLabel === 'En Editorial') {
                                return ` 📝 ${datasetLabel}: ${value}`;
                            }
                            return ` ${datasetLabel}: ${value}`;
                        },
                        afterBody: (items) => {
                            const index = items[0]?.dataIndex;
                            if (index === undefined) return '';
                            
                            const inc = incorporadas[index] || 0;
                            const edit = enEditorial[index] || 0;
                            const tot = total[index] || 0;
                            const listos = inc + edit;
                            const pct = tot > 0 ? ((listos / tot) * 100).toFixed(1) : 0;
                            
                            return [
                                '',
                                `━━━━━━━━━━━━━━━━`,
                                `🎯 Listo para cierre: ${listos} (${pct}%)`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { 
                        font: { size: 11, weight: '500' },
                        maxRotation: 45,
                        minRotation: 0,
                        color: '#64748b'
                    },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: suggestedMax,
                    grid: { 
                        color: 'rgba(0,0,0,0.06)',
                        drawBorder: false
                    },
                    ticks: { 
                        precision: 0, 
                        font: { size: 11 },
                        padding: 10,
                        color: '#64748b'
                    },
                    border: { display: false },
                    title: {
                        display: true,
                        text: 'Cantidad de Registros',
                        font: { size: 11, weight: '500' },
                        color: '#94a3b8',
                        padding: { bottom: 10 }
                    }
                }
            }
        }
    });
}

function destruirGrafico() {
    if (chartEvolucion && typeof chartEvolucion.destroy === 'function') {
        try { chartEvolucion.destroy(); } catch (e) { /* ignore */ }
        chartEvolucion = null;
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

function ajustarCanvas(canvas) {
    const parent = canvas.parentElement;
    if (parent) {
        canvas.width = parent.offsetWidth || 800;
        canvas.height = parent.offsetHeight || 400;
    }
}
