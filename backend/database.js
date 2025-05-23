const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear o abrir la base de datos SQLite
const dbPath = path.resolve(__dirname, 'controlstock.db');
const db = new sqlite3.Database(dbPath);

// Crear tabla si no existe
const initDB = () => {
  db.run(`CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto TEXT NOT NULL,
    categoria TEXT,
    cantidad INTEGER NOT NULL
  )`);
};

// Insertar producto
const insertStock = (producto, categoria, cantidad, callback) => {
  db.run('INSERT INTO stock (producto, categoria, cantidad) VALUES (?, ?, ?)',
    [producto, categoria, cantidad],
    function(err) {
      callback(err, this?.lastID);
    });
};

// Obtener todos los productos
const getAllStock = (callback) => {
  db.all('SELECT * FROM stock', [], (err, rows) => {
    callback(err, rows);
  });
};

// Actualizar cantidad de un producto
const updateStock = (id, cantidad, callback) => {
  db.run('UPDATE stock SET cantidad = ? WHERE id = ?', [cantidad, id], function(err) {
    callback(err, this?.changes);
  });
};

// Eliminar un producto
const deleteStock = (id, callback) => {
  db.run('DELETE FROM stock WHERE id = ?', [id], function(err) {
    callback(err, this?.changes);
  });
};

module.exports = {
  initDB,
  insertStock,
  getAllStock,
  updateStock,
  deleteStock,
};
