const express = require('express');
const cors = require('cors');
const app = express();
const stockRoutes = require('./routes/StockRoutes');
const db = require('./database'); // ⬅ agregá esta línea
require('dotenv').config();

db.initDB(); // ⬅ y esta línea para que se cree la tabla

app.use(cors());
app.use(express.json());
app.use('/api', stockRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
app.get('/', (req, res) => {
  res.send('API de Control de Stock funcionando ✅');
});

