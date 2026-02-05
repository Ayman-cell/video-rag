# Mars Rover — Robot omnidirectionnel + détection QR (YOLO)

Projet de robot type Mars Rover : contrôle Arduino/ESP32, interface Streamlit et module de **détection de QR codes par YOLO** avec envoi des commandes vers l'Arduino.

---

## Structure du projet

Tout se trouve dans le dossier **mars rover** :

```
mars rover/
├── Arduino_G8_P4_S4.ino    # Firmware ESP32 (moteurs, capteurs, commandes série)
├── PY_G8_P4_S4.py         # Interface Streamlit (contrôle + monitoring)
├── qr_detection_arduino.py # Détection QR (YOLO) + communication Arduino
├── requirements_qr.txt    # Dépendances Python pour le module QR
└── README.md              # Ce fichier
```

- **Arduino** : code existant, à flasher sur l'ESP32.
- **Python (Streamlit)** : interface + liaison série, à lancer séparément.
- **Module QR** : détection YOLO des QR, décodage du contenu, envoi des commandes à l'Arduino sur le port série.

---

## Prérequis matériel

- ESP32 avec shield moteurs, encodeurs, capteurs (ultrason, gaz, HTU21D, MPU6050, etc.)
- Connexion USB ou radio vers le PC (port série, ex. `COM14` sous Windows)
- Webcam ou caméra USB pour la détection QR

---

## Installation

### 1. Environnement Python

Ouvrez un terminal dans le dossier **mars rover** :

```bash
cd "mars rover"
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements_qr.txt
```

Pour l'interface Streamlit, installez aussi : `streamlit`, `pandas`, `plotly`, `matplotlib`, `speech_recognition`, `mediapipe`, `Pillow`.

### 2. Arduino / ESP32

- Ouvrir `Arduino_G8_P4_S4.ino` dans l'IDE Arduino.
- Installer les librairies : TinyGPS++, Adafruit HTU21DF, MPU6050_tockn, PID_v1, ESP32Servo, SimpleTimer.
- Sélectionner la carte ESP32 et le bon port, puis téléverser.

### 3. Interface Streamlit

```bash
cd "mars rover"
streamlit run PY_G8_P4_S4.py
```

Configurer le port série (ex. COM14, 57600) dans l'interface.

---

## Module détection QR (YOLO + Arduino)

Le script **`qr_detection_arduino.py`** :

- Utilise **YOLO** (qrdet, basé YOLOv8) pour détecter les QR dans le flux caméra.
- Décode le contenu du QR (OpenCV) dans la zone détectée.
- Envoie le **contenu du QR comme commande** vers l'Arduino (une ligne par commande, terminée par `\n`).

### Commandes Arduino supportées

| Commande | Exemple | Effet |
|----------|---------|--------|
| Arrêt | `s` | Arrêt moteurs |
| Avant / Arrière | `a` / `r` | Marche avant / arrière |
| Latéral | `d` / `g` | Droite / gauche |
| Rotation | `l` / `t` | Rotation droite / gauche |
| Cinématique | `c Vx Vy Wz` | Vitesses (ex. `c 15 0 0`) |
| Position | `p x y theta` | Déplacement en position |

Imprimez des QR contenant exactement ces chaînes (ex. `a`, `s`, `c 15 0 0`) : le script les enverra à l'ESP32.

### Lancer le module QR

Dans le dossier **mars rover** :

```bash
cd "mars rover"
python qr_detection_arduino.py --port COM14 --baud 57600 --camera 0
```

Options : `--port`, `--baud`, `--camera`, `--no-arduino` (détection seule sans Arduino).

---

## Workflow recommandé

1. Flasher l'ESP32 avec `Arduino_G8_P4_S4.ino`.
2. Brancher l'ESP32 en USB et noter le port (ex. COM14).
3. Lancer l'interface Streamlit si besoin : `streamlit run PY_G8_P4_S4.py`.
4. Lancer le module QR : `python qr_detection_arduino.py --port COM14`.
5. Montrer un QR contenant une commande (ex. `a` ou `s`) devant la caméra.

---

## Remarques

- Code Arduino et Python existants : inchangés.
- Seul le module **détection QR + communication Arduino** a été ajouté dans ce dossier.
