// XAMPP MySQL/MariaDB connection
// Start MySQL from the XAMPP Control Panel before running the Node.js app.

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',       // Default XAMPP root password is usually empty
  database: 'bookstore',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
