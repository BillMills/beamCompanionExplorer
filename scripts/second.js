//=================================
// ultralight pageload callback
//=================================

function ulAuxilaryData(route, data){

	var A, Z, qOriginal, chargeStates, beamMass, i, companions;

	A = parseInt(data.A);
	Z = species2z(data.species);
	qOriginal = parseInt(data.qOriginal);
	beamMass = dataStore.masses[Z][''+A];

	//what other charge states of the beam species are going to show up, in addition to the original selected?
	chargeStates = beamChargeStates(Z, beamMass, qOriginal);

	//for every accepted charge state, generate both lists of companions and append to the corresponding object,
	//and generate information needed for plots
	for(i=0; i<chargeStates.length; i++){
		companions = listCompanions(qOriginal, beamMass, chargeStates[i].q);
		chargeStates[i]['csbCompanions'] = companions[0];
		chargeStates[i]['otherCompanions'] = companions[1];
		determinePlotParameters(chargeStates[i].q, A, data.species, companions[0])
	}

	if(route == "{{species}}/{{A}}/{{qOriginal}}"){
		return {
			'chargeStates': chargeStates,
			'AQoriginal': ((beamMass - qOriginal*dataStore.eMass)/qOriginal).toFixed(3)
		}
	}
	return {}
}

function beamChargeStates(Z, beamMass, qOriginal){
	//determine charge states and corresponding charge fractions, A/Q 
	//for beam of Z and A, originally filtered for charge state qOriginal

	var i, x, s, beamEnergy, meanQ, qFraction, AQ,
		chargeStates = [];

	beamEnergy = 1.5;
	x = 3.86*Math.sqrt(beamEnergy)/Math.pow(Z,0.45); // what is this?
	meanQ = Z*Math.pow( (1+Math.pow(x,(-1/0.6))), -0.6)
	s = 0.5*Math.pow( (meanQ*(1-Math.pow( (meanQ/Z), (1/0.6)))), 0.5); // for Z>20 <-- what about Z <=20?

	for(i=qOriginal; i<=Z; i++){
		qFraction = chargeFraction(i, s, meanQ)
		if(i>qOriginal && qFraction<0.5) continue;

		AQ = determineAQ(beamMass, i)

		chargeStates.push(
			{
				'q': i,
				'chargeFraction': qFraction.toFixed(1),
				'AQ': AQ.toFixed(3)
			});
	}

	return chargeStates
}

function chargeFraction(q, s, meanQ){

	var j, fraction, sum, height;

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
	//find lists of stable companions that can sneak through the magnet with the main species & charge state selected

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

function determinePlotParameters(chargeState, A, species, companionData){
	//

	var i, CSB, SEBT, massToCharge = [];

	for(i=0; i<companionData.length; i++){
		massToCharge.push({
			CSB: companionData[i].compCSB_AoverQ,
			SEBT: companionData[i].compAoverQprecise
		})
	}

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
	for(i=0; i<massToCharge.length; i++){
		CSB.push(massToCharge[i].CSB);
		SEBT.push(massToCharge[i].SEBT);
	}

	dataStore.plotData[A+species+chargeState] = {
		'data': arrangePoints(CSB, SEBT),
	}
}

function plotAcceptanceRegion(divID){
	//

	var data = dataStore.plotData[divID];

	dataStore.plots[divID] = new Dygraph(
	    // containing div
	    document.getElementById('fig'+divID),

	    // data
	    data.data,

	    //style
	    {
	    	labels: ['CSB-DSB', 'DSB-SEBT'],
	    	strokeWidth: 0.0,
	    	drawPoints: true,
	    	xlabel: 'CSB-DSB',
	    	ylabel: 'DSB-SEBT',
	 		xRangePad: 10,
	    	pointSize: 3,
	    	highlightCircleSize: 4,
	    	//digitsAfterDecimal: 10,
	    	axes:{
	    		x:{
	    			pixelsPerLabel: 30,
	    		},
	    		y:{
	    			axisLabelWidth: 100
	    		}
	    	},
	    }
	);
}

function ulCallback(){
	//runs after ultralight is finished setting up the page.

	for(key in dataStore.plotData){
		plotAcceptanceRegion(key);
	}

	return 0
}