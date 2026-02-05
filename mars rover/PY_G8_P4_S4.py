import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import Arrow
import speech_recognition as sr
import threading
import cv2
import serial
import serial.tools.list_ports
from datetime import datetime
from PIL import Image
import time
import webbrowser
import re
from collections import deque
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import streamlit as st

# === Configuration des constantes ===
R = 0.05  # Rayon des roues (5 cm)
L = 0.20  # Demi-longueur (20 cm)
l = 0.125  # Demi-largeur (12.5 cm)
MAX_SPEED = 1.0
SPEED_STEP = 0.1
ACCELERATION = 0.05

# Configuration de la page Streamlit
st.set_page_config(
    page_title="🤖 Système Robot Omnidirectionnel",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Variables de session
if 'esp32_connected' not in st.session_state:
    st.session_state.esp32_connected = False
if 'esp32_serial' not in st.session_state:
    st.session_state.esp32_serial = None
if 'command_history' not in st.session_state:
    st.session_state.command_history = []
if 'donnees_capteurs' not in st.session_state:
    st.session_state.donnees_capteurs = {
        "distance": "N/A cm",
        "gaz": "N/A",
        "temperature": "N/A °C",
        "humidity": "N/A %",
        "accX": "N/A m/s²",
        "accY": "N/A m/s²",
        "accZ": "N/A m/s²",
        "gyroX": "N/A °/s",
        "gyroY": "N/A °/s",
        "gyroZ": "N/A °/s",
        "tempMPU": "N/A °C",
        "latitude": "N/A°",
        "longitude": "N/A°",
        "altitude": "N/A m",
        "satellites": "N/A"
    }
if 'Vx' not in st.session_state:
    st.session_state.Vx = 0.0
if 'Vy' not in st.session_state:
    st.session_state.Vy = 0.0
if 'omega' not in st.session_state:
    st.session_state.omega = 0.0
if 'current_vx' not in st.session_state:
    st.session_state.current_vx = 0.0
if 'current_vy' not in st.session_state:
    st.session_state.current_vy = 0.0
if 'current_omega' not in st.session_state:
    st.session_state.current_omega = 0.0
if 'wheel_thetas' not in st.session_state:
    st.session_state.wheel_thetas = [0] * 4
if 'active_wheels' not in st.session_state:
    st.session_state.active_wheels = [False] * 4
if 'camera_active' not in st.session_state:
    st.session_state.camera_active = False
if 'capteur_selectionne' not in st.session_state:
    st.session_state.capteur_selectionne = "all"

# Mapping des commandes pour ESP32
COMMAND_MAPPING = {
    "up": "a",
    "down": "b",
    "left": "g",
    "right": "d",
    "stop": "s",
    "rot_left": "t",
    "rot_right": "l"
}

# Dictionnaire des gestes
COMMANDS = {
    "CLOSED": "STOP",
    "ONE": "AVANCE",
    "TWO": "RECULE",
    "THREE": "TOURNER_GAUCHE",
    "FOUR": "TOURNER_DROITE",
    "FIVE": "SCAN_GAZ",
    "LEFT_TILT": "LATERAL_GAUCHE",
    "RIGHT_TILT": "LATERAL_DROITE"
}

# Commandes vocales valides
commandes_valides = [
    "avance", "arrête", "stop", "recule",
    "tourner à droite", "tourner à gauche",
    "latéral à droite", "latéral à gauche",
    "détection gaz", "retour base"
]

# ============================================================================
# FONCTIONS DE CONNEXION ESP32
# ============================================================================

def connect_to_esp32():
    try:
        st.session_state.esp32_serial = serial.Serial('COM14', 57600, timeout=1)
        time.sleep(2)
        st.session_state.esp32_connected = True
        add_to_history("✅ Connecté à ESP32 sur COM14", "Système")
        return True
    except Exception as e:
        add_to_history(f"❌ Échec de la connexion à l'ESP32: {e}", "Système")
        st.session_state.esp32_connected = False
        return False

def disconnect_esp32():
    if st.session_state.esp32_serial:
        try:
            st.session_state.esp32_serial.write(b"s\n")
            st.session_state.esp32_serial.close()
        except:
            pass
        st.session_state.esp32_serial = None
    st.session_state.esp32_connected = False
    add_to_history("🔌 ESP32 déconnecté", "Système")

def send_command_to_esp32(command):
    if not st.session_state.esp32_connected:
        add_to_history("ESP32 non connecté", "Système")
        return None
    try:
        st.session_state.esp32_serial.write(f"{command}\n".encode())
        add_to_history(f"Commande envoyée: {command}", "Système")
        return True
    except Exception as e:
        add_to_history(f"Erreur d'envoi: {e}", "Système")
        st.session_state.esp32_connected = False
        return None

def add_to_history(message, source="Système"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    st.session_state.command_history.append((timestamp, message, source))
    if len(st.session_state.command_history) > 20:
        st.session_state.command_history.pop(0)

# ============================================================================
# FONCTIONS DE MONITORING DES CAPTEURS
# ============================================================================

def lire_donnees_capteurs():
    """Lecture continue des données capteurs"""
    if st.session_state.esp32_serial and st.session_state.esp32_connected and st.session_state.esp32_serial.in_waiting:
        try:
            line = st.session_state.esp32_serial.readline().decode('utf-8', errors='ignore').strip()
            if line:
                debug_donnees_capteurs(line)
                parser_donnees_capteurs(line)
        except Exception as e:
            st.error(f"Erreur lecture données capteurs: {e}")

def parser_donnees_capteurs(line):
    patterns = {
        "distance": r"\[Distance\] : ([\d.]+) cm",
        "gaz": r"\[Gaz\] : ([\d.]+)",
        "temperature": r"\[HTU21D\] Température : ([\d.-]+) °C",
        "humidity": r"\[HTU21D\] Humidité : ([\d.-]+) %",
        "accX": r"\[MPU6050\] Accélération X: ([\d.-]+)",
        "accY": r"\[MPU6050\].*Accélération.*Y: ([\d.-]+)",
        "accZ": r"\[MPU6050\].*Accélération.*Z: ([\d.-]+)",
        "gyroX": r"\[MPU6050\] Gyroscope X: ([\d.-]+)",
        "gyroY": r"\[MPU6050\].*Gyroscope.*Y: ([\d.-]+)",
        "gyroZ": r"\[MPU6050\].*Gyroscope.*Z: ([\d.-]+)",
        "tempMPU": r"\[MPU6050\] Température: ([\d.-]+) °C",
        "latitude": r"\[GPS\].*Latitude: ([\d.-]+)",
        "longitude": r"\[GPS\].*Longitude: ([\d.-]+)",
        "altitude": r"\[GPS\].*Altitude: ([\d.-]+)",
        "satellites": r"\[GPS\].*Satellites: ([\d]+)"
    }
   
    data_updated = False
    for key, pattern in patterns.items():
        match = re.search(pattern, line)
        if match:
            try:
                value = float(match.group(1))
                st.session_state.donnees_capteurs[key] = f"{value:.2f}"
               
                # Ajout des unités si nécessaire
                if key in ["accX", "accY", "accZ"]:
                    st.session_state.donnees_capteurs[key] += " m/s²"
                elif key in ["gyroX", "gyroY", "gyroZ"]:
                    st.session_state.donnees_capteurs[key] += " °/s"
                elif key in ["latitude", "longitude"]:
                    st.session_state.donnees_capteurs[key] += "°"
                elif key == "altitude":
                    st.session_state.donnees_capteurs[key] += " m"
                elif key == "tempMPU":
                    st.session_state.donnees_capteurs[key] += " °C"
                elif key == "distance":
                    st.session_state.donnees_capteurs[key] += " cm"
                elif key == "humidity":
                    st.session_state.donnees_capteurs[key] += " %"
                elif key == "temperature":
                    st.session_state.donnees_capteurs[key] += " °C"
               
                data_updated = True
            except ValueError:
                st.error(f"Erreur de conversion pour {key}: {match.group(1)}")

def debug_donnees_capteurs(line):
    """Fonction de debug pour voir les données brutes de l'Arduino"""
    if "[MPU6050]" in line and "Accélération" in line:
        st.write(f"DEBUG ACCEL: {line}")
    if "[MPU6050]" in line and "Gyroscope" in line:
        st.write(f"DEBUG GYRO: {line}")
    if "[GPS]" in line:
        st.write(f"DEBUG GPS: {line}")

def rechercher_sur_maps():
    try:
        lat = st.session_state.donnees_capteurs['latitude'].replace('°', '')
        lon = st.session_state.donnees_capteurs['longitude'].replace('°', '')
        if lat != "N/A" and lon != "N/A":
            url = f"https://www.google.com/maps?q={lat},{lon}"
            webbrowser.open_new_tab(url)
            st.success("Ouverture de Google Maps...")
        else:
            st.warning("Aucune coordonnée GPS valide disponible")
    except Exception as e:
        st.error(f"Impossible d'ouvrir Maps: {e}")

# ============================================================================
# FONCTIONS DE CONTRÔLE AUTONOME
# ============================================================================

def set_movement(vx, vy, om):
    st.session_state.Vx = vx
    st.session_state.Vy = vy
    st.session_state.omega = om
    calculate_thetas()

def calculate_thetas():
    common = (1 / R) / (2 * np.pi)
    sum_Ll = L + l
    st.session_state.wheel_thetas = [
        common * (st.session_state.Vx - st.session_state.Vy - sum_Ll * st.session_state.omega),
        common * (-st.session_state.Vx - st.session_state.Vy + sum_Ll * st.session_state.omega),
        common * (st.session_state.Vx - st.session_state.Vy + sum_Ll * st.session_state.omega),
        common * (-st.session_state.Vx - st.session_state.Vy - sum_Ll * st.session_state.omega)
    ]
    st.session_state.active_wheels = [abs(w) > 0.001 for w in st.session_state.wheel_thetas]

def get_movement_type(vx, vy, om):
    seuil = 0.1
    if abs(vx) < seuil and abs(vy) < seuil and abs(om) < seuil:
        return "ARRÊT"
    if abs(om) > seuil and abs(vx) < seuil and abs(vy) < seuil:
        return "ROTATION ↺" if om > 0 else "ROTATION ↻"
    if abs(vx) >= seuil and abs(vy) < seuil and abs(om) < seuil:
        return "AVANCE →" if vx > 0 else "RECULE ←"
    if abs(vy) >= seuil and abs(vx) < seuil and abs(om) < seuil:
        return "LATÉRAL ↑" if vy > 0 else "LATÉRAL ↓"
    return "MOUVEMENT COMBINÉ"

# ============================================================================
# FONCTIONS DE COMMANDE MANUELLE
# ============================================================================

def get_movement_type_manual(Vx, Vy, omega):
    seuil_translation = 0.1
    seuil_rotation = 0.1
   
    if abs(Vx) < seuil_translation and abs(Vy) < seuil_translation and abs(omega) < seuil_rotation:
        return "ARRÊT"
   
    if abs(omega) > seuil_rotation and abs(Vx) < seuil_translation and abs(Vy) < seuil_translation:
        return "ROTATION ↺ (GAUCHE)" if omega > 0 else "ROTATION ↻ (DROITE)"
   
    if abs(Vx) >= seuil_translation and abs(Vy) < seuil_translation and abs(omega) < seuil_rotation:
        return "AVANCE →" if Vx > 0 else "RECULE ←"
   
    if abs(Vy) >= seuil_translation and abs(Vx) < seuil_translation and abs(omega) < seuil_rotation:
        return "GLISSE DROITE ↑" if Vy > 0 else "GLISSE GAUCHE ↓"
   
    if abs(omega) < seuil_rotation:
        if Vx > seuil_translation and Vy > seuil_translation:
            return "DIAGONALE ↗ (AVANT-DROITE)"
        if Vx > seuil_translation and Vy < -seuil_translation:
            return "DIAGONALE ↖ (AVANT-GAUCHE)"
        if Vx < -seuil_translation and Vy > seuil_translation:
            return "DIAGONALE ↘ (ARRIÈRE-DROITE)"
        if Vx < -seuil_translation and Vy < -seuil_translation:
            return "DIAGONALE ↙ (ARRIÈRE-GAUCHE)"
   
    return "MOUVEMENT COMBINÉ"

def send_up_command():
    add_to_history("AVANCE", "Bouton")
    send_command_to_esp32("a")

def send_down_command():
    add_to_history("RECULE", "Bouton")
    send_command_to_esp32("r")

def send_left_command():
    add_to_history("LATERAL_GAUCHE", "Bouton")
    send_command_to_esp32("g")

def send_right_command():
    add_to_history("LATERAL_DROITE", "Bouton")
    send_command_to_esp32("d")

def send_rot_left_command():
    add_to_history("ROTATION_GAUCHE", "Bouton")
    send_command_to_esp32("t")

def send_rot_right_command():
    add_to_history("ROTATION_DROITE", "Bouton")
    send_command_to_esp32("l")

def send_stop_command():
    add_to_history("STOP", "Bouton")
    send_command_to_esp32("s")

def send_haut_gauche_command():
    add_to_history("DIAGONALE_GAUCHE", "Bouton")
    send_command_to_esp32("h")

def send_haut_droite_command():
    add_to_history("DIAGONALE_DROITE", "Bouton")
    send_command_to_esp32("j")

def send_bas_gauche_command():
    add_to_history("DIAGONALE_ARRIERE_GAUCHE", "Bouton")
    send_command_to_esp32("n")

def send_bas_droite_command():
    add_to_history("DIAGONALE_ARRIERE_DROITE", "Bouton")
    send_command_to_esp32("m")

def calculate_thetas_manual(vx, vy, omega):
    # Calculer les vitesses des roues
    common = (1 / R) / (2 * np.pi)
    sum_Ll = L + l
   
    wheel_thetas = [
        common * (vx - vy - sum_Ll * omega),
        common * (-vx - vy + sum_Ll * omega),
        common * (vx - vy + sum_Ll * omega),
        common * (-vx - vy - sum_Ll * omega)
    ]
   
    active_wheels = [abs(w) > 0.001 for w in wheel_thetas]
   
    # Envoyer la commande à l'ESP32
    if st.session_state.esp32_connected and (abs(vx) > 0.001 or abs(vy) > 0.001 or abs(omega) > 0.001):
        cmd = f"c {vx:.4f} {vy:.4f} {omega:.4f}"
        send_command_to_esp32(cmd)
   
    return wheel_thetas, active_wheels

def calculate_velocities(wheel_speeds):
    # Calcul inverse
    thetas = [speed * 2 * np.pi for speed in wheel_speeds]
    vx = (R / 4) * (thetas[0] - thetas[1] + thetas[2] - thetas[3])
    vy = (R / 4) * (-sum(thetas))
    omega = (R / (4 * (L + l))) * (-thetas[0] + thetas[1] + thetas[2] - thetas[3])
   
    if st.session_state.esp32_connected:
        cmd = f"c {vx:.4f} {vy:.4f} {omega:.4f}"
        send_command_to_esp32(cmd)
   
    return vx, vy, omega

def send_position_command(pos_x, pos_y, angle):
    """Envoie la commande de position à l'ESP32"""
    if st.session_state.esp32_connected:
        cmd = f"p {pos_x:.4f} {pos_y:.4f} {angle:.4f}"
        send_command_to_esp32(cmd)
        add_to_history(f"Position envoyée: X={pos_x:.2f}, Y={pos_y:.2f}, θ={angle:.2f}", "Position")
    else:
        add_to_history("ESP32 non connecté pour envoi position", "Système")

def create_robot_visualization():
    fig, ax = plt.subplots(figsize=(6, 6))
   
    robot_length, robot_width = 0.4, 0.3
    wheel_length, wheel_width = 0.1, 0.05
   
    # Corps du robot
    bottom_left_x, bottom_left_y = -robot_width / 2, -robot_length / 2
    ax.add_patch(patches.Rectangle(
        (bottom_left_x, bottom_left_y),
        robot_width, robot_length,
        edgecolor='black', facecolor='lightgrey'
    ))
   
    # Positions des roues
    wheel_positions = [
        (bottom_left_x - wheel_width, bottom_left_y),
        (bottom_left_x + robot_width, bottom_left_y),
        (bottom_left_x - wheel_width, bottom_left_y + robot_length - wheel_length),
        (bottom_left_x + robot_width, bottom_left_y + robot_length - wheel_length)
    ]
   
    # Roues avec couleurs selon l'activité
    for i, (wx, wy) in enumerate(wheel_positions):
        color = 'red' if st.session_state.active_wheels[i] else 'grey'
        wheel = patches.Rectangle((wx, wy), wheel_width, wheel_length,
                                edgecolor='black', facecolor=color)
        ax.add_patch(wheel)
       
        # Flèches pour indiquer la direction
        if st.session_state.active_wheels[i]:
            arrow_x = wx + wheel_width / 2
            arrow_y = wy + wheel_length / 2
            dy = 0.1 if st.session_state.wheel_thetas[i] >= 0 else -0.1
            ax.arrow(arrow_x, arrow_y, 0, dy, head_width=0.02, head_length=0.02, fc='blue', ec='blue')
   
    # Texte de mouvement
    movement_type = get_movement_type(st.session_state.Vx, st.session_state.Vy, st.session_state.omega)
    ax.text(0, -0.3, f"Mouvement: {movement_type}", ha='center', va='center',
            fontsize=10, weight='bold', color='blue')
   
    # Configuration des axes
    margin = 0.02
    ax.set_xlim(bottom_left_x - wheel_width - margin,
                bottom_left_x + robot_width + wheel_width + margin)
    ax.set_ylim(bottom_left_y - margin - 0.1,
                bottom_left_y + robot_length + wheel_length + margin)
    ax.set_aspect('equal')
    ax.axis('off')
   
    return fig

# ============================================================================
# INTERFACE STREAMLIT
# ============================================================================

# Titre principal
st.title("🤖 SYSTÈME COMPLET - Robot Omnidirectionnel")

# Sidebar pour la connexion ESP32
with st.sidebar:
    st.header("🔌 Connexion ESP32")
   
    status_color = "🟢" if st.session_state.esp32_connected else "🔴"
    status_text = f"{status_color} ESP32 {'Connecté' if st.session_state.esp32_connected else 'Déconnecté'}"
    st.write(status_text)
   
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Connecter ESP32", type="primary", disabled=st.session_state.esp32_connected):
            connect_to_esp32()
            st.rerun()
   
    with col2:
        if st.button("Déconnecter ESP32", type="secondary", disabled=not st.session_state.esp32_connected):
            disconnect_esp32()
            st.rerun()
   
    st.divider()
   
    # Historique des commandes
    st.header("📜 Historique")
    if st.session_state.command_history:
        for timestamp, cmd, source in reversed(st.session_state.command_history[-10:]):
            color = {"Voix": "🎤", "Geste": "👋", "Système": "⚙️", "Bouton": "🔘", "Position": "📍", "Servo": "⚙️"}.get(source, "📝")
            st.text(f"{color} {timestamp} - {cmd}")
    else:
        st.text("Aucune commande enregistrée")
   
    if st.button("Effacer l'historique"):
        st.session_state.command_history.clear()
        st.rerun()

# Onglets principaux
tab1, tab2, tab3 = st.tabs(["📊 Monitoring Capteurs", "🎤 Contrôle Autonome", "🎮 Commande Manuelle"])

# ============================================================================
# ONGLET 1 - MONITORING DES CAPTEURS
# ============================================================================
with tab1:
    st.header("📊 Monitoring des Capteurs")
   
    col1, col2 = st.columns([1, 2])
   
    with col1:
        st.subheader("Sélection des Capteurs")
       
        capteur_options = {
            "Tous les capteurs": "all",
            "Distance": "distance",
            "Gaz": "gaz",
            "Température": "temperature",
            "Humidité": "humidity",
            "Accéléromètre": "acceleration",
            "Gyroscope": "gyroscope",
            "GPS": "gps"
        }
       
        selected_capteur = st.selectbox("Choisir un capteur:", list(capteur_options.keys()))
        capteur_key = capteur_options[selected_capteur]
        st.session_state.capteur_selectionne = capteur_key
       
        if capteur_key == "gps":
            if st.button("🗺️ Ouvrir dans Maps"):
                rechercher_sur_maps()
       
        # Lecture automatique des capteurs
        if st.session_state.esp32_connected:
            lire_donnees_capteurs()
   
    with col2:
        st.subheader("Données des Capteurs")
       
        if capteur_key == "all":
            col2a, col2b = st.columns(2)
           
            with col2a:
                st.metric("Distance", st.session_state.donnees_capteurs['distance'])
                st.metric("Gaz", st.session_state.donnees_capteurs['gaz'])
                st.metric("Température", st.session_state.donnees_capteurs['temperature'])
                st.metric("Humidité", st.session_state.donnees_capteurs['humidity'])
               
                st.write("**Accéléromètre:**")
                st.text(f"X: {st.session_state.donnees_capteurs['accX']}")
                st.text(f"Y: {st.session_state.donnees_capteurs['accY']}")
                st.text(f"Z: {st.session_state.donnees_capteurs['accZ']}")
           
            with col2b:
                st.write("**Gyroscope:**")
                st.text(f"X: {st.session_state.donnees_capteurs['gyroX']}")
                st.text(f"Y: {st.session_state.donnees_capteurs['gyroY']}")
                st.text(f"Z: {st.session_state.donnees_capteurs['gyroZ']}")
               
                st.metric("Température MPU", st.session_state.donnees_capteurs['tempMPU'])
               
                st.write("**GPS:**")
                st.text(f"Latitude: {st.session_state.donnees_capteurs['latitude']}")
                st.text(f"Longitude: {st.session_state.donnees_capteurs['longitude']}")
                st.text(f"Altitude: {st.session_state.donnees_capteurs['altitude']}")
                st.text(f"Satellites: {st.session_state.donnees_capteurs['satellites']}")
       
        elif capteur_key == "acceleration":
            col2a, col2b, col2c = st.columns(3)
            with col2a:
                st.metric("Acc X", st.session_state.donnees_capteurs['accX'])
            with col2b:
                st.metric("Acc Y", st.session_state.donnees_capteurs['accY'])
            with col2c:
                st.metric("Acc Z", st.session_state.donnees_capteurs['accZ'])
       
        elif capteur_key == "gyroscope":
            col2a, col2b, col2c = st.columns(3)
            with col2a:
                st.metric("Gyro X", st.session_state.donnees_capteurs['gyroX'])
            with col2b:
                st.metric("Gyro Y", st.session_state.donnees_capteurs['gyroY'])
            with col2c:
                st.metric("Gyro Z", st.session_state.donnees_capteurs['gyroZ'])
       
        elif capteur_key == "gps":
            col2a, col2b = st.columns(2)
            with col2a:
                st.metric("Latitude", st.session_state.donnees_capteurs['latitude'])
                st.metric("Altitude", st.session_state.donnees_capteurs['altitude'])
            with col2b:
                st.metric("Longitude", st.session_state.donnees_capteurs['longitude'])
                st.metric("Satellites", st.session_state.donnees_capteurs['satellites'])
       
        else:
            st.metric(selected_capteur, st.session_state.donnees_capteurs[capteur_key])

# ============================================================================
# ONGLET 2 - CONTRÔLE AUTONOME (INTERFACE RÉORGANISÉE)
# ============================================================================
with tab2:
    st.header("🎤 Contrôle Autonome")
    
    # Vérification de la connexion ESP32 avant d'ouvrir l'interface
    if not st.session_state.esp32_connected:
        st.warning("⚠️ **ESP32 non connecté !** Veuillez d'abord connecter l'ESP32 via la sidebar.")
        st.info("👈 Utilisez le bouton 'Connecter ESP32' dans la sidebar à gauche.")
    else:
        st.success("✅ **ESP32 connecté !** Vous pouvez maintenant utiliser le mode autonome.")
        
        # Bouton unique pour ouvrir l'interface autonome
        if st.button("🚀 Activer le Mode Autonome", key="open_autonomous"):
            try:
                import tkinter as tk
                import numpy as np
                import speech_recognition as sr
                import threading
                import cv2
                import mediapipe as mp
                import serial
                import serial.tools.list_ports
                from datetime import datetime
                from PIL import Image, ImageTk
                import time

                # === Configuration des constantes ===
                R = 0.05  # Rayon des roues (5 cm)
                L = 0.20  # Demi-longueur (20 cm)
                l = 0.125  # Demi-largeur (12.5 cm)
                MAX_SPEED = 1.0
                SPEED_STEP = 0.1

                # Variables globales
                video_label = None
                camera_active = False
                stop_camera_btn = None
                command_history = []
                Vx, Vy, omega = 0.0, 0.0, 0.0
                last_detected_gesture = None  # Pour stocker le dernier geste détecté
                last_detected_voice_command = None  # ✅ NOUVEAU: Pour stocker la dernière commande vocale détectée

                # ✅ UTILISATION DE LA CONNEXION ESP32 EXISTANTE (PAS DE DUPLICATION)
                esp32_connected = st.session_state.esp32_connected
                esp32_serial = st.session_state.esp32_serial

                # Initialisation MediaPipe
                mp_hands = mp.solutions.hands
                mp_drawing = mp.solutions.drawing_utils

                # Dictionnaire des gestes
                COMMANDS = {
                    "CLOSED": "STOP",
                    "ONE": "AVANCE",
                    "TWO": "RECULE", 
                    "THREE": "TOURNER_GAUCHE",
                    "FOUR": "TOURNER_DROITE",
                    "FIVE": "SCAN_GAZ",
                    "LEFT_TILT": "LATERAL_GAUCHE",
                    "RIGHT_TILT": "LATERAL_DROITE"
                }

                # Commandes vocales valides
                commandes_valides = [
                    "avance", "arrête", "stop", "recule",
                    "tourner à droite", "tourner à gauche", 
                    "latéral à droite", "latéral à gauche",
                    "détection gaz", "retour base"
                ]

                # ✅ FONCTION MODIFIÉE - UTILISE LA CONNEXION STREAMLIT EXISTANTE
                def send_command_to_esp32_tkinter(command):
                    """Utilise la connexion ESP32 déjà établie dans Streamlit"""
                    global esp32_connected
                    if not esp32_connected or not st.session_state.esp32_connected:
                        add_to_history("ESP32 non connecté", "Système")
                        return None
                    try:
                        st.session_state.esp32_serial.write(command.encode())
                        add_to_history(f"Commande envoyée: {command}", "Système")
                        return command
                    except Exception as e:
                        add_to_history(f"Erreur d'envoi: {e}", "Système")
                        esp32_connected = False
                        return None

                def add_to_history(message, source="Système"):
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    command_history.append((timestamp, message, source))
                    if len(command_history) > 20:
                        command_history.pop(0)
                    root.after(0, update_history)

                def update_history():
                    history_text.config(state=tk.NORMAL)
                    history_text.delete(1.0, tk.END)
                    if not command_history:
                        history_text.insert(tk.END, "Aucune commande enregistrée\n")
                    else:
                        for timestamp, cmd, source in reversed(command_history):
                            color_tag = ""
                            if source == "Voix":
                                color_tag = "voice"
                            elif source == "Geste":
                                color_tag = "gesture"
                            elif source == "Système":
                                color_tag = "system"
                            
                            history_text.insert(tk.END, f"{timestamp} - {cmd} ({source})\n", color_tag)
                    
                    # Configuration des couleurs
                    history_text.tag_config("voice", foreground="#9C27B0")
                    history_text.tag_config("gesture", foreground="#607D8B") 
                    history_text.tag_config("system", foreground="#4CAF50")
                    
                    history_text.config(state=tk.DISABLED)
                    history_text.see(tk.END)

                # === Fonctions de contrôle du robot ===
                def set_movement(vx, vy, om):
                    global Vx, Vy, omega
                    Vx, Vy, omega = vx, vy, om
                    update_speed_display()

                def update_speed_display():
                    speed_vx_label.config(text=f"Vx: {Vx:.2f} m/s")
                    speed_vy_label.config(text=f"Vy: {Vy:.2f} m/s") 
                    speed_omega_label.config(text=f"Ω: {omega:.2f} rad/s")

                # === Fonctions de mouvement simplifiées ===
                def avancer():
                    set_movement(0.3, 0, 0)
                    send_command_to_esp32_tkinter('a')

                def reculer():
                    set_movement(-0.3, 0, 0)
                    send_command_to_esp32_tkinter('r')

                def gauche():
                    set_movement(0, 0.3, 0)
                    send_command_to_esp32_tkinter('g')

                def droite():
                    set_movement(0, -0.3, 0)
                    send_command_to_esp32_tkinter('d')

                def rotation_gauche():
                    set_movement(0, 0, 0.5)
                    send_command_to_esp32_tkinter('t')

                def rotation_droite():
                    set_movement(0, 0, -0.5)
                    send_command_to_esp32_tkinter('l')

                def stop():
                    set_movement(0, 0, 0)
                    send_command_to_esp32_tkinter('s')

                def send_gesture_command():
                    global last_detected_gesture
                    if last_detected_gesture:
                        if last_detected_gesture == "ONE":
                            avancer()
                        elif last_detected_gesture == "TWO":
                            reculer()
                        elif last_detected_gesture == "THREE":
                            rotation_gauche()
                        elif last_detected_gesture == "FOUR":
                            rotation_droite()
                        elif last_detected_gesture == "LEFT_TILT":
                            gauche()
                        elif last_detected_gesture == "RIGHT_TILT":
                            droite()
                        elif last_detected_gesture == "CLOSED":
                            stop()
                        
                        add_to_history(f"Commande gestuelle envoyée: {COMMANDS.get(last_detected_gesture, 'INCONNU')}", "Geste")

                # ✅ NOUVELLE FONCTION - ENVOYER COMMANDE VOCALE MANUELLEMENT
                def send_voice_command():
                    global last_detected_voice_command
                    if last_detected_voice_command:
                        executer_commande_vocale_directe(last_detected_voice_command)
                        add_to_history(f"Commande vocale envoyée: {last_detected_voice_command.upper()}", "Voix")

                # === Fonctions de reconnaissance vocale MODIFIÉES ===
                def detecter_commande(texte):
                    texte = texte.lower().strip()
                    
                    # Commandes spéciales
                    special_commands = {
                        "détection gaz": "détection gaz",
                        "état de batterie": "état de batterie", 
                        "retour à la base": "retour base"
                    }
                    
                    for phrase, cmd in special_commands.items():
                        if phrase in texte:
                            return cmd
                    
                    # Commandes simples
                    simple_commands = {
                        "avance": ["avance", "avancer", "va devant"],
                        "recule": ["recule", "reculer", "va arrière"],
                        "tourner à droite": ["droite", "tourne droite", "vers la droite"],
                        "tourner à gauche": ["gauche", "tourne gauche", "vers la gauche"],
                        "latéral à droite": ["latéral droite", "déplace droite"],
                        "latéral à gauche": ["latéral gauche", "déplace gauche"],
                        "stop": ["stop", "arrête", "arrêter", "halte"]
                    }
                    
                    for cmd, mots in simple_commands.items():
                        if any(mot in texte for mot in mots):
                            return cmd
                    
                    return None

                def start_listening():
                    def listen_loop():
                        recognizer = sr.Recognizer()
                        recognizer.energy_threshold = 400
                        recognizer.dynamic_energy_threshold = True
                        recognizer.pause_threshold = 1.5
                        
                        with sr.Microphone() as source:
                            add_to_history("🔊 Calibration du microphone...", "Voix")
                            recognizer.adjust_for_ambient_noise(source, duration=2)
                            
                            while True:
                                try:
                                    add_to_history("🎤 En écoute... Parlez maintenant", "Voix")
                                    audio = recognizer.listen(source, timeout=2, phrase_time_limit=3)
                                    
                                    try:
                                        add_to_history("🔄 Traitement en cours...", "Voix")
                                        texte = recognizer.recognize_google(audio, language="fr-FR")
                                        add_to_history(f"✅ Vous avez dit: {texte}", "Voix")
                                        
                                        commande = detecter_commande(texte)
                                        if commande:
                                            # ✅ MODIFICATION: Ne pas exécuter automatiquement, juste stocker
                                            global last_detected_voice_command
                                            last_detected_voice_command = commande
                                            add_to_history(f"→ Commande détectée: {commande.upper()} (En attente de validation)", "Voix")
                                        else:
                                            add_to_history("❌ Commande non reconnue", "Voix")
                                            
                                    except sr.UnknownValueError:
                                        add_to_history("🔇 Impossible de comprendre", "Voix")
                                    except sr.RequestError as e:
                                        add_to_history(f"🌐 Erreur API: {e}", "Voix")
                                        
                                except sr.WaitTimeoutError:
                                    add_to_history("⏱️ Temps écoulé, réessayez...", "Voix")
                                except Exception as e:
                                    add_to_history(f"❌ Erreur: {str(e)}", "Voix")
                                    break
                    
                    threading.Thread(target=listen_loop, daemon=True).start()

                def executer_commande_vocale_directe(commande):
                    """Exécute directement une commande vocale"""
                    cmd_map = {
                        "avance": avancer,
                        "recule": reculer,
                        "tourner à droite": rotation_droite,
                        "tourner à gauche": rotation_gauche,
                        "latéral à droite": droite,
                        "latéral à gauche": gauche,
                        "arrête": stop,
                        "stop": stop,
                    }
                    
                    if commande in cmd_map:
                        cmd_map[commande]()

                # === Fonctions de reconnaissance gestuelle ===
                def get_finger_state(hand_landmarks):
                    tips = [4, 8, 12, 16, 20]
                    dips = [3, 7, 11, 15, 19]
                    fingers = []
                    
                    for tip, dip in zip(tips, dips):
                        if tip == 4:  # Pouce
                            fingers.append(hand_landmarks.landmark[tip].x < hand_landmarks.landmark[dip].x)
                        else:
                            fingers.append(hand_landmarks.landmark[tip].y < hand_landmarks.landmark[dip].y)
                    
                    # Détection d'inclinaison
                    wrist = hand_landmarks.landmark[0]
                    middle_mcp = hand_landmarks.landmark[9]
                    x_diff = wrist.x - middle_mcp.x
                    
                    if x_diff > 0.15: return "LEFT_TILT"
                    if x_diff < -0.15: return "RIGHT_TILT"
                    
                    # Comptage des doigts
                    count = sum(fingers)
                    if count == 5: return "FIVE"
                    if count == 4: return "FOUR"
                    if count == 3: return "THREE"
                    if count == 2: return "TWO"
                    if count == 1: return "ONE"
                    return "CLOSED"

                def start_gesture_thread():
                    global camera_active, video_label, stop_camera_btn
                    
                    if not camera_active:
                        camera_active = True
                        
                        # Créer l'interface caméra dans la colonne de gauche
                        camera_frame = tk.LabelFrame(left_frame, text="🎥 Caméra Gestuelle", 
                                                  font=('Arial', 14, 'bold'), padx=10, pady=10)
                        camera_frame.pack(fill=tk.BOTH, expand=True, pady=10)
                        
                        video_label = tk.Label(camera_frame)
                        video_label.pack(fill=tk.BOTH, expand=True, pady=10)
                        
                        # ✅ BOUTONS BIEN VISIBLES EN BAS
                        button_frame = tk.Frame(camera_frame)
                        button_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=10)
                        
                        # Bouton pour envoyer la commande gestuelle
                        send_gesture_btn = tk.Button(
                            button_frame,
                            text="📤 Envoyer Commande Caméra",
                            font=('Arial', 12, 'bold'),
                            bg="#4CAF50",
                            fg="white",
                            command=send_gesture_command,
                            height=2
                        )
                        send_gesture_btn.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
                        
                        stop_camera_btn = tk.Button(
                            button_frame,
                            text="⏹ Arrêter Caméra",
                            font=('Arial', 12, 'bold'),
                            bg="#F44336",
                            fg="white",
                            command=stop_camera,
                            height=2
                        )
                        stop_camera_btn.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=5)
                        
                        threading.Thread(target=detect_hand_gesture, daemon=True).start()

                def stop_camera():
                    global camera_active, video_label, stop_camera_btn
                    if camera_active:
                        camera_active = False
                        if video_label:
                            video_label.master.destroy()
                            video_label = None
                            stop_camera_btn = None

                def detect_hand_gesture():
                    global camera_active, video_label, last_detected_gesture
                    
                    cap = cv2.VideoCapture(0)
                    last_gesture = "INCONNU"
                    gesture_stability = 0
                    stability_threshold = 5
                    
                    with mp_hands.Hands(
                            static_image_mode=False,
                            max_num_hands=1,
                            min_detection_confidence=0.8,
                            min_tracking_confidence=0.8) as hands:
                        
                        while cap.isOpened() and camera_active:
                            if not camera_active or not video_label:
                                break
                                
                            success, frame = cap.read()
                            if not success:
                                continue
                                
                            frame = cv2.flip(frame, 1)
                            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                            results = hands.process(image_rgb)
                            
                            current_gesture = "INCONNU"
                            if results.multi_hand_landmarks:
                                for hand_landmarks in results.multi_hand_landmarks:
                                    mp_drawing.draw_landmarks(
                                        frame,
                                        hand_landmarks,
                                        mp_hands.HAND_CONNECTIONS,
                                        mp_drawing.DrawingSpec(color=(0, 180, 255), thickness=2, circle_radius=2),
                                        mp_drawing.DrawingSpec(color=(255, 100, 0), thickness=2)
                                    )
                                    current_gesture = get_finger_state(hand_landmarks)
                            
                            # Stabilité du geste
                            if current_gesture == last_gesture:
                                gesture_stability += 1
                            else:
                                gesture_stability = 0
                                last_gesture = current_gesture
                            
                            stable_gesture = last_gesture if gesture_stability >= stability_threshold else "INCONNU"
                            
                            # Stocker le dernier geste détecté
                            if stable_gesture != "INCONNU":
                                last_detected_gesture = stable_gesture
                                command_name = COMMANDS.get(stable_gesture, 'INCONNU')
                                if command_name != 'INCONNU':
                                    add_to_history(f"Geste détecté: {command_name} (En attente de validation)", "Geste")
                            
                            # Affichage des informations sur l'image
                            if stable_gesture != "INCONNU":
                                cv2.putText(frame, f"Geste: {stable_gesture}", (10, 30),
                                          cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                                cv2.putText(frame, f"Commande: {COMMANDS.get(stable_gesture, '')}", (10, 70),
                                          cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
                                cv2.putText(frame, "Cliquez 'Envoyer Commande'", (10, 110),
                                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                            
                            # Mise à jour de l'affichage vidéo
                            img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                            img = cv2.resize(img, (480, 360))  # ✅ Taille optimisée
                            img = Image.fromarray(img)
                            imgtk = ImageTk.PhotoImage(image=img)
                            
                            if video_label:
                                video_label.imgtk = imgtk
                                video_label.configure(image=imgtk)
                            
                            root.update()
                    
                    cap.release()
                    if camera_active:
                        stop_camera()

                # === Fonctions pour les images cliquables ===
                def image_cliquee(event, action):
                    # Appliquer un effet "enfoncé"
                    event.widget.config(relief="sunken", bd=4)
                    
                    # Exécuter l'action correspondante
                    if action == "camera":
                        start_gesture_thread()
                    elif action == "voice":
                        threading.Thread(target=start_listening, daemon=True).start()
                    
                    # Revenir à l'état normal après un court instant
                    root.after(150, lambda: event.widget.config(relief="flat", bd=0))

                # === Interface principale RÉORGANISÉE ===
                root = tk.Tk()
                root.title("🎤🎥 Contrôle Vocal et Gestuel du Robot - Interface Optimisée")
                root.geometry("1400x900")  # ✅ Fenêtre plus large

                # Cadre principal
                main_frame = tk.Frame(root)
                main_frame.pack(expand=True, fill=tk.BOTH, padx=10, pady=10)

                # === COLONNE DE GAUCHE - CAMÉRA ET VITESSES (SANS GRAPHIQUE) ===
                left_frame = tk.Frame(main_frame)
                left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

                # ✅ SUPPRESSION DU GRAPHIQUE ROBOT - Plus d'espace pour la caméra

                # Affichage des vitesses actuelles (plus compact)
                speed_frame = tk.LabelFrame(left_frame, text="⚡ Vitesses Actuelles",
                                          font=('Arial', 12, 'bold'), padx=10, pady=10)
                speed_frame.pack(fill=tk.X, pady=5)

                speed_grid = tk.Frame(speed_frame)
                speed_grid.pack()

                speed_vx_label = tk.Label(speed_grid, text="Vx: 0.00 m/s", font=('Arial', 11, 'bold'), width=15)
                speed_vx_label.grid(row=0, column=0, padx=5)

                speed_vy_label = tk.Label(speed_grid, text="Vy: 0.00 m/s", font=('Arial', 11, 'bold'), width=15)
                speed_vy_label.grid(row=0, column=1, padx=5)

                speed_omega_label = tk.Label(speed_grid, text="Ω: 0.00 rad/s", font=('Arial', 11, 'bold'), width=15)
                speed_omega_label.grid(row=0, column=2, padx=5)

                # === COLONNE CENTRALE - COMMANDES RÉORGANISÉES ===
                center_frame = tk.Frame(main_frame)
                center_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=20)

                # ✅ SECTION COMMANDES GESTUELLES (PLUS COMPACTE)
                gesture_frame = tk.LabelFrame(center_frame, text="👋 Commandes Gestuelles",
                                            font=('Arial', 14, 'bold'), padx=15, pady=15)
                gesture_frame.pack(fill=tk.X, pady=10)

                # Image pour démarrer la caméra gestuelle (plus petite)
                try:
                    camera_img = Image.open(r"C:\\Users\\Hiba\\Downloads\\camera.jpg")
                    camera_img = camera_img.resize((120, 120))  # ✅ Taille réduite
                    camera_photo = ImageTk.PhotoImage(camera_img)
                    
                    camera_label = tk.Label(gesture_frame, image=camera_photo, bd=0, relief="flat", cursor="hand2")
                    camera_label.pack(pady=5)
                    camera_label.bind("<Button-1>", lambda e: image_cliquee(e, "camera"))
                    
                except Exception as e:
                    print(f"Erreur chargement image caméra: {e}")
                    camera_btn = tk.Button(gesture_frame, text="📷 Démarrer la Caméra Gestuelle", 
                                         command=start_gesture_thread, font=('Arial', 12))
                    camera_btn.pack(fill=tk.X, pady=5)

                # Instructions gestuelles (plus compactes)
                gesture_instructions = tk.Label(gesture_frame,
                                              text="GESTES: 1=Avance, 2=Recule, 3=Rot.Gauche, 4=Rot.Droite\n"
                                                   "Inclinaison=Latéral, Poing=Stop",
                                              font=('Arial', 10),
                                              justify=tk.CENTER,
                                              bg="#f0f0f0",
                                              padx=10, pady=5)
                gesture_instructions.pack(fill=tk.X, pady=5)

                # ✅ SECTION COMMANDES VOCALES AVEC BOUTON DE VALIDATION
                voice_frame = tk.LabelFrame(center_frame, text="🎤 Commandes Vocales",
                                          font=('Arial', 14, 'bold'), padx=15, pady=15)
                voice_frame.pack(fill=tk.X, pady=10)

                # Conteneur horizontal pour image et bouton
                voice_container = tk.Frame(voice_frame)
                voice_container.pack(fill=tk.X, pady=5)

                # Image pour l'écoute vocale (à gauche)
                try:
                    voice_img = Image.open(r"C:\\Users\\Hiba\\Downloads\\microphonee.png")
                    voice_img = voice_img.resize((120, 120))  # ✅ Taille réduite
                    voice_photo = ImageTk.PhotoImage(voice_img)
                    
                    voice_label = tk.Label(voice_container, image=voice_photo, bd=0, relief="flat", cursor="hand2")
                    voice_label.pack(side=tk.LEFT, padx=10)
                    voice_label.bind("<Button-1>", lambda e: image_cliquee(e, "voice"))
                except Exception as e:
                    print(f"Erreur chargement image microphone: {e}")
                    voice_button = tk.Button(voice_container, text="🎤 Démarrer l'écoute vocale", 
                                           command=lambda: threading.Thread(target=start_listening, daemon=True).start(),
                                           font=('Arial', 12))
                    voice_button.pack(side=tk.LEFT, padx=10)

                # ✅ NOUVEAU BOUTON "ENVOYER COMMANDE VOIX" (à droite)
                send_voice_btn = tk.Button(
                    voice_container,
                    text="📤 Envoyer Commande Voix",
                    font=('Arial', 12, 'bold'),
                    bg="#9C27B0",
                    fg="white",
                    command=send_voice_command,
                    width=20,
                    height=3
                )
                send_voice_btn.pack(side=tk.RIGHT, padx=10)

                # Instructions vocales (plus compactes)
                voice_commands = tk.Label(voice_frame, 
                                         text="COMMANDES: Avance, Recule, Droite, Gauche, Stop\n"
                                              "Latéral droite/gauche, Détection gaz",
                                         font=('Arial', 10),
                                         justify=tk.CENTER,
                                         bg="#f0f0f0",
                                         padx=10, pady=5)
                voice_commands.pack(fill=tk.X, pady=5)

                # === COLONNE DE DROITE - HISTORIQUE ET STATUT ===
                right_frame = tk.Frame(main_frame)
                right_frame.pack(side=tk.RIGHT, fill=tk.BOTH)

                # ✅ STATUT ESP32 (COMPACT)
                esp32_frame = tk.LabelFrame(right_frame, text="🔌 Statut ESP32",
                                          font=('Arial', 12, 'bold'), padx=10, pady=10)
                esp32_frame.pack(fill=tk.X, pady=5)

                # Affichage du statut de connexion (lecture seule)
                status_label = tk.Label(
                    esp32_frame,
                    text="✅ ESP32 Connecté",
                    bg="#4CAF50",
                    fg="white",
                    font=('Arial', 11, 'bold'),
                    pady=5
                )
                status_label.pack(fill=tk.X)

                # Historique des commandes (plus grand)
                history_frame = tk.LabelFrame(right_frame, text="📜 Historique des commandes",
                                             font=('Arial', 12, 'bold'), padx=10, pady=10)
                history_frame.pack(fill=tk.BOTH, expand=True, pady=5)

                history_text = tk.Text(history_frame, height=25, width=40, wrap=tk.WORD, font=('Arial', 9))
                scrollbar_history = tk.Scrollbar(history_frame, command=history_text.yview)
                history_text.configure(yscrollcommand=scrollbar_history.set)

                scrollbar_history.pack(side=tk.RIGHT, fill=tk.Y)
                history_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

                # === Lancement ===
                if __name__ == "__main__":
                    # Initialiser l'historique
                    add_to_history("✅ Interface autonome démarrée", "Système")
                    add_to_history("✅ Utilisation de la connexion ESP32 existante", "Système")
                    add_to_history("🎤 Commandes vocales en mode validation manuelle", "Système")
                    add_to_history("👋 Commandes gestuelles en mode validation manuelle", "Système")
                    update_history()
                    
                    # Garder les références aux images
                    if 'camera_photo' in locals():
                        camera_label.image = camera_photo
                    if 'voice_photo' in locals():
                        voice_label.image = voice_photo
                    
                    # Démarrer l'application
                    root.mainloop()
                    
            except Exception as e:
                st.error(f"Erreur lors de l'ouverture de l'interface: {str(e)}")

# ============================================================================
# ONGLET 3 - COMMANDE MANUELLE
# ============================================================================
with tab3:
    st.header("🎮 Commande Manuelle")
   
    col1, col2, col3 = st.columns([1, 2, 1])
   
    with col1:
        st.subheader("Contrôle Directionnel")
       
        # Grille de boutons de contrôle
        col1a, col1b, col1c = st.columns(3)
       
        with col1a:
            if st.button("↖", key="haut_gauche"):
                send_haut_gauche_command()
       
        with col1b:
            if st.button("▲", key="up"):
                send_up_command()
       
        with col1c:
            if st.button("↗", key="haut_droite"):
                send_haut_droite_command()
       
        col1a, col1b, col1c = st.columns(3)
       
        with col1a:
            if st.button("◀", key="left"):
                send_left_command()
       
        with col1b:
            if st.button("⏹", key="stop"):
                send_stop_command()
       
        with col1c:
            if st.button("▶", key="right"):
                send_right_command()
       
        col1a, col1b, col1c = st.columns(3)
       
        with col1a:
            if st.button("↙", key="bas_gauche"):
                send_bas_gauche_command()
       
        with col1b:
            if st.button("▼", key="down"):
                send_down_command()
       
        with col1c:
            if st.button("↘", key="bas_droite"):
                send_bas_droite_command()
       
        col1a, col1b = st.columns(2)
       
        with col1a:
            if st.button("🔃", key="rot_left"):
                send_rot_left_command()
       
        with col1b:
            if st.button("🔄", key="rot_right"):
                send_rot_right_command()
   
    with col2:
        st.subheader("Paramètres de Déplacement")
       
        # Vitesses linéaires
        st.write("**Vitesses Linéaires**")
        col2a, col2b, col2c = st.columns(3)
       
        with col2a:
            vx_input = st.number_input("Vx (m/s)", value=st.session_state.Vx, step=0.1, format="%.2f", key="vx_manual")
        with col2b:
            vy_input = st.number_input("Vy (m/s)", value=st.session_state.Vy, step=0.1, format="%.2f", key="vy_manual")
        with col2c:
            omega_input = st.number_input("Ω (rad/s)", value=st.session_state.omega, step=0.1, format="%.2f", key="omega_manual")
       
        if st.button("Calculer les Angles", type="primary"):
            st.session_state.Vx = vx_input
            st.session_state.Vy = vy_input
            st.session_state.omega = omega_input
            st.session_state.current_vx = vx_input
            st.session_state.current_vy = vy_input
            st.session_state.current_omega = omega_input
           
            wheel_thetas, active_wheels = calculate_thetas_manual(vx_input, vy_input, omega_input)
            st.session_state.wheel_thetas = wheel_thetas
            st.session_state.active_wheels = active_wheels
           
            st.success("Angles calculés et envoyés à l'ESP32")
            st.rerun()

        # Nouvelle section pour les servos
        st.write("**Contrôle des Servos**")
        col2a, col2b, col2c = st.columns([1, 1, 1])
        with col2a:
            angle_azimut = st.number_input("Azimut (°)", min_value=0, max_value=180, value=90, key="azimut")
        with col2b:
            angle_elevation = st.number_input("Élévation (°)", min_value=0, max_value=180, value=90, key="elevation")
        with col2c:
            st.write("")  # Espace vide pour alignement
            if st.button("Envoi aux Servos", key="send_servo", help="Envoyer les angles aux servos"):
                if st.session_state.esp32_connected:
                    cmd = f"b {angle_azimut} {angle_elevation}"
                    send_command_to_esp32(cmd)
                    add_to_history(f"Servos: azimut={angle_azimut}°, elevation={angle_elevation}°", "Servo")
                else:
                    add_to_history("Erreur: ESP32 non connecté", "Servo")
       
        # Position absolue
        st.write("**Déplacement Absolu**")
        col2a, col2b, col2c, col2d = st.columns(4)
       
        with col2a:
            pos_x = st.number_input("Position X", value=0.0, step=0.1, format="%.2f", key="pos_x")
        with col2b:
            pos_y = st.number_input("Position Y", value=0.0, step=0.1, format="%.2f", key="pos_y")
        with col2c:
            angle = st.number_input("Orientation", value=0.0, step=0.1, format="%.2f", key="angle")
        with col2d:
            if st.button("Envoyer Position"):
                send_position_command(pos_x, pos_y, angle)
       
        # Vitesses des roues
        st.write("**Vitesses des Roues**")
        col2a, col2b, col2c, col2d = st.columns(4)
       
        wheel_speeds = []
        for i in range(4):
            with [col2a, col2b, col2c, col2d][i]:
                speed = st.number_input(f"ω{i+1} (rad/s)", value=0.0, step=0.1, format="%.4f", key=f"wheel_{i}")
                wheel_speeds.append(speed)
       
        if st.button("Calculer la Position"):
            vx, vy, omega = calculate_velocities(wheel_speeds)
            st.session_state.Vx = vx
            st.session_state.Vy = vy
            st.session_state.omega = omega
            st.session_state.current_vx = vx
            st.session_state.current_vy = vy
            st.session_state.current_omega = omega
            calculate_thetas()
           
            st.success(f"Calculé: Vx={vx:.4f}, Vy={vy:.4f}, Ω={omega:.4f}")
            st.rerun()
       
        # Affichage des vitesses des roues calculées
        st.write("**Vitesses des Roues Calculées**")
        col2a, col2b, col2c, col2d = st.columns(4)
       
        for i, theta in enumerate(st.session_state.wheel_thetas):
            with [col2a, col2b, col2c, col2d][i]:
                st.metric(f"Roue {i+1}", f"{theta:.4f}")
       
        # Résultats du calcul inverse
        st.write("**Résultats du Calcul Inverse**")
        col2a, col2b, col2c = st.columns(3)
       
        with col2a:
            st.metric("Vx résultat", f"{st.session_state.current_vx:.4f} m/s")
        with col2b:
            st.metric("Vy résultat", f"{st.session_state.current_vy:.4f} m/s")
        with col2c:
            st.metric("ω résultat", f"{st.session_state.current_omega:.4f} rad/s")
   
    with col3:
        st.subheader("Visualisation Robot")
        calculate_thetas()
        fig = create_robot_visualization()
        st.pyplot(fig)
       
        st.subheader("État Actuel")
        st.metric("Vx actuel", f"{st.session_state.current_vx:.4f} m/s")
        st.metric("Vy actuel", f"{st.session_state.current_vy:.4f} m/s")
        st.metric("Ω actuel", f"{st.session_state.current_omega:.4f} rad/s")

# Auto-refresh pour la lecture des capteurs
if st.session_state.esp32_connected:
    time.sleep(0.1)
    st.rerun()

# Instructions d'utilisation
st.markdown("---")
st.markdown("""
### 🔧 Instructions d'utilisation - Interface Optimisée

**📊 Onglet Monitoring Capteurs:**
- Sélectionnez un capteur pour afficher ses données en temps réel
- Utilisez le bouton "Ouvrir dans Maps" pour localiser le robot via GPS

**🎤 Onglet Contrôle Autonome (NOUVELLE VERSION OPTIMISÉE):**
- ✅ **Interface réorganisée** - Plus d'espace pour la caméra
- ✅ **Graphique robot supprimé** - Boutons caméra maintenant visibles
- ✅ **Nouveau bouton "Envoyer Commande Voix"** - Validation manuelle des commandes vocales
- ✅ **Boutons caméra bien visibles** - "Envoyer Commande Caméra" et "Arrêter Caméra"
- ✅ **Fenêtre plus large** - Meilleure ergonomie générale

**🎮 Onglet Commande Manuelle:**
- Utilisez les boutons directionnels pour contrôler le robot
- Ajustez les vitesses linéaires et angulaires
- Calculez les vitesses des roues ou la position
- Envoyez des commandes de position absolue

**🔌 Connexion ESP32:**
- **UN SEUL POINT DE CONNEXION** dans la sidebar principale
- Port: COM14, Baudrate: 57600
- L'interface autonome utilise automatiquement cette connexion

### ✅ **PROBLÈMES RÉSOLUS :**
- **✅ Graphique robot supprimé** - Plus d'espace pour la caméra
- **✅ Boutons caméra visibles** - "Envoyer Commande Caméra" et "Arrêter Caméra" maintenant accessibles
- **✅ Bouton "Envoyer Commande Voix" ajouté** - Validation manuelle des commandes vocales
- **✅ Interface réorganisée** - Meilleure disposition des éléments
- **✅ Fenêtre plus large** - 1400x900 pour une meilleure visibilité

### 🎯 **NOUVELLES FONCTIONNALITÉS :**
- **🎤 Validation manuelle des commandes vocales** - Les commandes détectées ne s'exécutent qu'après clic sur "Envoyer Commande Voix"
- **👋 Validation manuelle des commandes gestuelles** - Les gestes détectés ne s'exécutent qu'après clic sur "Envoyer Commande Caméra"
- **📱 Interface plus ergonomique** - Disposition optimisée pour une meilleure utilisation
- **🔍 Caméra plus grande** - Taille optimisée (480x360) pour une meilleure visibilité des gestes
""")

# Footer
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #666; padding: 20px;">
    <p>🤖 <strong>Système Robot Omnidirectionnel</strong> - Version Interface Optimisée</p>
    <p>✅ Interface réorganisée - 🎯 Boutons visibles - 🎤 Validation manuelle - 👋 Contrôle gestuel amélioré</p>
</div>
""", unsafe_allow_html=True)
