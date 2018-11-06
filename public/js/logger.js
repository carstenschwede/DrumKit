const log = function(...args) {
	let text = "[" + new Date().toLocaleTimeString() + "]: " + args.join(",") + "\n" + $('#logs').text();
	$('#logs').text(text);
}

var oldLog = console.log;
console.log = function(...args) {
	oldLog.apply(console,args);
	log.apply(false,args);
}

var oldError = console.error;
console.error = function(...args) {
	oldError.apply(console,args);
	log.apply(false,args);
}


var oldWarn = console.warn;
console.warn = function(...args) {
	oldWarn.apply(console,args);
	log.apply(false,args);
}

// When ready...
window.addEventListener("load",function() {
	// Set a timeout...
	setTimeout(function(){
	  // Hide the address bar!
	  window.scrollTo(0, 1);
	}, 0);
  });