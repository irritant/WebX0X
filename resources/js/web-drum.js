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