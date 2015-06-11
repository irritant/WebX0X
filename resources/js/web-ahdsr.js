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