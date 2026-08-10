var DATASET_LOTES_RM = "dsLotesRMEnviados";
var SERVICE_CODE_API_RM = "API_RM";
var ENDPOINT_API_LOTE = "/framework/v1/metadata/data/PRJ4944384";
var CODCOLIGADA_FIXA = "1";
var RECCREATEDBY_FIXO = "${USER}";
var TIMEZONE_RM = "-03:00";

/*
 * Dataset: ds_ts_envia_apontamento
 *
 * Novo modelo:
 * - Busca todos os apontamentos aprovados aptos ao envio.
 * - Monta 1 lote único no formato da API RM.
 * - Obtém o próximo IDLOTE pelo dataset GED/form dsLotesRMEnviados.
 * - Envia o JSON para o serviço Fluig API_RM:
 *   POST /framework/v1/metadata/data/PRJ4944384
 *
 * Constraints opcionais:
 * - COMPETENCIA: filtra dtCompetencia. Ex.: 07/2026
 * - DATA_INICIO: filtra dtApontamento inicial. Ex.: 01/07/2026
 * - DATA_FIM: filtra dtApontamento final. Ex.: 31/07/2026
 * - IDLOTE: força IDLOTE para teste manual.
 * - DRY_RUN: SIM monta o lote sem enviar para API.
 * - RETORNAR_PAYLOAD: SIM retorna o payload no dataset. Use apenas em testes pequenos.
 */
function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("IDLOTE");
    dataset.addColumn("QTDREGISTROS");
    dataset.addColumn("HTTP_STATUS");
    dataset.addColumn("RETORNO_API");
    dataset.addColumn("PAYLOAD");

    try {
        var filtros = lerConstraints(constraints);

        var apontamentos = buscarApontamentosAprovados(filtros);

        if (apontamentos.length === 0) {
            dataset.addRow([
                "VAZIO",
                "Nenhum apontamento aprovado apto para envio ao RM foi encontrado.",
                "",
                "0",
                "",
                "",
                ""
            ]);
            return dataset;
        }

        var idLote = filtros.idLote !== ""
            ? filtros.idLote
            : String(obterProximoIdLoteGED());

        var conteudoLote = montarConteudoLote(apontamentos);
        var payloadObj = montarPayloadLote(idLote, apontamentos.length, conteudoLote);
        var payloadJson = JSON.stringify(payloadObj);

        if (filtros.dryRun === "SIM") {
            dataset.addRow([
                "DRY_RUN",
                "Payload montado com sucesso. Nenhum envio foi realizado.",
                idLote,
                String(apontamentos.length),
                "",
                "",
                filtros.retornarPayload === "SIM" ? payloadJson : limitarTexto(payloadJson, 4000)
            ]);
            return dataset;
        }

        var retorno = enviarLoteApiRM(payloadObj);

        var statusOk = retorno.httpStatus >= 200 && retorno.httpStatus < 300;

        dataset.addRow([
            statusOk ? "OK" : "ERRO",
            statusOk
                ? "Lote de apontamentos enviado à API RM com sucesso."
                : "Erro ao enviar lote de apontamentos à API RM.",
            idLote,
            String(apontamentos.length),
            String(retorno.httpStatus),
            limitarTexto(retorno.result, 4000),
            filtros.retornarPayload === "SIM" ? payloadJson : ""
        ]);

    } catch (e) {
        log.error("### ds_ts_envia_apontamento ### ERRO");
        log.error(e);

        dataset.addRow([
            "ERRO",
            getMensagemErro(e),
            "",
            "",
            "",
            "",
            ""
        ]);
    }

    return dataset;
}

