#include <Wire.h>
#include <SoftwareSerial.h>

SoftwareSerial BTSerial(2, 3); // (Arduino RX, Arduinp TX) (Bluetooth TX, Bluetooth RX)

#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

#define SERVO_FREQ 50
const float microsPerStep = (float)(1000000.0/SERVO_FREQ)/4096.0;

#define USMIN  500
#define USMAX  2500
const int SERVOMIN = round(USMIN/microsPerStep);
const int SERVOMAX = round(USMAX/microsPerStep);

const int servoCenter = 307;
int cycle = 2;
int cycle1 = 2;
// Définition des canaux pour toutes les pattes
#define FL_EPAULE 1
#define FL_GENOU 0
#define FR_EPAULE 3
#define FR_GENOU 2
#define BL_EPAULE 5
#define BL_GENOU 4
#define BR_EPAULE 7
#define BR_GENOU 6

// Paramètres géométriques du bras
const float L1 = 73.0;
const float L2 = 85.0;

// Offsets pour chaque patte
const int FR_shoulder_offset = 98;
const int FR_knee_offset = 90;
const int FL_shoulder_offset = 98;
const int FL_knee_offset = 90;
const int BR_shoulder_offset = 90;
const int BR_knee_offset = 90;
const int BL_shoulder_offset = 90;
const int BL_knee_offset = 90;

// Paramètres de l'ellipse
const float centerX = 130.0;
const float radius = 20.0;
float centerY = 40.0;

// Variables pour le mouvement
const float step_size = 0.1;
const int delay_time = 20;

// Variables pour le contrôle de hauteur
int hauteurActuelle = 0;
const int HAUTEUR_MAX = 30;
const int HAUTEUR_MIN = -40;

// Stockage des angles actuels de chaque moteur
float currentAngles[8] = {0}; // Index: 0=FL_GENOU, 1=FL_EPAULE, 2=FR_GENOU, 3=FR_EPAULE, 4=BL_GENOU, 5=BL_EPAULE, 6=BR_GENOU, 7=BR_EPAULE

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(1);
  BTSerial.begin(9600);
  BTSerial.setTimeout(1);
  
  pwm.begin();
  pwm.setOscillatorFrequency(27000000);
  pwm.setPWMFreq(SERVO_FREQ);
  
  /*while (!Serial);
  delay(10);
  Serial.println("Serial Communication Established");*/
  delay(1000);
  BTSerial.println("Ready to connect via Bluetooth");
  
  // Initialisation des angles actuels avec les positions de repos
  repos();
}

void getEllipsePoint(float t, float &x, float &y, bool reverse = false) {
  if (reverse) {
    x = centerX + radius * cos(2*PI - t);
    y = centerY + radius * sin(2*PI - t) * 2;
  } else {
    x = centerX + radius * cos(t);
    y = centerY + radius * sin(t) * 2;
  }
}

// Fonction pour augmenter la hauteur du robot
void augmenterHauteur() {
  if (hauteurActuelle < HAUTEUR_MAX) {
    hauteurActuelle++;
    appliquerHauteur();
    /*Serial.print("Hauteur augmentée à: ");
    Serial.println(hauteurActuelle);*/
    BTSerial.print("Hauteur augmentée à: ");
    BTSerial.println(hauteurActuelle);
  } else {
    //Serial.println("Hauteur maximale atteinte");
    BTSerial.println("Hauteur maximale atteinte");
  }
}

// Fonction pour diminuer la hauteur du robot
void diminuerHauteur() {
  if (hauteurActuelle > HAUTEUR_MIN) {
    hauteurActuelle--;
    appliquerHauteur();
    /*Serial.print("Hauteur diminuée à: ");
    Serial.println(hauteurActuelle);*/
    BTSerial.print("Hauteur diminuée à: ");
    BTSerial.println(hauteurActuelle);
  } else {
    //Serial.println("Hauteur minimale atteinte");
    BTSerial.println("Hauteur minimale atteinte");
  }
}

// Fonction pour appliquer la hauteur aux servos (basée sur la position actuelle)
void appliquerHauteur() {
  // Appliquer les modifications en fonction de la position actuelle
  // FR épaule: +hauteurActuelle, genou: -2*hauteurActuelle
  Move(FR_EPAULE, currentAngles[3] + hauteurActuelle);
  Move(FR_GENOU, currentAngles[2] - 2 * hauteurActuelle);
  
  // BR épaule: -hauteurActuelle, genou: +2*hauteurActuelle
  Move(BR_EPAULE, currentAngles[7] - hauteurActuelle);
  Move(BR_GENOU, currentAngles[6] + 2 * hauteurActuelle);
  
  // FL épaule: -hauteurActuelle, genou: +2*hauteurActuelle
  Move(FL_EPAULE, currentAngles[1] - hauteurActuelle);
  Move(FL_GENOU, currentAngles[0] + 2 * hauteurActuelle);
  
  // BL épaule: +hauteurActuelle, genou: -2*hauteurActuelle
  Move(BL_EPAULE, currentAngles[5] + hauteurActuelle);
  Move(BL_GENOU, currentAngles[4] - 2 * hauteurActuelle);
}

