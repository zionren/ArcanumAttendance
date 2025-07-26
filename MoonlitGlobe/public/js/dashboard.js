// Dashboard functionality
let currentUser = null;
let attendanceChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
});

async function initializeDashboard() {
    try {
        // Check authentication and get user info
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/login';
            return;
        }

        currentUser = data.user;
        updateUserInfo();
        setupRoleBasedAccess();
        loadDashboardData();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        window.location.href = '/login';
    }
}

function updateUserInfo() {
    const userInfoElement = document.getElementById('user-info');
    userInfoElement.textContent = `${currentUser.username} (${currentUser.roleName})`;
}

function setupRoleBasedAccess() {
    const managementTab = document.getElementById('management-tab');
    
    // Show management tab only for owners and elders
    if (['owner', 'elder'].includes(currentUser.roleName)) {
        managementTab.style.display = 'block';
    }
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Management form (if visible)
    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleCreateUser);
    }
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Hide all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab and button
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load tab-specific data
    switch(tabName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'attendance':
            loadAttendanceData();
            break;
        case 'logout':
            loadLogoutData();
            break;
        case 'management':
            loadManagementData();
            break;
    }
}

async function loadDashboardData() {
    loadOverviewData();
}

async function loadOverviewData() {
    await loadAttendanceChart();
    await loadRecentActivity();
}

async function loadAttendanceChart() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/attendance/member-stats?date=${today}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            createAttendanceChart(data.stats);
        }
    } catch (error) {
        console.error('Error loading attendance chart:', error);
    }
}

function createAttendanceChart(stats) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    const labels = stats.map(stat => stat.main_name);
    const data = stats.map(stat => parseInt(stat.attendance_count));
    
    attendanceChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3498db',
                    '#2980b9',
                    '#1e3a5f',
                    '#85c1e9',
                    '#5dade2',
                    '#2e86ab'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Crimson Text',
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: "Today's Attendance by Main",
                    font: {
                        family: 'Playfair Display',
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/attendance/records?limit=5', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayRecentActivity(data.records);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('recent-activity').innerHTML = '<p class="error">Failed to load recent activity</p>';
    }
}

function displayRecentActivity(records) {
    const container = document.getElementById('recent-activity');
    
    if (records.length === 0) {
        container.innerHTML = '<p>No recent activity</p>';
        return;
    }
    
    const activityHTML = records.map(record => {
        const date = new Date(record.date_and_time).toLocaleDateString();
        const time = new Date(record.date_and_time).toLocaleTimeString();
        
        return `
            <div class="activity-item">
                <strong>${record.main_name}</strong> - ${record.status}
                <br>
                <small>${date} ${time} by ${record.created_by}</small>
            </div>
        `;
    }).join('');
    
    container.innerHTML = activityHTML;
}

async function loadAttendanceData() {
    await loadMains();
    await loadAttendanceRecords();
}

async function loadMains() {
    try {
        const response = await fetch('/api/users/mains', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            populateMainsSelects(data.mains);
        }
    } catch (error) {
        console.error('Error loading mains:', error);
    }
}

function populateMainsSelects(mains) {
    const selects = ['main-filter', 'attendance-main'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // Clear existing options (except first one for filter)
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption && selectId === 'main-filter') {
                select.appendChild(firstOption);
            }
            
            mains.forEach(main => {
                const option = document.createElement('option');
                option.value = main.mainID;
                option.textContent = main.name;
                select.appendChild(option);
            });
        }
    });
}

async function loadLogoutData() {
    await loadLogoutRecords();
    setupLogoutForm();
}

function setupLogoutForm() {
    const logoutForm = document.getElementById('logout-form');
    const dateTimeInput = document.getElementById('logout-datetime');
    
    // Set default datetime to now
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    dateTimeInput.value = localDateTime;
    
    // Setup score calculation
    const activityInputs = ['dropped-links', 'recruits', 'nicknames-set', 'game-handled'];
    activityInputs.forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', calculateTotalScore);
    });
    
    // Setup attendance breakdown loading
    dateTimeInput.addEventListener('change', loadAttendanceBreakdown);
    
    logoutForm.addEventListener('submit', handleLogoutSubmit);
    
    // Load initial breakdown
    loadAttendanceBreakdown();
}

