function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");

    var documentId = "";
    var controlePaiId = "";
    var inicioScheduler = new Date().getTime();
    
    var workerFiltro = "";

    if (constraints) {
        for (var c = 0; c < constraints.length; c++) {

            if (constraints[c].fieldName == "WORKER") {
                workerFiltro =
                    String(
                        constraints[c].initialValue || ""
                    );

                break;
            }
        }
    }

    if (!workerFiltro) {
        dataset.addRow([
            "ERRO",
            "WORKER nao informado"
        ]);

        return dataset;
    } 

    try {
        log.info("### SCHEDULER APROVACAO MASSIVA START ###");

        var dsControleFull = DatasetFactory.getDataset("dsControleAprovacaoTotal", null, null, null);

        var controleIndex = -1;
        
        for (var i = 0; i < dsControleFull.rowsCount; i++) {

            if (!isUltimaVersaoDocumento(dsControleFull, i)) {
                continue;
            }

            var status =
                dsControleFull.getValue(i, "status");

            var lock =
                dsControleFull.getValue(i, "lockProcessamento");

            var tipo =
                dsControleFull.getValue(i, "tipoRegistro");

            var worker =
                String(
                    dsControleFull.getValue(i, "worker") || ""
                );

            if (
                tipo == "WORKER" &&
                worker == workerFiltro &&
                status == "PENDENTE" &&
                lock != "true"
            ) {

                controleIndex = i;

                break;
            }
        }

        if (controleIndex == -1) {
            dataset.addRow(["OK", "Nenhum worker pendente"]);
            return dataset;
        }

        controlePaiId =
            dsControleFull.getValue(
                controleIndex,
                "controlePaiId"
            );
        
        atualizarControle(controlePaiId, {
            status: "PROCESSANDO",
            dataFim: ""
        });

        processarWorker(
    	    dsControleFull,
    	    controleIndex
    	);

    	atualizarMaster(controlePaiId);

    	dataset.addRow([
            "OK",
            "Worker " + workerFiltro + " processado com sucesso"
        ]);

    } catch (e) {

        log.error("### ERRO SCHEDULER ###");
        log.error(e);

        try {
            if (documentId) {
                atualizarControle(documentId, {
                    status: "ERRO",
                    lockProcessamento: "false"
                });
            }

            if (controlePaiId) {
                atualizarMaster(controlePaiId);
            }

        } catch (ex) {
            log.error("Erro liberando lock");
            log.error(ex);
        }

        dataset.addRow([
            "ERRO",
            e.message ? e.message : String(e)
        ]);
    }

    var fimScheduler = new Date().getTime();

    return dataset;
}



function isUltimaVersaoDocumento(ds, rowIndex) {
    var documentId = String(ds.getValue(rowIndex, "metadata#id") || "");
    var version = parseInt(ds.getValue(rowIndex, "metadata#version") || ds.getValue(rowIndex, "version") || "0", 10);

    if (documentId === "") {
        return false;
    }

    if (isNaN(version)) {
        version = 0;
    }

    for (var i = 0; i < ds.rowsCount; i++) {
        var idAtual = String(ds.getValue(i, "metadata#id") || "");

        if (idAtual !== documentId) {
            continue;
        }

        var versionAtual = parseInt(ds.getValue(i, "metadata#version") || ds.getValue(i, "version") || "0", 10);

        if (isNaN(versionAtual)) {
            versionAtual = 0;
        }

        if (versionAtual > version) {
            return false;
        }
    }

    return true;
}

