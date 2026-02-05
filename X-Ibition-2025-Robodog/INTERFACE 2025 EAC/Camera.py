import cv2 as cv
import time

# phone's camera IP stream
ip = '10.24.20.222'
url = f'http://{ip}:8080/video'

def OpenCamera(index):
    if index==-1:
        camera = cv.VideoCapture(url)
        return camera.isOpened(), camera
    camera = cv.VideoCapture(index)
    return camera.isOpened(), camera

Opened, camera = False, None

if __name__=='__main__': Opened, camera = OpenCamera(0)

def UpdateState(camera):
    global Opened
    Opened = camera.isOpened()
    return Opened

def ModifyFrame(frame, modification):
    frame = frame.copy()
    if modification=="modifName": ...

    return frame


def Display(frame,window):
    label, active = window[0], window[1]
    if active: cv.imshow(label, frame)

ListOfWindows = [["Camera Window", True], ["ModifiedWindow", True]]

startTime = time.time()


def GetFrame(camera, RGB=False):
    global Opened, startTime

    if not camera.isOpened():
        if __name__=='__main__': print("Getting frame from Unopened camera.")
        Opened = False
        return False, None
    success, frame = camera.read()
    
    while success==False:
        success, frame = camera.read()
        Timer = time.time()
        
        if (Timer-startTime)>5:
            print("Camera Timed Out")
            break
        
        if success: startTime = time.time()
    
    if success:
        if RGB: return True, cv.cvtColor(frame, cv.COLOR_BGR2RGB)
        else: return True, frame
    else: return False, None


def CloseCamera(camera):
    camera.release()






if __name__=='__main__':
    print("NORMAL TEST LOOP (NOT CAMERA CUT-OFF RESISTANT !!)")
    while True:
        success, frame = GetFrame(camera)
        if not Opened:
            time.sleep(0.1)
            CloseCamera(camera)
            cv.destroyAllWindows()
            Opened, camera = OpenCamera(0)
            continue
        if not success:
            time.sleep(0.1)
            CloseCamera(camera)
            cv.destroyAllWindows()
            continue

        cv.imshow("Main Window", frame)

        if cv.waitKey(1) & 0xFF == ord('q'): break
    CloseCamera(camera)
    cv.destroyAllWindows()
    
print(camera)

if __name__=='__main__':
    print("IMPORTABLE GUI LOOP")
    import tkinter as tk
    from tkinter import Label
    from PIL import Image, ImageTk
    root = tk.Tk()
    CameraFeed = Label(root)
    CameraFeed.grid(row=0,column=1)
    OPEN_CAMERA = True
    # REPLACE SCRIPT VARIABLES WITH "Camera.<variable>" WHEN IMPORTING
    def CameraLoop(root):
        global Opened, camera, CameraFeed # REMOVE THESE GLOBALS EXCEPT CameraFeed
        if not OPEN_CAMERA:
            if Opened: CloseCamera(camera)
            img = ImageTk.PhotoImage(image=Image.new('RGB', (640, 480), color='gray'))
            CameraFeed.config(image=img)
            CameraFeed.image=img
            root.after(10, lambda:CameraLoop(root))
            return
        if not Opened:
            print("Camera Not Opened. Retrying.")
            Opened, camera = OpenCamera(-1)
            root.after(10, lambda:CameraLoop(root))
            return
        success, frame = GetFrame(camera, RGB=True)
        if not success:
            Opened = False
            print("Failed Capturing Video Frame. Retrying.")
            root.after(10, lambda:CameraLoop(root))
            return

        img = ImageTk.PhotoImage(image=Image.fromarray(frame))
        CameraFeed.config(image=img)
        CameraFeed.image=img

        root.after(10, lambda:CameraLoop(root))
    
    CameraLoop(root)
    root.mainloop()
    
    CloseCamera(camera)
    cv.destroyAllWindows()