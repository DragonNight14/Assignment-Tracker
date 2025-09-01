// Assignment Tracker App
class AssignmentTracker {
    constructor() {
        this.assignments = [];
        this.currentScreen = 'login-screen';
        this.screenHistory = [];
        this.currentUser = null;
        this.currentTags = [];
        this.apiClient = new APIClient();
        this.settings = {
            darkMode: false,
            colorTheme: 'blue',
            notifications: true,
            reminderTime: 1,
            background: 'gradient'
        };
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadAssignments();
        this.setupEventListeners();
        this.applySettings();
        this.renderCalendar();
        
        // Check if user is logged in and restore session
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            document.getElementById('account-info').textContent = `Logged in as ${this.currentUser.name} (${this.currentUser.provider})`;
            this.showScreen('main');
            this.renderAssignments();
        }
    }

    // Screen Management
    showScreen(screenId, direction = 'forward') {
        const targetScreenId = screenId + '-screen';
        
        // Prevent navigation to same screen
        if (this.currentScreen === targetScreenId) {
            return;
        }
        
        const screens = document.querySelectorAll('.screen');
        const targetScreen = document.getElementById(targetScreenId);
        
        if (!targetScreen) return;

        // Add to history if moving forward
        if (direction === 'forward') {
            this.screenHistory.push(this.currentScreen);
        }

        screens.forEach(screen => {
            screen.classList.remove('active', 'slide-out-left', 'slide-out-right');
            if (screen.id === this.currentScreen) {
                screen.classList.add(direction === 'forward' ? 'slide-out-left' : 'slide-out-right');
            }
        });

        setTimeout(() => {
            targetScreen.classList.add('active');
            this.currentScreen = targetScreenId;
            this.updateNavigation();
        }, 100);
    }

    goBack() {
        if (this.screenHistory.length > 0) {
            const previousScreen = this.screenHistory.pop();
            const screenId = previousScreen.replace('-screen', '');
            this.showScreen(screenId, 'backward');
        } else {
            this.showScreen('main', 'backward');
        }
    }

    updateNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => btn.classList.remove('active'));
        
        const screenMap = {
            'main-screen': 0,
            'all-assignments-screen': 1,
            'calendar-screen': 2,
            'settings-screen': 3
        };
        
        const activeIndex = screenMap[this.currentScreen];
        if (activeIndex !== undefined && navBtns[activeIndex]) {
            navBtns[activeIndex].classList.add('active');
        }
    }

    // Authentication
    async loginWithCanvas() {
        try {
            // Simulate Canvas login
            const canvasUser = {
                id: 'canvas_user_123',
                name: 'Student User',
                email: 'student@school.edu',
                provider: 'canvas',
                courses: ['Physics', 'Band', 'English', 'IM2']
            };
            
            this.currentUser = canvasUser;
            localStorage.setItem('currentUser', JSON.stringify(canvasUser));
            document.getElementById('account-info').textContent = `Logged in as ${canvasUser.name} (Canvas)`;
            
            await this.syncCanvasAssignments();
            this.showScreen('main');
        } catch (error) {
            console.error('Canvas login failed:', error);
            alert('Canvas login failed. Please try again.');
        }
    }

    async loginWithGoogle() {
        try {
            // Simulate Google Classroom login
            const googleUser = {
                id: 'google_user_123',
                name: 'Student User',
                email: 'student@gmail.com',
                provider: 'google',
                courses: ['Physics', 'Band', 'English', 'IM2']
            };
            
            this.currentUser = googleUser;
            localStorage.setItem('currentUser', JSON.stringify(googleUser));
            document.getElementById('account-info').textContent = `Logged in as ${googleUser.name} (Google)`;
            
            await this.syncGoogleClassroomAssignments();
            this.showScreen('main');
        } catch (error) {
            console.error('Google login failed:', error);
            alert('Google Classroom login failed. Please try again.');
        }
    }

    continueAsGuest() {
        const guestUser = {
            id: 'guest_user',
            name: 'Guest User',
            email: null,
            provider: 'guest',
            courses: ['Physics', 'Band', 'English', 'IM2']
        };
        
        this.currentUser = guestUser;
        localStorage.setItem('currentUser', JSON.stringify(guestUser));
        document.getElementById('account-info').textContent = 'Guest User';
        this.showScreen('main');
    }

    logout() {
        this.currentUser = null;
        this.assignments = [];
        localStorage.removeItem('currentUser');
        localStorage.removeItem('assignments');
        document.getElementById('account-info').textContent = 'Not logged in';
        this.showScreen('login');
        this.renderAssignments();
    }

    // Canvas API Integration
    async syncCanvasAssignments() {
        if (!this.currentUser || this.currentUser.provider !== 'canvas') return;
        
        try {
            // Real Canvas API integration
            const canvasApiUrl = localStorage.getItem('canvasApiUrl') || '';
            const canvasApiToken = localStorage.getItem('canvasApiToken') || '';
            
            if (!canvasApiUrl || !canvasApiToken) {
                alert('Please configure Canvas API settings in the Settings page.');
                return;
            }
            
            // Fetch courses first
            const coursesResponse = await fetch(`${canvasApiUrl}/api/v1/courses`, {
                headers: {
                    'Authorization': `Bearer ${canvasApiToken}`
                }
            });
            
            if (!coursesResponse.ok) {
                throw new Error('Failed to fetch courses from Canvas');
            }
            
            const courses = await coursesResponse.json();
            const targetCourses = courses.filter(course => 
                ['physics', 'band', 'english', 'im2'].some(target => 
                    course.name.toLowerCase().includes(target)
                )
            );
            
            const canvasAssignments = [];
            
            // Fetch assignments for each course
            for (const course of targetCourses) {
                const assignmentsResponse = await fetch(`${canvasApiUrl}/api/v1/courses/${course.id}/assignments`, {
                    headers: {
                        'Authorization': `Bearer ${canvasApiToken}`
                    }
                });
                
                if (assignmentsResponse.ok) {
                    const assignments = await assignmentsResponse.json();
                    assignments.forEach(assignment => {
                        if (assignment.due_at) {
                            canvasAssignments.push({
                                id: `canvas_${assignment.id}`,
                                title: assignment.name,
                                course: course.name,
                                dueDate: new Date(assignment.due_at),
                                description: assignment.description || '',
                                source: 'canvas',
                                completed: false,
                                originalId: assignment.id,
                                courseId: course.id
                            });
                        }
                    });
                }
            }
            
            // Remove existing Canvas assignments and add new ones
            this.assignments = this.assignments.filter(a => a.source !== 'canvas');
            this.assignments.push(...canvasAssignments);
            this.saveAssignments();
            this.renderAssignments();
            
            if (canvasAssignments.length === 0) {
                alert('No assignments found in your Canvas courses. Make sure you have assignments in Physics, Band, English, or IM2.');
            }
            
        } catch (error) {
            console.error('Failed to sync Canvas assignments:', error);
            alert('Canvas syncing failed. Please check your API configuration in Settings.');
        }
    }

    // Google Classroom API Integration
    async syncGoogleClassroomAssignments() {
        if (!this.currentUser || this.currentUser.provider !== 'google') return;
        
        try {
            // Real Google Classroom API integration
            const googleApiKey = localStorage.getItem('googleApiKey') || '';
            
            if (!googleApiKey) {
                alert('Please configure Google Classroom API settings in the Settings page.');
                return;
            }
            
            // Fetch courses from Google Classroom
            const coursesResponse = await fetch(`https://classroom.googleapis.com/v1/courses?key=${googleApiKey}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('googleAccessToken')}`
                }
            });
            
            if (!coursesResponse.ok) {
                throw new Error('Failed to fetch courses from Google Classroom');
            }
            
            const coursesData = await coursesResponse.json();
            const targetCourses = coursesData.courses?.filter(course => 
                ['physics', 'band', 'english', 'im2'].some(target => 
                    course.name.toLowerCase().includes(target)
                )
            ) || [];
            
            const googleAssignments = [];
            
            // Fetch coursework for each course
            for (const course of targetCourses) {
                const courseworkResponse = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?key=${googleApiKey}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('googleAccessToken')}`
                    }
                });
                
                if (courseworkResponse.ok) {
                    const courseworkData = await courseworkResponse.json();
                    courseworkData.courseWork?.forEach(work => {
                        if (work.dueDate) {
                            const dueDate = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
                            if (work.dueTime) {
                                dueDate.setHours(work.dueTime.hours || 23, work.dueTime.minutes || 59);
                            }
                            
                            googleAssignments.push({
                                id: `google_${work.id}`,
                                title: work.title,
                                course: course.name,
                                dueDate: dueDate,
                                description: work.description || '',
                                source: 'google',
                                completed: false,
                                originalId: work.id,
                                courseId: course.id
                            });
                        }
                    });
                }
            }
            
            // Remove existing Google assignments and add new ones
            this.assignments = this.assignments.filter(a => a.source !== 'google');
            this.assignments.push(...googleAssignments);
            this.saveAssignments();
            this.renderAssignments();
            
            if (googleAssignments.length === 0) {
                alert('No assignments found in your Google Classroom courses. Make sure you have assignments in Physics, Band, English, or IM2.');
            }
            
        } catch (error) {
            console.error('Failed to sync Google Classroom assignments:', error);
            alert('Google Classroom syncing failed. Please check your API configuration in Settings.');
        }
    }

    // Assignment Management
    createAssignment() {
        // Check if user can create more assignments
        if (!window.paymentManager.canCreateAssignment()) {
            alert(window.paymentManager.getUpgradeMessage('assignment_limit'));
            return;
        }

        const title = document.getElementById('assignment-title').value.trim();
        const course = document.getElementById('assignment-course').value;
        const dueDate = document.getElementById('assignment-due-date').value;
        const description = document.getElementById('assignment-description').value.trim();
        const tags = this.currentTags || [];

        if (!title || !course || !dueDate) {
            alert('Please fill in all required fields');
            return;
        }

        const assignment = {
            id: 'custom_' + Date.now(),
            title,
            course,
            dueDate,
            description,
            tags,
            completed: false,
            source: 'custom',
            createdAt: new Date().toISOString()
        };

        this.assignments.push(assignment);
        this.saveAssignments();
        this.renderAssignments();

        // Clear form
        document.getElementById('assignment-title').value = '';
        document.getElementById('assignment-course').value = '';
        document.getElementById('assignment-due-date').value = '';
        document.getElementById('assignment-description').value = '';
        this.currentTags = [];
        this.renderTags();

        // Show success message
        alert('Assignment created successfully!');
        
        // Go back to main screen
        this.showScreen('main');
    }

    // Tags Management
    addTag() {
        const input = document.getElementById('assignment-tags-input');
        const tagText = input.value.trim();
        
        if (!tagText) return;
        
        if (!this.currentTags) this.currentTags = [];
        
        if (!this.currentTags.includes(tagText)) {
            this.currentTags.push(tagText);
            this.renderTags();
        }
        
        input.value = '';
    }

    removeTag(tagText) {
        if (!this.currentTags) return;
        
        this.currentTags = this.currentTags.filter(tag => tag !== tagText);
        this.renderTags();
    }

    renderTags() {
        const tagsList = document.getElementById('assignment-tags-list');
        if (!tagsList) return;
        
        tagsList.innerHTML = '';
        
        if (this.currentTags && this.currentTags.length > 0) {
            this.currentTags.forEach(tag => {
                const tagElement = document.createElement('div');
                tagElement.className = 'tag';
                tagElement.innerHTML = `
                    <span>${tag}</span>
                    <span class="remove-tag" onclick="app.removeTag('${tag}')">×</span>
                `;
                tagsList.appendChild(tagElement);
            });
        }
    }

    deleteAssignment(assignmentId) {
        const assignment = this.assignments.find(a => a.id === assignmentId);
        if (assignment && assignment.source === 'custom') {
            if (confirm('Are you sure you want to delete this assignment?')) {
                this.assignments = this.assignments.filter(a => a.id !== assignmentId);
                this.saveAssignments();
                this.renderAssignments();
            }
        }
    }

    toggleAssignment(assignmentId) {
        const assignment = this.assignments.find(a => a.id === assignmentId);
        if (assignment) {
            assignment.completed = !assignment.completed;
            assignment.completedAt = assignment.completed ? new Date() : null;
            this.saveAssignments();
            this.renderAssignments();
        }
    }

    categorizeAssignments() {
        const now = new Date();
        const categories = {
            highPriority: [],
            comingUp: [],
            worryLater: [],
            completed: []
        };
        
        this.assignments.forEach(assignment => {
            if (assignment.completed) {
                categories.completed.push(assignment);
                return;
            }
            
            const daysUntilDue = Math.ceil((assignment.dueDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue <= 4) {
                categories.highPriority.push(assignment);
            } else if (daysUntilDue <= 14) {
                categories.comingUp.push(assignment);
            } else {
                categories.worryLater.push(assignment);
            }
        });
        
        return categories;
    }

    renderAssignments() {
        const categories = this.categorizeAssignments();
        
        this.renderAssignmentSection('high-priority-assignments', categories.highPriority, 'high-priority');
        this.renderAssignmentSection('coming-up-assignments', categories.comingUp, 'coming-up');
        this.renderAssignmentSection('worry-later-assignments', categories.worryLater, 'worry-later');
        this.renderAssignmentSection('completed-assignments', categories.completed, 'completed');
        
        // Render all assignments page
        const allAssignments = [...categories.highPriority, ...categories.comingUp, ...categories.worryLater, ...categories.completed];
        this.renderAssignmentSection('all-assignments-list', allAssignments, 'all');
    }

    renderAssignmentSection(containerId, assignments, category) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (assignments.length === 0) {
            container.innerHTML = '<p class="no-assignments">No assignments in this category</p>';
            return;
        }
        
        assignments.forEach(assignment => {
            const card = this.createAssignmentCard(assignment, category);
            container.appendChild(card);
        });
    }

    createAssignmentCard(assignment, category) {
        const card = document.createElement('div');
        card.className = `assignment-card ${category} fade-in`;
        if (assignment.completed) card.classList.add('completed');
        
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        let dueDateText = '';
        if (assignment.completed) {
            dueDateText = 'Completed';
        } else if (daysUntilDue < 0) {
            dueDateText = `Overdue by ${Math.abs(daysUntilDue)} day(s)`;
        } else if (daysUntilDue === 0) {
            dueDateText = 'Due today';
        } else if (daysUntilDue === 1) {
            dueDateText = 'Due tomorrow';
        } else {
            dueDateText = `Due in ${daysUntilDue} day(s)`;
        }
        
        card.innerHTML = `
            <div class="assignment-source ${assignment.source}"></div>
            <div class="assignment-header">
                <div class="assignment-checkbox ${assignment.completed ? 'checked' : ''}" 
                     onclick="app.toggleAssignment('${assignment.id}')"></div>
                <div class="assignment-content">
                    <div class="assignment-title">${assignment.title}</div>
                    <div class="assignment-meta">
                        <span class="assignment-course">${assignment.course}</span>
                        <span class="assignment-due">${dueDateText}</span>
                    </div>
                    ${assignment.tags && assignment.tags.length > 0 ? `
                        <div class="assignment-tags">
                            ${assignment.tags.map(tag => `<span class="assignment-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${assignment.description ? `<div class="assignment-description">${assignment.description}</div>` : ''}
                </div>
            </div>
            ${assignment.source === 'custom' ? `
                <div class="assignment-actions">
                    <button class="delete-btn" onclick="app.deleteAssignment('${assignment.id}')">Delete</button>
                </div>
            ` : ''}
        `;
        
        return card;
    }

    // Calendar functionality
    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthElement = document.getElementById('current-month');
        
        if (!calendarGrid || !currentMonthElement) return;
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        currentMonthElement.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        
        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            calendarGrid.appendChild(header);
        });
        
        // Add calendar days
        const currentDate = new Date(startDate);
        for (let i = 0; i < 42; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = currentDate.getDate();
            
            if (currentDate.getMonth() !== this.currentMonth) {
                dayElement.classList.add('other-month');
            }
            
            if (this.isToday(currentDate)) {
                dayElement.classList.add('today');
            }
            
            const assignmentsOnDay = this.getAssignmentsForDate(currentDate);
            if (assignmentsOnDay.length > 0) {
                dayElement.classList.add('has-assignments');
                this.addCalendarDayEvents(dayElement, assignmentsOnDay);
            }
            
            calendarGrid.appendChild(dayElement);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getAssignmentsForDate(date) {
        return this.assignments.filter(assignment => {
            const assignmentDate = new Date(assignment.dueDate);
            return assignmentDate.toDateString() === date.toDateString();
        });
    }

    addCalendarDayEvents(dayElement, assignments) {
        let touchTimer;
        
        dayElement.addEventListener('touchstart', (e) => {
            touchTimer = setTimeout(() => {
                this.showAssignmentTooltip(e, assignments);
            }, 500);
        });
        
        dayElement.addEventListener('touchend', () => {
            clearTimeout(touchTimer);
        });
        
        dayElement.addEventListener('mouseenter', (e) => {
            this.showAssignmentTooltip(e, assignments);
        });
        
        dayElement.addEventListener('mouseleave', () => {
            this.hideAssignmentTooltip();
        });
    }

    showAssignmentTooltip(event, assignments) {
        const tooltip = document.getElementById('assignment-tooltip');
        const tooltipContent = tooltip.querySelector('.tooltip-content');
        
        tooltipContent.innerHTML = assignments.map(assignment => 
            `<div><strong>${assignment.title}</strong><br><small>${assignment.course}</small></div>`
        ).join('<hr>');
        
        tooltip.classList.remove('hidden');
        
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
    }

    hideAssignmentTooltip() {
        const tooltip = document.getElementById('assignment-tooltip');
        tooltip.classList.add('hidden');
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.renderCalendar();
    }

    // Settings Management
    loadSettings() {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
    }

    applySettings() {
        // Apply dark mode
        if (this.settings.darkMode) {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('dark-mode-toggle').checked = true;
        } else {
            document.body.removeAttribute('data-theme');
            document.getElementById('dark-mode-toggle').checked = false;
        }
        
        // Apply color theme
        this.applyColorTheme(this.settings.colorTheme);
        
        // Apply background
        this.applyBackground();
        
        // Apply notifications setting
        document.getElementById('notifications-toggle').checked = this.settings.notifications;
        
        // Apply reminder time
        document.getElementById('reminder-time').value = this.settings.reminderTime;
        
        // Apply background setting
        document.getElementById('background-select').value = this.settings.background;
    }

    toggleDarkMode() {
        this.settings.darkMode = !this.settings.darkMode;
        this.saveSettings();
        this.applySettings();
    }

    setTheme(theme) {
        // Check if premium theme requires subscription
        const premiumThemes = ['ocean', 'sunset', 'forest', 'royal'];
        if (premiumThemes.includes(theme) && !window.paymentManager.hasFeature('custom_themes')) {
            alert(window.paymentManager.getUpgradeMessage('custom_themes'));
            return;
        }
        
        this.settings.theme = theme;
        this.saveSettings();
        
        // Apply theme class to body
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        if (theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }
        
        // Update background with theme gradient if premium theme
        if (premiumThemes.includes(theme)) {
            this.applyBackground();
        }
    }

    setColorTheme(theme) {
        this.settings.colorTheme = theme;
        this.saveSettings();
        this.applyColorTheme(theme);
        
        // Update active color option
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-color="${theme}"]`).classList.add('active');
    }

    applyColorTheme(theme) {
        const themes = {
            blue: { primary: '#6366f1', secondary: '#8b5cf6' },
            purple: { primary: '#a855f7', secondary: '#c084fc' },
            green: { primary: '#10b981', secondary: '#34d399' },
            orange: { primary: '#f59e0b', secondary: '#fbbf24' }
        };
        
        const selectedTheme = themes[theme] || themes.blue;
        document.documentElement.style.setProperty('--primary-color', selectedTheme.primary);
        document.documentElement.style.setProperty('--secondary-color', selectedTheme.secondary);
    }

    setCustomColor() {
        const color = document.getElementById('custom-color').value;
        document.documentElement.style.setProperty('--primary-color', color);
        this.settings.customColor = color;
        this.saveSettings();
    }

    setBackground() {
        const background = document.getElementById('background-select').value;
        this.settings.background = background;
        this.saveSettings();
        this.applyBackground();
        
        if (background === 'image') {
            document.getElementById('background-image').click();
        }
    }

    applyBackground() {
        const body = document.body;
        
        // Force immediate background application
        switch (this.settings.background) {
            case 'gradient':
                body.style.setProperty('background', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'important');
                break;
            case 'solid':
                const solidColor = this.settings.darkMode ? '#0f172a' : '#ffffff';
                body.style.setProperty('background', solidColor, 'important');
                break;
            case 'image':
                if (this.settings.backgroundImage) {
                    body.style.setProperty('background', `url(${this.settings.backgroundImage}) center/cover no-repeat fixed`, 'important');
                }
                break;
        }
        
        // Force background properties
        body.style.setProperty('background-attachment', 'fixed', 'important');
        body.style.setProperty('background-size', 'cover', 'important');
        body.style.setProperty('background-position', 'center', 'important');
        
        // Trigger reflow to ensure immediate application
        body.offsetHeight;
    }

    setBackgroundImage() {
        const file = document.getElementById('background-image').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.settings.backgroundImage = e.target.result;
                this.saveSettings();
                this.applyBackground();
            };
            reader.readAsDataURL(file);
        }
    }

    toggleNotifications() {
        this.settings.notifications = !this.settings.notifications;
        this.saveSettings();
        
        if (this.settings.notifications && 'Notification' in window) {
            Notification.requestPermission();
        }
    }

    // Data Management
    loadAssignments() {
        const savedAssignments = localStorage.getItem('assignments');
        if (savedAssignments) {
            this.assignments = JSON.parse(savedAssignments).map(assignment => ({
                ...assignment,
                dueDate: new Date(assignment.dueDate),
                createdAt: assignment.createdAt ? new Date(assignment.createdAt) : new Date(),
                completedAt: assignment.completedAt ? new Date(assignment.completedAt) : null
            }));
        }
    }

    saveAssignments() {
        localStorage.setItem('assignments', JSON.stringify(this.assignments));
    }

    filterAssignments() {
        const courseFilter = document.getElementById('course-filter').value;
        const allAssignmentsList = document.getElementById('all-assignments-list');
        
        let filteredAssignments = this.assignments;
        if (courseFilter) {
            filteredAssignments = this.assignments.filter(a => a.course.toLowerCase() === courseFilter);
        }
        
        this.renderAssignmentSection('all-assignments-list', filteredAssignments, 'all');
    }

    async syncAllAssignments() {
        if (!this.currentUser) return;
        
        try {
            if (this.currentUser.provider === 'canvas') {
                await this.syncCanvasAssignments();
            } else if (this.currentUser.provider === 'google') {
                await this.syncGoogleClassroomAssignments();
            }
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Failed to sync assignments. Please check your connection and try again.');
        }
    }

    setupEventListeners() {
        // Set up service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Tags input event listener
        const tagsInput = document.getElementById('assignment-tags-input');
        if (tagsInput) {
            tagsInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addTag();
                }
            });
        }
    }
}

