import { DATOS_ADE_URL, REPORTES_API_URL, REPORTES_RAW_BASE } from '../constants.js';
import { AppState } from '../state.js';
import { correlacionarDatos } from './dataService.js';
import { guardarEnLocalStorage } from './storageService.js';
import { actualizarFiltros } from '../views/filterControls.js';
import { setStatusMessage } from '../ui/statusBar.js';
import { formatearFechaParaMostrar } from '../utils/date.js';
import { getGitHubToken } from './githubService.js';

const MAX_REPORTES_DESCARGA = 25;

export async function cargarDatosFijosEnLinea(opciones = {}) {
    const { mostrarNotificacion = false } = opciones;

    if (mostrarNotificacion) {
        setStatusMessage('Descargando datos ADE en línea...', { loading: true });
    }

    try {
        const datos = validarDatosADE(await descargarJSON(`${DATOS_ADE_URL}?t=${Date.now()}`, {
            descripcion: 'los datos ADE'
        }));

        AppState.datosADE = datos;
        guardarEnLocalStorage('datosADE', datos);
        correlacionarDatos();
        actualizarFiltros();

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
        const token = getGitHubToken();
        let archivosJSON = [];

        // Intentar obtener lista de archivos
        if (token) {
            // Con token: usar API de GitHub
            const archivos = await descargarJSON(`${REPORTES_API_URL}?t=${Date.now()}`, {
                descripcion: 'el listado de reportes',
                requiereGitHubAuth: true
            });
            archivosJSON = Array.isArray(archivos)
                ? archivos.filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.json'))
                : [];
        } else {
            // Sin token: intentar obtener índice de reportes o usar lista conocida
            try {
                const indice = await descargarJSON(`${REPORTES_RAW_BASE}index.json?t=${Date.now()}`, {
                    descripcion: 'el índice de reportes'
                });
                archivosJSON = Array.isArray(indice) ? indice.map(name => ({ name, type: 'file' })) : [];
            } catch {
                // Si no hay índice, intentar con la API (puede fallar por rate limit)
                try {
                    const archivos = await descargarJSON(`${REPORTES_API_URL}?t=${Date.now()}`, {
                        descripcion: 'el listado de reportes',
                        requiereGitHubAuth: false
                    });
                    archivosJSON = Array.isArray(archivos)
                        ? archivos.filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.json'))
                        : [];
                } catch (apiError) {
                    // Si falla la API, usar los datos almacenados localmente
                    if (apiError?.message?.includes('403')) {
                        console.warn('Rate limit de GitHub alcanzado. Usando datos locales si existen.');
                        if (AppState.reportes.length > 0) {
                            setStatusMessage('Usando reportes almacenados localmente (límite de GitHub alcanzado)', { tipo: 'warning' });
                            return;
                        }
                        throw new Error('Límite de solicitudes de GitHub alcanzado. Configura un token en "Sincronizar" o espera unos minutos.');
                    }
                    throw apiError;
                }
            }
        }

        if (archivosJSON.length === 0) {
            throw new Error('No se encontraron reportes en el repositorio');
        }

        const archivosProcesar = limitarReportesRecientes(archivosJSON, MAX_REPORTES_DESCARGA);

        const resultados = await Promise.allSettled(
            archivosProcesar.map(archivo => obtenerReporteDesdeRepositorio(archivo))
        );

        const reportes = resultados
            .filter(resultado => resultado.status === 'fulfilled')
            .map(resultado => resultado.value);

        resultados.forEach((resultado, index) => {
            if (resultado.status === 'rejected') {
                const nombre = archivosProcesar[index]?.name || 'desconocido';
                console.warn(`No fue posible descargar o validar el reporte ${nombre}`, resultado.reason);
            }
        });

        if (reportes.length === 0) {
            throw new Error('No se pudieron cargar reportes válidos');
        }

        ordenarReportesPorFecha(reportes);

        AppState.reportes = reportes;
        guardarEnLocalStorage('reportes', reportes);
        correlacionarDatos();
        actualizarFiltros();

        const ultimoReporte = reportes[reportes.length - 1];
        const ultimoReporteFecha = formatearFechaParaMostrar(ultimoReporte.FechaReporte, ultimoReporte.FechaReporte || '');
        const resumenLimite = archivosProcesar.length < archivosJSON.length
            ? ` (${reportes.length} de ${archivosJSON.length} totales)`
            : ` (${reportes.length})`;
        const mensaje = `Reportes en línea${resumenLimite} - Último: ${ultimoReporteFecha}${archivosProcesar.length < archivosJSON.length ? ' (últimos registros)' : ''}`;
        setStatusMessage(mensaje, { tipo: 'success' });
    } catch (error) {
        console.error('Error al descargar reportes en línea:', error);
        if (mostrarNotificacion) {
            setStatusMessage(obtenerMensajeErrorGitHub(error), { tipo: 'error' });
        }
    }
}

export async function cargarArchivoADE(archivo) {
    if (!archivo) return;

    setStatusMessage('Cargando datos ADE...', { loading: true });

    try {
        const texto = await leerArchivo(archivo);
        const datos = validarDatosADE(JSON.parse(texto));

        AppState.datosADE = datos;
        guardarEnLocalStorage('datosADE', datos);
        setStatusMessage(`Datos ADE cargados (${datos.length} registros)`, { tipo: 'success' });
        correlacionarDatos();
        actualizarFiltros();

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
        const datos = validarReporte(JSON.parse(texto));

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
        ordenarReportesPorFecha(AppState.reportes);
        guardarEnLocalStorage('reportes', AppState.reportes);
        const fechaReporteUI = formatearFechaParaMostrar(datos.FechaReporte, datos.FechaReporte || '');
        setStatusMessage(`Reporte: ${fechaReporteUI} - Semana ${datos.SemanaReporte} (${datos.Registros.length} registros)`, { tipo: 'success' });
        correlacionarDatos();
        actualizarFiltros();

        document.getElementById('inputReporte').value = '';
    } catch (error) {
        setStatusMessage('Error al cargar reporte', { tipo: 'error' });
        alert('Error al cargar reporte: ' + error.message);
        console.error(error);
        document.getElementById('inputReporte').value = '';
    }
}

