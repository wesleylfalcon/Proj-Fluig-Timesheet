function defineStructure() {
    addColumn("STATUS");
    addColumn("MESSAGE");
}

function onSync(lastSyncDate) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");

    try {
        var worker = "4";

        var constraints = [
            DatasetFactory.createConstraint("WORKER", worker, worker, ConstraintType.MUST)
        ];

        log.info("### WRAPPER SYNC WORKER " + worker + " START ###");

        var ds = DatasetFactory.getDataset(
            "ds_ts_scheduler_controle_aprovacao",
            null,
            constraints,
            null
        );

        if (ds && ds.rowsCount > 0) {
            for (var i = 0; i < ds.rowsCount; i++) {
                dataset.addRow([ds.getValue(i, "STATUS"), ds.getValue(i, "MESSAGE")]);
            }
        } else {
            dataset.addRow(["OK", "ds_ts_scheduler_controle_aprovacao retornou vazio"]);
        }

        log.info("### WRAPPER SYNC WORKER " + worker + " END ###");
        return dataset;

    } catch (e) {
        log.error("### ERRO WRAPPER SYNC WORKER 4 ###");
        log.error(e);
        dataset.addRow(["ERRO", e.message ? e.message : String(e)]);
        return dataset;
    }
}

// Mantém createDataset só pra teste manual pelo “Teste de Dataset”
function createDataset(fields, constraints, sortFields) {
    return onSync(null);
}

function onMobileSync(user) {
    return {
        fields: ["STATUS", "MESSAGE"],
        constraints: [],
        sortFields: []
    };
}