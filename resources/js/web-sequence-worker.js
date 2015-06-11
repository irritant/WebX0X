/*
WebSequence
Sequencing for WebAudio.
https://github.com/irritant/WebSequence

Copyright (c) 2015 Tony Wallace - tonywallace.ca

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is furnished 
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var _running = false;
var _startTime = 0;
var _time = 0;
var _drift = 0;
var _count = 0;
var _interval = 1000;

var runTimer = function() {
	if (!_running) {
		return;
	}
	
	_count++;
	_time += _interval;
	_drift = (new Date().getTime() - _startTime) - _time;
    postStateMessage();
    setTimeout(runTimer, (_interval - _drift));
}

var start = function() {
	_running = true;
	_startTime = new Date().getTime();
	postStateMessage();
	setTimeout(runTimer, _interval);
}

 var stop = function() {
	_running = false;
	_startTime = 0;
	_time = 0;
	_drift = 0;
	_count = 0;
}

var postStateMessage = function() {
	this.postMessage({
		time: _time,
		drift: _drift,
		count: _count,
		interval: _interval
	});
}

this.addEventListener('message', function(message) {
	if (message.data.command == 'start') {
		start();
	} else if (message.data.command == 'stop') {
		stop();
	} else if (message.data.command == 'updateInterval') {
		var newInterval = parseInt(message.data.interval);
		if (!isNaN(newInterval) && newInterval > 0) {
			_interval = newInterval;
		}
	}
}, false);