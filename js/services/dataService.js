import { AppState } from '../state.js';
import { parseFechaFlexible } from '../utils/date.js';

export function correlacionarDatos() {
    if (!AppState.datosADE || AppState.reportes.length === 0) {
        AppState.datosCorrelacionados = [];
        return;
    }

    const mapaADE = {};
    AppState.datosADE.forEach(item => {
        if (item?.Correlativo) {
            mapaADE[item.Correlativo] = item;
        }
    });

    const correlacionados = [];

    AppState.reportes.forEach(reporte => {
        reporte.Registros.forEach(registro => {
            const correlativo = registro.Correlativo;
            const datoADE = mapaADE[correlativo];

            if (datoADE) {
                correlacionados.push({
                    ...datoADE,
                    ...registro,
                    FechaReporte: reporte.FechaReporte,
                    SemanaReporte: reporte.SemanaReporte
                });
            }
        });
    });

    AppState.datosCorrelacionados = correlacionados;
}

export function obtenerDatosFiltrados(opciones = {}) {
    const { deduplicar = true } = opciones;
    let datos = [...AppState.datosCorrelacionados];

    if (AppState.filtros.semana) {
        const semanaSeleccionada = parseInt(AppState.filtros.semana, 10);
        datos = datos.filter(d => {
            const semanaDato = parseInt(d.SemanaReporte, 10);
            return !Number.isNaN(semanaDato) && semanaDato === semanaSeleccionada;
        });
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

export function deduplicarPorCorrelativo(datos) {
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

export function obtenerPrioridadTemporal(item) {
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

