const GITHUB_TOKEN_KEY = 'githubToken';

// Token de GitHub con permisos de lectura para acceso automático al repositorio
const GITHUB_TOKEN_FALLBACK = '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';

/**
 * Obtiene el token de GitHub.
 * Primero intenta obtenerlo de localStorage (para permitir sobreescritura manual).
 * Si no existe en localStorage, retorna el token hardcoded como fallback.
 * @returns {string} Token de GitHub (nunca retorna null o string vacío)
 */
export function getGitHubToken() {
    try {
        const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
        if (storedToken && storedToken.trim() !== '') {
            return storedToken;
        }
    } catch (error) {
        console.error('No fue posible leer el token de GitHub desde localStorage:', error);
    }
    
    // Fallback: retornar el token hardcoded
    return GITHUB_TOKEN_FALLBACK;
}

/**
 * Guarda un token de GitHub en localStorage.
 * Si se pasa un valor vacío o null, elimina el token de localStorage.
 * @param {string} token - Token a guardar
 */
export function saveGitHubToken(token) {
    try {
        if (token && token.trim() !== '') {
            localStorage.setItem(GITHUB_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(GITHUB_TOKEN_KEY);
        }
    } catch (error) {
        console.error('No fue posible guardar el token de GitHub:', error);
    }
}

/**
 * Elimina el token de GitHub de localStorage.
 * Nota: Después de limpiar, getGitHubToken() retornará el token hardcoded.
 */
export function clearGitHubToken() {
    try {
        localStorage.removeItem(GITHUB_TOKEN_KEY);
    } catch (error) {
        console.error('No fue posible eliminar el token de GitHub:', error);
    }
}

/**
 * Verifica si hay un token de GitHub disponible.
 * Siempre retorna true gracias al token hardcoded de fallback.
 * @returns {boolean}
 */
export function hasGitHubToken() {
    return Boolean(getGitHubToken());
}
