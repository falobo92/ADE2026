import { actualizarDashboard } from '../views/dashboardView.js';
import { actualizarListado } from '../views/listadoView.js';
import { actualizarAtrasos } from '../views/atrasosView.js';
import { actualizarEvolucion } from '../views/evolucionView.js';
import { actualizarSubcontratos } from '../views/subcontratosView.js';

const VIEW_HANDLERS = {
    dashboard: actualizarDashboard,
    listado: actualizarListado,
    atrasos: actualizarAtrasos,
    evolucion: actualizarEvolucion,
    subcontratos: actualizarSubcontratos
};

let activeTab = 'dashboard';

export function initViewController() {
    const tabButtons = document.querySelectorAll('.tab');
    if (tabButtons.length === 0) {
        return;
    }

    const currentActive = document.querySelector('.tab.active');
    activeTab = currentActive?.dataset.tab || activeTab;

    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.dataset.tab) {
                setActiveTab(tab.dataset.tab);
            }
        });
    });
}

export function setActiveTab(tabName) {
    const tabButton = document.querySelector(`.tab[data-tab="${tabName}"]`);
    const tabContent = document.getElementById(`${tabName}View`);

    if (!isTabInteractiva(tabButton, tabContent)) {
        return;
    }

    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    tabButton.classList.add('active');
    tabContent.classList.add('active');
    activeTab = tabName;

    renderActiveTab();
}

export function getActiveTab() {
    return activeTab;
}

export function renderActiveTab() {
    const handler = VIEW_HANDLERS[activeTab] || VIEW_HANDLERS.dashboard;
    if (typeof handler === 'function') {
        handler();
    }
}

export function renderTab(tabName) {
    const handler = VIEW_HANDLERS[tabName];
    if (typeof handler === 'function') {
        handler();
    }
}

function isTabInteractiva(tabButton, tabContent) {
    if (!tabButton || !tabContent) return false;
    if (tabButton.disabled || tabButton.classList.contains('disabled')) return false;
    return true;
}


