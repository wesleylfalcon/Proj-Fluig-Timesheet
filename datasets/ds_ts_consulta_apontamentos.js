function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("nrSolicitacao");
    dataset.addColumn("data");
    dataset.addColumn("nmProjeto");
    dataset.addColumn("idProjeto");
    dataset.addColumn("codProjeto");
    dataset.addColumn("nmTarefa");
    dataset.addColumn("codTarefa");
    dataset.addColumn("idISM");
    dataset.addColumn("idTRF");
    dataset.addColumn("horas");
    dataset.addColumn("observacao");
    dataset.addColumn("status");
    dataset.addColumn("aprovador");
    dataset.addColumn("dataAprov");
    dataset.addColumn("hrAprov");
    dataset.addColumn("statusAprov");
    dataset.addColumn("justificativa");
    dataset.addColumn("erro");

    var codigo = "";
    var competencia = "";
    var projeto = "";
    var tarefa = "";
    var status = "";

    if(constraints){
        for(var i=0;i<constraints.length;i++){

            if(constraints[i].fieldName == "CODIGO"){
                codigo = constraints[i].initialValue;
            }

            if(constraints[i].fieldName == "COMPETENCIA"){
                competencia = constraints[i].initialValue;
            }

            if(constraints[i].fieldName == "PROJETO"){
                projeto = constraints[i].initialValue;
            }

            if(constraints[i].fieldName == "TAREFA"){
                tarefa = constraints[i].initialValue;
            }
            
            if(constraints[i].fieldName == "STATUS"){
                status = constraints[i].initialValue;
            }
        }
    }

    var sql = ""
        + " SELECT "
        + " PW.NUM_PROCES as nrSolicitacao, "
        + " DATE_FORMAT(STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), '%d/%m/%Y') as data, "
        + " TPAI.nmProjeto, "
        + " TPAI.idProjeto, "
        + " TPAI.codProjeto, "
        + " TPAI.nmTarefa, "
        + " TPAI.codTarefa, "
        + " TPAI.idISM, "
        + " TPAI.idTRF, "
        + " TIME_FORMAT(TPAI.hrApontamento, '%H:%i') as horas, "
        + " TPAI.observacao, "
        + " TPAI.statusAprovGestor as status, "
        + " TPAI.nmAprovGestor, "
        + " TPAI.dtAprovGestor, "
        + " TPAI.hrAprovGestor, "
        + " TPAI.statusAprovGestor, "
        + " TPAI.justificativaGestor "

        + " FROM ML0011485 TPAI "

        + " INNER JOIN PROCES_WORKFLOW PW "
        + " ON TPAI.documentid = PW.NR_DOCUMENTO_CARD "

        + " INNER JOIN HISTOR_PROCES HP "
        + " ON HP.NUM_PROCES = PW.NUM_PROCES "
        
        + " AND HP.NUM_SEQ_MOVTO = ( "
        + "     SELECT MAX(H2.NUM_SEQ_MOVTO) "
        + "     FROM HISTOR_PROCES H2 "
        + "     WHERE H2.NUM_PROCES = HP.NUM_PROCES "
        + " ) "

        + " WHERE "
        + " TPAI.tableid = 'principal' "

        + " AND TPAI.version = ( "
        + "     SELECT MAX(V1.version) "
        + "     FROM ML0011485 V1 "
        + "     WHERE V1.documentid = TPAI.documentid "
        + " ) "

        + " AND ( "
        + "     PW.STATUS = 0 "
        + "     OR HP.NUM_SEQ_ESTADO IN (9, 10) "
        + " ) "

        + " AND TPAI.dtApontamento IS NOT NULL "
        + " AND TPAI.dtApontamento <> '' ";

    // FILTROS NOVOS
    if(codigo){
        sql += " AND TPAI.matrSolicitante = '" + codigo + "' ";
    }

    if(competencia){
        sql += " AND TPAI.dtCompetencia = '" + competencia + "' ";
    }

    if(projeto){
        sql += " AND TPAI.codProjeto = '" + projeto + "' ";
    }

    if(tarefa){
        sql += " AND TPAI.codTarefa = '" + tarefa + "' ";
    }
    
    if(status){
        var listaStatus = status.split(",");

        sql += " AND TPAI.statusAprovGestor IN (";

        for (var i = 0; i < listaStatus.length; i++) {
            sql += "'" + listaStatus[i].trim() + "'";

            if (i < listaStatus.length - 1) {
                sql += ",";
            }
        }

        sql += ") ";
    }

    sql += " ORDER BY STR_TO_DATE(TPAI.dtApontamento,'%d/%m/%Y') ";

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
                rs.getString("idProjeto"),
                rs.getString("codProjeto"),
                rs.getString("nmTarefa"),
                rs.getString("codTarefa"),
                rs.getString("idISM"),
                rs.getString("idTRF"),
                rs.getString("horas"),
                rs.getString("observacao"),
                rs.getString("status"),
                rs.getString("nmAprovGestor"),
                rs.getString("dtAprovGestor"),
                rs.getString("hrAprovGestor"),
                rs.getString("statusAprovGestor"),
                rs.getString("justificativaGestor"),
                ""
            ]);
        }

    }catch(e){

        dataset.addRow(["","","","","","","","","","","","","","","","","","Erro: " + e.message]);

    }finally{

        try { if(rs != null) rs.close(); } catch(e){}
        try { if(stmt != null) stmt.close(); } catch(e){}
        try { if(conn != null) conn.close(); } catch(e){}
    }

    return dataset;
}