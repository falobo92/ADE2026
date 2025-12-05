const GITHUB_TOKEN_KEY = 'githubToken';

/**
 * Obtiene el token de GitHub desde localStorage (opcional).
 * El sistema ahora funciona sin token usando la API pública de GitHub.
 * @returns {string} Token de GitHub o string vacío
 */
export function getGitHubToken() {
    try {
        return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
    } catch (error) {
        console.error('No fue posible leer el token de GitHub:', error);
        return '';
    }
}

/**
 * Guarda un token de GitHub en localStorage (opcional).
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
 */
export function clearGitHubToken() {
    try {
        localStorage.removeItem(GITHUB_TOKEN_KEY);
    } catch (error) {
        console.error('No fue posible eliminar el token de GitHub:', error);
    }
}

/**
 * Verifica si hay un token de GitHub guardado.
 * @returns {boolean}
 */
export function hasGitHubToken() {
    return Boolean(getGitHubToken());
}
