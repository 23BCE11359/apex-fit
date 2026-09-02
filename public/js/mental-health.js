import { auth, db } from './config/firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getGeminiResponse, markdownToHtml } from './config/gemini-config.js';

// Add conversation memory
let conversationHistory = [];
let userData = null;

// Update chatbot personality
const AI_PERSONA = {
    name: "AthleteMind Coach",
    style: "empathetic, action-oriented, and contextual"
};

// Add feature-based conversation topics
const FEATURES = {
    performance: "Your Yo-Yo test score and performance metrics",
    diet: "Your personalized nutrition plan",
    injury: "Injury prevention and recovery guidance",
    mental: "Mental wellness and motivation support"
};

// Define specific response templates
const RESPONSE_TEMPLATES = {
    motivation: {
        steps: [
            "1️⃣ Set a small, achievable goal for tomorrow's training",
            "2️⃣ Track your progress in the performance dashboard",
            "3️⃣ Reward yourself after completing each milestone",
            "4️⃣ Connect with training partners or teammates",
            "5️⃣ Visualize your success for 5 minutes before training"
        ],
        actionLinks: {
            performance: "/pages/dashboard.html",
            training: "/pages/yoyo-test.html"
        }
    },
    diet: {
        steps: [
            "1️⃣ Calculate your daily calorie needs",
            "2️⃣ Plan your pre and post-workout meals",
            "3️⃣ Track your water intake",
            "4️⃣ Balance your macronutrients",
            "5️⃣ Time your meals around training"
        ],
        actionLinks: {
            dietPlan: "/pages/diet-plan.html",
            nutrition: "/pages/nutrition-calculator.html"
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const userNameElement = document.getElementById('userName');

    // Auth check and data loading
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = '/index.html';
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            userData = userDoc.data();
            
            // Update UI with user data
            userNameElement.textContent = user.displayName || 'Athlete';
            document.getElementById('userLevel').textContent = userData.lastYoyoTest?.level || 'N/A';
            document.getElementById('yoyoScore').textContent = userData.lastYoyoTest?.score || 'N/A';
            
            // Get daily motivation
            getDailyMotivation(userData);
        } catch (error) {
            console.error('Error loading user data:', error);
            userNameElement.textContent = 'Athlete';
        }
    });

    // Handle chat form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        // Show user message
        addMessage('user', message);
        userInput.value = '';
        chatForm.disabled = true;

        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'bot-message typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        document.getElementById('chatMessages').appendChild(typingIndicator);

        try {
            console.log('[Chat] User message:', message);
            const chatPrompt = getChatPrompt(message, userData);
            console.log('[Chat] Sending to Gemini API...');
            
            // Pass both the prompt and the original user message
            const response = await getGeminiResponse(chatPrompt, message);
            
            // Remove typing indicator
            typingIndicator.remove();
            
            console.log('[Chat] Received response');
            // Process response before displaying
            const processedResponse = processResponse(response, message);
            addMessage('bot', processedResponse);
            
            // Save conversation
            if (userData?.sport) {
                await saveConversation(message, processedResponse);
            }

        } catch (error) {
            console.error('[Chat] Error:', error);
            typingIndicator.remove();
            addMessage('bot', '**I\'m having trouble right now.** Please try again or rephrase your message.');
        } finally {
            chatForm.disabled = false;
            userInput.focus();
        }
    });

    // Enhanced quick topics
    const topicPrompts = {
        stress: {
            message: "I'm feeling stressed about my upcoming game",
            context: "competition_anxiety"
        },
        confidence: {
            message: "How can I build more confidence in my performance?",
            context: "self_belief"
        },
        motivation: {
            message: "I'm struggling to stay motivated in training",
            context: "training_motivation"
        },
        pressure: {
            message: "I feel a lot of pressure to perform well",
            context: "performance_pressure"
        }
    };

    document.querySelectorAll('.topic-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const topic = btn.dataset.topic;
            userInput.value = topicPrompts[topic].message;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });
});

function addMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;

    // Format the content
    const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="feature-link">$1</a>')
        .replace(/\n/g, '<br>');

    messageDiv.innerHTML = formattedContent;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Remove quick replies after user selects one
    if (type === 'user') {
        const quickReplies = document.querySelector('.quick-replies');
        if (quickReplies) {
            quickReplies.remove();
        }
    }
}

// Format message with better styling
function formatMessage(content) {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong class="highlight">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="emphasis">$1</em>')
        .replace(/(\d️⃣)/g, '<span class="step-number">$1</span>');
}

