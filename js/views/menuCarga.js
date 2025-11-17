import { cargarDatosFijosEnLinea, cargarReportesEnLinea } from '../services/dataLoader.js';

export function mostrarMenuCarga() {
    const menu = document.createElement('div');
    menu.className = 'modal';
    menu.style.display = 'flex';
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
                <div class="modal-info" style="margin-top: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 6px;">
                    <p>
                        <strong>Datos ADE:</strong> Se descargan automáticamente desde el repositorio oficial para asegurar que siempre estén actualizados.<br><br>
                        <strong>Reportes:</strong> Se extraen en línea desde el repositorio oficial en GitHub y se sincronizan con la aplicación.
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
}

