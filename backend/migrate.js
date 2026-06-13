const mysql = require('mysql2/promise');

async function migrate() {
    console.log("Connecting to local XAMPP database...");
    const localDb = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'fund_collection'
    });

    console.log("Connecting to Cloud Database...");
    const cloudDb = await mysql.createConnection({
        host: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com',
        user: '4C8T5PCddcrYCjW.root',
        password: 'R66Zfn1PDGqMVtsi',
        database: 'test',
        port: 4000,
        ssl: { rejectUnauthorized: true }
    });

    try {
        console.log("Reading your local students...");
        const [students] = await localDb.query("SELECT * FROM students");
        const [payments] = await localDb.query("SELECT * FROM payments");
        const [finalized] = await localDb.query("SELECT * FROM finalized_months");
        
        console.log("Creating tables in the Cloud Database...");
        await cloudDb.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                phone_number VARCHAR(50)
            )
        `);
        
        await cloudDb.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT,
                month VARCHAR(50),
                status ENUM('paid', 'unpaid') DEFAULT 'unpaid',
                UNIQUE KEY unique_payment (student_id, month),
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `);

        await cloudDb.query(`
            CREATE TABLE IF NOT EXISTS finalized_months (
                month VARCHAR(50) PRIMARY KEY,
                finalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log(`Migrating ${students.length} students to the cloud...`);
        for(let s of students) {
            await cloudDb.query(`INSERT IGNORE INTO students (id, name, phone_number) VALUES (?, ?, ?)`, [s.id, s.name, s.phone_number]);
        }

        console.log(`Migrating ${payments.length} payment records...`);
        for(let p of payments) {
            await cloudDb.query(`INSERT IGNORE INTO payments (id, student_id, month, status) VALUES (?, ?, ?, ?)`, [p.id, p.student_id, p.month, p.status]);
        }

        console.log(`Migrating finalized months...`);
        for(let f of finalized) {
            await cloudDb.query(`INSERT IGNORE INTO finalized_months (month, finalized_at) VALUES (?, ?)`, [f.month, f.finalized_at]);
        }
        
        console.log("✅ Migration complete! The cloud database is fully synchronized.");
    } catch(err) {
        console.error("Migration failed:", err);
    } finally {
        localDb.end();
        cloudDb.end();
    }
}

migrate();
