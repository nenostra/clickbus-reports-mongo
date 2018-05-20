const express = require('express');
const dayService = require('./dayService');
const multer  = require('multer');
const bodyParser = require('body-parser');
const boom = require('boom');
const User = require('../user/User');
const Day = require('./Day');

const jsonParser = bodyParser.json();
const upload = multer();
const router = express.Router();

const asyncMiddleware = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (!err.isBoom) {
      return next(boom.badImplementation(err));
    }
    next(err);
  });
}; //TODO: MOVER A OTRO ARCHIVO

router.get('/:day(\\d{4}-[01][\\d]-[0-3][\\d])', asyncMiddleware(async (req, res) => {
  const day = await Day.findOne({
      date: req.params.day
    });
  if (!day) {
    throw boom.notFound("DIA VACIO")
  }
  res.status(200).send(day)
}));

router.get('/:from(\\d{4}-\\d{2}-\\d{2})/:to(\\d{4}-\\d{2}-\\d{2})', async (req, res) => {
  const dayInterval = await Day.find({
      date: {"$gte": req.params.from, "$lt": req.params.to + ' 00:00:01'}
    });
  const users = await User.find({});
  const report = dayService.generateReport(dayInterval, users);

  res.send(report); //TODO: LANZAR ERROR SI NO ESTAN TODOS LOS DIAS DEL INTERVALO
});

router.post('/', upload.single('file'), asyncMiddleware(async (req, res) => {
  const extention = req.file.originalname.split(".");
  if (extention[extention.length - 1] !== "csv") {
    throw boom.badRequest("EL FORMATO DEL ARCHIVO DEBE SER CSV");
  }
  const users = await User.find({});
  [report, date] = dayService.processData(req.file.buffer, users)
  try {
    const day = await Day.create({
        date,
        report
      });
    res.status(201).send({ day });
  } catch(err) {
    throw boom.boomify(err)
  }
}));

router.put('/:day(\\d{4}-[01][\\d]-[0-3][\\d])', jsonParser, (req, res) => {
  Day.findOne({
      date: req.params.day
    }, (err, day) => {
      if (err) console.log('error: ', err);
      day.report = req.body.data.users
      day.save(function (err, updatedDay) {
        if (err) console.log(err);
        res.status(200).send(updatedDay);
      });
    }
  );
});



module.exports = router;
