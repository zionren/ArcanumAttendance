// Logout record management functionality

async function loadLogoutRecords() {
    const dateFilter = document.getElementById('logout-date-filter').value;
    
    let url = '/api/logout/records?';
    const params = new URLSearchParams();
    
    if (dateFilter) params.append('date', dateFilter);
    
    try {
        const response = await fetch(url + params.toString(), {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayLogoutRecords(data.records);
        } else {
            document.getElementById('logout-records').innerHTML = 
                `<div class="error">Error loading logout records: ${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error loading logout records:', error);
        document.getElementById('logout-records').innerHTML = 
            '<div class="error">Network error loading logout records</div>';
    }
}

function displayLogoutRecords(records) {
    const container = document.getElementById('logout-records');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="no-data">No logout records found</div>';
        return;
    }
    
    const recordsHTML = records.map(record => {
        const date = new Date(record.date_time).toLocaleDateString();
        const time = new Date(record.date_time).toLocaleTimeString();
        
        return `
            <div class="logout-record-item">
                <div class="record-header">
                    <h4>${record.username || 'Unknown User'}</h4>
                    <span class="record-date">${date} ${time}</span>
                </div>
                <div class="record-details">
                    <div class="detail-row">
                        <span class="detail-label">Position:</span>
                        <span class="detail-value">${record.position}</span>
                    </div>
                    <div class="activity-breakdown">
                        <div class="activity-item">
                            <span class="activity-label">Attendees:</span>
                            <span class="activity-value">${record.attendees_count}</span>
                            <span class="activity-score">(${record.attendees_count * 100} pts)</span>
                        </div>
                        <div class="activity-item">
                            <span class="activity-label">Dropped Links:</span>
                            <span class="activity-value">${record.dropped_links}</span>
                            <span class="activity-score">(${record.dropped_links * 50} pts)</span>
                        </div>
                        <div class="activity-item">
                            <span class="activity-label">Recruits:</span>
                            <span class="activity-value">${record.recruits}</span>
                            <span class="activity-score">(${record.recruits * 500} pts)</span>
                        </div>
                        <div class="activity-item">
                            <span class="activity-label">Nicknames Set:</span>
                            <span class="activity-value">${record.nicknames_set}</span>
                            <span class="activity-score">(${record.nicknames_set * 50} pts)</span>
                        </div>
                        <div class="activity-item">
                            <span class="activity-label">Game Handled:</span>
                            <span class="activity-value">${record.game_handled}</span>
                            <span class="activity-score">(${record.game_handled * 1000} pts)</span>
                        </div>
                    </div>
                    <div class="total-score-display">
                        <strong>Total Score: ${record.total_score}</strong>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = recordsHTML;
}

// Setup logout statistics loading
async function loadLogoutStats(startDate = null, endDate = null, userID = null) {
    let url = '/api/logout/stats?';
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (userID) params.append('userID', userID);
    
    try {
        const response = await fetch(url + params.toString(), {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayLogoutStats(data.stats);
            return data.stats;
        } else {
            console.error('Error loading logout stats:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error loading logout stats:', error);
        return [];
    }
}

function displayLogoutStats(stats) {
    // This function can be extended to display stats in charts or tables
    // For now, it's mainly used for data processing
    console.log('Logout stats loaded:', stats);
}

// Enhanced logout form validation
function validateLogoutForm() {
    const position = document.getElementById('logout-position').value.trim();
    const dateTime = document.getElementById('logout-datetime').value;
    
    if (!position) {
        showFormError('Position is required');
        return false;
    }
    
    if (!dateTime) {
        showFormError('Date and time are required');
        return false;
    }
    
    // Check if date is not in the future
    const selectedDate = new Date(dateTime);
    const now = new Date();
    
    if (selectedDate > now) {
        showFormError('Date cannot be in the future');
        return false;
    }
    
    // Check if date is not too far in the past (more than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (selectedDate < thirtyDaysAgo) {
        showFormError('Date cannot be more than 30 days in the past');
        return false;
    }
    
    return true;
}

function showFormError(message) {
    const existingError = document.querySelector('.logout-form-error');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'logout-form-error error-message';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    const form = document.getElementById('logout-form');
    form.insertBefore(errorDiv, form.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Real-time score calculation with visual feedback
function setupScoreCalculation() {
    const activityInputs = ['dropped-links', 'recruits', 'nicknames-set', 'game-handled'];
    
    activityInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                // Ensure non-negative values
                if (parseInt(e.target.value) < 0) {
                    e.target.value = 0;
                }
                updateScoreCalculation();
            });
        }
    });
}

function updateScoreCalculation() {
    const droppedLinks = parseInt(document.getElementById('dropped-links').value) || 0;
    const recruits = parseInt(document.getElementById('recruits').value) || 0;
    const nicknamesSet = parseInt(document.getElementById('nicknames-set').value) || 0;
    const gameHandled = parseInt(document.getElementById('game-handled').value) || 0;
    
    // Get attendees count from breakdown
    const attendeesDisplay = document.getElementById('attendees-display');
    const attendeesCount = attendeesDisplay ? parseInt(attendeesDisplay.textContent) || 0 : 0;
    
    // Calculate individual scores
    const attendeesScore = attendeesCount * 100;
    const droppedLinksScore = droppedLinks * 50;
    const recruitsScore = recruits * 500;
    const nicknamesScore = nicknamesSet * 50;
    const gameScore = gameHandled * 1000;
    
    const totalScore = attendeesScore + droppedLinksScore + recruitsScore + nicknamesScore + gameScore;
    
    // Update display
    const scoreElement = document.getElementById('calculated-score');
    if (scoreElement) {
        scoreElement.textContent = totalScore;
        
        // Add visual feedback for score changes
        scoreElement.style.color = '#27ae60';
        setTimeout(() => {
            scoreElement.style.color = '';
        }, 500);
    }
    
    // Update individual score displays
    updateIndividualScoreDisplays({
        attendees: attendeesScore,
        droppedLinks: droppedLinksScore,
        recruits: recruitsScore,
        nicknames: nicknamesScore,
        game: gameScore
    });
}

function updateIndividualScoreDisplays(scores) {
    const scoreElements = {
        'dropped-links': scores.droppedLinks,
        'recruits': scores.recruits,
        'nicknames-set': scores.nicknames,
        'game-handled': scores.game
    };
    
    Object.entries(scoreElements).forEach(([inputId, score]) => {
        const input = document.getElementById(inputId);
        if (input) {
            const scoreSpan = input.parentElement.querySelector('.score');
            if (scoreSpan) {
                const multiplier = inputId === 'dropped-links' || inputId === 'nicknames-set' ? 50 :
                                 inputId === 'recruits' ? 500 : 1000;
                scoreSpan.textContent = `× ${multiplier} = ${score} pts`;
            }
        }
    });
}

// Export functions for CSV/PDF (future enhancement)
function exportLogoutData(format = 'csv') {
    // This function can be enhanced to export logout data
    // For now, it's a placeholder for future implementation
    console.log(`Export to ${format} requested`);
    alert(`Export to ${format.toUpperCase()} feature coming soon!`);
}

// Initialize logout functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Setup score calculation if on logout tab
    if (document.getElementById('logout-form')) {
        setupScoreCalculation();
    }
});

