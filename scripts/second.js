//=================================
// ultralight pageload callback
//=================================

function ulAuxilaryData(route, data){

	var A, Z, qOriginal, chargeStates, beamMass, i, companions, beamAQ;

	A = parseInt(data.A);
	Z = species2z(data.species);
	qOriginal = parseInt(data.qOriginal);
	beamMass = dataStore.masses[Z][''+A];
	beamAQ = determineAQ(beamMass, qOriginal);

	chargeStates = beamChargeStates(Z, beamMass, qOriginal);

	//for every accepted charge state, generate both lists of companions and append to the corresponding object,
	//and generate information needed for plots
	for(i=0; i<chargeStates.length; i++){
		companions = listCompanions(chargeStates[i].q, beamMass, beamAQ)
		chargeStates[i]['csbCompanions'] = companions[0];
		chargeStates[i]['otherCompanions'] = companions[1];
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

function listCompanions(beamQ, beamMass, beamAQ){
	//generate two lists: one of likely companions, and one of possible companions.

	var csbCompanions, otherCompanions,
		thisAQ, thisMass, csbFlag, data,
		stables, i, j;

	csbCompanions = [];
	otherCompanions = [];

	stables = stableCompanions(beamQ, beamMass)

	for(i=0; i<stables.Z.length; i++){
		thisMass = dataStore.masses[stables.Z[i]][''+stables.A[i]];

		for(j=1; j<stables.Z[i]; j++){
			thisAQ = determineAQ(thisMass, j);

			if( thisAQ > (beamAQ-(beamAQ*(0.5/25))) && thisAQ < (beamAQ+(beamAQ*(0.5/25))) && aqPreCheck(stables.A[i], stables.Z[i], beamMass, beamQ) ){

				//is this background coming from the CSB?
				csbFlag = false;
				if(dataStore.linerSpecies[dataStore.liner].indexOf(stables.Z[i]) != -1){
					csbFlag = true;
				}

				data = {
					'compA': stables.A[i],
					'compSpecies': dataStore.elements[stables.Z[i]],
					'compQ': j,
					'compAoverQ': thisAQ.toFixed(3)
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
	//find lists of stable companions

	var i, j, mass, massToCharge,
		stableA, stableZ, stableQ,
		beamMassToCharge = (beamMass - beamQ*dataStore.eMass)/beamQ;

	stableA = [];
	stableZ = [];
	stableQ = [];

	for(i=0; i<dataStore.stableZ.length; i++){
		mass = dataStore.masses[dataStore.stableZ[i]][''+dataStore.stableA[i]]
		for(j=1; j<dataStore.stableZ[i]; j++){
			massToCharge = (mass - j*dataStore.eMass)/j;

			if( (massToCharge > beamMassToCharge*(1-0.5/dataStore.magnetResolution)) &&
				(massToCharge < beamMassToCharge*(1+0.5/dataStore.magnetResolution))) {

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

function ulCallback(){
	//runs after ultralight is finished setting up the page.

	return 0
}