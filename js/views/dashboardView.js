import { ESTADOS, ESTADO_COLORS } from '../constants.js';
import { AppState } from '../state.js';
import { obtenerDatosFiltrados } from '../services/dataService.js';
import { getProgramacionConfig } from '../services/programacionService.js';
import { parseFechaFlexible, formatearFechaCorta } from '../utils/date.js';
import { applyStatusIndicatorColors } from '../utils/table.js';
import { mostrarVistaItems } from './modalView.js';

let chartTotalGeneral = null;
let chartProgramacion = null;

export function actualizarDashboard() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('dashboardCards');
    const kpiContainer = document.getElementById('kpiCards');

    if (!container || !kpiContainer) return;

    if (datos.length === 0) {
        kpiContainer.innerHTML = '';
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-pie"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    const kpis = calcularKPIs(datos);
    kpiContainer.innerHTML = crearKPICards(kpis);

    const resumenProgramacion = prepararDatosProgramacion(datos);
    const distribucionEstado = calcularDistribucionPorEstado(datos);
    const cardDistribucion = crearCardDistribucion('Total General', distribucionEstado, datos.length);
    const cardProgramacion = resumenProgramacion.labels.length ? crearCardProgramacion(resumenProgramacion) : '';

    container.innerHTML = cardDistribucion + cardProgramacion;

    inicializarGraficos(resumenProgramacion);

    setTimeout(() => {
        applyStatusIndicatorColors();

        document.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', () => {
                const estado = row.dataset.estado;
                const datosFiltrados = obtenerDatosFiltrados().filter(d => d.Estado === estado);
                mostrarVistaItems(estado, datosFiltrados);
            });
        });
    }, 100);
}

function calcularKPIs(datos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const atrasos = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
        const fechaEntrega = new Date(d.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);
        return fechaEntrega < hoy;
    });

    const porVencer = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado === 'Incorporada') return false;
        const fechaEntrega = new Date(d.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);
        const diffTime = fechaEntrega - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    });

    const incorporadas = datos.filter(d => d.Estado === 'Incorporada').length;
    const enProceso = datos.filter(d => d.Estado !== 'Incorporada' && d.Estado !== 'Pendiente').length;
    const enTrabajo = datos.filter(d =>
        d.Estado !== 'En elaboración' &&
        d.Estado !== 'En editorial' &&
        d.Estado !== 'Incorporada' &&
        d.Estado !== 'Pendiente'
    ).length;
    const enEditorial = datos.filter(d => d.Estado === 'En editorial').length;

    return {
        total: datos.length,
        incorporadas,
        enProceso,
        atrasos: atrasos.length,
        porVencer: porVencer.length,
        enTrabajo,
        enEditorial,
        porcentajeIncorporadas: datos.length > 0 ? ((incorporadas / datos.length) * 100).toFixed(1) : 0
    };
}

function crearKPICards(kpis) {
    return `
        <div class="kpi-card green">
            <div class="kpi-icon"><i class="fas fa-check-circle"></i></div>
            <div class="kpi-title">Incorporadas</div>
            <div class="kpi-value">${kpis.incorporadas}</div>
            <div class="kpi-subtitle">${kpis.porcentajeIncorporadas}% del total</div>
        </div>
        <div class="kpi-card" style="border-left-color: #607d8b;">
            <div class="kpi-icon"><i class="fas fa-tasks"></i></div>
            <div class="kpi-title">En Trabajo</div>
            <div class="kpi-value" style="color: #607d8b;">${kpis.enTrabajo}</div>
            <div class="kpi-subtitle">En proceso</div>
        </div>
        <div class="kpi-card" style="border-left-color: #9c27b0;">
            <div class="kpi-icon"><i class="fas fa-edit"></i></div>
            <div class="kpi-title">En Editorial</div>
            <div class="kpi-value" style="color: #9c27b0;">${kpis.enEditorial}</div>
            <div class="kpi-subtitle">En revisión editorial</div>
        </div>
        <div class="kpi-card red">
            <div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="kpi-title">Atrasos</div>
            <div class="kpi-value">${kpis.atrasos}</div>
            <div class="kpi-subtitle">Con fecha vencida</div>
        </div>
        <div class="kpi-card orange">
            <div class="kpi-icon"><i class="fas fa-clock"></i></div>
            <div class="kpi-title">Por Vencer</div>
            <div class="kpi-value">${kpis.porVencer}</div>
            <div class="kpi-subtitle">Próximos 7 días</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon"><i class="fas fa-list"></i></div>
            <div class="kpi-title">Total</div>
            <div class="kpi-value">${kpis.total}</div>
            <div class="kpi-subtitle">Preguntas totales</div>
        </div>
    `;
}

function calcularDistribucionPorEstado(datos) {
    const distribucion = {};

    ESTADOS.forEach(estado => {
        distribucion[estado] = datos.filter(d => d.Estado === estado).length;
    });

    return distribucion;
}

