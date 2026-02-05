import serial
import serial.tools.list_ports
import time

# === CONFIG ===
PORT = "COM9"
BAUD = 115200
TEST_MODE = False

BaudList = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000]
MostUsedBaud = [9600, 115200]

# === Non Serial Functions ===
def SafeInt(text:str)->int:
    try: return int(text)
    except: return 0

def ToggleTest():
    global TEST_MODE
    TEST_MODE = not TEST_MODE
    if TEST_MODE: print("Test Mode Switched ON (Serial Is CLOSED)")
    else: print("Test Mode Switched OFF (Serial Is OPEN)")

# === Serial Setup ===
ser = None

def OPEN_SERIAL(PORT,BAUD=115200):
    global ser, TEST_MODE
    if TEST_MODE:
        print("[TURN OFF TEST MODE TO OPEN SERIAL PORT]")
        return
    if PORT=='' or PORT is None:
        print(f"[ERROR OPENING SERIAL PORT (Provided Port Name As Null)]")
        return
    if BAUD<=0:
        print(f"[ERROR OPENING SERIAL PORT (Invalid Baud {BAUD})]")
        return
    try:
        ser = serial.Serial(PORT, BAUD, timeout=1, write_timeout=1.0)
        time.sleep(3)
        print(f"[SERIAL COMMUNICATION AT {PORT} ESTABLISHED]")
    except Exception as e: print(f"[ERROR OPENING SERIAL PORT '{PORT}' ({e})]")

if __name__ == "__main__" and not TEST_MODE: OPEN_SERIAL(PORT,BAUD)

def CLOSE_SERIAL():
    global ser
    if ser and ser.is_open:
        try:
            ser.close()
            print(f"[SERIAL PORT CLOSED]")
        except Exception as e:
            print(f"[ERROR CLOSING SERIAL PORT: {e}]")
    ser = None

def getCOMLIST(index:int=None, bluetooth:bool=False)->list[int]:
    ports = serial.tools.list_ports.comports()
    if index is not None:
        try:
            if bluetooth:
                bluetoothlist = getCOMLIST(bluetooth=True)
                return [bluetoothlist[index]]
            return [int((ports[index].device)[3:])]
        except Exception as e:
            print(f"{e}")
            return []
    elif bluetooth:
        comlist = []
        for port in ports:
            desc = port.description.lower()
            if "bluetooth" in desc or "bt " in desc or "rfcomm" in desc or "bthenumerator" in desc:
                comlist.append(int(port.device[3:]))
        return comlist
    else:
        comlist = [port.device for port in ports]
        if len(comlist)>0: comlist = [int(comname[3:]) for comname in comlist]
        return comlist


# === Serial Functionalities ===
def READLINE(Timeout=1000)->str:
    if TEST_MODE: return "" # Put Test values here
    global ser
    try:
        if not ser: raise ValueError("READING FROM SERIAL=NONE")
        line = None
        Timeout=max(Timeout,10)
        startTime = time.time()
        while (time.time()-startTime<=Timeout):
            line = ser.readline().decode().strip()
            if line: return line
        if not line: raise ValueError("NO DATA")
        return line
    except Exception as e:
        print(f"[ERROR IN READLINE: {e}]")
        return str(e)

def READ(Timeout=1)->list[str]:
    if TEST_MODE: return [""] # Put Test values here
    global ser
    try:
        if not ser: raise ValueError("READING FROM SERIAL=NONE")
        Data = None
        Timeout=min(Timeout,10)
        startTime = time.time()
        while (time.time()-startTime<=Timeout):
            Data = ser.read_all().decode()
            if Data: return Data.splitlines()
        if not Data: raise ValueError("NO DATA")
        return Data.splitlines()
    except Exception as e:
        if __name__=="__main__": print(f"[ERROR IN READ: {e}]")
        return []

def SEND(msg, Confirmation:str=None, ConfirmTimeout=1000)->bool:
    global ser, TEST_MODE
    if TEST_MODE:
        print(f"Would Send To Serial: [{repr(msg)}]")
        return True
    elif ser:
        try:
            ser.write(msg.encode())
            print(f"Sent To Serial: [{repr(msg)}]")
            if Confirmation and len(Confirmation)>0: # CAUTION: Confirmation will empty previous data from the buffer
                message=None
                ConfirmTimeout = max(ConfirmTimeout,10)
                startTime = time.time()
                while time.time()-startTime<=ConfirmTimeout:
                    message=READLINE(ConfirmTimeout)
                    if message==Confirmation: return True
                if message!=Confirmation: return False
            else: return True
        except Exception as e: print("[ERROR IN SEND: {e}]")
    else:
        print(f"[ERROR IN SEND: SENDING TO SERIAL=NONE]")
        return False
    

