/**
 * Global variables for chat functionality
 */
let chatMessages = document.getElementById('chat-messages');
let chatForm = document.getElementById('chat-form');
let chatInput = document.getElementById('chat-input');
let chatLoginBtn = document.getElementById('chat-login-btn');
let chatUserInfo = document.getElementById('chat-user-info');
let isAdmin = false;
let isSuperAdmin = false;

/**
 * Initialize chat functionality
 */
function initializeChat() {
    // Check if chat elements exist in the page
    if (!chatMessages) return;
    
    // Initialize Firebase auth state listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('Chat: User is signed in:', user.displayName);
            showChatForm(user);
            checkChatAdminStatus(user);
            loadChatMessages();
        } else {
            // User is signed out
            console.log('Chat: User is signed out');
            
            // Reset chat form visibility
            if (chatForm) chatForm.classList.add('hidden');
            if (chatLoginBtn) chatLoginBtn.classList.remove('hidden');
            if (chatUserInfo) chatUserInfo.innerHTML = '';
            
            // Show login message in chat
            displayChatEmptyState('Please sign in to join the chat.');
        }
    });
    
    // Add event listeners
    if (chatLoginBtn) {
        chatLoginBtn.addEventListener('click', handleChatLogin);
    }
    
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }
}

/**
 * Check if the current user has admin privileges for chat
 * @param {Object} user - The authenticated user object
 */
function checkChatAdminStatus(user) {
    if (!user || !user.email) return;
    
    // Check if user is an admin
    const userEmail = user.email;
    
    // Check super admin status first (for immediate UI update)
    if (isSuperAdmin(userEmail)) {
        isSuperAdmin = true;
        isAdmin = true;
        updateChatAdminUI();
        return;
    }
    
    // Check for admin privileges in Firebase
    database.ref('admins').once('value')
        .then(snapshot => {
            const admins = snapshot.val();
            
            if (admins && Object.values(admins).some(admin => admin.email === userEmail)) {
                isAdmin = true;
            } else {
                isAdmin = false;
            }
            
            updateChatAdminUI();
        })
        .catch(error => {
            console.error('Error checking admin status for chat:', error);
            isAdmin = false;
            updateChatAdminUI();
        });
}

/**
 * Update the UI elements based on admin status
 */
function updateChatAdminUI() {
    // Add admin badge to user info if needed
    if (chatUserInfo && (isAdmin || isSuperAdmin)) {
        const adminBadge = document.createElement('span');
        adminBadge.className = 'admin-badge';
        adminBadge.textContent = isSuperAdmin ? 'Super Admin' : 'Admin';
        
        // Add badge only if it doesn't already exist
        if (!chatUserInfo.querySelector('.admin-badge')) {
            chatUserInfo.appendChild(adminBadge);
        }
    }
}

/**
 * Load chat messages from Firebase
 */
function loadChatMessages() {
    // Clear existing messages first
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading chat messages...</p>
            </div>
        `;
    }
    
    // Set up listener for chat messages (most recent 50)
    database.ref('chat')
        .orderByChild('timestamp')
        .limitToLast(50)
        .on('value', snapshot => {
            const messages = snapshot.val();
            
            // Clear loading spinner
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            if (!messages) {
                displayChatEmptyState('No messages yet. Be the first to chat!');
                return;
            }
            
            // Convert object to array and sort by timestamp
            const messageArray = Object.entries(messages).map(([id, message]) => ({
                id,
                ...message
            })).sort((a, b) => a.timestamp - b.timestamp);
            
            // Add each message to the chat
            messageArray.forEach(message => {
                const messageElement = createMessageElement(message);
                chatMessages.appendChild(messageElement);
            });
            
            // Scroll to the latest message
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
}

/**
 * Create a message element for the chat
 * @param {Object} message - The message object
 * @returns {HTMLElement} - The message element
 */
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.dataset.id = message.id;
    
    // Add animation class
    const currentUser = firebase.auth().currentUser;
    // Only animate if we have a number timestamp (not server value)
    const isNewMessage = typeof message.timestamp === 'number' && 
                         message.timestamp > (Date.now() - 2000); // Message posted within the last 2 seconds
    
    if (isNewMessage) {
        // Use pop-in animation for brand new messages
        messageDiv.classList.add('pop-in');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            messageDiv.classList.remove('pop-in');
        }, 500);
    }
    
    // Create user info with role highlighting
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-message-user';
    
    // Add user avatar
    const avatar = document.createElement('img');
    avatar.className = 'chat-avatar';
    avatar.src = message.photoURL || 'https://via.placeholder.com/32';
    avatar.alt = message.displayName || 'User';
    userDiv.appendChild(avatar);
    
    // Add username with role indicator if applicable
    const userName = document.createElement('span');
    userName.className = 'chat-username';
    
    // Determine user role from message
    let roleClass = '';
    if (message.isSuperAdmin) {
        roleClass = 'super-admin-user';
        userName.setAttribute('data-role', 'Super Admin');
    } else if (message.isAdmin) {
        roleClass = 'admin-user';
        userName.setAttribute('data-role', 'Admin');
    }
    
    if (roleClass) {
        userName.classList.add(roleClass);
    }
    
    userName.textContent = message.displayName || 'Anonymous';
    userDiv.appendChild(userName);
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-message-content';
    contentDiv.textContent = message.text;
    
    // Create timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'chat-message-time';
    
    const date = new Date(message.timestamp);
    timestamp.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Assemble message
    messageDiv.appendChild(userDiv);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestamp);
    
    return messageDiv;
}

/**
 * Display an empty state message in the chat
 * @param {string} message - The message to display
 */
function displayChatEmptyState(message) {
    if (!chatMessages) return;
    
    chatMessages.innerHTML = `
        <div class="chat-empty-state">
            <i class="fas fa-comments"></i>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Handle Google Sign-In for chat
 */
function handleChatLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Show loading state on button
    if (chatLoginBtn) {
        const originalText = chatLoginBtn.textContent;
        chatLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        chatLoginBtn.disabled = true;
        
        firebase.auth().signInWithPopup(provider)
            .catch(error => {
                console.error('Error during Google sign in for chat:', error);
                
                // Reset button on error
                chatLoginBtn.textContent = originalText;
                chatLoginBtn.disabled = false;
                
                // Show error message in chat
                displayChatEmptyState('Failed to sign in. Please try again.');
            });
    } else {
        firebase.auth().signInWithPopup(provider);
    }
}

