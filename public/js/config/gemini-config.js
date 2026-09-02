const GEMINI_API_KEY = 'AIzaSyDSbTN1cCB7moxten_xHURalVNoy6ZoryM'; 
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Store user message for fallback use
let lastUserMessage = '';

export async function getGeminiResponse(prompt, userMessage = '') {
    // Store the user message for fallback use
    lastUserMessage = userMessage;
    
    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
        return getFallbackResponse('empty');
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[Gemini API] Attempt ${attempt} of ${MAX_RETRIES}`);
            console.log(`[Gemini API] User message: "${userMessage}"`);
            
            const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800,
                        topK: 40,
                        topP: 0.95
                    },
                    safetySettings: [
                        {
                            category: 'HARM_CATEGORY_HARASSMENT',
                            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                        },
                        {
                            category: 'HARM_CATEGORY_HATE_SPEECH',
                            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                        }
                    ]
                })
            });

            console.log(`[Gemini API] Response status: ${response.status}`);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[Gemini API] HTTP error! status: ${response.status}, body: ${errorBody}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Validate response structure
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                console.error('[Gemini API] Invalid response structure:', data);
                throw new Error('Invalid response structure from API');
            }

            const responseText = data.candidates[0].content.parts[0].text;
            console.log(`[Gemini API] ✅ Success: Received response from Gemini API`);
            
            return responseText;

        } catch (error) {
            console.error(`[Gemini API] ❌ Attempt ${attempt} failed:`, error.message);
            
            if (attempt === MAX_RETRIES) {
                console.error('[Gemini API] All attempts failed, using fallback response');
                return getFallbackResponse(userMessage || 'empty');
            }

            // Exponential backoff with jitter
            const delay = RETRY_DELAY * attempt + Math.random() * 1000;
            console.log(`[Gemini API] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

function getFallbackResponse(userMessage) {
    if (userMessage === 'empty') {
        return "Please share what's on your mind. I'm here to help with your performance, nutrition, injury prevention, or mental wellness. What would you like to discuss?";
    }

    const msgLower = typeof userMessage === 'string' ? userMessage.toLowerCase().trim() : '';
    console.log(`[Fallback] Checking message: "${msgLower}"`);

    // Simple greetings - redirect to open-ended conversation
    const greetingPatterns = [
        /^(hey|hi|hello|sup|yo)(\s|$)/i,
        /^how\s+(are\s+)?you/i,
        /^how\s+r\s+u/i,
        /^how\s+r\s+u\s+doing/i,  // Fixed: added the "r"
        /^how\s+u\s+doing/i,
        /^what['`']?s\s+up/i,
        /^whats\s+up/i,
        /^u\s+doing/i,
        /^u\s+good/i
    ];
    
    if (greetingPatterns.some(pattern => {
        const matches = pattern.test(msgLower);
        if (matches) {
            console.log(`[Fallback] Matched greeting with pattern: ${pattern}`);
        }
        return matches;
    })) {
        console.log('[Fallback] Matched greeting pattern - showing friendly response');
        return `**Hey there!** 👋 I'm your Mental Fitness Coach, ready to support your athletic journey.

What's on your mind today?
- 💪 **Performance**: How are your training and test scores?
- 🥗 **Nutrition**: Need help with your diet plan?
- 🩹 **Injury Prevention**: Any concerns about your body?
- 🧠 **Mental Wellness**: Dealing with stress, motivation, or confidence?

Tell me what you'd like to focus on!`;
    }

    // Stress and anxiety
    if (msgLower.includes('stress') || msgLower.includes('anxious') || msgLower.includes('anxiety') || msgLower.includes('nervous')) {
        console.log('[Fallback] Matched stress/anxiety pattern');
        return `**I understand you're feeling stressed.** Here's what I recommend:

1. **Take a Deep Breath**: Try 4-7-8 breathing (inhale for 4, hold for 7, exhale for 8)
2. **Ground Yourself**: Focus on 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste
3. **Movement**: Go for a light walk or do some stretching
4. **Break it Down**: Identify one small task you can control right now

**Remember**: Stress is temporary. Your preparation and training give you the foundation to handle this.`;
    }

    // Motivation and confidence
    if (msgLower.includes('motivation') || msgLower.includes('unmotivated') || msgLower.includes('tired') || msgLower.includes('energy') || msgLower.includes('lazy')) {
        console.log('[Fallback] Matched motivation pattern');
        return `**Let's rebuild your motivation together!**

1. **Reconnect to Your Why**: Why did you start this sport? What fuels your passion?
2. **Celebrate Small Wins**: Review your recent achievements - every improvement counts
3. **Set a Micro-Goal**: Pick ONE small goal for tomorrow's training
4. **Mix It Up**: Try a new drill or training method to reignite the spark
5. **Support System**: Reach out to a teammate or coach for encouragement

**You've got this!** Every champion had days like this. What's your next small step?`;
    }

    // Injury and pain
    if (msgLower.includes('injury') || msgLower.includes('pain') || msgLower.includes('hurt') || msgLower.includes('sore') || msgLower.includes('ache')) {
        console.log('[Fallback] Matched injury/pain pattern');
        return `**Injury Assessment & Prevention:**

1. **Immediate Action**: Rest and apply ice if needed (RICE protocol)
2. **Check Your Form**: Poor technique often causes injuries
3. **Gradual Return**: Don't rush back to full intensity
4. **Professional Help**: Consult a sports physician if pain persists
5. **Prevention**: Warm-up, cool-down, and cross-training are key

**Your health comes first.** Better to rest now than be sidelined later. Use this time to work on mental training or strategy!`;
    }

    // Diet and nutrition
    if (msgLower.includes('diet') || msgLower.includes('nutrition') || msgLower.includes('food') || msgLower.includes('eat') || msgLower.includes('meal') || msgLower.includes('hungry')) {
        console.log('[Fallback] Matched diet/nutrition pattern');
        return `**Personalized Nutrition Strategy:**

1. **Fuel Your Body**: Eat balanced meals with carbs, protein, and healthy fats
2. **Hydration**: Drink 2-3 liters of water daily (more during intense training)
3. **Timing Matters**:
   - Pre-workout: Light carbs + small protein 1-2 hours before
   - Post-workout: Protein + carbs within 30 minutes
4. **Recovery Nutrition**: Lean proteins, whole grains, colorful vegetables
5. **Track It**: Monitor how different foods affect your performance

Check your personalized diet plan in the nutrition section!`;
    }

    // Performance and testing
    if (msgLower.includes('performance') || msgLower.includes('score') || msgLower.includes('test') || msgLower.includes('improve') || msgLower.includes('better') || msgLower.includes('yo-yo')) {
        console.log('[Fallback] Matched performance pattern');
        return `**Maximizing Your Performance:**

1. **Analyze Your Data**: Review your recent Yo-Yo test scores and trends
2. **Identify Patterns**: When do you perform best? Morning? After specific meals?
3. **Consistent Training**: Small daily improvements compound over time
4. **Recovery is Key**: Better sleep, nutrition, and rest boost performance
5. **Mental Game**: Visualize success and maintain confidence before competitions

View your performance dashboard to track progress over time!`;
    }

    // Confidence and belief
    if (msgLower.includes('confidence') || msgLower.includes('believe') || msgLower.includes('doubt') || msgLower.includes('insecure') || msgLower.includes('scared')) {
        console.log('[Fallback] Matched confidence pattern');
        return `**Building Unshakeable Confidence:**

1. **Evidence-Based**: Review your successes - you've done hard things before
2. **Visualization**: Spend 5 minutes daily visualizing perfect performance
3. **Self-Talk**: Replace doubt with "I've prepared for this" or "I can do this"
4. **Progressive Challenges**: Build confidence by tackling challenges step by step
5. **Support Circle**: Surround yourself with people who believe in you

**You belong here.** Your training, dedication, and heart make you capable!`;
    }

    // Recovery and rest
    if (msgLower.includes('recovery') || msgLower.includes('sleep') || msgLower.includes('rest') || msgLower.includes('exhausted')) {
        console.log('[Fallback] Matched recovery pattern');
        return `**Optimizing Your Recovery:**

1. **Sleep Quality**: Aim for 7-9 hours of consistent sleep nightly
2. **Active Recovery**: Light stretching, yoga, or walks on off-days
3. **Nutrition Recovery**: Protein and carbs within 30 mins of training
4. **Mental Rest**: Meditation or breathing exercises to calm your nervous system
5. **Track It**: Monitor your energy levels to optimize recovery time

Recovery is where the real gains happen! Respect the process.`;
    }

    // Generic response for any other question
    console.log('[Fallback] No pattern matched, using generic response');
    return `**I'm here to support your athletic journey!** 

Your message: "${userMessage}"

Tell me more about what's on your mind:
- 💪 **Performance**: How are your training and test scores?
- 🥗 **Nutrition**: Need help with your diet plan?
- 🩹 **Injury Prevention**: Any concerns about your body?
- 🧠 **Mental Wellness**: Dealing with stress, motivation, or confidence?

Whatever you're facing, we can work through it together. What's your priority right now?`;
}

export function markdownToHtml(markdown) {
    return markdown
        .replace(/## (.*$)/gm, '<h2>$1</h2>')
        .replace(/\* (.*$)/gm, '<li>$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
