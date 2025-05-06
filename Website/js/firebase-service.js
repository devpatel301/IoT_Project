// firebase-service.js - Firebase connection and data handling

// Global variables
let database = null;
let isConnected = false;
let isSimulating = false;
let simulationInterval = null;
let isDataListenerStarted = false;

// Initialize Firebase and set up connection handling
function initializeFirebase() {
  try {
    const app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();

    // Check Firebase connection status
    const connectedRef = database.ref(".info/connected");
    connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        updateConnectionStatus("connected");
        console.log("Connected to Firebase");

        // Start data listener once connected
        if (!isDataListenerStarted) {
          startDataListener();
          isDataListenerStarted = true;
        }

        // Load existing logs once connected
        loadAllLogs();
      } else {
        updateConnectionStatus("disconnected");
        console.log("Disconnected from Firebase");
      }
    });

    return database;
  } catch (error) {
    console.error("Firebase initialization error:", error);

    // Show error indication if Firebase initialization fails
    const indicator = document.getElementById("status-indicator");
    const text = document.getElementById("connection-text");
    if (indicator && text) {
      indicator.className = "disconnected";
      text.textContent = "Firebase Error";
    }

    return null;
  }
}

// Load all logs from Firebase up to 10000 entries
function loadAllLogs() {
  if (!database) return;
  const sensorDataRef = database.ref("sensorData");
  const recentDataQuery = sensorDataRef.limitToLast(10000);
  console.log("Loading logs from Firebase...");

  recentDataQuery
    .once("value")
    .then((snapshot) => {
      console.log("Logs loaded from Firebase");
      const logs = [];
      snapshot.forEach((childSnapshot) => {
        const log = childSnapshot.val();
        log.id = childSnapshot.key;

        // Handle legacy data format by adding missing fields
        if (!log.mode) {
          log.mode = log.irState ? 3 : 1; // Default to IR mode if irState exists, otherwise Smart Home
        }
        if (!log["Flex Sensor"] && log.flexState !== undefined) {
          log["Flex Sensor"] = log.flexState ? "BENT" : "STRAIGHT";
        }
        if (!log["IR Sensor"] && log.irState !== undefined) {
          log["IR Sensor"] = log.irState ? "ON" : "OFF";
        }

        logs.push(log);
      });

      allLogs = logs.sort((a, b) => b.timestamp - a.timestamp);
      updateLogsTable();
    })
    .catch((error) => console.error("Error loading logs:", error));
}

// Listen for new data from Firebase
function startDataListener() {
  if (!database) return;

  const sensorDataRef = database.ref("sensorData");
  const recentDataQuery = sensorDataRef.limitToLast(20);

  recentDataQuery.on(
    "child_added",
    (snapshot) => {
      const data = snapshot.val();
      data.id = snapshot.key;
      console.log("New sensor data received:", data);

      updateDataTable(data);
    },
    (error) => {
      console.error("Error fetching sensor data:", error);
    }
  );
}
