#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mars Rover — Détection de QR codes (YOLO) + communication Arduino.

Utilise YOLO (qrdet, basé YOLOv8) pour détecter les QR dans le flux caméra,
décode le contenu avec OpenCV, et envoie la commande à l'Arduino/ESP32
via le port série (même protocole que l'interface Streamlit).

Exemple de contenu QR : "a", "s", "c 15 0 0", "p 10 0 0", etc.
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Optional

import cv2
import numpy as np

try:
    from qrdet import QRDetector
except ImportError:
    print("Installez qrdet : pip install qrdet")
    sys.exit(1)

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("Installez pyserial : pip install pyserial")
    sys.exit(1)


# -----------------------------------------------------------------------------
# Configuration par défaut (alignée avec PY_G8_P4_S4 et Arduino)
# -----------------------------------------------------------------------------
DEFAULT_PORT = "COM14"
DEFAULT_BAUD = 57600
DEFAULT_CAMERA_INDEX = 0
COOLDOWN_SEC = 1.5  # Délai entre deux envois de commande pour le même QR


def decode_qr_opencv(image: np.ndarray) -> Optional[str]:
    """Décode un QR dans une image (BGR) avec OpenCV. Retourne le texte ou None."""
    det = cv2.QRCodeDetector()
    data, _, _ = det.detectAndDecode(image)
    if data and data.strip():
        return data.strip()
    return None


def decode_qr_region(frame: np.ndarray, bbox_xyxy) -> Optional[str]:
    """Extrait la région délimitée par bbox_xyxy (x1,y1,x2,y2) et tente de décoder un QR."""
    x1, y1, x2, y2 = map(int, bbox_xyxy)
    h, w = frame.shape[:2]
    x1, x2 = max(0, x1), min(w, x2)
    y1, y2 = max(0, y1), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return None
    crop = frame[y1:y2, x1:x2]
    return decode_qr_opencv(crop)


def send_command_arduino(ser: Optional[serial.Serial], command: str) -> bool:
    """Envoie une ligne de commande à l'Arduino (commande + \\n)."""
    if ser is None or not ser.is_open:
        return False
    try:
        line = command.strip() + "\n"
        ser.write(line.encode("utf-8"))
        ser.flush()
        return True
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Détection QR (YOLO) + envoi des commandes à l'Arduino (Mars Rover)."
    )
    parser.add_argument(
        "--port", "-p",
        default=DEFAULT_PORT,
        help=f"Port série Arduino/ESP32 (défaut: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--baud", "-b",
        type=int,
        default=DEFAULT_BAUD,
        help=f"Baudrate (défaut: {DEFAULT_BAUD})",
    )
    parser.add_argument(
        "--camera", "-c",
        type=int,
        default=DEFAULT_CAMERA_INDEX,
        help="Indice de la webcam (défaut: 0)",
    )
    parser.add_argument(
        "--no-arduino",
        action="store_true",
        help="Ne pas se connecter à l'Arduino (détection + affichage uniquement)",
    )
    parser.add_argument(
        "--model-size",
        default="s",
        choices=["n", "s", "m", "l"],
        help="Taille du modèle YOLO pour qrdet (défaut: s)",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.5,
        help="Seuil de confiance pour la détection QR (défaut: 0.5)",
    )
    args = parser.parse_args()

    # Connexion série (optionnel)
    ser = None
    if not args.no_arduino:
        try:
            ser = serial.Serial(port=args.port, baudrate=args.baud, timeout=0.5)
            print(f"Arduino connecté sur {args.port} @ {args.baud} baud.")
        except Exception as e:
            print(f"Impossible d'ouvrir {args.port}: {e}")
            print("Lancement en mode --no-arduino (détection seule).")
            ser = None

    # Détecteur QR (YOLO)
    detector = QRDetector(model_size=args.model_size, conf_th=args.conf)
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"Impossible d'ouvrir la caméra {args.camera}.")
        if ser and ser.is_open:
            ser.close()
        sys.exit(1)

    last_sent_command: Optional[str] = None
    last_sent_time = 0.0

    print("Détection QR active. Montrez un QR contenant une commande (ex: a, s, c 15 0 0).")
    print("Quitter : touche 'q' dans la fenêtre vidéo.")

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        frame_bgr = cv2.flip(frame, 1)
        detections = detector.detect(image=frame_bgr, is_bgr=True)

        for det in detections:
            bbox = det["bbox_xyxy"]
            conf = det.get("confidence", 0.0)
            x1, y1, x2, y2 = map(int, bbox)

            # Dessiner la boîte
            cv2.rectangle(frame_bgr, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                frame_bgr, f"QR {conf:.2f}",
                (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2,
            )

            # Décoder le contenu du QR dans la région
            command = decode_qr_region(frame_bgr, bbox)
            if command:
                cv2.putText(
                    frame_bgr, command[:30],
                    (x1, y2 + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2,
                )
                now = time.time()
                if (
                    (last_sent_command != command or (now - last_sent_time) >= COOLDOWN_SEC)
                    and send_command_arduino(ser, command)
                ):
                    last_sent_command = command
                    last_sent_time = now
                    print(f"Commande envoyée: {command}")

        cv2.putText(
            frame_bgr, "Mars Rover - QR -> Arduino | [q] quitter",
            (10, frame_bgr.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1,
        )
        cv2.imshow("Mars Rover - Detection QR", frame_bgr)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    if ser and ser.is_open:
        ser.close()
    print("Arrêt.")


if __name__ == "__main__":
    main()
