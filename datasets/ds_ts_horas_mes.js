function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("erro");
    dataset.addColumn("HORASAPROVADAS");
    dataset.addColumn("HORASPENDENTES");
    dataset.addColumn("HORASFALTANTES");
    dataset.addColumn("HORASMES");

    var codigo = "";
    var chapa = "";
    var competencia = "";

    if (constraints) {
        for (var i = 0; i < constraints.length; i++) {

            if (constraints[i].fieldName == "CODIGO") {
                codigo = constraints[i].initialValue;
            }
            
            if (constraints[i].fieldName == "CHAPA") {
                chapa = constraints[i].initialValue;
            }

            if (constraints[i].fieldName == "COMPETENCIA") {
                competencia = constraints[i].initialValue;
            }
        }
    }

    if (!codigo) {
        dataset.addRow([
            "Erro: constraint CODIGO não informada.",
            "",
            "",
            "",
            ""
        ]);

        return dataset;
    }

    if (!competencia) {
        dataset.addRow([
            "Erro: constraint COMPETENCIA não informada.",
            "",
            "",
            "",
            ""
        ]);

        return dataset;
    }

    var sql = ""
        + " SELECT "
        + "     COALESCE(SUM(CASE "
        + "         WHEN TPAI.statusAprovGestor = 'Aprovado' "
        + "         THEN TIME_TO_SEC(TPAI.hrApontamento) / 3600 "
        + "         ELSE 0 "
        + "     END), 0) AS horas_aprovadas, "

        + "     COALESCE(SUM(CASE "
        + "         WHEN TPAI.statusAprovGestor IN ('Pendente aprovação', 'Revisado') "
        + "         THEN TIME_TO_SEC(TPAI.hrApontamento) / 3600 "
        + "         ELSE 0 "
        + "     END), 0) AS horas_pendentes "

        + " FROM ML0011485 TPAI "

        + " INNER JOIN PROCES_WORKFLOW PW "
        + "     ON TPAI.documentid = PW.NR_DOCUMENTO_CARD "

        + " WHERE "
        + "     TPAI.tableid = 'principal' "

        + "     AND TPAI.version = ( "
        + "         SELECT MAX(V1.version) "
        + "         FROM ML0011485 V1 "
        + "         WHERE V1.documentid = TPAI.documentid "
        + "     ) "

        + "     AND PW.STATUS = 0 "
        + "     AND TPAI.matrSolicitante = ? "
        + "     AND TPAI.dtCompetencia = ? ";

    var conn = null;
    var stmt = null;
    var rs = null;

    try {

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        stmt.setString(1, codigo);
        stmt.setString(2, competencia);

        rs = stmt.executeQuery();

        if (rs.next()) {

            var aprovadas = rs.getDouble("horas_aprovadas");
            var pendentes = rs.getDouble("horas_pendentes");

            var horasMes = consultarHorasMesRM(chapa);

            var faltantes = horasMes - (aprovadas + pendentes);

            if (faltantes < 0) {
                faltantes = 0;
            }

            dataset.addRow([
                "",
                String(aprovadas),
                String(pendentes),
                String(faltantes),
                String(horasMes)
            ]);

        } else {
        	
        	var horasMesSemApontamento = consultarHorasMesRM(chapa);

            dataset.addRow([
                "",
                "0",
                "0",
                String(horasMesSemApontamento),
                String(horasMesSemApontamento)
            ]);
        }

    } catch (e) {

        dataset.addRow([
            "Erro: " + tratarErro(e),
            "",
            "",
            "",
            ""
        ]);

    } finally {

        try {
            if (rs != null) rs.close();
        } catch (e1) {}

        try {
            if (stmt != null) stmt.close();
        } catch (e2) {}

        try {
            if (conn != null) conn.close();
        } catch (e3) {}
    }

    return dataset;
}

