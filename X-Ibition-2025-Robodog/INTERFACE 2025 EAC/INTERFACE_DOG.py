import customtkinter as ctk
import tkinter as tk
from customtkinter import CTkFont, CTkLabel, CTkImage
from PIL import Image
import numpy as np
import random
import os, json
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider, Button, TextBox
from matplotlib.font_manager import FontProperties
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.patches import FancyBboxPatch
import matplotlib.patches as patches
import threading
import time
import os
import requests

import Camera, Serial

class RobotGUI:
    def __init__(self, bluetooth=True, title="Robot Control Interface", height=620, x=0, y=50):
        # Initialize main window
        self.root = ctk.CTk()
        self.root.title(title)
        screen_width = self.root.winfo_screenwidth()
        self.root.geometry(f"{screen_width}x{height}+{x}+{y}")

        self.root.configure(bg="#000000")

        self.setup_matrix_effect()
        
        # Set appearance to dark mode
        ctk.set_appearance_mode("dark")
        
        # Futuristic color scheme
        self.BG_COLOR = "#000000"  # Black
        self.FG_COLOR = "#00FF00"  # Matrix green
        self.ACCENT_COLOR = "#00CC00"  # Darker green
        self.PANEL_COLOR = "#212121"  # Very dark gray
        self.TEXT_COLOR = "#00FF00"  # Green text
        
        # Futuristic fonts
        self.FONT_TITLE = ("Courier New", 20, "bold")
        self.FONT_LABEL = ("Courier New", 12, "bold")
        self.FONT_VALUE = ("Courier New", 11)
        self.FONT_MONO = ("Consolas", 10)
        
        # Initialize state variables
        self.Vx, self.Vy, self.Omega = 0, 0, 0
        self.wheel_speeds = [0, 0, 0, 0]
        self.wheel_directions = [1, 1, 1, 1]
        self.dog_state = "standing"

        # Arduino
        self.bybluetooth = bluetooth
        self.defineCOMLIST()
        
        # Create the interface
        self.create_interface()

    def defineCOMLIST(self):
        bluetooth = self.bybluetooth
        if bluetooth:
            COMLIST = Serial.getCOMLIST(bluetooth=True)
            self.SERIAL_BAUD = 9600
        else:
            COMLIST = Serial.getCOMLIST()
            self.SERIAL_BAUD = 115200
        self.COMLIST = COMLIST
        self.DEFAULT_COM = 6 # Set to None for COM autoselection

    def getCOMBAUD(self):
        BAUD = self.SERIAL_BAUD
        if self.DEFAULT_COM: COM = self.DEFAULT_COM
        else:
            COM = self.COMLIST[0] if len(self.COMLIST)>0 else 13
        return COM, BAUD



    # region Matrix Effect
    def setup_matrix_effect(self):
        """Create Matrix-style digital rain effect in background"""
        try:
            # Create a canvas for matrix effect
            self.matrix_canvas = tk.Canvas(self.root, bg="black", highlightthickness=0)
            
            # IMPORTANT: Send matrix canvas to the very back
            self.matrix_canvas.tag_lower("all")
            
            # Matrix rain characters
            self.matrix_chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"
            
            # Create rain columns
            self.rain_columns = []
            for i in range(0, self.root.winfo_width(), 15):
                column = {
                    'x': i,
                    'drops': [],
                    'speed': random.randint(5, 20),
                    'length': random.randint(5, 30)
                }
                self.rain_columns.append(column)
            
            self.matrix_canvas.place(x=0, y=0, relwidth=1, relheight=1)
            
            # Start animation
            # self.root.after(50, self.animate_matrix)
            
        except Exception as e:
            print(f"Matrix effect error: {e}")


    def animate_matrix(self):
        """Animate the Matrix rain effect"""
        try:
            self.matrix_canvas.delete("matrix")
            
            for column in self.rain_columns:
                # Add new drop
                if random.random() < 0.3:
                    char = random.choice(self.matrix_chars)
                    brightness = random.randint(100, 255)
                    color = f"#00{format(brightness, '02x')}00"
                    column['drops'].append({
                        'y': 0,
                        'char': char,
                        'color': color,
                        'brightness': brightness
                    })
                
                # Update existing drops
                for drop in column['drops'][:]:
                    self.matrix_canvas.create_text(
                        column['x'], drop['y'],
                        text=drop['char'],
                        fill=drop['color'],
                        font=("Courier New", 12),
                        tags="matrix"
                    )
                    drop['y'] += column['speed']
                    drop['brightness'] = max(0, drop['brightness'] - 10)
                    drop['color'] = f"#00{format(drop['brightness'], '02x')}00"
                    
                    if drop['y'] > self.root.winfo_height() or drop['brightness'] <= 0:
                        column['drops'].remove(drop)
            
            self.root.after(50, self.animate_matrix)

        except Exception as e:
            print(f"Matrix animation error: {e}")

    def create_header(self):
        """Create futuristic header"""
        header_frame = ctk.CTkFrame(self.main_frame, fg_color=self.PANEL_COLOR, 
                                  height=60, corner_radius=0)
        header_frame.pack(fill="x", pady=(0, 10))
        header_frame.pack_propagate(False)
        
        # Title with cyberpunk style
        title_label = ctk.CTkLabel(header_frame, 
                                 text="◈ CYBER-HOUND CONTROL SYSTEM ◈",
                                 font=("Courier New", 24, "bold"),
                                 text_color=self.FG_COLOR)
        title_label.pack(side="left", padx=20, pady=10)
        
        # Status indicator
        status_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        status_frame.pack(side="right", padx=20, pady=10)
        
        self.status_led = ctk.CTkLabel(status_frame, text="●", 
                                     font=("Arial", 16),
                                     text_color="#00FF00")
        self.status_led.pack(side="left", padx=(0, 10))
        
        status_text = ctk.CTkLabel(status_frame, text="ONLINE", 
                                 font=self.FONT_LABEL,
                                 text_color=self.FG_COLOR)
        status_text.pack(side="left")
        
        # Digital clock
        self.clock_label = ctk.CTkLabel(header_frame, text="00:00:00",
                                      font=self.FONT_MONO,
                                      text_color=self.FG_COLOR)
        self.clock_label.pack(side="right", padx=20, pady=10)
        self.update_clock()

    def update_clock(self):
        """Update digital clock"""
        current_time = time.strftime("%H:%M:%S")
        self.clock_label.configure(text=current_time)
        self.root.after(1000, self.update_clock)


    # region Logo

    def create_logo_frame(self):
        """Create a logo frame with PNG image and cyberpunk effects"""
        logo_frame = ctk.CTkFrame(self.main_frame, width=250, height=80, 
                                fg_color="transparent", corner_radius=12)
        logo_frame.place(x=490+self.leftmost, y=310)
        logo_frame.pack_propagate(False)
        
        # Create a styled container for the logo
        logo_container = ctk.CTkFrame(logo_frame, fg_color="transparent", 
                                    corner_radius=10, border_width=2,
                                    border_color=self.FG_COLOR)
        logo_container.pack(fill="both", expand=True, padx=0, pady=0)
        
        try:
            # Load PNG logo - replace with your actual file path
            logo_image = Image.open("E-TECH logo.png")
            logo_image = logo_image.resize((220, 80), Image.Resampling.LANCZOS)
            
            # Convert to CTkImage
            self.logo_ctk_image = CTkImage(light_image=logo_image, 
                                         dark_image=logo_image,
                                         size=(220, 80))
            
            # Create label with logo image
            logo_label = CTkLabel(logo_container, 
                                image=self.logo_ctk_image, 
                                text="")
            logo_label.pack(expand=True, padx=0, pady=0)
            
            # Add subtle glow effect
            self.add_logo_glow_effect(logo_container)
            
        except Exception as e:
            print(f"Logo loading error: {e}")
            # Fallback to animated text logo
            self.create_animated_fallback_logo(logo_container)

    def add_logo_glow_effect(self, container):
        """Add a subtle pulsing glow effect around the logo"""
        def pulse_glow():
            current_alpha = getattr(self, 'glow_alpha', 100)
            
            if not hasattr(self, 'glow_direction'):
                self.glow_direction = 1
            
            current_alpha += 5 * self.glow_direction
            
            if current_alpha >= 150:
                self.glow_direction = -1
            elif current_alpha <= 100:
                self.glow_direction = 1
                
            self.glow_alpha = current_alpha
            glow_color = f"#00{format(current_alpha, '02x')}00"
            
            container.configure(border_color=glow_color)
            self.root.after(100, pulse_glow)
        
        # Start the glow animation
        pulse_glow()

    def create_animated_fallback_logo(self, container):
        """Create an animated fallback logo"""
        # Main logo text with typing animation
        self.logo_text = ctk.CTkLabel(container, 
                                    text="",
                                    font=("Courier New", 16, "bold"),
                                    text_color=self.FG_COLOR)
        self.logo_text.pack(expand=True)
        
        # Typewriter animation
        full_text = "CYBER-HOUND OS"
        self.current_text = ""
        self.typewriter_index = 0
        self.animate_typewriter(full_text, container)

    def animate_typewriter(self, full_text, container):
        """Animate typewriter effect for fallback logo"""
        if self.typewriter_index < len(full_text):
            self.current_text += full_text[self.typewriter_index]
            self.logo_text.configure(text=self.current_text + "▊")  # Blinking cursor
            self.typewriter_index += 1
            self.root.after(100, lambda: self.animate_typewriter(full_text, container))
        else:
            # Remove cursor and show version
            self.logo_text.configure(text=self.current_text)
            
            version_text = ctk.CTkLabel(container,
                                      text="v2.4.1",
                                      font=("Courier New", 10),
                                      text_color=self.ACCENT_COLOR)
            version_text.pack(side="bottom", pady=(0, 10))


    # region Create GUI
        
    def create_interface(self):
        """Create the main interface components"""
        # Main frame
        self.main_frame = ctk.CTkFrame(self.root, fg_color="#0A0A0A", corner_radius=0)
        self.main_frame.pack(fill="both", expand=True, padx=2, pady=2)
        self.leftmost = 5

        # Create header
        self.create_header()
        
        # Create different sections of the interface
        self.create_leg_control_panel()
        self.create_movement_panel()
        self.create_posture_panel()
        self.create_visualization_panel()
        self.create_serial_panel()
        self.create_camera_panel()

        # Add logo
        self.create_logo_frame()

        
    def create_leg_control_panel(self):
        """Create panel for individual leg motor control with value displays and send buttons"""
        leg_frame = ctk.CTkFrame(self.main_frame, width=480, height=500, fg_color=self.PANEL_COLOR, corner_radius=10)
        leg_frame.place(x=self.leftmost, y=100)
        leg_frame.pack_propagate(False)
        
        title_label = ctk.CTkLabel(leg_frame, text="≣ MOTOR CONTROL ≣", font=self.FONT_TITLE, text_color=self.FG_COLOR)
        title_label.pack(pady=10)
        
        # Create grid for leg controls
        grid_frame = ctk.CTkFrame(leg_frame, fg_color="transparent")
        grid_frame.pack(fill="both", expand=True, padx=15, pady=10)
        
        legs = ["FRONT L", "FRONT R", "REAR L", "REAR R"]
        motors = ["SHOULDER", "KNEE"]
        
        for i, leg in enumerate(legs):
            for j, motor in enumerate(motors):
                cell_frame = ctk.CTkFrame(grid_frame, fg_color="#111111", 
                                        corner_radius=5, height=60)
                cell_frame.grid(row=i, column=j, padx=5, pady=5, sticky="nsew")
                cell_frame.grid_propagate(False)
                
                # Motor label
                motor_label = ctk.CTkLabel(cell_frame, 
                                         text=f"{leg}-{motor}",
                                         font=("Courier New", 9, "bold"),
                                         text_color=self.FG_COLOR)
                motor_label.pack(pady=(5, 0))
                
                # Slider with futuristic style
                slider = ctk.CTkSlider(cell_frame, from_=0, to=180,
                                     progress_color=self.FG_COLOR,
                                     button_color=self.ACCENT_COLOR,
                                     button_hover_color=self.FG_COLOR,
                                     command=lambda v, l=leg, m=motor: self.on_motor_slider_change(l, m, v))
                slider.set(90)
                slider.pack(pady=5, padx=10)
                
                # Value display and send button
                bottom_frame = ctk.CTkFrame(cell_frame, fg_color="transparent")
                bottom_frame.pack(fill="x", padx=10, pady=(0, 5))
                
                value_var = ctk.StringVar(value="90°")
                value_label = ctk.CTkLabel(bottom_frame, textvariable=value_var,
                                         font=self.FONT_MONO, text_color=self.FG_COLOR,
                                         width=30)
                value_label.pack(side="left")
                
                send_btn = ctk.CTkButton(bottom_frame, text="SEND", 
                                       font=("Courier New", 8, "bold"),
                                       fg_color=self.ACCENT_COLOR,
                                       hover_color=self.FG_COLOR,
                                       text_color="black",
                                       width=40, height=20,
                                       command=lambda l=leg, m=motor, s=slider: self.on_motor_send(l, m, s.get()))
                send_btn.pack(side="right")
                
                # Store references
                motor_key = f"{leg}_{motor}".lower().replace(" ", "_")
                setattr(self, f"{motor_key}_slider", slider)
                setattr(self, f"{motor_key}_value", value_var)

    
    def create_movement_panel(self):
        """Create panel for movement controls"""
        move_frame = ctk.CTkFrame(self.main_frame, width=250, height=200, fg_color=self.PANEL_COLOR, corner_radius=10)
        move_frame.place(x=490+self.leftmost, y=100)
        move_frame.pack_propagate(False)
        
        title_label = ctk.CTkLabel(move_frame, text="≣ MOVEMENT CONTROL ≣",
                                 font=self.FONT_TITLE, text_color=self.FG_COLOR)
        title_label.pack(pady=10)
        
        # Directional buttons for walking
        pad_frame = ctk.CTkFrame(move_frame, fg_color=self.PANEL_COLOR, corner_radius=10)
        pad_frame.pack(pady=10)
        
        # Directional buttons layout
        buttons = [
            ("↑", 1, 1, "forward"),
            ("↓", 1, 3, "backward"), 
            ("←", 0, 2, "left"),
            ("→", 2, 2, "right")
        ]
        
        for text, col, row, direction in buttons:
            btn = ctk.CTkButton(
                pad_frame, text=text, width=40, height=40,
                command=lambda d=direction: self.on_movement_button(d)
            )
            btn.grid(row=row, column=col, padx=2, pady=2)
        
        # Speed control
        speed_frame = ctk.CTkFrame(move_frame, fg_color=self.PANEL_COLOR, corner_radius=10)
        speed_frame.pack(fill="x", padx=10, pady=10)
        
        speed_label = ctk.CTkLabel(speed_frame, text="≣ SPEED ≣", font=self.FONT_TITLE, text_color=self.FG_COLOR)
        speed_label.pack(anchor="w")
        
        self.speed_slider = ctk.CTkSlider(
            speed_frame, from_=0, to=100, orientation="horizontal",
            command=self.on_speed_change
        )
        self.speed_slider.set(50)  # Default speed
        self.speed_slider.pack(fill="x", pady=5)
    
    def create_posture_panel(self):
        """Create panel for posture controls"""
        posture_frame = ctk.CTkFrame(self.main_frame, width=250, height=200, fg_color=self.PANEL_COLOR, corner_radius=10)
        posture_frame.place(x=490+self.leftmost, y=400)
        posture_frame.pack_propagate(False)
        
        title_label = ctk.CTkLabel(posture_frame, text="≣ POSTURE ≣", font=self.FONT_TITLE, text_color=self.FG_COLOR)
        title_label.pack(pady=10)
        
        # Stand button
        stand_btn = ctk.CTkButton(
            posture_frame, text="Stand Position", font=self.FONT_LABEL,
            command=self.on_stand, width=200, height=40
        )
        stand_btn.pack(pady=5)
        
        # Elevation control
        elev_label = ctk.CTkLabel(posture_frame, text="≣ ELEVATION ≣", font=self.FONT_TITLE, text_color=self.FG_COLOR)
        elev_label.pack()

        elev_frame = ctk.CTkFrame(posture_frame, fg_color=self.PANEL_COLOR, corner_radius=10)
        elev_frame.pack(fill="x", padx=10, pady=10)

        self.elevation = 50

        self.elev_add_btn = ctk.CTkButton(
            elev_frame, text="+", font=self.FONT_LABEL,
            command=lambda change='+': self.on_elevation_change(change),
            width=50, height=40
        )
        self.elev_add_btn.pack(side='left', pady=5)

        self.elev_minus_btn = ctk.CTkButton(
            elev_frame, text="-", font=self.FONT_LABEL,
            command=lambda change='-': self.on_elevation_change(change),
            width=50, height=40
        )
        self.elev_minus_btn.pack(side='right', pady=5)

    

    def create_visualization_panel(self):
        """Create enhanced robot dog visualization panel"""
        viz_frame = ctk.CTkFrame(self.main_frame, width=350, height=350,
                               fg_color=self.PANEL_COLOR, corner_radius=10)
        viz_frame.place(x=750+self.leftmost, y=100)
        viz_frame.pack_propagate(False)
        
        title_label = ctk.CTkLabel(viz_frame, text="≣ CYBER-HOUND STATUS ≣",
                                 font=self.FONT_TITLE, text_color=self.FG_COLOR)
        title_label.pack(pady=15)
        
        # Visualization canvas for animated dog
        self.viz_canvas = tk.Canvas(viz_frame, bg="#001100", highlightthickness=0, height=250)
        self.viz_canvas.pack(fill="both", expand=True, padx=15, pady=10)
        
        # Status text below canvas
        self.dog_state_label = ctk.CTkLabel(viz_frame, text="STANDBY MODE",
                                          font=("Courier New", 14, "bold"),
                                          text_color=self.FG_COLOR)
        self.dog_state_label.pack(pady=(0, 10))
        
        # Initialize dog visualization
        self.dog_parts = {}
        self.animation_id = None
        self.animation_frame = 0
        
        # Draw initial dog
        self.root.after(100, self.draw_dog_visualization)
        
        # Battery indicator
        battery_frame = ctk.CTkFrame(viz_frame, fg_color="transparent")
        battery_frame.pack(fill="x", padx=15, pady=(0, 10))
        
        battery_label = ctk.CTkLabel(battery_frame, text="POWER:",
                                   font=self.FONT_LABEL, text_color=self.FG_COLOR)
        battery_label.pack(side="left")
        
        self.battery_bar = ctk.CTkProgressBar(battery_frame, 
                                            progress_color=self.FG_COLOR,
                                            fg_color="#222222")
        self.battery_bar.set(0.85)  # 85% battery
        self.battery_bar.pack(side="right", fill="x", expand=True, padx=(10, 0))
    
    
    def create_serial_panel(self):
        """Create serial communication panel"""
        serial_frame = ctk.CTkFrame(self.main_frame, width=350, height=130, fg_color=self.PANEL_COLOR, corner_radius=10)
        serial_frame.place(x=750+self.leftmost, y=470)
        serial_frame.pack_propagate(False)
        
        title_label = ctk.CTkLabel(serial_frame, text="≣ CONNECTION ≣", font=self.FONT_TITLE, text_color=self.FG_COLOR)
        title_label.pack(pady=10)

        # COM and BAUD
        COM, BAUD = self.getCOMBAUD()

        com_baud_frame = ctk.CTkFrame(serial_frame)
        com_baud_frame.pack(fill="x", padx=10, pady=5)
        
        # COM port selection
        com_label = ctk.CTkLabel(com_baud_frame, text="COM:", font=self.FONT_LABEL, width=40, anchor="w")
        com_label.pack(side="left", padx=5)
        
        self.com_var = ctk.StringVar(value=f"COM{COM}")
        com_entry = ctk.CTkEntry(com_baud_frame, textvariable=self.com_var, width=80)
        com_entry.pack(side="left", padx=5)

        # Baud rate selection
        baud_label = ctk.CTkLabel(com_baud_frame, text="Baud Rate:", font=self.FONT_LABEL, width=80, anchor="w")
        baud_label.pack(side="left", padx=5)
        
        self.baud_var = ctk.StringVar(value=f"{BAUD}")
        baud_entry = ctk.CTkEntry(com_baud_frame, textvariable=self.baud_var, width=100)
        baud_entry.pack(side="left", padx=5)
        
        # Connect button
        connect_btn = ctk.CTkButton(
            serial_frame, text="Connect", font=self.FONT_LABEL,
            command=self.on_serial_connect, width=100
        )
        connect_btn.pack(pady=10)
        
        # Initialize
        self.setup_serial_communication()
    

    def create_camera_panel(self):
        """Create camera feed panel"""
        camera_frame = ctk.CTkFrame(self.main_frame, width=400, height=500, fg_color=self.PANEL_COLOR, corner_radius=10)
        camera_frame.place(x=1110+self.leftmost, y=100)
        camera_frame.pack_propagate(False)
        self.camera_frame = camera_frame
        
        title_label = ctk.CTkLabel(camera_frame, text="≣ CAMERA ≣", font=self.FONT_TITLE, text_color=self.FG_COLOR)
        title_label.pack(pady=10)
        
        # Camera feed frame - only one frame for the actual video
        self.feed_frame = ctk.CTkFrame(camera_frame, fg_color="#333333")
        self.feed_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Camera controls
        controls_frame = ctk.CTkFrame(camera_frame)
        controls_frame.pack(fill="x", padx=10, pady=5)
        
        start_btn = ctk.CTkButton(
            controls_frame, text="Start Camera", font=self.FONT_LABEL,
            command=self.on_camera_start, width=120
        )
        start_btn.pack(side="left", padx=5)
        
        stop_btn = ctk.CTkButton(
            controls_frame, text="Stop Camera", font=self.FONT_LABEL,
            command=self.on_camera_stop, width=120, fg_color="red", hover_color="darkred"
        )
        stop_btn.pack(side="left", padx=5)
        
        # Initialize camera setup
        self.setup_camera()


    # region Draw Dog

    def draw_dog_visualization(self):
        """Draw the animated robot dog visualization"""
        self.viz_canvas.delete("dog")
        width = self.viz_canvas.winfo_width()
        height = self.viz_canvas.winfo_height()
        
        if width < 10 or height < 10:
            self.root.after(100, self.draw_dog_visualization)
            return
        
        center_x, center_y = width // 2, height // 2
        
        # Draw background grid
        for i in range(0, width, 20):
            self.viz_canvas.create_line(i, 0, i, height, fill="#003300", width=1, tags="dog")
        for i in range(0, height, 20):
            self.viz_canvas.create_line(0, i, width, i, fill="#003300", width=1, tags="dog")
        
        # Draw robot dog based on state
        if self.dog_state == "standing":
            self.draw_standing_dog(center_x, center_y)
        elif self.dog_state == "forward":
            self.draw_walking_dog(center_x, center_y, True)
        elif self.dog_state == "backward":
            self.draw_walking_dog(center_x, center_y, False)
        elif self.dog_state == "left":
            self.draw_turning_dog(center_x, center_y, True)
        elif self.dog_state == "right":
            self.draw_turning_dog(center_x, center_y, False)
        elif self.dog_state == "sitting":
            self.draw_sitting_dog(center_x, center_y)
        elif self.dog_state == "lying":
            self.draw_lying_dog(center_x, center_y)
        elif self.dog_state == "error":
            self.draw_error_state(center_x, center_y)
        
        # Schedule next animation frame
        if self.dog_state in ["forward", "backward", "left", "right"]:
            self.animation_frame = (self.animation_frame + 1) % 4
            self.animation_id = self.root.after(200, self.draw_dog_visualization)
        else:
            if self.animation_id:
                self.root.after_cancel(self.animation_id)
                self.animation_id = None

    def draw_standing_dog(self, center_x, center_y):
        """Draw dog in standing position"""
        # Body
        body = self.viz_canvas.create_rectangle(center_x-40, center_y-20, center_x+40, center_y+20,
                                              fill="#00CC00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Head
        head = self.viz_canvas.create_oval(center_x+30, center_y-15, center_x+60, center_y+15,
                                         fill="#00AA00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Legs (standing position)
        leg_positions = [
            (center_x-30, center_y+20, center_x-30, center_y+50),  # Front left
            (center_x-10, center_y+20, center_x-10, center_y+50),  # Front right
            (center_x+10, center_y+20, center_x+10, center_y+50),  # Back left
            (center_x+30, center_y+20, center_x+30, center_y+50)   # Back right
        ]
        
        for x1, y1, x2, y2 in leg_positions:
            self.viz_canvas.create_line(x1, y1, x2, y2, fill=self.FG_COLOR, width=3, tags="dog")
        
        # Eyes
        self.viz_canvas.create_oval(center_x+40, center_y-5, center_x+45, center_y,
                                   fill="#00FF00", outline="", tags="dog")

    def draw_walking_dog(self, center_x, center_y, forward=True):
        """Draw dog in walking animation"""
        # Body
        body = self.viz_canvas.create_rectangle(center_x-40, center_y-20, center_x+40, center_y+20,
                                              fill="#00CC00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Head
        head = self.viz_canvas.create_oval(center_x+30, center_y-15, center_x+60, center_y+15,
                                         fill="#00AA00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Animated legs based on frame
        leg_phases = [
            [(0, 0), (0, 0), (0, 0), (0, 0)],  # Frame 0
            [(10, 0), (-10, 0), (10, 0), (-10, 0)],  # Frame 1
            [(0, 0), (0, 0), (0, 0), (0, 0)],  # Frame 2
            [(-10, 0), (10, 0), (-10, 0), (10, 0)]   # Frame 3
        ]
        
        base_legs = [
            (center_x-30, center_y+20, center_x-30, center_y+50),  # Front left
            (center_x-10, center_y+20, center_x-10, center_y+50),  # Front right
            (center_x+10, center_y+20, center_x+10, center_y+50),  # Back left
            (center_x+30, center_y+20, center_x+30, center_y+50)   # Back right
        ]
        
        phase = leg_phases[self.animation_frame]
        for i, ((x1, y1, x2, y2), (dx, dy)) in enumerate(zip(base_legs, phase)):
            self.viz_canvas.create_line(x1+dx, y1+dy, x2+dx, y2+dy, fill=self.FG_COLOR, width=3, tags="dog")
        
        # Direction indicator
        if forward:
            arrow = self.viz_canvas.create_line(center_x-50, center_y, center_x-30, center_y,
                                              arrow=tk.LAST, fill="#00a2ff", width=2, tags="dog")
        else:
            arrow = self.viz_canvas.create_line(center_x+50, center_y, center_x+30, center_y,
                                              arrow=tk.LAST, fill="#FF9900", width=2, tags="dog")

    def draw_turning_dog(self, center_x, center_y, left=True):
        """Draw dog in turning animation"""
        # Body
        body = self.viz_canvas.create_rectangle(center_x-40, center_y-20, center_x+40, center_y+20,
                                              fill="#00CC00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Head turned in direction
        if left:
            head = self.viz_canvas.create_oval(center_x-60, center_y-15, center_x-30, center_y+15,
                                             fill="#00AA00", outline=self.FG_COLOR, width=2, tags="dog")
        else:
            head = self.viz_canvas.create_oval(center_x+30, center_y-15, center_x+60, center_y+15,
                                             fill="#00AA00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Legs in turning position
        leg_positions = [
            (center_x-30, center_y+20, center_x-30, center_y+50),
            (center_x-10, center_y+20, center_x-10, center_y+50),
            (center_x+10, center_y+20, center_x+10, center_y+50),
            (center_x+30, center_y+20, center_x+30, center_y+50)
        ]
        
        for x1, y1, x2, y2 in leg_positions:
            self.viz_canvas.create_line(x1, y1, x2, y2, fill=self.FG_COLOR, width=3, tags="dog")
        
        # Turning arrow
        if left:
            self.viz_canvas.create_arc(center_x-30, center_y-40, center_x+30, center_y+40,
                                     start=180, extent=90, outline="#CC00FF", width=2, tags="dog")
        else:
            self.viz_canvas.create_arc(center_x-30, center_y-40, center_x+30, center_y+40,
                                     start=0, extent=90, outline="#CC00FF", width=2, tags="dog")

    def draw_sitting_dog(self, center_x, center_y):
        """Draw dog in sitting position"""
        # Body (lower position)
        body = self.viz_canvas.create_rectangle(center_x-40, center_y, center_x+40, center_y+40,
                                              fill="#00CC00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Head
        head = self.viz_canvas.create_oval(center_x+30, center_y+5, center_x+60, center_y+35,
                                         fill="#00AA00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Front legs (bent)
        self.viz_canvas.create_line(center_x-30, center_y+40, center_x-30, center_y+60, fill=self.FG_COLOR, width=3, tags="dog")
        self.viz_canvas.create_line(center_x-10, center_y+40, center_x-10, center_y+60, fill=self.FG_COLOR, width=3, tags="dog")

    def draw_lying_dog(self, center_x, center_y):
        """Draw dog in lying position"""
        # Body (flat)
        body = self.viz_canvas.create_rectangle(center_x-50, center_y+10, center_x+50, center_y+30,
                                              fill="#00CC00", outline=self.FG_COLOR, width=2, tags="dog")
        
        # Head
        head = self.viz_canvas.create_oval(center_x+40, center_y+5, center_x+60, center_y+25,
                                         fill="#00AA00", outline=self.FG_COLOR, width=2, tags="dog")

    def draw_error_state(self, center_x, center_y):
        """Draw error state visualization"""
        # Error symbol
        self.viz_canvas.create_text(center_x, center_y, text="⚠", font=("Arial", 48),
                                  fill="#FF0000", tags="dog")
        
        # Pulsing effect
        if self.animation_frame % 2 == 0:
            self.viz_canvas.create_oval(center_x-30, center_y-30, center_x+30, center_y+30,
                                      outline="#FF0000", width=2, tags="dog")
            

    # region Update GUI

    def update_dog_visualization(self):
        """Update the dog visualization based on current state"""
        state_texts = {
            "standing": "STANDBY MODE",
            "forward": "WALKING FORWARD",
            "backward": "WALKING BACKWARD", 
            "left": "TURNING LEFT",
            "right": "TURNING RIGHT",
            "sitting": "LOW PROFILE",
            "lying": "RECUMBENT MODE",
            "error": "SYSTEM ERROR"
        }
        
        state_colors = {
            "standing": "#00FF00",
            "forward": "#00CCFF",
            "backward": "#FF9900", 
            "left": "#CC00FF",
            "right": "#CC00FF",
            "sitting": "#FFFF00",
            "lying": "#888888",
            "error": "#FF0000"
        }
        
        text = state_texts.get(self.dog_state, "UNKNOWN MODE")
        color = state_colors.get(self.dog_state, "#00FF00")
        
        self.dog_state_label.configure(text=text, text_color=color)
        
        # Redraw the dog visualization
        self.draw_dog_visualization()

    def set_dog_state(self, state):
        """Set the dog's current state and update visualization"""
        if state in ["standing", "forward", "backward", 
                    "left", "right", "sitting", "lying", "error"]:
            self.dog_state = state
            self.update_dog_visualization()
    
    # Event handlers for robot dog
    def on_motor_slider_change(self, leg, motor, value):
        """Handle motor slider change (update display but don't send command)"""
        # Update the value display
        motor_key = f"{leg}_{motor}".lower().replace(" ", "_")
        value_var = getattr(self, f"{motor_key}_value", None)
        if value_var:
            value_var.set(f"{int(value)}°")
    
    def on_motor_send(self, leg, motor, value):
        """Handle motor send button press"""
        print(f"Sending {leg} {motor} motor to: {value}°")
        # Send command to Arduino to move specific motor
        motor_id = self.get_motor_id(leg, motor)
        command = f"s{motor_id} {int(value)}"
        self.send_robot_command(command)
    
    def on_motor_change(self, leg, motor, value):
        """Handle individual motor slider change (for direct control if needed)"""
        # This can be used if you want immediate sending on slider change
        print(f"{leg} {motor} motor changed to: {value}°")
        motor_id = self.get_motor_id(leg, motor)
        command = f"s{motor_id} {int(value)}"
        self.send_robot_command(command)
    
    def on_movement_button(self, direction):
        """Handle movement button press"""
        print(f"Movement button pressed: {direction}")
        speed = self.speed_slider.get()
        
        # Send appropriate movement command to Arduino
        commands = {
            "forward": f"a",
            "backward": f"d",
            "left": f"t",
            "right": f"y"
        }
        
        if direction in commands:
            self.send_robot_command(commands[direction])
            self.set_dog_state(direction)




    
    def on_speed_change(self, value):
        """Handle walking speed slider change"""
        print(f"Walking speed changed to: {value}%")
        # Speed change is applied when movement buttons are pressed
    
    def on_stand(self):
        """Handle stand button press"""
        print("Returning to standing position")
        self.send_robot_command("r")
        self.set_dog_state("standing")
        
        # Reset all motor sliders and value displays to standing position (90 degrees)
        legs = ["front_left", "front_right", "back_left", "back_right"]
        motors = ["shoulder", "knee"]
        
        for leg in legs:
            for motor in motors:
                slider = getattr(self, f"{leg}_{motor}_slider", None)
                value_var = getattr(self, f"{leg}_{motor}_value", None)
                
                if slider:
                    slider.set(90)
                if value_var:
                    value_var.set("90°")
    
    def on_elevation_change(self, change):
        """Handle elevation slider change"""
        elevation += (1 if change=='+' else -1)
        self.elevation = limit_interval(elevation,0,100)

        print(f"Body elevation changed to: {self.elevation}% ({change})")
        command = 'h' if change=='+' else 'l'
        self.send_robot_command(command)

        if int(self.elevation) < 20:
            self.set_dog_state("lying")
        elif int(self.elevation) < 50:
            self.set_dog_state("sitting")
        else:
            self.set_dog_state("standing")
    
    def get_motor_id(self, leg, motor):
        """Convert leg and motor names to motor IDs"""
        # Map leg and motor names to your Arduino motor IDs
        leg_map = {
            "front_left": 0, "front_right": 1,
            "back_left": 2, "back_right": 3
        }
        motor_map = {"shoulder": 0, "knee": 1}
        
        leg_num = leg_map.get(leg.lower().replace(" ", "_"), 0)
        motor_num = motor_map.get(motor.lower(), 0)
        
        return leg_num * 2 + motor_num  # Each leg has 2 motors
    
    def on_serial_connect(self):
        """Handle serial connect button press"""
        com_port = self.com_var.get()
        baud_rate = self.baud_var.get()
        print(f"Connecting to {com_port} at {baud_rate} baud")
        
        try:
            import Serial
            Serial.OPEN_SERIAL(PORT=com_port, BAUD=int(baud_rate))
            print("Serial connection established")
        except Exception as e:
            print(f"Serial connection error: {e}")
    
    def send_robot_command(self, command):
        """Send command to robot via serial"""
        try:
            import Serial
            send_success = Serial.SEND(command)
            print(f"Command sent: {command.strip()}, Success: {send_success}")
            return send_success
        except Exception as e:
            print(f"Error sending command: {e}")
            return False
    
    def on_camera_start(self):
        """Handle camera start button press"""
        print("Starting camera")
        self.Open_camera.set(True)

        if self.CameraFeed:
            self.CameraFeed.configure(text="")
        
        self.root.after(1000, self.camera_loop)
    
    def on_camera_stop(self):
        """Handle camera stop button press"""
        print("Stopping camera")
        self.Open_camera.set(False)
        
        # Show gray placeholder when camera is off
        if self.CameraFeed:
            gray_img = Image.new('RGB', (480, 360), color='#333333')
            img = CTkImage(light_image=gray_img, size=(480, 360))
            self.CameraFeed.image = img
            self.root.after(10, lambda img=img: self.CameraFeed.configure(image=img))
            
    
    def run(self):
        """Start the GUI main loop"""
        self.root.mainloop()



    # region Functionalities

    def setup_camera(self):
        """Camera setup - initialize with proper aspect ratio"""
        try:
            # Create camera feed label with proper aspect ratio
            self.CameraFeed = ctk.CTkLabel(self.feed_frame, text="")
            self.CameraFeed.pack(fill="both", expand=True, padx=10, pady=10)

            # Gray placeholder with correct aspect ratio
            gray_img = Image.new('RGB', (480, 360), color='#333333')  # 16:9 aspect ratio
            img = CTkImage(light_image=gray_img, size=(480, 360))
            self.CameraFeed.configure(image=img, text="Click Start to activate")
            self.CameraFeed.image = img
            
            # Camera control variables
            self.last_gesture = None
            self.gesture_start_time = None
            self.GESTURE_HOLD_TIME = 0.2
            self.STOP_start_time = None
            self.STOP_HOLD_TIME = 0.5
            self.Move = True
            self.sentstop, self.sentright, self.sentleft, self.sentback, self.sentforward = False, False, False, False, False

            # Initialize camera variables
            self.Open_camera = ctk.BooleanVar(value=False)
            
            print("Camera functionality initialized")
            return True
        except Exception as e:
            print(f"Camera error: {e}")
            return False
    
    def camera_loop(self):
        """Camera loop based on previous interface"""
        import Hand_Detection, Navigation
        def camera_thread():
            if not self.Open_camera.get():
                if hasattr(Camera, 'Opened') and Camera.Opened:
                    Camera.CloseCamera(Camera.camera)
                # Show gray placeholder when camera is off
                gray_img = Image.new('RGB', (480, 360), color='gray')
                img = CTkImage(light_image=gray_img, size=gray_img.size)
                self.CameraFeed.configure(image=img)
                self.CameraFeed.image = img
                self.root.after(10, self.camera_loop)
                return

            if not hasattr(Camera, 'Opened') or not Camera.Opened:
                print("Camera Not Opened. Retrying.")
                Camera.Opened, Camera.camera = Camera.OpenCamera(0)
                self.root.after(10, self.camera_loop)
                return

            success, frame = Camera.GetFrame(Camera.camera, RGB=True)
            if not success:
                print("Failed Capturing Video Frame. Retrying.")
                self.root.after(10, self.camera_loop)
                return
            
            frame_height, frame_width, _ = frame.shape

            # Hand Detection (from previous interface)
            detected_gesture = Hand_Detection.detect_gesture(frame)
            current_time = time.time()
            if detected_gesture:
                if detected_gesture == self.last_gesture:
                    if (current_time - self.gesture_start_time) > self.GESTURE_HOLD_TIME:
                        pass
                else:
                    self.last_gesture = detected_gesture
                    self.gesture_start_time = current_time
            else:
                self.last_gesture = None
                self.gesture_start_time = None

            if self.last_gesture == "Open":
                self.STOP_start_time = time.time()
                self.Move = False
            elif self.Move == False and time.time() - self.STOP_start_time > self.STOP_HOLD_TIME:
                self.STOP_start_time = None
                self.Move = True
            
            if self.Move == False:
                frame = Navigation.Stop(frame, frame_width, frame_height)
                if not self.sentstop:
                    # Send stop command to robot
                    self.on_stand()
                    self.sentstop = True
                    self.sentright, self.sentleft, self.sentback, self.sentforward = False, False, False, False
            
            if self.Move:
                if self.last_gesture in ["Left", "Right"]:
                    frame = Navigation.rotate_camera(frame, frame_width, frame_height, f"{self.last_gesture}")
                    if self.last_gesture == "Left" and not self.sentleft:
                        # Send left command to robot
                        self.on_movement_button('left')
                        self.sentleft = True
                        self.sentright, self.sentstop, self.sentback, self.sentforward = False, False, False, False
                    if self.last_gesture == "Right" and not self.sentright:
                        # Send right command to robot
                        self.on_movement_button('right')
                        self.sentright = True
                        self.sentleft, self.sentstop, self.sentback, self.sentforward = False, False, False, False
                elif self.last_gesture == "Closed":
                    frame = Navigation.Move(frame, frame_width, frame_height, "Backward")
                    if not self.sentback:
                        # Send backward command to robot
                        self.on_movement_button('backward')
                        self.sentback = True
                        self.sentleft, self.sentstop, self.sentright, self.sentforward = False, False, False, False
                elif self.last_gesture == "Peace":
                    frame = Navigation.Move(frame, frame_width, frame_height, "Forward")
                    if not self.sentforward:
                        # Send forward command to robot
                        self.on_movement_button('forward')
                        self.sentforward = True
                        self.sentleft, self.sentstop, self.sentright, self.sentback = False, False, False, False

            # Convert frame to image and update label
            pil_image = Image.fromarray(frame).resize((480, 360), Image.Resampling.LANCZOS)
            self.current_frame_image = CTkImage(light_image=pil_image, size=pil_image.size)

            if self.CameraFeed and self.Open_camera.get():
                self.CameraFeed.configure(image=self.current_frame_image, text="")
                self.CameraFeed.image = self.current_frame_image

            if self.Open_camera.get():
                self.root.after(10, self.camera_loop)

        if self.Open_camera.get():
            threading.Thread(target=camera_thread, daemon=True).start()

    def setup_serial_communication(self):
        """Serial communication setup"""
        try:
            # Initialize serial communication
            Serial.TEST_MODE = False
            
            # Define available COM ports
            self.defineCOMLIST()
            print("COM LIST:", self.COMLIST)
            
            # Set COM and BAUD
            COM, BAUD = self.getCOMBAUD()
            COM = f"COM{COM}"
            
            # Open serial connection
            Serial.OPEN_SERIAL(PORT=COM, BAUD=BAUD)
            
            # Set up serial data reading
            def read_serial():
                def read_serial_thread():
                    Data = Serial.READ()
                    if len(Data) > 0 and len(Data[0]) > 0:
                        raw_lines = ""
                        for Line in Data: 
                            raw_lines += Line + '\n'
                        print(f"Serial data: {raw_lines}")
                    self.root.after(5000, read_serial)
                threading.Thread(target=read_serial_thread, daemon=True).start()
            
            # Start reading serial data
            self.root.after(5000, read_serial)
            
            print(f"Serial communication initialized on {COM} at {BAUD} baud")
            return True
        except Exception as e:
            print(f"Serial communication error: {e}")
            return False

    def send_robot_command(self, command):
        """Send command to robot via serial"""
        try:
            send_success = Serial.SEND(command)
            print(f"Command sent: {command}, Success: {send_success}")
            return send_success
        except Exception as e:
            print(f"Error sending command: {e}")
            return False

    def setup_voice_control(self):
        """Voice control setup based on previous interface"""
        try:
            from vosk import Model, KaldiRecognizer
            import pyaudio
            import json
            
            VOICE_MODEL_PATH = "path/to/vosk-model"  # Update this path
            
            if not os.path.exists(VOICE_MODEL_PATH):
                print(f"Vosk model not found at: {VOICE_MODEL_PATH}")
                return False
            
            # Initialize voice recognition
            model = Model(VOICE_MODEL_PATH)
            recognizer = KaldiRecognizer(model, 16000)
            recognizer.SetWords(True)
            
            # Initialize audio input
            mic = pyaudio.PyAudio()
            stream = mic.open(
                rate=16000,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=2048,
                input_device_index=None
            )
            
            self.voice_recognizer = recognizer
            self.voice_stream = stream
            self.voice_mic = mic
            self.SPEECH_ON = False
            
            print("Voice control initialized")
            return True
        except Exception as e:
            print(f"Voice control error: {e}")
            return False

    def toggle_speech(self):
        """Toggle speech recognition on/off"""
        if not hasattr(self, 'SPEECH_ON'):
            return
        
        self.SPEECH_ON = not self.SPEECH_ON
        if self.SPEECH_ON:
            print("START speech to text")
            self.vosk_speech_to_text()
        else:
            print("STOP speech to text")

    def vosk_speech_to_text(self):
        """Speech to text processing"""
        def speech_to_text_stream():
            if not hasattr(self, 'voice_stream') or self.voice_stream is None:
                return
            
            try:
                data = self.voice_stream.read(4096, exception_on_overflow=False)
                
                if self.voice_recognizer.AcceptWaveform(data):
                    result = json.loads(self.voice_recognizer.Result())
                    text = result.get('text', '').strip()
                    
                    if text:
                        print(f"Voice command: {text}")
                        self.process_voice_command(text)
                
                # Partial results for real-time feedback
                partial = json.loads(self.voice_recognizer.PartialResult())
                if 'partial' in partial:
                    partial_text = partial['partial']
                    if partial_text:
                        print(f"Listening: {partial_text}")
            except Exception as e:
                print(f"Error processing audio: {e}")
            
            if self.SPEECH_ON:
                self.root.after(10, self.vosk_speech_to_text)
        
        threading.Thread(target=speech_to_text_stream, daemon=True).start()

    def process_voice_command(self, text):
        """Process voice commands"""
        text_lower = text.lower()
        print(f"Processing voice command: {text_lower}")
        
        # Voice command logic from previous interface
        if any(greet in text_lower for greet in ["hello", "hi", "hey"]):
            print("Response: Hello there!")
        elif "stop" in text_lower: 
            print("Response: STOP")
            self.send_robot_command("MvtControl H 0 0 0\n")
        elif "forward" in text_lower: 
            print("Response: Forward")
            self.send_robot_command("MvtControl H 0 10 0\n")  # Example speed
        elif "backward" in text_lower: 
            print("Response: Backward")
            self.send_robot_command("MvtControl H 0 -10 0\n")  # Example speed
        elif "left" in text_lower: 
            print("Response: Left")
            self.send_robot_command("MvtControl H -10 0 0\n")  # Example speed
        elif "right" in text_lower: 
            print("Response: Right")
            self.send_robot_command("MvtControl H 10 0 0\n")  # Example speed
        elif "rotate" in text_lower: 
            print("Response: Rotate")
            self.send_robot_command("MvtControl H 0 0 1\n")  # Example rotation speed

    def voice_cleanup(self):
        """Clean up voice recognition resources"""
        if hasattr(self, 'voice_stream') and self.voice_stream is not None:
            self.voice_stream.stop_stream()
            self.voice_stream.close()
        if hasattr(self, 'voice_mic') and self.voice_mic is not None:
            self.voice_mic.terminate()

    def setup_keyboard_controls(self):
        """Setup keyboard controls for the robot"""
        def on_key_press(event):
            key = event.keysym.lower()
            if key == "up":
                self.on_movement_button("forward")
            elif key == "down":
                self.on_movement_button("backward")
            elif key == "left":
                self.on_movement_button("left")
            elif key == "right":
                self.on_movement_button("right")
            elif key == "space":
                self.on_stand()
            elif key == "plus" or key == "equal":
                self.on_elevation_change('+')
            elif key == "minus":
                self.on_elevation_change('-')
            elif key == "escape":
                self.set_dog_state("error")
        
        self.root.bind("<KeyPress>", on_key_press)
        print("Keyboard controls initialized")




def limit_interval(value, min, max):
    return max(0, min(value, 100))




#region Main
if __name__ == "__main__":
    # Create and run the GUI
    gui = RobotGUI("My Robot Control Interface")
    
    # Initialize optional components
    # gui.setup_voice_control()
    gui.setup_keyboard_controls()
    
    print("Robot interface ready!")
    
    gui.run()
    
    # Clean up resources when GUI closes
    if hasattr(gui, 'SPEECH_ON') and gui.SPEECH_ON:
        gui.voice_cleanup()