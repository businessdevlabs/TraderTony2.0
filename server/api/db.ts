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
        const timeframes = ['1m', '5m', '1h', '1d'];
        timeframes.forEach(tf => {
          const tableName = `ohlc_${tf}`;
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              timestamp INTEGER NOT NULL,
              open REAL NOT NULL,
              high REAL NOT NULL,
              low REAL NOT NULL,
              close REAL NOT NULL,
              volume REAL NOT NULL,
              ticker TEXT NOT NULL
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

        // Create ohlc_1d table if not exists
        const ohlc1dTableSQL = `
          CREATE TABLE IF NOT EXISTS ohlc_1d (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL,
            ticker TEXT NOT NULL
          );
        `;
        db!.run(ohlc1dTableSQL, (err) => {
          if (err) {
            console.error('Error creating table ohlc_1d:', err);
          } else {
            console.log('Table ohlc_1d is ready.');
          }
        });
      }
    });
  }
  return db;
};
