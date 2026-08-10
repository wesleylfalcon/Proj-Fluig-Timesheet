function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("NUM_LINHA");
    dataset.addColumn("TITULO");
    dataset.addColumn("PROJETO");
    dataset.addColumn("USUARIO");
    dataset.addColumn("HORAS_INFORMADAS");
    dataset.addColumn("HORAS_APROVADAS");

    var filtros = lerFiltros(constraints);

    if (!filtros.dataInicio || !filtros.dataFim) {
        dataset.addRow(["ERRO", "Informe Data início e Data fim.", "", "", "", "", "", ""]);
        return dataset;
    }

    var conn = null;
    var stmt = null;
    var rs = null;

    try {
        var params = [];

        var sql = ""
            + " SELECT "
            + "     CONCAT(TPAI.codTarefa, ' - ', TPAI.nmTarefa) AS titulo, "
            + "     CONCAT(IFNULL(TPAI.codProjeto, ''), "
            + "            CASE WHEN IFNULL(TPAI.nmProjeto, '') <> '' THEN CONCAT(' - ', TPAI.nmProjeto) ELSE '' END) AS projeto, "
            + "     TPAI.nmSolicitante AS usuario, "
            + "     SUM(TIME_TO_SEC(TPAI.hrApontamento) / 60) AS minutosInformados, "
            + "     SUM(CASE WHEN TPAI.statusAprovGestor = 'Aprovado' THEN TIME_TO_SEC(TPAI.hrApontamento) / 60 ELSE 0 END) AS minutosAprovados "
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

        sql += ""
            + " GROUP BY TPAI.codProjeto, TPAI.nmProjeto, TPAI.nmSolicitante "
            + " ORDER BY TPAI.nmSolicitante, TPAI.codProjeto ";

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        for (var p = 0; p < params.length; p++) {
            stmt.setString(p + 1, params[p]);
        }

        rs = stmt.executeQuery();

        var linhas = [];
        var totalInformado = 0;
        var totalAprovado = 0;

        while (rs.next()) {
            var minInf = parseFloat(rs.getString("minutosInformados") || "0") || 0;
            var minApr = parseFloat(rs.getString("minutosAprovados") || "0") || 0;

            totalInformado += minInf;
            totalAprovado += minApr;

            linhas.push({
                titulo: safe(rs.getString("titulo")),
                projeto: safe(rs.getString("projeto")),
                usuario: safe(rs.getString("usuario")),
                minutosInformados: minInf,
                minutosAprovados: minApr
            });
        }

        var linha = 1;

        dataset.addRow([
            "OK",
            "",
            String(linha),
            "TOTAIS",
            "*",
            "*",
            minutosParaDecimalBR(totalInformado),
            minutosParaDecimalBR(totalAprovado)
        ]);

        for (var i = 0; i < linhas.length; i++) {
            linha++;

            dataset.addRow([
                "OK",
                "",
                String(linha),
                linhas[i].titulo,
                linhas[i].projeto,
                linhas[i].usuario,
                minutosParaDecimalBR(linhas[i].minutosInformados),
                minutosParaDecimalBR(linhas[i].minutosAprovados)
            ]);
        }

    } catch (e) {
        log.error("======= ERRO ds_ts_relatorio_horas_sintetico");
        log.error(e);

        dataset.addRow([
            "ERRO",
            "Erro ao consultar relatório sintético: " + getErrorMessage(e),
            "", "", "", "", "", ""
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

function minutosParaDecimalBR(minutos) {
    var valor = (parseFloat(minutos || 0) || 0) / 60;
    return valor.toFixed(2).replace(".", ",");
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
