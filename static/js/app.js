/**
 * app.js — Orquestador principal del Dashboard Financiero
 * Soporta filtro interactivo por clic en donut + dropdown de RUBRO.
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
    const btnUpload       = $('btn-upload-trigger');
    const btnClear        = $('btn-clear-data');
    const filterRubro     = $('filter-rubro');
    const recordCount     = $('record-count');
    const tableBody       = $('table-body');
    const tableCount      = $('table-count');
    const toastContainer  = $('toast-container');
    const donutHint       = $('donut-hint');

    // ── Estado ──
    let allData = null;   // { records, summary }

    // ── Inicialización ──
    function init() {
        bindEvents();

        // Registrar callback del donut interactivo
        ChartManager.onDonutClick((selectedRubro) => {
            // Sincronizar dropdown con la selección del donut
            if (selectedRubro) {
                filterRubro.value = selectedRubro;
                donutHint.textContent = `Filtrando: ${selectedRubro} — clic para quitar`;
            } else {
                filterRubro.value = '';
                donutHint.textContent = 'Haga clic en un segmento para filtrar';
            }
            applyFilter();
        });

        // Intentar cargar datos desde localStorage
        const saved = StorageManager.loadData();
        if (saved && saved.records && saved.records.length > 0) {
            allData = saved;
            showDashboard();
            toast('Datos restaurados desde sesión anterior', 'info');
        }
    }

    // ── Eventos ──
    function bindEvents() {
        // Click en la zona de upload
        uploadZone.addEventListener('click', () => fileInput.click());
        btnUpload.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', e => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });

        // Drag & drop
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

        // Clear data — sin confirm() para evitar bloqueos del navegador
        btnClear.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearDashboard();
        });

        // Filtro por Rubro (dropdown)
        filterRubro.addEventListener('change', () => {
            // Sincronizar donut con el dropdown
            ChartManager.clearDonutSelection();
            donutHint.textContent = 'Haga clic en un segmento para filtrar';
            applyFilter();
        });
    }

    // ── Upload ──
    async function handleFile(file) {
        if (!file.name.match(/\.xlsx?$/i)) {
            toast('Por favor seleccione un archivo .xlsx', 'error');
            return;
        }

        uploadLoading.classList.add('active');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Error al procesar archivo');
            }

            allData = await response.json();

            // Guardar en localStorage
            StorageManager.saveData(allData);

            showDashboard();
            toast(`${allData.summary.total_registros} registros cargados correctamente`, 'success');
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            uploadLoading.classList.remove('active');
            fileInput.value = '';
        }
    }

    // ── Dashboard ──
    function showDashboard() {
        if (!allData) return;

        uploadSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        btnClear.style.display = 'inline-flex';

        populateFilter();
        applyFilter();
    }

    function clearDashboard() {
        // 1. Borrar localStorage
        StorageManager.clearData();
        // 2. Destruir gráficos
        ChartManager.destroyAll();
        // 3. Limpiar estado
        allData = null;

        // 4. Resetear UI manualmente
        dashboardSection.style.display = 'none';
        uploadSection.style.display = '';
        uploadSection.removeAttribute('style');
        btnClear.style.display = 'none';
        filterRubro.innerHTML = '<option value="">Todos los Rubros</option>';
        tableBody.innerHTML = '';
        recordCount.textContent = '0';
        tableCount.textContent = '0 registros';

        // 5. Resetear KPIs
        ['kpi-costomes-value', 'kpi-valor-value'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '$0';
        });

        // 6. Resetear hint del donut
        if (donutHint) donutHint.textContent = 'Haga clic en un segmento para filtrar';

        toast('Datos eliminados correctamente', 'success');
    }

    // ── Filtros ──
    function populateFilter() {
        filterRubro.innerHTML = '<option value="">Todos los Rubros</option>';
        if (allData.summary.rubros) {
            allData.summary.rubros.forEach(r => {
                if (r && r.trim()) {
                    const opt = document.createElement('option');
                    opt.value = r;
                    opt.textContent = r;
                    filterRubro.appendChild(opt);
                }
            });
        }
    }

    function applyFilter() {
        // Determinar qué rubro filtrar (prioridad: donut > dropdown)
        const donutRubro = ChartManager.getSelectedRubro();
        const dropdownRubro = filterRubro.value;
        const activeRubro = donutRubro || dropdownRubro;

        let filtered = allData.records;
        if (activeRubro) {
            filtered = filtered.filter(r => r.RUBRO === activeRubro);
        }

        updateKPIs(filtered);
        // Pasar todos los registros como segundo argumento para que el donut siempre los muestre todos
        ChartManager.renderAll(filtered, allData.records);
        renderTable(filtered);
        recordCount.textContent = filtered.length;
    }

    // ── KPIs (solo Costo Mes y Valor) ──
    function updateKPIs(records) {
        let totalCostoMes = 0;
        let totalValor = 0;
        records.forEach(r => {
            totalCostoMes += parseFloat(r['COSTO MES']) || 0;
            totalValor    += parseFloat(r.VALOR) || 0;
        });

        animateKPI('kpi-costomes-value', totalCostoMes);
        animateKPI('kpi-valor-value', totalValor);
    }

    function animateKPI(elementId, targetValue) {
        const el = $(elementId);
        if (!el) return;
        const formatted = ChartManager.formatCurrency(targetValue);
        el.textContent = formatted;
        el.style.animation = 'none';
        el.offsetHeight; // trigger reflow
        el.style.animation = 'countUp 0.4s ease-out';
    }

    // ── Tabla ──
    function renderTable(records) {
        tableBody.innerHTML = '';
        tableCount.textContent = `${records.length} registros`;

        const fragment = document.createDocumentFragment();
        records.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(r.PROVEEDOR || '')}</td>
                <td>${escapeHtml(r.RUBRO || '')}</td>
                <td>${escapeHtml(r.TIPO || '')}</td>
                <td class="numeric">${ChartManager.formatCurrency(r['COSTO MES'])}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.BASE)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.IVA)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.RETENCION)}</td>
                <td class="numeric">${ChartManager.formatCurrency(r['CRUCE ANTICIPOS'])}</td>
                <td class="numeric">${ChartManager.formatCurrency(r.VALOR)}</td>
                <td>${escapeHtml(String(r.PRESUPUESTO || ''))}</td>
                <td>${escapeHtml(r.OBSERVACION || '')}</td>
            `;
            fragment.appendChild(tr);
        });
        tableBody.appendChild(fragment);
    }

    // ── Helpers ──
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

    // ── Arranque ──
    document.addEventListener('DOMContentLoaded', init);
})();
