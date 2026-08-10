function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("nrSolicitacao");
    dataset.addColumn("data");
    dataset.addColumn("nmProjeto");
    dataset.addColumn("nmTarefa");
    dataset.addColumn("horas");
    dataset.addColumn("status");
    dataset.addColumn("erro");

    var status = "";
    var codigo = "";
    var competencia = "";

    if(constraints){
        for(var i=0;i<constraints.length;i++){

            if(constraints[i].fieldName == "STATUS"){
                status = constraints[i].initialValue;
            }

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
        + " PW.NUM_PROCES as nrSolicitacao, "
        + " DATE_FORMAT(STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), '%d/%m/%Y') as data, "
        + " TPAI.nmProjeto, "
        + " TPAI.nmTarefa, "
        + " TIME_FORMAT(TPAI.hrApontamento, '%H:%i') as horas, "
        + " TPAI.statusAprovGestor as status "

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

    if(status){
        sql += " AND TPAI.statusAprovGestor = '" + status + "' ";
    }

    if(codigo){
        sql += " AND TPAI.matrSolicitante = '" + codigo + "' ";
    }

    if(competencia){
        sql += " AND TPAI.dtCompetencia = '" + competencia + "' ";
    }

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

            dataset.addRow([
                rs.getString("nrSolicitacao"),
                rs.getString("data"),
                rs.getString("nmProjeto"),
                rs.getString("nmTarefa"),
                rs.getString("horas"),
                rs.getString("status"),
                ""
            ]);
        }

    }catch(e){

        dataset.addRow([
            "",
            "",
            "",
            "",
            "",
            "",
            "Erro: " + e.message
        ]);

    }finally{

        try { if(rs != null) rs.close(); } catch(e){}
        try { if(stmt != null) stmt.close(); } catch(e){}
        try { if(conn != null) conn.close(); } catch(e){}
    }

    return dataset;
}