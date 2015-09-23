//==================
// physics
//==================

function ulAuxilaryData(route, data){
	// determine charge states, A/Q values, companions and plots from A and Z.
	var url, path, i, A, Z, beamMass, chargeStates, companions;

	//extract the base URL where this page is found.
	// url = window.location.protocol + "//" + window.location.host 
	// path = window.location.pathname.split('/').slice(0,-1);
	// for(i=0; i<path.length; i++){
	// 	url += path[i] + '/'
	// }

	A = parseInt(data.A);
	Z = species2z(data.species);
	beamMass = dataStore.masses[Z][''+A];

	//determine what charge states can be accelerated, and the corresponding A/Q
	chargeStates = validChargeStates(Z, beamMass);
	//for every accepted charge state, generate both lists of companions and append to the corresponding object,
	//and generate information needed for plots
	for(i=0; i<chargeStates.length; i++){
		companions = listCompanions(chargeStates[i].q, beamMass)
		chargeStates[i]['csbCompanions'] = companions[0];
		chargeStates[i]['otherCompanions'] = companions[1];
		determineIntensityParameters(beamMass, chargeStates[i].q, A, data.species )
	}

	if(route == "{{species}}/{{A}}"){
		return {'chargeStates': chargeStates }
	}
	return {}
}

function validChargeStates(Z, beamMass){
	// determine valid charge states, and corresponding A/Q.

	var i, massToCharge, chargeStates;
	
	chargeStates = [];

	for(i=1; i<=Z; i++){
		massToCharge = (beamMass - i*dataStore.eMass)/i;
	
		if( (massToCharge > 4.9) && (massToCharge <= 7) ){
			chargeStates[chargeStates.length] = {"q":i, "aOverQ":massToCharge.toFixed(3)};
		}
	}

	return chargeStates;
}

function listCompanions(beamQ, beamMass){
	//generate two lists: one of likely companions, and one of possible companions.

	var i, j, mass, massToCharge, csbCompanions, otherCompanions, csbFlag, data,
		beamMassToCharge = (beamMass - beamQ*dataStore.eMass)/beamQ;

	csbCompanions = [];
	otherCompanions = [];

	for(i=0; i<dataStore.stableZ.length; i++){
		mass = dataStore.masses[dataStore.stableZ[i]][''+dataStore.stableA[i]]
		for(j=1; j<dataStore.stableZ[i]; j++){
			massToCharge = (mass - j*dataStore.eMass)/j;

			if( (massToCharge > beamMassToCharge*(1-0.5/dataStore.magnetResolution)) &&
				(massToCharge < beamMassToCharge*(1+0.5/dataStore.magnetResolution))) {

				csbFlag = false;
				if(dataStore.linerSpecies[dataStore.liner].indexOf(dataStore.stableZ[i]) != -1){
					csbFlag = true;
				}

				data = {
					'compA': dataStore.stableA[i],
					'compSpecies': dataStore.elements[dataStore.stableZ[i]],
					'compQ': j,
					'compAoverQ': massToCharge.toFixed(3)
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

function determineIntensityParameters(beamMass, chargeState, A, species){
	// determine the various parameters needed to draw an A/Q vs. Intensity plot.

	var AQ, AQmin, AQmax, intensityMin, intensityMax,			//plot ranges
		i, idxIntensityMin, idxIntensityMax, idxAQlower,		//array indices
		bkgIntensity, AQpoints, dygraphData,					//data arrays
		magLow, magHigh;										//magnet acceptance

	AQ = (beamMass - chargeState*dataStore.eMass) / chargeState;
	AQmin = AQ*(1 - 1 / dataStore.magnetResolution);
	AQmax = AQ*(1 + 1 / dataStore.magnetResolution);
	intensityMin = 1e-6;
	intensityMax = 1e-13;
	idxIntensityMin = -1;
	idxIntensityMax = -1;
	AQpoints = [];
	bkgIntensity = [];

	for(i=0; dataStore.bkgAQ[i] < AQmax; i++){
		//omit things off the bottom of the AQ scale
		if(dataStore.bkgAQ[i] < AQmin){
			idxAQlower = i;
			continue;
		}

		//log intensities and corresponding A/Q values in range, keep minimum and maximum intensity updated
		AQpoints[AQpoints.length] = dataStore.bkgAQ[i];
		bkgIntensity[bkgIntensity.length] = dataStore.bkgIntensity[i];
		if(dataStore.bkgIntensity[i] < intensityMin){
			intensityMin = dataStore.bkgIntensity[i];
			idxIntensityMin = i;
		} else if(dataStore.bkgIntensity[i] > intensityMax){
			intensityMax = dataStore.bkgIntensity[i];
			idxIntensityMax = i;
		}
	}

	//determine magnet acceptance region
	magLow  = AQ*(1 - 0.5 / dataStore.magnetResolution);
	magHigh = AQ*(1 + 0.5 / dataStore.magnetResolution);

	//log data for consumption by dygraphs later
	dataStore.plotData[A+species+chargeState] = {
		'data': arrangePoints(AQpoints, bkgIntensity),
		'magLow': magLow,
		'magHigh': magHigh,
		'xMin': AQmin,
		'xMax': AQmax,
		'yMin': intensityMin/10,
		'yMax': intensityMax*10
	}


}

function drawAQvsIntensity(divID){
	//plot intensity versus AQ in a div#divID, and show magnet transmission region

	var data = dataStore.plotData[divID];

	dataStore.plots[divID] = new Dygraph(
	    // containing div
	    document.getElementById('fig'+divID),

	    // data
	    data.data,

	    //style
	    {
	    	labels: ['A/Q', 'Intensity'],
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
	    			pixelsPerLabel: 30,
	    		},
	    		y:{
	    			valueRange:[data.yMin, data.yMax],
	    			axisLabelWidth: 100
	    		}
	    	},
	    	//draw shaded magnet region
	    	underlayCallback: function(canvas, area, g) {

	            canvas.fillStyle = "rgba(255, 255, 102, 1.0)";

	            function highlight_period(x_start, x_end) {
	             	var canvas_left_x = g.toDomXCoord(x_start);
	             	var canvas_right_x = g.toDomXCoord(x_end);
	             	var canvas_width = canvas_right_x - canvas_left_x;
	             	canvas.fillRect(canvas_left_x, area.y, canvas_width, area.h);
	             	canvas.font = "16px sans-serif";
	             	canvas.fillStyle = '#000000';
	             	canvas.fillText('Transmitted', canvas_left_x, area.y+16)
	            }

				highlight_period(data.magLow,data.magHigh);            
            }
	    }
	);

	prepImageSave(divID)
}

//=================================
// ultralight pageload callback
//=================================

function ulCallback(){
	//runs after ultralight is finished setting up the page.
	var key;

	for(key in dataStore.plotData){
		drawAQvsIntensity(key);
	}


	return 0
}