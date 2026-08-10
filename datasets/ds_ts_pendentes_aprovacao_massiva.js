function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("nrSolicitacao");
    dataset.addColumn("documentId");
    dataset.addColumn("erro");

    var competencia = "";

    if (constraints) {
        for (var i = 0; i < constraints.length; i++) {

            if (constraints[i].fieldName == "COMPETENCIA") {
                competencia = constraints[i].initialValue;
            }
        }
    }

    var conn = null;
    var stmt = null;
    var rs = null;

    try {

        var sql = ""
            + " SELECT "
            + "     PW.NUM_PROCES AS nrSolicitacao, "
            + "     TPAI.documentid AS documentId "
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
            + " AND ( "
            + "     PW.STATUS = 0 "
            + "     OR HP.NUM_SEQ_ESTADO IN (9, 10) "
            + " ) "
            + " AND TPAI.statusAprovGestor = 'Pendente aprovação' "
            + " AND TPAI.dtApontamento IS NOT NULL "
            + " AND TPAI.dtApontamento <> '' ";

        if (competencia) {
            sql += " AND TPAI.dtCompetencia = ? ";
        }

        sql += " ORDER BY PW.NUM_PROCES ";

        log.info("======= SQL ds_ts_pendente_aprovacao_massiva");
        log.info(sql);

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        var index = 1;

        if (competencia) {
            stmt.setString(index++, competencia);
        }

        rs = stmt.executeQuery();

        while (rs.next()) {
            dataset.addRow([
                rs.getString("nrSolicitacao"),
                rs.getString("documentId"),
                ""
            ]);
        }

    } catch (e) {

        log.error("======= ERRO ds_ts_pendente_aprovacao_massiva");
        log.error(e);

        dataset.addRow([
            "",
            "",
            "Erro: " + (e.message || e)
        ]);

    } finally {

        try {
            if (rs != null) rs.close();
        } catch (e) {}

        try {
            if (stmt != null) stmt.close();
        } catch (e) {}

        try {
            if (conn != null) conn.close();
        } catch (e) {}
    }

    return dataset;
}