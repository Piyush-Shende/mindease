// ===== MindEase Frontend API Client =====
// Calls the Python backend which handles Gemini AI integration.

// ===== Affirmations (used in sidebar) =====
const AFFIRMATIONS = [
    "You are worthy of rest and peace, just as you are.",
    "It takes courage to show up each day, and you are doing it.",
    "You do not have to have it all figured out to move forward.",
    "Your feelings are valid, and they do not define your worth.",
    "Small steps still carry you forward.",
    "You have survived every difficult day so far, and that is strength.",
    "Being kind to yourself is not selfish. It is necessary.",
    "You are allowed to take things one moment at a time.",
    "Progress is not always visible, but it is always happening.",
    "You deserve the same compassion you offer to others.",
    "Today is a fresh page, and you get to choose how to fill it.",
    "You are more resilient than you realize.",
    "It is okay to not be okay. What matters is that you keep going.",
    "Your presence in this world matters more than you know.",
    "Healing is not linear, and every step counts."
];

// ===== Mood labels for mood button clicks =====
const MOOD_LABELS = {
    great: "I'm feeling great today!",
    good: "I'm feeling good.",
    okay: "I'm feeling okay.",
    low: "I'm feeling a bit low.",
    struggling: "I'm really struggling right now."
};

// ===== Backend API Client =====
const MindEaseAPI = {
    baseUrl: "",  // Same origin — Flask serves both frontend and API

    /**
     * Sends conversation history to the backend and gets AI response.
     * @param {Array} conversationHistory - Array of {role: "user"|"bot", text: string}
     * @returns {Promise<{text: string, isCrisis: boolean, isError: boolean}>}
     */
    sendMessage: async function (conversationHistory) {
        try {
            var response = await fetch(this.baseUrl + "/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ history: conversationHistory })
            });

            var data = await response.json();

            return {
                text: data.text,
                isCrisis: data.isCrisis || false,
                isError: data.error || false
            };

        } catch (error) {
            console.error("Backend API error:", error);

            if (error.name === "TypeError" && error.message.includes("fetch")) {
                return {
                    text: "Cannot connect to the server. Please make sure the backend is running (python server.py).",
                    isCrisis: false,
                    isError: true
                };
            }

            return {
                text: "I encountered an unexpected issue. Please try again in a moment.",
                isCrisis: false,
                isError: true
            };
        }
    }
};
