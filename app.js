// ===== MindEase - Main Application (Backend-Powered) =====

(function () {
    "use strict";

    // DOM Elements
    const chatMessages = document.getElementById("chatMessages");
    const userInput = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearChat = document.getElementById("clearChat");
    const trackerGrid = document.getElementById("trackerGrid");
    const affirmationText = document.getElementById("affirmationText");
    const breathingBtn = document.getElementById("breathingBtn");
    const breathingCircle = document.getElementById("breathingCircle");
    const breathingText = document.getElementById("breathingText");
    const stressSlider = document.getElementById("stressSlider");
    const stressValue = document.getElementById("stressValue");
    const stressShareBtn = document.getElementById("stressShareBtn");
    const journalList = document.getElementById("journalList");
    const aboutBtn = document.getElementById("aboutBtn");
    const aboutModal = document.getElementById("aboutModal");
    const aboutCloseBtn = document.getElementById("aboutCloseBtn");

    const moodBtns = document.querySelectorAll(".mood-btn");
    const promptBtns = document.querySelectorAll(".prompt-btn");

    // State
    let conversationHistory = [];
    let breathingActive = false;
    let breathingTimer = null;
    let welcomeVisible = true;
    let isSending = false;
    let currentMood = null;
    let currentStress = 5;

    // ===== Initialization =====
    function init() {
        loadAffirmation();
        loadMoodTracker();
        loadJournal();
        setupEventListeners();
        autoResizeTextarea();
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        sendBtn.addEventListener("click", handleSend);

        userInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        userInput.addEventListener("input", autoResizeTextarea);

        clearChat.addEventListener("click", clearConversation);

        moodBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                handleMoodSelect(this.dataset.mood);
            });
        });

        promptBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                userInput.value = this.dataset.prompt;
                autoResizeTextarea();
                handleSend();
            });
        });

        breathingBtn.addEventListener("click", toggleBreathing);

        // Stress slider
        stressSlider.addEventListener("input", function () {
            currentStress = parseInt(this.value);
            stressValue.textContent = currentStress;
            // Color the value indicator based on stress level
            if (currentStress <= 3) {
                stressValue.style.color = "var(--accent)";
                stressValue.style.background = "var(--accent-light)";
            } else if (currentStress <= 6) {
                stressValue.style.color = "#b09060";
                stressValue.style.background = "#f5efe5";
            } else {
                stressValue.style.color = "var(--danger)";
                stressValue.style.background = "var(--warning-bg)";
            }
        });

        stressShareBtn.addEventListener("click", handleStressShare);

        // About modal
        aboutBtn.addEventListener("click", function () {
            aboutModal.classList.remove("hidden");
        });

        aboutCloseBtn.addEventListener("click", function () {
            aboutModal.classList.add("hidden");
        });

        aboutModal.addEventListener("click", function (e) {
            if (e.target === aboutModal) aboutModal.classList.add("hidden");
        });
    }

    // ===== Auto-resize Textarea =====
    function autoResizeTextarea() {
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
    }

    // ===== Handle Send Message =====
    async function handleSend() {
        var text = userInput.value.trim();
        if (!text || isSending) return;

        isSending = true;
        sendBtn.disabled = true;

        if (welcomeVisible) {
            removeWelcome();
        }

        addMessage(text, "user");
        userInput.value = "";
        autoResizeTextarea();

        conversationHistory.push({ role: "user", text: text });

        showTypingIndicator();

        // Call backend API
        var response = await MindEaseAPI.sendMessage(conversationHistory);

        removeTypingIndicator();
        addMessage(response.text, "bot", response.isCrisis, response.isError);

        // Only add to history if it's not an error
        if (!response.isError) {
            conversationHistory.push({ role: "bot", text: response.text });
        }

        isSending = false;
        sendBtn.disabled = false;
        userInput.focus();
    }

    // ===== Remove Welcome Screen =====
    function removeWelcome() {
        var welcome = chatMessages.querySelector(".welcome-message");
        if (welcome) {
            welcome.style.animation = "fadeOut 0.3s ease forwards";
            setTimeout(function () {
                if (welcome.parentNode) welcome.parentNode.removeChild(welcome);
            }, 300);
        }
        welcomeVisible = false;
    }

    // ===== Add Message to Chat =====
    function addMessage(text, sender, isCrisis, isError) {
        var messageDiv = document.createElement("div");
        var extraClass = isCrisis ? " crisis" : (isError ? " error" : "");
        messageDiv.className = "message " + sender + extraClass;

        var avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = sender === "bot" ? "M" : "Y";

        var contentWrapper = document.createElement("div");

        var content = document.createElement("div");
        content.className = "message-content";
        content.textContent = text;

        var time = document.createElement("div");
        time.className = "message-time";
        time.textContent = formatTime();

        contentWrapper.appendChild(content);
        contentWrapper.appendChild(time);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentWrapper);

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // ===== Format Time =====
    function formatTime() {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        return hours + ":" + minutes + " " + ampm;
    }

    // ===== Typing Indicator =====
    function showTypingIndicator() {
        var typingDiv = document.createElement("div");
        typingDiv.className = "message bot";
        typingDiv.id = "typingIndicator";

        var avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = "M";

        var indicator = document.createElement("div");
        indicator.className = "typing-indicator";
        indicator.innerHTML = "<span></span><span></span><span></span>";

        typingDiv.appendChild(avatar);
        typingDiv.appendChild(indicator);
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        var indicator = document.getElementById("typingIndicator");
        if (indicator) indicator.parentNode.removeChild(indicator);
    }

    // ===== Scroll to Bottom =====
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ===== Mood Selection =====
    async function handleMoodSelect(mood) {
        if (isSending) return;

        // Update UI
        moodBtns.forEach(function (btn) { btn.classList.remove("active"); });
        var activeBtn = document.querySelector('[data-mood="' + mood + '"]');
        if (activeBtn) activeBtn.classList.add("active");

        // Save to tracker
        currentMood = mood;
        saveMoodToTracker(mood);

        // Send mood message
        if (welcomeVisible) removeWelcome();

        var moodText = MOOD_LABELS[mood];
        addMessage(moodText, "user");
        conversationHistory.push({ role: "user", text: moodText });

        isSending = true;
        sendBtn.disabled = true;
        showTypingIndicator();

        // Call backend API
        var response = await MindEaseAPI.sendMessage(conversationHistory);

        removeTypingIndicator();
        addMessage(response.text, "bot", response.isCrisis, response.isError);

        if (!response.isError) {
            conversationHistory.push({ role: "bot", text: response.text });
        }

        // Save journal entry
        saveJournalEntry(moodText);

        isSending = false;
        sendBtn.disabled = false;
    }

    // ===== Mood Tracker =====
    function loadMoodTracker() {
        var days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        var savedMoods = JSON.parse(localStorage.getItem("mindease_moods") || "{}");
        var today = new Date();
        var dayOfWeek = today.getDay();
        var mondayOffset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

        trackerGrid.innerHTML = "";

        for (var i = 0; i < 7; i++) {
            var dayDiv = document.createElement("div");
            dayDiv.className = "tracker-day";
            dayDiv.textContent = days[i];

            var dateKey = getDateKey(today, i - mondayOffset);
            if (savedMoods[dateKey]) {
                dayDiv.classList.add("filled", savedMoods[dateKey]);
                dayDiv.title = savedMoods[dateKey];
            }

            trackerGrid.appendChild(dayDiv);
        }
    }

    function saveMoodToTracker(mood) {
        var savedMoods = JSON.parse(localStorage.getItem("mindease_moods") || "{}");
        var todayKey = getDateKey(new Date(), 0);
        savedMoods[todayKey] = mood;
        localStorage.setItem("mindease_moods", JSON.stringify(savedMoods));
        loadMoodTracker();
    }

    function getDateKey(baseDate, offset) {
        var date = new Date(baseDate);
        date.setDate(date.getDate() + offset);
        return date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");
    }

    // ===== Daily Affirmation =====
    function loadAffirmation() {
        var today = new Date();
        var seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        var index = seed % AFFIRMATIONS.length;
        affirmationText.textContent = '"' + AFFIRMATIONS[index] + '"';
    }

    // ===== Breathing Exercise =====
    function toggleBreathing() {
        if (breathingActive) {
            stopBreathing();
        } else {
            startBreathing();
        }
    }

    function startBreathing() {
        breathingActive = true;
        breathingBtn.textContent = "Stop";
        breathingCircle.classList.add("active");
        runBreathingCycle();
    }

    function stopBreathing() {
        breathingActive = false;
        breathingBtn.textContent = "Start Breathing";
        breathingCircle.classList.remove("active", "inhale", "exhale");
        breathingText.textContent = "Ready";
        if (breathingTimer) clearTimeout(breathingTimer);
    }

    function runBreathingCycle() {
        if (!breathingActive) return;

        breathingCircle.classList.remove("exhale");
        breathingCircle.classList.add("inhale");
        breathingText.textContent = "Breathe In";

        breathingTimer = setTimeout(function () {
            if (!breathingActive) return;
            breathingText.textContent = "Hold";

            breathingTimer = setTimeout(function () {
                if (!breathingActive) return;
                breathingCircle.classList.remove("inhale");
                breathingCircle.classList.add("exhale");
                breathingText.textContent = "Breathe Out";

                breathingTimer = setTimeout(function () {
                    if (!breathingActive) return;
                    breathingText.textContent = "Pause";
                    breathingTimer = setTimeout(function () {
                        runBreathingCycle();
                    }, 1000);
                }, 6000);
            }, 4000);
        }, 4000);
    }

    // ===== Stress Level Share =====
    async function handleStressShare() {
        if (isSending) return;

        var stressText = "My current stress level is " + currentStress + " out of 10.";
        if (currentStress <= 3) {
            stressText += " I'm feeling relatively calm.";
        } else if (currentStress <= 6) {
            stressText += " I'm feeling moderately stressed.";
        } else {
            stressText += " I'm feeling very stressed and could use some help.";
        }

        if (welcomeVisible) removeWelcome();

        addMessage(stressText, "user");
        conversationHistory.push({ role: "user", text: stressText });

        isSending = true;
        sendBtn.disabled = true;
        showTypingIndicator();

        var response = await MindEaseAPI.sendMessage(conversationHistory);

        removeTypingIndicator();
        addMessage(response.text, "bot", response.isCrisis, response.isError);

        if (!response.isError) {
            conversationHistory.push({ role: "bot", text: response.text });
        }

        // Save journal entry
        saveJournalEntry(stressText);

        isSending = false;
        sendBtn.disabled = false;
    }

    // ===== Journal =====
    function saveJournalEntry(text) {
        var entries = JSON.parse(localStorage.getItem("mindease_journal") || "[]");
        entries.unshift({
            date: new Date().toISOString(),
            mood: currentMood || "none",
            stress: currentStress,
            text: text
        });
        // Keep last 20 entries
        if (entries.length > 20) entries = entries.slice(0, 20);
        localStorage.setItem("mindease_journal", JSON.stringify(entries));
        loadJournal();
    }

    function loadJournal() {
        var entries = JSON.parse(localStorage.getItem("mindease_journal") || "[]");

        if (entries.length === 0) {
            journalList.innerHTML = '<p class="journal-empty">Your journal entries will appear here.</p>';
            return;
        }

        journalList.innerHTML = "";
        // Show last 10
        var showing = entries.slice(0, 10);
        for (var i = 0; i < showing.length; i++) {
            var entry = showing[i];
            var entryDate = new Date(entry.date);
            var dateStr = entryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                " " + entryDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

            var div = document.createElement("div");
            div.className = "journal-entry";

            var headerHTML = '<div class="journal-entry-header">' +
                '<span class="journal-entry-date">' + dateStr + '</span>';
            if (entry.mood && entry.mood !== "none") {
                headerHTML += '<span class="journal-entry-mood ' + entry.mood + '">' + entry.mood + '</span>';
            }
            headerHTML += '</div>';

            div.innerHTML = headerHTML +
                '<div class="journal-entry-text">' + escapeHtml(entry.text) + '</div>' +
                '<div class="journal-entry-stress">Stress: ' + entry.stress + '/10</div>';

            journalList.appendChild(div);
        }
    }

    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== Clear Conversation =====
    function clearConversation() {
        conversationHistory = [];
        welcomeVisible = true;

        chatMessages.innerHTML = "";

        var welcomeHTML = '<div class="welcome-message">' +
            '<h2>Welcome to MindEase</h2>' +
            '<p>I\'m an AI-powered wellness companion here to listen and support you through your day. This is a safe, judgment-free space where you can share how you\'re feeling.</p>' +
            '<p>You can start by selecting a mood on the left, or simply tell me what\'s on your mind.</p>' +
            '<div class="quick-prompts">' +
            '<button class="prompt-btn" data-prompt="I\'ve been feeling stressed lately and could use some support.">I\'m feeling stressed</button>' +
            '<button class="prompt-btn" data-prompt="I\'m feeling anxious about things and my mind won\'t stop racing.">I feel anxious</button>' +
            '<button class="prompt-btn" data-prompt="I\'ve been feeling lonely and disconnected from people around me.">I feel lonely</button>' +
            '<button class="prompt-btn" data-prompt="I had a really good day today and I want to share it!">I had a good day</button>' +
            '<button class="prompt-btn" data-prompt="I\'m having trouble sleeping and feel tired all the time.">I can\'t sleep well</button>' +
            '<button class="prompt-btn" data-prompt="I just need someone to talk to right now.">I need to talk</button>' +
            '</div></div>';

        chatMessages.innerHTML = welcomeHTML;

        var newPromptBtns = chatMessages.querySelectorAll(".prompt-btn");
        newPromptBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                userInput.value = this.dataset.prompt;
                autoResizeTextarea();
                handleSend();
            });
        });

        moodBtns.forEach(function (btn) { btn.classList.remove("active"); });
    }

    // ===== CSS Animation for fadeOut =====
    var style = document.createElement("style");
    style.textContent = "@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-10px); } }";
    document.head.appendChild(style);

    // ===== Start the App =====
    init();
})();
