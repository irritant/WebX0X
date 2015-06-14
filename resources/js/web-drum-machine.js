function WebDrumVoiceController(element, context) {

	var _self = this;

	this.element = element;
	this.context = context;
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

		_self.toggleSwitch = new ToggleSwitch(_self.element.querySelector('#toggle-switch'), {
			onUpdate: function(on) {
				_self.drum.trigger();
			}
		}).update();

		// SEQUENCE:

		_self.sequenceSwitches = [];
		var numSequenceSteps = element.querySelectorAll('.sequence-toggle-switch').length;
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
					if (_self.sequenceSwitches[index].isOn()) {
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