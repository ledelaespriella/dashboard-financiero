/**
 * charts.js — Creación y actualización de gráficos con Chart.js
 * Donut interactivo que filtra otros gráficos al hacer clic.
 */

const ChartManager = (() => {
    // Paleta de colores premium
    const COLORS = [
        '#818cf8', '#a78bfa', '#22d3ee', '#34d399',
        '#fbbf24', '#fb7185', '#f472b6', '#60a5fa',
        '#4ade80', '#facc15', '#f87171', '#38bdf8',
        '#c084fc', '#2dd4bf', '#fb923c', '#e879f9',
    ];

    const COLORS_ALPHA = COLORS.map(c => c + '33');

    // Instancias de Chart
    let donutChart = null;
    let proveedoresChart = null;
    let stackedChart = null;

    // Callback para cuando se hace clic en el donut
    let _onDonutClick = null;

    // Configuración global de Chart.js
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;

    /**
     * Formatea número como moneda COP
     */
    function formatCurrency(value) {
        if (value == null || isNaN(value)) return '$0';
        return '$' + Math.round(value).toLocaleString('es-CO');
    }

    /**
     * Agrupa datos por un campo y suma otro campo
     */
    function groupBy(records, groupField, sumField) {
        const map = {};
        records.forEach(r => {
            const key = r[groupField] || '(Vacío)';
            map[key] = (map[key] || 0) + (parseFloat(r[sumField]) || 0);
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1]);
    }

    /**
     * Agrupa datos por un campo y suma múltiples campos
     */
    function groupByMultiple(records, groupField, sumFields) {
        const map = {};
        records.forEach(r => {
            const key = r[groupField] || '(Vacío)';
            if (!map[key]) map[key] = {};
            sumFields.forEach(f => {
                map[key][f] = (map[key][f] || 0) + (parseFloat(r[f]) || 0);
            });
        });
        return Object.entries(map)
            .sort((a, b) => {
                const totalA = sumFields.reduce((s, f) => s + (a[1][f] || 0), 0);
                const totalB = sumFields.reduce((s, f) => s + (b[1][f] || 0), 0);
                return totalB - totalA;
            });
    }

    /**
     * Destruye un chart si existe
     */
    function destroyChart(chart) {
        if (chart) chart.destroy();
        return null;
    }

    /**
     * Registra el callback de clic en el donut
     */
    function onDonutClick(callback) {
        _onDonutClick = callback;
    }

    /**
     * 1. Donut INTERACTIVO — Distribución por RUBRO
     * Al hacer clic en un segmento, dispara el callback con el nombre del rubro.
     * Si se hace clic de nuevo en el mismo rubro, limpia el filtro (null).
     */
    let _selectedRubro = null;

    function renderDonut(records, allRecords) {
        donutChart = destroyChart(donutChart);
        // Usar todos los registros para el donut (para mantener visibilidad de todos los segmentos)
        const source = allRecords || records;
        const data = groupBy(source, 'RUBRO', 'VALOR');
        const ctx = document.getElementById('chart-donut').getContext('2d');

        // Generar colores con opacidad reducida para segmentos no seleccionados
        const bgColors = data.map((d, i) => {
            if (_selectedRubro && d[0] !== _selectedRubro) {
                return COLORS[i % COLORS.length] + '44'; // semi-transparente
            }
            return COLORS[i % COLORS.length];
        });

        const borderColors = data.map((d, i) => {
            if (_selectedRubro && d[0] === _selectedRubro) {
                return '#ffffff';
            }
            return 'rgba(10,14,26,0.8)';
        });

        const borderWidths = data.map((d) => {
            return (_selectedRubro && d[0] === _selectedRubro) ? 3 : 2;
        });

        donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d[0]),
                datasets: [{
                    data: data.map(d => d[1]),
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    hoverOffset: 8,
                }]
            },
            options: {
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { font: { size: 11 }, padding: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const clickedRubro = data[index][0];

                        if (_selectedRubro === clickedRubro) {
                            // Deseleccionar: quitar filtro
                            _selectedRubro = null;
                        } else {
                            // Seleccionar nuevo rubro
                            _selectedRubro = clickedRubro;
                        }

                        if (_onDonutClick) {
                            _onDonutClick(_selectedRubro);
                        }
                    }
                }
            }
        });

        // Cursor pointer al pasar sobre segmentos
        const canvas = document.getElementById('chart-donut');
        canvas.style.cursor = 'pointer';
    }

    /**
     * 2. Horizontal Bar — Top 10 Proveedores
     */
    function renderProveedores(records) {
        proveedoresChart = destroyChart(proveedoresChart);
        const data = groupBy(records, 'PROVEEDOR', 'VALOR').slice(0, 10);
        const ctx = document.getElementById('chart-proveedores').getContext('2d');

        proveedoresChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d[0].length > 25 ? d[0].substring(0, 25) + '…' : d[0]),
                datasets: [{
                    label: 'Valor Total',
                    data: data.map(d => d[1]),
                    backgroundColor: COLORS_ALPHA.slice(0, data.length),
                    borderColor: COLORS.slice(0, data.length),
                    borderWidth: 1.5,
                    borderRadius: 4,
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` Valor: ${formatCurrency(ctx.parsed.x)}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { callback: v => formatCurrency(v) },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    /**
     * 3. Stacked Bar — Top 10 PRESUPUESTO (Costo Mes y Valor)
     */
    function renderStacked(records) {
        stackedChart = destroyChart(stackedChart);
        const fields = ['COSTO MES', 'VALOR'];
        const data = groupByMultiple(records, 'PRESUPUESTO', fields).slice(0, 10);
        const ctx = document.getElementById('chart-stacked').getContext('2d');

        const fieldConfig = {
            'COSTO MES': { bg: '#22d3ee33', border: '#22d3ee', label: 'Costo Mes' },
            'VALOR':     { bg: '#818cf833', border: '#818cf8', label: 'Valor' },
        };

        stackedChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d[0].length > 20 ? d[0].substring(0, 20) + '…' : d[0]),
                datasets: fields.map(f => ({
                    label: fieldConfig[f].label,
                    data: data.map(d => d[1][f] || 0),
                    backgroundColor: fieldConfig[f].bg,
                    borderColor: fieldConfig[f].border,
                    borderWidth: 1.5,
                    borderRadius: 3,
                }))
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, maxRotation: 45 }
                    },
                    y: {
                        ticks: { callback: v => formatCurrency(v) },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    }
                }
            }
        });
    }

    /**
     * Renderiza todos los gráficos.
     * @param {Array} filteredRecords — registros filtrados (por rubro dropdown o donut)
     * @param {Array} allRecords — todos los registros (para mantener donut completo)
     */
    function renderAll(filteredRecords, allRecords) {
        renderDonut(filteredRecords, allRecords);
        renderProveedores(filteredRecords);
        renderStacked(filteredRecords);
    }

    /**
     * Destruye todos los gráficos
     */
    function destroyAll() {
        donutChart = destroyChart(donutChart);
        proveedoresChart = destroyChart(proveedoresChart);
        stackedChart = destroyChart(stackedChart);
        _selectedRubro = null;
    }

    /**
     * Obtiene el rubro seleccionado en el donut
     */
    function getSelectedRubro() {
        return _selectedRubro;
    }

    /**
     * Resetea la selección del donut
     */
    function clearDonutSelection() {
        _selectedRubro = null;
    }

    return {
        renderAll,
        destroyAll,
        formatCurrency,
        onDonutClick,
        getSelectedRubro,
        clearDonutSelection,
    };
})();
