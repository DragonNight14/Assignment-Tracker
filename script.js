class AssignmentTracker {
    constructor() {
        this.assignments = JSON.parse(localStorage.getItem('assignments')) || [];
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.currentView = 'home';
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.completionStreak = parseInt(localStorage.getItem('completionStreak')) || 0;
        this.lastCompletionDate = localStorage.getItem('lastCompletionDate');
        this.pipMarker = null;
        this.pipTimeout = null;
        this.notificationQueue = [];
        
        // API Integration status
        this.canvasConnected = localStorage.getItem('canvasConnected') === 'true';
        this.googleConnected = localStorage.getItem('googleConnected') === 'true';
        
        // Apply saved styles immediately to prevent white flash
        this.applySavedStylesImmediate();
        
        this.init();
    }

    applySavedStylesImmediate() {
        const primaryColor = localStorage.getItem('primary-color') || '#667eea';
        const secondaryColor = localStorage.getItem('secondary-color') || '#764ba2';
        const accentColor = localStorage.getItem('accent-color') || '#f59e0b';
        const backgroundType = localStorage.getItem('background-type') || 'gradient';

        // Set CSS variables immediately
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        document.documentElement.style.setProperty('--accent-color', accentColor);

        // Apply background immediately
        this.applyBackground(backgroundType);
    }

    async init() {
        if ('serviceWorker' in navigator && 'Notification' in window) {
            try {
                await navigator.serviceWorker.register('./sw.js');
                
                if (Notification.permission === 'default') {
                    await Notification.requestPermission();
                }
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }

        this.setupEventListeners();
        this.renderCurrentView();
        this.updateStatistics();
    }

    setupEventListeners() {
        this.initializeEventListeners();
    }

    renderCurrentView() {
        this.renderPriorityAssignments();
        this.renderAllAssignments();
        this.renderCalendar();
    }

    // Add the missing renderAssignments method
    renderAssignments() {
        this.renderPriorityAssignments();
        this.updateStatistics();
    }

    initializeEventListeners() {
        // Navigation
        document.getElementById('home-btn').addEventListener('click', () => {
            this.setActiveNav('home-btn');
            this.switchToView('home-view');
        });

        document.getElementById('all-assignments-btn').addEventListener('click', () => {
            this.setActiveNav('all-assignments-btn');
            this.switchToView('all-view');
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.setActiveNav('settings-btn');
            this.showSettingsView();
        });

        document.getElementById('calendar-btn').addEventListener('click', () => {
            this.setActiveNav('calendar-btn');
            this.switchToView('calendar-view');
        });

        // Calendar navigation
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentMonth--;
                if (this.currentMonth < 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                }
                this.renderCalendar();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.currentMonth++;
                if (this.currentMonth > 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                }
                this.renderCalendar();
            });
        }

        // Create assignment button
        const createBtn = document.getElementById('create-assignment-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                window.location.href = 'create-assignment.html';
            });
        }

        // Search and filter functionality
        this.initializeSearchAndFilter();
    }

    initializeSearchAndFilter() {
        const searchInput = document.getElementById('assignment-search');
        const statusFilter = document.getElementById('status-filter');
        const sourceFilter = document.getElementById('source-filter');
        const priorityFilter = document.getElementById('priority-filter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterAssignments());
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterAssignments());
        }

        if (sourceFilter) {
            sourceFilter.addEventListener('change', () => this.filterAssignments());
        }

        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => this.filterAssignments());
        }
    }

    filterAssignments() {
        const searchTerm = document.getElementById('assignment-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('status-filter')?.value || 'all';
        const sourceFilter = document.getElementById('source-filter')?.value || 'all';
        const priorityFilter = document.getElementById('priority-filter')?.value || 'all';

        let filteredAssignments = this.assignments.filter(assignment => {
            // Search filter
            const matchesSearch = assignment.title.toLowerCase().includes(searchTerm) ||
                                assignment.description.toLowerCase().includes(searchTerm) ||
                                (assignment.courseName && assignment.courseName.toLowerCase().includes(searchTerm));

            // Status filter
            const matchesStatus = statusFilter === 'all' ||
                                (statusFilter === 'completed' && assignment.completed) ||
                                (statusFilter === 'pending' && !assignment.completed);

            // Source filter
            const assignmentSource = assignment.source || 'manual';
            const matchesSource = sourceFilter === 'all' || assignmentSource === sourceFilter;

            // Priority filter
            const assignmentPriority = this.getPriorityCategory(assignment.dueDate);
            const matchesPriority = priorityFilter === 'all' ||
                                  (priorityFilter === 'high' && assignmentPriority === 'high-priority') ||
                                  (priorityFilter === 'medium' && assignmentPriority === 'coming-up') ||
                                  (priorityFilter === 'low' && assignmentPriority === 'worry-later');

            return matchesSearch && matchesStatus && matchesSource && matchesPriority;
        });

        this.renderFilteredAssignments(filteredAssignments);
    }

    renderFilteredAssignments(filteredAssignments) {
        const allAssignmentsContainer = document.getElementById('all-assignments');
        if (!allAssignmentsContainer) return;

        allAssignmentsContainer.innerHTML = '';

        if (filteredAssignments.length === 0) {
            allAssignmentsContainer.innerHTML = `
                <div class="no-assignments">
                    <p>🔍 No assignments match your search criteria</p>
                </div>
            `;
            return;
        }

        // Sort by due date
        filteredAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        filteredAssignments.forEach(assignment => {
            const card = this.createAssignmentCard(assignment);
            allAssignmentsContainer.appendChild(card);
        });
    }

    toggleAssignment(id) {
        const assignment = this.assignments.find(a => a.id === id);
        if (assignment) {
            // Find the checkbox element
            const checkbox = document.querySelector(`[data-id="${id}"] .assignment-checkbox`);
            if (checkbox) {
                // Add loading state
                checkbox.classList.add('loading');
                
                // Simulate a brief delay for better UX
                setTimeout(() => {
                    assignment.completed = !assignment.completed;
                    this.saveAssignments();
                    this.renderAssignments();
                    
                    // Show notification
                    const status = assignment.completed ? 'completed' : 'marked as incomplete';
                    this.showNotification(`Assignment "${assignment.title}" ${status}`);
                }, 150);
            } else {
                // Fallback if checkbox not found
                assignment.completed = !assignment.completed;
                this.saveAssignments();
                this.renderAssignments();
            }
        }
    }

    deleteAssignment(id) {
        const assignment = this.assignments.find(a => a.id === id);
        if (!assignment) return;

        // Only allow deletion of manually created assignments
        if (assignment.source && assignment.source !== 'manual') {
            alert('Cannot delete assignments from Canvas or Google Classroom. These are synced from your courses.');
            return;
        }

        if (confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
            this.assignments = this.assignments.filter(a => a.id !== id);
            this.saveAssignments();
            this.renderAssignments();
            this.showNotification('Assignment deleted');
        }
    }

    getPriorityCategory(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 4) {
            return 'high-priority';
        } else if (diffDays <= 10) {
            return 'coming-up';
        } else {
            return 'worry-later';
        }
    }

    formatDueDate(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `Overdue by ${Math.abs(diffDays)} day(s)`;
        } else if (diffDays === 0) {
            return 'Due today';
        } else if (diffDays === 1) {
            return 'Due tomorrow';
        } else {
            return `Due in ${diffDays} day(s)`;
        }
    }

    createAssignmentCard(assignment) {
        const card = document.createElement('div');
        card.className = `assignment-card ${assignment.completed ? 'completed' : ''}`;
        card.setAttribute('data-id', assignment.id);
        card.style.borderLeftColor = assignment.color;

        const dueDateClass = assignment.completed ? '' : this.getPriorityCategory(assignment.dueDate);
        const sourceIcon = this.getSourceIcon(assignment.source);
        const isManual = !assignment.source || assignment.source === 'manual';
        
        card.innerHTML = `
            <div class="assignment-header">
                <div class="assignment-checkbox ${assignment.completed ? 'checked' : ''}" 
                     onclick="tracker.toggleAssignment('${assignment.id}')"
                     role="checkbox"
                     aria-checked="${assignment.completed}"
                     aria-label="${assignment.completed ? 'Mark as incomplete' : 'Mark as complete'}: ${assignment.title}"
                     tabindex="0"
                     onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tracker.toggleAssignment('${assignment.id}'); }">
                </div>
                <div class="assignment-title">${assignment.title}</div>
                <div class="assignment-actions">
                    ${sourceIcon ? `<div class="assignment-source" title="Source: ${assignment.source || 'Manual'}">${sourceIcon}</div>` : ''}
                    ${isManual ? `<div class="assignment-delete" title="Delete assignment" onclick="tracker.deleteAssignment('${assignment.id}')">🗑️</div>` : ''}
                </div>
            </div>
            ${assignment.description ? `<div class="assignment-description">${assignment.description}</div>` : ''}
            <div class="assignment-due-date ${dueDateClass}">
                ${this.formatDueDate(assignment.dueDate)}
            </div>
        `;

        return card;
    }

    getSourceIcon(source) {
        switch (source) {
            case 'canvas':
                return '🎨';
            case 'google':
                return '📖';
            default:
                return '📝';
        }
    }

    updateStatistics() {
        // Only count active assignments (not completed) since completed section is hidden
        const activeAssignments = this.assignments.filter(a => !a.completed);
        const totalAssignments = activeAssignments.length;
        const completedAssignments = this.assignments.filter(a => a.completed).length;
        const pendingAssignments = totalAssignments;
        const overdueAssignments = activeAssignments.filter(a => {
            const dueDate = new Date(a.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDate < today;
        }).length;

        // Update stat numbers
        const totalElement = document.getElementById('total-assignments');
        const completedElement = document.getElementById('completed-count');
        const pendingElement = document.getElementById('pending-count');
        const overdueElement = document.getElementById('overdue-count');

        if (totalElement) totalElement.textContent = totalAssignments;
        if (completedElement) completedElement.textContent = completedAssignments;
        if (pendingElement) pendingElement.textContent = pendingAssignments;
        if (overdueElement) overdueElement.textContent = overdueAssignments;

        // Update progress bar - show completion rate of all assignments
        const allAssignments = this.assignments.length;
        const progressPercentage = allAssignments > 0 ? Math.round((completedAssignments / allAssignments) * 100) : 0;
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-percentage');

        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${progressPercentage}%`;
        }
    }

    renderPriorityAssignments() {
        const highPriorityContainer = document.getElementById('high-priority-assignments');
        const comingUpContainer = document.getElementById('coming-up-assignments');
        const worryLaterContainer = document.getElementById('worry-later-assignments');
        const completedContainer = document.getElementById('completed-assignments');

        // Clear containers
        [highPriorityContainer, comingUpContainer, worryLaterContainer, completedContainer].forEach(container => {
            if (container) container.innerHTML = '';
        });

        this.assignments.forEach(assignment => {
            const card = this.createAssignmentCard(assignment);
            
            if (assignment.completed) {
                // Skip completed assignments since the section is hidden
                return;
            } else {
                const category = this.getPriorityCategory(assignment.dueDate);
                if (category === 'high-priority' && highPriorityContainer) {
                    highPriorityContainer.appendChild(card.cloneNode(true));
                } else if (category === 'coming-up' && comingUpContainer) {
                    comingUpContainer.appendChild(card.cloneNode(true));
                } else if (category === 'worry-later' && worryLaterContainer) {
                    // Skip worry-later assignments since the section is hidden
                    return;
                }
            }
        });

        this.updateEmptyStates();
    }

    renderAllAssignments() {
        const allContainer = document.getElementById('all-assignments');
        if (!allContainer) return;

        allContainer.innerHTML = '';
        
        // Sort assignments by due date
        const sortedAssignments = [...this.assignments].sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
        
        sortedAssignments.forEach(assignment => {
            const card = this.createAssignmentCard(assignment);
            allContainer.appendChild(card);
        });
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;

        const monthYear = document.getElementById('calendar-month-year');
        if (monthYear) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            monthYear.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }

        calendarGrid.innerHTML = '';

        // Get first day of month and number of days
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayAssignments = this.assignments.filter(a => a.dueDate === dateStr && !a.completed);
            
            dayElement.innerHTML = `
                <div class="calendar-day-number">${day}</div>
                ${dayAssignments.length > 0 ? `<div class="calendar-assignment-count">${dayAssignments.length}</div>` : ''}
            `;

            if (dayAssignments.length > 0) {
                dayElement.addEventListener('click', () => this.showCalendarPopup(dateStr, dayAssignments));
            }

            calendarGrid.appendChild(dayElement);
        }
    }

    showCalendarPopup(date, assignments) {
        const popup = document.createElement('div');
        popup.className = 'calendar-popup';
        popup.innerHTML = `
            <div class="popup-header">
                <h3>Assignments due ${new Date(date).toLocaleDateString()}</h3>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="popup-assignments">
                ${assignments.map(a => `
                    <div class="popup-assignment">
                        <strong>${a.title}</strong>
                        <p>${a.description || 'No description'}</p>
                    </div>
                `).join('')}
            </div>
        `;
        document.body.appendChild(popup);
        
        // Add click outside to close
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    }

    updateEmptyStates() {
        const sections = [
            { id: 'high-priority-assignments', message: 'No urgent assignments' },
            { id: 'coming-up-assignments', message: 'No upcoming assignments' },
            { id: 'all-assignments-list', message: 'No assignments yet. Create one or connect to Canvas/Google Classroom.' }
        ];

        sections.forEach(section => {
            const container = document.getElementById(section.id);
            if (container && container.children.length === 0) {
                container.innerHTML = `<div class="empty-state">${section.message}</div>`;
            }
        });
    }

    setActiveNav(activeId) {
        document.querySelectorAll('.nav-btn').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById(activeId).classList.add('active');
    }

    switchToView(targetViewId) {
        const currentView = document.querySelector('.content-view:not([style*="display: none"])');
        const targetView = document.getElementById(targetViewId);
        
        if (!targetView || currentView === targetView) return;

        // Slide out current view
        if (currentView) {
            currentView.classList.add('slide-out-left');
            setTimeout(() => {
                currentView.style.display = 'none';
                currentView.classList.remove('slide-out-left');
            }, 400);
        }

        // Slide in target view
        setTimeout(() => {
            targetView.style.display = 'block';
            targetView.classList.add('slide-in-right');
            setTimeout(() => {
                targetView.classList.remove('slide-in-right');
            }, 400);
        }, 200);
    }

    showSettingsView() {
        this.switchToView('settings-view');
        this.renderSettingsPage();
    }

    renderSettingsPage() {
        const settingsContainer = document.getElementById('settings-content');
        if (!settingsContainer) return;

        settingsContainer.innerHTML = `
            <section class="priority-section">
                <h2>⚙️ Settings</h2>
                
                <div class="settings-section">
                    <h3>🔗 API Integrations</h3>
                    <div class="integration-item">
                        <div class="integration-info">
                            <strong>Canvas LMS</strong>
                            <span id="canvas-status" class="status">Not connected</span>
                        </div>
                        <button id="canvas-settings-btn" class="btn btn-secondary">Connect</button>
                    </div>
                    <div class="integration-item">
                        <div class="integration-info">
                            <strong>Google Classroom</strong>
                            <span id="google-status" class="status">Not connected</span>
                        </div>
                        <button id="google-settings-btn" class="btn btn-secondary">Connect</button>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>🎨 Appearance</h3>
                    <div class="setting-item">
                        <label for="dark-mode">Dark Mode</label>
                        <input type="checkbox" id="dark-mode">
                    </div>
                </div>

                <div class="settings-section">
                    <h3>🎨 Color Themes</h3>
                    
                    <div class="color-palettes">
                        <h4>Quick Palettes</h4>
                        <div class="palette-grid">
                            <div class="palette-option" data-palette="ocean" onclick="tracker.applyColorPalette('ocean')">
                                <div class="palette-preview">
                                    <div class="color-dot" style="background: #0ea5e9"></div>
                                    <div class="color-dot" style="background: #06b6d4"></div>
                                    <div class="color-dot" style="background: #0891b2"></div>
                                </div>
                                <span>Ocean</span>
                            </div>
                            <div class="palette-option" data-palette="sunset" onclick="tracker.applyColorPalette('sunset')">
                                <div class="palette-preview">
                                    <div class="color-dot" style="background: #f97316"></div>
                                    <div class="color-dot" style="background: #ea580c"></div>
                                    <div class="color-dot" style="background: #dc2626"></div>
                                </div>
                                <span>Sunset</span>
                            </div>
                            <div class="palette-option" data-palette="forest" onclick="tracker.applyColorPalette('forest')">
                                <div class="palette-preview">
                                    <div class="color-dot" style="background: #16a34a"></div>
                                    <div class="color-dot" style="background: #15803d"></div>
                                    <div class="color-dot" style="background: #166534"></div>
                                </div>
                                <span>Forest</span>
                            </div>
                            <div class="palette-option" data-palette="lavender" onclick="tracker.applyColorPalette('lavender')">
                                <div class="palette-preview">
                                    <div class="color-dot" style="background: #8b5cf6"></div>
                                    <div class="color-dot" style="background: #7c3aed"></div>
                                    <div class="color-dot" style="background: #6d28d9"></div>
                                </div>
                                <span>Lavender</span>
                            </div>
                            <div class="palette-option" data-palette="rose" onclick="tracker.applyColorPalette('rose')">
                                <div class="palette-preview">
                                    <div class="color-dot" style="background: #f43f5e"></div>
                                    <div class="color-dot" style="background: #e11d48"></div>
                                    <div class="color-dot" style="background: #be123c"></div>
                                </div>
                                <span>Rose</span>
                            </div>
                            <div class="palette-option" data-palette="midnight" onclick="tracker.applyColorPalette('midnight')">
                                <div class="palette-preview">
                                    <div class="color-dot" style="background: #1e293b"></div>
                                    <div class="color-dot" style="background: #334155"></div>
                                    <div class="color-dot" style="background: #475569"></div>
                                </div>
                                <span>Midnight</span>
                            </div>
                        </div>
                    </div>

                    <div class="custom-colors">
                        <h4>Custom Colors</h4>
                        <div class="color-inputs">
                            <div class="control-group">
                                <label for="primary-color">Primary Color</label>
                                <input type="color" id="primary-color" value="#6366f1">
                            </div>
                            <div class="control-group">
                                <label for="secondary-color">Secondary Color</label>
                                <input type="color" id="secondary-color" value="#8b5cf6">
                            </div>
                            <div class="control-group">
                                <label for="accent-color">Accent Color</label>
                                <input type="color" id="accent-color" value="#f59e0b">
                            </div>
                        </div>
                    </div>

                    <div class="background-options">
                        <h4>Background</h4>
                        <div class="background-selector">
                            <select id="background-type">
                                <option value="gradient">Gradient</option>
                                <option value="pattern">Pattern</option>
                                <option value="image">Custom Image</option>
                                <option value="solid">Solid Color</option>
                            </select>
                            <input type="file" id="background-image" accept="image/*" style="display: none;">
                            <input type="color" id="background-color" value="#0f172a" style="display: none;">
                            <button class="btn btn-secondary" id="upload-bg-btn" style="display: none;">Upload Image</button>
                        </div>
                        <div class="pattern-options" id="pattern-options" style="display: none;">
                            <div class="pattern-grid">
                                <div class="pattern-option" data-pattern="dots" onclick="tracker.applyPattern('dots')">Dots</div>
                                <div class="pattern-option" data-pattern="grid" onclick="tracker.applyPattern('grid')">Grid</div>
                                <div class="pattern-option" data-pattern="waves" onclick="tracker.applyPattern('waves')">Waves</div>
                                <div class="pattern-option" data-pattern="hexagon" onclick="tracker.applyPattern('hexagon')">Hexagon</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>🔔 Notifications</h3>
                    <div class="setting-item">
                        <label for="push-notifications">Push Notifications</label>
                        <input type="checkbox" id="push-notifications" checked>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>⚠️ Data Management</h3>
                    <button id="clear-data-btn" class="btn danger-btn">Clear All Data</button>
                </div>
            </section>
        `;

        this.updateConnectionStatus();
        this.initializeSettingsEventListeners();
        this.initializeAestheticControls();
    }

    initializeAestheticControls() {
        // Initialize color pickers
        const primaryInput = document.getElementById('primary-color');
        const secondaryInput = document.getElementById('secondary-color');
        const accentInput = document.getElementById('accent-color');

        if (primaryInput) {
            primaryInput.addEventListener('change', (e) => this.updatePrimaryColor(e.target.value));
        }

        if (secondaryInput) {
            secondaryInput.addEventListener('change', (e) => this.updateSecondaryColor(e.target.value));
        }

        if (accentInput) {
            accentInput.addEventListener('change', (e) => this.updateAccentColor(e.target.value));
        }

        // Initialize background controls
        const backgroundType = document.getElementById('background-type');
        const backgroundImage = document.getElementById('background-image');
        const backgroundColor = document.getElementById('background-color');
        const uploadBtn = document.getElementById('upload-bg-btn');

        if (backgroundType) {
            backgroundType.addEventListener('change', (e) => this.handleBackgroundTypeChange(e.target.value));
        }

        if (backgroundImage) {
            backgroundImage.addEventListener('change', (e) => this.handleBackgroundImageUpload(e));
        }

        if (backgroundColor) {
            backgroundColor.addEventListener('change', (e) => this.updateBackgroundColor(e.target.value));
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => backgroundImage.click());
        }

        // Load and apply saved styles
        this.applySavedStyles();
    }

    updatePrimaryColor(color) {
        document.documentElement.style.setProperty('--primary-color', color);
        localStorage.setItem('primary-color', color);
    }

    updateSecondaryColor(color) {
        document.documentElement.style.setProperty('--secondary-color', color);
        localStorage.setItem('secondary-color', color);
    }

    updateAccentColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);
        localStorage.setItem('accent-color', color);
    }

    applySavedStyles() {
        const primaryColor = localStorage.getItem('primary-color') || '#6366f1';
        const secondaryColor = localStorage.getItem('secondary-color') || '#8b5cf6';
        const accentColor = localStorage.getItem('accent-color') || '#f59e0b';
        const backgroundType = localStorage.getItem('background-type') || 'gradient';
        const backgroundColor = localStorage.getItem('background-color') || '#0f172a';

        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        document.documentElement.style.setProperty('--accent-color', accentColor);

        // Update input values
        const primaryInput = document.getElementById('primary-color');
        const secondaryInput = document.getElementById('secondary-color');
        const accentInput = document.getElementById('accent-color');
        const backgroundTypeSelect = document.getElementById('background-type');
        const backgroundColorInput = document.getElementById('background-color');

        if (primaryInput) primaryInput.value = primaryColor;
        if (secondaryInput) secondaryInput.value = secondaryColor;
        if (accentInput) accentInput.value = accentColor;
        if (backgroundTypeSelect) backgroundTypeSelect.value = backgroundType;
        if (backgroundColorInput) backgroundColorInput.value = backgroundColor;

        // Apply background
        this.applyBackground(backgroundType);
    }

    applyColorPalette(palette) {
        const palettes = {
            ocean: { primary: '#0ea5e9', secondary: '#06b6d4', accent: '#0891b2' },
            sunset: { primary: '#f97316', secondary: '#ea580c', accent: '#dc2626' },
            forest: { primary: '#16a34a', secondary: '#15803d', accent: '#166534' },
            lavender: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#6d28d9' },
            rose: { primary: '#f43f5e', secondary: '#e11d48', accent: '#be123c' },
            midnight: { primary: '#1e293b', secondary: '#334155', accent: '#475569' }
        };

        const config = palettes[palette];
        if (!config) return;

        this.updatePrimaryColor(config.primary);
        this.updateSecondaryColor(config.secondary);
        this.updateAccentColor(config.accent);

        // Update input values
        document.getElementById('primary-color').value = config.primary;
        document.getElementById('secondary-color').value = config.secondary;
        document.getElementById('accent-color').value = config.accent;

        this.showNotification(`🎨 Applied ${palette} palette`);
    }

    handleBackgroundTypeChange(type) {
        localStorage.setItem('background-type', type);
        
        const imageInput = document.getElementById('background-image');
        const colorInput = document.getElementById('background-color');
        const uploadBtn = document.getElementById('upload-bg-btn');
        const patternOptions = document.getElementById('pattern-options');

        // Hide all options first
        imageInput.style.display = 'none';
        colorInput.style.display = 'none';
        uploadBtn.style.display = 'none';
        patternOptions.style.display = 'none';

        // Show relevant options
        if (type === 'image') {
            uploadBtn.style.display = 'block';
        } else if (type === 'solid') {
            colorInput.style.display = 'block';
        } else if (type === 'pattern') {
            patternOptions.style.display = 'block';
        }

        this.applyBackground(type);
    }

    applyBackground(type) {
        const body = document.body;
        
        switch(type) {
            case 'gradient':
                const primaryColor = localStorage.getItem('primary-color') || '#667eea';
                const secondaryColor = localStorage.getItem('secondary-color') || '#764ba2';
                body.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
                break;
            case 'solid':
                const color = localStorage.getItem('background-color') || '#0f172a';
                body.style.background = color;
                break;
            case 'pattern':
                const pattern = localStorage.getItem('background-pattern') || 'dots';
                this.applyPattern(pattern);
                break;
            case 'image':
                const imageUrl = localStorage.getItem('background-image');
                if (imageUrl) {
                    body.style.background = `url(${imageUrl}) center/cover no-repeat`;
                }
                break;
        }
    }

    applyPattern(pattern) {
        const body = document.body;
        localStorage.setItem('background-pattern', pattern);
        
        const patterns = {
            dots: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
            grid: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            waves: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
            hexagon: 'repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.1) 60deg, transparent 120deg)'
        };

        body.style.background = `#0f172a ${patterns[pattern]}`;
        body.style.backgroundSize = pattern === 'dots' ? '20px 20px' : pattern === 'grid' ? '20px 20px' : '40px 40px';
    }

    updateBackgroundColor(color) {
        localStorage.setItem('background-color', color);
        document.body.style.background = color;
    }

    handleBackgroundImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target.result;
                localStorage.setItem('background-image', imageUrl);
                document.body.style.background = `url(${imageUrl}) center/cover no-repeat`;
                this.showNotification('🖼️ Background image uploaded');
            };
            reader.readAsDataURL(file);
        }
    }

    initializeSettingsEventListeners() {
        // Dark mode toggle
        const darkModeCheckbox = document.getElementById('dark-mode');
        if (darkModeCheckbox) {
            darkModeCheckbox.addEventListener('change', (e) => {
                this.toggleDarkMode(e.target.checked);
            });
        }

        // Canvas connection
        const canvasBtn = document.getElementById('canvas-settings-btn');
        if (canvasBtn) {
            canvasBtn.addEventListener('click', () => {
                if (localStorage.getItem('canvas_connected') === 'true') {
                    this.disconnectCanvas();
                } else {
                    window.location.href = 'login.html';
                }
            });
        }

        // Google connection
        const googleBtn = document.getElementById('google-settings-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => {
                if (localStorage.getItem('google_connected') === 'true') {
                    this.disconnectGoogle();
                } else {
                    window.location.href = 'login.html';
                }
            });
        }

        // Clear data
        const clearDataBtn = document.getElementById('clear-data-btn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                    localStorage.clear();
                    location.reload();
                }
            });
        }
    }

    initializeDarkMode() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }

    initializeSync() {
        const canvasConnected = localStorage.getItem('canvas_connected') === 'true';
        const googleConnected = localStorage.getItem('google_connected') === 'true';

        if (canvasConnected) {
            this.syncCanvasAssignments();
        }
        if (googleConnected) {
            this.syncGoogleClassroomAssignments();
        }
    }

    scheduleNotifications() {
        this.assignments.forEach(assignment => {
            if (assignment.completed) return;

            const now = new Date();
            const dueDate = new Date(assignment.dueDate);
            const diffTime = dueDate.getTime() - now.getTime();
            const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Notify 1 day before due date
            if (daysDiff === 1) {
                setTimeout(() => {
                    this.showNotification(`Assignment due tomorrow: ${assignment.title}`);
                }, 1000);
            }
        });
    }

    showNotification(message) {
        // Create a visual notification in the app
        const notification = document.createElement('div');
        notification.className = 'app-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);

        // Also try browser notification if available
        if (Notification.permission === 'granted') {
            new Notification('Assignment Tracker', {
                body: message,
                icon: '/icon-192x192.png',
                vibrate: [200, 100, 200]
            });
        }
    }

    async disconnectCanvas() {
        localStorage.removeItem('canvas_connected');
        localStorage.removeItem('canvas_url');
        localStorage.removeItem('canvas_token');
        this.updateConnectionStatus();
        alert('Disconnected from Canvas LMS');
    }

    async disconnectGoogle() {
        localStorage.removeItem('google_connected');
        localStorage.removeItem('google_auth_time');
        this.updateConnectionStatus();
        alert('Disconnected from Google Classroom');
    }

    async syncCanvasAssignments() {
        const canvasUrl = localStorage.getItem('canvas_url');
        const canvasToken = localStorage.getItem('canvas_token');
        
        if (!canvasUrl || !canvasToken) {
            this.showNotification('❌ Canvas not configured. Please connect Canvas LMS first.');
            return;
        }

        try {
            this.showNotification('🔄 Syncing Canvas assignments...');
            
            // First, get all courses for the user
            const coursesResponse = await fetch(`${canvasUrl}/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=100`, {
                headers: {
                    'Authorization': `Bearer ${canvasToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!coursesResponse.ok) {
                if (coursesResponse.status === 401) {
                    throw new Error('Invalid Canvas token. Please check your API token.');
                } else if (coursesResponse.status === 404) {
                    throw new Error('Canvas URL not found. Please check your Canvas URL.');
                } else {
                    throw new Error(`Canvas API error: ${coursesResponse.status} ${coursesResponse.statusText}`);
                }
            }

            const courses = await coursesResponse.json();
            let totalAssignments = 0;

            // Remove old Canvas assignments
            this.assignments = this.assignments.filter(a => a.source !== 'canvas');

            for (const course of courses) {
                try {
                    const assignmentsResponse = await fetch(`${canvasUrl}/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=100`, {
                        headers: {
                            'Authorization': `Bearer ${canvasToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (assignmentsResponse.ok) {
                        const assignments = await assignmentsResponse.json();
                        
                        assignments.forEach(assignment => {
                            if (assignment.due_at && assignment.published) {
                                const newAssignment = {
                                    id: `canvas_${assignment.id}`,
                                    title: assignment.name,
                                    description: assignment.description || `${course.name} assignment`,
                                    dueDate: new Date(assignment.due_at).toISOString().split('T')[0],
                                    color: this.getRandomColor(),
                                    completed: assignment.submission?.workflow_state === 'submitted',
                                    source: 'canvas',
                                    courseName: course.name
                                };
                                
                                this.assignments.push(newAssignment);
                                totalAssignments++;
                            }
                        });
                    }
                } catch (courseError) {
                    console.warn(`Error fetching assignments for course ${course.name}:`, courseError);
                }
            }

            this.saveAssignments();
            this.renderAssignments();
            
            if (totalAssignments > 0) {
                this.showNotification(`✅ Synced ${totalAssignments} assignments from Canvas`);
            } else {
                this.showNotification('ℹ️ No upcoming assignments found in Canvas');
            }

        } catch (error) {
            console.error('Canvas sync error:', error);
            this.showNotification(`❌ Canvas sync failed: ${error.message}`);
        }
    }

    getRandomColor() {
        const colors = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#16a085', '#2980b9'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    stripHtml(html) {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    getCourseColor(courseName) {
        // Generate consistent colors based on course name
        const colors = ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6', '#e67e22', '#16a085', '#2980b9'];
        let hash = 0;
        for (let i = 0; i < courseName.length; i++) {
            hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    async syncGoogleClassroomAssignments() {
        try {
            console.log('Syncing assignments from Google Classroom...');
            
            const googleAuthToken = localStorage.getItem('google_auth_token');
            if (!googleAuthToken) {
                console.warn('No Google auth token found');
                return;
            }

            // Get list of courses
            const coursesResponse = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
                headers: {
                    'Authorization': `Bearer ${googleAuthToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!coursesResponse.ok) {
                throw new Error(`Google Classroom API error: ${coursesResponse.status}`);
            }

            const coursesData = await coursesResponse.json();
            const courses = coursesData.courses || [];
            
            console.log(`Found ${courses.length} active courses in Google Classroom`);

            const allAssignments = [];

            for (const course of courses) {
                try {
                    // Get coursework (assignments) for each course
                    const courseworkResponse = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`, {
                        headers: {
                            'Authorization': `Bearer ${googleAuthToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (courseworkResponse.ok) {
                        const courseworkData = await courseworkResponse.json();
                        const coursework = courseworkData.courseWork || [];

                        coursework.forEach(work => {
                            if (work.dueDate && work.state === 'PUBLISHED') {
                                // Convert Google's date format to our format
                                const dueDate = new Date(
                                    work.dueDate.year,
                                    work.dueDate.month - 1,
                                    work.dueDate.day
                                );

                                allAssignments.push({
                                    id: `google_${work.id}`,
                                    title: work.title,
                                    description: work.description || `Assignment for ${course.name}`,
                                    dueDate: dueDate.toISOString().split('T')[0],
                                    color: this.getCourseColor(course.name),
                                    completed: false,
                                    source: 'google',
                                    courseId: course.id,
                                    courseName: course.name,
                                    googleId: work.id,
                                    points: work.maxPoints,
                                    alternateLink: work.alternateLink,
                                    createdAt: new Date().toISOString()
                                });
                            }
                        });
                    }
                } catch (courseError) {
                    console.warn(`Error fetching coursework for ${course.name}:`, courseError);
                }
            }

            console.log(`Found ${allAssignments.length} assignments from Google Classroom`);

            // Add to assignments if not already present
            allAssignments.forEach(newAssignment => {
                const exists = this.assignments.find(a => a.id === newAssignment.id);
                if (!exists) {
                    this.assignments.push(newAssignment);
                }
            });

            this.saveAssignments();
            this.renderAssignments();
            
            if (allAssignments.length > 0) {
                this.showNotification(`Synced ${allAssignments.length} assignments from Google Classroom`);
            }

        } catch (error) {
            console.error('Error syncing Google Classroom assignments:', error);
            alert(`Failed to sync Google Classroom assignments: ${error.message}`);
        }
    }

    updateConnectionStatus() {
        const canvasConnected = localStorage.getItem('canvas_connected') === 'true';
        const googleConnected = localStorage.getItem('google_connected') === 'true';

        const canvasStatus = document.getElementById('canvas-status');
        const googleStatus = document.getElementById('google-status');
        const canvasBtn = document.getElementById('canvas-settings-btn');
        const googleBtn = document.getElementById('google-settings-btn');

        if (canvasStatus) {
            canvasStatus.textContent = canvasConnected ? 'Connected' : 'Not connected';
            canvasStatus.style.color = canvasConnected ? '#27ae60' : '#7f8c8d';
            canvasBtn.textContent = canvasConnected ? 'Disconnect' : 'Connect';
        }

        if (googleStatus) {
            googleStatus.textContent = googleConnected ? 'Connected' : 'Not connected';
            googleStatus.style.color = googleConnected ? '#27ae60' : '#7f8c8d';
            googleBtn.textContent = googleConnected ? 'Disconnect' : 'Connect';
        }

        // Update dark mode checkbox
        const darkModeCheckbox = document.getElementById('dark-mode');
        if (darkModeCheckbox) {
            darkModeCheckbox.checked = localStorage.getItem('theme') === 'dark';
        }
    }

    loadAssignments() {
        const stored = localStorage.getItem('assignments');
        if (stored) {
            return JSON.parse(stored);
        }
        
        // Return empty array - no mock data
        return [];
    }

    saveAssignments() {
        localStorage.setItem('assignments', JSON.stringify(this.assignments));
    }
}

// Initialize the app when the page loads
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new AssignmentTracker();
});
