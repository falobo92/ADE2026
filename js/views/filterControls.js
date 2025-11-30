import { AppState } from '../state.js';
import { formatearFechaParaMostrar } from '../utils/date.js';
import { renderActiveTab } from '../controllers/viewController.js';

export function conectarFiltros() {
    document.querySelectorAll('.filter-select').forEach(select => {
        select.addEventListener('change', aplicarFiltros);
    });
}

export function aplicarFiltros() {
    const semanaAnterior = AppState.filtros.semana;
    AppState.filtros.semana = document.getElementById('filterSemana').value;
    AppState.filtros.fecha = document.getElementById('filterFecha').value;
    AppState.filtros.tematica = document.getElementById('filterTematica').value;
    AppState.filtros.item = document.getElementById('filterItem').value;
    AppState.filtros.persona = document.getElementById('filterPersona').value;
    AppState.filtros.estado = document.getElementById('filterEstado').value;
    AppState.filtros.origen = document.getElementById('filterOrigen').value;

    if (semanaAnterior !== AppState.filtros.semana) {
        actualizarFechasPorSemana();
    }

    actualizarEstilosFiltros();
    renderActiveTab();
    cerrarSidebarMobile();
}

function actualizarEstilosFiltros() {
    document.querySelectorAll('.filter-select').forEach(select => {
        select.classList.toggle('has-value', select.value !== '');
    });
}

/**
 * Cierra el sidebar en dispositivos móviles
 */
function cerrarSidebarMobile() {
    if (window.innerWidth <= 1024) {
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
}

export function actualizarFiltros() {
    const datos = AppState.datosCorrelacionados;
    if (!datos || datos.length === 0) {
        renderActiveTab();
        return;
    }

    const semanas = [...new Set(
        datos
            .map(d => d.SemanaReporte)
            .filter(valor => valor !== undefined && valor !== null)
    )].sort((a, b) => b - a);
    
    // Calcular fechas: si hay semana seleccionada, solo mostrar fechas de esa semana
    let fechas;
    if (AppState.filtros.semana) {
        const semanaSeleccionada = parseInt(AppState.filtros.semana, 10);
        fechas = [...new Set(
            datos
                .filter(d => d.SemanaReporte === semanaSeleccionada)
                .map(d => d.FechaReporte)
                .filter(Boolean)
        )].sort().reverse();
    } else {
        fechas = [...new Set(datos.map(d => d.FechaReporte))].sort().reverse();
    }
    
    const tematicas = [...new Set(datos.map(d => d.Tematica).filter(Boolean))].sort();
    const items = [...new Set(datos.map(d => d.Item).filter(Boolean))].sort();
    const personas = [...new Set([
        ...datos.map(d => d.Elaborador).filter(Boolean),
        ...datos.map(d => d.Revisor).filter(Boolean)
    ])].sort();
    const estados = [...new Set(datos.map(d => d.Estado).filter(Boolean))].sort();
    const origenes = [...new Set(datos.map(d => d.Subcontrato).filter(Boolean))].sort();

    actualizarSelect('filterSemana', semanas, 'Semana');
    actualizarSelect('filterFecha', fechas, 'Fecha');
    actualizarSelect('filterTematica', tematicas, 'Temática');
    actualizarSelect('filterItem', items, 'Ítem');
    actualizarSelect('filterPersona', personas, 'Persona');
    actualizarSelect('filterEstado', estados, 'Estado');
    actualizarSelect('filterOrigen', origenes, 'Origen');

    const selectSemana = document.getElementById('filterSemana');
    if (selectSemana) {
        const valoresSemana = semanas.map(sem => String(sem ?? ''));
        const valorPreferido = valoresSemana.includes(AppState.filtros.semana)
            ? AppState.filtros.semana
            : (valoresSemana[0] || '');
        selectSemana.value = valorPreferido;
        AppState.filtros.semana = valorPreferido;
    }

    const selectFecha = document.getElementById('filterFecha');
    if (selectFecha) {
        // Si hay una fecha seleccionada que ya no está disponible, limpiarla
        const valorFechaActual = selectFecha.value;
        const fechaValida = fechas.includes(valorFechaActual) ? valorFechaActual : '';
        const valorFecha = fechaValida || (fechas.length > 0 ? fechas[0] : '');
        selectFecha.value = valorFecha;
        AppState.filtros.fecha = valorFecha;
    }

    actualizarEstilosFiltros();
    renderActiveTab();
}

function actualizarFechasPorSemana() {
    const datos = AppState.datosCorrelacionados;
    if (!datos || datos.length === 0) return;

    let fechas;
    if (AppState.filtros.semana) {
        const semanaSeleccionada = parseInt(AppState.filtros.semana, 10);
        fechas = [...new Set(
            datos
                .filter(d => d.SemanaReporte === semanaSeleccionada)
                .map(d => d.FechaReporte)
                .filter(Boolean)
        )].sort().reverse();
    } else {
        fechas = [...new Set(datos.map(d => d.FechaReporte))].sort().reverse();
    }

    const selectFecha = document.getElementById('filterFecha');
    if (selectFecha) {
        const valorFechaActual = selectFecha.value;
        actualizarSelect('filterFecha', fechas, 'Fecha');
        
        // Si la fecha actual ya no está disponible, limpiarla o seleccionar la primera disponible
        if (valorFechaActual && fechas.includes(valorFechaActual)) {
            selectFecha.value = valorFechaActual;
            AppState.filtros.fecha = valorFechaActual;
        } else {
            const nuevaFecha = fechas.length > 0 ? fechas[0] : '';
            selectFecha.value = nuevaFecha;
            AppState.filtros.fecha = nuevaFecha;
        }
    }
}

export function limpiarFiltros() {
    document.querySelectorAll('.filter-select').forEach(select => {
        select.value = '';
        select.classList.remove('has-value');
    });
    AppState.filtros = {
        semana: '',
        fecha: '',
        tematica: '',
        item: '',
        persona: '',
        estado: '',
        origen: ''
    };
    actualizarFechasPorSemana();
    renderActiveTab();
}

function actualizarSelect(id, valores, prefijo) {
    const select = document.getElementById(id);
    if (!select) return;

    const valorActual = select.value;
    const primeraOpcion = select.querySelector('option');
    const placeholder = primeraOpcion ? primeraOpcion.cloneNode(true) : null;

    select.innerHTML = '';
    if (placeholder) {
        select.appendChild(placeholder);
    }

    valores.forEach(valor => {
        const option = document.createElement('option');
        option.value = valor;
        if (prefijo === 'Fecha') {
            option.textContent = formatearFechaParaMostrar(valor, valor);
        } else {
            option.textContent = `${prefijo === 'Semana' ? 'Semana ' : ''}${valor}`;
        }
        select.appendChild(option);
    });

    if (valorActual && Array.from(select.options).some(opt => opt.value === valorActual)) {
        select.value = valorActual;
    }
}

