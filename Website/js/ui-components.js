// ui-components.js - UI rendering and updates

// Global variables for UI
let confirmationModal = null;
let allLogs = [];

let flexStateHistory = [];
let lastFlexState = null;
let lastFlexChangeTime = 0;

// Update flex sensor state in UI and check for patterns
function updateFlexSensorState(flexState) {
  const flexStateElement = document.getElementById("flex-state");
  if (flexStateElement) {
    flexStateElement.textContent = flexState ? "BENT" : "STRAIGHT";
    flexStateElement.className =
      "state-value " + (flexState ? "active" : "inactive");
  }

  // Track flex sensor state changes for double bend detection
  const now = Date.now();

  // Only register state change if it actually changed
  if (lastFlexState !== null && flexState !== lastFlexState) {
    // Add to history
    flexStateHistory.push({
      state: flexState,
      time: now,
    });

    // Keep only recent history (last 2 seconds)
    flexStateHistory = flexStateHistory.filter(
      (entry) => now - entry.time < 2000
    );

    // Check for double bend pattern: STRAIGHT -> BENT -> STRAIGHT -> BENT
    // within a 2 second window
    if (flexStateHistory.length >= 4) {
      const states = flexStateHistory.slice(-4).map((entry) => entry.state);
      if (!states[0] && states[1] && !states[2] && states[3]) {
        console.log("Double bend pattern detected!");
        window.flexPatternDetected = true;

        // Clear the history after detection
        flexStateHistory = [];
      }
    }
  }

  lastFlexState = flexState;
  lastFlexChangeTime = now;
}

// Update connection status UI
function updateConnectionStatus(status) {
  const indicator = document.getElementById("status-indicator");
  const text = document.getElementById("connection-text");

  if (status === "connected") {
    indicator.className = "connected";
    text.textContent = "Connected";
    isConnected = true;
  } else if (status === "disconnected") {
    indicator.className = "disconnected";
    text.textContent = "Disconnected";
    isConnected = false;
  } else {
    indicator.className = "";
    text.textContent = "Connecting...";
    isConnected = false;
  }
}

// Format timestamp to readable format
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// Format flex values as string
function formatFlexValues(flexValues) {
  if (!flexValues || !Array.isArray(flexValues)) return "N/A";
  return flexValues.map((value) => `${value}%`).join(", ");
}

// Format IMU data
function formatIMU(imu) {
  if (!imu) return "N/A";
  return `P: ${imu.pitch}Â°, R: ${imu.roll}Â°, Y: ${imu.yaw}Â°`;
}

// Create gesture cards in UI
function createGestureCards() {
  const grid = document.getElementById("gesture-grid");
  if (!grid) return;
  grid.innerHTML = "";
  // use the gestures[] from config.js
  gestures.forEach((name) => {
    const card = document.createElement("div");
    card.className = "gesture-card";
    card.id = `gesture-${name.replace(/\s+/g, "-").toLowerCase()}`;
    const h4 = document.createElement("h4");
    h4.textContent = name;
    const p = document.createElement("p");
    p.className = "gesture-description";
    p.textContent = gestureDescriptions[name] || "";
    card.appendChild(h4);
    card.appendChild(p);
    grid.appendChild(card);
  });
}

// Helper function to display mode as text
function getModeText(mode) {
  if (mode === 1 || mode === "MODE_SMART_HOME") return "Smart Home";
  if (mode === 2 || mode === "MODE_BLE_MOUSE") return "BLE Mouse";
  if (mode === 3 || mode === "MODE_IR") return "IR Mode";
  if (mode === 4 || mode === "MODE_OFFLINE") return "Offline";
  return mode || "Unknown";
}

// Format IMU data
function formatIMU(imu) {
  if (!imu) return "N/A";
  return `P: ${imu.pitch}°, R: ${imu.roll}°, Y: ${imu.yaw}°`;
}

