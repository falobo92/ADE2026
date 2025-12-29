/*
  Carga de datos desde GitHub.
  Estrategia: Usar API sin token para listar + RAW para descargar archivos.
*/

import { DATOS_ADE_URL, REPORTES_API_URL, REPORTES_RAW_BASE } from '../constants.js';
import { AppState } from '../state.js';
import { correlacionarDatos } from './dataService.js';
import { guardarEnLocalStorage } from './storageService.js';
import { actualizarFiltros } from '../views/filterControls.js';
import { setStatusMessage } from '../ui/statusBar.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

const MAX_REPORTES_DESCARGA = 100;

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
        setStatusMessage('Buscando reportes en repositorio...', { loading: true });
    }

    let archivosJSON = [];
    let errorCarga = null;

    // -----------------------------------------------------------------------
    // ESTRATEGIA 1: API de GitHub SIN TOKEN (60 req/hora para no autenticados)
    // -----------------------------------------------------------------------
    try {
        console.log('Intentando listar archivos vía API GitHub (sin token)...');
        const respuesta = await fetch(`${REPORTES_API_URL}?t=${Date.now()}`, {
            headers: {
                'Accept': 'application/vnd.github+json'
            },
            cache: 'no-store'
        });

        if (!respuesta.ok) {
            throw new Error(`API respondió ${respuesta.status}`);
        }

        const archivos = await respuesta.json();
        
        if (Array.isArray(archivos)) {
            archivosJSON = archivos
                .filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.json') && item.name !== 'index.json')
                .map(item => ({ name: item.name, type: 'file' }));
            console.log('Archivos encontrados vía API:', archivosJSON.length);
        }
    } catch (apiError) {
        console.warn('Error al listar vía API GitHub:', apiError.message);
        errorCarga = apiError;
    }

    // -----------------------------------------------------------------------
    // ESTRATEGIA 2: Fallback a index.json (si API falló)
    // -----------------------------------------------------------------------
    if (archivosJSON.length === 0) {
        try {
            console.log('Intentando cargar index.json como fallback...');
            const indice = await descargarJSON(`${REPORTES_RAW_BASE}index.json?t=${Date.now()}`, {
                descripcion: 'el índice de reportes'
            });
            
            if (Array.isArray(indice)) {
                archivosJSON = indice.map(name => ({ name, type: 'file' }));
                console.log('Índice cargado desde index.json:', archivosJSON.length, 'archivos');
            }
        } catch (indexError) {
            console.warn('No se pudo cargar index.json:', indexError.message);
            if (!errorCarga) errorCarga = indexError;
        }
    }

    // -----------------------------------------------------------------------
    // VERIFICACIÓN FINAL
    // -----------------------------------------------------------------------
    if (archivosJSON.length === 0) {
        if (AppState.reportes.length > 0) {
            setStatusMessage('Sin conexión al repositorio. Usando datos locales.', { tipo: 'warning' });
            return;
        }
        
        const msg = 'No se pudieron obtener los reportes del repositorio.';
        console.error(msg, errorCarga);
        if (mostrarNotificacion) alert(msg + ' Verifica tu conexión a internet.');
        throw new Error(msg);
    }

    // -----------------------------------------------------------------------
    // DESCARGAR REPORTES VÍA RAW (sin límite de requests)
    // -----------------------------------------------------------------------
    try {
        const archivosProcesar = limitarReportesRecientes(archivosJSON, MAX_REPORTES_DESCARGA);
        console.log('Descargando', archivosProcesar.length, 'reportes vía RAW...');
        
        const resultados = await Promise.allSettled(
            archivosProcesar.map(archivo => descargarReporteRaw(archivo.name))
        );

        const reportes = resultados
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        // Log de errores
        resultados.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.warn(`Error descargando ${archivosProcesar[i]?.name}:`, r.reason?.message);
            }
        });

        if (reportes.length === 0) {
            throw new Error('No se pudieron descargar reportes válidos');
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
        
        setStatusMessage(`Reportes actualizados${resumenLimite} - Último: ${ultimoReporteFecha}`, { tipo: 'success' });

    } catch (error) {
        console.error('Error procesando reportes:', error);
        if (mostrarNotificacion) {
            setStatusMessage('Error al procesar reportes descargados', { tipo: 'error' });
        }
    }
}

