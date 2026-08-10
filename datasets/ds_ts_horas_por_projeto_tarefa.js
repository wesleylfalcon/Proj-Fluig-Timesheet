function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("HORAS");
    dataset.addColumn("ERRO");

    var codigo 		= "";
    var competencia = "";
    var codProjeto 	= "";
    var idTarefa 	= "";

    if(constraints){
        for(var i=0; i<constraints.length; i++){

            if(constraints[i].fieldName == "CODIGO"){
                codigo = constraints[i].initialValue;
            }

            if(constraints[i].fieldName == "COMPETENCIA"){
                competencia = constraints[i].initialValue;
            }
            
            if(constraints[i].fieldName == "CODPROJETO" || constraints[i].fieldName == "IDPROJETO"){
            	codProjeto = constraints[i].initialValue;
            }
            
            if(constraints[i].fieldName == "IDTAREFA"){
            	idTarefa = constraints[i].initialValue;
            }
        }
    }

    var sql = ""
        + " SELECT "
        + " TPAI.codProjeto, "
        + " TPAI.codTarefa, "
        + " COALESCE(SUM(TIME_TO_SEC(TPAI.hrApontamento) / 3600), 0) as totalHoras "

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

        + " AND TPAI.hrApontamento IS NOT NULL "
        + " AND TPAI.hrApontamento <> '' ";

    if(codigo){
        sql += " AND TPAI.matrSolicitante = '" + codigo + "' ";
    }

    if(competencia){
        sql += " AND TPAI.dtCompetencia = '" + competencia + "' ";
    }
    
    if(codProjeto){
        sql += " AND TPAI.codProjeto = '" + codProjeto + "' ";
    }

    if(idTarefa){
        sql += " AND TPAI.codTarefa = '" + idTarefa + "' ";
    }

    sql += " GROUP BY "
        + " TPAI.codProjeto, TPAI.codTarefa ";

    var conn = null;
    var stmt = null;
    var rs = null;

    try{
        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        rs = stmt.executeQuery();

        if(!rs.next()){
            dataset.addRow([
                "0",
                ""
            ]);
        } else {
            do {

                dataset.addRow([
                    rs.getDouble("totalHoras"),
                    ""
                ]);

            } while(rs.next());
        }

    }catch(e){

        dataset.addRow([
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