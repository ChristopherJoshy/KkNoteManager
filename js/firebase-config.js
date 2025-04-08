// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAlAY9u4uXiY0ig7qu-9U9_34Atpw7diZg",
    authDomain: "kknotes-538ee.firebaseapp.com",
    projectId: "kknotes-538ee",
    storageBucket: "kknotes-538ee.firebasestorage.app",
    messagingSenderId: "525574938875",
    appId: "1:525574938875:web:062f24c6a0df05fff5905e",
    databaseURL: "https://kknotes-538ee-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // if already initialized
}

// Get a reference to the database service
const database = firebase.database();

// Configure connection monitoring
firebase.database().ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log('Connected to Firebase');
    } else {
        console.log('Disconnected from Firebase');
    }
});

// Function to initialize database with default structure if empty
function initializeDatabase() {
    // Check if the notes collection exists
    database.ref('notes').once('value', snapshot => {
        if (!snapshot.exists()) {
            // Create default structure for semesters S1-S8
            const defaultSemesters = {};
            
            for (let i = 1; i <= 8; i++) {
                defaultSemesters[`s${i}`] = {
                    // Sample note to show structure
                    sample: {
                        title: `Sample S${i} Note`,
                        link: "https://drive.google.com/sample-link",
                    }
                };
            }
            
            // Set default data
            database.ref('notes').set(defaultSemesters)
                .then(() => console.log('Database initialized with default structure'))
                .catch(error => console.error('Error initializing database:', error));
        }
    });
}

// Initialize database when the app loads
document.addEventListener('DOMContentLoaded', initializeDatabase);