void avancer() {
  for (int i = 1; i <= cycle; i++) {
    repos();
    
    // Phase A: FR et BL en mouvement, FL et BR en appui
    for (float t = 0; t < 2*PI; t += step_size) {
      float x, y;
      
      // FR mouvement (sens normal)
      getEllipsePoint(t, x, y, true);
      setLegPosition("FR", x, y);
      
      // BL mouvement (sens normal)
      getEllipsePoint(t, x, y, false);
      setLegPosition("BL", x, y);
      
      // FL appui (point bas)
      getEllipsePoint(3*PI/2, x, y, false);
      setLegPosition("FL", x, y);
      
      // BR appui (point bas)
      getEllipsePoint(3*PI/2, x, y, true);
      setLegPosition("BR", x, y);
      
      delay(delay_time);
    }

    // Phase B: FL et BR en mouvement, FR et BL en appui
    for (float t = 0; t < 2*PI; t += step_size) {
      float x, y;
      
      // FL mouvement (sens normal)
      getEllipsePoint(t, x, y, false);
      setLegPosition("FL", x, y);
      
      // BR mouvement (sens normal)
      getEllipsePoint(t, x, y, true);
      setLegPosition("BR", x, y);
      
      // FR appui (point bas)
      getEllipsePoint(3*PI/2, x, y, true);
      setLegPosition("FR", x, y);
      
      // BL appui (point bas)
      getEllipsePoint(3*PI/2, x, y, false);
      setLegPosition("BL", x, y);
      
      delay(delay_time);
    }
  }
}

void initialize(int servo) {
  if (servo == -1) {
    for (int i = 0; i < 16; i++) {
      pwm.setPWM(i, 0, servoCenter);
    }
    return;
  }
  int pulse1500 = round(1500 / microsPerStep);
  pwm.setPWM(servo, 0, pulse1500);
}

void repos() {
  // Position de repos pour toutes les pattes
  setLegPosition("FR", centerX, centerY - radius);
  setLegPosition("FL", centerX, centerY - radius);
  setLegPosition("BR", centerX, centerY - radius);
  setLegPosition("BL", centerX, centerY - radius);
  delay(500);
}

void setLegPosition(String leg, float x, float y) {
  float d = sqrt(x * x + y * y);
  d = constrain(d, fabs(L1 - L2) + 0.1, L1 + L2 - 0.1);

  float cosTheta2 = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  cosTheta2 = constrain(cosTheta2, -1.0, 1.0);
  
  float theta2 = acos(cosTheta2);
  if (leg == "FL" || leg == "BR") theta2 = -theta2;
  
  float theta1 = atan2(y, x) - atan2(L2 * sin(theta2), L1 + L2 * cos(theta2));

  float deg1 = theta1 * 180.0 / M_PI;
  float deg2 = theta2 * 180.0 / M_PI;

  int servoAngleShoulder, servoAngleKnee;

  if (leg == "FR") {
    servoAngleShoulder = FR_shoulder_offset + deg1;
    servoAngleKnee = FR_knee_offset + deg2;
  } else if (leg == "FL") {
    servoAngleShoulder = FL_shoulder_offset + deg1;
    servoAngleKnee = FL_knee_offset + deg2;
  } else if (leg == "BR") {
    servoAngleShoulder = BR_shoulder_offset + deg1;
    servoAngleKnee = BR_knee_offset + deg2;
  } else if (leg == "BL") {
    servoAngleShoulder = BL_shoulder_offset + deg1;
    servoAngleKnee = BL_knee_offset + deg2;
  }

  servoAngleShoulder = constrain(servoAngleShoulder, 0, 180);
  servoAngleKnee = constrain(servoAngleKnee, 0, 180);

  if (leg == "FR") {
    Move(FR_EPAULE, servoAngleShoulder);
    Move(FR_GENOU, servoAngleKnee);
  } else if (leg == "FL") {
    Move(FL_EPAULE, servoAngleShoulder);
    Move(FL_GENOU, servoAngleKnee);
  } else if (leg == "BR") {
    Move(BR_EPAULE, servoAngleShoulder);
    Move(BR_GENOU, servoAngleKnee);
  } else if (leg == "BL") {
    Move(BL_EPAULE, servoAngleShoulder);
    Move(BL_GENOU, servoAngleKnee);
  }
}

void Move(int servo, float angle) {
  int pulseWidth = map(angle, 0, 180, SERVOMIN, SERVOMAX);
  pwm.setPWM(servo, 0, pulseWidth);
  
  // Mettre à jour l'angle actuel du servo
  switch(servo) {
    case FL_GENOU: currentAngles[0] = angle; break;
    case FL_EPAULE: currentAngles[1] = angle; break;
    case FR_GENOU: currentAngles[2] = angle; break;
    case FR_EPAULE: currentAngles[3] = angle; break;
    case BL_GENOU: currentAngles[4] = angle; break;
    case BL_EPAULE: currentAngles[5] = angle; break;
    case BR_GENOU: currentAngles[6] = angle; break;
    case BR_EPAULE: currentAngles[7] = angle; break;
  }
}

