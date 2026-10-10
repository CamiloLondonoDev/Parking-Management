// ─── localStorage KEYS ────────────────────────────────────────────────────────

const SPOTS_KEY         = 'spots_db';
const ENTRIES_KEY       = 'entry_records';
const RECENT_KEY        = 'recent_vehicles';
const SUBSCRIPTIONS_KEY = 'payments_db';

const RECENT_MINUTES = 5;


// ─── LOCAL DATE AND TIME UTILITIES ────────────────────────────────────────────
// Never use toISOString() — it converts to UTC and in Colombia (UTC-5)
// late-night hours jump to the next day.

// Returns "YYYY-MM-DD" in local time (for input type="date")
function localDateISO(d) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

// Returns "HH:MM" in local time (for input type="time")
function localTimeHHMM(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
}

// Formats date+time for display: "18/03/2026 9:32pm"
function formatDateTime(dateISO, timeHHMM) {
    // dateISO: "YYYY-MM-DD", timeHHMM: "HH:MM"
    const [yy, mm, dd] = dateISO.split('-');
    const [hh, mi] = timeHHMM.split(':');
    const h = parseInt(hh);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12  = h % 12 || 12;
    return `${dd}/${mm}/${yy} ${h12}:${mi}${ampm}`;
}


// ─── INITIALIZE SPOTS IF localStorage IS EMPTY ───────────────────────────────

function initializeSpots() {
    if (localStorage.getItem(SPOTS_KEY)) return;

    const initial = [
        { number: 'A-10', zone: 'A', type: 'Car',    status: 'available', plate: null },
        { number: 'A-11', zone: 'A', type: 'Car',    status: 'available', plate: null },
        { number: 'A-12', zone: 'A', type: 'Car',    status: 'maintenance', plate: null },
        { number: 'A-13', zone: 'A', type: 'Car',    status: 'available', plate: null },
        { number: 'A-14', zone: 'A', type: 'Car',    status: 'available', plate: null },
        { number: 'A-15', zone: 'A', type: 'Car',    status: 'available', plate: null },
        { number: 'B-01', zone: 'B', type: 'Motorcycle', status: 'available', plate: null },
        { number: 'B-02', zone: 'B', type: 'Motorcycle', status: 'available', plate: null },
        { number: 'B-03', zone: 'B', type: 'Motorcycle', status: 'available', plate: null },
        { number: 'B-04', zone: 'B', type: 'Motorcycle', status: 'available', plate: null },
        { number: 'B-05', zone: 'B', type: 'Motorcycle', status: 'available', plate: null },
        { number: 'B-06', zone: 'B', type: 'Motorcycle', status: 'available', plate: null },
        { number: 'C-01', zone: 'C', type: 'Pickup', status: 'available', plate: null },
        { number: 'C-02', zone: 'C', type: 'Pickup', status: 'available', plate: null },
        { number: 'C-03', zone: 'C', type: 'Pickup', status: 'available', plate: null },
        { number: 'C-04', zone: 'C', type: 'Pickup', status: 'available', plate: null },
        { number: 'C-05', zone: 'C', type: 'Pickup', status: 'available', plate: null },
        { number: 'C-06', zone: 'C', type: 'Pickup', status: 'available', plate: null },
    ];
    localStorage.setItem(SPOTS_KEY, JSON.stringify(initial));
}


// ─── LOAD AVAILABLE SPOTS INTO THE SELECT ────────────────────────────────────

function updateSpots() {
    const type   = document.getElementById('type').value;
    const select = document.getElementById('space');
    const spots  = JSON.parse(localStorage.getItem(SPOTS_KEY) || '[]');

    const available = spots.filter(c => {
        if (c.status !== 'available') return false;
        if (!c.type || c.type === '') return true;
        return c.type === type;
    });

    select.innerHTML = '';

    if (available.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = `No spaces available for ${type}`;
        select.appendChild(opt);
        return;
    }

    const def = document.createElement('option');
    def.value = '';
    def.textContent = 'Select a space';
    select.appendChild(def);

    available.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.number;
        opt.textContent = `${c.number} — Zone ${c.zone} (${c.type || 'Any type'})`;
        select.appendChild(opt);
    });
}


