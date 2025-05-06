// main.js - Main application initialization

// Wait for DOM content to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Set current year in footer
  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  // Initialize the application
  initializeApp();

  // Listen for simulation button click
  const simulationButton = document.getElementById("simulation-toggle");
  if (simulationButton) {
    simulationButton.addEventListener("click", toggleSimulation);
  }
});

// Initialize the application
function initializeApp() {
  try {
    // Initialize Firebase
    const database = initializeFirebase();

    // Create gesture cards
    createGestureCards();

    // Initialize the smart home system
    initializeSmartHome();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    console.log("Application initialized successfully");
  } catch (error) {
    console.error("Application initialization error:", error);

    // Still initialize the UI components even if Firebase fails
    createGestureCards();
    initializeSmartHome();
    setupKeyboardShortcuts();
  }
}
