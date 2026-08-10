function displayFields(form,customHTML){ 
	var userId    = getValue("WKUser");
	var atividade = getValue("WKNumState");
	var formMode  = form.getFormMode();
	var mobile 	  = form.getMobile();
	var customJS  = "<script>";
	var user 	  = getUser(userId);
	var emailUser = getEmail(userId);
	var codRM 	  = getCod(emailUser);
	
	form.setValue("atividade", atividade);
	form.setValue("formMode", formMode);
	
	if(atividade == INICIO || atividade == INICIO_4){		
		form.setValue("matrSolicitante", userId);
		form.setValue("codRM", codRM);
		form.setValue("nmSolicitante", user);
		form.setValue("dtAbertura", dataHora("data"));
		form.setValue("hrAbertura", dataHora("hora"));
		form.setValue("dtCompetencia", MesAno());
		
		form.setVisibleById('painelAprovacoes', false);		
		form.setVisibleById('formulario', false);
	}
	
	if(atividade != INICIO && atividade != INICIO_4 && atividade != AJUSTAR_LANCAMENTO){		
		form.setVisibleById("adiApontamento", false);
		form.setVisibleById('aviso', false);
		
		customHTML.append("<script>");
        customHTML.append("$(document).ready(function(){ "); 
            customHTML.append(" $('.removeApontamento').hide();");
        customHTML.append(" });");
        customHTML.append("</script>");
	}
	
	customJS += "function getMode(){ return '" + formMode + "'};";
	customJS += "function getMobile(){ return " + mobile + "};";
	customJS += "</script>";
	customHTML.append(customJS);
}

//Obter data e hora atual
function dataHora(infoData){
	var dataAtual = new Date();
	var dia 	  = dataAtual.getDate();
	var mes 	  = dataAtual.getMonth() + 1;
	var ano 	  = dataAtual.getFullYear();
	var hora 	  = dataAtual.getHours();
	var minuto 	  = dataAtual.getMinutes();
	
	if(dia < 10){dia = "0" + dia}
	if(mes < 10){mes = "0" + mes}
	if(hora < 10){hora = "0" + hora}
	if(minuto < 10){minuto = "0" + minuto}
	
	if(infoData == "data"){
		return dia + "/" + mes + "/" + ano;
		
	}else{
		return hora + ":" + minuto;
	}
}

//Obter codigo do usuario no RM
function getCod(email){
	var codigo 		= "";
	var c1 			= (DatasetFactory.createConstraint("EMAIL", email, email, ConstraintType.MUST));
	var constraints = new Array(c1);
	var dataset 	= DatasetFactory.getDataset("ds_ts_usuario", null, constraints, null);

	if(dataset.rowsCount > 0){
		codigo = dataset.getValue(0,"CODIGO");
		
	}else{
		log.error("Código RM do usuário " + email + " não encontrado!");
		throw("Código RM do usuário " + email + " não encontrado!");
	};

	return codigo;
}

//Obter usuario logado
function getUser(colleagueId){
	var user 		= "";
	var c1 			= (DatasetFactory.createConstraint("colleaguePK.colleagueId", colleagueId, colleagueId, ConstraintType.MUST));
	var constraints = new Array(c1);
	var dataset 	= DatasetFactory.getDataset("colleague", null, constraints, null);

	if(dataset.rowsCount > 0){
		user = dataset.getValue(0,"colleagueName");
		
	}else{
		log.error("Usuário " + colleagueId + " não encontrado!");
		throw("Usuário " + colleagueId + " não encontrado!");
	};

	return user;
}

//Obter e-mail do usuario logado
function getEmail(colleagueId){
	var email 		= "";
	var c1 			= (DatasetFactory.createConstraint("colleaguePK.colleagueId", colleagueId, colleagueId, ConstraintType.MUST));
	var constraints = new Array(c1);
	var dataset 	= DatasetFactory.getDataset("colleague", null, constraints, null);

	if(dataset.rowsCount > 0){
		email = dataset.getValue(0,"mail");
		
	}else{
		log.error("E-mail usuário " + colleagueId + " não encontrado!");
		throw("E-mail usuário " + colleagueId + " não encontrado!");
	};

	return email;
}

//Obter mês e ano atual
function MesAno(){
	var dataAtual = new Date();
	var mes 	  = dataAtual.getMonth() + 1;
	var ano 	  = dataAtual.getFullYear();
	
	if(mes < 10){mes = "0" + mes}
	
	var competencia = mes+"/"+ano;
	
	return competencia;
}