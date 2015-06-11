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