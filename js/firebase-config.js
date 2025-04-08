// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAT9_9uP7TrAjEKcl6cwkZh9vObpzJKk5s",
    authDomain: "kknotes-3f24e.firebaseapp.com",
    databaseURL: "https://kknotes-3f24e-default-rtdb.firebaseio.com",
    projectId: "kknotes-3f24e",
    storageBucket: "kknotes-3f24e.appspot.com",
    appId: "1:254324523644:web:85d5e04ee01b85c4a5a902"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();

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
