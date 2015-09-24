function ulAuxilaryData(route, data){

	var A, Z, qOriginal, chargeStates, beamMass, i, companions, AQoriginal;

	A = parseInt(data.A);
	Z = species2z(data.species);
	qOriginal = parseInt(data.qOriginal);
	beamMass = dataStore.masses[Z][''+A];
	AQoriginal = (beamMass - qOriginal*dataStore.eMass)/qOriginal

	//what other charge states of the beam species are going to show up, in addition to the original selected?
	chargeStates = beamChargeStates(Z, beamMass, qOriginal);

	//for every accepted charge state, generate both lists of companions and append to the corresponding object,
	//and generate information needed for plots
	for(i=0; i<chargeStates.length; i++){
		companions = listCompanions(qOriginal, beamMass, chargeStates[i].q);
		chargeStates[i]['csbCompanions'] = companions[0];
		chargeStates[i]['otherCompanions'] = companions[1];
		determinePlotParameters(chargeStates[i].q, A, data.species, companions[0], chargeStates[i].AQprecise, AQoriginal)
	}

	if(route == "{{species}}/{{A}}/{{qOriginal}}"){
		return {
			'chargeStates': chargeStates,
			'AQoriginal': AQoriginal.toFixed(3)
		}
	}
	return {}
}

function beamChargeStates(Z, beamMass, qOriginal){
	//determine charge states and corresponding charge fractions, A/Q 
	//for beam of Z and beamMass, originally filtered for charge state qOriginal

	var i, x, s, meanQ, qFraction, AQ,
		chargeStates = [];

	for(i=qOriginal; i<=Z; i++){
		qFraction = chargeStateFraction(Z, dataStore.beamEnergy, i)
		if(i>qOriginal && qFraction<0.5) continue;

		AQ = determineAQ(beamMass, i)

		chargeStates.push(
			{
				'q': i,
				'chargeFraction': qFraction.toFixed(1),
				'AQ': AQ.toFixed(3),
				'AQprecise': AQ
			});
	}

	return chargeStates
}

function chargeStateFraction(Z, beamEnergy, q){
	//citation needed

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
  	fraction = Math.exp((-1.0*(Math.pow(meanQ-meanQ,2)))/(2.0*s*s)); // <-- soooo.... 1?
  	height = fraction/sum;
 	fraction = height*Math.exp((-1.0*(Math.pow(q-meanQ,2)))/(2.0*s*s));
  	fraction *= 100;

  	return fraction;
}

function meanChargeState(Z, beamEnergy){
	//citation needed

	var x, meanQ;

	x = 3.86*Math.sqrt(beamEnergy)/Math.pow(Z,0.45);
	meanQ = Z*Math.pow( (1+Math.pow(x,(-1/0.6))), -0.6);

	return meanQ

}

function chargeStateWidth(Z, beamEnergy){
	//citation needed

	var meanQ = meanChargeState(Z, beamEnergy)
	return 0.5*Math.pow( (meanQ*(1-Math.pow( (meanQ/Z), (1/0.6)))), 0.5); // for Z>20 <-- what about Z <=20?
}

function chargeStateArray(Zs, beamEnergy){
	//generate an array of points for Dygraphs to plot describing the charge state fraction for the element in question
	//Zs is an array of Z values to generate points for.

	var points = [];
	var thisPoint = [];
	var qMin = 1000;
	var qMax = 0;
	var i, j, qCenter, qWidth;

	//determine a sensible maximum range of data
	for(i=0; i<Zs.length; i++){
		qCenter = meanChargeState(Zs[i], dataStore.beamEnergy);
		qWidth = chargeStateWidth(Zs[i], dataStore.beamEnergy);

		qMin = Math.min(qMin, qCenter - 5*qWidth);
		qMax = Math.max(qMax, qCenter + 5*qWidth);
	}
	qMin = Math.floor(qMin);
	qMax = Math.ceil(qMax)

	for(i=qMin; i<qMax; i++){
		thisPoint = [i];
		for(j=0; j<Zs.length; j++){
			thisPoint.push(chargeStateFraction(Zs[j], beamEnergy, i))
		}
		points.push(thisPoint);
	}

	return points;

}

