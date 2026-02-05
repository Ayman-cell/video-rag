import cv2
import torch
import numpy as np
from ultralytics import YOLO

# Load YOLO model
model = YOLO("yolov8n.pt")

# Define general movement direction (example: forward)
general_direction = (0, 1)  # (dx, dy) where y=1 means moving forward



def detect_obstacles(frame):
    # NOTE: verbose has been disabled, reenable it for more info.
    results = model(frame, verbose=False)  # Run YOLO on the frame
    detections = []
    
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box
            confidence = float(box.conf[0])  # Confidence score
            cls = int(box.cls[0])  # Class index
            
            if confidence > 0.5:  # Threshold for detection
                detections.append((x1, y1, x2, y2, cls, confidence))
    
    return detections



def is_path_clear(detections, frame_width, frame_height):
    """ Check if there are obstacles in the movement direction """
    for x1, y1, x2, y2, cls, conf in detections:
        obj_center_x = (x1 + x2) // 2
        obj_center_y = (y1 + y2) // 2

        # Central region
        if frame_width * 0.3 < obj_center_x < frame_width * 0.7 and obj_center_y > frame_height * 0.5:
            return False
    
    return True



def rotate_camera(frame, frame_width, frame_height, direction):
    """ Simulated function for camera rotation """
    try:
        # Arrow
        end_width = 8*frame_width/10 if direction=="Left" else (10-8)*frame_width/10
        end_point = (int(end_width), int(1.5*frame_height/10))
        start_point, color, thickness = (int(frame_width-end_width), int(1.5*frame_height/10)), (0,0,255), 10
        cv2.arrowedLine(frame, start_point, end_point, color, thickness)
        # Text
        text = ""
        font, font_scale, text_color, text_thickness = cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 2
        (text_width, text_height), _ = cv2.getTextSize(text, font, font_scale, text_thickness)
        text_x, text_y = start_point[0]-text_width//2, start_point[1]+text_height//2
        cv2.putText(frame, text, (text_x, text_y), font, font_scale, text_color, thickness=4)
    except: print("Rotate Error")
    return frame

def Move(frame, frame_width, frame_height, direction):
    """ Simulated function for forward movement """
    try:
        # Arrow
        end_height = 3*frame_height/10 if direction=="Forward" else ((10-3)*frame_height)/10
        end_point = (int(frame_width/2), int(end_height))
        start_point, color, thickness = (int(frame_width/2), int(frame_height-end_height)), (0,0,255), 10
        cv2.arrowedLine(frame, start_point, end_point, color, thickness)
        # Text
        text = direction
        font, font_scale, text_color, text_thickness = cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 2
        (text_width, text_height), _ = cv2.getTextSize(text, font, font_scale, text_thickness)
        text_x, text_y = start_point[0]-text_width//2, start_point[1] + text_height//2
        text_y += text_height//2 if direction=="Forward" else -text_height//2 -10
        cv2.putText(frame, text, (text_x, text_y), font, font_scale, text_color, thickness=4)
    except: print("Move Error")
    return frame

def Stop(frame, frame_width, frame_height):
    try:
        # Circle
        center_coordinates = (frame_width // 2, frame_height // 2)
        radius, color, thickness = 150, (0, 0, 255), 2
        cv2.circle(frame, center_coordinates, radius, color, thickness)
        # Text
        text = "STOP"
        font, font_scale, text_color, text_thickness = cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 2
        (text_width, text_height), _ = cv2.getTextSize(text, font, font_scale, text_thickness)
        text_x, text_y = center_coordinates[0]-text_width//2, center_coordinates[1]+text_height//2
        cv2.putText(frame, text, (text_x, text_y), font, font_scale, text_color, thickness=4)
    except: print("Stop Error")
    return frame