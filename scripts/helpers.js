// =========================
// dygraphs auxiliary
// =========================

function savePlot(id, linkPrefix, imgPrefix, legendHeight){
	//Somewhat convoluted exercise to make dygraphs saveable as png...

	var link = document.getElementById(linkPrefix+id);
	prepImageSave(id, imgPrefix, legendHeight)
	link.href = document.getElementById(imgPrefix+id).getAttribute('src');
	link.click();

}

//generate a hidden image and send its data uri to the appropriate place for saving:
function prepImageSave(id, imgPrefix, legendHeight){
	var dygraph = dataStore.plots[imgPrefix + id];

	var options = {
	    //Texts displayed below the chart's x-axis and to the left of the y-axis 
	    titleFont: "bold 30px sans-serif",
	    titleFontColor: "black",

	    //Texts displayed below the chart's x-axis and to the left of the y-axis 
	    axisLabelFont: "bold 20px sans-serif",
	    axisLabelFontColor: "black",

	    // Texts for the axis ticks
	    labelFont: "normal 18px sans-serif",
	    labelFontColor: "black",

	    // Text for the chart legend
	    legendFont: "bold 18px sans-serif",
	    legendFontColor: "black",

	    legendHeight: legendHeight
	};

	Dygraph.Export.asPNG(dygraph, document.getElementById(imgPrefix+id), options);
}

//deprecated - unnecessary?
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

function chargeStateArray(Zs, beamEnergy, id){
	//generate an array of points for Dygraphs to plot describing the charge state fraction for the element in question
	//also generate a csv of the same, on the dataStore.
	//Zs is an array of Z values to generate points for.

	var points = [];
	var thisPoint = [];
	var qMin = 1000;
	var qMax = 0;
	var i, j, qCenter, qWidth, CSF;
	var csv = '# charge state fractions as a function of Z and q\n';
	csv += '# column headers == Z\n';
	csv += '# beam energy = ' + beamEnergy + ' MeV / nucleon\n';
	csv += 'Charge State';

	//determine a sensible maximum range of data
	for(i=0; i<Zs.length; i++){
		qCenter = meanChargeState(Zs[i], dataStore.beamEnergy);
		qWidth = chargeStateWidth(Zs[i], dataStore.beamEnergy);

		qMin = Math.min(qMin, qCenter - 5*qWidth);
		qMax = Math.max(qMax, qCenter + 5*qWidth);

		//also finish the header row of the csv:
		csv += ', ' + Zs[i];
	}
	qMin = Math.floor(qMin);
	qMax = Math.ceil(qMax);
	csv += '\n';

	for(i=qMin; i<qMax; i++){
		thisPoint = [i];
		csv += i;
		for(j=0; j<Zs.length; j++){
			CSF = chargeStateFraction(Zs[j], beamEnergy, i)
			thisPoint.push(CSF);
			csv += ', ' + CSF;
		}
		points.push(thisPoint);
		csv += '\n';
	}

	dataStore.chargeStateFractionCSV[id] = csv;
	return points;

}

function saveCSV(linkID){
	console.log(linkID)
	document.getElementById(linkID).click();
}

// =========================
// generic helpers
// =========================

function species2z(species){
	var chem = chemCase(species);
	return dataStore.elements.indexOf(chem); 
}

