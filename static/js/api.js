/**
 * api.js — Cliente HTTP para el backend de FastAPI
 * Reemplaza el antiguo storage.js (localStorage)
 */

const ApiClient = (() => {
    const API_BASE = '/api';

    /**
     * Sube el archivo Excel al servidor
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Error al procesar archivo');
        }
        return await res.json();
    }

    /**
     * Trae los datos agregados del dashboard, filtrados por archivo y opcionalmente rubro
     * @param {number} fileId 
     * @param {string|null} rubro 
     * @returns {Promise<Object>}
     */
    async function getDashboardData(fileId, rubro = null) {
        const url = new URL(`${window.location.origin}${API_BASE}/dashboard`);
        url.searchParams.append('file_id', fileId);
        if (rubro) url.searchParams.append('rubro', rubro);
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error recuperando datos del dashboard');
        return await res.json();
    }

    /**
     * Trae los registros crudos para la tabla
     * @param {number} fileId 
     * @param {string|null} rubro 
     * @returns {Promise<Array>}
     */
    async function getRecords(fileId, rubro = null) {
        const url = new URL(`${window.location.origin}${API_BASE}/records`);
        url.searchParams.append('file_id', fileId);
        if (rubro) url.searchParams.append('rubro', rubro);
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error recuperando registros');
        return await res.json();
    }

    async function getFiles() {
        const res = await fetch(`${API_BASE}/files`);
        if (!res.ok) throw new Error('Error recuperando lista de archivos');
        return await res.json();
    }

    /**
     * Elimina un archivo específico por ID
     * @param {number} fileId
     * @returns {Promise<Object>}
     */
    async function deleteFile(fileId) {
        const res = await fetch(`${API_BASE}/files/${fileId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar el archivo');
        return await res.json();
    }

    /**
     * Limpia los datos de la base de datos de manera opcional para un hard reset (limpieza total)
     * @returns {Promise<Object>}
     */
    async function clearData() {
        const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
        if (!res.ok) throw new Error('Error al limpiar datos');
        return await res.json();
    }

    return {
        uploadFile,
        getDashboardData,
        getRecords,
        getFiles,
        deleteFile,
        clearData
    };
})();
