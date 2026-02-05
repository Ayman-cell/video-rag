#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();
#define pinCount 16

#define SERVO_FREQ 50
const float microsPerStep = (float)(1000000.0/SERVO_FREQ)/4096.0;

#define USMIN  500
#define USMAX  2500
const int SERVOMIN = round(USMIN/microsPerStep);
const int SERVOMAX = round(USMAX/microsPerStep);

const int servoCenterPWM = (SERVOMAX-SERVOMIN)/2 + SERVOMIN;

#define servoCount 6
int servoList[] = {0, 1, 2, // Right
                   3, 4, 6}; // Left

enum JointIndex { RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE,
                  LEFT_HIP, LEFT_KNEE, LEFT_ANKLE };

bool Orientation[] = {HIGH, LOW, LOW, // Right
                      LOW, HIGH, HIGH}; // Left

float jointCorrection[] = {0.0, 0.0, 10.0, // Right
                           5.0, 0.0, -20.0}; // Left

const float HIP_LIMIT = 124.0;
float angleLimit[][2] = { {0.0, HIP_LIMIT}, {0.0, 180.0}, {0.0, 180.0},   // Right
                          {0.0, HIP_LIMIT}, {0.0, 180.0}, {0.0, 180.0} }; // Left


// ================================= PIN CONTROL =================================


float currentAngles[] = {0.0, 0.0, 0.0, // Right
                         0.0, 0.0, 0.0}; // Left
               
bool pinValid(int pin) {
  bool valid = (pin>=0 && pin<pinCount);
  if (!valid) {Serial.print("Invalid pin "); Serial.println(pin);}
  return valid;
}

int Angle_To_PWM(float angle) { // angle (degrees) from 0-180 -> to PWM
  int pulseWidth = map(angle,0,180,SERVOMIN,SERVOMAX);
  return pulseWidth;
}

void moveServoPin(int pin, float angle) { // Move the servo attached to a pin to the absolute angle
  if (!pinValid(pin)) {return;}
  int pulseWidth = Angle_To_PWM(angle);
  pwm.setPWM(pin, 0, pulseWidth);
  Serial.print("Pin "); Serial.print(pin);
  Serial.print(" angle "); Serial.print(angle);
  Serial.print(" pwm "); Serial.println(pulseWidth);
}

void centerServoPin(int pin) { // Move the servo attached to a pin to the center position
  if (!pinValid(pin)) {return;}
  pwm.setPWM(pin, 0, servoCenterPWM);
  Serial.print("Pin "); Serial.print(pin); Serial.println(" Centered");
}


// ================================= SETUP =================================


void setup() {
  Serial.begin(115200);
  pwm.begin();
  pwm.setOscillatorFrequency(27000000);
  pwm.setPWMFreq(SERVO_FREQ);
  while (!Serial);
  delay(10);
  Serial.println("Serial Communication Established");
  initialize();
}


// ================================= SERVO CONTROL =================================


void initialize(){
  for (int i=0;i<servoCount;i++){
    centerServo(i);
  }
}


bool servoValid(int servo) {
  bool valid = (servo>=0 && servo<servoCount);
  if (!valid) {Serial.print("Invalid servo index "); Serial.println(servo);}
  return valid;
}

float constrainAngle(float angle, int index) {
  if (!servoValid(index)) return 90.0;
  float Min = angleLimit[index][0];
  float Max = angleLimit[index][1];
  return constrain(angle, Min, Max);
}

float applyOrientation(float angle, int index) {
  if (!servoValid(index)) return angle;
  if (Orientation[index]==LOW) angle = 180 - angle;
  return angle;
}

void moveServo(int servo, float angle) { // Move the servo (by list index) to the absolute angle
  if (servo==-1) { for (servo=0; servo<servoCount; servo++) { moveServo(servo, angle); } return; }
  if (!servoValid(servo)) return;
  Serial.print("Servo "); Serial.print(servo); Serial.print(" angle "); 
  int pin = servoList[servo];
  float correction = jointCorrection[servo];
  
  angle = constrainAngle(angle, servo); // MIN < Joint angle < MAX
  float c_angle = angle + correction; // The correction is in the positive direction
  if ( !(0.0<=c_angle) || !(c_angle<=180.0) ) return;
  currentAngles[servo] = c_angle;

  angle = applyOrientation(c_angle, servo);
  Serial.println(angle);
  moveServoPin(pin, angle);
}


