// ─── localStorage KEYS ────────────────────────────────────────────────────────

const EXITS_KEY            = 'exit_records';
const SUBSCRIPTIONS_KEY    = 'payments_db';          // exclusive to subscriptions


// ─── UTILITIES ────────────────────────────────────────────────────────────────

function localTimeHHMM(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
}

function localDateISO(d) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function formatCurrency(v) {
    return '$' + Math.round(v).toLocaleString('es-CO');
}

function formatDisplay(dateISO, timeHHMM) {
    if (!dateISO) return '-';
    const [yy, mm, dd] = dateISO.split('-');
    if (!timeHHMM) return `${dd}/${mm}/${yy}`;
    const [hh, mi] = timeHHMM.split(':');
    const h    = parseInt(hh);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h % 12 || 12;
    return `${dd}/${mm}/${yy} ${h12}:${mi}${ampm}`;
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

// Adds days to an ISO date and returns a new ISO date
function addDays(dateISO, days) {
    const d = new Date(dateISO + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return localDateISO(d);
}

// Difference in days between today and an ISO date (positive = future, negative = past)
function daysUntilExpiration(dateISO) {
    const today   = new Date(localDateISO(new Date()) + 'T00:00:00');
    const expires = new Date(dateISO + 'T00:00:00');
    return Math.round((expires - today) / (1000 * 60 * 60 * 24));
}

function subscriptionStatus(expirationDate) {
    const days = daysUntilExpiration(expirationDate);
    if (days < 0)  return 'expired';
    if (days <= 5) return 'upcoming';
    return 'active';
}

// Monthly rate by type
function monthlyRate(type) {
    const rates = { 'Car': 80000, 'Pickup': 80000, 'Motorcycle': 70000, 'Van': 100000 };
    return rates[type] || 80000;
}


// ─── TAB NAVIGATION ──────────────────────────────────────────────────────────

function switchTab(tab) {
    document.getElementById('historyView').style.display       = tab === 'history'       ? 'block' : 'none';
    document.getElementById('subscriptionsView').style.display = tab === 'subscriptions' ? 'block' : 'none';

    document.getElementById('tabHistory').classList.toggle('active',       tab === 'history');
    document.getElementById('tabSubscriptions').classList.toggle('active', tab === 'subscriptions');

    if (tab === 'history')       loadHistory();
    if (tab === 'subscriptions') loadSubscriptions();
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — PAYMENT HISTORY
// Reads directly from exit_records
// ═══════════════════════════════════════════════════════════════════════════════

function initializeHistoryFilters() {
    const today    = new Date();
    const sevenAgo = new Date();
    sevenAgo.setDate(today.getDate() - 6);
    document.getElementById('hFrom').value = localDateISO(sevenAgo);
    document.getElementById('hTo').value   = localDateISO(today);
}

function applyHistoryFilters() {
    loadHistory();
}

function loadHistory() {
    const from   = document.getElementById('hFrom').value;
    const to     = document.getElementById('hTo').value;
    const type   = document.getElementById('hType').value;
    const method = document.getElementById('hMethod').value;

    const exits = JSON.parse(localStorage.getItem(EXITS_KEY) || '[]');

    let filtered = exits.filter(r => {
        const date    = r.exitDate || r.date || '';
        const inRange = (!from || date >= from) && (!to || date <= to);
        const typeOk   = !type   || (type === 'monthly' ? r.isMonthly : !r.isMonthly);
        const methodOk = !method || r.paymentMethod === method;
        return inRange && typeOk && methodOk;
    });

    // Sort from newest to oldest
    filtered.sort((a, b) => b.id - a.id);

    // Stats
    const totalCollected = filtered.reduce((s, r) => s + (r.totalCharged || 0), 0);
    const count          = filtered.length;
    const average        = count > 0 ? Math.round(totalCollected / count) : 0;

    document.getElementById('statTotal').textContent   = formatCurrency(totalCollected);
    document.getElementById('statCount').textContent   = count;
    document.getElementById('statAverage').textContent = formatCurrency(average);

    // Table
    const tbody     = document.getElementById('historyTable');
    const noPayments = document.getElementById('noPayments');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        noPayments.style.display = 'block';
        return;
    }
    noPayments.style.display = 'none';

    filtered.forEach(r => {
        const receiptNum = `#EXIT-${String(r.id).slice(-6)}`;
        const typeBadge = r.isMonthly
            ? `<span class="badge badge-sub">Subscription</span>`
            : `<span class="badge badge-time">By time</span>`;
        const methodMap = {
            'Cash':      '<span class="badge badge-cash">Cash</span>',
            'Transfer':  '<span class="badge badge-transfer">Transfer</span>',
            'Card':      '<span class="badge badge-card">Card</span>',
            'No charge': '<span class="badge badge-sub">No charge</span>',
        };
        const methodBadge = methodMap[r.paymentMethod] || `<span class="badge">${r.paymentMethod || '-'}</span>`;

        const tr = document.createElement('tr');
        tr.dataset.testid = `payment-row-${r.id}`;
        tr.innerHTML = `
            <td class="text-muted">${receiptNum}</td>
            <td><span class="plate-tag">${r.plate}</span></td>
            <td>${formatDisplay(r.exitDate || r.date, null)}</td>
            <td>${typeBadge}</td>
            <td>${methodBadge}</td>
            <td class="text-success font-bold">${r.totalCharged > 0 ? formatCurrency(r.totalCharged) : '$0'}</td>
            <td>
                <button class="btn-view" data-testid="payment-view-btn-${r.id}" onclick="viewReceipt(${r.id})">View receipt</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewReceipt(id) {
    const exits = JSON.parse(localStorage.getItem(EXITS_KEY) || '[]');
    const r = exits.find(s => s.id === id);
    if (!r) return;
    showReceipt(r);
}


// ─── RECEIPT MODAL (shared with registerexit) ─────────────────────────────────

function showReceipt(r) {
    const receiptNum = `#EXIT-${String(r.id).slice(-6)}`;
    document.getElementById('receiptNumber').textContent = `RECEIPT  ${receiptNum}`;
    document.getElementById('recPlate').textContent      = r.plate;
    document.getElementById('recTypeSpace').textContent  = `${r.type}   ·   Space ${r.space}`;

    const rows = [
        ['Entry date',     formatDisplay(r.entryDate, r.entryTime)],
        ['Exit date',      formatDisplay(r.exitDate,  r.exitTime)],
        ['Total time',     r.durationMin !== undefined ? formatDuration(r.durationMin) : '-'],
        ['Charge detail',  r.chargeDetail  || '-'],
        ['Payment method', r.paymentMethod || '-'],
    ];

    document.getElementById('receiptRows').innerHTML = rows.map(([lbl, val]) => `
        <div class="receipt-row">
            <span class="rec-label">${lbl}</span>
            <span class="rec-val">${val}</span>
        </div>
    `).join('');

    if (r.isMonthly && !r.isSubscriptionPayment) {
        document.getElementById('receiptTotal').innerHTML =
            `<div class="total-monthly">Customer with active subscription — No additional charge</div>`;
    } else {
        document.getElementById('receiptTotal').innerHTML =
            `<div class="total-row"><span>Total charged</span><span>${formatCurrency(r.totalCharged || 0)}</span></div>`;
    }

    document.getElementById('receiptModal').style.display = 'flex';
}

function closeReceipt() {
    document.getElementById('receiptModal').style.display = 'none';
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — SUBSCRIPTIONS
// Reads / writes payments_db
// ═══════════════════════════════════════════════════════════════════════════════

function loadSubscriptionsDB() {
    return JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || '[]');
}

function saveSubscriptionsDB(list) {
    localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(list));
}

function loadSubscriptions() {
    const list = loadSubscriptionsDB();
    renderSubscriptions(list);
}

function filterSubscriptions() {
    const text = document.getElementById('subSearch').value.toLowerCase().trim();
    const list = loadSubscriptionsDB();
    const filtered = text
        ? list.filter(m =>
            m.plate.toLowerCase().includes(text) ||
            (m.owner || '').toLowerCase().includes(text))
        : list;
    renderSubscriptions(filtered);
}

function renderSubscriptions(list) {
    const tbody     = document.getElementById('subscriptionsTable');
    const noSubs    = document.getElementById('noSubscriptions');
    const alertEl   = document.getElementById('expiredAlert');
    tbody.innerHTML = '';

    // Compute stats
    let active = 0, upcoming = 0, expired = 0;
    list.forEach(m => {
        const st = subscriptionStatus(m.expirationDate);
        if (st === 'active')   active++;
        if (st === 'upcoming') upcoming++;
        if (st === 'expired')  expired++;
    });

    document.getElementById('sStatActive').textContent   = active;
    document.getElementById('sStatUpcoming').textContent = upcoming;
    document.getElementById('sStatExpired').textContent  = expired;

    // Expired alert
    if (expired > 0) {
        alertEl.style.display = 'flex';
        alertEl.textContent = `⚠  ${expired} expired subscription${expired > 1 ? 's' : ''} — Require attention to avoid access being blocked.`;
    } else {
        alertEl.style.display = 'none';
    }

    if (list.length === 0) {
        noSubs.style.display = 'block';
        return;
    }
    noSubs.style.display = 'none';

    // Sort: expired first, then upcoming, then active
    const priority = { expired: 0, upcoming: 1, active: 2 };
    const sorted = [...list].sort((a, b) =>
        priority[subscriptionStatus(a.expirationDate)] -
        priority[subscriptionStatus(b.expirationDate)]
    );

    sorted.forEach(m => {
        const status = subscriptionStatus(m.expirationDate);
        const days   = daysUntilExpiration(m.expirationDate);

        const badgeMap = {
            active:   `<span class="badge badge-active">Active</span>`,
            upcoming: `<span class="badge badge-upcoming">Expires in ${days} day${days !== 1 ? 's' : ''}</span>`,
            expired:  `<span class="badge badge-expired">Expired</span>`,
        };

        const rowBg = status === 'expired' ? 'row-expired' : status === 'upcoming' ? 'row-upcoming' : '';

        const tr = document.createElement('tr');
        tr.className = rowBg;
        tr.dataset.testid = `subscription-row-${m.id}`;
        tr.innerHTML = `
            <td><span class="plate-tag">${m.plate}</span></td>
            <td>${m.owner || '-'}</td>
            <td>${m.type}</td>
            <td>${formatDisplay(m.expirationDate, null)}</td>
            <td>${badgeMap[status]}</td>
            <td>
                <button class="btn-view"   data-testid="subscription-view-btn-${m.id}"   onclick="viewSubscriptionDetails('${m.id}')">View</button>
                <button class="btn-edit"   data-testid="subscription-edit-btn-${m.id}"   onclick="editSubscription('${m.id}')">Edit</button>
                <button class="btn-renew"  data-testid="subscription-renew-btn-${m.id}"  onclick="renewSubscription('${m.id}')">Renew</button>
                <button class="btn-delete" data-testid="subscription-delete-btn-${m.id}" onclick="deleteSubscription('${m.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


// ─── NEW / EDIT / RENEW SUBSCRIPTION MODAL ───────────────────────────────────

let editSubId = null;
let modalMode = 'new'; // 'new' | 'renew' | 'edit'

function openNewSubscriptionModal() {
    editSubId = null;
    modalMode = 'new';
    document.getElementById('subModalTitle').textContent = 'New Subscription';
    document.getElementById('subPlate').value    = '';
    document.getElementById('subOwner').value    = '';
    document.getElementById('subType').value     = 'Car';
    document.getElementById('subMethod').value   = 'Cash';
    document.getElementById('subPlate').disabled = false;
    document.getElementById('subscriptionModal').style.display = 'flex';
}

function closeSubscriptionModal() {
    document.getElementById('subscriptionModal').style.display = 'none';
    editSubId = null;
    modalMode = 'new';
}

function recordPaymentInHistory(plate, type, method, isRenewal) {
    const now    = new Date();
    const today  = localDateISO(now);
    const time   = localTimeHHMM(now);
    const amount = monthlyRate(type);
    const exits  = JSON.parse(localStorage.getItem(EXITS_KEY) || '[]');
    exits.push({
        id:                    Date.now(),
        plate,
        type,
        space:                 'N/A',
        modality:              'monthly',
        entryDate:             today,
        entryTime:             time,
        exitDate:              today,
        exitTime:              time,
        durationMin:           0,
        chargeDetail:          isRenewal ? 'Subscription renewal — 30 days' : 'Subscription payment — 30 days',
        totalCharged:          amount,
        paymentMethod:         method,
        isMonthly:             true,
        isSubscriptionPayment: true
    });
    localStorage.setItem(EXITS_KEY, JSON.stringify(exits));
}

function saveSubscription() {
    const plate  = document.getElementById('subPlate').value.trim().toUpperCase();
    const owner  = document.getElementById('subOwner').value.trim();
    const type   = document.getElementById('subType').value;
    const method = document.getElementById('subMethod').value;

    if (!plate || !owner) {
        alert('Please complete the required fields.');
        return;
    }

    const list = loadSubscriptionsDB();

    if (modalMode === 'edit') {
        // Only updates data — no date changes and no payment recorded
        const index = list.findIndex(m => m.id === editSubId);
        if (index !== -1) {
            list[index].owner         = owner;
            list[index].type          = type;
            list[index].paymentMethod = method;
            list[index].amount        = monthlyRate(type);
            saveSubscriptionsDB(list);
            alert(`Subscription details for ${plate} updated.`);
        }

    } else if (modalMode === 'renew') {
        // Extends 30 days and records the payment in the history
        const index = list.findIndex(m => m.id === editSubId);
        if (index !== -1) {
            const today       = localDateISO(new Date());
            const renewalBase = list[index].expirationDate > today
                ? list[index].expirationDate
                : today;
            list[index].expirationDate = addDays(renewalBase, 30);
            list[index].paymentMethod  = method;
            list[index].owner          = owner;
            list[index].type           = type;
            list[index].amount         = monthlyRate(type);
            saveSubscriptionsDB(list);
            recordPaymentInHistory(plate, type, method, true);
            alert(`Subscription for ${plate} renewed until ${formatDisplay(list[index].expirationDate, null)}.`);
        }

    } else {
        // New subscription
        const duplicate = list.find(m => m.plate === plate && subscriptionStatus(m.expirationDate) !== 'expired');
        if (duplicate) {
            alert(`An active or upcoming subscription already exists for plate ${plate}.`);
            return;
        }
        const today = localDateISO(new Date());
        const created = {
            id:             String(Date.now()),
            plate,
            owner,
            type,
            paymentMethod:  method,
            startDate:      today,
            expirationDate: addDays(today, 30),
            amount:         monthlyRate(type)
        };
        list.push(created);
        saveSubscriptionsDB(list);
        recordPaymentInHistory(plate, type, method, false);
        alert(`Subscription registered for ${plate}. Expires on ${formatDisplay(created.expirationDate, null)}.`);
    }

    closeSubscriptionModal();
    loadSubscriptions();
}

function editSubscription(id) {
    const list = loadSubscriptionsDB();
    const m = list.find(x => x.id === id);
    if (!m) return;

    editSubId = id;
    modalMode = 'edit';
    document.getElementById('subModalTitle').textContent = 'Edit Subscription';
    document.getElementById('subPlate').value    = m.plate;
    document.getElementById('subOwner').value    = m.owner || '';
    document.getElementById('subType').value     = m.type;
    document.getElementById('subMethod').value   = m.paymentMethod || 'Cash';
    document.getElementById('subPlate').disabled = true;
    document.getElementById('subscriptionModal').style.display = 'flex';
}

function deleteSubscription(id) {
    const list = loadSubscriptionsDB();
    const m = list.find(x => x.id === id);
    if (!m) return;
    if (!confirm(`Delete the subscription for plate ${m.plate}? This action cannot be undone.`)) return;
    const remaining = list.filter(x => x.id !== id);
    saveSubscriptionsDB(remaining);
    loadSubscriptions();
}

function renewSubscription(id) {
    const list = loadSubscriptionsDB();
    const m = list.find(x => x.id === id);
    if (!m) return;

    editSubId = id;
    modalMode = 'renew';
    document.getElementById('subModalTitle').textContent = 'Renew Subscription';
    document.getElementById('subPlate').value    = m.plate;
    document.getElementById('subOwner').value    = m.owner || '';
    document.getElementById('subType').value     = m.type;
    document.getElementById('subMethod').value   = m.paymentMethod || 'Cash';
    document.getElementById('subPlate').disabled = true;
    document.getElementById('subscriptionModal').style.display = 'flex';
}

function viewSubscriptionDetails(id) {
    const list = loadSubscriptionsDB();
    const m = list.find(x => x.id === id);
    if (!m) return;

    const status = subscriptionStatus(m.expirationDate);
    const labels = { active: 'Active', upcoming: 'Expiring soon', expired: 'Expired' };

    alert(
        `Subscription — ${m.plate}\n` +
        `Owner: ${m.owner || '-'}\n` +
        `Type: ${m.type}\n` +
        `Start: ${formatDisplay(m.startDate, null)}\n` +
        `Expiration: ${formatDisplay(m.expirationDate, null)}\n` +
        `Status: ${labels[status]}\n` +
        `Amount: ${formatCurrency(m.amount)}\n` +
        `Last payment method: ${m.paymentMethod || '-'}`
    );
}


// ─── DASHBOARD ALERTS (exported for external use) ─────────────────────────────
// dashboard.js can call getSubscriptionAlerts() to show alerts

function getSubscriptionAlerts() {
    const list = loadSubscriptionsDB();
    const alerts = [];
    list.forEach(m => {
        const status = subscriptionStatus(m.expirationDate);
        if (status === 'expired') {
            alerts.push(`Subscription expired: ${m.plate} (expired ${formatDisplay(m.expirationDate, null)})`);
        } else if (status === 'upcoming') {
            const days = daysUntilExpiration(m.expirationDate);
            alerts.push(`Subscription expiring: ${m.plate} (expires in ${days} day${days !== 1 ? 's' : ''})`);
        }
    });
    return alerts;
}


// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    initializeHistoryFilters();
    loadHistory();
});
