"""
MindEase Backend Server
Flask API that proxies requests to Google Gemini with the mental wellness system prompt.
"""

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# ===== System Prompt (Master Prompt) =====
SYSTEM_PROMPT = """You are a supportive AI Mental Wellness Check-In Assistant designed for daily emotional reflection and general well-being support.

Your purpose is to provide empathetic, positive, and non-medical responses that help users feel heard, understood, and gently supported.

IMPORTANT GUIDELINES:

- You are NOT a therapist, psychologist, or medical professional.
- Do NOT diagnose any mental health condition.
- Do NOT provide medical advice or treatment suggestions.
- Do NOT label the user with disorders.
- Focus only on emotional awareness and general well-being.
- Keep responses warm, calm, and supportive.
- Keep responses between 150–220 words.
- Avoid emojis.
- Avoid overly technical or clinical language.

RESPONSE STRUCTURE (follow naturally without headings):

1. Begin by acknowledging and validating the user's emotions.
2. Briefly reflect back what they shared in a thoughtful way.
3. Offer 1–3 simple, practical, everyday coping suggestions (e.g., deep breathing, short walk, journaling, hydration, stretching, mindful pause, gratitude reflection).
4. End with an encouraging and hopeful closing statement.

SAFETY RULE:

If the user expresses self-harm thoughts, suicide ideation, extreme hopelessness, or crisis-related language:
- Respond with deep empathy.
- Gently encourage them to seek support from a trusted person or qualified professional.
- Suggest contacting local emergency services or a mental health helpline.
- Do NOT provide instructions or analysis.
- Do NOT minimize their feelings.

Always prioritize emotional safety, kindness, and encouragement."""

# ===== Configure Gemini =====
api_key = os.getenv("GEMINI_API_KEY")
model = None

if api_key and api_key != "your_gemini_api_key_here":
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT,
        generation_config={
            "temperature": 0.8,
            "top_p": 0.9,
            "top_k": 40,
            "max_output_tokens": 500,
        },
        safety_settings=[
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ],
    )


# ===== API Routes =====

@app.route("/")
def index():
    """Serve the frontend."""
    return send_from_directory(".", "index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Chat endpoint. Receives conversation history and returns AI response.

    Request body:
    {
        "history": [
            {"role": "user", "text": "..."},
            {"role": "bot", "text": "..."}
        ]
    }
    """
    global model, api_key

    # Check if API key is configured
    if not model:
        return jsonify({
            "error": True,
            "text": "The server's API key is not configured. Please set GEMINI_API_KEY in the .env file.",
            "isCrisis": False,
        }), 500

    data = request.get_json()
    if not data or "history" not in data:
        return jsonify({
            "error": True,
            "text": "Invalid request. Please send a message.",
            "isCrisis": False,
        }), 400

    history = data["history"]
    if not history:
        return jsonify({
            "error": True,
            "text": "No messages to process.",
            "isCrisis": False,
        }), 400

    try:
        # Build Gemini conversation history
        gemini_history = []
        for msg in history[:-1]:  # All messages except the last one
            gemini_history.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [msg["text"]],
            })

        # Start chat with history
        chat_session = model.start_chat(history=gemini_history)

        # Send the latest message
        last_message = history[-1]["text"]
        response = chat_session.send_message(last_message)

        # Check if response was blocked
        if not response.text:
            return jsonify({
                "error": False,
                "text": (
                    "I hear you, and I want you to know that what you are feeling matters deeply. "
                    "If you are going through a very difficult time, please know that support is available. "
                    "You can reach the National Suicide Prevention Lifeline at 988 (call or text), "
                    "or text HOME to 741741 for the Crisis Text Line. "
                    "You are not alone, and reaching out for help is a sign of strength."
                ),
                "isCrisis": True,
            })

        return jsonify({
            "error": False,
            "text": response.text,
            "isCrisis": False,
        })

    except Exception as e:
        error_msg = str(e).lower()

        if "429" in str(e) or "resource exhausted" in error_msg:
            return jsonify({
                "error": True,
                "text": "The AI is receiving too many requests right now. Please wait a moment and try again.",
                "isCrisis": False,
            }), 429

        if "api key" in error_msg or "invalid" in error_msg:
            return jsonify({
                "error": True,
                "text": "There is an issue with the server's API key. Please check the configuration.",
                "isCrisis": False,
            }), 401

        print(f"[MindEase Error] {e}")
        return jsonify({
            "error": True,
            "text": "I encountered an unexpected issue. Please try again in a moment.",
            "isCrisis": False,
        }), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "model": "gemini-2.5-flash",
        "api_key_configured": model is not None,
    })


if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  MindEase AI Wellness Server")
    print("=" * 50)

    if not model:
        print("\n  [WARNING] GEMINI_API_KEY not set in .env file!")
        print("  Get a free key: https://aistudio.google.com/apikey")
        print("  Then add it to the .env file.\n")
    else:
        print("\n  Gemini API key loaded successfully.")

    print("  Server running at: http://localhost:5000")
    print("  Press Ctrl+C to stop.\n")

    app.run(host="0.0.0.0", port=5000, debug=True)
