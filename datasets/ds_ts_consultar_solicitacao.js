function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();

    // =========================
    // CAMPOS
    // =========================
    dataset.addColumn("nrSolicitacao");
    dataset.addColumn("matrSolicitante");
    dataset.addColumn("codRM");
    dataset.addColumn("aprovadores");
    dataset.addColumn("nmSolicitante");
    dataset.addColumn("dtAbertura");
    dataset.addColumn("hrAbertura");
    dataset.addColumn("dtCompetencia");
    dataset.addColumn("nmAprovGestor");
    dataset.addColumn("dtAprovGestor");
    dataset.addColumn("hrAprovGestor");
    dataset.addColumn("statusAprovGestor");
    dataset.addColumn("justificativaGestor");
    dataset.addColumn("nmProjeto");
    dataset.addColumn("idProjeto");
    dataset.addColumn("codProjeto");
    dataset.addColumn("nmTarefa");
    dataset.addColumn("codTarefa");
    dataset.addColumn("idISM");
    dataset.addColumn("idTRF");
    dataset.addColumn("dtApontamento");
    dataset.addColumn("hrApontamento");
    dataset.addColumn("observacao");

    dataset.addColumn("erro");

    // =========================
    // CONSTRAINT
    // =========================
    var nrSolicitacao = "";

    if(constraints){
        for(var i=0;i<constraints.length;i++){
            if(constraints[i].fieldName == "SOLICITACAO"){
                nrSolicitacao = constraints[i].initialValue;
            }
        }
    }

    if(!nrSolicitacao){
        dataset.addRow(["","","","","","","","","","","","","","","","","","","","","","","","SOLICITACAO não informado"]);
        return dataset;
    }

    // =========================
    // SQL
    // =========================
    var sql = ""
        + " SELECT "
        + " PW.NUM_PROCES as nrSolicitacao, "
        + " TPAI.matrSolicitante, "
        + " TPAI.codRM, "
        + " TPAI.aprovadores, "
        + " TPAI.nmSolicitante, "
        + " TPAI.dtAbertura, "
        + " TPAI.hrAbertura, "
        + " TPAI.dtCompetencia, "
        + " TPAI.nmAprovGestor, "
        + " TPAI.dtAprovGestor, "
        + " TPAI.hrAprovGestor, "
        + " TPAI.statusAprovGestor, "
        + " TPAI.justificativaGestor, "

        + " TPAI.nmProjeto, "
        + " TPAI.idProjeto, "
        + " TPAI.codProjeto, "
        + " TPAI.nmTarefa, "
        + " TPAI.codTarefa, "
        + " TPAI.idISM, "
        + " TPAI.idTRF, "
        + " TPAI.dtApontamento, "
        + " TIME_FORMAT(TPAI.hrApontamento, '%H:%i') as hrApontamento, "
        + " TPAI.observacao "

        + " FROM ML0011485 TPAI "

        + " INNER JOIN PROCES_WORKFLOW PW "
        + " ON TPAI.documentid = PW.NR_DOCUMENTO_CARD "

        + " WHERE "
        + " TPAI.tableid = 'principal' "
        + " AND PW.NUM_PROCES = ? "

        + " AND TPAI.version = ( "
        + "     SELECT MAX(V1.version) "
        + "     FROM ML0011485 V1 "
        + "     WHERE V1.documentid = TPAI.documentid "
        + " ) ";

    // =========================
    // EXECUÇÃO
    // =========================
    var conn = null;
    var stmt = null;
    var rs = null;

    try{

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);
        stmt.setString(1, nrSolicitacao);

        rs = stmt.executeQuery();

        while(rs.next()){
            dataset.addRow([
                rs.getString("nrSolicitacao"),
                rs.getString("matrSolicitante"),
                rs.getString("codRM"),
                rs.getString("aprovadores"),
                rs.getString("nmSolicitante"),
                rs.getString("dtAbertura"),
                rs.getString("hrAbertura"),
                rs.getString("dtCompetencia"),
                rs.getString("nmAprovGestor"),
                rs.getString("dtAprovGestor"),
                rs.getString("hrAprovGestor"),
                rs.getString("statusAprovGestor"),
                rs.getString("justificativaGestor"),

                rs.getString("nmProjeto"),
                rs.getString("idProjeto"),
                rs.getString("codProjeto"),
                rs.getString("nmTarefa"),
                rs.getString("codTarefa"),
                rs.getString("idISM"),
                rs.getString("idTRF"),
                rs.getString("dtApontamento"),
                rs.getString("hrApontamento"),
                rs.getString("observacao"),

                ""
            ]);
        }

    }catch(e){

        dataset.addRow(["","","","","","","","","","","","","","","","","","","","","","","","Erro: " + e.message]);

    }finally{
        try { if(rs != null) rs.close(); } catch(e){}
        try { if(stmt != null) stmt.close(); } catch(e){}
        try { if(conn != null) conn.close(); } catch(e){}
    }

    return dataset;
}