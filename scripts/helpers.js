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