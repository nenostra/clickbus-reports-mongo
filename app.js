const express = require('express');
const morgan = require('morgan');
const db = require('./db');
const DayController = require('./day/DayController');
const UserController = require('./user/UserController');

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  next();
});

app.use(morgan('dev'));

app.use('/days', DayController);
app.use('/users', UserController);

app.use((err, req, res, next) => {
  if (err.isServer) {
    if (err.code === 11000) {
      res.status(400).json({ message: "EL ARCHIVO QUE TRATAS DE SUBIR YA EXISTE" })
    }
    console.log(err)
  }
  return res.status(err.output.statusCode).json(err.output.payload);
});

module.exports = app;
