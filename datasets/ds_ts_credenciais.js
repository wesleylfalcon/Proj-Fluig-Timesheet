function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    // =========================
    // CAMPOS DE RETORNO
    // =========================
    dataset.addColumn("STATUS");
    dataset.addColumn("sistema");
    dataset.addColumn("nmUsuario");
    dataset.addColumn("senhaUsuario");
    dataset.addColumn("MESSAGE");

    // =========================
    // CONSTRAINTS
    // =========================
    var sistema = getConstraint(constraints, "SISTEMA");

    if (!sistema) {
        sistema = getConstraint(constraints, "sistema");
    }

    sistema = normalizarSistema(sistema);

    if (!sistema) {
        dataset.addRow([
            "ERRO",
            "",
            "",
            "",
            "Constraint SISTEMA obrigatória. Valores aceitos: fluig ou rm."
        ]);

        return dataset;
    }

    // =========================
    // SQL
    // =========================
    var sql = ""
        + " SELECT "
        + "     TPAI.sistema, "
        + "     TPAI.nmUsuario, "
        + "     TPAI.senhaUsuario "
        + " FROM ML0011522 TPAI "
        + " WHERE "
        + "     TPAI.tableid = 'principal' "
        + "     AND LOWER(TPAI.sistema) = ? "
        + "     AND TPAI.version = ( "
        + "         SELECT MAX(V1.version) "
        + "         FROM ML0011522 V1 "
        + "         WHERE V1.documentid = TPAI.documentid "
        + "     ) "
        + " ORDER BY TPAI.documentid DESC ";

    // Mantém LIMIT 1 agora com filtro por sistema.
    // Se houver duplicidade para o mesmo sistema, pega o mais recente.
    sql += " LIMIT 1 ";

    // =========================
    // EXECUÇÃO
    // =========================
    var conn = null;
    var stmt = null;
    var rs = null;

    try {

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        stmt.setString(1, sistema);

        rs = stmt.executeQuery();

        if (rs.next()) {

            dataset.addRow([
                "OK",
                rs.getString("sistema") || sistema,
                rs.getString("nmUsuario") || "",
                rs.getString("senhaUsuario") || "",
                ""
            ]);

        } else {

            dataset.addRow([
                "ERRO",
                sistema,
                "",
                "",
                "Credencial não encontrada para o sistema: " + sistema
            ]);
        }

    } catch (e) {

        dataset.addRow([
            "ERRO",
            sistema,
            "",
            "",
            "Erro ao consultar credenciais: " + tratarErro(e)
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

function getConstraint(constraints, name) {

    if (!constraints) {
        return "";
    }

    name = String(name || "").toUpperCase();

    for (var i = 0; i < constraints.length; i++) {
        var fieldName = String(constraints[i].fieldName || "").toUpperCase();

        if (fieldName === name) {
            return constraints[i].initialValue;
        }
    }

    return "";
}

function normalizarSistema(sistema) {

    sistema = String(sistema || "").trim().toLowerCase();

    if (sistema === "fluig") {
        return "fluig";
    }

    if (sistema === "rm") {
        return "rm";
    }

    return "";
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