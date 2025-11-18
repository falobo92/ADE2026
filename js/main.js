import { inicializarFechasProgramacion } from './services/programacionService.js';
import { cargarDatosFijosEnLinea, cargarReportesEnLinea, cargarArchivoADE, cargarReporte } from './services/dataLoader.js';
import { restaurarDatosAlmacenados } from './services/storageService.js';
import { conectarFiltros, actualizarFiltros, limpiarFiltros } from './views/filterControls.js';
import { initModalListeners, cerrarModal } from './views/modalView.js';
import { mostrarMenuCarga } from './views/menuCarga.js';
import { exportarExcel } from './export/excelExporter.js';
import { setStatusMessage } from './ui/statusBar.js';
import { AppState } from './state.js';
import { formatearFechaParaMostrar } from './utils/date.js';
import { initViewController, renderActiveTab } from './controllers/viewController.js';

document.addEventListener('DOMContentLoaded', () => {
    inicializarFechasProgramacion();
    inicializarUI();
    renderActiveTab();
    restaurarEstadoInicial();
    cargarDatosFijosEnLinea({ mostrarNotificacion: true });
    cargarReportesEnLinea({ mostrarNotificacion: true });
});

function inicializarUI() {
    setStatusMessage('Ningún archivo');
    initModalListeners();
    conectarFiltros();
    initViewController();

    const btnCargarDatosFooter = document.getElementById('btnCargarDatosFooter');
    if (btnCargarDatosFooter) {
        btnCargarDatosFooter.addEventListener('click', mostrarMenuCarga);
    }

    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }

    const btnExportarExcel = document.getElementById('btnExportarExcel');
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', exportarExcel);
    }

    const inputADE = document.getElementById('inputADE');
    if (inputADE) {
        inputADE.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                cargarArchivoADE(e.target.files[0]);
            }
        });
    }

    const inputReporte = document.getElementById('inputReporte');
    if (inputReporte) {
        inputReporte.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                cargarReporte(e.target.files[0]);
            }
        });
    }

    const modal = document.getElementById('modalDetalle');
    if (modal) {
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                cerrarModal();
            }
        });
    }
}

function restaurarEstadoInicial() {
    const { restauroADE, restauroReportes } = restaurarDatosAlmacenados();

    if (restauroADE || restauroReportes) {
        actualizarFiltros();

        if (restauroReportes && AppState.reportes.length > 0) {
            const ultimoReporte = AppState.reportes[AppState.reportes.length - 1];
            const fechaReporteUI = formatearFechaParaMostrar(ultimoReporte.FechaReporte, ultimoReporte.FechaReporte || '');
            setStatusMessage(`Reporte: ${fechaReporteUI} - Semana ${ultimoReporte.SemanaReporte}`);
        } else if (restauroADE) {
            setStatusMessage('Datos ADE cargados');
        }
    }
}