/**
 * Descarga un reporte individual vía URL RAW (sin autenticación)
 */
async function descargarReporteRaw(nombreArchivo) {
    const url = `${REPORTES_RAW_BASE}${nombreArchivo}?t=${Date.now()}`;
    const respuesta = await fetch(url, { cache: 'no-store' });
    
    if (!respuesta.ok) {
        throw new Error(`Error ${respuesta.status} descargando ${nombreArchivo}`);
    }
    
    const datos = await respuesta.json();
    return validarReporte(datos, nombreArchivo);
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
    }
}

export async function cargarReporte(archivo) {
    if (!archivo) return;
    setStatusMessage('Cargando reporte...', { loading: true });
    try {
        const texto = await leerArchivo(archivo);
        const datos = validarReporte(JSON.parse(texto));
        const existe = AppState.reportes.findIndex(r => r.FechaReporte === datos.FechaReporte && r.SemanaReporte === datos.SemanaReporte);
        if (existe >= 0) {
            if (!confirm(`Ya existe el reporte fecha ${datos.FechaReporte}. ¿Reemplazar?`)) {
                setStatusMessage('Cancelado');
                document.getElementById('inputReporte').value = '';
                return;
            }
            AppState.reportes.splice(existe, 1);
        }
        AppState.reportes.push(datos);
        ordenarReportesPorFecha(AppState.reportes);
        guardarEnLocalStorage('reportes', AppState.reportes);
        setStatusMessage(`Reporte cargado: Semana ${datos.SemanaReporte}`, { tipo: 'success' });
        correlacionarDatos();
        actualizarFiltros();
    } catch (error) {
        setStatusMessage('Error al cargar reporte', { tipo: 'error' });
        alert(error.message);
    }
    document.getElementById('inputReporte').value = '';
}

async function descargarJSON(url, opciones = {}) {
    const { descripcion = 'recurso' } = opciones;
    const respuesta = await fetch(url, { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(`Status ${respuesta.status} (${descripcion})`);
    return respuesta.json();
}

function validarDatosADE(datos) {
    if (!Array.isArray(datos) || datos.length === 0) throw new Error('Archivo ADE inválido o vacío');
    return datos;
}

function validarReporte(datos, origen = 'reporte') {
    if (!datos?.FechaReporte || datos.SemanaReporte == null || !Array.isArray(datos.Registros)) {
        throw new Error(`Reporte inválido (${origen})`);
    }
    if (datos.Registros.length === 0) {
        throw new Error(`El reporte ${origen} no contiene registros`);
    }
    return datos;
}

function ordenarReportesPorFecha(reportes = []) {
    reportes.sort((a, b) => {
        const fA = Date.parse(a.FechaReporte || ''), fB = Date.parse(b.FechaReporte || '');
        if (!isNaN(fA) && !isNaN(fB)) return fA - fB;
        return (a.SemanaReporte || 0) - (b.SemanaReporte || 0);
    });
}

function limitarReportesRecientes(listado, limite) {
    if (listado.length <= limite) return listado;
    
    // Extraer fecha (YYYY-MM-DD) del nombre del archivo
    const extraerFecha = (nombre) => {
        const match = nombre.match(/(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : '';
    };

    // Extraer número de semana del nombre del archivo
    const extraerSemana = (nombre) => {
        const match = nombre.match(/Semana(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
    };

    // Ordenar por fecha descendente, luego por semana descendente
    return [...listado].sort((a, b) => {
        const fechaA = extraerFecha(a.name || '');
        const fechaB = extraerFecha(b.name || '');
        
        if (fechaA && fechaB && fechaA !== fechaB) {
            return fechaB.localeCompare(fechaA);
        }
        
        const semA = extraerSemana(a.name || '');
        const semB = extraerSemana(b.name || '');
        return semB - semA;
    }).slice(0, limite);
}

async function leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.onerror = reject;
        r.readAsText(archivo, 'UTF-8');
    });
}

