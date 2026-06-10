// Admin Panel Logic
const ADMIN_PASSWORD = 'LCMadmin2026!'; // Login password
const ADMIN_TOKEN = 'lcmtv-admin-2024-secure'; // API token (must match server.js)

// Check login status
function checkAuth() {
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    if (isLoggedIn === 'true') {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadAllData();
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
    }
}

// Login function
function login() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('admin_logged_in', 'true');
        checkAuth();
    } else {
        alert('Incorrect password!');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('admin_logged_in');
    checkAuth();
}

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    if (tabName === 'gallery') loadGallery();
    if (tabName === 'programs') loadPrograms();
    if (tabName === 'schedule') loadSchedule();
}

// Load all data
async function loadAllData() {
    await loadGallery();
    await loadPrograms();
    await loadSchedule();
    await loadProgramSelect();
}

// Gallery functions
async function loadGallery() {
    try {
        const response = await fetch('/api/gallery');
        const images = await response.json();
        const grid = document.getElementById('galleryGrid');
        if (images.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No images uploaded yet.</p>';
            return;
        }
        grid.innerHTML = images.map(img => `
            <div class="gallery-item">
                ${img.type === 'video' ? 
                    `<video controls><source src="${img.url}" type="video/mp4"></video>` : 
                    `<img src="${img.url}" alt="${img.name}">`
                }
                <button class="delete-btn" onclick="deleteImage('${img.id}')"><i class="fas fa-trash"></i></button>
                <div style="padding: 8px; font-size: 11px; color: #aaa;">${escapeHtml(img.name.substring(0, 30))}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading gallery:', error);
        showMessage('Error loading gallery: ' + error.message, 'error');
    }
}

// Upload gallery images - FIXED: Using ADMIN_TOKEN
document.getElementById('galleryInput')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    showMessage('Uploading...', 'success');
    try {
        const response = await fetch('/api/upload-gallery', {
            method: 'POST',
            headers: {
                'Authorization': ADMIN_TOKEN
            },
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            showMessage('Images uploaded successfully!', 'success');
            loadGallery();
        } else {
            showMessage('Upload failed: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showMessage('Upload error: ' + error.message, 'error');
    }
    e.target.value = '';
});

async function deleteImage(imageId) {
    if (confirm('Delete this image?')) {
        try {
            const response = await fetch(`/api/gallery/${imageId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': ADMIN_TOKEN }
            });
            const result = await response.json();
            if (result.success) {
                showMessage('Image deleted', 'success');
                loadGallery();
            }
        } catch (error) {
            showMessage('Delete failed', 'error');
        }
    }
}

// Programs functions
async function loadPrograms() {
    try {
        const response = await fetch('/api/programs');
        const programs = await response.json();
        const grid = document.getElementById('programsGrid');
        if (programs.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No programs added yet.</p>';
            return;
        }
        grid.innerHTML = programs.map(prog => `
            <div class="program-item">
                <div class="program-image">
                    ${prog.image ? `<img src="${prog.image}" alt="${prog.title}">` : `<i class="fas ${prog.icon || 'fa-tv'}"></i>`}
                </div>
                <div class="program-info">
                    <h4>${escapeHtml(prog.title)}</h4>
                    <p>${escapeHtml(prog.description.substring(0, 80))}${prog.description.length > 80 ? '...' : ''}</p>
                    <p><i class="fas fa-clock"></i> ${prog.duration} min</p>
                    <button class="btn-danger" style="margin-top: 8px; width: 100%;" onclick="deleteProgram('${prog.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading programs:', error);
    }
}

async function addProgram() {
    const program = {
        title: document.getElementById('programTitle').value,
        description: document.getElementById('programDesc').value,
        icon: document.getElementById('programIcon').value || 'fa-tv',
        duration: parseInt(document.getElementById('programDuration').value) || 30,
        image: document.getElementById('programImage').value
    };
    
    if (!program.title) {
        showMessage('Please enter program title', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/programs', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': ADMIN_TOKEN
            },
            body: JSON.stringify(program)
        });
        const result = await response.json();
        if (result.success) {
            showMessage('Program added!', 'success');
            document.getElementById('programTitle').value = '';
            document.getElementById('programDesc').value = '';
            document.getElementById('programIcon').value = '';
            document.getElementById('programDuration').value = '30';
            document.getElementById('programImage').value = '';
            loadPrograms();
            loadProgramSelect();
        }
    } catch (error) {
        showMessage('Error adding program', 'error');
    }
}

async function deleteProgram(programId) {
    if (confirm('Delete this program?')) {
        try {
            const response = await fetch(`/api/programs/${programId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': ADMIN_TOKEN }
            });
            const result = await response.json();
            if (result.success) {
                showMessage('Program deleted', 'success');
                loadPrograms();
                loadProgramSelect();
            }
        } catch (error) {
            showMessage('Delete failed', 'error');
        }
    }
}

