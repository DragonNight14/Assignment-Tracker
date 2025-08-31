class CreateAssignmentManager {
    constructor() {
        this.initializeEventListeners();
        this.updatePreview();
        this.setDefaultDate();
    }

    initializeEventListeners() {
        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Form submission
        document.getElementById('create-assignment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createAssignment();
        });

        // Cancel button
        document.getElementById('cancel-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                document.getElementById('assignment-color').value = color;
                this.updateColorPresets();
                this.updatePreview();
            });
        });

        // Color picker
        document.getElementById('assignment-color').addEventListener('input', () => {
            this.updateColorPresets();
            this.updatePreview();
        });

        // Form inputs that affect preview
        ['assignment-title', 'assignment-description', 'assignment-due-date', 'assignment-due-time'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.updatePreview();
            });
        });

        // Due date change for priority preview
        document.getElementById('assignment-due-date').addEventListener('change', () => {
            this.updatePriorityPreview();
        });
    }

    setDefaultDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('assignment-due-date').value = tomorrow.toISOString().split('T')[0];
        this.updatePriorityPreview();
    }

    updateColorPresets() {
        const selectedColor = document.getElementById('assignment-color').value;
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.remove('active');
            if (preset.dataset.color === selectedColor) {
                preset.classList.add('active');
            }
        });
    }

    updatePreview() {
        const title = document.getElementById('assignment-title').value || 'Assignment Preview';
        const description = document.getElementById('assignment-description').value || 'This is how your assignment will look';
        const dueDate = document.getElementById('assignment-due-date').value;
        const dueTime = document.getElementById('assignment-due-time').value;
        const color = document.getElementById('assignment-color').value;

        const previewCard = document.querySelector('.preview-card');
        previewCard.style.borderLeftColor = color;

        document.querySelector('.preview-card .assignment-title').textContent = title;
        document.querySelector('.preview-card .assignment-description').textContent = description;

        if (dueDate) {
            const dueDateText = this.formatDueDate(dueDate, dueTime);
            document.querySelector('.preview-card .assignment-due-date').textContent = dueDateText;
        }
    }

    updatePriorityPreview() {
        const dueDate = document.getElementById('assignment-due-date').value;
        if (!dueDate) return;

        const category = this.getPriorityCategory(dueDate);
        const priorityPreview = document.getElementById('priority-preview');
        const badge = priorityPreview.querySelector('.priority-badge');
        const text = priorityPreview.querySelector('.priority-text');

        // Remove existing classes
        badge.className = 'priority-badge';

        switch (category) {
            case 'high-priority':
                badge.classList.add('high-priority');
                badge.textContent = '🔥 High Priority';
                text.textContent = 'Due within 4 days';
                break;
            case 'coming-up':
                badge.classList.add('coming-up');
                badge.textContent = '⏰ Coming Up';
                text.textContent = 'Due within 1.5 weeks';
                break;
            case 'worry-later':
                badge.classList.add('worry-later');
                badge.textContent = '📅 Worry About Later';
                text.textContent = 'Due in 3+ weeks';
                break;
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

    formatDueDate(dueDate, dueTime) {
        const now = new Date();
        const due = new Date(dueDate);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let dateText;
        if (diffDays < 0) {
            dateText = `Overdue by ${Math.abs(diffDays)} day(s)`;
        } else if (diffDays === 0) {
            dateText = 'Due today';
        } else if (diffDays === 1) {
            dateText = 'Due tomorrow';
        } else {
            dateText = `Due in ${diffDays} day(s)`;
        }

        if (dueTime) {
            const [hours, minutes] = dueTime.split(':');
            const timeObj = new Date();
            timeObj.setHours(parseInt(hours), parseInt(minutes));
            const timeString = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            dateText += ` at ${timeString}`;
        }

        return dateText;
    }

    createAssignment() {
        const title = document.getElementById('assignment-title').value.trim();
        const description = document.getElementById('assignment-description').value.trim();
        const subject = document.getElementById('assignment-subject').value;
        const dueDate = document.getElementById('assignment-due-date').value;
        const dueTime = document.getElementById('assignment-due-time').value;
        const color = document.getElementById('assignment-color').value;
        const reminder = document.getElementById('assignment-reminder').checked;
        const recurring = document.getElementById('assignment-recurring').checked;

        if (!title || !dueDate) {
            alert('Please fill in the title and due date.');
            return;
        }

        // Combine date and time
        let fullDueDate = dueDate;
        if (dueTime) {
            fullDueDate = `${dueDate}T${dueTime}`;
        }

        const assignment = {
            id: Date.now().toString(),
            title,
            description,
            subject,
            dueDate: fullDueDate,
            color,
            reminder,
            recurring,
            completed: false,
            source: 'manual',
            createdAt: new Date().toISOString()
        };

        // Get existing assignments
        let assignments = [];
        const stored = localStorage.getItem('assignments');
        if (stored) {
            assignments = JSON.parse(stored);
        }

        // Add new assignment
        assignments.push(assignment);
        localStorage.setItem('assignments', JSON.stringify(assignments));

        // Show success message
        alert('Assignment created successfully!');

        // Redirect to main app
        window.location.href = 'index.html';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CreateAssignmentManager();
});
