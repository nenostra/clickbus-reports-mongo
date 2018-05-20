const express = require('express');
const bodyParser = require('body-parser');
const User = require('./User');

const jsonParser = bodyParser.json();
const router = express.Router();

router.get('/:id', (req, res) => {
  User.findById(req.params.id, (err, user) => {
      if (err) console.log(err);
      res.send(user);
    }
  );
});

router.post('/', jsonParser, (req, res) => {
  User.create({
    _id: req.body._id,
    name: req.body.name,
    entry_time: req.body.entry_time,
    week_days: req.body.week_days
  }, (err, user) => {
      if (err) console.log(err);
      res.send(user);
    }
  );
});

router.post('/all', jsonParser, (req, res) => {
  console.log(req.body)
  User.insertMany(req.body, (err, user) => {
      if (err) console.log(err);
      res.send(user);
    }
  );
});

module.exports = router;
