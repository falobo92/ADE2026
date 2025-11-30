export const DATOS_ADE_URL = 'https://raw.githubusercontent.com/falobo92/ADE2026/main/Datos_fijos_ADE.json';
export const REPORTES_API_URL = 'https://api.github.com/repos/falobo92/ADE2026/contents/reportes';
export const REPORTES_RAW_BASE = 'https://raw.githubusercontent.com/falobo92/ADE2026/main/reportes/';

export const ESTADOS = [
    'En elaboración',
    'Subcontrato',
    'Con observaciones',
    'En cartografía',
    'En revisor técnico',
    'Pendiente',
    'En editorial',
    'Incorporada',
    'En elaboración cartografía',
    'En coordinador'
];

// Colores consistentes con las variables CSS del sistema
// Basados en la paleta definida en styles.css
export const ESTADO_COLORS = {
    'En elaboración': '#f59e0b',      // warning - amarillo/naranja
    'Subcontrato': '#6b7280',         // gray-500
    'Con observaciones': '#ef4444',   // danger/red
    'En cartografía': '#3b82f6',      // blue-500
    'En revisor técnico': '#06b6d4',  // cyan-500
    'Pendiente': '#9ca3af',           // gray-400
    'En editorial': '#8b5cf6',        // purple-500
    'Incorporada': '#10b981',         // success/green
    'En elaboración cartografía': '#fbbf24', // yellow-400
    'En coordinador': '#1d4ed8'       // blue-700
};

export const PROGRAMACION_FECHAS_BASE = [
    '07-11-2025',
    '14-11-2025',
    '21-11-2025',
    '28-11-2025',
    '05-12-2025',
    '12-12-2025',
    '19-12-2025',
    '26-12-2025',
    '02-01-2026',
    '09-01-2026'
];

