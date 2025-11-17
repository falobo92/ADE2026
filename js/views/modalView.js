import { ESTADO_COLORS } from '../constants.js';
import { obtenerDatosFiltrados } from '../services/dataService.js';
import { applyStatusIndicatorColors } from '../utils/table.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

const modal = () => document.getElementById('modalDetalle');
const modalBody = () => document.getElementById('modalBody');
const modalContent = () => document.querySelector('#modalDetalle .modal-content');

export function initModalListeners() {
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModal);
    }

    const modalWrapper = modal();
    if (modalWrapper) {
        modalWrapper.addEventListener('click', (e) => {
            if (e.target === modalWrapper) {
                cerrarModal();
            }
        });
    }
}

export function mostrarDetalleItem(correlativo) {
    const datos = obtenerDatosFiltrados();
    const item = datos.find(d => d.Correlativo === correlativo);

    if (!item) {
        alert('No se encontró el elemento');
        return;
    }

    mostrarDetalle(item);
}

export function mostrarVistaItems(estado, items) {
    if (items.length === 0) return;

    const itemsPorPagina = 200;
    const itemsMostrar = items.slice(0, itemsPorPagina);
    const estadoText = `${estado} (${items.length} items)`;

    let html = '<div class="vista-items-content">';

    itemsMostrar.forEach(item => {
        const colorEstado = ESTADO_COLORS[item.Estado] || '#999';
        const badges = [];

        badges.push('<span class="badge-item badge-adc">ADC</span>');
        if (item.Estado === 'Incorporada') {
            badges.push('<span class="badge-item badge-incorporada">Incorporada</span>');
        } else {
            badges.push(`<span class="badge-item badge-estado" style="background-color: ${colorEstado}20; color: ${colorEstado}; border-color: ${colorEstado};">${item.Estado}</span>`);
        }

        html += `
            <div class="item-card" data-correlativo="${item.Correlativo}">
                <div class="item-header">
                    <span class="item-id">${item.ID || item.Correlativo || 'N/A'}</span>
                    <div class="item-badges">
                        ${badges.join('')}
                    </div>
                </div>
                <div class="item-info">
                    <div class="info-row">
                        <span class="info-label">Temática:</span>
                        <span class="info-value">${item.Tematica || item.TematicaGeneral || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Elaborador:</span>
                        <span class="info-value">${item.Elaborador || 'Sin asignar'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Revisor:</span>
                        <span class="info-value">${item.Revisor || 'Sin asignar'}</span>
                    </div>
                    ${item.Coordinador ? `
                    <div class="info-row">
                        <span class="info-label">Coordinador:</span>
                        <span class="info-value">${item.Coordinador}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">Subcontrato:</span>
                        <span class="info-value">${item.Subcontrato || 'N/A'}</span>
                    </div>
                </div>
                <div class="item-text">
                    ${item.Pregunta || item.Item || 'Sin descripción'}
                </div>
            </div>
        `;
    });

    html += '</div>';

    const footer = document.createElement('div');
    footer.className = 'vista-items-footer';
    footer.innerHTML = `
        <div class="footer-info">
            <i class="fas fa-info-circle"></i>
            <span>Mostrando ${itemsMostrar.length} de ${items.length} items</span>
        </div>
        <div class="footer-hint">
            Usa filtros para ver resultados más específicos
        </div>
    `;

    abrirModalVista(html, footer, estadoText);
}

export function mostrarDetalle(item) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let diasAtraso = '';
    const fechaEntregaUI = formatearFechaParaMostrar(item.FechaEntrega, 'N/A');
    const fechaReporteUI = formatearFechaParaMostrar(item.FechaReporte, 'N/A');

    if (item.FechaEntrega && item.Estado !== 'Incorporada') {
        const fechaEntrega = new Date(item.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);
        if (fechaEntrega < hoy) {
            const diffTime = hoy - fechaEntrega;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            diasAtraso = `<div class="dias-atraso" style="margin-top: 1rem;">⚠️ <strong>Atraso:</strong> ${diffDays} días</div>`;
        }
    }

    const html = `
        <div class="detalle-item">
            <div class="detalle-field">
                <label>N° (Correlativo):</label>
                <div>${item.Correlativo || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>ID:</label>
                <div>${item.ID || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Ítem:</label>
                <div>${item.Item || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Pregunta:</label>
                <div class="detalle-texto-largo">${item.Pregunta || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Temática General:</label>
                <div>${item.TematicaGeneral || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Temática:</label>
                <div>${item.Tematica || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Componente:</label>
                <div>${item.Componente || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Subcontrato:</label>
                <div>${item.Subcontrato || 'N/A'}</div>
            </div>
            <div class="detalle-field">
                <label>Elaborador:</label>
                <div>${item.Elaborador || 'Sin asignar'}</div>
            </div>
            <div class="detalle-field">
                <label>Revisor:</label>
                <div>${item.Revisor || 'Sin asignar'}</div>
            </div>
            <div class="detalle-field">
                <label>Estado:</label>
                <div>
                    <span class="status-indicator" data-color="${ESTADO_COLORS[item.Estado] || '#999'}"></span>
                    ${item.Estado || 'N/A'}
                </div>
            </div>
            <div class="detalle-field">
                <label>Fecha de Entrega:</label>
                <div>${fechaEntregaUI}</div>
            </div>
            <div class="detalle-field">
                <label>Fecha de Reporte:</label>
                <div>${fechaReporteUI}</div>
            </div>
            <div class="detalle-field">
                <label>Semana de Reporte:</label>
                <div>${item.SemanaReporte || 'N/A'}</div>
            </div>
            ${diasAtraso}
        </div>
    `;

    abrirModal(html);
}

export function cerrarModal() {
    const modalWrapper = modal();
    if (modalWrapper) {
        modalWrapper.style.display = 'none';
    }
}

function abrirModalVista(contenido, footer, titulo) {
    const modalWrapper = modal();
    const body = modalBody();
    const content = modalContent();

    if (!modalWrapper || !body || !content) return;

    const modalHeader = content.querySelector('.modal-header h2');
    if (modalHeader && titulo) {
        modalHeader.textContent = titulo;
        modalHeader.style.display = 'block';
    }

    body.className = 'modal-body vista-items-body';
    body.innerHTML = contenido;

    const footerAnterior = content.querySelector('.vista-items-footer');
    if (footerAnterior) {
        footerAnterior.remove();
    }

    if (footer) {
        content.appendChild(footer);
    }

    modalWrapper.style.display = 'flex';

    setTimeout(() => {
        document.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => {
                const correlativo = parseInt(card.dataset.correlativo, 10);
                if (!Number.isNaN(correlativo)) {
                    mostrarDetalleItem(correlativo);
                }
            });
        });
    }, 100);
}

function abrirModal(contenido) {
    const modalWrapper = modal();
    const body = modalBody();
    const content = modalContent();
    const modalHeader = content?.querySelector('.modal-header h2');

    if (!modalWrapper || !body || !content) return;

    if (modalHeader) {
        modalHeader.textContent = 'Detalle de Pregunta';
        modalHeader.style.display = 'block';
    }

    const footerAnterior = content.querySelector('.vista-items-footer');
    if (footerAnterior) {
        footerAnterior.remove();
    }

    body.className = 'modal-body';
    body.innerHTML = contenido;
    modalWrapper.style.display = 'flex';

    setTimeout(() => applyStatusIndicatorColors(body), 50);
}

