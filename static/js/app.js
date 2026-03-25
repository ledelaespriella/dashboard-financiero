/**
 * app.js — Orquestador principal del Dashboard Financiero
 * Consume PostgreSQL vía ApiClient, soportando múltiples archivos y eliminaciones directas.
 */

(() => {
    'use strict';

    // ── Elementos del DOM ──
    const $ = id => document.getElementById(id);

    const uploadSection   = $('upload-section');
    const uploadZone      = $('upload-zone');
    const uploadLoading   = $('upload-loading');
    const fileInput       = $('file-input');
    
    const dashboardSection = $('dashboard-section');
    const fileSelector    = $('file-selector');
    const btnDeleteFile   = $('btn-delete-file');
    const btnUpload       = $('btn-upload-trigger');
    const btnCloseView    = $('btn-close-view');
    const filterRubro     = $('filter-rubro');
    
    const recordCount     = $('record-count');
    const tableBody       = $('table-body');
    const tableCount      = $('table-count');
    const toastContainer  = $('toast-container');
    const donutHint       = $('donut-hint');

    // ── Estado ──
    let isUpdatingFilter = false;
    let currentFileId = null;

    // ── Inicialización ──
    async function init() {
        bindEvents();

        ChartManager.onDonutClick(async (selectedRubro) => {
            if (isUpdatingFilter || !currentFileId) return;
            isUpdatingFilter = true;

            if (selectedRubro) {
                filterRubro.value = selectedRubro;
                donutHint.textContent = `Filtrando: ${selectedRubro} — clic para quitar`;
            } else {
                filterRubro.value = '';
                donutHint.textContent = 'Haga clic en un segmento para filtrar';
            }
            await reloadDashboard();
            isUpdatingFilter = false;
        });

        await refreshFilesList();
    }

    // ── Eventos ──
    function bindEvents() {
        uploadZone.addEventListener('click', () => fileInput.click());
        btnUpload.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', e => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });

        uploadZone.addEventListener('dragover', e => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        uploadZone.addEventListener('drop', e => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });

        // Evento Cerrar Vista (Mantiene BD)
        btnCloseView.addEventListener('click', (e) => {
            e.preventDefault();
            closeDashboardView();
        });

        // Evento Cambiar Historial de Archivos
        fileSelector.addEventListener('change', async (e) => {
            const newFileId = parseInt(e.target.value, 10);
            if (!newFileId || isNaN(newFileId)) return;
            currentFileId = newFileId;
            ChartManager.clearDonutSelection();
            donutHint.textContent = 'Haga clic en un segmento para filtrar';
            filterRubro.value = '';
            await loadDashboardForFile(currentFileId);
        });

        // Evento Eliminar Archivo (Borra BD)
        btnDeleteFile.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!currentFileId) return;
            
            if (!confirm('¿Estás seguro de eliminar este archivo? Esto borrará permanentemente sus presupuestos de la base de datos.')) {
                return;
            }

            try {
                await ApiClient.deleteFile(currentFileId);
                toast('Archivo y presupuestos eliminados con éxito.', 'success');
                currentFileId = null;
                await refreshFilesList(); // Si no quedan, cierra vista solos
            } catch (err) {
                toast(err.message, 'error');
            }
        });

        filterRubro.addEventListener('change', async () => {
            if (isUpdatingFilter || !currentFileId) return;
            isUpdatingFilter = true;

            ChartManager.clearDonutSelection();
            donutHint.textContent = 'Haga clic en un segmento para filtrar';
            await reloadDashboard();
            
            isUpdatingFilter = false;
        });
    }

    // ── Subida de Archivos ──
    async function handleFile(file) {
        if (!file.name.match(/\.xlsx?$/i)) {
            toast('Por favor seleccione un archivo .xlsx', 'error');
            return;
        }

        uploadLoading.classList.add('active');

        try {
            const res = await ApiClient.uploadFile(file);
            toast(`${res.total_registros} registros de ${res.filename} agregados al historial.`, 'success');
            
            // Refrescar lista de archivos y seleccionar el nuevo (siempre será el de id mayor o último)
            await refreshFilesList(true); 

        } catch (err) {
            toast(err.message, 'error');
        } finally {
            uploadLoading.classList.remove('active');
            fileInput.value = '';
        }
    }

    // ── Historial de Archivos ──
    async function refreshFilesList(selectLatest = false) {
        try {
            const files = await ApiClient.getFiles();
            fileSelector.innerHTML = '';
            
            if (files.length === 0) {
                fileSelector.innerHTML = '<option value="">No hay archivos previos</option>';
                fileSelector.disabled = true;
                closeDashboardView();
                return;
            }

            fileSelector.disabled = false;
            
            // Llenar selector
            files.sort((a,b) => b.id - a.id).forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                // Formatear fecha
                const d = new Date(f.subido_en);
                const strDate = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                opt.textContent = `${f.filename} (${f.total_registros} reg) - ${strDate}`;
                fileSelector.appendChild(opt);
            });

            // Auto-seleccionar
            if (selectLatest) {
                currentFileId = files[0].id; // files[0] es el más nuevo gracias al sort inverso
            } else if (!currentFileId) {
                currentFileId = files[0].id;
            }

            // Validar que el currentFileId aún exista en la lista
            if (!files.find(f => f.id === currentFileId)) {
                currentFileId = files[0].id;
            }

            fileSelector.value = currentFileId;
            
            // Cargar dashboard para este archive
            await loadDashboardForFile(currentFileId);

        } catch (e) {
            console.error('Error fetching files:', e);
            toast('Error cargando historial de archivos', 'error');
        }
    }

    // ── Dashboard Core ──
    async function loadDashboardForFile(fileId) {
        try {
            const data = await ApiClient.getDashboardData(fileId);
            if (data && data.kpis.total_registros > 0) {
                uploadSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                btnCloseView.style.display = 'inline-flex';
                btnDeleteFile.style.display = 'inline-flex';
                
                populateFilter(data.kpis.rubros);
                await renderAll(data, null);
            }
        } catch (e) {
            toast('Error cargando los datos del archivo', 'error');
        }
    }

    async function reloadDashboard() {
        if (!currentFileId) return;
        const rubroQuery = ChartManager.getSelectedRubro() || filterRubro.value || null;
        try {
            const data = await ApiClient.getDashboardData(currentFileId, rubroQuery);
            await renderAll(data, rubroQuery);
        } catch (e) {
            toast('Error recargando filtro de dashboard', 'error');
        }
    }

    async function renderAll(data, rubroQuery = null) {
        animateKPI('kpi-costomes-value', data.kpis.total_costo_mes);
        animateKPI('kpi-valor-value', data.kpis.total_valor);
        
        ChartManager.renderDonutDirect(data.donut);
        ChartManager.renderProveedoresDirect(data.proveedores);
        ChartManager.renderStackedDirect(data.stacked);

        recordCount.textContent = data.kpis.total_registros;
        try {
            const records = await ApiClient.getRecords(currentFileId, rubroQuery);
            renderTable(records);
        } catch (e) {
            console.error('Error fetching records for table', e);
        }
    }

    function closeDashboardView() {
        ChartManager.destroyAll();
        dashboardSection.style.display = 'none';
        uploadSection.style.display = '';
        uploadSection.removeAttribute('style');
        
        btnCloseView.style.display = 'none';
        
        filterRubro.innerHTML = '<option value="">Todos los Rubros</option>';
        tableBody.innerHTML = '';
        recordCount.textContent = '0';
        tableCount.textContent = '0 registros';
        if (donutHint) donutHint.textContent = 'Haga clic en un segmento para filtrar';

        // Opcional: no nullificamos currentFileId para que si vuelven a subir, siga allí o cambie al nuevo,
        // pero limpiar permite forzar a ver la zona de carga de forma nativa.
        toast('Vista cerrada. El archivo sigue en la base de datos.', 'info');
    }

    // ── Funciones Auxiliares ──
    function populateFilter(rubros) {
        const currentVal = filterRubro.value;
        filterRubro.innerHTML = '<option value="">Todos los Rubros</option>';
        if (rubros && rubros.length) {
            rubros.forEach(r => {
                if (r && r.trim()) {
                    const opt = document.createElement('option');
                    opt.value = r;
                    opt.textContent = r;
                    filterRubro.appendChild(opt);
                }
            });
            if (currentVal) filterRubro.value = currentVal;
        }
    }

    function animateKPI(elementId, targetValue) {
        const el = $(elementId);
        if (!el) return;
        const formatted = ChartManager.formatCurrency(targetValue);
        el.textContent = formatted;
        el.style.animation = 'none';
        el.offsetHeight; // rf
        el.style.animation = 'countUp 0.4s ease-out';
    }

    function renderTable(records) {
        tableBody.innerHTML = '';
        tableCount.textContent = `${records.length} registros`;

        const fragment = document.createDocumentFragment();
        records.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(r.proveedor || '')}</td>
                <td>${escapeHtml(r.rubro || '')}</td>
                <td>${escapeHtml(r.tipo || '')}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.costo_mes)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.base)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.iva)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.retencion)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.cruce_anticipos)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.valor)}</td>
                <td>${escapeHtml(String(r.presupuesto_cat || ''))}</td>
                <td>${escapeHtml(r.observacion || '')}</td>
            `;
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function toast(message, type = 'info') {
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.textContent = message;
        toastContainer.appendChild(el);
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 4000);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
