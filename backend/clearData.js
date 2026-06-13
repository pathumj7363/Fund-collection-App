const db = require('./db');

async function clearData() {
    try {
        await db.query('TRUNCATE TABLE payments');
        await db.query('TRUNCATE TABLE finalized_months');
        console.log('Database tables cleared successfully.');
    } catch (err) {
        console.error('Error clearing data:', err);
    } finally {
        process.exit();
    }
}

clearData();
