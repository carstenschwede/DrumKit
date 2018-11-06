;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
(function(global){require('./basic');
require('./gestures');
require('./info');
require('./simulation');


module.exports = global.Touchable;
})(window)
},{"./basic":2,"./gestures":3,"./info":4,"./simulation":5}],2:[function(require,module,exports){
(function(global){var Modernizr = require('./dep/modernizr.shim');
var _ = require('./dep/lodash.shim');
var __ = require('./ext');

	var Touchable = (function(element,options) {
		return new Touchable.Instance(element, options || {});
	});


	Touchable.Instance = function(element,options) {
		if (!element) {

			console.log("INVALID ELEMENT",element);
			return false;
		}
		if (element.element) {
			console.trace();
			console.log("ALREADY INIITALIZED");
			return element;
		}

		if (element.jquery) element = element.get();
		this.elements = _.isArray(element) ? element : [element];
		this.element = this.elements[0];
		this.options = options || {};
	};



	Touchable.Instance.prototype = {
		getGestureData: function() {
			return __.Element.retrieve(this.element,"gestureData",{});
		},
		getTouches: function(deep) {
			if (deep) {
				var touches = [];
				var elements = [this.element].concat(this.element.getAllChildren());
				elements.forEach(function(elem) {
					var elemTouches = elem.retrieve("touches",[]);
					if (elemTouches.length > 0)
						touches = touches.concat(elemTouches);
				});
				return touches;
			} else {
				return __.Element.retrieve(this.element,"touches",[]);
			}
		},
		removeTouchGesture: function(gestureType,callback,id) {
			var gestureTypes = __.Element.retrieve(this.element,"storedGestures",{});
			var newGestures = [];

			if (gestureType && callback) {
				if (gestureTypes[gestureType]) {
					gestureTypes[gestureType].forEach(function(gesture) {
						if (gesture.remove == callback.removeListeners) {
							gesture.remove();
						} else {
							newGestures.push(gesture);
						}
					});
					gestureTypes[gestureType] = newGestures;
				} else {
					console.log(gestureType,"WONT BE REMOVE CAUSE ITS NOT REGISTERED");
				}
				return;
			}

			if (!gestureType) {

					_.forOwn(gestureTypes,function(gestures, type) {
						gestures.forEach(function(gesture) {
							gesture.remove();
						});
						delete gestureTypes[type];
					});
					return;
				}

				if (!callback) {


					var gestures;
					if ((gestures = gestureTypes[gestureType])) {

						gestures.forEach(function(gesture) {
							if (!id || gesture.id == id) {
								gesture.remove();
							} else {
								newGestures.push(gesture);
							}
						});

						gestureTypes[gestureType] = newGestures;
					} else {
						console.error(gestureType,"WONT BE REMOVE CAUSE ITS NOT REGISTERED");
					}
					return;
				}

				console.error("GESTURE",gestureType,"IS UNKNOWN");
			},

		enableTouchGesture: function(gestureType) {
			var gestures = __.Element.retrieve(this.element,"storedGestures",{})[gestureType];
			if (gestures) {
				gestures.forEach(function(gesture) {
					gesture.enable();
				});
			}
		},

		disableTouchGesture: function(gestureType) {
			var gestures = __.Element.retrieve(this.element,"storedGestures",{})[gestureType];
			if (gestures) {
				gestures.forEach(function(gesture) {
					gesture.disable();
				});
			}
		},
		on: function(eventType) {
			var self = this;
			var args = arguments;



			var eventTypes = _.isArray(eventType) ? eventType : eventType.split(" ");

			var handleEvent = function(evtType) {
				var gesture = Touchable.Gestures[eventType];
				if (gesture) {
					return self.addTouchGesture.apply(self,arguments);
				}
				if (!eventType || ["touchstart","touchmove","touchend"].indexOf(eventType) != -1) {
					return self.addTouchEvent.apply(self,arguments);
				} else {
					console.log(eventType,"IS UNKNOWN");
				}
			};

			if (_.isObject(eventType)) {
				_.forOwn(eventType, function(val,key) {
					handleEvent(key,val);
				});
			} else {
				handleEvent.apply(this,arguments);
			}
			return this;
		},
		pause: function() {
			return this.disableTouchGesture.apply(this,arguments);
		},
		resume: function() {
			return this.enableTouchGesture.apply(this,arguments);
		},
		off: function(eventType) {

			var self = this;

			var handleEvent = function(evtType) {
				var gesture = Touchable.Gestures[eventType];
				if (gesture) {
					return self.removeTouchGesture.apply(self,arguments);
				}
				if (!eventType || ["touchstart","touchmove","touchend"].indexOf(eventType) != -1) {
					return self.removeTouchEvent.apply(self,arguments);
				} else {
					console.log(eventType,"IS UNKNOWN");
				}
			};

			if (_.isObject(eventType)) {
				_.forOwn(eventType, function(val,key) {
					return handleEvent(key,val);
				});
			} else {
				return handleEvent.apply(this,arguments);
			}
		},
		addTouchGesture: function(gestureType,callback,options) {
			callback = callback || {};
			options = options || {};
			options.active = options.active !== undefined ? options.active : true;

			var gesture = Touchable.Gestures[gestureType];
			if (!gesture) {
				console.log("GESTURE",gestureType,"IS UNKNOWN");
				return;
			}

			var gestures = __.Element.retrieve(this.element,"storedGestures",{});
			var activeGestures = __.Element.retrieve(this.element,"activeGestures",{});
			var evts = gesture(callback,this,options) || {};

			this.addMultiTouch(evts,options);

			if (!callback.removeListeners && !evts.removeListeners) {
				console.log("ADD TOUCH GESTURE",gestureType,"HAS NO REMOVE OPTION");
			} else {
				if (callback.removeListeners) {
					var oldRemoveListener = callback.removeListeners;
					callback.removeListeners = function() {
						oldRemoveListener();
						evts.removeListeners();
					};
				} else {
					callback.removeListeners = evts.removeListeners;
				}
			}

			gestures[gestureType] = gestures[gestureType] || [];
			options.id = options.id || __.Math.getUUID();

			var elem = this;
			options.progress = function(b) {
				if (b) {
					activeGestures[gestureType] = activeGestures[gestureType] || [];
					_.include(activeGestures[gestureType],options.id);
				} else {
					var a = activeGestures[gestureType];
					if (a) {
						_.erase(a,options.id);
						if (a.length === 0)
							delete activeGestures[gestureType];
					}
				}
			};

			gestures[gestureType].push({
				id: options.id,
				callback: callback,
				events: evts,
				options: options,
				remove: callback.removeListeners,
				enable: function() {
					options.active = true;
				},
				disable: function() {
					options.active = false;
				}
			});



		},
		addTouchEvent: function(origType,callback,options) {
			if (!_.contains(['touchstart','touchmove','touchend'],origType)) {
				console.log("ADD TOUCH EVENT IS A PRIMITIVE FOR TOUCHSTART,TOUCHMOVE,TOUCHEND, FOR ALL OTHER; PLEASE USE ADDTOUCHGESTURE");
				console.trace();
				return;
			}
			if (!callback) {
				console.trace();
				console.log("UNABLE TO ADDTOUCHEVENT WITHOUT CALLBACK");
				return;
			}

			var element = this.element;

			var gesture = Touchable.Gestures[origType];
			if (gesture) {
				this.addTouchGesture(origType,callback,options);
				return;
			}

			element.style["-ms-touch-action"] = "none";
			var handleEvent = function(origType,originalEvent, callback) {
				if (!callback) {
					console.log("UNABLE TO HANDLEVENT WITHOUT CALLBACK");
					return;
				}
				var id = originalEvent.identifier || originalEvent.streamId || originalEvent.pointerId;
				if (id === undefined) id = "MOUSE";

				var evt = {
					"from": originalEvent.relatedTarget || originalEvent.toElement,
					"stopped": originalEvent.stopped || false,
					"identifier": id,
					"type": originalEvent.type,
					"target": originalEvent.target || originalEvent.srcElement,
					"listenerTarget": element,
					"currentTarget": originalEvent.currentTarget || originalEvent.srcElement,
					"pageX": originalEvent.pageX,
					"pageY": originalEvent.pageY,
					"preventDefault": function() {if (originalEvent.preventDefault) originalEvent.preventDefault();},
					"origType": origType
				};


				evt.x = evt.clientX = evt.pageX = (evt.pageX === undefined && originalEvent.clientX !== undefined ? originalEvent.clientX : evt.pageX);
				evt.y = evt.clientY = evt.pageY = (evt.pageY === undefined && originalEvent.clientY !== undefined ? originalEvent.clientY : evt.pageY);

				if (evt.target) {



					var target = evt.target;
					while(target && (target.style["pointer-events"] == "none" || target.style.display == "none")) {
						target = target.parentNode;
					}
					if (evt.target != target) {
						evt.target = target;
					}
					if (evt.target.forwardTouchesTo) {
						evt.forwardedBy = evt.target;
						evt.target = evt.target.forwardTouchesTo;
					}
				}

				evt.stopPropagation = function() {
					if (!evt.stopped) {
						evt.stopped = originalEvent.stopped = originalEvent.cancelBubble = true;
					}
				};
				Touchable.prepareEvent(evt);
				var touch = Touchable.touches[evt.identifier];

				if (!touch && origType == 'touchstart') {
					touch = Touchable.TouchCemetery.shift();
					if (touch)
						touch.reset(evt);
					else {
						touch = new Touchable.Touch(evt);
					}
				}
				evt.touch = touch ? touch : {data:{}};

				if (touch) {
					if (origType == "touchmove") touch.touchmove(evt);
					if (origType == "touchend")	touch.touchend(evt);
				}

				callback(evt);
				return evt.stopped;



			};

			var attachEvent = function(element, type, callback) {
				if (!callback) {
					return false;
				}
				callback.wrappers = callback.wrappers || {};

				var prepareEvents = function(evt) {
					if (evt.changedTouches) {
						var sP = function() {evt.stopPropagation();};
						var pD = function() {evt.preventDefault();};
						for(var i=0;i<evt.changedTouches.length;i++) {
							var sEvt = evt.changedTouches[i];
							sEvt.stopPropagation = sP;
							sEvt.preventDefault = pD;
							sEvt.type = evt.type;
							sEvt.identifier = sEvt.identifier || evt.identifier;
							sEvt.currentTarget = sEvt.currentTarget || evt.currentTarget;
							handleEvent(origType,sEvt, callback);
						}
					} else {
						return handleEvent(origType,evt,callback);
					}
				};
				callback.wrappers[type] = prepareEvents;
				__.Element.addListener(element,type,prepareEvents);


			};
			if (origType == "touchstart") {
				if (element.addEventListener) {
					element.draggable = false;

				}
			}

			if (!Touchable.BrowserEventMappings[origType]) {
				console.log(origType,"IS UNKNNOWN");
				return;
			}

			Touchable.BrowserEventMappings[origType].forEach(function(mappedType) {

				if (Touchable.nativeTouchSupport && mappedType.indexOf("mouse") >= 0) {
				} else {
					attachEvent(element,mappedType,callback);
				}
			});

			var touchListeners = __.Element.retrieve(element,"touchListeners",{});

			touchListeners[origType] = touchListeners[origType] || [];
			touchListeners[origType].push(callback);



			return element;
		},
		addTouchEvents: function(evts) {
			var that = this;
			_.forOwn(evts, function(evt,type) {
				that.addTouchEvent(type,evt);
			});
			return this;
		},
		addTouchGestures: function(evts) {
			var that = this;
			_.forOwn(evts, function(evt,type) {
				that.addTouchGesture(type,evt);
			});
			return this;
		},
		removeMultiTouch: function(events) {
			events.removeListeners();
			delete events.removeListeners;
			delete events.onTouches;
		},
		addMultiTouch: function(events, options) {
			if (!events) {
				return;
			}
			options = options || {};
			if (options.active === undefined) options.active = true;


			events.touchstart = events.touchstart || function(){};
			events.touchmove = events.touchmove || function(){};
			events.touchend = events.touchend || function(){};
			var element = this.element;
			var targetElementMoveEnd = options.captureOutside === false ? element : Touchable.body.element;
			var active = {};
			var noActiveTouches = 0;

			var onTouches = {
				touchstart: function(evt) {
					if (evt.stopped) return;
					if (!evt.identifier) return;
					if (options.maxNoOfTouches && noActiveTouches >= options.maxNoOfTouches)
						return;

					if (!active[evt.identifier]) {
						noActiveTouches++;
						active[evt.identifier] = true;
						if (!evt.stopped && options.active) {
							events.touchstart(evt);
						}
					}
				},
				'touchmove': function(evt) {
					if (!evt.identifier) return;
					if (!active[evt.identifier]) return;
					if (!evt.stopped && options.active)
						events.touchmove(evt);
				},
				'touchend': function(evt) {
					console.log("TOUCHEND",evt.identifier,evt,active[evt.identifier]);
					if (!evt.identifier) return;
					if (!active[evt.identifier]) return;
					delete active[evt.identifier];
					noActiveTouches--;
					if (!evt.stopped && options.active) {
						console.log("REALLY TOUCHEND");
						events.touchend(evt);
					}
				}
			};

			events.removeListeners = function() {
				Touchable(element).removeTouchEvent('touchstart',onTouches.touchstart );
				Touchable(targetElementMoveEnd).removeTouchEvent('touchmove',onTouches.touchmove );
				Touchable(targetElementMoveEnd).removeTouchEvent('touchend',onTouches.touchend);
			};
			events.onTouches = onTouches;
			Touchable(element).addTouchEvent('touchstart',onTouches.touchstart);
			Touchable(targetElementMoveEnd).addTouchEvent('touchmove',onTouches.touchmove);
			Touchable(targetElementMoveEnd).addTouchEvent('touchend',onTouches.touchend);
		},
		removeTouchEvent: function(type,fn) {

			if (!type) {
				return this.removeTouchEvents();
			}


			if (!_.contains(["touchstart","touchmove","touchend"],type)) {
				console.log("REMOVE TOUCH EVENT IS ONLY FOR TOUCHSTART, TOUCHMOVE, TOUCHEND, FOR ALL OTHERS, USE REMOVE TOUCH GESTURE");
				return;
			}


			if (!fn || !fn.wrappers) {
				return this.removeTouchEvents([type]);
			}


			var elem = this.element;
			Touchable.BrowserEventMappings[type].forEach(function(mappedType) {
				__.Element.removeListener(elem,mappedType,fn.wrappers[mappedType]);
			});
		},
		removeTouchEvents: function(evts) {
			var self = this;
			var elem = this.element;
			var touchListeners = __.Element.retrieve(elem,"touchListeners",{});
			if (!evts) {
				_.forOwn(touchListeners, function(fns, type) {
					fns.forEach(function(fn) {
						self.removeTouchEvent(type,fn);
					});
				});
				return this;
			}

			if (_.isArray(evts)) {
				evts.forEach(function(type) {
					touchListeners[type].forEach(function(fn) {
						self.removeTouchEvent(type,fn);
					});
				});
				return this;
			}
		},

		hasActiveGesture: function(which) {
			var activeGestures = __.Element.retrieve(this.element,"activeGestures",{});

			if (!which)
				return Object.keys(activeGestures).length > 0;
			else
				return activeGestures[which];
		}
	};

	Touchable.Gestures = {};

	_.merge(Touchable,{
		dependencies: {
			"basics": false,
			"gestures": false
		},

		BrowserEventMappings: {
			touchstart: ['touchstart','MozTouchDown','MSPointerDown','mousedown'],
			touchmove: ['touchmove','MozTouchMove','MSPointerMove','mousemove'],
			touchend: ['touchend','touchcancel','MozTouchUp','MSPointerUp','mouseup']
		},
		nativeTouchSupport:false,
		options: {
			doTouchesIndicators: false,
			TUIO: false
		},
		tuio: {
			active: false
		},
		releaseCandidates: {},

		touches: {},
		highestZ: 99,
		states: {},
		events: {
			"touchmove": function(evt) {

			},
			"touchend": function(evt) {


				_.delay(function() {
					if (evt.origType == "touchend" && evt.touch && evt.touch.kill) evt.touch.kill();
				},10);
			}
		},
		on: function(state,callback) {
			Touchable.states[state] = Touchable.states[state] || {callbacks: [], finished: false};
			if (!Touchable.states[state].finished) {
				Touchable.states[state].callbacks.push(callback);
			} else {
				var TouchableOrjQuery = window.jQuery !== undefined ? window.jQuery : Touchable;
				callback(TouchableOrjQuery,__,_);
			}
		},
		is: function(state) {
			Touchable.states[state] = Touchable.states[state] || {callbacks: [], finished: true};
			var TouchableOrjQuery = window.jQuery !== undefined ? window.jQuery : Touchable;

			while ((callback = Touchable.states[state].callbacks.shift())) {
				callback(TouchableOrjQuery,__,_);
			}
			Touchable.states[state].finished = true;
		},
		loaded: function(what) {
			Touchable.dependencies[what] = true;
			var missing = false;
			_.forOwn(Touchable.dependencies, function(v,k) {
				if (!v) {
					missing = true;
				}
			});

			if (!missing) {
				Touchable.is("ready");
			}
		},
		prepareEvent: function(evt) {
			if (evt.origType!="touchmove") {

				var actionTags = ["A","INPUT","TEXTAREA","SELECT","BUTTON","EMBED",'IFRAME'];
				if (evt.target) {
					var maxLevels = 2;
					var curElement = evt.target;
					while(maxLevels-- && curElement) {
						if (curElement.tagName && _.contains(actionTags,curElement.tagName.toUpperCase())) {
							curelement = false;
							return evt;
						} else
							curElement = curElement.parentNode;
					}
				}
			}




		},

		init: function(options) {
			if (Touchable.initialized) return;
			Touchable.initialized = true;
			Touchable.nativeTouchSupport = Modernizr.touch = window.navigator.msPointerEnabled ? true : Modernizr.touch;
			Modernizr.csstransforms3d = Modernizr.csstransforms3d || __.Element.transformStyleKeys.transform == "webkitTransform";

			document.multitouchData = true;

			if (window.jQuery) {
				var names = ["addTouchEvent","addTouchEvents","addTouchGesture","addTouchGestures"];
				names.forEach(function(name) {
					window.jQuery.fn[name] = function() {
						var args = Array.prototype.slice.call(arguments, 0);
						return this.each(function() {
							var elem = this;
							var touchIOInstance = Touchable(elem);
							return touchIOInstance[name].apply(touchIOInstance,args);
						});
					};
				});
			}

			Touchable.loaded("basics");
		},
		TouchPrototype: {
			data: {},
			pathHistory: [],
			states: {
				DOWN: 0,
				MOVE: 1,
				END: 2
			},
			touchmove: function(e) {
				this.update(Touchable.TouchPrototype.states.MOVE,e);
			},
			touchend: function(e) {
				if (this.state == Touchable.TouchPrototype.states.END) return;
				if (this.element) {
					var newTouches = [];
					var oldTouches = __.Element.retrieve(this.element,"touches",[]);
					var thisTouchId = this.identifier;
					oldTouches.forEach(function(touch) {
						if (touch.identifier != thisTouchId) {
							newTouches.push(touch);
						}
					});
					__.Element.store(this.element,"touches",newTouches);
				}
				this.update(Touchable.TouchPrototype.states.END,e);
			},
			kill: function(e) {
				if(Touchable.touches[this.identifier]) {
					delete Touchable.touches[this.identifier];
					Touchable.TouchCemetery.push(this);
					if (this.afterKill) {
						this.afterKill();
					}
				}
				if (Touchable.options.doTouchesIndicators) {
					if (Touchable.touchesActiveIndicators[this.identifier]) {
						Touchable.touchesActiveIndicators[this.identifier].style.display = "none";
						Touchable.touchesIndicators.push(Touchable.touchesActiveIndicators[this.identifier]);
						delete Touchable.touchesActiveIndicators[this.identifier];
					}
				}
			},

			update: function(state,e) {
				this.state = state;
				this.event = e;
				e.touch = this;
				this.updateCoordinates();
				var now = +(new Date());
				this.age = now - this.birthdate;

				if ((this.pathHistory.length === 0) || (now > _.last(this.pathHistory).date)) {

					var newEntry = {
						x: this.coordinates.x,
						y: this.coordinates.y,
						date: now
					};

					this.deltaToLast = this.pathHistory.length > 0 ? __.Math.delta(_.last(this.pathHistory), newEntry) : {x:0,y:0};
					this.pathHistory.push(newEntry);

				}
				if (this.state == Touchable.TouchPrototype.states.DOWN) {
					this.updateElements();
				}
				this.updateDistance();

				this.updateTouchIndicators();
			},
			getCoordinates: function() {
				return {
					startCoordinates: this.startCoordinates,
					coordinates: this.coordinates
				};
			},
			getRelativeCoordinates: function(towards) {
				var matrix = __.Element.getNestedTransformStyleMatrix(towards || this.element,false,true).inverse();
				var c = {
					identifier: this.identifier,
					startCoordinates: matrix.multPoint(this.startCoordinates.x,this.startCoordinates.y,0),
					coordinates: matrix.multPoint(this.coordinates.x,this.coordinates.y,0),
					absolute: {
						startCoordinates: this.startCoordinates,
						coordinates: this.coordinates
					}
				};
				c.delta = __.Math.delta(c.startCoordinates,c.coordinates);
				var lastPoint = c.coordinates;
				c.deltaToLast = this.pathHistory.length > 1 ? __.Math.delta(matrix.multPoint(this.pathHistory[this.pathHistory.length-2].x,this.pathHistory[this.pathHistory.length-2].y,0),c.coordinates) : {x:0,y:0};
				return c;

			},
			resetDelta: function() {
				this.startCoordinates = this.coordinates;
				this.distance = 0;
				this.distanceVector = {x:0,y:0};
				this.deltaToLast = {x:0,y:0};
				return this;
			},
			updateCoordinates: function() {
				this.coordinates = {x:this.event.pageX,y:this.event.pageY};


			},
			updateTouchIndicators: function() {
				if (Touchable.options.doTouchesIndicators) {
					var indicator = Touchable.touchesActiveIndicators[this.identifier];
					if (!indicator) {
						indicator = Touchable.touchesActiveIndicators[this.identifier] = Touchable.touchesIndicators.shift();
						if (!indicator) {
							console.log("NOT ENOUGH INDICATORS");
						} else {
							indicator.style.display = "block";
							indicator.children[0].innerHTML = this.identifier;
						}
					}

					if (indicator) {
						var coordinates = this.coordinates;
						var relative = true;
						if (relative) {
							coordinates = this.getRelativeCoordinates(this.element.parentNode).coordinates;
							this.element.parentNode.appendChild(indicator);
						} else {
							Touchable.touchesIndicatorContainer.appendChild(indicator);
						}
						__.Element.setTransformStyle(indicator,{
							translateX: coordinates.x,
							translateY: coordinates.y
						});
					}
				}
			},
			updateDistance: function() {
				var delta = {
					x: this.coordinates.x - this.startCoordinates.x,
					y: this.coordinates.y - this.startCoordinates.y
				};
				this.distance = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
				this.distanceVector = delta;
			},
			updateElements: function(element) {
				if (this.state != Touchable.TouchPrototype.states.DOWN) return;
				var touchedUpdate = this.element != (element || this.event.target);
				this.element = element || this.event.target;
				this.touchedElement = (touchedUpdate || !this.touchedElement) ? Touchable(this.element) : this.touchedElement;

				this.startElement = this.element;

				this.startCoordinates = {x: this.coordinates.x,y: this.coordinates.y};

				if (this.element) {
					var touches = __.Element.retrieve(this.element,"touches");
					if (touches) {
						touches.push(this);
					} else {
						__.Element.store(this.element,"touches",[this]);
					}
				}
			},
			reset: function(e) {
				this.data = {};
				this.identifier = e.identifier;
				this.birthdate = +(new Date());
				this.pathHistory = [];
				Touchable.touches[e.identifier] = this;
				this.update(Touchable.TouchPrototype.states.DOWN,e);
			},
			getTrendDirection: function(timeSpan) {
				var now = +(new Date()), trend = {x:0,y:0}, delta, eventAge, weight;

				var trends = 0;
				for(var i = this.pathHistory.length-1;i>0;i--) {
					eventAge = now - this.pathHistory[i].date;
					if (eventAge > timeSpan) break;
					trends++;
					weight = __.Math.limitTo(1-eventAge/timeSpan,0,1);
					var deltaX = (this.pathHistory[i].x-this.pathHistory[i-1].x);
					var deltaY = (this.pathHistory[i].y-this.pathHistory[i-1].y);
					trend.x+=weight*deltaX;
					trend.y+=weight*deltaY;
				}
				return trend;
			}
		},
		Touch: function(e) {
			this.reset(e);
		}
		/*,
		processMarkupChange: function(node) {
			node.getAllChildren().concat(node).forEach(function(element) {

				var mObject = element.getAttribute("data-mt-object");
				var attributes = JSON.decode(element.getAttribute('data-mt-attributes'));
				if (mObject) {
					switch (mObject.toLowerCase()) {
						case "map":
							element.setStyles({position: 'relative',overflow: 'hidden'});
							var map = new Touchable.map(element,attributes);
						break;
						case "painter":
							attributes.container = element;
							window.drawer = new window.CanvasDrawer(attributes);
						break;
						case "collection":
							var container = new Element('div',{
								styles: {
									'position': 'relative',
									'left': '50%',
									'top': '150px'
								}
							});
							container.setStyles(element.getStyles());
							var c = new Touchable.Collection({
								autocollapse: false
							});
							c.container.inject(container);
							container.inject(element,'before');
							element.getChildren().forEach(function(child) {
								img = new Touchable.image(attributes);
								c.add(img);
							});
							console.log("NEW COLLECTION",c);
						break;
						case "prezi":
							var attributesStr = element.getAttribute('data-mt-object-attributes');
							var attributes2 = JSON.decode(attributesStr);
							console.log("Prezi", element);
							new Prezi(element,attributes2);
						break;
						default:
						break;
					}
				}
			});
		}
		*/
	});
	Touchable.Touch.prototype = Touchable.TouchPrototype;
	Touchable.TouchCemetery = [];


	var onReady = function(callback) {
		var loaded = false;

		var callback2 = function() {
			if (!document.body) {
				console.log("NOT READY");
			} else {
				if (loaded) return;
				loaded = true;
				callback();
			}
		};

		if (/complete|loaded/.test(document.readyState)) {
			callback2();
			return;
		}

		if (window.addEventListener) {
			window.addEventListener('DOMContentLoaded', function() {
				callback2();
			},false);

			window.addEventListener('load', function() {
				callback2();
			},false);
		} else {
			if (window.attachEvent) {
				window.attachEvent('onreadystatechange', function(evt) {
					if (/complete|loaded/.test(document.readyState)) {
						callback2();
					}
				});

				window.attachEvent('onload', function(evt) {
					callback2();
				});
			} else {
				if (window.onload) {
					window.onload = callback2;
				}
			}
		}
	};

	onReady(function() {
		Touchable.body = Touchable(document.body);
/*
		__.Element.css(document.body.parentNode,{
			"margin": 0,
			"height": "100%",
			"width": "100%"
		});

		__.Element.css(document.body,{
			"margin": 0,
			"min-height": "100%",
			"width": "100%"
		});
*/
		_.forOwn(Touchable.events, function(value,key) {
			Touchable.body.addTouchEvent(key,value);
		});


		var onMouseOut = function(evt) {
			var from = evt.relatedTarget || evt.toElement;

			if (!from || from.nodeName == "HTML") {
				Touchable(document.body).simulate("MOUSE").touchend();
				//console.log("MOUSE OUTSIDE WINDOW",callback);
				//RELEASE ALL TOUCHES
			}
		}

		if (!Touchable.nativeTouchSupport) {
			__.Element.addListener(document.body,"mouseout", onMouseOut);
		}

		Touchable.init();
	});



	module.exports = global.Touchable = Touchable;
})(window)
},{"./dep/modernizr.shim":6,"./dep/lodash.shim":7,"./ext":8}],3:[function(require,module,exports){
(function(global){	var Touchable = global.Touchable;
	var __ = require('./ext');
	var _ = require('./dep/lodash.shim');

	global.Touchable.relayGesture = function(targetGesture,callback,element,options) {
		return Touchable.Gestures[targetGesture](callback,element,options);
	};

	Touchable.Gestures = {
		nothing: require('./gestures/empty'),
		shake: require('./gestures/shake'),
		tap: require('./gestures/tap'),
		doubleTap: require('./gestures/doubleTap'),
		doubleTapToggle: require('./gestures/doubleTapToggle'),
		toggleTap: require('./gestures/toggleTap'),
		hold: require('./gestures/hold'),
		strikethrough: require('./gestures/strikethrough'),
		swipe: require('./gestures/swipe'),
		transrotoscale: require('./gestures/transrotoscale'),
		rotoscale: require('./gestures/rotoscale')
	};


	//Add jQuery plugin for every gesture so you can do
	// $(elem)['gesturename']();

	_.forOwn(window.Touchable.Gestures, function(gesture,name) {
		if (window.jQuery) {
			if (window.jQuery.fn[name]) {
				console.log("Unable to add jQuery-Plugin for " + name + ", since $.fn." + name,"is already present, won't be overwritten");
				return;
			}
			window.jQuery.fn[name] = function() {
			var args = Array.prototype.slice.call(arguments, 0);
			args = [name].concat(args);

			return this.each(function() {
				var elem = this;
				var touchIOInstance = Touchable(elem);
				return touchIOInstance.on.apply(touchIOInstance,args);
			});
		};
		}

		Touchable.Instance.prototype[name]  = function() {
			var args = Array.prototype.slice.call(arguments, 0);
			args = [name].concat(args);
			return this.on.apply(this,args);
		};
	});


	Touchable.loaded("gestures");

})(window)
},{"./ext":8,"./dep/lodash.shim":7,"./gestures/empty":9,"./gestures/shake":10,"./gestures/tap":11,"./gestures/doubleTap":12,"./gestures/doubleTapToggle":13,"./gestures/toggleTap":14,"./gestures/hold":15,"./gestures/strikethrough":16,"./gestures/swipe":17,"./gestures/transrotoscale":18,"./gestures/rotoscale":19}],4:[function(require,module,exports){
(function(global){	var Touchable = global.Touchable;
	var __ = require('./ext');
	var _ = require('./dep/lodash.shim');


	_.merge(Touchable,{
		touchesActiveIndicators: {},
		touchesIndicators: [],
		infoElement: (function() {
			var div = document.createElement('div');
			__.Element.css(div,{
				display: 'none',
				border: '1px solid white',
				'border-radius': '10px',
				position:'absolute',
				width: 500,
				height: 300,
				left: '50%',
				top: '50%',
				'margin-left': -250,
				'margin-top': -150,
				'padding': 10,
				color: '#ddd',
				'background-color': 'rgba(0,0,0,0.8)',
				'box-shadow': '0px 0px 20px 5px black'
			});

			__.Element.setTransformStyle(div,{
				scaleX: 0,scaleY:0
			});
			return div;
		})(),
		showInfo: function(text) {
			if (Touchable.infoElement.parentNode != document.body) {
				Touchable.infoElement.inject(document.body);
			}
			_.delay((function() {
				__.Element.setTransformStyle(Touchable.infoElement,{
					scaleX:0,
					scaleY:0
				});
				Touchable.infoElement.innerHTML = text;
				/*
				Touchable.infoElement.animStyle({
					scaleX: 1,
					scaleY: 1
				}, {
					duration: 150
				});
				*/
			}),10);
		},
		hideInfo: function() {
			/*
			Touchable.infoElement.animStyle({
				scaleX: 0,
				scaleY: 0
			}, {
				duration: 150
			});
			*/
		},
		enableTouchIndicators: function() {
			Touchable.touchesIndicatorContainer.style.display = "block";
			Touchable.options.doTouchesIndicators = true;
		},
		disableTouchIndicators: function() {
			Touchable.touchesIndicatorContainer.style.display = "none";
			_.forOwn(Touchable.touchesActiveIndicators, function(indicator,id) {
				Touchable.touchesIndicators.push(indicator);
				delete Touchable.touchesActiveIndicators[id];
			});
			Touchable.options.doTouchesIndicators = false;
		}
	});

	Touchable.on("ready", function() {
		Touchable.touchesIndicatorContainer = document.createElement('div');
		Touchable.touchesIndicatorContainer.id = "touchesContainer";
		Touchable.touchesIndicatorContainer.style.display = "none"
		Touchable.body.element.appendChild(Touchable.touchesIndicatorContainer);



		//CREATE TOUCHES INDICATORS
		var radius = 75;
		var border = 1;
		for(var i=0;i<32;i++) {
			var elem = document.createElement('div');
			elem.className = "touchIndicator";
			__.Element.css(elem,{
				width: radius+"px",
				height: radius+"px",
				position: 'absolute',
				left: 0,
				top: 0,
				"margin-left": -(radius*0.5+border)+"px",
				"margin-top": -(radius*0.5+border)+"px",
				border: border+'px solid #00baff',
				'borderRadius': radius+"px",
				color: 'white',
				zIndex: 777777777,
				pointerEvents: 'none'
			});
			Touchable.touchesIndicatorContainer.appendChild(elem);

			var label = document.createElement('div');
			label.className = "touchIndicatorLabel";
			elem.appendChild(label);
			Touchable.touchesIndicators.push(elem);
		}
});
		module.exports = global.Touchable = Touchable;

})(window)
},{"./ext":8,"./dep/lodash.shim":7}],5:[function(require,module,exports){
	var Touchable = window.Touchable;
	var __ = require('./ext');
	require('./dep/async.shim');

	Touchable.Instance.prototype.simulate = function() {
			var self = this;

			var elem = this.element;
			var stack = [];

			var openTouches = [];
			var execute = function() {

				async.series(stack,function() {
					openTouches.forEach(function(openTouch) {
						self.fireTouchEvent("touchend",{identifier: openTouch});
					});
				});
				/*
				stack.forEach(function(stack) {
					openTouches.forEach(function(openTouch) {
						elem.fireTouchEvent("touchend",{identifier: openTouch});
					});
				});
*/
			};

			var execTimer = false;
			var rt = function() {
				execTimer = clearTimeout(execTimer);
				execTimer = _.delay(execute,10);
			};
			var obj = {
				then: function(callback) {
					rt();
					stack.push(function(next) {
						callback();
						next();
					});
					return this;
				},
				delay: function(delay) {
					rt();
					stack.push(function(next) {
						_.delay(next,delay);
					});
					return this;
				}
			};
			var identifierOffset = Touchable.simulateTouchIdentifierOffset;
			var highestId = 0;
			var delayAfterFiring = 10;
			["start","move","end"].forEach(function(evtType) {
				var touchEvent = "touch" + evtType;
				obj[touchEvent] = function(identifier,args) {
					rt();

				identifier = identifier || 0;
				args = args || {};
				if (_.isObject(identifier)) {
					args = identifier; identifier = 0;
				}
				if (args.x)	args.pageX = args.x;
				if (args.y)	args.pageY = args.y;

				Touchable.simulateTouchIdentifierOffset = Math.max(Touchable.simulateTouchIdentifierOffset, identifierOffset+identifier+1);
					var evtObj = {
						identifier: identifierOffset+identifier
					};
					_.merge(evtObj,args);
					stack.push(function(next) {
						if (evtType == "start") {
							_.include(openTouches,evtObj.identifier);
						}
						if (evtType == "end") _.erase(openTouches,evtObj.identifier);
						self.fireTouchEvent(touchEvent,evtObj);
						_.delay(next,delayAfterFiring);
					});
					return this;
				};
			});
			return obj;
		}


		Touchable.Instance.prototype.fireEventWithBubbles = function(eventType,evtObj) {
			return self.fireTouchEvent(eventType,evtObj);
		};

		Touchable.Instance.prototype.fireTouchEvent = function(eventType,evtObj) {
			evtObj = evtObj || {};
			if (!evtObj.identifier) {
				console.log("UNABLE TO FIRETOUCHEVENT WITHOUT IDENTIFIER");
				return;
			}
			evtObj.pageX = evtObj.pageX || 0;
			evtObj.pageY = evtObj.pageY || 0;
			evtObj.target = evtObj.target || this.element;
			var node = evtObj.target;
			var bubbles = false;
			var extendEvent = function(evt) {
				_.forOwn(evtObj, function(value,key) {
					evt[key] = value;
				});
			};
			while (node) {
				if (eventType == "touchstart" && node.tagName == "INPUT") node.focus();
				var evt;
				if (document.createEvent) {
					evt = document.createEvent("Events");
					evt.initEvent(eventType, true, true);
				} else if (document.createEventObject) {
					evt = document.createEventObject();
				}

				extendEvent(evt);
				if (node.dispatchEvent) {
					node.dispatchEvent(evt);
				} else {
					bubbles = true;
					var id = __.Element.getId(node);
					if (__.Element.globalEventData[eventType] && __.Element.globalEventData[eventType][id]) {
						var evtData = __.Element.globalEventData[eventType][id];
						__.Element.globalEventData[eventType][id].data.push(evt);

						if (node[eventType] === undefined) {
							node[eventType] = 0;
						}

						//console.log("FIRING",id,eventType);
						node[eventType]++;
					}




					/*
					if (node.fireEvent) {
						node.fireEvent('on' + eventType, evt);
					} else {
						console.log("DONT KNOW HOW TO FIRE EVENT");
					}
					*/
				}

				if (bubbles) {
					if (node == Touchable.body.element || evt.bubbles === false || evt.cancelBubble)
						node = false;
					else
						node = node.parentNode;

				} else {
					node = false;
				}
			}
		}

	Touchable.simulateTouchIdentifierOffset = 1000;

	module.exports = Touchable;
},{"./ext":8,"./dep/async.shim":20}],7:[function(require,module,exports){
module.exports = require('./lodash.own.js');
},{"./lodash.own.js":21}],8:[function(require,module,exports){
;
(function(window) {
	var __ = require('./ext/basic');
	require('./ext/Math');
	require('./ext/Element');
	window.__ = __;
	module.exports = __;
})(this);
},{"./ext/basic":22,"./ext/Math":23,"./ext/Element":24}],20:[function(require,module,exports){
(function(global){/*'use strict';*/
/* global window,require,module */
require('./async.js');
module.exports = global.async = window.async;
})(window)
},{"./async.js":25}],6:[function(require,module,exports){
(function(global){'use strict';
require('./modernizr.stripped');
module.exports = global.Modernizr = window.Modernizr;
})(window)
},{"./modernizr.stripped":26}],9:[function(require,module,exports){
var Touchable = require('../basic');
	var empty = function(callback,element,options) {
		var events = {
			touchstart: function(evt) {
				//console.log("TOUCH STARTED");
			},
			touchmove: function(evt) {
				//console.log("TOUCH MOVED");
			},
			touchend: function(evt) {
				//console.log("TOUCH ENDED");
			}
		};
		return events;
	};
	module.exports = empty;
},{"../basic":2}],10:[function(require,module,exports){
var Touchable = require('../basic');
	var shake = function(callback,element,options) {
			var lastTouch = false;
			var cumDistance = 0;
			var fired = false;
			var rectangle = {
				tl: false,
				br: false
			};
			var diagonalThres = Math.pow(200,2);
			var events = {
				touchstart: function(evt) {
					fired = false;
					lastTouch = false;
					cumDistance = 0;
				},
				touchmove: function(evt) {
					if (element.getTouches().length != 1) return;
					if (fired) return;
					var coord  = evt.touch.coordinates;

					if (lastTouch) {
						rectangle.tl.x = Math.min(rectangle.tl.x,coord.x);
						rectangle.tl.y = Math.min(rectangle.tl.y,coord.y);
						rectangle.br.x = Math.max(rectangle.br.x,coord.x);
						rectangle.br.y = Math.max(rectangle.br.y,coord.y);
						var diagonal = Math.pow(rectangle.br.y - rectangle.tl.y,2)+Math.pow(rectangle.br.x - rectangle.tl.x,2);

						cumDistance += __.Math.distance(lastTouch,coord);
						//console.log(options.active,evt.touch.age,cumDistance,evt.touch.distance*4,diagonal,diagonalThres);
						if (options.active && evt.touch.age < 1000 && cumDistance > 200 && cumDistance > evt.touch.distance*4) { //} && diagonal < diagonalThres) {
							fired = true;
							callback(evt);
						}
					} else {
						rectangle.tl = {x:coord.x,y:coord.y};
						rectangle.br = {x:coord.x,y:coord.y};
					}



					lastTouch = coord;
				},
				touchend: function() {
				}
			};
			return events;
		};
	module.exports = shake;
},{"../basic":2}],11:[function(require,module,exports){
var Touchable = require('../basic');
var tap = function(callback,element,options) {

	var events = {
		touchend: function(evt) {
			if (evt.touch.distance < 15 && evt.touch.age < 500) {
				callback(evt);
			}
		}
	};
	return events;
};
module.exports = tap;
},{"../basic":2}],12:[function(require,module,exports){
var Touchable = require('../basic');
	var doubleTap = function(callback,element,options) {
			var maxDoubleTapInterval = 250;

			var lastTapAt = 0;
			var lastCoord = false;
			var callback2 = function(evt) {
				var now = +(new Date());
				var timeSinceLastTap = now - lastTapAt;

				var distance = lastCoord ? __.Math.distance(lastCoord,evt.touch.coordinates) : 0;
				lastCoord = evt.touch.coordinates;

				lastTapAt = now;
				if (timeSinceLastTap < maxDoubleTapInterval && distance < 50) {
					lastTapAt = 0;
					callback(evt);
				}
			};
			var events = Touchable.relayGesture('tap',callback2,element,options);
			return events;
		};
	module.exports = doubleTap;
},{"../basic":2}],13:[function(require,module,exports){
	var Touchable = require('../basic');
	var doubleTapToggle = function(callback,element,options) {
			var toggle = false;
			var events = Touchable.relayGesture('doubleTap',function(evt) {
				toggle = !toggle;
				callback(evt,toggle);
			},element,options);
			return events;
		}
	module.exports = doubleTapToggle;
},{"../basic":2}],14:[function(require,module,exports){
var Touchable = require('../basic');
var toggleTap = function(callback,element,options) {

	var toggle = false;
	var events = Touchable.relayGesture('tap',function(evt) {
		toggle = !toggle;
		callback(evt,toggle);
	},element,options);

	return events;
};
module.exports = toggleTap;
},{"../basic":2}],15:[function(require,module,exports){
/*
var Touchable = require('../basic');
	var hold = function(callback, element, options) {
			var timer;
			options.abort = options.abort || function() {};
			options.duration = options.duration || 750;
			options.maxDistance = options.maxDistance || 15;

			var called = false;
			var onHold = function(evt) {
				callback(evt);
				called =true;
			};
			var events = {
				touchstart: function(evt) {
					called = false;
					timer = clearTimeout(timer);
					timer = _.delay(onHold,options.duration,[evt]);
				},
				touchmove: function(evt) {
					if (evt.touch.distance > options.maxDistance) {
						timer = clearTimeout(timer);
						options.abort();
					}
				},
				touchend: function(evt) {
					console.log("HOLD ACTIVE",options.active);
					timer =  clearTimeout(timer);
					if (!called)
						options.abort();
				}
			};

			element.addMultiTouch(events, {
				maxNoOfTouches: 1,
				captureOutside: true
			});

			callback.removeListeners = function() {
				element.removeMultiTouch(events);
			};
		}
	module.exports = hold;
*/


var Touchable = require('../basic');
var hold = function(callback,element,options) {
	options.duration = options.duration || 750;
	options.maxDistance = options.maxDistance || 15;

	var timer;

	var events = {
		touchstart: function(evt) {
			timer = clearTimeout(timer);
			timer = setTimeout(function() {
				if (evt.touch.distance < options.maxDistance) {
					callback(evt);
				}
			},options.duration);
		},
		touchend: function() {
			timer = clearTimeout(timer);
		}
	};

	return events;
};
module.exports = hold;


},{"../basic":2}],16:[function(require,module,exports){
var Touchable = require('../basic');
	var strikethrough = function(callback,elem,options) {
			//options.onlyIf = options.onlyIf || function() {return true;};
			var maxDur = 1000;

			Touchable.globalGestures = Touchable.globalGestures || {};
			if (!Touchable.globalGestures.strikethrough) {

				var gesturedElements = {};

				Touchable.globalGestures.strikethrough = {
					registered: [],
					events: {
						touchstart: function(evt) {
							var touchedElementGesture = evt.touch.touchedElement.hasActiveGesture();
							if (touchedElementGesture)
								gesturedElements[evt.identifier] = evt.touch.element;
						},
						touchend: function(evt) {
							var touchedElementGesture = gesturedElements[evt.identifier];
							delete gesturedElements[evt.identifier];

							var from = evt.touch.startCoordinates;
							var to = evt.touch.coordinates;

							if (from === undefined || to === undefined) return;

							var delta = __.Math.delta(from,to);
							var angle = __.Math.getAngleToX(delta);
							var thresh = 0.2 * __.Math.getLength(delta);
							var rotY = __.Math.rotate(from,-angle).y;
							var rotX0 = __.Math.rotate(from,-angle).x - 5;
							var rotX1 = __.Math.rotate(to,-angle).x + 5;

							for(var i=0; i < evt.touch.pathHistory.length; i++){
								var rotP = __.Math.rotate(evt.touch.pathHistory[i],-angle);
								if (Math.abs(rotP.y-rotY) > thresh) return;
								if (rotP.x < rotX0) return;
								if (rotP.x > rotX1) return;
							}
							Touchable.globalGestures.strikethrough.registered.forEach(function(register) {
								if (!register.elem.element.parentNode) {
									//ELEMENT HAS BEEN REMOVED WITHOUT BEING DEREGISTERED,
									callback.removeListeners();
									//_.erase(Touchable.globalGestures.strikethrough.registered,register);
									return;
								}
								if (!register.options.active) return;
								if (register.elem.hasActiveGesture() || touchedElementGesture) return;

								if (evt.touch.age > maxDur) return;

								var corners = __.Element.getNestedCorners(register.elem.element);
								if (__.Math.isPointInPath(from,corners) || __.Math.isPointInPath(to,corners)) return;

								// We're sure it's a straight line. Now let's test, if it strikes through our element
								var center = __.Math.between(corners[0],corners[2],0.5);

								// scale bounding rect down by 60% to designate center area
								corners.forEach(function(c){
									__.Math.add_(c, __.Math.scale(__.Math.delta(c, center),0.6));
								});

								if (__.Math.intersectPoly(from,to,corners)){

									register.callback(evt);
								}
							});

						}
					}
				};
				Touchable.body.addTouchEvents(Touchable.globalGestures.strikethrough.events);
			}

			var register = {
				callback: callback,
				elem: elem,
				options: options
			};
			Touchable.globalGestures.strikethrough.registered.push(register);

			callback.removeListeners = function() {
				_.erase(Touchable.globalGestures.strikethrough.registered,register);
			};
			return false;
		}
	module.exports = strikethrough;
},{"../basic":2}],17:[function(require,module,exports){
var Touchable = require('../basic');
	var swipe = function(callback,element,options) {
			var events = {
				touchend: function(evt) {
					var swipe = false, trend = evt.touch.getTrendDirection(500),ratio = (trend.y !== 0 ? Math.abs(trend.x/trend.y) : 2);
					if (__.Math.getLength(trend) < 10 || ratio < 1.1 && ratio > 0.9) {
						swipe = false;
					} else {
						if (__.Math.getLength(trend) > 5) {
							if (Math.abs(trend.x) > Math.abs(trend.y)) {
								swipe = (trend.x > 0 ? 'right' : 'left');
							} else {
								swipe = (trend.y > 0 ? 'down' : 'up');
							}
						} else {

						}
					}
					if (swipe)
						callback(evt,swipe);
				}
			};
			return events;
		}
	module.exports = swipe;
},{"../basic":2}],18:[function(require,module,exports){
var Touchable = require('../basic');
	var transrotoscale = function(callback,element,options) {
			//options.onlyIf = options.onlyIf || function() {return true;};
			options.progress = options.progress || function() {};
			options.minTouches = options.minTouches || 1;
			callback.start = callback.start || function() {};
			callback.perform = callback.perform || function() {};
			callback.end = callback.end || function() {};
			var offset = false;
			var noTouches = 0;
			var multitouch = false;
			var domElement = element.element;
			var touchedElement = element;

			var startProperties = __.Element.getTransformStyle(domElement);

			/*
			var deg = 0;
			if (domElement.id =="c") {
				setInterval(function() {
					__.Element.setTransformStyle(domElement,{
						rotateZ: deg+=15
					});
				},50);
			}
			*/

			if (domElement.tagName == "IMG") {
				if (__.Element.ccss(domElement,"position") == "static") {
					domElement.style.position = "relative";
				}
				__.Element.addListener(domElement,"load", function() {
					startProperties = __.Element.getTransformStyle(domElement);

					offset = false;
					__.Element.store(domElement,"transformStyleMatrixDirty",true);
					__.Element.store(domElement,"transformStyleMatrixOriginDirty",true);

					var size = __.Element.innerSize(domElement,true);
					domElement.style.width = size.innerWidth+"px";
					domElement.style.height = size.innerHeight+"px";
				});

				/*
				var eleWidth = parseFloat(__.Element.ccss(domElement,"width"));
				var eleHeight = parseFloat(__.Element.ccss(domElement,"height"));
				domElement.style.width = eleWidth+"px";
				domElement.style.height = eleHeight+"px";
				*/
				//console.log("OH YEAH");
				//WHAT ABOUT BOX SIZING?
				//element.style.width = element
			}

			var startCenter;

			var events = {
				touchstart: function(evt) {
					var touches = touchedElement.getTouches();
					if (touches.length === 0) return;
					//onlyIf = options.onlyIf();
					//if (!onlyIf) return;
					if (touches.length == 1) {
						__.Element.setTransitionDuration(domElement,"all",0);
						//BRING ELEMENT TO FRONT

						if (false && Modernizr.csstransforms3d) {
							/*
							__.Element.setTransformStyle(domElement,{
								translateZ: ++Touchable.highestZ
							});
							*/
						} else {
							Touchable.highestZ = Math.max(parseInt(domElement.style.zIndex,10) || 100,Touchable.highestZ);
							domElement.style.zIndex = ++Touchable.highestZ;
						}

						startProperties = __.Element.getTransformStyle(domElement);

						options.progress(true);
						callback.start(evt);

					}

					if (!offset) {
						touchA = touches[0].getRelativeCoordinates(domElement.parentNode);
						offset = __.Element.relativePosition(domElement);

						var eleWidth = parseFloat(__.Element.ccss(domElement,"width"));
						var eleHeight = parseFloat(__.Element.ccss(domElement,"height"));

						var paddingLeft = parseFloat(__.Element.ccss(domElement,"paddingLeft"));
						var paddingRight = parseFloat(__.Element.ccss(domElement,"paddingRight"));
						var paddingTop = parseFloat(__.Element.ccss(domElement,"paddingTop"));
						var paddingBottom = parseFloat(__.Element.ccss(domElement,"paddingBottom"));

						var borderLeft = parseFloat(__.Element.ccss(domElement,"borderLeft"));
						var borderRight = parseFloat(__.Element.ccss(domElement,"borderRight"));
						var borderTop = parseFloat(__.Element.ccss(domElement,"borderTop"));
						var borderBottom = parseFloat(__.Element.ccss(domElement,"borderBottom"));

						eleWidth+=paddingLeft+paddingRight;
						eleHeight+=paddingTop+paddingBottom;

						//TODO CHECK TO REPLACE WITH, WHAT ABOUT PADDING?
						/*
						var size = __.Element.innerSize(domElement);
						eleWidth = size.x;
						eleHeight = size.y;
						*/

						offset.x+=borderLeft+eleWidth*0.5;
						offset.y+=borderTop+eleHeight*0.5;
					}

					if (noTouches != touches.length) {
						startProperties = __.Element.getTransformStyle(domElement);
						touches.forEach(function(touch) {
							touch.resetDelta();
						});
						noTouches = touches.length;
					}

					startCenter = {
						x: startProperties.translateX + offset.x,
						y: startProperties.translateY + offset.y
					};
					if (Touchable.options.doTouchesIndicators) {
					var blub = document.getElementById("centerIndicator");
					if (blub) {
						__.Element.setTransformStyle(blub,{
							translateX: startCenter.x,
							translateY: startCenter.y
						});
						domElement.parentNode.appendChild(blub);
					}
				}


					evt.preventDefault();
				},
				touchmove: function(evt) {
					//USE CACHED ONLYIF FROM TOUCHSTART TO IMPROVE PERFORMANCE
					//if (!onlyIf) return;
					var touches = touchedElement.getTouches();

					var touchA,touchB,obj = {};
					if (touches.length == 1) {
						touchA = touches[0].getRelativeCoordinates(domElement.parentNode);

						var delta = touchA.delta;
						//ACCOUNT FOR PARENT TRANSFORMS ONLY WORKS WHILE PARENT ATTRIBUTES ARE NOT CHANGED DURING PERFORM!! (PERFRAMCE ISSUES)
						obj = {
							translateX: startProperties.translateX + (options.fixedX ? 0 : delta.x),
							translateY: startProperties.translateY + (options.fixedY ? 0 : delta.y)
						};
					}



					if (touches.length > 1) {
						startCenter = {
							x: startProperties.translateX + offset.x,
							y: startProperties.translateY + offset.y
						};

						touchA = touches[0].getRelativeCoordinates(domElement.parentNode);
						touchB = touches[1].getRelativeCoordinates(domElement.parentNode);

						/*
						console.log(JSON.stringify([touchA.startCoordinates,
													touchB.startCoordinates,
													startCenter,
													touchA.coordinates,
													touchB.coordinates]));
						*/


						var triangle = __.Math.estimateTriangle(touchA.startCoordinates,
																touchB.startCoordinates,
																startCenter,
																touchA.coordinates,
																touchB.coordinates);



						/*
						[{"x":395.8079182168939,"y":209.79825022501575,"z":0},{"x":398.63634534164,"y":7.565710805663173,"z":0},{"x":201,"y":105.5},{"x":396.51502499808043,"y":209.0911434438292,"z":0},{"x":397.9292385604534,"y":8.272817586849726,"z":0}]
						[{"x":402.17187924757275,"y":5.444390462103513,"z":0},{"x":399.34345212282653,"y":207.67692988145612,"z":0},{"x":401,"y":105.5},{"x":401.4647724663862,"y":6.151497243290066,"z":0},{"x":400.0505589040131,"y":206.96982310026956,"z":0}]
						[{"x":541.4719151413226,"y":-132.44143186927326,"z":0},{"x":542.1790219225092,"y":69.08400076889279,"z":0},{"x":401,"y":105.5},{"x":540.764808360136,"y":-131.7343250880867,"z":0},{"x":542.8861287036957,"y":68.37689398770624,"z":0}]


						[{"x":400.0505589040131,"y":3.3230701185438534,"z":0},{"x":391.56527752977456,"y":204.14139597552335,"z":0},{"x":401,"y":105.5},{"x":399.34345212282653,"y":2.615963337357357,"z":0},{"x":390.858170748588,"y":203.4342891943368,"z":0}]
						[{"x":399.34345212282653,"y":209.09114344382922,"z":0},{"x":401.4647724663862,"y":6.151497243290066,"z":0},{"x":389.09000000000003,"y":607.546},{"x":400.0505589040131,"y":208.38403666264267,"z":0},{"x":400.0505589040131,"y":7.565710805663173,"z":0}]

						*/
						obj = {
							translateX: triangle.center.x - offset.x,
							translateY: triangle.center.y - offset.y,
							rotateZ: startProperties.rotateZ + __.Math.toDegrees(triangle.angle)
						};

						obj.scaleX = obj.scaleY = startProperties.scaleX * triangle.scale;
					}

					if (touches.length > 0) {
						obj.translateX = (options.fixedX || options.onlyPinch) ? startProperties.translateX : obj.translateX;
						obj.translateY = (options.fixedY || options.onlyPinch) ? startProperties.translateY : obj.translateY;
					}


					if (!options.noTransformSet) {
						__.Element.setTransformStyle(domElement,obj);
					}
					callback.perform(evt,obj);
					return true;

				},
				touchend: function(evt) {
					options.progress(false);

					//ONLY NEEDED FOR DRAG AND DROP, DISABLED FOR NOW
					//__.Element.store(domElement,"absoluteCenter",__.Element.getNestedCenter(domElement));

					callback.end(evt);


					var touches = touchedElement.getTouches();
					if (noTouches != touches.length) {
						startProperties = __.Element.getTransformStyle(domElement);
						touches.forEach(function(touch) {
							if (touch != evt.touch) {
								touch.resetDelta();
							}
						});
						noTouches = touches.length;
					}


				}
			};




			__.Element.setTransformStyle(domElement,{});
			options.maxNoOfTouches = 2;
			options.captureOutside = true;
			element.addMultiTouch(events, options);


			callback.removeListeners = function() {
				events.removeListeners();
			};
			return false;
		};
	module.exports = transrotoscale;
},{"../basic":2}],19:[function(require,module,exports){
	var Touchable = require('../basic');
	var rotoscale = function(callback,element,options) {
		options.onlyPinch = true;
		var events = Touchable.relayGesture('transrotoscale',callback,element,options);
		return events;
	};
	module.exports = rotoscale;
},{"../basic":2}],21:[function(require,module,exports){
(function(global){;(function(window) {
	var lodash = {
		include: function(arr,elem) {
			if (!_.contains(arr,elem))
				arr.push(elem);

			return arr;
		},
		erase: function(arr,value) {
			var index = arr.indexOf(value);
			if (index > -1) {
				arr.splice(index, 1);
			}
			return arr;
		},

		isArray: Array.isArray || function(value) {
			return value ? (typeof value == 'object' && Object.prototype.toString.call(value) == "[object Array]") : false;
		},
		isObject: function(value) {
			var objectType = typeof value;
			return !!(value && (objectType == "function" || objectType == "object"));
		},
		last: function(arr) {
			return arr[arr.length - 1];
		},
		contains: function(arr,elem) {
			return arr.indexOf(elem) != -1;
		},
		forOwn: function(object,callback) {
			for (var key in object) {
				if (object.hasOwnProperty(key)) {
					callback(object[key],key);
				}
			}
		},
		merge: function(target, source) {
			lodash.forOwn(source, function(val,key) {
				target[key] = val;
			});
		},
		delay: function(fn,delay) {
			return setTimeout(fn,delay);
		},
		clone: function(object) {
			var clone = {};
			lodash.merge(clone,object);
			return clone;
		}
	}
	module.exports = global._ = lodash;
}(this));

})(window)
},{}],22:[function(require,module,exports){
(function(global){;
//DUMMY CONSOLE
(function (con) {
	'use strict';
	var prop, method;
	var empty = {};
	var dummy = function() {};
	var properties = 'memory'.split(',');
	var methods = ('assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn').split(',');
	while (prop = properties.pop()) con[prop] = con[prop] || empty;
	while (method = methods.pop()) con[method] = con[method] || dummy;
})(window.console = window.console || {});


//VERY SIMPLE WRAPPER TO ALLOW THINGS LIKE
/*
	var MyClass = new Class({
		initialize: function() {
		}
	})
*/
window.Class  = function() {var instance = function() {this.initialize.apply(this, arguments);};return instance;};

/*REQUEST ANIMATION FRAME */
(function() {
	var lastTime = 0;
	var vendors = ['webkit', 'moz','o','ms'];
	for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
		window.cancelAnimationFrame =
		window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() { callback(currTime + timeToCall); },
			timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};

	if (!window.cancelAnimationFrame)
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
}());

var __ = {
	"Element": {},
	"Math": {}
};

module.exports = global.__ = __;
})(window)
},{}],27:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],25:[function(require,module,exports){
(function(process){// https://github.com/caolan/async

/*global setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root = this,
        previous_async = root.async;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    else {
        root.async = async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    //// cross-browser compatiblity functions ////

    var _forEach = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _forEach(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _forEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        async.nextTick = function (fn) {
            setTimeout(fn, 0);
        };
    }
    else {
        async.nextTick = process.nextTick;
    }

    async.forEach = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _forEach(arr, function (x) {
            iterator(x, function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed === arr.length) {
                        callback(null);
                    }
                }
            });
        });
    };

    async.forEachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed === arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };

    async.forEachLimit = function (arr, limit, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length || limit <= 0) {
            return callback();
        }
        var completed = 0;
        var started = 0;
        var running = 0;

        (function replenish () {
            if (completed === arr.length) {
                return callback();
            }

            while (running < limit && started < arr.length) {
                started += 1;
                running += 1;
                iterator(arr[started - 1], function (err) {
                    if (err) {
                        callback(err);
                        callback = function () {};
                    }
                    else {
                        completed += 1;
                        running -= 1;
                        if (completed === arr.length) {
                            callback();
                        }
                        else {
                            replenish();
                        }
                    }
                });
            }
        })();
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.forEach].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.forEachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);


    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.forEachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.forEach(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.forEach(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _forEach(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _forEach(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                if (err) {
                    callback(err);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    taskComplete();
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.nextTick(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    async.parallel = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.forEach(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.forEachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.queue = function (worker, concurrency) {
        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _forEach(data, function(task) {
                    q.tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (q.saturated && q.tasks.length == concurrency) {
                        q.saturated();
                    }
                    async.nextTick(q.process);
                });
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if(q.empty && q.tasks.length == 0) q.empty();
                    workers += 1;
                    worker(task.data, function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if(q.drain && q.tasks.length + workers == 0) q.drain();
                        q.process();
                    });
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _forEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    window.async = async;

}());
})(require("__browserify_process"))
},{"__browserify_process":27}],26:[function(require,module,exports){
;

window.Modernizr = (function() {
	var mod = 'modernizr',
	modElem = document.createElement(mod),mStyle = modElem.style,prefixes = ' -webkit- -moz- -o- -ms- '.split(' '),


		docElement = document.documentElement,

		omPrefixes = 'Webkit Moz O ms',

		cssomPrefixes = omPrefixes.split(' '),

		domPrefixes = omPrefixes.toLowerCase().split(' '),_hasOwnProperty = ({}).hasOwnProperty, hasOwnProp;

		if ( !is(_hasOwnProperty, 'undefined') && !is(_hasOwnProperty.call, 'undefined') ) {
			hasOwnProp = function (object, property) {
				return _hasOwnProperty.call(object, property);
			};
		}
		else {
			hasOwnProp = function (object, property) {
				return ((property in object) && is(object.constructor.prototype[property], 'undefined'));
			};
		}injectElementWithStyles = function( rule, callback, nodes, testnames ) {

			var style, ret, node, docOverflow,
					div = document.createElement('div'),
								body = document.body,
								fakeBody = body || document.createElement('body');

			if ( parseInt(nodes, 10) ) {
											while ( nodes-- ) {
							node = document.createElement('div');
							node.id = testnames ? testnames[nodes] : mod + (nodes + 1);
							div.appendChild(node);
					}
			}

								style = ['&#173;','<style id="s', mod, '">', rule, '</style>'].join('');
			div.id = mod;
					(body ? div : fakeBody).innerHTML += style;
			fakeBody.appendChild(div);
			if ( !body ) {
								fakeBody.style.background = '';
								fakeBody.style.overflow = 'hidden';
					docOverflow = docElement.style.overflow;
					docElement.style.overflow = 'hidden';
					docElement.appendChild(fakeBody);
			}

			ret = callback(div, rule);
				if ( !body ) {
					fakeBody.parentNode.removeChild(fakeBody);
					docElement.style.overflow = docOverflow;
			} else {
					div.parentNode.removeChild(div);
			}

			return !!ret;

		};


	function is( obj, type ) {
				return typeof obj === type;
		}

		function contains( str, substr ) {
				return !!~('' + str).indexOf(substr);
		}

		function testProps( props, prefixed ) {
				for ( var i in props ) {
						var prop = props[i];
						if ( !contains(prop, "-") && mStyle[prop] !== undefined ) {
								return prefixed == 'pfx' ? prop : true;
						}
				}
				return false;
		}

		function testDOMProps( props, obj, elem ) {
				for ( var i in props ) {
						var item = obj[props[i]];
						if ( item !== undefined) {

														if (elem === false) return props[i];

														if (is(item, 'function')){
																return item.bind(elem || obj);
								}

														return item;
						}
				}
				return false;
		}

		function testPropsAll( prop, prefixed, elem ) {

				var ucProp  = prop.charAt(0).toUpperCase() + prop.slice(1),
						props   = (prop + ' ' + cssomPrefixes.join(ucProp + ' ') + ucProp).split(' ');

						if(is(prefixed, "string") || is(prefixed, "undefined")) {
					return testProps(props, prefixed);

						} else {
					props = (prop + ' ' + (domPrefixes).join(ucProp + ' ') + ucProp).split(' ');
					return testDOMProps(props, prefixed, elem);
				}
		}


	var tests = {};
tests['csstransforms'] = function() {
				return !!testPropsAll('transform');
		};


		tests['csstransforms3d'] = function() {

				var ret = !!testPropsAll('perspective');

												if ( ret && 'webkitPerspective' in docElement.style ) {

											injectElementWithStyles('@media (transform-3d),(-webkit-transform-3d){#modernizr{left:9px;position:absolute;height:3px;}}', function( node, rule ) {
						ret = node.offsetLeft === 9 && node.offsetHeight === 3;
					});
				}
				return ret;
		};

tests['draganddrop'] = function() {
				var div = document.createElement('div');
				return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
		};

tests['audio'] = function() {
				var elem = document.createElement('audio'),
						bool = false;

				try {
						if ( bool = !!elem.canPlayType ) {
								bool      = new Boolean(bool);
								bool.ogg  = elem.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,'');
								bool.mp3  = elem.canPlayType('audio/mpeg;')               .replace(/^no$/,'');

																										bool.wav  = elem.canPlayType('audio/wav; codecs="1"')     .replace(/^no$/,'');
								bool.m4a  = ( elem.canPlayType('audio/x-m4a;')            ||
															elem.canPlayType('audio/aac;'))             .replace(/^no$/,'');
						}
				} catch(e) { }

				return bool;
		};

				tests['touch'] = function() {
				var bool;

				if(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
					bool = true;
				} else {
					injectElementWithStyles(['@media (',prefixes.join('touch-enabled),('),mod,')','{#modernizr{top:9px;position:absolute}}'].join(''), function( node ) {
						bool = node.offsetTop === 9;
					});
				}

				return bool;
		};

tests['csstransitions'] = function() {
				return testPropsAll('transition');
		};

		tests["pointerevents"] = function(){var a=document.createElement("x");a.style.cssText="pointer-events:auto";return a.style.pointerEvents==="auto"};

	var Modernizr = {};

	for (var feature in tests) {
		if (hasOwnProp(tests, feature)) {
			featureName  = feature.toLowerCase();
			Modernizr[featureName] = tests[feature]();
		}
	}

	return Modernizr;
})();
},{}],23:[function(require,module,exports){
var __ = require('./basic');
var MathExt = {

	isPointInPath:  function(pt,poly){
		for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i) {
			((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y)) && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) && (c = !c);
		}
		return c;
	},

	/*
	fastRound:  function(value) {
		return ~~ (value + (value > 0 ? 0.5 : -0.5));
	},

	lerp:  function(n,a,b,x,y) {
		n = __.Math.limitTo(n,a,b);
		return x+((n-a)/(b-a))*(y-x);
	},

		HSVtoRGB:  function(h,s,v) {
			var r, g, b;

				var i = Math.floor(h * 6);
				var f = h * 6 - i;
				var p = v * (1 - s);
				var q = v * (1 - f * s);
				var t = v * (1 - (1 - f) * s);

				switch(i % 6){
					case 0: r = v, g = t, b = p; break;
					case 1: r = q, g = v, b = p; break;
					case 2: r = p, g = v, b = t; break;
					case 3: r = p, g = q, b = v; break;
					case 4: r = t, g = p, b = v; break;
					case 5: r = v, g = p, b = q; break;
				}

				return [Math.round(r * 255), Math.round(g * 255),Math.round(b * 255)];

		},

		toFloat:  function(s) {
			return s-0;
		},
		*/

		getUUID:  (function() {
			var running = 0;
			return function() {
				return (new Date()).getTime() + "-" + (++running);
			};
		})(),

		RADIANT:  Math.PI/180,
		RADIAN:  180/Math.PI,

		toDegrees:  function(rad) {
			return rad*__.Math.RADIAN;
		},

		toRadians:  function(deg) {
			return deg*__.Math.RADIANT;
		},

		add_: function(a,b) {
			a.x+=b.x;
			a.y+=b.y;
			return a;
		},

		add:  function(a,b) {
			return {x: a.x + b.x, y: a.y + b.y};
		},

		/*
		clone:  function(a) {
			return {
				x:a.x,
				y:a.y
			};
		},
		*/


		//GET TRIANGLE WITH POINTS A,B,C AND NEW TRIANGLE WITH AS,BS CALCULATE CS
		estimateTriangle:  function(A,B,C,AS,BS) {
			var deltaAB = __.Math.delta(A,B);
			var deltaAC = __.Math.delta(A,C);
			var deltaASBS = __.Math.delta(AS,BS);

			var scale = __.Math.getLength(deltaASBS) / __.Math.getLength(deltaAB);
			var angle = __.Math.getSignedAngleBetween(deltaAB,deltaASBS);

			var deltaASCS = __.Math.setLength(__.Math.rotate(deltaASBS,__.Math.getSignedAngleBetween(deltaAB,deltaAC)),__.Math.getLength(deltaAC)*scale);
			var CS = __.Math.add(AS,deltaASCS);
			return {
				center: CS,
				scale: scale,
				angle: angle
			};
		},

		ccw: function(A,B,C) {
			return (C.y-A.y)*(B.x-A.x) > (B.y-A.y)*(C.x-A.x);
		},

		intersectLineSegments:  function(A,B,C,D) {
			return (__.Math.ccw(A,C,D) != __.Math.ccw(B,C,D)) && (__.Math.ccw(A,B,C) != __.Math.ccw(A,B,D));
		},
/*

		intersectLines:  function(a1,a2,b1,b2) {
			// a1 == b1
			if(a1.x==b1.x && a1.y==b1.y)  {
				return a1;
			}
			var a = __.Math.delta(a1,a2);
			var b = __.Math.delta(b1,b2);
			// if both lines are collinear change a to point
			if (a.x*b.y==b.x*a.y) {
				a2=a1;
				a = __.Math.delta(a1,a2);
				b = __.Math.delta(b1,b2);
			}
			// a1,a2 is a point and b1,b2 is a line
			if((a.x===0 && a.y===0) && (b.x!==0 || b.y!==0)){
				if (b.x*(a1.y-b1.y) != b.y*(a1.x-b1.x)) return false;
				else return a1;
			}
			// a1,a2 is a line and b1,b2 is a point
			if((a.x!==0 || a.y!==0) && (b.x===0 && b.y===0)){
				if (a.x*(b1.y-a1.y) != a.y*(b1.x-a1.x)) return false;
				else return b1;
			}
			var l = (b.x*(a1.y-b1.y) + b.y*(b1.x-a1.x)) / (a.x*b.y - b.x*a.y);
			if (isNaN(l) || !isFinite(l)) return false;
			return {
				x: l*a.x+a1.x,
				y: l*a.y+a1.y
			};
		},
*/
		intersectPoly:  function(a1,a2,corners){
			for (var i=1; i< corners.length; i++){
				if (__.Math.intersectLineSegments(a1,a2,corners[i-1],corners[i])) return true;
			}
			return false;
		},

		/*
		limit:  function(a,l) {
			var b = {x:a.x,y:a.y};
			if (l.x[0] !== false) b.x = Math.max(b.x,l.x[0]);
			if (l.x[1] !== false) b.x = Math.min(b.x,l.x[1]);
			if (l.y[0] !== false) b.y = Math.max(b.y,l.y[0]);
			if (l.y[1] !== false) b.y = Math.min(b.y,l.y[1]);
			return b;
		},
		*/
		delta:  function(a,b) {
			return {x: b.x - a.x, y: b.y - a.y};
		},
		getLength:  function(a) {
			return Math.sqrt(a.x*a.x + a.y*a.y);
		},
		setLength:  function(v,l) {
			var scale = l/__.Math.getLength(v);
			return {
				x: v.x*scale,
				y: v.y*scale
			};
		},
		distance:  function(a,b) {
			return __.Math.getLength({x: b.x - a.x, y: b.y - a.y});
		},
		between:  function(a,b,n) {
			n = (n === undefined ? 0.5 : n);
			return __.Math.add(a,__.Math.scale_(__.Math.delta(a,b),n));
		},

		limitTo:  function(n,a,b) {
			return Math.min(Math.max(n,a),b);
		},
/*
		getDirection:  function(a,b) {
			return __.Math.setLength_(Math.delta(a,b),1);
		},
		sub:  function(a,b) {
			return {x: a.x - b.x, y: a.y - b.y};
		},

		perpendicular:  function(a) {
			return {x: -a.y, y: a.x};
		},




		distanceSquared:  function(a,b) {
			var delta = __.Math.delta(a,b);
			return delta.x*delta.x + delta.y*delta.y;
		},



		setLength_:  function(v,l) {
			var scale = l/__.Math.getLength(v);
			v.x*=scale;
			v.y*=scale;
			return v;
		},

		*/
		/*
		normalize:  function(v) {
			var l = __.Math.getLength(v);
			if (l !== 0) {
				return {
					x: v.x/l,
					y: v.y/l
				};
			} else {
				console.log("CANT NORMALIZE VECTOR WITH LENGTH 0");
				return {
					x: NaN,
					y: NaN
				};
			}
		},
		*/
		sgn:  function(i) {
			if (i > 0) return 1;
			if (i < 0) return -1;
			return 0;
		},
		getDistance:  function(a,b) {
			return __.Math.getLength(__.Math.delta(a,b));
		},
		dot:  function(a,b) {
			return (a.x*b.x + a.y*b.y);
		},
		cross:  function(a,b) {
			return (a.x*b.y - b.x*a.y);
		},
		roundByN:  function(x,n) {
			console.log("ROUNDBYN is depreciated, USE Math.roundBy instead");
			return __.Math.roundBy(x,n);
		},

		scale_:  function(a,m) {
			if (m.x !== undefined) {
				a.x*=m.x;
				a.y*=m.y;
			} else {
				a.x*=m;a.y*=m;

			}
			return a;
		},

		scale:  function(a,m) {
			if (m.x !== undefined) {
				return {x:a.x*m.x,y:a.y*m.y};
			} else {
				return {x:a.x*m,y:a.y*m};
			}
		},
		/*
		center:  function(arr) {
			var center = {x:0,y:0};
			arr.each(function(pos) {
				__.Math.add_(center,pos);
			});
			center.x/=arr.length;center.y/=arr.length;
			return center;
		},
		*/
		/*
		getAngleInDeg:  function(a) {
			return __.Math.getAngle(a)/Math.PI*180;
		},
		*/
		getAngle:  function(a) {
			var angle = Math.atan2(a.y,a.x);
			if (angle < 0) angle+=Math.PI*2;
			return angle;
		},

		getSignedAngleBetween:  function(a,b) {
			var angle = __.Math.getAngle(b) - __.Math.getAngle(a);
			if (angle > Math.PI) angle-=2*Math.PI;
			else if (angle <= -Math.PI) angle+=2*Math.PI;
			return angle;
		},
		/*
		getAngleBetween:  function(a,b) {
			var angle = __.Math.getAngle(b) - __.Math.getAngle(a);
			if (angle < 0) angle+=Math.PI*2;
			return angle;
		},
		*/


		getAngleToX:  function(a) {
			return Math.atan2(a.y,a.x);
		},
		/*
		rotate_:  function(a, phi) {
			var x = a.x, y = a.y;
			var c = Math.cos(phi), s = Math.sin(phi);
			a.x = c*x - s*y;
			a.y = s*x + c*y;
			return a;
		},
		*/

		rotateAround:  function(a,center,phi) {
			return __.Math.add(center,__.Math.rotate(__.Math.delta(center,a),phi));
		},


		rotate:  function(a, phi) {
			var c = Math.cos(phi), s = Math.sin(phi);
			return {
				x: c*a.x - s*a.y,
				y: s*a.x + c*a.y
			};
		},
		/*
		randomLimit:  function(from,to) {
			return Math.random()*(to-from)+from;
		},
		randomN:  function(mean,sd) {
			mean = mean || 0;
			sd = sd || 1;
			var z = (Math.random()*2-1)+(Math.random()*2-1)+(Math.random()*2-1);
			return z*sd+mean;
		},

		roundBy:  function(f, digits) {
			if ($.type(f) == 'array') {
				return f.map(function(sf) {
					return Math.roundBy(sf,digits);
				});
			} else {
				var p = 1;
				while(digits-- > 0) {p*=10;}
				return (f*p|0)/p;
			}
		},
		*/

		eps:  function(f, eps) {
			eps = eps || 0.0001;
			if (Math.abs(f) < eps) {
				return 0;
			} else return f;
		}


/*
testgetQuadToQuadTransform:  function() {
	var result = __.Math.getQuadToQuadTransform(	[[0,1],[1,1],[1,0],[0,0]],
												[[0,1],[1,1],[1,0],[0,0]]);
	var m = $M(result);
	var p = $V([0,1,1]);
	console.log(m,p);
	console.log(m.x(p));

},

			getQuadToQuadTransform:  function(quadA,quadB) {

				var BAD_MAP = -1;
				var GOOD_MAP = 1;

				// 3x3 matrix manipulation routines

				// multiply matrix: c = a * b
				function multiplyMatrix(a,b,c) {
					c[0][0] = a[0][0]*b[0][0] + a[0][1]*b[1][0] + a[0][2]*b[2][0];
					c[0][1] = a[0][0]*b[0][1] + a[0][1]*b[1][1] + a[0][2]*b[2][1];
					c[0][2] = a[0][0]*b[0][2] + a[0][1]*b[1][2] + a[0][2]*b[2][2];
					c[1][0] = a[1][0]*b[0][0] + a[1][1]*b[1][0] + a[1][2]*b[2][0];
					c[1][1] = a[1][0]*b[0][1] + a[1][1]*b[1][1] + a[1][2]*b[2][1];
					c[1][2] = a[1][0]*b[0][2] + a[1][1]*b[1][2] + a[1][2]*b[2][2];
					c[2][0] = a[2][0]*b[0][0] + a[2][1]*b[1][0] + a[2][2]*b[2][0];
					c[2][1] = a[2][0]*b[0][1] + a[2][1]*b[1][1] + a[2][2]*b[2][1];
					c[2][2] = a[2][0]*b[0][2] + a[2][1]*b[1][2] + a[2][2]*b[2][2];
				}

				// transform point p by matrix a: q = p*a
				function transformMatrix(p, q, a) {
					q[0] = p[0]*a[0][0] + p[1]*a[1][0] + p[2]*a[2][0];
					q[1] = p[0]*a[0][1] + p[1]*a[1][1] + p[2]*a[2][1];
					q[2] = p[0]*a[0][2] + p[1]*a[1][2] + p[2]*a[2][2];
				}

				// determinant of a 2x2 matrix
				function det2(a,  b,  c,  d) {
					return( a*d - b*c);
				}

				// adjoint matrix: b = adjoint(a); returns determinant(a)
				function adjointMatrix( a,  b) {
					b[0][0] = det2(a[1][1], a[1][2], a[2][1], a[2][2]);
					b[1][0] = det2(a[1][2], a[1][0], a[2][2], a[2][0]);
					b[2][0] = det2(a[1][0], a[1][1], a[2][0], a[2][1]);
					b[0][1] = det2(a[2][1], a[2][2], a[0][1], a[0][2]);
					b[1][1] = det2(a[2][2], a[2][0], a[0][2], a[0][0]);
					b[2][1] = det2(a[2][0], a[2][1], a[0][0], a[0][1]);
					b[0][2] = det2(a[0][1], a[0][2], a[1][1], a[1][2]);
					b[1][2] = det2(a[0][2], a[0][0], a[1][2], a[1][0]);
					b[2][2] = det2(a[0][0], a[0][1], a[1][0], a[1][1]);
					return a[0][0]*b[0][0] + a[0][1]*b[0][1] + a[0][2]*b[0][2];
				}

				function ZERO(x) {
					return x < 1e-13 || x >-1e13;
				}

				// calculate matrix for unit square to quad mapping
				function mapSquareToQuad( quad,  // vertices of quadrilateral
									SQ)    // square->quad transform
				{
					var px, py;

					px = quad[0][0]-quad[1][0]+quad[2][0]-quad[3][0];
					py = quad[0][1]-quad[1][1]+quad[2][1]-quad[3][1];

					if (ZERO(px) && ZERO(py))
					{
						SQ[0][0] = quad[1][0]-quad[0][0];
						SQ[1][0] = quad[2][0]-quad[1][0];
						SQ[2][0] = quad[0][0];
						SQ[0][1] = quad[1][1]-quad[0][1];
						SQ[1][1] = quad[2][1]-quad[1][1];
						SQ[2][1] = quad[0][1];
						SQ[0][2] = 0.0;
						SQ[1][2] = 0.0;
						SQ[2][2] = 1.0;
						return GOOD_MAP;
					}
					else
					{
						var dx1, dx2, dy1, dy2, del;

						dx1 = quad[1][0]-quad[2][0];
						dx2 = quad[3][0]-quad[2][0];
						dy1 = quad[1][1]-quad[2][1];
						dy2 = quad[3][1]-quad[2][1];

						del = det2(dx1,dx2, dy1,dy2);

						if (del===0) return BAD_MAP;

						SQ[0][2] = det2(px,dx2, py,dy2)/del;
						SQ[1][2] = det2(dx1,px, dy1,py)/del;
						SQ[2][2] = 1.0;
						SQ[0][0] = quad[1][0]-quad[0][0]+SQ[0][2]*quad[1][0];
						SQ[1][0] = quad[3][0]-quad[0][0]+SQ[1][2]*quad[3][0];
						SQ[2][0] = quad[0][0];
						SQ[0][1] = quad[1][1]-quad[0][1]+SQ[0][2]*quad[1][1];
						SQ[1][1] = quad[3][1]-quad[0][1]+SQ[1][2]*quad[3][1];
						SQ[2][1] = quad[0][1];

						return GOOD_MAP;
					}
				}

				// calculate matrix for general quad to quad mapping
				function mapQuadToQuad(  inq,    // starting quad
									out,   // target quad
									ST)    // the matrix (returned)
				{
					var quad = [[0,0],[0,0],[0,0],[0,0]];
					var MS = [[0,0,0],[0,0,0],[0,0,0]];
					var SM = [[0,0,0],[0,0,0],[0,0,0]];
					var MT = [[0,0,0],[0,0,0],[0,0,0]];

					var result;

					quad[0][0] = inq[0][0]; quad[0][1] = inq[0][1];
					quad[1][0] = inq[1][0]; quad[1][1] = inq[1][1];
					quad[2][0] = inq[2][0]; quad[2][1] = inq[2][1];
					quad[3][0] = inq[3][0]; quad[3][1] = inq[3][1];
					result = mapSquareToQuad(quad, MS);
					adjointMatrix(MS, SM);

					quad[0][0] = out[0][0] ; quad[0][1] = out[0][1] ;
					quad[1][0] = out[1][0] ; quad[1][1] = out[1][1] ;
					quad[2][0] = out[2][0] ; quad[2][1] = out[2][1] ;
					quad[3][0] = out[3][0] ; quad[3][1] = out[3][1] ;
					result = mapSquareToQuad(quad, MT);

					if(result == BAD_MAP) return result;
					multiplyMatrix(SM, MT, ST);
					return result;
				}


				var result = [[0,0,0],[0,0,0],[0,0,0]];
				var r = mapQuadToQuad(quadA,quadB,result);
				if (r > 0) return result;
				else return false;

			},


	toHex:  function(n){
		return n.toString(16);
	},

	getConvexHull: (function() {
		function getDistant(cpt, bl) {
			var Vy = bl[1][0] - bl[0][0];
			var Vx = bl[0][1] - bl[1][1];
			return (Vx * (cpt[0] - bl[0][0]) + Vy * (cpt[1] -bl[0][1]));
		}


		function findMostDistantPointFromBaseLine(baseLine, points) {
			var maxD = 0;
			var maxPt = [];
			var newPoints = [];
			for (var idx in points) {
				var pt = points[idx];
				var d = getDistant(pt, baseLine);

				if ( d > 0) {
					newPoints.push(pt);
				} else {
					continue;
				}

				if ( d > maxD ) {
					maxD = d;
					maxPt = pt;
				}

			}
			return {'maxPoint':maxPt, 'newPoints':newPoints};
		}



		var getConvexHull = function(points) {
			//find first baseline
			var maxX, minX;
			var maxPt, minPt;
			for (var idx in points) {
				var pt = points[idx];
				if (pt[0] > maxX || !maxX) {
					maxPt = pt;
					maxX = pt[0];
				}
				if (pt[0] < minX || !minX) {
					minPt = pt;
					minX = pt[0];
				}
			}

			var allBaseLines = [];
			function buildConvexHull(baseLine, points) {

				allBaseLines.push(baseLine);
				var convexHullBaseLines = [];
				var t = findMostDistantPointFromBaseLine(baseLine, points);
				if (t.maxPoint.length) { // if there is still a point "outside" the base line
					convexHullBaseLines =
						convexHullBaseLines.concat(
							buildConvexHull( [baseLine[0],t.maxPoint], t.newPoints)
						);
					convexHullBaseLines =
						convexHullBaseLines.concat(
							buildConvexHull( [t.maxPoint,baseLine[1]], t.newPoints)
						);
					return convexHullBaseLines;
				} else {  // if there is no more point "outside" the base line, the current base line is part of the convex hull
					return [baseLine];
				}
			}

			var ch = [].concat(buildConvexHull([minPt, maxPt], points),
								buildConvexHull([maxPt, minPt], points));
			return ch;
		};

		return getConvexHull;
	}()),
*//*
	limitDimensions:  function(input,limits) {
		var output = {
			width: false,
			height: false
		};

		if (limits.width || limits.height) {
			var ratio = {
				x: limits.width ? limits.width/input.width : 1,
				y: limits.height ? limits.height/input.height : 1
			};

			var minRatio = Math.min(ratio.x,ratio.y);
			output.width = input.width*minRatio;
			output.height = input.height*minRatio;
		}

		if (limits.diagonal) {
			var currentDiagonal,diagonalRatio;

			if (output.width && output.height) {
				currentDiagonal = __.Math.getLength({x:output.width,y:output.height});

				diagonalRatio = currentDiagonal/limits.diagonal;
				if (diagonalRatio > 1) {
					output.width = output.width/diagonalRatio;
					output.height = output.height/diagonalRatio;
				} else {

				}
			}  else {
				currentDiagonal = __.Math.getLength({x:input.width,y:input.height});
				diagonalRatio = currentDiagonal/limits.diagonal;
				if (diagonalRatio > 1) {
					output.width = input.width/diagonalRatio;
					output.height = input.height/diagonalRatio;
				} else {
					output.width = input.width;
					output.height = input.height;
				}
			}

		}
		return output;
	}
	*/
};

__.Math = MathExt;
module.exports = MathExt;
},{"./basic":22}],24:[function(require,module,exports){
	var _ = require('../dep/lodash.shim');
	var __ = require('./basic');
	var CSSMatrix = require('./CSSMatrix.ext');

	var uuid = 0;
	var getIDToElement = function(element) {
		if (!element) {
			console.trace();
			console.log("INVALID ELEMENT FOR getIDToElement",element);
			return;
		}
		var id = element.id;
		if (id) return id;
		id = "unique-id-" + uuid++;
		element.id = id;
		return id;
	};

	var Element = {
		globalEventData: {},
		DataStore: {},
		getId: getIDToElement,
		innerSize: function(elem,force) {
			var size = Element.retrieve(elem,'_innerSize');
			if (!size || force) {
				var outerSize = Element.size(elem,force);
				var paddingX = parseFloat(__.Element.ccss(elem,"paddingLeft")) + parseFloat(__.Element.ccss(elem,"paddingRight"));
				var paddingY = parseFloat(__.Element.ccss(elem,"paddingTop")) + parseFloat(__.Element.ccss(elem,"paddingBottom"));

				var borderX = parseFloat(__.Element.ccss(elem,"borderLeft")) + parseFloat(__.Element.ccss(elem,"borderRight"));
				var borderY = parseFloat(__.Element.ccss(elem,"borderTop")) + parseFloat(__.Element.ccss(elem,"borderBottom"));

				size = {
					innerWidth: outerSize.offsetWidth - (paddingX + borderX),
					innerHeight: outerSize.offsetHeight - (paddingY + borderY)
				};
				size.x = size.offsetWidth = size.innerWidth;
				size.y = size.offsetHeight = size.innerHeight;

				Element.store(elem,'_innerSize',size);
			}
			return size;
		},
		size: function(elem, force) {
			var size = Element.retrieve(elem,'_size');
			if (!size || force) {
				size = {
					offsetWidth: elem.offsetWidth,
					offsetHeight: elem.offsetHeight
				};
				size.x = size.offsetWidth;
				size.y = size.offsetHeight;
				size.offsetLeft = elem.offsetLeft;
				size.offsetTop = elem.offsetTop;

				Element.store(elem,'_size',size);
			}
			return size;
		},
		parents: function(elem) {
			var parents = [];
			var curParent = elem.parentNode;
			var stopNext = false;
			while(curParent) {
				parents.push(curParent);
				if (stopNext) {
					curParent = false;
				} else {
					if (curParent == document.body)
						stopNext = true;
					curParent = curParent.parentNode;
				}
			}
			return parents;
		},
		cachedParents: function(rawElem,force) {
			if (!rawElem || !rawElem.parentNode) return [];
			var parent = rawElem.parentNode;
			var parents = Element.retrieve(rawElem,"_parents");

			if (force || parents === undefined || parents.parent != parent) {
				parents = {
					parents: Element.parents(rawElem),
					parent: parent
				};
				Element.store(rawElem,"_parents",parents);
			}

			//RETURN COPY
			return parents.parents.slice(0);
		},
		relativePosition: function(rawElem) {
			return Element.position(rawElem,false,true);
		},
		absolutePosition: function(rawElem) {
			return Element.position(rawElem,false,false);
		},
		position: function(rawElem,debug,relative) {
			if (relative === undefined) {
				console.log("USE RELATIVEPOSITION OR ABSOLUTEPOSITION");
				return {
					x:0,
					y:0
				};
			}


			var result = {
				x: 0,
				y: 0
			};

			var positionStyle = Element.ccss(rawElem,"position");

			if (debug) {
				console.log(rawElem.id,positionStyle,rawElem.tagName,rawElem.clientLeft,rawElem.clientTop,parent.offsetLeft,rawElem.offsetTop);
			}

			if (positionStyle == "static") {
				result.x+=rawElem.clientLeft;
				result.y+=rawElem.clientTop;
			} else {
				var size = Element.size(rawElem);
				result.x+=size.offsetLeft;
				result.y+=size.offsetTop;
			}

			return result;
		},
		store: function(rawElem,key,value) {
			var id = getIDToElement(rawElem);


			Element.DataStore[id] = Element.DataStore[id] || {};
			Element.DataStore[id][key] = value;
		},
		retrieve: function(rawElem,key, defaultValue) {
				var id = getIDToElement(rawElem);
				Element.DataStore[id] = Element.DataStore[id] || {};
				var value = Element.DataStore[id][key];
				if (value === undefined) {
					value = defaultValue;
					Element.DataStore[id][key] = value;
				}



			return value;
		},

		transformStyleKeys: (function() {
			var style = document.createElement('transformTest').style;


			var checks = {
				'transform': {
					transform: 'transform',
					transition: 'transition',
					transitionDuration: 'transitionDuration',
					transitionTiming: 'transitionTimingFunction',

					transitionEnd: 'transitionEnd',
					origin: 'transformOrigin'
				},
				'OTransform':{
					transform: 'OTransform',
					transition: 'OTransition',
					transitionDuration: 'OTransitionDuration',
					transitionTiming: 'OTransitionTimingFunction',

					transitionEnd: 'oTransitionEnd',
					origin: 'OTransformOrigin'
				},
				'msTransform':{
					transform: 'msTransform',
					transition: 'msTransition',
					transitionDuration: 'msTransitionDuration',
					transitionTiming: 'msTransitionTimingFunction',

					transitionEnd: 'msTransitionEnd',
					origin: 'msTransformOrigin'

				},
				'MozTransform':{
					transform: 'MozTransform',
					transition: 'MozTransition',
					transitionDuration: 'MozTransitionDuration',
					transitionTiming: 'MozTransitionTimingFunction',

					transitionEnd: 'transitionEnd',
					origin: 'MozTransformOrigin'

				},
				'WebkitTransform': {
					transform: 'webkitTransform',
					transition: 'webkitTransition',
					transitionDuration: 'webkitTransitionDuration',
					transitionTiming: 'webkitTransitionTimingFunction',
					transitionEnd: 'webkitTransitionEnd',
					origin: 'webkitTransformOrigin'
				}
			};

			for (var i in checks) {
				if (style[i] !== undefined) {
					return checks[i];
				}
			}
			console.log("PERFORMANCE WARNING,THIS BROWSER HAS NO KNOWN CSS3 TRANSFORM SUPPORT, WILL USE CSS2");
			return checks['transform'];

		})(),

		getTransformStyleMatrix: function(rawElem,current) {

			var dirty = Element.retrieve(rawElem,"transformStyleMatrixDirty");
			var matrix;
			if (!rawElem.transformsMatrix || dirty || current) {
				var key = Element.transformStyleKeys.transform;
				if (!key) {
					console.log("Browser-Engine does not support transform");
					return "";
				}


				var property;
				if (Modernizr.csstransforms) {
					if (current) {


						console.warn("WARNING UNABLE TO USE CURRENT ON GETTRANSFORMSTYLEMATRIX");
						console.trace();
						property = Element.css(rawElem,key);

					} else {
						property = Element.css(rawElem,key);
					}
					property = property || "none";
				}
				matrix = new window.CSSMatrix(property);

				Element.store(rawElem,"transformsMatrix",matrix);
				Element.store(rawElem,"transformStyleMatrixDirty",false);
				return matrix;
			} else {
				return Element.retrieve(rawElem,"transformsMatrix");
			}
			return matrix;
		},
		getTransformStyleMatrixOrigin: function(rawElem,force,origins) {
			origins = false;
			var currentMatrix = Element.retrieve(rawElem,"transformsMatrixOrigin");
			if (force || Element.retrieve(rawElem,"transformStyleMatrixOriginDirty") || !currentMatrix) {



				var transforms = Element.getTransformStyle(rawElem);



				var size = Element.size(rawElem);

				var origin = {
					x: size.offsetWidth/2,
					y: size.offsetHeight/2
				}


				var matrix = currentMatrix ? currentMatrix.identity() : new window.CSSMatrix();
				matrix = matrix.translate(origin.x,origin.y,0);
				matrix = matrix.translate(transforms.translateX,transforms.translateY,0);

				matrix = matrix.rotateAxisAngle(0,0,1,transforms.rotateZ);
				matrix = matrix.scale(transforms.scaleX,transforms.scaleY,1);
				matrix = matrix.translate(-origin.x,-origin.y,0);

				Element.store(rawElem,"transformsMatrixOrigin",matrix);
				Element.store(rawElem,"transformStyleMatrixOriginDirty",false);
				return matrix;
			} else {
				return currentMatrix;
			}
		},

		getNestedTransformStyleMatrix: function(rawElem,debug,offsets) {
			var matrix = new window.CSSMatrix();
			var parents = Element.cachedParents(rawElem).reverse().slice(2).concat(rawElem);



			for(var i=0;i<parents.length;i++) {
				var current = parents[i];
				var currentMatrix = Element.getTransformStyleMatrixOrigin(current,debug);

				if (offsets) {
					var size = Element.size(current);


					if (Element.ccss(current,"position") == "static") {
						var c = new window.CSSMatrix().translate(-size.offsetLeft,-size.offsetTop,0);
						currentMatrix = c.multiply(currentMatrix);
					}

					var trMatrix = new window.CSSMatrix().translate(size.offsetLeft,size.offsetTop,0);
					currentMatrix = trMatrix.multiply(currentMatrix);
				}

				var k1 = parseFloat(Element.ccss(current,"border-left") || 0);
				var k2 = parseFloat(Element.ccss(current,"border-top") || 0);

				var trMatrixA = new window.CSSMatrix().translate(k1,k2,0);
				matrix = matrix.multiply(currentMatrix);
				matrix = matrix.multiply(trMatrixA);
			}

			return matrix;
		},

		getTransformStyle: function(rawElem,useCurrent) {
			var transforms = Element.retrieve(rawElem,'transforms');
			if (!transforms || useCurrent) {
				var matrix = Element.getTransformStyleMatrix(rawElem,useCurrent);
				var oldOrigin = transforms ? transforms.origin : false;
				transforms = window.CSSMatrix.unmatrix(matrix);

				transforms.origin = oldOrigin;
				Element.store(rawElem,"transforms",transforms);
			} else {
			}

			return transforms;
		},

		updateTransitions: function(rawElem) {
			var transitions = Element.retrieve(rawElem,"transitions",{});

			var transitionsStrArray = [];
			_.forOwn(transitions,function(transition) {

				transitionsStrArray.push(transition.what + " " + transition.duration + "ms " + transition.timing);
			});
			var str = transitionsStrArray.join(",");
			Element.setTransitionProperty(rawElem,str);
		},
		addTransition: function(rawElem,what,duration,timing) {
			what = what || all;
			duration = duration !== undefined ? duration : 150;
			timing = timing || "linear";

			var transitions = Element.retrieve(rawElem,"transitions",{});
			transitions[what] = transitions[what] || {};
			transitions[what].duration = duration;
			transitions[what].timing = timing;
			transitions[what].what = what;
			Element.updateTransitions(rawElem);
		},

		getTransitions: function(rawElem) {
			return Element.retrieve(rawElem,"transitions",{});
		},

		getTransitionProperty: function(rawElem) {
			return Element.css(rawElem,Element.transformStyleKeys.transition) || 'none';
		},
		setTransitionProperty: function(rawElem,str) {
			Element.css(rawElem,Element.transformStyleKeys.transition,str);
			return rawElem;
		},

		setTransition: function(rawElem,what,duration,timing) {
			Element.retrieve(rawElem,"transitions",{});
			return Element.addTransition(rawElem,what,duration,timing);
		},
		setTransitionTiming: function(rawElem,what,transition) {
			var t = Element.getTransitions(rawElem)[what];
			if (t) {
				if (t.transition != transition) {
					t.transition = transition;
					Element.updateTransitions(rawElem);
				}
			} else {
				if (what == "all") {
					Element.addTransition(rawElem,what,0,transition);
				} else {
					console.trace();
					console.log(what,"IS NOT A REGISTERED TRANSITION");
				}
			}


			return rawElem;
		},

		setTransitionDuration: function(rawElem,what,duration) {
			var t = Element.getTransitions(rawElem)[what];
			if (t) {
				if (t.duration != duration) {
					t.duration = duration;
					Element.updateTransitions(rawElem);
				}
			} else {
				if (what == "all") {
					Element.addTransition(rawElem,what,duration);
				} else {
					console.trace();
					console.log(what,"IS NOT A REGISTERED TRANSITION");

				}
			}


		},
		resetTransformStyle: function(rawElem) {



			Element.setTransformStyle(rawElem,{
				translateX:0,translateY:0,translateZ:0,
				scaleX:1,scaleY:1,scaleZ:1,
				rotateX:0,rotateY:0,rotateZ:0,
				skewX:0,skewY:0,skewZ:0
			});

			return rawElem;
		},
		setTransformStyle: function(rawElem,styles,noParticleUpdate,noDurationReset) {




			if (!rawElem) return;
			if (!styles) return;
			var transforms = Element.retrieve(rawElem,"transforms") || Element.getTransformStyle(rawElem);

			Element.store(rawElem,"transformStyleMatrixDirty",true);
			Element.store(rawElem,"transformStyleMatrixOriginDirty",true);

			if (styles.x !== undefined || styles.y !== undefined || styles.z !== undefined) {
				console.trace();
				console.log("SET TRANSFORM STYLE,x,y,z IS DEPRECTAED");
				styles.translateX = styles.x;
				styles.translateY = styles.y;
				styles.translateZ = styles.z;
			}

			if (styles.scale) {
				styles.scaleX = styles.scaleY = styles.scale;
				delete styles.scale;
			}


			var digits = 1000;
			styles.translateX = (styles.translateX !== undefined ? ~~(styles.translateX*digits)/digits : transforms.translateX);
			styles.translateY = (styles.translateY !== undefined ? ~~(styles.translateY*digits)/digits : transforms.translateY);
			styles.translateZ = (styles.translateZ !== undefined ? ~~(styles.translateZ*digits)/digits : transforms.translateZ);

			styles.rotateX = (styles.rotateX !== undefined ? ~~(styles.rotateX*digits)/digits : transforms.rotateX);
			styles.rotateY = (styles.rotateY !== undefined ? ~~(styles.rotateY*digits)/digits : transforms.rotateY);
			styles.rotateZ = (styles.rotateZ !== undefined ? ~~(styles.rotateZ*digits)/digits : transforms.rotateZ);

			styles.scaleX = (styles.scaleX !== undefined ? ~~(styles.scaleX*digits)/digits : transforms.scaleX);
			styles.scaleY = (styles.scaleY !== undefined ? ~~(styles.scaleY*digits)/digits : transforms.scaleY);
			styles.scaleZ = (styles.scaleZ !== undefined ? ~~(styles.scaleZ*digits)/digits : transforms.scaleZ);

			styles.skewX = (styles.skewX !== undefined ? ~~(styles.skewX*digits)/digits : transforms.skewX);
			styles.skewY = (styles.skewY !== undefined ? ~~(styles.skewY*digits)/digits : transforms.skewY);
			styles.skewZ = (styles.skewZ !== undefined ? ~~(styles.skewZ*digits)/digits : transforms.skewZ);


			if (!styles.origin) {
				if (transforms.origin) {
					styles.origin = transforms.origin;
				} else {

				}
			}










			var useIEMatrix = !Modernizr.csstransforms3d && !Modernizr.csstransforms;

			var str;

			var transformKeys = Element.transformStyleKeys;


			if (transformKeys) {
				if ((Modernizr.csstransforms3d) || (transformKeys.transform == "webkitTransform")) {
					if (styles.rotateAfter) {
						str = "rotateX("+styles.rotateX+"deg) rotateY("+styles.rotateY+"deg) rotateZ("+styles.rotateZ + "deg) translate3d("+styles.translateX + "px," + styles.translateY + "px," + styles.translateZ +"px) scaleX("+styles.scaleX+") scaleY("+styles.scaleY+") scaleZ("+styles.scaleZ+")";
					} else {
						str = "translate3d("+styles.translateX + "px," + styles.translateY + "px," + styles.translateZ +"px) rotateX("+styles.rotateX+"deg) rotateY("+styles.rotateY+"deg) rotateZ("+styles.rotateZ + "deg) scaleX("+styles.scaleX+") scaleY("+styles.scaleY+") scaleZ("+styles.scaleZ+")";
					}

					Element.css(rawElem,transformKeys.transform,str);
				} else {
					if (Modernizr.csstransforms) {
						if (styles.rotateAfter) {
							str = "rotate(" + styles.rotateZ + "deg) translate("+styles.translateX+"px," + styles.translateY + "px) scale("+styles.scaleX+","+styles.scaleY+")";
						} else {
							str = "translate("+styles.translateX+"px," + styles.translateY + "px) rotate(" + styles.rotateZ + "deg) scale("+styles.scaleX+","+styles.scaleY+")";
						}
						Element.css(rawElem,transformKeys.transform,str);
					} else {


						if (useIEMatrix) {
							var matrix = new CSSMatrix("translate3d("+styles.translateX + "px," + styles.translateY + "px," + styles.translateZ +"px) rotateX("+styles.rotateX+"deg) rotateY("+styles.rotateY+"deg) rotateZ("+(-styles.rotateZ) + "deg) scaleX("+styles.scaleX+") scaleY("+styles.scaleY+") scaleZ("+styles.scaleZ+")");
							var filters = typeof(rawElem.filters) !== undefined;


							if (filters) {
								if(rawElem.filters.item("DXImageTransform.Microsoft.Matrix")) {
									rawElem.style.msFilter = rawElem.style.filter = (rawElem.style.filter ? '' : ' ' ) + "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand')";
								}



								rawElem.filters.item("DXImageTransform.Microsoft.Matrix").M11 = matrix.m11;
								rawElem.filters.item("DXImageTransform.Microsoft.Matrix").M12 = matrix.m12;
								rawElem.filters.item("DXImageTransform.Microsoft.Matrix").M21 = matrix.m21;
								rawElem.filters.item("DXImageTransform.Microsoft.Matrix").M22 = matrix.m22;
							} else {
								console.log("EROR WITH IE DXIMAGETRANSFORM FILTERS");
							}

							rawElem.style['marginLeft'] = -(rawElem.offsetWidth/2) + (rawElem.clientWidth/2) + "px";
							rawElem.style['marginTop'] = -(rawElem.offsetHeight/2) + (rawElem.clientHeight/2) + "px";

						}

						Element.css(rawElem,{

							left: styles.translateX,
							top: styles.translateY
						});

					}
				}

				if (styles.origin) {
					Element.css(rawElem,transformKeys.origin,styles.origin.x+"px " + styles.origin.y+"px");
				}

			} else {





				Element.css(rawElem,{

					left: styles.translatX,
					top: styles.translateY
				});
			}
			Element.store(rawElem,"transforms",styles);




			noParticleUpdate = true;
			if (!noParticleUpdate && elem.particle) {


				elem.particle.onExternalUpdate(styles);
			}
		}


		,
		getNestedCenter: function(rawElem,maxNode) {
			var corners = Element.getNestedCorners(rawElem,maxNode);
			return __.Math.between(corners[0],corners[2],0.5);
		},
		getNestedCorners: function(rawElem,maxNode,extend) {
			extend = extend || 0;
			var t = Element.getNestedTransformStyle(rawElem);

			var size = Element.size(rawElem);
			var widthOfElement = {
				x:size.offsetWidth*t.scaleX,
				y:size.offsetHeight*t.scaleY
			};

			var centerOfElement = {
				x: t.translateX + 0.5*widthOfElement.x/t.scaleX,
				y: t.translateY + 0.5*widthOfElement.y/t.scaleY
			};

			var tl = __.Math.add(centerOfElement,__.Math.rotate({x:-widthOfElement.x*0.5-extend,y:-widthOfElement.y*0.5-extend},t.rotateZ/180*Math.PI));
			var tr = __.Math.add(centerOfElement,__.Math.rotate({x:widthOfElement.x*0.5+extend,y:-widthOfElement.y*0.5-extend},t.rotateZ/180*Math.PI));
			var bl = __.Math.add(centerOfElement,__.Math.rotate({x:-widthOfElement.x*0.5-extend,y:widthOfElement.y*0.5+extend},t.rotateZ/180*Math.PI));
			var br = __.Math.add(centerOfElement,__.Math.rotate({x:widthOfElement.x*0.5+extend,y:widthOfElement.y*0.5+extend},t.rotateZ/180*Math.PI));

			return [tl,tr,br,bl];
		},
		getNestedTransformStyle: function(rawElem,debug,offsets) {
			var matrix = Element.getNestedTransformStyleMatrix(rawElem,debug,offsets);
			return window.CSSMatrix.unmatrix(matrix);
		},
		addListener: function(rawElem,type,fn) {
			if (rawElem.addEventListener) {
				rawElem.addEventListener(type,fn);
			} else {

				if (rawElem.attachEvent) {
					if (rawElem.dispatchEvent || type.toLowerCase().indexOf("mouse") === 0) {
						rawElem.attachEvent('on' + type, fn);
					} else {

						var id = getIDToElement(rawElem);
						var init = false;
						if (__.Element.globalEventData[type] && __.Element.globalEventData[type][id]) {
							init = true;
						}

						if (!init) {
							rawElem[type] = 0;

							__.Element.globalEventData[type] = __.Element.globalEventData[type] || {};
							__.Element.globalEventData[type][id] = {
								callbacks: [],
								data: []
							};

							var callbacks = __.Element.globalEventData[type][id].callbacks;

							var callback = function(evt) {
								if (evt.propertyName == type) {


									var evtData = false;


									var i = 0;
									callbacks.forEach(function(callback) {

										__.Element.globalEventData[type][id].data.forEach(function(data) {

											callback(data);
										});
									});
									__.Element.globalEventData[type][id].data = [];


								}
							};

							rawElem.attachEvent('onpropertychange', callback);
						}

						__.Element.globalEventData[type][id].callbacks.push(fn);

					}
				} else {
					console.log("UNABLE TO BIND EVENT");
				}
			}
			return rawElem;
		},
		removeListener: function(rawElem,type, fn){


			if (rawElem.removeEventListener) {
				rawElem.removeEventListener(type, fn);
			} else {
				if (rawElem.detachEvent) {
					if (rawElem.dispatchEvent || type.toLowerCase().indexOf("mouse") === 0) {
						rawElem.detachEvent('on' + type, fn);
					} else {
						var id = getIDToElement(rawElem);
						__.Element.globalEventData[type] = __.Element.globalEventData[type] || {};
						if (__.Element.globalEventData[type][id]) {
							var evtData = __.Element.globalEventData[type][id];
							_.erase(__.Element.globalEventData[type][id].callbacks,fn);
						}
					}
				} else {
					console.log("UNABLE TO BIND EVENT");
				}
			}
			return rawElem;
		},
		ccss: function(rawElem,key) {
			if (!rawElem || !rawElem.parentNode) {
				console.trace();
				console.log("Element.ccs",rawElem,"IS INVALID OR NOT INSIDE DOM");
				return "";
			}

			var styleObject = (window.getComputedStyle !== undefined ? window.getComputedStyle(rawElem) : rawElem.currentStyle);
			if (!styleObject) {
				console.log("ERROR RETRIEVING",rawElem.parentNode,rawElem.currentStyle);
				return "";
			}


			key = key.replace(/-(\w)/g,function(all,letter) {
				return letter.toUpperCase();
			});

			var value = styleObject[key];
			return value;
		},
		css: function(rawElem,key,value) {

			if (!rawElem || !rawElem.style) {
				console.trace();
				console.log("WRONG ELEMENT",rawElem);
			}

			if (arguments.length == 2) {
				if (_.isObject(key)) {
					_.forOwn(key, function(val,key) {
						rawElem.style[key] = val;
					});
				} else {
					return rawElem.style[key];
				}
			}

			if (arguments.length == 3) {
				return rawElem.style[key] = value;
			}

		}
	};
	__.Element = Element;
	module.exports = Element;
},{"../dep/lodash.shim":7,"./basic":22,"./CSSMatrix.ext":28}],28:[function(require,module,exports){
(function(global){	var __ = require('./basic');
	var CSSMatrix = global.CSSMatrix || require('./CSSMatrixStripped');



	var $M = function(elems) {
		return new Matrix(elems);
	};
	var Matrix = function(elems) {
		this.elements = elems;
		return this;
	};


	var $V = function(elems) {
		return new Vector(elems);
	};
	var Vector = function(elems) {
		this.elements = elems;
		return this;
	};

	Vector.Zero = function(n) {
		var elements = [];
		do { elements.push(0);} while (--n);
		return new Vector(elements);
	};

	Vector.prototype = {
		modulus: function() {
			return Math.sqrt(this.dot(this));
		},
		dot: function(vector) {
			var V = vector.elements || vector;
			var i, product = 0, n = this.elements.length;
			if (n != V.length) { return null; }
			do { product += this.elements[n-1] * V[n-1]; } while (--n);
			return product;
		},
		toUnitVector: function() {
			var r = this.modulus();
			if (r === 0) { return this.dup(); }
			return this.map(function(x) { return x/r; });
		},
		dup: function() {
			return new Vector(this.elements);
		},
		map: function(fn) {
			var elements = [];
			this.elements.forEach(function(x, i) {
				elements.push(fn(x, i));
			});
			return new Vector(elements);
		},
		cross: function(vector) {
			var B = vector.elements || vector;
			if (this.elements.length != 3 || B.length != 3) { return null; }
			var A = this.elements;
			return new Vector([
				(A[1] * B[2]) - (A[2] * B[1]),
				(A[2] * B[0]) - (A[0] * B[2]),
				(A[0] * B[1]) - (A[1] * B[0])
			]);
		}
	};

	/*
		WHENEVER POSSIBLE, USE NATIVE WEBKITCSSMATRIX INSTEAD OF JS VERSION OF CSSMATRIX
		AVOID NATIVE WEBKITCSSMATRIX OF Android 2.3.x, CAUSE IT FAILS NESTED TRANSFORM STYLE TESTS
	*/

	//Determinate wether to use WebKitCssMatrix
	var isWebKitBuggy = false;
	if (window.WebKitCSSMatrix) {
		var ua = navigator.userAgent;
		if( ua.indexOf("Android") >= 0 ) {
			var androidversion = parseFloat(ua.slice(ua.indexOf("Android")+8));
			if (androidversion < 3) {
				isWebKitBuggy = true;
			}
		}
	}

	var useWebKitCSSMatrix = window.WebKitCSSMatrix && !isWebKitBuggy;

	CSSMatrix = useWebKitCSSMatrix ? window.WebKitCSSMatrix : CSSMatrix;
	CSSMatrix.isNative = useWebKitCSSMatrix;

	CSSMatrix.prototype.identity = function() {
		this.m11 = this.m22 = this.m33 = this.m44 = 1;
		this.m12 = this.m13 = this.m14 =
		this.m21 =this.m23 = this.m24 =
		this.m31 = this.m32 =            this.m34 =
		this.m41 = this.m42 = this.m43            = 0;
		return this;
	};

	CSSMatrix.prototype.multPoint = function(x,y,z,w) {
		var affine = this.m13 === 0 && this.m14 === 0 &&
				this.m23 === 0 && this.m24 === 0 &&
				this.m31 === 0 && this.m32 === 0 &&
				this.m33 === 1 && this.m34 === 0 &&
				this.m43 === 0 && this.m44 === 1;

		//if (x === undefined || y === undefined ) console.error("MULTPOINT NEEDS AT LEAST X,Y");
		if (affine) {
			z = 1;
			if (this.isNative) {
				return {
					x: this.a*x + this.c*y + this.e*z,
					y: this.b*x + this.d*y + this.f*z,
					z: 0
				};
			} else {
				return {
					x: this.m11*x + this.m21*y + this.m41*z,
					y: this.m12*x + this.m22*y + this.m42*z,
					z: 0
				};
			}

		} else {
			z = z || 0;
			w = (w === undefined ? 1 : w);
			return {
				x: this.m11*x+	this.m12*y+	this.m13*z+	this.m14*w,
				y: this.m21*x+	this.m22*y+	this.m23*z+	this.m24*w,
				z: this.m31*x+	this.m32*y+	this.m33*z+	this.m34*w,
				w: this.m41*x+	this.m42*y+	this.m43*z+	this.m44*w
			};
		}
	};

var combine = function(a,b,ascl,bscl) {
		var result = $V([
			(ascl * a.elements[0]) + (bscl * b.elements[0]),
			(ascl * a.elements[1]) + (bscl * b.elements[1]),
			(ascl * a.elements[2]) + (bscl * b.elements[2])
		]);
		return result;
	};

CSSMatrix.unmatrix = function(cssmatrix) {

	var matrix;
	//USE 4x4 MATRIX IF POSSIBLE
	if (cssmatrix.m11 !== undefined) {
		matrix =$M([
				[cssmatrix.m11,cssmatrix.m12,cssmatrix.m13,cssmatrix.m14],
				[cssmatrix.m21,cssmatrix.m22,cssmatrix.m23,cssmatrix.m24],
				[cssmatrix.m31,cssmatrix.m32,cssmatrix.m33,cssmatrix.m34],
				[cssmatrix.m41,cssmatrix.m42,cssmatrix.m43,cssmatrix.m44]
				]);
	} else {
		//ELSE USE 2X3 MATRIX AND PUT IT INTO 4x4 MATRIX
		if (cssmatrix.a !== undefined) {
				matrix =$M([
						[cssmatrix.a,cssmatrix.b,0,0],
						[cssmatrix.c,cssmatrix.d,0,0],
						[0,0,1,0],
						[cssmatrix.e,cssmatrix.f,0,1]
						]);

		} else {
			//console.log("Math.unmatrix, invalid matrix format");
			return false;
		}
	}


	matrix.elements[3][3] = __.Math.eps(matrix.elements[3][3],0.0001);

	// Normalize the matrix.
	if (matrix.elements[3][3] === 0)
		return false;

	for (i = 0; i < 4; i++) {
		for (j = 0; j < 4; j++) {
			matrix.elements[i][j] = __.Math.eps(matrix.elements[i][j] / matrix.elements[3][3]);
		}
	}

	var perspectiveMatrix = matrix;

	for (i = 0; i < 3; i++)
		perspectiveMatrix.elements[i][3] = 0;

	perspectiveMatrix.elements[3][3] = 1;




	var perspective =  Vector.Zero(4);
	var translate =  Vector.Zero(3), rotate = Vector.Zero(3), scale = Vector.Zero(3), skew = Vector.Zero(3);

	if (matrix.elements[0][3] !== 0 || matrix.elements[1][3] !== 0 || matrix.elements[2][3] !== 0) {

	} else {

		perspective.elements[0] = perspective.elements[1] = perspective.elements[2] = 0;
		perspective.elements[3] = 1;
	}


	for (i = 0; i < 3; i++) {
		translate.elements[i] = matrix.elements[3][i];
	}

	var row = [];
	for (i = 0; i < 3; i++) {
		row[i] = $V([matrix.elements[i][0],matrix.elements[i][1],matrix.elements[i][2]]);
	}


	scale.elements[0] = row[0].modulus();
	row[0] = row[0].toUnitVector();


	skew.elements[0] = row[0].dot(row[1]);
	row[1] = combine(row[1], row[0], 1.0, -skew.elements[0]);


	scale.elements[1] = row[1].modulus();
	row[1] = row[1].toUnitVector();
	skew.elements[0] /= scale.elements[1];

	// Compute XZ and YZ shears, orthogonalize 3rd row
	skew.elements[1] = row[0].dot(row[2]);
	row[2] = combine(row[2], row[0], 1.0, -skew.elements[1]);
	skew.elements[2] = row[1].dot(row[2]);
	row[2] = combine(row[2], row[1], 1.0, -skew.elements[2]);

	// Next, get Z scale and normalize 3rd row.
	scale.elements[2] = row[2].modulus();
	row[2] = row[2].toUnitVector();
	skew.elements[1] /= scale.elements[2];
	skew.elements[2] /= scale.elements[2];

	// At this point, the matrix (in rows) is orthonormal.
	// Check for a coordinate system flip.  If the determinant
	// is -1, then negate the matrix and the scaling factors.
	var pdum3 = row[1].cross(row[2]);
	if (row[0].dot(pdum3) < 0) {
		for (i = 0; i < 3; i++) {
			scale.elements[0] *= -1;
			row[i].elements[0] *= -1;
			row[i].elements[1] *= -1;
			row[i].elements[2] *= -1;
		}
	}

	/* Now, get the rotations out, as described in the gem. */
	rotate.elements[1] = Math.asin(-row[0].elements[2]);

	if ( Math.cos(rotate.elements[1]) !== 0 ) {
		rotate.elements[0] = Math.atan2(row[1].elements[2], row[2].elements[2]);
		rotate.elements[2] = Math.atan2(row[0].elements[1], row[0].elements[0]);
	}
	else {
		rotate.elements[0] = Math.atan2(row[1].elements[0], row[1].elements[1]);
		rotate.elements[2] = 0;
	}

	for(var i=0;i<3;i++) {
		rotate.elements[i] = rotate.elements[i]/Math.PI*180;
	}


	var result = {
		translateX: __.Math.eps(translate.elements[0]),
		translateY: __.Math.eps(translate.elements[1]),
		translateZ: __.Math.eps(translate.elements[2]),
		rotateX: __.Math.eps(rotate.elements[0]),
		rotateY: __.Math.eps(rotate.elements[1]),
		rotateZ: __.Math.eps(rotate.elements[2]),
		scaleX:  __.Math.eps(scale.elements[0]),
		scaleY:  __.Math.eps(scale.elements[1]),
		scaleZ:  __.Math.eps(scale.elements[2]),
		skewX: __.Math.eps(skew.elements[0]),
		skewY: __.Math.eps(skew.elements[1]),
		skewZ: __.Math.eps(skew.elements[2])
	};
	return result;
};

global.CSSMatrix = CSSMatrix;
module.exports = CSSMatrix;

})(window)
},{"./basic":22,"./CSSMatrixStripped":29}],29:[function(require,module,exports){


	var	between = function(str,a,b) {
		var posA = str.indexOf(a);
		if (posA > -1) {
			var posB = str.indexOf(b,posA);
			if (posB) {
				return str.substring(posA + a.length,posB);
			}
		}
		return undefined;
	};

		var CSSMatrix = function(domstr) {
			this.m11 = this.m22 = this.m33 = this.m44 = 1;
			this.m12 = this.m13 = this.m14 =
			this.m21 =this.m23 = this.m24 =
			this.m31 = this.m32 = this.m34 =
			this.m41 = this.m42 = this.m43 = 0;

			if (typeof domstr == "string") {
				if (domstr != "none")
					this.setMatrixValue(domstr);
			}
		};


		CSSMatrix.displayName = "CSSMatrix";

		CSSMatrix.degreesToRadians = function(angle) {
			return angle* Math.PI / 180;
		};

		CSSMatrix.determinant2x2 = function(a, b, c, d) {
			return a* d - b* c;
		};

		CSSMatrix.determinant3x3 = function(a1, a2, a3, b1, b2, b3, c1, c2, c3) {
			var determinant2x2 = CSSMatrix.determinant2x2;
			return a1* determinant2x2(b2, b3, c2, c3) -
					b1* determinant2x2(a2, a3, c2, c3) +
					c1* determinant2x2(a2, a3, b2, b3);
		};


		CSSMatrix.determinant4x4 = function(m) {
			var determinant3x3 = CSSMatrix.determinant3x3,

			// Assign to individual variable names to aid selecting correct elements
			a1 = m.m11, b1 = m.m21, c1 = m.m31, d1 = m.m41,
			a2 = m.m12, b2 = m.m22, c2 = m.m32, d2 = m.m42,
			a3 = m.m13, b3 = m.m23, c3 = m.m33, d3 = m.m43,
			a4 = m.m14, b4 = m.m24, c4 = m.m34, d4 = m.m44;

			return a1* determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4) -
					b1* determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4) +
					c1* determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4) -
					d1* determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
		};

		var definePropertyException = false;

		[["m11", "a"],
		["m12", "b"],
		["m21", "c"],
		["m22", "d"],
		["m41", "e"],
		["m42", "f"]].forEach(function(pair) {
			//Object.defineProperty on IE8 is only supported on DOM Elements, throws Exception otherwise
			//Thus for IE<9 only limited CSSMatrix-polyfill support (no a,b,c,d,e,f properties)
			if (definePropertyException) return;
			var key3d = pair[0], key2d = pair[1];

			try {
				Object.defineProperty(CSSMatrix.prototype, key2d, {
					set: function(val) {
						this[key3d] = val;
					},

					get: function() {
						return this[key3d];
					}
				});
			} catch (e) {
				definePropertyException = true;
				console.log("CSSMATRIX SUPPORT INCOMPLETE, AVOID CSSMATRIX.[A,B,C,D,E,F] ACCESS");
			}
		});


		CSSMatrix.prototype.isAffine = function() {
			return this.m13 === 0 && this.m14 === 0 &&
					this.m23 === 0 && this.m24 === 0 &&
					this.m31 === 0 && this.m32 === 0 &&
					this.m33 === 1 && this.m34 === 0 &&
					this.m43 === 0 && this.m44 === 1;
		};


		CSSMatrix.prototype.multiply = function(otherMatrix) {
			var a = otherMatrix,
				b = this,
				c = new CSSMatrix();

			c.m11 = a.m11* b.m11 + a.m12* b.m21 + a.m13* b.m31 + a.m14* b.m41;
			c.m12 = a.m11* b.m12 + a.m12* b.m22 + a.m13* b.m32 + a.m14* b.m42;
			c.m13 = a.m11* b.m13 + a.m12* b.m23 + a.m13* b.m33 + a.m14* b.m43;
			c.m14 = a.m11* b.m14 + a.m12* b.m24 + a.m13* b.m34 + a.m14* b.m44;

			c.m21 = a.m21* b.m11 + a.m22* b.m21 + a.m23* b.m31 + a.m24* b.m41;
			c.m22 = a.m21* b.m12 + a.m22* b.m22 + a.m23* b.m32 + a.m24* b.m42;
			c.m23 = a.m21* b.m13 + a.m22* b.m23 + a.m23* b.m33 + a.m24* b.m43;
			c.m24 = a.m21* b.m14 + a.m22* b.m24 + a.m23* b.m34 + a.m24* b.m44;

			c.m31 = a.m31* b.m11 + a.m32* b.m21 + a.m33* b.m31 + a.m34* b.m41;
			c.m32 = a.m31* b.m12 + a.m32* b.m22 + a.m33* b.m32 + a.m34* b.m42;
			c.m33 = a.m31* b.m13 + a.m32* b.m23 + a.m33* b.m33 + a.m34* b.m43;
			c.m34 = a.m31* b.m14 + a.m32* b.m24 + a.m33* b.m34 + a.m34* b.m44;

			c.m41 = a.m41* b.m11 + a.m42* b.m21 + a.m43* b.m31 + a.m44* b.m41;
			c.m42 = a.m41* b.m12 + a.m42* b.m22 + a.m43* b.m32 + a.m44* b.m42;
			c.m43 = a.m41* b.m13 + a.m42* b.m23 + a.m43* b.m33 + a.m44* b.m43;
			c.m44 = a.m41* b.m14 + a.m42* b.m24 + a.m43* b.m34 + a.m44* b.m44;

			return c;
		};

		CSSMatrix.prototype.isIdentityOrTranslation = function() {
			var t = this;
			return t.m11 === 1 && t.m12 === 0 && t.m13 === 0 && t.m14 === 0 &&
					t.m21 === 0 && t.m22 === 1 && t.m23 === 0 && t.m24 === 0 &&
					t.m31 === 0 && t.m31 === 0 && t.m33 === 1 && t.m34 === 0 &&
			t.m44 === 1;
		};

		CSSMatrix.prototype.adjoint = function() {
			var result = new CSSMatrix(), t = this,
				determinant3x3 = CSSMatrix.determinant3x3,

				a1 = t.m11, b1 = t.m12, c1 = t.m13, d1 = t.m14,
				a2 = t.m21, b2 = t.m22, c2 = t.m23, d2 = t.m24,
				a3 = t.m31, b3 = t.m32, c3 = t.m33, d3 = t.m34,
				a4 = t.m41, b4 = t.m42, c4 = t.m43, d4 = t.m44;

			// Row column labeling reversed since we transpose rows & columns
			result.m11 =  determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
			result.m21 = -determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
			result.m31 =  determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
			result.m41 = -determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

			result.m12 = -determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
			result.m22 =  determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
			result.m32 = -determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
			result.m42 =  determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

			result.m13 =  determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
			result.m23 = -determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
			result.m33 =  determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
			result.m43 = -determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

			result.m14 = -determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
			result.m24 =  determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
			result.m34 = -determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
			result.m44 =  determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);

			return result;
		};


		CSSMatrix.prototype.inverse = function() {
			var inv, det, result, i, j;

			if (this.isIdentityOrTranslation()) {
				inv = new CSSMatrix();

				if (!(this.m41 === 0 && this.m42 === 0 && this.m43 === 0)) {
					inv.m41 = -this.m41;
					inv.m42 = -this.m42;
					inv.m43 = -this.m43;
				}

				return inv;
			}

			// Calculate the adjoint matrix
			result = this.adjoint();

			// Calculate the 4x4 determinant
			det = CSSMatrix.determinant4x4(this);

			// If the determinant is zero, then the inverse matrix is not unique
			if (Math.abs(det) < 1e-8) return null;

			// Scale the adjoint matrix to get the inverse
			for (i = 1; i < 5; i++) {
				for (j = 1; j < 5; j++) {
					result[("m" + i) + j] /= det;
				}
			}

			return result;
		};

		CSSMatrix.prototype.rotate = function(rx, ry, rz) {
			var degreesToRadians = CSSMatrix.degreesToRadians;

			if (typeof rx != "number" || isNaN(rx)) rx = 0;

			if ((typeof ry != "number" || isNaN(ry)) &&
				(typeof rz != "number" || isNaN(rz))) {
				rz = rx;
				rx = 0;
				ry = 0;
			}

			if (typeof ry != "number" || isNaN(ry)) ry = 0;
			if (typeof rz != "number" || isNaN(rz)) rz = 0;

			rx = degreesToRadians(rx);
			ry = degreesToRadians(ry);
			rz = degreesToRadians(rz);

			var tx = new CSSMatrix(),
				ty = new CSSMatrix(),
				tz = new CSSMatrix(),
				sinA, cosA, sinA2;

			rz /= 2;
			sinA = Math.sin(rz);
			cosA = Math.cos(rz);
			sinA2 = sinA* sinA;

			// Matrices are identity outside the assigned values
			tz.m11 = tz.m22 = 1 - 2* sinA2;
			tz.m12 = tz.m21 = 2* sinA* cosA;
			tz.m21*= -1;

			ry /= 2;
			sinA  = Math.sin(ry);
			cosA  = Math.cos(ry);
			sinA2 = sinA* sinA;

			ty.m11 = ty.m33 = 1 - 2* sinA2;
			ty.m13 = ty.m31 = 2* sinA* cosA;
			ty.m13*= -1;

			rx /= 2;
			sinA = Math.sin(rx);
			cosA = Math.cos(rx);
			sinA2 = sinA* sinA;

			tx.m22 = tx.m33 = 1 - 2* sinA2;
			tx.m23 = tx.m32 = 2* sinA* cosA;
			tx.m32*= -1;

			return tz.multiply(ty).multiply(tx).multiply(this);
		};


		CSSMatrix.prototype.rotateAxisAngle = function(x, y, z, a) {
			if (typeof x != "number" || isNaN(x)) x = 0;
			if (typeof y != "number" || isNaN(y)) y = 0;
			if (typeof z != "number" || isNaN(z)) z = 0;
			if (typeof a != "number" || isNaN(a)) a = 0;
			if (x === 0 && y === 0 && z === 0) z = 1;

			var t   = new CSSMatrix(),
				len = Math.sqrt(x* x + y* y + z* z),
				cosA, sinA, sinA2, csA, x2, y2, z2;

			a     = (CSSMatrix.degreesToRadians(a) || 0) / 2;
			cosA  = Math.cos(a);
			sinA  = Math.sin(a);
			sinA2 = sinA* sinA;


			if (len === 0) {
				x = 0;
				y = 0;
				z = 1;
			} else if (len !== 1) {
				x /= len;
				y /= len;
				z /= len;
			}

			// Optimise cases where axis is along major axis
			if (x === 1 && y === 0 && z === 0) {
				t.m22 = t.m33 = 1 - 2* sinA2;
				t.m23 = t.m32 = 2* cosA* sinA;
				t.m32*= -1;
			} else if (x === 0 && y === 1 && z === 0) {
				t.m11 = t.m33 = 1 - 2* sinA2;
				t.m13 = t.m31 = 2* cosA* sinA;
				t.m13*= -1;
			} else if (x === 0 && y === 0 && z === 1) {
				t.m11 = t.m22 = 1 - 2* sinA2;
				t.m12 = t.m21 = 2* cosA* sinA;
				t.m21*= -1;
			} else {
				csA = sinA* cosA;
				x2  = x* x;
				y2  = y* y;
				z2  = z* z;

				t.m11 = 1 - 2* (y2 + z2)* sinA2;
				t.m12 = 2* (x* y* sinA2 + z* csA);
				t.m13 = 2* (x* z* sinA2 - y* csA);
				t.m21 = 2* (y* x* sinA2 - z* csA);
				t.m22 = 1 - 2* (z2 + x2)* sinA2;
				t.m23 = 2* (y* z* sinA2 + x* csA);
				t.m31 = 2* (z* x* sinA2 + y* csA);
				t.m32 = 2* (z* y* sinA2 - x* csA);
				t.m33 = 1 - 2* (x2 + y2)* sinA2;
			}

			return this.multiply(t);
		};

		CSSMatrix.prototype.scale = function(scaleX, scaleY, scaleZ) {
			var transform = new CSSMatrix();

			if (typeof scaleX != "number" || isNaN(scaleX)) scaleX = 1;
			if (typeof scaleY != "number" || isNaN(scaleY)) scaleY = scaleX;
			if (typeof scaleZ != "number" || isNaN(scaleZ)) scaleZ = 1;

			transform.m11 = scaleX;
			transform.m22 = scaleY;
			transform.m33 = scaleZ;

			return this.multiply(transform);
		};


		CSSMatrix.prototype.translate = function(x, y, z) {
			var t = new CSSMatrix();

			if (typeof x != "number" || isNaN(x)) x = 0;
			if (typeof y != "number" || isNaN(y)) y = 0;
			if (typeof z != "number" || isNaN(z)) z = 0;

			t.m41 = x;
			t.m42 = y;
			t.m43 = z;

			return this.multiply(t);
		};


		CSSMatrix.prototype.setMatrixValue = function(domstr) {
				domstr = domstr.trim();
			var mstr   = domstr.match(/^matrix(3d)?\(\s*(.+)\s*\)$/),
				is3d, chunks, len, points, i, chunk;
			if (!mstr) {
				var matrix = new CSSMatrix();
				var parts = domstr.replace(/, /g,",").split(" ");
				parts.forEach(function(part) {
					var scales;
					if (part.indexOf("translate(") > -1) {
						var translates = between(part,"translate(",")").split(",").map(function(val) {return parseInt(val,10);});
						if (translates.length > 0)
							matrix = matrix.translate(translates[0],translates[1],translates[2]);
					}

					if (part.indexOf("translate3d(") > -1) {
						var translates3d = between(part,"translate3d(",")").split(",").map(function(val) {return parseInt(val,10);});
						if (translates3d.length > 0)
							matrix = matrix.translate(translates3d[0],translates3d[1],translates3d[2]);
					}



					if (part.indexOf("rotate") > -1) {


						if (part.indexOf("rotate(") > -1) {
							var rotates = between(part,"rotate(",")").split(",").map(function(val) {return parseInt(val,10);});
							if (rotates.length > 0) {
								matrix = matrix.rotateAxisAngle(0,0,1,rotates[2]);
								matrix = matrix.rotateAxisAngle(0,1,0,rotates[1]);
								matrix = matrix.rotateAxisAngle(1,0,0,rotates[0]);
							}
						} else {
							var rotateValues = {
								"X": 0,
								"Y": 0,
								"Z": 0
							};

							"X,Y,Z".split(",").forEach(function(dim) {
								var value = between(part,"rotate" + dim + "(",")");
								if (value)
									rotateValues[dim] = parseFloat(value);
							});

							matrix = matrix.rotateAxisAngle(0,0,1,rotateValues.Z);
							matrix = matrix.rotateAxisAngle(0,1,0,rotateValues.Y);
							matrix = matrix.rotateAxisAngle(1,0,0,rotateValues.X);
						}
					}

					if(part.indexOf("scale") > -1) {
						if (part.indexOf("scale(") > -1) {
							scales = between(part,"scale(",")").split(",").map(function(val) {return parseFloat(val,10);});
							if (scales.length > 0)
								matrix = matrix.scale(scales[0],scales[1],scales[2]);
						} else {
							var scaleValues = {
								"X": 1,
								"Y": 1,
								"Z": 1
							};

							"X,Y,Z".split(",").forEach(function(dim) {
								var value = between(part,"scale" + dim + "(",")");
								if (value) scaleValues[dim] = parseFloat(value);
							});
							matrix = matrix.scale(scaleValues.X,scaleValues.Y,scaleValues.Z);
						}
					}
				}.bind(this));
				this.setMatrixValue(matrix.toString());
				return;
			}

			is3d   = !!mstr[1];
			chunks = mstr[2].split(/\s*,\s*/);
			len    = chunks.length;
			points = new Array(len);

			if ((is3d && len !== 16) || !(is3d || len === 6)) return;

			for (i = 0; i < len; i++) {
				chunk = chunks[i];
				if (chunk.match(/^-?\d+(\.\d+)?$/)) {
					points[i] = parseFloat(chunk);
				} else return;
			}

			if (is3d) {
				for (i = 0; i < len; i++) {
					this[("m" + (Math.floor(i / 4) + 1)) + (i % 4 + 1)] = points[i];
				}
			} else {
				if (len == 6) {
					this.m11 = points[0];
					this.m12 = points[1];
					this.m13 = this.m14 = 0;
					this.m21 = points[2];
					this.m22 = points[3];
					this.m23 = this.m24 = 0;
					this.m31 = this.m32 = this.m34 = 0;
					this.m33 = 1;
					this.m41 = points[4];
					this.m42 = points[5];
					this.m43 = 0;
					this.m44 = 1;
				}
			}


		};


		CSSMatrix.prototype.toString = function() {
			var self = this, points, prefix;

			if (this.isAffine()) {
				prefix = "matrix(";

				points = ["m11", "m12", "m21", "m22", "m41", "m42"];

			} else {
				prefix = "matrix3d(";
				points = ["m11", "m12", "m13", "m14",
						"m21", "m22", "m23", "m24",
						"m31", "m32", "m33", "m34",
						"m41", "m42", "m43", "m44"];
			}

			return prefix + points.map(function(p) {
				return self[p].toFixed(6);
			}).join(", ") + ")";
		};




		module.exports = CSSMatrix;
},{}]},{},[1])
;