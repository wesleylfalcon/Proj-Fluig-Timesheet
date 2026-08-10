function displayFields(form,customHTML){ 
	var userId    = getValue("WKUser");
	var formMode  = form.getFormMode();
	var mobile 	  = form.getMobile();
	var customJS  = "<script>";

	if(formMode == "ADD"){
		form.setValue("formMode", formMode);
		form.setValue("dtAbertura", dataHora("data"));
		form.setValue("hrAbertura", dataHora("hora"));
	}
	
	if(formMode == "VIEW"){
		form.setVisibleById("adiDelegacao", false);
		
		customHTML.append("<script>");
        customHTML.append("$(document).ready(function(){ "); 
            customHTML.append(" $('.removeDelegacao').hide();");
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