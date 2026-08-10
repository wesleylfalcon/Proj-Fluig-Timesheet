function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("CONTROLE_MASTER_ID");
    dataset.addColumn("TOTAL_REGISTROS");
    dataset.addColumn("PAGE");
    dataset.addColumn("PAGE_SIZE");
    dataset.addColumn("WORKER");
    dataset.addColumn("SOLICITACAO");
    dataset.addColumn("DATA_EXECUCAO");
    dataset.addColumn("NM_SOLICITANTE");
    dataset.addColumn("DT_ABERTURA");
    dataset.addColumn("DT_APONTAMENTO");
    dataset.addColumn("HR_APONTAMENTO");
    dataset.addColumn("ID_PROJETO");
    dataset.addColumn("NM_APROV_GESTOR");
    dataset.addColumn("DT_APROV_GESTOR");
    dataset.addColumn("STATUS_SOLICITACAO");
    dataset.addColumn("DETALHES");

    var controleMasterId = getConstraint(constraints, "CONTROLE_MASTER_ID") || "45316";
    var page = parseInt(getConstraint(constraints, "PAGE") || "1", 10);
    var pageSize = parseInt(getConstraint(constraints, "PAGE_SIZE") || "10", 10);

    if (!controleMasterId) {
        dataset.addRow([
            "ERRO",
            "Constraint CONTROLE_MASTER_ID não informada.",
            "",
            "0",
            String(page),
            String(pageSize),
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        ]);

        return dataset;
    }

    if (isNaN(page) || page < 1) {
        page = 1;
    }

    if (isNaN(pageSize)) {
        pageSize = 10;
    }

    try {

        var detalhesBase = montarDetalhesBase(controleMasterId);

        if (detalhesBase.length === 0) {
            dataset.addRow([
                "OK",
                "Nenhuma solicitação encontrada para o controle master.",
                String(controleMasterId),
                "0",
                String(page),
                String(pageSize),
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ]);

            return dataset;
        }

        var numerosSolicitacoes = [];

        for (var i = 0; i < detalhesBase.length; i++) {
            numerosSolicitacoes.push(detalhesBase[i].solicitacao);
        }

        var dadosSolicitacoes = consultarSolicitacoesEmLote(numerosSolicitacoes);

        var detalhesFinal = [];

        for (var j = 0; j < detalhesBase.length; j++) {

            var base = detalhesBase[j];
            var dados = dadosSolicitacoes[String(base.solicitacao)] || {};

            detalhesFinal.push({
                worker: base.worker,
                solicitacao: base.solicitacao,
                dataExecucao: base.dataExecucao,
                statusSolicitacao: base.statusSolicitacao,
                detalhes: base.detalhes,

                nmSolicitante: dados.nmSolicitante || "",
                dtAbertura: dados.dtAbertura || "",
                dtApontamento: dados.dtApontamento || "",
                hrApontamento: dados.hrApontamento || "",
                idProjeto: dados.idProjeto || "",
                nmAprovGestor: dados.nmAprovGestor || "",
                dtAprovGestor: dados.dtAprovGestor || ""
            });
        }

        detalhesFinal.sort(function (a, b) {
            var na = parseInt(a.solicitacao || "0", 10);
            var nb = parseInt(b.solicitacao || "0", 10);
            return na - nb;
        });

        var totalRegistros = detalhesFinal.length;

        var inicio = 0;
        var fim = totalRegistros;

        // PAGE_SIZE = 0 retorna todos os registros, útil para exportação Excel
        if (pageSize > 0) {
            inicio = (page - 1) * pageSize;
            fim = inicio + pageSize;
        }

        var pagina = detalhesFinal.slice(inicio, fim);

        for (var p = 0; p < pagina.length; p++) {

            var item = pagina[p];

            dataset.addRow([
                "OK",
                "",
                String(controleMasterId),
                String(totalRegistros),
                String(page),
                String(pageSize),
                safe(item.worker),
                safe(item.solicitacao),
                safe(item.dataExecucao),
                safe(item.nmSolicitante),
                safe(item.dtAbertura),
                safe(item.dtApontamento),
                safe(item.hrApontamento),
                safe(item.idProjeto),
                safe(item.nmAprovGestor),
                safe(item.dtAprovGestor),
                safe(item.statusSolicitacao),
                safe(item.detalhes)
            ]);
        }

    } catch (e) {

        dataset.addRow([
            "ERRO",
            getErrorMessage(e),
            String(controleMasterId),
            "0",
            String(page),
            String(pageSize),
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        ]);
    }

    return dataset;
}

