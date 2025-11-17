// Estado global de la aplicación
const AppState = {
    datosADE: null,
    reportes: [],
    datosCorrelacionados: [],
    filtros: {
        semana: '',
        fecha: '',
        tematica: '',
        item: '',
        persona: '',
        estado: '',
        origen: ''
    }
};

// Estados disponibles
const ESTADOS = [
    'En elaboración',
    'En elaboración cartografía',
    'En cartografía',
    'En revisor técnico',
    'En coordinador',
    'En editorial',
    'Incorporada',
    'Subcontrato',
    'Pendiente'
];

// Colores para estados (basados en el gráfico compartido)
const ESTADO_COLORS = {
    'En elaboración': '#ff9800',          // Naranja
    'En elaboración cartografía': '#ffc107', // Amarillo
    'En cartografía': '#2196f3',          // Azul
    'En revisor técnico': '#17a2b8',      // Teal/Verde azulado
    'En coordinador': '#0056b3',          // Azul oscuro
    'En editorial': '#9c27b0',            // Púrpura
    'Incorporada': '#4caf50',             // Verde
    'Subcontrato': '#9e9e9e',             // Gris
    'Pendiente': '#757575'                // Gris oscuro
};

let PROGRAMACION_FECHAS = [];
let PROGRAMACION_FECHAS_CLAVES = [];
let PROGRAMACION_CLAVE_A_ETIQUETA = {};

function inicializarFechasProgramacion() {
    PROGRAMACION_FECHAS = [
        '07-11-2025',
        '14-11-2025',
        '21-11-2025',
        '28-11-2025',
        '05-12-2025',
        '12-12-2025',
        '19-12-2025',
        '26-12-2025',
        '02-01-2026',
        '09-01-2026'
    ].map(valor => {
        const clave = normalizarFechaClave(valor);
        return {
            original: valor,
            clave,
            etiqueta: formatearFechaCorta(clave || valor)
        };
    });

    PROGRAMACION_FECHAS_CLAVES = PROGRAMACION_FECHAS.map(item => item.clave);
    PROGRAMACION_CLAVE_A_ETIQUETA = PROGRAMACION_FECHAS.reduce((acc, item) => {
        if (item.clave) {
            acc[item.clave] = item.etiqueta;
        }
        return acc;
    }, {});
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    inicializarFechasProgramacion();
    inicializarApp();
    cargarDatosAlmacenados();
});

function inicializarApp() {
    // Event listeners para tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            cambiarTab(tabName);
        });
    });

    // Event listeners para botones
    document.getElementById('btnCargarDatos').addEventListener('click', () => {
        mostrarMenuCarga();
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
    document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
    document.getElementById('btnEliminarDatos').addEventListener('click', eliminarDatos);

    // Event listeners para filtros
    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', aplicarFiltros);
    });

    // Event listeners para inputs de archivo
    document.getElementById('inputADE').addEventListener('change', (e) => {
        cargarArchivoADE(e.target.files[0]);
    });

    document.getElementById('inputReporte').addEventListener('change', (e) => {
        cargarReporte(e.target.files[0]);
    });

    // Event listeners para modal
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('modalDetalle').addEventListener('click', (e) => {
        if (e.target.id === 'modalDetalle') {
            cerrarModal();
        }
    });
}

function cambiarTab(tabName) {
    // Actualizar tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}View`).classList.add('active');

    // Actualizar vista según tab
    if (tabName === 'dashboard') {
        actualizarDashboard();
    } else if (tabName === 'listado') {
        actualizarListado();
    } else if (tabName === 'atrasos') {
        actualizarAtrasos();
    } else if (tabName === 'evolucion') {
        actualizarEvolucion();
    } else if (tabName === 'subcontratos') {
        actualizarSubcontratos();
    }
}

function mostrarMenuCarga() {
    const menu = document.createElement('div');
    menu.className = 'modal';
    menu.style.display = 'flex';
    menu.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Cargar Datos</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <button class="btn-primary" style="width: 100%; justify-content: center;" onclick="document.getElementById('inputADE').click(); this.closest('.modal').remove();">
                        <i class="fas fa-database"></i> Cargar Datos ADE (Una vez)
                    </button>
                    <button class="btn-secondary" style="width: 100%; justify-content: center;" onclick="document.getElementById('inputReporte').click(); this.closest('.modal').remove();">
                        <i class="fas fa-file-alt"></i> Cargar Reporte Diario
                    </button>
                </div>
                <div style="margin-top: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 6px;">
                    <p style="font-size: 0.9rem; color: #666; margin: 0;">
                        <strong>Datos ADE:</strong> Archivo JSON con los datos fijos de la Adenda Excepcional (se carga una sola vez).<br><br>
                        <strong>Reporte Diario:</strong> Archivo JSON con el reporte del día (se pueden cargar múltiples reportes).
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(menu);
    
    // Cerrar al hacer click fuera
    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            menu.remove();
        }
    });
}

async function cargarArchivoADE(archivo) {
    if (!archivo) return;

    // Mostrar indicador de carga
    const statusEl = document.getElementById('fileStatus');
    statusEl.innerHTML = '<span class="loading"></span> Cargando datos ADE...';

    try {
        const texto = await leerArchivo(archivo);
        const datos = JSON.parse(texto);
        
        // Verificar estructura
        if (!Array.isArray(datos)) {
            throw new Error('El archivo ADE debe ser un array de objetos');
        }

        if (datos.length === 0) {
            throw new Error('El archivo ADE está vacío');
        }

        AppState.datosADE = datos;
        guardarEnLocalStorage('datosADE', datos);
        actualizarEstadoArchivo(`Datos ADE cargados (${datos.length} registros)`);
        correlacionarDatos();
        actualizarFiltros();
        actualizarDashboard();
        
        // Mostrar mensaje de éxito
        statusEl.style.color = 'var(--green)';
        setTimeout(() => {
            statusEl.style.color = '';
        }, 3000);
        
        // Limpiar input
        document.getElementById('inputADE').value = '';
    } catch (error) {
        actualizarEstadoArchivo('Error al cargar datos ADE');
        statusEl.style.color = 'var(--red)';
        alert('Error al cargar datos ADE: ' + error.message);
        console.error(error);
        setTimeout(() => {
            statusEl.style.color = '';
        }, 3000);
    }
}

