# 🤖 Walking Gait - Contrôleur de Robot Marcheur

## 📋 Description

**Walking Gait** est un système de contrôle pour un robot quadrupède doté de 6 servomoteurs. Le projet implémente une **cinématique inverse** complète et un **algorithme de marche réaliste** permettant au robot de se déplacer de manière naturelle.

### Caractéristiques principales :
- ✅ Cinématique inverse (IK) pour calcul des angles articulaires
- ✅ Algorithme de marche biodynamique avec phases de stance et swing
- ✅ Contrôle de 6 servomoteurs (3 par jambe)
- ✅ Limites de mouvement configurables par articulation
- ✅ Interface de communication série pour contrôle en temps réel
- ✅ Corrections d'orientation et de compensation d'angle

---

## 🏗️ Architecture du Projet

```
Walking_Gait/
├── README.md              # Documentation complète
├── Walking_Gait.ino       # Fichier d'origine (compatible historique)
├── src/
│   └── Walking_Gait.ino   # Code source principal
├── docs/
│   ├── TECHNICAL.md       # Documentation technique détaillée
│   └── PROTOCOL.md        # Protocole de communication
├── examples/
│   └── serial_commands.txt    # Exemples de commandes série
└── .gitignore             # Fichiers à ignorer
```

---

## ⚙️ Spécifications Techniques

### Architecture du Système

| Composant | Détails |
|-----------|---------|
| **Contrôleur** | Adafruit PWM Servo Driver PCA9685 |
| **Communication** | I2C |
| **Fréquence PWM** | 50 Hz |
| **Plage PWM** | 500 µs - 2500 µs |
| **Servomoteurs** | 6 au total (3 par jambe) |
| **Interface** | Communication série (115200 baud) |

### Configuration des Servomoteurs

#### Jambe Droite (Right)
- Pin 0 : Hanche droite (RIGHT_HIP)
- Pin 1 : Genou droit (RIGHT_KNEE)
- Pin 2 : Cheville droite (RIGHT_ANKLE)

#### Jambe Gauche (Left)
- Pin 3 : Hanche gauche (LEFT_HIP)
- Pin 4 : Genou gauche (LEFT_KNEE)
- Pin 6 : Cheville gauche (LEFT_ANKLE)

### Paramètres de Cinématique

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| **L1** | 63 mm | Longueur du fémur |
| **L2** | 75 mm | Longueur du tibia |
| **REST_HEIGHT** | ~138 mm | Hauteur de repos (L1 + L2 - 10) |
| **STEP_LENGTH** | 20 mm | Longueur du pas |
| **MAX_SWING_HEIGHT** | 20 mm | Hauteur maximale du swing |

### Paramètres de Marche (Gait)

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| **STANCE_DURATION** | 0.5 | Durée de la phase d'appui (unités normalisées) |
| **SWING_DURATION** | 0.5 | Durée de la phase de swing |
| **CYCLE_PERIOD** | 4000 ms | Période complète d'un cycle de marche |

---

## 🚀 Installation

### Matériel Requis

- 1x Arduino (compatible avec Adafruit PWM Servo Driver)
- 1x Adafruit PWM Servo Driver PCA9685
- 6x Servomoteurs (9g ou équivalent)
- 1x Alimentation appropriée (5V pour les servo)
- Câbles de connexion I2C et alimentation

### Installation du Code

1. **Cloner le repository**
   ```bash
   git clone https://github.com/Aymen-cell/robotics.git
   cd robotics
   ```

2. **Ouvrir dans l'IDE Arduino**
   - Ouvrir `src/Walking_Gait.ino` dans l'IDE Arduino

3. **Installer les dépendances**
   - Adafruit PWM Servo Driver Library
   - Wire.h (généralement inclus)

4. **Télécharger le code**
   - Connecter l'Arduino
   - Sélectionner le port approprié
   - Cliquer sur "Télécharger"

---

## 📡 Protocole de Communication

### Paramètres Série
- **Vitesse** : 115200 baud
- **Format** : Caractère + paramètres
- **Terminateur** : Retour à la ligne `\n`

### Commandes Disponibles

| Commande | Format | Description | Exemple |
|----------|--------|-------------|---------|
| **Centrer** | `c{servo}` | Placer servo à 90° | `c0` (centre servo 0) |
| **Mouvement** | `s{servo} {angle}` | Bouger servo à angle absolu | `s0 45` (servo 0 à 45°) |
| **Jambe** | `l{x} {y}` | Placer jambe droite à (x,y) | `l20 138` |
| **Progression** | `p{progress}` | Mettre à jour progression (0-1) | `p0.5` |
| **Marche** | `w` | Activer/désactiver la marche | `w` |
| **Configuration** | `k` | Basculer mode genou haut/bas | `k` |

### Exemples de Commandes

```
c0\n           # Centre le servo 0
s0 45\n        # Bouge servo 0 à 45 degrés
s0 90\n        # Bouge servo 0 à 90 degrés
l20 138\n      # Positionne la jambe droite à x=20, y=138 mm
p0.25\n        # Met à jour le cycle de marche à 25%
w\n            # Démarre/arrête la marche
k\n            # Bascule entre genou haut et genou bas
```

---

## 🔬 Algorithme de Marche

### Phases du Cycle

Le cycle de marche se divise en deux phases principales :

#### 1. **STANCE (Phase d'Appui)** - 50%
- La jambe pousse le robot vers l'avant
- Le pied glisse vers l'arrière (de +10 à -10 mm)
- Légère oscillation verticale : amplitude 5 mm

