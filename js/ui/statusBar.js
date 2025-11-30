/**
 * Barra de estado del footer
 */

const statusElement = () => document.getElementById('fileStatus');

export function setStatusMessage(mensaje, opciones = {}) {
    const el = statusElement();
    if (!el) return;

    const { tipo, loading = false } = opciones;

    if (loading) {
        el.innerHTML = `<span class="loading"></span> ${mensaje}`;
        el.style.color = '';
        return;
    }

    el.textContent = mensaje;

    if (tipo === 'success') {
        resaltarColor(el, 'var(--success)');
    } else if (tipo === 'error') {
        resaltarColor(el, 'var(--danger)');
    } else {
        el.style.color = '';
    }
}

function resaltarColor(elemento, color) {
    elemento.style.color = color;
    setTimeout(() => {
        elemento.style.color = '';
    }, 3000);
}
