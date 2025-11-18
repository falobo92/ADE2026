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
    let alertaAtraso = '';
    const fechaEntregaUI = formatearFechaParaMostrar(item.FechaEntrega, 'N/A');
    const fechaReporteUI = formatearFechaParaMostrar(item.FechaReporte, 'N/A');

    if (item.FechaEntrega && item.Estado !== 'Incorporada') {
        const fechaEntrega = new Date(item.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0);
        if (fechaEntrega < hoy) {
            const diffTime = hoy - fechaEntrega;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            alertaAtraso = `
                <div class="detalle-alerta-atraso">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="detalle-alerta-contenido">
                        <strong>Pregunta con Atraso</strong>
                        <span>${diffDays} ${diffDays === 1 ? 'día' : 'días'} de atraso</span>
                    </div>
                </div>
            `;
        }
    }

    const html = `
        <div class="detalle-item">
            ${alertaAtraso}
            
            <!-- Identificación -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-hashtag"></i>
                    <span>Identificación</span>
                </div>
                <div class="detalle-grid">
                    <div class="detalle-field">
                        <label><i class="fas fa-list-ol"></i> N° Correlativo:</label>
                        <div class="detalle-value">${item.Correlativo || 'N/A'}</div>
                    </div>
                    <div class="detalle-field">
                        <label><i class="fas fa-tag"></i> ID:</label>
                        <div class="detalle-value">${item.ID || 'N/A'}</div>
                    </div>
                </div>
                <div class="detalle-field detalle-field-full">
                    <label><i class="fas fa-file-alt"></i> Ítem:</label>
                    <div class="detalle-value">${item.Item || 'N/A'}</div>
                </div>
            </div>

            <!-- Pregunta -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-question-circle"></i>
                    <span>Pregunta</span>
                </div>
                <div class="detalle-pregunta-contenido">
                    ${item.Pregunta || 'N/A'}
                </div>
            </div>

            <!-- Clasificación -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-folder-open"></i>
                    <span>Clasificación</span>
                </div>
                <div class="detalle-grid">
                    <div class="detalle-field">
                        <label><i class="fas fa-layer-group"></i> Temática General:</label>
                        <div class="detalle-value">${item.TematicaGeneral || 'N/A'}</div>
                    </div>
                    <div class="detalle-field">
                        <label><i class="fas fa-bookmark"></i> Temática:</label>
                        <div class="detalle-value">${item.Tematica || 'N/A'}</div>
                    </div>
                    <div class="detalle-field">
                        <label><i class="fas fa-puzzle-piece"></i> Componente:</label>
                        <div class="detalle-value">${item.Componente || 'N/A'}</div>
                    </div>
                    <div class="detalle-field">
                        <label><i class="fas fa-briefcase"></i> Subcontrato:</label>
                        <div class="detalle-value">${item.Subcontrato || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <!-- Responsables -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-users"></i>
                    <span>Responsables</span>
                </div>
                <div class="detalle-grid">
                    <div class="detalle-field">
                        <label><i class="fas fa-user-edit"></i> Elaborador:</label>
                        <div class="detalle-value">${item.Elaborador || '<span class="sin-asignar">Sin asignar</span>'}</div>
                    </div>
                    <div class="detalle-field">
                        <label><i class="fas fa-user-check"></i> Revisor:</label>
                        <div class="detalle-value">${item.Revisor || '<span class="sin-asignar">Sin asignar</span>'}</div>
                    </div>
                </div>
            </div>

            <!-- Estado y Fechas -->
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-info-circle"></i>
                    <span>Estado y Fechas</span>
                </div>
                <div class="detalle-field detalle-field-estado">
                    <label><i class="fas fa-circle"></i> Estado:</label>
                    <div class="detalle-estado-badge">
                        <span class="status-indicator" data-color="${ESTADO_COLORS[item.Estado] || '#999'}"></span>
                        <span class="estado-texto">${item.Estado || 'N/A'}</span>
                    </div>
                </div>
                <div class="detalle-grid">
                    <div class="detalle-field">
                        <label><i class="fas fa-calendar-check"></i> Fecha de Entrega:</label>
                        <div class="detalle-value">${fechaEntregaUI}</div>
                    </div>
                    <div class="detalle-field">
                        <label><i class="fas fa-calendar-alt"></i> Fecha de Reporte:</label>
                        <div class="detalle-value">${fechaReporteUI}</div>
                    </div>
                    <div class="detalle-field">
                        <label><i class="fas fa-calendar-week"></i> Semana de Reporte:</label>
                        <div class="detalle-value">${item.SemanaReporte || 'N/A'}</div>
                    </div>
                </div>
            </div>
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

