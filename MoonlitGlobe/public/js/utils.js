// Utility functions for RP Hood Attendance System

// API helper functions
const API = {
    async request(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, mergedOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },
    
    async get(url, params = {}) {
        const urlWithParams = new URL(url, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                urlWithParams.searchParams.append(key, value);
            }
        });
        
        return this.request(urlWithParams.toString());
    },
    
    async post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    async delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }
};

// Date and time utilities
const DateUtils = {
    // Format date for display
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },
    
    // Format time for display
    formatTime(date, options = {}) {
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        
        return new Date(date).toLocaleTimeString('en-US', { ...defaultOptions, ...options });
    },
    
    // Format datetime for display
    formatDateTime(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    },
    
    // Get GMT+8 time
    getGMT8Time(date = new Date()) {
        return new Date(date.getTime() + (8 * 60 * 60 * 1000));
    },
    
    // Check if time is within allowed hours (6AM - 9PM GMT+8)
    isWithinAllowedHours(date = new Date()) {
        const gmt8Time = this.getGMT8Time(date);
        const hour = gmt8Time.getUTCHours();
        return hour >= 6 && hour < 21;
    },
    
    // Get date string for input fields
    getDateInputValue(date = new Date()) {
        return date.toISOString().split('T')[0];
    },
    
    // Get datetime-local string for input fields
    getDateTimeInputValue(date = new Date()) {
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    },
    
    // Check if date is today
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        
        return today.getFullYear() === checkDate.getFullYear() &&
               today.getMonth() === checkDate.getMonth() &&
               today.getDate() === checkDate.getDate();
    }
};

// Form utilities
const FormUtils = {
    // Get form data as object
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    },
    
    // Populate form with data
    populateForm(form, data) {
        Object.entries(data).forEach(([key, value]) => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else if (field.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radio) radio.checked = true;
                } else {
                    field.value = value;
                }
            }
        });
    },
    
    // Reset form and hide messages
    resetForm(form) {
        form.reset();
        this.hideMessages(form);
    },
    
    // Hide all message elements in form
    hideMessages(form) {
        const messages = form.querySelectorAll('.error-message, .success-message, .loading');
        messages.forEach(msg => msg.style.display = 'none');
    },
    
    // Validate required fields
    validateRequired(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });
        
        return isValid;
    },
    
    // Show field-specific error
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = 'var(--danger-red)';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
        
        field.parentElement.appendChild(errorDiv);
        field.style.borderColor = 'var(--danger-red)';
    },
    
    // Clear field error
    clearFieldError(field) {
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.style.borderColor = '';
    }
};

// UI utilities
const UIUtils = {
    // Show loading state
    showLoading(element, message = 'Loading...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        loadingDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        element.style.position = 'relative';
        element.appendChild(loadingDiv);
    },
    
    // Hide loading state
    hideLoading(element) {
        const loadingOverlay = element.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    },
    
    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-family: 'Crimson Text', serif;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            animation: slideInRight 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            success: 'var(--success-green)',
            error: 'var(--danger-red)',
            warning: 'var(--warning-orange)',
            info: 'var(--accent-blue)'
        };
        toast.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, duration);
    },
    
    // Show modal dialog
    showModal(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${options.showCancel !== false ? '<button class="btn btn-secondary modal-cancel">Cancel</button>' : ''}
                    ${options.showConfirm !== false ? '<button class="btn btn-primary modal-confirm">Confirm</button>' : ''}
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(modal);
        
        return new Promise((resolve) => {
            const cleanup = () => {
                if (modal.parentElement) {
                    modal.parentElement.removeChild(modal);
                }
            };
            
            modal.querySelector('.modal-close').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            const cancelBtn = modal.querySelector('.modal-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(false);
                });
            }
            
            const confirmBtn = modal.querySelector('.modal-confirm');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(true);
                });
            }
            
            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    },
    
    // Confirm dialog
    async confirm(message, title = 'Confirm') {
        return this.showModal(title, `<p>${message}</p>`);
    },
    
    // Alert dialog
    async alert(message, title = 'Alert') {
        return this.showModal(title, `<p>${message}</p>`, { showCancel: false });
    }
};

