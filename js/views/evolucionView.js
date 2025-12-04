import { obtenerTodosLosReportes } from '../services/dataService.js';
import { formatearFechaCorta, parseFechaFlexible } from '../utils/date.js';
import { PROGRAMACION_FECHAS_BASE } from '../constants.js';

let chartEvolucion = null;
let chartTipo = 'bar'; // 'bar' o 'area'

// Definir todas las semanas del proyecto basadas en PROGRAMACION_FECHAS_BASE
const SEMANAS_PROYECTO = generarSemanasProyecto();

function generarSemanasProyecto() {
    const semanas = [];
    PROGRAMACION_FECHAS_BASE.forEach(fechaStr => {
        const fecha = parseFechaFlexible(fechaStr);
        if (fecha) {
            const semana = getISOWeek(fecha);
            const año = fecha.getFullYear();
            semanas.push({
                numero: semana,
                año: año,
                fecha: fechaStr,
                fechaObj: fecha,
                label: `S${semana}`,
                labelCompleto: `Semana ${semana} (${formatearFechaCorta(fechaStr)})`
            });
        }
    });
    return semanas;
}

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function actualizarEvolucion() {
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

    // Agrupar datos por semana
    const datosPorSemana = agruparPorSemana(datos);
    
    // Preparar datos para TODAS las semanas del proyecto
    const datosGrafico = prepararDatosCompletos(datosPorSemana);
    
    // Calcular estadísticas
    const stats = calcularEstadisticas(datosGrafico);
    
    // Determinar semana actual
    const semanaActual = getSemanaActual();

    container.innerHTML = renderHTML(datosGrafico, stats, semanaActual);
    
    inicializarGrafico(datosGrafico, semanaActual, stats);
    conectarEventos(datosGrafico, semanaActual, stats);
}

function prepararDatosCompletos(datosPorSemana) {
    const datosGrafico = {
        semanas: [],
        labels: [],
        labelsCompletos: [],
        fechas: [],
        total: [],
        incorporadas: [],
        enEditorial: [],
        enProceso: [],
        tieneDatos: []
    };

    SEMANAS_PROYECTO.forEach(semanaInfo => {
        const semanaNum = semanaInfo.numero;
        const datosSemana = datosPorSemana[semanaNum];
        
        datosGrafico.semanas.push(semanaNum);
        datosGrafico.labels.push(semanaInfo.label);
        datosGrafico.labelsCompletos.push(semanaInfo.labelCompleto);
        datosGrafico.fechas.push(semanaInfo.fecha);

        if (datosSemana && datosSemana.length > 0) {
            const ultimoReporte = obtenerUltimoReporteSemana(datosSemana);
            const conteos = contarEstados(ultimoReporte);
            
            datosGrafico.total.push(conteos.total);
            datosGrafico.incorporadas.push(conteos.incorporadas);
            datosGrafico.enEditorial.push(conteos.enEditorial);
            datosGrafico.enProceso.push(conteos.enProceso);
            datosGrafico.tieneDatos.push(true);
        } else {
            datosGrafico.total.push(null);
            datosGrafico.incorporadas.push(null);
            datosGrafico.enEditorial.push(null);
            datosGrafico.enProceso.push(null);
            datosGrafico.tieneDatos.push(false);
        }
    });

    return datosGrafico;
}

