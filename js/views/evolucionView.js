import { obtenerDatosFiltrados } from '../services/dataService.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

let chartEvolucion = null;

export function actualizarEvolucion() {
    const datos = obtenerDatosFiltrados({ deduplicar: false });
    const container = document.getElementById('evolucionContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    const agrupado = agruparDatosEvolucion(datos);
    const fechasOrdenadas = Object.keys(agrupado).sort();
    const labels = fechasOrdenadas.map(fecha => formatearFechaParaMostrar(fecha, fecha));
    const datosTotal = fechasOrdenadas.map(fecha => agrupado[fecha].total);
    const datosIncorporadas = fechasOrdenadas.map(fecha => agrupado[fecha].incorporadas);
    const datosEnProceso = fechasOrdenadas.map(fecha => agrupado[fecha].enProceso);

    container.innerHTML = `
        <div class="chart-container">
            <canvas id="chartEvolucion"></canvas>
        </div>
    `;

    inicializarGraficoEvolucion(labels, datosTotal, datosIncorporadas, datosEnProceso);
}

function agruparDatosEvolucion(datos) {
    const porFecha = {};
    datos.forEach(d => {
        const fecha = d.FechaReporte || 'Sin fecha';
        if (!porFecha[fecha]) {
            porFecha[fecha] = {
                fecha,
                total: 0,
                incorporadas: 0,
                enProceso: 0
            };
        }
        porFecha[fecha].total++;
        if (d.Estado === 'Incorporada') {
            porFecha[fecha].incorporadas++;
        } else {
            porFecha[fecha].enProceso++;
        }
    });
    return porFecha;
}

function inicializarGraficoEvolucion(labels, datosTotal, datosIncorporadas, datosEnProceso) {
    if (chartEvolucion && typeof chartEvolucion.destroy === 'function') {
        chartEvolucion.destroy();
        chartEvolucion = null;
    }

    const canvas = document.getElementById('chartEvolucion');
    if (!canvas) {
        console.error('Canvas de evolución no encontrado');
        return;
    }

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
        const height = 400;
        canvas.width = width;
        canvas.height = height;
    }

    chartEvolucion = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total',
                    data: datosTotal,
                    borderColor: '#003978',
                    backgroundColor: 'rgba(0, 57, 120, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Incorporadas',
                    data: datosIncorporadas,
                    borderColor: '#4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'En Proceso',
                    data: datosEnProceso,
                    borderColor: '#ff9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1000 },
            plugins: {
                legend: { display: true, position: 'top' },
                title: {
                    display: true,
                    text: 'Evolución Temporal de Estados',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

