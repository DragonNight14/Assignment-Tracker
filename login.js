class LoginManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Canvas connection
        document.getElementById('canvas-connect-btn').addEventListener('click', () => {
            this.showCanvasModal();
        });

        // Google Classroom connection
        document.getElementById('google-connect-btn').addEventListener('click', () => {
            this.showGoogleModal();
        });

        // Manual entry
        document.getElementById('manual-connect-btn').addEventListener('click', () => {
            this.proceedManually();
        });

        // Modal controls
        document.getElementById('canvas-cancel').addEventListener('click', () => {
            this.hideCanvasModal();
        });

        document.getElementById('google-cancel').addEventListener('click', () => {
            this.hideGoogleModal();
        });

        document.getElementById('google-authorize').addEventListener('click', () => {
            this.authorizeGoogle();
        });

        // Form submissions
        document.getElementById('canvas-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.connectCanvas();
        });

        // Token help
        document.getElementById('token-help').addEventListener('click', (e) => {
            e.preventDefault();
            this.showTokenHelp();
        });

        // Close modals when clicking outside
        document.getElementById('canvas-modal').addEventListener('click', (e) => {
            if (e.target.id === 'canvas-modal') {
                this.hideCanvasModal();
            }
        });

        document.getElementById('google-modal').addEventListener('click', (e) => {
            if (e.target.id === 'google-modal') {
                this.hideGoogleModal();
            }
        });
    }

    showCanvasModal() {
        document.getElementById('canvas-modal').classList.add('active');
    }

    hideCanvasModal() {
        document.getElementById('canvas-modal').classList.remove('active');
        document.getElementById('canvas-form').reset();
    }

    showGoogleModal() {
        document.getElementById('google-modal').classList.add('active');
    }

    hideGoogleModal() {
        document.getElementById('google-modal').classList.remove('active');
    }

    async connectCanvas() {
        const url = document.getElementById('canvas-url').value.trim();
        const token = document.getElementById('canvas-token').value.trim();

        if (!url || !token) {
            alert('Please fill in all fields.');
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('#canvas-form button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Connecting...';
        submitBtn.disabled = true;

        try {
            // Simulate API connection (replace with actual Canvas API call)
            await this.simulateCanvasConnection(url, token);
            
            // Store connection info
            localStorage.setItem('canvas_connected', 'true');
            localStorage.setItem('canvas_url', url);
            localStorage.setItem('canvas_token', token);

            // Show success and redirect
            alert('Successfully connected to Canvas LMS!');
            this.redirectToApp();

        } catch (error) {
            alert('Failed to connect to Canvas. Please check your URL and token.');
            console.error('Canvas connection error:', error);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async simulateCanvasConnection(url, token) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Basic URL validation
        if (!url.includes('instructure.com') && !url.includes('canvas')) {
            throw new Error('Invalid Canvas URL');
        }

        // Simulate successful connection
        return { success: true };
    }

    async authorizeGoogle() {
        // Show loading state
        const authorizeBtn = document.getElementById('google-authorize');
        const originalText = authorizeBtn.textContent;
        authorizeBtn.textContent = 'Authorizing...';
        authorizeBtn.disabled = true;

        try {
            // Simulate Google OAuth flow
            await this.simulateGoogleAuth();
            
            // Store connection info
            localStorage.setItem('google_connected', 'true');
            localStorage.setItem('google_auth_time', new Date().toISOString());

            // Show success and redirect
            alert('Successfully connected to Google Classroom!');
            this.redirectToApp();

        } catch (error) {
            alert('Failed to authorize with Google. Please try again.');
            console.error('Google auth error:', error);
        } finally {
            authorizeBtn.textContent = originalText;
            authorizeBtn.disabled = false;
        }
    }

    async simulateGoogleAuth() {
        // Simulate OAuth flow delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate successful authorization
        return { success: true };
    }

    proceedManually() {
        localStorage.setItem('manual_mode', 'true');
        this.redirectToApp();
    }

    redirectToApp() {
        window.location.href = 'index.html';
    }

    showTokenHelp() {
        const helpText = `To get your Canvas API token:

1. Log in to your Canvas account
2. Go to Account → Settings
3. Scroll down to "Approved Integrations"
4. Click "+ New Access Token"
5. Enter a purpose (e.g., "Assignment Tracker")
6. Click "Generate Token"
7. Copy the token and paste it here

Keep your token secure and don't share it with others.`;

        alert(helpText);
    }
}

// Initialize login manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
