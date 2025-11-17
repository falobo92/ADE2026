import { DATOS_ADE_URL, REPORTES_API_URL, REPORTES_RAW_BASE } from '../constants.js';
import { AppState } from '../state.js';
import { correlacionarDatos } from './dataService.js';
import { guardarEnLocalStorage } from './storageService.js';
import { actualizarFiltros } from '../views/filterControls.js';
import { actualizarDashboard } from '../views/dashboardView.js';
import { setStatusMessage } from '../ui/statusBar.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

export async function cargarDatosFijosEnLinea(opciones = {}) {
    const { mostrarNotificacion = false } = opciones;

    if (mostrarNotificacion) {
        setStatusMessage('Descargando datos ADE en línea...', { loading: true });
    }

    try {
        const respuesta = await fetch(`${DATOS_ADE_URL}?t=${Date.now()}`, { cache: 'no-store' });

        if (!respuesta.ok) {
            throw new Error(`Respuesta ${respuesta.status} al obtener los datos ADE`);
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error('El archivo ADE debe ser un array de objetos');
        }

        if (datos.length === 0) {
            throw new Error('El archivo ADE está vacío');
        }

        AppState.datosADE = datos;
        guardarEnLocalStorage('datosADE', datos);
        correlacionarDatos();
        actualizarFiltros();
        actualizarDashboard();

        const mensaje = `Datos ADE en línea (${datos.length} registros)`;
        setStatusMessage(mensaje, { tipo: 'success' });
    } catch (error) {
        console.error('Error al descargar datos ADE en línea:', error);
        if (mostrarNotificacion) {
            setStatusMessage('Error al descargar datos ADE en línea', { tipo: 'error' });
            alert('No fue posible descargar los datos ADE en línea: ' + error.message);
        }
    }
}

export async function cargarReportesEnLinea(opciones = {}) {
    const { mostrarNotificacion = false } = opciones;

    if (mostrarNotificacion) {
        setStatusMessage('Descargando reportes en línea...', { loading: true });
    }

    try {
        const respuesta = await fetch(`${REPORTES_API_URL}?t=${Date.now()}`, {
            headers: { 'Accept': 'application/vnd.github+json' },
            cache: 'no-store'
        });

        if (!respuesta.ok) {
            throw new Error(`Respuesta ${respuesta.status} al obtener el listado de reportes`);
        }

        const archivos = await respuesta.json();
        const archivosJSON = Array.isArray(archivos)
            ? archivos.filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.json'))
            : [];

        if (archivosJSON.length === 0) {
            throw new Error('No se encontraron reportes en el repositorio');
        }

        const reportes = [];
        for (const archivo of archivosJSON) {
            const rutaRaw = `${REPORTES_RAW_BASE}${archivo.name}?t=${Date.now()}`;
            const respReporte = await fetch(rutaRaw, { cache: 'no-store' });

            if (!respReporte.ok) {
                console.warn(`No fue posible descargar el reporte ${archivo.name}`);
                continue;
            }

            const datos = await respReporte.json();
            if (!datos.FechaReporte || !datos.SemanaReporte || !Array.isArray(datos.Registros)) {
                console.warn(`Formato inválido en el reporte ${archivo.name}`);
                continue;
            }

            reportes.push(datos);
        }

        if (reportes.length === 0) {
            throw new Error('No se pudieron cargar reportes válidos');
        }

        reportes.sort((a, b) => new Date(a.FechaReporte) - new Date(b.FechaReporte));

        AppState.reportes = reportes;
        guardarEnLocalStorage('reportes', reportes);
        correlacionarDatos();
        actualizarFiltros();
        actualizarDashboard();

        const ultimoReporte = reportes[reportes.length - 1];
        const ultimoReporteFecha = formatearFechaParaMostrar(ultimoReporte.FechaReporte, ultimoReporte.FechaReporte || '');
        const mensaje = `Reportes en línea (${reportes.length}) - Último: ${ultimoReporteFecha}`;
        setStatusMessage(mensaje, { tipo: 'success' });
    } catch (error) {
        console.error('Error al descargar reportes en línea:', error);
        if (mostrarNotificacion) {
            setStatusMessage('Error al descargar reportes en línea', { tipo: 'error' });
            alert('No fue posible descargar los reportes en línea: ' + error.message);
        }
    }
}

export async function cargarArchivoADE(archivo) {
    if (!archivo) return;

    setStatusMessage('Cargando datos ADE...', { loading: true });

    try {
        const texto = await leerArchivo(archivo);
        const datos = JSON.parse(texto);

        if (!Array.isArray(datos)) {
            throw new Error('El archivo ADE debe ser un array de objetos');
        }

        if (datos.length === 0) {
            throw new Error('El archivo ADE está vacío');
        }

        AppState.datosADE = datos;
        guardarEnLocalStorage('datosADE', datos);
        setStatusMessage(`Datos ADE cargados (${datos.length} registros)`, { tipo: 'success' });
        correlacionarDatos();
        actualizarFiltros();
        actualizarDashboard();

        document.getElementById('inputADE').value = '';
    } catch (error) {
        setStatusMessage('Error al cargar datos ADE', { tipo: 'error' });
        alert('Error al cargar datos ADE: ' + error.message);
        console.error(error);
    }
}

export async function cargarReporte(archivo) {
    if (!archivo) return;

    setStatusMessage('Cargando reporte...', { loading: true });

    try {
        const texto = await leerArchivo(archivo);
        const datos = JSON.parse(texto);

        if (!datos.FechaReporte || !datos.SemanaReporte || !Array.isArray(datos.Registros)) {
            throw new Error('Formato de reporte inválido. Debe contener FechaReporte, SemanaReporte y Registros');
        }

        if (datos.Registros.length === 0) {
            throw new Error('El reporte no contiene registros');
        }

        const existeReporte = AppState.reportes.find(r =>
            r.FechaReporte === datos.FechaReporte && r.SemanaReporte === datos.SemanaReporte
        );

        if (existeReporte) {
            const fechaReporteUI = formatearFechaParaMostrar(datos.FechaReporte, datos.FechaReporte || '');
            const reemplazar = confirm(`Ya existe un reporte para la fecha ${fechaReporteUI} (Semana ${datos.SemanaReporte}).\n\n¿Desea reemplazarlo?`);
            if (!reemplazar) {
                setStatusMessage('Reporte cancelado');
                document.getElementById('inputReporte').value = '';
                return;
            }
            AppState.reportes = AppState.reportes.filter(r =>
                !(r.FechaReporte === datos.FechaReporte && r.SemanaReporte === datos.SemanaReporte)
            );
        }

        AppState.reportes.push(datos);
        guardarEnLocalStorage('reportes', AppState.reportes);
        const fechaReporteUI = formatearFechaParaMostrar(datos.FechaReporte, datos.FechaReporte || '');
        setStatusMessage(`Reporte: ${fechaReporteUI} - Semana ${datos.SemanaReporte} (${datos.Registros.length} registros)`, { tipo: 'success' });
        correlacionarDatos();
        actualizarFiltros();
        actualizarDashboard();

        document.getElementById('inputReporte').value = '';
    } catch (error) {
        setStatusMessage('Error al cargar reporte', { tipo: 'error' });
        alert('Error al cargar reporte: ' + error.message);
        console.error(error);
        document.getElementById('inputReporte').value = '';
    }
}

async function leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(archivo, 'UTF-8');
    });
}