// Schedule functions
async function loadProgramSelect() {
    try {
        const response = await fetch('/api/programs');
        const programs = await response.json();
        const select = document.getElementById('scheduleProgramSelect');
        select.innerHTML = '<option value="">Select Program</option>' + 
            programs.map(prog => `<option value="${prog.id}">${escapeHtml(prog.title)}</option>`).join('');
    } catch (error) {
        console.error('Error loading program select:', error);
    }
}

async function loadSchedule() {
    try {
        const response = await fetch('/api/schedule');
        const schedule = await response.json();
        const programsRes = await fetch('/api/programs');
        const programs = await programsRes.json();
        const programMap = {};
        programs.forEach(p => programMap[p.id] = p);
        
        const grid = document.getElementById('scheduleGrid');
        if (schedule.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No schedule items added yet.</p>';
            return;
        }
        grid.innerHTML = schedule.map(item => `
            <div class="schedule-item" style="padding: 15px;">
                <i class="fas ${programMap[item.programId]?.icon || 'fa-tv'}" style="font-size: 28px; color: #ff6600;"></i>
                <h4 style="margin-top: 10px;">${escapeHtml(programMap[item.programId]?.title || 'Unknown')}</h4>
                <p><i class="fas fa-clock"></i> ${item.time}</p>
                <p><i class="fas fa-calendar-day"></i> ${item.day}</p>
                <button class="btn-danger" style="margin-top: 10px; width: 100%;" onclick="deleteScheduleItem('${item.id}')">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function addScheduleItem() {
    const programId = document.getElementById('scheduleProgramSelect').value;
    const time = document.getElementById('scheduleTime').value;
    const day = document.getElementById('scheduleDay').value;
    
    if (!programId || !time || !day) {
        showMessage('Please fill all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': ADMIN_TOKEN
            },
            body: JSON.stringify({ programId, time, day })
        });
        const result = await response.json();
        if (result.success) {
            showMessage('Schedule item added!', 'success');
            document.getElementById('scheduleProgramSelect').value = '';
            document.getElementById('scheduleTime').value = '';
            document.getElementById('scheduleDay').value = 'Monday';
            loadSchedule();
        }
    } catch (error) {
        showMessage('Error adding schedule', 'error');
    }
}

async function deleteScheduleItem(itemId) {
    if (confirm('Delete this schedule item?')) {
        try {
            const response = await fetch(`/api/schedule/${itemId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': ADMIN_TOKEN }
            });
            const result = await response.json();
            if (result.success) {
                showMessage('Schedule item deleted', 'success');
                loadSchedule();
            }
        } catch (error) {
            showMessage('Delete failed', 'error');
        }
    }
}

// Helper functions
function showMessage(msg, type) {
    const container = document.querySelector('.admin-container');
    let msgDiv = document.querySelector('.success-msg, .error-msg');
    if (msgDiv) msgDiv.remove();
    
    msgDiv = document.createElement('div');
    msgDiv.className = type === 'success' ? 'success-msg' : 'error-msg';
    msgDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
    msgDiv.style.display = 'block';
    container.insertBefore(msgDiv, container.firstChild);
    
    setTimeout(() => msgDiv.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Initialize
checkAuth();
