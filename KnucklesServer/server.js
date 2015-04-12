var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var f = require('./f');

app.use(bodyParser.json());

var mraa = require('mraa');
var mqtt = require('mqtt');

var org = "2tqgsy";
//var deviceIndex = (appInfo && appInfo.instance_index) ? appInfo.instance_index : 0;
var deviceId = "784b87a13933";
var token = "wv3V9?2qv?sR0d@Ipu";

var iot_server = org + ".messaging.internetofthings.ibmcloud.com";
var iot_port = 1883;
var iot_username = "use-token-auth";
var iot_password = token;
var iot_clientid = "d:" + org + ":edison:" + deviceId

console.log(iot_server, iot_clientid, iot_username, iot_password);
var client = mqtt.createClient(1883, iot_server, { clientId: iot_clientid, username: iot_username, password: iot_password });
var path;
client.on('connect', function() {
    console.log('MQTT client connected to IBM IoT Cloud.');
    path = "iot-2/type/+/id/"+deviceId;
    console.log("Subscribing to "+path);
    client.subscribe(path);
});

console.log(JSON.stringify(process.env));
//var VEHICLE_COUNT = (argv.count ? argv.count : (process.env.VEHICLE_COUNT || 1));
//var TELEMETRY_RATE = (argv.rate ? argv.rate : (process.env.TELEMETRY_RATE || 2));

// console.log("Simulating " + VEHICLE_COUNT + " vehicles");

// subscribe
var propertyTopic = "iot-2/*";

// publish
var telemetryTopic = "iot-2/*"; //evt/telemetry/fmt/json";





var OUT_PIN = 3;
var out = new mraa.Gpio(OUT_PIN);
out.dir(mraa.DIR_OUT);
var is_on = false;
out.write(0);
var mode = "off";

var settings = {"min_temp":23.0}

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var SENSOR_COUNT = 5;

var sensors = [];
for(var i = 0; i < SENSOR_COUNT; i++){
	sensors[i] = new mraa.Aio(i);
}

function getState() {
  return {
    "sensors":readings,
    "temps":temps,
    "mode":mode,
    "is_heating": is_on,
    "settings": settings
  };
}

function manageTemp(t) {
	if(mode == "auto"){
		if(t <= settings.min_temp && !is_on){
			is_on = true;
			out.write(1);
			console.log("(auto) turned on | "+t);
		} else if(t >= settings.min_temp && is_on){
			is_on = false;
			out.write(0);
			console.log("(auto) turned off | "+t);	
		}
	}
}

app.get('/status', function (req, res) {
  client.publish(path); //"iot-2/evt/123/fmt/json",'{"helloworld":true}',false,0);
  console.log("Publishing to client: "+path);
  res.send(getState());
});

app.post('/heat', function(req, res){
	var body = req.body;
	if(body.mode == "on"){
		mode = body.mode;
		is_on = true;
		out.write(1);	
	} else if(body.mode == "off"){
		mode = body.mode;
		is_on = false;
		out.write(0);	
	} else if(body.mode == "auto"){
		mode = body.mode;
		is_on = false;
		out.write(0);
	}
	res.send(getState());
});

app.get('/settings', function(req, res) {
	res.send(settings);
});

app.post('/settings', function (req, res) {
  var body = req.body;

    if('min_temp' in body){
      settings.min_temp = body.min_temp;
    }

  console.log(settings);
  res.send(settings);
});

var readings = [];
var temps = [];
setInterval(function(){
	for(var i = 0; i < SENSOR_COUNT; i++){
		readings[i] = sensors[i].read();
		temps[i] = f.btot(readings[i]).t_c;
	}
        manageTemp(temps[0]);
}, 100);

var server = app.listen(8080, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
