const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const zlib = require('zlib');
const crypto = require('crypto');
const cron = require('node-cron');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = 3001;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Store contacts in memory (replace with database in production)
let contacts = [];

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('Created data directory at:', dataDir);
}

const dbPath = path.join(dataDir, 'contacts.db');
console.log('Database path:', dbPath);

// Replace SQLite database connection with PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Replace SQLite queries with PostgreSQL syntax
// Create table query
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    salutation TEXT,
    firstName TEXT,
    lastName TEXT,
    jobTitle TEXT,
    company TEXT,
    email TEXT,
    workPhone TEXT,
    homePhone TEXT,
    mobilePhone TEXT,
    address1 TEXT,
    address2 TEXT,
    city TEXT,
    state TEXT,
    zipCode TEXT,
    country TEXT,
    webPage TEXT,
    group_name TEXT,
    notes TEXT,
    image TEXT,
    image2 TEXT,
    image3 TEXT,
    image4 TEXT,
    image5 TEXT,
    video TEXT,
    youtubeUrl TEXT,
    attachments TEXT,
    birthday TEXT,
    anniversary TEXT,
    department TEXT,
    supervisor TEXT,
    assistant TEXT,
    employeeId TEXT,
    linkedin TEXT,
    twitter TEXT,
    facebook TEXT,
    instagram TEXT,
    skype TEXT,
    whatsapp TEXT,
    telegram TEXT,
    signal TEXT,
    discord TEXT,
    slack TEXT,
    wechat TEXT,
    line TEXT,
    pinterest TEXT,
    tiktok TEXT,
    snapchat TEXT,
    reddit TEXT,
    github TEXT,
    stackoverflow TEXT,
    medium TEXT,
    preferredContact TEXT,
    timeZone TEXT,
    language TEXT,
    doNotContact BOOLEAN,
    emailOptOut BOOLEAN,
    leadSource TEXT,
    category TEXT,
    status TEXT,
    lastContactDate TEXT,
    nextFollowUp TEXT,
    tags TEXT,
    customFields TEXT
  )
