function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();
    
    var credencial = getCredenciais();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");

    try {

        // =====================================================
        // PARAMS
        // =====================================================
        var documentId = "";
        var status = "";
        var total = "";
        var processados = "";
        var sucesso = "";
        var erro = "";
        var dataFim = "";
        var filtrosJson = "";
        var errosDetalhados = "";
        var ultimaAtualizacao = "";
        var taxaProcessamento = "";
        var usuarioExecucao = "";
        var lockProcessamento = "";

        // =====================================================
        // CONSTRAINTS
        // =====================================================
        if (constraints != null) {
            for (var i = 0; i < constraints.length; i++) {
                var c = constraints[i];

                if (c.fieldName == "documentId") {
                    documentId = c.initialValue;
                }

                if (c.fieldName == "status") {
                    status = c.initialValue;
                }

                if (c.fieldName == "total") {
                    total = c.initialValue;
                }

                if (c.fieldName == "processados") {
                    processados = c.initialValue;
                }

                if (c.fieldName == "sucesso") {
                    sucesso = c.initialValue;
                }

                if (c.fieldName == "erro") {
                    erro = c.initialValue;
                }

                if (c.fieldName == "dataFim") {
                    dataFim = c.initialValue;
                }

                if (c.fieldName == "filtrosJson") {
                    filtrosJson = c.initialValue;
                }
                
                if (c.fieldName == "errosDetalhados") {
                    errosDetalhados = c.initialValue;
                }

                if (c.fieldName == "ultimaAtualizacao") {
                    ultimaAtualizacao = c.initialValue;
                }

                if (c.fieldName == "taxaProcessamento") {
                    taxaProcessamento = c.initialValue;
                }

                if (c.fieldName == "usuarioExecucao") {
                    usuarioExecucao = c.initialValue;
                }

                if (c.fieldName == "lockProcessamento") {
                    lockProcessamento = c.initialValue;
                }
            }
        }

        // =====================================================
        // VALIDACAO
        // =====================================================
        if (documentId == "") {
            dataset.addRow([
                "ERRO",
                "documentId nao informado"
            ]);

            return dataset;
        }

        // =====================================================
        // CONFIG
        // =====================================================
        var companyId = parseInt(getValue("WKCompany"));
        var username = credencial[0];
        var password = credencial[1];

        // =====================================================
        // SERVICE
        // =====================================================
        var serviceManager = ServiceManager.getService("ECMCardService");
        var helper = serviceManager.getBean();
        var locator = helper.instantiate("com.totvs.technology.ecm.dm.ws.ECMCardServiceService");
        var service = locator.getCardServicePort();

        // =====================================================
        // CARD DATA ARRAY
        // =====================================================
        var cardDataArray = helper.instantiate("com.totvs.technology.ecm.dm.ws.CardFieldDtoArray");

        function addField(field, value) {
            if (value == null || value == undefined) {
                return;
            }

            if (String(value) == "") {
                return;
            }

            var fieldDto = helper.instantiate("com.totvs.technology.ecm.dm.ws.CardFieldDto");

            fieldDto.setField(field);
            fieldDto.setValue(String(value));
            cardDataArray.getItem().add(fieldDto);
        }

        // =====================================================
        // CAMPOS
        // =====================================================
        addField("status", status);
        addField("total", total);
        addField("processados", processados);
        addField("sucesso", sucesso);
        addField("erro", erro);
        addField("dataFim", dataFim);
        addField("filtrosJson", filtrosJson);
        addField("errosDetalhados", errosDetalhados);
        addField("ultimaAtualizacao", ultimaAtualizacao);
        addField("taxaProcessamento", taxaProcessamento);
        addField("usuarioExecucao", usuarioExecucao);
        addField("lockProcessamento", lockProcessamento);

        // =====================================================
        // UPDATE CARD DATA
        // =====================================================
        var result = service.updateCardData(
            companyId,
            username,
            password,
            parseInt(documentId),
            cardDataArray
        );

        // =====================================================
        // RESULT
        // =====================================================
        var items = result.getItem();        
        
        if (items == null || items.size() == 0) {
            dataset.addRow([
                "ERRO",
                "Nenhum retorno do serviço"
            ]);

            return dataset;
        }
        
        var item = items.get(0);
        var message = item.getWebServiceMessage();

        if (String(message).toLowerCase() != "ok") {
            dataset.addRow([
                "ERRO",
                String(message)
            ]);

            return dataset;
        }
        
        dataset.addRow([
            "OK",
            "Controle atualizado com sucesso"
        ]);

    } catch (e) {

        log.error("### ERRO UPDATE CARD DATA ###");

        log.error(e);

        dataset.addRow([
            "ERRO",
            e.message ? e.message : String(e)
        ]);
    }

    return dataset;
}

//=====================================================
//HELPERS
//=====================================================
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