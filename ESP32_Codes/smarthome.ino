#include <Wire.h>
#include <MPU6050.h>
#include <math.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <EEPROM.h>

// —— Configuration ——
#define FLEX_PIN 34
#define FLEX_BENT_THRESHOLD 1600
#define MOTOR_PIN 5 // Coin vibration motor, simple on/off

#define WIFI_SSID ""
#define WIFI_PASSWORD ""
#define API_KEY ""
#define DATABASE_URL ""

#define USER_EMAIL ""
#define USER_PASSWORD ""

// —— Firebase objects ——
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool signupOK = false;

// —— Flex sensor ——
int flexADC;
bool flexState;

// —— MPU & orientation ——
MPU6050 mpu;
float yawAngle = 0;
unsigned long lastTime = 0;

// —— Gesture detection ——
enum GestureState
{
  IDLE,
  POTENTIAL,
  ACTIVE,
  RECOVERY
};
GestureState gState = IDLE;
char axis;
int dir;
unsigned long gStart, gDetect, lastGestureTime;
const char *lastDetectedGesture = "None";
const float GESTURE_THRESH = 60.0f;
const float GESTURE_CONFIRM = 35.0f;
const float GESTURE_RESET = 20.0f;

// —— Gesture lockout ——
unsigned long gestureLockUntil = 0;

// —— Timing ——
unsigned long lastSample = 0;
unsigned long lastFirebase = 0;
const unsigned long SAMPLE_INTERVAL = 50;     // ms
const unsigned long FIREBASE_INTERVAL = 1000; // ms

// —— Prototypes ——
void initWiFi(), initFirebase();
void checkForReset();
void detectGesture(float gx, float gy, float gz, unsigned long now);
void sendGestureToFirebase(float pitch, float roll, float yaw);

void setup()
{
  Serial.begin(115200);
  EEPROM.begin(1);

  // Flex sensor
  pinMode(FLEX_PIN, INPUT);

  // Coin motor pin
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW);

  // I²C + MPU
  Wire.begin();
  Wire.setClock(400000);
  mpu.initialize();
  if (!mpu.testConnection())
  {
    Serial.println("ERROR: MPU6050 not found");
    while (1)
      delay(10);
  }
  Serial.println("MPU6050 initialized");

  // Calibrate gyro offsets
  float sx = 0, sy = 0, sz = 0;
  for (int i = 0; i < 50; i++)
  {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    sx += gx / 131.0f;
    sy += gy / 131.0f;
    sz += gz / 131.0f;
    delay(20);
  }
  // (Offsets stored if you need them)
  lastTime = micros();

  // Wi-Fi & Firebase
  initWiFi();
  initFirebase();
}

void loop()
{
  checkForReset();

  // Read flex
  flexADC = analogRead(FLEX_PIN);
  flexState = (flexADC < FLEX_BENT_THRESHOLD);

  // Throttle MPU sampling
  unsigned long now_us = micros();
  if (now_us - lastSample < SAMPLE_INTERVAL * 1000)
    return;
  lastSample = now_us;

  // Read MPU
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  // Integrate yaw
  float dt = (now_us - lastTime) * 1e-6f;
  yawAngle += (gz / 131.0f) * dt;
  lastTime = now_us;

  // Compute pitch/roll
  float fx = ax / 16384.0f, fy = ay / 16384.0f, fz = az / 16384.0f;
  float pitch = atan2(fx, sqrt(fy * fy + fz * fz)) * 180.0f / M_PI;
  float roll = atan2(fy, sqrt(fx * fx + fz * fz)) * 180.0f / M_PI;

  // Gesture detection
  detectGesture(gx / 131.0f, gy / 131.0f, gz / 131.0f, millis());

  // Serial debug (~200ms)
  static unsigned long lastDbg = 0;
  if (millis() - lastDbg > 200)
  {
    lastDbg = millis();
    unsigned long runSec = millis() / 1000;
    unsigned long hh = runSec / 3600, mm = (runSec % 3600) / 60, ss = runSec % 60;
    unsigned long age = (millis() - lastGestureTime) / 1000;
    const char *tiltDir = (pitch > 30)    ? "LEFT"
                          : (pitch < -30) ? "RIGHT"
                          : (roll > 30)   ? "BACKWARD"
                          : (roll < -30)  ? "FORWARD"
                                          : "LEVEL";
    Serial.printf(
        "\n==== MPU6050 [%02lu:%02lu:%02lu] ====\n"
        "Tilt: %s\n"
        "P:%.1f° R:%.1f° Z:%.2fg\n"
        "Yaw: %.1f°\n"
        "Flex: %d (%s)\n"
        "Gesture: %s (%lus ago)\n"
        "WiFi: %s\n"
        "========================\n",
        hh, mm, ss,
        tiltDir,
        pitch, roll, fz,
        yawAngle,
        flexADC, flexState ? "BENT" : "STRAIGHT",
        lastDetectedGesture, age,
        WiFi.status() == WL_CONNECTED ? "OK" : "NO");
  }

  // Firebase every second
  if (WiFi.status() == WL_CONNECTED && Firebase.ready() &&
      millis() - lastFirebase >= FIREBASE_INTERVAL)
  {
    sendGestureToFirebase(pitch, roll, yawAngle);
    lastFirebase = millis();
  }
}

