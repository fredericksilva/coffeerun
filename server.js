var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


function coffeeorder(owner, order) {

	this.owner = owner;
	this.order = order;

}

function coffeerun(owner, expiry, maxcups) {

	this.owner = owner;
	this.expiry = expiry;
	this.maxcups = maxcups;
	this.orders = new Array();
	this.subscribers = [];
}

function coffeerun_viewmodel (coffeerun) {

	this.id = 0;
	this.owner = coffeerun.owner;
	this.maxcups = coffeerun.maxcups;
	this.orders = coffeerun.orders;
	this.expiry = (coffeerun.expiry.getTime() - new Date().getTime()) / 1000;

	console.log('RUN EXPIRY: %s\nCURRENT TIME: %s\nDIFF: %d', coffeerun.expiry.toString(), new Date(), this.expiry);

}

var coffeeruns = [];

app.use(express.static('./src'));
app.use(bodyParser.json());


app.get('/api/coffeerun/:id', function (req, res) {
  
    var run = coffeeruns[req.params.id];

	if (run != undefined) {
		res.end(JSON.stringify( new coffeerun_viewmodel(run) ));

	} else {
		res.end('NOT FOUND :(');
	}

});

app.post('/api/order/:id', function (req, res) {

	console.log ('NEW ORDER: ' + req.body.owner );

	var run = coffeeruns[req.params.id];
	var newOrder = req.body;
	run.orders.push(newOrder);
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end('{}');

	console.log ('Sending event to %d subscribers', run.subscribers.length);

	for (var i = 0; i < run.subscribers.length; i++) {
		run.subscribers[i].emit('order', newOrder);
	}
});


app.post('/api/coffeerun', function (req, res) {

	var currentTime = new Date();

	var newRun = new coffeerun(
		req.body.owner,
		new Date(currentTime.getTime() + req.body.leavingTime*60000),
		req.body.maxcups
	);

	coffeeruns.push(newRun);

	var newRunViewModel = new coffeerun_viewmodel(newRun);
	newRunViewModel.id = coffeeruns.length - 1;

	res.writeHead(200, {'Content-Type': 'application/json'});
	console.log ('NEW RUN: ', JSON.stringify(newRunViewModel) );
	res.end(JSON.stringify(newRunViewModel));

});

io.on('connection', function (socket) {

	socket.on('subscribe', function(runid) {
		console.log('Subscription to run %s', runid);
		var run = coffeeruns[runid];
		run.subscribers.push(this);
	});

    console.log('NEW CONNECTION');

});

server.listen(80, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('kotest is listening at http://%s:%s', host, port);

});