function crearCardDistribucion(titulo, distribucion, total) {
    const items = Object.entries(distribucion)
        .filter(([, cantidad]) => cantidad > 0)
        .sort(([estadoA], [estadoB]) => estadoA.localeCompare(estadoB))
        .map(([estado, cantidad]) => {
            const porcentaje = total > 0 ? ((cantidad / total) * 100).toFixed(1) : 0;
            const color = ESTADO_COLORS[estado] || '#999';
            const claseEstado = estado.toLowerCase().replace(/\s+/g, '-');

            return `
                <tr class="clickable-row" data-estado="${estado}">
                    <td>
                        <span class="status-indicator status-${claseEstado}" data-color="${color}"></span>
                        ${estado}
                    </td>
                    <td>${cantidad}</td>
                    <td>${porcentaje}%</td>
                </tr>
            `;
        }).join('');

    return `
        <div class="dashboard-card">
            <div class="card-title">${titulo}</div>
            <div class="card-chart-container-vertical">
                <div class="card-chart">
                    <canvas id="chartTotalGeneral"></canvas>
                </div>
                <div class="card-table-wrapper">
                    <table class="card-table">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Cant.</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function crearCardProgramacion(resumen) {
    return `
        <div class="dashboard-card programacion-card">
            <div class="card-title">Programación vs Cumplimiento</div>
            <div class="programacion-card-body">
                <div class="programacion-chart-wrapper">
                    <canvas id="chartProgramacion"></canvas>
                </div>
                ${crearTablaProgramacion(resumen)}
            </div>
        </div>
    `;
}

function inicializarGraficos(resumenProgramacion) {
    if (chartTotalGeneral && typeof chartTotalGeneral.destroy === 'function') {
        chartTotalGeneral.destroy();
        chartTotalGeneral = null;
    }

    setTimeout(() => {
        const canvas = document.getElementById('chartTotalGeneral');
        if (!canvas) return;

        const datos = obtenerDatosFiltrados();
        if (datos.length === 0) return;

        const distribucion = calcularDistribucionPorEstado(datos);
        const total = datos.length;

        const datosGrafico = Object.entries(distribucion)
            .filter(([, cantidad]) => cantidad > 0)
            .sort(([estadoA], [estadoB]) => estadoA.localeCompare(estadoB))
            .map(([estado, cantidad]) => ({
                label: estado,
                value: cantidad,
                color: ESTADO_COLORS[estado] || '#999'
            }));

        if (datosGrafico.length === 0) return;

        const existingChart = typeof Chart !== 'undefined' && typeof Chart.getChart === 'function'
            ? Chart.getChart(canvas)
            : null;
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;
        if (parent) {
            const width = parent.offsetWidth || 400;
            const height = parent.offsetHeight || 250;
            canvas.width = width;
            canvas.height = height;
        }

        chartTotalGeneral = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: datosGrafico.map(d => d.label),
                datasets: [{
                    data: datosGrafico.map(d => d.value),
                    backgroundColor: datosGrafico.map(d => d.color),
                    borderWidth: 0,
                    hoverOffset: 4,
                    hoverBorderWidth: 2,
                    hoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 10, bottom: 10, left: 10, right: 10 }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 800,
                    easing: 'easeInOutQuart',
                    delay: 100
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        padding: 14,
                        titleFont: { size: 15, weight: 'bold', family: "'Segoe UI', Tahoma, sans-serif" },
                        bodyFont: { size: 13, family: "'Segoe UI', Tahoma, sans-serif" },
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        boxPadding: 8,
                        callbacks: {
                            title: (context) => context[0].label || '',
                            label: (context) => {
                                const value = context.parsed || 0;
                                const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${value} preguntas (${porcentaje}%)`;
                            },
                            labelColor: (context) => {
                                const color = datosGrafico[context.dataIndex]?.color || '#999';
                                return { borderColor: color, backgroundColor: color };
                            }
                        }
                    }
                },
                cutout: '70%',
                borderWidth: 0,
                onHover: (event, activeElements) => {
                    if (event.native && event.native.target) {
                        event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                    }
                },
                onClick: (_, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const estado = datosGrafico[index]?.label;
                        if (estado) {
                            const datosFiltrados = obtenerDatosFiltrados().filter(d => d.Estado === estado);
                            mostrarVistaItems(estado, datosFiltrados);
                        }
                    }
                }
            },
            plugins: [{
                id: 'centerText',
                beforeDraw: (chart) => {
                    if (!chart.chartArea || !chart.chartArea.left) return;
                    const ctxPlugin = chart.ctx;
                    const { left, right, top, bottom } = chart.chartArea;
                    const centerX = left + (right - left) / 2;
                    const centerY = top + (bottom - top) / 2;

                    ctxPlugin.save();
                    ctxPlugin.shadowColor = 'rgba(0, 0, 0, 0.1)';
                    ctxPlugin.shadowBlur = 4;
                    ctxPlugin.shadowOffsetX = 0;
                    ctxPlugin.shadowOffsetY = 2;
                    ctxPlugin.font = 'bold 3.5rem "Segoe UI", Arial, sans-serif';
                    ctxPlugin.fillStyle = '#003978';
                    ctxPlugin.textAlign = 'center';
                    ctxPlugin.textBaseline = 'middle';
                    ctxPlugin.fillText(total.toString(), centerX, centerY - 12);
                    ctxPlugin.shadowColor = 'transparent';
                    ctxPlugin.font = '0.95rem "Segoe UI", Arial, sans-serif';
                    ctxPlugin.fillStyle = '#666';
                    ctxPlugin.fillText('Preguntas', centerX, centerY + 22);
                    ctxPlugin.restore();
                }
            }]
        });
    }, 300);

    inicializarGraficoProgramacion(resumenProgramacion);
}

