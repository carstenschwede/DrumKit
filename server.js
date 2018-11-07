const fs = require("fs");
const handleCoordinatePost = function(data) {
	const outputDir = "./json/";
	if (!fs.existsSync(outputDir)){
    		fs.mkdirSync(outputDir);
	}

	const filePath = outputDir + "output_" + Date.now() + ".json";
	fs.writeFileSync(filePath,JSON.stringify(data));
	console.log("Written data to",filePath);
}


var liveServer = require("live-server");
const bodyParser = require("body-parser");
var postData = function(req,res,next) {
	if (req.method !== "POST") return next();
	if (req.url !== '/postData') return next();

	let data;
	try {
		data = JSON.parse(Object.keys(req.body)[0]);
		handleCoordinatePost(data);
	} catch (e) {
		console.log("ERROR PARSING",e);
		res.statusCode = 400;
		res.end();
		return
	}

	res.statusCode = 200;
	res.end();

}

var params = {
	port: 8181, // Set the server port. Defaults to 8080.
	host: "0.0.0.0", // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
	root: "./public/", // Set root directory that's being served. Defaults to cwd.
	open: false, // When false, it won't load your browser by default.
	file: "index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
	mount: [['/components', './node_modules']], // Mount a directory to a route.
	logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
	middleware: [bodyParser.urlencoded({ extended: false }),bodyParser.json(),postData] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
};
liveServer.start(params);
