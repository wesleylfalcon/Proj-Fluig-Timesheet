function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("erro");
    dataset.addColumn("HORASAPROVADAS");
    dataset.addColumn("HORASPENDENTES");
    dataset.addColumn("PROJETOSPENDENTES");
    dataset.addColumn("QTDPROJETOS");

    var matricula = "";
    var competencia = "";

    // =========================
    // CONSTRAINTS
    // =========================
    if (constraints){

        for (var i = 0; i < constraints.length; i++){

            if (constraints[i].fieldName == "MATRICULA"){
            	matricula = constraints[i].initialValue;
            }

            if (constraints[i].fieldName == "COMPETENCIA"){
                competencia = constraints[i].initialValue;
            }
        }
    }

    var conn = null;
    var stmt = null;
    var rs = null;

    try {

        // =========================
        // SQL
        // =========================
    	var sql = ""
    	    + " SELECT "

    	    + " COALESCE(SUM(CASE "
    	    + "     WHEN TPAI.statusAprovGestor = 'Aprovado' "
    	    + "     THEN TIME_TO_SEC(TPAI.hrApontamento)/3600 "
    	    + "     ELSE 0 "
    	    + " END),0) AS horas_aprovadas, "

    	    + " COALESCE(SUM(CASE "
    	    + "     WHEN TPAI.statusAprovGestor = 'Pendente aprovação' "
    	    + "     THEN TIME_TO_SEC(TPAI.hrApontamento)/3600 "
    	    + "     ELSE 0 "
    	    + " END),0) AS horas_pendentes, "
    	    
    	    + " COALESCE(( "
    	    + "     SELECT GROUP_CONCAT( "
    	    + "         CONCAT(proj.nmProjeto, ' (', proj.horasProjeto, ')') "
    	    + "         SEPARATOR '; ' "
    	    + "     ) "
    	    + "     FROM ( "

    	    + "         SELECT "
    	    + "             TRIM(T2.nmProjeto) AS nmProjeto, "

    	    + "             TIME_FORMAT( "
    	    + "                 SEC_TO_TIME( "
    	    + "                     SUM(TIME_TO_SEC(T2.hrApontamento)) "
    	    + "                 ), "
    	    + "                 '%H:%i' "
    	    + "             ) AS horasProjeto "

    	    + "         FROM ML0011485 T2 "

    	    + "         INNER JOIN PROCES_WORKFLOW PW2 "
    	    + "             ON PW2.NR_DOCUMENTO_CARD = T2.documentid "

    	    + "         WHERE T2.tableid = 'principal' "

    	    + "         AND T2.version = ( "
    	    + "             SELECT MAX(V2.version) "
    	    + "             FROM ML0011485 V2 "
    	    + "             WHERE V2.documentid = T2.documentid "
    	    + "         ) "

    	    + "         AND PW2.STATUS = 0 "

    	    + "         AND T2.statusAprovGestor = 'Pendente aprovação' "

    	    + "         AND CONCAT(',', T2.aprovadores, ',') "
    	    + "             LIKE ? "

    	    + "         AND T2.dtCompetencia = ? "

    	    + "         AND T2.nmProjeto IS NOT NULL "

    	    + "         AND TRIM(T2.nmProjeto) <> '' "

    	    + "         GROUP BY TRIM(T2.nmProjeto) "

    	    + "     ) proj "
    	    + " ), '') AS projetos_pendentes, "
    	    
    	    + " COUNT(DISTINCT CASE "
    	    + "     WHEN TPAI.statusAprovGestor = 'Pendente aprovação' "
    	    + "     AND TPAI.nmProjeto IS NOT NULL "
    	    + "     AND TRIM(TPAI.nmProjeto) <> '' "
    	    + "     THEN TRIM(TPAI.nmProjeto) "
    	    + " END) AS qtd_projetos "

    	    + " FROM ML0011485 TPAI "

    	    + " INNER JOIN PROCES_WORKFLOW PW "
    	    + "     ON PW.NR_DOCUMENTO_CARD = TPAI.documentid "

    	    + " WHERE TPAI.tableid = 'principal' "

    	    + " AND TPAI.version = ( "
    	    + "     SELECT MAX(V1.version) "
    	    + "     FROM ML0011485 V1 "
    	    + "     WHERE V1.documentid = TPAI.documentid "
    	    + " ) "

    	    + " AND PW.STATUS = 0 "

    	    + " AND CONCAT(',', TPAI.aprovadores, ',') "
    	    + "     LIKE ? "

    	    + " AND TPAI.dtCompetencia = ? ";

        log.info("======= SQL ds_ts_horas_aprovador");
        log.info(sql);

        // =========================
        // CONNECTION
        // =========================
        var ic = new javax.naming.InitialContext();

        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();

        stmt = conn.prepareStatement(sql);

        // =========================
        // PARAMS
        // =========================
        stmt.setString(
    	    1,
    	    "%," + matricula + ",%"
    	);

    	stmt.setString(
    	    2,
    	    competencia
    	);
    	
    	stmt.setString(
		    3,
		    "%," + matricula + ",%"
		);

		stmt.setString(
		    4,
		    competencia
		);

        rs = stmt.executeQuery();

        // =========================
        // RESULT
        // =========================
        if (rs.next()){

            dataset.addRow([
                "",
                rs.getDouble("horas_aprovadas"),
                rs.getDouble("horas_pendentes"),
                rs.getString("projetos_pendentes"),
                rs.getInt("qtd_projetos")
            ]);

        } else {

            dataset.addRow([
                "",
                0,
                0,
                "",
                0
            ]);
        }

    } catch (e){

        log.error("======= ERRO ds_ts_horas_aprovador");
        log.error(e);

        dataset.addRow([
            "Erro: " + (e.message || e),
            0,
            0,
            "",
            0
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