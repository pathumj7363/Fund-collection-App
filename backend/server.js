const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); //import our database connection
const app = express();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const whatsappClient = new Client({
    authStrategy: new LocalAuth({
        dataPath: process.env.SPACE_ID ? '/data/.wwebjs_auth' : './.wwebjs_auth'
    }),
    puppeteer: {
        // Only use the hardcoded Windows path if running locally on your PC. 
        // In production (cloud server), it will automatically download and use its own Chromium.
        ...(process.env.NODE_ENV !== 'production' && { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }),
        ...(process.env.NODE_ENV === 'production' && { executablePath: '/usr/bin/google-chrome-stable' }),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

whatsappClient.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("WAITING... Scan the QR code above with your WhatsApp app!");
});

whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp Client is ready and connected!');
});

whatsappClient.initialize();

// middleware

app.use(cors());
app.use(express.json());

// A simple test route
app.get('/api/test', (req, res) => {
    res.json({ message: "Backend is running successfully." })
});

// Ensure finalized_months table exists
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS finalized_months (
                month VARCHAR(50) PRIMARY KEY,
                finalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (err) {
        console.error("Error creating finalized_months table", err);
    }
})();

// GET students and their payment status for a specific month
app.get('/api/students/:month', async (req, res) => {
    const month = req.params.month;
    try {
        // We use a LEFT JOIN to get all students, and if they have a payment for this month, we get that too
        const [rows] = await db.query(`
            SELECT s.id, s.name, IFNULL(p.status, 'unpaid') as status 
            FROM students s
            LEFT JOIN payments p ON s.id = p.student_id AND p.month = ?
            ORDER BY s.id ASC
        `, [month]);

        const [finalizedRows] = await db.query(`SELECT * FROM finalized_months WHERE month = ?`, [month]);
        const isFinalized = finalizedRows.length > 0;

        res.json({ students: rows, isFinalized });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "server error" });

    }
});

// POST to update a student's payment status for a specific month
app.post('/api/payments', async (req, res) => {
    const { student_id, month, status } = req.body;
    try {
        const [finalizedRows] = await db.query(`SELECT * FROM finalized_months WHERE month = ?`, [month]);
        if (finalizedRows.length > 0) {
            return res.status(403).json({ error: "Month is finalized" });
        }

        // We use INSERT ... ON DUPLICATE KEY UPDATE to either create the record or update it if it exists
        await db.query(`
            INSERT INTO payments (student_id, month, status) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `, [student_id, month, status]);

        res.json({ message: "payment updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "server error" });
    }

});

// POST to finalize a month
app.post('/api/finalize', async (req, res) => {
    const { month } = req.body;
    try {
        await db.query(`
            INSERT INTO finalized_months (month) 
            VALUES (?) 
            ON DUPLICATE KEY UPDATE month = VALUES(month)
        `, [month]);
        res.json({ message: "Month finalized successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "server error" });
    }
});

// POST to send WhatsApp reminders
app.post('/api/whatsapp/remind', async (req, res) => {
    const { month, message } = req.body;
    
    try {
        // Find unpaid students for the selected month (including those with no payment record yet)
        const [unpaidStudents] = await db.query(
            `SELECT s.id, s.name, s.phone_number 
             FROM students s 
             LEFT JOIN payments p ON s.id = p.student_id AND p.month = ? 
             WHERE p.status = 'unpaid' OR p.status IS NULL`,
            [month]
        );
        
        if(unpaidStudents.length === 0) {
            return res.status(200).json({ 
                message: "No unpaid students found.", 
                intended: 0, 
                successful: [], 
                failed: [] 
            });
        }
        
        const successful = [];
        const failed = [];

        // Loop through unpaid students and send WhatsApp message
        for (const student of unpaidStudents) {
            if (student.phone_number) {
                try {
                    const chatId = `${student.phone_number}@c.us`;
                    await whatsappClient.sendMessage(chatId, message);
                    successful.push(student);
                } catch (err) {
                    console.error(`Failed to send to ${student.name}:`, err);
                    failed.push({ ...student, reason: "WhatsApp send failed" });
                }
            } else {
                failed.push({ ...student, reason: "No phone number" });
            }
        }
        
        res.status(200).json({ 
            message: "Messages processed!", 
            intended: unpaidStudents.length,
            successful,
            failed
        });
    } catch (error) {
        console.error("WhatsApp Error:", error);
        res.status(500).json({ error: "Failed to send messages" });
    }
});

//start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
