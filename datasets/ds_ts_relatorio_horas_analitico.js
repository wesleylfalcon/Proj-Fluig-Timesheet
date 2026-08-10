function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("NUM_LINHA");
    dataset.addColumn("PROJETO");
    dataset.addColumn("TAREFA");
    dataset.addColumn("GESTOR_CONTRATO");
    dataset.addColumn("USUARIO");
    dataset.addColumn("DATA_APROPRIACAO");
    dataset.addColumn("DATA_APROVACAO");
    dataset.addColumn("HORAS_INFORMADAS");
    dataset.addColumn("HORAS_APROVADAS");
    dataset.addColumn("NR_SOLICITACAO");
    dataset.addColumn("STATUS_APROVACAO");

    var filtros = lerFiltros(constraints);

    if (!filtros.dataInicio || !filtros.dataFim) {
        dataset.addRow([
            "ERRO",
            "Informe Data início e Data fim.",
            "", "", "", "", "", "", "", "", "", "", ""
        ]);
        return dataset;
    }

    var conn = null;
    var stmt = null;
    var rs = null;

    try {
        var params = [];

        var sql = ""
            + " SELECT "
            + "     PW.NUM_PROCES AS nrSolicitacao, "
            + "     CONCAT(IFNULL(TPAI.codProjeto, ''), "
            + "            CASE WHEN IFNULL(TPAI.nmProjeto, '') <> '' THEN CONCAT(' - ', TPAI.nmProjeto) ELSE '' END) AS projeto, "
            + "     TPAI.nmTarefa AS tarefa, "
            + "     TPAI.gestorContrato AS gestorContrato, "
            + "     TPAI.nmSolicitante AS usuario, "
            + "     DATE_FORMAT(STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), '%d/%m/%Y') AS dataApropriacao, "
            + "     DATE_FORMAT(STR_TO_DATE(NULLIF(TPAI.dtAprovGestor, ''), '%d/%m/%Y'), '%d/%m/%Y') AS dataAprovacao, "
            + "     TIME_FORMAT(TPAI.hrApontamento, '%H:%i') AS horasInformadas, "
            + "     CASE "
            + "         WHEN TPAI.statusAprovGestor = 'Aprovado' THEN TIME_FORMAT(TPAI.hrApontamento, '%H:%i') "
            + "         ELSE '00:00' "
            + "     END AS horasAprovadas, "
            + "     TPAI.statusAprovGestor AS statusAprovacao "
            + " FROM ML0011485 TPAI "
            + " INNER JOIN PROCES_WORKFLOW PW "
            + "     ON PW.NR_DOCUMENTO_CARD = TPAI.documentid "
            + " INNER JOIN HISTOR_PROCES HP "
            + "     ON HP.NUM_PROCES = PW.NUM_PROCES "
            + "     AND HP.NUM_SEQ_MOVTO = ( "
            + "         SELECT MAX(H2.NUM_SEQ_MOVTO) "
            + "         FROM HISTOR_PROCES H2 "
            + "         WHERE H2.NUM_PROCES = HP.NUM_PROCES "
            + "     ) "
            + " WHERE TPAI.tableid = 'principal' "
            + " AND TPAI.version = ( "
            + "     SELECT MAX(V1.version) "
            + "     FROM ML0011485 V1 "
            + "     WHERE V1.documentid = TPAI.documentid "
            + " ) "
            + " AND (PW.STATUS = 0 OR HP.NUM_SEQ_ESTADO IN (9, 10)) "
            + " AND TPAI.dtApontamento IS NOT NULL "
            + " AND TPAI.dtApontamento <> '' "
            + " AND STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y') "
            + "     BETWEEN STR_TO_DATE(?, '%d/%m/%Y') AND STR_TO_DATE(?, '%d/%m/%Y') ";

        params.push(filtros.dataInicio);
        params.push(filtros.dataFim);

        if (filtros.colaboradores.length > 0) {
            sql += " AND TPAI.matrSolicitante IN (" + placeholders(filtros.colaboradores.length) + ") ";
            addParams(params, filtros.colaboradores);
        }

        if (filtros.projeto) {
            sql += " AND (TPAI.codProjeto = ? OR TPAI.nmProjeto LIKE ?) ";
            params.push(filtros.projeto);
            params.push("%" + filtros.projeto + "%");
        }

        if (filtros.tarefa) {
            sql += " AND (TPAI.codTarefa = ? OR TPAI.nmTarefa LIKE ?) ";
            params.push(filtros.tarefa);
            params.push("%" + filtros.tarefa + "%");
        }

        sql += " ORDER BY STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), TPAI.nmSolicitante, TPAI.codProjeto, TPAI.codTarefa, PW.NUM_PROCES ";

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        for (var p = 0; p < params.length; p++) {
            stmt.setString(p + 1, params[p]);
        }

        rs = stmt.executeQuery();

        var linha = 0;

        while (rs.next()) {
            linha++;

            var horasInformadas = horaParaDecimalBR(rs.getString("horasInformadas"));
            var horasAprovadas = horaParaDecimalBR(rs.getString("horasAprovadas"));

            dataset.addRow([
                "OK",
                "",
                String(linha),
                safe(rs.getString("projeto")),
                safe(rs.getString("tarefa")),
                safe(rs.getString("gestorContrato")),
                safe(rs.getString("usuario")),
                safe(rs.getString("dataApropriacao")),
                safe(rs.getString("dataAprovacao")),
                horasInformadas,
                horasAprovadas,
                safe(rs.getString("nrSolicitacao")),
                safe(rs.getString("statusAprovacao"))
            ]);
        }

    } catch (e) {
        log.error("======= ERRO ds_ts_relatorio_horas_analitico");
        log.error(e);

        dataset.addRow([
            "ERRO",
            "Erro ao consultar relatório analítico: " + getErrorMessage(e),
            "", "", "", "", "", "", "", "", "", "", ""
        ]);

    } finally {
        try { if (rs != null) rs.close(); } catch(e1) {}
        try { if (stmt != null) stmt.close(); } catch(e2) {}
        try { if (conn != null) conn.close(); } catch(e3) {}
    }

    return dataset;
}

