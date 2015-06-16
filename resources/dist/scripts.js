/*
WebWorkerFactory

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

function WebWorkerFactory() {

	var _self = this;

	this.makeWorkerUsingScriptAtURL = function(url, onSuccess, onError) {
		_self.getContentsOfFileAtURL(
			url,
			function(fileContents) {
				var scriptBlob = new Blob([fileContents]);
				var scriptBlobURL = window.URL.createObjectURL(scriptBlob);
				var worker = new Worker(scriptBlobURL);
				if (typeof onSuccess == 'function') {
					onSuccess(worker);
				}
			},
			function(status, statusText) {
				if (typeof onError == 'function') {
					onError(status, statusText);
				}
			});
	}

	this.getContentsOfFileAtURL = function(url, onSuccess, onError) {
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200) {
					if (typeof onSuccess == 'function') {
						onSuccess(request.responseText);
					}
				} else {
					if (typeof onError == 'function') {
						onError(request.status, request.statusText);
					}
				}
			}
        }
        request.send();
	}

}
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
/*
WebAHDSR
An envelope generator for WebAudio AudioParam.
https://github.com/irritant/WebAHDSR

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

function WebAHDSR(context, param) {

	// Private:

	var _self = this;

	// Public:

	this.context = context;
	this.param = param;
	
	this.attackTime = 0.0;
	this.holdTime = 0.0;
	this.decayTime = 0.0;
	this.releaseTime = 0.0;

	this.initialValue = 0.0;
	this.holdValue = 1.0;
	this.sustainValue = 1.0;
	this.finalValue = 0.0;

	// Curves may be 'linear' or 'exponential':
	this.attackCurve = 'linear';
	this.decayCurve = 'linear';
	this.releaseCurve = 'linear';

	this.on = function() {
		// Cancel scheduled values:
		var time = _self.context.currentTime;
		_self.param.cancelScheduledValues(time);

		// Set the initial value to the max of the initialValue property and the current value:
		var initialValue = Math.max(parseFloat(_self.initialValue), _self.param.value);

		// If the initial level is zero and the attack curve is exponential,
		// the parameter value will remain at zero until the attack time has elapsed
		// and then jump suddenly to the hold level. That's not what you want, so set 
		// the inital level to a low, non-zero value.
		if (_self.attackCurve == 'exponential' && initialValue == 0.0) {
			initialValue = 0.001;
		}

		// Ramp to the initial level:
		_self.param.linearRampToValueAtTime(initialValue, time);

		// Schedule the attack period:
		time += parseFloat(_self.attackTime);
		if (_self.attackCurve == 'exponential') {
			if (_self.holdValue == 0.0) {
				// If the hold level is zero and the release curve is exponential,
				// the parameter value will never reach zero. Ramp the hold level to 
				// a low, non-zero value followed by a quick linear ramp to zero.
				_self.param.exponentialRampToValueAtTime(0.001, time);
				_self.param.linearRampToValueAtTime(0.0, time + 0.01);
			} else {
				_self.param.exponentialRampToValueAtTime(parseFloat(_self.holdValue), time);
			}
		} else {
			_self.param.linearRampToValueAtTime(parseFloat(_self.holdValue), time);
		}

		// Schedule the hold period:
		time += parseFloat(_self.holdTime);
		_self.param.linearRampToValueAtTime(parseFloat(_self.holdValue), time);

		// Schedule the decay period:
		time += parseFloat(_self.decayTime);
		if (_self.decayCurve == 'exponential') {
			if (_self.sustainValue == 0.0) {
				// If the sustain level is zero and the release curve is exponential,
				// the parameter value will never reach zero. Ramp the sustain level to 
				// a low, non-zero value followed by a quick linear ramp to zero.
				_self.param.exponentialRampToValueAtTime(0.001, time);
				_self.param.linearRampToValueAtTime(0.0, time + 0.01);
			} else {
				_self.param.exponentialRampToValueAtTime(parseFloat(_self.sustainValue), time);
			}
		} else {
			_self.param.linearRampToValueAtTime(parseFloat(_self.sustainValue), time);
		}
	}

	this.off = function() {
		// Cancel scheduled values:
		var time = _self.context.currentTime;
		_self.param.cancelScheduledValues(time);

		// Ramp to the current parameter value. This doesn't make much sense,
		// but it seems to be necessary to make the release period start from the 
		// current value.
		_self.param.linearRampToValueAtTime(_self.param.value, time);

		// Schedule the release period:
		time += parseFloat(_self.releaseTime);
		if (_self.releaseCurve == 'exponential') {
			if (_self.finalValue == 0.0) {
				// If the final level is zero and the release curve is exponential,
				// the parameter value will never reach zero. Ramp the final level to 
				// a low, non-zero value followed by a quick linear ramp to zero.
				_self.param.exponentialRampToValueAtTime(0.001, time);
				_self.param.linearRampToValueAtTime(0.0, time + 0.01);
			} else {
				_self.param.exponentialRampToValueAtTime(parseFloat(_self.finalValue), time);
			}
		} else {
			_self.param.linearRampToValueAtTime(parseFloat(_self.finalValue), time);
		}
	}

	this.reset = function() {
		// Cancel scheduled values and reset the parameter to its initial value:
		var time = _self.context.currentTime;
		_self.param.cancelScheduledValues(time);
		_self.param.linearRampToValueAtTime(parseFloat(_self.initialValue), time);
	}

}
/*
WebNoise
A noise generator for WebAudio.
https://github.com/irritant/WebNoise

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

function WebNoise(context) {

	// Private:

	var _self = this;
	var _previousValue = 0.0;
	var _blockSize = 1;

	// Public:

	this.context = context;
	this.node = null;

	this.blockSize = function(size) {
		if (!isNaN(parseInt(size))) {
			_blockSize = Math.max(parseInt(size), 1);
		} else {
			return _blockSize;
		}
	}

	this.configureNode = function(options) {

		options = options || {};
		var bufferSize = parseInt(options.bufferSize) || 256;
		var inputChannels = parseInt(options.inputChannels) || 1;
		var outputChannels = parseInt(options.outputChannels) || 1;

		_self.node = _self.context.createScriptProcessor(bufferSize, inputChannels, outputChannels);
		_self.node.onaudioprocess = function(e) {
			var outputBuffer = e.outputBuffer;
			var blockSize = _self.blockSize();
			for (var c = 0; c < outputBuffer.numberOfChannels; c++) {
				var outputData = outputBuffer.getChannelData(c);
				for (var s = 0; s < outputBuffer.length; s++) {
					if (s % blockSize == 0) {
						outputData[s] = _previousValue = Math.random();
					} else {
						outputData[s] = _previousValue;
					}
				}
			}
		}

	}

}
/*
WebDrum
A WebAudio drum synthesizer.
https://github.com/irritant/WebNoise

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

function WebDrum(context) {

	// Private:

	var _self = this;
	
	// Public:

	this.context = context;

	this.tone = this.context.createOscillator();
	this.tone.type = 'square';
	this.tone.frequency.value = 440.0;
	this.tone.start(0);

	this.tonePitchEnv = new WebAHDSR(this.context, this.tone.frequency);
	this.tonePitchEnv.decayTime = 0.1;
	this.tonePitchEnv.releaseTime = 0.1;
	this.tonePitchEnv.holdValue = 220.0;
	this.tonePitchEnv.sustainValue = 110.0;

	this.toneFilter = this.context.createBiquadFilter();
	this.toneFilter.type = 'lowpass';
	this.toneFilter.frequency.value = 20000.0;
	this.toneFilter.Q.value = 1.0;

	this.toneFilterEnv = new WebAHDSR(this.context, this.toneFilter.frequency);
	this.toneFilterEnv.decayTime = 0.1;
	this.toneFilterEnv.releaseTime = 0.1;
	this.toneFilterEnv.holdValue = 1760.0;
	this.toneFilterEnv.sustainValue = 440.0;

	this.toneAmp = this.context.createGain();
	this.toneAmp.gain.value = 0.0;

	this.toneAmpEnv = new WebAHDSR(this.context, this.toneAmp.gain);
	this.toneAmpEnv.attackTime = 0.01;
	this.toneAmpEnv.decayTime = 0.3;
	this.toneAmpEnv.releaseTime = 0.3;
	this.toneAmpEnv.holdValue = 0.5;
	this.toneAmpEnv.sustainValue = 0.0;

	this.tone.connect(this.toneFilter);
	this.toneFilter.connect(this.toneAmp);

	this.noise = new WebNoise(this.context);
	this.noise.configureNode();
	this.noise.blockSize(2);

	this.noiseFilter = this.context.createBiquadFilter();
	this.noiseFilter.type = 'highpass';
	this.noiseFilter.frequency.value = 20000.0;
	this.noiseFilter.Q.value = 1.0;

	this.noiseFilterEnv = new WebAHDSR(this.context, this.noiseFilter.frequency);
	this.noiseFilterEnv.decayTime = 0.3;
	this.noiseFilterEnv.releaseTime = 0.3;
	this.noiseFilterEnv.initialValue = 220.0;
	this.noiseFilterEnv.holdValue = 220.0;
	this.noiseFilterEnv.sustainValue = 1760.0;

	this.noiseAmp = this.context.createGain();
	this.noiseAmp.gain.value = 0.0;

	this.noiseAmpEnv = new WebAHDSR(this.context, this.noiseAmp.gain);
	this.noiseAmpEnv.attackTime = 0.01;
	this.noiseAmpEnv.decayTime = 0.3;
	this.noiseAmpEnv.releaseTime = 0.3;
	this.noiseAmpEnv.holdValue = 0.5;
	this.noiseAmpEnv.sustainValue = 0.0;

	this.noise.node.connect(this.noiseFilter);
	this.noiseFilter.connect(this.noiseAmp);

	this.mix = this.context.createGain();
	this.mix.gain.value = 0.5;

	this.toneAmp.connect(this.mix);
	this.noiseAmp.connect(this.mix);

	this.trigger = function() {
		_self.tonePitchEnv.on();
		_self.toneFilterEnv.on();
		_self.toneAmpEnv.on();
		_self.noiseFilterEnv.on();
		_self.noiseAmpEnv.on();
	}

	this.connect = function(node) {
		_self.disconnect();
		if (typeof node == 'object' && node) {
			_self.mix.connect(node);
		} else {
			_self.mix.connect(_self.context.destination);
		}
	}

	this.disconnect = function() {
		_self.mix.disconnect();
	}

}
function Knob(element, options) {

	var _self = this;

	this.element = element;
	this.onUpdate = null;
	this.draggable = null;
	this.minAngle = -135.0;
	this.maxAngle = 135.0;
	this.angle = -135.0;
	this.minValue = 0.0;
	this.maxValue = 1.0;
	this.speed = 1.0;

	this.limitAngle = function(angle) {
		return Math.min(Math.max(angle, _self.minAngle), _self.maxAngle);
	};

	this.limitValue = function(value) {
		return Math.min(Math.max(value, _self.minValue), _self.maxValue);
	};

	this.init = function(options) {

		if (_self.element) {
			// Configure draggable:
			_self.draggable = interact(_self.element).draggable({
				inertia: true,
				onmove: function(e) {
					var delta = e.dy * _self.speed;
					_self.angle = _self.limitAngle(_self.angle - delta);
					_self.update();
				}
			});

			// Update properties from data attributes:
			var minAngle = parseFloat(element.getAttribute('data-min-angle'));
			if (!isNaN(minAngle)) {
				_self.minAngle = minAngle;
			}

			var maxAngle = parseFloat(element.getAttribute('data-max-angle'));
			if (!isNaN(maxAngle)) {
				_self.maxAngle = maxAngle;
			}

			var angle = parseFloat(element.getAttribute('data-angle'));
			if (!isNaN(angle)) {
				_self.angle = angle;
			}

			var minValue = parseFloat(element.getAttribute('data-min-value'));
			if (!isNaN(minValue)) {
				_self.minValue = minValue;
			}

			var maxValue = parseFloat(element.getAttribute('data-max-value'));
			if (!isNaN(maxValue)) {
				_self.maxValue = maxValue;
			}

			var value = parseFloat(element.getAttribute('data-value'));
			if (!isNaN(value)) {
				_self.angle = _self.angleFromValue(value);
			}

			var speed = parseFloat(element.getAttribute('data-speed'));
			if (!isNaN(speed)) {
				_self.speed = speed;
			}

		}

		// Update properties from options:
		if (options && typeof options == 'object') {
			var minAngle = parseFloat(options.minAngle);
			if (!isNaN(minAngle)) {
				_self.minAngle = minAngle;
			}

			var maxAngle = parseFloat(options.maxAngle);
			if (!isNaN(maxAngle)) {
				_self.maxAngle = maxAngle;
			}

			var angle = parseFloat(options.angle);
			if (!isNaN(angle)) {
				_self.angle = angle;
			}

			var minValue = parseFloat(options.minValue);
			if (!isNaN(minValue)) {
				_self.minValue = minValue;
			}

			var maxValue = parseFloat(options.maxValue);
			if (!isNaN(maxValue)) {
				_self.maxValue = maxValue;
			}

			var value = parseFloat(options.value);
			if (!isNaN(value)) {
				_self.value = _self.angleFromValue(value);
			}

			var speed = parseFloat(options.speed);
			if (!isNaN(speed)) {
				_self.speed = speed;
			}

			if (typeof options.onUpdate == 'function') {
				_self.onUpdate = options.onUpdate;
			}
		}

		return _self;
	};

	this.update = function() {
		if (_self.element) {
			_self.updateRotation();
			if (typeof _self.onUpdate == 'function') {
				_self.onUpdate(_self.currentValue());
			}
		}
		return _self;
	};

	this.updateRotation = function() {
		if (_self.element) {
			var angle = _self.limitAngle(_self.angle);
			var transform = 'rotate(' + angle + 'deg)';
			_self.element.style.webkitTransform = transform;
			_self.element.style.transform = transform;
		}
	}

	this.currentValue = function() {
		var angle = _self.limitAngle(_self.angle);
		var angleRange = _self.maxAngle - _self.minAngle;
		var anglePercent = 1.0 / (angleRange / (angle - _self.minAngle));
		var valueRange = _self.maxValue - _self.minValue;
		var value = (valueRange * anglePercent) + _self.minValue;
		return value;
	};

	this.angleFromValue = function(value) {
		value = _self.limitValue(value);
		var valueRange = _self.maxValue - _self.minValue;
		var valuePercent = 1.0 / (valueRange / (value - _self.minValue));
		var angleRange = _self.maxAngle - _self.minAngle;
		var angle = (angleRange * valuePercent) + _self.minAngle;
		return angle;
	};

	return this.init(options);
}

function SegmentedSwitch(element, options) {

	var _self = this;
	
	this.element = element;
	this.onUpdate = null;

	this.poles = function() {
		var poles = [];
		if (_self.element) {
			var nodes = _self.element.querySelectorAll('.pole');
			poles = Array.prototype.slice.call(nodes);
		}
		return poles;
	}

	this.limitIndex = function(index) {
		return Math.min(Math.max(index, 0), _self.poles().length - 1);
	};

	this.selectedIndex = function() {
		var index = -1;
		var poles = _self.poles();
		for (var i = 0; i < poles.length; i++) {
			if (poles[i].classList.contains('selected')) {
				index = i;
				break;
			}
		}
		return index;
	};

	this.selectedValue = function() {
		var value = null;
		var poles = _self.poles();
		for (var i = 0; i < poles.length; i++) {
			if (poles[i].classList.contains('selected')) {
				value = poles[i].getAttribute('data-value');
				break;
			}
		}
		return value;
	};

	this.init = function(options) {
		var poles = _self.poles();
		for (var i = 0; i < poles.length; i++) {
			poles[i].addEventListener('click', function() {
				_self.selectPole(this);
				_self.update();
			});
		}

		// Update properties from options:
		if (options && typeof options == 'object') {
			if (typeof options.onUpdate == 'function') {
				_self.onUpdate = options.onUpdate;
			}
		}

		return _self;
	};

	this.selectPole = function(pole) {
		var poles = _self.poles();
		for (var i = 0; i < poles.length; i++) {
			if (poles[i] === pole) {
				poles[i].classList.add('selected');
			} else {
				poles[i].classList.remove('selected');
			}
		}
		return _self;
	};

	this.update = function() {
		if (typeof _self.onUpdate == 'function') {
			_self.onUpdate(_self.selectedIndex(), _self.selectedValue());
		}
		return _self;
	};

	return this.init(options);
}

function ToggleSwitch(element, options) {

	var _self = this;

	this.element = element;
	this.onUpdate = null;

	this.isOn = function() {
		var on = false;
		if (_self.element) {
			on = _self.element.classList.contains('on');
		}
		return on;
	};

	this.init = function(options) {
		if (_self.element) {
			_self.element.addEventListener('click', function() {
				if (_self.isOn()) {
					_self.element.classList.remove('on');
				} else {
					_self.element.classList.add('on');
				}
				_self.update();
			});
		}

		// Update properties from options:
		if (options && typeof options == 'object') {
			if (typeof options.onUpdate == 'function') {
				_self.onUpdate = options.onUpdate;
			}
		}

		return _self;
	};

	this.update = function() {
		if (_self.element) {
			if (typeof _self.onUpdate == 'function') {
				_self.onUpdate(_self.isOn());
			}
		}
		return _self;
	};

	return this.init(options);
}
function WebDrumVoiceController(element, context) {

	var _self = this;

	this.element = element;
	this.context = context;
	this.muted = false;
	this.drum = null;
	this.sequence = null;
	this.sequenceSwitches = [];

	this.toneOscTypeSwitch = null;
	this.tonePitchHoldKnob = null;
	this.tonePitchSustainKnob = null;
	this.tonePitchDecayKnob = null;
	this.tonePitchCurveSwitch = null;
	
	this.toneFilterTypeSwitch = null;
	this.toneFilterQKnob = null;
	this.toneFilterHoldKnob = null;
	this.toneFilterSustainKnob = null;
	this.toneFilterDecayKnob = null;
	this.toneFilterCurveSwitch = null;

	this.toneAmpLevelKnob = null;
	this.toneAmpDecayKnob = null;
	this.toneAmpCurveSwitch = null;

	this.noiseFilterTypeSwitch = null;
	this.noiseFilterQKnob = null;
	this.noiseFilterHoldKnob = null;
	this.noiseFilterSustainKnob = null;
	this.noiseFilterDecayKnob = null;
	this.noiseFilterCurveSwitch = null;

	this.noiseAmpLevelKnob = null;
	this.noiseAmpDecayKnob = null;
	this.noiseAmpCurveSwitch = null;

	this.mixGainKnob = null;
	this.mixMuteSwitch = null;
	this.toggleSwitch = null;

	this.init = function() {

		_self.drum = new WebDrum(_self.context);
		_self.drum.toneAmpEnv.sustainValue = 0.0;
		_self.drum.noiseAmpEnv.sustainValue = 0.0;
		_self.drum.connect();

		_self.sequence = new WebSequence();

		// TONE:

		_self.toneOscTypeSwitch = new SegmentedSwitch(_self.element.querySelector('#tone-osc-type'), {
			onUpdate: function(index, value) {
				_self.drum.tone.type = value;
			}
		}).update();

		_self.tonePitchHoldKnob = new Knob(_self.element.querySelector('#tone-pitch-hold'), {
			onUpdate: function(value) {
				_self.drum.tonePitchEnv.holdValue = value;
			}
		}).update();

		_self.tonePitchSustainKnob = new Knob(_self.element.querySelector('#tone-pitch-sustain'), {
			onUpdate: function(value) {
				_self.drum.tonePitchEnv.sustainValue = value;
			}
		}).update();

		_self.tonePitchDecayKnob = new Knob(_self.element.querySelector('#tone-pitch-decay'), {
			onUpdate: function(value) {
				_self.drum.tonePitchEnv.decayTime = value;
				_self.drum.tonePitchEnv.releaseTime = value;
			}
		}).update();

		_self.tonePitchCurveSwitch = new SegmentedSwitch(_self.element.querySelector('#tone-pitch-curve'), {
			onUpdate: function(index, value) {
				_self.drum.tonePitchEnv.decayCurve = value;
				_self.drum.tonePitchEnv.releaseCurve = value;
			}
		}).update();

		_self.toneFilterTypeSwitch = new SegmentedSwitch(_self.element.querySelector('#tone-filter-type'), {
			onUpdate: function(index, value) {
				_self.drum.toneFilter.type = value;
			}
		}).update();

		_self.toneFilterQKnob = new Knob(_self.element.querySelector('#tone-filter-q'), {
			onUpdate: function(value) {
				_self.drum.toneFilter.Q.value = value;
			}
		}).update();

		_self.toneFilterHoldKnob = new Knob(_self.element.querySelector('#tone-filter-hold'), {
			onUpdate: function(value) {
				_self.drum.toneFilterEnv.holdValue = value;
			}
		}).update();

		_self.toneFilterSustainKnob = new Knob(_self.element.querySelector('#tone-filter-sustain'), {
			onUpdate: function(value) {
				_self.drum.toneFilterEnv.sustainValue = value;
			}
		}).update();

		_self.toneFilterDecayKnob = new Knob(_self.element.querySelector('#tone-filter-decay'), {
			onUpdate: function(value) {
				_self.drum.toneFilterEnv.decayTime = value;
				_self.drum.toneFilterEnv.releaseTime = value;
			}
		}).update();

		_self.toneFilterCurveSwitch = new SegmentedSwitch(_self.element.querySelector('#tone-filter-curve'), {
			onUpdate: function(index, value) {
				_self.drum.toneFilterEnv.decayCurve = value;
				_self.drum.toneFilterEnv.releaseCurve = value;
			}
		}).update();

		_self.toneAmpLevelKnob = new Knob(_self.element.querySelector('#tone-amp-level'), {
			onUpdate: function(value) {
				_self.drum.toneAmpEnv.holdValue = value;
				_self.drum.toneAmpEnv.sustainValue = 0.0;
			}
		}).update();

		_self.toneAmpDecayKnob = new Knob(_self.element.querySelector('#tone-amp-decay'), {
			onUpdate: function(value) {
				_self.drum.toneAmpEnv.decayTime = value;
				_self.drum.toneAmpEnv.releaseTime = value;
			}
		}).update();

		_self.toneAmpCurveSwitch = new SegmentedSwitch(_self.element.querySelector('#tone-amp-curve'), {
			onUpdate: function(index, value) {
				_self.drum.toneAmpEnv.decayCurve = value;
				_self.drum.toneAmpEnv.releaseCurve = value;
			}
		}).update();

		// NOISE:

		_self.noiseColorKnob = new Knob(_self.element.querySelector('#noise-color'), {
			onUpdate: function(value) {
				var blockSize = Math.pow(2, Math.ceil(value));
				_self.drum.noise.blockSize(blockSize);
			}
		}).update();

		_self.noiseFilterTypeSwitch = new SegmentedSwitch(_self.element.querySelector('#noise-filter-type'), {
			onUpdate: function(index, value) {
				_self.drum.noiseFilter.type = value;
			}
		}).update();

		_self.noiseFilterQKnob = new Knob(_self.element.querySelector('#noise-filter-q'), {
			onUpdate: function(value) {
				_self.drum.noiseFilter.Q.value = value;
			}
		}).update();

		_self.noiseFilterHoldKnob = new Knob(_self.element.querySelector('#noise-filter-hold'), {
			onUpdate: function(value) {
				_self.drum.noiseFilterEnv.holdValue = value;
			}
		}).update();

		_self.noiseFilterSustainKnob = new Knob(_self.element.querySelector('#noise-filter-sustain'), {
			onUpdate: function(value) {
				_self.drum.noiseFilterEnv.sustainValue = value;
			}
		}).update();

		_self.noiseFilterDecayKnob = new Knob(_self.element.querySelector('#noise-filter-decay'), {
			onUpdate: function(value) {
				_self.drum.noiseFilterEnv.decayTime = value;
				_self.drum.noiseFilterEnv.releaseTime = value;
			}
		}).update();

		_self.noiseFilterCurveSwitch = new SegmentedSwitch(_self.element.querySelector('#noise-filter-curve'), {
			onUpdate: function(index, value) {
				_self.drum.noiseFilterEnv.decayCurve = value;
				_self.drum.noiseFilterEnv.releaseCurve = value;
			}
		}).update();

		_self.noiseAmpLevelKnob = new Knob(_self.element.querySelector('#noise-amp-level'), {
			onUpdate: function(value) {
				_self.drum.noiseAmpEnv.holdValue = value;
				_self.drum.noiseAmpEnv.sustainValue = 0.0;
			}
		}).update();

		_self.noiseAmpDecayKnob = new Knob(_self.element.querySelector('#noise-amp-decay'), {
			onUpdate: function(value) {
				_self.drum.noiseAmpEnv.decayTime = value;
				_self.drum.noiseAmpEnv.releaseTime = value;
			}
		}).update();

		_self.noiseAmpCurveSwitch = new SegmentedSwitch(_self.element.querySelector('#noise-amp-curve'), {
			onUpdate: function(index, value) {
				_self.drum.noiseAmpEnv.decayCurve = value;
				_self.drum.noiseAmpEnv.releaseCurve = value;
			}
		}).update();

		// MIX:

		_self.mixGainKnob = new Knob(_self.element.querySelector('#mix-gain'), {
			onUpdate: function(value) {
				_self.drum.mix.gain.value = value;
			}
		}).update();

		_self.mixMuteSwitch = new ToggleSwitch(_self.element.querySelector('#mix-mute'), {
			onUpdate: function(on) {
				_self.muted = on;
			}
		}).update();

		// SEQUENCE:

		_self.sequenceSwitches = [];
		var numSequenceSteps = _self.element.querySelectorAll('.sequence-toggle-switch').length;
		for (var i = 0; i < numSequenceSteps; i++) {
			_self.sequenceSwitches.push(new ToggleSwitch(
				_self.element.querySelector('.sequence-toggle-switch[data-sequence-step="' + i + '"]')
			));
		}

		return _self.resetSequence(numSequenceSteps);
	}

	this.playSequence = function() {
		_self.sequence.play();
	}

	this.pauseSequence = function() {
		_self.sequence.pause();
	}

	this.stopSequence = function() {
		_self.sequence.stop();
	}

	this.resetSequence = function(numSequenceSteps) {
		_self.sequence.reset();
		for (var i = 0; i < numSequenceSteps; i++) {
			_self.sequence.addEvent(function(index) {
				return function() {
					if (_self.sequenceSwitches[index].isOn() && !_self.muted) {
						_self.drum.trigger();
					}
					_self.highlightStepAtIndex(index);
				}
			}(i));
		}
		return _self;
	}

	this.clearStepHighlights = function() {
		var highightedSwitches = _self.element.querySelectorAll('.sequence-toggle-switch.highlighted');
		for (var i = 0; i < highightedSwitches.length; i++) {
			highightedSwitches[i].classList.remove('highlighted');
		}
	}

	this.highlightStepAtIndex = function(index) {
		_self.clearStepHighlights();
		_self.sequenceSwitches[index].element.classList.add('highlighted');
	}

	return this.init();
}

function WebDrumMachine(element, context) {

	var _self = this;

	this.element = element;
	this.context = context;
	this.sequenceTimer = null;
	this.voiceControllers = [];
	this.playing = false;

	this.init = function() {

		var voiceControllerOptions = {
			numSequenceSteps: 32
		};

		_self.sequenceTimer = new WebSequenceTimer();
		_self.voiceControllers = [];

		var voiceControllerElements = _self.element.querySelectorAll('.voice-controller');
		for (var i = 0; i < voiceControllerElements.length; i++) {
			var voiceController = new WebDrumVoiceController(
				voiceControllerElements[i], 
				_self.context,
				voiceControllerOptions);
			_self.voiceControllers.push(voiceController);
			_self.sequenceTimer.addSequence(voiceController.sequence);
		}

		_self.sequenceTimer.init(
			function(timer) {
				_self.updateTempo();
			}, 
			function(timer, status, textStatus) {
				console.log(textStatus);
			});

		_self.element.querySelector('#play-button').addEventListener('click', function() {
			if (_self.playing) {
				_self.pause();
			} else {
				_self.play();
			}
			_self.playing = !_self.playing;
			_self.refreshTransportControls();
		});

		_self.element.querySelector('#stop-button').addEventListener('click', function() {
			_self.stop();
			_self.playing = false;
			_self.refreshTransportControls();
		});

		_self.element.querySelector('#tempo-input').addEventListener('change', function() {
			_self.updateTempo();
		});

		_self.element.querySelector('#tempo-form').addEventListener('submit', function(e) {
			e.preventDefault();
		});

		return _self;
	}

	this.play = function() {
		_self.sequenceTimer.start();
		for (var i = 0; i < _self.voiceControllers.length; i++) {
			_self.voiceControllers[i].playSequence();
		}
		return _self;
	}

	this.pause = function() {
		_self.sequenceTimer.stop();
		for (var i = 0; i < _self.voiceControllers.length; i++) {
			_self.voiceControllers[i].pauseSequence();
		}
	}

	this.stop = function() {
		_self.sequenceTimer.stop();
		for (var i = 0; i < _self.voiceControllers.length; i++) {
			_self.voiceControllers[i].stopSequence();
			_self.voiceControllers[i].clearStepHighlights();
		}
		return _self;
	}

	this.refreshTransportControls = function() {
		var playButton = _self.element.querySelector('#play-button');
		var playButtonIcon = _self.element.querySelector('#play-button > i');
		if (_self.playing) {
			playButton.classList.add('on');
			playButtonIcon.classList.remove('fa-play');
			playButtonIcon.classList.add('fa-pause');
		} else {
			playButton.classList.remove('on');
			playButtonIcon.classList.remove('fa-pause');
			playButtonIcon.classList.add('fa-play');
		}
	}

	this.updateTempo = function() {
		var tempo = parseFloat(_self.element.querySelector('#tempo-input').value);
		if (!isNaN(tempo)) {
			_self.sequenceTimer.updateIntervalWithTempo(tempo, 1/16);
		}
	}

	return this.init();
}

window.addEventListener('load', function() {

	// Obtain a new audio context:
	var context = null;
	if (typeof window.AudioContext != 'undefined') {
		context = new AudioContext();
	} else if (typeof window.webkitAudioContext != 'undefined') {
		context = new webkitAudioContext();
	}

	if (!context) {
		console.log('Web Audio API is not supported.');
		return;
	}

	window.drumMachine = new WebDrumMachine(
		document.querySelector('#drum-machine'), 
		context);
});