var CACHE_AUSENCIAS = {};
var CACHE_HORAS_MES = {};
var CACHE_JORNADA = {};

function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("MATRICULA");
    dataset.addColumn("COLABORADOR");
    dataset.addColumn("EMAIL");
    dataset.addColumn("CHAPA");
    dataset.addColumn("COMPETENCIA");
    dataset.addColumn("HORAS_DISPONIVEIS");
    dataset.addColumn("HORAS_APONTADAS");
    dataset.addColumn("HORAS_PENDENTES");
    dataset.addColumn("AUSENCIAS");
    dataset.addColumn("QTD_CONFLITOS");
    dataset.addColumn("TEM_CONFLITO");

    var filtros = lerFiltros(constraints);

    if (!filtros.competencia) {
        dataset.addRow([
            "ERRO",
            "Informe a constraint COMPETENCIA no formato MM/AAAA.",
            "", "", "", "", "", "", "", "", "", "", ""
        ]);
        return dataset;
    }

    try {
        var usuariosPermitidos = montarMapaUsuariosTimesheet(filtros.colaboradores);

        if (isMapaVazio(usuariosPermitidos)) {
            return dataset;
        }

        var apontamentosPorUsuario = buscarApontamentosAgrupados(
            filtros.competencia,
            usuariosPermitidos
        );

        if (isMapaVazio(apontamentosPorUsuario)) {
            return dataset;
        }

        for (var matricula in apontamentosPorUsuario) {
            if (!apontamentosPorUsuario.hasOwnProperty(matricula)) {
                continue;
            }

            var item = apontamentosPorUsuario[matricula];

            var horasMes = buscarHorasMesCacheada(
        	    item.matricula,
        	    item.chapa,
        	    filtros.competencia
        	);

        	var aus = buscarAusenciasCacheada(item.chapa, filtros.competencia);
        	var jornada = obterJornadaCacheada(item.chapa);

        	var horasDisponiveis = horasMes.horasDisponiveis;
        	var horasApontadas = horasMes.horasApontadas;
        	var horasPendentes = horasMes.horasPendentes;

        	var qtdConflitos = contarConflitosPorConsultaDetalhada(
    		    item.matricula,
    		    filtros.competencia,
    		    aus.mapDatas,
    		    jornada.horasDiaDecimal
    		);

            dataset.addRow([
                "OK",
                "",
                item.matricula,
                item.nome,
                item.email,
                item.chapa,
                filtros.competencia,
                formatDecimalBR(horasDisponiveis),
                formatDecimalBR(horasApontadas),
                formatDecimalBR(horasPendentes),
                formatDecimalBR(aus.totalHoras),
                String(qtdConflitos),
                qtdConflitos > 0 ? "SIM" : "NAO"
            ]);
        }

    } catch (e) {
        log.error("### ds_ts_relatorio_info_usuarios ### ERRO");
        log.error(e);

        dataset.addRow([
            "ERRO",
            "Erro ao consultar Relatório Info Usuários: " + getErrorMessage(e),
            "", "", "", "", filtros.competencia, "", "", "", "", "", ""
        ]);
    }

    return dataset;
}

