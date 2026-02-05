import cv2 as cv
import tkinter as tk
import time

import mediapipe as mp
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7)



# Fonction de détection des gestes
def detect_direction(x_tip, y_tip, x_base, y_base):
        if abs(x_tip-x_base) > abs(y_tip-y_base):
            return "Left" if x_tip>x_base else "Right"
        else:
            return "Down" if y_tip>y_base else "Up"

def interpret_landmarks(landmarks):
    thumb_is_open = landmarks[4].y < landmarks[3].y < landmarks[2].y
    index_is_open = landmarks[8].y < landmarks[6].y
    middle_is_open = landmarks[12].y < landmarks[10].y
    ring_is_open = landmarks[16].y < landmarks[14].y
    pinky_is_open = landmarks[20].y < landmarks[18].y

    fingers = { "thumb":thumb_is_open, "index":index_is_open, "middle":middle_is_open, "ring":ring_is_open, "pinky":pinky_is_open }
    OpenFingers = [name for name,value in fingers.items() if value]
    ClosedFingers = [name for name,value in fingers.items() if not value]

    #print(f"Open ({OpenFingers})  Closed({ClosedFingers})")
    
    # D'après nos tests, thumb n'est pas détecté correctement: il est toujours ouvert.
    if all([index_is_open, middle_is_open, ring_is_open, pinky_is_open]):
        return "Open"
    elif not any([middle_is_open, index_is_open, pinky_is_open, ring_is_open]):
        return "Closed"
    elif index_is_open and not any([middle_is_open, ring_is_open, pinky_is_open]):
        direction = detect_direction(landmarks[8].x, landmarks[8].y, landmarks[5].x, landmarks[5].y)
        return f"{direction}"
    elif all([middle_is_open, ring_is_open, pinky_is_open]) and not index_is_open:
        return "Nice"
    elif all([middle_is_open, index_is_open]) and not any([pinky_is_open, ring_is_open]):
        return "Peace"
    elif pinky_is_open and not any([middle_is_open, index_is_open, ring_is_open]):
        return "Pinky"
    else: return "UNKNOWN"



# Fonction de mise à jour des gestes
def detect_gesture(image_in_rgb):
    results = hands.process(image_in_rgb)
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            landmarks = hand_landmarks.landmark
            gesture = interpret_landmarks(landmarks)
            return gesture
    return None