function processarWorker(dsControleFull, controleIndex) {

    documentId = dsControleFull.getValue(controleIndex, "metadata#id");
    var controlePaiId = dsControleFull.getValue(controleIndex, "controlePaiId");
    var total = parseInt(dsControleFull.getValue(controleIndex, "total") || "0");
    var errosDetalhadosAtual = String(dsControleFull.getValue(controleIndex, "errosDetalhados") || "");

    atualizarControle(documentId, {
        status: "PROCESSANDO",
        lockProcessamento: "true"
    });

    var solicitacoesJson = dsControleFull.getValue(controleIndex, "solicitacoesJson") || "[]";

    var solicitacoes = [];

    try {
        solicitacoes = JSON.parse(solicitacoesJson);
    } catch (e) {
        throw "Erro ao fazer parse de solicitacoesJson do worker " + documentId + ": " + e;
    }

    if (!solicitacoes || solicitacoes.length == 0) {

        atualizarControle(documentId, {
            status: "FINALIZADO",
            processados: "0",
            sucesso: "0",
            erro: "0",
            dataFim: new Date().toString(),
            lockProcessamento: "false"
        });

        return;
    }

    var sucessoChunk = 0;
    var erroChunk = 0;

    var inicioChunk = new Date().getTime();
    
    var ecm = criarECMCardService();

    for (var i = 0; i < solicitacoes.length; i++) {

        var nrSolicitacao = "";

        try {
            var item = solicitacoes[i];

            nrSolicitacao = String(item.nrSolicitacao);
            
            if (!item.documentId) {
                throw "documentId não informado para solicitação " + nrSolicitacao;
            }

            var agora = new Date();

            function leftPad(v) {
                return v < 10 ? "0" + v : String(v);
            }

            var dtAtual =
                leftPad(agora.getDate()) + "/" +
                leftPad(agora.getMonth() + 1) + "/" +
                agora.getFullYear();

            var hrAtual =
                leftPad(agora.getHours()) + ":" +
                leftPad(agora.getMinutes());

            var retorno = aprovarSolicitacaoMassiva(
        	    ecm,
        	    item.documentId,
        	    {
        	        nmAprovGestor: "Admin Timesheet",
        	        dtAprovGestor: dtAtual,
        	        hrAprovGestor: hrAtual,
        	        statusAprovGestor: "Aprovado",
        	        justificativaGestor: "Aprovação total"
        	    }
        	);

        	if (retorno.STATUS == "OK") {
        	    sucessoChunk++;
        	} else {
        	    erroChunk++;

        	    log.error("Erro solicitacao " + nrSolicitacao + ": " + retorno.MESSAGE);

        	    errosDetalhadosAtual += montarLogErro(
        	        nrSolicitacao,
        	        retorno.MESSAGE
        	    );
        	}

        } catch (e) {

            erroChunk++;

            var erroCatch = e.message ? e.message : String(e);

            log.error(erroCatch);

            errosDetalhadosAtual += montarLogErro(nrSolicitacao, erroCatch);
        }
    }

    var fimChunk = new Date().getTime();

    var processados = sucessoChunk + erroChunk;
    
    var tempoWorkerSegundos = (fimChunk - inicioChunk) / 1000;
    var mediaPorItem = processados > 0
        ? (tempoWorkerSegundos / processados)
        : 0;

    var statusFinalWorker = (erroChunk > 0) ? "FINALIZADO_COM_ERRO" : "FINALIZADO";

    atualizarControle(documentId, {
      status: statusFinalWorker,
      processados: String(processados),
      sucesso: String(sucessoChunk),
      erro: String(erroChunk),
      errosDetalhados: errosDetalhadosAtual,
      lockProcessamento: "false",
      dataFim: new Date().toString()
    });
}

function montarLogErro(nrSolicitacao, mensagem) {

    var agoraErro = new Date();

    return ""
        + "[" + agoraErro.toLocaleString() + "]\n"
        + "Solicitação: " + nrSolicitacao + "\n"
        + "Erro: " + mensagem + "\n"
        + "-----------------------------------\n\n";
}

function atualizarControle(documentId, dados) {

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "documentId",
            String(documentId),
            String(documentId),
            ConstraintType.MUST
        )
    );

    for (var campo in dados) {
        constraints.push(
            DatasetFactory.createConstraint(
                campo,
                String(dados[campo]),
                String(dados[campo]),
                ConstraintType.MUST
            )
        );
    }

    var dsUpdate = DatasetFactory.getDataset(
        "ds_ts_atualizar_controle_aprovacao",
        null,
        constraints,
        null
    );

    if (dsUpdate.rowsCount > 0) {

        var status = dsUpdate.getValue(0, "STATUS");

        if (status == "ERRO") {
            throw dsUpdate.getValue(0, "MESSAGE");
        }
    }
}