#### 2. **SWING (Phase de Swing)** - 50%
- La jambe se lève et se propulse vers l'avant
- Le pied se soulève progressivement (amplitude 20 mm)
- Mouvement fluide du pied de -10 à +10 mm

### Flux de Contrôle

```
GetGaitState(cycleProgress, leg)
    ↓
ComputeLegTarget(cycleProgress, leg)
    ↓
LegInverseKinematics(kneeUp, x, y)
    ↓
moveServo(servo, angle)
```

---

## 🎯 Cinématique Inverse (Inverse Kinematics)

### Calcul des Angles

Donnée une position (x, y) en mm :

1. **Calcul de la distance** : $d = \sqrt{x^2 + y^2}$

2. **Vérification des limites**
   - Distance max : L1 + L2 = 138 mm
   - Distance min : |L1 - L2| = 12 mm

3. **Calcul de l'angle du coude** (Theta2)
   $$\cos(\theta_2) = \frac{x^2 + y^2 - L1^2 - L2^2}{2L1 L2}$$

4. **Calcul de l'angle de la hanche** (Theta1)
   $$\theta_1 = \text{atan2}(y, x) - \text{atan2}(L2 \sin(\theta_2), L1 + L2 \cos(\theta_2))$$

5. **Conversion en degrés** : 0-180°

### Corrections Appliquées

```cpp
// Correction d'angle par articulation
float jointCorrection[] = {0.0, 0.0, 10.0,   // Right (Hip, Knee, Ankle)
                           5.0, 0.0, -20.0}; // Left
```

---

## 📊 Contrôle des Limites

### Limites des Articulations

| Articulation | Min | Max | Description |
|--------------|-----|-----|-------------|
| **Hanche** (Hip) | 0° | 124° | Limitation physique du robot |
| **Genou** (Knee) | 0° | 180° | Plage complète |
| **Cheville** (Ankle) | 0° | 180° | Plage complète |

### Orientation des Servomoteurs

```cpp
bool Orientation[] = {HIGH, LOW, LOW,   // Right: normal, inversé, inversé
                      LOW, HIGH, HIGH}; // Left: inversé, normal, normal
```

---

## 🛠️ Variables Globales Importantes

| Variable | Type | Rôle |
|----------|------|------|
| `servoList[]` | int[6] | Numéros des pins GPIO pour chaque servo |
| `currentAngles[]` | float[6] | Angles actuels de chaque servo |
| `Orientation[]` | bool[6] | Direction de rotation de chaque servo |
| `jointCorrection[]` | float[6] | Compensations d'angle |
| `angleLimit[][]` | float[6][2] | Limites min/max par servo |
| `kneeUp` | bool | Configuration des genoux (haut = true) |
| `gaitStartTime` | unsigned long | Timestamp du début de la marche |

---

## 📝 Exemples d'Utilisation

### Démarrer la Marche

```
Connecter à COM4 (115200 baud)
→ "Serial Communication Established"
→ Taper: w
→ Robot commence à marcher
```

### Tester Position de Jambe

```
Taper: l30 130
→ Robot place sa jambe droite à (30mm, 130mm)
→ Kinématique inverse calcule les angles automatiquement
```

### Centrer Tous les Servos

```
Taper: c-1
→ Centre tous les 6 servomoteurs à 90°
```

---

## 🐛 Dépannage

| Problème | Cause Possible | Solution |
|----------|---|---|
| Servo ne répond pas | Pin invalide | Vérifier le numéro du servo (0-5) |
| Pied n'atteint pas la cible | Position hors limites | Vérifier x entre -30 et +30, y entre ~120 et ~145 |
| Marche saccadée | Cycle trop rapide | Augmenter CYCLE_PERIOD |
| Genou se bloque | Limite dépassée | Réduire STEP_LENGTH ou MAX_SWING_HEIGHT |

---

## 📚 Documentation Additionnelle

- 📄 [Documentation Technique](docs/TECHNICAL.md)
- 📡 [Protocole de Communication](docs/PROTOCOL.md)
- 💻 [Exemples de Code](examples/serial_commands.txt)

---

## 📝 Notes de Développement

### Caractéristiques Implantées ✅
- Cinématique inverse complète (FABRIK adapté)
- Système de marche biodynamique
- Commande série interactive
- Correction d'orientation par servo
- Compensation d'angle précalculée

### Points Clés du Code

1. **Fonctions Principales**
   - `LegInverseKinematics()` : Calcul des angles à partir d'une position (x,y)
   - `GetGaitState()` : Détermine phase et progression du cycle
   - `UpdateGait()` : Met à jour les positions des jambes

2. **État Machine de Marche**
   - Jambe droite : commence en SWING
   - Jambe gauche : commence en STANCE
   - Alternance 50/50 entre phases

3. **Compensation Mécanique**
   - Corrections d'angle pour compenser le décalage mécanique
   - Inversions de sens pour symétrie gauche/droite

---

## 👨‍💻 Auteur

**Aymen** - Développeur en Robotique  
Repository : [Aymen-cell/robotics](https://github.com/Aymen-cell/robotics)

---

## 📄 Licence

Ce projet est publié sur GitHub. Libre d'utilisation et de modification.

---

## 🔄 Historique des Mises à Jour

| Date | Version | Changements |
|------|---------|-------------|
| 05-02-2026 | 1.0 | Dépôt initial avec cinématique inverse et système de marche complet |

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier les exemples d'utilisation
2. Consulter la documentation technique
3. Vérifier la connexion I2C et l'alimentation des servos

---

**Dernière mise à jour** : 5 février 2026  
**État du projet** : ✅ Fonctionnel et testé
