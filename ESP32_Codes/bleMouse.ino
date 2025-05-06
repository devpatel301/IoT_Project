#include <BleMouse.h>
#include <Adafruit_MPU6050.h>

#define LEFTBUTTON 26
#define RIGHTBUTTON 25

// Independent sensitivity
#define HORIZONTAL_SPEED 12.0f // increase to make left/right faster
#define VERTICAL_SPEED 6.0f    // increase to make up/down faster

Adafruit_MPU6050 mpu;
BleMouse bleMouse;

bool sleepMPU = true;
unsigned long mpuDelayMillis;

void setup()
{
  Serial.begin(115200);
  pinMode(LEFTBUTTON, INPUT_PULLUP);
  pinMode(RIGHTBUTTON, INPUT_PULLUP);

  bleMouse.begin();
  delay(1000);

  if (!mpu.begin())
  {
    Serial.println("Failed to find MPU6050 chip");
    while (1)
      delay(10);
  }
  Serial.println("MPU6050 Found!");
  mpu.enableSleep(sleepMPU);
}

void loop()
{
  if (bleMouse.isConnected())
  {
    // wake MPU once after connecting
    if (sleepMPU)
    {
      delay(3000);
      Serial.println("MPU6050 awakened!");
      sleepMPU = false;
      mpu.enableSleep(sleepMPU);
      delay(500);
    }

    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // apply independent scaling
    float dx = -g.gyro.z * HORIZONTAL_SPEED;
    float dy = -g.gyro.x * VERTICAL_SPEED;
    bleMouse.move(dx, dy);

    if (digitalRead(LEFTBUTTON) == LOW)
    {
      Serial.println("Left click");
      bleMouse.click(MOUSE_LEFT);
      delay(300);
    }
    if (digitalRead(RIGHTBUTTON) == LOW)
    {
      Serial.println("Right click");
      bleMouse.click(MOUSE_RIGHT);
      delay(300);
    }
  }
}