function buscarHorasMesCacheada(matricula, chapa, competencia) {
    var key = safe(matricula) + "|" + safe(chapa) + "|" + safe(competencia);

    if (CACHE_HORAS_MES[key]) {
        return CACHE_HORAS_MES[key];
    }

    var retorno = {
        horasDisponiveis: 0,
        horasApontadas: 0,
        horasPendentes: 0
    };

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "CODIGO",
            matricula,
            matricula,
            ConstraintType.MUST
        )
    );

    constraints.push(
        DatasetFactory.createConstraint(
            "CHAPA",
            chapa,
            chapa,
            ConstraintType.MUST
        )
    );

    constraints.push(
        DatasetFactory.createConstraint(
            "COMPETENCIA",
            competencia,
            competencia,
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset(
        "ds_ts_horas_mes",
        null,
        constraints,
        null
    );

    if (!ds || ds.rowsCount === 0) {
        CACHE_HORAS_MES[key] = retorno;
        return retorno;
    }

    var erro = safe(getDatasetValue(ds, 0, ["erro", "ERRO"]));

    if (erro !== "") {
        CACHE_HORAS_MES[key] = retorno;
        return retorno;
    }

    var horasAprovadas = toDecimal(
        getDatasetValue(ds, 0, ["HORASAPROVADAS", "horasAprovadas"])
    );

    var horasPendentesAprovacao = toDecimal(
        getDatasetValue(ds, 0, ["HORASPENDENTES", "horasPendentes"])
    );

    var horasFaltantes = toDecimal(
        getDatasetValue(ds, 0, ["HORASFALTANTES", "horasFaltantes"])
    );

    var horasMes = toDecimal(
        getDatasetValue(ds, 0, ["HORASMES", "horasMes"])
    );

    retorno.horasDisponiveis = horasMes;
    retorno.horasApontadas = horasAprovadas + horasPendentesAprovacao;
    retorno.horasPendentes = horasFaltantes;

    CACHE_HORAS_MES[key] = retorno;

    return retorno;
}

function lerFiltros(constraints) {
    var filtros = {
        competencia: "",
        colaboradores: []
    };

    if (!constraints) {
        return filtros;
    }

    for (var i = 0; i < constraints.length; i++) {
        var field = String(constraints[i].fieldName || "");
        var value = safe(constraints[i].initialValue);

        if (field == "COMPETENCIA") {
            filtros.competencia = value;
        }

        if (field == "COLABORADOR" && value) {
            filtros.colaboradores = [value];
        }

        // Compatibilidade com versão anterior, caso algum JS ainda envie múltiplo.
        if (field == "COLABORADORES" && value) {
            filtros.colaboradores = splitLista(value);
        }
    }

    return filtros;
}

function montarMapaUsuariosTimesheet(colaboradoresFiltro) {
    var mapa = {};
    var filtroAtivo = {};

    colaboradoresFiltro = colaboradoresFiltro || [];

    for (var i = 0; i < colaboradoresFiltro.length; i++) {
        var matriculaFiltro = safe(colaboradoresFiltro[i]);

        if (matriculaFiltro !== "") {
            filtroAtivo[matriculaFiltro] = true;
        }
    }

    var ds = DatasetFactory.getDataset("ds_ts_colaboradores", null, null, null);

    if (!ds || ds.rowsCount === 0) {
        return mapa;
    }

    for (var r = 0; r < ds.rowsCount; r++) {
        var erro = safe(getDatasetValue(ds, r, ["erro", "ERRO"]));

        if (erro !== "") {
            continue;
        }

        var matricula = safe(getDatasetValue(ds, r, [
            "matricula",
            "MATRICULA",
            "colleagueId",
            "COLLEAGUEID"
        ]));

        var nome = safe(getDatasetValue(ds, r, [
            "nome",
            "NOME",
            "colaborador",
            "COLABORADOR",
            "colleagueName",
            "COLLEAGUENAME"
        ]));

        var email = safe(getDatasetValue(ds, r, [
            "email",
            "EMAIL",
            "mail",
            "MAIL"
        ]));

        if (matricula === "") {
            continue;
        }

        if (colaboradoresFiltro.length > 0 && !filtroAtivo[matricula]) {
            continue;
        }

        mapa[matricula] = {
            matricula: matricula,
            nome: nome || matricula,
            email: email
        };
    }

    return mapa;
}

function buscarApontamentosAgrupados(competencia, usuariosPermitidos) {
    var mapa = {};

    var conn = null;
    var stmt = null;
    var rs = null;

    try {
    	var sql = ""
    	    + " SELECT "
    	    + "     PW.NUM_PROCES AS nrSolicitacao, "
    	    + "     PW.STATUS AS statusWorkflow, "
    	    + "     HP.NUM_SEQ_ESTADO AS atividadeAtual, "
    	    + "     TPAI.matrSolicitante AS matricula, "
    	    + "     TPAI.nmSolicitante AS nome, "
    	    + "     TPAI.codRM AS chapa, "
    	    + "     TPAI.dtApontamento AS dataApontamentoOriginal, "
    	    + "     CASE "
    	    + "         WHEN TPAI.dtApontamento REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}' "
    	    + "             THEN DATE_FORMAT(STR_TO_DATE(SUBSTRING(TPAI.dtApontamento, 1, 10), '%d/%m/%Y'), '%Y-%m-%d') "
    	    + "         WHEN TPAI.dtApontamento REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' "
    	    + "             THEN SUBSTRING(TPAI.dtApontamento, 1, 10) "
    	    + "         ELSE '' "
    	    + "     END AS dataIso, "
    	    + "     TPAI.hrApontamento AS horas, "
    	    + "     TPAI.statusAprovGestor AS statusAprovGestor "
    	    + " FROM ML0011485 TPAI "
    	    + " INNER JOIN PROCES_WORKFLOW PW "
    	    + "     ON PW.NR_DOCUMENTO_CARD = TPAI.documentid "
    	    + " INNER JOIN HISTOR_PROCES HP "
    	    + "     ON HP.NUM_PROCES = PW.NUM_PROCES "
    	    + "    AND HP.NUM_SEQ_MOVTO = ( "
    	    + "         SELECT MAX(H2.NUM_SEQ_MOVTO) "
    	    + "         FROM HISTOR_PROCES H2 "
    	    + "         WHERE H2.NUM_PROCES = HP.NUM_PROCES "
    	    + "     ) "
    	    + " WHERE TPAI.tableid = 'principal' "
    	    + "   AND TPAI.version = ( "
    	    + "         SELECT MAX(V1.version) "
    	    + "         FROM ML0011485 V1 "
    	    + "         WHERE V1.documentid = TPAI.documentid "
    	    + "     ) "
    	    + "   AND ( "
    	    + "        (PW.STATUS = 0 AND HP.NUM_SEQ_ESTADO IN (5, 14)) "
    	    + "     OR (PW.STATUS = 2 AND HP.NUM_SEQ_ESTADO = 10) "
    	    + "     OR (PW.STATUS = 1 AND HP.NUM_SEQ_ESTADO = 9) "
    	    + "   ) "
    	    + "   AND TPAI.dtCompetencia = ? "
    	    + "   AND TPAI.dtApontamento IS NOT NULL "
    	    + "   AND TPAI.dtApontamento <> '' ";

        var ic = new javax.naming.InitialContext();
        var dataSource = ic.lookup("java:/jdbc/AppDS");

        conn = dataSource.getConnection();
        stmt = conn.prepareStatement(sql);
        stmt.setString(1, competencia);

        rs = stmt.executeQuery();

        while (rs.next()) {
            var matricula = safe(rs.getString("matricula"));

            if (matricula === "") {
                continue;
            }

            if (!usuariosPermitidos[matricula]) {
                continue;
            }

            var chapa = safe(rs.getString("chapa"));

            if (chapa === "") {
                continue;
            }

            var dataIso = safe(rs.getString("dataIso"));
            
            var horas = toDecimal(rs.getString("horas"));

            if (!mapa[matricula]) {
                mapa[matricula] = {
                    matricula: matricula,
                    nome: usuariosPermitidos[matricula].nome || safe(rs.getString("nome")) || matricula,
                    email: usuariosPermitidos[matricula].email || "",
                    chapa: chapa,
                    horasApontadas: 0,
                    datasApontadas: {}
                };
            }

            mapa[matricula].horasApontadas += horas;

            if (dataIso !== "") {
                mapa[matricula].datasApontadas[dataIso] = true;
            }
        }

    } catch (e) {
        log.error("### ds_ts_relatorio_info_usuarios ### Erro ao buscar apontamentos agrupados");
        log.error(e);
        throw e;

    } finally {
        try { if (rs) rs.close(); } catch (e1) {}
        try { if (stmt) stmt.close(); } catch (e2) {}
        try { if (conn) conn.close(); } catch (e3) {}
    }

    return mapa;
}

function contarConflitosPorConsultaDetalhada(matricula, competencia, mapDatasAusencia, horasDiaDecimal) {
    var total = 0;
    var jornadaDia = toDecimal(horasDiaDecimal);

    if (jornadaDia <= 0) {
        jornadaDia = 8;
    }

    if (!mapDatasAusencia) {
        return 0;
    }

    var horasApontadasPorData = buscarHorasApontadasValidasPorUsuario(
        matricula,
        competencia
    );

    for (var dataIso in horasApontadasPorData) {
        if (!horasApontadasPorData.hasOwnProperty(dataIso)) {
            continue;
        }

        var horasAusencia = toDecimal(mapDatasAusencia[dataIso]);
        var horasApontadas = toDecimal(horasApontadasPorData[dataIso]);

        if (horasAusencia <= 0 || horasApontadas <= 0) {
            continue;
        }

        /*
         * Regra de conflito:
         * ausência + apontamento só é conflito quando excede a jornada diária.
         * Ex.: jornada 8h, ausência 4h e apontamento 4h => não conflita.
         *      jornada 8h, ausência 4h e apontamento 4,01h => conflita.
         */
        if ((horasAusencia + horasApontadas) > jornadaDia) {
            total++;
        }
    }

    return total;
}

function buscarHorasApontadasValidasPorUsuario(matricula, competencia) {
    var mapa = {};
    var solicitacoesPorData = {};

    var conn = null;
    var stmt = null;
    var rs = null;

    try {
        var sql = ""
            + " SELECT "
            + "     PW.NUM_PROCES AS nrSolicitacao, "
            + "     CASE "
            + "         WHEN TPAI.dtApontamento REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}' "
            + "             THEN DATE_FORMAT(STR_TO_DATE(SUBSTRING(TPAI.dtApontamento, 1, 10), '%d/%m/%Y'), '%Y-%m-%d') "
            + "         WHEN TPAI.dtApontamento REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' "
            + "             THEN SUBSTRING(TPAI.dtApontamento, 1, 10) "
            + "         ELSE '' "
            + "     END AS dataIso, "
            + "     TPAI.dtApontamento AS dataOriginal, "
            + "     TPAI.hrApontamento AS horas "
            + " FROM ML0011485 TPAI "
            + " INNER JOIN PROCES_WORKFLOW PW "
            + "     ON PW.NR_DOCUMENTO_CARD = TPAI.documentid "
            + " INNER JOIN HISTOR_PROCES HP "
            + "     ON HP.NUM_PROCES = PW.NUM_PROCES "
            + "    AND HP.NUM_SEQ_MOVTO = ( "
            + "         SELECT MAX(H2.NUM_SEQ_MOVTO) "
            + "         FROM HISTOR_PROCES H2 "
            + "         WHERE H2.NUM_PROCES = HP.NUM_PROCES "
            + "     ) "
            + " WHERE TPAI.tableid = 'principal' "
            + "   AND TPAI.version = ( "
            + "         SELECT MAX(V1.version) "
            + "         FROM ML0011485 V1 "
            + "         WHERE V1.documentid = TPAI.documentid "
            + "     ) "
            + "   AND ( "
            + "        (PW.STATUS = 0 AND HP.NUM_SEQ_ESTADO IN (5, 14)) "
            + "     OR (PW.STATUS = 2 AND HP.NUM_SEQ_ESTADO = 10) "
            + "     OR (PW.STATUS = 1 AND HP.NUM_SEQ_ESTADO = 9) "
            + "   ) "
            + "   AND TPAI.matrSolicitante = ? "
            + "   AND TPAI.dtCompetencia = ? "
            + "   AND TPAI.dtApontamento IS NOT NULL "
            + "   AND TPAI.dtApontamento <> '' ";

        var ic = new javax.naming.InitialContext();
        var dataSource = ic.lookup("java:/jdbc/AppDS");

        conn = dataSource.getConnection();
        stmt = conn.prepareStatement(sql);

        stmt.setString(1, matricula);
        stmt.setString(2, competencia);

        rs = stmt.executeQuery();

        while (rs.next()) {
            var nrSolicitacao = safe(rs.getString("nrSolicitacao"));
            var dataIso = safe(rs.getString("dataIso"));

            if (dataIso === "") {
                dataIso = normalizarDataIso(rs.getString("dataOriginal"));
            }

            if (dataIso === "") {
                continue;
            }

            /*
             * Evita somar duplicidades geradas por join/versão para a mesma
             * solicitação no mesmo dia, mas soma solicitações diferentes no dia.
             */
            if (!solicitacoesPorData[dataIso]) {
                solicitacoesPorData[dataIso] = {};
            }

            if (solicitacoesPorData[dataIso][nrSolicitacao]) {
                continue;
            }

            solicitacoesPorData[dataIso][nrSolicitacao] = true;

            if (!mapa[dataIso]) {
                mapa[dataIso] = 0;
            }

            mapa[dataIso] += toDecimal(rs.getString("horas"));
        }

    } catch (e) {
        log.error("### ds_ts_relatorio_info_usuarios ### Erro ao buscar horas apontadas detalhadas por usuário");
        log.error(e);
        throw e;

    } finally {
        try { if (rs) rs.close(); } catch (e1) {}
        try { if (stmt) stmt.close(); } catch (e2) {}
        try { if (conn) conn.close(); } catch (e3) {}
    }

    return mapa;
}

function obterJornadaCacheada(chapa) {
    chapa = safe(chapa);

    var jornadaDefault = {
        horasDiaDecimal: 8
    };

    if (chapa === "") {
        return jornadaDefault;
    }

    if (CACHE_JORNADA[chapa]) {
        return CACHE_JORNADA[chapa];
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

    var jornada = {
        horasDiaDecimal: 8
    };

    if (ds && ds.rowsCount > 0) {
        var status = safe(getDatasetValue(ds, 0, ["STATUS", "status"]));

        if (status === "" || status === "OK") {
            var horasDiaDecimal = toDecimal(
                getDatasetValue(ds, 0, [
                    "HORAS_DIA_DECIMAL",
                    "horasDiaDecimal",
                    "HORAS_DIA",
                    "horasDia"
                ])
            );

            if (horasDiaDecimal > 0) {
                jornada.horasDiaDecimal = horasDiaDecimal;
            }
        }
    }

    CACHE_JORNADA[chapa] = jornada;

    return jornada;
}

function buscarAusenciasCacheada(chapa, competencia) {
    chapa = safe(chapa);

    var key = chapa + "|" + competencia;

    if (CACHE_AUSENCIAS[key]) {
        return CACHE_AUSENCIAS[key];
    }

    var retorno = {
        totalHoras: 0,
        mapDatas: {}
    };
    
    // TESTE TEMPORÁRIO - simular ausência para PS0108
    /*if (chapa === "PS0108") {
        var dataTesteIso = "2026-02-02";

        if (dataPertenceCompetencia(dataTesteIso, competencia)) {
            retorno.totalHoras += 7;
            retorno.mapDatas[dataTesteIso] = 7;
        }
    }*/

    if (chapa === "") {
        CACHE_AUSENCIAS[key] = retorno;
        return retorno;
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

    var ds = DatasetFactory.getDataset("ds_ts_ausencias", null, constraints, null);

    if (ds && ds.rowsCount > 0) {
        for (var i = 0; i < ds.rowsCount; i++) {
            if (safe(getDatasetValue(ds, i, ["ERRO", "erro"])) !== "") {
                continue;
            }

            var dataIso = normalizarDataIso(
                getDatasetValue(ds, i, [
                    "DATA",
                    "data",
                    "DIA",
                    "dia",
                    "DATA_AUSENCIA",
                    "dataAusencia"
                ])
            );

            if (!dataPertenceCompetencia(dataIso, competencia)) {
                continue;
            }

            var horas = toDecimal(
                getDatasetValue(ds, i, [
                    "HORAS",
                    "horas",
                    "HORA",
                    "hora"
                ])
            );

            retorno.totalHoras += horas;

            if (dataIso !== "") {
                if (!retorno.mapDatas[dataIso]) {
                    retorno.mapDatas[dataIso] = 0;
                }

                retorno.mapDatas[dataIso] += horas;
            }
        }
    }

    CACHE_AUSENCIAS[key] = retorno;

    return retorno;
}

function dataPertenceCompetencia(dataIso, competencia) {
    dataIso = safe(dataIso);
    competencia = safe(competencia);

    if (dataIso === "" || competencia === "") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) {
        return false;
    }

    var compData = dataIso.substring(5, 7) + "/" + dataIso.substring(0, 4);

    return compData == competencia;
}

function normalizarDataIso(data) {
    data = safe(data);

    if (data === "") {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
        return data.substring(0, 10);
    }

    if (/^\d{2}\/\d{2}\/\d{4}/.test(data)) {
        return data.substring(6, 10) + "-" + data.substring(3, 5) + "-" + data.substring(0, 2);
    }

    return "";
}

function splitLista(valor) {
    var retorno = [];
    var partes = safe(valor).split(",");

    for (var i = 0; i < partes.length; i++) {
        var item = safe(partes[i]);

        if (item !== "") {
            retorno.push(item);
        }
    }

    return retorno;
}

function toDecimal(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return 0;
    }

    if (typeof valor === "number") {
        return valor;
    }

    var str = String(valor).trim();

    if (str === "") {
        return 0;
    }

    // Formato HH:MM
    if (str.indexOf(":") > -1) {
        var p = str.split(":");
        var h = parseInt(p[0], 10) || 0;
        var m = parseInt(p[1], 10) || 0;

        return h + (m / 60);
    }

    // Formato brasileiro: 1.234,56
    if (str.indexOf(",") > -1) {
        str = str.replace(/\./g, "").replace(",", ".");
    }

    var n = parseFloat(str);

    return isNaN(n) ? 0 : n;
}

function formatDecimalBR(valor) {
    var n = Math.round(toDecimal(valor) * 100) / 100;

    var inteiro = Math.floor(n);
    var decimal = Math.round((n - inteiro) * 100);

    var dec = String(decimal);

    if (dec.length === 1) {
        dec = "0" + dec;
    }

    return String(inteiro) + "," + dec;
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

function isMapaVazio(mapa) {
    if (!mapa) {
        return true;
    }

    for (var key in mapa) {
        if (mapa.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
}

function safe(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
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