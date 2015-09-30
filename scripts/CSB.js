function auxilaryCSBdata(data){
	// determine charge states, A/Q values, companions and plots from A and Z.
	var url, path, i, A, Z, beamMass, chargeStates, companions;

	dataStore.routeData = data;
	A = parseInt(data.A);
	Z = species2z(data.species);
	beamMass = dataStore.masses[Z][''+A];

	//determine what charge states can be accelerated, and the corresponding A/Q
	chargeStates = validChargeStates(Z, beamMass);
	//for every accepted charge state, generate both lists of companions and append to the corresponding object,
	//and generate information needed for plots
	for(i=0; i<chargeStates.length; i++){
		companions = listCompanions(chargeStates[i].q, beamMass);
		chargeStates[i]['csbCompanions'] = companions[0];
		chargeStates[i]['otherCompanions'] = companions[1];
		determineIntensityParameters(beamMass, chargeStates[i].q, A, data.species);
		chargeStates[i]['meanCurrent'] = meanCurrent(A, chargeStates[i].q, data.species).toPrecision(3);
	}

	return {
		'chargeStates': chargeStates,
		'liner': dataStore.liner,
		'CSBmagnetResolution': dataStore.CSBmagnetResolution,
		'magnetAcceptance': dataStore.magnetAcceptance*100, //ie in percent
		'ISACmin': dataStore.ISACIIminAQ,
		'ISACmax': dataStore.ISACIImaxAQ
	}
}

function listCompanions(Q, beamMass){
	//generate two lists: one of likely companions, and one of possible companions.

	var i, j, companionMass, companionAQ, csbCompanions, otherCompanions, csbFlag, data,
		AQ = (beamMass - Q*dataStore.eMass)/Q;

	csbCompanions = [];
	otherCompanions = [];

	//loop over all possible companions
	for(i=0; i<dataStore.stableZ.length; i++){
		companionMass = dataStore.masses[dataStore.stableZ[i]][''+dataStore.stableA[i]]
		//loop over all possible charge states of this companion
		for(j=1; j<dataStore.stableZ[i]; j++){
			companionAQ = (companionMass - j*dataStore.eMass)/j;

			if( (companionAQ > AQ*(1-0.5/dataStore.CSBmagnetResolution)) &&
				(companionAQ < AQ*(1+0.5/dataStore.CSBmagnetResolution))) {

				//is this companion likely to come from the CSB?
				csbFlag = false;
				if(dataStore.linerSpecies[dataStore.liner].indexOf(dataStore.stableZ[i]) != -1){
					csbFlag = true;
				}

				data = {
					'compA': dataStore.stableA[i],
					'compSpecies': dataStore.elements[dataStore.stableZ[i]],
					'compQ': j,
					'compAoverQ': companionAQ.toFixed(3)
				}

				if(csbFlag)
					csbCompanions[csbCompanions.length] = data;
				else
					otherCompanions[otherCompanions.length] = data;
			}
		}
	}

	return [csbCompanions, otherCompanions]
}

function determineIntensityParameters(beamMass, Q, A, species){
	// determine the various parameters needed to draw an A/Q vs. Intensity plot.

	var AQ, AQmin, AQmax, intensityMin, intensityMax,			//plot ranges
		i, idxAQlower,		//array indices
		bkgIntensity, AQpoints, dygraphData,					//data arrays
		magLow, magHigh;										//magnet acceptance

	AQ = (beamMass - Q*dataStore.eMass) / Q;
	AQmin = AQ*(1 - 1 / dataStore.CSBmagnetResolution);
	AQmax = AQ*(1 + 1 / dataStore.CSBmagnetResolution);
	intensityMin = 1e-6;
	intensityMax = 1e-13;
	AQpoints = [];
	bkgIntensity = [];
	flags = [];

	for(i=0; dataStore.bkgAQ[i] < AQmax; i++){
		//omit things off the AQ scale
		if(dataStore.bkgAQ[i] < AQmin || dataStore.bkgAQ[i] > AQmax){
			continue;
		}

		//log intensities and corresponding A/Q values in range, keep minimum and maximum intensity updated
		AQpoints.push(dataStore.bkgAQ[i]);
		bkgIntensity.push(dataStore.bkgIntensity[i]);
		flags.push(0)
		if(dataStore.bkgIntensity[i] < intensityMin){
			intensityMin = dataStore.bkgIntensity[i];
		} else if(dataStore.bkgIntensity[i] > intensityMax){
			intensityMax = dataStore.bkgIntensity[i];
		}
	}

	//determine magnet acceptance region
	magLow  = AQ*(1 - 0.5 / dataStore.CSBmagnetResolution);
	magHigh = AQ*(1 + 0.5 / dataStore.CSBmagnetResolution);

	//log data for consumption by dygraphs later
	dataStore.plotData[A+species+Q] = {
		'data': arrangePoints(AQpoints, bkgIntensity, flags),
		'magLow': magLow,
		'magHigh': magHigh,
		'yMin': intensityMin/10,
		'yMax': intensityMax*10,
		'title' : HTMLement(A, Q, species)
	}
}

