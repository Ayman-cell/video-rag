def check_camera_resolution():
    """Check your camera's actual resolution"""
    import cv2
    
    cap = cv2.VideoCapture(0)  # 0 is usually the default camera
    if cap.isOpened():
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"Camera resolution: {width}x{height} (aspect ratio: {width/height:.2f}:1)")
        cap.release()
        return width, height
    return None, None

# Call this before setting up your interface
cam_width, cam_height = check_camera_resolution()