//=========================
//HELPERS
//=========================
function consultarHorasMesRM(chapa) {

    if (!chapa) {
        throw "CHAPA não informada para consulta de horas disponíveis no RM.";
    }

    var credenciais = getCredenciaisRM();

    var codSentenca = "CONS.TIMESHEET.HORAS.MES";
    //var codColigada = "1";
    var codSistema = "P";
    var parametros = "CHAPA=" + chapa;

    var username = credenciais.usuario;
    var password = credenciais.senha;

    if (!username || !password) {
        throw "Credenciais RM inválidas. Usuário ou senha não retornados pelo dataset ds_ts_credenciais.";
    }

    log.info("### DS_TS_HORAS_MES ### Consultando RM");
    log.info("### DS_TS_HORAS_MES ### SENTENCA=" + codSentenca);
    //log.info("### DS_TS_HORAS_MES ### COLIGADA=" + codColigada);
    log.info("### DS_TS_HORAS_MES ### SISTEMA=" + codSistema);
    log.info("### DS_TS_HORAS_MES ### PARAMETROS=" + parametros);
    log.info("### DS_TS_HORAS_MES ### USUARIO_RM=" + username);

    try {

        var servico = ServiceManager.getServiceInstance("wsConsultaSQL");
        var instancia = servico.instantiate("com.totvs.WsConsultaSQL");
        var ws = instancia.getRMIwsConsultaSQL();
        var serviceHelper = servico.getBean();

        var authService = serviceHelper.getBasicAuthenticatedClient(
            ws,
            "com.totvs.IwsConsultaSQL",
            username,
            password
        );

        var result = authService.realizarConsultaSQL(
            String(codSentenca),
            1,
            String(codSistema),
            String(parametros)
        );

        log.info("### DS_TS_HORAS_MES ### Retorno bruto RM: " + result);

        var horasDisponiveis = parseHorasDisponiveisRM(result);

        log.info(
            "### DS_TS_HORAS_MES ### RM retornou HORAS_DISPONIVEIS_APONTAMENTO="
            + horasDisponiveis
            + " | CHAPA="
            + chapa
        );

        return horasDisponiveis;

    } catch (e) {

        log.error("### DS_TS_HORAS_MES ### Erro ao consultar RM");
        log.error(e);

        throw "Erro ao consultar RM: " + tratarErro(e);
    }
}

function parseHorasDisponiveisRM(xmlString) {

    if (!xmlString) {
        throw "Consulta RM não retornou XML.";
    }

    var xml = new XML(xmlString);

    var valor = "";

    for each (var row in xml.Resultado) {
        valor = getXmlValue(row, "HORAS_DISPONIVEIS_APONTAMENTO");
        break;
    }

    if (!valor) {
        throw "Campo HORAS_DISPONIVEIS_APONTAMENTO não encontrado no retorno RM.";
    }

    return normalizarHorasRM(valor);
}

function getXmlValue(row, tagName) {

    try {
        var value = row[tagName].toString();

        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();

    } catch (e) {
        return "";
    }
}

function normalizarHorasRM(valor) {

    valor = String(valor || "").trim();

    if (!valor) {
        return 0;
    }

    // Exemplo: 200:00
    if (/^\d+:\d{2}$/.test(valor)) {
        var partes = valor.split(":");
        var horas = parseInt(partes[0], 10);
        var minutos = parseInt(partes[1], 10);

        if (isNaN(horas)) horas = 0;
        if (isNaN(minutos)) minutos = 0;

        return horas + (minutos / 60);
    }

    // Exemplo: 200,50
    valor = valor.replace(",", ".");

    var decimal = parseFloat(valor);

    if (isNaN(decimal)) {
        return 0;
    }

    return decimal;
}

function getCredenciaisRM() {

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "SISTEMA",
            "rm",
            "rm",
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset(
        "ds_ts_credenciais",
        null,
        constraints,
        null
    );

    if (!ds || ds.rowsCount === 0) {
        throw "Dataset ds_ts_credenciais não retornou credenciais RM.";
    }

    var status = safe(ds.getValue(0, "STATUS"));
    var usuario = safe(ds.getValue(0, "nmUsuario"));
    var senha = safe(ds.getValue(0, "senhaUsuario"));
    var message = safe(ds.getValue(0, "MESSAGE"));

    if (status !== "OK") {
        throw "Erro ao obter credenciais RM: " + message;
    }

    if (!usuario || !senha) {
        throw "Credenciais RM não configuradas.";
    }

    return {
        usuario: usuario,
        senha: senha
    };
}

function safe(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function tratarErro(e) {
    if (e == null) {
        return "Erro não identificado.";
    }

    if (e.message) {
        return e.message;
    }

    return String(e);
}