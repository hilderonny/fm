/**
 * API for instant search
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;

router.get('/', auth(), async(req, res) => {
    var searchTerm = req.query.term;
    if (!searchTerm || searchTerm.length < 1) return res.send([]);
    var query = `
    DROP TABLE IF EXISTS search_result;
    CREATE TEMP TABLE search_result (name text, title text);
    DROP FUNCTION IF EXISTS search_in_table_column(text,text,text);
    CREATE FUNCTION search_in_table_column(text, text, text) RETURNS json AS
    $$
    DECLARE
        tablename ALIAS FOR $1;
        columnname ALIAS FOR $2;
        searchvalue ALIAS FOR $3;
        retval json;
    BEGIN
        EXECUTE format('SELECT json_agg(row(name,%2$s)::search_result) FROM %1$s WHERE %2$s ILIKE ''%%%3$s%%'';', tablename, columnname, searchvalue) INTO retval; RETURN retval;
    END;
    $$ LANGUAGE plpgsql;
    
    SELECT dtf.datatypename, tbl.name, tbl.title
    FROM
        datatypefields dtf,
        LATERAL (
            SELECT * FROM json_to_recordset(search_in_table_column(dtf.datatypename, dtf.name, '${searchTerm}')) as v(name text, title text)
        ) tbl
    WHERE dtf.istitle = true 
    ORDER BY LOWER(tbl.title);
    `;
    var result = (await Db.query(req.user.clientname, query))[4].rows; // 0 = DROP, 1 = CREATE, 2 = DROP, 3 = CREATE, 4 = SELECT
    var mappedResult = result.map((r) => { return {
        _id: r.name,
        name: r.title,
        collection: r.datatypename,
        icon:co.collections[r.datatypename] ? co.collections[r.datatypename].icon : null
    }});
    res.send(mappedResult);
});

module.exports = router;