/**
 * Show the chat form for an authenticated user
 * @param {Object} user - The authenticated user object
 */
function showChatForm(user) {
    if (!chatForm || !chatLoginBtn || !chatUserInfo) return;
    
    // Create chat login div to animate out
    const chatLoginDiv = document.querySelector('.chat-login');
    if (chatLoginDiv) {
        // First, add animation class to slide out
        chatLoginDiv.classList.add('slide-out');
        
        // After animation completes, hide the login button
        setTimeout(() => {
            chatLoginBtn.classList.add('hidden');
            chatLoginDiv.classList.remove('slide-out');
            
            // Show the chat form with animation
            chatForm.classList.remove('hidden');
            chatForm.classList.add('slide-in');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                chatForm.classList.remove('slide-in');
            }, 500);
        }, 300);
    } else {
        // Fallback if animation can't be used
        chatForm.classList.remove('hidden');
        chatLoginBtn.classList.add('hidden');
    }
    
    // Update user info with fade in animation
    chatUserInfo.innerHTML = '';
    chatUserInfo.classList.add('fade-in');
    
    // Add user avatar
    const avatar = document.createElement('img');
    avatar.className = 'chat-avatar';
    avatar.src = user.photoURL;
    avatar.alt = user.displayName;
    chatUserInfo.appendChild(avatar);
    
    // Add username
    const userName = document.createElement('span');
    userName.className = 'chat-username';
    userName.textContent = user.displayName;
    chatUserInfo.appendChild(userName);
    
    // Remove animation class after animation completes
    setTimeout(() => {
        chatUserInfo.classList.remove('fade-in');
    }, 500);
}

/**
 * Handle chat form submission
 * @param {Event} event - The form submission event
 */
function handleChatSubmit(event) {
    event.preventDefault();
    
    const activeUser = firebase.auth().currentUser;
    if (!activeUser || !chatInput) return;
    
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Disable submit button to prevent multiple submissions
    const submitBtn = chatForm.querySelector('button[type="submit"]');
    if (submitBtn) {
        // Show loading animation
        const originalContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        submitBtn.disabled = true;
        submitBtn.classList.add('submitting');
    }
    
    // Create the message object
    const message = {
        text: text,
        displayName: activeUser.displayName,
        photoURL: activeUser.photoURL,
        uid: activeUser.uid,
        email: activeUser.email,
        isAdmin: isAdmin,
        isSuperAdmin: isSuperAdmin,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Push the message to Firebase
    database.ref('chat').push(message)
        .then(() => {
            // Clear input field
            chatInput.value = '';
            
            // Restore and re-enable submit button with success animation
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-check"></i>';
                submitBtn.classList.remove('submitting');
                submitBtn.classList.add('success');
                
                // Reset button after success animation
                setTimeout(() => {
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('success');
                }, 1000);
            }
            
            // Focus on input for next message
            chatInput.focus();
        })
        .catch(error => {
            console.error('Error sending chat message:', error);
            
            // Show error state on button
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-times"></i>';
                submitBtn.classList.remove('submitting');
                submitBtn.classList.add('error');
                
                // Reset button after error animation
                setTimeout(() => {
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('error');
                }, 1000);
            }
            
            // Show error message as toast instead of alert
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) {
                const errorToast = document.createElement('div');
                errorToast.className = 'chat-error-toast fade-in';
                errorToast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
                chatContainer.appendChild(errorToast);
                
                // Remove toast after 3 seconds
                setTimeout(() => {
                    errorToast.classList.add('fade-out');
                    setTimeout(() => {
                        errorToast.remove();
                    }, 300);
                }, 3000);
            }
        });
}

// Run initialization when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeChat);