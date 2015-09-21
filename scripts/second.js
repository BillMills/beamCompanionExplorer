//=================================
// ultralight pageload callback
//=================================

function ulAuxilaryData(route, data){

	var A, Z, qOriginal, chargeStates;

	A = parseInt(data.A);
	Z = species2z(data.species);
	qOriginal = parseInt(data.qOriginal);

	//determine charge states and corresponding A/Q
	chargeStates = beamChargeStates(Z, A, qOriginal);


	// // determine charge states, A/Q values, companions and plots from A and Z.
	// var url, path, i, A, Z, beamMass, chargeStates, companions;

	// A = parseInt(data.A);
	// Z = species2z(data.species);
	// beamMass = dataStore.masses[Z][''+A];

	// //determine what charge states can be accelerated, and the corresponding A/Q
	// chargeStates = validChargeStates(Z, beamMass);
	// //for every accepted charge state, generate both lists of companions and append to the corresponding object,
	// //and generate information needed for plots
	// for(i=0; i<chargeStates.length; i++){
	// 	companions = listCompanions(chargeStates[i].q, beamMass)
	// 	chargeStates[i]['csbCompanions'] = companions[0];
	// 	chargeStates[i]['otherCompanions'] = companions[1];
	// 	determineIntensityParameters(beamMass, chargeStates[i].q, A, data.species )
	// }

	if(route == "{{species}}/{{A}}/{{qOriginal}}"){
		return {'chargeStates': chargeStates }
	}
	return {}
}

function beamChargeStates(Z, A, qOriginal){
	//determine charge states for beam of Z and A, originally filtered for charge state qOriginal

	var i, x, s, beamEnergy, meanQ, 
		chargeStates = [];

	beamEnergy = 1.5;
	x = 3.86*Math.sqrt(beamEnergy)/Math.pow(Z,0.45); // what is this?
	meanQ = Z*Math.pow( (1+Math.pow(x,(-1/0.6))), -0.6)
	s = 0.5*Math.pow( (meanQ*(1-Math.pow( (meanQ/Z), (1/0.6)))), 0.5); // for Z>20 <-- what about Z <=20?

	for(i=qOriginal; i<=Z; i++){

		if(i>qOriginal && chargeFraction(i, s, meanQ)<0.5) continue;
		chargeStates.push({'q': i});
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



function ulCallback(){
	//runs after ultralight is finished setting up the page.

	return 0
}