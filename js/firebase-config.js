// Firebase configuration
const firebaseConfig = {
    apiKey: FIREBASE_API_KEY,
    authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: `${FIREBASE_PROJECT_ID}.firebasestorage.app`,
    databaseURL: `https://${FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
    appId: FIREBASE_APP_ID
};

// Initialize Firebase
if (!firebase.apps.length) {
    try {
        console.log('Initializing Firebase with config:', JSON.stringify(firebaseConfig));
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        alert('Error connecting to Firebase: ' + error.message);
    }
} else {
    firebase.app(); // if already initialized
    console.log('Using existing Firebase app');
}

// Get a reference to the database service
const database = firebase.database();
const auth = firebase.auth();
let currentUser = null;

// Default subjects for each semester
const defaultSubjects = {
    s1: ["Introduction to Programming", "Digital Logic", "Mathematics I", "Physics", "Communication Skills"],
    s2: ["Data Structures", "Object-Oriented Programming", "Mathematics II", "Computer Organization", "Environmental Studies"],
    s3: ["Computer Networks", "Operating Systems", "Database Management", "Theory of Computation", "Web Technologies"],
    s4: ["Design and Analysis of Algorithms", "Computer Architecture", "Software Engineering", "Web Development", "Probability and Statistics"],
    s5: ["Artificial Intelligence", "Computer Graphics", "Information Security", "Cloud Computing", "Professional Ethics"],
    s6: ["Machine Learning", "Data Mining", "Mobile Application Development", "Compiler Design", "Data Warehousing"],
    s7: ["Big Data Analytics", "Deep Learning", "Internet of Things", "Blockchain Technology", "Project Management"],
    s8: ["Natural Language Processing", "Augmented Reality", "Parallel Computing", "Quantum Computing", "Capstone Project"]
};

// Test database connection
console.log('Testing Firebase database connection...');
database.ref('.info/connected').once('value')
    .then(snap => {
        console.log('Firebase connection test result:', snap.val());
        if (snap.val() === true) {
            console.log('✅ Successfully connected to Firebase!');
        } else {
            console.log('❌ Not connected to Firebase database');
        }
    })
    .catch(error => {
        console.error('❌ Firebase connection test failed:', error);
    });

// Configure connection monitoring
firebase.database().ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log('Connected to Firebase');
    } else {
        console.log('Disconnected from Firebase');
    }
});

// Function to initialize database with proper structure
function initializeDatabase() {
    // Check if the system configuration exists
    database.ref('config').once('value', configSnapshot => {
        if (!configSnapshot.exists()) {
            // Create initial configuration
            const initialConfig = {
                permanentAdmin: "christopherjoshy4@gmail.com",
                version: "1.0.0",
                lastUpdated: firebase.database.ServerValue.TIMESTAMP,
                features: {
                    googleAuth: true,
                    youtubeVideos: true,
                    nightMode: true
                }
            };
            
            // Set configuration
            database.ref('config').set(initialConfig)
                .then(() => console.log('Configuration initialized'))
                .catch(error => console.error('Error initializing configuration:', error));
        }
    });
    
    // Check if admins collection exists
    database.ref('admins').once('value', adminsSnapshot => {
        if (!adminsSnapshot.exists()) {
            // Create permanent admin
            const admins = {
                'christopherjoshy4': {
                    email: "christopherjoshy4@gmail.com",
                    role: "superadmin",
                    isPermanent: true,
                    dateAdded: firebase.database.ServerValue.TIMESTAMP
                }
            };
            
            // Set admins
            database.ref('admins').set(admins)
                .then(() => console.log('Admin users initialized'))
                .catch(error => console.error('Error initializing admin users:', error));
        }
    });
    
    // Check if subjects collection exists
    database.ref('subjects').once('value', subjectsSnapshot => {
        if (!subjectsSnapshot.exists()) {
            // Set default subjects
            database.ref('subjects').set(defaultSubjects)
                .then(() => console.log('Default subjects initialized'))
                .catch(error => console.error('Error initializing subjects:', error));
        }
    });
    
    // Check if notes structure exists
    database.ref('notes').once('value', notesSnapshot => {
        if (!notesSnapshot.exists()) {
            // Create structure for notes organized by semester and subject
            const notesStructure = {};
            
            // Create empty structure for each semester
            for (let i = 1; i <= 8; i++) {
                const semester = `s${i}`;
                notesStructure[semester] = {};
                
                // Create empty structure for default subjects in this semester
                defaultSubjects[semester].forEach(subject => {
                    // Create a safe key for the subject
                    const subjectKey = subject.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    notesStructure[semester][subjectKey] = {};
                });
            }
            
            // Set notes structure
            database.ref('notes').set(notesStructure)
                .then(() => console.log('Notes structure initialized'))
                .catch(error => console.error('Error initializing notes structure:', error));
        }
    });
    
    // Check if videos structure exists
    database.ref('videos').once('value', videosSnapshot => {
        if (!videosSnapshot.exists()) {
            // Create structure for videos organized by semester and subject
            const videosStructure = {};
            
            // Create empty structure for each semester
            for (let i = 1; i <= 8; i++) {
                const semester = `s${i}`;
                videosStructure[semester] = {};
                
                // Create empty structure for default subjects in this semester
                defaultSubjects[semester].forEach(subject => {
                    // Create a safe key for the subject
                    const subjectKey = subject.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    videosStructure[semester][subjectKey] = {};
                });
            }
            
            // Set videos structure
            database.ref('videos').set(videosStructure)
                .then(() => console.log('Videos structure initialized'))
                .catch(error => console.error('Error initializing videos structure:', error));
        }
    });
}

// Helper function to check if a user is an admin
function isUserAdmin(email) {
    return new Promise((resolve, reject) => {
        if (!email) {
            resolve(false);
            return;
        }
        
        // Extract the username part of the email
        const username = email.split('@')[0];
        
        // Check if user is in admins list
        database.ref('admins').orderByChild('email').equalTo(email).once('value')
            .then(snapshot => {
                resolve(snapshot.exists());
            })
            .catch(error => {
                console.error('Error checking admin status:', error);
                reject(error);
            });
    });
}

// Helper function to check if user is a super admin (permanent)
function isUserSuperAdmin(email) {
    return new Promise((resolve, reject) => {
        if (!email) {
            resolve(false);
            return;
        }
        
        // Check if user is the permanent admin
        database.ref('config/permanentAdmin').once('value')
            .then(snapshot => {
                if (snapshot.exists() && snapshot.val() === email) {
                    resolve(true);
                } else {
                    // Check if user has superadmin role
                    database.ref('admins').orderByChild('email').equalTo(email).once('value')
                        .then(adminSnapshot => {
                            if (adminSnapshot.exists()) {
                                let isSuperAdmin = false;
                                adminSnapshot.forEach(childSnapshot => {
                                    if (childSnapshot.val().role === 'superadmin') {
                                        isSuperAdmin = true;
                                    }
                                });
                                resolve(isSuperAdmin);
                            } else {
                                resolve(false);
                            }
                        });
                }
            })
            .catch(error => {
                console.error('Error checking super admin status:', error);
                reject(error);
            });
    });
}

// Helper function to convert a subject name to a database key
function subjectToKey(subject) {
    return subject.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Helper function to convert a database key to a readable subject name
function keyToSubject(key, semester) {
    // First check if we can find the original name in the subjects list
    return new Promise((resolve) => {
        database.ref(`subjects/${semester}`).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const subjects = snapshot.val();
                    for (let i = 0; i < subjects.length; i++) {
                        if (subjectToKey(subjects[i]) === key) {
                            resolve(subjects[i]);
                            return;
                        }
                    }
                }
                // If not found, convert key to a readable form
                resolve(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
            })
            .catch(() => {
                // Fallback to basic formatting
                resolve(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
            });
    });
}

// Auth state change monitoring
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        console.log('User signed in:', user.email);
        // Check admin status when user signs in
        isUserAdmin(user.email).then(admin => {
            if (admin) {
                console.log('User is an admin');
                sessionStorage.setItem('isAdmin', 'true');
            } else {
                console.log('User is not an admin');
                sessionStorage.setItem('isAdmin', 'false');
            }
        });
    } else {
        console.log('User signed out');
        sessionStorage.removeItem('isAdmin');
    }
});

// Initialize database when the app loads
document.addEventListener('DOMContentLoaded', initializeDatabase);
