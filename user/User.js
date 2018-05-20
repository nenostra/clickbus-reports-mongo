const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  _id: Number,
  name: String, //TODO: SEPARAR EN NOMBRES Y APELLIDOS
  entry_time: String,
  week_days: [Number]
});
mongoose.model('User', UserSchema);

module.exports = mongoose.model('User');