function lerFiltros(constraints) {
    var filtros = {
        dataInicio: "",
        dataFim: "",
        colaboradores: [],
        projeto: "",
        tarefa: ""
    };

    if (!constraints) {
        return filtros;
    }

    for (var i = 0; i < constraints.length; i++) {
        var field = String(constraints[i].fieldName || "").toUpperCase();
        var value = String(constraints[i].initialValue || "").trim();

        if (field == "DATA_INICIO") filtros.dataInicio = value;
        if (field == "DATA_FIM") filtros.dataFim = value;
        if (field == "CODCOLABORADORES" || field == "COLABORADORES") filtros.colaboradores = splitLista(value);
        if (field == "CODCOLABORADOR") filtros.colaboradores = splitLista(value);
        if (field == "PROJETO" || field == "CODPROJETO" || field == "IDPROJETO") filtros.projeto = value;
        if (field == "TAREFA" || field == "CODTAREFA") filtros.tarefa = value;
    }

    return filtros;
}

function splitLista(value) {
    var lista = [];
    var partes = String(value || "").split(",");

    for (var i = 0; i < partes.length; i++) {
        var item = String(partes[i] || "").trim();

        if (item !== "") {
            lista.push(item);
        }
    }

    return lista;
}

function placeholders(total) {
    var arr = [];

    for (var i = 0; i < total; i++) {
        arr.push("?");
    }

    return arr.join(",");
}

function addParams(params, values) {
    for (var i = 0; i < values.length; i++) {
        params.push(values[i]);
    }
}

function horaParaDecimalBR(hora) {
    hora = String(hora || "00:00").trim();

    var partes = hora.split(":");
    var h = parseInt(partes[0], 10) || 0;
    var m = parseInt(partes[1], 10) || 0;
    var valor = h + (m / 60);

    return formatDecimalBR(valor);
}

function formatDecimalBR(valor) {
    var n = parseFloat(valor || 0);

    if (isNaN(n)) {
        n = 0;
    }

    return n.toFixed(2).replace(".", ",");
}

function safe(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function getErrorMessage(e) {
    if (!e) {
        return "Erro não identificado.";
    }

    if (e.message) {
        return e.message;
    }

    return String(e);
}
