import { ESTADO_COLORS } from '../constants.js';
import { obtenerDatosFiltrados } from '../services/dataService.js';
import { applyStatusIndicatorColors } from '../utils/table.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

// Usar colores centralizados desde constants.js
function getColor(estado) {
    return ESTADO_COLORS[estado] || '#94a3b8';
}

const modal = () => document.getElementById('modalDetalle');
const modalBody = () => document.getElementById('modalBody');
const modalContent = () => document.querySelector('#modalDetalle .modal-content');
const modalTitle = () => document.getElementById('modalTitle');

export function initModalListeners() {
    const btnCerrar = document.getElementById('btnCerrarModal');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', cerrarModal);
    }

    const modalWrapper = modal();
    if (modalWrapper) {
        modalWrapper.addEventListener('click', e => {
            if (e.target === modalWrapper) cerrarModal();
        });
    }
}

export function mostrarDetalleItem(correlativo) {
    const datos = obtenerDatosFiltrados();
    const item = datos.find(d => d.Correlativo === correlativo);

    if (!item) {
        console.warn('Item no encontrado:', correlativo);
        return;
    }

    mostrarDetalle(item);
}

export function mostrarVistaItems(estado, items) {
    if (!items.length) return;

    const max = 150;
    const mostrar = items.slice(0, max);

    let html = '<div class="vista-items-content">';

    mostrar.forEach(item => {
        const color = getColor(item.Estado);
        const esIncorporada = item.Estado === 'Incorporada';

        html += `
            <div class="item-card" data-correlativo="${item.Correlativo}">
                <div class="item-header">
                    <span class="item-id">${item.ID || item.Correlativo || '—'}</span>
                    <div class="item-badges">
                        <span class="badge-item badge-adc">ADE</span>
                        ${esIncorporada 
                            ? '<span class="badge-item badge-incorporada">Incorporada</span>'
                            : `<span class="badge-item badge-estado" style="background: ${color}15; color: ${color}; border-color: ${color}">${item.Estado}</span>`
                        }
                    </div>
                </div>
                <div class="item-info">
                    <div class="info-row">
                        <span class="info-label">Temática:</span>
                        <span class="info-value">${item.Tematica || item.TematicaGeneral || '—'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Elaborador:</span>
                        <span class="info-value">${item.Elaborador || 'Sin asignar'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Revisor:</span>
                        <span class="info-value">${item.Revisor || 'Sin asignar'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Subcontrato:</span>
                        <span class="info-value">${item.Subcontrato || '—'}</span>
                    </div>
                </div>
                <div class="item-text">${truncar(item.Pregunta || item.Item || 'Sin descripción', 200)}</div>
            </div>
        `;
    });

    html += '</div>';

    const footer = document.createElement('div');
    footer.className = 'vista-items-footer';
    footer.innerHTML = `
        <div class="footer-info">
            <i class="fas fa-info-circle"></i>
            <span>Mostrando ${mostrar.length} de ${items.length} items</span>
        </div>
        <div class="footer-hint">Haz clic en un item para ver el detalle completo</div>
    `;

    abrirModalVista(html, footer, `${estado} (${items.length})`);
}