void centerServo(int servo) { // Move the servo (by list index) to the center position
  moveServo(servo, 90.0);
}


// ================================= LEG TRAJECTORY =================================


// NOTE: The robot's physical limits make the knee-down configuration better

int cycle = 1;
const float L1 = 63; // Verified in Solid
const float L2 = 75; // Verified in Solid
bool kneeUp = true;

// (x,y) = (Horizontal Forward, Vertical Up) in mm
// y>0 is the vertical distance between hip and ankle
// c = configuration, is for elbow up or down (currently disabled)
// Output stores the 2 servo angles corresponding to (x,y)

// o--> x
// |
// y
  
bool LegInverseKinematics(bool kneeUp, float x, float y, float* output_theta) {
  y = -y; // An arm's "floor" is the leg's body

  float d = sqrt(x * x + y * y);
  
  float maxReach = L1 + L2;
  float minReach = fabs(L1 - L2);
  if (d > maxReach) {Serial.print("Target Too Far, Distance "); Serial.println(d); return false;}
  if (d < minReach) {Serial.print("Target Too Close, Distance "); Serial.println(d); return false;}

  float cosTheta2 = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (fabs(cosTheta2)>1.01) {Serial.println("Target Unreachable"); return false;}

  float theta2 = acos(cosTheta2);
  if (kneeUp) theta2 = -theta2;

  float theta1 = atan2(y, x) - atan2(L2 * sin(theta2), L1 + L2 * cos(theta2));

  // Note: Theta1 is for the top joint, Theta2 for the bottom joint
  theta1 = (theta1 * 180.0 / PI) + 180.0;
  theta2 = (theta2 * 180.0 / PI) + 90.0;

  if (theta1 != constrain(theta1, 0.0, 180.0) || theta2 != constrain(theta2, 0.0, 180.0)) {
      Serial.print("Limit Violation: (Theta1, Theta2) = (");
      Serial.print(theta1); Serial.print(", ");
      Serial.print(theta2); Serial.println(")");
      return false;
  }

  output_theta[0] = theta1;
  output_theta[1] = theta2;

  return true;
}


// Move Right or Left leg to an (x,y) position (mm)

const int Right=0, Left=1;
int otherLeg(int leg) { if (leg==Right) return Left; if (leg==Left) return Right; }

bool setLegPosition(int leg, bool kneeUp, float x, float y) {
  Serial.print("(x,y) = ("); Serial.print(x);
  Serial.print(", "); Serial.print(y); Serial.print(") -> ");

  float target_angles[2];
  
  bool valid = LegInverseKinematics(kneeUp, x, y, target_angles);
  
  if (valid) {
    Serial.print("(Theta1, Theta2) = (");
    Serial.print(target_angles[0]); Serial.print(",");
    Serial.print(target_angles[1]); Serial.println(")");
  } else return false;

  if ( !(target_angles[0]<=HIP_LIMIT) ) {
    Serial.println("HIP LIMIT Reached: Aborted movement"); return false;
  }

  if (leg==Right) {
    float theta1 = constrainAngle(target_angles[0], RIGHT_HIP);
    float theta2 = constrainAngle(target_angles[1], RIGHT_KNEE);
    moveServo(RIGHT_HIP, theta1);
    moveServo(RIGHT_KNEE, theta2);
  }
  else if (leg==Left) {
    float theta1 = constrainAngle(target_angles[0], LEFT_HIP);
    float theta2 = constrainAngle(target_angles[1], LEFT_KNEE);
    moveServo(LEFT_HIP, theta1);
    moveServo(LEFT_KNEE, theta2);
  }
  else { Serial.print("Tried to move inexistent leg: "); Serial.println(leg); return false; }

  return true;
}












// ================================= GAIT PARAMETERS =================================


const float STEP_LENGTH = 20.0;
const float REST_HEIGHT = L1 + L2-10.0;
const float MAX_SWING_HEIGHT = 20.0;

const float STANCE_DURATION = 0.5;
const float SWING_DURATION = 0.5;
const float CYCLE_PERIOD = 4000.0;  // milliseconds per full cycle

unsigned long gaitStartTime = 0;


// ================================= GAIT STATE MACHINE =================================