`;

pool.query(createTableQuery)
  .then(() => console.log('Table created successfully'))
  .catch(err => console.error('Error creating table:', err));

// API Routes
app.get('/contacts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/contacts', (req, res) => {
    const contact = req.body;
    contact.id = Date.now().toString();
    contacts.push(contact);
    res.json(contact);
});

app.put('/contacts/:id', (req, res) => {
    const id = req.params.id;
    const updatedContact = req.body;
    const index = contacts.findIndex(c => c.id === id);
    if (index !== -1) {
        contacts[index] = { ...contacts[index], ...updatedContact };
        res.json(contacts[index]);
    } else {
        res.status(404).json({ error: 'Contact not found' });
    }
});

app.delete('/contacts/:id', (req, res) => {
    const id = req.params.id;
    contacts = contacts.filter(c => c.id !== id);
    res.json({ message: 'Contact deleted' });
});

app.post('/contacts/clear', (req, res) => {
    contacts = [];
    res.json({ message: 'All contacts cleared' });
});

app.post('/import', (req, res) => {
    const importedContacts = req.body;
    contacts = importedContacts;
    res.json({ message: 'Contacts imported successfully' });
});

app.get('/export/binary', (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(uploadsDir, `backup-${timestamp}.json`);
    
    fs.writeFileSync(backupPath, JSON.stringify(contacts, null, 2));
    res.json({ 
        message: 'Backup created successfully',
        backupPath: backupPath
    });
});

app.post('/import/binary/:timestamp', (req, res) => {
    const { timestamp } = req.params;
    const backupPath = path.join(uploadsDir, `backup-${timestamp}.json`);
    
    try {
        const backupData = fs.readFileSync(backupPath, 'utf8');
        contacts = JSON.parse(backupData);
        res.json({ message: 'Backup restored successfully' });
    } catch (error) {
        res.status(404).json({ error: 'Backup file not found' });
    }
});

// Export endpoint
app.get('/export', (req, res) => {
    console.log('Export request received');
    
    pool.query('SELECT * FROM contacts', [], (err, result) => {
        if (err) {
            console.error('Export database error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        try {
            console.log('Found contacts:', result.rows.length);
            res.json(result.rows);
        } catch (error) {
            console.error('Export JSON error:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Add a new import endpoint
app.post('/import', async (req, res) => {
    let hasResponded = false;
    try {
        const contacts = req.body;
        
        // Start a transaction
        await new Promise((resolve, reject) => {
            pool.query('BEGIN', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Insert each contact
        for (const contact of contacts) {
            // Remove any problematic fields that might cause SQL errors
            const cleanContact = {
                salutation: contact.salutation || null,
                firstName: contact.firstName || null,
                lastName: contact.lastName || null,
                jobTitle: contact.jobTitle || null,
                company: contact.company || null,
                email: contact.email || null,
                workPhone: contact.workPhone || null,
                homePhone: contact.homePhone || null,
                mobilePhone: contact.mobilePhone || null,
                address1: contact.address1 || null,
                address2: contact.address2 || null,
                city: contact.city || null,
                state: contact.state || null,
                zipCode: contact.zipCode || null,
                country: contact.country || null,
                webPage: contact.webPage || null,
                group_name: contact.group || null,
                notes: contact.notes || null,
                youtubeUrl: contact.youtubeUrl || null,

                // Add binary data fields
                image: contact.image || null,
                image2: contact.image2 || null,
                image3: contact.image3 || null,
                image4: contact.image4 || null,
                image5: contact.image5 || null,
                video: contact.video || null,
                attachments: contact.attachments || null,

                // Add new fields
                birthday: contact.birthday || null,
                anniversary: contact.anniversary || null,
                // ... other new fields ...
            };

            const columns = Object.keys(cleanContact);
            const values = Object.values(cleanContact);
            const placeholders = columns.map(() => '?').join(',');

            await new Promise((resolve, reject) => {
                const query = `INSERT INTO contacts (${columns.join(',')}) VALUES (${placeholders})`;
                pool.query(query, values, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Commit the transaction
        await new Promise((resolve, reject) => {
            pool.query('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!hasResponded) {
            hasResponded = true;
            res.json({ message: 'Import successful' });
        }
    } catch (error) {
        // Rollback on error
        await new Promise((resolve) => {
            pool.query('ROLLBACK', resolve);
        });
        console.error('Import error:', error);
        if (!hasResponded) {
            hasResponded = true;
            res.status(500).json({ error: error.message });
        }
    }
});

// Binary export endpoint
app.get('/export/binary', async (req, res) => {
    console.log('Export binary endpoint hit');
    try {
        console.log('Starting binary backup...');
        
        // Create backup directories if they don't exist
        console.log('Creating backup directories...');
        await fsPromises.mkdir(uploadsDir, { recursive: true });
        
        // Get all contacts with binary data
        console.log('Fetching contacts from database...');
        const contacts = await new Promise((resolve, reject) => {
            pool.query('SELECT id, image, video, attachments FROM contacts', [], (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                } else {
                    console.log(`Found ${result.rows.length} contacts`);
                    resolve(result.rows);
                }
            });
        });

        // Create timestamp for backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(uploadsDir, `backup-${timestamp}.json`);
        console.log('Creating backup file:', backupPath);
        
        // Save binary data for each contact
        console.log('Saving contact data...');
        fs.writeFileSync(backupPath, JSON.stringify(contacts, null, 2));

        console.log('Backup completed successfully');
        res.json({
            message: 'Binary backup completed successfully',
            backupPath: backupPath
        });
    } catch (error) {
        console.error('Binary export error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Binary import endpoint
app.post('/import/binary/:timestamp', async (req, res) => {
    try {
        const { timestamp } = req.params;
        const backupPath = path.join(uploadsDir, `backup-${timestamp}.json`);
        
        // Verify backup exists
        const exists = await fsPromises.access(backupPath).then(() => true).catch(() => false);
        if (!exists) {
            throw new Error('Backup not found');
        }

        // Read backup data
        const backupData = await fsPromises.readFile(backupPath, 'utf8');
        const contacts = JSON.parse(backupData);

        // Start a transaction
        await new Promise((resolve, reject) => {
            pool.query('BEGIN', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Insert each contact
        for (const contact of contacts) {
            // Remove any problematic fields that might cause SQL errors
            const cleanContact = {
                salutation: contact.salutation || null,
                firstName: contact.firstName || null,
                lastName: contact.lastName || null,
                jobTitle: contact.jobTitle || null,
                company: contact.company || null,
                email: contact.email || null,
                workPhone: contact.workPhone || null,
                homePhone: contact.homePhone || null,
                mobilePhone: contact.mobilePhone || null,
                address1: contact.address1 || null,
                address2: contact.address2 || null,
                city: contact.city || null,
                state: contact.state || null,
                zipCode: contact.zipCode || null,
                country: contact.country || null,
                webPage: contact.webPage || null,
                group_name: contact.group || null,
                notes: contact.notes || null,
                youtubeUrl: contact.youtubeUrl || null,

                // Add binary data fields
                image: contact.image || null,
                image2: contact.image2 || null,
                image3: contact.image3 || null,
                image4: contact.image4 || null,
                image5: contact.image5 || null,
                video: contact.video || null,
                attachments: contact.attachments || null,

                // Add new fields
                birthday: contact.birthday || null,
                anniversary: contact.anniversary || null,
                // ... other new fields ...
            };

            const columns = Object.keys(cleanContact);
            const values = Object.values(cleanContact);
            const placeholders = columns.map(() => '?').join(',');

            await new Promise((resolve, reject) => {
                const query = `INSERT INTO contacts (${columns.join(',')}) VALUES (${placeholders})`;
                pool.query(query, values, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Commit the transaction
        await new Promise((resolve, reject) => {
            pool.query('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({
            message: 'Binary data restored successfully',
            contactCount: contacts.length
        });
    } catch (error) {
        console.error('Binary import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    console.log('Test endpoint hit');
    res.json({ message: 'Test successful' });
});

// Compress backup endpoint
app.get('/backup/compress', async (req, res) => {
    try {
        // Get the latest backup
        const backups = await fsPromises.readdir(uploadsDir);
        const latestBackup = backups
            .filter(b => b.startsWith('backup-'))
            .sort()
            .reverse()[0];
        
        if (!latestBackup) {
            throw new Error('No backup found to compress');
        }

        const backupPath = path.join(uploadsDir, latestBackup);
        const compressedPath = backupPath + '.gz';

        // Read and compress the entire backup directory
        const output = zlib.createGzip();
        const archive = require('tar').create(
            { gzip: true },
            [backupPath]
        ).pipe(fsPromises.createWriteStream(compressedPath));

        await new Promise((resolve, reject) => {
            archive.on('finish', resolve);
            archive.on('error', reject);
        });

        // Get sizes for comparison
        const originalSize = await getDirSize(backupPath);
        const compressedSize = (await fsPromises.stat(compressedPath)).size;
        const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

        res.json({
            compressedSize: formatBytes(compressedSize),
            originalSize: formatBytes(originalSize),
            compressionRatio: `${ratio}%`
        });
    } catch (error) {
        console.error('Compression error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify backup endpoint
app.get('/backup/verify', async (req, res) => {
    try {
        const issues = [];
        const backups = await fsPromises.readdir(uploadsDir);
        const latestBackup = backups
            .filter(b => b.startsWith('backup-'))
            .sort()
            .reverse()[0];

        if (!latestBackup) {
            throw new Error('No backup found to verify');
        }

        const backupPath = path.join(uploadsDir, latestBackup);
        
        // Verify backup exists
        const exists = await fsPromises.access(backupPath).then(() => true).catch(() => false);
        if (!exists) {
            issues.push('Backup file not found');
        }

        // Verify backup is readable
        try {
            await fsPromises.access(backupPath, fs.constants.R_OK);
        } catch (e) {
            issues.push('Backup file is not readable');
        }

        res.json({
            isValid: issues.length === 0,
            issues: issues
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Schedule backup endpoint
app.post('/backup/schedule', async (req, res) => {
    try {
        const { frequency, time } = req.body;
        const [hours, minutes] = time.split(':');
        
        // Create cron expression based on frequency
        let cronExpression;
        switch (frequency) {
            case 'daily':
                cronExpression = `${minutes} ${hours} * * *`;
                break;
            case 'weekly':
                cronExpression = `${minutes} ${hours} * * 1`; // Monday
                break;
            case 'monthly':
                cronExpression = `${minutes} ${hours} 1 * *`; // 1st of month
                break;
            default:
                throw new Error('Invalid frequency');
        }

        // Save schedule to config file
        const config = {
            backupSchedule: {
                frequency,
                time,
                cronExpression
            }
        };
        await fsPromises.writeFile(
            path.join(__dirname, 'backup-config.json'),
            JSON.stringify(config, null, 2)
        );

        // Schedule the backup
        if (global.backupJob) {
            global.backupJob.stop();
        }
        global.backupJob = cron.schedule(cronExpression, async () => {
            try {
                // Perform full backup
                await performFullBackup();
            } catch (error) {
                console.error('Scheduled backup failed:', error);
            }
        });

        res.json({ message: 'Backup schedule saved successfully' });
    } catch (error) {
        console.error('Schedule error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Backup settings endpoint
app.post('/backup/settings', async (req, res) => {
    try {
        const { compressionLevel, retentionPeriod, encryptBackups } = req.body;
        
        // Save settings to config file
        const settings = { compressionLevel, retentionPeriod, encryptBackups };
        await fsPromises.writeFile(
            path.join(__dirname, 'backup-settings.json'),
            JSON.stringify(settings, null, 2)
        );

        // Apply retention policy
        if (retentionPeriod) {
            const backups = await fsPromises.readdir(uploadsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(retentionPeriod));

            for (const backup of backups) {
                if (backup.startsWith('backup-')) {
                    const backupDate = new Date(backup.replace('backup-', '').replace(/-/g, ':'));
                    if (backupDate < cutoffDate) {
                        await fsPromises.rm(path.join(uploadsDir, backup), { recursive: true });
                    }
                }
            }
        }

        res.json({ message: 'Backup settings saved successfully' });
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper functions
async function getDirSize(dirPath) {
    const files = await fsPromises.readdir(dirPath);
    const stats = await Promise.all(
        files.map(file => fsPromises.stat(path.join(dirPath, file)))
    );
    return stats.reduce((acc, { size }) => acc + size, 0);
}

function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 