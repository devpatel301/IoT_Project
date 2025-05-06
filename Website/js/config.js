// Firebase configuration
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Define the gesture set
const gestures = [
  "Pitch UP",
  "Pitch DOWN",
  "Roll LEFT",
  "Roll RIGHT",
  "Yaw LEFT",
  "Yaw RIGHT",
  "INDEX_BUTTON_PRESSED",
  "MIDDLE_BUTTON_PRESSED",
  "Palm Left",
  "Palm Right"
];

const gestureDescriptions = {
  "Pitch UP":             "Closed fist up – increase or scroll up.",
  "Pitch DOWN":           "Closed fist down – decrease or scroll down.",
  "Roll LEFT":            "Palm roll left – go back.",
  "Roll RIGHT":           "Palm roll right – go forward.",
  "Yaw LEFT":             "Rotate left – undo.",
  "Yaw RIGHT":            "Rotate right – home/menu.",
  "INDEX_BUTTON_PRESSED": "Index finger press – value down.",
  "MIDDLE_BUTTON_PRESSED":"Middle finger press – value up.",
  "Palm Left":            "Open palm left – backward/cancel.",
  "Palm Right":           "Open palm right – forward/confirm."
};
