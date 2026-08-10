function createDataset(fields, constraints, sortFields) {

    log.info("============== aprovar solicitacao");

    var dataset = DatasetBuilder.newDataset();
    
    var credencial = getCredenciais();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");

    try {

        var comentario = "";
        var json = getConstraint(constraints, "DATA");

        if (!json) {
            throw "Constraint DATA não informada";
        }

        var data = JSON.parse(json);

        var serviceHelper = ServiceManager.getService("ECMWorkflowEngineService").getBean();
        var serviceLocator = serviceHelper.instantiate("com.totvs.technology.ecm.workflow.ws.ECMWorkflowEngineServiceService");
        var service = serviceLocator.getWorkflowEngineServicePort();

        var companyId = parseInt(getValue("WKCompany"));

        var username = credencial[0];
        var password = credencial[1];

        // =====================================================
        // DADOS DA SOLICITAÇÃO
        // =====================================================
        var dados = data.snapshot || null;

        if (!dados) {

            var c1 = DatasetFactory.createConstraint(
                "SOLICITACAO",
                data.processInstanceId,
                data.processInstanceId,
                ConstraintType.MUST
            );

            var ds = DatasetFactory.getDataset(
                "ds_ts_consultar_solicitacao",
                null,
                [c1],
                null
            );

            if (!ds || ds.rowsCount == 0) {
                dataset.addRow([
                    "ERRO",
                    "Solicitação não encontrada"
                ]);

                throw "Solicitação não encontrada";
            }

            dados = {
                nrSolicitacao: ds.getValue(0, "nrSolicitacao"),
                matrSolicitante: ds.getValue(0, "matrSolicitante"),
                codRM: ds.getValue(0, "codRM"),
                aprovadores: ds.getValue(0, "aprovadores"),
                nmSolicitante: ds.getValue(0, "nmSolicitante"),
                dtAbertura: ds.getValue(0, "dtAbertura"),
                hrAbertura: ds.getValue(0, "hrAbertura"),
                dtCompetencia: ds.getValue(0, "dtCompetencia"),
                nmAprovGestor: ds.getValue(0, "nmAprovGestor"),
                dtAprovGestor: ds.getValue(0, "dtAprovGestor"),
                hrAprovGestor: ds.getValue(0, "hrAprovGestor"),
                statusAprovGestor: ds.getValue(0, "statusAprovGestor"),
                justificativaGestor: ds.getValue(0, "justificativaGestor"),
                nmProjeto: ds.getValue(0, "nmProjeto"),
                idProjeto: ds.getValue(0, "idProjeto"),
                codProjeto: ds.getValue(0, "codProjeto"),
                nmTarefa: ds.getValue(0, "nmTarefa"),
                codTarefa: ds.getValue(0, "codTarefa"),
                idISM: ds.getValue(0, "idISM"),
                idTRF: ds.getValue(0, "idTRF"),
                dtApontamento: ds.getValue(0, "dtApontamento"),
                hrApontamento: ds.getValue(0, "hrApontamento"),
                observacao: ds.getValue(0, "observacao")
            };
        }

        // =====================================================
        // CARD DATA
        // =====================================================
        var cardData = serviceHelper.instantiate(
            'net.java.dev.jaxb.array.StringArrayArray'
        );

        function addCard(key, value) {
            var item = serviceHelper.instantiate(
                'net.java.dev.jaxb.array.StringArray'
            );

            item.getItem().add(key);
            item.getItem().add(value || "");

            cardData.getItem().add(item);
        }

        // =====================================================
        // MANTÉM CAMPOS ATUAIS
        // =====================================================
        addCard("aprovadores", dados.aprovadores);
        addCard("matrSolicitante", dados.matrSolicitante);
        addCard("nmSolicitante", dados.nmSolicitante);
        addCard("dtAbertura", dados.dtAbertura);
        addCard("hrAbertura", dados.hrAbertura);
        addCard("nrSolicitacao", dados.nrSolicitacao);
        addCard("dtCompetencia", dados.dtCompetencia);
        addCard("nmProjeto", dados.nmProjeto);
        addCard("idProjeto", dados.idProjeto);
        addCard("codProjeto", dados.codProjeto);
        addCard("nmTarefa", dados.nmTarefa);
        addCard("codTarefa", dados.codTarefa);
        addCard("idISM", dados.idISM);
        addCard("idTRF", dados.idTRF);
        addCard("observacao", dados.observacao);
        addCard("dtApontamento", dados.dtApontamento);

        if (data.campos && data.campos.horasAprovadas) {
            addCard("hrApontamento", data.campos.horasAprovadas);
        } else {
            addCard("hrApontamento", dados.hrApontamento);
        }

        // =====================================================
        // CAMPOS APROVAÇÃO
        // =====================================================
        addCard("nmAprovGestor", data.campos.nmAprovGestor);
        addCard("dtAprovGestor", data.campos.dtAprovGestor);
        addCard("hrAprovGestor", data.campos.hrAprovGestor);
        addCard("statusAprovGestor", data.campos.statusAprovGestor);
        addCard("justificativaGestor", data.campos.justificativaGestor);

        // =====================================================
        // ARRAYS OBRIGATÓRIOS
        // =====================================================
        var colleagueIds = serviceHelper.instantiate(
            'net.java.dev.jaxb.array.StringArray'
        );

        if (data.acao == "APROVAR") {

            var aprovadores = dados.aprovadores;

            if (aprovadores) {

                var listaAprovadores = aprovadores.split(",");

                for (var i = 0; i < listaAprovadores.length; i++) {

                    var aprovador = listaAprovadores[i].trim();

                    if (aprovador) {
                        colleagueIds.getItem().add(aprovador);
                    }
                }
            }

            comentario = "Aprovação via timesheet";
        }

        if (data.acao == "REVISAR") {

            var solicitante = dados.matrSolicitante;

            if (solicitante) {
                colleagueIds.getItem().add(solicitante);
            }

            comentario =
                "Revisão via timesheet - " +
                data.campos.justificativaGestor;
        }

        if (data.acao == "REPROVAR") {
            comentario =
                "Reprovação via timesheet - " +
                data.campos.justificativaGestor;
        }

        var attachments = serviceHelper.instantiate(
            'com.totvs.technology.ecm.workflow.ws.ProcessAttachmentDtoArray'
        );

        var appointments = serviceHelper.instantiate(
            'com.totvs.technology.ecm.workflow.ws.ProcessTaskAppointmentDtoArray'
        );

        // =====================================================
        // EXECUTA
        // =====================================================
        var result = service.saveAndSendTask(
            username,
            password,
            companyId,
            data.processInstanceId,
            data.choosedState,
            colleagueIds,
            comentario,
            data.usuarioExecucao,
            data.completeTask,
            attachments,
            cardData,
            appointments,
            false,
            0
        );

        var retorno = parseResult(result);

        if (retorno.ERROR) {
            dataset.addRow([
                "ERRO",
                retorno.ERROR
            ]);

            throw retorno.ERROR;
        }

        dataset.addRow([
            "OK",
            "Solicitação aprovada"
        ]);

    } catch (e) {

        dataset.addRow([
            "ERRO",
            e.message || String(e)
        ]);
    }

    return dataset;
}

// =====================================================
// HELPERS
// =====================================================
function getConstraint(constraints, name) {

    if (!constraints) {
        return null;
    }

    for (var i = 0; i < constraints.length; i++) {

        if (constraints[i].fieldName == name) {
            return constraints[i].initialValue;
        }
    }

    return null;
}

function parseResult(result) {

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