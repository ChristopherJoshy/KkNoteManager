// Main JavaScript for the KKNotes application

// DOM Elements
const semesterTabs = document.querySelectorAll('.sem-tab');
const notesContainer = document.getElementById('notes-container');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

// Current active semester and subject
let currentSemester = 's1'; // Default to S1
let currentSubject = null; // No subject selected by default

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
 * @param {string} subject - Optional subject key to filter notes by
 */
function loadNotes(semester, subject = null) {
    // Reset current subject if loading a different semester
    if (currentSubject !== subject) {
        currentSubject = subject;
    }
    
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
    
    // Check if we should load subjects or notes
    if (!subject) {
        // Load subjects for this semester
        database.ref(`subjects/${semester}`).once('value')
            .then(snapshot => {
                clearTimeout(timeoutId);
                const subjects = snapshot.val();
                if (subjects) {
                    console.log(`Successfully loaded subjects for ${semester}`);
                    displaySubjects(subjects, semester);
                } else {
                    console.log(`No subjects found for ${semester}`);
                    displayEmptyState('No subjects found for this semester.');
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('Error loading subjects:', error);
                displayError();
                
                // Try to recover
                recoverFirebaseConnection();
            });
    } else {
        // Load notes for specific subject
        database.ref(`notes/${semester}/${subject}`).once('value')
            .then(snapshot => {
                clearTimeout(timeoutId);
                const notes = snapshot.val();
                if (notes) {
                    console.log(`Successfully loaded notes for ${semester}/${subject}`);
                    displayNotes(notes, semester, subject);
                } else {
                    console.log(`No notes found for ${semester}/${subject}`);
                    displayEmptyState(`No notes found for this subject.`);
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('Error loading notes:', error);
                displayError();
                
                // Try to recover
                recoverFirebaseConnection();
            });
    }
}

/**
 * Try to recover from Firebase connection issues
 */
function recoverFirebaseConnection() {
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
}

/**
 * Display subjects for a semester
 * @param {Array} subjects - The subjects array from Firebase
 * @param {string} semester - The current semester code
 */
function displaySubjects(subjects, semester) {
    // Create container for subjects
    const subjectsContainer = document.createElement('div');
    subjectsContainer.className = 'subjects-container';
    
    // Add semester title
    const semTitle = document.createElement('h3');
    semTitle.className = 'semester-title';
    semTitle.textContent = `Semester ${semester.substring(1)} Subjects`;
    subjectsContainer.appendChild(semTitle);
    
    // Create subject list
    const subjectsList = document.createElement('div');
    subjectsList.className = 'subjects-list';
    
    // Create back button for mobile (only shown when viewing notes)
    const backButton = document.createElement('button');
    backButton.className = 'back-button hidden';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Subjects';
    backButton.addEventListener('click', () => {
        currentSubject = null;
        loadNotes(currentSemester);
    });
    subjectsContainer.appendChild(backButton);
    
    // Add each subject as a button
    subjects.forEach(subject => {
        const subjectBtn = document.createElement('button');
        subjectBtn.className = 'subject-btn';
        subjectBtn.dataset.subject = subjectToKey(subject.name);
        subjectBtn.dataset.id = subject.id;
        subjectBtn.textContent = subject.name;
        
        // Add click event to load notes for this subject
        subjectBtn.addEventListener('click', handleSubjectClick);
        
        subjectsList.appendChild(subjectBtn);
    });
    
    subjectsContainer.appendChild(subjectsList);
    
    // Clear container and add subjects
    notesContainer.innerHTML = '';
    notesContainer.appendChild(subjectsContainer);
}

/**
 * Handle subject button click
 * @param {Event} event - The click event
 */
function handleSubjectClick(event) {
    const subject = event.target.dataset.subject;
    const subjectName = event.target.textContent;
    
    // Update active subject button
    const subjectBtns = document.querySelectorAll('.subject-btn');
    subjectBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show back button on mobile
    const backButton = document.querySelector('.back-button');
    if (backButton) backButton.classList.remove('hidden');
    
    // Load notes for this subject
    loadNotes(currentSemester, subject);
}

/**
 * Display notes in the container
 * @param {Object} notes - The notes object from Firebase
 * @param {string} semester - The current semester code
 * @param {string} subject - The current subject key
 */
function displayNotes(notes, semester, subject) {
    if (!notes || Object.keys(notes).length === 0) {
        displayEmptyState(`No notes found for this subject.`);
        return;
    }
    
    // Get the subject container and show back button
    const subjectsContainer = document.querySelector('.subjects-container');
    const backButton = document.querySelector('.back-button');
    if (backButton) backButton.classList.remove('hidden');
    
    // Create notes list container
    const notesList = document.createElement('div');
    notesList.className = 'notes-list';
    
    // Add subject title
    const subjectTitle = document.createElement('h3');
    subjectTitle.className = 'subject-title';
    keyToSubject(subject, semester).then(readableSubject => {
        subjectTitle.textContent = readableSubject;
    });
    notesList.appendChild(subjectTitle);
    
    // Add each note as a card
    Object.keys(notes).forEach(key => {
        const note = notes[key];
        const noteCard = createNoteCard(note);
        notesList.appendChild(noteCard);
    });
    
    // Clear notes area (keeping subject list)
    const existingNotesList = document.querySelector('.notes-list');
    if (existingNotesList) {
        existingNotesList.remove();
    }
    
    // Add the notes list
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
 * Display empty state with custom message
 * @param {string} message - Custom message to display
 */
function displayEmptyState(message = 'There are no notes available for this semester yet.') {
    // If we're viewing a subject, only update the notes area
    const existingSubjectsContainer = document.querySelector('.subjects-container');
    const existingNotesList = document.querySelector('.notes-list');
    
    if (currentSubject && existingSubjectsContainer && existingNotesList) {
        existingNotesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>No notes found</h3>
                <p>${message}</p>
            </div>
        `;
    } else {
        // Otherwise, update the entire container
        notesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>No notes found</h3>
                <p>${message}</p>
            </div>
        `;
    }
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