async function descargarJSON(url, opciones = {}) {
    const {
        descripcion = 'el recurso',
        requiereGitHubAuth = false,
        headers = {},
        ...fetchOptions
    } = opciones;

    const finalHeaders = { ...headers };

    if (requiereGitHubAuth) {
        finalHeaders['Accept'] ??= 'application/vnd.github+json';
        const token = getGitHubToken();
        if (token) {
            finalHeaders.Authorization = `Bearer ${token}`;
        }
    }

    const respuesta = await fetch(url, {
        cache: 'no-store',
        ...fetchOptions,
        headers: finalHeaders
    });

    if (!respuesta.ok) {
        throw new Error(`Respuesta ${respuesta.status} al obtener ${descripcion}`);
    }

    return respuesta.json();
}

function validarDatosADE(datos) {
    if (!Array.isArray(datos)) {
        throw new Error('El archivo ADE debe ser un array de objetos');
    }

    if (datos.length === 0) {
        throw new Error('El archivo ADE está vacío');
    }

    return datos;
}

function validarReporte(datos, origen = 'reporte') {
    if (!datos || typeof datos !== 'object') {
        throw new Error(`Formato de reporte inválido (${origen})`);
    }

    const faltantes = [];
    if (!datos.FechaReporte) faltantes.push('FechaReporte');
    if (datos.SemanaReporte === undefined || datos.SemanaReporte === null) faltantes.push('SemanaReporte');
    if (!Array.isArray(datos.Registros)) faltantes.push('Registros');

    if (faltantes.length > 0) {
        throw new Error(`Formato de reporte inválido (${origen}). Falta: ${faltantes.join(', ')}`);
    }

    if (datos.Registros.length === 0) {
        throw new Error(`El reporte ${origen} no contiene registros`);
    }

    return datos;
}

function ordenarReportesPorFecha(reportes = []) {
    reportes.sort((a, b) => {
        const fechaA = Date.parse(a?.FechaReporte ?? '');
        const fechaB = Date.parse(b?.FechaReporte ?? '');

        if (!Number.isNaN(fechaA) && !Number.isNaN(fechaB)) {
            return fechaA - fechaB;
        }

        const semanaA = parseInt(a?.SemanaReporte ?? 0, 10) || 0;
        const semanaB = parseInt(b?.SemanaReporte ?? 0, 10) || 0;
        return semanaA - semanaB;
    });
}

async function obtenerReporteDesdeRepositorio(archivo) {
    const token = getGitHubToken();
    let datos;

    if (token) {
        const urlAPI = `${REPORTES_API_URL}/${archivo.name}?t=${Date.now()}`;
        const respuesta = await fetch(urlAPI, {
            headers: {
                Accept: 'application/vnd.github.raw+json',
                Authorization: `Bearer ${token}`
            },
            cache: 'no-store'
        });

        if (!respuesta.ok) {
            throw new Error(`Respuesta ${respuesta.status} al obtener el reporte ${archivo.name}`);
        }

        const texto = await respuesta.text();
        datos = JSON.parse(texto);
    } else {
        const rutaRaw = `${REPORTES_RAW_BASE}${archivo.name}?t=${Date.now()}`;
        datos = await descargarJSON(rutaRaw, {
            descripcion: `el reporte ${archivo.name}`
        });
    }

    return validarReporte(datos, archivo.name);
}

function limitarReportesRecientes(listado = [], limite = MAX_REPORTES_DESCARGA) {
    if (!Array.isArray(listado) || listado.length <= limite) {
        return listado;
    }

    const ordenados = [...listado].sort((a, b) => {
        const fechaA = extraerTimestampDesdeNombre(a?.name);
        const fechaB = extraerTimestampDesdeNombre(b?.name);

        if (fechaA && fechaB) return fechaB - fechaA;
        if (fechaA && !fechaB) return -1;
        if (!fechaA && fechaB) return 1;
        return (b?.name || '').localeCompare(a?.name || '');
    });

    return ordenados.slice(0, limite);
}

function extraerTimestampDesdeNombre(nombre) {
    if (!nombre) return null;

    const matchFecha = nombre.match(/\d{4}-\d{2}-\d{2}/);
    if (matchFecha) {
        const timestamp = Date.parse(matchFecha[0]);
        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    const matchSemana = nombre.match(/semana(\d+)/i);
    if (matchSemana) {
        const semana = parseInt(matchSemana[1], 10);
        if (!Number.isNaN(semana)) {
            return semana;
        }
    }

    return null;
}

function obtenerMensajeErrorGitHub(error) {
    const mensajeBase = 'No fue posible descargar los reportes en línea';
    const mensaje = error?.message || 'error desconocido';
    
    if (mensaje.includes('403') || mensaje.includes('Límite')) {
        return `${mensajeBase}: límite de GitHub alcanzado. Usa el botón "Sincronizar" y configura un token, o espera unos minutos.`;
    }
    if (mensaje.includes('404')) {
        return `${mensajeBase}: repositorio no encontrado.`;
    }
    if (mensaje.includes('Failed to fetch') || mensaje.includes('NetworkError')) {
        return `${mensajeBase}: sin conexión a internet.`;
    }
    return `${mensajeBase}: ${mensaje}`;
}

async function leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(archivo, 'UTF-8');
    });
}