// =====================================================
// Monta base a partir dos WORKERS do controle MASTER
// =====================================================
function montarDetalhesBase(controleMasterId) {

    var detalhes = [];

    var dsControle = DatasetFactory.getDataset(
        "dsControleAprovacaoTotal",
        null,
        null,
        null
    );

    if (!dsControle || dsControle.rowsCount === 0) {
        return detalhes;
    }

    for (var i = 0; i < dsControle.rowsCount; i++) {

        if (!isUltimaVersaoDocumento(dsControle, i)) {
            continue;
        }

        var tipoRegistro = getDatasetValue(dsControle, i, "tipoRegistro");
        var controlePaiId = getDatasetValue(dsControle, i, "controlePaiId");

        if (String(tipoRegistro) !== "WORKER") {
            continue;
        }

        if (String(controlePaiId) !== String(controleMasterId)) {
            continue;
        }

        var worker = getDatasetValue(dsControle, i, "worker");
        var dataInicio = getDatasetValue(dsControle, i, "dataInicio");
        var solicitacoesJson = getDatasetValue(dsControle, i, "solicitacoesJson");
        var errosDetalhados = getDatasetValue(dsControle, i, "errosDetalhados");

        var solicitacoes = parseSolicitacoesJson(solicitacoesJson);
        var errosMap = parseErrosDetalhados(errosDetalhados);

        for (var s = 0; s < solicitacoes.length; s++) {

            var solicitacao = extrairNumeroSolicitacao(solicitacoes[s]);

            if (!solicitacao) {
                continue;
            }

            var detalheErro = errosMap[String(solicitacao)] || "";

            detalhes.push({
                worker: worker || "",
                solicitacao: String(solicitacao),
                dataExecucao: dataInicio || "",
                statusSolicitacao: detalheErro ? "Erro" : "Sucesso",
                detalhes: detalheErro || ""
            });
        }
    }

    return detalhes;
}

