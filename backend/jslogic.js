document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 0. THEME SWITCHER & SEQUENTIAL "FLARE" ENGINE
    // ==========================================
    const themeToggles = document.querySelectorAll(".themeToggle");
    const currentTheme = localStorage.getItem("theme");

    const animations = [
        "flare-forge",
        "flare-bellows",
        "flare-goldleaf",
        "flare-thermal",
    ];
    let animationIndex = 0;

    if (currentTheme === "dark") {
        document.body.classList.add("dark-theme");
        themeToggles.forEach((t) => (t.checked = true));
    }

    function triggerSequentialFlare() {
        const targets = [
            document.querySelector(".site-header .brand-mark"),
            document.querySelector(".site-header .theme-switch"),
            document.querySelector(".site-header .nav-highlight"),
        ];

        const currentAnimation = animations[animationIndex];

        targets.forEach((target) => {
            if (!target) return;

            target.classList.add(currentAnimation);

            const sparkContainer = document.createElement("div");
            sparkContainer.className = `flare-container ${currentAnimation}-sparks`;
            sparkContainer.innerHTML = `
                <div class="flare-spark"></div>
                <div class="flare-spark"></div>
                <div class="flare-spark"></div>
            `;
            target.appendChild(sparkContainer);

            setTimeout(() => {
                target.classList.remove(currentAnimation);
                if (sparkContainer.parentNode) {
                    sparkContainer.remove();
                }
            }, 1500);
        });

        animationIndex = (animationIndex + 1) % animations.length;
    }

    function switchTheme(e) {
        document.body.classList.add("theme-transition");

        if (e.target.checked) {
            document.body.classList.add("dark-theme");
            localStorage.setItem("theme", "dark");
            themeToggles.forEach((t) => (t.checked = true));
            triggerSequentialFlare();
        } else {
            document.body.classList.remove("dark-theme");
            localStorage.setItem("theme", "light");
            themeToggles.forEach((t) => (t.checked = false));
        }

        setTimeout(
            () => document.body.classList.remove("theme-transition"),
            600,
        );
    }

    themeToggles.forEach((t) => t.addEventListener("change", switchTheme));

    // ==========================================
    // 1. VIP QUESTION ROULETTE
    // ==========================================
    const vipQuestionsList = [
        "Can you help me find nearby restaurants?",
        "Where can I find the EMBER location on the map?",
        "How far is EMBER from my current location?",
        "Can I find parking near EMBER?",
        "Can I reserve parking for my car?",
        "Do you have bike parking?",
        "Can I reserve a table and parking together?",
        "How does your parking reservation system work?",
        "Can you help me navigate to EMBER?",
        "Is the Chef's Counter available tonight?",
        "What is your signature high-protein dish?",
        "I need to impress a client. Recommendations?",
        "Are there any off-menu specials today?",
        "Can I book the Oak Room for a corporate event?",
        "What drink pairs perfectly with the Ribeye?",
        "I have a strict dietary allergy. Can you accommodate?",
        "Which room is best for a romantic anniversary?",
        "What makes your 1200-degree open-flame cooking unique?",
        "Can you generate a nutrition chart for the Sea Bass?",
        "I need a table for 2. What times are open today?",
        "Tell me about Chef Arjun Mehta's background.",
    ];

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function renderQuickQuestions() {
        const quickRepliesContainer = document.getElementById("aiQuickReplies");
        if (!quickRepliesContainer) return;

        // Pick 3 random questions
        const shuffled = shuffleArray([...vipQuestionsList]).slice(0, 3);
        quickRepliesContainer.innerHTML = shuffled
            .map(
                (q) =>
                    `<button class="ember-ai-chip" onclick="sendQuickReply('${q.replace(/'/g, "\\'")}')">${q}</button>`,
            )
            .join("");
    }

    // ==========================================
    // 2. CINEMATIC LOADER
    // ==========================================
    const siteLoader = document.getElementById("siteLoader");
    if (siteLoader) {
        setTimeout(() => {
            siteLoader.classList.add("is-hidden");
            document.body.classList.remove("is-loading");
        }, 2500);
    }

    // ==========================================
    // 3. DYNAMIC MENU DATA & INJECTION
    // ==========================================
    const menuData = {
        starters: [
            {
                name: "Smoked Burrata",
                desc: "Charred peaches, basil oil, toasted sourdough.",
                price: "₹620",
                tag: "Seasonal",
                img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=80",
                story: "Fresh burrata is gently smoked over applewood and served with ripe seasonal peaches, basil oil, and toasted sourdough for a clean, creamy start.",
            },
            {
                name: "Tandoori Cauliflower",
                desc: "Yogurt glaze, pickled onion, black sesame.",
                price: "₹540",
                tag: "Fire",
                img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=80",
                story: "Whole cauliflower is marinated in spiced yogurt, roasted in the tandoor, and finished with tangy pickled onion and black sesame.",
            },
            {
                name: "Charred Corn Salad",
                desc: "Citrus dressing, feta, crispy shallots.",
                price: "₹480",
                tag: "Light",
                img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80",
                story: "Sweet corn is flame-grilled, then tossed with citrus dressing, feta, herbs, and crisp shallots for a bright and fresh bite.",
            },
        ],
        mains: [
            {
                name: "Wood-Fire Ribeye",
                desc: "Bone marrow jus, roasted garlic, seasonal greens.",
                price: "₹1850",
                tag: "Signature",
                img: "https://images.unsplash.com/photo-1558030006-450675393462?w=900&q=80",
                story: "This ribeye is flame-seared over wood fire, rested properly, then plated with bone marrow jus, roasted garlic, and seasonal greens.",
            },
            {
                name: "Harissa Sea Bass",
                desc: "Herb couscous, lemon butter, grilled fennel.",
                price: "₹1420",
                tag: "Chef's Choice",
                img: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=900&q=80",
                story: "Sea bass is brushed with harissa, grilled carefully, and paired with herb couscous, lemon butter, and soft charred fennel.",
            },
            {
                name: "Smoked Mushroom Risotto",
                desc: "Porcini, truffle oil, parmesan crisp.",
                price: "₹1090",
                tag: "Vegetarian",
                img: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&q=80",
                story: "Creamy risotto is built slowly with porcini, finished with truffle oil, and topped with a parmesan crisp for texture.",
            },
        ],
        desserts: [
            {
                name: "Burnt Cheesecake",
                desc: "Berry compote, vanilla cream.",
                price: "₹520",
                tag: "Popular",
                img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=80",
                story: "A deeply baked cheesecake with a caramelized top, served with berry compote and vanilla cream for a rich finish.",
            },
            {
                name: "Chocolate Tart",
                desc: "Sea salt, espresso gelato, almond crumble.",
                price: "₹560",
                tag: "Rich",
                img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=900&q=80",
                story: "Dark chocolate tart is balanced with sea salt, espresso gelato, and almond crumble for a bitter-sweet finish.",
            },
            {
                name: "Rose Panna Cotta",
                desc: "Lychee, pistachio, edible petals.",
                price: "₹490",
                tag: "Fresh",
                img: "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=900&q=80",
                story: "Silky panna cotta is lightly perfumed with rose and paired with lychee, pistachio, and edible petals.",
            },
        ],
        drinks: [
            {
                name: "Ember Negroni",
                desc: "Smoky gin, vermouth, orange peel.",
                price: "₹680",
                tag: "Cocktail",
                img: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=900&q=80",
                story: "A classic Negroni with a smoky edge, built with gin, vermouth, and orange peel for a bold aperitif.",
            },
            {
                name: "Cold Brew Tonic",
                desc: "Coffee, tonic, citrus twist.",
                price: "₹420",
                tag: "No Alcohol",
                img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=900&q=80",
                story: "Cold brew is lifted with tonic and citrus, creating a crisp, bitter, refreshing non-alcoholic drink.",
            },
            {
                name: "Sparkling Yuzu",
                desc: "Yuzu syrup, soda, fresh mint.",
                price: "₹390",
                tag: "Refresh",
                img: "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=900&q=80",
                story: "Yuzu syrup, soda, and fresh mint combine into a light sparkling drink with sharp citrus brightness.",
            },
        ],
    };

    function renderMenu(category) {
        const grid = document.getElementById("menu-display");
        if (!grid || !menuData[category]) return;

        grid.innerHTML = menuData[category]
            .map(
                (item) => `
            <article class="menu-card" role="button" tabindex="0">
                <div class="menu-card-img-wrap media-wrapper">
                    <img src="${item.img}" alt="${item.name}" loading="lazy">
                </div>
                <div class="menu-card-body">
                    <div class="topline">
                        <h4 class="dish-name">${item.name}</h4>
                        <span class="dish-tag">${item.tag}</span>
                    </div>
                    <p class="dish-desc">${item.desc}</p>
                    <div class="dish-price">${item.price}</div>
                    <div class="dish-story"><p>${item.story}</p></div>
                </div>
            </article>
        `,
            )
            .join("");

        document.querySelectorAll(".menu-card").forEach((card) => {
            card.addEventListener("click", () =>
                card.classList.toggle("active"),
            );
        });
    }

    window.switchTab = function (button, category) {
        document
            .querySelectorAll(".menu-tabs .tab")
            .forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        renderMenu(category);
    };

    if (document.getElementById("menu-display")) {
        renderMenu("starters");
    }

    // ==========================================
    // 4. RESPONSIVE NAVIGATION & SCROLLING
    // ==========================================
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const primaryNav = document.getElementById("primary-nav");
    const backToTopBtn = document.getElementById("backToTop");

    if (mobileBtn && primaryNav) {
        mobileBtn.addEventListener("click", () => {
            primaryNav.classList.toggle("open");
        });
    }

    document.querySelectorAll(".site-nav a").forEach((link) => {
        link.addEventListener("click", function (e) {
            if (primaryNav) primaryNav.classList.remove("open");
            const href = this.getAttribute("href");
            if (href.startsWith("#")) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: "smooth",
                    });
                }
            }
        });
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // ==========================================
    // 5. TIMED GLOBAL OFFER POPUP
    // ==========================================
    const popup = document.getElementById("globalOfferPopup");
    const popupClose = document.getElementById("offerClose");
    let hidePopupTimeout;

    if (popup) {
        setTimeout(() => {
            popup.classList.add("is-visible");
            popup.setAttribute("aria-hidden", "false");
            hidePopupTimeout = setTimeout(() => {
                popup.classList.remove("is-visible");
                popup.setAttribute("aria-hidden", "true");
            }, 15000);
        }, 15000);

        if (popupClose) {
            popupClose.addEventListener("click", () => {
                popup.classList.remove("is-visible");
                popup.setAttribute("aria-hidden", "true");
                clearTimeout(hidePopupTimeout);
            });
        }
    }

    // ==========================================
    // 6. ELITE AI MORPHING & DRAGGING LOGIC
    // ==========================================
    const aiLauncher = document.getElementById("aiLauncher");
    const aiPanel = document.getElementById("aiPanel");
    const aiClose = document.getElementById("aiClose");
    const aiInput = document.getElementById("aiInput");
    const aiSend = document.getElementById("aiSend");
    const aiVoiceBtn = document.getElementById("aiVoiceBtn");
    const aiMessages = document.getElementById("aiMessages");
    const aiDragHandle = document.getElementById("aiDragHandle");
    const aiLockToggle = document.getElementById("aiLockToggle");
    const iconLocked = document.getElementById("icon-locked");
    const iconUnlocked = document.getElementById("icon-unlocked");

    let chatHistory = [];
    let isUnlocked = false;
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    const canDrag = () => window.innerWidth > 768;

    if (aiLockToggle) {
        aiLockToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleLockState();
        });
    }

    if (aiDragHandle && aiPanel) {
        aiDragHandle.addEventListener("dblclick", (e) => {
            if (e.target.closest("button")) return;
            toggleLockState();
        });

        function toggleLockState() {
            if (!canDrag()) return;
            isUnlocked = !isUnlocked;
            if (isUnlocked) {
                aiPanel.classList.add("is-unlocked");
                if (iconLocked) iconLocked.style.display = "none";
                if (iconUnlocked) iconUnlocked.style.display = "block";
                const rect = aiPanel.getBoundingClientRect();
                aiPanel.style.bottom = "auto";
                aiPanel.style.right = "auto";
                aiPanel.style.left = `${rect.left}px`;
                aiPanel.style.top = `${rect.top}px`;
            } else {
                aiPanel.classList.remove("is-unlocked");
                if (iconLocked) iconLocked.style.display = "block";
                if (iconUnlocked) iconUnlocked.style.display = "none";
                aiPanel.style.left = "";
                aiPanel.style.top = "";
                aiPanel.style.bottom = "calc(100% + 1.5rem)";
                aiPanel.style.right = "0";
            }
        }

        aiDragHandle.addEventListener("mousedown", (e) => {
            if (!isUnlocked || !canDrag() || e.target.closest("button")) return;
            isDragging = true;
            aiPanel.classList.add("is-dragging");
            const rect = aiPanel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            const maxX = window.innerWidth - aiPanel.offsetWidth;
            const maxY = window.innerHeight - aiPanel.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));
            aiPanel.style.left = `${newLeft}px`;
            aiPanel.style.top = `${newTop}px`;
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                aiPanel.classList.remove("is-dragging");
            }
        });
    }

    window.openAIPanel = function () {
        if (!aiPanel) return;
        renderQuickQuestions(); // Re-roll questions every time it opens
        function showPanel() {
            aiPanel.classList.add("is-open");
            aiPanel.setAttribute("aria-hidden", "false");
            setTimeout(() => aiPanel.classList.add("is-revealed"), 50);
        }
        if (aiLauncher) {
            aiLauncher.classList.add("is-morphing");
            setTimeout(() => {
                aiLauncher.style.opacity = "0";
                aiLauncher.style.pointerEvents = "none";
                showPanel();
            }, 150);
        } else {
            showPanel();
        }
    };

    if (aiLauncher) {
        aiLauncher.addEventListener("click", window.openAIPanel);
    }

    if (aiClose && aiPanel) {
        aiClose.addEventListener("click", (e) => {
            e.stopPropagation();
            aiPanel.classList.remove("is-revealed");
            stopTTS();
            setTimeout(() => {
                if (isUnlocked) {
                    aiPanel.style.left = "";
                    aiPanel.style.top = "";
                    aiPanel.classList.remove("is-unlocked");
                    isUnlocked = false;
                    if (iconLocked) iconLocked.style.display = "block";
                    if (iconUnlocked) iconUnlocked.style.display = "none";
                }
                aiPanel.classList.remove("is-open");
                aiPanel.setAttribute("aria-hidden", "true");
                if (aiLauncher) {
                    aiLauncher.style.opacity = "1";
                    aiLauncher.style.pointerEvents = "auto";
                    requestAnimationFrame(() => {
                        aiLauncher.classList.remove("is-morphing");
                    });
                }
            }, 450);
        });
    }

    // ==========================================
    // 7. COMPOSER (TEXTAREA & VOICE) LOGIC
    // ==========================================
    if (aiInput) {
        aiInput.addEventListener("input", function () {
            this.style.height = "40px";
            this.style.height = Math.min(this.scrollHeight, 120) + "px";
            if (aiSend) aiSend.disabled = this.value.trim() === "";
        });
        aiInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                processMessage();
            }
        });
    }

    if (aiSend) {
        aiSend.disabled = true;
        aiSend.addEventListener("click", processMessage);
    }

    let isListening = false;
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (SpeechRecognition && aiVoiceBtn) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.onstart = function () {
            isListening = true;
            aiVoiceBtn.classList.add("is-listening");
            aiInput.placeholder = "Listening...";
        };
        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            aiInput.value = transcript;
            aiInput.style.height = "40px";
            aiInput.style.height = Math.min(aiInput.scrollHeight, 120) + "px";
            if (aiSend) aiSend.disabled = false;
            processMessage();
        };
        recognition.onerror = function () {
            isListening = false;
            aiVoiceBtn.classList.remove("is-listening");
            aiInput.placeholder = "Message our concierge...";
        };
        recognition.onend = function () {
            isListening = false;
            aiVoiceBtn.classList.remove("is-listening");
            aiInput.placeholder = "Message our concierge...";
        };
        aiVoiceBtn.addEventListener("click", () => {
            if (isListening) recognition.stop();
            else recognition.start();
        });
    } else if (aiVoiceBtn) {
        aiVoiceBtn.style.display = "none";
    }

    // ==========================================
    // 8. API CONNECTION & MESSAGE RENDERING
    // ==========================================
    let isFetching = false; // THE RACE CONDITION FIX

    window.sendQuickReply = function (text) {
        if (aiInput && !isFetching) {
            aiInput.value = text;
            processMessage();
        }
    };

    const renderMarkdown = (text) => {
        if (typeof marked !== "undefined") return marked.parse(text);
        return `<p>${text.replace(/\n/g, "<br>")}</p>`;
    };

    async function processMessage() {
        if (isFetching) return; // Prevent user from double-sending and corrupting history!

        const text = aiInput.value.trim();
        if (!text) return;

        isFetching = true;

        const quickQuestionsWrap = document.getElementById(
            "aiQuickQuestionsWrapper",
        );
        if (
            quickQuestionsWrap &&
            !quickQuestionsWrap.classList.contains("is-hidden")
        ) {
            quickQuestionsWrap.classList.add("is-hidden");
        }

        appendMessage(text, "user");

        aiInput.value = "";
        aiInput.style.height = "40px";
        if (aiSend) aiSend.disabled = true;
        stopTTS();

        const loadingId = appendLoading();

        try {
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history: chatHistory }),
            });

            if (!response.ok) throw new Error("Network response was not ok.");

            const data = await response.json();
            removeMessage(loadingId);

            if (data.reply) {
                // THE RESILIENT VIP PASS INTERCEPTOR LOGIC
                let cleanedReply = data.reply;
                let ticketHTML = "";
                const ticketRegex = /\[TICKET:\s*([\s\S]*?)\s*\]/; // Handles multi-line accidental spacing
                const match = data.reply.match(ticketRegex);

                if (match) {
                    // Instantly erase the raw string from the text the user will read
                    cleanedReply = data.reply.replace(ticketRegex, "").trim();

                    // Split the variables out (Name | Date | Time | Room | Email | Guests)
                    const details = match[1].split("|").map((s) => s.trim());

                    // Allow parsing even if AI added an accidental extra pipe symbol
                    if (details.length >= 6) {
                        const [name, date, time, room, email, guests] = details;

                        // Generate the injected VIP Pass UI
                        ticketHTML = `
                            <div class="vip-pass-card">
                                <div class="vip-pass-header">Confirmed Reservation</div>
                                <div class="vip-pass-grid">
                                    <div class="vip-pass-item"><span class="vip-pass-label">Guest</span><span class="vip-pass-value">${name}</span></div>
                                    <div class="vip-pass-item"><span class="vip-pass-label">Party</span><span class="vip-pass-value">${guests}</span></div>
                                    <div class="vip-pass-item"><span class="vip-pass-label">Date</span><span class="vip-pass-value">${date}</span></div>
                                    <div class="vip-pass-item"><span class="vip-pass-label">Time</span><span class="vip-pass-value">${time}</span></div>
                                    <div class="vip-pass-item" style="grid-column: 1 / -1;"><span class="vip-pass-label">Room</span><span class="vip-pass-value">${room}</span></div>
                                </div>
                                <div class="vip-pass-footer">Digital Pass Generated</div>
                            </div>
                        `;
                    }
                }

                // Render both the markdown and the newly injected HTML ticket (if it exists)
                const finalHTML = renderMarkdown(cleanedReply) + ticketHTML;
                appendMessage(finalHTML, "model", true, cleanedReply);

                chatHistory.push({ role: "user", text: text });
                chatHistory.push({ role: "model", text: data.reply }); // Push actual reply to memory
            }
        } catch (error) {
            removeMessage(loadingId);
            appendMessage(
                "I apologize, the concierge desk is currently offline due to a network interruption.",
                "model",
                false,
            );
        } finally {
            isFetching = false; // Lift the lock once API is done!
        }
    }

    function appendMessage(content, role, isHTML = false, rawTextForTTS = "") {
        if (!aiMessages) return;

        const msgRow = document.createElement("div");
        msgRow.className = `ember-ai-message ember-ai-message-${role}`;

        const bubble = document.createElement("div");
        bubble.className = "ember-ai-bubble";

        if (isHTML) {
            bubble.innerHTML = content;
        } else {
            const p = document.createElement("p");
            p.textContent = content;
            bubble.appendChild(p);
        }

        if (role === "model" && "speechSynthesis" in window) {
            const textToRead = rawTextForTTS || content;
            const ttsHtml = `
                <div class="ai-tts-wrapper">
                    <select class="tts-speed" title="Playback Speed">
                        <option value="1">1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                    </select>
                    <button class="tts-btn tts-play-btn" data-text="${encodeURIComponent(textToRead)}" aria-label="Play response" title="Listen">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <button class="tts-btn tts-stop-btn" style="display:none;" aria-label="Stop playback" title="Stop">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"></rect></svg>
                    </button>
                </div>
            `;
            bubble.insertAdjacentHTML("beforeend", ttsHtml);
        }

        msgRow.appendChild(bubble);
        aiMessages.appendChild(msgRow);

        setTimeout(() => {
            aiMessages.scrollTop = aiMessages.scrollHeight;
        }, 10);
    }

    function appendLoading() {
        if (!aiMessages) return null;
        const id = "loading-" + Date.now();
        const msgRow = document.createElement("div");
        msgRow.className = "ember-ai-message ember-ai-message-model";
        msgRow.id = id;
        msgRow.innerHTML = `
            <div class="ember-ai-bubble" style="padding: 0.6rem 1rem;">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        aiMessages.appendChild(msgRow);
        setTimeout(() => (aiMessages.scrollTop = aiMessages.scrollHeight), 10);
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // ==========================================
    // 9. TEXT-TO-SPEECH (TTS) ENGINE
    // ==========================================
    let currentUtterance = null;

    function stopTTS() {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            document
                .querySelectorAll(".tts-play-btn")
                .forEach((b) => (b.style.display = "grid"));
            document
                .querySelectorAll(".tts-stop-btn")
                .forEach((b) => (b.style.display = "none"));
        }
    }

    document.addEventListener("click", (e) => {
        const playBtn = e.target.closest(".tts-play-btn");
        const stopBtn = e.target.closest(".tts-stop-btn");

        if (playBtn) {
            stopTTS();
            const rawText = decodeURIComponent(
                playBtn.getAttribute("data-text"),
            );
            const cleanText = rawText.replace(/[*#_`\[\]()]/g, "");

            const wrapper = playBtn.closest(".ai-tts-wrapper");
            const speedSelect = wrapper.querySelector(".tts-speed");
            const relatedStopBtn = wrapper.querySelector(".tts-stop-btn");

            currentUtterance = new SpeechSynthesisUtterance(cleanText);
            currentUtterance.rate = parseFloat(speedSelect.value) || 1.0;
            currentUtterance.lang = "en-US";

            currentUtterance.onend = () => {
                playBtn.style.display = "grid";
                relatedStopBtn.style.display = "none";
            };

            playBtn.style.display = "none";
            relatedStopBtn.style.display = "grid";

            window.speechSynthesis.speak(currentUtterance);
        }

        if (stopBtn) {
            stopTTS();
        }
    });
});