// Global functions for HTML onclick handlers
function showScreen(screenId) {
    app.showScreen(screenId);
}

function login() {
    app.login();
}

function logout() {
    app.logout();
}

function createAssignment() {
    app.createAssignment();
}

function addTag() {
    app.addTag();
}

function removeTag(index) {
    app.removeTag(index);
}

function toggleAssignment(id) {
    app.toggleAssignment(id);
}

function deleteAssignment(id) {
    app.deleteAssignment(id);
}

function syncCanvas() {
    app.syncCanvas();
}

function syncGoogle() {
    app.syncGoogle();
}

function toggleDarkMode() {
    app.toggleDarkMode();
}

function setTheme(theme) {
    app.setTheme(theme);
}

function setBackground(background) {
    app.setBackground(background);
}

function setBackgroundImage() {
    app.setBackgroundImage();
}

function toggleNotifications() {
    app.toggleNotifications();
}

function filterAssignments(course) {
    app.filterAssignments(course);
}

// Payment functions
function upgradeToPremium() {
    window.paymentManager.createCheckoutSession('premium');
}

function upgradeToPro() {
    window.paymentManager.createCheckoutSession('pro');
}

function cancelSubscription() {
    if (confirm('Are you sure you want to cancel your subscription?')) {
        window.paymentManager.cancelSubscription();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AssignmentTracker();
    updateSubscriptionUI();
});