function calcularEstadisticas(datosGrafico) {
    // Encontrar último índice con datos
    let ultimoIndexConDatos = -1;
    for (let i = datosGrafico.tieneDatos.length - 1; i >= 0; i--) {
        if (datosGrafico.tieneDatos[i]) {
            ultimoIndexConDatos = i;
            break;
        }
    }

    if (ultimoIndexConDatos === -1) {
        return {
            semanasConDatos: 0,
            totalSemanas: SEMANAS_PROYECTO.length,
            semanasRestantes: SEMANAS_PROYECTO.length,
            ultimaSemana: '--',
            ultimoTotal: 0,
            ultimasIncorporadas: 0,
            ultimasEditorial: 0,
            ultimasEnProceso: 0,
            porcentajeAvance: 0,
            tendencia: 'neutral',
            velocidadSemanal: 0,
            faltanIncorporar: 0,
            necesitaPorSemana: 0
        };
    }

    const semanasConDatos = datosGrafico.tieneDatos.filter(Boolean).length;
    const semanasRestantes = SEMANAS_PROYECTO.length - ultimoIndexConDatos - 1;
    const ultimaSemana = datosGrafico.semanas[ultimoIndexConDatos];
    const ultimoTotal = datosGrafico.total[ultimoIndexConDatos] || 0;
    const ultimasIncorporadas = datosGrafico.incorporadas[ultimoIndexConDatos] || 0;
    const ultimasEditorial = datosGrafico.enEditorial[ultimoIndexConDatos] || 0;
    const ultimasEnProceso = datosGrafico.enProceso[ultimoIndexConDatos] || 0;
    
    const porcentajeAvance = ultimoTotal > 0 ? ((ultimasIncorporadas / ultimoTotal) * 100).toFixed(1) : 0;

    // Calcular tendencia comparando con semana anterior
    let tendencia = 'neutral';
    let velocidadSemanal = 0;
    if (ultimoIndexConDatos > 0) {
        let anteriorIndex = -1;
        for (let i = ultimoIndexConDatos - 1; i >= 0; i--) {
            if (datosGrafico.tieneDatos[i]) {
                anteriorIndex = i;
                break;
            }
        }
        
        if (anteriorIndex >= 0) {
            const incAnterior = datosGrafico.incorporadas[anteriorIndex] || 0;
            const diferencia = ultimasIncorporadas - incAnterior;
            velocidadSemanal = diferencia;
            tendencia = diferencia > 0 ? 'up' : diferencia < 0 ? 'down' : 'neutral';
        }
    }

    // Calcular proyección: cuántas faltan y cuántas por semana se necesitan
    const faltanIncorporar = ultimoTotal - ultimasIncorporadas;
    const necesitaPorSemana = semanasRestantes > 0 ? Math.ceil(faltanIncorporar / semanasRestantes) : faltanIncorporar;

    return {
        semanasConDatos,
        totalSemanas: SEMANAS_PROYECTO.length,
        semanasRestantes,
        ultimaSemana,
        ultimoTotal,
        ultimasIncorporadas,
        ultimasEditorial,
        ultimasEnProceso,
        porcentajeAvance,
        tendencia,
        velocidadSemanal,
        faltanIncorporar,
        necesitaPorSemana
    };
}

function getSemanaActual() {
    const hoy = new Date();
    return getISOWeek(hoy);
}

