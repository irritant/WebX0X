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

function WebSequenceTimer() {

	// Private:

	var _self = this;
	var _worker = null;
	var _sequences = [];

	// Public:

	this.init = function(onSuccess, onError) {
		var workerURL = document.querySelector('script[src$="worker.min.js"]').src;
		if (workerURL) {
			var factory = new WebWorkerFactory();
			factory.makeWorkerUsingScriptAtURL(
				workerURL, 
				function(worker) {
					_worker = worker;
					_worker.addEventListener('message', function(message) {
						// Forward the timer update to sequences:
						for (var i = 0; i < _sequences.length; i++) {
							if (typeof _sequences[i].onSequenceTimerUpdate == 'function') {
								_sequences[i].onSequenceTimerUpdate(_self, message.data);
							}
						}
					});
					if (typeof onSuccess == 'function') {
						onSuccess(_self);
					}
				}, 
				function(status, statusText) {
					if (typeof onError == 'function') {
						onError(_self, status, statusText);
					}
				});
		}
	}

	this.start = function() {
		_worker.postMessage({
			command: 'start'
		});
	}

	this.stop = function() {
		_worker.postMessage({
			command: 'stop'
		});
	}

	this.updateInterval = function(interval) {
		_worker.postMessage({
			command: 'updateInterval',
			interval: interval
		});
	}

	this.updateIntervalWithTempo = function(tempo, duration) {
		tempo = parseFloat(tempo);
		duration = parseFloat(duration);
		if (!isNaN(tempo) && tempo > 0) {
			var interval = 60000.0 / tempo;
			if (!isNaN(duration) && duration > 0.0) {
				var measure = interval * 4;
				interval = (measure * duration);
			}
			_self.updateInterval(interval);
		}
	}

	this.addSequence = function(sequence) {
		_sequences.push(sequence);
	}

	this.removeSequence = function(sequence) {
		for (var i = 0; i < _sequences.length; i++) {
			if (_sequences[i] === sequence) {
				_sequences.splice(i, 1);
			}
		}
	}

}

function WebSequence() {

	// Private:

	var _self = this;
	var _running = false;
	var _position = 0;
	var _events = [];

	// Public:

	this.repeat = true;

	this.play = function() {
		_running = true;
	}

	this.pause = function() {
		_running = false;
	}

	this.stop = function() {
		_running = false;
		_position = 0;
	}

	this.reset = function() {
		_running = false;
		_position = 0;
		_events = [];
	}

	this.addEvent = function(event) {
		_events.push(event);
	}

	this.replaceEventAtPosition = function(event, position) {
		if (position < _events.length) {
			_events[position] = event;
		}
	}

	this.removeEventAtPosition = function(position) {
		if (position < _events.length) {
			_events.splice(position, 1);
		}
	}

	this.triggerEvent = function(position) {
		var event = _events[position];
		if (typeof event == 'function') {
			event();
		}
	}

	this.advance = function() {
		if (_position < _events.length - 1) {
			_position++;
		} else {
			_position = 0;
			_running = (_self.repeat == true);
		}
	}

	this.onSequenceTimerUpdate = function(timer, data) {
		if (_running) {
			_self.triggerEvent(_position);
			_self.advance();
		}
	};
	
}