function lerConstraints(constraints) {
    var filtros = {
        competencia: "",
        dataInicio: "",
        dataFim: "",
        idLote: "",
        dryRun: "NAO",
        retornarPayload: "NAO"
    };

    if (!constraints) {
        return filtros;
    }

    for (var i = 0; i < constraints.length; i++) {
        var field = String(constraints[i].fieldName || "").toUpperCase();
        var value = safe(constraints[i].initialValue);

        if (field === "COMPETENCIA") filtros.competencia = value;
        if (field === "DATA_INICIO" || field === "DATAINICIO") filtros.dataInicio = value;
        if (field === "DATA_FIM" || field === "DATAFIM") filtros.dataFim = value;
        if (field === "IDLOTE") filtros.idLote = value;
        if (field === "DRY_RUN" || field === "DRYRUN") filtros.dryRun = value.toUpperCase();
        if (field === "RETORNAR_PAYLOAD") filtros.retornarPayload = value.toUpperCase();
    }

    return filtros;
}

function buscarApontamentosAprovados(filtros) {
    var retorno = [];

    var conn = null;
    var stmt = null;
    var rs = null;

    try {
        var params = [];

        var sql = ""
            + " SELECT "
            + "     PW.NUM_PROCES AS nrSolicitacao, "
            + "     '" + CODCOLIGADA_FIXA + "' AS codColigada, "
            + "     TPAI.idProjeto AS idPrj, "
            + "     TPAI.idTRF AS idTrf, "
            + "     TPAI.idISM AS idIsm, "
            + "     TPAI.codProjeto AS codCusto, "
            + "     TPAI.dtApontamento AS dataApontamento, "
            + "     TIME_FORMAT(TPAI.hrApontamento, '%H:%i') AS horas, "
            + "     TPAI.observacao AS observacao "
            + " FROM ML0011485 TPAI "
            + " INNER JOIN PROCES_WORKFLOW PW "
            + "     ON PW.NR_DOCUMENTO_CARD = TPAI.documentid "
            + " INNER JOIN HISTOR_PROCES HP "
            + "     ON HP.NUM_PROCES = PW.NUM_PROCES "
            + "    AND HP.NUM_SEQ_MOVTO = ( "
            + "         SELECT MAX(H2.NUM_SEQ_MOVTO) "
            + "         FROM HISTOR_PROCES H2 "
            + "         WHERE H2.NUM_PROCES = HP.NUM_PROCES "
            + "    ) "
            + " WHERE TPAI.tableid = 'principal' "
            + "   AND TPAI.version = ( "
            + "        SELECT MAX(V1.version) "
            + "        FROM ML0011485 V1 "
            + "        WHERE V1.documentid = TPAI.documentid "
            + "   ) "
            + "   AND IFNULL(TPAI.statusAprovGestor, '') = 'Aprovado' "
            + "   AND PW.STATUS <> 1 "
            + "   AND TPAI.dtApontamento IS NOT NULL "
            + "   AND TPAI.dtApontamento <> '' "
            + "   AND TPAI.hrApontamento IS NOT NULL "
            + "   AND TPAI.hrApontamento <> '' "
            + "   AND TPAI.idProjeto IS NOT NULL "
            + "   AND TPAI.idProjeto <> '' "
            + "   AND TPAI.idTRF IS NOT NULL "
            + "   AND TPAI.idTRF <> '' "
            + "   AND TPAI.idISM IS NOT NULL "
            + "   AND TPAI.idISM <> '' "
            + "   AND TPAI.codProjeto IS NOT NULL "
            + "   AND TPAI.codProjeto <> '' ";

        if (filtros.competencia !== "") {
            sql += " AND TPAI.dtCompetencia = ? ";
            params.push(filtros.competencia);
        }

        if (filtros.dataInicio !== "" && filtros.dataFim !== "") {
            sql += " AND STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y') "
                +  " BETWEEN STR_TO_DATE(?, '%d/%m/%Y') AND STR_TO_DATE(?, '%d/%m/%Y') ";
            params.push(filtros.dataInicio);
            params.push(filtros.dataFim);
        }

        sql += " ORDER BY STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), PW.NUM_PROCES ";

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        for (var i = 0; i < params.length; i++) {
            stmt.setString(i + 1, params[i]);
        }

        rs = stmt.executeQuery();

        while (rs.next()) {
            retorno.push({
                nrSolicitacao: safe(rs.getString("nrSolicitacao")),
                codColigada: CODCOLIGADA_FIXA,
                idPrj: safe(rs.getString("idPrj")),
                idTrf: safe(rs.getString("idTrf")),
                idIsm: safe(rs.getString("idIsm")),
                codCusto: safe(rs.getString("codCusto")),
                dataMovimento: normalizarDataRM(rs.getString("dataApontamento")),
                dataApropriacao: normalizarDataRM(rs.getString("dataApontamento")),
                quantidade: normalizarQuantidade(rs.getString("horas")),
                observacao: safe(rs.getString("observacao"))
            });
        }

    } finally {
        try { if (rs != null) rs.close(); } catch (e1) {}
        try { if (stmt != null) stmt.close(); } catch (e2) {}
        try { if (conn != null) conn.close(); } catch (e3) {}
    }

    return retorno;
}