// Local storage utilities
const StorageUtils = {
    // Set item with JSON serialization
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    // Get item with JSON parsing
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    // Remove item
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    // Clear all items
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// Validation utilities
const ValidationUtils = {
    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Password strength validation
    isStrongPassword(password) {
        // At least 8 characters, one uppercase, one lowercase, one number, one special char
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    },
    
    // Username validation
    isValidUsername(username) {
        // 3-20 characters, alphanumeric and underscore only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    },
    
    // Check if string is not empty
    isNotEmpty(value) {
        return value && value.trim().length > 0;
    },
    
    // Check if number is within range
    isInRange(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }
};

// Export utilities for use in other scripts
window.API = API;
window.DateUtils = DateUtils;
window.FormUtils = FormUtils;
window.UIUtils = UIUtils;
window.StorageUtils = StorageUtils;
window.ValidationUtils = ValidationUtils;

// Add custom CSS for animations and modal styles
const customCSS = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .modal-dialog {
        background: var(--snow-white);
        border-radius: 15px;
        box-shadow: 0 8px 32px var(--shadow-blue);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--light-blue);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .modal-header h3 {
        margin: 0;
        color: var(--primary-blue);
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--text-light);
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.3s ease;
    }
    
    .modal-close:hover {
        background-color: var(--glass-blue);
    }
    
    .modal-body {
        padding: 1.5rem;
    }
    
    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--light-blue);
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    .loading-spinner {
        width: 30px;
        height: 30px;
        border: 3px solid var(--light-blue);
        border-top: 3px solid var(--accent-blue);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-text {
        color: var(--text-light);
        font-style: italic;
    }
    
    .field-error {
        color: var(--danger-red);
        font-size: 0.875rem;
        margin-top: 0.25rem;
    }
    
    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: capitalize;
    }
    
    .status-present {
        background-color: var(--success-green);
        color: white;
    }
    
    .status-absent {
        background-color: var(--danger-red);
        color: white;
    }
    
    .status-late {
        background-color: var(--warning-orange);
        color: white;
    }
    
    .logout-record-item {
        background: var(--glass-blue);
        border-radius: 10px;
        padding: 1rem;
        margin-bottom: 1rem;
        border-left: 4px solid var(--accent-blue);
    }
    
    .record-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .record-header h4 {
        margin: 0;
        color: var(--primary-blue);
    }
    
    .record-date {
        color: var(--text-light);
        font-style: italic;
    }
    
    .detail-row {
        margin-bottom: 0.5rem;
    }
    
    .detail-label {
        font-weight: 600;
        color: var(--primary-blue);
    }
    
    .detail-value {
        margin-left: 0.5rem;
    }
    
    .activity-breakdown {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.5rem;
        margin: 1rem 0;
    }
    
    .activity-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 5px;
    }
    
    .activity-label {
        font-weight: 600;
        font-size: 0.875rem;
    }
    
    .activity-value {
        font-weight: bold;
        color: var(--primary-blue);
    }
    
    .activity-score {
        font-size: 0.75rem;
        color: var(--text-light);
        font-style: italic;
    }
    
    .total-score-display {
        text-align: center;
        padding: 1rem;
        background: var(--accent-blue);
        color: white;
        border-radius: 8px;
        margin-top: 1rem;
    }
    
    .no-data {
        text-align: center;
        color: var(--text-light);
        font-style: italic;
        padding: 2rem;
    }
    
    .error {
        color: var(--danger-red);
        text-align: center;
        padding: 1rem;
        background: rgba(231, 76, 60, 0.1);
        border-radius: 8px;
        margin: 1rem 0;
    }
`;

// Inject custom CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = customCSS;
document.head.appendChild(styleSheet);

// Initialize utilities when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('RP Hood Utilities loaded successfully');
    
    // Add global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        UIUtils.showToast('An unexpected error occurred. Please try again.', 'error');
        event.preventDefault();
    });
});