// Fonction tourner (conservée au cas où)
void tournerPhaseA() {
  // Phase A: FR et BL en mouvement, FL et BR en appui
  for (float t = 0; t < 2*PI; t += step_size) {
    float x, y;
    
    // FR mouvement (sens inverse)
    getEllipsePoint(2*PI - t, x, y);
    setLegPosition("FR", x, y);
    
    // BL mouvement (sens inverse)
    getEllipsePoint(2*PI-t, x, y);
    setLegPosition("BL", x, y);
    
    // FL appui (point bas)
    getEllipsePoint(3*PI/2, x, y);
    setLegPosition("FL", x, y);
    
    // BR appui (point bas)
    getEllipsePoint(3*PI/2, x, y);
    setLegPosition("BR", x, y);
    
    delay(delay_time);
  }
}

void tournerPhaseB() {
  // Phase B: FL et BR en mouvement, FR et BL en appui
  for (float t = 0; t < 2*PI; t += step_size) {
    float x, y;
    
    // FL mouvement
    getEllipsePoint(t, x, y);
    setLegPosition("FL", x, y);
    
    // BR mouvement (sens inverse)
    getEllipsePoint(t, x, y);
    setLegPosition("BR", x, y);
    
    // FR appui (point bas)
    getEllipsePoint(3*PI/2, x, y);
    setLegPosition("FR", x, y);
    
    // BL appui (point bas)
    getEllipsePoint(3*PI/2, x, y);
    setLegPosition("BL", x, y);
    
    delay(delay_time);
  }
}


void tourner(bool sens_positif) {
  for (int i = 1 ; i<=cycle1;i++){
    repos();

    if (sens_positif) {
      tournerPhaseA(); tournerPhaseB();
    }
    else {
      tournerPhaseB(); tournerPhaseA();
    }

  }
}

void init1(){
  for (int i=0;i<=7;i++){
    if(i!=1 && i!=3){
      Move(i,90);
    }
    else{
      Move(i,98);
    }
  }
}

void arriere(){
  for (int i = 1; i <= cycle; i++) {
    repos();
    
    // Phase A: FR et BL en mouvement, FL et BR en appui
    for (float t = 0; t < 2*PI; t += step_size) {
      float x, y;
      
      // FR mouvement (sens normal)
      getEllipsePoint(t, x, y, true);
      setLegPosition("BL", x, y);
      
      // BL mouvement (sens normal)
      getEllipsePoint(t, x, y, false);
      setLegPosition("FR", x, y);
      
      // FL appui (point bas)
      getEllipsePoint(3*PI/2, x, y, false);
      setLegPosition("BR", x, y);
      
      // BR appui (point bas)
      getEllipsePoint(3*PI/2, x, y, true);
      setLegPosition("FL", x, y);
      
      delay(delay_time);
    }

    // Phase B: FL et BR en mouvement, FR et BL en appui
    for (float t = 0; t < 2*PI; t += step_size) {
      float x, y;
      
      // FL mouvement (sens normal)
      getEllipsePoint(t, x, y, false);
      setLegPosition("BR", x, y);
      
      // BR mouvement (sens normal)
      getEllipsePoint(t, x, y, true);
      setLegPosition("FL", x, y);
      
      // FR appui (point bas)
      getEllipsePoint(3*PI/2, x, y, true);
      setLegPosition("BL", x, y);
      
      // BL appui (point bas)
      getEllipsePoint(3*PI/2, x, y, false);
      setLegPosition("FR", x, y);
      
      delay(delay_time);
    }
  }
}


void loop() {
  //if (Serial.available()) {
  if (BTSerial.available()) {
    /*char ch = Serial.read();
    Serial.print("Commande: ");
    Serial.println(ch);*/
    char ch = BTSerial.read();
    BTSerial.print("Commande: ");
    BTSerial.println(ch);
    Serial.println(ch);
    
    if (ch == 'i') {
      //int servo = Serial.parseInt();
      int servo = BTSerial.parseInt();
      initialize(servo);
    } else if (ch == 's') {
      //int servo = Serial.parseInt();
      //float angle = Serial.parseFloat();
      int servo = BTSerial.parseInt();
      float angle = BTSerial.parseFloat();
      Move(servo, angle);
    } else if (ch == 'r') {
      repos();
    } else if (ch == 'a') {
      avancer();
    } else if (ch == 't') {
      tourner(HIGH);
    } else if (ch == 'y') {
      tourner(LOW);
    } else if (ch == 'b') {
      init1();
    } else if (ch == 'd') {
      arriere();
    } else if (ch == 'h') {  // 'h' pour augmenter la hauteur
      augmenterHauteur();
    } else if (ch == 'l') {  // 'l' pour diminuer la hauteur (lower)
      diminuerHauteur();
    }
  }
  /*while(Serial.available()>0){
    Serial.read();
  }*/
}
