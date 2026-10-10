// ─── INITIAL DATA ──────────────────────────────────────────────────────────────

const USERS_KEY = 'users_db';

// Loads users from localStorage or initializes with sample data
function loadUsers() {
    const data = localStorage.getItem(USERS_KEY);
    if (data) return JSON.parse(data);

    // Sample data for the first load
    const initial = [
        {
            id: 1,
            name: 'Carlos Administrator',
            document: '1000000001',
            email: 'admin@autoscolombia.com',
            phone: '300 000 0001',
            role: 'Administrator',
            password: '12345',
            status: 'active'
        },
        {
            id: 2,
            name: 'María Operator',
            document: '1000000002',
            email: 'operator@autoscolombia.com',
            phone: '300 000 0002',
            role: 'Operator',
            password: 'op123',
            status: 'active'
        }
    ];
    saveUsers(initial);
    return initial;
}

function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

function generateId() {
    const list = loadUsers();
    if (list.length === 0) return 1;
    return Math.max(...list.map(u => u.id)) + 1;
}


// ─── VIEW STATE ────────────────────────────────────────────────────────────────

let editMode = false;
let editId = null;
let modalAction = null;
let modalActionId = null;


// ─── TABLE RENDERING ───────────────────────────────────────────────────────────

function renderTable(list) {
    const tbody = document.getElementById('usersTable');
    const noResults = document.getElementById('noResults');
    tbody.innerHTML = '';

    if (list.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    list.forEach(u => {
        const tr = document.createElement('tr');

        const roleBadge = u.role === 'Administrator'
            ? `<span class="badge-admin">${u.role}</span>`
            : `<span class="badge-operator">${u.role}</span>`;

        const statusBadge = u.status === 'active'
            ? `<span class="badge-active">Active</span>`
            : `<span class="badge-inactive">Inactive</span>`;

        const toggleButton = u.status === 'active'
            ? `<button class="btn-toggle-off" onclick="openDeactivateModal(${u.id})">Deactivate</button>`
            : `<button class="btn-toggle-on" onclick="openReactivateModal(${u.id})">Reactivate</button>`;

        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.document}</td>
            <td>${roleBadge}</td>
            <td>${u.email}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-edit" onclick="editUser(${u.id})">Edit</button>
                ${toggleButton}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function loadTable() {
    renderTable(loadUsers());
}


// ─── SEARCH ───────────────────────────────────────────────────────────────────

function filterUsers() {
    const text = document.getElementById('search').value.toLowerCase().trim();
    const list = loadUsers();

    if (text === '') {
        renderTable(list);
        return;
    }

    const filtered = list.filter(u =>
        u.name.toLowerCase().includes(text) ||
        u.document.toLowerCase().includes(text)
    );

    renderTable(filtered);
}


// ─── NAVIGATION BETWEEN VIEWS ──────────────────────────────────────────────────

function showForm(mode = 'new') {
    document.getElementById('listView').style.display = 'none';
    document.getElementById('formView').style.display = 'block';

    if (mode === 'new') {
        document.getElementById('formTitle').textContent = 'Register User';
        document.getElementById('formSubtitle').textContent = 'Fill in the details of the new system user';
        document.getElementById('passwordField').style.display = 'flex';
        document.getElementById('confirmField').style.display = 'flex';
        clearForm();
        editMode = false;
        editId = null;
    }
}

function showList() {
    document.getElementById('formView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';
    clearForm();
    loadTable();
}


// ─── SAVE USER (create or edit) ────────────────────────────────────────────────

function saveUser() {
    const name = document.getElementById('name').value.trim();
    const document_ = document.getElementById('document').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value.trim();
    const confirm = document.getElementById('confirm').value.trim();

    // Clear previous errors
    clearErrors();

    // Validations
    let valid = true;

    if (!name) { markError('name'); valid = false; }
    if (!document_) { markError('document'); valid = false; }
    if (!email || !email.includes('@')) { markError('email'); valid = false; }
    if (!role) { markError('role'); valid = false; }

    if (!editMode) {
        if (!password || password.length < 6) { markError('password'); valid = false; }
        if (password !== confirm) { markError('confirm'); valid = false; }
    }

    if (!valid) {
        alert('Please correctly complete the fields marked in red.');
        return;
    }

    const list = loadUsers();

    // Check for duplicate email
    const duplicate = list.find(u =>
        u.email === email && u.id !== editId
    );
    if (duplicate) {
        markError('email');
        alert('The email address is already registered in the system.');
        return;
    }

    if (editMode) {
        // Update existing user
        const index = list.findIndex(u => u.id === editId);
        if (index !== -1) {
            list[index].name = name;
            list[index].document = document_;
            list[index].email = email;
            list[index].phone = phone;
            list[index].role = role;
        }
        saveUsers(list);
        alert('User updated successfully.');
    } else {
        // Create new user
        const newUser = {
            id: generateId(),
            name,
            document: document_,
            email,
            phone,
            role,
            password,
            status: 'active'
        };
        list.push(newUser);
        saveUsers(list);
        alert('User registered successfully.');
    }

    showList();
}


// ─── EDIT USER ─────────────────────────────────────────────────────────────────

function editUser(id) {
    const list = loadUsers();
    const user = list.find(u => u.id === id);
    if (!user) return;

    editMode = true;
    editId = id;

    document.getElementById('formTitle').textContent = 'Edit User';
    document.getElementById('formSubtitle').textContent = 'Modify the details of the selected user';
    document.getElementById('passwordField').style.display = 'none';
    document.getElementById('confirmField').style.display = 'none';

    document.getElementById('name').value = user.name;
    document.getElementById('document').value = user.document;
    document.getElementById('email').value = user.email;
    document.getElementById('phone').value = user.phone;
    document.getElementById('role').value = user.role;

    document.getElementById('listView').style.display = 'none';
    document.getElementById('formView').style.display = 'block';
}


// ─── DEACTIVATE / REACTIVATE MODAL ────────────────────────────────────────────

function openDeactivateModal(id) {
    const list = loadUsers();
    const user = list.find(u => u.id === id);
    if (!user) return;

    modalAction = 'deactivate';
    modalActionId = id;

    document.getElementById('modalTitle').textContent = 'Deactivate user?';
    document.getElementById('modalMessage').textContent =
        `User "${user.name}" will lose access to the system. This action can be reverted.`;
    document.getElementById('deactivateModal').style.display = 'flex';
}

function openReactivateModal(id) {
    const list = loadUsers();
    const user = list.find(u => u.id === id);
    if (!user) return;

    modalAction = 'reactivate';
    modalActionId = id;

    document.getElementById('modalTitle').textContent = 'Reactivate user?';
    document.getElementById('modalMessage').textContent =
        `User "${user.name}" will regain access to the system.`;
    document.getElementById('deactivateModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('deactivateModal').style.display = 'none';
    modalAction = null;
    modalActionId = null;
}

function confirmAction() {
    const list = loadUsers();
    const index = list.findIndex(u => u.id === modalActionId);

    if (index !== -1) {
        if (modalAction === 'deactivate') {
            list[index].status = 'inactive';
            alert('User deactivated successfully.');
        } else if (modalAction === 'reactivate') {
            list[index].status = 'active';
            alert('User reactivated successfully.');
        }
        saveUsers(list);
    }

    closeModal();
    loadTable();
}


// ─── UTILITIES ────────────────────────────────────────────────────────────────

function clearForm() {
    ['name', 'document', 'email', 'phone', 'password', 'confirm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('role').value = '';
    clearErrors();
}

function markError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('error');
}

function clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}


// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    loadTable();
});
