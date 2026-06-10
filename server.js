require('dotenv').config();
var express = require('express');
var cors = require('cors');
var http = require('http');
var socketIO = require('socket.io');
var { Pool } = require('pg');
var path = require('path');
var multer = require('multer');
var fs = require('fs');
var { v4: uuidv4 } = require('uuid');

var app = express();
var server = http.createServer(app);
var io = new socketIO.Server(server, { 
    cors: { 
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ FILE STORAGE SETUP ============
var DATA_DIR = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
var UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
var GALLERY_DIR = path.join(UPLOADS_DIR, 'galleries');
var WWW_DIR = path.join(__dirname, 'www');

// Create all required directories
[DATA_DIR, UPLOADS_DIR, GALLERY_DIR, WWW_DIR].forEach(function(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('📁 Created directory:', dir);
    }
});

// Serve static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(WWW_DIR));

// ============ MULTER CONFIGURATION ============
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        var galleryId = req.params.galleryId || req.params.id || 'general';
        var dir = path.join(GALLERY_DIR, galleryId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('📁 Created gallery directory:', dir);
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        var ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        var filename = uuidv4() + ext;
        console.log('💾 Saving file:', filename);
        cb(null, filename);
    }
});

var upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: function(req, file, cb) {
        var allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];
        var allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
        var ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExts.indexOf(ext) !== -1 && allowedMimes.indexOf(file.mimetype) !== -1) {
            cb(null, true);
        } else {
            console.log('❌ Rejected file type:', ext, file.mimetype);
            cb(new Error('Invalid file type. Allowed: ' + allowedExts.join(', ')));
        }
    }
});

// ============ POSTGRESQL ============
var pool;
try {
    if (process.env.DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        console.log('✅ PostgreSQL pool created');
    } else {
        console.log('⚠️ No DATABASE_URL, using in-memory storage');
    }
} catch(e) {
    console.log('⚠️ PostgreSQL not available, using in-memory storage');
}

// In-memory fallback storage
var memoryDB = {
    galleries: [],
    galleryItems: [],
    recordings: [],
    comments: [],
    liveStats: { likes: 0, shares: 0, viewers: 0 },
    streamLikes: { count: 0, users: {}, reactions: {} },
    streamComments: []
};

// ============ ADMIN AUTH ============
var ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'lcmtv-admin-2024-secure';

function adminOnly(req, res, next) {
    var token = req.headers.authorization || req.query.token || '';
    if (token === ADMIN_TOKEN || token === 'Bearer ' + ADMIN_TOKEN) {
        return next();
    }
    console.log('❌ Unauthorized access attempt');
    res.status(401).json({ error: 'Unauthorized. Invalid admin token.' });
}

