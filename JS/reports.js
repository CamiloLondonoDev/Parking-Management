// ─── localStorage KEYS ────────────────────────────────────────────────────────

const ENTRIES_KEY = 'entry_records';
const EXITS_KEY   = 'exit_records';


// ─── UTILITIES ────────────────────────────────────────────────────────────────

function localDateISO(d) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function formatCurrency(value) {
    return '$' + Math.round(value).toLocaleString('es-CO');
}

// Returns an array of "YYYY-MM-DD" dates between from and to (inclusive)
function dateRange(from, to) {
    const dates = [];
    const cur = new Date(from + 'T00:00:00');
    const end = new Date(to + 'T00:00:00');
    while (cur <= end) {
        dates.push(localDateISO(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

// Short label to show on charts "DD/MM"
function shortLabel(dateISO) {
    const [, mm, dd] = dateISO.split('-');
    return `${dd}/${mm}`;
}


// ─── INITIALIZE FILTER DATES ──────────────────────────────────────────────────

function initializeFilters() {
    const today    = new Date();
    const sevenAgo = new Date();
    sevenAgo.setDate(today.getDate() - 6);

    document.getElementById('dateFrom').value = localDateISO(sevenAgo);
    document.getElementById('dateTo').value   = localDateISO(today);
}


// ─── GET FILTERED DATA ────────────────────────────────────────────────────────

function getFilteredData() {
    const from = document.getElementById('dateFrom').value;
    const to   = document.getElementById('dateTo').value;

    const exits   = JSON.parse(localStorage.getItem(EXITS_KEY)   || '[]');
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');

    // Filter by date range
    const filteredExits   = exits.filter(r =>
        r.exitDate >= from && r.exitDate <= to
    );
    const filteredEntries = entries.filter(r =>
        r.date >= from && r.date <= to
    );

    return { from, to, filteredExits, filteredEntries };
}


// ─── UPDATE CARDS ─────────────────────────────────────────────────────────────

function updateCards(filteredExits, filteredEntries, from, to) {
    const income   = filteredExits.reduce((a, r) => a + (r.totalCharged || 0), 0);
    const vehicles = filteredEntries.length;

    const days    = dateRange(from, to).length || 1;
    const average = Math.round(vehicles / days);

    document.getElementById('cardIncome').textContent   = formatCurrency(income);
    document.getElementById('cardVehicles').textContent = vehicles;
    document.getElementById('cardAverage').textContent  = average;

    // Comparison with previous period (same number of days before)
    const prevFrom = new Date(from + 'T00:00:00');
    prevFrom.setDate(prevFrom.getDate() - days);
    const prevTo = new Date(from + 'T00:00:00');
    prevTo.setDate(prevTo.getDate() - 1);

    const prevFromISO = localDateISO(prevFrom);
    const prevToISO   = localDateISO(prevTo);

    const prevExits   = JSON.parse(localStorage.getItem(EXITS_KEY)   || '[]')
        .filter(r => r.exitDate >= prevFromISO && r.exitDate <= prevToISO);
    const prevEntries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]')
        .filter(r => r.date >= prevFromISO && r.date <= prevToISO);

    const prevIncome   = prevExits.reduce((a, r) => a + (r.totalCharged || 0), 0);
    const prevVehicles = prevEntries.length;

    const incomeComparison  = prevIncome > 0
        ? Math.round(((income   - prevIncome)   / prevIncome)   * 100)
        : null;
    const vehicleComparison = prevVehicles > 0
        ? Math.round(((vehicles - prevVehicles) / prevVehicles) * 100)
        : null;

    const incomeSpan   = document.getElementById('cardIncomeComp');
    const vehiclesSpan = document.getElementById('cardVehiclesComp');

    incomeSpan.textContent   = incomeComparison  !== null
        ? `${incomeComparison  >= 0 ? '+' : ''}${incomeComparison}% vs previous period`  : '';
    vehiclesSpan.textContent = vehicleComparison !== null
        ? `${vehicleComparison >= 0 ? '+' : ''}${vehicleComparison}% vs previous period` : '';

    incomeSpan.style.color   = incomeComparison  >= 0 ? '#16a34a' : '#dc2626';
    vehiclesSpan.style.color = vehicleComparison >= 0 ? '#16a34a' : '#dc2626';
}


// ─── CHART INSTANCES ──────────────────────────────────────────────────────────

let incomeChartInstance   = null;
let vehiclesChartInstance = null;
let typeChartInstance     = null;
let hourChartInstance     = null;

function destroyCharts() {
    if (incomeChartInstance)   { incomeChartInstance.destroy();   incomeChartInstance   = null; }
    if (vehiclesChartInstance) { vehiclesChartInstance.destroy(); vehiclesChartInstance = null; }
    if (typeChartInstance)     { typeChartInstance.destroy();     typeChartInstance     = null; }
    if (hourChartInstance)     { hourChartInstance.destroy();     hourChartInstance     = null; }
}


// ─── CHART: DAILY INCOME ──────────────────────────────────────────────────────

function incomeChart(filteredExits, from, to) {
    const dates  = dateRange(from, to);
    const values = dates.map(f =>
        filteredExits
            .filter(r => r.exitDate === f)
            .reduce((a, r) => a + (r.totalCharged || 0), 0)
    );

    incomeChartInstance = new Chart(document.getElementById('incomeChart'), {
        type: 'bar',
        data: {
            labels:   dates.map(shortLabel),
            datasets: [{
                label:           'Income (COP)',
                data:            values,
                backgroundColor: '#3b82f6',
                borderRadius:    4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: v => '$' + v.toLocaleString('es-CO') } }
            }
        }
    });
}


// ─── CHART: VEHICLES PER DAY ─────────────────────────────────────────────────

function vehiclesChart(filteredEntries, from, to) {
    const dates  = dateRange(from, to);
    const values = dates.map(f =>
        filteredEntries.filter(r => r.date === f).length
    );

    vehiclesChartInstance = new Chart(document.getElementById('vehiclesChart'), {
        type: 'line',
        data: {
            labels:   dates.map(shortLabel),
            datasets: [{
                label:       'Vehicles',
                data:        values,
                borderColor: '#10b981',
                fill:        false,
                tension:     0.4,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}


// ─── CHART: DISTRIBUTION BY TYPE ─────────────────────────────────────────────

function typeChart(filteredEntries) {
    const types  = ['Car', 'Motorcycle', 'Pickup', 'Van'];
    const values = types.map(t =>
        filteredEntries.filter(r => r.type === t).length
    );

    typeChartInstance = new Chart(document.getElementById('typeChart'), {
        type: 'pie',
        data: {
            labels:   types,
            datasets: [{
                data:            values,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}


// ─── CHART: OCCUPANCY BY HOUR ────────────────────────────────────────────────

function hourChart(filteredEntries) {
    const hours  = Array.from({ length: 24 }, (_, i) => i);
    const values = hours.map(h =>
        filteredEntries.filter(r => {
            if (!r.time) return false;
            return parseInt(r.time.split(':')[0]) === h;
        }).length
    );

    // Show only hours with data or the 6-22 range
    const labels = hours.map(h => {
        const ampm = h >= 12 ? 'pm' : 'am';
        const h12  = h % 12 || 12;
        return `${h12}${ampm}`;
    });

    hourChartInstance = new Chart(document.getElementById('hourChart'), {
        type: 'bar',
        data: {
            labels:   labels,
            datasets: [{
                label:           'Vehicles',
                data:            values,
                backgroundColor: '#f59e0b',
                borderRadius:    4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize:  1,
                        precision: 0
                    }
                }
            }
        }
    });
}


// ─── APPLY FILTERS AND RENDER EVERYTHING ─────────────────────────────────────

function applyFilters() {
    const { from, to, filteredExits, filteredEntries } = getFilteredData();

    if (!from || !to || from > to) return;

    destroyCharts();
    updateCards(filteredExits, filteredEntries, from, to);
    incomeChart(filteredExits, from, to);
    vehiclesChart(filteredEntries, from, to);
    typeChart(filteredEntries);
    hourChart(filteredEntries);
}


// ─── EXPORT PDF ──────────────────────────────────────────────────────────────

async function exportPDF() {
    const btn = document.querySelector('.export');
    const originalText = btn.textContent;
    btn.textContent = 'Generating PDF...';
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const pdf    = new jsPDF('p', 'mm', 'a4');
        const main   = document.querySelector('.main');
        const canvas = await html2canvas(main, {
            scale:            2,
            useCORS:          true,
            backgroundColor:  '#f5f7fb',
            scrollX:          0,
            scrollY:          -window.scrollY
        });

        const imgData   = canvas.toDataURL('image/png');
        const pdfW      = pdf.internal.pageSize.getWidth();
        const pdfH      = pdf.internal.pageSize.getHeight();
        const imgW      = pdfW;
        const imgH      = (canvas.height * imgW) / canvas.width;

        // If the content is taller than one page, split into pages
        let yPos = 0;
        while (yPos < imgH) {
            if (yPos > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, -yPos, imgW, imgH);
            yPos += pdfH;
        }

        const from = document.getElementById('dateFrom').value;
        const to   = document.getElementById('dateTo').value;
        pdf.save(`autos_colombia_report_${from}_${to}.pdf`);

    } catch (err) {
        console.error('Error generating PDF:', err);
        alert('There was an error generating the PDF. Please try again.');
    } finally {
        btn.textContent = originalText;
        btn.disabled    = false;
    }
}


// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    initializeFilters();
    applyFilters();
});
