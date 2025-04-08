// Environment configuration for Firebase
const FIREBASE_API_KEY = localStorage.getItem('FIREBASE_API_KEY') || "AIzaSyAlAY9u4uXiY0ig7qu-9U9_34Atpw7diZg";
const FIREBASE_PROJECT_ID = localStorage.getItem('FIREBASE_PROJECT_ID') || "kknotes-538ee";
const FIREBASE_APP_ID = localStorage.getItem('FIREBASE_APP_ID') || "1:525574938875:web:062f24c6a0df05fff5905e";

// Display error message if Firebase configuration is missing
if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !FIREBASE_APP_ID) {
    console.error('Firebase configuration is missing. Please set the required environment variables.');
    
    // Show setup instructions if in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.info('Development setup: You can set Firebase config in localStorage for testing:');
        console.info('localStorage.setItem("FIREBASE_API_KEY", "your-api-key");');
        console.info('localStorage.setItem("FIREBASE_PROJECT_ID", "your-project-id");');
        console.info('localStorage.setItem("FIREBASE_APP_ID", "your-app-id");');
    }
}