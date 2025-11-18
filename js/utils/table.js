export function attachTextoFilter(inputSelector, rowsSelector) {
    const input = document.querySelector(inputSelector);
    if (!input) return;

    const handler = () => {
        const needle = input.value.toLowerCase();
        document.querySelectorAll(rowsSelector).forEach(row => {
            const texto = row.textContent.toLowerCase();
            row.style.display = texto.includes(needle) ? '' : 'none';
        });
    };

    if (input.dataset.filterBound === 'true') {
        handler();
        return;
    }

    input.dataset.filterBound = 'true';
    input.addEventListener('input', handler);
    handler();
}

export function applyStatusIndicatorColors(root = document) {
    root.querySelectorAll('.status-indicator[data-color]').forEach(indicator => {
        const color = indicator.getAttribute('data-color');
        indicator.style.backgroundColor = color;
    });
}

export function toggleSortState(estadoActual, columna) {
    if (estadoActual?.columna === columna) {
        return {
            columna,
            direccion: estadoActual.direccion === 'asc' ? 'desc' : 'asc'
        };
    }

    return {
        columna,
        direccion: 'asc'
    };
}

export function actualizarIconosOrden(tablaSelector, columna, direccion) {
    document.querySelectorAll(`${tablaSelector} .sortable i`).forEach(icon => {
        icon.className = 'fas fa-sort';
    });

    const headerActual = document.querySelector(`${tablaSelector} [data-col="${columna}"]`);
    if (headerActual) {
        const icon = headerActual.querySelector('i');
        if (icon) {
            icon.className = direccion === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    }
}

