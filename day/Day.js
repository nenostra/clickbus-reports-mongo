const mongoose = require('mongoose');

const DaySchema = new mongoose.Schema({
  date: { type: Date, unique: true },
  report: [{
    _id: Number,
    name: String,
    entry_time: String,
    entries: [String],
    worked_hours: String,
    missed_day: Boolean,
    late: Boolean
  }]
});

mongoose.model('Day', DaySchema);

module.exports = mongoose.model('Day');
