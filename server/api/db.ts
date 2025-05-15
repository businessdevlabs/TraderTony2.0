import * as sqlite3 from 'sqlite3';

let db: sqlite3.Database | null = null;

export const getDB = (): sqlite3.Database => {
  if (!db) {
    db = new sqlite3.Database('database.db', (err) => {
      if (err) {
        console.error('Error opening database', err);
      } else {
        console.log('Connected to the SQLite database.');

        // Create tables for key levels for each timeframe
        const timeframes = ['5m', '10m', '1h', '1d'];
        timeframes.forEach(tf => {
          const tableName = `key_levels_${tf}`;
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              price REAL NOT NULL,
              strength REAL NOT NULL,
              last_date TEXT NOT NULL
            );
          `;
          db!.run(createTableSQL, (err) => {
            if (err) {
              console.error(`Error creating table ${tableName}:`, err);
            } else {
              console.log(`Table ${tableName} is ready.`);
            }
          });
        });
      }
    });
  }
  return db;
};
