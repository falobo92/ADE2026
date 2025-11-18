import { cargarDatosFijosEnLinea, cargarReportesEnLinea } from '../services/dataLoader.js';
import { getGitHubToken, saveGitHubToken, clearGitHubToken } from '../services/githubService.js';

export function mostrarMenuCarga() {
    const menu = document.createElement('div');
    menu.className = 'modal';
    menu.style.display = 'flex';
    const tokenDisponible = Boolean(getGitHubToken());
    menu.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Cargar Datos</h2>
                <button class="modal-close" id="btnCerrarMenuCarga">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="modal-actions" style="display: flex; flex-direction: column; gap: 1rem;">
                    <button class="btn-primary" id="btnActualizarADE" style="width: 100%; justify-content: center;">
                        <i class="fas fa-database"></i> Actualizar Datos ADE (en línea)
                    </button>
                    <button class="btn-secondary" id="btnActualizarReportes" style="width: 100%; justify-content: center;">
                        <i class="fas fa-file-alt"></i> Actualizar Reportes (en línea)
                    </button>
                </div>
                <div class="token-section">
                    <label for="inputGitHubToken">Token personal de GitHub (opcional)</label>
                    <input type="password" id="inputGitHubToken" class="token-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off">
                    <small>Solo se utiliza localmente para autenticar las descargas desde GitHub.</small>
                    <div class="token-status" id="tokenStatus">
                        ${renderTokenEstado(tokenDisponible)}
                    </div>
                    <div class="token-actions">
                        <button class="btn-secondary" id="btnGuardarToken">
                            <i class="fas fa-save"></i> Guardar token
                        </button>
                        <button class="btn-danger" id="btnEliminarToken">
                            <i class="fas fa-trash"></i> Eliminar token
                        </button>
                    </div>
                </div>
                <div class="modal-info" style="margin-top: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 6px;">
                    <p>
                        <strong>Datos ADE:</strong> Se descargan automáticamente desde el repositorio oficial para asegurar que siempre estén actualizados.<br><br>
                        <strong>Reportes:</strong> Se extraen en línea desde el repositorio oficial en GitHub y se sincronizan con la aplicación. Si GitHub devuelve error 403, configura tu token personal en este mismo panel.
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(menu);

    const cerrarMenu = () => menu.remove();

    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            cerrarMenu();
        }
    });

    menu.querySelector('#btnCerrarMenuCarga').addEventListener('click', cerrarMenu);
    menu.querySelector('#btnActualizarADE').addEventListener('click', async () => {
        await cargarDatosFijosEnLinea({ mostrarNotificacion: true });
        cerrarMenu();
    });
    menu.querySelector('#btnActualizarReportes').addEventListener('click', async () => {
        await cargarReportesEnLinea({ mostrarNotificacion: true });
        cerrarMenu();
    });

    const tokenInput = menu.querySelector('#inputGitHubToken');
    const tokenStatus = menu.querySelector('#tokenStatus');
    const actualizarEstadoToken = () => {
        tokenStatus.innerHTML = renderTokenEstado(Boolean(getGitHubToken()));
    };

    menu.querySelector('#btnGuardarToken').addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (!token) {
            alert('Ingresa un token válido antes de guardarlo.');
            return;
        }
        saveGitHubToken(token);
        tokenInput.value = '';
        actualizarEstadoToken();
        alert('Token guardado correctamente. GitHub usará esta autenticación en los próximos intentos.');
    });

    menu.querySelector('#btnEliminarToken').addEventListener('click', () => {
        clearGitHubToken();
        tokenInput.value = '';
        actualizarEstadoToken();
        alert('Token eliminado. Las descargas volverán a utilizar accesos públicos.');
    });
}

function renderTokenEstado(tokenDisponible) {
    if (tokenDisponible) {
        return `
            <span class="badge-item badge-incorporada">
                <i class="fas fa-lock"></i> Token guardado
            </span>
        `;
    }
    return `
        <span class="badge-item badge-warning">
            <i class="fas fa-unlock"></i> Sin token configurado
        </span>
    `;
}

