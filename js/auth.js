// Admin authentication module

// Hardcoded credentials (in a real app, these should be hashed and stored securely)
const ADMIN_USERNAME = "admin2005@sjcet@cseb";
const ADMIN_PASSWORD = "admin2005@sjcet@cseb";

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const adminLogin = document.getElementById('admin-login');
const adminDashboard = document.getElementById('admin-dashboard');
const logoutBtn = document.getElementById('logout-btn');
const passwordToggle = document.querySelector('.password-toggle');
const passwordField = document.getElementById('password');

// Event Listeners
document.addEventListener('DOMContentLoaded', checkAuthStatus);
if (loginForm) loginForm.addEventListener('submit', handleLogin);
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (passwordToggle) passwordToggle.addEventListener('click', togglePasswordVisibility);

/**
 * Check if user is already authenticated
 */
function checkAuthStatus() {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    
    if (isAuthenticated && adminLogin && adminDashboard) {
        adminLogin.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
    }
}

/**
 * Handle login form submission
 * @param {Event} event - The form submission event
 */
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simple validation
    if (!username || !password) {
        showMessage('Please enter both username and password', 'error');
        return;
    }
    
    // Check credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Login successful
        sessionStorage.setItem('isAuthenticated', 'true');
        showMessage('Login successful! Redirecting to dashboard...', 'success');
        
        // Show dashboard after a brief delay
        setTimeout(() => {
            adminLogin.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
        }, 1000);
    } else {
        // Login failed
        showMessage('Invalid username or password', 'error');
    }
}

/**
 * Handle logout button click
 */
function handleLogout() {
    sessionStorage.removeItem('isAuthenticated');
    adminDashboard.classList.add('hidden');
    adminLogin.classList.remove('hidden');
    
    // Reset form
    if (loginForm) {
        loginForm.reset();
        showMessage('', '');
    }
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility() {
    const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordField.setAttribute('type', type);
    
    // Toggle icon
    const icon = passwordToggle.querySelector('i');
    if (type === 'text') {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

/**
 * Show message in the login form
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error)
 */
function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = 'form-message';
    
    if (type === 'error') {
        loginMessage.classList.add('error-message');
    } else if (type === 'success') {
        loginMessage.classList.add('success-message');
    }
}
