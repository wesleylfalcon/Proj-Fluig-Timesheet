function setSelectedZoomItem(item) {
	var idx = item.inputId;
	idx = idx.split("___")[1];
	
	if(item.inputId == "nmResponsavel"){    
		$("#matrResponsavel").val(item.matricula);	
	}
	
	if(item.inputId == "nmColaborador___"+idx){ 
		$("#matrColaborador___"+idx).val(item.colleagueId);
	}
}

function removedZoomItem(item) {	
	var idx = item.inputId;
	idx = idx.split("___")[1];
	
	if(item.inputId == "nmResponsavel"){    
		$("#matrResponsavel").val("");	
	}
	
	if(item.inputId == "nmColaborador___"+idx){ 
		$("#matrColaborador___"+idx).val("");
	}
}