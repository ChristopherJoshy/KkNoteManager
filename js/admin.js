// Admin panel JavaScript for KKNotes

// DOM Elements
const semesterItems = document.querySelectorAll('.semester-item');
const currentSemTitle = document.getElementById('current-sem-title');
const adminNotesList = document.getElementById('admin-notes-list');
const addNoteForm = document.getElementById('add-note-form');
const adminManagementModal = document.getElementById('admin-management-modal');
const manageAdminsBtn = document.getElementById('manage-admins-btn');
const closeAdminModalBtn = document.getElementById('close-admin-modal');
const adminListContainer = document.getElementById('admin-list');
const addAdminForm = document.getElementById('add-admin-form');
const testFirebaseBtn = document.getElementById('test-firebase-btn');

// Current selected semester in admin panel
let currentAdminSemester = 's1'; // Default to S1

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeAdmin);
semesterItems.forEach(item => item.addEventListener('click', handleAdminSemesterChange));
if (addNoteForm) addNoteForm.addEventListener('submit', handleAddNote);
if (manageAdminsBtn) manageAdminsBtn.addEventListener('click', openAdminManagementModal);
if (closeAdminModalBtn) closeAdminModalBtn.addEventListener('click', closeAdminManagementModal);
if (addAdminForm) addAdminForm.addEventListener('submit', handleAddAdmin);
if (testFirebaseBtn) testFirebaseBtn.addEventListener('click', testFirebaseConnection);

/**
 * Initialize the admin panel
 */
function initializeAdmin() {
    // Check if user is authenticated first
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) return;
    
    // Load notes for default semester (S1)
    loadAdminNotes(currentAdminSemester);
    
    // Set up tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons) {
        tabButtons.forEach(button => {
            button.addEventListener('click', handleTabChange);
        });
    }
    
    // Add form handlers
    const addSubjectForm = document.getElementById('add-subject-form');
    if (addSubjectForm) {
        addSubjectForm.addEventListener('submit', handleAddSubject);
    }
}

/**
 * Load notes for admin view
 * @param {string} semester - The semester code (s1, s2, etc.)
 */
function loadAdminNotes(semester) {
    // Show loading spinner
    adminNotesList.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading notes...</p>
        </div>
    `;
    
    // Update title
    currentSemTitle.textContent = `Semester ${semester.substring(1)} Notes`;
    
    // Log for debugging
    console.log(`Admin: Loading notes for semester ${semester}`);
    console.log(`Database path: notes/${semester}`);
    
    // Set a timeout to detect long-running requests
    const timeoutId = setTimeout(() => {
        console.warn('Firebase admin request taking longer than expected, possible connection issues');
        // Try to recover silently
        try {
            database.goOffline();
            setTimeout(() => database.goOnline(), 1000);
        } catch (e) {
            console.error('Failed to reconnect Firebase:', e);
        }
    }, 6000);
    
    // Get notes from Firebase (without cache to ensure fresh data)
    database.ref(`notes/${semester}`).once('value')
        .then(snapshot => {
            clearTimeout(timeoutId);
            const notes = snapshot.val();
            
            // Detailed logging for debugging
            console.log(`Admin: loaded notes for ${semester}`, notes ? Object.keys(notes).length : 0, 'entries');
            if (notes) {
                console.log('Note IDs:', Object.keys(notes));
                console.log('Sample note data:', Object.values(notes)[0]);
            } else {
                console.log('No notes found for this semester');
            }
            
            displayAdminNotes(notes, semester);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            console.error('Error loading notes for admin:', error);
            console.error('Error details:', error.code, error.message);
            
            displayAdminError();
            
            // Add a retry button
            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn primary-btn mt-3';
            retryBtn.textContent = 'Retry';
            retryBtn.addEventListener('click', () => loadAdminNotes(semester));
            adminNotesList.appendChild(retryBtn);
        });
}

/**
 * Display notes in admin panel
 * @param {Object} notes - The notes object from Firebase
 * @param {string} semester - The current semester code
 */
function displayAdminNotes(notes, semester) {
    adminNotesList.innerHTML = '';
    
    if (!notes || Object.keys(notes).length === 0) {
        displayAdminEmptyState();
        return;
    }
    
    // Add each note as an editable item
    Object.keys(notes).forEach(key => {
        const note = notes[key];
        const noteItem = createAdminNoteItem(note, key, semester);
        adminNotesList.appendChild(noteItem);
    });
}

/**
 * Create an admin note item element
 * @param {Object} note - The note object
 * @param {string} noteId - The note ID in Firebase
 * @param {string} semester - The semester code
 * @returns {HTMLElement} - The admin note item element
 */
function createAdminNoteItem(note, noteId, semester) {
    const item = document.createElement('div');
    item.className = 'admin-note-item';
    item.dataset.id = noteId;
    
    item.innerHTML = `
        <div class="note-info">
            <h4 class="note-title">${note.title}</h4>
            <p class="note-link">${note.link}</p>
        </div>
        <div class="note-actions">
            <button class="action-btn edit-btn" title="Edit Note">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" title="Delete Note">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    
    // Add event listeners for edit and delete buttons
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    
    editBtn.addEventListener('click', () => openEditModal(note, noteId, semester));
    deleteBtn.addEventListener('click', () => confirmDeleteNote(noteId, semester));
    
    return item;
}

