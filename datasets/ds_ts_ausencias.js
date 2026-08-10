function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    
    // Adiciona colunas ao dataset
    dataset.addColumn("ERRO");
    dataset.addColumn("DATA");
    dataset.addColumn("STATUS");
    dataset.addColumn("HORAS");    
    
    var codSentenca = "CONS.TIMESHEET.AUSENCIAS";
    var codSistema  = "P";
    var chapa  		= "";
    var ano  		= "";
    var mes  		= "";

    // Verifica se veio alguma constraint para CODCUSTO
    if (constraints !== null && constraints.length > 0) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "CHAPA") {
            	chapa = constraints[i].initialValue;
            }
            
            if (constraints[i].fieldName == "MES") {
            	mes = constraints[i].initialValue;
            }
            
            if (constraints[i].fieldName == "ANO") {
            	ano = constraints[i].initialValue;
            }
        }
    }

    try {
    	var credenciais = getCredenciais();
    	var username = credenciais[0];
        var password = credenciais[1];
    	
        // Chamada do serviço
        var servico = ServiceManager.getServiceInstance("wsConsultaSQL");
        var instancia = servico.instantiate("com.totvs.WsConsultaSQL");
        var ws = instancia.getRMIwsConsultaSQL();            
        var serviceHelper = servico.getBean(); 
        var authService = serviceHelper.getBasicAuthenticatedClient(ws, "com.totvs.IwsConsultaSQL", username, password);  
        var result = authService.realizarConsultaSQL(
            codSentenca,
            1,
            codSistema,
            "ANOCOMP_S="+ano+";MESCOMP_S="+mes+";CHAPA="+chapa
        );

        // Parse do XML retornado
        var xml = new XML(result);
        var registros = xml.Resultado;

        for each (var item in registros) {
            dataset.addRow([
                "",
                formatarData(item.DIA.toString()),
                normalizarTipoAusencia(item.TIPO.toString()),
                converterHoraParaDecimal(item.HORAS.toString())                
            ]);
        }

    } catch (e) {
        dataset.addRow(["Erro: " + e.message, "", "", ""]);
    }

    return dataset;
}

//==============================
//Funções auxiliares
//==============================

function normalizarTipoAusencia(tipo) {

    tipo = String(tipo || "").trim().toUpperCase();

    if (tipo === "ATESTADO") {
        return "Atestado";
    }

    if (tipo === "FÉRIAS" || tipo === "FERIAS") {
        return "Férias";
    }

    if (tipo === "FERIADO") {
        return "Feriado";
    }

    if (tipo === "FALTA") {
        return "Falta";
    }

    return tipo;
}


function formatarData(dataIso){

    if(!dataIso) return "";

    try{

        var data = dataIso.split("/");
        var dia = data[0];
        var mes = data[1];
        var ano = data[2];

        return ano + "-" + mes + "-" + dia;

    } catch(e){
        return dataIso;
    }
}

function converterHoraParaDecimal(hora) {

    hora = String(hora || "").trim();

    if (!hora) {
        return 0;
    }

    if (hora.indexOf(":") > -1) {

        var partes = hora.split(":");

        var horas = parseInt(partes[0], 10);
        var minutos = parseInt(partes[1], 10);

        if (isNaN(horas)) {
            horas = 0;
        }

        if (isNaN(minutos)) {
            minutos = 0;
        }

        return horas + (minutos / 60);
    }

    hora = hora.replace(",", ".");

    var valor = parseFloat(hora);

    if (isNaN(valor)) {
        return 0;
    }

    return valor;
}

function getCredenciais(){
	
	var user = "";
	var password = "";
	var credenciais = [];
	
	var constraints = [];

	constraints.push(DatasetFactory.createConstraint("SISTEMA","rm","rm",ConstraintType.MUST));
	var ds = DatasetFactory.getDataset("ds_ts_credenciais",null,constraints,null);

	if(ds){
		
		user = ds.getValue(0, "nmUsuario");
		password = ds.getValue(0, "senhaUsuario");
	}
	
	credenciais.push(user);
	credenciais.push(password);
	
	return credenciais;
}