function obterProximoIdLoteGED() {
    var ds = DatasetFactory.getDataset(DATASET_LOTES_RM, null, null, null);

    if (!ds || ds.rowsCount === 0) {
        return 1;
    }

    var maior = 0;

    for (var i = 0; i < ds.rowsCount; i++) {
        var idLote = getDatasetValue(ds, i, [
            "IDLOTE",
            "idLote",
            "idlote",
            "id_lote",
            "idLoteRM",
            "IDLOTERM"
        ]);

        var numero = parseInt(safe(idLote), 10);

        if (!isNaN(numero) && numero > maior) {
            maior = numero;
        }
    }

    return maior + 1;
}

function montarConteudoLote(apontamentos) {
    var xml = "";

    xml += "<TIMESHEETLOTE>";

    for (var i = 0; i < apontamentos.length; i++) {
        var item = apontamentos[i];

        xml += "<ITEM>";
        xml += "<CODCOLIGADA>" + escXml(item.codColigada) + "</CODCOLIGADA>";
        xml += "<IDPRJ>" + escXml(item.idPrj) + "</IDPRJ>";
        xml += "<IDTRF>" + escXml(item.idTrf) + "</IDTRF>";
        xml += "<IDISM>" + escXml(item.idIsm) + "</IDISM>";
        xml += "<DATAMOVIMENTO>" + escXml(item.dataMovimento) + "</DATAMOVIMENTO>";
        xml += "<DATAAPROPRIACAO>" + escXml(item.dataApropriacao) + "</DATAAPROPRIACAO>";
        xml += "<QUANTIDADE>" + escXml(item.quantidade) + "</QUANTIDADE>";
        xml += "<PRECOUNITARIO>0.00</PRECOUNITARIO>";
        xml += "<MOEDA>R$</MOEDA>";
        xml += "<OBSERVACAO>" + escXml(item.observacao) + "</OBSERVACAO>";
        xml += "<CODCCUSTO>" + escXml(item.codCusto) + "</CODCCUSTO>";
        xml += "<STATUS>0</STATUS>";
        xml += "</ITEM>";
    }

    xml += "</TIMESHEETLOTE>";

    return xml;
}

function montarPayloadLote(idLote, qtdRegistros, conteudoLote) {
    return {
        IDLOTE: 2,
        CODCOLIGADA: 1,
        CONTEUDOLOTE: conteudoLote,
        STATUSLOTE: 0,
        QTDREGISTROS: parseInt(qtdRegistros, 10),
        QTDINSERIDOS: 0,
        MENSAGEMERRO: null,
        RECCREATEDBY: RECCREATEDBY_FIXO,
        RECCREATEDON: dataHoraAtualRM(),
        RECMODIFIEDBY: null,
        RECMODIFIEDON: null
    };
}

