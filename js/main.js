/**
 * Control ADE - Punto de entrada principal
 * Sistema de gestión de datos ADE
 */

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

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', inicializar);

async function inicializar() {
    // Inicializar configuración de fechas
    inicializarFechasProgramacion();
    
    // Configurar UI
    inicializarUI();
    
    // Renderizar vista activa
    renderActiveTab();
    
    // Restaurar datos guardados
    restaurarEstado();
    
    // Cargar datos en línea
    try {
        await Promise.all([
            cargarDatosFijosEnLinea({ mostrarNotificacion: false }),
            cargarReportesEnLinea({ mostrarNotificacion: false })
        ]);
    } catch (error) {
        console.warn('Error al cargar datos iniciales:', error);
    }
}

function inicializarUI() {
    setStatusMessage('Inicializando...');
    
    // Inicializar listeners del modal
    initModalListeners();
    
    // Conectar filtros
    conectarFiltros();
    
    // Inicializar controlador de vistas
    initViewController();
    
    // Inicializar sidebar toggle para móvil
    inicializarSidebarToggle();

    // Botón de sincronizar datos
    const btnCargar = document.getElementById('btnCargarDatosFooter');
    if (btnCargar) {
        btnCargar.addEventListener('click', mostrarMenuCarga);
    }

    // Botón limpiar filtros
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            limpiarFiltros();
            // Cerrar sidebar en móvil después de limpiar filtros
            cerrarSidebar();
        });
    }

    // Botón exportar Excel
    const btnExportar = document.getElementById('btnExportarExcel');
    if (btnExportar) {
        btnExportar.addEventListener('click', exportarExcel);
    }

    // Input archivo ADE
    const inputADE = document.getElementById('inputADE');
    if (inputADE) {
        inputADE.addEventListener('change', e => {
            if (e.target.files[0]) {
                cargarArchivoADE(e.target.files[0]);
            }
        });
    }

    // Input archivo reporte
    const inputReporte = document.getElementById('inputReporte');
    if (inputReporte) {
        inputReporte.addEventListener('change', e => {
            if (e.target.files[0]) {
                cargarReporte(e.target.files[0]);
            }
        });
    }

    // Cerrar modal con Escape
    const modal = document.getElementById('modalDetalle');
    if (modal) {
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                cerrarModal();
            }
        });
    }
}

/**
 * Inicializa el toggle del sidebar para pantallas móviles
 */
function inicializarSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!sidebar || !toggle || !overlay) return;
    
    // Toggle sidebar al hacer click en el botón
    toggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            cerrarSidebar();
        } else {
            abrirSidebar();
        }
    });
    
    // Cerrar sidebar al hacer click en el overlay
    overlay.addEventListener('click', cerrarSidebar);
    
    // Cerrar sidebar con Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            cerrarSidebar();
        }
    });
    
    // Cerrar sidebar al cambiar de tamaño de ventana a desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            cerrarSidebar();
        }
    });
}

/**
 * Abre el sidebar en móvil
 */
function abrirSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    if (toggle) {
        toggle.innerHTML = '<i class="fas fa-times"></i>';
        toggle.setAttribute('aria-label', 'Cerrar filtros');
    }
}

/**
 * Cierra el sidebar en móvil
 */
function cerrarSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    if (toggle) {
        toggle.innerHTML = '<i class="fas fa-filter"></i>';
        toggle.setAttribute('aria-label', 'Abrir filtros');
    }
}

function restaurarEstado() {
    const { restauroADE, restauroReportes } = restaurarDatosAlmacenados();

    if (restauroADE || restauroReportes) {
        actualizarFiltros();

        if (restauroReportes && AppState.reportes.length > 0) {
            const ultimo = AppState.reportes[AppState.reportes.length - 1];
            const fecha = formatearFechaParaMostrar(ultimo.FechaReporte, ultimo.FechaReporte || '');
            setStatusMessage(`Último reporte: ${fecha} (Semana ${ultimo.SemanaReporte})`);
        } else if (restauroADE) {
            setStatusMessage('Datos ADE cargados');
        }
    } else {
        setStatusMessage('Sin datos cargados');
    }
}
