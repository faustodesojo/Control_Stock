const express = require('express');
const router = express.Router();
const db = require('../database');

// Obtener todos los productos
router.get('/productos', (req, res) => {
  db.getAllStock((err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Agregar un nuevo producto
router.post('/productos', (req, res) => {
  const { producto, categoria, cantidad } = req.body;
  db.insertStock(producto, categoria, cantidad, (err, id) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id });
  });
});

// Actualizar stock
router.put('/productos/:id', (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;
  db.updateStock(id, cantidad, (err, changes) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: changes });
  });
});

// Eliminar un producto
router.delete('/productos/:id', (req, res) => {
  const { id } = req.params;
  db.deleteStock(id, (err, changes) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: changes });
  });
});

module.exports = router;
