import * as sqlite3 from 'sqlite3';

let db: sqlite3.Database | null = null;

export const getDB = (): sqlite3.Database => {
  if (!db) {
    db = new sqlite3.Database('database.db', (err) => {
      if (err) {
        console.error('Error opening database', err);
      } else {
        console.log('Connected to the SQLite database.');
      }
    });
  }
  return db;
};
