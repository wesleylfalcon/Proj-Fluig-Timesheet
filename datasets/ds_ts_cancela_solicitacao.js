function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");

    var solicitacao = getConstraint(constraints, "SOLICITACAO");
    var usuario = getConstraint(constraints, "USUARIO");
    var motivo = getConstraint(constraints, "MOTIVO");
    
    var credencial = getCredenciais();

    try {
    	// =========================
        // SERVICE
        // =========================
        var serviceHelper = ServiceManager.getService("ECMWorkflowEngineService").getBean();

        if (!serviceHelper) {
            throw "ServiceHelper não carregado";
        }

        var serviceLocator = serviceHelper.instantiate(
            "com.totvs.technology.ecm.workflow.ws.ECMWorkflowEngineServiceService"
        );

        var service = serviceLocator.getWorkflowEngineServicePort();
        
        // =========================
        // PARAMS
        // =========================
        var companyId = parseInt(getValue("WKCompany"));
        var processInstanceId = parseInt(solicitacao);
        var userId = usuario;
        var cancelText = motivo;
        var username = credencial[0];
        var password = credencial[1];

        // =========================
        // CANCEL INSTANCE
        // =========================
        var result = service.cancelInstance(
            username,
            password,
            companyId,
            processInstanceId,
            userId,
            cancelText
        );

        if (result == "OK") {
            dataset.addRow(["OK", "Solicitação cancelada com sucesso"]);

        } else {
            dataset.addRow(["ERRO", "Erro ao cancelar processo: " + result]);
        }

    } catch (e) {
        dataset.addRow(["ERRO", e.message]);
    }

    return dataset;
}

//=========================
//HELPERS
//=========================

function getConstraint(constraints, name){
	if (!constraints) return null;

	for (var i = 0; i < constraints.length; i++) {
		if (constraints[i].fieldName == name) {
			return constraints[i].initialValue;
		}
	}
	
	return null;
}

function getCredenciais(){
	
	var user = "";
	var password = "";
	var credenciais = [];
	
	var constraints = [];

	constraints.push(DatasetFactory.createConstraint("SISTEMA","fluig","fluig",ConstraintType.MUST));
	var ds = DatasetFactory.getDataset("ds_ts_credenciais",null,constraints,null);

	if(ds){
		
		user = ds.getValue(0, "nmUsuario");
		password = ds.getValue(0, "senhaUsuario");
	}
	
	credenciais.push(user);
	credenciais.push(password);
	
	return credenciais;
}