function renderHTML(datosGrafico, stats, semanaActual) {
    const tendenciaIcon = stats.tendencia === 'up' ? 'fa-arrow-up' : stats.tendencia === 'down' ? 'fa-arrow-down' : 'fa-minus';
    const tendenciaClass = stats.tendencia === 'up' ? 'trend-up' : stats.tendencia === 'down' ? 'trend-down' : 'trend-neutral';
    const tendenciaText = stats.velocidadSemanal > 0 ? `+${stats.velocidadSemanal}` : stats.velocidadSemanal;

    // Determinar si se alcanzará la meta con la velocidad actual
    const proyeccionConVelocidadActual = stats.velocidadSemanal > 0 
        ? stats.ultimasIncorporadas + (stats.velocidadSemanal * stats.semanasRestantes)
        : stats.ultimasIncorporadas;
    const alcanzaMeta = proyeccionConVelocidadActual >= stats.ultimoTotal;
    const diferenciaConMeta = stats.velocidadSemanal - stats.necesitaPorSemana;

    return `
        <div class="evolucion-container">
            <!-- Header con KPIs mejorados -->
            <div class="evolucion-header-enhanced">
                <div class="evolucion-main-kpi">
                    <div class="main-kpi-circle ${parseFloat(stats.porcentajeAvance) >= 75 ? 'success' : parseFloat(stats.porcentajeAvance) >= 50 ? 'warning' : 'info'}">
                        <svg viewBox="0 0 36 36" class="circular-progress">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <path class="circle-progress" stroke-dasharray="${stats.porcentajeAvance}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        </svg>
                        <div class="main-kpi-value">${stats.porcentajeAvance}%</div>
                    </div>
                    <div class="main-kpi-info">
                        <span class="main-kpi-label">Avance Global</span>
                        <span class="main-kpi-detail">${stats.ultimasIncorporadas} de ${stats.ultimoTotal} incorporadas</span>
                        <div class="trend-indicator ${tendenciaClass}">
                            <i class="fas ${tendenciaIcon}"></i>
                            <span>${tendenciaText} esta semana</span>
                        </div>
                    </div>
                </div>
                
                <div class="evolucion-kpis-grid">
                    <div class="kpi-card-mini">
                        <div class="kpi-card-icon"><i class="fas fa-calendar-week"></i></div>
                        <div class="kpi-card-content">
                            <span class="kpi-card-value">${stats.semanasConDatos}/${stats.totalSemanas}</span>
                            <span class="kpi-card-label">Semanas reportadas</span>
                        </div>
                    </div>
                    <div class="kpi-card-mini success">
                        <div class="kpi-card-icon"><i class="fas fa-check-double"></i></div>
                        <div class="kpi-card-content">
                            <span class="kpi-card-value">${stats.ultimasIncorporadas}</span>
                            <span class="kpi-card-label">Incorporadas</span>
                        </div>
                    </div>
                    <div class="kpi-card-mini purple">
                        <div class="kpi-card-icon"><i class="fas fa-file-signature"></i></div>
                        <div class="kpi-card-content">
                            <span class="kpi-card-value">${stats.ultimasEditorial}</span>
                            <span class="kpi-card-label">En Editorial</span>
                        </div>
                    </div>
                    <div class="kpi-card-mini ${stats.faltanIncorporar > 0 ? 'warning' : 'success'}">
                        <div class="kpi-card-icon"><i class="fas fa-hourglass-half"></i></div>
                        <div class="kpi-card-content">
                            <span class="kpi-card-value">${stats.faltanIncorporar}</span>
                            <span class="kpi-card-label">Faltan por incorporar</span>
                        </div>
                    </div>
                </div>

                <!-- Proyección para alcanzar la meta -->
                ${stats.semanasRestantes > 0 && stats.faltanIncorporar > 0 ? `
                <div class="proyeccion-card ${alcanzaMeta ? 'on-track' : 'behind'}">
                    <div class="proyeccion-icon">
                        <i class="fas ${alcanzaMeta ? 'fa-rocket' : 'fa-exclamation-triangle'}"></i>
                    </div>
                    <div class="proyeccion-content">
                        <div class="proyeccion-header">
                            <span class="proyeccion-title">
                                ${alcanzaMeta ? '✅ En camino a la meta' : '⚠️ Requiere acelerar el ritmo'}
                            </span>
                        </div>
                        <div class="proyeccion-stats">
                            <div class="proyeccion-stat">
                                <span class="proyeccion-stat-value">${stats.semanasRestantes}</span>
                                <span class="proyeccion-stat-label">Semanas restantes</span>
                            </div>
                            <div class="proyeccion-stat">
                                <span class="proyeccion-stat-value">${stats.faltanIncorporar}</span>
                                <span class="proyeccion-stat-label">Preguntas por incorporar</span>
                            </div>
                            <div class="proyeccion-stat highlight">
                                <span class="proyeccion-stat-value">${stats.necesitaPorSemana}</span>
                                <span class="proyeccion-stat-label">Necesarias por semana</span>
                            </div>
                            <div class="proyeccion-stat ${stats.velocidadSemanal >= stats.necesitaPorSemana ? 'success' : 'warning'}">
                                <span class="proyeccion-stat-value">${stats.velocidadSemanal}</span>
                                <span class="proyeccion-stat-label">Velocidad actual</span>
                            </div>
                        </div>
                        <div class="proyeccion-mensaje">
                            ${stats.velocidadSemanal >= stats.necesitaPorSemana 
                                ? `<i class="fas fa-check-circle"></i> Con el ritmo actual (${stats.velocidadSemanal}/sem), se alcanzará la meta.`
                                : `<i class="fas fa-info-circle"></i> Se necesitan <strong>${stats.necesitaPorSemana - stats.velocidadSemanal} incorporaciones adicionales por semana</strong> para alcanzar la meta.`
                            }
                        </div>
                    </div>
                </div>
                ` : stats.faltanIncorporar === 0 ? `
                <div class="proyeccion-card completed">
                    <div class="proyeccion-icon"><i class="fas fa-trophy"></i></div>
                    <div class="proyeccion-content">
                        <span class="proyeccion-title">🎉 ¡Meta alcanzada!</span>
                        <span class="proyeccion-subtitle">Todas las preguntas han sido incorporadas</span>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Controles del gráfico -->
            <div class="evolucion-chart-controls">
                <div class="chart-type-selector">
                    <button class="chart-type-btn ${chartTipo === 'bar' ? 'active' : ''}" data-tipo="bar" title="Gráfico de barras">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="chart-type-btn ${chartTipo === 'area' ? 'active' : ''}" data-tipo="area" title="Gráfico de área">
                        <i class="fas fa-chart-area"></i>
                    </button>
                </div>
                <div class="chart-legend-inline">
                    <div class="legend-item-inline">
                        <span class="legend-dot success"></span>
                        <span>Incorporadas</span>
                    </div>
                    <div class="legend-item-inline">
                        <span class="legend-dot purple"></span>
                        <span>En Editorial</span>
                    </div>
                    <div class="legend-item-inline">
                        <span class="legend-dot-line"></span>
                        <span>Meta (${stats.ultimoTotal} preguntas)</span>
                    </div>
                </div>
            </div>

            <!-- Gráfico principal -->
            <div class="evolucion-chart-wrapper">
                <div class="chart-container evolucion-chart-enhanced">
                    <canvas id="chartEvolucion"></canvas>
                </div>
            </div>

            <!-- Timeline visual -->
            <div class="evolucion-timeline">
                <div class="timeline-track">
                    ${datosGrafico.semanas.map((semana, i) => {
                        const tieneDatos = datosGrafico.tieneDatos[i];
                        const esActual = semana === semanaActual;
                        const inc = datosGrafico.incorporadas[i] || 0;
                        const total = datosGrafico.total[i] || stats.ultimoTotal;
                        const pct = total > 0 ? Math.round((inc / total) * 100) : 0;
                        
                        return `
                            <div class="timeline-item ${tieneDatos ? 'has-data' : 'no-data'} ${esActual ? 'current' : ''}" 
                                 data-semana="${semana}" 
                                 data-index="${i}"
                                 title="${datosGrafico.labelsCompletos[i]}${tieneDatos ? ` - ${pct}% avance` : ' - Sin datos'}">
                                <div class="timeline-dot">
                                    ${tieneDatos ? `<span class="timeline-pct">${pct}%</span>` : '<i class="fas fa-clock"></i>'}
                                </div>
                                <span class="timeline-label">S${semana}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Tabla de datos -->
            <div class="evolucion-table-section">
                <div class="table-header">
                    <h4 class="evolucion-table-title">
                        <i class="fas fa-table"></i>
                        Detalle por Semana
                    </h4>
                    <span class="table-subtitle">Último reporte de cada semana</span>
                </div>
                <div class="evolucion-table-wrapper">
                    <table class="evolucion-data-table enhanced">
                        <thead>
                            <tr>
                                <th>Semana</th>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Incorporadas</th>
                                <th>En Editorial</th>
                                <th>En Proceso</th>
                                <th>Avance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datosGrafico.semanas.map((semana, i) => {
                                const tieneDatos = datosGrafico.tieneDatos[i];
                                const total = datosGrafico.total[i] || 0;
                                const inc = datosGrafico.incorporadas[i] || 0;
                                const edit = datosGrafico.enEditorial[i] || 0;
                                const proc = datosGrafico.enProceso[i] || 0;
                                const pct = total > 0 ? ((inc / total) * 100).toFixed(1) : 0;
                                const esActual = semana === semanaActual;
                                
                                return `
                                    <tr class="${tieneDatos ? '' : 'no-data-row'} ${esActual ? 'current-week-row' : ''}">
                                        <td>
                                            <div class="semana-cell">
                                                <strong>S${semana}</strong>
                                                ${esActual ? '<span class="current-badge">Actual</span>' : ''}
                                            </div>
                                        </td>
                                        <td class="fecha-cell">${formatearFechaCorta(datosGrafico.fechas[i])}</td>
                                        <td>${tieneDatos ? total : '<span class="no-data-text">--</span>'}</td>
                                        <td class="text-success">${tieneDatos ? inc : '<span class="no-data-text">--</span>'}</td>
                                        <td class="text-purple">${tieneDatos ? edit : '<span class="no-data-text">--</span>'}</td>
                                        <td>${tieneDatos ? proc : '<span class="no-data-text">--</span>'}</td>
                                        <td>
                                            ${tieneDatos ? `
                                                <div class="progress-cell">
                                                    <div class="mini-progress-bar">
                                                        <div class="mini-progress-fill success" style="width: ${pct}%;"></div>
                                                    </div>
                                                    <span class="progress-value">${pct}%</span>
                                                </div>
                                            ` : '<span class="no-data-text">Pendiente</span>'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function agruparPorSemana(datos) {
    const agrupado = {};

    datos.forEach(item => {
        const semana = item.SemanaReporte;
        if (!semana) return;

        const semanaKey = parseInt(semana);
        if (isNaN(semanaKey)) return;

        if (!agrupado[semanaKey]) {
            agrupado[semanaKey] = [];
        }
        agrupado[semanaKey].push(item);
    });

    return agrupado;
}

function obtenerUltimoReporteSemana(datosSemana) {
    if (!datosSemana || datosSemana.length === 0) return [];

    let fechaMasReciente = null;
    datosSemana.forEach(item => {
        if (item.FechaReporte) {
            const fecha = parseFechaFlexible(item.FechaReporte);
            if (fecha && (!fechaMasReciente || fecha > fechaMasReciente)) {
                fechaMasReciente = fecha;
            }
        }
    });

    if (!fechaMasReciente) return datosSemana;

    const ultimoDia = datosSemana.filter(item => {
        if (!item.FechaReporte) return false;
        const fechaItem = parseFechaFlexible(item.FechaReporte);
        if (!fechaItem) return false;
        return fechaItem.toDateString() === fechaMasReciente.toDateString();
    });

    return ultimoDia.length > 0 ? ultimoDia : datosSemana;
}

function contarEstados(registros) {
    let total = registros.length;
    let incorporadas = 0;
    let enEditorial = 0;
    let enProceso = 0;

    registros.forEach(item => {
        const estado = item.Estado;
        if (estado === 'Incorporada') {
            incorporadas++;
        } else if (estado === 'En editorial') {
            enEditorial++;
        } else {
            enProceso++;
        }
    });

    return { total, incorporadas, enEditorial, enProceso };
}

function conectarEventos(datosGrafico, semanaActual, stats) {
    // Toggle tipo de gráfico
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            chartTipo = btn.dataset.tipo;
            document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            inicializarGrafico(datosGrafico, semanaActual, stats);
        });
    });

    // Hover en timeline
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const index = parseInt(item.dataset.index);
            if (chartEvolucion) {
                chartEvolucion.setActiveElements([
                    { datasetIndex: 0, index },
                    { datasetIndex: 1, index }
                ]);
                chartEvolucion.update();
            }
        });
        
        item.addEventListener('mouseleave', () => {
            if (chartEvolucion) {
                chartEvolucion.setActiveElements([]);
                chartEvolucion.update();
            }
        });
    });
}