// Create table row for sensor data
function createDataRow(data) {
  const row = document.createElement("tr");

  // Timestamp
  const timestampCell = document.createElement("td");
  timestampCell.textContent = formatTimestamp(data.timestamp);
  timestampCell.className = "timestamp-cell";

  // Mode
  const modeCell = document.createElement("td");
  modeCell.textContent = getModeText(data.mode);

  // Flex State
  const flexCell = document.createElement("td");
  flexCell.textContent =
    data["Flex Sensor"] || (data.flexState ? "BENT" : "STRAIGHT");

  // MPU Reading
  const imuCell = document.createElement("td");
  imuCell.textContent = formatIMU(data.imu);

  // IR State
  const irCell = document.createElement("td");
  if (data.mode !== 3) {
    // not IR mode
    irCell.textContent = "NA";
  } else {
    // IR mode
    const state = data.IRState || ""; // e.g. “Learning slot 2” or “Sending slot 3”
    if (!state) {
      irCell.textContent = "Select Mode";
    } else if (state.startsWith("Learning")) {
      const n = state.match(/\d+/)[0];
      irCell.textContent = `Learning – slot ${n}`;
    } else if (state.startsWith("Sending")) {
      const n = state.match(/\d+/)[0];
      irCell.textContent = `Sending – slot ${n}`;
    } else {
      irCell.textContent = state;
    }
  }

  // Gesture
  const gestureCell = document.createElement("td");
  const gestureBadge = document.createElement("span");
  gestureBadge.className = "gesture-badge";
  gestureBadge.textContent = data.gesture;
  gestureCell.appendChild(gestureBadge);

  // Add all cells to row
  row.appendChild(timestampCell);
  row.appendChild(modeCell);
  row.appendChild(flexCell);
  row.appendChild(imuCell);
  row.appendChild(irCell);
  row.appendChild(gestureCell);

  return row;
}

// Update sensor data table with new data
function updateDataTable(data) {
  const tableBody = document.getElementById("data-table-body");
  if (!tableBody) return;

  // Extract flex state and update UI
  const flexState =
    data["Flex Sensor"] === "BENT" ||
    data.flexState === true ||
    data.flexState === 100;
  updateFlexSensorState(flexState);

  // Check if table has empty state message
  const emptyRow = tableBody.querySelector(".empty-state");
  if (emptyRow) {
    tableBody.removeChild(emptyRow);
  }

  // Create new row with data
  const newRow = createDataRow(data);

  // Add row at the beginning of the table
  if (tableBody.firstChild) {
    tableBody.insertBefore(newRow, tableBody.firstChild);
  } else {
    tableBody.appendChild(newRow);
  }

  // Limit to 5 rows
  while (tableBody.children.length > 5) {
    tableBody.removeChild(tableBody.lastChild);
  }

  // Update current gesture in UI
  updateCurrentGesture(data.gesture);

  // Add to logs
  addToLogs(data);
}

// Update the current gesture display
function updateCurrentGesture(gesture) {
  const currentGestureText = document.getElementById("current-gesture-text");
  const currentGestureDescription = document.getElementById(
    "current-gesture-description"
  );

  if (currentGestureText && currentGestureDescription) {
    currentGestureText.textContent = gesture;
    currentGestureDescription.textContent =
      gestureDescriptions[gesture] || "Description not available.";
  }

  // Update active state on gesture cards
  document.querySelectorAll(".gesture-card").forEach((card) => {
    card.classList.remove("active");
    const badge = card.querySelector(".active-badge");
    if (badge) {
      card.removeChild(badge);
    }

    if (
      card.querySelector("h4") &&
      card.querySelector("h4").textContent === gesture
    ) {
      card.classList.add("active");

      // Add active badge
      const newBadge = document.createElement("span");
      newBadge.className = "active-badge";
      newBadge.textContent = "Active";
      card.appendChild(newBadge);
    }
  });

  // Process gesture for smart home if it changed
  if (gesture !== "None") {
    processGestureForHomeControl(gesture);
  }
}

