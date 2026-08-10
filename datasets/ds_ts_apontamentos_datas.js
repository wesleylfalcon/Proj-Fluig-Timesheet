function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("data");
    dataset.addColumn("status");
    dataset.addColumn("horas");
    dataset.addColumn("erro");

    var codigo = "";
    var competencia = "";

    if(constraints){
        for(var i=0;i<constraints.length;i++){

            if(constraints[i].fieldName == "CODIGO"){
                codigo = constraints[i].initialValue;
            }

            if(constraints[i].fieldName == "COMPETENCIA"){
                competencia = constraints[i].initialValue;
            }
        }
    }

    var sql = ""
        + " SELECT "

        + " DATE_FORMAT(STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), '%Y-%m-%d') as data, "

        + " TPAI.statusAprovGestor as status, "

        + " COALESCE(SUM(TIME_TO_SEC(TPAI.hrApontamento) / 3600), 0) as horas "

        + " FROM ML0011485 TPAI "

        + " INNER JOIN PROCES_WORKFLOW PW "
        + " ON TPAI.documentid = PW.NR_DOCUMENTO_CARD "

        + " WHERE "
        + " TPAI.tableid = 'principal' "

        + " AND TPAI.version = ( "
        + "     SELECT MAX(V1.version) "
        + "     FROM ML0011485 V1 "
        + "     WHERE V1.documentid = TPAI.documentid "
        + " ) "

        + " AND PW.STATUS = 0 "

        + " AND TPAI.dtApontamento IS NOT NULL "
        + " AND TPAI.dtApontamento <> '' "
        + " AND STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y') IS NOT NULL ";

    if(codigo){
        sql += " AND TPAI.matrSolicitante = '" + codigo + "' ";
    }

    if(competencia){
        sql += " AND TPAI.dtCompetencia = '" + competencia + "' ";
    }

    sql += " GROUP BY "
        + " STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), "
        + " TPAI.statusAprovGestor ";

    sql += " ORDER BY "
        + " STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y') ";

    var conn = null;
    var stmt = null;
    var rs = null;

    try{
        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        rs = stmt.executeQuery();

        while(rs.next()){

            var data = rs.getString("data"); // já vem yyyy-MM-dd
            var status = rs.getString("status");
            var horas = rs.getDouble("horas");

            dataset.addRow([
                data,
                status,
                horas,
                ""
            ]);
        }

    }catch(e){

        dataset.addRow([
            "",
            "",
            "",
            "Erro: " + e.message
        ]);

    }finally{
        if(rs != null) rs.close();
        if(stmt != null) stmt.close();
        if(conn != null) conn.close();
    }

    return dataset;
}