function updateSubscriptionUI() {
    const tier = window.paymentManager.getCurrentTier();
    const planName = document.querySelector('.plan-name');
    const planFeatures = document.querySelector('.plan-features');
    
    if (planName) {
        planName.textContent = tier.name + ' Plan';
    }
    
    if (planFeatures) {
        const features = tier.features.slice(0, 3).join(' • ');
        planFeatures.textContent = features;
    }
    
    // Update tier buttons
    document.querySelectorAll('.tier-btn').forEach(btn => {
        btn.classList.remove('current-tier');
        btn.disabled = false;
        btn.textContent = 'Upgrade';
    });
    
    const currentTierBtn = document.querySelector(`.${window.paymentManager.currentTier}-tier .tier-btn`);
    if (currentTierBtn) {
        currentTierBtn.classList.add('current-tier');
        currentTierBtn.disabled = true;
        currentTierBtn.textContent = 'Current Plan';
    }
    
    // Show/hide cancel subscription button
    const manageSubscription = document.getElementById('manage-subscription');
    if (manageSubscription) {
        manageSubscription.style.display = window.paymentManager.currentTier !== 'free' ? 'block' : 'none';
    }
}

function configureCanvas() {
    const apiUrl = prompt('Enter your Canvas API URL (e.g., https://yourschool.instructure.com):');
    const apiToken = prompt('Enter your Canvas API token:');
    
    if (apiUrl && apiToken) {
        localStorage.setItem('canvasApiUrl', apiUrl);
        localStorage.setItem('canvasApiToken', apiToken);
        alert('Canvas API configured successfully! You can now sync assignments.');
    }
}

function configureGoogleClassroom() {
    const apiKey = prompt('Enter your Google API key:');
    const accessToken = prompt('Enter your Google access token:');
    
    if (apiKey && accessToken) {
        localStorage.setItem('googleApiKey', apiKey);
        localStorage.setItem('googleAccessToken', accessToken);
        alert('Google Classroom API configured successfully! You can now sync assignments.');
    }
}

function syncAllAssignments() {
    app.syncAllAssignments();
}

function logout() {
    app.logout();
}

function filterAssignments() {
    app.filterAssignments();
}

function previousMonth() {
    app.previousMonth();
}

function nextMonth() {
    app.nextMonth();
}

// Initialize the app
const app = new AssignmentTracker();

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssignmentTracker;
}