function listCompanions(beamQ, beamMass, chargeState){
	//generate two lists: one of likely companions, and one of possible companions.

	var csbCompanions, otherCompanions,
		thisAQ, thisMass, csbFlag, data, beamAQ,
		stables, i, j;

	csbCompanions = [];
	otherCompanions = [];
	beamAQ = determineAQ(beamMass, chargeState);

	//find stable isotopes that came through the first selection criteria
	stables = stableCompanions(beamQ, beamMass)

	for(i=0; i<stables.Z.length; i++){
		thisMass = dataStore.masses[stables.Z[i]][''+stables.A[i]];

		for(j=1; j<stables.Z[i]; j++){
			thisAQ = determineAQ(thisMass, j);

			if( thisAQ > (beamAQ-(beamAQ*(0.5/25))) && 
				thisAQ < (beamAQ+(beamAQ*(0.5/25))) && 
				aqPreCheck(stables.A[i], stables.Z[i], beamMass, beamQ) 
			){

				//is this background coming from the CSB?
				csbFlag = false;
				if(dataStore.linerSpecies[dataStore.liner].indexOf(stables.Z[i]) != -1){
					csbFlag = true;
				}

				data = {
					'compA': stables.A[i],
					'compSpecies': dataStore.elements[stables.Z[i]],
					'compQ': j,
					'compAoverQ': thisAQ.toFixed(3),
					'compAoverQprecise': thisAQ,
					'compCSB_AoverQ': (thisMass-j*dataStore.eMass)/stables.Q[i]
				}

				if(csbFlag)
					csbCompanions.push(data);
				else
					otherCompanions.push(data);
			}
		}
	}
	return [csbCompanions, otherCompanions];
}

function stableCompanions(beamQ, beamMass){
	//find lists of all stable companions that can sneak through the magnet with the main species & charge state selected

	var i, j, mass, massToCharge,
		stableA, stableZ, stableQ,
		beamMassToCharge = (beamMass - beamQ*dataStore.eMass)/beamQ;

	stableA = [];
	stableZ = [];
	stableQ = [];

	//loop over all possible stable companions
	for(i=0; i<dataStore.stableZ.length; i++){
		mass = dataStore.masses[dataStore.stableZ[i]][''+dataStore.stableA[i]]
		//loop over charge states for this companion
		for(j=1; j<dataStore.stableZ[i]; j++){
			massToCharge = (mass - j*dataStore.eMass)/j;

			if( (massToCharge > beamMassToCharge*(1-0.5/dataStore.magnetResolution)) &&
				(massToCharge < beamMassToCharge*(1+0.5/dataStore.magnetResolution))
			){
				stableA.push(dataStore.stableA[i]);
				stableZ.push(dataStore.stableZ[i]);
				stableQ.push(j)
			}
		}
	}

	return {"A": stableA, "Z": stableZ, "Q": stableQ}
}

function aqPreCheck(A, Z, beamMass, beamQ){
	//A/Q test pre-check

	var mass, thisAQ, beamAQ,
		i,
		passed = false;

	mass = dataStore.masses[Z][''+A];
	beamAQ = (beamMass - dataStore.eMass*beamQ) / beamQ;

	for(i=1; i<Z; i++){
		thisAQ = (mass - i*dataStore.eMass)/i;
		passed = passed || (thisAQ > beamAQ - beamAQ*(0.5/dataStore.magnetResolution)) && (thisAQ < beamAQ + beamAQ*(0.5/dataStore.magnetResolution))
	}

	return passed;

}

