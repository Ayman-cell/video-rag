# 🔧 Documentation Technique - Walking Gait

## Vue d'Ensemble de l'Architecture

```
┌─────────────────────────────────────────────────┐
│           Ordinateur / Terminal Série             │
|         (115200 baud, USB/Serial)               |
└────────────────────┬────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────┐
│        Arduino (UART RX/TX)                      │
│  - Parser de commandes                           │
│  - Machine d'état de marche                      │
│  - Contrôleur de cinématique inverse            │
└────────────────────┬────────────────────────────┘
                     │
       ┌─────────────┴──────────────┐
       │                            │
       ↓ I2C (SDA/SCL)               ↓
┌──────────────────┐          ┌─────────────┐
│ Adafruit PWM     │          │   Autres    │
│ Servo Driver     │          │  modules    │
│ (PCA9685)        │          │   I2C       │
└────┬─────┬──────┘          └─────────────┘
     │     │
   ┌─┴─┬──┴─┐
   ↓   ↓    ↓  ... (16 canaux PWM)
  S0  S1   S2   → Servomoteurs (6 utilisés)
  S3  S4   S6
```

---

## Configuration des Pins et Servomoteurs

### Schéma de Mapping

| Servo Index | Pin PWM | Articulation | Jambe | Orientation |
|-------------|---------|--------------|-------|-------------|
| 0 | 0 | Hanche (Hip) | Droite | Normal (HIGH) |
| 1 | 1 | Genou (Knee) | Droite | Inversé (LOW) |
| 2 | 2 | Cheville (Ankle) | Droite | Inversé (LOW) |
| 3 | 3 | Hanche (Hip) | Gauche | Inversé (LOW) |
| 4 | 4 | Genou (Knee) | Gauche | Normal (HIGH) |
| 5 | 6 | Cheville (Ankle) | Gauche | Normal (HIGH) |

### Corrections d'Angle

```cpp
float jointCorrection[] = {
    0.0,   // Servo 0 (Right Hip) : aucune correction
    0.0,   // Servo 1 (Right Knee) : aucune correction
    10.0,  // Servo 2 (Right Ankle) : +10° compensation
    5.0,   // Servo 3 (Left Hip) : +5° compensation
    0.0,   // Servo 4 (Left Knee) : aucune correction
    -20.0  // Servo 5 (Left Ankle) : -20° compensation
};
```

### Limites d'Angle

```cpp
const float HIP_LIMIT = 124.0;
float angleLimit[][2] = {
    {0.0, HIP_LIMIT},   // Right Hip
    {0.0, 180.0},       // Right Knee
    {0.0, 180.0},       // Right Ankle
    {0.0, HIP_LIMIT},   // Left Hip
    {0.0, 180.0},       // Left Knee
    {0.0, 180.0}        // Left Ankle
};
```

---

## Conversion PWM vers Angle

### Principe

La conversion entre **angle (0-180°)** et **largeur d'impulsion PWM** :

```cpp
// Paramètres PWM
#define SERVO_FREQ 50              // Fréquence : 50 Hz
#define USMIN  500                 // Pulse width min : 500 µs
#define USMAX  2500                // Pulse width max : 2500 µs

// Résolution : 4096 valeurs pour 20 ms (1/50 Hz)
const float microsPerStep = (float)(1000000.0/SERVO_FREQ)/4096.0;

// Conversion : microsecondes → valeur PWM 0-4095
const int SERVOMIN = round(USMIN/microsPerStep);    // ≈ 102
const int SERVOMAX = round(USMAX/microsPerStep);    // ≈ 511
```

### Fonction de Conversion

```cpp
int Angle_To_PWM(float angle) {
    int pulseWidth = map(angle, 0, 180, SERVOMIN, SERVOMAX);
    return pulseWidth;
}
// Exemple: 90° → ~307 PWM
```

---

## Cinématique Inverse Détaillée

### Problème Inverse Kinematics

Donnée une position cible (x, y) en mm, calculer les angles θ₁ et θ₂.

### Robot Kinématique

Le robot a une structure simple :
```
        Hanche
           o ← (0, 0)
           |
          L1 (63 mm)
           |
        Genou o
           |
          L2 (75 mm)
           |
        Cheville o ← Position cible (x, y)

Système de coordonnées :
+x → avant
+y → haut (inverse mécanique)
```

### Algorithme Détaillé

#### Étape 1 : Calcul de la Distance
```cpp
float d = sqrt(x * x + y * y);
```

#### Étape 2 : Vérification des Limites de Portée
```cpp
float maxReach = L1 + L2;  // 138 mm max
float minReach = fabs(L1 - L2);  // 12 mm min

if (d > maxReach) return false;  // Trop loin
if (d < minReach) return false;  // Trop proche
```

#### Étape 3 : Calcul de l'Angle du Genou (θ₂)

