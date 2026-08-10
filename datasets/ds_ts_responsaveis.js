function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("matricula");
    dataset.addColumn("nome");
    dataset.addColumn("papel");
    dataset.addColumn("erro");

    var roleId = "ResponsaveisTimesheet";

    try {

        // =========================
        // CONSULTA PAPEL
        // =========================
        var cRole = DatasetFactory.createConstraint("workflowColleagueRolePK.roleId", roleId, roleId, ConstraintType.MUST);

        var dsRole = DatasetFactory.getDataset("workflowColleagueRole", null, [cRole], null);

        // =========================
        // SEM RESULTADOS
        // =========================
        if (!dsRole || dsRole.rowsCount == 0) {
            dataset.addRow([
                "",
                "",
                "",
                "Nenhum usuário encontrado no papel"
            ]);

            return dataset;
        }

        // =========================
        // PERCORRE USUÁRIOS
        // =========================
        for (var i = 0; i < dsRole.rowsCount; i++) {
            var matricula = dsRole.getValue(i, "workflowColleagueRolePK.colleagueId");

            var papel = dsRole.getValue(i, "workflowColleagueRolePK.roleId");

            // =========================
            // CONSULTA USUÁRIO
            // =========================
            var cUser = DatasetFactory.createConstraint("colleaguePK.colleagueId", matricula, matricula, ConstraintType.MUST);

            var dsUser = DatasetFactory.getDataset("colleague", null, [cUser], null);

            // =========================
            // USUÁRIO ENCONTRADO
            // =========================
            if (dsUser && dsUser.rowsCount > 0) {
                var nome = dsUser.getValue(0, "colleagueName");

                dataset.addRow([
                    matricula,
                    nome,
                    papel,
                    ""
                ]);
            }
        }

    } catch (e) {
        dataset.addRow([
            "",
            "",
            "",
            "Erro: " + e.message
        ]);
    }

    return dataset;
}