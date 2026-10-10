// ─── localStorage KEYS ────────────────────────────────────────────────────────

const SPOTS_KEY         = 'spots_db';
const ENTRIES_KEY       = 'entry_records';
const EXITS_KEY         = 'exit_records';
const SUBSCRIPTIONS_KEY = 'payments_db';


// ─── RATES ────────────────────────────────────────────────────────────────────

const RATES = {
    'Car':        { hour: 3000,  day: 25000 },
    'Pickup':     { hour: 3000,  day: 25000 },
    'Motorcycle': { hour: 2000,  day: 15000 },
    'Van':        { hour: 4000,  day: 30000 },
};

function getRate(type) {
    return RATES[type] || { hour: 3000, day: 25000 };
}


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

// Displays "18/03/2026 9:32pm"
function formatDisplay(dateISO, timeHHMM) {
    const [yy, mm, dd] = dateISO.split('-');
    const [hh, mi]     = timeHHMM.split(':');
    const h    = parseInt(hh);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h % 12 || 12;
    return `${dd}/${mm}/${yy} ${h12}:${mi}${ampm}`;
}

function formatCurrency(value) {
    return '$' + value.toLocaleString('es-CO');
}

function formatDuration(minutes) {
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = minutes % 60;
    let r = '';
    if (d > 0) r += `${d}d `;
    if (h > 0) r += `${h}h `;
    r += `${m}min`;
    return r.trim();
}


// ─── ACTIVE SUBSCRIPTION VALIDATION ───────────────────────────────────────────

function hasActiveSubscription(plate) {
    const list  = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || '[]');
    const today = localDateISO(new Date());
    return list.some(m => m.plate === plate.toUpperCase() && m.expirationDate >= today);
}


// ─── CHARGE CALCULATION ───────────────────────────────────────────────────────

function calculateCharge(record) {
    const rate     = getRate(record.type);
    const modality = record.modality;

    const entryDateTime = new Date(`${record.date}T${record.time}:00`);
    const exitDateTime  = new Date();

    const diffMs      = exitDateTime - entryDateTime;
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const diffHours   = diffMinutes / 60;

    const fullDays       = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    const chargedHours   = remainingHours > 0 ? Math.ceil(remainingHours) : 0;

    let total     = 0;
    let detail    = '';
    let isMonthly = false;

    if (modality === 'monthly' && hasActiveSubscription(record.plate)) {
        isMonthly = true;
        total     = 0;
        detail    = 'Customer with active subscription.';

    } else if (fullDays >= 1) {
        const daysCost  = fullDays * rate.day;
        const hoursCost = chargedHours * rate.hour;
        total = daysCost + hoursCost;
        const daysPart  = `${fullDays} day${fullDays > 1 ? 's' : ''}`;
        const hoursPart = chargedHours > 0
            ? ` + ${chargedHours} hour${chargedHours > 1 ? 's' : ''}`
            : '';
        detail = daysPart + hoursPart;

    } else {
        const hoursToCharge = Math.ceil(diffHours) || 1;
        total  = hoursToCharge * rate.hour;
        detail = `${hoursToCharge} hour${hoursToCharge > 1 ? 's' : ''}`;
    }

    return { total, detail, isMonthly, diffMinutes, entryDateTime, exitDateTime };
}


// ─── SELECTED PAYMENT METHOD ──────────────────────────────────────────────────

let activePaymentMethod = 'Cash';

function selectMethod(btn) {
    document.querySelectorAll('.btn-method').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePaymentMethod = btn.dataset.method;
}


// ─── SEARCH VEHICLE ───────────────────────────────────────────────────────────

function searchVehicle() {
    const plate = document.getElementById('plate').value.trim().toUpperCase();
    if (!plate) { alert('Enter a plate to search.'); return; }

    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    const record  = entries.find(r => r.plate === plate && r.status === 'active');

    document.getElementById('placeholder').style.display = 'none';

    if (!record) {
        document.getElementById('info').style.display     = 'none';
        document.getElementById('notFound').style.display = 'block';
        document.getElementById('notFoundMsg').textContent =
            `No active vehicle found with plate ${plate}.`;
        return;
    }

    document.getElementById('notFound').style.display = 'none';

    const charge = calculateCharge(record);
    const nowD   = charge.exitDateTime;

    document.getElementById('vPlate').textContent = record.plate;
    document.getElementById('vType').textContent  = record.type;
    document.getElementById('vSpace').textContent = record.space;
    const modalityText = record.modality === 'hour' ? 'Hourly' :
                         record.modality === 'day'  ? 'Daily'  : 'Monthly';
    const vModalityEl = document.getElementById('vModality');
    if (record.modality === 'monthly' && !hasActiveSubscription(record.plate)) {
        vModalityEl.innerHTML = `Monthly <span style="color:#dc2626;font-size:11px;font-weight:bold">(EXPIRED — charged by time)</span>`;
    } else {
        vModalityEl.textContent = modalityText;
    }

    document.getElementById('vEntry').textContent =
        formatDisplay(record.date, record.time);

    document.getElementById('vExit').textContent =
        formatDisplay(localDateISO(nowD), localTimeHHMM(nowD));

    document.getElementById('vDuration').textContent = formatDuration(charge.diffMinutes);
    document.getElementById('vDetail').textContent   = charge.detail;

    const chargeSection  = document.getElementById('chargeSection');
    const monthlySection = document.getElementById('monthlySection');

    if (charge.isMonthly) {
        chargeSection.style.display  = 'none';
        monthlySection.style.display = 'block';
    } else {
        monthlySection.style.display = 'none';
        chargeSection.style.display  = 'block';
        document.getElementById('vPayment').textContent = formatCurrency(charge.total);
    }

    // Reset payment method when showing a new vehicle
    activePaymentMethod = 'Cash';
    document.querySelectorAll('.btn-method').forEach(b => b.classList.remove('active'));
    const cashBtn = document.querySelector('.btn-method[data-method="Cash"]');
    if (cashBtn) cashBtn.classList.add('active');

    document.getElementById('info').style.display       = 'block';
    document.getElementById('info').dataset.activePlate = plate;
}