Utilisant la **loi du cosinus** :
$$\cos(\theta_2) = \frac{d^2 - L1^2 - L2^2}{2 \cdot L1 \cdot L2}$$

```cpp
float cosTheta2 = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2);

if (fabs(cosTheta2) > 1.01) return false;  // Impossible

float theta2 = acos(cosTheta2);
if (kneeUp) {
    theta2 = -theta2;  // Configuration genou haut/bas
}
```

#### Étape 4 : Calcul de l'Angle de la Hanche (θ₁)

```cpp
float theta1 = atan2(y, x) - atan2(L2 * sin(theta2), 
                                    L1 + L2 * cos(theta2));
```

#### Étape 5 : Conversion en Degrés

```cpp
theta1 = (theta1 * 180.0 / PI) + 180.0;
theta2 = (theta2 * 180.0 / PI) + 90.0;
```

#### Étape 6 : Vérification des Limites d'Articulation

```cpp
if (theta1 != constrain(theta1, 0.0, 180.0)) return false;
if (theta2 != constrain(theta2, 0.0, 180.0)) return false;
```

---

## Système de Marche (Gait Cycle)

### Vue d'Ensemble

Le cycle de marche alternant quadrupède :
- Jambe droite et jambe gauche travaillent en opposition
- Chaque cycle : STANCE (appui) + SWING (oscillation)
- Durées égales de STANCE et SWING

### Machine d'État

```
Cycle Progress: 0.0 → 1.0 (puis répète)

RIGHT LEG:   SWING [0.0-0.5) → STANCE [0.5-1.0)
LEFT LEG:    STANCE [0.0-0.5) → SWING [0.5-1.0)

       0.0    0.25   0.5    0.75   1.0
       ├──────┼─────┼──────┤──────┤
Right  |<--SWING--->|<----STANCE--->|
Left   |<--STANCE-->|<----SWING---->|
```

### Fonction GetGaitState

```cpp
struct GaitState GetGaitState(float cycleProgress, int leg) {
    // Appliquer offset pour jambes opposées
    float phaseOffset = (leg == 0) ? 0.5 : 0.0;  // Right = 0.5
    float adjustedProgress = fmod(cycleProgress + phaseOffset, 1.0);
    
    // Déterminer phase (STANCE/SWING)
    float stanceThreshold = 0.5;  // 50% STANCE, 50% SWING
    
    GaitState state;
    if (adjustedProgress < stanceThreshold) {
        state.phase = 'S';  // STANCE
        state.progressInPhase = adjustedProgress / stanceThreshold;
    } else {
        state.phase = 'W';  // SWING (Walking)
        state.progressInPhase = (adjustedProgress - stanceThreshold) / 0.5;
    }
    
    return state;
}
```

### Phase de STANCE (Appui)

La jambe pousse le corps vers l'avant :

```cpp
*targetX = (STEP_LENGTH / 2.0) - (progress * STEP_LENGTH) - 10.0;
*targetY = REST_HEIGHT - (sin(progress * PI) * 5.0);
```

- **X** : De +10 mm (arrière) à -10 mm (avant)
- **Y** : Oscille de ±5 mm autour du REST_HEIGHT
- **Progression** : 0.0 à 1.0 linéairement

### Phase de SWING (Oscillation)

La jambe se lève et se propulse vers l'avant :

```cpp
*targetX = -(STEP_LENGTH / 2.0) + (progress * STEP_LENGTH) - 10.0;
*targetY = REST_HEIGHT - (sin(progress * PI) * MAX_SWING_HEIGHT);
```

- **X** : De -10 mm à +10 mm
- **Y** : Soulèvement de 20 mm max au milieu du swing
- **Levée** : Utilise sin(progress * π) pour trajectoire fluide

### Paramètres Configurables

| Paramètre | Valeur | Effet |
|-----------|--------|-------|
| `STEP_LENGTH` | 20 mm | Distance avant/arrière |
| `REST_HEIGHT` | 138 mm | Hauteur neutre (L1+L2-10) |
| `MAX_SWING_HEIGHT` | 20 mm | Amplitude de levée |
| `CYCLE_PERIOD` | 4000 ms | Vitesse de marche |

---

## Types de Données et Structures

### Enum JointIndex

```cpp
enum JointIndex {
    RIGHT_HIP = 0,
    RIGHT_KNEE = 1,
    RIGHT_ANKLE = 2,
    LEFT_HIP = 3,
    LEFT_KNEE = 4,
    LEFT_ANKLE = 5
};
```

### Struct GaitState

```cpp
struct GaitState {
    char phase;           // 'S' = STANCE, 'W' = SWING
    float progressInPhase;  // 0.0 to 1.0 dans la phase actuelle
};
```

---

## Hiérarchie des Fonctions

