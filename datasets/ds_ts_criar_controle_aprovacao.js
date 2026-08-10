function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();
    
    var credencial = getCredenciais();

    dataset.addColumn("STATUS");
    dataset.addColumn("DOCUMENTID");
    dataset.addColumn("IDCONTROLE");
    dataset.addColumn("MESSAGE");

    try {
        // =====================================================
        // CONFIG
        // =====================================================
        var companyId = parseInt(getValue("WKCompany"));
        var username = credencial[0];
        var password = credencial[1];
        var parentDocumentId = 30409;

        // =====================================================
        // DADOS
        // ===================================================== 
        var status       = "PENDENTE";
        var total        = "0";
        var processados  = "0";
        var sucesso      = "0";
        var erro         = "0";

        var dataInicio   = new Date().toString();
        var dataFim      = "";

        var filtrosJson  = "{}";
        
        var tipoRegistro = "";
        var controlePaiId = "";
        var worker = "";
        var vlrOffset = "0";
        var vlrLimit = "0";
        
        var solicitacoesJson = "[]";

        // =====================================================
        // LER CONSTRAINTS
        // =====================================================
        if(constraints){        	
            for(var i=0;i<constraints.length;i++){   
            	
		        if(constraints[i].fieldName == "status"){
		        	status = constraints[i].initialValue;
		        }        
		        if(constraints[i].fieldName == "total"){
		        	total = constraints[i].initialValue;
		        }        
		        if(constraints[i].fieldName == "processados"){
		        	processados = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "sucesso"){
		        	sucesso = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "erro"){
		        	erro = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "dataInicio"){
		        	dataInicio = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "dataFim"){
		        	dataFim = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "filtrosJson"){
		        	filtrosJson = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "tipoRegistro"){
		            tipoRegistro = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "controlePaiId"){
		            controlePaiId = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "worker"){
		            worker = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "vlrOffset"){
		            vlrOffset = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "vlrLimit"){
		            vlrLimit = constraints[i].initialValue;
		        }
		        if(constraints[i].fieldName == "solicitacoesJson"){
		            solicitacoesJson = constraints[i].initialValue;
		        }
            }
        }
        
        var idControle   = tipoRegistro + "_" + new Date().getTime();
        
        // =====================================================
        // VALIDA PROCESSAMENTO ATIVO
        // =====================================================
        var dsControle = DatasetFactory.getDataset("dsControleAprovacaoTotal",null,null,null);

        if (tipoRegistro == "MASTER") {

            for (var i = 0; i < dsControle.rowsCount; i++) {

                if (!isUltimaVersaoDocumento(dsControle, i)) {
                    continue;
                }

                var statusAtual = dsControle.getValue(i,"status");
                var tipoAtual = dsControle.getValue(i,"tipoRegistro");

                if (tipoAtual == "MASTER" && (statusAtual == "PENDENTE" || statusAtual == "PROCESSANDO")){
                    dataset.addRow([
                        "ERRO",
                        "",
                        "",
                        "Ja existe um processamento ativo"
                    ]);

                    return dataset;
                }
            }
        }

        // =====================================================
        // SERVICE
        // =====================================================
        var serviceManager = ServiceManager.getService("ECMCardService");
        var helper = serviceManager.getBean();
        var locator = helper.instantiate("com.totvs.technology.ecm.dm.ws.ECMCardServiceService");
        var service = locator.getCardServicePort();

        // =====================================================
        // CARD DTO ARRAY
        // =====================================================
        var cardDtoArray = helper.instantiate("com.totvs.technology.ecm.dm.ws.CardDtoArray");

        var cardDto = helper.instantiate("com.totvs.technology.ecm.dm.ws.CardDto");

        // =====================================================
        // CARD DATA
        // =====================================================
        function addField(field, value) {
            var fieldDto = helper.instantiate("com.totvs.technology.ecm.dm.ws.CardFieldDto");

            fieldDto.setField(field);
            fieldDto.setValue(String(value));
            cardDto.getCardData().add(fieldDto);
        }

        // =====================================================
        // CAMPOS FORM
        // =====================================================
        addField("idControle", idControle);
        addField("status", status);
        addField("total", total);
        addField("processados", processados);
        addField("sucesso", sucesso);
        addField("erro", erro);
        addField("dataInicio", dataInicio);
        addField("dataFim", dataFim);
        addField("filtrosJson", filtrosJson);
        addField("tipoRegistro", tipoRegistro);
        addField("controlePaiId", controlePaiId);
        addField("worker", worker);
        addField("vlrOffset", vlrOffset);
        addField("vlrLimit", vlrLimit);
        addField("solicitacoesJson", solicitacoesJson);

        // =====================================================
        // CARD
        // =====================================================
        cardDto.setParentDocumentId(parentDocumentId);
        cardDto.setInheritSecurity(true);
        cardDto.setDocumentDescription("Controle - " + idControle);

        cardDtoArray.getItem().add(cardDto);

        // =====================================================
        // CREATE
        // =====================================================
        var result = service.create(
            companyId,
            username,
            password,
            cardDtoArray
        );

        // =====================================================
        // RESULT
        // =====================================================

        var items = result.getItem();        
        
        if (items == null || items.size() == 0) {
            dataset.addRow([
                "ERRO",
                "",
                "",
                "Nenhum retorno do serviço"
            ]);

            return dataset;
        }
        
        var item = items.get(0);
        var message = item.getWebServiceMessage();
        
        if(String(message).toLowerCase() != "ok"){
        	dataset.addRow([
                "ERRO",
                "",
                "",
                item.getWebServiceMessage()
            ]);
        }

        dataset.addRow([
            "OK",
            String(item.getDocumentId()),
            idControle,
            "Controle criado com sucesso"
        ]);

    } catch (e) {
        dataset.addRow([
            "ERRO",
            "",
            "",
            String(e)
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
