Touchable.on("ready", function(_,__) {
	//Touchable.enableTouchIndicators();
	let coordinates = [];
	var updateSendButton = function() {
		$('#stop').text("STOP AND SEND DATA (" + coordinates.length + ")");
	}

	$('#start').on("click",() => {
		console.log("Clear coordinates");
		coordinates.length = 0;
		updateSendButton();
	});

	$('#stop').on("click",async () => {
		console.log("Pressed stop");
		console.log("Sending data to server",JSON.stringify(coordinates));
		try {
			let result = await $.ajax({
				url: "/postData",
				type: "POST",
				data: JSON.stringify(coordinates),
				dataType: 'json',
				async: true
			}).promise();
		} catch (e) {
			if (e && (!e.status || e.status != 200) ) {
				console.error("Unable to save data to server, coords are not being deleted",e);
				return;
			}
		}

		console.log("Saved data to server");
		coordinates.length = 0;
		updateSendButton();
	});

	window.addEventListener("fingerTouch",(evt) => {
		const fingerTouchDetails = evt.detail;
		coordinates.push(fingerTouchDetails);
		updateSendButton();
		console.log("Touch",JSON.stringify(fingerTouchDetails));
	});

	['A','B'].forEach(buttonId => {
		const elem = $('#' + buttonId);

		/*
			DRAW BUTTONS
		*/
		var ctx=elem[0].getContext("2d");
		let buttonRadius = 100;
		let buttonColor = "#EF5B5B";

		let canvasSize = {x:elem[0].width,y:elem[0].height};
		let buttonDistance = canvasSize.x*0.25;

		let center = {x:0,y:0};
		var numButtons = buttonId == "A" ? 4 : 5;
		for (let i=0;i<numButtons;i++) {

			var degree = i/numButtons*Math.PI*2;
			center.x = Math.sin(degree)*buttonDistance + canvasSize.x*0.5;
			center.y = Math.cos(degree)*buttonDistance + canvasSize.y*0.5;
			ctx.beginPath();
			ctx.arc(center.x,center.y,buttonRadius,0,2*Math.PI);
			ctx.fillStyle = buttonColor;
			ctx.fill();
		}


		/*
			REGISTER TOUCH EVENTS AND CALCULATE RELATIVE COORDINATES
		*/
		let buttonSize = __.Element.size(elem[0],true)

		elem.addTouchEvent("touchstart",function(evt) {
			let coords = evt.touch.getRelativeCoordinates().coordinates;

			//NORMALIZE COORDS
			coords.x/=buttonSize.x;
			coords.y/=buttonSize.y;

			//DETERMINE FREQ AND MAKE A BEEP
			let freq = (coords.y*800) + 200;
			beep(freq);
			evt.preventDefault();

			//DISPATCH EVENT WITH DATA FOR RECORDING
			window.dispatchEvent(new CustomEvent("fingerTouch",{detail:{
				buttonId,coords,time:Date.now(),freq
			}}));
		});
	});
});