function inicializarGraficoProgramacion(resumenProgramacion) {
    if (chartProgramacion && typeof chartProgramacion.destroy === 'function') {
        chartProgramacion.destroy();
        chartProgramacion = null;
    }

    if (!resumenProgramacion?.labels?.length || !resumenProgramacion?.datasets?.length) {
        return;
    }

    const canvas = document.getElementById('chartProgramacion');
    if (!canvas) return;

    const existingChart = typeof Chart !== 'undefined' && typeof Chart.getChart === 'function'
        ? Chart.getChart(canvas)
        : null;
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    if (parent) {
        const width = parent.offsetWidth || 800;
        const height = parent.offsetHeight || 400;
        canvas.width = width;
        canvas.height = height;
    }

    chartProgramacion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: resumenProgramacion.labels,
            datasets: resumenProgramacion.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, pointStyle: 'rectRounded' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const valor = context.parsed.y || 0;
                            return `${context.dataset.label}: ${valor}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { autoSkip: false, maxRotation: 45, minRotation: 20 }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Preguntas' },
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function prepararDatosProgramacion(datos) {
    const estadosProgramacion = [
        'En elaboración',
        'En revisor técnico',
        'En cartografía',
        'En editorial'
    ];

    const { claves, fechas, etiquetas } = getProgramacionConfig();
    const agrupado = {};

    const inicializarRegistro = (clave, etiqueta) => {
        agrupado[clave] = {
            displayLabel: etiqueta || formatearFechaCorta(clave),
            total: 0
        };
        estadosProgramacion.forEach(estado => {
            agrupado[clave][estado] = 0;
        });
    };

    fechas.forEach(({ clave, etiqueta }) => inicializarRegistro(clave, etiqueta));

    const fechasControl = claves.map(clave => {
        const fecha = parseFechaFlexible(clave);
        return { clave, fecha };
    }).filter(item => item.fecha !== null);

    datos.forEach(item => {
        if (!estadosProgramacion.includes(item.Estado) || !item.FechaEntrega) {
            return;
        }

        const fechaEntregaDate = parseFechaFlexible(item.FechaEntrega);
        if (!fechaEntregaDate) return;

        let semanaAsignada = null;
        for (let i = 0; i < fechasControl.length; i++) {
            const fechaControl = fechasControl[i].fecha;
            if (fechaEntregaDate <= fechaControl) {
                semanaAsignada = fechasControl[i].clave;
                break;
            }
        }

        if (!semanaAsignada && fechasControl.length > 0) {
            semanaAsignada = fechasControl[fechasControl.length - 1].clave;
        }

        if (semanaAsignada && agrupado[semanaAsignada]) {
            agrupado[semanaAsignada].total += 1;
            agrupado[semanaAsignada][item.Estado] += 1;
        }
    });

    const llavesOrdenadas = claves.filter(Boolean);

    let estadosConDatos = estadosProgramacion.filter(estado =>
        llavesOrdenadas.some(key => (agrupado[key]?.[estado] || 0) > 0)
    );

    if (llavesOrdenadas.length === 0) {
        return { labels: [], datasets: [], tabla: [], estados: [] };
    }

    if (estadosConDatos.length === 0) {
        estadosConDatos = [...estadosProgramacion];
    }

    const labels = llavesOrdenadas.map(key =>
        agrupado[key]?.displayLabel || etiquetas[key] || formatearFechaCorta(key)
    );

    const datasets = estadosConDatos.map(estado => ({
        label: estado,
        data: llavesOrdenadas.map(key => agrupado[key]?.[estado] || 0),
        backgroundColor: (ESTADO_COLORS[estado] || '#999') + 'CC',
        borderColor: '#ffffff',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 42
    }));

    const tabla = llavesOrdenadas.map(key => ({
        fecha: agrupado[key]?.displayLabel || etiquetas[key] || formatearFechaCorta(key),
        valores: estadosConDatos.map(estado => agrupado[key]?.[estado] || 0)
    }));

    return {
        labels,
        datasets,
        tabla,
        estados: estadosConDatos
    };
}

function crearTablaProgramacion(resumen) {
    if (!resumen.estados?.length) {
        return '';
    }

    const headerEstados = resumen.estados
        .map(estado => `<th>${estado}</th>`)
        .join('');

    const filas = resumen.tabla
        .map(fila => `
            <tr>
                <td>${fila.fecha}</td>
                ${fila.valores.map(valor => `<td>${valor}</td>`).join('')}
            </tr>
        `)
        .join('');

    return `
        <div class="programacion-table-wrapper">
            <table class="programacion-table">
                <thead>
                    <tr>
                        <th>FECHA</th>
                        ${headerEstados}
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>
        </div>
    `;
}

