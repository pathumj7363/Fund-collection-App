const db = require('./db');

async function dumpSchema() {
    try {
        const [students] = await db.query('SHOW CREATE TABLE students');
        console.log('--- students ---');
        console.log(students[0]['Create Table']);

        const [payments] = await db.query('SHOW CREATE TABLE payments');
        console.log('--- payments ---');
        console.log(payments[0]['Create Table']);

        const [finalized] = await db.query('SHOW CREATE TABLE finalized_months');
        console.log('--- finalized_months ---');
        console.log(finalized[0]['Create Table']);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

dumpSchema();