struct GaitState {
  char phase;  // 'S' for STANCE, 'W' for SWING
  float progressInPhase;  // 0.0 to 1.0
};

struct GaitState GetGaitState(float cycleProgress, int leg) {
  // leg: 0 = RIGHT (leading), 1 = LEFT (trailing)
  // At cycleProgress 0.0: Right in SWING, Left in STANCE
  
  float phaseOffset = (leg == 0) ? 0.5 : 0.0;  // RIGHT offset by 0.5
  float adjustedProgress = fmod(cycleProgress + phaseOffset, 1.0);
  
  float stanceThreshold = STANCE_DURATION / (STANCE_DURATION + SWING_DURATION);  // 0.5
  
  GaitState state;
  if (adjustedProgress < stanceThreshold) {
    state.phase = 'S';  // STANCE
    state.progressInPhase = adjustedProgress / stanceThreshold;
  } else {
    state.phase = 'W';  // SWING
    state.progressInPhase = (adjustedProgress - stanceThreshold) / (SWING_DURATION / (STANCE_DURATION + SWING_DURATION));
  }
  
  return state;
}

void ComputeLegTarget(float cycleProgress, int leg, float* targetX, float* targetY) {
  GaitState state = GetGaitState(cycleProgress, leg);
  float progress = state.progressInPhase;
  
  if (state.phase == 'S') {  // STANCE
    // Foot slides backward (from +STEP_LENGTH/2 to -STEP_LENGTH/2)
    *targetX = (STEP_LENGTH / 2.0) - (progress * STEP_LENGTH) - 10.0;
    // Small oscillation: dips down during stance
    *targetY = REST_HEIGHT - (sin(progress * PI) * 5.0);
  } else {  // SWING
    // Foot swings forward (from -STEP_LENGTH/2 to +STEP_LENGTH/2)
    *targetX = -(STEP_LENGTH / 2.0) + (progress * STEP_LENGTH) - 10.0;
    // Lifts up during swing
    *targetY = REST_HEIGHT - (sin(progress * PI) * MAX_SWING_HEIGHT);
  }
}

void UpdateGaitProgress(float cycleProgress) {
  float rightX, rightY, leftX, leftY;
  ComputeLegTarget(cycleProgress, 0, &rightX, &rightY);  // RIGHT leg
  ComputeLegTarget(cycleProgress, 1, &leftX, &leftY);    // LEFT leg
  //Serial.print("Right: "); Serial.print(rightX); Serial.print(" "); Serial.println(rightY);
  //Serial.print("Left: "); Serial.print(leftX); Serial.print(" "); Serial.println(leftY);
  setLegPosition(Right, kneeUp, rightX, rightY);
  setLegPosition(Left, kneeUp, leftX, leftY);
}

void UpdateGait(unsigned long currentTime) {
  float cycleProgress = fmod((currentTime - gaitStartTime) / CYCLE_PERIOD, 1.0);
  UpdateGaitProgress(cycleProgress);
}

void ResetWalk() {
  gaitStartTime = millis();
}



// ================================= LOOP =================================


bool zid_asa7bi=false;

void loop() {
  if (zid_asa7bi) {
    unsigned long currentTime = millis();
    UpdateGait(currentTime);
  }
  
  if (Serial.available()) {
    char ch = Serial.read();

    if (ch == 'c') { // servos to 90 degrees (absolute)
      int servo = Serial.parseInt();
      centerServo(servo);
    }

    if (ch == 's') { // move servos (absolute)
      int servo = Serial.parseInt();
      float angle = Serial.parseFloat();
      moveServo(servo,angle);
    }
    
    if (ch == 'l') { // Leg (x,y) control
      float x = Serial.parseFloat();
      float y  = Serial.parseFloat();
      bool success = setLegPosition(Right, kneeUp, x, y);
    }

    if (ch == 'p') {
      float progress = Serial.parseFloat();
      Serial.print("Progress "); Serial.println(progress);
      UpdateGaitProgress(progress);
    }

    if (ch == 'w') {
      zid_asa7bi = !zid_asa7bi;
      if (zid_asa7bi) ResetWalk();
      else centerServo(-1);
    }

    if (ch == 'k') {
      kneeUp = !kneeUp;
      Serial.print("Knee Up: "); Serial.println(kneeUp);
    }
    
  }
}
