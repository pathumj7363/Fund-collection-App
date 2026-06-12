const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db'); //import our database connection

const app = express();

//middleware

app.use(cors());
app.use(express.json());

// A simple test route
app.get('/api/test', (req, res) => {
    res.json({ message: "Backend is running successfully." })
});

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

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "server error" });

    }
});

// POST to update a student's payment status for a specific month
app.post('/api/payments', async (req, res) => {
    const { student_id, month, status } = req.body;
    try {
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

//start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