function calculateTotalScore() {
    const droppedLinks = parseInt(document.getElementById('dropped-links').value) || 0;
    const recruits = parseInt(document.getElementById('recruits').value) || 0;
    const nicknamesSet = parseInt(document.getElementById('nicknames-set').value) || 0;
    const gameHandled = parseInt(document.getElementById('game-handled').value) || 0;
    
    // Attendees count will be auto-filled from server
    const attendeesCount = parseInt(document.getElementById('attendees-display')?.textContent) || 0;
    
    const totalScore = 
        (attendeesCount * 100) +
        (droppedLinks * 50) +
        (recruits * 500) +
        (nicknamesSet * 50) +
        (gameHandled * 1000);
    
    document.getElementById('calculated-score').textContent = totalScore;
}

async function loadAttendanceBreakdown() {
    const dateTime = document.getElementById('logout-datetime').value;
    if (!dateTime) return;
    
    const date = dateTime.split('T')[0];
    
    try {
        const response = await fetch(`/api/logout/attendance-breakdown?date=${date}`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayAttendanceBreakdown(data.breakdown);
        }
    } catch (error) {
        console.error('Error loading attendance breakdown:', error);
    }
}

function displayAttendanceBreakdown(breakdown) {
    const container = document.getElementById('attendance-breakdown-content');
    
    if (breakdown.length === 0) {
        container.innerHTML = '<p>No attendance recorded for this date</p>';
        return;
    }
    
    const totalAttendees = breakdown.reduce((sum, item) => sum + parseInt(item.attendance_count), 0);
    
    const breakdownHTML = `
        <div class="breakdown-summary">
            <strong>Total Attendees: ${totalAttendees}</strong>
        </div>
        <div class="breakdown-details">
            ${breakdown.map(item => `
                <div class="breakdown-item">
                    ${item.main_name}: ${item.attendance_count}
                </div>
            `).join('')}
        </div>
        <div id="attendees-display" style="display: none;">${totalAttendees}</div>
    `;
    
    container.innerHTML = breakdownHTML;
    calculateTotalScore(); // Recalculate with new attendee count
}

async function handleLogoutSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        position: formData.get('position') || document.getElementById('logout-position').value,
        dateTime: formData.get('dateTime') || document.getElementById('logout-datetime').value,
        droppedLinks: document.getElementById('dropped-links').value,
        recruits: document.getElementById('recruits').value,
        nicknamesSet: document.getElementById('nicknames-set').value,
        gameHandled: document.getElementById('game-handled').value
    };
    
    try {
        const response = await fetch('/api/logout/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Logout record submitted successfully!');
            e.target.reset();
            loadLogoutRecords(); // Reload records
        } else {
            alert(result.error || 'Failed to submit logout record');
        }
    } catch (error) {
        console.error('Error submitting logout:', error);
        alert('Network error. Please try again.');
    }
}

async function loadManagementData() {
    if (['owner', 'elder'].includes(currentUser.roleName)) {
        await loadUsersList();
    }
}

async function handleCreateUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        username: formData.get('username') || document.getElementById('new-username').value,
        password: formData.get('password') || document.getElementById('new-password').value,
        email: formData.get('email') || document.getElementById('new-email').value,
        roleName: formData.get('roleName') || document.getElementById('new-role').value
    };
    
    try {
        const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('User created successfully!');
            e.target.reset();
            loadUsersList(); // Reload users list
        } else {
            alert(result.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert('Network error. Please try again.');
    }
}

async function loadUsersList() {
    try {
        const response = await fetch('/api/users/list', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUsersList(data.users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsersList(users) {
    const container = document.getElementById('users-table-container');
    
    if (users.length === 0) {
        container.innerHTML = '<p>No users found</p>';
        return;
    }
    
    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Assigned Mains</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td>${user.role_name}</td>
                        <td>
                            ${user.assigned_mains && user.assigned_mains.length > 0 
                                ? user.assigned_mains.map(main => main.name).join(', ')
                                : 'None'
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Global function to switch tabs (called from template)
window.switchTab = switchTab;
