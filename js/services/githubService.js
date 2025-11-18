const GITHUB_TOKEN_KEY = 'githubToken';

export function getGitHubToken() {
    try {
        return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
    } catch (error) {
        console.error('No fue posible leer el token de GitHub:', error);
        return '';
    }
}

export function saveGitHubToken(token) {
    try {
        if (token) {
            localStorage.setItem(GITHUB_TOKEN_KEY, token);
        } else {
            localStorage.removeItem(GITHUB_TOKEN_KEY);
        }
    } catch (error) {
        console.error('No fue posible guardar el token de GitHub:', error);
    }
}

export function clearGitHubToken() {
    try {
        localStorage.removeItem(GITHUB_TOKEN_KEY);
    } catch (error) {
        console.error('No fue posible eliminar el token de GitHub:', error);
    }
}

export function hasGitHubToken() {
    return Boolean(getGitHubToken());
}


