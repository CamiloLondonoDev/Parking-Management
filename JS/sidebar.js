// ─── SIDEBAR: DYNAMIC USER ────────────────────────────────────────────────────

function loadSidebarUser() {
    const sessionData = localStorage.getItem('session');
    if (!sessionData) return;

    const user = JSON.parse(sessionData);

    const name  = document.getElementById('sidebarName');
    const email = document.getElementById('sidebarEmail');
    const role  = document.getElementById('sidebarRole');

    if (name)  name.textContent  = user.name  || 'User';
    if (email) email.textContent = user.email || '';
    if (role)  role.textContent  = user.role  || '';
}

function openUserModal() {
    const sessionData = localStorage.getItem('session');
    if (!sessionData) return;

    const u = JSON.parse(sessionData);

    document.getElementById('modalName').textContent     = u.name     || '-';
    document.getElementById('modalRole').textContent     = u.role     || '-';
    document.getElementById('modalEmail').textContent    = u.email    || '-';
    document.getElementById('modalPhone').textContent    = u.phone    || '-';
    document.getElementById('modalDocument').textContent = u.document || '-';

    // Avatar with the initial of the name
    const avatar = document.getElementById('modalAvatar');
    if (avatar) avatar.textContent = (u.name || 'U')[0].toUpperCase();

    document.getElementById('userModal').classList.add('visible');

}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('visible');}

function logout() {
    // Clear only the session, not all system data
    localStorage.removeItem('session');
    window.location.href = 'login.html';
}

// Close modal when clicking outside
document.getElementById('userModal').addEventListener('click', function(e) {
    if (e.target === this) closeUserModal();
});

document.addEventListener('DOMContentLoaded', loadSidebarUser);