async function cargarReporte(archivo) {
    if (!archivo) return;

    // Mostrar indicador de carga
    const statusEl = document.getElementById('fileStatus');
    statusEl.innerHTML = '<span class="loading"></span> Cargando reporte...';

    try {
        const texto = await leerArchivo(archivo);
        const datos = JSON.parse(texto);
        
        // Verificar estructura
        if (!datos.FechaReporte || !datos.SemanaReporte || !Array.isArray(datos.Registros)) {
            throw new Error('Formato de reporte inválido. Debe contener FechaReporte, SemanaReporte y Registros');
        }

        if (datos.Registros.length === 0) {
            throw new Error('El reporte no contiene registros');
        }

        // Verificar si ya existe un reporte con la misma fecha
        const existeReporte = AppState.reportes.find(r => 
            r.FechaReporte === datos.FechaReporte && r.SemanaReporte === datos.SemanaReporte
        );

        if (existeReporte) {
            const reemplazar = confirm(`Ya existe un reporte para la fecha ${datos.FechaReporte} (Semana ${datos.SemanaReporte}).\n\n¿Desea reemplazarlo?`);
            if (!reemplazar) {
                actualizarEstadoArchivo(`Reporte cancelado`);
                document.getElementById('inputReporte').value = '';
                return;
            }
            // Eliminar reporte existente
            AppState.reportes = AppState.reportes.filter(r => 
                !(r.FechaReporte === datos.FechaReporte && r.SemanaReporte === datos.SemanaReporte)
            );
        }

        AppState.reportes.push(datos);
        guardarEnLocalStorage('reportes', AppState.reportes);
        actualizarEstadoArchivo(`Reporte: ${datos.FechaReporte} - Semana ${datos.SemanaReporte} (${datos.Registros.length} registros)`);
        correlacionarDatos();
        actualizarFiltros();
        actualizarDashboard();
        
        // Mostrar mensaje de éxito
        statusEl.style.color = 'var(--green)';
        setTimeout(() => {
            statusEl.style.color = '';
        }, 3000);
        
        // Limpiar input
        document.getElementById('inputReporte').value = '';
    } catch (error) {
        actualizarEstadoArchivo('Error al cargar reporte');
        statusEl.style.color = 'var(--red)';
        alert('Error al cargar reporte: ' + error.message);
        console.error(error);
        setTimeout(() => {
            statusEl.style.color = '';
        }, 3000);
        document.getElementById('inputReporte').value = '';
    }
}

function leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(archivo, 'UTF-8');
    });
}

function correlacionarDatos() {
    if (!AppState.datosADE || AppState.reportes.length === 0) {
        AppState.datosCorrelacionados = [];
        return;
    }

    // Crear mapa de datos ADE por Correlativo
    const mapaADE = {};
    AppState.datosADE.forEach(item => {
        if (item.Correlativo) {
            mapaADE[item.Correlativo] = item;
        }
    });

    // Correlacionar con reportes
    AppState.datosCorrelacionados = [];
    
    AppState.reportes.forEach(reporte => {
        reporte.Registros.forEach(registro => {
            const correlativo = registro.Correlativo;
            const datoADE = mapaADE[correlativo];
            
            if (datoADE) {
                AppState.datosCorrelacionados.push({
                    ...datoADE,
                    ...registro,
                    FechaReporte: reporte.FechaReporte,
                    SemanaReporte: reporte.SemanaReporte
                });
            }
        });
    });
}

function aplicarFiltros() {
    // Obtener valores de filtros
    AppState.filtros.semana = document.getElementById('filterSemana').value;
    AppState.filtros.fecha = document.getElementById('filterFecha').value;
    AppState.filtros.tematica = document.getElementById('filterTematica').value;
    AppState.filtros.item = document.getElementById('filterItem').value;
    AppState.filtros.persona = document.getElementById('filterPersona').value;
    AppState.filtros.estado = document.getElementById('filterEstado').value;
    AppState.filtros.origen = document.getElementById('filterOrigen').value;

    actualizarDashboard();
}

function obtenerDatosFiltrados(opciones = {}) {
    const { deduplicar = true } = opciones;
    let datos = [...AppState.datosCorrelacionados];

    if (AppState.filtros.semana) {
        datos = datos.filter(d => d.SemanaReporte === parseInt(AppState.filtros.semana));
    }

    if (AppState.filtros.fecha) {
        datos = datos.filter(d => d.FechaReporte === AppState.filtros.fecha);
    }

    if (AppState.filtros.tematica) {
        datos = datos.filter(d => d.Tematica === AppState.filtros.tematica);
    }

    if (AppState.filtros.item) {
        datos = datos.filter(d => d.Item === AppState.filtros.item);
    }

    if (AppState.filtros.persona) {
        datos = datos.filter(d => 
            d.Elaborador === AppState.filtros.persona || 
            d.Revisor === AppState.filtros.persona
        );
    }

    if (AppState.filtros.estado) {
        datos = datos.filter(d => d.Estado === AppState.filtros.estado);
    }

    if (AppState.filtros.origen) {
        datos = datos.filter(d => d.Subcontrato === AppState.filtros.origen);
    }

    return deduplicar ? deduplicarPorCorrelativo(datos) : datos;
}

function deduplicarPorCorrelativo(datos) {
    const mapa = new Map();

    datos.forEach(item => {
        const correlativo = item?.Correlativo ?? item?.ID;
        if (!correlativo) return;

        const prioridadTemporal = obtenerPrioridadTemporal(item);
        const existente = mapa.get(correlativo);

        if (!existente || prioridadTemporal >= existente.prioridad) {
            mapa.set(correlativo, { prioridad: prioridadTemporal, registro: item });
        }
    });

    return Array.from(mapa.values()).map(entry => entry.registro);
}

function parseFechaFlexible(valor) {
    if (!valor) return null;

    if (typeof valor === 'string') {
        // Formato dd-mm-yyyy
        const matchDDMMYYYY = valor.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (matchDDMMYYYY) {
            const [, dia, mes, anio] = matchDDMMYYYY;
            return new Date(
                parseInt(anio, 10),
                parseInt(mes, 10) - 1,
                parseInt(dia, 10)
            );
        }

        // Formato ISO yyyy-mm-dd (evitar conversión UTC)
        const matchISO = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (matchISO) {
            const [, anio, mes, dia] = matchISO;
            return new Date(
                parseInt(anio, 10),
                parseInt(mes, 10) - 1,
                parseInt(dia, 10)
            );
        }
    }

    const timestamp = Date.parse(valor);
    if (Number.isNaN(timestamp)) {
        return null;
    }

    return new Date(timestamp);
}

function obtenerPrioridadTemporal(item) {
    if (item?.FechaReporte) {
        const fecha = parseFechaFlexible(item.FechaReporte);
        if (fecha) {
            return fecha.getTime();
        }
    }

    if (item?.SemanaReporte) {
        const semana = parseInt(item.SemanaReporte, 10);
        if (!Number.isNaN(semana)) {
            return semana;
        }
    }

    return 0;
}

