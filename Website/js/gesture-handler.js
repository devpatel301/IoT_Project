// gesture-handler.js - Gesture processing and mapping

// Process gesture for controlling smart home interface
function processGestureForHomeControl(gesture) {
  console.log("Processing gesture for home control:", gesture);
  const fileExplorer = document.getElementById("file-explorer");
  if (!fileExplorer) {
    console.error("File explorer element not found");
    return;
  }

  let selectedItem = document.querySelector(".file-item.selected");

  // Check for flex sensor double bend pattern
  if (window.flexPatternDetected) {
    console.log("Double bend detected - Select/Toggle");
    window.flexPatternDetected = false; // Reset the pattern

    if (selectedItem) {
      const path = selectedItem.dataset.path;
      const type = selectedItem.dataset.type;

      if (type === "folder") {
        currentPath = path;
        renderFileExplorer();
      } else {
        toggleDeviceState(path);
      }
    } else {
      const firstItem = document.querySelector(".file-item");
      if (firstItem) firstItem.classList.add("selected");
    }
    return;
  }

  // Process Yaw + Flex Bent for Undo
  if (
    (gesture.includes("Yaw") ||
      gesture === "Fist Left" ||
      gesture === "Fist Right") &&
    document.getElementById("flex-state").textContent === "BENT"
  ) {
    console.log("Undo last action detected");
    undoLastAction();
    return;
  }

  switch (gesture) {
    case "Pitch UP":
    case "Palm Up":
      if (selectedItem) {
        const prev = selectedItem.previousElementSibling;
        if (prev && prev.classList.contains("file-item")) {
          selectedItem.classList.remove("selected");
          prev.classList.add("selected");
          prev.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        const items = document.querySelectorAll(".file-item");
        if (items.length) items[0].classList.add("selected");
      }
      break;

    case "Pitch DOWN":
    case "Palm Down":
      if (selectedItem) {
        const next = selectedItem.nextElementSibling;
        if (next && next.classList.contains("file-item")) {
          selectedItem.classList.remove("selected");
          next.classList.add("selected");
          next.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        const first = document.querySelector(".file-item");
        if (first) first.classList.add("selected");
      }
      break;

    case "INDEX_BUTTON_PRESSED":
      console.log("Index button – Select/Toggle");
      if (selectedItem) {
        const path = selectedItem.dataset.path;
        const type = selectedItem.dataset.type;
        if (type === "folder") {
          currentPath = path;
          renderFileExplorer();
        } else {
          toggleDeviceState(path);
        }
      } else {
        const first = document.querySelector(".file-item");
        if (first) first.classList.add("selected");
      }
      break;

    case "MIDDLE_BUTTON_PRESSED":
      if (selectedItem && selectedItem.dataset.type !== "folder") {
        adjustDeviceValue(selectedItem.dataset.path, "up");
      }
      break;

    case "Palm Right":
      if (selectedItem) {
        const path = selectedItem.dataset.path;
        const type = selectedItem.dataset.type;
        if (type === "folder") {
          currentPath = path;
          renderFileExplorer();
        } else {
          toggleDeviceState(path);
        }
      } else {
        const first = document.querySelector(".file-item");
        if (first) first.classList.add("selected");
      }
      break;

    case "Palm Left":
      if (currentPath !== "/Home") {
        const parent = currentPath.substring(0, currentPath.lastIndexOf("/"));
        currentPath = parent || "/Home";
        renderFileExplorer();
      }
      break;
  }
}

// Setup keyboard gesture shortcuts for testing
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", function (event) {
    let gesture = null;
    let shouldPreventDefault = true;

    switch (event.key) {
      case "1": // Pitch Up (Navigate Up)
        gesture = "Pitch UP";
        break;
      case "2": // Pitch Down (Navigate Down)
        gesture = "Pitch DOWN";
        break;
      case "3": // Double Bend (mapped to Enter for testing)
        window.flexPatternDetected = true;
        processGestureForHomeControl("");
        shouldPreventDefault = false;
        break;
      case "4": // Index Button (Value Down)
        gesture = "INDEX_BUTTON_PRESSED";
        break;
      case "5": // Middle Button (Value Up)
        gesture = "MIDDLE_BUTTON_PRESSED";
        break;
      case "6": // Undo Last Action
        // Simulate Yaw + Flex Bent
        document.getElementById("flex-state").textContent = "BENT";
        gesture = "Yaw LEFT + BENT";
        break;
      case "7": // Palm Right (legacy)
        gesture = "Palm Right";
        break;
      case "8": // Palm Left (legacy)
        gesture = "Palm Left";
        break;
      default:
        shouldPreventDefault = false;
    }

    if (gesture) {
      if (shouldPreventDefault) {
        event.preventDefault();
      }
      console.log("Gesture triggered via keyboard:", gesture);
      simulateGesture(gesture);
    }
  });
}
