function ulAuxilaryData(route, data){

	var url, path, i;

	//extract the base URL where this page is found.
	url = window.location.protocol + "//" + window.location.host 
	path = window.location.pathname.split('/').slice(0,-1);
	for(i=0; i<path.length; i++){
		url += path[i] + '/'
	}

	if(route == "{{species}}/{{A}}"){
		return {'chargeStates': [1,2,3]}
	}
	return {}
}

function ulCallback(){
	document.getElementById('fig50K3').innerHTML = 'test'
}