// Auto-save draft functionality (future enhancement)
function saveDraft() {
    const formData = {
        position: document.getElementById('logout-position').value,
        dateTime: document.getElementById('logout-datetime').value,
        droppedLinks: document.getElementById('dropped-links').value,
        recruits: document.getElementById('recruits').value,
        nicknamesSet: document.getElementById('nicknames-set').value,
        gameHandled: document.getElementById('game-handled').value
    };
    
    localStorage.setItem('logoutDraft', JSON.stringify(formData));
}

function loadDraft() {
    const draft = localStorage.getItem('logoutDraft');
    if (draft) {
        try {
            const formData = JSON.parse(draft);
            
            if (formData.position) document.getElementById('logout-position').value = formData.position;
            if (formData.dateTime) document.getElementById('logout-datetime').value = formData.dateTime;
            if (formData.droppedLinks) document.getElementById('dropped-links').value = formData.droppedLinks;
            if (formData.recruits) document.getElementById('recruits').value = formData.recruits;
            if (formData.nicknamesSet) document.getElementById('nicknames-set').value = formData.nicknamesSet;
            if (formData.gameHandled) document.getElementById('game-handled').value = formData.gameHandled;
            
            updateScoreCalculation();
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
}

function clearDraft() {
    localStorage.removeItem('logoutDraft');
}

// Make functions globally available
window.loadLogoutRecords = loadLogoutRecords;
window.loadLogoutStats = loadLogoutStats;
window.exportLogoutData = exportLogoutData;