function enviarLoteApiRM(payloadObj) {
    var clientService = fluigAPI.getAuthorizeClientService();

    /*
     * Padrão validado em outros datasets do ambiente:
     * - invoke recebe JSON.stringify(data)
     * - params deve ser objeto/mapa JSON, não string.
     * Se params for string, o SDK pode lançar:
     * java.lang.String cannot be cast to java.util.Map
     */
    var data = {
        companyId: String(getValue("WKCompany")),
        serviceCode: SERVICE_CODE_API_RM,
        endpoint: ENDPOINT_API_LOTE,
        method: "POST",
        timeoutService: "300",
        params: payloadObj,
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    };

    log.info("### ds_ts_envia_apontamento ### Enviando lote para API RM");
    log.info("### endpoint: " + ENDPOINT_API_LOTE);

    var vo = clientService.invoke(JSON.stringify(data));

    var result = "";
    var httpStatus = 0;

    try {
        result = safe(vo.getResult());
    } catch (e1) {
        result = "";
    }

    try {
        httpStatus = parseInt(vo.getHttpStatusResult(), 10);
    } catch (e2) {
        httpStatus = 0;
    }

    return {
        httpStatus: httpStatus,
        result: result
    };
}

function getDatasetValue(ds, row, campos) {
    for (var i = 0; i < campos.length; i++) {
        try {
            var valor = ds.getValue(row, campos[i]);

            if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
                return valor;
            }
        } catch (e) {}
    }

    return "";
}

function normalizarDataRM(data) {
    data = safe(data);

    if (data === "") {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
        return data.substring(0, 19) + TIMEZONE_RM;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
        return data.substring(0, 10) + "T00:00:00" + TIMEZONE_RM;
    }

    if (/^\d{2}\/\d{2}\/\d{4}/.test(data)) {
        return data.substring(6, 10) + "-"
            + data.substring(3, 5) + "-"
            + data.substring(0, 2) + "T00:00:00" + TIMEZONE_RM;
    }

    throw "Data inválida para envio ao RM: " + data;
}

function normalizarQuantidade(valor) {
    valor = safe(valor);

    if (valor === "") {
        return "";
    }

    if (/^\d{1,3}:\d{2}$/.test(valor)) {
        var partes = valor.split(":");
        var horas = parseInt(partes[0], 10);
        var minutos = parseInt(partes[1], 10);
        var decimal = horas + (minutos / 60);

        return removerZerosDecimal(String(Math.round(decimal * 10000) / 10000));
    }

    valor = valor.replace(",", ".");

    if (isNaN(parseFloat(valor))) {
        throw "Quantidade inválida para envio ao RM: " + valor;
    }

    return removerZerosDecimal(String(parseFloat(valor)));
}

function removerZerosDecimal(valor) {
    valor = safe(valor);

    if (valor.indexOf(".") === -1) {
        return valor;
    }

    while (valor.length > 0 && valor.charAt(valor.length - 1) === "0") {
        valor = valor.substring(0, valor.length - 1);
    }

    if (valor.charAt(valor.length - 1) === ".") {
        valor = valor.substring(0, valor.length - 1);
    }

    return valor;
}

function dataHoraAtualRM() {
    var agora = new Date();

    return agora.getFullYear() + "-"
        + pad2(agora.getMonth() + 1) + "-"
        + pad2(agora.getDate()) + "T"
        + pad2(agora.getHours()) + ":"
        + pad2(agora.getMinutes()) + ":"
        + pad2(agora.getSeconds())
        + TIMEZONE_RM;
}

function pad2(value) {
    value = parseInt(value, 10);

    if (value < 10) {
        return "0" + value;
    }

    return String(value);
}

function safe(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function escXml(v) {
    return safe(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escJson(v) {
    return safe(v)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "\\\"")
        .replace(/\r/g, "")
        .replace(/\n/g, "");
}

function limitarTexto(texto, limite) {
    texto = safe(texto);

    if (texto.length <= limite) {
        return texto;
    }

    return texto.substring(0, limite) + "...";
}

function getMensagemErro(e) {
    if (e === null || e === undefined) {
        return "Erro não identificado.";
    }

    if (e.message) {
        return String(e.message);
    }

    return String(e);
}
