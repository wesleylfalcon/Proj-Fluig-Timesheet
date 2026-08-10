function createDataset(fields, constraints, sortFields) {
	log.info("============== editar solicitacao");

    var dataset = DatasetBuilder.newDataset();
    
    var credencial = getCredenciais();
    
    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");

    try {

        var json = getConstraint(constraints, "DATA");
        var data = JSON.parse(json);

        // =========================
        // SERVICE
        // =========================
        var serviceHelper = ServiceManager.getService("ECMWorkflowEngineService").getBean();

        var serviceLocator = serviceHelper.instantiate(
            "com.totvs.technology.ecm.workflow.ws.ECMWorkflowEngineServiceService"
        );

        var service = serviceLocator.getWorkflowEngineServicePort();

        var companyId = parseInt(getValue("WKCompany"));

        var username = credencial[0];
        var password = credencial[1];

        // =========================
        // BUSCAR DADOS ATUAIS
        // =========================
        var c1 = DatasetFactory.createConstraint("SOLICITACAO", data.processInstanceId, data.processInstanceId, ConstraintType.MUST);

        var ds = DatasetFactory.getDataset("ds_ts_consultar_solicitacao", null, [c1], null);

        if (ds == null || ds.rowsCount == 0) {
        	dataset.addRow(["ERRO", "Não foi possível buscar dados da solicitação"]);
        	
            throw "Não foi possível buscar dados da solicitação";
        }

        // =========================
        // CARD DATA
        // =========================
        var cardData = serviceHelper.instantiate('net.java.dev.jaxb.array.StringArrayArray');

        function addCard(key, value) {
            var item = serviceHelper.instantiate('net.java.dev.jaxb.array.StringArray');
            item.getItem().add(key);
            item.getItem().add(value || "");
            cardData.getItem().add(item);
        }

        // =========================
        // CAMPOS FIXOS (mantém os atuais)
        // =========================
        addCard("aprovadores", ds.getValue(0, "aprovadores"));
        addCard("matrSolicitante", ds.getValue(0, "matrSolicitante"));
        addCard("codRM", ds.getValue(0, "codRM"));
        addCard("nmSolicitante", ds.getValue(0, "nmSolicitante"));
        addCard("dtAbertura", ds.getValue(0, "dtAbertura"));
        addCard("hrAbertura", ds.getValue(0, "hrAbertura"));
        addCard("nrSolicitacao", ds.getValue(0, "nrSolicitacao"));
        addCard("dtCompetencia", ds.getValue(0, "dtCompetencia"));

        // =========================
        // CAMPOS EDITADOS
        // =========================
        addCard("nmProjeto", data.campos.nmProjeto);
        addCard("idProjeto", data.campos.idProjeto || ds.getValue(0, "idProjeto"));
        addCard("codProjeto", data.campos.codProjeto || ds.getValue(0, "codProjeto") || ds.getValue(0, "idProjeto"));
        addCard("nmTarefa", data.campos.nmTarefa);
        addCard("codTarefa", data.campos.codTarefa);
        addCard("idISM", data.campos.idISM);
        addCard("idTRF", data.campos.idTRF);
        addCard("observacao", data.campos.observacao);
        addCard("dtApontamento", data.campos.dtApontamento);
        addCard("hrApontamento", data.campos.hrApontamento);        
        addCard("nmAprovGestor", "");        
        addCard("dtAprovGestor", "");
        addCard("hrAprovGestor", "");
        addCard("statusAprovGestor", data.campos.statusAprovGestor); 
        addCard("justificativaGestor", "");

        // =========================
        // ARRAYS OBRIGATÓRIOS
        // =========================
        var colleagueIds = serviceHelper.instantiate('net.java.dev.jaxb.array.StringArray');
	
        var aprovadores = ds.getValue(0, "aprovadores");
	
        if (aprovadores) {	
        	var listaAprovadores = aprovadores.split(",");
	
        	for (var i = 0; i < listaAprovadores.length; i++) {
	
        		var aprovador = listaAprovadores[i].trim();
	
        		if (aprovador) {
        			colleagueIds.getItem().add(aprovador);
        		}
        	}
        }
        
        var attachments = serviceHelper.instantiate('com.totvs.technology.ecm.workflow.ws.ProcessAttachmentDtoArray');
        var appointments = serviceHelper.instantiate('com.totvs.technology.ecm.workflow.ws.ProcessTaskAppointmentDtoArray');

        // =========================
        // EXECUTA
        // =========================
        var result = service.saveAndSendTask(
            username,
            password,
            companyId,
            data.processInstanceId,
            data.choosedState,
            colleagueIds,
            "Ajuste via timesheet",
            data.usuarioExecucao,
            data.completeTask,
            attachments,
            cardData,
            appointments,
            false,
            0
        );

        var retorno = parseResult(result);

        if(retorno.ERROR){
        	dataset.addRow(["ERRO", retorno.ERROR]);
        	
            throw retorno.ERROR;
        }

        dataset.addRow(["OK", "Atualizado com sucesso"]);

    } catch(e){
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

function parseResult(result){
    var obj = {};

    for (var i = 0; i < result.getItem().size(); i++) {
        var item = result.getItem().get(i).getItem();
        obj[item.get(0)] = item.get(1);
    }

    return obj;
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
