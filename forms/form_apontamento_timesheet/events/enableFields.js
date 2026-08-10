function enableFields(form){
	var atividade = getValue("WKNumState");
	
	if(atividade != INICIO && atividade != INICIO_4 && atividade != AJUSTAR_LANCAMENTO){	
		form.setEnabled("nmProjeto", false);
		form.setEnabled("nmTarefa", false);
		form.setEnabled("dtApontamento", false);
		form.setEnabled("hrApontamento", false);
		form.setEnabled("observacao", false);
	}
	
	if(atividade == AJUSTAR_LANCAMENTO){
		form.setEnabled("justificativaGestor",false);	
	}
}