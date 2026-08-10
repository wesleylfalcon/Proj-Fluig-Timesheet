function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("PENDENTES");
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
            + " SELECT COUNT(1) AS PENDENTES "
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

        // Sem ORDER BY em COUNT
        // log.info("======= SQL ds_ts_pendentes_aprovacao_massiva_count");
        // log.info(sql);

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        var index = 1;

        if (competencia) {
            stmt.setString(index++, competencia);
        }

        rs = stmt.executeQuery();

        var pendentes = 0;
        if (rs.next()) {
            pendentes = rs.getInt("PENDENTES");
        }

        dataset.addRow([
            "OK",
            String(pendentes),
            ""
        ]);

    } catch (e) {

        log.error("======= ERRO ds_ts_pendentes_aprovacao_massiva_count");
        log.error(e);

        dataset.addRow([
            "ERRO",
            "0",
            "Erro: " + (e.message || e)
        ]);

    } finally {

        try { if (rs != null) rs.close(); } catch (e) {}
        try { if (stmt != null) stmt.close(); } catch (e) {}
        try { if (conn != null) conn.close(); } catch (e) {}
    }

    return dataset;
}