const { Pool } = require('pg');
require('dotenv').config(); // Load .env variables

// Configure the pool based on the environment
const dbConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Add SSL configuration for production environments like Render/Heroku
// if (process.env.NODE_ENV === 'production') {
//   dbConfig.ssl = {
//     rejectUnauthorized: false, // Necessary for some cloud providers
//   };
// }

const pool = new Pool(dbConfig);

pool.on('connect', () => {
    console.log('Database connected successfully!');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1); // Exit the process on critical DB error
});

module.exports = {
    // Function to execute queries
    query: (text, params) => pool.query(text, params),
    // Export pool if needed for transactions
    pool: pool,
};