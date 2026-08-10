function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();    
    
    var codSistema  = "M";
    var codUsuario  = "";
    var idPrj  		= "";

    if (constraints !== null && constraints.length > 0) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "CODIGO") {
            	codUsuario = constraints[i].initialValue;
            }
            
            if (constraints[i].fieldName == "IDPRJ") {
            	idPrj = constraints[i].initialValue;
            }
        }
    }

    if(idPrj){//Tarefas
    	var codSentenca = "SQL.DAVI.TS.0008";
    	
    	dataset.addColumn("ERRO");
        dataset.addColumn("CODIGO");
        dataset.addColumn("IDTRF");
        dataset.addColumn("IDISM");
        dataset.addColumn("NOME");
        
    	try {
	        var servico = ServiceManager.getServiceInstance("wsConsultaSQL");
	        var instancia = servico.instantiate("com.totvs.WsConsultaSQL");
	        var ws = instancia.getRMIwsConsultaSQL();            
	        var serviceHelper = servico.getBean(); 
	        var authService = serviceHelper.getBasicAuthenticatedClient(ws, "com.totvs.IwsConsultaSQL", '${USER}', '}PW{$8%FeytaqK7-}eQx');  
	        var result = authService.realizarConsultaSQL(
	            codSentenca,
	            1,
	            codSistema,
	            "CODIGO="+codUsuario+";IDPRJ="+idPrj
	        );
	
	        // Parse do XML retornado
	        var xml = new XML(result);
	        var registros = xml.Resultado;
	
	        for each (var item in registros) {
	            dataset.addRow([
	                "",
	                getXmlValue(item, "CODTRF"),
	                getXmlValue(item, "IDTRF"),
	                getXmlValue(item, "IDISM"),
	                getXmlValue(item, "TAREFA")
	            ]);
	        }
	
	    } catch (e) {
	        dataset.addRow(["Erro: " + e.message, "", "", "", ""]);
	    }
    	
    }else{//Projetos
    	var codSentenca = "SQL.DAVI.TS.0007";
    	
    	dataset.addColumn("ERRO");
        dataset.addColumn("ID");
        dataset.addColumn("CODIGO");
        dataset.addColumn("NOME");
        
	    try {
	        var servico = ServiceManager.getServiceInstance("wsConsultaSQL");
	        var instancia = servico.instantiate("com.totvs.WsConsultaSQL");
	        var ws = instancia.getRMIwsConsultaSQL();            
	        var serviceHelper = servico.getBean(); 
	        var authService = serviceHelper.getBasicAuthenticatedClient(ws, "com.totvs.IwsConsultaSQL", '${USER}', '}PW{$8%FeytaqK7-}eQx');  
	        var result = authService.realizarConsultaSQL(
	            codSentenca,
	            1,
	            codSistema,
	            "CODIGO="+codUsuario
	        );
	
	        // Parse do XML retornado
	        var xml = new XML(result);
	        var registros = xml.Resultado;
	
	        for each (var item in registros) {
	            dataset.addRow([
	                "",
	                item.IDPRJ.toString(),
	                item.CODPRJ.toString(),
	                item.PROJETO.toString()
	            ]);
	        }
	
	    } catch (e) {
	        dataset.addRow(["Erro: " + e.message, "", "", ""]);
	    }
    }

    return dataset;
}
function getXmlValue(item, tag) {
    try {
        var value = item[tag];
        if (value == null || value == undefined) return "";
        return value.toString();
    } catch (e) {
        return "";
    }
}