function atualizarMaster(masterId) {

  var ds = DatasetFactory.getDataset("dsControleAprovacaoTotal", null, null, null);

  var totalProcessados = 0;
  var totalSucesso = 0;
  var totalErro = 0;

  var workersFinalizados = 0;
  var totalWorkers = 0;

  for (var i = 0; i < ds.rowsCount; i++) {

    if (!isUltimaVersaoDocumento(ds, i)) {
      continue;
    }

    var pai = ds.getValue(i, "controlePaiId");
    if (String(pai) != String(masterId)) continue;

    // Só worker entra na consolidação
    var tipo = String(ds.getValue(i, "tipoRegistro") || "");
    if (tipo !== "WORKER") continue;

    totalWorkers++;

    var proc = parseInt(ds.getValue(i, "processados") || "0", 10);
    var suc  = parseInt(ds.getValue(i, "sucesso") || "0", 10);
    var err  = parseInt(ds.getValue(i, "erro") || "0", 10);

    totalProcessados += proc;
    totalSucesso += suc;
    totalErro += err;

    var statusWorker = String(ds.getValue(i, "status") || "");

    // considera finalizados também quando FINALIZADO_COM_ERRO
    if (statusWorker === "FINALIZADO" || statusWorker === "ERRO" || statusWorker === "FINALIZADO_COM_ERRO") {
      workersFinalizados++;
    }
  }

  var statusMaster = "PROCESSANDO";

  if (totalWorkers > 0 && workersFinalizados === totalWorkers) {
    statusMaster = (totalErro > 0) ? "FINALIZADO_COM_ERRO" : "FINALIZADO";
  }

  atualizarControle(masterId, {
    status: statusMaster,
    processados: String(totalProcessados),
    sucesso: String(totalSucesso),
    erro: String(totalErro),
    dataFim: (statusMaster === "FINALIZADO" || statusMaster === "FINALIZADO_COM_ERRO")
      ? new Date().toString()
      : ""
  });
}

function criarECMCardService() {

    var companyId = parseInt(getValue("WKCompany"));
    var credencial = getCredenciais();

    var username = credencial[0];
    var password = credencial[1];

    var serviceManager = ServiceManager.getService("ECMCardService");
    var helper = serviceManager.getBean();

    var locator = helper.instantiate(
        "com.totvs.technology.ecm.dm.ws.ECMCardServiceService"
    );

    var service = locator.getCardServicePort();

    return {
        companyId: companyId,
        username: username,
        password: password,
        helper: helper,
        service: service
    };
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

function aprovarSolicitacaoMassiva(ecm, documentId, campos) {

    try {

        if (!documentId) {
            throw "documentId não informado";
        }

        var cardDataArray = ecm.helper.instantiate(
            "com.totvs.technology.ecm.dm.ws.CardFieldDtoArray"
        );

        function addField(field, value) {

            var fieldDto = ecm.helper.instantiate(
                "com.totvs.technology.ecm.dm.ws.CardFieldDto"
            );

            fieldDto.setField(field);
            fieldDto.setValue(value == null ? "" : String(value));

            cardDataArray.getItem().add(fieldDto);
        }

        addField("nmAprovGestor", campos.nmAprovGestor);
        addField("dtAprovGestor", campos.dtAprovGestor);
        addField("hrAprovGestor", campos.hrAprovGestor);
        addField("statusAprovGestor", campos.statusAprovGestor);
        addField("justificativaGestor", campos.justificativaGestor);

        var result = ecm.service.updateCardData(
            ecm.companyId,
            ecm.username,
            ecm.password,
            parseInt(documentId),
            cardDataArray
        );

        var items = result.getItem();

        if (items == null || items.size() == 0) {
            throw "Nenhum retorno do updateCardData";
        }

        var item = items.get(0);
        var message = String(item.getWebServiceMessage());

        if (message.toLowerCase() != "ok") {
            throw message;
        }

        return {
            STATUS: "OK",
            MESSAGE: "Solicitação aprovada"
        };

    } catch (e) {

        return {
            STATUS: "ERRO",
            MESSAGE: e.message ? e.message : String(e)
        };
    }
}