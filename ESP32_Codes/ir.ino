#include <Wire.h>
#include <MPU6050.h>
#include <IRremote.hpp>
#include <EEPROM.h>

#define IR_RECEIVE_PIN 13
#define IR_SEND_PIN    4
#define BUTTON_LEARN   25
#define BUTTON_SEND    26
#define STATUS_LED     2

#define NUM_SLOTS   5
#define DEBOUNCE_MS 200
#define TIMEOUT_MS 10000
#define MPU_INTERVAL 100       // ms between MPU reads
#define G_THRESH   60.0f
#define G_CONFIRM  35.0f
#define G_RESET    20.0f

struct IRCommand {
  uint8_t protocol;
  uint32_t code;
  uint16_t address;
  uint16_t command;
  uint8_t bits;
  bool valid;
};

IRCommand irSlots[NUM_SLOTS];
MPU6050 mpu;

// gyro offsets & filtered
float gxOff, gyOff, gzOff, fGx, fGy, fGz;

// gesture state
enum { IDLE, POTENTIAL, ACTIVE, RECOVERY } gState=IDLE;
char axis; int dir;
unsigned long gStart, gDetect, lastGestTime;
String lastGesture="None";

// button timing
unsigned long lastLearn=0, lastSend=0;
unsigned long lastMPU=0;

// prototypes
void calibrateGyro();
void readFilterMPU();
void detectGesture(unsigned long now);
int  mapGestureToSlot();
void learnIR(int slot);
void sendIR(int slot);

void setup(){
  Serial.begin(115200);
  pinMode(BUTTON_LEARN, INPUT_PULLUP);
  pinMode(BUTTON_SEND,  INPUT_PULLUP);
  pinMode(STATUS_LED,   OUTPUT);
  EEPROM.begin(512);

  IrReceiver.begin(IR_RECEIVE_PIN);
  IrSender.begin(IR_SEND_PIN);

  // load IR slots
  EEPROM.get(0, irSlots);
  for(int i=0;i<NUM_SLOTS;i++)
    if(irSlots[i].protocol>10) irSlots[i].valid=false;

  // init MPU
  Wire.begin();
  mpu.initialize();
  calibrateGyro();
  Serial.println("IR+GESTURE READY");
}

void loop(){
  unsigned long now=millis();
  // read MPU at interval
  if(now - lastMPU >= MPU_INTERVAL){
    lastMPU = now;
    readFilterMPU();
    detectGesture(now);
  }

  // learn button
  if(!digitalRead(BUTTON_LEARN) && now - lastLearn>DEBOUNCE_MS){
    lastLearn=now;
    int slot=mapGestureToSlot();
    learnIR(slot);
  }
  // send button
  if(!digitalRead(BUTTON_SEND) && now - lastSend>DEBOUNCE_MS){
    lastSend=now;
    int slot=mapGestureToSlot();
    sendIR(slot);
  }
}

// calibrate gyro offsets
void calibrateGyro(){
  float sx=0, sy=0, sz=0;
  for(int i=0;i<50;i++){
    int16_t ax,ay,az,gx,gy,gz;
    mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);
    sx += gx/131.0; sy += gy/131.0; sz += gz/131.0;
    delay(20);
  }
  gxOff=sx/50; gyOff=sy/50; gzOff=sz/50;
}

// read & filter MPU
void readFilterMPU(){
  int16_t ax,ay,az,gx,gy,gz;
  mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);
  float x=gx/131.0f - gxOff;
  float y=gy/131.0f - gyOff;
  float z=gz/131.0f - gzOff;
  fGx = 0.3f*x + 0.7f*fGx;
  fGy = 0.3f*y + 0.7f*fGy;
  fGz = 0.3f*z + 0.7f*fGz;
}

// gesture detection
void detectGesture(unsigned long now){
  float absx=fabs(fGx), absy=fabs(fGy), absz=fabs(fGz);
  switch(gState){
    case IDLE:
      if(absx>G_THRESH && absx>=absy && absx>=absz){
        axis='X'; dir=fGx>0?1:-1; gState=POTENTIAL; gStart=now;
      } else if(absy>G_THRESH && absy>=absx && absy>=absz){
        axis='Y'; dir=fGy>0?1:-1; gState=POTENTIAL; gStart=now;
      } else if(absz>G_THRESH){
        axis='Z'; dir=fGz>0?1:-1; gState=POTENTIAL; gStart=now;
      }
      break;
    case POTENTIAL:
      if(now-gStart>80){
        bool ok=(axis=='X' && absx>G_CONFIRM && dir*fGx>0)
              ||(axis=='Y' && absy>G_CONFIRM && dir*fGy>0)
              ||(axis=='Z' && absz>G_CONFIRM && dir*fGz>0);
        if(ok){
          gState=ACTIVE; gDetect=now; lastGestTime=now;
          if(axis=='X')      lastGesture = dir>0?"Pitch UP":"Pitch DOWN";
          else if(axis=='Y') lastGesture = dir>0?"Roll RIGHT":"Roll LEFT";
          else               lastGesture = dir>0?"Yaw LEFT":"Yaw RIGHT";
        } else gState=IDLE;
      }
      break;
    case ACTIVE:
      if((axis=='X'&&absx<G_RESET)||(axis=='Y'&&absy<G_RESET)||(axis=='Z'&&absz<G_RESET)
         || now-gDetect>1000) gState=RECOVERY;
      break;
    case RECOVERY:
      if(absx<G_RESET && absy<G_RESET && absz<G_RESET) gState=IDLE;
      break;
  }
}

// map gesture to slot 0-4
int mapGestureToSlot(){
  if(lastGesture=="Pitch UP")    return 0;
  if(lastGesture=="Pitch DOWN")  return 1;
  if(lastGesture=="Roll LEFT")   return 2;
  if(lastGesture=="Roll RIGHT")  return 3;
  if(lastGesture=="Yaw LEFT")    return 4;
  return 0;
}

// learn IR into slot
void learnIR(int slot){
  Serial.printf("Learn slot %d via gesture %s\n", slot+1, lastGesture.c_str());
  IrReceiver.start();
  unsigned long t=millis();
  while(!IrReceiver.decode() && millis()-t<TIMEOUT_MS) delay(10);
  if(!IrReceiver.decode()){ Serial.println("Timeout"); return; }
  auto &d=IrReceiver.decodedIRData;
  if(d.protocol==UNKNOWN){ Serial.println("Unknown"); IrReceiver.resume(); return; }
  irSlots[slot]={d.protocol,d.decodedRawData,d.address,d.command,d.numberOfBits,true};
  EEPROM.put(0, irSlots);
  EEPROM.commit();
  Serial.printf("Stored slot %d\n",slot+1);
  IrReceiver.resume();
}

// send IR from slot
void sendIR(int slot){
  Serial.printf("Send slot %d via gesture %s\n", slot+1, lastGesture.c_str());
  if(!irSlots[slot].valid){ Serial.println("No code"); return; }
  digitalWrite(STATUS_LED,1);
  IrSender.sendNEC(irSlots[slot].address,irSlots[slot].command,0);
  digitalWrite(STATUS_LED,0);
}
