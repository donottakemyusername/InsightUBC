/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = () => {
    let query = {};
    let roomsName = {
        "Address": "rooms_address",
        "Full Name": "rooms_fullname",
        "Furniture": "rooms_furniture",
        "Link": "rooms_href",
        "Latitude": "rooms_lat",
        "Longitude": "rooms_lon",
        "Name": "rooms_name",
        "Seats": "rooms_seats",
        "Short Name": "rooms_shortname",
        "Number": "rooms_number",
        "Type": "rooms_type"
    };
    let coursesName = {
        "Audit": "courses_audit",
        "Average": "courses_avg",
        "Department": "courses_dept",
        "Fail": "courses_fail",
        "ID": "courses_id",
        "Instructor": "courses_instructor",
        "Pass": "courses_pass",
        "Title": "courses_title",
        "UUID": "courses_uuid",
        "Year": "courses_year"
    }
    // 1. check whether is rooms or courses
    // result: "courses" or "rooms"
    let datasetType = document.getElementsByClassName("nav-item tab active")[0].outerText.toLowerCase();

    // form (parent) of all body elements
    let f = document.getElementsByClassName("tab-panel active")[0].children[0];

    // 2. check which condition is selected
    let logicCond = f.children[0].children[1];
    let logicCondition = "AND";
    if (logicCond.children[1].querySelector("input").checked) {
        logicCondition = "OR";
    } else if (logicCond.children[2].querySelector("input").checked) {
        logicCondition = "NOT";
    }

    // 3. check full conditions
    // result: [{not: True, field: "courses_dept", operator: "IS", text: "CPSC"},
    //          {not: False, field: "courses_avg", operator: "GT", text: "95"}]
    let fullCond = f.children[0].children[2];
    let conds = [];
    if (fullCond.children.length !== 0) {
        // every child here is a newly added condition
        for (let child of fullCond.children) {
            // initialize full condition default values
            let cond = {
                not: false, field: (datasetType === "rooms")
                    ? "rooms_address" : "courses_audit", operator: "EQ", text: ""
            };
            cond.not = child.children[0].children[0].checked;
            const allVal = child.children[1].children[0].children;
            for (let c of allVal) {
                if (c.selected) {
                    cond.field = (datasetType === "rooms") ? roomsName[c.label] : coursesName[c.label];
                    break;
                }
            }
            const allOps = child.children[2].children[0].children;
            for (let o of allOps) {
                if (o.selected) {
                    cond.operator = o.label;
                    break;
                }
            }
            cond.text = child.children[3].children[0].defaultValue;
            conds.push(cond);
        }
    }

    // 4. get columns, concat by "dataset type"
    // result: ["courses_audit", "courses_dept", ...]
    let colList = [];

    for (let field of f.children[1].children[1].children) {
        if (field.querySelector("input").checked) {
            if (field.className === "control transformation") {
                colList.push(field.querySelector("input").value);
            } else {
                colList.push(`${datasetType}_${field.children[0].value}`);
            }
        }
    }

    // 5. get order
    // result: {field: "courses_avg", dir: "UP"}
    let orderBy = {field: [], dir: "UP"};
    let orderControl = f.children[2].getElementsByClassName("control order fields")[0].children[0].children;
    for (let b of orderControl) {
        if (b.selected) {
            if (b.className === "transformation") {
                orderBy.field.push(b.innerText);
            } else {
                orderBy.field.push((datasetType === "rooms") ? roomsName[b.innerText] : coursesName[b.innerText]);
            }
        }
    }
    orderBy.dir = f.children[2].getElementsByClassName("control descending")[0]
        .querySelector("input").checked ? "DOWN" : "UP";

    // 6. get groupBy
    // result: ["rooms_name", "rooms_furniture", ...]
    let groupCols = [];
    let groupFields = f.children[3].children[1];
    for (let g of groupFields.children) {
        if (g.querySelector("input").checked) {
            groupCols.push(`${datasetType}_${g.querySelector("input").value}`);
        }
    }

    // 7. get transformation
    let trans = f.children[4].children[1].children;
    let transCond = [];
    if (trans.length !== 0) {
        for (t of trans) {
            let tr = {
                condition: "", type: "COUNT",
                field: (datasetType === "rooms") ? "rooms_address" : "courses_audit"
            };
            tr.condition = t.children[0].children[0].value;
            for (let ops of t.children[1].children[0].children) {
                if (ops.selected) {
                    tr.type = ops.label;
                    break;
                }
            }
            for (let fid of t.children[2].children[0].children) {
                if (fid.selected) {
                    tr.field = (datasetType === "rooms") ? roomsName[fid.label] : coursesName[fid.label];
                    break;
                }
            }
            transCond.push(tr);
        }
    }

    // now put everything together
    if (transCond.length === 0 && groupCols.length === 0) {
        query = {"WHERE": {}, "OPTIONS": {}};
    } else {
        query = {"WHERE": {}, "OPTIONS": {}, "TRANSFORMATIONS": {}};
    }
    // Filling "WHERE"
    // 1. if only one condition is specified, ignore LogicComparison Operator
    if (conds.length === 0) {
        query["WHERE"] = {};
    } else if (conds.length === 1) {
        if (logicCondition === "NOT") {
            query.WHERE["NOT"] = findWhere(conds[0]);
        } else {
            query.WHERE = findWhere(conds[0]);
        }
    } else {
        // 2. if more than 1 condition are specified, push them into an array that comes under query
        let arr = [];
        for (let i of conds) {
            arr.push(findWhere(i));
        }
        if (logicCondition === "NOT") {
            query.WHERE["NOT"] = {"OR": arr};
        } else {
            query.WHERE = {[logicCondition]: arr};
        }
    }

    // Filling "OPTIONS"
    // 1. columns
    query.OPTIONS["COLUMNS"] = colList;
    // 2. order
    if (orderBy.field.length > 0 || orderBy.dir === "DOWN") {
    if (orderBy.dir === "DOWN") {
        query.OPTIONS["ORDER"] = {"dir": orderBy.dir, "keys": orderBy.field};
    } else {
        if (orderBy.field.length === 1) {
            query.OPTIONS.ORDER = orderBy.field[0];
        } else {
            query.OPTIONS["ORDER"] = {"dir": orderBy.dir, "keys": orderBy.field};
        }
    }
    }

    // Filling "TRANSFORMATIONS"
    if (groupCols.length > 0 || transCond.length > 0) {
        let applyArr = [];
        for (let rule of transCond) {
            let obj = {[rule.condition]: {[rule.type]: rule.field}};
            applyArr.push(obj);
        }
        query["TRANSFORMATIONS"] = {"GROUP": groupCols};
        query["TRANSFORMATIONS"].APPLY = applyArr;
    }

    function findWhere(body) {
        if (body.not) {
            if (body.operator !== "IS") {
                return {"NOT": {[body.operator]: {[body.field]: (body.text === "" ? "": Number(body.text))}}};
            } else {
                return {"NOT": {[body.operator]: {[body.field]: body.text}}};
            }
        } else {
            if (body.operator !== "IS") {
                return {[body.operator]: {[body.field]: (body.text === "" ? "": Number(body.text))}};
            } else {
                return {[body.operator]: {[body.field]: body.text}};
            }
        }
    }

    return query;
};