function chemCase(word){
	//take a string and ensure that the first, and only the first, character is capitalized.
	var str = word.toLowerCase()
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function arrangePoints(x, y, flags){
	//take two equal length arrays x, y and return an array of points suitable for dygraphs, ie
	// [ [x[0], y[0]], [x[1], y[1]]...  ]
	//flags is another array indicating different data series; 
	//for every distinct flag, there will be another column in the inner arrays; a given column will contain only values sharing a flag, or null.
	// example: arrangePoints( [0,1,2,3], [10,11,12,13], [1,2,1,2]) returns:
	// [
	// 		[0,10,null],
	// 		[1,null,11],
	//      [2,12,null],
	//      [3,null,13] 
	// ]

	var copyFlags = []
	var uniqueFlags;
	var i, j, series, data = [];
	var row = [];

	for(i=0; i<flags.length; i++){
		copyFlags.push(flags[i]);
	}
	uniqueFlags = Array.from(new Set(flags.sort()));

	for(i=0; i<x.length; i++){
		row = [x[i]];
		series = uniqueFlags.indexOf(copyFlags[i]);
		for(j=0; j<uniqueFlags.length; j++){
			if(j == series)
				row.push(y[i]);
			else
				row.push(null);
		}
		data.push(row);
	}

	return data;
}

function HTMLement(A, Q, species){
	// return an HTML formatted element with mass and charge state.

	var html = '<strong><sup>'+A+'</sup>' + species;
	html += '<sup>'+Q+'+</sup></strong>';

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
	context.stroke();
	context.closePath();	
}

function ensureUniqueList(list){
	//given a list of companions like those returned by the list* functions in stripingFoil.js,
	//sort + unique that list.

	var i;

	list.sort(function(a,b){
		if(a.compZ > b.compZ) return 1;
		else if(a.compZ < b.compZ) return -1;
		else return 0
	})
	i=0;
	while(i<list.length-1){
		if(list[i].compZ == list[i+1].compZ)
			list.splice(i,1);
		else
			i++
	}
}

function generateElementLabels(Zs){
	//given an array of Zs, return an array of corresponding element symbols

	var i, 
		symbols = [];

	for(i=0; i<Zs.length; i++){
		symbols.push(dataStore.elements[Zs[i]])
	} 

	return symbols
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

function validChargeStates(Z, beamMass){
	// determine charge states that can be delivered to ISAC II

	var i, AQ, chargeStates;
	
	chargeStates = [];

	for(i=1; i<=Z; i++){
		AQ = (beamMass - i*dataStore.eMass)/i;
	
		if( (AQ > dataStore.ISACIIminAQ) && (AQ <= dataStore.ISACIImaxAQ) ){
			chargeStates.push({"q":i, "AQ":AQ.toFixed(3)});
		}
	}

	return chargeStates;
}

function chargeStateFraction(Z, beamEnergy, q){
	//Y. Baudinet-Robinet, Nucl. Instrum. Methods 190, 197 (1981)
	//what charge state fraction (in %) will Z ions of charge q occupy, with a beam of beamEnergy MeV/nucleon?

	var j, fraction, sum, height, s, meanQ;

	s = chargeStateWidth(Z, beamEnergy);
	meanQ = meanChargeState(Z, beamEnergy);

	j = 0;
	fraction = 0;
	sum = 0;

	while(fraction < 0.001){
		fraction = Math.exp((-1.0*(Math.pow(j-meanQ,2)))/(2.0*s*s));
		j++;
	}

	while(fraction >= 0.001){
     	fraction = Math.exp((-1.0*(Math.pow(j-meanQ,2)))/(2.0*s*s));
     	sum += fraction;
     	j++;		
	}

  	// Sum of charge state fractions must equal 1.0 so normalize the height of the mean charge state fraction appropriately.
  	height = 1/sum;
 	fraction = height*Math.exp((-1.0*(Math.pow(q-meanQ,2)))/(2.0*s*s));
  	fraction *= 100;

  	return fraction;
}

function meanChargeState(Z, beamEnergy){
	//V.S. Nikolaev and I.S. Dmitriev, Phys. Lett. A28, 277 (1968)

	var x, meanQ;

	x = 3.86*Math.sqrt(beamEnergy)/Math.pow(Z,0.45);
	meanQ = Z*Math.pow( (1+Math.pow(x,(-1/0.6))), -0.6);

	return meanQ

}

function chargeStateWidth(Z, beamEnergy){
	//V.S. Nikolaev and I.S. Dmitriev, Phys. Lett. A28, 277 (1968)

	var meanQ = meanChargeState(Z, beamEnergy)
	return 0.5*Math.pow( (meanQ*(1-Math.pow( (meanQ/Z), (1/0.6)))), 0.5); // for Z>20 <-- what about Z <=20?
}

function findSurfaceIonIsobars(A){
	//for a beam species with atomic mass A, find possible surface ionization isobars
	//return as an array of objects ex [{A:4, Z:2}, .....]
	//todo: will currently return absurd nuclei, 100-Li; be aware of drip lines

	var i, Z;
	var surfaceIons = [];

	for(i=0; i<dataStore.surfaceIonSpecies.length; i++){
		Z = dataStore.surfaceIonSpecies[i];
		if(Z > A)
			break;

		surfaceIons.push({
			'Z': Z,
			'A': A
		});
	}

	return surfaceIons

}

function findDecayChain(Z, A){
	//for a species with Z and A, identify beta decay chain daughters
	//examines isobars with Z+-1, moves to the lightest, terminates when both neighbours are heavier.

	var i;
	var daughters = []
	var z = Z;

	while(	dataStore.masses[z+1][''+(A)] < dataStore.masses[z][''+(A)] ||
			dataStore.masses[z-1][''+(A)] < dataStore.masses[z][''+(A)])
	{
		if(dataStore.masses[z+1][''+(A)] < dataStore.masses[z][''+(A)]){
			daughters.push({
				Z: z+1,
				A: A
			});
			z++;
		} else if (dataStore.masses[z-1][''+(A)] < dataStore.masses[z][''+(A)]){
			daughters.push({
				Z: z-1,
				A: A
			});
			z--;			
		}
	}

	return daughters;
}

/////////////////////////
// resize management
/////////////////////////

function resizeFinished(){
    if (new Date() - dataStore.lastResize < 100) {
        setTimeout(resizeFinished, 100);
    } else {
        dataStore.timeout = false;
        pageload();
    } 
}










