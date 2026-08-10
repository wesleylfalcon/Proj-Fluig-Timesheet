function validateForm(form){
	var atividade 		= getValue("WKNumState");
	var idxApontamentos = form.getChildrenIndexes("tblApontamentos");
	var campos 			= [];
	
	if(atividade == INICIO || atividade == INICIO_4 || atividade == AJUSTAR_LANCAMENTO || atividade == CORRIGIR_ERRO){
		/*for (var x = 0; x < idxApontamentos.length; x++){	
			if (form.getValue("nmProjeto___" + idxApontamentos[x]) == "" || form.getValue("nmProjeto___" + idxApontamentos[x]) == null) { 
				campos.push("É obrigatório preencher o campo 'Projeto' do apontamento\n");
			}
			
			if (form.getValue("nmTarefa___" + idxApontamentos[x]) == "" || form.getValue("nmTarefa___" + idxApontamentos[x]) == null) { 
				campos.push("É obrigatório preencher o campo 'Tarefa' do apontamento\n");
			}
			
			if (form.getValue("dtApontamento___" + idxApontamentos[x]) == "" || form.getValue("dtApontamento___" + idxApontamentos[x]) == null) { 
				campos.push("É obrigatório preencher o campo 'Data' do apontamento\n");
			}
			
			if (form.getValue("hrApontamento___" + idxApontamentos[x]) == "" || form.getValue("hrApontamento___" + idxApontamentos[x]) == null) { 
				campos.push("É obrigatório preencher o campo 'Hora' do apontamento\n");
			}
		}
		
		if(idxApontamentos.length == 0){
			campos.push("Favor inserir pelo menos uma linha de apontamento\n");
		}*/
	}
	
	//Aprovação gestores
	if(atividade == APROV_GESTOR){
		if (form.getValue("statusAprovGestor") == "Revisado") { 
			if(form.getValue("justificativaGestor") == "" || form.getValue("justificativaGestor") == null){
				campos.push("É obrigatório preencher o campo 'Justificativa' da aprovação\n");
			}
		}
		
		if (form.getValue("statusAprovGestor") == "Reprovado") { 
			if(form.getValue("justificativaGestor") == "" || form.getValue("justificativaGestor") == null){
				campos.push("É obrigatório preencher o campo 'Justificativa' da aprovação\n");
			}
		}	
	}	
	
	if(campos != ""){throw "\n" + campos}
}