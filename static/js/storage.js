/**
 * storage.js — Persistencia en localStorage
 */

const StorageManager = (() => {
    const STORAGE_KEY = 'dashboard_financiero_data';

    function isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    function saveData(data) {
        if (!isAvailable()) return false;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Error al guardar en localStorage:', e);
            return false;
        }
    }

    function loadData() {
        if (!isAvailable()) return null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('Error al cargar desde localStorage:', e);
            return null;
        }
    }

    function clearData() {
        if (!isAvailable()) return;
        localStorage.removeItem(STORAGE_KEY);
    }

    function hasData() {
        if (!isAvailable()) return false;
        return localStorage.getItem(STORAGE_KEY) !== null;
    }

    return { saveData, loadData, clearData, hasData, isAvailable };
})();
