const fs = require('fs');
const chalk = require('chalk');
const MongoClient = require('mongodb').MongoClient;
const log = require('console-log-level')(
  {level: (process.env.NODE_ENV === 'development') ? 'debug' : 'info'});
  
// const url = 'mongodb://localhost:27017';
// const dbName = 'myproject';

const commandLineArgs = require('command-line-args');
var optionDefinitions = [
  { name: 'cards', alias: 'c', type: String, 
    description: 'Scryfall card list json file path.', required: true},
  { name: 'sets', alias: 's', type: String, required: false},
  { name: 'verbose', alias: 'v', type: Boolean, required: false},
  { name: 'mongo_url', type: String, 
    description: 'URL of mongo connection.', required: true},
  { name: 'mongo_db', type: String, 
    description: 'Name of project database.', required: true}
];

var options;
try {
  options = commandLineArgs(optionDefinitions);
  optionDefinitions.forEach((option) => {
    if (option.required && !options.hasOwnProperty(option.name)) {
      throw 'Missing required parameter: ' + option.name + ' = ' +
        option.description;
    }
  });
} catch(error) {
  log.error(chalk.red(error));
  log.error('Expected params:');
  optionDefinitions.forEach((option) => {
    log.error('\t' + option.name);
  });

  chalk.blue(JSON.stringify(optionDefinitions, null, ' '));
  process.exit(0);
}

var cards = null;
try {
  let rawCardData = fs.readFileSync(options.cards);
  try {
    cards = JSON.parse(rawCardData);
  } catch(e) {
    log.error(chalk.red('Error: File ' + options.cards + ' found, but issue parsing JSON:\n' +
      e));
    process.exit(1);
  }
} catch(e) {
  log.error(chalk.red('Error: Issue opening file at: ' + options.cards + 
    '. Please include FULL path of cards file (ex: /home/user/Downloads/...)\n' + e));
  process.exit(0);
}

// [Optional] sets to import config
var setsToPopulate = null;
if (options.hasOwnProperty('sets')) {
  if (!options.sets.trim().match(/^[,0-9a-zA-Z]+$/)) {
    log.error(chalk.red('Error: sets value must be list of set codes seperated by ' + 
      'commas. For example: eld,war,m20'));
    process.exit(0);
  }

  setsToPopulate = options.sets.trim().split(',');
  log.info(chalk.blue('Importing ' + setsToPopulate.length +　
    ' set(s):' + setsToPopulate));
} else {
  log.info(chalk.blue('No specific sets specified, importing all sets'));
}

MongoClient.connect(options.mongo_url, {useUnifiedTopology: true}, (error, client) => {
  if (error) {
    log.info(chalk.red('Failed to connect to the mongo server \t url: ' + 
      options.mongo_url + ' | db: ' + options.mongo_db));
    process.exit(0);
  } else {
    log.info(chalk.green('Connected successfully to the mongo server ' + options.mongo_url));
  }

  cards = cards.filter(function(card) {
    if (!card.hasOwnProperty('set')) {
      spinner.fail('Abort: Missing property \'set\': ' +　getCardInfo(card, true));
      process.exit(0);
    } else if (!card.hasOwnProperty('booster')) {
      spinner.fail('Abort: Missing property \'booster\': ' +　getCardInfo(card, true));
      process.exit(0);
    } else {
      if (card['booster'] === true) {
        if (setsToPopulate === null || setsToPopulate.includes(card.set)) {
          return true;
        }
      }
    }
  });

  cards = cards.filter(function(card) {
    return (card.lang == 'en');
  });

  // Split 'type_line' string into array of types
  for (var i = 0; i < cards.length; i++) {
    var types = cards[i].type_line.split('—');
    cards[i].types = types.map(type => type.trim())
    delete cards.type_line;
  }




  var db = client.db(options.mongo_db);
  Promise.all([db.dropCollection('cards').catch((err) => {
    // Remove collection named 'cards'. If collection doesn't exist
    // then NamespaceNotFound error will be thrown (which is fine).
    if (err && err.codeName != 'NamespaceNotFound') {
      log.error(chalk.red('Error droping the existing collection \'cards\''));
      log.error(err);
    }
  })]);

  db.createCollection('cards', function(creationError, collection) {
    if (creationError) {
      log.error(chalk.red('Error creating the collection \'cards\''));
      log.error(err);
      process.exit(1);
    }
    collection.insertMany(cards, function(insertError) {
      if (insertError) {
        log.error(chalk.red('Error inserting cards into the collection'));
        log.error(err);
        process.exit(1);
      } else {
        log.info(chalk.green('Successfully inserted cards into the collection ' +
          '\'cards\' in the db \'' + options.mongo_db + '\''));
          process.exit(0);
      }
    });
  });
});

function getCardInfo(card, isShowFullJson) {
  return card['id'] + ' - ' + card['name'] + ' - ' + card['set_name'] + 
    (isShowFullJson ? '-\n' + JSON.stringify(card) : '');
}