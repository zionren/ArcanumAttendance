// Attendance management functionality

async function loadAttendanceRecords() {
    const mainFilter = document.getElementById('main-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let url = '/api/attendance/records?';
    const params = new URLSearchParams();
    
    if (mainFilter) params.append('mainID', mainFilter);
    if (dateFilter) params.append('date', dateFilter);
    
    try {
        const response = await fetch(url + params.toString(), {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayAttendanceRecords(data.records);
        } else {
            document.getElementById('attendance-records').innerHTML = 
                `<tr><td colspan="5" class="error">Error loading records: ${data.error}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading attendance records:', error);
        document.getElementById('attendance-records').innerHTML = 
            '<tr><td colspan="5" class="error">Network error loading records</td></tr>';
    }
}

function displayAttendanceRecords(records) {
    const tbody = document.getElementById('attendance-records');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No attendance records found</td></tr>';
        return;
    }
    
    const recordsHTML = records.map(record => {
        const date = new Date(record.date_and_time).toLocaleDateString();
        const time = new Date(record.date_and_time).toLocaleTimeString();
        
        // Check if user can delete this record
        const canDelete = canDeleteRecord(record);
        
        return `
            <tr>
                <td>${date} ${time}</td>
                <td>${record.main_name}</td>
                <td>
                    <span class="status-badge status-${record.status}">${record.status}</span>
                </td>
                <td>${record.created_by}</td>
                <td>
                    ${canDelete ? 
                        `<button class="btn btn-sm btn-danger" onclick="deleteAttendanceRecord(${record.attendance_id})">Delete</button>` 
                        : '-'
                    }
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = recordsHTML;
}

function canDeleteRecord(record) {
    if (!currentUser) return false;
    
    const userRole = currentUser.roleName;
    
    // Owners, elders, and moderators can delete any record
    if (['owner', 'elder', 'moderator'].includes(userRole)) {
        return true;
    }
    
    // Handlers can delete records only for their assigned mains
    if (userRole === 'handler') {
        return currentUser.assignedMains && 
               currentUser.assignedMains.some(main => main.mainID === record.main_id);
    }
    
    return false;
}

async function deleteAttendanceRecord(recordId) {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/attendance/records/${recordId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Attendance record deleted successfully');
            loadAttendanceRecords(); // Reload the records
        } else {
            alert(result.error || 'Failed to delete record');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Network error. Please try again.');
    }
}

// Setup attendance form submission
document.addEventListener('DOMContentLoaded', () => {
    const attendanceForm = document.getElementById('attendance-form');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', handleAttendanceSubmit);
    }
});

async function handleAttendanceSubmit(e) {
    e.preventDefault();
    
    const mainID = document.getElementById('attendance-main').value;
    const status = document.getElementById('attendance-status').value;
    
    if (!mainID) {
        alert('Please select a main event');
        return;
    }
    
    try {
        const response = await fetch('/api/attendance/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mainID: parseInt(mainID),
                status
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Attendance record created successfully');
            e.target.reset();
            loadAttendanceRecords(); // Reload records
            loadAttendanceChart(); // Update chart
        } else {
            alert(result.error || 'Failed to create attendance record');
        }
    } catch (error) {
        console.error('Error creating attendance record:', error);
        alert('Network error. Please try again.');
    }
}

// Check if user can add attendance records
function canAddAttendanceRecord() {
    if (!currentUser) return false;
    
    const userRole = currentUser.roleName;
    return ['owner', 'elder', 'moderator', 'handler'].includes(userRole);
}

// Show/hide attendance form based on permissions
function setupAttendancePermissions() {
    const attendanceActions = document.getElementById('attendance-actions');
    if (attendanceActions) {
        if (canAddAttendanceRecord()) {
            attendanceActions.style.display = 'block';
        } else {
            attendanceActions.style.display = 'none';
        }
    }
}

// Call this when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for currentUser to be set
    setTimeout(() => {
        if (currentUser) {
            setupAttendancePermissions();
        }
    }, 1000);
});

// Make functions globally available
window.loadAttendanceRecords = loadAttendanceRecords;
window.deleteAttendanceRecord = deleteAttendanceRecord;