function meanCurrent(A, Q, species){
	//calculate the mean current in the magnet acceptance window for this species.

	var magLow = dataStore.plotData[A+species+Q].magLow;
	var magHigh = dataStore.plotData[A+species+Q].magHigh;
	var data = dataStore.plotData[A+species+Q].data;
	var i, thisAQ, thisCurrent, meanCurrent, nPoints;

	meanCurrent = 0;
	nPoints = 0;
	for(i=0; i<data.length; i++){
		thisAQ = data[i][0];
		thisCurrent = data[i][1];
		if(thisAQ >= magLow && thisAQ <= magHigh){
			meanCurrent += thisCurrent;
			nPoints++;
		}
	}

	nPoints = Math.max(nPoints, 1);
	return meanCurrent / nPoints;
}

function drawAQvsIntensity(divID){
	//plot intensity versus AQ in a div#divID, and show magnet transmission region

	var data = dataStore.plotData[divID];
	var width = document.getElementById('wrap'+divID).offsetWidth;
	var height = 32/48*width;

	dataStore.plots['pngDump'+divID] = new Dygraph(
	    // containing div
	    document.getElementById('fig'+divID),

	    // data
	    data.data,

	    //style
	    {	
	    	title: data.title,
	    	labels: ['A/Q', 'Intensity'],
	    	width: width,
	    	height: height,
	    	strokeWidth: 0.0,
	    	drawPoints: true,
	    	xlabel: 'A/Q',
	    	ylabel: 'Intensity (A)',
	 		xRangePad: 10,
	    	logscale: true,
	    	pointSize: 3,
	    	highlightCircleSize: 4,
	    	axes:{
	    		x:{
	    			pixelsPerLabel: 50,
	    			axisLabelFormatter: function(number, granularity, opts, dygraph){
	    				return number.toFixed(3);
	    			}
	    		},
	    		y:{
	    			valueRange:[data.yMin, data.yMax],
	    			axisLabelWidth: 100,
	    		}
	    	},
	    	//draw shaded magnet region
	    	underlayCallback: function(canvas, area, g) {

	    		var xMin = g.toDomXCoord(data.magLow);
	    		var xMax = g.toDomXCoord(data.magHigh);
	    		var transmissionWidth = xMax - xMin;

	            canvas.fillStyle = "rgba(255, 255, 102, 1.0)";
	            canvas.fillRect(xMin, area.y, transmissionWidth, area.h);
	            canvas.font = "16px sans-serif";
	            canvas.fillStyle = '#000000';
	            canvas.fillText('Transmitted', xMin, area.y+16);           
            },
            zoomCallback: function(minDate, maxDate, yRanges){
            	prepImageSave(divID, 'pngDump', 0);
            }
	    }
	);

	prepImageSave(divID, 'pngDump', 0);
}

//=================================
// ultralight pageload callback
//=================================

function pageload(){
	//runs after ultralight is finished setting up the page.
	var key, isotope;

	for(key in dataStore.plotData){
		drawAQvsIntensity(key);
	}

	return 0
}