function determinePlotParameters(chargeState, A, species, companionData, SEBTwindowCenter, CSBwindowCenter){
	//construct input data and parameters for the plot

	var i, CSB, SEBT, strippedCharge, massToCharge = [];

	for(i=0; i<companionData.length; i++){
		massToCharge.push({
			CSB: companionData[i].compCSB_AoverQ,
			SEBT: companionData[i].compAoverQprecise,
			species: companionData[i].compSpecies,
			A: companionData[i].compA,
			Q: companionData[i].compQ
		})
	}

	//add the species of interest to the list
	massToCharge.push({
		CSB: CSBwindowCenter,
		SEBT: SEBTwindowCenter,
		species: species,
		A: A,
		Q: chargeState
	});

	//dygraphs expects sorted input
	massToCharge.sort(function(a, b){
	    // Compare the 2 dates
	    if(a.CSB < b.CSB) return -1;
	    if(a.CSB > b.CSB) return 1;
	    return 0;
	});

	//extract data back into two arrays:
	CSB = [];
	SEBT = [];
	strippedCharge = [];
	for(i=0; i<massToCharge.length; i++){
		CSB.push(massToCharge[i].CSB);
		SEBT.push(massToCharge[i].SEBT);
		strippedCharge.push({
			A: massToCharge[i].A,
			Q: massToCharge[i].Q,
			species: massToCharge[i].species,
		})
	}

	dataStore.plotData[A+species+chargeState] = {
		'data': arrangePoints(CSB, SEBT),
		'SEBTwindowCenter': SEBTwindowCenter,
		'CSBwindowCenter': CSBwindowCenter,
		'strippedCharge': strippedCharge,
		'selectedMass': A
	}
}

function plotAcceptanceRegion(divID){
	//generate dygraph plotting A/Q at both selections

	var data = dataStore.plotData[divID];

	dataStore.plots[divID] = new Dygraph(
	    // containing div
	    document.getElementById('fig'+divID),

	    // data
	    data.data,

	    //style
	    {
	    	labels: ['CSB-DSB', 'DSB-SEBT'],
	    	labelsDiv: 'legend' + divID,
	    	valueFormatter: function(num, opts, seriesName, dygraph, row, col){

	    		var species = HTMLement(data.strippedCharge[row].A, data.strippedCharge[row].Q, data.strippedCharge[row].species)

	    		if(col == 0)
		    		return species + ': ' +  seriesName + ': ' + num.toFixed(5);
		    	else 
		    		return num.toFixed(5);
	    	},
	    	hideOverlayOnMouseOut: false,
	    	strokeWidth: 0.0,
	    	drawPoints: true,
	    	xlabel: 'CSB-DSB',
	    	ylabel: 'DSB-SEBT',
	 		xRangePad: 10,
	    	pointSize: 3,
	    	highlightCircleSize: 2,
	    	digitsAfterDecimal: 5,
	    	axes:{
	    		x:{
	    			pixelsPerLabel: 30,
	    			axisLabelFormatter: function(number, granularity, opts, dygraph){
	    				return number.toFixed(3);
	    			}
	    		},
	    		y:{
	    			axisLabelWidth: 100,
	    			axisLabelFormatter: function(number, granularity, opts, dygraph){
	    				return number.toFixed(3);
	    			}
	    		}
	    	},
	    	//draw shaded A/Q acceptance regions
	    	underlayCallback: function(canvasContext, area, g){

	    		var xMin, xMax, yMin, yMax;

	            canvasContext.fillStyle = "rgba(243, 156, 18, 0.5)";

	            //RFQ pre-buncher A/Q window (x-axis)
	            xMin = g.toDomXCoord(data.CSBwindowCenter-(data.CSBwindowCenter*(0.5/400)));
	            xMax = g.toDomXCoord(data.CSBwindowCenter+(data.CSBwindowCenter*(0.5/400)));
	            canvasContext.fillRect(xMin, area.y, xMax - xMin, area.h);

	            //DSB pre-buncher A/Q window (y-axis)
	            yMin = g.toDomYCoord(data.SEBTwindowCenter-(data.SEBTwindowCenter*(0.5/200)));
	            yMax = g.toDomYCoord(data.SEBTwindowCenter+(data.SEBTwindowCenter*(0.5/200)));
	            canvasContext.fillRect(area.x, yMin, area.w, yMax-yMin);
           
            },
            //draw A/Q elipses around points
            drawPointCallback: function(g, seriesName, canvasContext, cx, cy, color, pointSize){
            	var AQres, xMin, yMin, xMax, yMax, width, height;

          		AQres = 0.002;
          		xMin = g.toDomXCoord(data.CSBwindowCenter - AQres);
          		xMax = g.toDomXCoord(data.CSBwindowCenter + AQres);
          		yMin = g.toDomYCoord(data.SEBTwindowCenter - AQres);
          		yMax = g.toDomYCoord(data.SEBTwindowCenter + AQres);
          		width = xMax - xMin;
          		height = yMax - yMin;

	            canvasContext.fillStyle = "rgba(1, 152, 117, 0.5)";
            	drawEllipse(canvasContext, cx, cy, width, height, true);
            }//,
            //custom point drawing callback doesn't un-draw properly on mouseout, omit for now.
            // drawHighlightPointCallback: function(g, seriesName, canvasContext, cx, cy, color, pointSize){
            // 	var AQres, xMin, yMin, xMax, yMax, width, height;

          		// AQres = 0.002;
          		// xMin = g.toDomXCoord(data.CSBwindowCenter - AQres);
          		// xMax = g.toDomXCoord(data.CSBwindowCenter + AQres);
          		// yMin = g.toDomYCoord(data.SEBTwindowCenter - AQres);
          		// yMax = g.toDomYCoord(data.SEBTwindowCenter + AQres);
          		// width = xMax - xMin;
          		// height = yMax - yMin;

            // 	canvasContext.strokeStyle = "rgba(1, 152, 117, 1)";
            // 	drawEllipse(canvasContext, cx, cy, width, height, false);
            // }

	    }
	);

	prepImageSave(divID, 'pngAcceptance', 0);

}

