#include <Arduino.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include "Adafruit_HTU21DF.h"
#include <MPU6050_tockn.h>
#include <PID_v1.h>
#include <ESP32Servo.h>
#include <SimpleTimer.h>

// Configuration des servomoteurs
Servo servoAzimut;    
Servo servoElevation; 
const int servoAzimutPin = 4;
// const int servoElevationPin = 35;
const int azimutMin = 10;
const int azimutMax = 95;
// const int elevationMin = 110;
// const int elevationMax = 180;
int azimutAngle = 47;
int elevationAngle = 170;

// Configuration des capteurs
MPU6050 mpu6050(Wire);
TinyGPSPlus gps;
Adafruit_HTU21DF htu = Adafruit_HTU21DF();
const int trigPin = 32;
const int echoPin = 2;
const int gasPin = 35;
const int I2C_SDA = 21;
const int I2C_SCL = 22;

// Variables des capteurs
float distanceVal, temperatureVal, humidityVal;
float gasVal;
float accX, accY, accZ, gyroX, gyroY, gyroZ, tempMPU;
double latitude, longitude, altitude;
int satellites;

// Configuration radio
#define RADIO_RX_PIN 16
#define RADIO_TX_PIN 17
#define RADIO_BAUD 57600
HardwareSerial RadioSerial(2);

// Configuration de l'asservissement
#define codeurPinA1 5
#define codeurPinA2 13
#define codeurPinA3 12
#define codeurPinA4 26
#define PWMPinA1 19
#define PWMPinA2 23
#define PWMPinA3 27
#define PWMPinA4 33
#define DIRPinA1 18
#define DIRPinA2 15
#define DIRPinA3 14
#define DIRPinA4 25

// Variables d'asservissement
SimpleTimer timer;
float r = 7.6;
float l = 54.15;
float wmax = 160.0;
float w1, w2, w3, w4;
float vit_roue_tour_min1, vit_roue_tour_min2, vit_roue_tour_min3, vit_roue_tour_min4;
float pos1, pos2, pos3, pos4;
float pos_roue_tour_min1, pos_roue_tour_min2, pos_roue_tour_min3, pos_roue_tour_min4;
int frequence_echantillonnage = 50;
float kp = 5, ki = 4, kd = 0.002;
float kp_pos = 5, ki_pos = 4, kd_pos = 0.00;
volatile unsigned int tick_codeuse1 = 0, tick_codeuse2 = 0, tick_codeuse3 = 0, tick_codeuse4 = 0;
volatile unsigned int pos_codeuse1 = 0, pos_codeuse2 = 0, pos_codeuse3 = 0, pos_codeuse4 = 0;
int rapport_reducteur = 50;
int resolution = 24;
bool envole = 0, pos = 0;
int s1 = 1, s2 = 1, s3 = 1, s4 = 1;
float Vmax = 255;
unsigned long debut = 0;
bool essai = 0;

// Variables pour contrôle position
unsigned long positionMoveStartTime = 0;
float positionMoveDuration = 0;
bool inPositionMove = false;
float vx_cmd = 0, vy_cmd = 0, wz_cmd = 0;
const float baseSpeed = 15.0;
bool angle = 0;

// PID
double Setpoint1, Input1, Output1;
double Setpoint2, Input2, Output2;
double Setpoint3, Input3, Output3;
double Setpoint4, Input4, Output4;
double Setpos1, Inpos1, Outpos1;
double Setpos2, Inpos2, Outpos2;
double Setpos3, Inpos3, Outpos3;
double Setpos4, Inpos4, Outpos4;

PID pid1(&Input1, &Output1, &Setpoint1, kp, ki, kd, DIRECT);
PID pid2(&Input2, &Output2, &Setpoint2, kp, ki, kd, DIRECT);
PID pid3(&Input3, &Output3, &Setpoint3, kp, ki, kd, DIRECT);
PID pid4(&Input4, &Output4, &Setpoint4, kp, ki, kd, DIRECT);
PID pid5(&Inpos1, &Outpos1, &Setpos1, kp, ki, kd, DIRECT);
PID pid6(&Inpos2, &Outpos2, &Setpos2, kp, ki, kd, DIRECT);
PID pid7(&Inpos3, &Outpos3, &Setpos3, kp, ki, kd, DIRECT);
PID pid8(&Inpos4, &Outpos4, &Setpos4, kp, ki, kd, DIRECT);