/**
 * Display empty state in admin panel
 */
function displayAdminEmptyState() {
    adminNotesList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-file-alt" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>No notes found</h3>
            <p>There are no notes available for this semester yet.</p>
            <p>Use the form below to add a new note.</p>
        </div>
    `;
}

/**
 * Display error state in admin panel
 */
function displayAdminError() {
    adminNotesList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--warning-color);"></i>
            <h3>Failed to load notes</h3>
            <p>There was a problem loading the notes. Please try again later.</p>
        </div>
    `;
}

/**
 * Handle admin semester change
 * @param {Event} event - The click event
 */
function handleAdminSemesterChange(event) {
    const semester = event.target.dataset.sem;
    
    // Update active item
    semesterItems.forEach(item => item.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update current semester and load notes
    currentAdminSemester = semester;
    loadAdminNotes(semester);
    
    // Update semester title in the subject tab
    const semNumber = semester.replace('s', '');
    const currentSubjectsTitle = document.getElementById('current-subjects-title');
    if (currentSubjectsTitle) {
        currentSubjectsTitle.textContent = `Semester ${semNumber} Subjects`;
    }
    
    // If the subjects tab is active, also load subjects
    const subjectsTab = document.getElementById('subjects-tab');
    if (subjectsTab && subjectsTab.classList.contains('active')) {
        loadSubjects(semester);
    }
}

/**
 * Handle add note form submission
 * @param {Event} event - The form submission event
 */
function handleAddNote(event) {
    event.preventDefault();
    
    const title = document.getElementById('note-title').value.trim();
    const link = document.getElementById('note-link').value.trim();
    
    // Simple validation
    if (!title || !link) {
        alert('Please enter both title and link');
        return;
    }
    
    // Check if link is a valid URL
    try {
        new URL(link);
    } catch (e) {
        alert('Please enter a valid URL');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#add-note-form button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;
    
    // Show status
    const uploadStatus = document.getElementById('upload-status');
    const statusMessage = uploadStatus.querySelector('.status-message');
    const loadingIcon = uploadStatus.querySelector('.status-loading');
    const successIcon = uploadStatus.querySelector('.status-success');
    const errorIcon = uploadStatus.querySelector('.status-error');
    
    // Set initial status
    uploadStatus.classList.remove('hidden');
    loadingIcon.classList.remove('hidden');
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');
    statusMessage.textContent = 'Uploading note to Firebase...';
    
    // Save to Firebase
    const newNoteRef = database.ref(`notes/${currentAdminSemester}`).push();
    
    newNoteRef.set({
        title: title,
        link: link,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    })
    .then(() => {
        // Reset form
        addNoteForm.reset();
        
        // Update status
        loadingIcon.classList.add('hidden');
        successIcon.classList.remove('hidden');
        statusMessage.textContent = 'Note added successfully!';
        
        // Reset button
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        
        // Hide status after delay
        setTimeout(() => {
            uploadStatus.classList.add('hidden');
        }, 3000);
        
        // Reload notes
        loadAdminNotes(currentAdminSemester);
    })
    .catch(error => {
        console.error('Error adding note:', error);
        
        // Update status
        loadingIcon.classList.add('hidden');
        errorIcon.classList.remove('hidden');
        statusMessage.textContent = 'Error: ' + error.message;
        
        // Reset button
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        
        // Hide status after delay
        setTimeout(() => {
            uploadStatus.classList.add('hidden');
        }, 5000);
    });
}

/**
 * Open modal to edit a note
 * @param {Object} note - The note object
 * @param {string} noteId - The note ID in Firebase
 * @param {string} semester - The semester code
 */
function openEditModal(note, noteId, semester) {
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Note</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="edit-note-form" class="admin-form">
                <div class="form-group">
                    <label for="edit-note-title">Title</label>
                    <input type="text" id="edit-note-title" name="edit-note-title" value="${note.title}" required>
                </div>
                <div class="form-group">
                    <label for="edit-note-link">Google Drive Link</label>
                    <input type="url" id="edit-note-link" name="edit-note-link" value="${note.link}" required>
                </div>
                <div id="edit-upload-status" class="upload-status hidden" style="margin-bottom: 15px;">
                    <div class="status-icon">
                        <i class="fas fa-circle-notch fa-spin status-loading"></i>
                        <i class="fas fa-check-circle status-success hidden"></i>
                        <i class="fas fa-times-circle status-error hidden"></i>
                    </div>
                    <div class="status-message">Processing...</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn outline-btn cancel-btn">Cancel</button>
                    <button type="submit" class="btn primary-btn" id="edit-save-btn">Save Changes</button>
                </div>
            </form>
        </div>
    `;
    
    // Add modal to document
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('.cancel-btn');
    const form = modal.querySelector('#edit-note-form');
    
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    cancelBtn.addEventListener('click', () => document.body.removeChild(modal));
    
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const newTitle = document.getElementById('edit-note-title').value.trim();
        const newLink = document.getElementById('edit-note-link').value.trim();
        
        // Simple validation
        if (!newTitle || !newLink) {
            alert('Please enter both title and link');
            return;
        }
        
        // Check if link is a valid URL
        try {
            new URL(newLink);
        } catch (e) {
            alert('Please enter a valid URL');
            return;
        }
        
        // Show saving status
        const saveBtn = document.getElementById('edit-save-btn');
        const originalBtnText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Show status indicator
        const uploadStatus = document.getElementById('edit-upload-status');
        const statusMessage = uploadStatus.querySelector('.status-message');
        const loadingIcon = uploadStatus.querySelector('.status-loading');
        const successIcon = uploadStatus.querySelector('.status-success');
        const errorIcon = uploadStatus.querySelector('.status-error');
        
        // Set initial status
        uploadStatus.classList.remove('hidden');
        loadingIcon.classList.remove('hidden');
        successIcon.classList.add('hidden');
        errorIcon.classList.add('hidden');
        statusMessage.textContent = 'Updating note in Firebase...';
        
        // Log for debugging
        console.log(`Updating note: ${noteId} in semester: ${semester}`);
        console.log('New data:', { title: newTitle, link: newLink });
        
        // Update in Firebase with additional fields to ensure proper update
        database.ref(`notes/${semester}/${noteId}`).update({
            title: newTitle,
            link: newLink,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            console.log('Note successfully updated in Firebase');
            
            // Update status
            loadingIcon.classList.add('hidden');
            successIcon.classList.remove('hidden');
            statusMessage.textContent = 'Note updated successfully!';
            
            // Reset button
            saveBtn.textContent = originalBtnText;
            saveBtn.disabled = false;
            
            // Remove modal after delay
            setTimeout(() => {
                document.body.removeChild(modal);
                // Reload notes
                loadAdminNotes(semester);
            }, 1500);
        })
        .catch(error => {
            console.error('Error updating note:', error);
            
            // Update status
            loadingIcon.classList.add('hidden');
            errorIcon.classList.remove('hidden');
            statusMessage.textContent = `Error: ${error.message}`;
            
            // Reset button
            saveBtn.textContent = originalBtnText;
            saveBtn.disabled = false;
            
            alert('Error updating note: ' + error.message);
        });
    });
}

/**
 * Confirm and delete a note
 * @param {string} noteId - The note ID in Firebase
 * @param {string} semester - The semester code
 */
function confirmDeleteNote(noteId, semester) {
    if (confirm('Are you sure you want to delete this note?')) {
        // Create and show a toast notification for deletion status
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <div class="toast-message">Deleting note...</div>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Log for debugging
        console.log(`Deleting note: ${noteId} from semester: ${semester}`);
        
        // Delete from Firebase
        database.ref(`notes/${semester}/${noteId}`).remove()
            .then(() => {
                console.log('Note successfully deleted from Firebase');
                
                // Update toast for success
                toast.innerHTML = `
                    <div class="toast-content success">
                        <div class="toast-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="toast-message">Note deleted successfully!</div>
                    </div>
                `;
                
                // Remove toast after delay
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 2000);
                
                // Reload notes
                loadAdminNotes(semester);
            })
            .catch(error => {
                console.error('Error deleting note:', error);
                
                // Update toast for error
                toast.innerHTML = `
                    <div class="toast-content error">
                        <div class="toast-icon">
                            <i class="fas fa-times-circle"></i>
                        </div>
                        <div class="toast-message">Error: ${error.message}</div>
                    </div>
                `;
                
                // Remove toast after delay
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 3000);
                
                alert('Error deleting note: ' + error.message);
            });
    }
}

/**
 * Test Firebase connection and display the results
 */
function testFirebaseConnection() {
    // Create a modal to show results
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Firebase Connection Test</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="firebase-test-results">
                <div class="test-status">
                    <i class="fas fa-circle-notch fa-spin"></i>
                    <p>Testing connection to Firebase...</p>
                </div>
                <div class="test-details" style="display: none;">
                    <h4>Connection Details:</h4>
                    <pre id="firebase-details" style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px;"></pre>
                    <h4>Test Results:</h4>
                    <ul id="firebase-test-results" style="margin-left: 20px;"></ul>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn outline-btn close-btn">Close</button>
            </div>
        </div>
    `;
    
    // Add modal to document
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    const closeBtnFooter = modal.querySelector('.close-btn');
    
    closeBtn.addEventListener('click', () => document.body.removeChild(modal));
    closeBtnFooter.addEventListener('click', () => document.body.removeChild(modal));
    
    // Test the connection
    const testStatus = modal.querySelector('.test-status');
    const testDetails = modal.querySelector('.test-details');
    const firebaseDetails = modal.querySelector('#firebase-details');
    const testResults = modal.querySelector('#firebase-test-results');
    
    // Display Firebase config
    const sanitizedConfig = Object.assign({}, firebaseConfig);
    sanitizedConfig.apiKey = sanitizedConfig.apiKey.substring(0, 8) + '...';
    firebaseDetails.textContent = JSON.stringify(sanitizedConfig, null, 2);
    
    // Run tests
    setTimeout(() => {
        testStatus.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success-color);"></i> <p>Testing complete!</p>';
        testDetails.style.display = 'block';
        
        // Test 1: Firebase Initialization
        try {
            const firebaseInitTest = firebase.app() ? true : false;
            addTestResult(testResults, 
                firebaseInitTest, 
                'Firebase app initialization', 
                firebaseInitTest ? 'Firebase is properly initialized' : 'Firebase initialization failed'
            );
        } catch (e) {
            addTestResult(testResults, false, 'Firebase app initialization', e.message);
        }
        
        // Test 2: Database connection
        database.ref('.info/connected').once('value')
            .then(snap => {
                const isConnected = snap.val() === true;
                addTestResult(testResults, 
                    isConnected, 
                    'Realtime Database connection', 
                    isConnected ? 'Successfully connected to Realtime Database' : 'Not connected to Realtime Database'
                );
            })
            .catch(error => {
                addTestResult(testResults, false, 'Realtime Database connection', error.message);
            });
        
        // Test 3: Write permission
        const testRef = database.ref('connection_test').push();
        testRef.set({
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            test: 'Connection test'
        })
            .then(() => {
                addTestResult(testResults, true, 'Database write permission', 'Successfully wrote test data to Firebase');
                
                // Clean up test data
                testRef.remove().catch(e => console.error('Error cleaning up test data:', e));
            })
            .catch(error => {
                addTestResult(testResults, false, 'Database write permission', error.message);
            });
            
        // Test 4: Read notes structure
        database.ref('notes').once('value')
            .then(snapshot => {
                const hasNotes = snapshot.exists();
                let message = hasNotes ? 
                    `Notes structure exists, found ${Object.keys(snapshot.val() || {}).length} semester(s)` : 
                    'Notes structure does not exist yet';
                
                addTestResult(testResults, true, 'Database notes structure', message);
            })
            .catch(error => {
                addTestResult(testResults, false, 'Database notes structure', error.message);
            });
    }, 1500);
}

/**
 * Add a test result item to the results list
 * @param {HTMLElement} container - The container to add the result to
 * @param {boolean} success - Whether the test was successful
 * @param {string} name - The name of the test
 * @param {string} message - The result message
 */
function addTestResult(container, success, name, message) {
    const item = document.createElement('li');
    item.innerHTML = `
        <span style="color: ${success ? 'var(--success-color)' : 'var(--danger-color)'}">
            <i class="fas ${success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            <strong>${name}:</strong>
        </span> 
        ${message}
    `;
    container.appendChild(item);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    const testFirebaseBtn = document.getElementById('test-firebase-btn');
    const manageAdminsBtn = document.getElementById('manage-admins-btn');
    const closeAdminModalBtn = document.getElementById('close-admin-modal');
    const addAdminForm = document.getElementById('add-admin-form');
    const addSubjectForm = document.getElementById('add-subject-form');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const closeSubjectModalBtn = document.getElementById('close-subject-modal');
    const cancelEditSubjectBtn = document.getElementById('cancel-edit-subject');
    const editSubjectForm = document.getElementById('edit-subject-form');
    
    if (testFirebaseBtn) {
        testFirebaseBtn.addEventListener('click', testFirebaseConnection);
    }
    
    if (manageAdminsBtn) {
        manageAdminsBtn.addEventListener('click', openAdminManagementModal);
    }
    
    if (closeAdminModalBtn) {
        closeAdminModalBtn.addEventListener('click', closeAdminManagementModal);
    }
    
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', handleAddAdmin);
    }
    
    if (addSubjectForm) {
        addSubjectForm.addEventListener('submit', handleAddSubject);
    }
    
    if (tabButtons) {
        tabButtons.forEach(button => {
            button.addEventListener('click', handleTabChange);
        });
    }
    
    if (closeSubjectModalBtn) {
        closeSubjectModalBtn.addEventListener('click', closeEditSubjectModal);
    }
    
    if (cancelEditSubjectBtn) {
        cancelEditSubjectBtn.addEventListener('click', closeEditSubjectModal);
    }
    
    if (editSubjectForm) {
        editSubjectForm.addEventListener('submit', handleEditSubject);
    }
});

