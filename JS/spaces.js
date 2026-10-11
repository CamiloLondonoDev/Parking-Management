// ─── localStorage KEY ──────────────────────────────────────────────────────────

const SPOTS_KEY = 'spots_db';

// ─── INITIAL DATA ──────────────────────────────────────────────────────────────

function loadSpots() {
    const data = localStorage.getItem(SPOTS_KEY);
    if (data) return JSON.parse(data);

    // Default spots for the first load (same set as entry.js)
    const initial = [
        { number: 'A-10', zone: 'A', type: 'Car', status: 'available', plate: null },
        { number: 'A-11', zone: 'A', type: 'Car', status: 'available', plate: null },
        { number: 'A-12', zone: 'A', type: 'Car', status: 'maintenance', plate: null },
        { number: 'A-13', zone: 'A', type: 'Car', status: 'available', plate: null },
        { number: 'A-14', zone: 'A', type: 'Car', status: 'available', plate: null },
        { number: 'A-15', zone: 'A', type: 'Car', status: 'available', plate: null },
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

    saveSpots(initial);
    return initial;
}

function saveSpots(list) {
    localStorage.setItem(SPOTS_KEY, JSON.stringify(list));
}


// ─── ACTIVE STATE ──────────────────────────────────────────────────────────────

let selectedSpot = null;
let activeZone = 'all';


// ─── RENDERING ─────────────────────────────────────────────────────────────────

function iconByStatus(status) {
    if (status === 'available')   return '✔';
    if (status === 'occupied')    return '🚗';
    if (status === 'maintenance') return '🔧';
    return '';
}

function render(list) {
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';

    list.forEach(spot => {
        const div = document.createElement('div');
        div.className = `parking-space ${spot.status}`;
        div.dataset.testid = `spot-${spot.number}`;
        div.onclick = () => openStatusModal(spot.number);

        div.innerHTML = `
            <div class="icon">${iconByStatus(spot.status)}</div>
            <div class="space-id">${spot.number}</div>
            ${spot.plate ? `<div class="plate">${spot.plate}</div>` : ''}
        `;

        grid.appendChild(div);
    });

    updateCounters();
}

function updateCounters() {
    const all = loadSpots();
    document.getElementById('total').textContent       = all.length;
    document.getElementById('available').textContent   = all.filter(c => c.status === 'available').length;
    document.getElementById('occupied').textContent    = all.filter(c => c.status === 'occupied').length;
    document.getElementById('maintenance').textContent = all.filter(c => c.status === 'maintenance').length;
}


// ─── FILTER BY ZONE ────────────────────────────────────────────────────────────

function filterZone(zone, button) {
    activeZone = zone;

    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    button.classList.add('active');

    const all = loadSpots();
    const filtered = zone === 'all'
        ? all
        : all.filter(c => c.zone === zone);

    render(filtered);
}


// ─── MODAL: CHANGE STATUS ──────────────────────────────────────────────────────

function openStatusModal(number) {
    const list = loadSpots();
    const spot = list.find(c => c.number === number);
    if (!spot) return;

    selectedSpot = number;

    document.getElementById('modalSpotId').textContent = number;
    document.getElementById('modalCurrentStatus').textContent = spot.status;
    document.getElementById('statusModal').style.display = 'flex';

    // Highlight the button of the current status
    document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('selected'));
    const currentBtn = document.querySelector(`.btn-status.${spot.status}`);
    if (currentBtn) currentBtn.classList.add('selected');
}

function applyStatus(newStatus) {
    const list  = loadSpots();
    const index = list.findIndex(c => c.number === selectedSpot);
    if (index === -1) return;

    // If it becomes available or goes to maintenance, clear the plate
    if (newStatus === 'available' || newStatus === 'maintenance') {
        list[index].plate = null;
    }

    list[index].status = newStatus;
    saveSpots(list);
    closeModal();

    // Re-render with the active filter
    const filtered = activeZone === 'all'
        ? list
        : list.filter(c => c.zone === activeZone);

    render(filtered);
}

function closeModal() {
    document.getElementById('statusModal').style.display = 'none';
    selectedSpot = null;
}


// ─── MODAL: NEW SPOT ───────────────────────────────────────────────────────────

function showSpotForm() {
    document.getElementById('newId').value = '';
    document.getElementById('newZone').value = '';
    document.getElementById('newType').value = 'Car';
    document.querySelector('input[name="initialStatus"][value="available"]').checked = true;

    // Clear previous errors
    document.getElementById('newId').classList.remove('error');
    document.getElementById('newZone').classList.remove('error');

    document.getElementById('newSpotModal').style.display = 'flex';
}

function closeSpotModal() {
    document.getElementById('newSpotModal').style.display = 'none';
}

function saveNewSpot() {
    const id     = document.getElementById('newId').value.trim().toUpperCase();
    const zone   = document.getElementById('newZone').value;
    const type   = document.getElementById('newType').value;
    const status = document.querySelector('input[name="initialStatus"]:checked').value;

    // Clear errors
    document.getElementById('newId').classList.remove('error');
    document.getElementById('newZone').classList.remove('error');

    let valid = true;
    if (!id) { document.getElementById('newId').classList.add('error'); valid = false; }
    if (!zone) { document.getElementById('newZone').classList.add('error'); valid = false; }

    if (!valid) {
        alert('Please complete the required fields.');
        return;
    }

    const list = loadSpots();

    // Check for duplicates
    if (list.find(c => c.number === id)) {
        document.getElementById('newId').classList.add('error');
        alert(`A spot with the identifier "${id}" already exists.`);
        return;
    }

    list.push({ number: id, zone, type, status, plate: null });
    saveSpots(list);
    closeSpotModal();

    // Re-render
    const filtered = activeZone === 'all'
        ? list
        : list.filter(c => c.zone === activeZone);

    render(filtered);
    alert(`Spot ${id} registered successfully.`);
}


// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    const all = loadSpots();
    render(all);
});
