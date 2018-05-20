const mongoose = require('mongoose');

mongoose.connect('mongodb://nenostra:5243562e@clickbus-shard-00-00-yo6hy.'
  + 'mongodb.net:27017,clickbus-shard-00-01-yo6hy.mongodb.net:27017,clickbus-'
  + 'shard-00-02-yo6hy.mongodb.net:27017/test?ssl=true&replicaSet=clickbus-shard'
  + '-0&authSource=admin');
