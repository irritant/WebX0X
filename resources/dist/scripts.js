;(function () {
	'use strict';

	/**
	 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
	 *
	 * @codingstandard ftlabs-jsv2
	 * @copyright The Financial Times Limited [All Rights Reserved]
	 * @license MIT License (see LICENSE.txt)
	 */

	/*jslint browser:true, node:true*/
	/*global define, Event, Node*/


	/**
	 * Instantiate fast-clicking listeners on the specified layer.
	 *
	 * @constructor
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	function FastClick(layer, options) {
		var oldOnClick;

		options = options || {};

		/**
		 * Whether a click is currently being tracked.
		 *
		 * @type boolean
		 */
		this.trackingClick = false;


		/**
		 * Timestamp for when click tracking started.
		 *
		 * @type number
		 */
		this.trackingClickStart = 0;


		/**
		 * The element being tracked for a click.
		 *
		 * @type EventTarget
		 */
		this.targetElement = null;


		/**
		 * X-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartX = 0;


		/**
		 * Y-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartY = 0;


		/**
		 * ID of the last touch, retrieved from Touch.identifier.
		 *
		 * @type number
		 */
		this.lastTouchIdentifier = 0;


		/**
		 * Touchmove boundary, beyond which a click will be cancelled.
		 *
		 * @type number
		 */
		this.touchBoundary = options.touchBoundary || 10;


		/**
		 * The FastClick layer.
		 *
		 * @type Element
		 */
		this.layer = layer;

		/**
		 * The minimum time between tap(touchstart and touchend) events
		 *
		 * @type number
		 */
		this.tapDelay = options.tapDelay || 200;

		/**
		 * The maximum time for a tap
		 *
		 * @type number
		 */
		this.tapTimeout = options.tapTimeout || 700;

		if (FastClick.notNeeded(layer)) {
			return;
		}

		// Some old versions of Android don't have Function.prototype.bind
		function bind(method, context) {
			return function() { return method.apply(context, arguments); };
		}


		var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
		var context = this;
		for (var i = 0, l = methods.length; i < l; i++) {
			context[methods[i]] = bind(context[methods[i]], context);
		}

		// Set up event handlers as required
		if (deviceIsAndroid) {
			layer.addEventListener('mouseover', this.onMouse, true);
			layer.addEventListener('mousedown', this.onMouse, true);
			layer.addEventListener('mouseup', this.onMouse, true);
		}

		layer.addEventListener('click', this.onClick, true);
		layer.addEventListener('touchstart', this.onTouchStart, false);
		layer.addEventListener('touchmove', this.onTouchMove, false);
		layer.addEventListener('touchend', this.onTouchEnd, false);
		layer.addEventListener('touchcancel', this.onTouchCancel, false);

		// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
		// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
		// layer when they are cancelled.
		if (!Event.prototype.stopImmediatePropagation) {
			layer.removeEventListener = function(type, callback, capture) {
				var rmv = Node.prototype.removeEventListener;
				if (type === 'click') {
					rmv.call(layer, type, callback.hijacked || callback, capture);
				} else {
					rmv.call(layer, type, callback, capture);
				}
			};

			layer.addEventListener = function(type, callback, capture) {
				var adv = Node.prototype.addEventListener;
				if (type === 'click') {
					adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
						if (!event.propagationStopped) {
							callback(event);
						}
					}), capture);
				} else {
					adv.call(layer, type, callback, capture);
				}
			};
		}

		// If a handler is already declared in the element's onclick attribute, it will be fired before
		// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
		// adding it as listener.
		if (typeof layer.onclick === 'function') {

			// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
			// - the old one won't work if passed to addEventListener directly.
			oldOnClick = layer.onclick;
			layer.addEventListener('click', function(event) {
				oldOnClick(event);
			}, false);
			layer.onclick = null;
		}
	}

	/**
	* Windows Phone 8.1 fakes user agent string to look like Android and iPhone.
	*
	* @type boolean
	*/
	var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

	/**
	 * Android requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


	/**
	 * iOS requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


	/**
	 * iOS 4 requires an exception for select elements.
	 *
	 * @type boolean
	 */
	var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


	/**
	 * iOS 6.0-7.* requires the target element to be manually derived
	 *
	 * @type boolean
	 */
	var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

	/**
	 * BlackBerry requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	FastClick.prototype.needsClick = function(target) {
		switch (target.nodeName.toLowerCase()) {

		// Don't send a synthetic click to disabled inputs (issue #62)
		case 'button':
		case 'select':
		case 'textarea':
			if (target.disabled) {
				return true;
			}

			break;
		case 'input':

			// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
			if ((deviceIsIOS && target.type === 'file') || target.disabled) {
				return true;
			}

			break;
		case 'label':
		case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
		case 'video':
			return true;
		}

		return (/\bneedsclick\b/).test(target.className);
	};


	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	FastClick.prototype.needsFocus = function(target) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true;
		case 'select':
			return !deviceIsAndroid;
		case 'input':
			switch (target.type) {
			case 'button':
			case 'checkbox':
			case 'file':
			case 'image':
			case 'radio':
			case 'submit':
				return false;
			}

			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly;
		default:
			return (/\bneedsfocus\b/).test(target.className);
		}
	};


	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	FastClick.prototype.sendClick = function(targetElement, event) {
		var clickEvent, touch;

		// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
		if (document.activeElement && document.activeElement !== targetElement) {
			document.activeElement.blur();
		}

		touch = event.changedTouches[0];

		// Synthesise a click event, with an extra attribute so it can be tracked
		clickEvent = document.createEvent('MouseEvents');
		clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
		clickEvent.forwardedTouchEvent = true;
		targetElement.dispatchEvent(clickEvent);
	};

	FastClick.prototype.determineEventType = function(targetElement) {

		//Issue #159: Android Chrome Select Box does not open with a synthetic click event
		if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
			return 'mousedown';
		}

		return 'click';
	};


	/**
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.focus = function(targetElement) {
		var length;

		// Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
		if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
			length = targetElement.value.length;
			targetElement.setSelectionRange(length, length);
		} else {
			targetElement.focus();
		}
	};


	/**
	 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
	 *
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.updateScrollParent = function(targetElement) {
		var scrollParent, parentElement;

		scrollParent = targetElement.fastClickScrollParent;

		// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
		// target element was moved to another parent.
		if (!scrollParent || !scrollParent.contains(targetElement)) {
			parentElement = targetElement;
			do {
				if (parentElement.scrollHeight > parentElement.offsetHeight) {
					scrollParent = parentElement;
					targetElement.fastClickScrollParent = parentElement;
					break;
				}

				parentElement = parentElement.parentElement;
			} while (parentElement);
		}

		// Always update the scroll top tracker if possible.
		if (scrollParent) {
			scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
		}
	};


	/**
	 * @param {EventTarget} targetElement
	 * @returns {Element|EventTarget}
	 */
	FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

		// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
		if (eventTarget.nodeType === Node.TEXT_NODE) {
			return eventTarget.parentNode;
		}

		return eventTarget;
	};


	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchStart = function(event) {
		var targetElement, touch, selection;

		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true;
		}

		targetElement = this.getTargetElementFromEventTarget(event.target);
		touch = event.targetTouches[0];

		if (deviceIsIOS) {

			// Only trusted events will deselect text on iOS (issue #49)
			selection = window.getSelection();
			if (selection.rangeCount && !selection.isCollapsed) {
				return true;
			}

			if (!deviceIsIOS4) {

				// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
				// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
				// with the same identifier as the touch event that previously triggered the click that triggered the alert.
				// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
				// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
				// Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
				// which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
				// random integers, it's safe to to continue if the identifier is 0 here.
				if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
					event.preventDefault();
					return false;
				}

				this.lastTouchIdentifier = touch.identifier;

				// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
				// 1) the user does a fling scroll on the scrollable layer
				// 2) the user stops the fling scroll with another tap
				// then the event.target of the last 'touchend' event will be the element that was under the user's finger
				// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
				// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
				this.updateScrollParent(targetElement);
			}
		}

		this.trackingClick = true;
		this.trackingClickStart = event.timeStamp;
		this.targetElement = targetElement;

		this.touchStartX = touch.pageX;
		this.touchStartY = touch.pageY;

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault();
		}

		return true;
	};


	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.touchHasMoved = function(event) {
		var touch = event.changedTouches[0], boundary = this.touchBoundary;

		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true;
		}

		return false;
	};


	/**
	 * Update the last position.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchMove = function(event) {
		if (!this.trackingClick) {
			return true;
		}

		// If the touch has moved, cancel the click tracking
		if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
			this.trackingClick = false;
			this.targetElement = null;
		}

		return true;
	};


	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @param {EventTarget|HTMLLabelElement} labelElement
	 * @returns {Element|null}
	 */
	FastClick.prototype.findControl = function(labelElement) {

		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control;
		}

		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor);
		}

		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
	};


	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchEnd = function(event) {
		var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

		if (!this.trackingClick) {
			return true;
		}

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true;
			return true;
		}

		if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
			return true;
		}

		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false;

		this.lastClickTime = event.timeStamp;

		trackingClickStart = this.trackingClickStart;
		this.trackingClick = false;
		this.trackingClickStart = 0;

		// On some iOS devices, the targetElement supplied with the event is invalid if the layer
		// is performing a transition or scroll, and has to be re-detected manually. Note that
		// for this to function correctly, it must be called *after* the event target is checked!
		// See issue #57; also filed as rdar://13048589 .
		if (deviceIsIOSWithBadTarget) {
			touch = event.changedTouches[0];

			// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
			targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
			targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
		}

		targetTagName = targetElement.tagName.toLowerCase();
		if (targetTagName === 'label') {
			forElement = this.findControl(targetElement);
			if (forElement) {
				this.focus(targetElement);
				if (deviceIsAndroid) {
					return false;
				}

				targetElement = forElement;
			}
		} else if (this.needsFocus(targetElement)) {

			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
				this.targetElement = null;
				return false;
			}

			this.focus(targetElement);
			this.sendClick(targetElement, event);

			// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
			// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
			if (!deviceIsIOS || targetTagName !== 'select') {
				this.targetElement = null;
				event.preventDefault();
			}

			return false;
		}

		if (deviceIsIOS && !deviceIsIOS4) {

			// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
			// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
			scrollParent = targetElement.fastClickScrollParent;
			if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
				return true;
			}
		}

		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault();
			this.sendClick(targetElement, event);
		}

		return false;
	};


	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.onTouchCancel = function() {
		this.trackingClick = false;
		this.targetElement = null;
	};


	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onMouse = function(event) {

		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true;
		}

		if (event.forwardedTouchEvent) {
			return true;
		}

		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true;
		}

		// Derive and check the target element to see whether the mouse event needs to be permitted;
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			} else {

				// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
				event.propagationStopped = true;
			}

			// Cancel the event
			event.stopPropagation();
			event.preventDefault();

			return false;
		}

		// If the mouse event is permitted, return true for the action to go through.
		return true;
	};


	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onClick = function(event) {
		var permitted;

		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null;
			this.trackingClick = false;
			return true;
		}

		// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
		if (event.target.type === 'submit' && event.detail === 0) {
			return true;
		}

		permitted = this.onMouse(event);

		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null;
		}

		// If clicks are permitted, return true for the action to go through.
		return permitted;
	};


	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.destroy = function() {
		var layer = this.layer;

		if (deviceIsAndroid) {
			layer.removeEventListener('mouseover', this.onMouse, true);
			layer.removeEventListener('mousedown', this.onMouse, true);
			layer.removeEventListener('mouseup', this.onMouse, true);
		}

		layer.removeEventListener('click', this.onClick, true);
		layer.removeEventListener('touchstart', this.onTouchStart, false);
		layer.removeEventListener('touchmove', this.onTouchMove, false);
		layer.removeEventListener('touchend', this.onTouchEnd, false);
		layer.removeEventListener('touchcancel', this.onTouchCancel, false);
	};


	/**
	 * Check whether FastClick is needed.
	 *
	 * @param {Element} layer The layer to listen on
	 */
	FastClick.notNeeded = function(layer) {
		var metaViewport;
		var chromeVersion;
		var blackberryVersion;
		var firefoxVersion;

		// Devices that don't support touch don't need FastClick
		if (typeof window.ontouchstart === 'undefined') {
			return true;
		}

		// Chrome version - zero for other browsers
		chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (chromeVersion) {

			if (deviceIsAndroid) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// Chrome 32 and above with width=device-width or less don't need FastClick
					if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}

			// Chrome desktop doesn't need FastClick (issue #15)
			} else {
				return true;
			}
		}

		if (deviceIsBlackBerry10) {
			blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

			// BlackBerry 10.3+ does not require Fastclick library.
			// https://github.com/ftlabs/fastclick/issues/251
			if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// user-scalable=no eliminates click delay.
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// width=device-width (or less than device-width) eliminates click delay.
					if (document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
			}
		}

		// IE10 with -ms-touch-action: none or manipulation, which disables double-tap-to-zoom (issue #97)
		if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		// Firefox version - zero for other browsers
		firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (firefoxVersion >= 27) {
			// Firefox 27+ does not have tap delay if the content is not zoomable - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

			metaViewport = document.querySelector('meta[name=viewport]');
			if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
				return true;
			}
		}

		// IE11: prefixed -ms-touch-action is no longer supported and it's recomended to use non-prefixed version
		// http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
		if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		return false;
	};


	/**
	 * Factory method for creating a FastClick object
	 *
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	FastClick.attach = function(layer, options) {
		return new FastClick(layer, options);
	};


	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

		// AMD. Register as an anonymous module.
		define(function() {
			return FastClick;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = FastClick.attach;
		module.exports.FastClick = FastClick;
	} else {
		window.FastClick = FastClick;
	}
}());

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
	this.midi = null;
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
				alert('Error initializing the sequencer: ' + textStatus);
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

		if (FastClick) {
			FastClick.attach(_self.element);
		}

		_self.configureMIDIAccess();

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

	this.configureMIDIAccess = function() {
		if (navigator.requestMIDIAccess) {
			navigator.requestMIDIAccess({
				sysex: false
			}).then(
			function(midiAccess) {
				_self.midi = midiAccess;
				_self.midi.onstatechange = function() {
					_self.configureMIDIInputs();
					_self.enableMIDIControls(_self.midi.inputs.size > 0);
					_self.showMIDIConnectionAlerts(_self.midi.inputs.size == 0);
					_self.showMIDIErrorAlerts(false);
				}
				_self.configureMIDIInputs();
				_self.enableMIDIControls(_self.midi.inputs.size > 0);
				_self.showMIDIConnectionAlerts(_self.midi.inputs.size == 0);
				_self.showMIDIErrorAlerts(false);
			},
			function() {
				_self.enableMIDIControls(false);
				_self.showMIDIErrorAlerts(true);
			});
		} else {
			_self.enableMIDIControls(false);
			_self.showMIDIErrorAlerts(true);
		}
	}

	this.configureMIDIInputs = function() {
		if (_self.midi) {
			var inputs = _self.midi.inputs.values();
			for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
				input.value.onmidimessage = function(message) {
					var parsedData = _self.parseMIDIData(message.data);
					_self.routeMIDIData(parsedData);
				}
			}
		}
	}

	this.parseMIDIData = function(data) {
		return {
			cmd: data[0] >> 4,
			channel: data[0] & 0xf,
			type: data[0] & 0xf0,
			note: data[1],
			velocity: data[2]
		};
	}

	this.routeMIDIData = function(parsedData) {
		switch (parsedData.type) {
			case 144:
				if (parsedData.velocity > 0) {
					_self.MIDINoteOn(parsedData.note, parsedData.velocity);
				} else {
					_self.MIDINoteOff(parsedData.note, parsedData.velocity);
				}
				break;
			case 128:
				_self.MIDINoteOff(parsedData.note, parsedData.velocity);
				break;
		};
	}

	this.MIDINoteOn = function(note, velocity) {
		// Update the MIDI input display:
		var noteInputDisplay = document.getElementById('midi-note-input');
		if (noteInputDisplay) {
			noteInputDisplay.value = note;
		}
		// Search for matching voice controllers to play the note:
		for (var i = 0; i < _self.voiceControllers.length; i++) {
			var voiceController = _self.voiceControllers[i];
			if (voiceController.element) {
				var noteNumberInput = voiceController.element.querySelector('.midi-note-number');
				if (noteNumberInput && noteNumberInput.value == note) {
					if (!voiceController.muted) {
						voiceController.drum.trigger();
					}
				}
			}
		}
	}

	this.MIDINoteOff = function(note, velocity) {
		// Ignore note off
	}

	this.enableMIDIControls = function(enable) {
		var elements = document.querySelectorAll('.midi');
		for (var i = 0; i < elements.length; i++) {
			if (enable) {
				elements[i].removeAttribute('disabled');
			} else {
				elements[i].setAttribute('disabled', 'disabled');
			}
		}
	}

	this.showMIDIErrorAlerts = function(show) {
		var elements = document.querySelectorAll('.midi-error-alert');
		for (var i = 0; i < elements.length; i++) {
			if (show) {
				elements[i].style.display = 'inline-block';
			} else {
				elements[i].style.display = 'none';
			}
		}
	}

	this.showMIDIConnectionAlerts = function(show) {
		var elements = document.querySelectorAll('.midi-connection-alert');
		for (var i = 0; i < elements.length; i++) {
			if (show) {
				elements[i].style.display = 'inline-block';
			} else {
				elements[i].style.display = 'none';
			}
		}
	}

	return this.init();
}

window.addEventListener('load', function() {
	document.querySelector('.mask .start').addEventListener('click', function(e) {
		e.preventDefault();

		// Hide the mask:
		document.querySelector('.mask').classList.add('hidden');

		// Obtain a new audio context:
		var context = null;
		if (typeof window.AudioContext != 'undefined') {
			context = new AudioContext();
		} else if (typeof window.webkitAudioContext != 'undefined') {
			context = new webkitAudioContext();
		}

		if (!context) {
			alert('Sorry, your browser does not support the Web Audio API.');
			return;
		}

		// Build the drum machine:
		window.drumMachine = new WebDrumMachine(
			document.querySelector('#drum-machine'), 
			context);
	});
});