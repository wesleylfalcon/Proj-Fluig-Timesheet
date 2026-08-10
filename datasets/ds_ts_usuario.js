function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    
    // Adiciona colunas ao dataset
    dataset.addColumn("ERRO");
    dataset.addColumn("CODIGO");
    
    var codSentenca  = "SQL.DAVI.TS.0003";
    var codSistema   = "M";
    var emailUsuario = "";

    // Verifica se veio alguma constraint para CODCUSTO
    if (constraints !== null && constraints.length > 0) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "EMAIL") {
            	emailUsuario = constraints[i].initialValue;
            }
        }
    }

    try {
        // Chamada do serviço
        var servico = ServiceManager.getServiceInstance("wsConsultaSQL");
        var instancia = servico.instantiate("com.totvs.WsConsultaSQL");
        var ws = instancia.getRMIwsConsultaSQL();            
        var serviceHelper = servico.getBean(); 
        var authService = serviceHelper.getBasicAuthenticatedClient(ws, "com.totvs.IwsConsultaSQL", '${USER}', '}PW{$8%FeytaqK7-}eQx');  
        var result = authService.realizarConsultaSQL(
            codSentenca,
            1,
            codSistema,
            "EMAIL="+emailUsuario
        );

        // Parse do XML retornado
        var xml = new XML(result);
        var registros = xml.Resultado;

        for each (var item in registros) {
            dataset.addRow([
                "",
                item.CODIGO.toString()
            ]);
        }

    } catch (e) {
        dataset.addRow(["Erro: " + e.message, ""]);
    }

    return dataset;
}