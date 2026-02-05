import tkinter as tk
import customtkinter as ctk
import random
import time

class MatrixEffectTest:
    def __init__(self):
        # Create test window
        self.root = ctk.CTk()
        self.root.title("Matrix Effect Test")
        self.root.geometry("1600x1000")
        self.root.configure(bg="#000000")
        
        # Create matrix canvas FIRST (exact same as main interface)
        self.matrix_canvas = tk.Canvas(self.root, bg="black", highlightthickness=0)
        self.matrix_canvas.place(x=0, y=0, relwidth=1, relheight=1)
        
        # Matrix rain characters (same as main interface)
        self.matrix_chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"
        
        # Create rain columns (same as main interface)
        self.rain_columns = []
        for i in range(0, self.root.winfo_width(), 15):
            column = {
                'x': i,
                'drops': [],
                'speed': random.randint(5, 20),
                'length': random.randint(5, 30)
            }
            self.rain_columns.append(column)
        
        # Start animation
        self.root.after(100, self.animate_matrix)
        
        # Now create the main frame and panels (simplified versions)
        self.create_test_interface()
        
    def create_test_interface(self):
        """Create simplified version of the main interface"""
        # Main frame (same as main interface)
        self.main_frame = ctk.CTkFrame(self.root, fg_color="transparent", corner_radius=0)
        self.main_frame.pack(fill="both", expand=True, padx=2, pady=2)
        
        # Create test panels that match your main interface layout
        self.create_test_panel("MOTOR CONTROL", 20, 80, 420, 500, "#0A0A0A")
        self.create_test_panel("MOVEMENT", 450, 80, 250, 200, "#0A0A0A")
        self.create_test_panel("POSTURE", 450, 300, 250, 200, "#0A0A0A")
        self.create_test_panel("ROBOT STATE", 710, 80, 300, 300, "#0A0A0A")
        self.create_test_panel("CONNECTION", 710, 400, 250, 200, "#0A0A0A")
        self.create_test_panel("CAMERA", 1020, 80, 400, 500, "#0A0A0A")
        
        # Add header (simplified)
        header = ctk.CTkFrame(self.main_frame, fg_color="#0A0A0A", height=60, corner_radius=0)
        header.pack(fill="x", pady=(0, 10))
        header.pack_propagate(False)
        
        title = ctk.CTkLabel(header, text="◈ CYBER-HOUND CONTROL SYSTEM ◈",
                           font=("Courier New", 24, "bold"), text_color="#00FF00")
        title.pack(side="left", padx=20, pady=10)
        
        # Add quit button
        quit_btn = ctk.CTkButton(self.main_frame, text="QUIT TEST", command=self.root.quit,
                               fg_color="red", hover_color="darkred", text_color="white")
        quit_btn.place(relx=0.5, rely=0.95, anchor="center")
        
    def create_test_panel(self, title, x, y, width, height, color):
        """Create a test panel matching your interface style"""
        panel = ctk.CTkFrame(self.main_frame, width=width, height=height, 
                           fg_color=color, corner_radius=10)
        panel.place(x=x, y=y)
        panel.pack_propagate(False)
        
        # Panel title
        title_label = ctk.CTkLabel(panel, text=f"≣ {title} ≣",
                                 font=("Courier New", 16, "bold"), text_color="#00FF00")
        title_label.pack(pady=10)
        
        # Some content to simulate your interface
        content = ctk.CTkLabel(panel, text="Test Content\nWould be here",
                             font=("Courier New", 12), text_color="#00FF00")
        content.pack(expand=True)
        
    def animate_matrix(self):
        """Animate the Matrix rain effect (same as main interface)"""
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
            print(f"Animation error: {e}")
            self.root.quit()

    def run(self):
        """Run the test"""
        self.root.mainloop()

# Run the test
if __name__ == "__main__":
    print("Testing Matrix effect with interface layout...")
    print("You should see green Matrix characters falling behind semi-transparent panels")
    test = MatrixEffectTest()
    test.run()
    print("Test completed.")