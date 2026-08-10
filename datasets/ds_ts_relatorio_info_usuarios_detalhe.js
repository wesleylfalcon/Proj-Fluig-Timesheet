function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("MATRICULA");
    dataset.addColumn("COLABORADOR");
    dataset.addColumn("CHAPA");
    dataset.addColumn("DATA_AUSENCIA");
    dataset.addColumn("HORAS_AUSENCIA");
    dataset.addColumn("DATA_APONTADA");
    dataset.addColumn("HORAS_APONTADAS");
    dataset.addColumn("DETALHE");
    dataset.addColumn("NR_SOLICITACAO");
    dataset.addColumn("STATUS_APONTAMENTO");
    dataset.addColumn("ATIVIDADE_ATUAL");
    dataset.addColumn("HORAS_DIA");
    dataset.addColumn("ACAO_AJUSTAR");
    dataset.addColumn("ACAO_REVISAR");
    dataset.addColumn("ACAO_CANCELAR");
    dataset.addColumn("TIPO_CONFLITO");
    dataset.addColumn("COD_PROJETO");
    dataset.addColumn("PROJETO");
    dataset.addColumn("COD_TAREFA");
    dataset.addColumn("TAREFA");

    var filtros = lerFiltros(constraints);

    if (!filtros.matricula || !filtros.chapa || !filtros.competencia) {
        dataset.addRow([
            "ERRO",
            "Informe MATRICULA, CHAPA e COMPETENCIA.",
            filtros.matricula,
            "",
            filtros.chapa,
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ]);
        return dataset;
    }

    try {
        var colaborador = buscarNomeColaborador(filtros.matricula);
        var ausencias = buscarAusencias(filtros.chapa, filtros.competencia);
        var apontamentos = buscarApontamentos(filtros.matricula, filtros.competencia);
        var jornada = obterJornada(filtros.chapa);
        var horasDia = jornada.horasDiaDecimal;

        for (var i = 0; i < apontamentos.length; i++) {
            var ap = apontamentos[i];

            if (!ausencias[ap.dataIso]) {
                continue;
            }

            var ausencia = ausencias[ap.dataIso];
            var horasAusencia = toDecimal(ausencia.horas);
            var horasApontadas = toDecimal(ap.horas);

            if (!temConflitoHoras(horasAusencia, horasApontadas, horasDia)) {
                continue;
            }

            var ausenciaDiaInteiro = horasAusencia >= horasDia;
            var tipoConflito = ausenciaDiaInteiro ? "DIA_INTEIRO" : "PARCIAL";
            var acaoAjustar = ausenciaDiaInteiro ? "NAO" : "SIM";
            var acaoRevisar = ausenciaDiaInteiro ? "NAO" : "SIM";
            var acaoCancelar = "SIM";

            dataset.addRow([
                "OK",
                "",
                filtros.matricula,
                colaborador,
                filtros.chapa,
                isoParaDataBR(ap.dataIso),
                formatDecimalBR(horasAusencia),
                isoParaDataBR(ap.dataIso),
                formatDecimalBR(horasApontadas),
                montarDetalheConflito(ausencia.tipo, horasAusencia, horasApontadas, horasDia),
                ap.nrSolicitacao,
                ap.status,
                ap.atividadeAtual,
                formatDecimalBR(horasDia),
                acaoAjustar,
                acaoRevisar,
                acaoCancelar,
                tipoConflito,
                ap.codProjeto,
                ap.projeto,
                ap.codTarefa,
                ap.tarefa
            ]);
        }

    } catch (e) {
        dataset.addRow([
            "ERRO",
            "Erro ao consultar detalhes Info Usuários: " + getErrorMessage(e),
            filtros.matricula,
            "",
            filtros.chapa,
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ]);
    }

    return dataset;
}

function lerFiltros(constraints) {
    var filtros = {
        matricula: "",
        chapa: "",
        competencia: ""
    };

    if (!constraints) return filtros;

    for (var i = 0; i < constraints.length; i++) {
        var field = String(constraints[i].fieldName || "");
        var value = safe(constraints[i].initialValue);

        if (field == "MATRICULA") filtros.matricula = value;
        if (field == "CHAPA") filtros.chapa = value;
        if (field == "COMPETENCIA") filtros.competencia = value;
    }

    return filtros;
}

function buscarNomeColaborador(matricula) {
    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "colleaguePK.colleagueId",
            matricula,
            matricula,
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset("colleague", null, constraints, null);

    if (!ds || ds.rowsCount === 0) return matricula;

    return safe(ds.getValue(0, "colleagueName"));
}