// Update the chat prompt to be more focused and structured
const getChatPrompt = (message, userData) => {
    const userProfile = {
        sport: userData?.sport || 'multiple sports',
        level: userData?.lastYoyoTest?.level || 'Beginner',
        score: userData?.lastYoyoTest?.score || 'N/A',
        name: userData?.name || 'Athlete'
    };

    return `You are "AthleteMind Coach" - an empathetic, supportive mental fitness and wellness coach for athletes. Your goal is to provide practical, actionable guidance.

ATHLETE PROFILE:
- Name: ${userProfile.name}
- Sport: ${userProfile.sport}
- Performance Level: ${userProfile.level}
- Latest Yo-Yo Score: ${userProfile.score}/20

ATHLETE'S MESSAGE: "${message}"

YOUR RESPONSE GUIDELINES:
1. **Length**: 2-4 sentences maximum (keep it concise but helpful)
2. **Tone**: Empathetic, supportive, motivational
3. **Content**: 
   - Acknowledge their concern with understanding
   - Provide ONE clear, actionable step they can take immediately
   - Reference their sport/level when relevant
4. **Formatting**: 
   - Use ** for emphasis on key words
   - Use numbered lists only if you're giving 3+ steps
   - Keep language simple and direct
5. **Links**: If they mention diet, injury, or performance, suggest they check that section
6. **Avoid**: Generic responses, long explanations, multiple unrelated ideas

EXAMPLES OF GOOD RESPONSES:
- User: "I'm feeling tired during training"
  Coach: "**Fatigue often signals you need better recovery.** Make sure you're sleeping 7-9 hours and eating enough protein post-workout. Try increasing your water intake by 25% tomorrow and notice the difference. 💪"

- User: "I lack confidence"
  Coach: "**Confidence comes from preparation, not perfection.** Review one training session where you performed well - that's your proof you can do this. Spend 5 minutes tomorrow visualizing yourself succeeding. You've got this!"

Now provide your response:`;
}

async function getDailyMotivation(userData) {
    try {
        const userMsg = 'Give me daily motivation';
        const prompt = `Create a short, powerful motivational message for a ${userData?.sport || 'sports'} athlete at ${userData?.lastYoyoTest?.level || 'beginner'} level. Keep it under 30 words.`;
        const motivation = await getGeminiResponse(prompt, userMsg);
        document.getElementById('dailyQuote').textContent = motivation;
    } catch (error) {
        console.error('Error getting motivation:', error);
        document.getElementById('dailyQuote').textContent = "Champions aren't made in the gym. Champions are made from something deep inside them – a desire, a dream, a vision.";
    }
}

// Helper function for emergency responses
function getEmergencyResponse() {
    const responses = [
        "I understand this is a challenging moment. Remember, your mental health is paramount. Consider checking your performance dashboard for positive progress markers, or review your successful training history. Would you like to explore some quick mental wellness exercises?",
        
        "As your mental wellness coach, I want to ensure you're supported. We can look at your progress together, review your nutrition plan for mood-boosting foods, or practice some confidence-building exercises. What would be most helpful right now?",
        
        "Every champion faces moments of doubt. Let's focus on your strengths - your dedication to training, your improving Yo-Yo test scores, and your commitment to mental wellness. Shall we review your achievements together?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Save conversations for context
async function saveConversation(userMessage, botResponse) {
    try {
        const conversationRef = doc(db, 'mental_health_chats', auth.currentUser.uid);
        const timestamp = new Date().toISOString();
        
        await setDoc(conversationRef, {
            [`conversations.${timestamp}`]: {
                user: userMessage,
                bot: botResponse,
                context: {
                    performance_level: userData?.lastYoyoTest?.level,
                    recent_score: userData?.lastYoyoTest?.score,
                    sport: userData?.sport
                }
            }
        }, { merge: true });
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

// Add feature detection and UI updates
function handleFeatureReference(userMessage, botResponse) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('diet') || message.includes('nutrition') || message.includes('food')) {
        showFeaturePrompt('pages/diet-plan', 'Would you like to see your personalized diet plan?');
    } else if (message.includes('injury') || message.includes('pain')) {
        showFeaturePrompt('injury-prevention', 'Shall we check your injury prevention plan?');
    } else if (message.includes('performance') || message.includes('score')) {
        showFeaturePrompt('dashboard', 'Would you like to review your performance metrics?');
    }
}

function showFeaturePrompt(feature, message) {
    const promptHtml = `
        <div class="feature-prompt">
            <p>${message}</p>
            <a href="/${feature}.html" class="btn btn-primary">View ${feature.replace('-', ' ')}</a>
        </div>
    `;
    addMessage('bot', promptHtml);
}

// Add new function to process responses
function processResponse(response, userMessage) {
    if (!response || response.trim().length === 0) {
        return "**I had trouble getting a response.** Please try rephrasing your question or check back in a moment.";
    }

    let processedResponse = response;
    const userMessageLower = userMessage.toLowerCase();
    
    // Add feature links based on user's message
    const linksToAdd = [];
    
    if (userMessageLower.includes('diet') || userMessageLower.includes('nutrition') || userMessageLower.includes('meal') || userMessageLower.includes('food')) {
        linksToAdd.push('[📋 View Your Diet Plan](/pages/diet-plan.html)');
    }
    
    if (userMessageLower.includes('injury') || userMessageLower.includes('pain') || userMessageLower.includes('prevent')) {
        linksToAdd.push('[🩹 Check Injury Prevention](/pages/injury-prevention.html)');
    }
    
    if (userMessageLower.includes('performance') || userMessageLower.includes('score') || userMessageLower.includes('test')) {
        linksToAdd.push('[📊 View Performance Dashboard](/pages/dashboard.html)');
    }
    
    if (linksToAdd.length > 0) {
        processedResponse += '\n\n**Quick Links:**\n' + linksToAdd.join(' | ');
    }

    return processedResponse;
}

// Add this function to handle quick replies
window.handleQuickReply = async function(message) {
    // Display user message
    addMessage('user', message);

    try {
        const response = await getGeminiResponse(
            `The athlete says: "${message}". 
             Provide a brief, empathetic response and a specific action step.
             Keep it under 3 sentences and focus on motivation and mental wellness.`,
            message
        );
        addMessage('bot', response);
    } catch (error) {
        console.error('Chat Error:', error);
        addMessage('bot', 'I understand. Let\'s work together to improve your mindset and performance.');
    }
}
