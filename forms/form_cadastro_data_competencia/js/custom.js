$(document).ready(function(){
	
	//Carrega campo data
	var dataLimite = FLUIGC.calendar(".date",  {
	    pickDate: true,
	    pickTime: false
	});
	
	if($("#anoCompetencia").val() == ""){
		$("#anoCompetencia").val(obterAnoAtual());
	}
	
});

//Obter ano
function obterAnoAtual(){
	var dataAtual = new Date();
	var ano 	  = dataAtual.getFullYear();
	
	return ano;
}