export function mostrarDetalle(item) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let alertaHtml = '';
    const fechaEntregaUI = formatearFechaParaMostrar(item.FechaEntrega, '—');
    const fechaReporteUI = formatearFechaParaMostrar(item.FechaReporte, '—');

    // Atrasos: solo para items en elaboración con fecha de entrega vencida
    if (item.FechaEntrega && item.Estado === 'En elaboración') {
        const fechaEntrega = new Date(item.FechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);
        if (fechaEntrega < hoy) {
            const dias = Math.ceil((hoy - fechaEntrega) / (1000 * 60 * 60 * 24));
            alertaHtml = `
                <div class="detalle-alerta-atraso">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="detalle-alerta-contenido">
                        <strong>Atraso detectado</strong>
                        <span>${dias} ${dias === 1 ? 'día' : 'días'} de atraso</span>
                    </div>
                </div>
            `;
        }
    }

    const color = getColor(item.Estado);

    const html = `
        <div class="detalle-item">
            ${alertaHtml}
            
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-fingerprint"></i>
                    <span>Identificación</span>
                </div>
                <div class="detalle-grid">
                    <div class="detalle-field">
                        <label>N° Correlativo</label>
                        <div class="detalle-value">${item.Correlativo || '—'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>ID</label>
                        <div class="detalle-value">${item.ID || '—'}</div>
                    </div>
                </div>
                <div class="detalle-field detalle-field-full" style="margin-top: var(--space-3);">
                    <label>Ítem</label>
                    <div class="detalle-value">${item.Item || '—'}</div>
                </div>
            </div>

            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-comment-alt"></i>
                    <span>Pregunta</span>
                </div>
                <div class="detalle-pregunta-contenido">${item.Pregunta || 'Sin pregunta registrada'}</div>
            </div>

            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-folder"></i>
                    <span>Clasificación</span>
                </div>
                <div class="detalle-grid">
                    <div class="detalle-field">
                        <label>Temática General</label>
                        <div class="detalle-value">${item.TematicaGeneral || '—'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Temática</label>
                        <div class="detalle-value">${item.Tematica || '—'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Componente</label>
                        <div class="detalle-value">${item.Componente || '—'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Subcontrato</label>
                        <div class="detalle-value">${item.Subcontrato || '—'}</div>
                    </div>
                </div>
            </div>

            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-users"></i>
                    <span>Responsables</span>
                </div>
                <div class="detalle-grid">
                    <div class="detalle-field">
                        <label>Elaborador</label>
                        <div class="detalle-value">${item.Elaborador || '<span class="sin-asignar">Sin asignar</span>'}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Revisor</label>
                        <div class="detalle-value">${item.Revisor || '<span class="sin-asignar">Sin asignar</span>'}</div>
                    </div>
                </div>
            </div>

            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fas fa-info-circle"></i>
                    <span>Estado y Fechas</span>
                </div>
                <div class="detalle-field detalle-field-estado">
                    <label>Estado actual</label>
                    <div class="detalle-estado-badge">
                        <span class="status-indicator" style="background-color: ${color}"></span>
                        <span class="estado-texto">${item.Estado || '—'}</span>
                    </div>
                </div>
                <div class="detalle-grid" style="margin-top: var(--space-3);">
                    <div class="detalle-field">
                        <label>Fecha de Entrega</label>
                        <div class="detalle-value">${fechaEntregaUI}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Fecha de Reporte</label>
                        <div class="detalle-value">${fechaReporteUI}</div>
                    </div>
                    <div class="detalle-field">
                        <label>Semana de Reporte</label>
                        <div class="detalle-value">${item.SemanaReporte || '—'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    abrirModal(html, 'Detalle de Pregunta');
}

export function cerrarModal() {
    const m = modal();
    if (m) m.style.display = 'none';
}

function abrirModalVista(contenido, footer, titulo) {
    const m = modal();
    const body = modalBody();
    const content = modalContent();
    const title = modalTitle();

    if (!m || !body || !content) return;

    if (title) title.textContent = titulo || 'Vista de Items';

    body.className = 'modal-body vista-items-body';
    body.innerHTML = contenido;

    const footerAnterior = content.querySelector('.vista-items-footer');
    if (footerAnterior) footerAnterior.remove();

    if (footer) content.appendChild(footer);

    m.style.display = 'flex';

    setTimeout(() => {
        document.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', () => {
                const corr = parseInt(card.dataset.correlativo, 10);
                if (!Number.isNaN(corr)) mostrarDetalleItem(corr);
            });
        });
    }, 100);
}

function abrirModal(contenido, titulo = 'Detalle') {
    const m = modal();
    const body = modalBody();
    const content = modalContent();
    const title = modalTitle();

    if (!m || !body || !content) return;

    if (title) title.textContent = titulo;

    const footerAnterior = content.querySelector('.vista-items-footer');
    if (footerAnterior) footerAnterior.remove();

    body.className = 'modal-body';
    body.innerHTML = contenido;
    m.style.display = 'flex';

    setTimeout(() => applyStatusIndicatorColors(body), 50);
}

function truncar(texto, max) {
    if (!texto) return '';
    return texto.length > max ? texto.substring(0, max) + '...' : texto;
}
