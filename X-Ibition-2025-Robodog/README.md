# X-Ibition 2025 Robodog 🤖🐕

Projet de robot chien (Robodog) développé pour X-Ibition 2025. Ce projet comprend une interface de contrôle Python moderne avec détection de gestes, navigation autonome, et contrôle Arduino pour les servomoteurs.

## 📋 Table des matières

- [Description](#description)
- [Fonctionnalités](#fonctionnalités)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Architecture](#architecture)
- [Contrôles](#contrôles)
- [Dépannage](#dépannage)

## 🎯 Description

Ce projet implémente un système complet de contrôle pour un robot chien quadrupède. L'interface graphique permet de contrôler le robot via plusieurs méthodes :
- Contrôle manuel via l'interface graphique
- Détection de gestes avec la main (MediaPipe)
- Navigation autonome avec évitement d'obstacles (YOLO)
- Contrôle vocal (optionnel)

Le robot est contrôlé via une carte Arduino qui pilote 8 servomoteurs (2 par patte) à travers un driver PCA9685.

## ✨ Fonctionnalités

### Interface Graphique
- **Design Cyberpunk** : Interface moderne avec thème Matrix/cyberpunk
- **Contrôle des moteurs** : Sliders individuels pour chaque moteur (épaule/genou de chaque patte)
- **Contrôle de mouvement** : Boutons directionnels pour avancer, reculer, tourner
- **Visualisation** : Animation en temps réel de l'état du robot
- **Caméra** : Affichage du flux vidéo avec détection de gestes
- **Communication série** : Configuration et connexion série/Bluetooth

### Détection de Gestes
- **MediaPipe Hands** : Détection en temps réel des gestes de la main
- **Gestes supportés** :
  - ✋ **Main ouverte** : Arrêt du robot
  - ✊ **Poing fermé** : Reculer
  - ✌️ **Peace (V)** : Avancer
  - 👈 **Index gauche** : Tourner à gauche
  - 👉 **Index droit** : Tourner à droite

### Navigation Autonome
- **YOLO v8** : Détection d'objets en temps réel
- **Évitement d'obstacles** : Détection et évitement automatique
- **Navigation intelligente** : Calcul de trajectoire optimale

### Contrôle Arduino
- **8 Servomoteurs** : Contrôle précis de chaque articulation
- **Mouvements prédéfinis** : Avancer, reculer, tourner, position de repos
- **Contrôle de hauteur** : Ajustement dynamique de la hauteur du corps
- **Communication Bluetooth** : Support Bluetooth et série USB

## 📁 Structure du projet

```
X-Ibition-2025-Robodog/
│
├── INTERFACE 2025 EAC/
│   ├── INTERFACE_DOG.py          # Interface graphique principale
│   ├── Camera.py                  # Gestion de la caméra
│   ├── Hand_Detection.py          # Détection de gestes (MediaPipe)
│   ├── Navigation.py              # Navigation et évitement d'obstacles (YOLO)
│   ├── Serial.py                  # Communication série/Bluetooth
│   ├── matrix_effect.py           # Effets visuels Matrix
│   ├── testing.py                 # Scripts de test
│   ├── storage.txt                # Fichier de stockage
│   ├── yolov8n.pt                 # Modèle YOLO pré-entraîné
│   └── E-TECH logo.png            # Logo du projet
│
├── RobotDog/
│   └── RobotDog.ino               # Code Arduino pour le contrôle des servos
│
├── requirements.txt               # Dépendances Python
└── README.md                      # Ce fichier
```

## 🔧 Prérequis

### Logiciels
- **Python 3.8+**
- **Arduino IDE** (pour compiler et uploader le code Arduino)
- **Git** (pour cloner le dépôt)

### Matériel
- **Arduino** (Uno/Nano/Mega)
- **PCA9685** (Driver PWM pour servomoteurs)
- **8 Servomoteurs** (ex: SG90 ou MG996R)
- **Module Bluetooth** (optionnel, pour contrôle sans fil)
- **Caméra USB** ou caméra IP

### Bibliothèques Python
```bash
cd "INTERFACE 2025 EAC"
pip install -r requirements.txt
```

### Bibliothèques Arduino
Installer via le gestionnaire de bibliothèques Arduino IDE :
- **Adafruit PWM Servo Driver Library**
- **SoftwareSerial** (incluse par défaut)
- **Wire** (incluse par défaut)

## 📦 Installation

1. **Cloner le dépôt**
```bash
git clone https://github.com/Ayman-cell/robotics.git
cd robotics/X-Ibition-2025-Robodog
```

2. **Installer les dépendances Python**
```bash
cd "INTERFACE 2025 EAC"
pip install -r requirements.txt
```

3. **Configurer Arduino**
   - Ouvrir `RobotDog/RobotDog.ino` dans Arduino IDE
   - Installer les bibliothèques nécessaires
   - Sélectionner la carte et le port COM
   - Compiler et uploader le code

## 🚀 Utilisation

### Démarrage de l'interface

```bash
cd "INTERFACE 2025 EAC"
python INTERFACE_DOG.py
```

### Contrôle manuel

1. **Connexion série** : Sélectionner le port COM et cliquer sur "Connect"
2. **Contrôle des moteurs** : Utiliser les sliders et cliquer sur "SEND"
3. **Mouvement** : Utiliser les flèches directionnelles
4. **Élévation** : Utiliser les boutons +/- pour ajuster la hauteur

### Contrôle par gestes

1. Cliquer sur "Start Camera"
2. Positionner votre main devant la caméra
3. Utiliser les gestes pour contrôler le robot

## 🏗️ Architecture

### Interface Python
- **INTERFACE_DOG.py** : Interface principale avec CustomTkinter
- **Camera.py** : Capture et traitement vidéo
- **Hand_Detection.py** : Détection de gestes avec MediaPipe
- **Navigation.py** : Navigation et évitement d'obstacles avec YOLO
- **Serial.py** : Communication série/Bluetooth

### Code Arduino
- **RobotDog.ino** : Contrôle des servomoteurs via PCA9685

## 🎮 Contrôles

### Clavier
- **Flèches** : Contrôle directionnel
- **Espace** : Position de repos
- **+/-** : Ajuster l'élévation

### Interface graphique
- **Sliders** : Contrôle individuel des moteurs
- **Boutons directionnels** : Mouvement du robot
- **Boutons caméra** : Démarrer/arrêter la caméra

## 🔍 Dépannage

Voir la section dépannage dans le [README principal](../../README.md) ou consulter [PROJECTS.md](../../PROJECTS.md) pour plus de détails.

## 👤 Auteur

**Ayman** - Développement complet du projet

## 📄 Licence

Ce projet est développé pour X-Ibition 2025.

---

🔗 **Retour au portfolio** : [README principal](../../README.md) | [Liste des projets](../../PROJECTS.md)
