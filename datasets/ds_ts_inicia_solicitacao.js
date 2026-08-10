function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();
    
    var credencial = getCredenciais();
    
    dataset.addColumn("STATUS");
    dataset.addColumn("PROCESS_ID");
    dataset.addColumn("MESSAGE");

    try {

        var json = getConstraint(constraints, "DATA");
        var data = JSON.parse(json);

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
        var processId = "solicitacao_apontamento_timesheet";
        var choosedState = 5;

        var username = credencial[0];
        var password = credencial[1];

        // =========================
        // COLLEAGUES
        // =========================
        var colleagueIds = serviceHelper.instantiate('net.java.dev.jaxb.array.StringArray');

        for (var i = 0; i < data.aprovadores.length; i++) {
            colleagueIds.getItem().add(data.aprovadores[i]);
        }

        // =========================
        // ATTACHMENTS (vazio)
        // =========================
        var attachments = serviceHelper.instantiate(
            'com.totvs.technology.ecm.workflow.ws.ProcessAttachmentDtoArray'
        );

        // =========================
        // APPOINTMENTS (vazio)
        // =========================
        var appointments = serviceHelper.instantiate(
            'com.totvs.technology.ecm.workflow.ws.ProcessTaskAppointmentDtoArray'
        );

        // =========================
        // CARD DATA (STRING[][])
        // =========================
        var cardData = serviceHelper.instantiate('net.java.dev.jaxb.array.StringArrayArray');

        function addCard(key, value) {
            var item = serviceHelper.instantiate('net.java.dev.jaxb.array.StringArray');
            item.getItem().add(key);
            item.getItem().add(value || "");
            cardData.getItem().add(item);
        }

        // =========================
        // DATA/HORA
        // =========================
        var now = new Date();
        var dtAbertura = formatDate(now);
        var hrAbertura = formatTime(now);

        // =========================
        // CAMPOS FIXOS
        // =========================
        addCard("aprovadores", data.aprovadores.join(","));
        addCard("gestorContrato", data.gestor);
        addCard("matrSolicitante", data.usuario);
        addCard("codRM", data.codRM);
        addCard("nmSolicitante", data.nome);
        addCard("dtAbertura", dtAbertura);
        addCard("hrAbertura", hrAbertura);
        addCard("dtCompetencia", data.competencia);
        
        var item = data.apontamentos[0];

        if (!item) {
        	dataset.addRow(["ERRO", "", "Nenhum apontamento enviado"]);
        	
            throw "Nenhum apontamento enviado";
        }
        
        addCard("nmProjeto", item.nmProjeto);
        addCard("idProjeto", item.idProjeto);
        addCard("codProjeto", item.codProjeto || item.codigoProjeto || item.idProjeto);
        addCard("nmTarefa", item.nmTarefa);
        addCard("codTarefa", item.idTarefa);
        addCard("idISM", item.idISM);
        addCard("idTRF", item.idTRF);
        addCard("dtApontamento", item.dtApontamento);        
        addCard("hrApontamento", item.horas);
        addCard("observacao", item.observacao);        
        addCard("statusAprovGestor", item.situacao);

        // =========================
        // START PROCESS
        // =========================
        var result = service.startProcess(
            username,
            password,
            companyId,
            processId,
            choosedState,
            colleagueIds,
            "Apontamento enviado via widget",
            data.usuario,
            true,
            attachments,
            cardData,
            appointments,
            false
        );

        var retorno = parseResult(result);

        if (retorno.ERROR) {
        	dataset.addRow(["ERRO", "", retorno.ERROR]);
        	
            throw retorno.ERROR;
        }

        dataset.addRow(["OK", retorno.iProcess, "Processo iniciado"]);

    } catch (e) {

        dataset.addRow(["ERRO", "", e.message]);
    }

    return dataset;
}

// =========================
// HELPERS
// =========================

function parseResult(result) {

    var obj = {};

    for (var i = 0; i < result.getItem().size(); i++) {
        var item = result.getItem().get(i).getItem();
        obj[item.get(0)] = item.get(1);
    }

    return obj;
}

function getConstraint(constraints, name){
    if (!constraints) return null;

    for (var i = 0; i < constraints.length; i++) {
        if (constraints[i].fieldName == name) {
            return constraints[i].initialValue;
        }
    }
    return null;
}

function formatDate(date){
    var d = ("0" + date.getDate()).slice(-2);
    var m = ("0" + (date.getMonth()+1)).slice(-2);
    var y = date.getFullYear();
    return d + "/" + m + "/" + y;
}

function formatTime(date){
    var h = ("0" + date.getHours()).slice(-2);
    var m = ("0" + date.getMinutes()).slice(-2);
    return h + ":" + m;
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