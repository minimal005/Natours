const mongoose = require('mongoose');
const dotenv = require('dotenv');

// робота з неперехопленими виключеннями
process.on('uncaughtException', (err) => {
  console.log('НЕПЕРЕХОПЛЕНИЙ ВИЙНЯТОК! 💥 Закриття...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose.connect(DB).then(() => console.log('DB connection successful'));
// .catch((err) => console.log('ERRROOORR'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// робота з необробленими відхиленнями
process.on('unhandledRejection', (err) => {
  console.log('НЕОБРОБЛЕНЕ ВІДХИЛЕННЯ! 💥 Закриття...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
