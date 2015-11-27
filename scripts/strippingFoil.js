function auxilaryFoilData(data){

	var A, Z, qOriginal, chargeStates, beamMass, i, stableCompanions, Companions, AQoriginal;

	A = parseInt(data.A);
	Z = species2z(data.species);
	qOriginal = parseInt(data.qOriginal);
	beamMass = dataStore.masses[Z][''+A];
	AQoriginal = (beamMass - qOriginal*dataStore.eMass)/qOriginal

	//what other charge states of the beam species are going to show up after the stripping foil?
	chargeStates = beamChargeStates(Z, beamMass, qOriginal);

	//for every post-foil charge state, generate arrays of possible companions, 
	//each companion described by an object as layed out in foil_AQselection;
	//and generate information needed for plots
	for(i=0; i<chargeStates.length; i++){
		stableCompanions = listStableCompanions(qOriginal, beamMass, chargeStates[i].q);
		chargeStates[i]['csbCompanions'] = stableCompanions[0];
		chargeStates[i]['otherCompanions'] = stableCompanions[1];
		chargeStates[i]['surfaceIonCompanions'] = listSurfaceIonCompanions(qOriginal, A, beamMass, chargeStates[i].q);
		chargeStates[i]['decayChainCompanions'] = listDecayChains(A, dataStore.elements.indexOf(data.species), qOriginal, chargeStates[i].q, chargeStates[i]['surfaceIonCompanions'])
		determinePlotParameters(chargeStates[i].q, A, data.species, stableCompanions[0], chargeStates[i]['surfaceIonCompanions'], chargeStates[i]['decayChainCompanions'], chargeStates[i].AQprecise, AQoriginal)
	}

	return {
		'chargeStates': chargeStates,
		'AQoriginal': AQoriginal.toFixed(3),
		'liner': dataStore.liner,
		'CSBmagnetResolution': dataStore.CSBmagnetResolution,
		'DSBmagnetResolution': dataStore.DSBmagnetResolution,
		'RFQprebuncherResolution': dataStore.RFQprebuncherResolution,
		'DSBprebuncherResolution': dataStore.DSBprebuncherResolution,
		'beamEnergy': dataStore.beamEnergy,
		'energyLoss': dataStore.energyLoss
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

function CSB_AQselection(selectedAQ, candidates){
	//selectedAQ: A/Q selected after the CSB
	//candidates: array of objects {A: atomic mass, Z: atomic number} describing the full set of companion candidates to consider
	//returns an array of objects {A: atomic mass, Z: atomic number, Q: charge state} describing the companions able to pass this selection.

	var i, j, companionMass, companionAQ;
	var passed = [];

	//loop over all candidates
	for(i=0; i<candidates.length; i++){
		companionMass = dataStore.masses[ candidates[i].Z ]['' + candidates[i].A ]
		if(!companionMass)
			continue;
		//loop over charge states for this companion
		for(j=1; j<candidates[i].Z; j++){
			companionAQ = (companionMass - j*dataStore.eMass)/j;

			if( (companionAQ > selectedAQ*(1-0.5/dataStore.CSBmagnetResolution)) &&
				(companionAQ < selectedAQ*(1+0.5/dataStore.CSBmagnetResolution))
			){
				passed.push({
					A: candidates[i].A,
					Z: candidates[i].Z,
					Q: j
				})
			}
		}
	}

	return passed;
}

function foil_AQselection(finalSelectedAQ, candidates){
	//finalSelectedAQ: A/Q selected after the stripping foil
	//candidates: array of objects {A: atomic mass, Z: atomic number, Q: charge state}
	//returns: array of objects (see inline).

	var i, j, companionMass, companionAQ,
		passed = [];

	for(i=0; i<candidates.length; i++){
		companionMass = dataStore.masses[ candidates[i].Z ]['' + candidates[i].A ];
		if(!companionMass)
			continue;
		//loop over all possible charge states of the companion:
		for(j=1; j<candidates[i].Z; j++){
			companionAQ = determineAQ(companionMass, j);

			if( companionAQ > finalSelectedAQ*(1-(0.5/dataStore.DSBmagnetResolution)) && 
				companionAQ < finalSelectedAQ*(1+(0.5/dataStore.DSBmagnetResolution))  
			){
				passed.push({
					'compA': candidates[i].A,
					'compZ': candidates[i].Z,
					'compSpecies': dataStore.elements[candidates[i].Z],
					'compQ': j,
					'compAQ': companionAQ.toFixed(3),
					'compAQprecise': companionAQ,
					'compCSB_AoverQ': (companionMass - candidates[i].Q*dataStore.eMass)/candidates[i].Q
				})
			}
		}
	}

	return passed;
}

function listStableCompanions(qOriginal, beamMass, chargeState){
	//generate two lists: one of CSB-generated stable companions, and one of possible stable companions,
	//for the post-foil chargeState of an ion with mass beamMass and CSB selected charge qOriginal

	var postCSBselectedAQ = (beamMass - qOriginal*dataStore.eMass)/qOriginal;
	var postFoilSelectedAQ = determineAQ(beamMass, chargeState);
	var i, CSBcompanions, foilCompanions; 
	var candidates = [];

	//construct list of all possible stable candidates
	for(i=0; i<dataStore.stableZ.length; i++){
		candidates.push({
			A: dataStore.stableA[i],
			Z: dataStore.stableZ[i]
		});
	}

	//filter after the CSB
	CSBcompanions = CSB_AQselection(postCSBselectedAQ, candidates);
	//filter after the stripping foil
	foilCompanions = foil_AQselection(postFoilSelectedAQ, CSBcompanions);

	return classifyCompanions(foilCompanions);

}

function classifyCompanions(companions){
	//companions: stable companions passing the foil_AQselection, arranged as returned by that function.
	//reurns: two arrays, of CSB-generated and non-CSB-generated stable backgrounds.

	var i;
	var csbCompanions = [];
	var otherCompanions = [];

	for(i=0; i<companions.length; i++){
		//is this background coming from the CSB?
		if(dataStore.linerSpecies[dataStore.liner].indexOf(companions[i].compZ) != -1){
			csbCompanions.push(companions[i]);
		} else
			otherCompanions.push(companions[i]);
	}

	return [csbCompanions, otherCompanions]
}

function listSurfaceIonCompanions(qOriginal, beamA, beamMass, chargeState){
	//list the companions generated from surface ionization in the ion chamber

	var postCSBselectedAQ = (beamMass - qOriginal*dataStore.eMass)/qOriginal;
	var postFoilSelectedAQ = determineAQ(beamMass, chargeState);
	var i, CSBcompanions, foilCompanions; 
	var candidates = findSurfaceIonIsobars(beamA);

	//filter after the CSB
	CSBcompanions = CSB_AQselection(postCSBselectedAQ, candidates);
	//filter after the stripping foil
	foilCompanions = foil_AQselection(postFoilSelectedAQ, CSBcompanions);

	return foilCompanions;

}

function listDecayChains(beamA, beamZ, qOriginal, chargeState, surfaceIonData){
	//find all the decay daughters of the beam, and the surface ions
	//surfaceIonData per the return of listSirfaceIonCompanions
	//return formatted as other list* functions

	var i, candidates, ionDaughters, CSBcompanions, foilCompanions;
	var beamMass = dataStore.masses[beamZ][''+beamA];
	var postCSBselectedAQ = (beamMass - qOriginal*dataStore.eMass)/qOriginal;
	var postFoilSelectedAQ = determineAQ(beamMass, chargeState);

	//start with beam daughters
	candidates = findDecayChain(beamZ, beamA);
	//add on surface ionization daughters:
	for(i=0; i<surfaceIonData.length; i++){
		ionDaughters = findDecayChain(surfaceIonData[i].compZ, surfaceIonData[i].compA);
		candidates = [].concat(candidates, ionDaughters)
	}

	//filter after the CSB
	CSBcompanions = CSB_AQselection(postCSBselectedAQ, candidates);
	//filter after the stripping foil
	foilCompanions = foil_AQselection(postFoilSelectedAQ, CSBcompanions);

	ensureUniqueList(foilCompanions)

	return foilCompanions;
}

function determinePlotParameters(chargeState, A, species, stableCompanionData, surfaceIonData, decayChainData, SEBTwindowCenter, CSBwindowCenter){
	//construct input data and parameters for A/Q plot
	//chargeState == second charge state selected

	var i, CSB, SEBT, seriesFlag, companionSpec, decayChain,
		minX, maxX, minY, maxY, CSBwindowWidth, SEBTwindowWidth,
		series = ['-', 'Selected','Stable']
		massToCharge = [];

	//prepare stable companions for plotting
	massToCharge = appendData(massToCharge, stableCompanionData, 1);
	//add beam species to the list
	massToCharge = appendData(massToCharge, [{
					'compA': A,
					'compZ': null,
					'compSpecies': species,
					'compQ': chargeState,
					'compAQ': SEBTwindowCenter.toFixed(3),
					'compAQprecise': SEBTwindowCenter,
					'compCSB_AoverQ': CSBwindowCenter
				}], 0)

	//add surface ion data
	if(surfaceIonData.length > 0){
		massToCharge = appendData(massToCharge, surfaceIonData, series.length-1);
		series.push('Surface')
	}
	//add decay chain data
	if(decayChainData.length > 0){
		massToCharge = appendData(massToCharge, decayChainData, series.length-1);
		series.push('Decay')
	}

	//dygraphs expects sorted input
	massToCharge.sort(function(a, b){
	    // Compare the 2 dates
	    if(a.CSB < b.CSB) return -1;
	    if(a.CSB > b.CSB) return 1;
	    return 0;
	});

	//extract data back into separate arrays:
	CSB = [];
	SEBT = [];
	seriesFlag = [];
	companionSpec = [];

	for(i=0; i<massToCharge.length; i++){
		CSB.push(massToCharge[i].CSB);
		SEBT.push(massToCharge[i].SEBT);
		seriesFlag.push(massToCharge[i].series);
		companionSpec.push({
			A: massToCharge[i].A,
			Q: massToCharge[i].Q,
			species: massToCharge[i].species,
			CSB: massToCharge[i].CSB,
			SEBT: massToCharge[i].SEBT
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
		'data': arrangePoints(CSB, SEBT, seriesFlag),
		'series': series,
		'SEBTwindowCenter': SEBTwindowCenter,
		'SEBTwindowWidth': SEBTwindowWidth,
		'CSBwindowCenter': CSBwindowCenter,
		'CSBwindowWidth': CSBwindowWidth,
		'companionSpec': companionSpec,
		'selectedMass': A,
		'title': HTMLement(A, chargeState, species),
		'minX': minX,
		'maxX': maxX,
		'minY': minY,
		'maxY': maxY
	}
}

function appendData(dataSet, newPoints, seriesFlag){
	//take an array dataSet of objects {CSB: xcoord, SEBT: ycoord, species: Xe, A: atomic mass, Q: charge state, series: seriesFlag}
	//and append the elements of the array newPoints to it, in the same configuration. newPoints should contain objects
	//like those returned in a list by foil_AQselection.

	var i, appended = dataSet;

	for(i=0; i<newPoints.length; i++){
		appended.push({
			CSB: newPoints[i].compCSB_AoverQ,
			SEBT: newPoints[i].compAQprecise,
			species: newPoints[i].compSpecies,
			A: newPoints[i].compA,
			Q: newPoints[i].compQ,
			series: seriesFlag
		})
	}

	return appended;

}

function plotAcceptanceRegion(divID){
	//generate dygraph plotting A/Q at both selections

	var data = dataStore.plotData[divID];
	var width = document.getElementById('wrap'+divID).offsetWidth;
	var height = 32/48*width;

	dataStore.plots['pngAcceptance'+divID] = new Dygraph(
	    // containing div
	    document.getElementById('fig'+divID),

	    // data
	    data.data,

	    //style
	    {
	    	title: data.title,
	    	labels: data.series,
	    	width: width,
	    	height: height,
	    	labelsDiv: 'legend' + divID,
	    	valueFormatter: function(num, opts, seriesName, dygraph, row, col){

	    		var species = HTMLement(data.companionSpec[row].A, data.companionSpec[row].Q, data.companionSpec[row].species)

	    		if(col == 0)
		    		return species + ': ' +  'CSB-DSB: ' + num.toFixed(5);
		    	else 
		    		return 'DSB-SEBT: ' + num.toFixed(5);
	    	},
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
	            xMin = g.toDomXCoord(data.CSBwindowCenter - data.CSBwindowWidth/2 );
	            xMax = g.toDomXCoord(data.CSBwindowCenter + data.CSBwindowWidth/2 );
	            canvasContext.fillRect(xMin, area.y, xMax - xMin, area.h);

	            //DSB pre-buncher A/Q window (y-axis)
	            yMin = g.toDomYCoord(data.SEBTwindowCenter - data.SEBTwindowWidth/2 );
	            yMax = g.toDomYCoord(data.SEBTwindowCenter + data.SEBTwindowWidth/2 );
	            canvasContext.fillRect(area.x, yMin, area.w, yMax-yMin);
           
            },
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

	            canvasContext.fillStyle = dataStore.colors[seriesName];
	            canvasContext.strokeStyle = '#000000';
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
	            canvasContext.strokeStyle = '#000000';
            	drawEllipse(canvasContext, cx, cy, width, height, true);

            }
	    }
	);
}




// ==================================
// charge state distributions
// ==================================

function identifyIsobars(A, candidates){
	//candidates == array of objects: {A, Q, species}
	//returns array of Z values of candidates isobaric to A.

	var i;
	var isobarZ = []

	for(i=0; i<candidates.length; i++){
		if(candidates[i].A == A){
			isobarZ.push(dataStore.elements.indexOf(candidates[i].species));
		}
	}
	return Array.from(new Set(isobarZ.sort())) // sorted array of unique Z values.
}

function identifyContaminants(candidates, CSBmin, CSBmax, SEBTmin, SEBTmax){
	//candidates == array of objects: {A, Q, species, CSB: 1st A/Q, SEBT: 2nd A/Q}
	//returns array of Z values of candidates that fall within the CSB and SEBT acceptance windows

	var i, contaminants = [];

	for(i=0; i<candidates.length; i++){
		if(
			candidates[i].CSB <= CSBmax && candidates[i].CSB >= CSBmin &&
			candidates[i].SEBT <= SEBTmax && candidates[i].SEBT >= SEBTmin
		){
			contaminants.push( dataStore.elements.indexOf(candidates[i].species) );
		}
	}

	return Array.from(new Set(contaminants.sort())) // sorted array of unique Z values.

}

function plotCSF(divID, isobarsOnly){
	//generate dygraph plotting charge state fractions for isobars of interest

	var data = dataStore.plotData[divID];
	if(isobarsOnly === 'true')
		var Zs = identifyIsobars(data.selectedMass, data.companionSpec);
	else
		var Zs = identifyContaminants(data.companionSpec, data.CSBwindowCenter - data.CSBwindowWidth/2, data.CSBwindowCenter + data.CSBwindowWidth/2, data.SEBTwindowCenter - data.SEBTwindowWidth/2, data.SEBTwindowCenter + data.SEBTwindowWidth/2)
	var labels = generateElementLabels(Zs);
	labels.unshift('Charge State');
	var width = document.getElementById('wrap'+divID).offsetWidth;
	var height = 32/48*width;
	var csvBlob;

	dataStore.plots['pngCSF'+divID] = new Dygraph(
	    // containing div
	    document.getElementById('csf'+divID),

	    // data
	    chargeStateArray(Zs, dataStore.beamEnergy, divID),

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

	//csv got created along with the data; blobify and link:
	csvBlob = new Blob([dataStore.chargeStateFractionCSV[divID]]);
	document.getElementById('csf' + divID + 'CSVsave').setAttribute('href', window.URL.createObjectURL(csvBlob));

}

function pageload(){
	//runs after ultralight is finished setting up the page.

	var originalSelection = parseQuery()

	//populate and reveal the entry for the originally selected charge state
	populateSection(originalSelection.A + originalSelection.species + originalSelection.qOriginal);
}

function populateSection(key){
	//<key>: string; mass,species,charge to populate, like '50K8'
	//draw the plots, fill in the tables and plug in the buttons for the specified charge state

	var i, radios;

	document.getElementById('section' + key).classList.remove('hidden');
	document.getElementById('fig'+key).setAttribute('style', 'width: auto; height: auto;');
	document.getElementById('csf'+key).setAttribute('style', 'width: auto; height: auto;');
	plotAcceptanceRegion(key);
	plotCSF(key, 'false');

	//set up some event handlers
	radios = document['form'+key]['radio'+key];
	for(i = 0; i < radios.length; i++) {
	    radios[i].onclick = function() {
	    	var id = this.id.slice(3);
	    	plotCSF(id, this.value)
	    };
	}
	
	return 0
}

function gotoChargeState(A, species, q){
	//draw the requested charge state the first time, and jump down to it.

	//csv hasn't been generated yet, do all calculations for this block
	if(!dataStore.chargeStateFractionCSV[A + species + q]){
		populateSection(A + species +q);
	}

	window.location = location.href.replace(location.hash,'') + '#chargeStateOption' + q;	
}









