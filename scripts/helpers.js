// =========================
// plot to png wrangling
// =========================

function savePlot(id){
	//Somewhat convoluted exercise to make dygraphs saveable as png...

	var link = document.getElementById('savePlot'+id)

	link.href = getBase64Image(document.getElementById('pngDump'+id));
	link.click();

}

//generate a hidden image and send its data uri to the appropriate place for saving:
function prepImageSave(id){
	var dygraph = dataStore.plots[id];

	var options = {
	    //Texts displayed below the chart's x-axis and to the left of the y-axis 
	    titleFont: "bold 30px sans-serif",
	    titleFontColor: "black",

	    //Texts displayed below the chart's x-axis and to the left of the y-axis 
	    axisLabelFont: "bold 24px sans-serif",
	    axisLabelFontColor: "black",

	    // Texts for the axis ticks
	    labelFont: "normal 18px sans-serif",
	    labelFontColor: "black",

	    // Text for the chart legend
	    legendFont: "bold 18px sans-serif",
	    legendFontColor: "black",

	    legendHeight: 0    // suppress legend
	};

	Dygraph.Export.asPNG(dygraph, document.getElementById('pngDump'+id), options);
}

function getBase64Image(img) {

    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    return canvas.toDataURL();
}

// =========================
// helpers
// =========================

function species2z(species){
	chem = chemCase(species);
	return dataStore.elements.indexOf(chem); 
}

function chemCase(word){
	//take a string and ensure that the first, and only the first, character is capitalized.
	str = word.toLowerCase()
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function arrangePoints(x, y){
	//take two equal length arrays x, y and return an array of points suitable for dygraphs, ie
	// [ [x[0], y[0]], [x[1], y[1]]...  ]
	var i, data = []

	for(i=0; i<x.length; i++){
		data[data.length] = [x[i], y[i]]
	}

	return data;
}

function HTMLement(A, Q, species){
	// return an HTML formatted element with mass and charge state.

	var html = '<sup>'+A+'</sup>' + species;
	html += '<sup>'+Q+'+</sup>';

	return html
}

function drawEllipse(context, centerX, centerY, width, height, fill) {
	//fill true = fill ellipse, fill false = otline ellipse.
	//thx http://www.williammalone.com/briefs/how-to-draw-ellipse-html5-canvas/	
 	context.beginPath();
 	context.moveTo(centerX, centerY - height/2); // A1
  
 	context.bezierCurveTo(
    	centerX + width/2, centerY - height/2, // C1
    	centerX + width/2, centerY + height/2, // C2
    	centerX, centerY + height/2); // A2

  	context.bezierCurveTo(
    	centerX - width/2, centerY + height/2, // C3
    	centerX - width/2, centerY - height/2, // C4
    	centerX, centerY - height/2); // A1
 
 	if(fill)
		context.fill();
	else
		context.stroke();
	context.closePath();	
}

// ==================
// physics
// ==================

function determineAQ(mass, Q){

	var AQ;

	if(dataStore.energyLoss > 0){
		AQ = (mass-Q*dataStore.eMass)/Q * Math.sqrt(1.0-(dataStore.energyLoss/100)) ;
	} else{
		AQ = (mass-Q*dataStore.eMass)/Q;
	}

	return AQ
}