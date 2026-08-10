function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    
    // Adiciona colunas ao dataset
    dataset.addColumn("ERRO");
    dataset.addColumn("IDPROJETO");
    dataset.addColumn("CODPROJETO");
    dataset.addColumn("PROJETO");
    dataset.addColumn("IDTAREFA");
    dataset.addColumn("IDISM");
    dataset.addColumn("IDTRF");
    dataset.addColumn("TAREFA");
    dataset.addColumn("HORAPREVISTA");
    dataset.addColumn("HORAREALIZADA");
    dataset.addColumn("INICIOPREVISTO");
    dataset.addColumn("FIMPREVISTO");
    dataset.addColumn("STATUS");
    
    var codSentenca = "SQL.DAVI.TS.0002";
    var codSistema  = "M";
    var codUsuario  = "";

    // Verifica se veio alguma constraint para CODCUSTO
    if (constraints !== null && constraints.length > 0) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "CODIGO") {
            	codUsuario = constraints[i].initialValue;
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
            "CODIGO="+codUsuario
        );

        // Parse do XML retornado
        var xml = new XML(result);
        var registros = xml.Resultado;

        for each (var item in registros) {
            dataset.addRow([
                "",
                getXmlValue(item, "IDPRJ") || getXmlValue(item, "IDPROJETO"),
                getXmlValue(item, "CODIGO_PRJ") || getXmlValue(item, "CODPRJ"),
                getXmlValue(item, "PROJETO"),
                getXmlValue(item, "CODIGO_TAREFA"),
                getXmlValue(item, "IDISM"),
                getXmlValue(item, "IDTRF"),
                getXmlValue(item, "TAREFA"),
                formatarHora(item.HORAS_PREVISTAS.toString()),
                formatarHora(item.HORAS_REALIZADAS.toString()),
                formatarData(item.INICIO_PREVISTO.toString()),
                formatarData(item.FIM_PLAN.toString()),
                item.STATUS_ATIVIDADE.toString()
            ]);
        }

    } catch (e) {
        dataset.addRow(["Erro: " + e.message, "", "", "", "", "", "", "", "", "", "", "", ""]);
    }

    return dataset;
}

//==============================
//Funções auxiliares
//==============================
function getXmlValue(item, column) {
    try {
        var value = item[column];

        if (value === null || value === undefined) {
            return "";
        }

        return value.toString();
    } catch (e) {
        return "";
    }
}


function formatarData(dataIso){

    if(!dataIso) return "";

    try{

        var data = dataIso.split("T")[0];
        var partes = data.split("-");

        var ano = partes[0];
        var mes = partes[1];
        var dia = partes[2];

        return dia + "/" + mes + "/" + ano;

    } catch(e){
        return dataIso;
    }
}

function formatarHora(valor){
    if(valor == null || valor === "") return "";

    try{

        var numero = parseFloat(valor);

        if (numero % 1 === 0) {
            return numero.toString();
        }

        return numero.toFixed(2).replace(".", ",");

    } catch(e){
        return valor;
    }
}
