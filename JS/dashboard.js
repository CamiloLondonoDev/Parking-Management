// ─── localStorage KEYS ────────────────────────────────────────────────────────

const SPOTS_KEY         = 'spots_db';
const ENTRIES_KEY       = 'entry_records';
const RECENT_KEY        = 'recent_vehicles';
const EXITS_KEY         = 'exit_records';
const SUBSCRIPTIONS_KEY = 'payments_db';


// ─── LOCAL DATE AND TIME UTILITIES ────────────────────────────────────────────

function localDateISO(d) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function localTimeHHMM(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
}

function formatDisplay(dateISO, timeHHMM) {
    const [yy, mm, dd] = dateISO.split('-');
    const [hh, mi] = timeHHMM.split(':');
    const h    = parseInt(hh);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h % 12 || 12;
    return `${dd}/${mm}/${yy} ${h12}:${mi}${ampm}`;
}

function formatCurrency(value) {
    return '$' + value.toLocaleString('es-CO');
}


// ─── SUMMARY CARDS ────────────────────────────────────────────────────────────

function updateCards() {
    const spots   = JSON.parse(localStorage.getItem(SPOTS_KEY)   || '[]');
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    const exits   = JSON.parse(localStorage.getItem(EXITS_KEY)   || '[]');

    const occupied = spots.filter(c => c.status === 'occupied').length;
    const total    = spots.length;
    const today    = localDateISO(new Date());

    const vehiclesToday = entries.filter(r => r.date === today).length;

    const earningsToday = exits
        .filter(r => r.exitDate === today)
        .reduce((acc, r) => acc + (r.totalCharged || 0), 0);

    const spacesCard = document.querySelector('.card:nth-child(1) .big');
    if (spacesCard) spacesCard.textContent = `${occupied}/${total}`;

    const fill = document.querySelector('.fill');
    if (fill && total > 0) {
        fill.style.width = Math.round((occupied / total) * 100) + '%';
    }

    const vehiclesCard = document.querySelector('.card:nth-child(2) .big');
    if (vehiclesCard) vehiclesCard.textContent = vehiclesToday;

    const earningsCard = document.querySelector('.card:nth-child(3) .big');
    if (earningsCard) earningsCard.textContent = formatCurrency(earningsToday);
}


// ─── ALERTS (maintenance + expired/upcoming subscriptions) ────────────────────

function updateAlerts() {
    const spots         = JSON.parse(localStorage.getItem(SPOTS_KEY) || '[]');
    const subscriptions = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || '[]');
    const list          = document.getElementById('alertList');
    if (!list) return;

    const alerts = [];

    // Spots under maintenance
    spots
        .filter(c => c.status === 'maintenance')
        .forEach(c => alerts.push(`Spot ${c.number} (Zone ${c.zone}) under maintenance`));

    // Expired and soon-to-expire subscriptions (≤5 days)
    const today = new Date(localDateISO(new Date()) + 'T00:00:00');
    subscriptions.forEach(m => {
        const expires = new Date(m.expirationDate + 'T00:00:00');
        const days    = Math.round((expires - today) / (1000 * 60 * 60 * 24));
        if (days < 0) {
            alerts.push(`Subscription expired: ${m.plate} (expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago)`);
        } else if (days <= 5) {
            alerts.push(`Subscription expiring: ${m.plate} (expires in ${days} day${days !== 1 ? 's' : ''})`);
        }
    });

    if (alerts.length === 0) {
        list.innerHTML = '<li>No active alerts</li>';
        return;
    }

    list.innerHTML = alerts.map(a => `<li>${a}</li>`).join('');
}


// ─── RECENT VEHICLES TABLE ────────────────────────────────────────────────────

function modalityLabel(modality) {
    if (modality === 'hour')    return 'Hourly';
    if (modality === 'day')     return 'Daily';
    if (modality === 'monthly') return 'Monthly';
    return modality || '-';
}

function loadRecent() {
    const table = document.getElementById('vehiclesTable');
    if (!table) return;

    const now   = Date.now();
    const data  = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const valid = data.filter(r => r.expires > now);

    localStorage.setItem(RECENT_KEY, JSON.stringify(valid));
    table.innerHTML = '';

    if (valid.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align:center;color:#999;padding:20px">
            No recent vehicles (last 5 minutes)
        </td>`;
        table.appendChild(tr);
        return;
    }

    valid.forEach(r => {
        const minutesLeft = Math.ceil((r.expires - now) / 60000);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.plate}</td>
            <td>${r.space}</td>
            <td>${formatDisplay(r.date, r.time)}</td>
            <td>${r.type}</td>
            <td>
                <span class="status">${modalityLabel(r.modality)}</span>
                <span style="font-size:11px;color:#999;margin-left:6px">${minutesLeft}min</span>
            </td>
        `;
        table.appendChild(tr);
    });
}


// ─── QUICK ACTION BUTTONS ─────────────────────────────────────────────────────

function setupButtons() {
    const btnBlue   = document.querySelector('.btn.blue');
    const btnOrange = document.querySelector('.btn.orange');
    const btnGreen  = document.querySelector('.btn.green');
    const btnPurple = document.querySelector('.btn.purple');

    if (btnBlue)   btnBlue.onclick   = () => window.location.href = 'entry.html';
    if (btnOrange) btnOrange.onclick = () => window.location.href = 'registerexit.html';
    if (btnGreen)  btnGreen.onclick  = () => window.location.href = 'spaces.html';
    if (btnPurple) btnPurple.onclick = () => window.location.href = 'reports.html';
}


// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    updateCards();
    updateAlerts();
    loadRecent();
    setupButtons();

    setInterval(() => {
        loadRecent();
        updateCards();
        updateAlerts();
    }, 30000);
});
