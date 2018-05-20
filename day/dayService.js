const iconv = require('iconv-lite');
const parse = require('csv-parse/lib/sync');
const _ = require('lodash');
const moment = require('moment');

const processData = (buffer, users) => {
  const data = iconv.decode(buffer, 'latin1');

  const parsedData = parse(data);
  let date = _.last(_.compact(parsedData[1])).split('/');
  date = [date[2], date[0], date[1]].join('-');

  const dataInfo = parsedData.slice(3, parsedData.length - 1);
  const chunked = dataInfo.map(elem => _.chunk(elem,2));
  const zipped =  _.zip(...chunked);
  const flattened = _.flattenDeep(zipped);
  const compacted = _.compact(flattened);
  const compactedAndChunked = _.chunk(compacted,2);

  const peopleList = compactedAndChunked.reduce((acc, val) => {
    const switcher = isNaN(val[0][0]) ? val[0] : 'date';
    return switcher === 'ID' ? [...acc, {[val[0]]: val[1], 'Entradas': []}] :
      switcher === 'date' ? [...acc.slice(0, acc.length - 1),
          Object.assign(_.last(acc),
          {'Entradas': [...acc[acc.length - 1].Entradas, val[0].split(" ")[1]]})] :
      [...acc.slice(0, acc.length - 1), Object.assign(_.last(acc), {[val[0]]: val[1]})];
  },[]);

  let scheduledPeopleList = peopleList.map(people => {
    return Object.assign(people,
      {worked_hours: calculateHours(people.Entradas)});
  });

  const map = {
    'ID': '_id',
    'Entradas': 'entries',
    'Nombre ': 'name', //TODO: QUITAR NAME CUANDO QUEDE O PONER REPORTE COMPLETO
  }

  scheduledPeopleList.forEach(person => {
    delete person["Departamento"];
    delete person["Entrada"];
    delete person["Salida"];
  });

  scheduledPeopleList = scheduledPeopleList.map(person => {
    const replacedItems = Object.keys(person).map((key) => {
      const newKey = map[key] || key;
      return { [newKey] : person[key] };
    });

    return replacedItems.reduce((a, b) => Object.assign({}, a, b));
  });

  scheduledPeopleList.sort(function(a, b){
    if(a['name'] < b['name']) return -1;
    if(a['name'] > b['name']) return 1;
    return 0;
  });

  let indexedUsers = users
    .reduce((acc, val) => {
      return {...acc, [val._id]: val}
    }, {});

  scheduledPeopleList = scheduledPeopleList.map(person => {
    const llegada = person.entries[0];
    return indexedUsers[person._id] ?
      {...person,
        name: indexedUsers[person._id].name,
        late: isLate(indexedUsers[person._id].entry_time , llegada),
        entry_time: indexedUsers[person._id].entry_time,
        missed_day: false
      } :
      person;
  });

  indexedUsers = users
    .filter(user => user.week_days.includes(moment.utc(date).weekday()))
    .reduce((acc, val) => {
      return {...acc, [val._id]: val}
    }, {});

  const missedList = Object.values(missedDay(scheduledPeopleList, indexedUsers, date));

  missedList.forEach(user => {
    scheduledPeopleList.push({
      "_id": user._id,
      "name": user.name,
      "worked_hours": "00:00",
      "late": false,
      "entry_time": "10:10",
      "entries": [],
      "missed_day": true
    })
  });

  return [scheduledPeopleList, date];
};

const generateReport = (interval, users) => {
  const indexedInterval = interval.map( day =>
    day.report.reduce((acc, val) => ({...acc, [val._id]: val})
    ,{ date: day.date})
  );

  const report = users.map(user => {
    const data = indexedInterval.reduce((acc, day) => {
      const userDay = day[user._id];
      const date = day.date;

      return userDay ? {
        missed_days: acc.missed_days + Number(userDay.missed_day),
        late: acc.late + Number(userDay.late),
        should_have_worked_hours: acc.should_have_worked_hours +
          9*Number(user.week_days.includes(moment.utc(date).weekday())),
        actual_worked_hours: timeStringSum(acc.actual_worked_hours, userDay.worked_hours)
      } : acc;
    }
      ,{
        missed_days: 0,
        late: 0,
        should_have_worked_hours: 0,
        actual_worked_hours: '0:0' //TODO: VALIDAR PARA WORKED HOURS UNDEFINED!
      }
    );
    return {
      _id: user._id,
      name: user.name,
      entry_time: user.entry_time,
      missed_days: data.missed_days,
      late: data.late,
      should_have_worked_hours: data.should_have_worked_hours,
      actual_worked_hours: data.actual_worked_hours,
      balance: timeStringSubs(data.actual_worked_hours,
        String(data.should_have_worked_hours) + ':00')
    }
  });

  return report;
}

const calculateHours = entradas => {
  const dates = entradas.map(entrada =>
    moment(new Date('1970-01-01 ' + entrada)));

  const formatedTime = minutos => {
    const formatedMins = String(minutos%60).length === 1 ?
      '0' + String(minutos%60) : String(minutos%60);
    return String(Math.floor(minutos/60)) + ':' + formatedMins;
  };

  const len = dates.length;
  const hours = len > 1 ?
    formatedTime(Math.abs(dates[0].diff(dates[len - 1], 'minutes'))) :
    'indefinido'
  return hours;
}

const isLate = (entrada, llegada) => {
  const momentEntrada = moment(new Date('1970-01-01 ' + entrada));
  const momentLlegada = moment(new Date('1970-01-01 ' + llegada));
  return momentLlegada.diff(momentEntrada) > 0;
}

const missedDay = (report, users, date) => {
  let missedDay = {...users};
  report.forEach(user => {
    if (missedDay[user._id]) {
      delete missedDay[user._id];
    }
  });
  return missedDay;
}

const timeStringSum = (a, b) => {
  const aArray = a.split(':');
  const bArray = b.split(':');

  const mins = Number(aArray[1]) + Number(bArray[1]);
  let realMins = String(mins % 60);
  realMins = realMins.length === 1 ? '0' + realMins : realMins;
  const hours = Number(aArray[0]) + Number(bArray[0]) + Math.floor(mins/60);
  return `${hours}:${realMins}`;
}

const timeStringSubs = (a, b) => {
  const aArray = a.split(':');
  const bArray = b.split(':');
  let aMins = aArray[1];

  const mins = 60 - Number(aMins);
  let realMins = String(mins % 60);
  realMins = realMins.length === 1 ? '0' + realMins : realMins;
  aMins = aMins.length === 1 ? '0' + aMins : aMins;
  const hours = Number(aArray[0]) - Number(bArray[0]);

  return hours < 0 ? `-${Math.abs(hours+1)}:${realMins}` : `${hours}:${aMins}`;
}

module.exports = { processData, generateReport };
