document.getElementById("loginForm").addEventListener("submit", function(event){

    event.preventDefault();

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();
    let message  = document.getElementById("errorMessage");

    message.textContent = "";

    if (username === "" || password === "") {
        message.textContent = "All fields are required";
        return;
    }

    // ─── TRY LOGIN WITH USERS_DB ─────────────────────────────────────────────
    // First look among the users registered in the system

    const users     = JSON.parse(localStorage.getItem('users_db') || '[]');
    const foundUser = users.find(u =>
        (u.email === username || u.name === username) &&
        u.password === password &&
        u.status === 'active'
    );

    if (foundUser) {
        localStorage.setItem('session', JSON.stringify({
            id:       foundUser.id,
            name:     foundUser.name,
            email:    foundUser.email,
            role:     foundUser.role,
            phone:    foundUser.phone    || '-',
            document: foundUser.document || '-'
        }));
        window.location.href = "dashboard.html";
        return;
    }

    // ─── FALLBACK: HARDCODED CREDENTIALS ─────────────────────────────────────
    // If there are no users in the DB yet, allow login with admin/12345

    const validUsername = "admin";
    const validPassword = "12345";

    if (username === validUsername && password === validPassword) {
        localStorage.setItem('session', JSON.stringify({
            id:       0,
            name:     'Administrator',
            email:    'admin@autoscolombia.com',
            role:     'Administrator',
            phone:    '-',
            document: '-'
        }));
        window.location.href = "dashboard.html";
        return;
    }

    // ─── INVALID CREDENTIALS ─────────────────────────────────────────────────

    message.textContent = "Incorrect username or password";

});