// Add data to logs and update logs table
function addToLogs(data) {
  // Add to allLogs array
  allLogs.unshift(data); // Add to beginning

  // Cap at 10000 logs
  if (allLogs.length > 10000) {
    allLogs.pop(); // Remove oldest entry
  }

  // Update logs table
  updateLogsTable();
}

// Update logs table
function updateLogsTable() {
  const logsTableBody = document.getElementById("logs-table-body");
  const logCount = document.getElementById("log-count");

  if (!logsTableBody || !logCount) return;

  // Update log count
  logCount.textContent = allLogs.length;

  // Clear current logs
  logsTableBody.innerHTML = "";

  // Add all logs
  if (allLogs.length > 0) {
    allLogs.forEach((log) => {
      logsTableBody.appendChild(createDataRow(log));
    });
  } else {
    // Show no logs message
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-state";

    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 4;
    emptyCell.textContent = "No logs available";

    emptyRow.appendChild(emptyCell);
    logsTableBody.appendChild(emptyRow);
  }
}

// Clear all logs
function clearAllLogs() {
  // First show confirmation dialog
  showConfirmationDialog(
    "Clear All Logs",
    "Are you sure you want to delete all logs? This action cannot be undone.",
    () => {
      // On confirm
      if (database && isConnected) {
        // Clear Firebase data
        database
          .ref("sensorData")
          .remove()
          .then(() => {
            console.log("All logs cleared successfully from Firebase");
            // Clear local logs array
            allLogs = [];
            // Update logs table
            updateLogsTable();
            // Clear recent data table
            const dataTableBody = document.getElementById("data-table-body");
            if (dataTableBody) {
              dataTableBody.innerHTML = `
                                <tr class="empty-state">
                                    <td colspan="4">No sensor data available. Start the simulation or connect the glove.</td>
                                </tr>
                            `;
            }
          })
          .catch((error) => {
            console.error("Error clearing logs:", error);
            alert("Error clearing logs: " + error.message);
          });
      } else {
        // Just clear local logs if not connected
        allLogs = [];
        updateLogsTable();

        // Clear recent data table
        const dataTableBody = document.getElementById("data-table-body");
        if (dataTableBody) {
          dataTableBody.innerHTML = `
                        <tr class="empty-state">
                            <td colspan="4">No sensor data available. Start the simulation or connect the glove.</td>
                        </tr>
                    `;
        }
      }
    },
    () => {
      // On cancel
      console.log("Log clearing canceled");
    }
  );
}

// Create a programmatic confirmation dialog
function showConfirmationDialog(title, message, onConfirm, onCancel) {
  // Remove any existing modal first
  if (confirmationModal) {
    document.body.removeChild(confirmationModal);
  }

  // Create the modal element
  confirmationModal = document.createElement("div");
  confirmationModal.className = "confirmation-modal";

  // Create modal content
  confirmationModal.innerHTML = `
        <div class="confirmation-dialog">
            <div class="confirmation-header">${title}</div>
            <div class="confirmation-body">${message}</div>
            <div class="confirmation-footer">
                <button class="btn" id="cancel-btn">Cancel</button>
                <button class="btn btn-danger" id="confirm-btn">Delete All</button>
            </div>
        </div>
    `;

  // Add to DOM
  document.body.appendChild(confirmationModal);

  // Add event listeners
  document.getElementById("cancel-btn").addEventListener("click", () => {
    // Hide modal
    confirmationModal.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(confirmationModal);
      confirmationModal = null;
    }, 300);

    // Execute cancel callback
    if (typeof onCancel === "function") {
      onCancel();
    }
  });

  document.getElementById("confirm-btn").addEventListener("click", () => {
    // Hide modal
    confirmationModal.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(confirmationModal);
      confirmationModal = null;
    }, 300);

    // Execute confirm callback
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  });

  // Show modal with animation
  setTimeout(() => {
    confirmationModal.classList.add("visible");
  }, 10);
}

// Initialize UI components
function initializeUI() {
  // Set up clear logs button
  const clearLogsBtn = document.getElementById("clear-logs-btn");
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", clearAllLogs);
  }
}

// Call initializeUI when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeUI);