// ─── ENTRY REGISTRATION ───────────────────────────────────────────────────────

document.getElementById('entryForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const plate    = document.getElementById('plate').value.trim().toUpperCase();
    const type     = document.getElementById('type').value;
    const owner    = document.getElementById('owner').value.trim();
    const phone    = document.getElementById('phone').value.trim();
    const space    = document.getElementById('space').value;
    const modality = document.getElementById('modality').value;
    const notes    = document.getElementById('notes').value.trim();

    // Read date and time from the form (always local, never ISO)
    const now       = new Date();
    const dateInput = document.getElementById('date').value || localDateISO(now);
    const timeInput = document.getElementById('time').value || localTimeHHMM(now);

    if (!plate) { alert('Enter the vehicle plate.'); return; }
    if (!space) { alert('Select an available parking space.'); return; }

    const spots     = JSON.parse(localStorage.getItem(SPOTS_KEY) || '[]');
    const spotIndex = spots.findIndex(c => c.number === space);

    if (spotIndex === -1 || spots[spotIndex].status !== 'available') {
        alert('The selected space is no longer available. Please select another one.');
        updateSpots();
        return;
    }

    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    const alreadyActive = entries.find(r => r.plate === plate && r.status === 'active');
    if (alreadyActive) {
        alert(`Plate ${plate} already has an active entry in space ${alreadyActive.space}.`);
        return;
    }

    const record = {
        id:        Date.now(),
        plate,
        type,
        owner,
        phone,
        space,
        modality,
        date:      dateInput,   // "YYYY-MM-DD" local
        time:      timeInput,   // "HH:MM" local (24h, for calculations)
        notes,
        status:    'active'
    };

    entries.push(record);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

    spots[spotIndex].status = 'occupied';
    spots[spotIndex].plate  = plate;
    localStorage.setItem(SPOTS_KEY, JSON.stringify(spots));

    saveRecent(record);

    alert(`Vehicle ${plate} registered successfully in space ${space}.`);
    document.getElementById('modality').disabled = false;
    document.getElementById('monthlyNotice').style.display = 'none';
    document.getElementById('entryForm').reset();
    setCurrentDateTime();
    updateSpots();
});


// ─── RECENT VEHICLES FOR THE DASHBOARD ────────────────────────────────────────

function saveRecent(record) {
    const recent = getValidRecent();
    recent.unshift({
        ...record,
        expires: Date.now() + RECENT_MINUTES * 60 * 1000
    });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 20)));
}

function getValidRecent() {
    const data = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return data.filter(r => r.expires > Date.now());
}


// ─── AUTOMATIC CURRENT DATE AND TIME ─────────────────────────────────────────

function setCurrentDateTime() {
    const now       = new Date();
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');

    if (dateInput) dateInput.value = localDateISO(now);
    if (timeInput) timeInput.value = localTimeHHMM(now);
}


// ─── SUBSCRIPTION CHECK ON ENTRY ─────────────────────────────────────────────

function checkMonthlyPlate() {
    const plate  = document.getElementById('plate').value.trim().toUpperCase();
    const notice = document.getElementById('monthlyNotice');
    const selMod = document.getElementById('modality');

    if (!plate) {
        notice.style.display = 'none';
        selMod.disabled      = false;
        return;
    }

    const list  = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || '[]');
    const today = localDateISO(new Date());
    const sub   = list.find(m => m.plate === plate && m.expirationDate >= today);

    if (sub) {
        selMod.value    = 'monthly';
        selMod.disabled = true;
        notice.textContent = `✓ Plate ${plate} has an active subscription — expires on ${sub.expirationDate.split('-').reverse().join('/')}. Modality locked to "Monthly".`;
        notice.style.display = 'block';
    } else {
        selMod.disabled      = false;
        notice.style.display = 'none';
    }
}


// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    initializeSpots();
    setCurrentDateTime();
    updateSpots();

    const plateInput = document.getElementById('plate');
    plateInput.addEventListener('blur', checkMonthlyPlate);

    // Clear notice and unlock modality when the form is reset
    document.getElementById('entryForm').addEventListener('reset', function () {
        document.getElementById('monthlyNotice').style.display = 'none';
        document.getElementById('modality').disabled = false;
    });
});