function identifyIsobars(mass, candidates){
	//candidates == array of objects: {A, Q, species}
	//returns array of Z values of candidates isobaric to mass.

	var i;
	var isobarZ = []

	for(i=0; i<candidates.length; i++){
		if(candidates[i].A == mass){
			isobarZ.push(dataStore.elements.indexOf(candidates[i].species));
		}
	}

	return isobarZ.sort()
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

function plotCSF(divID){
	//generate dygraph plotting A/Q at both selections

	var data = dataStore.plotData[divID];
	var Zs = identifyIsobars(data.selectedMass, data.strippedCharge);
	var labels = generateElementLabels(Zs);
	labels.unshift('Charge State');

	dataStore.plots[divID] = new Dygraph(
	    // containing div
	    document.getElementById('csf'+divID),

	    // data
	    chargeStateArray(Zs, dataStore.beamEnergy),

	    //style
	    {
	    	labels: labels,
	    	strokeWidth: 2,
	    	hideOverlayOnMouseOut: false,
	    	xlabel: 'Charge State',
	    	ylabel: '% of total',
	    	digitsAfterDecimal: 5,
	    	legend: 'always',
	    	labelsSeparateLines: true,
	    	labelsDivWidth: 100,
	    	// colors courtesy http://tools.medialab.sciences-po.fr/iwanthue/
	    	colors: [	"#7F6FC0",
						"#80CE4C",
						"#BF543A",
						"#596137",
						"#84CD9F",
						"#CFB253",
						"#C55983",
						"#9BADBD",
						"#503647",
						"#CA4FC8"
					],
	    	axes:{
	    		x:{
	    			pixelsPerLabel: 30,
	    		},
	    		y:{
	    			axisLabelWidth: 100,
	    		}
	    	}
	    }
	);

	prepImageSave(divID, 'pngCSF', 40);

}

function ulCallback(){
	//runs after ultralight is finished setting up the page.

	for(key in dataStore.plotData){
		plotAcceptanceRegion(key);
		plotCSF(key);
	}

	return 0
}