def FindMyBluetoothCOM(sentmessage: str, confirmation: str, BAUD=9600, MaxTries=3, TimeoutPerTry_s=1, testfirst=None)->int|None:
    bluetoothlist = getCOMLIST(bluetooth=True)
    if testfirst and testfirst in bluetoothlist:
        bluetoothlist = [testfirst] + [COM for COM in bluetoothlist if COM!=testfirst]
    print(f"Searching for Bluetooth module on ports: {bluetoothlist}")

    for com_number in bluetoothlist:
        PORT_NAME = f"COM{com_number}"
        OPEN_SERIAL(PORT=PORT_NAME, BAUD=BAUD)
        global ser

        if ser and ser.is_open:
            print(f"\n--- Testing Port {com_number} ---")
            # Clear the input buffer before sending
            #ser.reset_input_buffer()
            try:
                ser.write(sentmessage.encode())
                print(f"Sent: {repr(sentmessage)} to {PORT_NAME}")
            except Exception as e:
                print(f"[ERROR SENDING on {PORT_NAME}: {e}]")
                CLOSE_SERIAL()
                continue

            received_confirmation = False
            for attempt in range(MaxTries):
                time.sleep(0.1)
                responses = READ(Timeout=TimeoutPerTry_s) 
                if responses:
                    print(f"Attempt {attempt+1}: Received data lines:")
                    for line in responses:
                        print(line)
                    print('\n')
                    
                    for response in responses:
                        if response.strip() == confirmation.strip():
                            received_confirmation = True
                            print(f"--- SUCCESS: Confirmation '{confirmation}' found on {PORT_NAME}! ---")
                            break
                else:
                    print(f"Attempt {attempt+1}: No data received.")

            CLOSE_SERIAL()
            
            if received_confirmation:
                return com_number

    print("\n--- Search Complete: Target module not found. ---")
    return None



def TempFindMyBluetoothCOM(sentmessage: str, BAUD=9600, MaxTries=3, TimeoutPerTry_s=1, testfirst=None)->int|None:
    bluetoothlist = getCOMLIST(bluetooth=True)
    if testfirst and testfirst in bluetoothlist:
        bluetoothlist = [testfirst] + [COM for COM in bluetoothlist if COM!=testfirst]

    for com_number in bluetoothlist:
        PORT_NAME = f"COM{com_number}"
        OPEN_SERIAL(PORT=PORT_NAME, BAUD=BAUD)
        global ser

        if ser and ser.is_open:
            try:
                ser.write(sentmessage.encode())
                print(f"--- SUCCESS: {PORT_NAME} ---")
            except Exception as e:
                print(f"[ERROR SENDING on {PORT_NAME}: {e}]")
                CLOSE_SERIAL()
                continue
            CLOSE_SERIAL()





# === Example GUI ===
if __name__ == "__main__":
    if False:
        message = "Test Bluetooth"
        confirmation = f"Commande: {message}"
        FindMyBluetoothCOM(message, confirmation, BAUD=9600, MaxTries=3, TimeoutPerTry_s=1, testfirst=6)
        exit()
    if True:
        message = "Test Bluetooth"
        TempFindMyBluetoothCOM(message, BAUD=9600, MaxTries=3, TimeoutPerTry_s=1)
        exit()

    import tkinter as tk
    from tkinter import ttk
    root = tk.Tk()
    root.title("Serial GUI")

    label = tk.Label(root, text=f"MESSAGE")
    label.grid(row=0, column=0, pady=5)
    text_box = tk.Text(root, height=5, width=10, wrap=tk.NONE)
    text_box.grid(row=1, column=0, pady=5, sticky="n")

    label = tk.Label(root, text=f"PORT")
    label.grid(row=0, column=1, pady=5)
    PORT_box = tk.Text(root, height=1, width=5, wrap=tk.NONE)
    PORT_box.insert("1.0","COM4")
    PORT_box.grid(row=1, column=1, pady=5, sticky="n")

    label = tk.Label(root, text=f"BAUD")
    label.grid(row=0, column=2, pady=5)
    BAUD_box = tk.Text(root, height=1, width=7, wrap=tk.NONE)
    BAUD_box.insert("1.0","115200")
    BAUD_box.grid(row=1, column=2, pady=5, sticky="n")

    ttk.Button(root, text="Send", command=lambda:SEND(text_box.get("1.0",tk.END)[:-1])).grid(row=1, column=3, pady=5, padx=5, sticky="n") # [:-1] removes \n
    ttk.Button(root, text="Open Serial", command=lambda:OPEN_SERIAL(PORT_box.get("1.0",tk.END).strip(), SafeInt(BAUD_box.get("1.0",tk.END).strip()))).grid(row=1, column=4, pady=5, padx=5, sticky="n")
    ttk.Button(root, text="Toggle Test Mode", command=ToggleTest).grid(row=1, column=5, pady=5, padx=5, sticky="n")

    ttk.Button(root, text="Read", command=lambda:print(READ())).grid(row=1, column=2, pady=5, sticky="s")
    ttk.Button(root, text="ReadLine", command=lambda:print(READLINE())).grid(row=2, column=2, pady=5, sticky="n")

    read_box = tk.Text(root, height=3, width=30, wrap=tk.NONE)
    read_box.grid(row=1, column=3, rowspan=2, columnspan=3, pady=5, sticky="s")

    ttk.Button(root, text="COM LIST", command=lambda:print(getCOMLIST())).grid(row=3, column=1, pady=5)

    root.mainloop()