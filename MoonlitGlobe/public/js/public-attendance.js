// Public attendance page functionality
try {
    console.log('Attendance script starting...');
    
    let mains = [];
    
    // Update time display
    function updateTimeDisplay() {
        const now = new Date();
        const gmt8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        const timeString = gmt8Time.toUTCString().replace('GMT', 'GMT+8');
        
        document.getElementById('time-display').textContent = timeString;
        
        const hour = gmt8Time.getUTCHours();
        const isAllowed = hour >= 5 && hour < 22;
        const statusElement = document.getElementById('time-status');
        const submitBtn = document.getElementById('submit-btn');
        
        if (isAllowed) {
            statusElement.textContent = 'Attendance submissions are currently OPEN';
            statusElement.className = 'time-status open';
            submitBtn.disabled = false;
        } else {
            statusElement.textContent = 'Attendance submissions are currently CLOSED';
            statusElement.className = 'time-status closed';
            submitBtn.disabled = true;
        }
    }
    
    // Load available mains
    async function loadMains() {
        console.log('Loading mains...');
        try {
            const response = await fetch('/api/users/mains');
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.success) {
                mains = data.mains;
                console.log('Mains loaded:', mains.length, 'items');
                const select = document.getElementById('main-select');
                console.log('Select element:', select);
                
                data.mains.forEach(main => {
                    const option = document.createElement('option');
                    option.value = main.mainID;
                    option.textContent = main.name;
                    select.appendChild(option);
                    console.log('Added option:', main.name);
                });
                console.log('All options added to select');
            } else {
                console.error('API returned error:', data.error);
                showError('Failed to load main events: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading mains:', error);
            showError('Failed to load main events. Please refresh the page.');
        }
    }
    
    // Handle form submission
    function setupFormHandler() {
        document.getElementById('public-attendance-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                mainID: formData.get('mainID'),
                memberCode: formData.get('memberCode')
            };
            
            if (!data.mainID) {
                showError('Please select a main event.');
                return;
            }
            
            if (!data.memberCode) {
                showError('Please enter your member code.');
                return;
            }
            
            const loading = document.getElementById('loading');
            const submitBtn = document.getElementById('submit-btn');
            
            try {
                loading.style.display = 'block';
                submitBtn.disabled = true;
                hideMessages();
                
                const response = await fetch('/api/attendance/member', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showSuccess('Attendance submitted successfully!');
                    e.target.reset();
                } else {
                    showError(result.error || 'Failed to submit attendance.');
                }
                
            } catch (error) {
                console.error('Error submitting attendance:', error);
                showError('Network error. Please try again.');
            } finally {
                loading.style.display = 'none';
                updateTimeDisplay(); // This will re-enable the button if time is still valid
            }
        });
    }
    
    function showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
    
    function showSuccess(message) {
        const successElement = document.getElementById('success-message');
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    }
    
    function hideMessages() {
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('success-message').style.display = 'none';
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        try {
            console.log('DOMContentLoaded event fired!');
            loadMains();
            setupFormHandler();
            updateTimeDisplay();
            setInterval(updateTimeDisplay, 1000); // Update every second
        } catch (error) {
            console.error('Error in DOMContentLoaded:', error);
            alert('Error during initialization: ' + error.message);
        }
    });
    
} catch (scriptError) {
    console.error('Attendance script error:', scriptError);
    alert('Script error: ' + scriptError.message);
}
