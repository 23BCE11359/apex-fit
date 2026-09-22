import { auth, db } from '../config/firebase-config.js';
import { GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const getStartedBtn = document.getElementById('getStarted');
    const messageDiv = document.getElementById('message');

    const showMessage = (msg, isError = false) => {
        if (!messageDiv) {
            console.error(msg);
            return;
        }
        messageDiv.textContent = msg;
        messageDiv.className = `message ${isError ? 'error' : 'success'}`;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    };

    const handleSignIn = async (button) => {
        button.classList.add('loading');
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            const result = await signInWithPopup(auth, provider);
            
            if (result.user) {
                // Check user's assessment and test status
                const [userDoc, assessmentDoc] = await Promise.all([
                    getDoc(doc(db, 'users', result.user.uid)),
                    getDoc(doc(db, 'assessments', result.user.uid))
                ]);

                // First time user - no user doc or assessment
                if (!userDoc.exists() || !assessmentDoc.exists()) {
                    window.location.href = '/pages/assessment.html';
                    return;
                }

                // Has assessment but no Yo-Yo test
                if (!userDoc.data().lastYoyoTest) {
                    window.location.href = '/pages/yoyo-test.html';
                    return;
                }

                // Has everything - go to dashboard
                window.location.href = '/pages/dashboard.html';
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Login failed: ' + error.message, true);
        } finally {
            button.classList.remove('loading');
        }
    };

    loginBtn?.addEventListener('click', (e) => handleSignIn(e.target));
    getStartedBtn?.addEventListener('click', (e) => handleSignIn(e.target));

    // Remove or modify the onAuthStateChanged handler to prevent automatic redirection
    auth.onAuthStateChanged(user => {
        if (user) {
            // Don't redirect automatically - let handleSignIn handle it
            return;
        }
    });
});
