// smart-home.js - Smart home device system logic

// Current path in the file explorer
let currentPath = "/Home";
let lastAction = null; // For undo functionality

// Adjust device value (for dimmers, temperature controls)
function adjustDeviceValue(path, direction) {
  const device = getDeviceByPath(path);
  if (!device || !device.valueType) return;

  // Store previous state for undo
  lastAction = {
    type: "adjust",
    path: path,
    previousState: device.size,
  };

  // Parse current value
  let currentValue = 0;
  if (device.size === "OFF") {
    // Turn on with minimum value
    device.size = device.valueType === "percentage" ? "10%" : "18°C";
    renderFileExplorer();
    return;
  } else if (device.valueType === "percentage") {
    currentValue = parseInt(device.size, 10);
  } else if (device.valueType === "temperature") {
    currentValue = parseInt(device.size, 10);
  }

  // Adjust value by step
  const step = device.valueType === "percentage" ? 10 : 1;
  if (direction === "up") {
    currentValue = Math.min(
      device.valueType === "percentage" ? 100 : 30,
      currentValue + step
    );
  } else {
    currentValue = Math.max(
      device.valueType === "percentage" ? 0 : 16,
      currentValue - step
    );
  }

  // Update device size
  if (device.valueType === "percentage") {
    device.size = currentValue + "%";
    if (currentValue === 0) device.size = "OFF";
  } else {
    device.size = currentValue + "°C";
  }

  renderFileExplorer();

  // Update action status
  const actionStatus = document.getElementById("file-action-status");
  if (actionStatus) {
    actionStatus.textContent = `${device.name} adjusted to ${device.size}`;
  }
}

// Undo last action
function undoLastAction() {
  if (!lastAction) {
    console.log("No action to undo");

    // Update action status
    const actionStatus = document.getElementById("file-action-status");
    if (actionStatus) {
      actionStatus.textContent = "Nothing to undo";
    }
    return;
  }

  const device = getDeviceByPath(lastAction.path);
  if (device) {
    device.size = lastAction.previousState;
    renderFileExplorer();

    // Update action status
    const actionStatus = document.getElementById("file-action-status");
    if (actionStatus) {
      actionStatus.textContent = `Undid: ${device.name} returned to ${device.size}`;
    }
  }

  // Clear the last action
  lastAction = null;
}

// Update the toggleDeviceState function
function toggleDeviceState(path, state) {
  const device = getDeviceByPath(path);
  if (!device) return;

  // Store previous state for undo
  lastAction = {
    type: "toggle",
    path: path,
    previousState: device.size,
  };

  // Set new state
  if (state) {
    device.size = state;
  } else {
    // Toggle state
    if (device.size === "OFF") {
      device.size = device.valueType ? device.defaultValue : "ON";
    } else {
      device.size = "OFF";
    }
  }

  renderFileExplorer();

  // Update action status
  const actionStatus = document.getElementById("file-action-status");
  if (actionStatus) {
    actionStatus.textContent = `${device.name} set to ${device.size}`;
  }
}

// SMART HOME SYSTEM
const homeSystem = {
  "/Home": [
    { name: "Living Room", type: "folder", path: "/Home/LivingRoom" },
    { name: "Kitchen", type: "folder", path: "/Home/Kitchen" },
    { name: "Bedroom", type: "folder", path: "/Home/Bedroom" },
    { name: "Bathroom", type: "folder", path: "/Home/Bathroom" },
  ],
  "/Home/LivingRoom": [
    {
      name: "Light",
      type: "document",
      size: "OFF",
      path: "/Home/LivingRoom/Light",
      valueType: "percentage",
      defaultValue: "50%",
    },
    { name: "TV", type: "document", size: "OFF", path: "/Home/LivingRoom/TV" },
    {
      name: "Fan",
      type: "document",
      size: "OFF",
      path: "/Home/LivingRoom/Fan",
    },
  ],
  "/Home/Kitchen": [
    {
      name: "Light",
      type: "document",
      size: "OFF",
      path: "/Home/Kitchen/Light",
      valueType: "percentage",
      defaultValue: "50%",
    },
    {
      name: "Fan",
      type: "document",
      size: "OFF",
      path: "/Home/Kitchen/Fan",
      valueType: "percentage",
      defaultValue: "50%",
    },
    {
      name: "Refrigerator",
      type: "document",
      size: "ON",
      path: "/Home/Kitchen/Refrigerator",
    },
  ],
  "/Home/Bedroom": [
    {
      name: "Light",
      type: "document",
      size: "OFF",
      path: "/Home/Bedroom/Light",
      valueType: "percentage",
      defaultValue: "50%",
    },
    {
      name: "Fan",
      type: "document",
      size: "OFF",
      path: "/Home/Bedroom/Fan",
      valueType: "percentage",
      defaultValue: "50%",
    },
    {
      name: "AC",
      type: "document",
      size: "OFF",
      path: "/Home/Bedroom/AC",
      valueType: "percentage",
      defaultValue: "24",
    },
  ],
  "/Home/Bathroom": [
    {
      name: "Light",
      type: "document",
      size: "OFF",
      path: "/Home/Bathroom/Light",
      valueType: "percentage",
      defaultValue: "50%",
    },
    {
      name: "Air Vent",
      type: "document",
      size: "OFF",
      path: "/Home/Bathroom/Fan",
    },
    {
      name: "Water Heater",
      type: "document",
      size: "OFF",
      path: "/Home/Bathroom/WaterHeater",
    },
  ],
};

