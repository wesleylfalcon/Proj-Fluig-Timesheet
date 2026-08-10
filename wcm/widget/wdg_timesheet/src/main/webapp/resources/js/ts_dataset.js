var TimesheetDataset = (function () {

    function getDataset(name, constraints, fields, order) {
    	
        try {
            var ds = DatasetFactory.getDataset(name, null, constraints || null, order || null);
            return ds;

        } catch (e) {
            console.error('Erro ao buscar dataset:', e);
            return null;
        }
    }

    return {
        getDataset: getDataset
    };
})();