function actualizarDashboard() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('dashboardCards');
    const kpiContainer = document.getElementById('kpiCards');
    
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

    // Calcular KPIs
    const kpis = calcularKPIs(datos);
    kpiContainer.innerHTML = crearKPICards(kpis);

    const resumenProgramacion = prepararDatosProgramacion(datos);
    
    const distribucionEstado = calcularDistribucionPorEstado(datos);
    const cardDistribucion = crearCardDistribucion(
        'Total General',
        distribucionEstado,
        datos.length
    );

    const cardProgramacion = resumenProgramacion.labels.length
        ? crearCardProgramacion(resumenProgramacion)
        : '';

    container.innerHTML = cardDistribucion + cardProgramacion;

    // Inicializar gráficos
    inicializarGraficos(resumenProgramacion);
    
    // Aplicar colores dinámicos a los indicadores
    setTimeout(() => {
        document.querySelectorAll('.status-indicator[data-color]').forEach(indicator => {
            const color = indicator.getAttribute('data-color');
            indicator.style.backgroundColor = color;
        });

        // Agregar listeners para filas clickeables
        document.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', () => {
                const estado = row.dataset.estado;
                const datosFiltrados = obtenerDatosFiltrados().filter(d => d.Estado === estado);
                mostrarVistaItems(estado, datosFiltrados);
            });
        });
    }, 100);
}

// Variables para ordenamiento
let ordenActual = {
    columna: null,
    direccion: 'asc'
};

function actualizarListado() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('listadoContent');
    
    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-table"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

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
    `;

    datos.forEach(item => {
        const claseEstado = item.Estado ? item.Estado.toLowerCase().replace(/\s+/g, '-') : '';
        const color = ESTADO_COLORS[item.Estado] || '#999';
        html += `
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
                <td>${item.FechaEntrega || ''}</td>
                <td>
                    <button class="btn-icon" onclick="mostrarDetalleItem(${item.Correlativo})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div class="listado-footer">
            <span>Mostrando ${datos.length} registro(s)</span>
        </div>
    `;

    container.innerHTML = html;

    // Aplicar colores y agregar listeners
    setTimeout(() => {
        document.querySelectorAll('.status-indicator[data-color]').forEach(indicator => {
            const color = indicator.getAttribute('data-color');
            indicator.style.backgroundColor = color;
        });

        // Event listeners para búsqueda
        document.getElementById('buscarListado').addEventListener('input', filtrarListado);
        document.getElementById('ordenarListado').addEventListener('change', ordenarListado);

        // Event listeners para ordenamiento por click en headers
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const columna = header.dataset.col;
                ordenarPorColumna(columna);
            });
        });

        // Event listeners para filas clickeables
        document.querySelectorAll('.clickable-row-detalle').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon')) {
                    const id = row.dataset.id;
                    mostrarDetalleItem(parseInt(id));
                }
            });
        });
    }, 100);
}

function filtrarListado() {
    const busqueda = document.getElementById('buscarListado').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaListado tbody tr');
    
    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        fila.style.display = texto.includes(busqueda) ? '' : 'none';
    });
}

function ordenarListado() {
    const select = document.getElementById('ordenarListado');
    const columna = select.value;
    if (columna) {
        ordenarPorColumna(columna);
    }
}

function ordenarPorColumna(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'asc';
    }

    const datos = obtenerDatosFiltrados();
    const datosOrdenados = [...datos].sort((a, b) => {
        // Para "Item" (Consulta), usar Pregunta o Item
        let valorA, valorB;
        if (columna === 'Item') {
            valorA = a.Pregunta || a.Item || '';
            valorB = b.Pregunta || b.Item || '';
        } else {
            valorA = a[columna] || '';
            valorB = b[columna] || '';
        }

        // Para números, comparar numéricamente
        if (columna === 'Correlativo' && !isNaN(valorA) && !isNaN(valorB)) {
            valorA = parseInt(valorA) || 0;
            valorB = parseInt(valorB) || 0;
            const comparacion = valorA - valorB;
            return ordenActual.direccion === 'asc' ? comparacion : -comparacion;
        }

        // Para fechas, comparar como fechas
        if (columna === 'FechaEntrega' && valorA && valorB) {
            const fechaA = new Date(valorA);
            const fechaB = new Date(valorB);
            const comparacion = fechaA - fechaB;
            return ordenActual.direccion === 'asc' ? comparacion : -comparacion;
        }

        // Para texto, comparar como string
        valorA = String(valorA).toLowerCase();
        valorB = String(valorB).toLowerCase();

        let comparacion = 0;
        if (valorA < valorB) comparacion = -1;
        if (valorA > valorB) comparacion = 1;

        return ordenActual.direccion === 'asc' ? comparacion : -comparacion;
    });

    // Actualizar tabla
    const tbody = document.querySelector('#tablaListado tbody');
    tbody.innerHTML = '';

    datosOrdenados.forEach(item => {
        const claseEstado = item.Estado ? item.Estado.toLowerCase().replace(/\s+/g, '-') : '';
        const color = ESTADO_COLORS[item.Estado] || '#999';
        const row = document.createElement('tr');
        row.className = 'clickable-row-detalle';
        row.dataset.id = item.Correlativo;
        row.innerHTML = `
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
            <td>${item.FechaEntrega || ''}</td>
            <td>
                <button class="btn-icon" onclick="mostrarDetalleItem(${item.Correlativo})" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Actualizar iconos de ordenamiento
    document.querySelectorAll('.sortable i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    const headerActual = document.querySelector(`[data-col="${columna}"]`);
    if (headerActual) {
        const icon = headerActual.querySelector('i');
        icon.className = ordenActual.direccion === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }

    // Reaplicar colores y listeners
    setTimeout(() => {
        document.querySelectorAll('.status-indicator[data-color]').forEach(indicator => {
            const color = indicator.getAttribute('data-color');
            indicator.style.backgroundColor = color;
        });

        document.querySelectorAll('.clickable-row-detalle').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon')) {
                    const id = row.dataset.id;
                    mostrarDetalleItem(parseInt(id));
                }
            });
        });
    }, 50);
}

function mostrarDetalleItem(correlativo) {
    const datos = obtenerDatosFiltrados();
    const item = datos.find(d => d.Correlativo === correlativo);
    
    if (!item) {
        alert('No se encontró el elemento');
        return;
    }

    mostrarDetalle(item);
}