// Initialize the smart home system
function initializeSmartHome() {
  console.log("Initializing smart home system...");

  // Set the file system to our smart home system
  window.fileSystem = homeSystem;

  // Render initial file explorer
  renderFileExplorer();

  // Set initial status
  const actionStatus = document.getElementById("file-action-status");
  if (actionStatus) {
    actionStatus.textContent = "Ready";
  }

  console.log("Smart home system initialized");
}

// Helper function to get file icon
function getFileIcon(name, type, size) {
  if (type === "folder") {
    return "&#x1F3E0;"; // House emoji
  }

  // Device icons based on name and status
  if (name.includes("Light")) {
    return size === "ON" ? "💡" : "💡"; // Light bulb
  } else if (name.includes("TV")) {
    return size === "ON" ? "📺" : "📺"; // Television
  } else if (name.includes("Fan")) {
    return size === "ON" ? "✇🌫" : "✇🌫"; // Wind face
  } else if (name.includes("Air Vent")) {
    return size === "ON" ? "✇🌫" : "✇🌫"; // Wind face
  } else if (name.includes("AC")) {
    return size === "ON" ? "❄️" : "❄️"; // Snowflake
  } else if (name.includes("Refrigerator")) {
    return size === "ON" ? "🧊" : "🧊"; // Ice cube
  } else if (name.includes("Heater") || name.includes("Oven")) {
    return size === "ON" ? "♨️" : "♨️"; // Fire
  }

  // Default document icon
  return size === "ON" ? "📱" : "📱"; // Mobile phone
}

// Render file explorer contents for the current path
function renderFileExplorer() {
  console.log("Rendering file explorer for path:", currentPath);

  const fileExplorer = document.getElementById("file-explorer");
  const pathDisplay = document.getElementById("current-path");

  if (!fileExplorer || !pathDisplay) {
    console.error("File explorer elements not found in DOM");
    return;
  }

  // Update path display
  pathDisplay.textContent = currentPath;

  // Clear file explorer
  fileExplorer.innerHTML = "";

  // Get files for current path
  const files = window.fileSystem[currentPath] || [];
  console.log("Files found:", files.length);

  // Sort files (folders first, then alphabetically)
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });

  // Add parent directory item if not at root
  if (currentPath !== "/Home") {
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
    const parentItem = document.createElement("div");
    parentItem.className = "file-item";
    parentItem.dataset.path = parentPath;
    parentItem.dataset.type = "folder";
    parentItem.dataset.name = "Back to Home";

    parentItem.innerHTML = `
            <div class="file-icon folder">📁</div>
            <div class="file-name">.. (Back)</div>
        `;

    parentItem.addEventListener("click", function () {
      currentPath = parentPath;
      renderFileExplorer();
    });

    fileExplorer.appendChild(parentItem);
  }

  // Add each file/folder
  sortedFiles.forEach((file) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.dataset.path = file.path;
    fileItem.dataset.type = file.type;
    fileItem.dataset.name = file.name;

    const icon = getFileIcon(file.name, file.type, file.size);

    fileItem.innerHTML = `
            <div class="file-icon ${
              file.type === "folder" ? "folder" : "document"
            }">${icon}</div>
            <div class="file-name">${file.name}</div>
            ${
              file.type !== "folder"
                ? `<div class="file-size">${file.size}</div>`
                : ""
            }
        `;

    fileItem.addEventListener("click", function () {
      // Remove selected class from all items
      document.querySelectorAll(".file-item").forEach((item) => {
        item.classList.remove("selected");
      });

      // Add selected class to this item
      this.classList.add("selected");

      // If it's a folder, navigate into it
      if (file.type === "folder") {
        currentPath = file.path;
        renderFileExplorer();
      } else {
        // If it's a device, toggle it
        toggleDeviceState(file.path);
      }
    });

    fileExplorer.appendChild(fileItem);
  });

  // If no files in current directory
  if (sortedFiles.length === 0 && currentPath === "/Home") {
    const emptyMessage = document.createElement("div");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No items found. This folder is empty.";
    fileExplorer.appendChild(emptyMessage);
  }
}

// Function to toggle device state
function toggleDeviceState(path, forcedState = null) {
  // Store current selected path for re-selection later
  const selectedPath = path;

  // Find the path components
  const pathParts = path.split("/");
  const roomPath = pathParts.slice(0, 3).join("/");
  const deviceName = pathParts[pathParts.length - 1];

  // Get the current device from the file system
  const roomDevices = window.fileSystem[roomPath] || [];
  const deviceIndex = roomDevices.findIndex(
    (device) => device.name === deviceName
  );

  if (deviceIndex !== -1) {
    // Toggle the state or set to forced state
    if (forcedState) {
      roomDevices[deviceIndex].size = forcedState;
    } else {
      roomDevices[deviceIndex].size =
        roomDevices[deviceIndex].size === "ON" ? "OFF" : "ON";
    }

    // Re-render the file explorer
    renderFileExplorer();

    // Re-select the item that was toggled
    const items = document.querySelectorAll(".file-item");
    items.forEach((item) => {
      if (item.dataset.path === selectedPath) {
        item.classList.add("selected");
        item.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    // Show action status
    const actionStatus = document.getElementById("file-action-status");
    if (actionStatus) {
      actionStatus.textContent = `${deviceName} turned ${roomDevices[deviceIndex].size}`;
    }
  }
}
