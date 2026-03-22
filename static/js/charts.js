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
    let _selectedRubro = null;

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

    function formatCurrency(value) {
        if (value == null || isNaN(value)) return '$0';
        return '$' + Math.round(value).toLocaleString('es-CO');
    }

    function destroyChart(chart) {
        if (chart) chart.destroy();
        return null;
    }

    function onDonutClick(callback) {
        _onDonutClick = callback;
    }

    /**
     * 1. Donut Chart
     * Data: [{rubro: str, valor: float}]
     */
    function renderDonutDirect(data) {
        donutChart = destroyChart(donutChart);
        const ctx = document.getElementById('chart-donut').getContext('2d');

        const bgColors = data.map((d, i) => {
            if (_selectedRubro && d.rubro !== _selectedRubro) {
                return COLORS[i % COLORS.length] + '44'; // semi-transparente
            }
            return COLORS[i % COLORS.length];
        });

        const borderColors = data.map((d, i) => {
            if (_selectedRubro && d.rubro === _selectedRubro) {
                return '#ffffff';
            }
            return 'rgba(10,14,26,0.8)';
        });

        const borderWidths = data.map((d) => {
            return (_selectedRubro && d.rubro === _selectedRubro) ? 3 : 2;
        });

        donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.rubro),
                datasets: [{
                    data: data.map(d => d.valor),
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
                        const clickedRubro = data[index].rubro;

                        if (_selectedRubro === clickedRubro) {
                            _selectedRubro = null;
                        } else {
                            _selectedRubro = clickedRubro;
                        }

                        if (_onDonutClick) {
                            _onDonutClick(_selectedRubro);
                        }
                    }
                }
            }
        });

        document.getElementById('chart-donut').style.cursor = 'pointer';
    }

    /**
     * 2. Horizontal Bar — Top 10 Proveedores
     * Data: [{proveedor: str, valor: float}]
     */
    function renderProveedoresDirect(data) {
        proveedoresChart = destroyChart(proveedoresChart);
        const ctx = document.getElementById('chart-proveedores').getContext('2d');

        proveedoresChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.proveedor.length > 25 ? d.proveedor.substring(0, 25) + '…' : d.proveedor),
                datasets: [{
                    label: 'Valor Total',
                    data: data.map(d => d.valor),
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
     * 3. Stacked Bar — Top 10 PRESUPUESTO
     * Data: [{presupuesto: str, costo_mes: float, valor: float}]
     */
    function renderStackedDirect(data) {
        stackedChart = destroyChart(stackedChart);
        const ctx = document.getElementById('chart-stacked').getContext('2d');

        stackedChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.presupuesto.length > 20 ? d.presupuesto.substring(0, 20) + '…' : d.presupuesto),
                datasets: [
                    {
                        label: 'Costo Mes',
                        data: data.map(d => d.costo_mes),
                        backgroundColor: '#22d3ee33',
                        borderColor: '#22d3ee',
                        borderWidth: 1.5,
                        borderRadius: 3,
                    },
                    {
                        label: 'Valor',
                        data: data.map(d => d.valor),
                        backgroundColor: '#818cf833',
                        borderColor: '#818cf8',
                        borderWidth: 1.5,
                        borderRadius: 3,
                    }
                ]
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

    function destroyAll() {
        donutChart = destroyChart(donutChart);
        proveedoresChart = destroyChart(proveedoresChart);
        stackedChart = destroyChart(stackedChart);
        _selectedRubro = null;
    }

    function getSelectedRubro() {
        return _selectedRubro;
    }

    function clearDonutSelection() {
        _selectedRubro = null;
    }

    return {
        renderDonutDirect,
        renderProveedoresDirect,
        renderStackedDirect,
        destroyAll,
        formatCurrency,
        onDonutClick,
        getSelectedRubro,
        clearDonutSelection,
    };
})();