void initWiFi()
{
  Serial.print("WiFi connecting");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 10000)
  {
    Serial.print(".");
    delay(500);
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " OK" : " FAIL");
}

void initFirebase()
{
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  Serial.print("Authenticating with Firebase...");
  int attempts = 0;
  while (attempts < 3)
  {
    if (Firebase.signUp(&config, &auth, USER_EMAIL, USER_PASSWORD))
    {
      Serial.println(" OK");
      signupOK = true;
      break;
    }
    else
    {
      Serial.printf(" FAILED (%s)\n", config.signer.signupError.message.c_str());
      delay(1000 * ++attempts);
    }
  }

  if (!signupOK)
  {
    Serial.println("FATAL: Firebase auth failed");
    return;
  }

  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void checkForReset()
{
  if (Serial.available() && Serial.read() == 'q')
  {
    ESP.restart();
  }
}

void detectGesture(float gx, float gy, float gz, unsigned long now)
{
  // Cooldown
  if (now < gestureLockUntil)
    return;

  float abx = fabs(gx), aby = fabs(gy), abz = fabs(gz);
  switch (gState)
  {
  case IDLE:
    if (abx > GESTURE_THRESH && abx >= aby && abx >= abz)
    {
      axis = 'X';
      dir = (gx > 0 ? 1 : -1);
      gState = POTENTIAL;
      gStart = now;
    }
    else if (aby > GESTURE_THRESH && aby >= abx && aby >= abz)
    {
      axis = 'Y';
      dir = (gy > 0 ? 1 : -1);
      gState = POTENTIAL;
      gStart = now;
    }
    else if (abz > GESTURE_THRESH)
    {
      axis = 'Z';
      dir = (gz > 0 ? 1 : -1);
      gState = POTENTIAL;
      gStart = now;
    }
    break;
  case POTENTIAL:
    if (now - gStart > 80)
    {
      bool ok = (axis == 'X' && abx > GESTURE_CONFIRM && dir * gx > 0) || (axis == 'Y' && aby > GESTURE_CONFIRM && dir * gy > 0) || (axis == 'Z' && abz > GESTURE_CONFIRM && dir * gz > 0);
      if (ok)
      {
        gState = ACTIVE;
        gDetect = now;
        if (axis == 'X')
          lastDetectedGesture = dir > 0 ? "Pitch UP" : "Pitch DOWN";
        else if (axis == 'Y')
          lastDetectedGesture = dir > 0 ? "Roll RIGHT" : "Roll LEFT";
        else
          lastDetectedGesture = dir > 0 ? "Yaw LEFT" : "Yaw RIGHT";
        lastGestureTime = now;
        // Haptic pulse
        digitalWrite(MOTOR_PIN, HIGH);
        delay(100);
        digitalWrite(MOTOR_PIN, LOW);
        // cooldown
        gestureLockUntil = now + 800;
      }
      else
      {
        gState = IDLE;
      }
    }
    break;
  case ACTIVE:
    if ((axis == 'X' && abx < GESTURE_RESET) || (axis == 'Y' && aby < GESTURE_RESET) || (axis == 'Z' && abz < GESTURE_RESET) || now - gDetect > 1000)
    {
      gState = RECOVERY;
    }
    break;
  case RECOVERY:
    if (now >= gestureLockUntil)
    {
      gState = IDLE;
    }
    break;
  }
}

void sendGestureToFirebase(float pitch, float roll, float yaw)
{
  FirebaseJson root, imu, ts;
  ts.set(".sv", "timestamp");
  root.set("timestamp", ts);
  root.set("flexState", flexState ? 1 : 0);
  imu.set("pitch", pitch);
  imu.set("roll", roll);
  imu.set("yaw", yaw);
  root.set("imu", imu);
  root.set("gesture", lastDetectedGesture);
  Firebase.RTDB.pushJSON(&fbdo, "sensorData", &root);
}
