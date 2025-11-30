import { cargarDatosFijosEnLinea, cargarReportesEnLinea } from '../services/dataLoader.js';
import { getGitHubToken, saveGitHubToken, clearGitHubToken } from '../services/githubService.js';

export function mostrarMenuCarga() {
    const menu = document.createElement('div');
    menu.className = 'modal';
    menu.style.display = 'flex';
    
    const tokenDisponible = Boolean(getGitHubToken());

    menu.innerHTML = `
        <div class="modal-content" style="max-width: 480px;">
            <div class="modal-header">
                <h2>Sincronizar Datos</h2>
                <button class="modal-close" id="btnCerrarMenuCarga" aria-label="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="menu-carga-content">
                    <button class="btn-primary" id="btnActualizarADE">
                        <i class="fas fa-database"></i>
                        <span>Actualizar Datos ADE</span>
                    </button>
                    <button class="btn-secondary" id="btnActualizarReportes">
                        <i class="fas fa-file-alt"></i>
                        <span>Actualizar Reportes</span>
                    </button>
                </div>

                <div class="token-section">
                    <label for="inputGitHubToken">Token de GitHub (opcional)</label>
                    <input 
                        type="password" 
                        id="inputGitHubToken" 
                        class="token-input" 
                        placeholder="ghp_xxxxxxxxxxxx" 
                        autocomplete="off"
                    >
                    <div class="token-status" id="tokenStatus">
                        ${renderTokenEstado(tokenDisponible)}
                    </div>
                    <div class="token-actions">
                        <button class="btn-secondary" id="btnGuardarToken">
                            <i class="fas fa-save"></i>
                            <span>Guardar</span>
                        </button>
                        <button class="btn-danger" id="btnEliminarToken">
                            <i class="fas fa-trash"></i>
                            <span>Eliminar</span>
                        </button>
                    </div>
                </div>

                <div class="menu-carga-info">
                    <p><strong>Datos ADE:</strong> Se descargan desde el repositorio oficial.</p>
                    <p style="margin-top: 0.5rem;"><strong>Reportes:</strong> Se sincronizan automáticamente. Si recibes error 403, configura un token personal de GitHub.</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(menu);

    const cerrar = () => menu.remove();

    // Eventos
    menu.addEventListener('click', e => {
        if (e.target === menu) cerrar();
    });

    menu.querySelector('#btnCerrarMenuCarga').addEventListener('click', cerrar);

    menu.querySelector('#btnActualizarADE').addEventListener('click', async () => {
        await cargarDatosFijosEnLinea({ mostrarNotificacion: true });
        cerrar();
    });

    menu.querySelector('#btnActualizarReportes').addEventListener('click', async () => {
        await cargarReportesEnLinea({ mostrarNotificacion: true });
        cerrar();
    });

    const tokenInput = menu.querySelector('#inputGitHubToken');
    const tokenStatus = menu.querySelector('#tokenStatus');

    const actualizarEstado = () => {
        tokenStatus.innerHTML = renderTokenEstado(Boolean(getGitHubToken()));
    };

    menu.querySelector('#btnGuardarToken').addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (!token) {
            mostrarAlerta('Ingresa un token válido');
            return;
        }
        saveGitHubToken(token);
        tokenInput.value = '';
        actualizarEstado();
        mostrarAlerta('Token guardado correctamente', 'success');
    });

    menu.querySelector('#btnEliminarToken').addEventListener('click', () => {
        clearGitHubToken();
        tokenInput.value = '';
        actualizarEstado();
        mostrarAlerta('Token eliminado', 'info');
    });
}

function renderTokenEstado(disponible) {
    if (disponible) {
        return `
            <span style="display: inline-flex; align-items: center; gap: 0.5rem; color: var(--success); font-size: 0.8125rem;">
                <i class="fas fa-check-circle"></i>
                Token configurado
            </span>
        `;
    }
    return `
        <span style="display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.8125rem;">
            <i class="fas fa-info-circle"></i>
            Sin token (acceso público)
        </span>
    `;
}

function mostrarAlerta(mensaje, tipo = 'warning') {
    // Crear notificación temporal
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${tipo === 'success' ? 'var(--success)' : tipo === 'info' ? 'var(--primary)' : 'var(--warning)'};
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2000;
        animation: slideUp 0.3s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 2500);
}
