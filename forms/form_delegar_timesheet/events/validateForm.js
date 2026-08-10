function validateForm(form){
	var campos 		 = [];
	var idxDelegacao = form.getChildrenIndexes("tblDelegacao");
	
	if (form.getValue("nmResponsavel") == "" || form.getValue("nmResponsavel") == null) { 
		campos.push("É obrigatório preencher o campo 'Responsável'\n");
	}
	
	if(idxDelegacao.length > 0){
		for (var i = 0; i < idxDelegacao.length; i++){	
			if (form.getValue("nmColaborador___" + idxDelegacao[i]) == "" || form.getValue("nmColaborador___" + idxDelegacao[i]) == null) { 
				campos.push("É obrigatório preencher o campo 'Nome' na tabela de colaboradores\n");
			}
		}
	}else{
		campos.push("É obrigatório inserir pelo menos um colaborador\n");
	}
	
	if(campos != ""){throw "\n" + campos}
}