// =====================================================
// Consulta dados da solicitação em lote
// =====================================================
function consultarSolicitacoesEmLote(numerosSolicitacoes) {

    var map = {};

    if (!numerosSolicitacoes || numerosSolicitacoes.length === 0) {
        return map;
    }

    // Remove duplicados
    var unico = {};
    var lista = [];

    for (var i = 0; i < numerosSolicitacoes.length; i++) {
        var nr = String(numerosSolicitacoes[i] || "").trim();

        if (!nr) {
            continue;
        }

        if (!unico[nr]) {
            unico[nr] = true;
            lista.push(nr);
        }
    }

    if (lista.length === 0) {
        return map;
    }

    var conn = null;
    var stmt = null;
    var rs = null;

    try {

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();

        // Consulta em chunks para não estourar limite de parâmetros do banco
        var chunkSize = 500;

        for (var ini = 0; ini < lista.length; ini += chunkSize) {

            var chunk = lista.slice(ini, ini + chunkSize);
            var placeholders = [];

            for (var p = 0; p < chunk.length; p++) {
                placeholders.push("?");
            }

            var sql = ""
                + " SELECT "
                + "     PW.NUM_PROCES AS SOLICITACAO, "
                + "     TPAI.nmSolicitante AS NM_SOLICITANTE, "
                + "     TPAI.dtAbertura AS DT_ABERTURA, "
                + "     TPAI.dtApontamento AS DT_APONTAMENTO, "
                + "     TPAI.hrApontamento AS HR_APONTAMENTO, "
                + "     TPAI.codProjeto AS ID_PROJETO, "
                + "     TPAI.nmAprovGestor AS NM_APROV_GESTOR, "
                + "     TPAI.dtAprovGestor AS DT_APROV_GESTOR "
                + " FROM PROCES_WORKFLOW PW "
                + " INNER JOIN ML0011485 TPAI "
                + "     ON TPAI.documentid = PW.NR_DOCUMENTO_CARD "
                + " WHERE "
                + "     TPAI.tableid = 'principal' "
                + "     AND TPAI.version = ( "
                + "         SELECT MAX(V1.version) "
                + "         FROM ML0011485 V1 "
                + "         WHERE V1.documentid = TPAI.documentid "
                + "     ) "
                + "     AND PW.NUM_PROCES IN (" + placeholders.join(",") + ") ";

            stmt = conn.prepareStatement(sql);

            for (var j = 0; j < chunk.length; j++) {
                stmt.setInt(j + 1, parseInt(chunk[j], 10));
            }

            rs = stmt.executeQuery();

            while (rs.next()) {

                var solicitacao = String(rs.getInt("SOLICITACAO"));

                map[solicitacao] = {
                    nmSolicitante: safe(rs.getString("NM_SOLICITANTE")),
                    dtAbertura: safe(rs.getString("DT_ABERTURA")),
                    dtApontamento: safe(rs.getString("DT_APONTAMENTO")),
                    hrApontamento: safe(rs.getString("HR_APONTAMENTO")),
                    idProjeto: safe(rs.getString("ID_PROJETO")),
                    nmAprovGestor: safe(rs.getString("NM_APROV_GESTOR")),
                    dtAprovGestor: safe(rs.getString("DT_APROV_GESTOR"))
                };
            }

            try {
                if (rs != null) rs.close();
            } catch (e1) {}

            try {
                if (stmt != null) stmt.close();
            } catch (e2) {}

            rs = null;
            stmt = null;
        }

    } finally {

        try {
            if (rs != null) rs.close();
        } catch (e3) {}

        try {
            if (stmt != null) stmt.close();
        } catch (e4) {}

        try {
            if (conn != null) conn.close();
        } catch (e5) {}
    }

    return map;
}

// =====================================================
// Helpers JSON / erro
// =====================================================
function parseSolicitacoesJson(solicitacoesJson) {

    try {
        var parsed = JSON.parse(String(solicitacoesJson || "[]"));

        if (!parsed) {
            return [];
        }

        if (parsed.length === undefined) {
            return [parsed];
        }

        return parsed;

    } catch (e) {
        return [];
    }
}

function extrairNumeroSolicitacao(item) {

    if (item === null || item === undefined) {
        return "";
    }

    if (typeof item === "string" || typeof item === "number") {
        return String(item);
    }

    return String(
        item.nrSolicitacao ||
        item.solicitacao ||
        item.numSolicitacao ||
        item.nrProcesso ||
        item.processInstanceId ||
        ""
    );
}

function parseErrosDetalhados(errosDetalhados) {

    var map = {};
    var texto = String(errosDetalhados || "");

    if (!texto) {
        return map;
    }

    var regex = /Solicita(?:ç|c)[aã]o:\s*([^\r\n]+)[\s\S]*?Erro:\s*([\s\S]*?)(?=\r?\n-{5,}|\r?\n\[[^\]]+\]|\s*$)/gi;
    var match = null;

    while ((match = regex.exec(texto)) !== null) {

        var solicitacao = String(match[1] || "").trim();
        var detalhe = String(match[2] || "").trim();

        if (solicitacao) {
            map[solicitacao] = detalhe;
        }
    }

    return map;
}

// =====================================================
// Helpers gerais
// =====================================================
function getConstraint(constraints, name) {

    if (!constraints) {
        return "";
    }

    for (var i = 0; i < constraints.length; i++) {
        if (constraints[i].fieldName == name) {
            return constraints[i].initialValue;
        }
    }

    return "";
}

function getDatasetValue(ds, row, column) {

    try {
        var value = ds.getValue(row, column);

        if (value === null || value === undefined) {
            return "";
        }

        return String(value);

    } catch (e) {
        return "";
    }
}

function safe(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function getErrorMessage(e) {

    if (e === null || e === undefined) {
        return "Erro não identificado.";
    }

    if (e.message) {
        return e.message;
    }

    return String(e);
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
