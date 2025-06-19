require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());

app.use('/', authRoutes);

app.listen(8888, () => {
  console.log('Syncify backend running on http://127.0.0.1:8888');
});
