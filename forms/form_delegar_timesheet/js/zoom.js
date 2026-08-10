function setSelectedZoomItem(item) {
	
	var idx = item.inputId;
	idx = idx.split("___")[1];
	
	if(item.inputId == "nmResponsavel"){    
		$("#matrResponsavel").val(item.matricula);	
	}
	
	if(item.inputId == "nmColaborador___"+idx){ 
		$("#matrColaborador___"+idx).val(item.matricula);
		
		var codRM = consultaCodRM(item.email);
		
		$("#codRMColaborador___"+idx).val(codRM);
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

function consultaCodRM(email){
	
	var c1 = DatasetFactory.createConstraint('EMAIL', email, email, ConstraintType.MUST);
    var resumo = DatasetFactory.getDataset('ds_ts_usuario', null, [c1], null);

    if (resumo && resumo.values.length > 0) {
        var usuario = resumo.values[0];

        return usuario.CODIGO;
    }
    
    return null;
}