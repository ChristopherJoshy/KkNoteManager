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
    
    // Show loading state with animation on the button
    if (googleLoginBtn) {
        const originalContent = googleLoginBtn.innerHTML;
        googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        googleLoginBtn.disabled = true;
        
        // Add subtle pulse animation to the button
        googleLoginBtn.classList.add('pulse-animation');
    }
    
    // Show loading state message
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
        
        // Restore button (if user comes back to this page later)
        if (googleLoginBtn) {
            googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Sign in with Google';
            googleLoginBtn.disabled = false;
            googleLoginBtn.classList.remove('pulse-animation');
        }
        
        // Check if user has admin privileges
        checkAdminStatus(user);
    }).catch(error => {
        console.error('Google Sign-In error:', error);
        showMessage('Google Sign-In failed: ' + error.message, 'error');
        
        // Restore button on error
        if (googleLoginBtn) {
            googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Sign in with Google';
            googleLoginBtn.disabled = false;
            googleLoginBtn.classList.remove('pulse-animation');
            
            // Add error shake animation
            googleLoginBtn.classList.add('shake-animation');
            setTimeout(() => {
                googleLoginBtn.classList.remove('shake-animation');
            }, 820); // 820ms is the duration of our shake animation
        }
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
        // Add slide-out animation to dashboard before hiding
        adminDashboard.classList.add('slide-out');
        
        // After animation completes, swap visibility
        setTimeout(() => {
            adminDashboard.classList.add('hidden');
            adminDashboard.classList.remove('slide-out');
            
            // Show login with animation
            adminLogin.classList.remove('hidden');
            adminLogin.classList.add('slide-in');
            
            // Remove animation class after it completes
            setTimeout(() => {
                adminLogin.classList.remove('slide-in');
            }, 500);
        }, 300);
    }
}

/**
 * Show the admin dashboard UI
 */
function showAdminUI() {
    if (adminLogin && adminDashboard) {
        // Add slide-out animation to login before hiding
        adminLogin.classList.add('slide-out');
        
        // After animation completes, swap visibility
        setTimeout(() => {
            adminLogin.classList.add('hidden');
            adminLogin.classList.remove('slide-out');
            
            // Show dashboard with animation
            adminDashboard.classList.remove('hidden');
            adminDashboard.classList.add('slide-in');
            
            // If we're in the admin.html page, update admin interface based on permissions
            if (window.location.pathname.includes('admin.html')) {
                updateAdminInterface();
            }
            
            // Remove animation class after it completes
            setTimeout(() => {
                adminDashboard.classList.remove('slide-in');
            }, 500);
        }, 300);
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
    
    // Set up animation by removing previous message with fade-out
    loginMessage.classList.add('fade-out');
    
    // After fade-out is complete, change content and fade back in
    setTimeout(() => {
        loginMessage.textContent = message;
        loginMessage.className = 'form-message';
        
        if (type === 'error') {
            loginMessage.classList.add('error-message');
        } else if (type === 'success') {
            loginMessage.classList.add('success-message');
        } else if (type === 'info') {
            loginMessage.classList.add('info-message');
        }
        
        // Trigger animation by removing the fade-out class and adding fade-in
        loginMessage.classList.remove('fade-out');
        loginMessage.classList.add('fade-in');
        
        // Remove animation class after it completes
        setTimeout(() => {
            loginMessage.classList.remove('fade-in');
        }, 500);
    }, 300);
}
