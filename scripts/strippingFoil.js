function auxilaryFoilData(data){

	var A, Z, qOriginal, chargeStates, beamMass, i, companions, AQoriginal;

	A = parseInt(data.A);
	Z = species2z(data.species);
	qOriginal = parseInt(data.qOriginal);
	beamMass = dataStore.masses[Z][''+A];
	AQoriginal = (beamMass - qOriginal*dataStore.eMass)/qOriginal

	//what other charge states of the beam species are going to show up after the stripping foil?
	chargeStates = beamChargeStates(Z, beamMass, qOriginal);

	//for every post-foil charge state, generate both lists of companions and append to the corresponding object,
	//and generate information needed for plots
	for(i=0; i<chargeStates.length; i++){
		companions = listCompanions(qOriginal, beamMass, chargeStates[i].q);
		chargeStates[i]['csbCompanions'] = companions[0];
		chargeStates[i]['otherCompanions'] = companions[1];
		determinePlotParameters(chargeStates[i].q, A, data.species, companions[0], chargeStates[i].AQprecise, AQoriginal)
	}

	return {
		'chargeStates': chargeStates,
		'AQoriginal': AQoriginal.toFixed(3)
	}
}

function beamChargeStates(Z, beamMass, qOriginal){
	//determine charge states and corresponding charge fractions, A/Q
	//of ions found after a beam characterized by Z, beamMass and qOriginal passes through the stripping foil

	var i, qFraction, AQ,
		chargeStates = [];

	//loop from incident charge state to maximum charge state
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

function listCompanions(qOriginal, beamMass, chargeState){
	//generate two lists: one of likely companions, and one of possible companions,
	//for the post-foil chargeState of an ion with mass beamMass and CSB selected charge qOriginal

	var csbCompanions, otherCompanions,
		companionAQ, companionMass, csbFlag, data, chargeStateAQ,
		stables, i, j;

	csbCompanions = [];
	otherCompanions = [];
	chargeStateAQ = determineAQ(beamMass, chargeState);

	//find stable isotopes that came through the first selection criteria, and loop through
	stables = stableCompanions(qOriginal, beamMass)

	for(i=0; i<stables.Z.length; i++){
		companionMass = dataStore.masses[stables.Z[i]][''+stables.A[i]];

		//loop over all possible charge states of the companion:
		for(j=1; j<stables.Z[i]; j++){
			companionAQ = determineAQ(companionMass, j);

			if( companionAQ > (chargeStateAQ-(chargeStateAQ*(0.5/25))) && 
				companionAQ < (chargeStateAQ+(chargeStateAQ*(0.5/25))) //&& 
				//companionMagnetFilter(stables.A[i], stables.Z[i], beamMass, qOriginal)  //wouldn't be in the companions list if it hadn't already passed the magnet
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
					'compAQ': companionAQ.toFixed(3),
					'compAQprecise': companionAQ,
					'compCSB_AoverQ': (companionMass-j*dataStore.eMass)/stables.Q[i]
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

function stableCompanions(Q, beamMass){
	//find lists of all stable companions that can sneak through the magnet with the main species & charge state selected

	var i, j, companionMass, companionAQ,
		stableA, stableZ, stableQ,
		AQ = (beamMass - Q*dataStore.eMass)/Q;

	stableA = [];
	stableZ = [];
	stableQ = [];

	//loop over all possible stable companions
	for(i=0; i<dataStore.stableZ.length; i++){
		companionMass = dataStore.masses[dataStore.stableZ[i]][''+dataStore.stableA[i]]
		//loop over charge states for this companion
		for(j=1; j<dataStore.stableZ[i]; j++){
			companionAQ = (companionMass - j*dataStore.eMass)/j;

			if( (companionAQ > AQ*(1-0.5/dataStore.magnetResolution)) &&
				(companionAQ < AQ*(1+0.5/dataStore.magnetResolution))
			){
				stableA.push(dataStore.stableA[i]);
				stableZ.push(dataStore.stableZ[i]);
				stableQ.push(j)
			}
		}
	}

	return {"A": stableA, "Z": stableZ, "Q": stableQ}
}

function companionMagnetFilter(compA, compZ, beamMass, Q){
	//could a companion in the right charge state have passed a magnetic filter for a beam with mass beamMass and selected charge state Q?

	var companionMass, companionAQ, AQ,
		i,
		passed = false;

	companionMass = dataStore.masses[compZ][''+compA];
	AQ = (beamMass - dataStore.eMass*Q) / Q;

	//loop over all possible charge states
	for(i=1; i<compZ; i++){
		companionAQ = (companionMass - i*dataStore.eMass)/i;
		passed = passed || ( (companionAQ > AQ - AQ*(0.5/dataStore.magnetResolution)) && (companionAQ < AQ + AQ*(0.5/dataStore.magnetResolution)) )
	}

	return passed;

}

function determinePlotParameters(chargeState, A, species, companionData, SEBTwindowCenter, CSBwindowCenter){
	//construct input data and parameters for the plot for chargeState charge of the original selection

	var i, CSB, SEBT, companionSpec,
		minX, maxX, minY, maxY, CSBwindowWidth, SEBTwindowWidth
		massToCharge = [];

	for(i=0; i<companionData.length; i++){
		massToCharge.push({
			CSB: companionData[i].compCSB_AoverQ,
			SEBT: companionData[i].compAQprecise,
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
	companionSpec = [];
	for(i=0; i<massToCharge.length; i++){
		CSB.push(massToCharge[i].CSB);
		SEBT.push(massToCharge[i].SEBT);
		companionSpec.push({
			A: massToCharge[i].A,
			Q: massToCharge[i].Q,
			species: massToCharge[i].species,
		})
	}

	//make sure axis minima and maxima include all points and the window limits
	minX = Math.min.apply(null, CSB);
	maxX = Math.max.apply(null, CSB);
	minY = Math.min.apply(null, SEBT);
	maxY = Math.max.apply(null, SEBT);
	CSBwindowWidth = CSBwindowCenter/400;
	SEBTwindowWidth = SEBTwindowCenter/200;  
	minX = Math.min(minX, CSBwindowCenter - CSBwindowWidth);
	maxX = Math.max(maxX, CSBwindowCenter + CSBwindowWidth);
	minY = Math.min(minY, SEBTwindowCenter - SEBTwindowWidth);
	maxY = Math.max(maxY, SEBTwindowCenter + SEBTwindowWidth);

	dataStore.plotData[A+species+chargeState] = {
		'data': arrangePoints(CSB, SEBT),
		'SEBTwindowCenter': SEBTwindowCenter,
		'CSBwindowCenter': CSBwindowCenter,
		'companionSpec': companionSpec,
		'selectedMass': A,
		'title': HTMLement(A, chargeState, species),
		'minX': minX,
		'maxX': maxX,
		'minY': minY,
		'maxY': maxY
	}
}

function plotAcceptanceRegion(divID){
	//generate dygraph plotting A/Q at both selections

	var data = dataStore.plotData[divID];

	var width = document.getElementById('wrap'+divID).offsetWidth;
	var height = 32/48*width;

	dataStore.plots[divID] = new Dygraph(
	    // containing div
	    document.getElementById('fig'+divID),

	    // data
	    data.data,

	    //style
	    {
	    	title: data.title,
	    	labels: ['CSB-DSB', 'DSB-SEBT'],
	    	width: width,
	    	height: height,
	    	labelsDiv: 'legend' + divID,
	    	valueFormatter: function(num, opts, seriesName, dygraph, row, col){

	    		var species = HTMLement(data.companionSpec[row].A, data.companionSpec[row].Q, data.companionSpec[row].species)

	    		if(col == 0)
		    		return species + ': ' +  seriesName + ': ' + num.toFixed(5);
		    	else 
		    		return num.toFixed(5);
	    	},
	    	hideOverlayOnMouseOut: false,
	    	strokeWidth: 0.0,
	    	drawPoints: true,
	    	xlabel: 'A/Q (First stage, CSB-DSB)',
	    	ylabel: 'A/Q (After stripping, DSB-SEBT)',
	 		xRangePad: 10,
	    	pointSize: 3,
	    	highlightCircleSize: 2,
	    	digitsAfterDecimal: 5,
	    	dateWindow: [data.minX, data.maxX], //dateWindow == dygraph's busineess logic term for 'x range'.
	    	axes: {
	    		x:{
	    			pixelsPerLabel: 50,
	    			axisLabelFormatter: function(number, granularity, opts, dygraph){
	    				return number.toFixed(3);
	    			}
	    		},
	    		y:{
	    			valueRange: [data.minY, data.maxY],
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
            series: {
            	'DSB-SEBT':{
		            //draw A/Q elipses around points
		            
		            drawPointCallback: function(g, seriesName, canvasContext, cx, cy, color, pointSize){
		            	var xMin, yMin, xMax, yMax, width, height, x, y;

		            	x = g.toDataXCoord(cx);
		            	y = g.toDataYCoord(cy);
		          		xMin = g.toDomXCoord(x*(1 - dataStore.AQfwhm));
		          		xMax = g.toDomXCoord(x*(1 + dataStore.AQfwhm));
		          		yMin = g.toDomYCoord(y*(1 - dataStore.AQfwhm));
		          		yMax = g.toDomYCoord(y*(1 + dataStore.AQfwhm));
		          		width = xMax - xMin;
		          		height = yMax - yMin;

			            canvasContext.fillStyle = "rgba(1, 152, 117, 0.5)";
		            	drawEllipse(canvasContext, cx, cy, width, height, true);
		            },
		            drawHighlightPointCallback: function(g, seriesName, canvasContext, cx, cy, color, pointSize){
		            	var xMin, yMin, xMax, yMax, width, height, x, y;
		            			            	
		            	x = g.toDataXCoord(cx);
		            	y = g.toDataYCoord(cy);

		          		xMin = g.toDomXCoord(x*(1 - dataStore.AQfwhm));
		          		xMax = g.toDomXCoord(x*(1 + dataStore.AQfwhm));
		          		yMin = g.toDomYCoord(y*(1 - dataStore.AQfwhm));
		          		yMax = g.toDomYCoord(y*(1 + dataStore.AQfwhm));
		          		width = xMax - xMin;
		          		height = yMax - yMin;

		          		canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
			            canvasContext.fillStyle = "rgba(102, 51, 153, 0.5)";
		            	drawEllipse(canvasContext, cx, cy, width, height, true);

		            }
		        }
	        }
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
	//generate dygraph plotting charge state fractions for isobars of interest

	var data = dataStore.plotData[divID];
	var Zs = identifyIsobars(data.selectedMass, data.companionSpec);
	var labels = generateElementLabels(Zs);
	labels.unshift('Charge State');
	var width = document.getElementById('wrap'+divID).offsetWidth;
	var height = 32/48*width;

	dataStore.plots[divID] = new Dygraph(
	    // containing div
	    document.getElementById('csf'+divID),

	    // data
	    chargeStateArray(Zs, dataStore.beamEnergy),

	    //style
	    {
	    	labels: labels,
	    	width: width,
	    	height: height,
	    	strokeWidth: 2,
	    	hideOverlayOnMouseOut: false,
	    	xlabel: 'Charge State',
	    	ylabel: 'Charge State Fraction (%)',
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

function pageload(){
	//runs after ultralight is finished setting up the page.

	for(key in dataStore.plotData){
		plotAcceptanceRegion(key);
		plotCSF(key);
	}

	return 0
}