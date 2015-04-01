var connection = require("../connection.js");
var sql = require("sql").create("mysql");

var frame = sql.define({
  name: 'frame',
  columns: ['fid', 'name']
});

var query = frame.insert({
	"name":2
}).toQuery();

console.log(query)

connection.query(query.text, query.values, function(err, rows, fields) {
  if (err) throw err;
 
  console.log(rows);
});

connection.end();