function buscarAusencias(chapa, competencia) {
    var map = {};

    // TESTE TEMPORÁRIO - simular ausência para PS0108
    /*if (safe(chapa) === "PS0108") {
        var dataTesteIso = "2026-02-02";

        if (dataPertenceCompetencia(dataTesteIso, competencia)) {
            map[dataTesteIso] = {
                tipo: "ATESTADO",
                horas: 7
            };
        }
    }*/

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "CHAPA",
            chapa,
            chapa,
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset("ds_ts_ausencias", null, constraints, null);

    if (!ds || ds.rowsCount === 0) {
        return map;
    }

    for (var i = 0; i < ds.rowsCount; i++) {
        if (safe(ds.getValue(i, "ERRO")) !== "") {
            continue;
        }

        var dataIso = normalizarDataIso(ds.getValue(i, "DATA"));

        if (!dataPertenceCompetencia(dataIso, competencia)) {
            continue;
        }

        var horasAusencia = toDecimal(ds.getValue(i, "HORAS"));

        if (!map[dataIso]) {
            map[dataIso] = {
                tipo: safe(ds.getValue(i, "STATUS")) || "Ausência",
                horas: 0
            };
        }

        map[dataIso].horas += horasAusencia;
    }

    return map;
}

function buscarApontamentos(matricula, competencia) {
    var retorno = [];

    var conn = null;
    var stmt = null;
    var rs = null;

    try {
        var sql = ""
            + " SELECT "
            + " PW.NUM_PROCES AS nrSolicitacao, "
            + " HP.NUM_SEQ_ESTADO AS atividadeAtual, "
            + " DATE_FORMAT(STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), '%Y-%m-%d') AS dataIso, "
            + " TIME_FORMAT(TPAI.hrApontamento, '%H:%i') AS horas, "
            + " TPAI.statusAprovGestor AS status, "
            + " TPAI.codProjeto AS codProjeto, "
            + " TPAI.nmProjeto AS projeto, "
            + " TPAI.codTarefa AS codTarefa, "
            + " TPAI.nmTarefa AS tarefa "
            + " FROM ML0011485 TPAI "
            + " INNER JOIN PROCES_WORKFLOW PW "
            + " ON PW.NR_DOCUMENTO_CARD = TPAI.documentid "
            + " INNER JOIN HISTOR_PROCES HP "
            + " ON HP.NUM_PROCES = PW.NUM_PROCES "
            + " AND HP.NUM_SEQ_MOVTO = ( "
            + "     SELECT MAX(H2.NUM_SEQ_MOVTO) "
            + "     FROM HISTOR_PROCES H2 "
            + "     WHERE H2.NUM_PROCES = HP.NUM_PROCES "
            + " ) "
            + " WHERE TPAI.tableid = 'principal' "
            + "   AND TPAI.version = ( "
            + "     SELECT MAX(V1.version) "
            + "     FROM ML0011485 V1 "
            + "     WHERE V1.documentid = TPAI.documentid "
            + "   ) "
            + "   AND ( "
            + "     (PW.STATUS = 0 AND HP.NUM_SEQ_ESTADO IN (5, 14)) "
            + "     OR (PW.STATUS = 2 AND HP.NUM_SEQ_ESTADO = 10) "
            + "     OR (PW.STATUS = 1 AND HP.NUM_SEQ_ESTADO = 9) "
            + "   ) "
            + " AND TPAI.matrSolicitante = ? "
            + " AND TPAI.dtCompetencia = ? "
            + " AND TPAI.dtApontamento IS NOT NULL "
            + " AND TPAI.dtApontamento <> '' "
            + " ORDER BY STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y') ";

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        stmt.setString(1, matricula);
        stmt.setString(2, competencia);

        rs = stmt.executeQuery();

        var mapaApontamentos = {};
        var solicitacoesPorData = {};

        while (rs.next()) {
            var nrSolicitacao = safe(rs.getString("nrSolicitacao"));
            var dataIso = safe(rs.getString("dataIso"));

            if (!dataIso) {
                continue;
            }

            /*
             * Regra do detalhe:
             * 1 linha por data conflitante.
             * Evita duplicidade da mesma solicitação/data, mas soma solicitações
             * diferentes do mesmo dia para validar o total contra a jornada.
             */
            var chave = dataIso;

            if (!solicitacoesPorData[chave]) {
                solicitacoesPorData[chave] = {};
            }

            if (solicitacoesPorData[chave][nrSolicitacao]) {
                continue;
            }

            solicitacoesPorData[chave][nrSolicitacao] = true;

            if (!mapaApontamentos[chave]) {
                mapaApontamentos[chave] = {
                    nrSolicitacao: nrSolicitacao,
                    dataIso: dataIso,
                    horas: 0,
                    status: safe(rs.getString("status")),
                    atividadeAtual: safe(rs.getString("atividadeAtual")),
                    codProjeto: safe(rs.getString("codProjeto")),
                    projeto: safe(rs.getString("projeto")),
                    codTarefa: safe(rs.getString("codTarefa")),
                    tarefa: safe(rs.getString("tarefa"))
                };
            }

            mapaApontamentos[chave].horas += toDecimal(rs.getString("horas"));
        }

        for (var key in mapaApontamentos) {
            retorno.push(mapaApontamentos[key]);
        }

    } finally {
        try { if (rs) rs.close(); } catch(e1) {}
        try { if (stmt) stmt.close(); } catch(e2) {}
        try { if (conn) conn.close(); } catch(e3) {}
    }

    return retorno;
}

