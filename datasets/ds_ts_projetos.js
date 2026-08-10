function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();    
    
    var codSistema  = "M";
    var codSentenca = "ProjetoAtivo";
	
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
            ""
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

    return dataset;
}