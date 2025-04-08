// Main JavaScript for the KKNotes application

// DOM Elements
const semesterTabs = document.querySelectorAll('.sem-tab');
const notesContainer = document.getElementById('notes-container');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

// Current active semester
let currentSemester = 's1'; // Default to S1

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
semesterTabs.forEach(tab => tab.addEventListener('click', handleSemesterChange));
if (menuToggle) menuToggle.addEventListener('click', toggleMobileMenu);

/**
 * Initialize the application
 */
function initialize() {
    // Load notes for the default semester (S1)
    loadNotes(currentSemester);
    
    // Add scroll event for navbar
    window.addEventListener('scroll', handleScroll);
    
    // Set active nav link based on current section
    setupScrollSpy();
}

/**
 * Load notes for a specific semester
 * @param {string} semester - The semester code (s1, s2, etc.)
 */
function loadNotes(semester) {
    // Show loading spinner
    notesContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading notes...</p>
        </div>
    `;
    
    // Set a timeout to handle potential long loading times
    const timeoutId = setTimeout(() => {
        console.warn('Firebase request taking longer than expected, might be connection issues');
    }, 5000);
    
    // Get notes from Firebase
    database.ref(`notes/${semester}`).once('value')
        .then(snapshot => {
            clearTimeout(timeoutId);
            const notes = snapshot.val();
            if (notes) {
                console.log(`Successfully loaded notes for ${semester}`);
            } else {
                console.log(`No notes found for ${semester}`);
            }
            displayNotes(notes);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            console.error('Error loading notes:', error);
            displayError();
            
            // Try to recover
            setTimeout(() => {
                console.log('Attempting to recover from Firebase error...');
                try {
                    database.goOffline();
                    setTimeout(() => {
                        database.goOnline();
                        console.log('Firebase reconnected');
                    }, 1000);
                } catch (reconnectError) {
                    console.error('Could not reconnect to Firebase:', reconnectError);
                }
            }, 2000);
        });
}

/**
 * Display notes in the container
 * @param {Object} notes - The notes object from Firebase
 */
function displayNotes(notes) {
    if (!notes || Object.keys(notes).length === 0) {
        displayEmptyState();
        return;
    }
    
    // Create notes list container
    const notesList = document.createElement('div');
    notesList.className = 'notes-list';
    
    // Add each note as a card
    Object.keys(notes).forEach(key => {
        const note = notes[key];
        const noteCard = createNoteCard(note);
        notesList.appendChild(noteCard);
    });
    
    // Clear container and add notes list
    notesContainer.innerHTML = '';
    notesContainer.appendChild(notesList);
}

/**
 * Create a note card element
 * @param {Object} note - The note object
 * @returns {HTMLElement} - The note card element
 */
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    
    card.innerHTML = `
        <h3>${note.title}</h3>
        <a href="${note.link}" target="_blank" rel="noopener noreferrer">
            <i class="fas fa-external-link-alt"></i> Open in Google Drive
        </a>
    `;
    
    return card;
}

/**
 * Display empty state when no notes are found
 */
function displayEmptyState() {
    notesContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-file-alt" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>No notes found</h3>
            <p>There are no notes available for this semester yet.</p>
        </div>
    `;
}

/**
 * Display error state when notes can't be loaded
 */
function displayError() {
    notesContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--warning-color);"></i>
            <h3>Failed to load notes</h3>
            <p>There was a problem loading the notes. Please try again later.</p>
        </div>
    `;
}

/**
 * Handle semester tab change
 * @param {Event} event - The click event
 */
function handleSemesterChange(event) {
    const semester = event.target.dataset.sem;
    
    // Update active tab
    semesterTabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update current semester and load notes
    currentSemester = semester;
    loadNotes(semester);
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    navLinks.classList.toggle('active');
    
    // Toggle icon
    const icon = menuToggle.querySelector('i');
    if (navLinks.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

/**
 * Handle scroll event for navbar styling
 */
function handleScroll() {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.boxShadow = 'var(--shadow-md)';
    } else {
        header.style.boxShadow = 'var(--shadow-sm)';
    }
}

/**
 * Setup scroll spy to highlight active nav link
 */
function setupScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a:not(.admin-link)');
    
    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}