```
setup()
├── Serial.begin(115200)
├── pwm.begin()
├── pwm.setOscillatorFrequency(27000000)
├── pwm.setPWMFreq(50Hz)
└── initialize() → centerServo(-1)

loop()
├── [Si marche active] UpdateGait(currentTime)
│   └── UpdateGaitProgress(cycleProgress)
│       ├── ComputeLegTarget(0, ...) → Jambe droite
│       └── ComputeLegTarget(1, ...) → Jambe gauche
│           └── setLegPosition()
│               └── LegInverseKinematics()
│                   └── moveServo(...) [x3]
│
└── [Si données série] Traiter commande
    ├── 'c' → centerServo()
    ├── 's' → moveServo()
    ├── 'l' → setLegPosition()
    ├── 'p' → UpdateGaitProgress()
    ├── 'w' → ResetWalk() / centerServo(-1)
    └── 'k' → Basculer kneeUp
```

---

## Flux de Traitement - Exemple Complet

### Commande : `l20 138` (Placer jambe droite)

```
1. Serial.read() → 'l'
2. x = Serial.parseFloat() → 20.0
3. y = Serial.parseFloat() → 138.0
4. setLegPosition(Right, kneeUp=true, x=20.0, y=138.0)
   ├── LegInverseKinematics(true, 20, 138, θ[])
   │   ├── d = sqrt(20² + 138²) = 139.4 mm
   │   ├── d ≤ 138 ? NO → distance trop loin
   │   └── return false
   ├── Serial → "HIP LIMIT Reached: Aborted movement"
   └── return false
```

### Commande : `l20 135` (Position valide)

```
1. setLegPosition(Right, kneeUp=true, x=20.0, y=135.0)
   ├── LegInverseKinematics(true, 20, 135, θ[])
   │   ├── d = sqrt(20² + 135²) ≈ 136.5 mm
   │   ├── ✓ Dans limites
   │   ├── cosTheta2 = ... ≈ 0.015
   │   ├── theta2 = acos(0.015) ≈ 1.556 rad ≈ 89.1°
   │   ├── kneeUp=true → theta2 ≈ -89.1° → PWM θ₂ ≈ 0.9°
   │   ├── ... (calculs pour theta1)
   │   └── return true, θ[] = {93.2°, 0.9°}
   │
   ├── moveServo(RIGHT_HIP, 93.2)
   │   ├── pin = servoList[0] = 0
   │   ├── angle = constrainAngle(93.2, 0) = 93.2
   │   ├── c_angle = 93.2 + 0.0 = 93.2
   │   ├── angle = applyOrientation(93.2, 0) = 93.2 (HIGH)
   │   └── moveServoPin(0, 93.2) → setPWM(0, 0, 313)
   │
   ├── moveServo(RIGHT_KNEE, 0.9)
   │   └── ... (inversé)
   │
   └── setLegPosition() → return true
```

---

## Limitations et Contraintes

### Limites Physiques

| Contrainte | Valeur | Raison |
|-----------|--------|--------|
| **Hanche max** | 124° | Architecture mécanique du robot |
| **Distance max** | 138 mm | L1 + L2 = 63 + 75 = 138 |
| **Distance min** | 12 mm | \|L1 - L2\| = \|63 - 75\| = 12 |

### Performance

- **Fréquence de mise à jour** : Cycle complet dépend de `CYCLE_PERIOD`
- **Résolution PWM** : 4096 valeurs pour 0-180°
- **Latence série** : Dépend de la vitesse (115200 baud)

---

## Guide de Débogation

### Debugging Activé

Ajouter dans le code pour plus de verbosité :

```cpp
// Décommenter les Serial.println() dans UpdateGait()
//Serial.print("Right: "); Serial.print(rightX); Serial.print(" "); Serial.println(rightY);
//Serial.print("Left: "); Serial.print(leftX); Serial.print(" "); Serial.println(leftY);
```

### Monitoring Serial

```
// Exemple de sortie
Servo 0 angle 93.2 pwm 313
Servo 1 angle 0.9 pwm 295
```

### Tests Unitaires Manuels

```
// Test 1: Tous les servos répondent
c-1

// Test 2: Kinématique inverse fonctionne
l0 140     (position direkt devant)
l10 135    (position diagonale légère)
l30 130    (position diagonale maximale)
l-30 130   (position diagonale en arrière)

// Test 3: Marche fonctionne
w          (démarre)
[attendre 5 secondes]
w          (arrête)
```

---

## Optimisations Possibles

1. **Marche fluide** : Augmenter la fréquence de mise à jour PWM
2. **Stabilité** : Ajouter feedback sensoriel (capteurs)
3. **Dynamique** : Implémenter contrôle de balancement du corps
4. **Efficacité** : Réduire le nombre d'appels `moveServo()` par cycle

---

**Dernière mise à jour** : 5 février 2026  
**Version doc** : 1.0