// Mutex
SemaphoreHandle_t mutexCapteurs;
SemaphoreHandle_t mutexGPS;
SemaphoreHandle_t mutexServos;
SemaphoreHandle_t mutexAsservissement;

// Tâches
void Task_LireCapteurs(void *pvParameters);
void Task_LireGPS(void *pvParameters);
void Task_Affichage(void *pvParameters);
void Task_ControleServos(void *pvParameters);
void Task_Asservissement(void *pvParameters);
void Task_CommandeSerie(void *pvParameters);

void setup() {
  Serial.begin(57600);
  Serial.println("Initialisation du système...");

  // Initialisation hardware
  pinMode(echoPin, INPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(gasPin, INPUT);
  digitalWrite(trigPin, HIGH);

  // // Initialisation des servos
  servoAzimut.attach(servoAzimutPin);
  // servoElevation.attach(servoElevationPin);
  servoAzimut.write(azimutAngle);
  // servoElevation.write(elevationAngle);

  // Initialisation radio
  RadioSerial.begin(RADIO_BAUD, SERIAL_8N1, RADIO_RX_PIN, RADIO_TX_PIN);
  // Initialisation capteurs
  Wire.begin(I2C_SDA, I2C_SCL);
  mpu6050.begin();
  mpu6050.calcGyroOffsets(true);

  if (!htu.begin()) {
    
    Serial.println("Erreur : Capteur HTU21D non détecté !");
    while (1)
      ;
  }

  // Initialisation des moteurs
  pinMode(PWMPinA1, OUTPUT);
  pinMode(DIRPinA1, OUTPUT);
  pinMode(codeurPinA1, INPUT_PULLUP);
  digitalWrite(PWMPinA1, 255);
  digitalWrite(DIRPinA1, LOW);

  pinMode(PWMPinA2, OUTPUT);
  pinMode(DIRPinA2, OUTPUT);
  pinMode(codeurPinA2, INPUT_PULLUP);
  digitalWrite(PWMPinA2, 255);
  digitalWrite(DIRPinA2, LOW);

  pinMode(PWMPinA3, OUTPUT);
  pinMode(DIRPinA3, OUTPUT);
  pinMode(codeurPinA3, INPUT_PULLUP);
  digitalWrite(PWMPinA3, 255);
  digitalWrite(DIRPinA3, LOW);

  pinMode(PWMPinA4, OUTPUT);
  pinMode(DIRPinA4, OUTPUT);
  pinMode(codeurPinA4, INPUT_PULLUP);
  digitalWrite(PWMPinA4, 255);
  digitalWrite(DIRPinA4, LOW);

  // Configuration des interruptions encodeurs
  attachInterrupt(digitalPinToInterrupt(codeurPinA1), GestionInterruptionCodeurPinA1, CHANGE);
  attachInterrupt(digitalPinToInterrupt(codeurPinA2), GestionInterruptionCodeurPinA2, CHANGE);
  attachInterrupt(digitalPinToInterrupt(codeurPinA3), GestionInterruptionCodeurPinA3, CHANGE);
  attachInterrupt(digitalPinToInterrupt(codeurPinA4), GestionInterruptionCodeurPinA4, CHANGE);

  // Configuration des PID
  pid1.SetMode(AUTOMATIC);
  pid1.SetSampleTime(1000 / frequence_echantillonnage);
  pid1.SetOutputLimits(0, Vmax);

  pid2.SetMode(AUTOMATIC);
  pid2.SetSampleTime(1000 / frequence_echantillonnage);
  pid2.SetOutputLimits(0, Vmax);

  pid3.SetMode(AUTOMATIC);
  pid3.SetSampleTime(1000 / frequence_echantillonnage);
  pid3.SetOutputLimits(0, Vmax);

  pid4.SetMode(AUTOMATIC);
  pid4.SetSampleTime(1000 / frequence_echantillonnage);
  pid4.SetOutputLimits(0, Vmax);

  pid5.SetMode(AUTOMATIC);
  pid5.SetSampleTime(1000 / frequence_echantillonnage);
  pid5.SetOutputLimits(0, Vmax);

  pid6.SetMode(AUTOMATIC);
  pid6.SetSampleTime(1000 / frequence_echantillonnage);
  pid6.SetOutputLimits(0, Vmax);

  pid7.SetMode(AUTOMATIC);
  pid7.SetSampleTime(1000 / frequence_echantillonnage);
  pid7.SetOutputLimits(0, Vmax);

  pid8.SetMode(AUTOMATIC);
  pid8.SetSampleTime(1000 / frequence_echantillonnage);
  pid8.SetOutputLimits(0, Vmax);

  // Configuration du timer
  timer.setInterval(1000 / frequence_echantillonnage, asservissement1);
  timer.setInterval(1000 / frequence_echantillonnage, asservissement2);
  timer.setInterval(1000 / frequence_echantillonnage, asservissement3);
  timer.setInterval(1000 / frequence_echantillonnage, asservissement4);

  // Création des mutex
  mutexCapteurs = xSemaphoreCreateMutex();
  mutexGPS = xSemaphoreCreateMutex();
  mutexServos = xSemaphoreCreateMutex();
  mutexAsservissement = xSemaphoreCreateMutex();

  if (mutexCapteurs == NULL || mutexGPS == NULL || mutexServos == NULL || mutexAsservissement == NULL) {
    Serial.println("Erreur création mutex");
    while (1)
      ;
  }

  // Création des tâches
  xTaskCreatePinnedToCore(Task_LireCapteurs, "LireCapteurs", 4096, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(Task_LireGPS, "LireGPS", 4096, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(Task_Affichage, "Affichage", 4096, NULL, 1, NULL, 1);
  xTaskCreatePinnedToCore(Task_ControleServos, "ControleServos", 2048, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(Task_Asservissement, "Asservissement", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(Task_CommandeSerie, "CommandeSerie", 4096, NULL, 1, NULL, 1);

  // Test de communication radio
  RadioSerial.println("Système initialisé - Prêt à recevoir des commandes");
}

void loop() {
  vTaskDelay(portMAX_DELAY);
}

// Tâche de lecture des capteurs
void Task_LireCapteurs(void *pvParameters) {
  while (1) {
    if (envole == 0) {
      if (xSemaphoreTake(mutexCapteurs, portMAX_DELAY) == pdTRUE) {
        digitalWrite(trigPin, LOW);
        delayMicroseconds(2);
        digitalWrite(trigPin, HIGH);
        delayMicroseconds(10);
        digitalWrite(trigPin, LOW);
        float duration = pulseIn(echoPin, HIGH);
        distanceVal = (duration * 0.0343) / 2;

        gasVal = analogRead(gasPin);
        temperatureVal = htu.readTemperature();
        humidityVal = htu.readHumidity();

        mpu6050.update();
        accX = mpu6050.getAccX();
        accY = mpu6050.getAccY();
        accZ = mpu6050.getAccZ();
        gyroX = mpu6050.getGyroX();
        gyroY = mpu6050.getGyroY();
        gyroZ = mpu6050.getGyroZ();
        tempMPU = mpu6050.getTemp();

        xSemaphoreGive(mutexCapteurs);
      }
      vTaskDelay(pdMS_TO_TICKS(2000));
    }
  }
}

// Tâche de lecture GPS (à compléter selon votre module GPS)
void Task_LireGPS(void *pvParameters) {
  while (1) {
    if (xSemaphoreTake(mutexGPS, portMAX_DELAY) == pdTRUE) {
      // Code pour lire le GPS ici
      xSemaphoreGive(mutexGPS);
    }
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

// Tâche d'affichage des données
void Task_Affichage(void *pvParameters) {
  while (1) {
    if (envole == 0) {
      if (xSemaphoreTake(mutexCapteurs, portMAX_DELAY) == pdTRUE) {
        RadioSerial.print("[Distance] : ");
        RadioSerial.print(distanceVal);
        RadioSerial.println(" cm");
        RadioSerial.print("[Gaz] : ");
        RadioSerial.println(gasVal);
        RadioSerial.print("[HTU21D] Température : ");
        RadioSerial.print(temperatureVal);
        RadioSerial.println(" °C");
        RadioSerial.print("[HTU21D] Humidité : ");
        RadioSerial.print(humidityVal);
        RadioSerial.println(" %");
        RadioSerial.print("[MPU6050] Accélération X: ");
        RadioSerial.print(accX);
        RadioSerial.print(" | Y: ");
        RadioSerial.print(accY);
        RadioSerial.print(" | Z: ");
        RadioSerial.println(accZ);
        RadioSerial.print("[MPU6050] Gyroscope X: ");
        RadioSerial.print(gyroX);
        RadioSerial.print(" | Y: ");
        RadioSerial.print(gyroY);
        RadioSerial.print(" | Z: ");
        RadioSerial.println(gyroZ);
        RadioSerial.print("[MPU6050] Température: ");
        RadioSerial.print(tempMPU);
        RadioSerial.println(" °C");
        xSemaphoreGive(mutexCapteurs);
      }

      if (xSemaphoreTake(mutexGPS, portMAX_DELAY) == pdTRUE) {
        RadioSerial.print("[GPS] Latitude: ");
        RadioSerial.print(latitude, 6);
        RadioSerial.print(" | Longitude: ");
        RadioSerial.print(longitude, 6);
        RadioSerial.print(" | Altitude: ");
        RadioSerial.print(altitude);
        RadioSerial.println(" m");
        RadioSerial.print("[GPS] Satellites: ");
        RadioSerial.println(satellites);
        xSemaphoreGive(mutexGPS);
      }

      Serial.println("-----------------------------");
      vTaskDelay(pdMS_TO_TICKS(2000));
    }
  }
}

// Tâche de contrôle des servomoteurs
void Task_ControleServos(void *pvParameters) {
  while (1) {
    if (xSemaphoreTake(mutexServos, portMAX_DELAY) == pdTRUE) {
      servoAzimut.write(azimutAngle);
      xSemaphoreGive(mutexServos);
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// Tâche d'asservissement
void Task_Asservissement(void *pvParameters) {
  while (1) {
    timer.run();
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

void Task_CommandeSerie(void *pvParameters) {
  while (1) {
    // Vérifier si le déplacement en position est terminé
    if (inPositionMove && (millis() - positionMoveStartTime >= positionMoveDuration)) {
      if (xSemaphoreTake(mutexAsservissement, portMAX_DELAY) == pdTRUE) {
        stopmotors();
        inPositionMove = false;
        envole = 0;
        xSemaphoreGive(mutexAsservissement);
      }
      RadioSerial.println("Déplacement position terminé");
    }

    // Lecture des commandes radio
    if (RadioSerial.available() > 0) {
      String data = RadioSerial.readStringUntil('\n');
      data.trim();
      
      // Interrompre toute commande en cours
      if (xSemaphoreTake(mutexAsservissement, (TickType_t)100) == pdTRUE) {
        stopmotors();
        inPositionMove = false;
        envole = 0;
        xSemaphoreGive(mutexAsservissement);
      }
      
      processCommand(data);
    }

    // Lecture des commandes USB
    if (Serial.available() > 0) {
      String data = Serial.readStringUntil('\n');
      data.trim();
      
      // Interrompre toute commande en cours
      if (xSemaphoreTake(mutexAsservissement, (TickType_t)100) == pdTRUE) {
        stopmotors();
        inPositionMove = false;
        envole = 0;
        xSemaphoreGive(mutexAsservissement);
      }
      
      processCommand(data);
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}



void processCommand(String data) {
  char Mode = data.charAt(0);
  resetMotorSystem();
  if (Mode == 'c') {
    pos = 0;
    // Commande cinématique: c Vx Vy Wz
    int firstSpace = data.indexOf(' ');
    int secondSpace = data.indexOf(' ', firstSpace + 1);
    int thirdSpace = data.indexOf(' ', secondSpace + 1);

    float vx = data.substring(firstSpace + 1, secondSpace).toFloat();
    float vy = data.substring(secondSpace + 1, thirdSpace).toFloat();
    float wzz = data.substring(thirdSpace + 1).toFloat();

    // Calcul des vitesses moteurs
    float wz = wzz * (2 * 3.14 / 60);  // Conversion en rad/s
    w1 = (1 / r) * (vx - vy - l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (-vx - vy + l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (vx - vy + l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (-vx - vy - l * wz) * (60 / (2 * 3.14));

    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'p') {
    // Commande position: p x(cm) y(cm) theta(rad)
    int firstSpace = data.indexOf(' ');
    int secondSpace = data.indexOf(' ', firstSpace + 1);
    int thirdSpace = data.indexOf(' ', secondSpace + 1);

    float x = data.substring(firstSpace + 1, secondSpace).toFloat();
    float y = data.substring(secondSpace + 1, thirdSpace).toFloat();
    float theta = data.substring(thirdSpace + 1).toFloat();

    // 1. Déterminer les signes des vitesses
    vx_cmd = (x != 0) ? (x > 0 ? baseSpeed : -baseSpeed) : 0;
    vy_cmd = (y != 0) ? (y > 0 ? baseSpeed : -baseSpeed) : 0;
    wz_cmd = (theta != 0) ? (theta > 0 ? baseSpeed : -baseSpeed) : 0;  // réduit pour la rotation

    // 2. Calculer la distance totale et la durée
    float distance = sqrt(x * x + y * y + theta * theta);                     // distance combinée
    float speed = sqrt(vx_cmd * vx_cmd + vy_cmd * vy_cmd + wz_cmd * wz_cmd);  // vitesse résultante
    if (x == 0 && y == 0) {
      angle = 1;
    }
    if (speed > 0) {
      if (angle == 1) {
        positionMoveDuration = (distance / speed) * 1000 * 60;  // en ms
        angle = 0;
      } else {
        positionMoveDuration = (distance / speed) * 1000;  // en ms
      }

    } else {
      positionMoveDuration = 0;
    }

    // 3. Démarrer le mouvement
    positionMoveStartTime = millis();
    inPositionMove = true;
    envole = 0;
    pos = 0;  // utiliser le mode vitesse

    float wz = wz_cmd * (2 * 3.14 / 60);  // Conversion en rad/s
    w1 = (1 / r) * (vx_cmd - vy_cmd - l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (-vx_cmd - vy_cmd + l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (vx_cmd - vy_cmd + l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (-vx_cmd - vy_cmd - l * wz) * (60 / (2 * 3.14));

    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);

    RadioSerial.print("Déplacement position démarré. Durée: ");
    RadioSerial.print(positionMoveDuration);
    RadioSerial.println(" ms");

  } else if (Mode == 'v') {
    pos = 0;
    // Commande de vitesse simple
    float vitesse = data.substring(2).toFloat();
    Setpoint1 = Setpoint2 = Setpoint3 = Setpoint4 = vitesse;
    envole = 1;

    // Confirmation de réception via radio
    RadioSerial.println("Commande vitesse reçue");
  } else if (Mode == 'r') {
    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w1 = (1 / r) * (30 - l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (30 + l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (30 + l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (30 - l * wz) * (60 / (2 * 3.14));

    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'a') {

    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w1 = (1 / r) * (-30 - l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (-30 + l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (-30 + l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (-30 - l * wz) * (60 / (2 * 3.14));

    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'd') {

    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w1 = (1 / r) * (30 - l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (-30 + l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (30 + l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (-30 - l * wz) * (60 / (2 * 3.14));

    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'g') {

    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w1 = (1 / r) * (-30 - l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (+30 + l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (-30 + l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (30 - l * wz) * (60 / (2 * 3.14));

    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

  } else if (Mode == 'l') {

    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0.33;  // Conversion en rad/s
    w1 = (1 / r) * (-l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (+l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (+l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (-l * wz) * (60 / (2 * 3.14));

    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;



  } else if (Mode == 't') {

    pos = 0;
    // Calcul des vitesses moteurs
    float wz = -0.33;  // Conversion en rad/s
    w1 = (1 / r) * (-l * wz) * (60 / (2 * 3.14));
    w2 = (1 / r) * (+l * wz) * (60 / (2 * 3.14));
    w3 = (1 / r) * (+l * wz) * (60 / (2 * 3.14));
    w4 = (1 / r) * (-l * wz) * (60 / (2 * 3.14));

    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

  } else if (Mode == 's') {

    pos = 0;
    // Commande d'arrêt - CORRECTION COMPLÈTE
    Setpoint1 = Setpoint2 = Setpoint3 = Setpoint4 = 0;
    Setpos1 = Setpos2 = Setpos3 = Setpos4 = 0;

    // Réinitialiser les sorties PID
    Output1 = Output2 = Output3 = Output4 = 0;
    Output1 = Output2 = Output3 = Output4 = 0;

    // Réinitialiser les entrées PID
    Input1 = Input2 = Input3 = Input4 = 0;
    Inpos1 = Inpos2 = Inpos3 = Inpos4 = 0;

    // Arrêter physiquement tous les moteurs
    stopmotors();

    // Réinitialiser les compteurs d'encodeurs
    tick_codeuse1 = tick_codeuse2 = tick_codeuse3 = tick_codeuse4 = 0;
    pos_codeuse1 = pos_codeuse2 = pos_codeuse3 = pos_codeuse4 = 0;

    // Réinitialiser les vitesses calculées
    pos_roue_tour_min1 = pos_roue_tour_min2 = pos_roue_tour_min3 = pos_roue_tour_min4 = 0;
    pos1 = pos2 = pos3 = pos4 = 0;

    envole = 0;
    essai = 0;

    RadioSerial.println("Robot arrêté");
  } else if (Mode == 'j') {
    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w1 = 0;
    w2 = (1 / r) * (-30) * (60 / (2 * 3.14));
    w3 = 0;
    w4 = (1 / r) * (-30) * (60 / (2 * 3.14));
    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'n') {
    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w1 = 0;
    w2 = (1 / r) * (30) * (60 / (2 * 3.14));
    w3 = 0;
    w4 = (1 / r) * (30) * (60 / (2 * 3.14));
    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'h') {
    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w2 = 0;
    w1 = (1 / r) * (-30) * (60 / (2 * 3.14));
    w4 = 0;
    w3 = (1 / r) * (-30) * (60 / (2 * 3.14));
    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'm') {
    pos = 0;
    // Calcul des vitesses moteurs
    float wz = 0;  // Conversion en rad/s
    w2 = 0;
    w1 = (1 / r) * (30) * (60 / (2 * 3.14));
    w4 = 0;
    w3 = (1 / r) * (30) * (60 / (2 * 3.14));
    debut = millis();
    // Gestion du sens des moteurs
    if (w1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (w2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (w3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (w4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Normalisation des vitesses
    float max_w = max(max(abs(w1), abs(w2)), max(abs(w3), abs(w4)));
    if (max_w > wmax) {
      w1 = w1 * (wmax / max_w);
      w2 = w2 * (wmax / max_w);
      w3 = w3 * (wmax / max_w);
      w4 = w4 * (wmax / max_w);
    }

    // Mise à jour des consignes
    Setpoint1 = abs(w1);
    Setpoint2 = abs(w2);
    Setpoint3 = abs(w3);
    Setpoint4 = abs(w4);
    envole = 0;

    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue");
  } else if (Mode == 'y') {
    Serial.println("je suis y");
    delay(1000);
    pos = 1;
    // Commande cinématique: c Vx Vy Wz
    int firstSpace = data.indexOf(' ');
    int secondSpace = data.indexOf(' ', firstSpace + 1);
    int thirdSpace = data.indexOf(' ', secondSpace + 1);

    float x = data.substring(firstSpace + 1, secondSpace).toFloat();
    float y = data.substring(secondSpace + 1, thirdSpace).toFloat();
    float thetazz = data.substring(thirdSpace + 1).toFloat();

    // Calcul des vitesses moteurs
    float thetaz = thetazz * (2 * 3.14);  // Conversion en rad
    pos1 = (1 / r) * (x - y - l * thetaz) * (1 / (4 * 3.14));
    pos2 = (1 / r) * (-x - y + l * thetaz) * (1 / (4 * 3.14));
    pos3 = (1 / r) * (x - y + l * thetaz) * (1 / (4 * 3.14));
    pos4 = (1 / r) * (-x - y - l * thetaz) * (1 / (4 * 3.14));

    // Gestion du sens des moteurs
    if (pos1 > 0) {
      digitalWrite(DIRPinA1, HIGH);
      s1 = 1;
    } else {
      digitalWrite(DIRPinA1, LOW);
      s1 = -1;
    }
    if (pos2 > 0) {
      digitalWrite(DIRPinA2, LOW);
      s2 = 1;
    } else {
      digitalWrite(DIRPinA2, HIGH);
      s2 = -1;
    }
    if (pos3 > 0) {
      digitalWrite(DIRPinA3, LOW);
      s3 = 1;
    } else {
      digitalWrite(DIRPinA3, HIGH);
      s3 = -1;
    }
    if (pos4 > 0) {
      digitalWrite(DIRPinA4, HIGH);
      s4 = 1;
    } else {
      digitalWrite(DIRPinA4, LOW);
      s4 = -1;
    }

    // Mise à jour des consignes positions
    Setpos1 = abs(pos1);
    Setpos2 = abs(pos2);
    Setpos3 = abs(pos3);
    Setpos4 = abs(pos4);

    envole = 0;
    // Confirmation de réception via radio
    RadioSerial.println("Commande cinématique reçue position");
  } else if (Mode == 'f') {
    envole = 0;
  }else if (Mode == 'b'){
    // Commande des servos: b azimute(°) elevation(°)
    int firstSpace = data.indexOf(' ');
    int secondSpace = data.indexOf(' ', firstSpace + 1);


    int x = data.substring(firstSpace + 1, secondSpace).toInt();
    int y = data.substring(secondSpace + 1).toInt();
    if(x > azimutMax || x < azimutMin){
      return ;
    }
    azimutAngle = x ;
    // if(y > elevationMax || y < elevationMin){
    //   return ;
    // }
    elevationAngle = y ;
  }
}

void asservissement1() {
  if (!pos) {
    int frequency_codeuse1 = frequence_echantillonnage * tick_codeuse1;
    vit_roue_tour_min1 = 60 * (float)frequency_codeuse1 / (float)resolution / (float)rapport_reducteur;
    Input1 = vit_roue_tour_min1;
    pid1.Compute();
    tick_codeuse1 = 0;
    int pwm1 = Output1;
    analogWrite(PWMPinA1, 255 - pwm1);

  } else if (pos) {

    int frequency_codeuse1 = pos_codeuse1;
    pos_roue_tour_min1 = (float)frequency_codeuse1 / (float)resolution / (float)rapport_reducteur;
    Inpos1 = pos_roue_tour_min1;
    pid5.Compute();
    int pwm1 = Outpos1;
    analogWrite(PWMPinA1, 255 - pwm1);
  }
  if (envole == 1) {
    Serial.print(vit_roue_tour_min1 * s1);
    Serial.print(",");
    Serial.print(w1);
    Serial.println();

    // Envoi des données via radio (optionnel)
    RadioSerial.print("M1:");
    RadioSerial.print(vit_roue_tour_min1 * s1);
    RadioSerial.print(",");
  }
}


void asservissement2() {
  if (!pos) {
    int frequency_codeuse2 = frequence_echantillonnage * tick_codeuse2;
    vit_roue_tour_min2 = 60 * (float)frequency_codeuse2 / (float)resolution / (float)rapport_reducteur;
    Input2 = vit_roue_tour_min2;
    pid2.Compute();
    tick_codeuse2 = 0;
    int pwm2 = Output2;
    analogWrite(PWMPinA2, 255 - pwm2);

  } else if (pos) {
    int frequency_codeuse2 = pos_codeuse2;
    pos_roue_tour_min2 = (float)frequency_codeuse2 / (float)resolution / (float)rapport_reducteur;
    Inpos2 = pos_roue_tour_min2;
    pid6.Compute();
    int pwm2 = Outpos2;
    analogWrite(PWMPinA2, 255 - pwm2);
  }
  if (envole == 1) {
    Serial.print(vit_roue_tour_min2 * s2);
    Serial.print(",");
    Serial.print(w2);
    Serial.println();

    // Envoi des données via radio (optionnel)
    RadioSerial.print("M2:");
    RadioSerial.print(vit_roue_tour_min2 * s2);
    RadioSerial.print(",");
  }
}


void asservissement3() {
  if (!pos) {
    int frequency_codeuse3 = frequence_echantillonnage * tick_codeuse3;
    vit_roue_tour_min3 = 60 * (float)frequency_codeuse3 / (float)resolution / (float)rapport_reducteur;
    Input3 = vit_roue_tour_min3;
    pid3.Compute();
    tick_codeuse3 = 0;
    int pwm3 = Output3;
    analogWrite(PWMPinA3, 255 - pwm3);
  }

  else if (pos) {
    int frequency_codeuse3 = pos_codeuse3;
    pos_roue_tour_min3 = (float)frequency_codeuse3 / (float)resolution / (float)rapport_reducteur;
    Inpos3 = pos_roue_tour_min3;
    pid7.Compute();
    int pwm3 = Outpos3;
    analogWrite(PWMPinA3, 255 - pwm3);
  }
  if (envole == 1) {
    Serial.print(vit_roue_tour_min3 * s3);
    Serial.print(",");
    Serial.print(w3);
    Serial.println();

    // Envoi des données via radio (optionnel)
    RadioSerial.print("M3:");
    RadioSerial.print(vit_roue_tour_min3 * s3);
    RadioSerial.print(",");
  }
}

void asservissement4() {
  if (!pos) {
    int frequency_codeuse4 = frequence_echantillonnage * tick_codeuse4;
    vit_roue_tour_min4 = 60 * (float)frequency_codeuse4 / (float)resolution / (float)rapport_reducteur;
    Input4 = vit_roue_tour_min4;
    pid4.Compute();
    tick_codeuse4 = 0;
    int pwm4 = Output4;
    analogWrite(PWMPinA4, 255 - pwm4);
  } else if (pos) {
    int frequency_codeuse4 = pos_codeuse4;
    pos_roue_tour_min4 = (float)frequency_codeuse4 / (float)resolution / (float)rapport_reducteur;
    Inpos4 = pos_roue_tour_min4;
    pid8.Compute();
    int pwm4 = Outpos4;
    analogWrite(PWMPinA4, 255 - pwm4);
  }
  if (envole == 1) {
    Serial.print(vit_roue_tour_min4 * s4);
    Serial.print(",");
    Serial.print(w4);
    Serial.println();

    // Envoi des données via radio (optionnel)
    RadioSerial.print("M4:");
    RadioSerial.print(vit_roue_tour_min3 * s4);
    RadioSerial.print(",");
  }
}

void stopmotors() {
  // Arrêter tous les moteurs avec PWM à 0 (pas 255)
  digitalWrite(PWMPinA1, 255);
  digitalWrite(PWMPinA2, 255);
  digitalWrite(PWMPinA3, 255);
  digitalWrite(PWMPinA4, 255);

  // Optionnel : remettre les directions à LOW
  digitalWrite(DIRPinA1, LOW);
  digitalWrite(DIRPinA2, LOW);
  digitalWrite(DIRPinA3, LOW);
  digitalWrite(DIRPinA4, LOW);

  // Réinitialiser les consignes
  Setpoint1 = Setpoint2 = Setpoint3 = Setpoint4 = 0;
  Output1 = Output2 = Output3 = Output4 = 0;
}


void resetMotorSystem() {
  // Arrêter physiquement les moteurs d'abord
  stopmotors();
  delay(10);  // Petit délai pour s'assurer de l'arrêt

  // Réinitialiser tous les PID
  pid1.SetMode(MANUAL);
  pid2.SetMode(MANUAL);
  pid3.SetMode(MANUAL);
  pid4.SetMode(MANUAL);
  pid5.SetMode(MANUAL);
  pid6.SetMode(MANUAL);
  pid7.SetMode(MANUAL);
  pid8.SetMode(MANUAL);

  // Réinitialiser toutes les sorties
  Output1 = Output2 = Output3 = Output4 = 0;
  Outpos1 = Outpos2 = Outpos3 = Outpos4 = 0;

  // Réinitialiser toutes les entrées
  Input1 = Input2 = Input3 = Input4 = 0;
  Inpos1 = Inpos2 = Inpos3 = Inpos4 = 0;

  // Réactiver les PID
  pid1.SetMode(AUTOMATIC);
  pid2.SetMode(AUTOMATIC);
  pid3.SetMode(AUTOMATIC);
  pid4.SetMode(AUTOMATIC);
  pid5.SetMode(AUTOMATIC);
  pid6.SetMode(AUTOMATIC);
  pid7.SetMode(AUTOMATIC);
  pid8.SetMode(AUTOMATIC);

  // Réinitialiser les compteurs
  tick_codeuse1 = tick_codeuse2 = tick_codeuse3 = tick_codeuse4 = 0;
  pos_codeuse1 = pos_codeuse2 = pos_codeuse3 = pos_codeuse4 = 0;
}

// Interruptions encodeurs
void GestionInterruptionCodeurPinA1() {
  if (!pos) {
    tick_codeuse1++;
    return;
  } else {
    pos_codeuse1++;
    return;
  }
}
void GestionInterruptionCodeurPinA2() {
  if (!pos) {
    tick_codeuse2++;
    return;
  } else {
    pos_codeuse2++;
    return;
  }
}
void GestionInterruptionCodeurPinA3() {
  if (!pos) {
    tick_codeuse3++;
    return;
  } else {
    pos_codeuse3++;
    return;
  }
}
void GestionInterruptionCodeurPinA4() {
  if (!pos) {
    tick_codeuse4++;
    return;
  } else {
    pos_codeuse4++;
    return;
  }
}

