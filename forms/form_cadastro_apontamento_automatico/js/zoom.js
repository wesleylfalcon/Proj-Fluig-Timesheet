function setSelectedZoomItem(item) {
	var idx = item.inputId;
	idx = idx.split("___")[1];
	
	if(item.inputId == "nmUsuario"){    
		$("#matrUsuario").val(item.matricula);	
	}
}

function removedZoomItem(item) {	
	var idx = item.inputId;
	idx = idx.split("___")[1];
	
	if(item.inputId == "nmUsuario"){    
		$("#matrUsuario").val("");	
	}
}