// ─── REGISTER EXIT ────────────────────────────────────────────────────────────

function registerExit() {
    const plate = document.getElementById('info').dataset.activePlate;
    if (!plate) return;

    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    const index   = entries.findIndex(r => r.plate === plate && r.status === 'active');
    if (index === -1) return;

    const record = entries[index];
    const charge = calculateCharge(record);
    const now    = new Date();

    // If it is not monthly and no method was selected, warn
    if (!charge.isMonthly && !activePaymentMethod) {
        alert('Please select a payment method.');
        return;
    }

    const method = charge.isMonthly ? 'No charge' : activePaymentMethod;

    // ── 1. Mark entry as inactive ────────────────────────────────────────────
    entries[index].status       = 'inactive';
    entries[index].exitDate     = localDateISO(now);
    entries[index].exitTime     = localTimeHHMM(now);
    entries[index].totalCharged = charge.total;
    entries[index].paymentMethod = method;
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

    // ── 2. Save in exit_records (source of the Payments module) ──────────────
    const exits = JSON.parse(localStorage.getItem(EXITS_KEY) || '[]');
    const newExit = {
        id:            Date.now(),
        plate:         record.plate,
        type:          record.type,
        space:         record.space,
        modality:      record.modality,
        entryDate:     record.date,
        entryTime:     record.time,
        exitDate:      localDateISO(now),
        exitTime:      localTimeHHMM(now),
        durationMin:   charge.diffMinutes,
        chargeDetail:  charge.detail,
        totalCharged:  charge.total,
        paymentMethod: method,
        isMonthly:     charge.isMonthly
    };
    exits.push(newExit);
    localStorage.setItem(EXITS_KEY, JSON.stringify(exits));

    // ── 3. Free the spot ─────────────────────────────────────────────────────
    const spots = JSON.parse(localStorage.getItem(SPOTS_KEY) || '[]');
    const si    = spots.findIndex(c => c.number === record.space);
    if (si !== -1) {
        spots[si].status = 'available';
        spots[si].plate  = null;
        localStorage.setItem(SPOTS_KEY, JSON.stringify(spots));
    }

    // ── 4. Show receipt ──────────────────────────────────────────────────────
    showReceipt(newExit, record);

    // ── 5. Clear form ────────────────────────────────────────────────────────
    document.getElementById('info').style.display        = 'none';
    document.getElementById('placeholder').style.display = 'block';
    document.getElementById('plate').value               = '';
    document.getElementById('info').dataset.activePlate  = '';
}


// ─── RECEIPT MODAL ────────────────────────────────────────────────────────────

function showReceipt(exit, originalEntry) {
    const receiptNum = `#EXIT-${String(exit.id).slice(-6)}`;
    document.getElementById('receiptNumber').textContent = `RECEIPT  ${receiptNum}`;
    document.getElementById('recPlate').textContent      = exit.plate;
    document.getElementById('recTypeSpace').textContent  =
        `${exit.type}   ·   Space ${exit.space}`;

    const rows = [
        ['Entry date',     formatDisplay(exit.entryDate, exit.entryTime)],
        ['Exit date',      formatDisplay(exit.exitDate,  exit.exitTime)],
        ['Total time',     formatDuration(exit.durationMin)],
        ['Charge detail',  exit.chargeDetail],
        ['Payment method', exit.paymentMethod],
    ];

    document.getElementById('receiptRows').innerHTML = rows.map(([lbl, val]) => `
        <div class="receipt-row">
            <span class="rec-label">${lbl}</span>
            <span class="rec-val">${val}</span>
        </div>
    `).join('');

    if (exit.isMonthly) {
        document.getElementById('receiptTotal').innerHTML =
            `<div class="total-monthly">Customer with active subscription — No additional charge</div>`;
    } else {
        document.getElementById('receiptTotal').innerHTML =
            `<div class="total-row"><span>Total charged</span><span>${formatCurrency(exit.totalCharged)}</span></div>`;
    }

    document.getElementById('receiptModal').style.display = 'flex';
}

function closeReceipt() {
    document.getElementById('receiptModal').style.display = 'none';
}

function printReceipt() {
    window.print();
}


// ─── ENTER KEY IN SEARCH BOX ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('plate').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') searchVehicle();
    });
});
