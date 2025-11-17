import { AppState } from '../state.js';
import { actualizarDashboard } from './dashboardView.js';
import { actualizarListado } from './listadoView.js';
import { actualizarAtrasos } from './atrasosView.js';
import { actualizarEvolucion } from './evolucionView.js';
import { actualizarSubcontratos } from './subcontratosView.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

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

    // Si cambió la semana, actualizar el dropdown de fechas
    if (semanaAnterior !== AppState.filtros.semana) {
        actualizarFechasPorSemana();
    }

    refrescarVistaActiva();
}

export function actualizarFiltros() {
    const datos = AppState.datosCorrelacionados;
    if (!datos || datos.length === 0) return;

    const semanas = [...new Set(datos.map(d => d.SemanaReporte))].sort((a, b) => b - a);
    
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
        const valorSemana = semanas.length > 0 && semanas[0] !== undefined && semanas[0] !== null
            ? String(semanas[0])
            : '';
        selectSemana.value = valorSemana;
        AppState.filtros.semana = valorSemana;
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

    refrescarVistaActiva();
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
    // Actualizar fechas para mostrar todas las disponibles
    actualizarFechasPorSemana();
    refrescarVistaActiva();
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

function refrescarVistaActiva() {
    const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'dashboard';

    switch (activeTab) {
        case 'listado':
            actualizarListado();
            break;
        case 'atrasos':
            actualizarAtrasos();
            break;
        case 'evolucion':
            actualizarEvolucion();
            break;
        case 'subcontratos':
            actualizarSubcontratos();
            break;
        case 'dashboard':
        default:
            actualizarDashboard();
            break;
    }
}