// ============ DATABASE INITIALIZATION ============
async function initDatabase() {
    if (!pool) {
        console.log('📦 Using in-memory storage');
        loadLocalData();
        return;
    }
    
    var client;
    try {
        client = await pool.connect();
        console.log('🔄 Initializing database tables...');
       
        await client.query(`
            CREATE TABLE IF NOT EXISTS galleries (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                category TEXT DEFAULT 'general',
                is_featured BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
       
        await client.query(`
            CREATE TABLE IF NOT EXISTS gallery_items (
                id TEXT PRIMARY KEY,
                gallery_id TEXT REFERENCES galleries(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                original_name TEXT,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size BIGINT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
       
        await client.query(`
            CREATE TABLE IF NOT EXISTS recorded_videos (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                duration TEXT DEFAULT '00:00',
                playback_id TEXT NOT NULL,
                thumbnail TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                likes INT DEFAULT 0,
                shares INT DEFAULT 0
            )
        `);
       
        await client.query(`
            CREATE TABLE IF NOT EXISTS video_comments (
                id SERIAL PRIMARY KEY,
                video_id INT REFERENCES recorded_videos(id) ON DELETE CASCADE,
                user_name TEXT NOT NULL,
                user_avatar TEXT DEFAULT '👤',
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
       
        await client.query(`
            CREATE TABLE IF NOT EXISTS stream_stats (
                id INT PRIMARY KEY DEFAULT 1,
                total_likes INT DEFAULT 0,
                total_shares INT DEFAULT 0,
                total_comments INT DEFAULT 0,
                peak_viewers INT DEFAULT 0
            )
        `);
       
        await client.query(`
            CREATE TABLE IF NOT EXISTS stream_reactions (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                reaction TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
       
        await client.query(`
            CREATE TABLE IF NOT EXISTS stream_comments (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_avatar TEXT DEFAULT '👤',
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
       
        await client.query(`
            INSERT INTO stream_stats (id, total_likes, total_shares, total_comments, peak_viewers)
            VALUES (1, 0, 0, 0, 0)
            ON CONFLICT (id) DO NOTHING
        `);
       
        console.log('✅ Database tables initialized successfully');
    } catch (err) {
        console.error('❌ Database initialization error:', err.message);
        console.log('📦 Falling back to in-memory storage');
        pool = null;
    } finally {
        if (client) client.release();
    }
}

function loadLocalData() {
    var dataFile = path.join(DATA_DIR, 'local-data.json');
    if (fs.existsSync(dataFile)) {
        try {
            var data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            memoryDB = { ...memoryDB, ...data };
            console.log('📂 Loaded local data');
        } catch(e) {
            console.log('⚠️ Could not load local data');
        }
    }
}

function saveLocalData() {
    var dataFile = path.join(DATA_DIR, 'local-data.json');
    fs.writeFileSync(dataFile, JSON.stringify(memoryDB, null, 2));
}

// Initialize database on startup
initDatabase().catch(function(err) {
    console.error('❌ Fatal error:', err);
});

// ============ API ENDPOINTS ============

// Health check
app.get('/api/health', function(req, res) {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        storage: DATA_DIR,
        database: pool ? 'PostgreSQL' : 'In-Memory',
        viewers: memoryDB.liveStats.viewers || io.engine.clientsCount || 0
    });
});

// ============ GALLERIES API ============

// Get all galleries
app.get('/api/galleries', async function(req, res) {
    try {
        if (pool) {
            var result = await pool.query('SELECT * FROM galleries ORDER BY created_at DESC');
            var galleries = result.rows;
           
            for (var i = 0; i < galleries.length; i++) {
                var itemsResult = await pool.query(
                    'SELECT * FROM gallery_items WHERE gallery_id = $1 ORDER BY created_at ASC',
                    [galleries[i].id]
                );
                galleries[i].items = itemsResult.rows;
            }
           
            res.json(galleries);
        } else {
            var galleries = memoryDB.galleries.map(function(g) {
                var items = memoryDB.galleryItems.filter(function(item) {
                    return item.gallery_id === g.id;
                });
                return { ...g, items: items };
            });
            res.json(galleries);
        }
    } catch (err) {
        console.error('❌ Error fetching galleries:', err.message);
        res.status(500).json({ error: 'Failed to fetch galleries' });
    }
});

// Get single gallery
app.get('/api/galleries/:id', async function(req, res) {
    try {
        if (pool) {
            var result = await pool.query('SELECT * FROM galleries WHERE id = $1', [req.params.id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Gallery not found' });
            }
            var gallery = result.rows[0];
            var itemsResult = await pool.query(
                'SELECT * FROM gallery_items WHERE gallery_id = $1 ORDER BY created_at ASC',
                [gallery.id]
            );
            gallery.items = itemsResult.rows;
            res.json(gallery);
        } else {
            var gallery = memoryDB.galleries.find(function(g) { return g.id === req.params.id; });
            if (!gallery) return res.status(404).json({ error: 'Gallery not found' });
            var items = memoryDB.galleryItems.filter(function(item) {
                return item.gallery_id === gallery.id;
            });
            res.json({ ...gallery, items: items });
        }
    } catch (err) {
        console.error('❌ Error fetching gallery:', err.message);
        res.status(500).json({ error: 'Failed to fetch gallery' });
    }
});

// Create gallery
app.post('/api/galleries', adminOnly, async function(req, res) {
    var title = (req.body.title || '').trim();
    if (!title) {
        return res.status(400).json({ error: 'Gallery title is required' });
    }
   
    var id = uuidv4();
    try {
        if (pool) {
            var result = await pool.query(
                'INSERT INTO galleries (id, title, description, category, is_featured) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [id, title, req.body.description || '', req.body.category || 'general', req.body.isFeatured || false]
            );
            res.status(201).json(result.rows[0]);
        } else {
            var gallery = {
                id: id,
                title: title,
                description: req.body.description || '',
                category: req.body.category || 'general',
                is_featured: req.body.isFeatured || false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            memoryDB.galleries.push(gallery);
            saveLocalData();
            res.status(201).json(gallery);
        }
        console.log('✅ Created gallery:', title);
    } catch (err) {
        console.error('❌ Error creating gallery:', err.message);
        res.status(500).json({ error: 'Failed to create gallery' });
    }
});

// Upload files to gallery
app.post('/api/galleries/:id/upload', adminOnly, function(req, res) {
    upload.array('files', 20)(req, res, async function(err) {
        if (err) {
            console.error('❌ Upload error:', err.message);
            return res.status(400).json({ error: err.message });
        }
       
        var galleryId = req.params.id;
       
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
       
        try {
            var uploadedItems = [];
           
            for (var i = 0; i < req.files.length; i++) {
                var file = req.files[i];
                var itemId = uuidv4();
                var filePath = 'uploads/galleries/' + galleryId + '/' + file.filename;
                var fileType = file.mimetype.startsWith('video') ? 'video' : 'image';
               
                if (pool) {
                    await pool.query(
                        'INSERT INTO gallery_items (id, gallery_id, filename, original_name, file_path, file_type, file_size) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                        [itemId, galleryId, file.filename, file.originalname, filePath, fileType, file.size]
                    );
                } else {
                    memoryDB.galleryItems.push({
                        id: itemId,
                        gallery_id: galleryId,
                        filename: file.filename,
                        original_name: file.originalname,
                        file_path: filePath,
                        file_type: fileType,
                        file_size: file.size,
                        created_at: new Date().toISOString()
                    });
                }
               
                uploadedItems.push({ id: itemId, file_path: filePath, file_type: fileType });
            }
           
            if (!pool) saveLocalData();
           
            res.json({
                message: 'Successfully uploaded ' + uploadedItems.length + ' file(s)',
                items: uploadedItems
            });
        } catch (err) {
            console.error('❌ Error saving files:', err.message);
            res.status(500).json({ error: 'Failed to save files' });
        }
    });
});

// ============ PROGRAMS API ============

// Get all programs
app.get('/api/programs', async (req, res) => {
    const programsFile = path.join(DATA_DIR, 'programs.json');
    if (fs.existsSync(programsFile)) {
        const programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
        res.json(programs);
    } else {
        const defaultPrograms = [
            { id: '1', title: 'Youth Talk', description: 'Engaging discussion with young leaders', icon: 'fa-comments', duration: 30, image: '', createdAt: new Date().toISOString() },
            { id: '2', title: 'Main News', description: 'Top stories of the day', icon: 'fa-newspaper', duration: 60, image: '', createdAt: new Date().toISOString() },
            { id: '3', title: 'Zed Uprising Stars', description: 'Talent showcase - grand finale & winners', icon: 'fa-star', duration: 120, image: '', createdAt: new Date().toISOString() },
            { id: '4', title: 'Governance Space', description: 'Political analysis', icon: 'fa-gavel', duration: 45, image: '', createdAt: new Date().toISOString() }
        ];
        fs.writeFileSync(programsFile, JSON.stringify(defaultPrograms, null, 2));
        res.json(defaultPrograms);
    }
});

// Add a program
app.post('/api/programs', adminOnly, async (req, res) => {
    const programsFile = path.join(DATA_DIR, 'programs.json');
    let programs = [];
    if (fs.existsSync(programsFile)) {
        programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
    }
    
    const newProgram = {
        id: Date.now().toString(),
        title: req.body.title,
        description: req.body.description || '',
        icon: req.body.icon || 'fa-tv',
        duration: req.body.duration || 30,
        image: req.body.image || '',
        createdAt: new Date().toISOString()
    };
    
    programs.push(newProgram);
    fs.writeFileSync(programsFile, JSON.stringify(programs, null, 2));
    res.json({ success: true, program: newProgram });
});

// Delete a program
app.delete('/api/programs/:id', adminOnly, async (req, res) => {
    const programsFile = path.join(DATA_DIR, 'programs.json');
    let programs = [];
    if (fs.existsSync(programsFile)) {
        programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
    }
    
    programs = programs.filter(p => p.id !== req.params.id);
    fs.writeFileSync(programsFile, JSON.stringify(programs, null, 2));
    res.json({ success: true });
});

// ============ SCHEDULE API ============

// Get schedule
app.get('/api/schedule', async (req, res) => {
    const scheduleFile = path.join(DATA_DIR, 'schedule.json');
    if (fs.existsSync(scheduleFile)) {
        const schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
        res.json(schedule);
    } else {
        res.json([]);
    }
});

// Add schedule item
app.post('/api/schedule', adminOnly, async (req, res) => {
    const scheduleFile = path.join(DATA_DIR, 'schedule.json');
    let schedule = [];
    if (fs.existsSync(scheduleFile)) {
        schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
    }
    
    const newItem = {
        id: Date.now().toString(),
        programId: req.body.programId,
        time: req.body.time,
        day: req.body.day,
        createdAt: new Date().toISOString()
    };
    
    schedule.push(newItem);
    fs.writeFileSync(scheduleFile, JSON.stringify(schedule, null, 2));
    res.json({ success: true, item: newItem });
});

// Delete schedule item
app.delete('/api/schedule/:id', adminOnly, async (req, res) => {
    const scheduleFile = path.join(DATA_DIR, 'schedule.json');
    let schedule = [];
    if (fs.existsSync(scheduleFile)) {
        schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
    }
    
    schedule = schedule.filter(s => s.id !== req.params.id);
    fs.writeFileSync(scheduleFile, JSON.stringify(schedule, null, 2));
    res.json({ success: true });
});

// ============ GALLERY UPLOAD API (Simple) ============

// Get all gallery images for frontend
app.get('/api/gallery', async (req, res) => {
    const galleryFile = path.join(DATA_DIR, 'gallery.json');
    if (fs.existsSync(galleryFile)) {
        const gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
        res.json(gallery);
    } else {
        res.json([]);
    }
});

// Upload gallery images (admin only)
app.post('/api/upload-gallery', adminOnly, upload.array('images', 20), async (req, res) => {
    const galleryFile = path.join(DATA_DIR, 'gallery.json');
    let gallery = [];
    if (fs.existsSync(galleryFile)) {
        gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    }
    
    const uploadedFiles = [];
    for (const file of req.files) {
        const galleryItem = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            name: file.originalname,
            url: `/uploads/${file.filename}`,
            type: file.mimetype.startsWith('video') ? 'video' : 'image',
            size: file.size,
            uploadedAt: new Date().toISOString()
        };
        gallery.push(galleryItem);
        uploadedFiles.push(galleryItem);
    }
    
    fs.writeFileSync(galleryFile, JSON.stringify(gallery, null, 2));
    res.json({ success: true, files: uploadedFiles });
});

// Delete gallery image
app.delete('/api/gallery/:id', adminOnly, async (req, res) => {
    const galleryFile = path.join(DATA_DIR, 'gallery.json');
    let gallery = [];
    if (fs.existsSync(galleryFile)) {
        gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    }
    
    const itemToDelete = gallery.find(g => g.id === req.params.id);
    if (itemToDelete) {
        const filePath = path.join(UPLOADS_DIR, path.basename(itemToDelete.url));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    
    gallery = gallery.filter(g => g.id !== req.params.id);
    fs.writeFileSync(galleryFile, JSON.stringify(gallery, null, 2));
    res.json({ success: true });
});

// ============ FRONTEND DATA API ============

// Get all data for frontend (programs + schedule + gallery)
app.get('/api/frontend-data', async (req, res) => {
    const programsFile = path.join(DATA_DIR, 'programs.json');
    const scheduleFile = path.join(DATA_DIR, 'schedule.json');
    const galleryFile = path.join(DATA_DIR, 'gallery.json');
    
    let programs = [];
    let schedule = [];
    let gallery = [];
    
    if (fs.existsSync(programsFile)) programs = JSON.parse(fs.readFileSync(programsFile, 'utf8'));
    if (fs.existsSync(scheduleFile)) schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
    if (fs.existsSync(galleryFile)) gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    
    res.json({ programs, schedule, gallery });
});

// ============ LIVE STREAM INTERACTIONS API ============

// Get current stream state
app.get('/api/stream/state', function(req, res) {
    res.json({
        likes: memoryDB.streamLikes,
        comments: memoryDB.streamComments.slice(-50),
        viewers: memoryDB.liveStats.viewers || io.engine.clientsCount || 0,
        stats: memoryDB.liveStats
    });
});

// Like/react to stream
app.post('/api/stream/react', function(req, res) {
    var { userId, userName, reaction } = req.body;
    
    if (!userId || !reaction) {
        return res.status(400).json({ error: 'userId and reaction are required' });
    }
    
    var existingReaction = memoryDB.streamLikes.users[userId];
    
    if (existingReaction === reaction) {
        delete memoryDB.streamLikes.users[userId];
        memoryDB.streamLikes.reactions[reaction] = Math.max(0, (memoryDB.streamLikes.reactions[reaction] || 0) - 1);
        memoryDB.streamLikes.count = Math.max(0, memoryDB.streamLikes.count - 1);
    } else {
        if (existingReaction && memoryDB.streamLikes.reactions[existingReaction]) {
            memoryDB.streamLikes.reactions[existingReaction] = Math.max(0, memoryDB.streamLikes.reactions[existingReaction] - 1);
            memoryDB.streamLikes.count = Math.max(0, memoryDB.streamLikes.count - 1);
        }
        memoryDB.streamLikes.users[userId] = reaction;
        memoryDB.streamLikes.reactions[reaction] = (memoryDB.streamLikes.reactions[reaction] || 0) + 1;
        memoryDB.streamLikes.count++;
    }
    
    io.emit('streamLikes', memoryDB.streamLikes);
    io.emit('userLiked', { userName: userName || 'Someone', reaction: reaction });
    
    if (pool) {
        pool.query('UPDATE stream_stats SET total_likes = total_likes + 1 WHERE id = 1').catch(function(){});
    }
    
    res.json(memoryDB.streamLikes);
});

// Post comment to stream
app.post('/api/stream/comment', function(req, res) {
    var { userId, userName, userAvatar, comment } = req.body;
    
    if (!comment || !comment.trim()) {
        return res.status(400).json({ error: 'Comment is required' });
    }
    
    var newComment = {
        id: 'comment_' + Date.now(),
        user: {
            id: userId || 'anonymous',
            name: userName || 'Viewer',
            avatar: userAvatar || '👤'
        },
        text: comment.trim().substring(0, 500),
        timestamp: new Date().toISOString()
    };
    
    memoryDB.streamComments.push(newComment);
    
    if (memoryDB.streamComments.length > 100) {
        memoryDB.streamComments = memoryDB.streamComments.slice(-100);
    }
    
    io.emit('streamComments', memoryDB.streamComments);
    io.emit('newComment', newComment);
    
    if (pool) {
        pool.query('UPDATE stream_stats SET total_comments = total_comments + 1 WHERE id = 1').catch(function(){});
    }
    
    res.status(201).json(newComment);
});

// Share stream
app.post('/api/stream/share', function(req, res) {
    memoryDB.liveStats.shares++;
    
    if (pool) {
        pool.query('UPDATE stream_stats SET total_shares = total_shares + 1 WHERE id = 1').catch(function(){});
    }
    
    io.emit('streamShared', { shares: memoryDB.liveStats.shares });
    
    res.json({ shares: memoryDB.liveStats.shares });
});

// ============ RECORDED VIDEOS API ============

app.get('/api/recordings', async function(req, res) {
    try {
        if (pool) {
            var result = await pool.query('SELECT * FROM recorded_videos ORDER BY created_at DESC');
            res.json(result.rows);
        } else {
            res.json(memoryDB.recordings);
        }
    } catch (err) {
        console.error('❌ Error fetching recordings:', err.message);
        res.json(memoryDB.recordings);
    }
});

app.post('/api/recordings', adminOnly, async function(req, res) {
    var { title, playback_id, duration, thumbnail } = req.body;
   
    if (!title || !playback_id) {
        return res.status(400).json({ error: 'Title and playback ID are required' });
    }
   
    try {
        if (pool) {
            var result = await pool.query(
                'INSERT INTO recorded_videos (title, playback_id, duration, thumbnail) VALUES ($1, $2, $3, $4) RETURNING *',
                [title, playback_id, duration || '00:00', thumbnail || null]
            );
            res.status(201).json(result.rows[0]);
        } else {
            var recording = {
                id: memoryDB.recordings.length + 1,
                title: title,
                playback_id: playback_id,
                duration: duration || '00:00',
                thumbnail: thumbnail || null,
                likes: 0,
                shares: 0,
                created_at: new Date().toISOString()
            };
            memoryDB.recordings.push(recording);
            saveLocalData();
            res.status(201).json(recording);
        }
    } catch (err) {
        console.error('❌ Error adding recording:', err.message);
        res.status(500).json({ error: 'Failed to add recording' });
    }
});

// Like a recording
app.post('/api/recordings/:id/like', async function(req, res) {
    try {
        if (pool) {
            var result = await pool.query(
                'UPDATE recorded_videos SET likes = likes + 1 WHERE id = $1 RETURNING likes',
                [req.params.id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Recording not found' });
            io.emit('recording_like_update', { id: parseInt(req.params.id), likes: result.rows[0].likes });
            res.json({ likes: result.rows[0].likes });
        } else {
            var recording = memoryDB.recordings.find(function(r) { return r.id == req.params.id; });
            if (!recording) return res.status(404).json({ error: 'Recording not found' });
            recording.likes = (recording.likes || 0) + 1;
            saveLocalData();
            res.json({ likes: recording.likes });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Share a recording
app.post('/api/recordings/:id/share', async function(req, res) {
    try {
        if (pool) {
            var result = await pool.query(
                'UPDATE recorded_videos SET shares = shares + 1 WHERE id = $1 RETURNING shares',
                [req.params.id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Recording not found' });
            io.emit('recording_share_update', { id: parseInt(req.params.id), shares: result.rows[0].shares });
            res.json({ shares: result.rows[0].shares });
        } else {
            var recording = memoryDB.recordings.find(function(r) { return r.id == req.params.id; });
            if (!recording) return res.status(404).json({ error: 'Recording not found' });
            recording.shares = (recording.shares || 0) + 1;
            saveLocalData();
            res.json({ shares: recording.shares });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get comments for a recording
app.get('/api/recordings/:id/comments', async function(req, res) {
    try {
        if (pool) {
            var result = await pool.query(
                'SELECT * FROM video_comments WHERE video_id = $1 ORDER BY created_at ASC',
                [req.params.id]
            );
            res.json(result.rows);
        } else {
            var comments = memoryDB.comments.filter(function(c) { return c.video_id == req.params.id; });
            res.json(comments);
        }
    } catch (err) {
        res.json([]);
    }
});

// Add comment to a recording
app.post('/api/recordings/:id/comments', async function(req, res) {
    var { user_name, user_avatar, comment } = req.body;
   
    if (!comment || !comment.trim()) {
        return res.status(400).json({ error: 'Comment is required' });
    }
   
    try {
        if (pool) {
            var result = await pool.query(
                'INSERT INTO video_comments (video_id, user_name, user_avatar, comment) VALUES ($1, $2, $3, $4) RETURNING *',
                [req.params.id, (user_name || 'Viewer').substring(0, 30), user_avatar || '👤', comment.substring(0, 500)]
            );
            io.emit('recording_comment', { video_id: parseInt(req.params.id), comment: result.rows[0] });
            res.status(201).json(result.rows[0]);
        } else {
            var newComment = {
                id: memoryDB.comments.length + 1,
                video_id: parseInt(req.params.id),
                user_name: (user_name || 'Viewer').substring(0, 30),
                user_avatar: user_avatar || '👤',
                comment: comment.substring(0, 500),
                created_at: new Date().toISOString()
            };
            memoryDB.comments.push(newComment);
            saveLocalData();
            res.status(201).json(newComment);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ SOCKET.IO ============

io.on('connection', function(socket) {
    var viewerCount = io.engine.clientsCount;
    memoryDB.liveStats.viewers = viewerCount;
    
    io.emit('viewerCount', viewerCount);
    io.emit('viewer_count', viewerCount);
    console.log('👤 User connected. Total viewers:', viewerCount);
    
    socket.emit('streamLikes', memoryDB.streamLikes);
    socket.emit('streamComments', memoryDB.streamComments);
    
    socket.on('joinStream', function(data) {
        socket.join('stream');
        console.log('📺 User joined stream:', data?.user?.name || 'Anonymous');
    });
    
    socket.on('react', function(data) {
        if (!data || !data.user || !data.reaction) return;
        
        var userId = data.user.id;
        var existingReaction = memoryDB.streamLikes.users[userId];
        
        if (existingReaction === data.reaction) {
            delete memoryDB.streamLikes.users[userId];
            memoryDB.streamLikes.reactions[data.reaction] = Math.max(0, (memoryDB.streamLikes.reactions[data.reaction] || 0) - 1);
            memoryDB.streamLikes.count = Math.max(0, memoryDB.streamLikes.count - 1);
        } else {
            if (existingReaction && memoryDB.streamLikes.reactions[existingReaction]) {
                memoryDB.streamLikes.reactions[existingReaction] = Math.max(0, memoryDB.streamLikes.reactions[existingReaction] - 1);
                memoryDB.streamLikes.count = Math.max(0, memoryDB.streamLikes.count - 1);
            }
            memoryDB.streamLikes.users[userId] = data.reaction;
            memoryDB.streamLikes.reactions[data.reaction] = (memoryDB.streamLikes.reactions[data.reaction] || 0) + 1;
            memoryDB.streamLikes.count++;
        }
        
        io.to('stream').emit('streamLikes', memoryDB.streamLikes);
        io.to('stream').emit('userLiked', { 
            userName: data.user.name || 'Someone', 
            reaction: data.reaction 
        });
    });
    
    socket.on('comment', function(data) {
        if (!data || !data.comment || !data.comment.text) return;
        
        var newComment = {
            id: 'comment_' + Date.now(),
            user: data.comment.user || { id: 'anonymous', name: 'Viewer', avatar: '👤' },
            text: data.comment.text.substring(0, 500),
            timestamp: new Date().toISOString()
        };
        
        memoryDB.streamComments.push(newComment);
        
        if (memoryDB.streamComments.length > 100) {
            memoryDB.streamComments = memoryDB.streamComments.slice(-100);
        }
        
        io.to('stream').emit('streamComments', memoryDB.streamComments);
        io.to('stream').emit('newComment', newComment);
    });
    
    socket.on('chat_message', function(data) {
        if (data && data.user && data.text) {
            io.to('stream').emit('chat_message', {
                user: data.user.substring(0, 30),
                text: data.text.substring(0, 500)
            });
        }
    });
    
    socket.on('shareStream', function() {
        memoryDB.liveStats.shares++;
        io.to('stream').emit('streamShared', { shares: memoryDB.liveStats.shares });
    });
    
    socket.on('disconnect', function() {
        viewerCount = Math.max(0, io.engine.clientsCount);
        memoryDB.liveStats.viewers = viewerCount;
        io.emit('viewerCount', viewerCount);
        io.emit('viewer_count', viewerCount);
        console.log('👤 User disconnected. Total viewers:', viewerCount);
    });
});

// ============ SERVE FRONTEND ============

// Admin panel
app.get('/admin', function(req, res) {
    var adminPath = path.join(WWW_DIR, 'admin.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.send('<h1>Admin Panel</h1><p>Admin panel not found. Create admin.html in www folder.</p>');
    }
});

// SPA fallback - serve index.html
app.get('*', function(req, res) {
    var indexPath = path.join(WWW_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>LCMTV Server</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; background: #0a0a14; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { text-align: center; }
                    h1 { color: #ff6600; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 LCMTV Server</h1>
                    <p>Server is running! Place your index.html in the www folder.</p>
                    <p>Port: ${PORT}</p>
                </div>
            </body>
            </html>
        `);
    }
});

// ============ ERROR HANDLING ============

app.use(function(err, req, res, next) {
    console.error('❌ Server error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ============ START SERVER ============

var PORT = process.env.PORT || 3001;

server.listen(PORT, function() {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║ 🚀 LCMTV Server Started                ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║ Port: ' + PORT + '                         ║');
    console.log('║ App: http://localhost:' + PORT + '     ║');
    console.log('║ Admin: http://localhost:' + PORT + '/admin ║');
    console.log('║ Storage: ' + (pool ? 'PostgreSQL' : 'In-Memory') + '     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', function() {
    console.log('👋 Shutting down gracefully...');
    if (!pool) saveLocalData();
    server.close(function() {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
