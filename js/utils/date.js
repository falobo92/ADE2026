export function parseFechaFlexible(valor) {
    if (!valor) return null;

    if (typeof valor === 'string') {
        const matchDDMMYYYY = valor.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (matchDDMMYYYY) {
            const [, dia, mes, anio] = matchDDMMYYYY;
            return new Date(
                parseInt(anio, 10),
                parseInt(mes, 10) - 1,
                parseInt(dia, 10)
            );
        }

        const matchISO = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (matchISO) {
            const [, anio, mes, dia] = matchISO;
            return new Date(
                parseInt(anio, 10),
                parseInt(mes, 10) - 1,
                parseInt(dia, 10)
            );
        }
    }

    const timestamp = Date.parse(valor);
    if (Number.isNaN(timestamp)) {
        return null;
    }

    return new Date(timestamp);
}

export function formatearClaveLocal(fecha) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function normalizarFechaClave(valor) {
    if (!valor) return 'Sin fecha';

    const fecha = parseFechaFlexible(valor);
    if (!fecha) {
        return valor;
    }

    fecha.setHours(0, 0, 0, 0);
    return formatearClaveLocal(fecha);
}

export function formatearFechaCorta(valor) {
    if (!valor || valor === 'Sin fecha') {
        return valor || 'Sin fecha';
    }

    const fecha = parseFechaFlexible(valor);
    if (!fecha) {
        return valor;
    }

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = String(fecha.getFullYear()).slice(-2);

    return `${dia}-${mes}-${anio}`;
}

export function formatearFechaParaMostrar(valor, fallback = '') {
    if (!valor) return fallback;
    const formateada = formatearFechaCorta(valor);
    return formateada || fallback;
}