/**
 * Open the admin management modal
 */
function openAdminManagementModal() {
    const adminManagementModal = document.getElementById('admin-management-modal');
    if (!adminManagementModal) return;
    
    // Show modal
    adminManagementModal.classList.remove('hidden');
    
    // Load admin list
    loadAdminList();
}

/**
 * Close the admin management modal
 */
function closeAdminManagementModal() {
    const adminManagementModal = document.getElementById('admin-management-modal');
    if (!adminManagementModal) return;
    
    // Hide modal
    adminManagementModal.classList.add('hidden');
}

/**
 * Load the list of administrators from Firebase
 */
function loadAdminList() {
    const adminListContainer = document.getElementById('admin-list');
    if (!adminListContainer) return;
    
    // Show loading
    adminListContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading administrators...</p>
        </div>
    `;
    
    // Get admins from Firebase
    database.ref('admins').once('value')
        .then(snapshot => {
            const admins = snapshot.val();
            
            if (!admins || Object.keys(admins).length === 0) {
                displayAdminEmptyList();
                return;
            }
            
            // Clear container
            adminListContainer.innerHTML = '';
            
            // Get permanent admin email from config
            database.ref('config/permanentAdmin').once('value')
                .then(permSnapshot => {
                    const permanentAdmin = permSnapshot.val();
                    
                    // Add each admin as an item
                    Object.keys(admins).forEach(key => {
                        const admin = admins[key];
                        const adminItem = createAdminItem(admin, key, permanentAdmin);
                        adminListContainer.appendChild(adminItem);
                    });
                });
        })
        .catch(error => {
            console.error('Error loading admins:', error);
            displayAdminEmptyList();
        });
}

/**
 * Display empty state for admin list
 */
function displayAdminEmptyList() {
    const adminListContainer = document.getElementById('admin-list');
    if (!adminListContainer) return;
    
    adminListContainer.innerHTML = `
        <div class="admin-empty-state">
            <i class="fas fa-user-slash" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h4>No administrators found</h4>
            <p>Add administrators using the form below.</p>
        </div>
    `;
}

/**
 * Create an admin item element
 * @param {Object} admin - The admin object
 * @param {string} adminId - The admin ID in Firebase
 * @param {string} permanentAdmin - The email of the permanent admin
 * @returns {HTMLElement} - The admin item element
 */
function createAdminItem(admin, adminId, permanentAdmin) {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.dataset.id = adminId;
    
    const isPermanent = admin.email === permanentAdmin || admin.isPermanent;
    const isSuperAdmin = admin.role === 'superadmin' || admin.email === permanentAdmin;
    
    item.innerHTML = `
        <div class="admin-info">
            <p class="admin-email">${admin.email}</p>
            <span class="admin-role ${isSuperAdmin ? 'superadmin' : ''} ${isPermanent ? 'permanent' : ''}">
                ${isPermanent ? 'Permanent ' : ''}${isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
        </div>
        ${!isPermanent ? `
        <div class="admin-actions">
            <button class="action-btn delete-btn" title="Remove Admin">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>` : ''}
    `;
    
    // Add event listener for delete button if not permanent
    if (!isPermanent) {
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => confirmDeleteAdmin(adminId, admin.email));
    }
    
    return item;
}

/**
 * Handle adding a new administrator
 * @param {Event} event - The form submission event
 */
function handleAddAdmin(event) {
    event.preventDefault();
    
    const email = document.getElementById('admin-email').value.trim();
    const role = document.getElementById('admin-role').value;
    
    // Simple validation
    if (!email) {
        alert('Please enter an email address');
        return;
    }
    
    // Check if email is valid
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#add-admin-form button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;
    
    // Show status
    const uploadStatus = document.getElementById('admin-update-status');
    const statusMessage = uploadStatus.querySelector('.status-message');
    const loadingIcon = uploadStatus.querySelector('.status-loading');
    const successIcon = uploadStatus.querySelector('.status-success');
    const errorIcon = uploadStatus.querySelector('.status-error');
    
    // Set initial status
    uploadStatus.classList.remove('hidden');
    loadingIcon.classList.remove('hidden');
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');
    statusMessage.textContent = 'Adding administrator...';
    
    // Create admin username from email (remove special chars)
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if admin already exists
    database.ref('admins').orderByChild('email').equalTo(email).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                throw new Error('An administrator with this email already exists');
            }
            
            // Add to Firebase
            return database.ref(`admins/${username}`).set({
                email: email,
                role: role,
                isPermanent: false,
                dateAdded: firebase.database.ServerValue.TIMESTAMP
            });
        })
        .then(() => {
            // Reset form
            document.getElementById('add-admin-form').reset();
            
            // Update status
            loadingIcon.classList.add('hidden');
            successIcon.classList.remove('hidden');
            statusMessage.textContent = 'Administrator added successfully!';
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            
            // Hide status after delay
            setTimeout(() => {
                uploadStatus.classList.add('hidden');
            }, 3000);
            
            // Reload admin list
            loadAdminList();
        })
        .catch(error => {
            console.error('Error adding admin:', error);
            
            // Update status
            loadingIcon.classList.add('hidden');
            errorIcon.classList.remove('hidden');
            statusMessage.textContent = 'Error: ' + error.message;
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            
            // Hide status after delay
            setTimeout(() => {
                uploadStatus.classList.add('hidden');
            }, 5000);
        });
}

/**
 * Confirm and delete an administrator
 * @param {string} adminId - The admin ID in Firebase
 * @param {string} email - The admin's email
 */
function confirmDeleteAdmin(adminId, email) {
    if (confirm(`Are you sure you want to remove ${email} as an administrator?`)) {
        // Create and show a toast notification for deletion status
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <div class="toast-message">Removing administrator...</div>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Delete from Firebase
        database.ref(`admins/${adminId}`).remove()
            .then(() => {
                // Update toast to show success
                toast.querySelector('.toast-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
                toast.querySelector('.toast-message').textContent = 'Administrator removed successfully';
                toast.querySelector('.toast-content').classList.add('success');
                
                // Hide toast after delay
                setTimeout(() => {
                    toast.classList.remove('show');
                    // Remove toast from DOM after hide animation
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 3000);
                
                // Reload admin list
                loadAdminList();
            })
            .catch(error => {
                console.error('Error removing admin:', error);
                
                // Update toast to show error
                toast.querySelector('.toast-icon').innerHTML = '<i class="fas fa-times-circle"></i>';
                toast.querySelector('.toast-message').textContent = 'Error: ' + error.message;
                toast.querySelector('.toast-content').classList.add('error');
                
                // Hide toast after delay
                setTimeout(() => {
                    toast.classList.remove('show');
                    // Remove toast from DOM after hide animation
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 5000);
            });
    }
}

/**
 * Handle tab change in the admin dashboard
 * @param {Event} event - The click event
 */
function handleTabChange(event) {
    const clickedTab = event.currentTarget;
    const tabId = clickedTab.dataset.tab;
    const tabContent = document.getElementById(tabId);
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    clickedTab.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    tabContent.classList.add('active');
    
    // If switching to subjects tab, load subjects
    if (tabId === 'subjects-tab') {
        const activeSemester = document.querySelector('.semester-item.active').dataset.sem;
        loadSubjects(activeSemester);
        
        // Update title
        const semNumber = activeSemester.replace('s', '');
        document.getElementById('current-subjects-title').textContent = `Semester ${semNumber} Subjects`;
    }
}

/**
 * Load subjects for a specific semester
 * @param {string} semester - The semester code (s1, s2, etc.)
 */
function loadSubjects(semester) {
    const subjectsContainer = document.getElementById('admin-subjects-list');
    if (!subjectsContainer) return;
    
    // Show loading
    subjectsContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading subjects...</p>
        </div>
    `;
    
    // Get subjects from Firebase
    database.ref(`subjects/${semester}`).once('value')
        .then(snapshot => {
            const subjects = snapshot.val();
            
            if (!subjects || subjects.length === 0) {
                displaySubjectsEmptyState(subjectsContainer);
                return;
            }
            
            // Clear container
            subjectsContainer.innerHTML = '';
            
            // Sort subjects by ID
            subjects.sort((a, b) => a.id - b.id);
            
            // Add each subject as an item
            subjects.forEach(subject => {
                const subjectItem = createSubjectItem(subject, semester);
                subjectsContainer.appendChild(subjectItem);
            });
        })
        .catch(error => {
            console.error('Error loading subjects:', error);
            displaySubjectsError(subjectsContainer);
        });
}

/**
 * Create a subject item element
 * @param {Object} subject - The subject object
 * @param {string} semester - The semester code
 * @returns {HTMLElement} - The subject item element
 */
function createSubjectItem(subject, semester) {
    const item = document.createElement('div');
    item.className = 'subject-item';
    item.dataset.id = subject.id;
    
    item.innerHTML = `
        <div class="subject-info">
            <span class="subject-id">${subject.id}</span>
            <span class="subject-name">${subject.name}</span>
        </div>
        <div class="subject-actions">
            <button class="action-btn edit-btn" title="Edit Subject">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete-btn" title="Delete Subject">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    
    // Add event listeners
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    
    editBtn.addEventListener('click', () => openEditSubjectModal(subject, semester));
    deleteBtn.addEventListener('click', () => confirmDeleteSubject(subject.id, semester));
    
    return item;
}

/**
 * Display empty state for subjects
 * @param {HTMLElement} container - The container element
 */
function displaySubjectsEmptyState(container) {
    container.innerHTML = `
        <div class="admin-empty-state">
            <i class="fas fa-book-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h4>No subjects found</h4>
            <p>Add subjects using the form below.</p>
        </div>
    `;
}

/**
 * Display error state for subjects
 * @param {HTMLElement} container - The container element
 */
function displaySubjectsError(container) {
    container.innerHTML = `
        <div class="admin-error-state">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h4>Error loading subjects</h4>
            <p>There was a problem loading the subjects. Please try again.</p>
        </div>
    `;
}

/**
 * Handle adding a new subject
 * @param {Event} event - The form submission event
 */
function handleAddSubject(event) {
    event.preventDefault();
    
    const subjectName = document.getElementById('subject-name').value.trim();
    const activeSemester = document.querySelector('.semester-item.active').dataset.sem;
    
    // Simple validation
    if (!subjectName) {
        alert('Please enter a subject name');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#add-subject-form button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;
    
    // Show status
    const uploadStatus = document.getElementById('subject-upload-status');
    const statusMessage = uploadStatus.querySelector('.status-message');
    const loadingIcon = uploadStatus.querySelector('.status-loading');
    const successIcon = uploadStatus.querySelector('.status-success');
    const errorIcon = uploadStatus.querySelector('.status-error');
    
    // Set initial status
    uploadStatus.classList.remove('hidden');
    loadingIcon.classList.remove('hidden');
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');
    statusMessage.textContent = 'Adding subject...';
    
    // Get current subjects to determine the next ID
    database.ref(`subjects/${activeSemester}`).once('value')
        .then(snapshot => {
            const subjects = snapshot.val() || [];
            
            // Find the highest ID
            let maxId = 0;
            subjects.forEach(subject => {
                if (subject && subject.id > maxId) {
                    maxId = subject.id;
                }
            });
            
            // Create new subject with ID incremented by 1
            const newSubject = {
                id: maxId + 1,
                name: subjectName
            };
            
            // Add new subject to the array
            subjects.push(newSubject);
            
            // Update Firebase
            return database.ref(`subjects/${activeSemester}`).set(subjects);
        })
        .then(() => {
            // Reset form
            document.getElementById('add-subject-form').reset();
            
            // Update status
            loadingIcon.classList.add('hidden');
            successIcon.classList.remove('hidden');
            statusMessage.textContent = 'Subject added successfully!';
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            
            // Hide status after delay
            setTimeout(() => {
                uploadStatus.classList.add('hidden');
            }, 3000);
            
            // Reload subjects
            loadSubjects(activeSemester);
        })
        .catch(error => {
            console.error('Error adding subject:', error);
            
            // Update status
            loadingIcon.classList.add('hidden');
            errorIcon.classList.remove('hidden');
            statusMessage.textContent = 'Error: ' + error.message;
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            
            // Hide status after delay
            setTimeout(() => {
                uploadStatus.classList.add('hidden');
            }, 5000);
        });
}

/**
 * Open modal to edit a subject
 * @param {Object} subject - The subject object
 * @param {string} semester - The semester code
 */
function openEditSubjectModal(subject, semester) {
    const editSubjectModal = document.getElementById('edit-subject-modal');
    const editSubjectNameInput = document.getElementById('edit-subject-name');
    const editSubjectIdInput = document.getElementById('edit-subject-id');
    const editSubjectSemesterInput = document.getElementById('edit-subject-semester');
    
    if (!editSubjectModal || !editSubjectNameInput || !editSubjectIdInput || !editSubjectSemesterInput) return;
    
    // Set form values
    editSubjectNameInput.value = subject.name;
    editSubjectIdInput.value = subject.id;
    editSubjectSemesterInput.value = semester;
    
    // Show modal
    editSubjectModal.classList.remove('hidden');
}

/**
 * Close the edit subject modal
 */
function closeEditSubjectModal() {
    const editSubjectModal = document.getElementById('edit-subject-modal');
    if (!editSubjectModal) return;
    
    editSubjectModal.classList.add('hidden');
}

/**
 * Handle editing a subject
 * @param {Event} event - The form submission event
 */
function handleEditSubject(event) {
    event.preventDefault();
    
    const subjectName = document.getElementById('edit-subject-name').value.trim();
    const subjectId = parseInt(document.getElementById('edit-subject-id').value);
    const semester = document.getElementById('edit-subject-semester').value;
    
    // Simple validation
    if (!subjectName) {
        alert('Please enter a subject name');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#edit-subject-form button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    // Show status
    const uploadStatus = document.getElementById('edit-subject-status');
    const statusMessage = uploadStatus.querySelector('.status-message');
    const loadingIcon = uploadStatus.querySelector('.status-loading');
    const successIcon = uploadStatus.querySelector('.status-success');
    const errorIcon = uploadStatus.querySelector('.status-error');
    
    // Set initial status
    uploadStatus.classList.remove('hidden');
    loadingIcon.classList.remove('hidden');
    successIcon.classList.add('hidden');
    errorIcon.classList.add('hidden');
    statusMessage.textContent = 'Updating subject...';
    
    // Get current subjects
    database.ref(`subjects/${semester}`).once('value')
        .then(snapshot => {
            const subjects = snapshot.val() || [];
            
            // Find the subject by ID
            const subjectIndex = subjects.findIndex(subject => subject.id === subjectId);
            
            if (subjectIndex === -1) {
                throw new Error('Subject not found');
            }
            
            // Update the subject name
            subjects[subjectIndex].name = subjectName;
            
            // Update Firebase
            return database.ref(`subjects/${semester}`).set(subjects);
        })
        .then(() => {
            // Update status
            loadingIcon.classList.add('hidden');
            successIcon.classList.remove('hidden');
            statusMessage.textContent = 'Subject updated successfully!';
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            
            // Close modal after delay
            setTimeout(() => {
                closeEditSubjectModal();
                
                // Reload subjects
                loadSubjects(semester);
            }, 2000);
        })
        .catch(error => {
            console.error('Error updating subject:', error);
            
            // Update status
            loadingIcon.classList.add('hidden');
            errorIcon.classList.remove('hidden');
            statusMessage.textContent = 'Error: ' + error.message;
            
            // Reset button
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        });
}

/**
 * Confirm and delete a subject
 * @param {number} subjectId - The subject ID
 * @param {string} semester - The semester code
 */
function confirmDeleteSubject(subjectId, semester) {
    if (confirm(`Are you sure you want to delete this subject? This will also delete all associated notes and videos.`)) {
        // Create and show a toast notification for deletion status
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <div class="toast-message">Deleting subject...</div>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Get current subjects
        database.ref(`subjects/${semester}`).once('value')
            .then(snapshot => {
                const subjects = snapshot.val() || [];
                
                // Filter out the subject to delete
                const updatedSubjects = subjects.filter(subject => subject.id !== subjectId);
                
                // Update Firebase
                return database.ref(`subjects/${semester}`).set(updatedSubjects);
            })
            .then(() => {
                // Update toast to show success
                toast.querySelector('.toast-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
                toast.querySelector('.toast-message').textContent = 'Subject deleted successfully';
                toast.querySelector('.toast-content').classList.add('success');
                
                // Hide toast after delay
                setTimeout(() => {
                    toast.classList.remove('show');
                    // Remove toast from DOM after hide animation
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 3000);
                
                // Reload subjects
                loadSubjects(semester);
            })
            .catch(error => {
                console.error('Error deleting subject:', error);
                
                // Update toast to show error
                toast.querySelector('.toast-icon').innerHTML = '<i class="fas fa-times-circle"></i>';
                toast.querySelector('.toast-message').textContent = 'Error: ' + error.message;
                toast.querySelector('.toast-content').classList.add('error');
                
                // Hide toast after delay
                setTimeout(() => {
                    toast.classList.remove('show');
                    // Remove toast from DOM after hide animation
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 5000);
            });
    }
}