function inicializarGrafico(datosGrafico, semanaActual, stats) {
    destruirGrafico();

    const canvas = document.getElementById('chartEvolucion');
    if (!canvas) return;

    destruirGraficoCanvas(canvas);
    const ctx = canvas.getContext('2d');

    const { labels, incorporadas, enEditorial, tieneDatos, semanas } = datosGrafico;
    
    // Línea horizontal fija para el total (meta)
    const metaTotal = stats.ultimoTotal;
    const metaLine = new Array(labels.length).fill(metaTotal);

    const maxValue = Math.max(metaTotal, ...incorporadas.filter(v => v !== null), 1);
    const suggestedMax = Math.ceil(maxValue * 1.15);

    // Colores con transparencia para semanas sin datos
    const colorIncorporadas = tieneDatos.map(tiene => tiene ? 'rgba(16, 185, 129, 0.9)' : 'rgba(16, 185, 129, 0.15)');
    const colorEditorial = tieneDatos.map(tiene => tiene ? 'rgba(139, 92, 246, 0.9)' : 'rgba(139, 92, 246, 0.15)');
    
    // Marcar semana actual
    const indexActual = semanas.indexOf(semanaActual);

    const datasets = chartTipo === 'bar' ? [
        {
            label: 'Incorporadas',
            data: incorporadas.map(v => v === null ? 0 : v),
            backgroundColor: colorIncorporadas,
            borderColor: tieneDatos.map(tiene => tiene ? '#059669' : '#d1fae5'),
            borderWidth: 1,
            borderRadius: 4,
            stack: 'avance',
            order: 2,
            barPercentage: 0.75,
            categoryPercentage: 0.85
        },
        {
            label: 'En Editorial',
            data: enEditorial.map(v => v === null ? 0 : v),
            backgroundColor: colorEditorial,
            borderColor: tieneDatos.map(tiene => tiene ? '#7c3aed' : '#ede9fe'),
            borderWidth: 1,
            borderRadius: 4,
            stack: 'avance',
            order: 2,
            barPercentage: 0.75,
            categoryPercentage: 0.85
        },
        {
            label: `Meta (${metaTotal})`,
            data: metaLine,
            type: 'line',
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderWidth: 2,
            borderDash: [8, 4],
            tension: 0,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            order: 1
        }
    ] : [
        {
            label: 'Incorporadas',
            data: incorporadas,
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderColor: '#10b981',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: tieneDatos.map(tiene => tiene ? 4 : 0),
            pointBackgroundColor: '#10b981',
            spanGaps: true
        },
        {
            label: 'En Editorial',
            data: enEditorial.map((v, i) => v !== null && incorporadas[i] !== null ? v + incorporadas[i] : null),
            backgroundColor: 'rgba(139, 92, 246, 0.3)',
            borderColor: '#8b5cf6',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: tieneDatos.map(tiene => tiene ? 4 : 0),
            pointBackgroundColor: '#8b5cf6',
            spanGaps: true
        },
        {
            label: `Meta (${metaTotal})`,
            data: metaLine,
            borderColor: '#dc2626',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [8, 4],
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 0
        }
    ];

    chartEvolucion = new Chart(ctx, {
        type: chartTipo === 'bar' ? 'bar' : 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { 
                duration: 1000, 
                easing: 'easeOutQuart'
            },
            interaction: { 
                mode: 'index', 
                intersect: false 
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    padding: 16,
                    cornerRadius: 10,
                    titleFont: { size: 14, weight: '700' },
                    bodyFont: { size: 12 },
                    bodySpacing: 8,
                    boxPadding: 6,
                    usePointStyle: true,
                    filter: (item) => {
                        // No mostrar tooltip para la línea de meta
                        if (item.dataset.label?.startsWith('Meta')) return false;
                        return item.parsed.y !== null && item.parsed.y !== 0;
                    },
                    callbacks: {
                        title: (items) => {
                            const index = items[0]?.dataIndex;
                            if (index === undefined) return '';
                            return `📅 ${datosGrafico.labelsCompletos[index]}`;
                        },
                        label: (ctx) => {
                            if (ctx.parsed.y === null) return null;
                            const value = ctx.parsed.y || 0;
                            const datasetLabel = ctx.dataset.label;
                            const icons = { 'Incorporadas': '✅', 'En Editorial': '📝' };
                            return ` ${icons[datasetLabel] || ''} ${datasetLabel}: ${value}`;
                        },
                        afterBody: (items) => {
                            const index = items[0]?.dataIndex;
                            if (index === undefined || !tieneDatos[index]) return '';
                            
                            const inc = incorporadas[index] || 0;
                            const faltan = metaTotal - inc;
                            const pct = metaTotal > 0 ? ((inc / metaTotal) * 100).toFixed(1) : 0;
                            
                            return [
                                '',
                                `━━━━━━━━━━━━━━━━━━`,
                                `🎯 Avance: ${pct}%`,
                                `📋 Faltan: ${faltan} preguntas`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { 
                        display: false 
                    },
                    ticks: { 
                        font: { size: 11, weight: '600' },
                        color: (context) => {
                            const index = context.index;
                            if (semanas[index] === semanaActual) return '#f59e0b';
                            return tieneDatos[index] ? '#475569' : '#94a3b8';
                        }
                    },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: suggestedMax,
                    grid: { 
                        color: 'rgba(0,0,0,0.05)',
                        drawBorder: false
                    },
                    ticks: { 
                        precision: 0, 
                        font: { size: 11 },
                        padding: 10,
                        color: '#64748b'
                    },
                    border: { display: false }
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
