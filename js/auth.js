// Authentication module with Google Sign-In
// DOM Elements
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const adminLogin = document.getElementById('admin-login');
const adminDashboard = document.getElementById('admin-dashboard');
const logoutBtn = document.getElementById('logout-btn');
const googleLoginBtn = document.getElementById('google-login-btn');

// Variables for authentication state
let currentUser = null;
let isAdminUser = false;
let isSuperAdmin = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', initAuth);
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);

/**
 * Initialize authentication and check user state
 */
function initAuth() {
    // Set up auth state observer
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            checkAdminStatus(user);
        } else {
            currentUser = null;
            isAdminUser = false;
            isSuperAdmin = false;
            showLoginUI();
        }
    });
}

/**
 * Check if the current user has admin privileges
 * @param {Object} user - The authenticated user object
 */
function checkAdminStatus(user) {
    if (!user) return;
    
    // Show loading state in the login UI
    if (loginMessage) {
        loginMessage.textContent = "Checking permissions...";
        loginMessage.className = 'form-message';
    }
    
    // Check if user is an admin
    isUserAdmin(user.email).then(adminStatus => {
        isAdminUser = adminStatus;
        
        if (isAdminUser) {
            // Also check if the user is a super admin
            isUserSuperAdmin(user.email).then(superAdminStatus => {
                isSuperAdmin = superAdminStatus;
                
                showMessage(`Welcome, ${user.displayName || user.email}`, 'success');
                showAdminUI();
            });
        } else {
            showMessage('You do not have admin privileges', 'error');
            // Auto logout non-admin users
            setTimeout(() => {
                handleLogout();
            }, 2000);
        }
    }).catch(error => {
        console.error('Error checking admin status:', error);
        showMessage('Authentication error. Please try again.', 'error');
    });
}

/**
 * Handle Google Sign-In
 */
function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Add a custom parameter to request the user's email
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    // Show loading state
    if (loginMessage) {
        showMessage('Connecting to Google...', 'info');
    }
    
    auth.signInWithPopup(provider).then(result => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = result.credential;
        const token = credential.accessToken;
        const user = result.user;
        
        // The signed-in user info.
        currentUser = user;
        console.log('Google Sign-In successful:', user.email);
        
        // Check if user has admin privileges
        checkAdminStatus(user);
    }).catch(error => {
        console.error('Google Sign-In error:', error);
        showMessage('Google Sign-In failed: ' + error.message, 'error');
    });
}

/**
 * Handle logout
 */
function handleLogout() {
    auth.signOut().then(() => {
        console.log('User signed out');
        currentUser = null;
        isAdminUser = false;
        isSuperAdmin = false;
        
        // Show login UI
        showLoginUI();
        showMessage('You have been logged out', 'info');
    }).catch(error => {
        console.error('Sign out error:', error);
        showMessage('Logout failed: ' + error.message, 'error');
    });
}

/**
 * Show the login UI
 */
function showLoginUI() {
    if (adminLogin && adminDashboard) {
        adminLogin.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
    }
}

/**
 * Show the admin dashboard UI
 */
function showAdminUI() {
    if (adminLogin && adminDashboard) {
        adminLogin.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        
        // If we're in the admin.html page, update admin interface based on permissions
        if (window.location.pathname.includes('admin.html')) {
            updateAdminInterface();
        }
    }
}

/**
 * Update admin interface based on user's privileges
 */
function updateAdminInterface() {
    // Elements that only super admins should see
    const superAdminElements = document.querySelectorAll('.super-admin-only');
    
    // Set user info display
    const userInfoDisplay = document.getElementById('admin-user-info');
    if (userInfoDisplay && currentUser) {
        userInfoDisplay.innerHTML = `
            <div class="user-avatar">
                <img src="${currentUser.photoURL || 'assets/default-avatar.png'}" alt="User Avatar">
            </div>
            <div class="user-details">
                <p class="user-name">${currentUser.displayName || 'Admin User'}</p>
                <p class="user-email">${currentUser.email}</p>
                <span class="user-role ${isSuperAdmin ? 'super-admin' : 'admin'}">${isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
            </div>
        `;
    }
    
    // Show/hide super admin elements
    superAdminElements.forEach(element => {
        if (isSuperAdmin) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}

/**
 * Show message in the login form
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, info)
 */
function showMessage(message, type) {
    if (!loginMessage) return;
    
    loginMessage.textContent = message;
    loginMessage.className = 'form-message';
    
    if (type === 'error') {
        loginMessage.classList.add('error-message');
    } else if (type === 'success') {
        loginMessage.classList.add('success-message');
    } else if (type === 'info') {
        loginMessage.classList.add('info-message');
    }
}
