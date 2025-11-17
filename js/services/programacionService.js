import { PROGRAMACION_FECHAS_BASE } from '../constants.js';
import { normalizarFechaClave, formatearFechaCorta } from '../utils/date.js';

let programacionFechas = [];
let programacionFechasClaves = [];
let programacionClaveAEtiqueta = {};

export function inicializarFechasProgramacion() {
    programacionFechas = PROGRAMACION_FECHAS_BASE.map(valor => {
        const clave = normalizarFechaClave(valor);
        return {
            original: valor,
            clave,
            etiqueta: formatearFechaCorta(clave || valor)
        };
    });

    programacionFechasClaves = programacionFechas.map(item => item.clave);
    programacionClaveAEtiqueta = programacionFechas.reduce((acc, item) => {
        if (item.clave) {
            acc[item.clave] = item.etiqueta;
        }
        return acc;
    }, {});
}

export function getProgramacionConfig() {
    return {
        fechas: programacionFechas,
        claves: programacionFechasClaves,
        etiquetas: programacionClaveAEtiqueta
    };
}

