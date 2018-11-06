window.AudioContext = window.AudioContext || window.webkitAudioContext;
var FREQUENCY = 440.0;
var INTERVAL = 250.0;
var RAMP_VALUE = 0.00001;
var RAMP_DURATION = 0.25;

var context = new window.AudioContext();
var interval = INTERVAL;



window.beep = function (frequency) {
	var currentTime = context.currentTime;
	var osc = context.createOscillator();
	var gain = context.createGain();

	osc.connect(gain);
	gain.connect(context.destination);

	gain.gain.setValueAtTime(gain.gain.value, currentTime);
	gain.gain.exponentialRampToValueAtTime(RAMP_VALUE, currentTime + RAMP_DURATION);

	osc.onended = function () {
		gain.disconnect(context.destination);
		osc.disconnect(gain);
	}

	osc.type = 'sine';
	osc.frequency.value = frequency;
	osc.start(currentTime);
	osc.stop(currentTime + RAMP_DURATION);
}