function mostrarVistaItems(estado, items) {
    if (items.length === 0) return;
    
    const itemsPorPagina = 200;
    const paginaActual = 1;
    const itemsMostrar = items.slice(0, itemsPorPagina);
    
    // Preparar header del modal
    const estadoText = `${estado} (${items.length} items)`;
    
    let html = '<div class="vista-items-content">';
    
    itemsMostrar.forEach(item => {
        const colorEstado = ESTADO_COLORS[item.Estado] || '#999';
        const badges = [];
        
        // Determinar badges
        if (item.Estado === 'Incorporada') {
            badges.push('<span class="badge-item badge-adc">ADC</span>');
            badges.push(`<span class="badge-item badge-incorporada">Incorporada</span>`);
        } else {
            badges.push('<span class="badge-item badge-adc">ADC</span>');
            badges.push(`<span class="badge-item badge-estado" style="background-color: ${colorEstado}20; color: ${colorEstado}; border-color: ${colorEstado};">${item.Estado}</span>`);
        }
        
        html += `
            <div class="item-card" data-correlativo="${item.Correlativo}">
                <div class="item-header">
                    <span class="item-id">${item.ID || item.Correlativo || 'N/A'}</span>
                    <div class="item-badges">
                        ${badges.join('')}
                    </div>
                </div>
                <div class="item-info">
                    <div class="info-row">
                        <span class="info-label">Temática:</span>
                        <span class="info-value">${item.Tematica || item.TematicaGeneral || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Elaborador:</span>
                        <span class="info-value">${item.Elaborador || 'Sin asignar'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Revisor:</span>
                        <span class="info-value">${item.Revisor || 'Sin asignar'}</span>
                    </div>
                    ${item.Coordinador ? `
                    <div class="info-row">
                        <span class="info-label">Coordinador:</span>
                        <span class="info-value">${item.Coordinador}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">Subcontrato:</span>
                        <span class="info-value">${item.Subcontrato || 'N/A'}</span>
                    </div>
                </div>
                <div class="item-text">
                    ${item.Pregunta || item.Item || 'Sin descripción'}
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
    `;
    
    // Crear footer del modal
    const modalFooter = document.createElement('div');
    modalFooter.className = 'vista-items-footer';
    modalFooter.innerHTML = `
        <div class="footer-info">
            <i class="fas fa-info-circle"></i>
            <span>Mostrando ${itemsMostrar.length} de ${items.length} items</span>
        </div>
        <div class="footer-hint">
            Usa filtros para ver resultados más específicos
        </div>
    `;
    
    abrirModalVista(html, modalFooter, estadoText);
}

function abrirModalVista(contenido, footer, titulo) {
    const modal = document.getElementById('modalDetalle');
    const modalBody = document.getElementById('modalBody');
    const modalContent = document.querySelector('.modal-content');
    
    // Actualizar header
    const modalHeader = document.querySelector('.modal-header h2');
    if (modalHeader && titulo) {
        modalHeader.textContent = titulo;
        modalHeader.style.display = 'block';
    }
    
    modalBody.className = 'modal-body vista-items-body';
    modalBody.innerHTML = contenido;
    
    // Remover footer anterior si existe
    const footerAnterior = modalContent.querySelector('.vista-items-footer');
    if (footerAnterior) {
        footerAnterior.remove();
    }
    
    // Agregar nuevo footer
    if (footer) {
        modalContent.appendChild(footer);
    }
    
    modal.style.display = 'flex';
    
    // Agregar listeners a los cards
    setTimeout(() => {
        document.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const correlativo = card.dataset.correlativo;
                if (correlativo) {
                    mostrarDetalleItem(parseInt(correlativo));
                }
            });
        });
    }, 100);
}

function mostrarDetalle(item) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let diasAtraso = '';
    
    if (item.FechaEntrega && item.Estado !== 'Incorporada') {
        const fechaEntrega = new Date(item.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);
        if (fechaEntrega < hoy) {
            const diffTime = hoy - fechaEntrega;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            diasAtraso = `<div class="dias-atraso" style="margin-top: 1rem;">⚠️ <strong>Atraso:</strong> ${diffDays} días</div>`;
        }
    }

    const html = `
        <div class="detalle-item">
            <div class="detalle-field">
                <label>N° (Correlativo):</label>
                <div>${item.Correlativo || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>ID:</label>
                <div>${item.ID || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Ítem:</label>
                <div>${item.Item || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Pregunta:</label>
                <div class="detalle-texto-largo">${item.Pregunta || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Temática General:</label>
                <div>${item.TematicaGeneral || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Temática:</label>
                <div>${item.Tematica || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Componente:</label>
                <div>${item.Componente || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Subcontrato:</label>
                <div>${item.Subcontrato || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Elaborador:</label>
                <div>${item.Elaborador || 'Sin asignar'}</div>
            </div>
            <div class="detalle-field">
                <label>Revisor:</label>
                <div>${item.Revisor || 'Sin asignar'}</div>
            </div>
            <div class="detalle-field">
                <label>Estado:</label>
                <div>
                    <span class="status-indicator" data-color="${ESTADO_COLORS[item.Estado] || '#999'}" style="background-color: ${ESTADO_COLORS[item.Estado] || '#999'};"></span>
                    ${item.Estado || 'N/A'}
                </div>
            </div>
            <div class="detalle-field">
                <label>Fecha de Entrega:</label>
                <div>${item.FechaEntrega || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Fecha de Reporte:</label>
                <div>${item.FechaReporte || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Semana de Reporte:</label>
                <div>${item.SemanaReporte || 'N/A'}</div>
            </div>
            ${diasAtraso}
        </div>
    `;

    abrirModal(html);
}

function abrirModal(contenido) {
    const modal = document.getElementById('modalDetalle');
    const modalBody = document.getElementById('modalBody');
    const modalContent = document.querySelector('.modal-content');
    const modalHeader = document.querySelector('.modal-header h2');
    
    // Restaurar header
    if (modalHeader) {
        modalHeader.textContent = 'Detalle de Pregunta';
        modalHeader.style.display = 'block';
    }
    
    // Remover footer si existe
    const footerAnterior = modalContent.querySelector('.vista-items-footer');
    if (footerAnterior) {
        footerAnterior.remove();
    }
    
    modalBody.className = 'modal-body';
    modalBody.innerHTML = contenido;
    modal.style.display = 'flex';
    
    // Aplicar color a indicadores en el modal
    setTimeout(() => {
        document.querySelectorAll('#modalBody .status-indicator[data-color]').forEach(indicator => {
            const color = indicator.getAttribute('data-color');
            indicator.style.backgroundColor = color;
        });
    }, 50);
}

function cerrarModal() {
    document.getElementById('modalDetalle').style.display = 'none';
}

// Hacer función global para onclick
window.mostrarDetalleItem = mostrarDetalleItem;

function calcularKPIs(datos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Calcular atrasos (solo las que están "En elaboración" y con fecha vencida)
    const atrasos = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
        const fechaEntrega = new Date(d.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);
        return fechaEntrega < hoy;
    });

    // Calcular por vencer (próximos 7 días)
    const porVencer = datos.filter(d => {
        if (!d.FechaEntrega || d.Estado === 'Incorporada') return false;
        const fechaEntrega = new Date(d.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);
        const diffTime = fechaEntrega - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    });

    // Calcular incorporadas
    const incorporadas = datos.filter(d => d.Estado === 'Incorporada').length;

    // Calcular en proceso
    const enProceso = datos.filter(d => 
        d.Estado !== 'Incorporada' && d.Estado !== 'Pendiente'
    ).length;

    // Calcular "En trabajo" (todas las que NO sean "En elaboración" ni "En editorial")
    const enTrabajo = datos.filter(d => 
        d.Estado !== 'En elaboración' && 
        d.Estado !== 'En editorial' &&
        d.Estado !== 'Incorporada' &&
        d.Estado !== 'Pendiente'
    ).length;

    // Calcular "En editorial"
    const enEditorial = datos.filter(d => d.Estado === 'En editorial').length;

    return {
        total: datos.length,
        incorporadas: incorporadas,
        enProceso: enProceso,
        atrasos: atrasos.length,
        porVencer: porVencer.length,
        enTrabajo: enTrabajo,
        enEditorial: enEditorial,
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
        .filter(([_, cantidad]) => cantidad > 0)
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

    // Calcular datos para gráfico
    const datosGrafico = Object.entries(distribucion)
        .filter(([_, cantidad]) => cantidad > 0)
        .map(([estado, cantidad]) => ({
            label: estado,
            value: cantidad,
            color: ESTADO_COLORS[estado] || '#999'
        }));

    const porcentajeTotal = total > 0 ? '100%' : '0%';

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
    // Destruir gráfico anterior si existe y es válido
    if (window.chartTotalGeneral && typeof window.chartTotalGeneral.destroy === 'function') {
        try {
            window.chartTotalGeneral.destroy();
        } catch (e) {
            console.warn('Error al destruir gráfico anterior:', e);
        }
        window.chartTotalGeneral = null;
    }

    // Esperar a que el canvas esté disponible
    setTimeout(() => {
        const canvas = document.getElementById('chartTotalGeneral');
        if (!canvas) {
            console.error('Canvas no encontrado');
            return;
        }

        const datos = obtenerDatosFiltrados();
        if (datos.length === 0) {
            return;
        }

        const distribucion = calcularDistribucionPorEstado(datos);
        const total = datos.length;

        const datosGrafico = Object.entries(distribucion)
            .filter(([_, cantidad]) => cantidad > 0)
            .sort(([estadoA], [estadoB]) => estadoA.localeCompare(estadoB))
            .map(([estado, cantidad]) => ({
                label: estado,
                value: cantidad,
                color: ESTADO_COLORS[estado] || '#999'
            }));

        if (datosGrafico.length === 0) {
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Asegurar que el canvas tenga dimensiones
        const parent = canvas.parentElement;
        if (parent) {
            const width = parent.offsetWidth || 400;
            const height = parent.offsetHeight || 250;
            canvas.width = width;
            canvas.height = height;
        }

        try {
            window.chartTotalGeneral = new Chart(ctx, {
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
                        padding: {
                            top: 10,
                            bottom: 10,
                            left: 10,
                            right: 10
                        }
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
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            padding: 14,
                            titleFont: {
                                size: 15,
                                weight: 'bold',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            bodyFont: {
                                size: 13,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: true,
                            boxPadding: 8,
                            callbacks: {
                                title: function(context) {
                                    return context[0].label || '';
                                },
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${value} preguntas (${porcentaje}%)`;
                                },
                                labelColor: function(context) {
                                    return {
                                        borderColor: datosGrafico[context.dataIndex]?.color || '#999',
                                        backgroundColor: datosGrafico[context.dataIndex]?.color || '#999'
                                    };
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
                    onClick: (event, activeElements) => {
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
                    beforeDraw: function(chart) {
                        if (!chart.chartArea || !chart.chartArea.left) return;
                        const ctx = chart.ctx;
                        const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                        const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                        
                        ctx.save();
                        
                        // Sombra para el texto principal
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                        ctx.shadowBlur = 4;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 2;
                        
                        // Texto principal (número)
                        ctx.font = 'bold 3.5rem "Segoe UI", Arial, sans-serif';
                        ctx.fillStyle = '#003978';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(total.toString(), centerX, centerY - 12);
                        
                        // Resetear sombra
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 0;
                        
                        // Texto secundario (etiqueta)
                        ctx.font = '0.95rem "Segoe UI", Arial, sans-serif';
                        ctx.fillStyle = '#666';
                        ctx.fillText('Preguntas', centerX, centerY + 22);
                        
                        ctx.restore();
                    }
                }]
            });
        } catch (error) {
            console.error('Error al inicializar gráfico:', error);
            if (canvas && canvas.parentElement) {
                canvas.parentElement.innerHTML = '<p style="color: #f44336; text-align: center; padding: 2rem;">Error al cargar el gráfico. Por favor, recarga la página.</p>';
            }
        }
    }, 300);

    inicializarGraficoProgramacion(resumenProgramacion);
}

function inicializarGraficoProgramacion(resumenProgramacion) {
    if (window.chartProgramacion && typeof window.chartProgramacion.destroy === 'function') {
        try {
            window.chartProgramacion.destroy();
        } catch (e) {
            console.warn('Error al destruir gráfico de programación anterior:', e);
        }
        window.chartProgramacion = null;
    }

    if (!resumenProgramacion || !resumenProgramacion.labels?.length || !resumenProgramacion.datasets?.length) {
        return;
    }

    const canvas = document.getElementById('chartProgramacion');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    if (parent) {
        const width = parent.offsetWidth || 800;
        const height = parent.offsetHeight || 400;
        canvas.width = width;
        canvas.height = height;
    }

    window.chartProgramacion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: resumenProgramacion.labels,
            datasets: resumenProgramacion.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
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
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 20
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Preguntas'
                    },
                    ticks: {
                        precision: 0
                    }
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

    // Agrupar por fecha de entrega para mostrar cuántas preguntas vencen en cada semana
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

    // Inicializar todas las fechas de control con ceros
    PROGRAMACION_FECHAS.forEach(({ clave, etiqueta }) => {
        inicializarRegistro(clave, etiqueta);
    });

    // Crear array de fechas de control como Date objects para comparación
    const fechasControl = PROGRAMACION_FECHAS_CLAVES.map(clave => {
        const fecha = parseFechaFlexible(clave);
        return { clave, fecha };
    }).filter(item => item.fecha !== null);

    // Agrupar datos por fecha de entrega
    datos.forEach(item => {
        // Solo considerar preguntas que están en los estados de programación
        if (!estadosProgramacion.includes(item.Estado)) {
            return;
        }

        const fechaEntrega = item.FechaEntrega;
        if (!fechaEntrega) {
            return;
        }

        const fechaEntregaDate = parseFechaFlexible(fechaEntrega);
        if (!fechaEntregaDate) {
            return;
        }

        // Encontrar la semana de control más cercana (hacia adelante)
        // Las fechas de control son jueves semanales
        let semanaAsignada = null;
        
        for (let i = 0; i < fechasControl.length; i++) {
            const fechaControl = fechasControl[i].fecha;
            
            // Si la fecha de entrega es <= a la fecha de control, asignar a esa semana
            if (fechaEntregaDate <= fechaControl) {
                semanaAsignada = fechasControl[i].clave;
                break;
            }
        }

        // Si no encontró semana (fecha posterior a todas), asignar a la última
        if (!semanaAsignada && fechasControl.length > 0) {
            semanaAsignada = fechasControl[fechasControl.length - 1].clave;
        }

        if (semanaAsignada && agrupado[semanaAsignada]) {
            agrupado[semanaAsignada].total += 1;
            agrupado[semanaAsignada][item.Estado] += 1;
        }
    });

    const llavesOrdenadas = PROGRAMACION_FECHAS_CLAVES.filter(Boolean);

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
        agrupado[key]?.displayLabel || PROGRAMACION_CLAVE_A_ETIQUETA[key] || formatearFechaCorta(key)
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
        fecha: agrupado[key]?.displayLabel || PROGRAMACION_CLAVE_A_ETIQUETA[key] || formatearFechaCorta(key),
        valores: estadosConDatos.map(estado => agrupado[key]?.[estado] || 0)
    }));

    return {
        labels,
        datasets,
        tabla,
        estados: estadosConDatos
    };
}

function normalizarFechaClave(valor) {
    if (!valor) return 'Sin fecha';

    const fecha = parseFechaFlexible(valor);
    if (!fecha) {
        return valor;
    }

    fecha.setHours(0, 0, 0, 0);
    return formatearClaveLocal(fecha);
}

function formatearFechaCorta(valor) {
    if (!valor || valor === 'Sin fecha') {
        return valor || 'Sin fecha';
    }

    const fecha = parseFechaFlexible(valor);
    if (!fecha) {
        return valor;
    }

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = String(fecha.getFullYear()).slice(-2);

    return `${dia}-${mes}-${anio}`;
}

function formatearClaveLocal(fecha) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function compararFechasParaOrden(a, b) {
    const fechaA = parseFechaFlexible(a);
    const fechaB = parseFechaFlexible(b);

    if (fechaA && fechaB) {
        return fechaA.getTime() - fechaB.getTime();
    }

    if (fechaA) return -1;
    if (fechaB) return 1;
    return String(a).localeCompare(String(b));
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

function actualizarFiltros() {
    const datos = AppState.datosCorrelacionados;
    
    if (datos.length === 0) return;

    // Obtener valores únicos
    const semanas = [...new Set(datos.map(d => d.SemanaReporte))].sort((a, b) => b - a);
    const fechas = [...new Set(datos.map(d => d.FechaReporte))].sort().reverse();
    const tematicas = [...new Set(datos.map(d => d.Tematica).filter(Boolean))].sort();
    const items = [...new Set(datos.map(d => d.Item).filter(Boolean))].sort();
    const personas = [...new Set([
        ...datos.map(d => d.Elaborador).filter(Boolean),
        ...datos.map(d => d.Revisor).filter(Boolean)
    ])].sort();
    const estados = [...new Set(datos.map(d => d.Estado).filter(Boolean))].sort();
    const origenes = [...new Set(datos.map(d => d.Subcontrato).filter(Boolean))].sort();

    // Actualizar selects
    actualizarSelect('filterSemana', semanas, 'Semana');
    actualizarSelect('filterFecha', fechas, 'Fecha');
    actualizarSelect('filterTematica', tematicas, 'Temática');
    actualizarSelect('filterItem', items, 'Ítem');
    actualizarSelect('filterPersona', personas, 'Persona');
    actualizarSelect('filterEstado', estados, 'Estado');
    actualizarSelect('filterOrigen', origenes, 'Origen');
}

function actualizarSelect(id, valores, prefijo) {
    const select = document.getElementById(id);
    const valorActual = select.value;
    
    // Mantener primera opción (Todas/Todos)
    const primeraOpcion = select.options[0];
    select.innerHTML = '';
    select.appendChild(primeraOpcion);
    
    // Agregar opciones
    valores.forEach(valor => {
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = `${prefijo === 'Semana' ? 'Semana ' : ''}${valor}`;
        select.appendChild(option);
    });
    
    // Restaurar valor si existe
    if (valorActual && Array.from(select.options).some(opt => opt.value === valorActual)) {
        select.value = valorActual;
    }
}

function limpiarFiltros() {
    document.querySelectorAll('.filter-select').forEach(select => {
        select.value = '';
    });
    aplicarFiltros();
}

function actualizarEvolucion() {
    const datos = obtenerDatosFiltrados({ deduplicar: false });
    const container = document.getElementById('evolucionContent');
    
    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    // Agrupar por fecha de reporte
    const porFecha = {};
    datos.forEach(d => {
        const fecha = d.FechaReporte || 'Sin fecha';
        if (!porFecha[fecha]) {
            porFecha[fecha] = {
                fecha: fecha,
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

    const fechas = Object.keys(porFecha).sort();
    const labels = fechas;
    const datosTotal = fechas.map(f => porFecha[f].total);
    const datosIncorporadas = fechas.map(f => porFecha[f].incorporadas);
    const datosEnProceso = fechas.map(f => porFecha[f].enProceso);

    container.innerHTML = `
        <div class="chart-container">
            <canvas id="chartEvolucion"></canvas>
        </div>
    `;

    // Inicializar gráfico de evolución
    // Destruir gráfico anterior si existe y es válido
    if (window.chartEvolucion && typeof window.chartEvolucion.destroy === 'function') {
        try {
            window.chartEvolucion.destroy();
        } catch (e) {
            console.warn('Error al destruir gráfico de evolución anterior:', e);
        }
        window.chartEvolucion = null;
    }

    setTimeout(() => {
        const canvas = document.getElementById('chartEvolucion');
        if (!canvas) {
            console.error('Canvas de evolución no encontrado');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Asegurar que el canvas tenga dimensiones
        const parent = canvas.parentElement;
        if (parent) {
            const width = parent.offsetWidth || 800;
            const height = 400;
            canvas.width = width;
            canvas.height = height;
        }

        try {
            window.chartEvolucion = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
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
                    animation: {
                        duration: 1000
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        title: {
                            display: true,
                            text: 'Evolución Temporal de Estados',
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error al inicializar gráfico de evolución:', error);
        }
    }, 300);
}

function actualizarAtrasos() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('atrasosContent');
    
    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Calcular atrasos (solo las que están "En elaboración" y con fecha vencida)
    const atrasos = datos
        .filter(d => {
            if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            return fechaEntrega < hoy;
        })
        .map(d => {
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            const diffTime = hoy - fechaEntrega;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return {
                ...d,
                diasAtraso: diffDays
            };
        })
        .sort((a, b) => b.diasAtraso - a.diasAtraso);

    // Agrupar por persona (elaborador)
    const porPersona = {};
    atrasos.forEach(item => {
        const persona = item.Elaborador || 'Sin asignar';
        if (!porPersona[persona]) {
            porPersona[persona] = {
                persona: persona,
                cantidad: 0,
                totalDias: 0,
                items: []
            };
        }
        porPersona[persona].cantidad++;
        porPersona[persona].totalDias += item.diasAtraso;
        porPersona[persona].items.push(item);
    });

    // Calcular promedio por persona
    Object.keys(porPersona).forEach(persona => {
        porPersona[persona].promedioDias = Math.round(porPersona[persona].totalDias / porPersona[persona].cantidad);
    });

    // Ordenar por cantidad de atrasos
    const personasOrdenadas = Object.values(porPersona).sort((a, b) => b.cantidad - a.cantidad);

    if (atrasos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle success-icon"></i>
                <p>¡Excelente! No hay atrasos registrados</p>
            </div>
        `;
        return;
    }

    const diasPromedio = Math.round(atrasos.reduce((sum, a) => sum + a.diasAtraso, 0) / atrasos.length);

    let html = `
        <div class="atrasos-section">
            <h3 class="section-subtitle">Resumen de Atrasos</h3>
            <div class="kpi-cards kpi-cards-compact">
                <div class="kpi-card red">
                    <div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="kpi-title">Total Atrasos</div>
                    <div class="kpi-value">${atrasos.length}</div>
                    <div class="kpi-subtitle">Preguntas con fecha vencida</div>
                </div>
                <div class="kpi-card orange">
                    <div class="kpi-icon"><i class="fas fa-users"></i></div>
                    <div class="kpi-title">Personas Afectadas</div>
                    <div class="kpi-value">${personasOrdenadas.length}</div>
                    <div class="kpi-subtitle">Elaboradores con atrasos</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon"><i class="fas fa-calendar"></i></div>
                    <div class="kpi-title">Días Promedio</div>
                    <div class="kpi-value">${diasPromedio}</div>
                    <div class="kpi-subtitle">Días de atraso promedio</div>
                </div>
            </div>
        </div>

        <h3 class="section-subtitle">Atrasos por Persona</h3>
        <table class="atrasos-table">
            <thead>
                <tr>
                    <th>Persona</th>
                    <th>Cantidad</th>
                    <th>Días Promedio</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
    `;

    personasOrdenadas.forEach(persona => {
        const badgeClass = persona.promedioDias > 30 ? 'badge-danger' : 
                          persona.promedioDias > 14 ? 'badge-warning' : 'badge-success';
        html += `
            <tr>
                <td><strong>${persona.persona}</strong></td>
                <td>${persona.cantidad}</td>
                <td><span class="dias-atraso">${persona.promedioDias} días</span></td>
                <td><span class="badge ${badgeClass}">${persona.promedioDias > 30 ? 'Crítico' : persona.promedioDias > 14 ? 'Alto' : 'Moderado'}</span></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <h3 class="section-subtitle">Detalle de Atrasos</h3>
        <div class="listado-controls">
            <div class="search-box">
                <input type="text" id="buscarAtrasos" placeholder="Buscar..." class="search-input">
                <i class="fas fa-search"></i>
            </div>
            <div class="orden-controls">
                <label>Ordenar por:</label>
                <select id="ordenarAtrasos" class="filter-select">
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
                    <option value="diasAtraso">Días Atraso</option>
                </select>
            </div>
        </div>
        <div class="table-wrapper">
            <table class="listado-table" id="tablaAtrasos">
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
                        <th data-col="diasAtraso" class="sortable">Días Atraso <i class="fas fa-sort"></i></th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    atrasos.forEach(item => {
        const claseEstado = item.Estado ? item.Estado.toLowerCase().replace(/\s+/g, '-') : '';
        const color = ESTADO_COLORS[item.Estado] || '#999';
        const badgeClass = item.diasAtraso > 30 ? 'badge-danger' : 
                          item.diasAtraso > 14 ? 'badge-warning' : 'badge-success';
        html += `
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
                <td>${item.FechaEntrega || ''}</td>
                <td><span class="dias-atraso ${badgeClass}">${item.diasAtraso} días</span></td>
                <td>
                    <button class="btn-icon" onclick="mostrarDetalleItem(${item.Correlativo})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div class="listado-footer">
            <span>Mostrando ${atrasos.length} registro(s)</span>
        </div>
    `;

    container.innerHTML = html;

    // Aplicar colores y agregar listeners para la tabla de atrasos
    setTimeout(() => {
        document.querySelectorAll('#tablaAtrasos .status-indicator[data-color]').forEach(indicator => {
            const color = indicator.getAttribute('data-color');
            indicator.style.backgroundColor = color;
        });

        // Event listeners para búsqueda
        const buscarAtrasos = document.getElementById('buscarAtrasos');
        if (buscarAtrasos) {
            buscarAtrasos.addEventListener('input', () => filtrarListadoAtrasos());
        }

        // Event listeners para ordenamiento
        const ordenarAtrasos = document.getElementById('ordenarAtrasos');
        if (ordenarAtrasos) {
            ordenarAtrasos.addEventListener('change', () => ordenarListadoAtrasos());
        }

        // Event listeners para ordenamiento por click en headers
        document.querySelectorAll('#tablaAtrasos .sortable').forEach(header => {
            header.addEventListener('click', () => {
                const columna = header.dataset.col;
                ordenarPorColumnaAtrasos(columna, atrasos);
            });
        });

        // Event listeners para filas clickeables
        document.querySelectorAll('#tablaAtrasos .clickable-row-detalle').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon')) {
                    const id = row.dataset.id;
                    mostrarDetalleItem(parseInt(id));
                }
            });
        });
    }, 100);
}

// Funciones auxiliares para la tabla de atrasos
function filtrarListadoAtrasos() {
    const busqueda = document.getElementById('buscarAtrasos').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaAtrasos tbody tr');
    
    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        fila.style.display = texto.includes(busqueda) ? '' : 'none';
    });
}

function ordenarListadoAtrasos() {
    const select = document.getElementById('ordenarAtrasos');
    const columna = select.value;
    if (columna) {
        const datos = obtenerDatosFiltrados();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const atrasos = datos
            .filter(d => {
                if (!d.FechaEntrega || d.Estado !== 'En elaboración') return false;
                const fechaEntrega = new Date(d.FechaEntrega);
                fechaEntrega.setHours(0, 0, 0, 0);
                return fechaEntrega < hoy;
            })
            .map(d => {
                const fechaEntrega = new Date(d.FechaEntrega);
                fechaEntrega.setHours(0, 0, 0, 0);
                const diffTime = hoy - fechaEntrega;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return {
                    ...d,
                    diasAtraso: diffDays
                };
            });
        ordenarPorColumnaAtrasos(columna, atrasos);
    }
}

// Variable para ordenamiento de atrasos
let ordenActualAtrasos = {
    columna: null,
    direccion: 'asc'
};

function ordenarPorColumnaAtrasos(columna, datosAtrasos) {
    if (ordenActualAtrasos.columna === columna) {
        ordenActualAtrasos.direccion = ordenActualAtrasos.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActualAtrasos.columna = columna;
        ordenActualAtrasos.direccion = 'asc';
    }

    const datosOrdenados = [...datosAtrasos].sort((a, b) => {
        // Para "Item" (Consulta), usar Pregunta o Item
        let valorA, valorB;
        if (columna === 'Item') {
            valorA = a.Pregunta || a.Item || '';
            valorB = b.Pregunta || b.Item || '';
        } else if (columna === 'diasAtraso') {
            valorA = a.diasAtraso || 0;
            valorB = b.diasAtraso || 0;
            const comparacion = valorA - valorB;
            return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
        } else {
            valorA = a[columna] || '';
            valorB = b[columna] || '';
        }

        // Para números, comparar numéricamente
        if (columna === 'Correlativo' && !isNaN(valorA) && !isNaN(valorB)) {
            valorA = parseInt(valorA) || 0;
            valorB = parseInt(valorB) || 0;
            const comparacion = valorA - valorB;
            return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
        }

        // Para fechas, comparar como fechas
        if (columna === 'FechaEntrega' && valorA && valorB) {
            const fechaA = new Date(valorA);
            const fechaB = new Date(valorB);
            const comparacion = fechaA - fechaB;
            return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
        }

        // Para texto, comparar como string
        valorA = String(valorA).toLowerCase();
        valorB = String(valorB).toLowerCase();

        let comparacion = 0;
        if (valorA < valorB) comparacion = -1;
        if (valorA > valorB) comparacion = 1;

        return ordenActualAtrasos.direccion === 'asc' ? comparacion : -comparacion;
    });

    // Actualizar tabla
    const tbody = document.querySelector('#tablaAtrasos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    datosOrdenados.forEach(item => {
        const claseEstado = item.Estado ? item.Estado.toLowerCase().replace(/\s+/g, '-') : '';
        const color = ESTADO_COLORS[item.Estado] || '#999';
        const badgeClass = item.diasAtraso > 30 ? 'badge-danger' : 
                          item.diasAtraso > 14 ? 'badge-warning' : 'badge-success';
        const row = document.createElement('tr');
        row.className = 'clickable-row-detalle';
        row.dataset.id = item.Correlativo;
        row.innerHTML = `
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
            <td>${item.FechaEntrega || ''}</td>
            <td><span class="dias-atraso ${badgeClass}">${item.diasAtraso} días</span></td>
            <td>
                <button class="btn-icon" onclick="mostrarDetalleItem(${item.Correlativo})" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Actualizar iconos de ordenamiento
    document.querySelectorAll('#tablaAtrasos .sortable i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    const headerActual = document.querySelector(`#tablaAtrasos [data-col="${columna}"]`);
    if (headerActual) {
        const icon = headerActual.querySelector('i');
        if (icon) {
            icon.className = ordenActualAtrasos.direccion === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    }

    // Reaplicar colores y listeners
    setTimeout(() => {
        document.querySelectorAll('#tablaAtrasos .status-indicator[data-color]').forEach(indicator => {
            const color = indicator.getAttribute('data-color');
            indicator.style.backgroundColor = color;
        });

        document.querySelectorAll('#tablaAtrasos .clickable-row-detalle').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon')) {
                    const id = row.dataset.id;
                    mostrarDetalleItem(parseInt(id));
                }
            });
        });
    }, 50);
}

function actualizarSubcontratos() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('subcontratosContent');
    
    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    // Agrupar por subcontrato
    const porSubcontrato = {};
    datos.forEach(d => {
        const sub = d.Subcontrato || 'Sin subcontrato';
        if (!porSubcontrato[sub]) {
            porSubcontrato[sub] = {
                nombre: sub,
                items: [],
                estados: {},
                atrasos: 0
            };
        }
        porSubcontrato[sub].items.push(d);
        
        // Contar estados
        const estado = d.Estado || 'Sin estado';
        porSubcontrato[sub].estados[estado] = (porSubcontrato[sub].estados[estado] || 0) + 1;

        // Calcular atrasos
        if (d.FechaEntrega && d.Estado !== 'Incorporada') {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            if (fechaEntrega < hoy) {
                porSubcontrato[sub].atrasos++;
            }
        }
    });

    // Ordenar por cantidad
    const subcontratosOrdenados = Object.values(porSubcontrato)
        .sort((a, b) => b.items.length - a.items.length);

    let html = '<table class="subcontratos-table"><thead><tr>';
    html += '<th>Subcontrato</th><th>Cantidad</th><th>Incorporadas</th><th>En Proceso</th><th>Atrasos</th><th>Estados</th></tr></thead><tbody>';
    
    subcontratosOrdenados.forEach(sub => {
        const incorporadas = sub.estados['Incorporada'] || 0;
        const enProceso = sub.items.length - incorporadas;
        
        html += `<tr>
            <td><strong>${sub.nombre}</strong></td>
            <td>${sub.items.length}</td>
            <td><span class="text-green">${incorporadas}</span></td>
            <td><span class="text-orange">${enProceso}</span></td>
            <td><span class="text-red">${sub.atrasos}</span></td>
            <td>${Object.entries(sub.estados).map(([estado, cant]) => `${estado}: ${cant}`).join(', ')}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function exportarExcel() {
    const datos = obtenerDatosFiltrados();
    
    if (datos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Preparar datos para Excel
    const datosExcel = datos.map(d => ({
        'N°': d.Correlativo || '',
        'ID': d.ID || '',
        'Ítem': d.Item || '',
        'Temática General': d.TematicaGeneral || '',
        'Temática': d.Tematica || '',
        'Componente': d.Componente || '',
        'Subcontrato': d.Subcontrato || '',
        'Elaborador': d.Elaborador || '',
        'Revisor': d.Revisor || '',
        'Estado': d.Estado || '',
        'Fecha Entrega': d.FechaEntrega || '',
        'Fecha Reporte': d.FechaReporte || '',
        'Semana Reporte': d.SemanaReporte || '',
        'Pregunta': d.Pregunta || ''
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos ADC');

    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Control_ADC_${fecha}.xlsx`);
    
    alert('Datos exportados correctamente');
}

function eliminarDatos() {
    if (!confirm('¿Está seguro de eliminar todos los datos? Esta acción no se puede deshacer.')) {
        return;
    }

    AppState.datosADE = null;
    AppState.reportes = [];
    AppState.datosCorrelacionados = [];
    
    localStorage.removeItem('datosADE');
    localStorage.removeItem('reportes');
    
    actualizarEstadoArchivo('Ningún archivo');
    limpiarFiltros();
    actualizarDashboard();
    actualizarSubcontratos();
    
    alert('Datos eliminados correctamente');
}

function actualizarEstadoArchivo(mensaje) {
    document.getElementById('fileStatus').textContent = mensaje;
}

// LocalStorage
function guardarEnLocalStorage(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify(datos));
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

function cargarDatosAlmacenados() {
    try {
        const datosADE = localStorage.getItem('datosADE');
        const reportes = localStorage.getItem('reportes');
        
        if (datosADE) {
            AppState.datosADE = JSON.parse(datosADE);
            actualizarEstadoArchivo('Datos ADE cargados');
        }
        
        if (reportes) {
            AppState.reportes = JSON.parse(reportes);
            if (AppState.reportes.length > 0) {
                const ultimoReporte = AppState.reportes[AppState.reportes.length - 1];
                actualizarEstadoArchivo(`Reporte: ${ultimoReporte.FechaReporte} - Semana ${ultimoReporte.SemanaReporte}`);
            }
        }
        
        if (AppState.datosADE || AppState.reportes.length > 0) {
            correlacionarDatos();
            actualizarFiltros();
            actualizarDashboard();
        }
    } catch (error) {
        console.error('Error al cargar datos almacenados:', error);
    }
}

