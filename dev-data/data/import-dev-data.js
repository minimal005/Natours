const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful'))
  .catch((err) => console.log('ERRROOORR'));

//   read json file

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8'),
);

// import data in DB
const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('loaded');
  } catch (err) {
    console.log(err);
  }
};
// delete all data from collection

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('deleted');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
console.log(process.argv);
