function createDataset(fields, constraints, sortFields){

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("nrSolicitacao");
    dataset.addColumn("nmColaborador");
    dataset.addColumn("data");
    dataset.addColumn("idProjeto");
    dataset.addColumn("nmProjeto");
    dataset.addColumn("idTarefa");
    dataset.addColumn("nmTarefa");
    dataset.addColumn("horas");
    dataset.addColumn("statusAprovGestor");
    dataset.addColumn("totalHorasPendentes");
    dataset.addColumn("totalHorasAprovadas");

    dataset.addColumn("erro");

    var codigo = "";
    var competencia = "";
    var projeto = "";
    var tarefa = "";
    var colaborador = "";
    var status = "";

    if (constraints){
        for (var i = 0; i < constraints.length; i++){
            if (constraints[i].fieldName == "CODIGO") codigo = constraints[i].initialValue;
            if (constraints[i].fieldName == "COMPETENCIA") competencia = constraints[i].initialValue;
            if (constraints[i].fieldName == "PROJETO") projeto = constraints[i].initialValue;
            if (constraints[i].fieldName == "TAREFA") tarefa = constraints[i].initialValue;
            if (constraints[i].fieldName == "CODCOLABORADOR") colaborador = constraints[i].initialValue;
            if (constraints[i].fieldName == "STATUS") status = constraints[i].initialValue;
        }
    }

    var conn = null;
    var stmt = null;
    var rs = null;

    try {

        var sql = ""
            + " SELECT "
            + "     PW.NUM_PROCES AS nrSolicitacao, "
            + "     TPAI.nmSolicitante, "
            + "     DATE_FORMAT( "
            + "         STR_TO_DATE(TPAI.dtApontamento, '%d/%m/%Y'), "
            + "         '%d/%m/%Y' "
            + "     ) AS data, "
            + "     TPAI.codProjeto AS idProjeto, "
            + "     TPAI.nmProjeto, "
            + "     TPAI.codTarefa, "
            + "     TPAI.nmTarefa, "
            + "     TIME_FORMAT(TPAI.hrApontamento, '%H:%i') AS horas, "
            + "     TPAI.statusAprovGestor AS statusAprovGestor "
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
            + " AND TPAI.dtApontamento IS NOT NULL "
            + " AND TPAI.dtApontamento <> '' ";

        if (codigo){
            sql += " AND CONCAT(',', TPAI.aprovadores, ',') LIKE ? ";
        }

        if (competencia){
            sql += " AND TPAI.dtCompetencia = ? ";
        }

        if (projeto){
            sql += " AND TPAI.codProjeto = ? ";
        }

        if (tarefa){
            sql += " AND TPAI.codTarefa = ? ";
        }

        if (colaborador){
            sql += " AND TPAI.matrSolicitante = ? ";
        }

        if(status){
            var listaStatus = status.split(",");
            sql += " AND TPAI.statusAprovGestor IN (";
            for (var s = 0; s < listaStatus.length; s++) {
                sql += "'" + listaStatus[s].trim() + "'";
                if (s < listaStatus.length - 1) sql += ",";
            }
            sql += ") ";
        }

        sql += " ORDER BY PW.NUM_PROCES ";

        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup("java:/jdbc/AppDS");

        conn = ds.getConnection();
        stmt = conn.prepareStatement(sql);

        var index = 1;

        if (codigo) stmt.setString(index++,"%," + codigo + ",%");
        if (competencia) stmt.setString(index++,competencia);
        if (projeto) stmt.setString(index++,projeto);
        if (tarefa) stmt.setString(index++,tarefa);
        if (colaborador) stmt.setString(index++, colaborador);

        rs = stmt.executeQuery();

        // totais separados
        var totalMinPendente = 0;
        var totalMinAprovado = 0;

        var rows = [];

        while (rs.next()){

            var horas = rs.getString("horas") || "00:00";
            var statusRow = String(rs.getString("statusAprovGestor") || "");

            var partes = horas.split(":");
            var h = parseInt(partes[0], 10) || 0;
            var m = parseInt(partes[1], 10) || 0;
            var minutos = (h * 60) + m;

            if (statusRow == "Pendente aprovação") {
                totalMinPendente += minutos;
            } else if (statusRow == "Aprovado") {
                totalMinAprovado += minutos;
            }

            rows.push({
                nrSolicitacao: rs.getString("nrSolicitacao"),
                nmSolicitante: rs.getString("nmSolicitante"),
                data: rs.getString("data"),
                idProjeto: rs.getString("idProjeto"),
                nmProjeto: rs.getString("nmProjeto"),
                codTarefa: rs.getString("codTarefa"),
                nmTarefa: rs.getString("nmTarefa"),
                horas: horas,
                statusAprovGestor: statusRow
            });
        }

        function formatHHMM(totalMinutos) {
            var hh = Math.floor(totalMinutos / 60);
            var mm = totalMinutos % 60;
            return ("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2);
        }

        var totalPend = formatHHMM(totalMinPendente);
        var totalAprov = formatHHMM(totalMinAprovado);

        for (var r = 0; r < rows.length; r++){
            dataset.addRow([
                rows[r].nrSolicitacao,
                rows[r].nmSolicitante,
                rows[r].data,
                rows[r].idProjeto,
                rows[r].nmProjeto,
                rows[r].codTarefa,
                rows[r].nmTarefa,
                rows[r].horas,
                rows[r].statusAprovGestor,
                totalPend,
                totalAprov,
                ""
            ]);
        }

    } catch (e){
        log.error("======= ERRO ds_ts_aprovacoes_pendentes");
        log.error(e);

        dataset.addRow([
            "", "", "", "", "", "", "", "", "",
            "00:00", "00:00",
            "Erro: " + (e.message || e)
        ]);

    } finally {
        try { if (rs != null) rs.close(); } catch(e){}
        try { if (stmt != null) stmt.close(); } catch(e){}
        try { if (conn != null) conn.close(); } catch(e){}
    }

    return dataset;
}