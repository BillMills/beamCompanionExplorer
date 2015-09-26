function populateElementList(){
	//add elements to the dropdown

	var i, select, option;

	select = document.getElementById('elements');

	for(i=1; i<dataStore.elements.length; i++){
		option = document.createElement('option');
		option.setAttribute('value', dataStore.elements[i]);
		option.innerHTML = dataStore.elements[i];
		select.appendChild(option);
	}
}

function checkForm(form){
	//make sure there's actually a charge state to show

	var mass = parseInt(form.mass.value);
	var element = form.elements.value;
	var Z = species2z(element);
	var chargeStates = validChargeStates(Z, mass);

    // validation fails if no charge states found
    if(chargeStates.length == 0) {
    	alert("No charge states found for " + mass + '-' + element + '.');
     	form.mass.focus();
    	return false;
    }

    // validation was successful
 	document.location = 'CSB.html#' + element + '/' + mass;  
    return false;
  }

//=================================
// ultralight pageload callback
//=================================

function ulCallback(){
	populateElementList();

	return 0
}