function obterJornada(chapa) {
    var jornada = {
        horasDiaDecimal: 8
    };

    chapa = safe(chapa);

    if (chapa === "") {
        return jornada;
    }

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "CHAPA",
            chapa,
            chapa,
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset(
        "ds_ts_jornada_colaborador",
        null,
        constraints,
        null
    );

    if (ds && ds.rowsCount > 0) {
        var status = safe(getDatasetValue(ds, 0, ["STATUS", "status"]));

        if (status === "" || status === "OK") {
            var horasDia = toDecimal(
                getDatasetValue(ds, 0, [
                    "HORAS_DIA_DECIMAL",
                    "horasDiaDecimal",
                    "HORAS_DIA",
                    "horasDia"
                ])
            );

            if (horasDia > 0) {
                jornada.horasDiaDecimal = horasDia;
            }
        }
    }

    return jornada;
}

function temConflitoHoras(horasAusencia, horasApontadas, horasDia) {
    horasAusencia = toDecimal(horasAusencia);
    horasApontadas = toDecimal(horasApontadas);
    horasDia = toDecimal(horasDia);

    if (horasDia <= 0) {
        horasDia = 8;
    }

    if (horasAusencia <= 0 || horasApontadas <= 0) {
        return false;
    }

    return (horasAusencia + horasApontadas) > horasDia;
}

function montarDetalheConflito(tipoAusencia, horasAusencia, horasApontadas, horasDia) {
    var total = toDecimal(horasAusencia) + toDecimal(horasApontadas);

    if (toDecimal(horasAusencia) >= toDecimal(horasDia)) {
        return safe(tipoAusencia || "Ausência")
            + " de dia inteiro. A ausência cobre a jornada de "
            + formatDecimalBR(horasDia)
            + "h e existe apontamento no mesmo dia.";
    }

    return safe(tipoAusencia || "Ausência") + " de " + formatDecimalBR(horasAusencia)
    	+ "h x Apontamento de " + formatDecimalBR(horasApontadas)
        + "h excedem a jornada diária de " + formatDecimalBR(horasDia) + "h";
}

function getDatasetValue(ds, row, columns) {
    if (!ds || row < 0 || !columns) {
        return "";
    }

    for (var i = 0; i < columns.length; i++) {
        try {
            var value = ds.getValue(row, columns[i]);

            if (value !== null && value !== undefined && String(value).trim() !== "") {
                return value;
            }

        } catch (e) {
            // coluna não existe neste dataset; tenta próxima
        }
    }

    return "";
}

function dataPertenceCompetencia(dataIso, competencia) {
    if (!dataIso || !competencia) return false;

    return dataIso.substring(5, 7) + "/" + dataIso.substring(0, 4) == competencia;
}

function normalizarDataIso(data) {
    data = safe(data);

    if (data === "") return "";

    if (/^\d{4}-\d{2}-\d{2}/.test(data)) return data.substring(0, 10);

    if (/^\d{2}\/\d{2}\/\d{4}/.test(data)) {
        return data.substring(6, 10) + "-" + data.substring(3, 5) + "-" + data.substring(0, 2);
    }

    return "";
}

function isoParaDataBR(dataIso) {
    if (!dataIso || dataIso.length < 10) return dataIso;

    return dataIso.substring(8, 10) + "/" + dataIso.substring(5, 7) + "/" + dataIso.substring(0, 4);
}

function toDecimal(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;

    var str = String(valor).trim();

    if (str.indexOf(":") > -1) {
        var p = str.split(":");
        return (parseInt(p[0], 10) || 0) + ((parseInt(p[1], 10) || 0) / 60);
    }

    if (str.indexOf(",") > -1) {
        str = str.replace(/\./g, "").replace(",", ".");
    }

    var n = parseFloat(str);

    return isNaN(n) ? 0 : n;
}

function formatDecimalBR(valor) {
    var n = Math.round(toDecimal(valor) * 100) / 100;
    var p = String(n).split(".");
    var d = p.length > 1 ? p[1] : "00";

    if (d.length == 1) d += "0";

    return p[0] + "," + d.substring(0, 2);
}

function safe(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function getErrorMessage(e) {
    if (!e) return "Erro não identificado.";
    if (e.message) return e.message;
    return String(e);
}