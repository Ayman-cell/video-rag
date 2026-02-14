$readmeContent = @"
# 🎬 Video RAG with Gemini

An intelligent video understanding application that leverages Google's Gemini API to analyze and answer questions about video content. This tool uses Retrieval-Augmented Generation (RAG) principles to provide context-aware responses about video content.

## ✨ Features

- **🎥 Video Analysis**: Upload and process videos using Google's state-of-the-art Gemini AI
- **💬 Interactive Chat**: Ask natural language questions about video content
- **🔄 RAG Technology**: Retrieve and analyze relevant video segments for accurate responses
- **🎨 User-Friendly Interface**: Built with Streamlit for simple and intuitive interaction
- **🔐 Secure API Integration**: Support for environment variables to keep your API key safe
- **📊 Multi-Format Support**: Supports MP4, AVI, MOV, MKV, and WEBM formats

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Google Gemini API Key ([Get it here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
``bash
git clone https://github.com/Ayman-cell/video-rag.git
cd video-rag
``

2. **Install dependencies**
``bash
pip install -r requirements.txt
``

3. **Test your setup**
``bash
python test_setup.py
``

### Configuration

**Option A: Environment Variables (Recommended)**
``bash
cp .env.example .env
``

**Option B: Direct Input**
- Run the app and enter your API key in the Streamlit sidebar

### Running the Application

**Web Interface:**
``bash
streamlit run app.py
``

**Command-Line Demo:**
``bash
python demo.py
``

## 📖 Usage Guide

### Web Application

1. **Enter API Key** - Provide your Gemini API key in the sidebar
2. **Upload Video** - Select a video file (up to ~100MB)
3. **Wait for Processing** - The AI will analyze your video
4. **Ask Questions** - Type questions about the video content
5. **Get Insights** - Receive detailed AI-generated responses

## 📁 Project Structure

``
video-rag/
├── app.py                 # Main Streamlit web application
├── demo.py               # Command-line demonstration
├── requirements.txt      # Python dependencies
├── env.example          # Environment variables template
├── test_setup.py        # Setup verification script
├── USAGE.md             # Detailed usage guide
└── README.md            # This file
``

## 🔧 Requirements

- streamlit>=1.28.0
- google-generativeai>=0.8.0
- python-dotenv>=1.0.0
- pillow>=10.0.0

## 🎯 Tips for Best Results

- Use clear, well-lit videos
- Be specific in your questions
- Keep videos under 100MB when possible
- Use common formats (MP4 is most reliable)

## 🔐 Security Considerations

- Never commit your API key to version control
- Always use .env files for sensitive information
- Videos are processed by Google's servers

## 🐛 Troubleshooting

See [USAGE.md](USAGE.md) for detailed troubleshooting guide.

## 💡 Key Features

- **VideoProcessor Class**: Handles video upload and processing
- **Chat Interface**: Manages conversational interactions
- **RAG Technology**: Context-aware video analysis

## 📊 API Limits

- Free Tier: Limited requests per minute/day
- Max File Size: ~100MB per video
- Processing Time: Varies based on video length

## 🤝 Contributing

Feel free to fork and improve this project!

## 🔗 Resources

- [Google AI Studio](https://aistudio.google.com)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Streamlit Documentation](https://docs.streamlit.io)

---

**Made with ❤️ for video AI enthusiasts**

*Happy video chatting! 🎬✨*
"@; $readmeContent | Out-File -FilePath "video-rag-README.md" -Encoding UTF8
