import { AppState } from '../state.js';
import { correlacionarDatos } from './dataService.js';

export function guardarEnLocalStorage(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify(datos));
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

export function restaurarDatosAlmacenados() {
    let restauroADE = false;
    let restauroReportes = false;

    try {
        const datosADE = localStorage.getItem('datosADE');
        const reportes = localStorage.getItem('reportes');

        if (datosADE) {
            AppState.datosADE = JSON.parse(datosADE);
            restauroADE = true;
        }

        if (reportes) {
            AppState.reportes = JSON.parse(reportes);
            restauroReportes = AppState.reportes.length > 0;
        }

        if (restauroADE || restauroReportes) {
            correlacionarDatos();
        }
    } catch (error) {
        console.error('Error al cargar datos almacenados:', error);
    }

    return { restauroADE, restauroReportes };
}

export function limpiarLocalStorage() {
    localStorage.removeItem('datosADE');
    localStorage.removeItem('reportes');
}

